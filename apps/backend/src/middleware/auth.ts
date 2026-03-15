import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * Extended request type with admin user info from JWT
 */
export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

/**
 * JWT authentication middleware for admin routes.
 * Expects: Authorization: Bearer <token>
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
    };
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * API Key authentication for capture endpoints.
 * Used by Chrome Extension / Claude in Chrome.
 * Expects: X-API-Key: <key>
 */
export function requireCaptureKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== env.CAPTURE_API_KEY) {
    res.status(401).json({ success: false, error: 'Invalid API key' });
    return;
  }

  next();
}
