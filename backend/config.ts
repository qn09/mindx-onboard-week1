// ============================================
// MINDX OPENID CONFIGURATION
// ============================================

export const MINDX_ISSUER = process.env.MINDX_ISSUER || 'https://id-dev.mindx.edu.vn';
export const CLIENT_ID = process.env.OPENID_CLIENT_ID || '';
export const MINDX_JWKS_URI = process.env.MINDX_JWKS_URI || 'https://id-dev.mindx.edu.vn/.well-known/jwks.json';

// Validate required environment variables
if (!CLIENT_ID) {
    console.warn('⚠️ OPENID_CLIENT_ID is not set in environment variables');
}

console.log('🔧 Configuration loaded:');
console.log(`   - Issuer: ${MINDX_ISSUER}`);
console.log(`   - Client ID: ${CLIENT_ID ? '***' + CLIENT_ID.slice(-4) : 'NOT SET'}`);
console.log(`   - JWKS URI: ${MINDX_JWKS_URI}`);
