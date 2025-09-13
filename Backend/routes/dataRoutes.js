import express from 'express';
import { 
  getFinancialSummary, 
  getTransactions, 
  getCategoryAnalysis, 
  getSpendingTrends,
  getAssets,
  getLiabilities,
  getInvestments,
  getEPFData,
  getCreditScore
} from '../controllers/dataController.js';
import { protect } from '../controllers/authController.js';
import { generalRateLimit } from '../middleware/security.js';

const router = express.Router();

// Apply rate limiting
router.use(generalRateLimit);

// Protect all routes
router.use(protect);

// Main financial data routes
router.get('/summary', getFinancialSummary);
router.get('/transactions', getTransactions);
router.get('/categories', getCategoryAnalysis);
router.get('/trends', getSpendingTrends);
router.get('/assets', getAssets);
router.get('/liabilities', getLiabilities);
router.get('/investments', getInvestments);

// Detailed section routes
router.get('/assets', getAssets);
router.get('/liabilities', getLiabilities);
router.get('/investments', getInvestments);
router.get('/epf', getEPFData);
router.get('/credit-score', getCreditScore);

export default router;
