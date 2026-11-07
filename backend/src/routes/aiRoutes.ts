import { Router } from 'express';
import { explainConcept, summarizeLecture } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';

export const aiRoutes = Router();
aiRoutes.post('/lectures/summary', requireAuth, summarizeLecture);
aiRoutes.post('/concept/explain', requireAuth, explainConcept);
