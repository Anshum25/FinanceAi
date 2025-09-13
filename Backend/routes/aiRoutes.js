import express from 'express';
import { protect } from '../controllers/authController.js';
import { 
  generateAIResponse, 
  getFinancialInsights,
  generateFinancialForecast
} from '../controllers/aiController.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Generate AI response for chat
router.post('/chat', generateAIResponse);

// Get financial insights
router.get('/insights', getFinancialInsights);

// Generate financial forecast
router.get('/forecast', generateFinancialForecast);

export default router;
