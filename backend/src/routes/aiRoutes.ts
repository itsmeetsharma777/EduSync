import { Router } from 'express';
import { summarizeLecture } from '../controllers/aiController.js';

export const aiRoutes = Router();
aiRoutes.post('/lectures/summary', summarizeLecture);
