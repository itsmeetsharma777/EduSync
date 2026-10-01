import { Router } from 'express';
import { getWorkspace, saveWorkspace } from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/auth.js';

export const workspaceRoutes = Router();
workspaceRoutes.use(requireAuth);
workspaceRoutes.get('/', getWorkspace);
workspaceRoutes.put('/', saveWorkspace);
