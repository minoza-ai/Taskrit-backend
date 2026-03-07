import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';
import { jwtUtil } from '../utils/jwt';

export const authMiddleware = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = jwtUtil.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuthMiddleware = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = jwtUtil.verifyAccessToken(token);

      if (payload) {
        req.user = payload;
      }
    }

    next();
  } catch (err) {
    next();
  }
};
