// ============================================
// JWT TOKEN PAYLOAD
// ============================================

export interface MindXTokenPayload {
    sub: string;                    // User ID
    iss: string;                    // Issuer
    aud: string;                    // Audience (Client ID)
    exp: number;                    // Expiration time
    iat: number;                    // Issued at
    email?: string;                 // User email
    name?: string;                  // Full name
    given_name?: string;            // First name
    family_name?: string;           // Last name
    preferred_username?: string;    // Username
    picture?: string;               // Avatar URL
}

// ============================================
// JWKS TYPES
// ============================================

export interface JWK {
    kty: string;    // Key type (e.g., "RSA")
    kid: string;    // Key ID
    use?: string;   // Key use (e.g., "sig")
    alg?: string;   // Algorithm (e.g., "RS256")
    n: string;      // RSA modulus
    e: string;      // RSA exponent
}

export interface JWKSResponse {
    keys: JWK[];
}

// ============================================
// USER TYPES
// ============================================

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    avatar?: string;
}
