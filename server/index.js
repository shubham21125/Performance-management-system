// 1. DNS override must be the very first lines — before any require() that triggers network I/O.
// Fixes querySrv ECONNREFUSED on environments where local OS DNS resolver points to 127.0.0.1
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Startup guard for JWT_SECRET (fail-fast)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('FATAL: JWT_SECRET is not set in environment variables. Refusing to start.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const reviewRoutes = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI;

// 2. Dynamic CORS configuration
// Always permit http://localhost:5173, http://localhost:5174, and CLIENT_ORIGIN (trimmed of trailing slash)
const clientOriginEnv = (process.env.CLIENT_ORIGIN || '').replace(/\/$/, '');
const allowedOrigins = Array.from(
  new Set(
    [
      'http://localhost:5173',
      'http://localhost:5174',
      clientOriginEnv,
    ].filter(Boolean)
  )
);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (curl, Postman, server-to-server, mobile)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check endpoint (must remain reachable even if DB is disconnected)
app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbLabels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const status = dbLabels[dbState] || 'unknown';

  return res.json({
    success: true,
    message: 'Performance Management API is operational.',
    db: status,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reviews', reviewRoutes);

// 404 Fallback for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Requested API route not found.',
  });
});

// Global unhandled error handler
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Server Error]:', err);
  if (err.message && err.message.startsWith('Not allowed by CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
  });
});

// Database Connection & Server Initialization
if (!MONGO_URI) {
  console.warn('WARNING: MONGO_URI is not set in environment. Database operations will fail.');
} else {
  mongoose
    .connect(MONGO_URI, { dbName: 'employee_management' })
    .then(() => {
      console.log('✓ Connected to MongoDB database: employee_management');
    })
    .catch((err) => {
      // MongoDB connection failure must NOT call process.exit(1)
      console.warn('⚠️ MongoDB connection warning:', err.message);
      console.warn('   The server will remain active so /api/health and debugging endpoints stay reachable.');
      console.warn('   Ensure MONGO_URI password is alphanumeric and Atlas IP whitelist includes 0.0.0.0/0.');
    });
}

app.listen(PORT, () => {
  console.log(`🚀 Performance Management API listening on http://localhost:${PORT}`);
  console.log(`   Allowed CORS Origins: [ ${allowedOrigins.join(', ')} ]`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
