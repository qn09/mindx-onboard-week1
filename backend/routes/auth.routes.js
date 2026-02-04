const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { verifyMindXIdToken } = require('../auth');
const { authenticateUser, createUserFromPayload, clearUserCache } = require('../middleware/auth');

// OpenID Configuration
const OPENID_CONFIG = {
  issuer: process.env.MINDX_ISSUER || 'https://id-dev.mindx.edu.vn',
  authorizationEndpoint: process.env.MINDX_AUTH_ENDPOINT || 'https://id-dev.mindx.edu.vn/auth',
  tokenEndpoint: process.env.MINDX_TOKEN_ENDPOINT || 'https://id-dev.mindx.edu.vn/token',
  clientId: process.env.OPENID_CLIENT_ID || '',
  clientSecret: process.env.OPENID_CLIENT_SECRET || '',
  redirectUri: process.env.OPENID_REDIRECT_URI || 'https://quannv.id.vn/api/auth/callback',
  scope: 'openid profile email'
};

// Helper to generate state token
const generateToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// User cache (for storing user info with tokens)
const userCache = new Map();

// ============================================
// OAUTH ROUTES
// ============================================

// Get login URL
router.get('/login-url', (req, res) => {
  const state = generateToken();
  const authUrl = `${OPENID_CONFIG.authorizationEndpoint}?` + 
    `client_id=${OPENID_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(OPENID_CONFIG.redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(OPENID_CONFIG.scope)}&` +
    `state=${state}`;
  
  res.json({ authUrl, state });
});

// OAuth callback (GET) - redirect to frontend with code
router.get('/callback', (req, res) => {
  const { code, state } = req.query;
  
  console.log('📥 OAuth callback received');
  
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }
  
  res.redirect(`/?code=${code}${state ? '&state=' + state : ''}`);
});

// OAuth callback (POST) - exchange code for token
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  
  try {
    console.log('🔄 Exchanging code for tokens...');
    
    // Exchange code for tokens
    const tokenResponse = await fetch(OPENID_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OPENID_CONFIG.redirectUri,
        client_id: OPENID_CONFIG.clientId,
        client_secret: OPENID_CONFIG.clientSecret,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorData);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }
    
    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    
    if (!idToken) {
      return res.status(400).json({ error: 'No ID token received' });
    }
    
    console.log('🔐 Verifying ID token with JWKS...');
    
    // Verify ID token using JWKS
    const payload = await verifyMindXIdToken(idToken);
    const user = createUserFromPayload(payload);
    
    // Cache user
    userCache.set(idToken, {
      user,
      tokenPayload: payload,
      cachedAt: Date.now()
    });
    
    console.log(`✅ User logged in: ${user.name} (${user.email})`);
    
    res.json({
      token: idToken,
      user: user
    });
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// ============================================
// AUTH ROUTES
// ============================================

// Get current user info
router.get('/me', authenticateUser, (req, res) => {
  res.json({ 
    user: req.user,
    tokenInfo: {
      iss: req.tokenPayload?.iss,
      aud: req.tokenPayload?.aud,
      exp: req.tokenPayload?.exp,
      iat: req.tokenPayload?.iat,
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    clearUserCache(token);
    console.log('[Auth] User logged out, token removed from cache');
  }
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
