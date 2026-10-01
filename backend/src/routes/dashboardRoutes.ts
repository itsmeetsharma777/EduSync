import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRoutes = Router();
dashboardRoutes.get('/', requireAuth, getDashboard);
