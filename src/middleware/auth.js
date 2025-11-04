import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT token
export const generateToken = (userId) => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  console.log('Generating token for user:', userId);
  console.log('Current time (seconds):', now);
  console.log('Current time (date):', new Date(now * 1000));
  
  return jwt.sign(
    { 
      id: userId,
      iat: now, // Explicitly set issued at time
      exp: now + (30 * 24 * 60 * 60) // 30 days from now
    },
    process.env.JWT_SECRET || 'electromart_secret_key_2024'
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  console.log('Verifying token:', token);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'electromart_secret_key_2024');
  console.log('Token decoded successfully:', decoded);
  console.log('Current time:', Math.floor(Date.now() / 1000));
  console.log('Token issued at:', decoded.iat, new Date(decoded.iat * 1000));
  console.log('Token expires at:', decoded.exp, new Date(decoded.exp * 1000));
  console.log('Token expired:', Date.now() / 1000 > decoded.exp);
  return decoded;
};

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      console.log('Token verification error:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token verification failed. Please login again.'
        });
      }
    }
    
    // Get user from database
    console.log('Looking for user with ID:', decoded.id);
    const user = await User.findById(decoded.id).select('-password');
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Token is not valid. User not found.'
      });
    }
    
    console.log('User authenticated successfully:', user.name);

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token is not valid.'
    });
  }
};

// Authorization middleware (role-based)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
      });
    }

    next();
  };
};

// Optional authentication (for public endpoints that can benefit from user context)
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

export default {
  authenticate,
  authorize,
  optionalAuth,
  generateToken,
  verifyToken
};


