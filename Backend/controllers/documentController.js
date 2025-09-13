import Document from '../models/Document.js';
import User from '../models/User.js';
import AppError from '../utils/appError.js';
import fs from 'fs/promises';
import path from 'path';
import { processDocument as extractWithAI, processDocumentByType } from '../services/documentProcessor.js';
import { ingestBankStatement, ingestEPF, ingestCAS, ingestCreditReport } from '../services/ingestionService.js';

export const uploadDocuments = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    const { documentType } = req.body;
    
    if (!documentType) {
      return next(new AppError('Document type is required', 400));
    }

    const validTypes = ['assetStatement', 'epfPassbook', 'mutualFundCAS', 'creditReport'];
    if (!validTypes.includes(documentType)) {
      return next(new AppError('Invalid document type', 400));
    }

    const uploadedDocuments = [];

    for (const file of req.files) {
      const document = await Document.create({
        user: req.user._id,
        documentType,
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        uploadDate: new Date()
      });

      uploadedDocuments.push(document);
    }

    // Auto-enable corresponding permissions based on document type
    const permissionMapping = {
      assetStatement: ['assets', 'transactions'],
      epfPassbook: ['epf'],
      mutualFundCAS: ['investments'],
      creditReport: ['creditScore']
    };

    const permissionsToEnable = permissionMapping[documentType] || [];
    
    if (permissionsToEnable.length > 0) {
      const updateObj = {};
      permissionsToEnable.forEach(permission => {
        updateObj[`permissions.${permission}`] = true;
      });
      
      await User.findByIdAndUpdate(req.user._id, updateObj);
    }

    res.status(201).json({
      status: 'success',
      message: `${uploadedDocuments.length} document(s) uploaded successfully`,
      data: {
        documents: uploadedDocuments
      }
    });
  } catch (err) {
    // Clean up uploaded files if database save fails
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkErr) {
          console.error('Error deleting file:', unlinkErr);
        }
      }
    }
    next(err);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const { documentType } = req.query;
    
    const filter = { user: req.user._id };
    if (documentType) {
      filter.documentType = documentType;
    }

    const documents = await Document.find(filter).sort({ uploadDate: -1 });

    res.status(200).json({
      status: 'success',
      results: documents.length,
      data: {
        documents
      }
    });
  } catch (err) {
    next(err);
  }
};

// Process a previously uploaded document: extract data and persist into domain collections
export const processUploadedDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) return next(new AppError('Document not found', 404));

    // Read file buffer from saved path
    const fileBuffer = await fs.readFile(doc.path);

    // Mark processing
    await Document.findByIdAndUpdate(doc._id, { processingStatus: 'processing', processingError: null });

    // Create a Multer-like object for the existing processor
    const fakeFile = {
      mimetype: doc.mimeType || 'application/pdf',
      buffer: fileBuffer,
      originalname: doc.originalName,
    };

    // Extract structured data using the AI-based processor (by type)
    const extracted = await processDocumentByType(fakeFile, doc.documentType || 'assetStatement');

    // Ingest based on document type
    let ingestResult;
    switch (doc.documentType) {
      case 'epfPassbook':
        ingestResult = await ingestEPF({ userId: req.user._id, documentId: doc._id, extracted });
        break;
      case 'mutualFundCAS':
        ingestResult = await ingestCAS({ userId: req.user._id, documentId: doc._id, extracted });
        break;
      case 'creditReport':
        ingestResult = await ingestCreditReport({ userId: req.user._id, documentId: doc._id, extracted });
        break;
      case 'assetStatement':
      default:
        ingestResult = await ingestBankStatement({ userId: req.user._id, documentId: doc._id, extracted });
        break;
    }

    // Update Document status and store a compact summary of extracted data
    await Document.findByIdAndUpdate(doc._id, {
      processed: true,
      extractedData: {
        accountNumber: extracted?.accountNumber || null,
        period: extracted?.statementPeriod || null,
        summary: extracted?.summary || null,
        transactionsCount: Array.isArray(extracted?.transactions) ? extracted.transactions.length : 0,
      },
      processingStatus: 'completed',
    });

    res.status(200).json({
      status: 'success',
      data: {
        documentId: doc._id,
        ingestResult,
      },
    });
  } catch (err) {
    try {
      await Document.findByIdAndUpdate(req.params.id, { processingStatus: 'failed', processingError: err.message });
    } catch {}
    next(err);
  }
};

export const checkDocumentsForPermissions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Check which document types the user has uploaded
    const documentCounts = await Document.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$documentType', count: { $sum: 1 } } }
    ]);

    const hasDocuments = {
      assets: false,
      transactions: false,
      investments: false,
      epf: false,
      creditScore: false
    };

    // Map document types to permissions
    documentCounts.forEach(doc => {
      switch (doc._id) {
        case 'assetStatement':
          hasDocuments.assets = true;
          hasDocuments.transactions = true;
          break;
        case 'epfPassbook':
          hasDocuments.epf = true;
          break;
        case 'mutualFundCAS':
          hasDocuments.investments = true;
          break;
        case 'creditReport':
          hasDocuments.creditScore = true;
          break;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        hasDocuments
      }
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.path);
    } catch (fileErr) {
      console.error('Error deleting file from filesystem:', fileErr);
    }

    // Delete from database
    await Document.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
