/**
 * Owner authentication middleware.
 * Verifies JWT tokens issued to property owners (via OTP flow).
 * Separate from admin auth - owners can only see their own listings.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface OwnerPayload {
  ownerId: string;
  phone: string; // normalized phone, for display
}

declare global {
  namespace Express {
    interface Request {
      owner?: OwnerPayload;
    }
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Owner token required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET + '_owner') as OwnerPayload;
    req.owner = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
