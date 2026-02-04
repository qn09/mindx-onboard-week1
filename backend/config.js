/**
 * OpenID and MindX ID Configuration
 */
module.exports = {
  MINDX_ISSUER: process.env.MINDX_ISSUER || 'https://id-dev.mindx.edu.vn',
  MINDX_JWKS_URI: process.env.MINDX_JWKS_URI || 'https://id-dev.mindx.edu.vn/jwks',
  CLIENT_ID: process.env.OPENID_CLIENT_ID || '',
  CLIENT_SECRET: process.env.OPENID_CLIENT_SECRET || '',
  REDIRECT_URI: process.env.OPENID_REDIRECT_URI || 'https://quannv.id.vn/api/auth/callback'
};
