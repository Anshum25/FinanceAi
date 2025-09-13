import express from 'express';
import { body } from 'express-validator';
import {
  signup,
  login,
  protect,
  logout,
  updatePassword,
} from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Validation rules
const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required'),
];

const updatePasswordValidation = [
  body('passwordCurrent').notEmpty().withMessage('Current password is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('passwordConfirm')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

// Routes
router.post('/signup', signupValidation, validateRequest, signup);
router.post('/login', loginValidation, validateRequest, login);
router.post('/logout', logout);

// Protected routes (require authentication)
router.use(protect);

router.patch(
  '/update-password',
  updatePasswordValidation,
  validateRequest,
  updatePassword
);

export default router;
