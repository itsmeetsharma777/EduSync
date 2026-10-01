export type LectureStatus = 'not_started' | 'in_progress' | 'completed';
export type TaskKind = 'assignment' | 'exam' | 'revision';

export type Lecture = {
  id: string;
  title: string;
  url: string;
  duration: string;
  channel: string;
  status: LectureStatus;
  favorite: boolean;
  bookmarked: boolean;
  tags: string[];
  note: string;
  summary?: string;
};

export type Subject = {
  id: string;
  name: string;
  detail: string;
  short: string;
  color: string;
  accent: 'lavender' | 'peach' | 'mint' | 'neutral';
  deadline: string;
  icon: string;
  pinned: boolean;
  lectures: Lecture[];
};

export type StudyTask = {
  id: string;
  title: string;
  subjectId: string;
  due: string;
  kind: TaskKind;
  priority: 'low' | 'medium' | 'high';
  done: boolean;
};

export type Note = {
  id: string;
  title: string;
  subjectId: string;
  body: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
};

export type Activity = {
  id: string;
  label: string;
  time: string;
  category: 'study' | 'note' | 'task' | 'account';
};

export type WorkspaceData = {
  subjects: Subject[];
  tasks: StudyTask[];
  notes: Note[];
  goals: Goal[];
  activity: Activity[];
  dailyGoalMinutes: number;
  studiedTodayMinutes: number;
  language: 'en' | 'es';
};
