import jwt from 'jsonwebtoken';
import { createPublicKey } from 'crypto';
import { MindXTokenPayload, JWK, JWKSResponse } from './types';
import { MINDX_ISSUER, CLIENT_ID, MINDX_JWKS_URI } from './config';

// ============================================
// JWKS CACHE
// ============================================

let cachedKeys: Map<string, string> = new Map();
let keysExpiry: number = 0;

// ============================================
// FETCH MINDX PUBLIC KEYS (JWKS)
// ============================================

async function fetchMindXPublicKeys(): Promise<Map<string, string>> {
    const now = Date.now();
    if (cachedKeys.size > 0 && now < keysExpiry) {
        console.log('📦 Using cached public keys');
        return cachedKeys;
    }
    
    console.log('🌐 Fetching MindX public keys from JWKS endpoint...');
    console.log(`📍 JWKS URI: ${MINDX_JWKS_URI}`);
    
    try {
        const response = await fetch(MINDX_JWKS_URI);
        if (!response.ok) {
            throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
        }

        const jwks = await response.json() as JWKSResponse;
        const keysMap = new Map<string, string>();
        
        for (const key of jwks.keys) {
            const publicKey = createPublicKey({
                key: {
                    kty: key.kty,
                    n: key.n,
                    e: key.e,
                },
                format: 'jwk',
            });
            
            const publicKeyPEM = publicKey.export({
                type: 'spki',
                format: 'pem',
            }) as string;
            
            keysMap.set(key.kid, publicKeyPEM);
        }

        cachedKeys = keysMap;
        keysExpiry = now + 60 * 60 * 1000; // 1 hour
        
        console.log(`✅ Fetched ${keysMap.size} public keys from MindX`);
        return keysMap;
        
    } catch (error: any) {
        console.error('❌ Error fetching MindX public keys:', error.message);
        throw error;
    }
}

export function getKeysExpiry(): number {
    return keysExpiry;
}

// ============================================
// DECODE JWT HEADER
// ============================================

function decodeJWTHeader(token: string): { kid: string; alg: string } {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format: must have 3 parts (header.payload.signature)');
        }

        const headerBase64 = parts[0];
        const headerJson = Buffer.from(headerBase64, 'base64url').toString('utf-8');
        const header = JSON.parse(headerJson);

        if (!header.kid) {
            throw new Error('JWT header missing kid (key ID)');
        }

        return {
            kid: header.kid,
            alg: header.alg || 'RS256',
        };
    } catch (error: any) {
        throw new Error(`Failed to decode JWT header: ${error.message}`);
    }
}

// ============================================
// VERIFY JWT TOKEN
// ============================================

export async function verifyMindXIdToken(token: string): Promise<MindXTokenPayload> {
    console.log('🔍 Starting token verification...');

    const { kid, alg } = decodeJWTHeader(token);
    console.log(`🔑 JWT token using key ID: ${kid}, algorithm: ${alg}`);

    if (alg !== 'RS256') {
        throw new Error(`Unsupported algorithm: ${alg}. Only RS256 is supported`);
    }

    const publicKeys = await fetchMindXPublicKeys();
    const publicKeyPEM = publicKeys.get(kid);

    if (!publicKeyPEM) {
        throw new Error(`Public key with kid=${kid} not found in JWKS. MindX may have rotated keys.`);
    }

    let payload: any;
    
    try {
        payload = jwt.verify(token, publicKeyPEM, {
            algorithms: ['RS256'],
        }) as MindXTokenPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error(`Invalid token: ${error.message}`);
        }
        throw error;
    }

    if (payload.iss !== MINDX_ISSUER) {
        throw new Error(`Invalid issuer: ${payload.iss}. Must be ${MINDX_ISSUER}`);
    }

    if (payload.aud !== CLIENT_ID) {
        throw new Error(`Invalid audience: ${payload.aud}. Must be ${CLIENT_ID}`);
    }

    console.log('✅ Token verified successfully!');
    return payload;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createDisplayName(payload: MindXTokenPayload): string {
    const { name, given_name, family_name, preferred_username, sub } = payload;
    return name || 
           (given_name && family_name ? `${given_name} ${family_name}` : null) ||
           preferred_username ||
           sub;
}

export { fetchMindXPublicKeys };
