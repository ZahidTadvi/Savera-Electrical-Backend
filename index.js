import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';
import authRoutes from './src/routes/auth.js';
import productRoutes from './src/routes/products.js';
import customerRoutes from './src/routes/customers.js';
import billRoutes from './src/routes/bills.js';
import newBillRouter from './src/routes/newBillRouter.js';
import companyInfoRoutes from './src/routes/companyInfoRouter.js';
import profileRoutes from './src/routes/profileRouter.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      // Allow images from self, data URIs, and HTTPS origins (e.g., https://saveraelectronic-backend.onrender.com)
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 1000, // Very high limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for localhost and development
  skip: (req) => {
    const isLocalhost = req.ip === '127.0.0.1' || 
                       req.ip === '::1' || 
                       req.ip === '::ffff:127.0.0.1' ||
                       req.ip === 'localhost' ||
                       req.connection?.remoteAddress === '127.0.0.1' ||
                       req.connection?.remoteAddress === '::1';
    
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NODE_ENV !== 'production' ||
                         !process.env.NODE_ENV;
    
    if (isLocalhost || isDevelopment) {
      console.log(`🚀 Skipping rate limit for IP: ${req.ip}, NODE_ENV: ${process.env.NODE_ENV}`);
      return true;
    }
    return false;
  }
});

app.use('/api', limiter);

// More strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 1000, // Very high limit for development
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  // Skip rate limiting for localhost and development
  skip: (req) => {
    const isLocalhost = req.ip === '127.0.0.1' || 
                       req.ip === '::1' || 
                       req.ip === '::ffff:127.0.0.1' ||
                       req.ip === 'localhost' ||
                       req.connection?.remoteAddress === '127.0.0.1' ||
                       req.connection?.remoteAddress === '::1';
    
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NODE_ENV !== 'production' ||
                         !process.env.NODE_ENV;
    
    if (isLocalhost || isDevelopment) {
      console.log(`🚀 Skipping auth rate limit for IP: ${req.ip}, NODE_ENV: ${process.env.NODE_ENV}`);
      return true;
    }
    return false;
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory with permissive headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'ElectroMart API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Development endpoints (always available for debugging)
app.get('/api/dev/reset-rate-limit', (req, res) => {
  res.json({
    status: 'success',
    message: 'Rate limit reset attempted',
    environment: process.env.NODE_ENV || 'development',
    currentIP: req.ip,
    isLocalhost: req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
    authRateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 1000,
      skip: true // Always skip for localhost
    },
    generalRateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_MAX) || 1000,
      skip: true // Always skip for localhost
    }
  });
});

// Additional endpoint to check rate limit status
app.get('/api/dev/rate-limit-status', (req, res) => {
  res.json({
    status: 'success',
    message: 'Rate limit status',
    environment: process.env.NODE_ENV || 'development',
    currentIP: req.ip,
    timestamp: new Date().toISOString(),
    rateLimits: {
      general: {
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: Number(process.env.RATE_LIMIT_MAX) || 1000
      },
      auth: {
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 1000
      }
    }
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bill', billRoutes);
app.use('/api/newBill', newBillRouter);
app.use('/api/companyInfo', companyInfoRoutes);
app.use('/api/profile', profileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ElectroMart API Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Network Access: http://0.0.0.0:${PORT}/api`);
  console.log(`📱 Mobile Access: Use your computer's IP address instead of localhost`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection:', err.message || err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

export default app;


