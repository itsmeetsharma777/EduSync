import type { RequestHandler } from 'express';
import { Subject } from '../models/Subject.js';

export const getDashboard: RequestHandler = async (req, res) => {
  const subjects = await Subject.find({ owner: req.auth!.sub }).lean();
  const lectures = subjects.flatMap((subject) => subject.lectures);
  const completed = lectures.filter((lecture) => lecture.status === 'completed').length;
  const inProgress = lectures.filter((lecture) => lecture.status === 'in_progress').length;
  return res.json({
    metrics: {
      subjectCount: subjects.length,
      lectureCount: lectures.length,
      completedLectures: completed,
      pendingLectures: lectures.length - completed,
      completionPercent: lectures.length ? Math.round((completed / lectures.length) * 100) : 0,
      inProgressLectures: inProgress,
    },
  });
};
