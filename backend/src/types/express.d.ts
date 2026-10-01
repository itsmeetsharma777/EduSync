import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload & { sub: string; role: 'student' | 'admin'; sid: string };
    }
  }
}

export {};
