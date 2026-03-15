import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

/**
 * Recursively sanitize all string values in an object to prevent XSS.
 * Strips HTML tags and dangerous attributes from all string fields.
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return xss(value, {
      whiteList: {}, // Strip ALL HTML tags
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

/**
 * Express middleware that sanitizes req.body and req.query
 * against XSS attacks. Applied globally.
 */
export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as any;
  }
  next();
}
