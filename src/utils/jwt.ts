import jwt from 'jsonwebtoken';
import { JWTPayload, TokenResponse } from '../types';

const accessSecret = process.env.JWT_ACCESS_SECRET || 'your_access_secret_key';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key';
const accessExpiresIn = parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '3600');
const refreshExpiresIn = parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '1209600');

export const jwtUtil = {
  generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenResponse {
    const access_token = jwt.sign(payload, accessSecret, {
      expiresIn: accessExpiresIn,
    });

    const refresh_token = jwt.sign(payload, refreshSecret, {
      expiresIn: refreshExpiresIn,
    });

    return {
      access_token,
      refresh_token,
      expires_in: accessExpiresIn,
    };
  },

  verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, accessSecret) as JWTPayload;
    } catch (err) {
      return null;
    }
  },

  verifyRefreshToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, refreshSecret) as JWTPayload;
    } catch (err) {
      return null;
    }
  },
};
