import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';

const BOOTSTRAPPED_ADMIN_EMAIL = 'vinayakacdemy@gmail.com';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) {
      try {
        req.user = await adminAuth.verifyIdToken(token);
      } catch {
        // Invalid or expired optional token; proceed unauthenticated
      }
    }
  }
  next();
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  const email = (req.user.email || '').toLowerCase();
  const emailVerified = req.user.email_verified === true;
  if (emailVerified && email === BOOTSTRAPPED_ADMIN_EMAIL) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Administrator access required' });
};
