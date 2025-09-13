import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    
    return next(new AppError('Validation failed', 400, errorMessages));
  }
  
  next();
};

export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  
  if (page < 1) {
    return next(new AppError('Page number must be greater than 0', 400));
  }
  
  if (limit < 1 || limit > 100) {
    return next(new AppError('Limit must be between 1 and 100', 400));
  }
  
  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit
  };
  
  next();
};
