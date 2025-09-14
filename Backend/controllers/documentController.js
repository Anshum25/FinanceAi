import Document from '../models/Document.js';
import User from '../models/User.js';
import AppError from '../utils/appError.js';
import fs from 'fs/promises';
import path from 'path';
import { parseBankStatement } from '../utils/pdfParser.js';

export const uploadDocuments = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    const { documentType } = req.body;
    
    if (!documentType) {
      return next(new AppError('Document type is required', 400));
    }

    const validTypes = ['assetStatement', 'bankStatement', 'liabilityStatement', 'epfPassbook', 'mutualFundCAS', 'creditReport'];
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

      // Parse the PDF and extract financial data
      try {
        console.log(`Parsing document: ${file.originalname} (${documentType})`);
        await parseBankStatement(file.path, req.user._id);
        console.log(`Successfully parsed and stored data from: ${file.originalname}`);
      } catch (parseError) {
        console.error(`Error parsing document ${file.originalname}:`, parseError);
        // Continue with upload even if parsing fails
      }
    }

    // Auto-enable corresponding permissions based on document type
    const permissionMapping = {
      assetStatement: ['assets'],
      bankStatement: ['transactions'],
      liabilityStatement: ['liabilities'],
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
      liabilities: false,
      investments: false,
      epf: false,
      creditScore: false
    };

    // Map document types to permissions
    documentCounts.forEach(doc => {
      switch (doc._id) {
        case 'assetStatement':
          hasDocuments.assets = true;
          break;
        case 'bankStatement':
          hasDocuments.transactions = true;
          break;
        case 'liabilityStatement':
          hasDocuments.liabilities = true;
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
