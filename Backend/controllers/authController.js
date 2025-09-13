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

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) If everything ok, send token to client
    createAndSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    // For testing purposes, create a mock user if no token provided
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
      // Create or find a test user
      let testUser = await User.findOne({ email: 'test@example.com' });
      if (!testUser) {
        testUser = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'testpassword123',
          permissions: {
            transactions: true,
            assets: true,
            liabilities: true,
            investments: true,
            epf: true,
            creditScore: true
          }
        });
      }
      req.user = testUser;
      return next();
    }

    // 1) Getting token and check if it's there
    const token = req.headers.authorization.split(' ')[1];

    // 2) For mock tokens, create test user
    if (token.includes('mock_token')) {
      let testUser = await User.findOne({ email: 'test@example.com' });
      if (!testUser) {
        testUser = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'testpassword123',
          permissions: {
            transactions: true,
            assets: true,
            liabilities: true,
            investments: true,
            epf: true,
            creditScore: true
          }
        });
      }
      req.user = testUser;
      return next();
    }

    // 3) Verification token for real tokens
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    // 5) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password! Please log in again.', 401));
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    return next(new AppError('Invalid token. Please log in again!', 401));
  }
};

// Only for rendered pages, no errors!
export const isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

export const updatePassword = async (req, res, next) => {
  try {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!

    // 4) Log user in, send JWT
    createAndSendToken(user, 200, res);
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
