import { Router } from 'express';
import { addLecture, createSubject, listSubjects } from '../controllers/subjectController.js';
import { requireAuth } from '../middleware/auth.js';

export const subjectRoutes = Router();
subjectRoutes.use(requireAuth);
subjectRoutes.route('/').get(listSubjects).post(createSubject);
subjectRoutes.post('/:subjectId/lectures', addLecture);
