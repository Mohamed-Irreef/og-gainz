const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { ENV } = require('./config/env.config');
const routes = require('./routes/index.routes');
const adminSettingsRoutes = require('./routes/admin.settings.routes');
const { errorHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger.util');

const app = express();

const allowedOrigins = [
  "https://oggainz.com",
  "https://www.oggainz.com",
  "https://og-gainz.vercel.app",
  "http://localhost:5173"
];

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Capture raw body for Razorpay webhook signature verification.
// Must be done before JSON parsing mutates the payload.
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      try {
        const url = String(req.originalUrl || req.url || '');
        if (url.startsWith('/api/webhooks/razorpay')) {
          req.rawBody = buf;
        }
      } catch (_) {
        // no-op
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'OG Gainz Server is running',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV
  });
});

// API Routes
app.use('/api', routes);
app.use('/api/admin/settings', adminSettingsRoutes);

// 404 handler - catches all unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
