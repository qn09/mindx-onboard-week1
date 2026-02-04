const { verifyMindXIdToken, createDisplayName } = require('../auth');

// Cache for user info
const userCache = new Map();

// Cache cleanup - remove entries older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of userCache.entries()) {
    if (now - data.cachedAt > 3600000) { // 1 hour
      userCache.delete(token);
    }
  }
  console.log(`[Cache] Active cached users: ${userCache.size}`);
}, 300000); // Run every 5 minutes

// Helper function to create user from JWT payload
const createUserFromPayload = (payload) => ({
  id: payload.sub,
  username: payload.preferred_username || payload.email || payload.sub,
  name: createDisplayName(payload),
  email: payload.email || '',
  avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.sub}`
});

// Authentication Middleware - validates JWT token with JWKS
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Check cache first
    const cached = userCache.get(token);
    if (cached && (Date.now() - cached.cachedAt < 600000)) { // 10 min cache
      req.user = cached.user;
      req.tokenPayload = cached.tokenPayload;
      return next();
    }
    
    // Verify JWT token with JWKS
    console.log('🔐 Verifying JWT token...');
    const payload = await verifyMindXIdToken(token);
    const user = createUserFromPayload(payload);
    
    // Cache user info
    userCache.set(token, {
      user,
      tokenPayload: payload,
      cachedAt: Date.now()
    });
    
    req.user = user;
    req.tokenPayload = payload;
    
    console.log(`✅ User authenticated: ${user.name} (${user.email})`);
    next();
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: error.message || 'Token validation failed' 
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Check cache
    const cached = userCache.get(token);
    if (cached && (Date.now() - cached.cachedAt < 600000)) {
      req.user = cached.user;
      req.tokenPayload = cached.tokenPayload;
      return next();
    }
    
    // Verify JWT token
    const payload = await verifyMindXIdToken(token);
    const user = createUserFromPayload(payload);
    
    userCache.set(token, {
      user,
      tokenPayload: payload,
      cachedAt: Date.now()
    });
    
    req.user = user;
    req.tokenPayload = payload;
  } catch (error) {
    console.error('⚠️ Optional auth error:', error.message);
  }
  
  next();
};

// Clear cache for a token (used on logout)
const clearUserCache = (token) => {
  userCache.delete(token);
};

module.exports = {
  authenticateUser,
  optionalAuth,
  createUserFromPayload,
  clearUserCache
};
