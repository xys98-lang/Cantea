import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

// Middleware to verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token expired',
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Server error during authentication',
    });
  }
};

// Middleware to check user role
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this resource',
      });
    }

    next();
  };
};

// Generate JWT token
export const generateToken = (userId, expiresIn = process.env.JWT_EXPIRE || '7d') => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn,
  });
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};
