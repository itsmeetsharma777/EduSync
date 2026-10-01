import { Router } from 'express';
import { deleteUser, listUsers, platformStats, updateUser } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireRole('admin'));
adminRoutes.get('/users', listUsers);
adminRoutes.get('/stats', platformStats);
adminRoutes.patch('/users/:userId', updateUser);
adminRoutes.delete('/users/:userId', deleteUser);
