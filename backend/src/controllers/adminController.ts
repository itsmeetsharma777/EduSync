import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Subject } from '../models/Subject.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';

export const listUsers: RequestHandler = async (_req, res) => {
  const users = await User.find()
    .select('fullName email phone role isSuspended isEmailVerified lastActiveAt createdAt')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({
    users: users.map((user) => ({
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      isSuspended: user.isSuspended,
      isEmailVerified: user.isEmailVerified,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
    })),
  });
};

export const updateUser: RequestHandler = async (req, res) => {
  const input = z
    .object({
      fullName: z.string().trim().min(2).max(80).optional(),
      phone: z.string().trim().max(30).optional(),
      isSuspended: z.boolean().optional(),
      role: z.enum(['student', 'admin']).optional(),
    })
    .parse(req.body);
  if (req.params.userId === req.auth!.sub && (input.isSuspended === true || input.role === 'student')) {
    return res.status(400).json({ message: 'You cannot suspend or demote your own administrator account.' });
  }
  const user = await User.findByIdAndUpdate(req.params.userId, input, { new: true }).select(
    'fullName email phone role isSuspended isEmailVerified',
  );
  if (!user) return res.status(404).json({ message: 'User not found.' });
  return res.json({ user: { id: user._id.toString(), fullName: user.fullName, email: user.email, phone: user.phone ?? '', role: user.role, isSuspended: user.isSuspended, isEmailVerified: user.isEmailVerified } });
};

export const deleteUser: RequestHandler = async (req, res) => {
  if (req.params.userId === req.auth!.sub) return res.status(400).json({ message: 'You cannot delete your own administrator account.' });
  await Promise.all([
    User.findByIdAndDelete(req.params.userId),
    Subject.deleteMany({ owner: req.params.userId }),
    Workspace.deleteOne({ owner: req.params.userId }),
  ]);
  return res.status(204).end();
};

export const platformStats: RequestHandler = async (_req, res) => {
  const [users, activeUsers, subjects] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isSuspended: false }),
    Subject.countDocuments(),
  ]);
  return res.json({ users, activeUsers, subjects, health: 'healthy' });
};
