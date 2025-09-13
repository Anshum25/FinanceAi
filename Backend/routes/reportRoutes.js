import express from 'express';
import { protect } from '../controllers/authController.js';
import { 
  generateReport,
  generateFinancialStatement,
  exportData
} from '../controllers/reportController.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Generate a financial report
router.get('/generate', generateReport);

// Generate a financial statement (balance sheet, income statement, etc.)
router.get('/statement', generateFinancialStatement);

// Export data in various formats (JSON, CSV, etc.)
router.get('/export', exportData);

export default router;
