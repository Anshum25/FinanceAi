import express from 'express';
import { upload, uploadBankStatement } from '../controllers/uploadController.js';
import { protect } from '../controllers/authController.js';
import { uploadRateLimit } from '../middleware/security.js';

const router = express.Router();

// Apply rate limiting for uploads
router.use(uploadRateLimit);

// Protect all routes
router.use(protect);

// Upload bank statement
router.post('/statement', upload.single('statement'), uploadBankStatement);

export default router;
