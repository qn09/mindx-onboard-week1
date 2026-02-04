const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');
const commentsRoutes = require('./routes/comments.routes');
const categoriesRoutes = require('./routes/categories.routes');

const app = express();
const PORT = 3001;

// Middleware
app.use(requestLogger);
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'blog-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString() 
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/posts/:slug/comments', commentsRoutes);
app.use('/api/categories', categoriesRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
});
