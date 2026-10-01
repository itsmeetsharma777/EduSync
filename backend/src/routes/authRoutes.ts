import { Router } from 'express';
import {
  adminSignIn,
  getMe,
  googleCallback,
  googleStart,
  listSessions,
  resendVerification,
  revokeSession,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = Router();
authRoutes.post('/sign-up', signUp);
authRoutes.post('/sign-in', signIn);
authRoutes.post('/admin/sign-in', adminSignIn);
authRoutes.get('/me', requireAuth, getMe);
authRoutes.post('/sign-out', requireAuth, signOut);
authRoutes.get('/sessions', requireAuth, listSessions);
authRoutes.delete('/sessions/:sessionId', requireAuth, revokeSession);
authRoutes.post('/email/resend-verification', requireAuth, resendVerification);
authRoutes.get('/verify-email', verifyEmail);
authRoutes.get('/google', googleStart);
authRoutes.get('/google/callback', googleCallback);
