import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/authRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

// Import middleware
import { 
  securityMiddleware, 
  errorHandler, 
  notFoundHandler,
  sanitizeRequest 
} from './middleware/security.js';

// Load environment variables
dotenv.config();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Apply security middleware
securityMiddleware(app);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization
app.use(sanitizeRequest);

// Static files for reports and uploads
app.use('/reports', express.static(path.join(__dirname, 'reports')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'FinanceAI Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    features: {
      authentication: true,
      pdfParsing: true,
      aiChat: true,
      reportGeneration: true,
      dataAnalytics: true
    }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'FinanceAI API v1.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout'
      },
      data: {
        summary: 'GET /api/data/summary',
        transactions: 'GET /api/data/transactions',
        categories: 'GET /api/data/categories',
        trends: 'GET /api/data/trends'
      },
      upload: {
        statement: 'POST /api/upload/statement'
      },
      ai: {
        chat: 'POST /api/ai/chat',
        insights: 'GET /api/ai/insights',
        forecast: 'GET /api/ai/forecast'
      },
      reports: {
        generate: 'POST /api/report/generate',
        download: 'GET /api/report/download/:id'
      }
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeai', {
      // Remove deprecated options
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 FinanceAI Backend Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API docs: http://localhost:${PORT}/api`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
