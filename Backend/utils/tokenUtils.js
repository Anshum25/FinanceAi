import jwt from 'jsonwebtoken';
import AppError from './appError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  // Remove password from output
  user.password = undefined;

  // Set HttpOnly cookie so the browser includes it automatically
  try {
    res.cookie('jwt', token, cookieOptions);
  } catch (e) {
    // Fallback: continue responding with token in body
  }

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

export { signToken, createAndSendToken };
