import express from 'express';
import multer from 'multer';
import { handleFileUpload, getSupportedFileTypes } from '../controllers/apiController.js';
import { protect } from '../controllers/authController.js';

const router = express.Router();

// Configure multer for in-memory file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept PDF, CSV, and Excel files
  const allowedMimeTypes = [
    'application/pdf',
    'text/csv',
    'application/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, CSV, and Excel files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// File upload endpoint
router.post('/upload', protect, upload.single('document'), handleFileUpload);

// Get supported file types
router.get('/supported-types', getSupportedFileTypes);

export default router;
