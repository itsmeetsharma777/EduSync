import { Router } from 'express';
import {
  adminSignIn,
  requestPasswordReset,
  resetPassword,
  getMe,
  listSessions,
  resendVerification,
  revokeSession,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: 'draft-8', legacyHeaders: false });

export const authRoutes = Router();
authRoutes.post('/sign-up', authLimiter, signUp);
authRoutes.post('/sign-in', authLimiter, signIn);
authRoutes.post('/admin/sign-in', authLimiter, adminSignIn);
authRoutes.post('/password/forgot', authLimiter, requestPasswordReset);
authRoutes.post('/password/reset', authLimiter, resetPassword);
authRoutes.get('/me', requireAuth, getMe);
authRoutes.post('/sign-out', requireAuth, signOut);
authRoutes.get('/sessions', requireAuth, listSessions);
authRoutes.delete('/sessions/:sessionId', requireAuth, revokeSession);
authRoutes.post('/email/resend-verification', requireAuth, resendVerification);
authRoutes.get('/verify-email', verifyEmail);
