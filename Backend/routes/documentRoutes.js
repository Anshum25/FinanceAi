import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect } from '../controllers/authController.js';
import { uploadDocuments, getDocuments, deleteDocument, checkDocumentsForPermissions } from '../controllers/documentController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/documents'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 20 // Max 20 files per request
  }
});

// All routes require authentication
router.use(protect);

// Upload documents
router.post('/upload', upload.array('documents', 20), uploadDocuments);

// Get user's documents
router.get('/', getDocuments);

// Check which permissions have documents
router.get('/check-permissions', checkDocumentsForPermissions);

// Delete a document
router.delete('/:id', deleteDocument);

export default router;
