import { Router } from 'express';
import { createFeedback } from '../controllers/feedbackController.js';
import { requireAuth } from '../middleware/auth.js';

export const feedbackRoutes = Router();
feedbackRoutes.post('/', requireAuth, createFeedback);
