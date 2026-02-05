// Load environment variables FIRST
require('dotenv').config();

// Initialize App Insights AFTER loading env
const { setupAppInsights } = require('./appInsights');
setupAppInsights();

const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/logger');
const { trackRequestMetrics, trackException } = require('./middleware/metrics');

// Routes
const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');
const commentsRoutes = require('./routes/comments.routes');
const categoriesRoutes = require('./routes/categories.routes');

const app = express();
const PORT = 3001;

// Middleware
app.use(trackRequestMetrics);
app.use(requestLogger);
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'blog-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    appInsights: !!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posts/:slug/comments', commentsRoutes);
app.use('/api/categories', categoriesRoutes);

// Error handling middleware (add at the end)
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  // Track exception in App Insights
  trackException(err, {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    statusCode: err.status || 500
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 App Insights: ${process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ? 'Enabled ✅' : 'Disabled ⚠️'}`);
});

