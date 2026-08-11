import { Router } from 'express';
import { summarizeLecture } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';

export const aiRoutes = Router();
aiRoutes.post('/lectures/summary', requireAuth, summarizeLecture);
