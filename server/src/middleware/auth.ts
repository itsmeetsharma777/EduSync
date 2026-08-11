import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.edusync_access ?? req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.auth = jwt.verify(token, env.jwtSecret) as Request['auth'];
    next();
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or expired.' });
  }
}

export function requireRole(role: 'student' | 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.auth?.role !== role)
      return res.status(403).json({ message: 'You do not have access to this resource.' });
    next();
  };
}
