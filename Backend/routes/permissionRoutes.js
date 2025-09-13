import express from 'express';
import { protect } from '../controllers/authController.js';
import { 
  getPermissions, 
  updatePermissions 
} from '../controllers/permissionController.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// Get current user permissions
router.get('/', getPermissions);

// Update user permissions
router.patch('/', updatePermissions);

export default router;
