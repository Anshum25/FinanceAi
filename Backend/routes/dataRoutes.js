import express from 'express';
import { protect } from '../controllers/authController.js';
import {
  getDashboardData,
  getTransactions,
  getAssets,
  getLiabilities,
  getInvestments,
  getEPFData,
  getCreditScore,
} from '../controllers/dataController.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Dashboard data
router.get('/dashboard', getDashboardData);

// Transactions
router.get('/transactions', getTransactions);

// Assets
router.get('/assets', getAssets);

// Liabilities
router.get('/liabilities', getLiabilities);

// Investments
router.get('/investments', getInvestments);

// EPF Data
router.get('/epf', getEPFData);

// Credit Score
router.get('/credit-score', getCreditScore);

export default router;
