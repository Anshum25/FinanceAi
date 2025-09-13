import express from 'express';
import { 
  getFinancialSummary, 
  getTransactions, 
  getCategoryAnalysis, 
  getSpendingTrends 
} from '../controllers/dataController.js';
import { protect } from '../controllers/authController.js';
import { generalRateLimit } from '../middleware/security.js';

const router = express.Router();

// Apply rate limiting
router.use(generalRateLimit);

// Protect all routes
router.use(protect);

// Routes
router.get('/summary', getFinancialSummary);
router.get('/transactions', getTransactions);
router.get('/categories', getCategoryAnalysis);
router.get('/trends', getSpendingTrends);

export default router;
