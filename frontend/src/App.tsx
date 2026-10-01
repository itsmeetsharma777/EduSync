import {
  Component,
  type FormEvent,
  type ReactNode,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Command,
  Download,
  Flame,
  FolderPlus,
  GraduationCap,
  Heart,
  Home,
  Inbox,
  Keyboard,
  Languages,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Sun,
  Target,
  Timer,
  Trash2,
  Trophy,
  Upload,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'react-toastify';
import { Avatar } from './components/common/Avatar';
import { Progress } from './components/common/Progress';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import type { View } from './types/navigation';
import { downloadFile, makeId, useLocalStorage } from './utils/storage';
import { loadWorkspace, persistWorkspace, submitFeedback } from './services/api';
import { seedWorkspace } from './data/seedWorkspace';
import type { Lecture, LectureStatus, Note, StudyDay, StudyTask, Subject, TaskKind, WorkspaceData } from './types';
import {
  apiConfigured,
  clearSession,
  createAccount,
  createDemoAdmin,
  deleteManagedUser,
  getCurrentUser,
  listManagedUsers,
  listSessions,
  readSession,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  saveSession,
  signIn,
  signOut,
  summarizeLecture,
  updateManagedUser,
  verifyEmail,
  type AuthUser,
} from './services/auth';

type ModalName = 'new-subject' | 'new-task' | 'subject' | null;

function getStudyWeek(history: StudyDay[]) {
  const byDate = new Map(history.map((entry) => [entry.date, entry.minutes]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { day: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date), mins: byDate.get(key) ?? 0 };
  });
}

function studyStreak(history: StudyDay[]) {
  const activeDates = new Set(history.filter((entry) => entry.minutes > 0).map((entry) => entry.date));
  let streak = 0;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  while (activeDates.has(date.toISOString().slice(0, 10))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function openLecture(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function normalizeWorkspace(workspace: WorkspaceData): WorkspaceData {
  const today = new Date().toISOString().slice(0, 10);
  const history = [...(workspace.studyHistory ?? [])];
  if (!history.length && workspace.studiedTodayMinutes > 0) history.push({ date: today, minutes: workspace.studiedTodayMinutes });
  const todayEntry = history.find((entry) => entry.date === today);
  return { ...workspace, studyHistory: history.slice(-366), studiedTodayMinutes: todayEntry?.minutes ?? 0 };
}

const quotes = [
  'Progress becomes visible when you give your attention somewhere on purpose.',
  'You do not need a perfect day. You need one honest study block.',
  'Learn deeply, review lightly, repeat often.',
  'A clear next step beats a long list of intentions.',
];

function formatDate(value?: string) {
  if (!value) return 'No deadline';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
}

function formatLongDate() {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function subjectProgress(subject: Subject) {
  if (!subject.lectures.length) return 0;
  return Math.round(
    (subject.lectures.filter((lecture) => lecture.status === 'completed').length /
      subject.lectures.length) *
      100,
  );
}

function subjectName(subjects: Subject[], id: string) {
  return subjects.find((subject) => subject.id === id)?.name ?? 'General study';
}

function getYoutubeThumbnail(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop();
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  } catch {
    return '';
  }
}

function cycleLectureStatus(status: LectureStatus): LectureStatus {
  if (status === 'not_started') return 'in_progress';
  if (status === 'in_progress') return 'completed';
  return 'not_started';
}

function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

function EmptyState({
  icon = <Inbox size={22} />,
  title,
  text,
  action,
  onAction,
}: {
  icon?: ReactNode;
  title?: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      {title && <strong>{title}</strong>}
      <p>{text}</p>
      {action && (
        <button className="button button-secondary" onClick={onAction}>
          {action} <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="metric-card">
      <div className="metric-top">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <strong>{value}</strong>
      <span className="metric-hint">{hint}</span>
    </Card>
  );
}

function FocusTimer({ onFinish }: { onFinish: (minutes: number) => void }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          onFinish(25);
          toast.success('25-minute focus block complete. Nice work.');
          return 25 * 60;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, onFinish]);

  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');

  return (
    <div className="timer-widget">
      <div className="timer-ring">
        <span className="timer-time">{minutes}:{remaining}</span>
        <span className="timer-label">FOCUS BLOCK</span>
      </div>
      <div className="timer-copy">
        <span className="eyebrow">FOCUS</span>
        <h3>One block. One task.</h3>
        <p>Work for 25 minutes, then take a short break. Completed blocks count toward today.</p>
        <button className="button button-primary" onClick={() => setRunning((value) => !value)}>
          {running ? <><Clock3 size={16} /> Pause block</> : <><Play size={16} fill="currentColor" /> Start 25 min</>}
        </button>
      </div>
    </div>
  );
}

function Dashboard({
  data,
  user,
  setActive,
  openSubject,
  openNewSubject,
  setFocusMode,
  addMinutes,
}: {
  data: WorkspaceData;
  user: AuthUser;
  setActive: (view: View) => void;
  openSubject: (id: string) => void;
  openNewSubject: () => void;
  setFocusMode: (value: boolean) => void;
  addMinutes: (minutes: number) => void;
}) {
  const [quote, setQuote] = useState(0);
  const firstIncomplete = data.subjects
    .flatMap((subject) =>
      subject.lectures
        .filter((lecture) => lecture.status !== 'completed')
        .map((lecture) => ({ lecture, subject })),
    )
    .at(0);
  const openTasks = data.tasks.filter((task) => !task.done).sort((a, b) => a.due.localeCompare(b.due));
  const progress = Math.min(100, Math.round((data.studiedTodayMinutes / data.dailyGoalMinutes) * 100));
  const weeklyFocus = getStudyWeek(data.studyHistory);
  const streak = studyStreak(data.studyHistory);
  const completedLessons = data.subjects.reduce(
    (sum, subject) => sum + subject.lectures.filter((lecture) => lecture.status === 'completed').length,
    0,
  );
  const totalLessons = data.subjects.reduce((sum, subject) => sum + subject.lectures.length, 0);

  return (
    <div className="page">
      <section className="page-hero dashboard-hero">
        <div>
          <span className="eyebrow"><CalendarDays size={13} /> {formatLongDate()}</span>
          <h1>Good morning, {user.fullName.split(' ')[0]}.</h1>
          <p>Keep today simple: choose the next useful thing and give it your full attention.</p>
        </div>
        <div className="hero-actions">
          <button className="button button-secondary" onClick={() => setFocusMode(true)}>
            <Timer size={16} /> Focus mode
          </button>
          <button className="button button-primary" onClick={openNewSubject}>
            <Plus size={17} /> New subject
          </button>
        </div>
      </section>

      <section className="today-grid">
        <Card className="today-card">
          <div className="today-progress">
            <div className="progress-ring-large" style={{ '--progress': `${progress * 3.6}deg` } as CSSProperties}>
              <div>
                <strong>{progress}%</strong>
                <span>today</span>
              </div>
            </div>
          </div>
          <div className="today-copy">
            <span className="eyebrow">TODAY'S STUDY GOAL</span>
            <h2>{data.studiedTodayMinutes} <small>/ {data.dailyGoalMinutes} min</small></h2>
            <p>{progress >= 100 ? 'Goal complete. Keep the momentum gentle.' : `${data.dailyGoalMinutes - data.studiedTodayMinutes} minutes left to reach your goal.`}</p>
            <button className="text-link" onClick={() => setFocusMode(true)}>Start a focus block <ArrowRight size={15} /></button>
          </div>
          <div className="today-stats">
            <div><strong>{data.subjects.length}</strong><span>subjects</span></div>
            <div><strong>{completedLessons}/{totalLessons}</strong><span>lessons</span></div>
            <div><strong>{data.notes.length}</strong><span>notes</span></div>
          </div>
        </Card>

        <Card className="next-card">
          <div className="card-heading">
            <div><span className="eyebrow">CONTINUE LEARNING</span><h3>Your next lesson</h3></div>
            <Play size={18} />
          </div>
          {firstIncomplete ? (
            <button className="next-lesson" onClick={() => openSubject(firstIncomplete.subject.id)}>
              <div className="lesson-art">
                {getYoutubeThumbnail(firstIncomplete.lecture.url) ? (
                  <img src={getYoutubeThumbnail(firstIncomplete.lecture.url)} alt="" />
                ) : <BookOpen size={25} />}
              </div>
              <div>
                <strong>{firstIncomplete.lecture.title}</strong>
                <span>{firstIncomplete.subject.name} · {firstIncomplete.lecture.duration}</span>
                <small>{firstIncomplete.lecture.channel}</small>
              </div>
              <ArrowRight size={18} />
            </button>
          ) : (
            <EmptyState text="Create a subject and add your first lesson to start learning." action="Create subject" onAction={openNewSubject} />
          )}
        </Card>
      </section>

      <div className="metric-grid">
        <MetricCard icon={<Flame size={18} />} label="Study streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} hint={streak ? 'Consecutive study days' : 'Start a study block today'} />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Tasks left" value={String(openTasks.length)} hint="Across your study plan" />
        <MetricCard icon={<Trophy size={18} />} label="Lessons complete" value={String(completedLessons)} hint={`${totalLessons || 0} lessons tracked`} />
        <MetricCard icon={<Zap size={18} />} label="Workspace" value={apiConfigured ? 'Synced' : 'Preview'} hint={apiConfigured ? 'Cloud persistence on' : 'Connect the API for sync'} />
      </div>

      <div className="dashboard-columns">
        <Card>
          <div className="card-heading">
            <div><span className="eyebrow">THIS WEEK</span><h3>Study rhythm</h3></div>
            <button className="icon-link" onClick={() => setActive('Analytics')} aria-label="Open analytics"><BarChart3 size={18} /></button>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weeklyFocus}>
                <defs>
                  <linearGradient id="studyFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity=".32" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="mins" stroke="var(--accent)" strokeWidth={3} fill="url(#studyFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <div><span className="eyebrow">UP NEXT</span><h3>Study queue</h3></div>
            <button className="text-link" onClick={() => setActive('Tasks')}>View all <ArrowRight size={14} /></button>
          </div>
          <div className="queue">
            {openTasks.slice(0, 4).map((task) => (
              <button className="queue-item" key={task.id} onClick={() => setActive('Tasks')}>
                <span className={`priority-dot ${task.priority}`} />
                <div><strong>{task.title}</strong><span>{subjectName(data.subjects, task.subjectId)} · {formatDate(task.due)}</span></div>
                <ChevronRight size={16} />
              </button>
            ))}
            {!openTasks.length && <EmptyState icon={<Check size={22} />} title="Queue is clear" text="Nice. Add a study task when you know what comes next." action="Open planner" onAction={() => setActive('Planner')} />}
          </div>
        </Card>
      </div>

      <div className="dashboard-columns">
        <Card>
          <div className="card-heading">
            <div><span className="eyebrow">LEARNING SPACES</span><h3>Your subjects</h3></div>
            <button className="text-link" onClick={() => setActive('My subjects')}>See all <ArrowRight size={14} /></button>
          </div>
          <div className="subject-mini-list">
            {data.subjects.slice(0, 4).map((subject) => (
              <button key={subject.id} className="subject-mini" onClick={() => openSubject(subject.id)}>
                <span className={`subject-dot ${subject.accent}`}>{subject.icon}</span>
                <div><strong>{subject.name}</strong><span>{subject.lectures.length} lessons</span></div>
                <div className="mini-progress"><i style={{ width: `${subjectProgress(subject)}%` }} /></div>
                <b>{subjectProgress(subject)}%</b>
              </button>
            ))}
            {!data.subjects.length && <EmptyState text="Your learning spaces will appear here." action="Create subject" onAction={openNewSubject} />}
          </div>
        </Card>

        <Card className="quote-card">
          <span className="quote-mark">“</span>
          <span className="eyebrow">STUDY NOTE</span>
          <blockquote>{quotes[quote]}</blockquote>
          <button className="button button-ghost" onClick={() => setQuote((current) => (current + 1) % quotes.length)}>
            Another thought <RotateCcw size={14} />
          </button>
        </Card>
      </div>
    </div>
  );
}

function SubjectsPage({
  data,
  openSubject,
  openNewSubject,
  togglePin,
  deleteSubject,
}: {
  data: WorkspaceData;
  openSubject: (id: string) => void;
  openNewSubject: () => void;
  togglePin: (id: string) => void;
  deleteSubject: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pinned'>('all');
  const filtered = data.subjects.filter((subject) => {
    const progress = subjectProgress(subject);
    if (filter === 'active') return progress < 100;
    if (filter === 'completed') return progress === 100;
    if (filter === 'pinned') return subject.pinned;
    return true;
  });

  return (
    <div className="page">
      <PageHeader eyebrow="LEARNING SPACES" title="My subjects" text="Turn every subject into a clear path of lessons, notes, and progress." action="New subject" onAction={openNewSubject} />
      <div className="filter-tabs">
        {([['all', 'All'], ['active', 'In progress'], ['pinned', 'Pinned'], ['completed', 'Completed']] as const).map(([value, label]) => (
          <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>
      <div className="subject-grid-new">
        {filtered.map((subject) => {
          const progress = subjectProgress(subject);
          return (
            <motion.article key={subject.id} className="subject-card-new" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className={`subject-banner ${subject.accent}`} style={{ borderTopColor: subject.color }}>
                <span>{subject.icon}</span>
                <div>
                  <small>{subject.short}</small>
                  {subject.pinned && <b><Bookmark size={12} fill="currentColor" /> Pinned</b>}
                </div>
                <button className="icon-button soft" onClick={() => togglePin(subject.id)} aria-label="Toggle pinned"><Bookmark size={15} fill={subject.pinned ? 'currentColor' : 'none'} /></button>
              </div>
              <button className="subject-card-body" onClick={() => openSubject(subject.id)}>
                <div><h3>{subject.name}</h3><p>{subject.detail}</p></div>
                <div className="subject-meta"><span>{subject.lectures.length} lessons</span><span>Due {formatDate(subject.deadline)}</span></div>
                <div className="progress-line"><i style={{ width: `${progress}%` }} /><b>{progress}%</b></div>
              </button>
              <div className="subject-footer">
                <button onClick={() => openSubject(subject.id)}><BookOpen size={14} /> Open learning space</button>
                <button className="danger-icon" onClick={() => deleteSubject(subject.id)} aria-label={`Delete ${subject.name}`}><Trash2 size={15} /></button>
              </div>
            </motion.article>
          );
        })}
        <button className="new-subject-card" onClick={openNewSubject}>
          <span><Plus size={23} /></span>
          <strong>Create a learning space</strong>
          <small>Start with a subject, course, exam, or skill.</small>
        </button>
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  text,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="page-header">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>
      {action && <button className="button button-primary" onClick={onAction}><Plus size={17} /> {action}</button>}
    </section>
  );
}

function TasksPage({
  data,
  toggleTask,
  deleteTask,
  openNewTask,
}: {
  data: WorkspaceData;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  openNewTask: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');
  const tasks = data.tasks.filter((task) => filter === 'all' || (filter === 'done' ? task.done : !task.done));

  return (
    <div className="page">
      <PageHeader eyebrow="STUDY PLAN" title="Tasks" text="Keep assignments, exams, and revision blocks visible without turning your day into a checklist." action="Add task" onAction={openNewTask} />
      <div className="filter-tabs">
        {([['open', 'Open'], ['all', 'All'], ['done', 'Completed']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <Card className="task-card">
        {tasks.length ? tasks.map((task) => (
          <article className={`task-row ${task.done ? 'done' : ''}`} key={task.id}>
            <button className="check-button" onClick={() => toggleTask(task.id)} aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}>
              {task.done ? <CheckCircle2 size={21} /> : <Circle size={21} />}
            </button>
            <div className="task-main">
              <strong>{task.title}</strong>
              <span>{subjectName(data.subjects, task.subjectId)} · {task.kind} · Due {formatDate(task.due)}</span>
            </div>
            <span className={`priority-pill ${task.priority}`}>{task.priority}</span>
            <button className="danger-icon" onClick={() => deleteTask(task.id)} aria-label="Delete task"><Trash2 size={15} /></button>
          </article>
        )) : <EmptyState title="Nothing here" text={filter === 'done' ? 'Completed tasks will collect here.' : 'Your open study tasks will appear here.'} action="Add task" onAction={openNewTask} />}
      </Card>
    </div>
  );
}

function PlannerPage({ data, setActive, openNewTask }: { data: WorkspaceData; setActive: (view: View) => void; openNewTask: () => void }) {
  const upcoming = data.tasks.filter((task) => !task.done).sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div className="page">
      <PageHeader eyebrow="PLAN AHEAD" title="Planner" text="See what deserves your attention next and protect your study time." action="Add task" onAction={openNewTask} />
      <div className="planner-grid">
        <Card className="planner-calendar">
          <div className="card-heading"><div><span className="eyebrow">UPCOMING</span><h3>Study calendar</h3></div><CalendarDays size={19} /></div>
          <div className="calendar-list">
            {upcoming.map((task) => (
              <button key={task.id} className="calendar-item" onClick={() => setActive('Tasks')}>
                <div className="calendar-date"><b>{new Date(task.due).getDate()}</b><span>{new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(task.due))}</span></div>
                <div><strong>{task.title}</strong><span>{subjectName(data.subjects, task.subjectId)} · {task.kind}</span></div>
                <ArrowRight size={16} />
              </button>
            ))}
            {!upcoming.length && <EmptyState icon={<CalendarDays size={22} />} title="Your calendar is quiet" text="Add a task when you have an assignment, exam, or revision session to protect." action="Add task" onAction={openNewTask} />}
          </div>
        </Card>
        <Card className="planner-focus">
          <div className="planner-orb"><Target size={30} /></div>
          <span className="eyebrow">PLANNING RULE</span>
          <h2>Make the next step smaller.</h2>
          <p>Instead of “study Operating Systems”, create one concrete block: “revise process scheduling for 25 minutes”.</p>
          <button className="button button-primary" onClick={openNewTask}>Create a focused block <ArrowRight size={15} /></button>
        </Card>
      </div>
    </div>
  );
}

function NotesPage({
  data,
  updateNote,
  newNote,
  deleteNote,
  onVideoSummary,
}: {
  data: WorkspaceData;
  updateNote: (note: Note) => void;
  newNote: () => void;
  deleteNote: (id: string) => void;
  onVideoSummary: (lecture: Lecture) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(data.notes[0]?.id ?? null);
  const selected = data.notes.find((note) => note.id === selectedId) ?? data.notes[0];

  useEffect(() => {
    if (!selectedId && data.notes[0]) setSelectedId(data.notes[0].id);
    if (selectedId && !data.notes.some((note) => note.id === selectedId)) setSelectedId(data.notes[0]?.id ?? null);
  }, [data.notes, selectedId]);

  return (
    <div className="page">
      <PageHeader eyebrow="THINKING SPACE" title="Notes" text="Capture what you understand, not just what you heard." action="New note" onAction={newNote} />
      <div className="notes-layout">
        <Card className="notes-sidebar">
          <div className="notes-sidebar-head"><strong>{data.notes.length} notes</strong><button className="icon-button" onClick={newNote} aria-label="New note"><Plus size={17} /></button></div>
          {data.notes.map((note) => (
            <button key={note.id} className={`note-list-item ${selected?.id === note.id ? 'active' : ''}`} onClick={() => setSelectedId(note.id)}>
              <NotebookPen size={16} />
              <div><strong>{note.title}</strong><span>{subjectName(data.subjects, note.subjectId)}</span></div>
            </button>
          ))}
          {!data.notes.length && <EmptyState text="Your notes will appear here." action="Create note" onAction={newNote} />}
        </Card>
        <Card className="note-editor">
          {selected ? (
            <>
              <div className="note-editor-top">
                <div><span className="eyebrow">{subjectName(data.subjects, selected.subjectId)}</span><input value={selected.title} onChange={(event) => updateNote({ ...selected, title: event.target.value, updatedAt: new Date().toISOString() })} /></div>
                <button className="danger-icon" onClick={() => { deleteNote(selected.id); setSelectedId(null); }} aria-label="Delete note"><Trash2 size={16} /></button>
              </div>
              <textarea value={selected.body} onChange={(event) => updateNote({ ...selected, body: event.target.value, updatedAt: new Date().toISOString() })} placeholder="Write your understanding here…" />
              <div className="editor-footer"><span>Auto-saved to your workspace</span><span>{new Date(selected.updatedAt).toLocaleString('en-IN')}</span></div>
            </>
          ) : <EmptyState icon={<NotebookPen size={22} />} title="Start thinking on paper" text="Create a note and connect it to a subject." action="New note" onAction={newNote} />}
        </Card>
      </div>
      <Card className="ai-study-card">
        <div className="ai-study-icon"><Sparkles size={21} /></div>
        <div><span className="eyebrow">AI STUDY TOOL</span><h3>Summarize a lecture when you need a second pass.</h3><p>Open a subject, then use the lecture AI summary action. Your notes remain yours; AI is a study aid.</p></div>
        <button className="button button-secondary" onClick={() => {
          const lecture = data.subjects.flatMap((subject) => subject.lectures).find((item) => item.url);
          if (lecture) onVideoSummary(lecture); else toast.info('Add a lecture link first.');
        }}>Use lecture summary <Sparkles size={15} /></button>
      </Card>
    </div>
  );
}

function AnalyticsPage({ data }: { data: WorkspaceData }) {
  const weeklyFocus = getStudyWeek(data.studyHistory ?? []);
  const streak = studyStreak(data.studyHistory ?? []);
  const completed = data.subjects.reduce((sum, subject) => sum + subject.lectures.filter((lecture) => lecture.status === 'completed').length, 0);
  const total = data.subjects.reduce((sum, subject) => sum + subject.lectures.length, 0);
  const focusMix = data.subjects.map((subject, index) => ({
    name: subject.name,
    value: Math.max(1, subject.lectures.length),
    color: ['#5b5ce2', '#0ea5a0', '#d97706', '#2563eb'][index % 4],
  }));
  return (
    <div className="page">
      <PageHeader eyebrow="REFLECTION" title="Analytics" text="Use your study data to notice patterns, not to judge yourself." />
      <div className="metric-grid">
        <MetricCard icon={<Timer size={18} />} label="Today" value={`${data.studiedTodayMinutes} min`} hint={`${data.dailyGoalMinutes} min daily target`} />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Completed" value={String(completed)} hint={`${total} lessons tracked`} />
        <MetricCard icon={<Flame size={18} />} label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} hint={streak ? 'Current consistency' : 'Study today to start'} />
        <MetricCard icon={<Target size={18} />} label="Goals" value={String(data.goals.length)} hint="Active learning goals" />
      </div>
      <div className="analytics-grid-new">
        <Card className="analytics-main">
          <div className="card-heading"><div><span className="eyebrow">FOCUS TIME</span><h3>Seven-day rhythm</h3></div><LineChart size={19} /></div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyFocus} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 6" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
              <Bar dataKey="mins" fill="var(--accent)" radius={[8, 8, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="analytics-side">
          <div className="card-heading"><div><span className="eyebrow">SUBJECT MIX</span><h3>Where your attention lives</h3></div><BookOpen size={19} /></div>
          {focusMix.length ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart><Pie data={focusMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4} stroke="none">{focusMix.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              <div className="legend-list">{focusMix.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.value}</b></span>)}</div>
            </>
          ) : <EmptyState text="Add subjects to see your focus mix." />}
        </Card>
      </div>
      <Card className="insight-card">
        <div className="insight-icon"><LightbulbIcon /></div>
        <div><span className="eyebrow">REFLECTION PROMPT</span><h3>What helped you study well this week?</h3><p>Use your notes and activity to identify one habit worth repeating next week.</p></div>
      </Card>
    </div>
  );
}

function LightbulbIcon() {
  return <Sparkles size={23} />;
}

function LibraryPage({ data, updateLecture }: { data: WorkspaceData; updateLecture: (subjectId: string, lecture: Lecture) => void }) {
  const [tab, setTab] = useState<'bookmarks' | 'favorites' | 'history'>('bookmarks');
  const resources = data.subjects.flatMap((subject) => subject.lectures.map((lecture) => ({ lecture, subject }))).filter(({ lecture }) =>
    tab === 'bookmarks' ? lecture.bookmarked : tab === 'favorites' ? lecture.favorite : lecture.status !== 'not_started',
  );
  return (
    <div className="page">
      <PageHeader eyebrow="YOUR RESOURCE SHELF" title="Library" text="Keep useful lectures close. Save them by bookmarking or marking them as favorites." />
      <div className="filter-tabs">{([['bookmarks', 'Bookmarks'], ['favorites', 'Favorites'], ['history', 'Learning history']] as const).map(([value, label]) => <button key={value} className={tab === value ? 'selected' : ''} onClick={() => setTab(value)}>{label}</button>)}</div>
      <Card className="resource-card">
        {resources.length ? resources.map(({ lecture, subject }) => (
          <article className="resource-row" key={lecture.id}>
            <button className="resource-open" onClick={() => openLecture(lecture.url)} aria-label={`Open ${lecture.title}`}>
            <div className="resource-thumb">{getYoutubeThumbnail(lecture.url) ? <img src={getYoutubeThumbnail(lecture.url)} alt="" /> : <BookOpen size={21} />}</div>
            </button>
            <div className="resource-main"><strong>{lecture.title}</strong><span>{subject.name} · {lecture.channel} · {lecture.duration}</span></div>
            <span className={`status-badge ${lecture.status}`}>{lecture.status.replace('_', ' ')}</span>
            <button className="icon-button" onClick={() => updateLecture(subject.id, { ...lecture, favorite: !lecture.favorite })} aria-label="Toggle favorite"><Heart size={17} fill={lecture.favorite ? 'currentColor' : 'none'} /></button>
            <button className="icon-button" onClick={() => updateLecture(subject.id, { ...lecture, bookmarked: !lecture.bookmarked })} aria-label="Toggle bookmark"><Bookmark size={17} fill={lecture.bookmarked ? 'currentColor' : 'none'} /></button>
          </article>
        )) : <EmptyState icon={tab === 'favorites' ? <Heart size={22} /> : <Bookmark size={22} />} title="Your shelf is waiting" text={tab === 'history' ? 'Start a lesson and it will appear here.' : 'Save a lecture from a subject to see it here.'} />}
      </Card>
    </div>
  );
}

function SettingsPage({
  data,
  setData,
  user,
  onExport,
  onImport,
}: {
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  user: AuthUser;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; device: string; createdAt: string; lastActiveAt: string; current: boolean }>>([]);
  const [summary, setSummary] = useLocalStorage('edusync-weekly-summary', false);

  useEffect(() => {
    listSessions().then(setSessions).catch(() => undefined);
  }, [user.id]);

  return (
    <div className="page">
      <PageHeader eyebrow="YOUR WORKSPACE" title="Settings" text="Personalize EduSync and keep control of your account and data." />
      <div className="settings-grid-new">
        <Card>
          <div className="settings-heading"><Languages size={19} /><div><h3>Language preference</h3><p>Choose your preferred language for future localized study content.</p></div></div>
          <div className="segmented">{(['en', 'es'] as const).map((language) => <button key={language} className={data.language === language ? 'selected' : ''} onClick={() => setData({ ...data, language })}>{language === 'en' ? 'English' : 'Español'}</button>)}</div>
        </Card>
        <Card>
          <div className="settings-heading"><Download size={19} /><div><h3>Workspace backup</h3><p>Export or restore your subjects, tasks, notes, and goals.</p></div></div>
          <div className="button-row"><button className="button button-secondary" onClick={onExport}><Download size={15} /> Export</button><button className="button button-secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import</button><input ref={fileRef} type="file" accept="application/json" hidden onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} /></div>
        </Card>
        <Card>
          <div className="settings-heading"><Inbox size={19} /><div><h3>Weekly review reminder</h3><p>Keep a local reminder preference for your weekly reflection.</p></div></div>
          <label className="switch-row"><input type="checkbox" checked={summary} onChange={(event) => setSummary(event.target.checked)} /><span /> Weekly progress summary</label>
        </Card>
        <Card>
          <div className="settings-heading"><Keyboard size={19} /><div><h3>Shortcuts</h3><p>Keep your hands on the keyboard.</p></div></div>
          <div className="shortcut-list"><span><kbd>⌘ K</kbd> Command palette</span><span><kbd>F</kbd> Focus mode</span><span><kbd>Esc</kbd> Close panels</span></div>
        </Card>
      </div>
      <Card className="sessions-card">
        <div className="card-heading"><div><span className="eyebrow">SECURITY</span><h3>Active sessions</h3></div><ShieldCheck size={19} /></div>
        {sessions.length ? sessions.map((session) => (
          <div className="session-row" key={session.id}><UserRound size={17} /><div><strong>{session.device}</strong><span>{session.current ? 'Current session' : `Last active ${formatDate(session.lastActiveAt)}`}</span></div>{!session.current && <button className="button button-secondary" onClick={async () => { try { await revokeSession(session.id); setSessions((current) => current.filter((item) => item.id !== session.id)); toast.success('Session signed out.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to sign out.'); } }}>Sign out</button>}</div>
        )) : <p className="muted-copy">Session management is available when the backend API is connected.</p>}
      </Card>
      <Card className="danger-zone">
        <div className="settings-heading"><ShieldAlert size={19} /><div><h3>Account safety</h3><p>Sign out other devices from the security section above. Workspace backups remain under your control.</p></div></div>
        <div className="danger-zone-note"><strong>Need to start fresh?</strong><span>Export a backup before removing local workspace data.</span></div>
        <button className="button button-secondary" onClick={() => { if (window.confirm('Clear this browser’s cached workspace? Your cloud workspace will remain available when you sign in again.')) { localStorage.removeItem(`edusync-workspace-v4-${user.id}`); toast.success('Local cache cleared.'); window.location.reload(); } }}>Clear local cache</button>
      </Card>
      <FeedbackForm />
    </div>
  );
}

function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  return (
    <Card className="feedback-card">
      <div className="settings-heading"><MessageCircle size={19} /><div><h3>Feedback</h3><p>Tell us what would make your study workflow clearer.</p></div></div>
      <form onSubmit={async (event) => { event.preventDefault(); if (!message.trim() || sending) return; if (!apiConfigured) return toast.info('Feedback sending needs the backend API.'); setSending(true); try { await submitFeedback(message.trim()); toast.success('Thanks for the feedback.'); setMessage(''); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send feedback.'); } finally { setSending(false); } }}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should we improve?" />
        <button className="button button-primary" disabled={sending}><Send size={15} /> {sending ? 'Sending…' : 'Send feedback'}</button>
      </form>
    </Card>
  );
}

function AdminPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [stats, setStats] = useState<{ users: number; activeUsers: number; subjects: number } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      listManagedUsers(),
      apiConfigured ? fetch(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/stats`, { credentials: 'include' }).then((response) => response.json()).then((payload) => ({ users: payload.users, activeUsers: payload.activeUsers, subjects: payload.subjects })) : Promise.resolve(null),
    ]).then(([managedUsers, platform]) => { setUsers(managedUsers); setStats(platform); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load admin data.')).finally(() => setLoading(false));
  }, []);
  const updateUser = async (user: AuthUser, update: Partial<AuthUser>) => {
    try {
      const updated = await updateManagedUser(user.id, update);
      setUsers((current) => current.map((item) => item.id === user.id ? updated : item));
      toast.success('Account updated.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update account.'); }
  };
  const removeUser = async (user: AuthUser) => {
    if (!window.confirm(`Remove ${user.fullName} and their workspace?`)) return;
    try { await deleteManagedUser(user.id); setUsers((current) => current.filter((item) => item.id !== user.id)); toast.success('Account removed.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to remove account.'); }
  };
  return (
    <div className="page">
      <PageHeader eyebrow="ADMINISTRATION" title="Platform control" text="Manage student accounts and access from the protected administrator area." />
      <div className="metric-grid">
        <MetricCard icon={<UserRound size={18} />} label="Accounts" value={String(stats?.users ?? users.length)} hint={loading ? 'Loading…' : `${stats?.activeUsers ?? users.filter((user) => !user.isSuspended).length} active`} />
        <MetricCard icon={<BookOpen size={18} />} label="Learning spaces" value={String(stats?.subjects ?? '—')} hint="Across the platform" />
      </div>
      <Card className="admin-users-card">
        <div className="card-heading"><div><span className="eyebrow">USER MANAGEMENT</span><h3>Accounts</h3></div><Search size={18} /></div>
        {loading ? <EmptyState text="Loading accounts…" /> : users.length ? users.map((user) => (
          <div className="admin-user-row" key={user.id}>
            <Avatar name={user.fullName} />
            <div className="admin-user-main"><strong>{user.fullName}</strong><span>{user.email} · {user.role} · {user.isEmailVerified ? 'verified' : 'unverified'}</span></div>
            <span className={`status-badge ${user.isSuspended ? 'suspended' : 'active'}`}>{user.isSuspended ? 'Suspended' : 'Active'}</span>
            <button className="button button-secondary" onClick={() => updateUser(user, { isSuspended: !user.isSuspended })}>{user.isSuspended ? 'Restore' : 'Suspend'}</button>
            <button className="danger-icon" onClick={() => removeUser(user)} aria-label="Remove user"><Trash2 size={15} /></button>
          </div>
        )) : <EmptyState title="No accounts yet" text="New student accounts will appear here." />}
      </Card>
    </div>
  );
}

function SubjectWorkbench({
  subject,
  onClose,
  updateSubject,
  deleteSubject,
  updateLecture,
  onVideoSummary,
}: {
  subject: Subject;
  onClose: () => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  updateLecture: (subjectId: string, lecture: Lecture) => void;
  onVideoSummary: (lecture: Lecture) => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tab, setTab] = useState<'lessons' | 'notes'>('lessons');

  const addLecture = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !url.trim()) return toast.error('Add a lesson title and link.');
    try { new URL(url); } catch { return toast.error('Use a complete URL such as https://youtube.com/...'); }
    const lecture: Lecture = {
      id: makeId('lecture'),
      title: title.trim(),
      url: url.trim(),
      duration: 'New',
      channel: 'Learning resource',
      status: 'not_started',
      favorite: false,
      bookmarked: false,
      tags: [],
      note: '',
    };
    updateSubject({ ...subject, lectures: [...subject.lectures, lecture] });
    setTitle('');
    setUrl('');
    toast.success('Lesson added.');
  };

  return (
    <Modal title={subject.name} onClose={onClose} wide>
      <div className={`workbench-hero ${subject.accent}`}>
        <div><span>{subject.icon}</span><div><strong>{subject.short}</strong><p>{subject.detail}</p></div></div>
        <div className="workbench-progress"><b>{subjectProgress(subject)}%</b><span>complete</span></div>
      </div>
      <div className="workbench-tabs"><button className={tab === 'lessons' ? 'selected' : ''} onClick={() => setTab('lessons')}>Lessons <span>{subject.lectures.length}</span></button><button className={tab === 'notes' ? 'selected' : ''} onClick={() => setTab('notes')}>Lesson notes</button></div>
      {tab === 'lessons' ? (
        <>
          <form className="add-lesson-form" onSubmit={addLecture}>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lesson title" />
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="YouTube or course link" />
            <button className="button button-primary"><Plus size={15} /> Add lesson</button>
          </form>
          <div className="lecture-list-new">
            {subject.lectures.map((lecture) => (
              <article className="lecture-row-new" key={lecture.id}>
                <div className="lecture-thumb-new">{getYoutubeThumbnail(lecture.url) ? <img src={getYoutubeThumbnail(lecture.url)} alt="" /> : <Play size={17} />}</div>
                <button className="lecture-info lecture-open" onClick={() => openLecture(lecture.url)} aria-label={`Open ${lecture.title}`}><strong>{lecture.title}</strong><span>{lecture.channel} · {lecture.duration}</span><div className="tag-row">{lecture.tags.map((tag) => <i key={tag}>{tag}</i>)}</div></button>
                <button className={`status-button ${lecture.status}`} onClick={() => updateLecture(subject.id, { ...lecture, status: cycleLectureStatus(lecture.status) })}>{lecture.status.replace('_', ' ')}</button>
                <button className="icon-button" onClick={() => updateLecture(subject.id, { ...lecture, favorite: !lecture.favorite })} aria-label="Favorite"><Heart size={16} fill={lecture.favorite ? 'currentColor' : 'none'} /></button>
                <button className="icon-button" onClick={() => updateLecture(subject.id, { ...lecture, bookmarked: !lecture.bookmarked })} aria-label="Bookmark"><Bookmark size={16} fill={lecture.bookmarked ? 'currentColor' : 'none'} /></button>
                <button className="icon-button" onClick={() => onVideoSummary(lecture)} aria-label="AI summary"><Sparkles size={16} /></button>
                <button className="danger-icon" onClick={() => updateSubject({ ...subject, lectures: subject.lectures.filter((item) => item.id !== lecture.id) })} aria-label="Delete lesson"><Trash2 size={15} /></button>
              </article>
            ))}
            {!subject.lectures.length && <EmptyState icon={<BookOpen size={22} />} title="No lessons yet" text="Add your first learning link above." />}
          </div>
        </>
      ) : (
        <div className="lesson-notes-grid">
          {subject.lectures.map((lecture) => <article key={lecture.id}><span>{lecture.title}</span><textarea value={lecture.note} onChange={(event) => updateLecture(subject.id, { ...lecture, note: event.target.value })} placeholder="What do you want to remember?" /></article>)}
          {!subject.lectures.length && <EmptyState text="Add a lesson to start taking lesson-specific notes." />}
        </div>
      )}
      <div className="workbench-footer">
        <span>Due {formatDate(subject.deadline)}</span>
        <button className="button button-danger" onClick={() => { if (window.confirm(`Delete ${subject.name}?`)) { deleteSubject(subject.id); onClose(); } }}><Trash2 size={15} /> Delete subject</button>
      </div>
    </Modal>
  );
}

function NewSubjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (subject: Subject) => void }) {
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('◈');
  const [color, setColor] = useState('#5b5ce2');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error('Give your learning space a name.');
    onCreate({
      id: makeId('subject'),
      name: name.trim(),
      detail: detail.trim() || 'A focused learning space',
      short: name.trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 3).toUpperCase(),
      color,
      accent: color === '#0ea5a0' ? 'mint' : color === '#d97706' ? 'peach' : 'lavender',
      deadline,
      icon,
      pinned: false,
      lectures: [],
    });
    onClose();
    toast.success('Learning space created.');
  };
  return <Modal title="Create a learning space" onClose={onClose}><form className="modal-form" onSubmit={submit}>
    <label>Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Computer Networks" /></label>
    <label>Description<input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="What are you learning for?" /></label>
    <div className="form-grid-3"><label>Icon<input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={2} /></label><label>Deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label><label>Accent<input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label></div>
    <button className="button button-primary">Create learning space <ArrowRight size={15} /></button>
  </form></Modal>;
}

function NewTaskModal({ subjects, onClose, onCreate }: { subjects: Subject[]; onClose: () => void; onCreate: (task: StudyTask) => void }) {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [kind, setKind] = useState<TaskKind>('assignment');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [due, setDue] = useState(now.toISOString().slice(0, 16));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !subjectId) return toast.error('Add a title and choose a subject.');
    onCreate({ id: makeId('task'), title: title.trim(), subjectId, due, kind, priority, done: false });
    onClose();
    toast.success('Task added to your plan.');
  };
  return <Modal title="Add a study task" onClose={onClose}><form className="modal-form" onSubmit={submit}>
    <label>Task title<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Revise subnetting" /></label>
    <label>Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
    <div className="form-grid-3"><label>Type<select value={kind} onChange={(event) => setKind(event.target.value as TaskKind)}><option value="assignment">Assignment</option><option value="exam">Exam</option><option value="revision">Revision</option></select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Due<input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} /></label></div>
    <button className="button button-primary">Add to plan <ArrowRight size={15} /></button>
  </form></Modal>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><motion.section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }}>
    <header><div><span className="eyebrow">EDUSYNC</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></header>{children}
  </motion.section></div>;
}

function CommandPalette({ open, close, setActive, openNewSubject, openNewTask, setFocusMode }: { open: boolean; close: () => void; setActive: (view: View) => void; openNewSubject: () => void; openNewTask: () => void; setFocusMode: (value: boolean) => void }) {
  const [query, setQuery] = useState('');
  const commands = [
    ['Dashboard', () => setActive('Dashboard')],
    ['My subjects', () => setActive('My subjects')],
    ['Planner', () => setActive('Planner')],
    ['Tasks', () => setActive('Tasks')],
    ['Notes', () => setActive('Notes')],
    ['Analytics', () => setActive('Analytics')],
    ['Library', () => setActive('Library')],
    ['Settings', () => setActive('Settings')],
    ['Create a subject', openNewSubject],
    ['Add a study task', openNewTask],
    ['Start focus mode', () => setFocusMode(true)],
  ].filter(([label]) => String(label).toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { if (!open) setQuery(''); }, [open]);
  return <AnimatePresence>{open && <div className="modal-backdrop command-backdrop" onMouseDown={close}><motion.section className="command-palette" onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
    <div className="command-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Jump to anything…" /><kbd>Esc</kbd></div>
    <div className="command-list">{commands.map(([label, action]) => <button key={String(label)} onClick={() => { (action as () => void)(); close(); }}><Command size={15} />{String(label)}<ChevronRight size={15} /></button>)}{!commands.length && <p>No matching command.</p>}</div>
    <footer><Keyboard size={13} /> Press <kbd>⌘ K</kbd> anytime to open</footer>
  </motion.section></div>}</AnimatePresence>;
}

function StudyAssistant({ open, close, data }: { open: boolean; close: () => void; data: WorkspaceData }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: 'I can help you turn your current EduSync plan into one small next step.' },
  ]);
  const send = () => {
    if (!message.trim()) return;
    const nextTask = data.tasks.find((task) => !task.done);
    const nextSubject = data.subjects.find((subject) => subject.lectures.some((lecture) => lecture.status !== 'completed'));
    setMessages((current) => [...current, { from: 'user', text: message }, { from: 'ai', text: nextTask ? `Try “${nextTask.title}” first. Give it one 25-minute block.` : nextSubject ? `Continue ${nextSubject.name} with its next unfinished lesson.` : 'Your queue is clear. Use this time for retrieval practice or a short review.' }]);
    setMessage('');
  };
  return <AnimatePresence>{open && <><motion.div className="assistant-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} /><motion.aside className="assistant-panel" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}>
    <div className="assistant-head"><div className="assistant-brand"><span><Sparkles size={18} /></span><div><strong>Study companion</strong><small>Uses your workspace context</small></div></div><button className="icon-button" onClick={close} aria-label="Close assistant"><X size={18} /></button></div>
    <div className="assistant-chat">{messages.map((item, index) => <div className={`chat-bubble ${item.from}`} key={index}>{item.text}</div>)}</div>
    <div className="quick-prompts"><button onClick={() => setMessage('What should I study next?')}>What next?</button><button onClick={() => setMessage('Help me plan a session')}>Plan a session</button></div>
    <form onSubmit={(event) => { event.preventDefault(); send(); }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about your study plan…" /><button aria-label="Send"><Send size={17} /></button></form>
  </motion.aside></>}</AnimatePresence>;
}

function FocusOverlay({ close, onFinish }: { close: () => void; onFinish: (minutes: number) => void }) {
  return <div className="focus-overlay"><button className="focus-exit" onClick={close}><X size={17} /> Exit focus</button><div className="focus-center"><div className="focus-symbol"><GraduationCap size={28} /></div><span className="eyebrow">FOCUS MODE</span><h1>Give one thing your full attention.</h1><p>25 minutes of deliberate study. No pressure to do more.</p><FocusTimer onFinish={onFinish} /></div></div>;
}

function ErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundaryImpl>{children}</ErrorBoundaryImpl>;
}
class ErrorBoundaryImpl extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="app-error"><ShieldCheck size={30} /><h1>EduSync hit a small snag.</h1><p>Your saved workspace is safe. Refresh and continue.</p><button className="button button-primary" onClick={() => window.location.reload()}>Refresh EduSync</button></div>;
    return this.props.children;
  }
}

function Workspace({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const blankWorkspace: WorkspaceData = { ...seedWorkspace, subjects: [], tasks: [], notes: [], goals: [], activity: [], studyHistory: [], studiedTodayMinutes: 0 };
  const [data, setData] = useLocalStorage<WorkspaceData>(`edusync-workspace-v4-${user.id}`, user.role === 'admin' ? seedWorkspace : blankWorkspace);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [active, setActive] = useState<View>(user.role === 'admin' ? 'Admin' : 'Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useLocalStorage('edusync-theme-dark', false);
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = data.language;
  }, [dark, data.language]);

  useEffect(() => {
    let cancelled = false;
    loadWorkspace().then((remote) => {
      if (cancelled) return;
      if (remote) setData(normalizeWorkspace(remote));
      else setData((current) => normalizeWorkspace(current));
      setRemoteReady(true);
    }).catch(() => {
      if (!cancelled) { setSyncError(true); setRemoteReady(true); }
    });
    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    if (!remoteReady) return;
    const timer = window.setTimeout(() => {
      setSyncing(true);
      persistWorkspace(data).then(() => setSyncError(false)).catch(() => setSyncError(true)).finally(() => setSyncing(false));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [data, remoteReady]);

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
      if (!typing && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'f') setFocusMode(true);
      if (event.key === 'Escape') { setCommandOpen(false); setModal(null); setAssistantOpen(false); setFocusMode(false); }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, []);

  const update = (updater: (current: WorkspaceData) => WorkspaceData) => setData((current) => updater(current));

  const addActivity = (label: string, category: 'study' | 'note' | 'task' | 'account') => {
    update((current) => ({ ...current, activity: [{ id: makeId('activity'), label, time: 'Just now', category }, ...current.activity].slice(0, 100) }));
  };

  const addMinutes = (minutes: number) => {
    update((current) => {
      const today = new Date().toISOString().slice(0, 10);
      const history = [...(current.studyHistory ?? [])];
      const existing = history.find((entry) => entry.date === today);
      const nextHistory = existing
        ? history.map((entry) => entry.date === today ? { ...entry, minutes: entry.minutes + minutes } : entry)
        : [...history, { date: today, minutes }];
      const todayMinutes = nextHistory.find((entry) => entry.date === today)?.minutes ?? minutes;
      return { ...current, studiedTodayMinutes: todayMinutes, studyHistory: nextHistory.slice(-366) };
    });
    addActivity(`Completed a ${minutes}-minute focus block`, 'study');
  };

  const createSubject = (subject: Subject) => {
    update((current) => ({ ...current, subjects: [...current.subjects, subject] }));
    addActivity(`Created ${subject.name}`, 'account');
  };

  const updateSubject = (subject: Subject) => update((current) => ({ ...current, subjects: current.subjects.map((item) => item.id === subject.id ? subject : item) }));
  const deleteSubject = (id: string) => {
    const name = data.subjects.find((subject) => subject.id === id)?.name;
    update((current) => ({ ...current, subjects: current.subjects.filter((subject) => subject.id !== id), tasks: current.tasks.filter((task) => task.subjectId !== id), notes: current.notes.filter((note) => note.subjectId !== id) }));
    if (name) addActivity(`Removed ${name}`, 'account');
  };
  const updateLecture = (subjectId: string, lecture: Lecture) => {
    const previous = data.subjects.find((subject) => subject.id === subjectId)?.lectures.find((item) => item.id === lecture.id);
    update((current) => ({ ...current, subjects: current.subjects.map((subject) => subject.id === subjectId ? { ...subject, lectures: subject.lectures.map((item) => item.id === lecture.id ? lecture : item) } : subject) }));
    if (previous?.status !== 'completed' && lecture.status === 'completed') addActivity(`Completed lesson: ${lecture.title}`, 'study');
  };
  const updateTask = (id: string) => {
    const task = data.tasks.find((item) => item.id === id);
    if (!task) return;
    update((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, done: !item.done } : item) }));
    addActivity(`${task.done ? 'Reopened' : 'Completed'} ${task.title}`, 'task');
  };
  const createTask = (task: StudyTask) => { update((current) => ({ ...current, tasks: [...current.tasks, task] })); addActivity(`Added task ${task.title}`, 'task'); };
  const newNote = () => {
    const subjectId = data.subjects[0]?.id ?? '';
    const note: Note = { id: makeId('note'), title: 'Untitled note', subjectId, body: '', updatedAt: new Date().toISOString() };
    update((current) => ({ ...current, notes: [note, ...current.notes] }));
    addActivity('Created a new note', 'note');
  };
  const updateNote = (note: Note) => update((current) => ({ ...current, notes: current.notes.map((item) => item.id === note.id ? note : item) }));
  const deleteNote = (id: string) => update((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));

  const openSubject = (id: string) => { setSelectedSubjectId(id); setModal('subject'); };
  const saveVideoSummary = async (lecture: Lecture) => {
    const transcript = window.prompt('Paste the lecture transcript or notes to summarize:');
    if (!transcript?.trim()) return;
    try {
      const result = await summarizeLecture({ title: lecture.title, transcript });
      update((current) => ({
        ...current,
        subjects: current.subjects.map((subject) =>
          subject.lectures.some((item) => item.id === lecture.id)
            ? { ...subject, lectures: subject.lectures.map((item) => item.id === lecture.id ? { ...item, summary: result.summary } : item) }
            : subject,
        ),
      }));
      toast.success('AI study summary saved to the lesson.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create the summary.'); }
  };

  const exportData = () => downloadFile('edusync-workspace.json', JSON.stringify(data, null, 2), 'application/json');
  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WorkspaceData;
        if (!Array.isArray(parsed.subjects) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.notes)) throw new Error('Invalid backup');
        setData({ ...blankWorkspace, ...parsed, studyHistory: Array.isArray(parsed.studyHistory) ? parsed.studyHistory : [] });
        toast.success('Workspace restored.');
      } catch { toast.error('That file is not a valid EduSync backup.'); }
    };
    reader.readAsText(file);
  };

  const selectedSubject = data.subjects.find((subject) => subject.id === selectedSubjectId);

  const page = useMemo(() => ({
    Dashboard: <Dashboard data={data} user={user} setActive={setActive} openSubject={openSubject} openNewSubject={() => setModal('new-subject')} setFocusMode={setFocusMode} addMinutes={addMinutes} />,
    'My subjects': <SubjectsPage data={data} openSubject={openSubject} openNewSubject={() => setModal('new-subject')} togglePin={(id) => update((current) => ({ ...current, subjects: current.subjects.map((subject) => subject.id === id ? { ...subject, pinned: !subject.pinned } : subject) }))} deleteSubject={deleteSubject} />,
    Planner: <PlannerPage data={data} setActive={setActive} openNewTask={() => setModal('new-task')} />,
    Tasks: <TasksPage data={data} toggleTask={updateTask} deleteTask={(id) => update((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }))} openNewTask={() => setModal('new-task')} />,
    Notes: <NotesPage data={data} updateNote={updateNote} newNote={newNote} deleteNote={deleteNote} onVideoSummary={saveVideoSummary} />,
    Analytics: <AnalyticsPage data={data} />,
    Library: <LibraryPage data={data} updateLecture={updateLecture} />,
    Settings: <SettingsPage data={data} setData={setData} user={user} onExport={exportData} onImport={importData} />,
    Admin: user.role === 'admin' ? <AdminPage /> : <Dashboard data={data} user={user} setActive={setActive} openSubject={openSubject} openNewSubject={() => setModal('new-subject')} setFocusMode={setFocusMode} addMinutes={addMinutes} />,
  } as Record<View, ReactNode>)[active], [active, data, selectedSubjectId, user.id]);

  return <ErrorBoundary><div className="app-shell">
    <Sidebar user={user} active={active} setActive={setActive} collapsed={menuOpen} onClose={() => setMenuOpen(false)} onLogout={onLogout} />
    <main className="main-content">
      <Header user={user} onMenu={() => setMenuOpen(true)} dark={dark} toggleDark={() => setDark((value) => !value)} openCommand={() => setCommandOpen(true)} setActive={setActive} syncing={syncing} syncError={syncError} />
      {page}
    </main>
    <button className="assistant-fab" onClick={() => setAssistantOpen(true)}><Sparkles size={17} /><span>Study companion</span></button>
    <StudyAssistant open={assistantOpen} close={() => setAssistantOpen(false)} data={data} />
    <CommandPalette open={commandOpen} close={() => setCommandOpen(false)} setActive={setActive} openNewSubject={() => setModal('new-subject')} openNewTask={() => setModal('new-task')} setFocusMode={setFocusMode} />
    <AnimatePresence>
      {modal === 'new-subject' && <NewSubjectModal onClose={() => setModal(null)} onCreate={createSubject} />}
      {modal === 'new-task' && <NewTaskModal subjects={data.subjects} onClose={() => setModal(null)} onCreate={createTask} />}
      {modal === 'subject' && selectedSubject && <SubjectWorkbench subject={selectedSubject} onClose={() => setModal(null)} updateSubject={updateSubject} deleteSubject={deleteSubject} updateLecture={updateLecture} onVideoSummary={saveVideoSummary} />}
    </AnimatePresence>
    {focusMode && <FocusOverlay close={() => setFocusMode(false)} onFinish={addMinutes} />}
  </div></ErrorBoundary>;
}

function passwordChecks(password: string) {
  return [
    ['8+ characters', password.length >= 8],
    ['Uppercase letter', /[A-Z]/.test(password)],
    ['Lowercase letter', /[a-z]/.test(password)],
    ['A number', /\d/.test(password)],
    ['Special character', /[^A-Za-z0-9]/.test(password)],
  ] as const;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'sign-in');
  const [portal, setPortal] = useState<'student' | 'admin'>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const checks = passwordChecks(password);
  const strength = checks.filter(([, ok]) => ok).length;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'forgot') {
      if (!resetEmail) return toast.error('Enter your email.');
      setLoading(true);
      try { const result = await requestPasswordReset(resetEmail); toast.success(result.message); setMode('sign-in'); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to request reset.'); }
      finally { setLoading(false); }
      return;
    }
    if (mode === 'reset') {
      if (!resetToken || strength < 5 || password !== confirmPassword) return toast.error('Meet every password requirement and match both passwords.');
      setLoading(true);
      try { const result = await resetPassword({ token: resetToken, password, confirmPassword }); toast.success(result.message); window.history.replaceState({}, '', window.location.pathname); setMode('sign-in'); setPassword(''); setConfirmPassword(''); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to reset password.'); }
      finally { setLoading(false); }
      return;
    }
    if (mode === 'sign-up' && (!acceptedTerms || strength < 5 || password !== confirmPassword)) return toast.error(!acceptedTerms ? 'Please accept the terms.' : password !== confirmPassword ? 'Passwords do not match.' : 'Meet every password requirement.');
    setLoading(true);
    try {
      const user = mode === 'sign-up'
        ? await createAccount({ fullName, email, phone, password })
        : await signIn({ email, password, portal });
      saveSession(user);
      onAuthenticated(user);
      toast.success(mode === 'sign-up' ? 'Your learning space is ready.' : `Welcome back, ${user.fullName.split(' ')[0]}.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to continue.'); }
    finally { setLoading(false); }
  };
  const isSignup = mode === 'sign-up';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  return <main className="auth-page">
    <section className="auth-showcase">
      <div className="auth-brand"><span className="brand-mark"><GraduationCap size={22} /></span><strong>EduSync</strong></div>
      <div className="auth-showcase-copy"><span className="eyebrow">STUDY WITH INTENTION</span><h1>Your study life, <em>in one clear place.</em></h1><p>Plan what matters, learn from your lessons, keep useful notes, and see your progress without the noise.</p></div>
      <div className="auth-feature-stack">
        <div><span><Target size={17} /></span><div><strong>Know what to do next</strong><small>Tasks, deadlines and a simple daily focus.</small></div></div>
        <div><span><BookOpen size={17} /></span><div><strong>Build your learning spaces</strong><small>Lessons, bookmarks, notes and progress in one place.</small></div></div>
        <div><span><LineChart size={17} /></span><div><strong>Reflect, don't obsess</strong><small>Use your study data to improve the next week.</small></div></div>
      </div>
      <div className="auth-orbit one" /><div className="auth-orbit two" />
    </section>
    <section className="auth-panel">
      <div className="auth-top"><span>{portal === 'admin' ? 'ADMIN PORTAL' : isSignup ? 'CREATE ACCOUNT' : isForgot ? 'ACCOUNT RECOVERY' : isReset ? 'PASSWORD RESET' : 'WELCOME BACK'}</span><button onClick={() => { setPortal(portal === 'student' ? 'admin' : 'student'); setMode('sign-in'); }}>{portal === 'student' ? 'Administrator sign in' : 'Student sign in'}</button></div>
      <div className="auth-form-wrap">
        <div className="auth-heading"><h2>{isForgot ? 'Recover your account.' : isReset ? 'Choose a new password.' : isSignup ? 'Start with a clear workspace.' : portal === 'admin' ? 'Manage EduSync securely.' : 'Welcome back.'}</h2><p>{isForgot ? 'We will send a secure reset link if the account exists.' : isReset ? 'This link is time-limited for security.' : isSignup ? 'Create your student workspace and make your first plan.' : portal === 'admin' ? 'Use your administrator credentials.' : 'Sign in to continue your study plan.'}</p></div>
        <form className="auth-form" onSubmit={submit}>
          {isSignup && <label>Full name<input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" required /></label>}
          {isSignup && <label>Phone number<input autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" required /></label>}
          {isForgot ? <label>Email address<input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="you@example.com" required /></label> : <label>Email address<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>}
          {!isForgot && <label>Password<input autoComplete={isSignup || isReset ? 'new-password' : 'current-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>}
          {(isSignup || isReset) && <><div className="password-meter"><span>Password strength</span><b>{strength === 5 ? 'Strong' : strength >= 3 ? 'Almost there' : 'Needs work'}</b><i><u style={{ width: `${strength * 20}%` }} /></i></div><ul className="password-checks">{checks.map(([label, ok]) => <li className={ok ? 'pass' : ''} key={label}>{ok ? <Check size={13} /> : <Circle size={10} />}{label}</li>)}</ul><label>Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" required /></label></>}
          {isSignup && <label className="terms-check"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /> I agree to the Terms of Service and Privacy Policy.</label>}
          {!isSignup && !isForgot && !isReset && <button type="button" className="text-link auth-forgot" onClick={() => setMode('forgot')}>Forgot password?</button>}
          <button className="auth-submit" disabled={loading}>{loading ? 'Please wait…' : isSignup ? 'Create account' : isForgot ? 'Send reset link' : isReset ? 'Reset password' : portal === 'admin' ? 'Sign in to admin' : 'Sign in'} <ArrowRight size={17} /></button>
        </form>
        {!isForgot && !isReset && <p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to EduSync?'} <button onClick={() => { setMode(isSignup ? 'sign-in' : 'sign-up'); setPortal('student'); }}>{isSignup ? 'Sign in' : 'Create account'}</button></p>}
        {!apiConfigured && portal === 'admin' && !isSignup && !isForgot && !isReset && <button className="preview-admin" onClick={async () => { const adminEmail = window.prompt('Admin email'); if (!adminEmail) return; const adminPassword = window.prompt('Admin password (8+ chars, upper/lower/number/special)'); if (!adminPassword) return; try { await createDemoAdmin(adminEmail, adminPassword); toast.success('Local admin created. Sign in now.'); setMode('sign-in'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create local admin.'); } }}>Create local admin for preview</button>}
        {(isForgot || isReset) && <p className="auth-switch"><button onClick={() => { setMode('sign-in'); window.history.replaceState({}, '', window.location.pathname); }}>Back to sign in</button></p>}
        {!apiConfigured && <p className="deployment-note"><ShieldCheck size={14} /> Preview mode: connect <code>VITE_API_URL</code> for secure account persistence.</p>}
      </div>
    </section>
  </main>;
}

function App() {
  const [session, setSession] = useState<AuthUser | null>(() => readSession());
  const [checking, setChecking] = useState(apiConfigured);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token && apiConfigured) verifyEmail(token).then((result) => toast.success(result.message)).catch((error) => toast.error(error instanceof Error ? error.message : 'Verification failed.')).finally(() => window.history.replaceState({}, '', window.location.pathname));
  }, []);
  useEffect(() => {
    if (!apiConfigured) return;
    getCurrentUser().then((user) => { setSession(user); setChecking(false); });
  }, []);
  if (checking) return <main className="loading-screen"><div className="brand-mark"><GraduationCap size={25} /></div><h2>Restoring your study space…</h2><p>Checking your secure session.</p></main>;
  const logout = async () => { await signOut(); clearSession(); setSession(null); toast.info('Signed out.'); };
  return session ? <Workspace key={session.id} user={session} onLogout={logout} /> : <AuthScreen onAuthenticated={(user) => { saveSession(user); setSession(user); }} />;
}

export default App;
