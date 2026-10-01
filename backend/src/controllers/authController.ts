import crypto from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User, type UserDocument } from '../models/User.js';

type Role = 'student' | 'admin';

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .superRefine((password, context) => {
    if (!/[a-z]/.test(password))
      context.addIssue({ code: 'custom', message: 'Use at least one lowercase letter.' });
    if (!/[A-Z]/.test(password))
      context.addIssue({ code: 'custom', message: 'Use at least one uppercase letter.' });
    if (!/\d/.test(password)) context.addIssue({ code: 'custom', message: 'Use at least one number.' });
    if (!/[^A-Za-z0-9]/.test(password))
      context.addIssue({ code: 'custom', message: 'Use at least one special character.' });
  });

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    email: z.string().email(),
    phone: z.string().trim().min(7).max(30),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
const signInSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const presentUser = (user: {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
}) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone ?? '',
  role: user.role as Role,
  avatarUrl: user.avatarUrl ?? undefined,
  isEmailVerified: user.isEmailVerified,
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? ('none' as const) : ('lax' as const),
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  };
}

async function createSession(user: UserDocument, req: Request, res: Response) {
  const sessionId = crypto.randomUUID();
  user.sessions = user.sessions.filter((session) => session.id !== sessionId).slice(-9);
  user.sessions.push({
    id: sessionId,
    userAgent: req.get('user-agent')?.slice(0, 200) ?? 'Unknown device',
    createdAt: new Date(),
    lastActiveAt: new Date(),
  });
  user.lastActiveAt = new Date();
  await user.save();
  const token = jwt.sign({ sub: user.id, role: user.role as Role, sid: sessionId }, env.jwtSecret, {
    expiresIn: '7d',
  });
  res.cookie('edusync_access', token, cookieOptions());
  return presentUser(user);
}

async function sendVerificationEmail(user: UserDocument, rawToken: string) {
  if (!env.resendApiKey || !env.emailFrom) return false;
  const verifyUrl = `${env.clientOrigin}/verify-email?token=${rawToken}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [user.email],
      subject: 'Verify your EduSync email',
      html: `<p>Welcome to EduSync, ${user.fullName}.</p><p><a href="${verifyUrl}">Verify your email</a></p>`,
    }),
  });
  return response.ok;
}

async function createVerificationToken(user: UserDocument) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.verificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await user.save();
  return rawToken;
}

async function loginWithPassword(req: Request, res: Response, requireAdmin = false) {
  const input = signInSchema.parse(req.body);
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash)))
    return res.status(401).json({ message: 'Invalid email or password.' });
  if (user.isSuspended) return res.status(403).json({ message: 'This account is currently suspended.' });
  if (requireAdmin && user.role !== 'admin')
    return res.status(403).json({ message: 'Administrator access is required for this portal.' });
  return res.json({ user: await createSession(user, req, res) });
}

export const signUp: RequestHandler = async (req, res) => {
  const input = signUpSchema.parse(req.body);
  const email = input.email.toLowerCase();
  const exists = await User.exists({ email });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await User.create({
    fullName: input.fullName,
    email,
    phone: input.phone,
    passwordHash: await bcrypt.hash(input.password, 12),
  });
  const verificationToken = await createVerificationToken(user);
  const emailQueued = await sendVerificationEmail(user, verificationToken);
  return res.status(201).json({
    user: await createSession(user, req, res),
    emailQueued,
    message: emailQueued
      ? 'Account created. Check your inbox to verify your email.'
      : 'Account created. Configure email delivery to enable verification emails.',
  });
};


const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string().min(1), password: passwordSchema, confirmPassword: z.string() })
  .refine((input) => input.password === input.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

async function sendPasswordResetEmail(user: UserDocument, rawToken: string) {
  if (!env.resendApiKey || !env.emailFrom) return false;
  const resetUrl = `${env.clientOrigin}/?resetToken=${rawToken}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [user.email],
      subject: 'Reset your EduSync password',
      html: `<p>Hi ${user.fullName},</p><p><a href="${resetUrl}">Reset your EduSync password</a></p><p>This link expires in 30 minutes.</p>`,
    }),
  });
  return response.ok;
}

export const requestPasswordReset: RequestHandler = async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();
    await sendPasswordResetEmail(user, rawToken);
  }
  return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const input = resetPasswordSchema.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) return res.status(400).json({ message: 'This password reset link is invalid or expired.' });
  user.passwordHash = await bcrypt.hash(input.password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.sessions.splice(0, user.sessions.length);
  await user.save();
  return res.json({ message: 'Password reset successfully. Please sign in again.' });
};

export const signIn: RequestHandler = async (req, res) => loginWithPassword(req, res);
export const adminSignIn: RequestHandler = async (req, res) => loginWithPassword(req, res, true);

export const getMe: RequestHandler = async (req, res) => {
  const user = await User.findById(req.auth!.sub);
  if (!user || user.isSuspended) return res.status(401).json({ message: 'Session is no longer valid.' });
  const session = user.sessions.find((item) => item.id === req.auth!.sid);
  if (!session) return res.status(401).json({ message: 'Session has expired.' });
  session.lastActiveAt = new Date();
  await user.save();
  return res.json({ user: presentUser(user) });
};

export const signOut: RequestHandler = async (req, res) => {
  await User.updateOne({ _id: req.auth!.sub }, { $pull: { sessions: { id: req.auth!.sid } } });
  res.clearCookie('edusync_access', cookieOptions());
  return res.status(204).end();
};

export const listSessions: RequestHandler = async (req, res) => {
  const user = await User.findById(req.auth!.sub).select('sessions');
  return res.json({
    sessions: (user?.sessions ?? []).map((session) => ({
      id: session.id,
      device: session.userAgent,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      current: session.id === req.auth!.sid,
    })),
  });
};

export const revokeSession: RequestHandler = async (req, res) => {
  if (req.params.sessionId === req.auth!.sid)
    return res.status(400).json({ message: 'Use sign out to remove this session.' });
  await User.updateOne({ _id: req.auth!.sub }, { $pull: { sessions: { id: req.params.sessionId } } });
  return res.status(204).end();
};

export const resendVerification: RequestHandler = async (req, res) => {
  const user = await User.findById(req.auth!.sub).select('+verificationTokenHash +verificationExpiresAt');
  if (!user) return res.status(404).json({ message: 'Account not found.' });
  if (user.isEmailVerified) return res.json({ message: 'Your email is already verified.' });
  const rawToken = await createVerificationToken(user);
  const emailQueued = await sendVerificationEmail(user, rawToken);
  return res.json({
    emailQueued,
    message: emailQueued ? 'Verification email sent.' : 'Email delivery is not configured yet.',
  });
};

export const verifyEmail: RequestHandler = async (req, res) => {
  const token = z.string().min(1).parse(req.query.token);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    verificationTokenHash: tokenHash,
    verificationExpiresAt: { $gt: new Date() },
  }).select('+verificationTokenHash +verificationExpiresAt');
  if (!user) return res.status(400).json({ message: 'This verification link is invalid or expired.' });
  user.isEmailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpiresAt = undefined;
  await user.save();
  return res.json({ message: 'Email verified. You can now continue to EduSync.' });
};
