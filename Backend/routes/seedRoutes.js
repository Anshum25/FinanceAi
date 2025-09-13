import express from 'express';
import { protect } from '../controllers/authController.js';
import { seedUserData } from '../controllers/seedController.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Seed sample data for the authenticated user
router.post('/seed-data', seedUserData);

export default router;
