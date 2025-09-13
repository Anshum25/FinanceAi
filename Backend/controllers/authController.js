import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import AppError from '../utils/appError.js';
import { createAndSendToken } from '../utils/tokenUtils.js';

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    // 1) Check if passwords match
    if (password !== passwordConfirm) {
      return next(new AppError('Passwords do not match', 400));
    }

    // 2) Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // 3) Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
    });

    // 4) Create default settings for the user
    await Settings.create({
      user: newUser._id,
    });

    // 5) Generate token and send response
    createAndSendToken(newUser, 201, res);
  } catch (err) {
    next(err);
  }
};

export const me = (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
};

export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('No registration found with this email', 404));
    }

    // 3) Check if password is correct
    const valid = await user.correctPassword(password, user.password);
    if (!valid) {
      return next(new AppError('Incorrect password', 401));
    }

    // 4) If everything ok, send token to client
    createAndSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      );
    }

    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createAndSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    
    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new AppError('Email is already in use', 400));
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, phone },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    if (!(await user.correctPassword(currentPassword, user.password))) {
      return next(new AppError('Current password is incorrect', 401));
    }

    user.password = newPassword;
    user.passwordConfirm = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: `/uploads/profiles/${req.file.filename}` },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    
    res.clearCookie('jwt');
    
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};
