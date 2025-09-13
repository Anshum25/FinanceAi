import { processDocument, sanitizeFinancialData } from '../services/documentProcessor.js';
import AppError from '../utils/appError.js';

/**
 * Handle file upload and processing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const handleFileUpload = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Validate file size
    if (req.file.size > 10 * 1024 * 1024) {
      return next(new AppError('File size too large. Maximum size is 10MB', 400));
    }

    // Log file details for debugging
    console.log('Processing file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: req.user.id
    });

    // Process the document
    const rawData = await processDocument(req.file);
    
    // Sanitize and format the data
    const structuredData = sanitizeFinancialData(rawData);

    // Add metadata
    const response = {
      status: 'success',
      data: {
        ...structuredData,
        metadata: {
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          processedAt: new Date().toISOString(),
          userId: req.user.id
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('File upload processing error:', error);
    
    // Handle specific error types
    if (error.message.includes('Unsupported file type')) {
      return next(new AppError('Unsupported file type. Please upload PDF, CSV, or Excel files only.', 400));
    }
    
    if (error.message.includes('parsing failed')) {
      return next(new AppError('Failed to parse the uploaded file. Please ensure the file is not corrupted.', 400));
    }
    
    if (error.message.includes('AI data extraction failed')) {
      return next(new AppError('Failed to extract financial data from the document. Please ensure the document contains valid financial information.', 422));
    }
    
    // Generic error
    return next(new AppError('Failed to process the uploaded document. Please try again.', 500));
  }
};

/**
 * Get supported file types
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSupportedFileTypes = (req, res) => {
  const supportedTypes = {
    status: 'success',
    data: {
      supportedFormats: [
        {
          type: 'PDF',
          mimeType: 'application/pdf',
          extensions: ['.pdf'],
          description: 'Portable Document Format - Bank statements, financial reports'
        },
        {
          type: 'CSV',
          mimeType: 'text/csv',
          extensions: ['.csv'],
          description: 'Comma Separated Values - Transaction exports, account data'
        },
        {
          type: 'Excel',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extensions: ['.xlsx', '.xls'],
          description: 'Microsoft Excel - Financial spreadsheets, account summaries'
        }
      ],
      maxFileSize: '10MB',
      processingCapabilities: [
        'Account holder name extraction',
        'Account number identification',
        'Statement period detection',
        'Balance summary calculation',
        'Transaction line item parsing',
        'Date and amount normalization'
      ]
    }
  };
  
  res.status(200).json(supportedTypes);
};
