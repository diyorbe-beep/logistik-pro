import jwt from 'jsonwebtoken';

export class TokenManager {
  constructor(secret, previousSecret = null) {
    this.secret = secret;
    this.previousSecret = previousSecret;
  }

  // Generate a new token
  generateToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: '24h',
      issuer: 'logistics-pro-api',
      audience: 'logistics-pro-client'
    };

    return jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: `${payload.id}-${Date.now()}`
      },
      this.secret,
      { ...defaultOptions, ...options }
    );
  }

  // Verify token with fallback to previous secret
  verifyToken(token) {
    return new Promise((resolve, reject) => {
      // Try current secret first
      jwt.verify(token, this.secret, (err, decoded) => {
        if (err) {
          // If current secret fails and we have a previous secret, try it
          if (this.previousSecret && err.name === 'JsonWebTokenError') {
            jwt.verify(token, this.previousSecret, (prevErr, prevDecoded) => {
              if (prevErr) {
                reject(prevErr);
              } else {
                resolve({ ...prevDecoded, needsRefresh: true });
              }
            });
          } else {
            reject(err);
          }
        } else {
          resolve(decoded);
        }
      });
    });
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }
}

// Singleton instance
let tokenManager = null;

export const getTokenManager = (secret, previousSecret) => {
  if (!tokenManager) {
    tokenManager = new TokenManager(secret, previousSecret);
  }
  return tokenManager;
};