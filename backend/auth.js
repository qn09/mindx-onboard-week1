const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { MINDX_ISSUER, MINDX_JWKS_URI, CLIENT_ID } = require('./config');

// Cache JWKS keys
let publicKeysCache = null;
let cacheTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch MindX public keys from JWKS endpoint
 * @returns {Promise<Object>} Map of kid to public key
 */
async function fetchMindXPublicKeys() {
  const now = Date.now();
  
  // Return cached keys if still valid
  if (publicKeysCache && (now - cacheTime) < CACHE_DURATION) {
    console.log('🔑 Using cached JWKS keys');
    return publicKeysCache;
  }
  
  console.log('🔄 Fetching fresh JWKS keys from:', MINDX_JWKS_URI);
  
  try {
    const response = await fetch(MINDX_JWKS_URI);
    if (!response.ok) {
      throw new Error(`JWKS fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const jwks = await response.json();
    
    if (!jwks.keys || !Array.isArray(jwks.keys)) {
      throw new Error('Invalid JWKS response format');
    }
    
    // Convert JWKS to public key map
    const publicKeys = {};
    for (const key of jwks.keys) {
      if (key.kty === 'RSA' && key.kid && key.n && key.e) {
        // Create PEM format public key from JWK
        const publicKey = jwkToPem(key);
        publicKeys[key.kid] = publicKey;
      }
    }
    
    console.log(`✅ Loaded ${Object.keys(publicKeys).length} public keys from JWKS`);
    
    // Update cache
    publicKeysCache = publicKeys;
    cacheTime = now;
    
    return publicKeys;
  } catch (error) {
    console.error('❌ Failed to fetch JWKS:', error.message);
    
    // Return cached keys if available, even if expired
    if (publicKeysCache) {
      console.log('⚠️ Using expired cache due to fetch error');
      return publicKeysCache;
    }
    
    throw new Error(`Cannot fetch JWKS: ${error.message}`);
  }
}

/**
 * Convert JWK to PEM format
 * @param {Object} jwk - JSON Web Key
 * @returns {string} PEM formatted public key
 */
function jwkToPem(jwk) {
  const { n, e } = jwk;
  
  // Simple conversion - for production use a library like jwk-to-pem
  const modulus = Buffer.from(n, 'base64');
  const exponent = Buffer.from(e, 'base64');
  
  // Create a basic RSA public key structure
  // This is a simplified version - in production use a proper library
  const pubkey = require('crypto').createPublicKey({
    key: {
      kty: 'RSA',
      n: n,
      e: e
    },
    format: 'jwk'
  });
  
  return pubkey.export({ type: 'spki', format: 'pem' });
}

/**
 * Decode JWT header without verification
 * @param {string} token - JWT token
 * @returns {Object} Decoded header
 */
function decodeJWTHeader(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  return header;
}

/**
 * Verify MindX ID token using JWKS
 * @param {string} token - JWT ID token from MindX
 * @returns {Promise<Object>} Decoded and verified token payload
 */
async function verifyMindXIdToken(token) {
  try {
    // Decode header to get kid
    const header = decodeJWTHeader(token);
    const kid = header.kid;
    
    if (!kid) {
      throw new Error('Token missing kid (Key ID) in header');
    }
    
    console.log(`🔍 Token kid: ${kid}, alg: ${header.alg}`);
    
    // Fetch public keys
    const publicKeys = await fetchMindXPublicKeys();
    const publicKey = publicKeys[kid];
    
    if (!publicKey) {
      throw new Error(`No public key found for kid: ${kid}`);
    }
    
    // Verify token
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: MINDX_ISSUER,
      audience: CLIENT_ID
    });
    
    console.log(`✅ Token verified for user: ${payload.sub}`);
    
    return payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error(`Invalid token: ${error.message}`);
    } else {
      throw error;
    }
  }
}

/**
 * Create display name from token payload
 * @param {Object} payload - JWT token payload
 * @returns {string} Display name
 */
function createDisplayName(payload) {
  if (payload.name) return payload.name;
  if (payload.given_name && payload.family_name) {
    return `${payload.given_name} ${payload.family_name}`;
  }
  
  // Priority 2: Use full name field
  if (payload.name) return payload.name;
  
  // Priority 3: Use only given_name
  if (payload.given_name) return payload.given_name;
  if (payload.preferred_username) return payload.preferred_username;
  if (payload.email) return payload.email.split('@')[0];
  return 'User';
}

module.exports = {
  verifyMindXIdToken,
  fetchMindXPublicKeys,
  createDisplayName,
  decodeJWTHeader
};
