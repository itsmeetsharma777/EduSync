import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.edusync_access ?? req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const auth = jwt.verify(token, env.jwtSecret) as Request['auth'];
    if (!auth?.sub || !auth.sid) return res.status(401).json({ message: 'Your session is invalid or expired.' });

    const user = await User.findById(auth.sub).select('role isSuspended sessions');
    if (!user || user.isSuspended) return res.status(401).json({ message: 'Your session is no longer valid.' });

    const session = user.sessions.find((item: any) => item.id === auth.sid);
    if (!session) return res.status(401).json({ message: 'Your session has been revoked.' });

    req.auth = { ...auth, role: user.role as 'student' | 'admin' };
    session.lastActiveAt = new Date();
    await user.save();
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
