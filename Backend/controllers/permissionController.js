import AppError from '../utils/appError.js';
import User from '../models/User.js';

// Get current user permissions
export const getPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('permissions');
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        permissions: user.permissions || {},
      },
    });
    
  } catch (err) {
    next(err);
  }
};

// Update user permissions
export const updatePermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    
    if (!permissions || typeof permissions !== 'object') {
      return next(new AppError('Please provide valid permissions object', 400));
    }
    
    // Define valid permission categories
    const validCategories = [
      'assets', 
      'liabilities', 
      'transactions', 
      'investments', 
      'epf', 
      'creditScore'
    ];
    
    // Validate permission categories and values
    const updates = {};
    for (const [category, value] of Object.entries(permissions)) {
      if (!validCategories.includes(category)) {
        return next(new AppError(`Invalid permission category: ${category}`, 400));
      }
      if (typeof value !== 'boolean') {
        return next(new AppError(`Invalid value for ${category}. Must be a boolean.`, 400));
      }
      updates[`permissions.${category}`] = value;
    }
    
    // Update user permissions
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Emit permission update event (for real-time updates)
    if (req.app.get('sse')) {
      req.app.get('sse').send({
        event: 'permissions_updated',
        data: { userId: user._id, permissions: user.permissions }
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        permissions: user.permissions,
      },
    });
    
  } catch (err) {
    next(err);
  }
};

// Check if user has permission to access a specific category
export const checkPermission = (category) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select('permissions');
      
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      
      // If permissions are not explicitly denied, allow access
      if (user.permissions && user.permissions[category] === false) {
        return next(
          new AppError(`You do not have permission to access ${category} data`, 403)
        );
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
};
