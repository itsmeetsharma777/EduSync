import {
  Component,
  type ButtonHTMLAttributes,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  Bookmark,
  Bot,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Crown,
  Download,
  Ellipsis,
  FileText,
  Flame,
  FolderPlus,
  GraduationCap,
  Grid2X2,
  Heart,
  Home,
  Inbox,
  Keyboard,
  Languages,
  Lightbulb,
  LineChart,
  ListChecks,
  ListTodo,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Move,
  PenLine,
  Pin,
  PinOff,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
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
import { downloadFile, makeId, useLocalStorage } from './lib/storage';
import { loadWorkspace, persistWorkspace } from './lib/api';
import { seedWorkspace } from './lib/seed';
import type {
  Activity,
  Goal,
  Lecture,
  LectureStatus,
  Note,
  StudyTask,
  Subject,
  TaskKind,
  WorkspaceData,
} from './lib/types';
import {
  apiConfigured,
  clearSession,
  createAccount,
  createDemoAdmin,
  deleteManagedUser,
  googleSignIn,
  listManagedUsers,
  readSession,
  saveSession,
  signIn,
  signOut,
  summarizeLecture,
  updateManagedUser,
  type AuthUser,
} from './lib/auth';

type View =
  | 'Dashboard'
  | 'My subjects'
  | 'Planner'
  | 'Tasks'
  | 'Notes'
  | 'Analytics'
  | 'Library'
  | 'Settings'
  | 'Admin';
type ModalName = 'new-subject' | 'new-task' | 'subject' | null;

const nav: { label: View; icon: typeof Home }[] = [
  { label: 'Dashboard', icon: Home },
  { label: 'My subjects', icon: Grid2X2 },
  { label: 'Planner', icon: CalendarDays },
  { label: 'Tasks', icon: ListChecks },
  { label: 'Notes', icon: PenLine },
  { label: 'Analytics', icon: LineChart },
  { label: 'Library', icon: BookOpen },
];

const studyData = [
  { day: 'M', mins: 44 },
  { day: 'T', mins: 62 },
  { day: 'W', mins: 36 },
  { day: 'T', mins: 86 },
  { day: 'F', mins: 53 },
  { day: 'S', mins: 104 },
  { day: 'S', mins: 73 },
];
const quotePool = [
  'Small, intentional steps make extraordinary work.',
  'Consistency is a quiet superpower.',
  'You do not have to see the whole staircase. Just the next step.',
  'A focused hour changes more than a frantic day.',
];

function Avatar({ className = '', name = 'Alex Morgan' }: { className?: string; name?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <div className={`avatar ${className}`} aria-label={name}>
      {initials || 'ES'}
    </div>
  );
}
function Progress({ value, color = 'var(--violet)' }: { value: number; color?: string }) {
  return (
    <div className="progress-track" aria-label={`${Math.round(value)}% complete`}>
      <motion.div
        className="progress-value"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
function IconButton({
  children,
  label,
  onClick,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`icon-button ${className}`} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
function formatDate(date?: string) {
  if (!date) return 'No deadline';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parsed);
}
function getProgress(subject: Subject) {
  return subject.lectures.length
    ? Math.round(
        (subject.lectures.filter((lecture) => lecture.status === 'completed').length /
          subject.lectures.length) *
          100,
      )
    : 0;
}
function getSubjectName(subjects: Subject[], id: string) {
  return subjects.find((subject) => subject.id === id)?.name ?? 'Personal';
}
function getThumbnail(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).pop();
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  } catch {
    return '';
  }
}
function nextStatus(status: LectureStatus): LectureStatus {
  return status === 'not_started' ? 'in_progress' : status === 'in_progress' ? 'completed' : 'not_started';
}

function Sidebar({
  active,
  setActive,
  collapsed,
  onClose,
  user,
  onLogout,
}: {
  active: View;
  setActive: (view: View) => void;
  collapsed: boolean;
  onClose: () => void;
  user: AuthUser;
  onLogout: () => void;
}) {
  const items = user.role === 'admin' ? [...nav, { label: 'Admin' as View, icon: ShieldCheck }] : nav;
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
      <div className="brand">
        <div className="brand-mark">
          <GraduationCap size={22} />
        </div>
        <span>EduSync</span>
        <button className="mobile-close" aria-label="Close navigation" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="workspace-label">{user.role === 'admin' ? 'ADMINISTRATION' : 'WORKSPACE'}</div>
      <nav>
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`nav-item ${active === label ? 'active' : ''}`}
            onClick={() => {
              setActive(label);
              onClose();
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {label === 'Tasks' && <i className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="upgrade-card">
        <Crown size={18} />
        <p>
          <strong>{user.role === 'admin' ? 'Admin control' : 'Go Pro'}</strong>
          <br />
          {user.role === 'admin' ? 'Manage accounts securely.' : 'Unlock AI and cloud sync.'}
        </p>
        <button
          onClick={() =>
            user.role === 'admin'
              ? setActive('Admin')
              : toast.info('Cloud integrations are ready to connect when you add provider keys.')
          }
        >
          {user.role === 'admin' ? 'Open admin' : 'Explore Pro'}
        </button>
      </div>
      <div className="profile-menu">
        <Avatar name={user.fullName} />
        <div>
          <strong>{user.fullName}</strong>
          <span>
            {user.role === 'admin'
              ? 'Administrator'
              : user.isEmailVerified
                ? 'Verified student'
                : 'Verify your email'}
          </span>
        </div>
        <IconButton label="Sign out" onClick={onLogout}>
          <X size={17} />
        </IconButton>
      </div>
    </aside>
  );
}

function Header({
  onMenu,
  dark,
  toggleDark,
  openCommand,
  setActive,
  user,
}: {
  onMenu: () => void;
  dark: boolean;
  toggleDark: () => void;
  openCommand: () => void;
  setActive: (view: View) => void;
  user: AuthUser;
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMenu}>
        <Menu size={22} />
      </button>
      <button className="command-search" onClick={openCommand} aria-label="Open command palette">
        <Search size={18} />
        <span>Search or jump to a page</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="header-actions">
        <IconButton label="Open settings" onClick={() => setActive('Settings')}>
          <Settings size={19} />
        </IconButton>
        <IconButton label="Toggle theme" onClick={toggleDark}>
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </IconButton>
        <div className="notification-wrap">
          <IconButton label="Notifications" onClick={() => toast('You’re all caught up!')}>
            <Bell size={19} />
          </IconButton>
          <span />
        </div>
        <Avatar className="top-avatar" name={user.fullName} />
      </div>
    </header>
  );
}

function SubjectCard({
  subject,
  onOpen,
  onTogglePin,
  onDelete,
  dragHandle,
}: {
  subject: Subject;
  onOpen: () => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
  dragHandle?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const progress = getProgress(subject);
  const completed = subject.lectures.filter((lecture) => lecture.status === 'completed').length;
  return (
    <motion.article
      className="subject-card"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`subject-visual ${subject.accent}`}>
        <span className="subject-symbol">{subject.icon}</span>
        <div className="card-actions">
          {dragHandle && (
            <button aria-label={`Drag ${subject.name}`} className="card-action" {...dragHandle}>
              <Move size={14} />
            </button>
          )}
          {onTogglePin && (
            <button
              aria-label={`${subject.pinned ? 'Unpin' : 'Pin'} ${subject.name}`}
              className="card-action"
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin();
              }}
            >
              {subject.pinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
            </button>
          )}
          <button aria-label={`Open ${subject.name}`} className="card-action" onClick={onOpen}>
            <Ellipsis size={17} />
          </button>
        </div>
        <div className="wave wave-one" />
        <div className="wave wave-two" />
      </div>
      <button className="subject-open" aria-label={`Open ${subject.name}`} onClick={onOpen}>
        <div className="subject-content">
          <div className="subject-topline">
            <span className="subject-code" style={{ color: subject.color }}>
              {subject.short}
            </span>
            <span className="deadline">Due {formatDate(subject.deadline)}</span>
          </div>
          <h3>{subject.name}</h3>
          <p>{subject.detail}</p>
          <div className="subject-progress">
            <span>
              {completed} of {subject.lectures.length} lessons
            </span>
            <b>{progress}%</b>
          </div>
          <Progress value={progress} color={subject.color} />
        </div>
      </button>
      {onDelete && (
        <button className="subject-delete" aria-label={`Delete ${subject.name}`} onClick={() => onDelete()}>
          <Trash2 size={13} />
        </button>
      )}
    </motion.article>
  );
}

function DailyGoal({ data, onStart }: { data: WorkspaceData; onStart: () => void }) {
  const progress = (data.studiedTodayMinutes / data.dailyGoalMinutes) * 100;
  return (
    <section className="daily-goal card">
      <div className="goal-icon">
        <Target size={22} />
      </div>
      <div className="goal-copy">
        <span className="eyebrow">DAILY GOAL</span>
        <strong>
          {data.studiedTodayMinutes} <small>/ {data.dailyGoalMinutes} min</small>
        </strong>
        <p>
          {progress >= 100
            ? 'Daily goal complete — lovely work.'
            : `${data.dailyGoalMinutes - data.studiedTodayMinutes} minutes to your finish line.`}
        </p>
        <button className="mini-link" onClick={onStart}>
          Start a focus sprint
        </button>
      </div>
      <div className="goal-ring">
        <svg viewBox="0 0 44 44">
          <circle className="ring-bg" cx="22" cy="22" r="17" />
          <circle
            className="ring-progress"
            cx="22"
            cy="22"
            r="17"
            style={{ strokeDasharray: `${Math.min(progress, 100) * 1.08} 108` }}
          />
        </svg>
        <span>{Math.round(progress)}%</span>
      </div>
    </section>
  );
}
function StreakCard() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <section className="streak card">
      <div className="section-row">
        <div>
          <span className="eyebrow">STREAK</span>
          <h3>7 day flow</h3>
        </div>
        <Flame className="flame" size={23} />
      </div>
      <div className="streak-days">
        {days.map((day, index) => (
          <div key={`${day}${index}`}>
            <span className={index < 6 ? 'completed' : 'today'}>{index < 6 ? <Check size={13} /> : day}</span>
            <small>{day}</small>
          </div>
        ))}
      </div>
      <p>
        <b>Best streak:</b> 12 days · You’re on fire!
      </p>
    </section>
  );
}
function FocusTimer({ onFinish }: { onFinish: (minutes: number) => void }) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () =>
        setSeconds((current) => {
          if (current <= 1) {
            setRunning(false);
            toast.success('Focus session finished. Take a gentle break.');
            onFinish(25);
            return 25 * 60;
          }
          return current - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [running, onFinish]);
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return (
    <section className="focus-timer card">
      <div className="section-row">
        <div>
          <span className="eyebrow">FOCUS MODE</span>
          <h3>One thing at a time</h3>
        </div>
        <Timer size={21} />
      </div>
      <div className="timer-number">
        {minutes}
        <span>:</span>
        {secs}
      </div>
      <div className="timer-meta">
        <span>Pomodoro</span>
        <span>•</span>
        <span>Design systems</span>
      </div>
      <button className={`timer-button ${running ? 'timer-on' : ''}`} onClick={() => setRunning(!running)}>
        {running ? (
          <>
            <Timer size={16} /> Pause focus
          </>
        ) : (
          <>
            <Play size={16} fill="currentColor" /> Start focus
          </>
        )}
      </button>
    </section>
  );
}

function Dashboard({
  data,
  setActive,
  openSubject,
  openNewSubject,
  addMinutes,
  setFocusMode,
  user,
}: {
  data: WorkspaceData;
  setActive: (view: View) => void;
  openSubject: (id: string) => void;
  openNewSubject: () => void;
  addMinutes: (minutes: number) => void;
  setFocusMode: (value: boolean) => void;
  user: AuthUser;
}) {
  const [quote, setQuote] = useState(0);
  const next = data.subjects
    .flatMap((subject) =>
      subject.lectures
        .filter((lecture) => lecture.status !== 'completed')
        .map((lecture) => ({ ...lecture, subject })),
    )
    .at(0);
  const tasks = data.tasks
    .filter((task) => !task.done)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 3);
  return (
    <div className="page dashboard-page">
      <section className="welcome-row">
        <div>
          <span className="date-chip">
            <CalendarDays size={14} />{' '}
            {new Intl.DateTimeFormat(data.language === 'es' ? 'es' : 'en', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(new Date())}
          </span>
          <h1>
            {data.language === 'es'
              ? `Buenos días, ${user.fullName.split(' ')[0]}`
              : `Good morning, ${user.fullName.split(' ')[0]}`}{' '}
            <span>✦</span>
          </h1>
          <p>Make today count. Your workspace is saved to your account.</p>
        </div>
        <div className="page-actions">
          <button className="secondary-button" onClick={() => setFocusMode(true)}>
            <Timer size={16} /> Focus mode
          </button>
          <button className="primary-button" onClick={openNewSubject}>
            <Plus size={18} /> New subject
          </button>
        </div>
      </section>
      <section className="spotlight-card">
        <div className="spotlight-glow" />
        <div className="spotlight-copy">
          <span className="eyebrow">YOUR NEXT BEST STEP</span>
          <h2>{next ? next.title : 'Create your first learning space.'}</h2>
          <p>
            {next
              ? `${next.duration} from ${next.channel} · ${next.subject.name}`
              : 'A small, clear plan turns curiosity into momentum.'}
          </p>
          <button
            className="white-button"
            onClick={() => (next ? openSubject(next.subject.id) : openNewSubject())}
          >
            <Play size={16} fill="currentColor" /> {next ? 'Continue learning' : 'Create a subject'}
          </button>
        </div>
        <div className="spotlight-art">
          <div className="art-grid">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="floating-pill pill-one">
            <Sparkles size={15} /> In flow
          </div>
          <div className="floating-pill pill-two">
            <Check size={14} /> Auto-saved
          </div>
          <div className="abstract-orbit" />
        </div>
      </section>
      <div className="stat-grid">
        <DailyGoal data={data} onStart={() => setFocusMode(true)} />
        <StreakCard />
        <FocusTimer onFinish={addMinutes} />
      </div>
      <div className="quote-card">
        <div>
          <Lightbulb size={18} />
          <span className="eyebrow">DAILY STUDY QUOTE</span>
        </div>
        <p>“{quotePool[quote]}”</p>
        <button onClick={() => setQuote((current) => (current + 1) % quotePool.length)}>
          New thought <ChevronRight size={15} />
        </button>
      </div>
      <section className="section-heading">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h2>Subjects in progress</h2>
        </div>
        <button className="text-button" onClick={() => setActive('My subjects')}>
          Organize subjects <ChevronRight size={16} />
        </button>
      </section>
      <div className="subject-grid">
        {data.subjects.slice(0, 3).map((subject) => (
          <SubjectCard subject={subject} onOpen={() => openSubject(subject.id)} key={subject.id} />
        ))}
        <button className="create-subject" onClick={openNewSubject}>
          <span>
            <FolderPlus size={22} />
          </span>
          <strong>Create a subject</strong>
          <small>Turn a goal into a plan</small>
        </button>
      </div>
      <div className="dashboard-bottom">
        <section className="upcoming card">
          <div className="section-row">
            <div>
              <span className="eyebrow">UP NEXT</span>
              <h3>Keep your momentum</h3>
            </div>
            <button className="text-button" onClick={() => setActive('Planner')}>
              Study calendar <ChevronRight size={15} />
            </button>
          </div>
          <div className="upcoming-list">
            {tasks.length ? (
              tasks.map((task) => (
                <div className="upcoming-item" key={task.id}>
                  <div
                    className={`time-badge ${task.kind === 'exam' ? 'yellow' : task.kind === 'revision' ? 'green' : 'violet'}`}
                  >
                    {formatDate(task.due)}
                  </div>
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      {getSubjectName(data.subjects, task.subjectId)} · {task.kind}
                    </span>
                  </div>
                  <button onClick={() => setActive('Tasks')}>Open</button>
                </div>
              ))
            ) : (
              <Empty text="Your next learning block will show up here." />
            )}
          </div>
        </section>
        <WeeklyActivity />
      </div>
      <section className="heatmap-card card">
        <div className="section-row">
          <div>
            <span className="eyebrow">CONSISTENCY</span>
            <h3>Study heatmap</h3>
          </div>
          <span className="heatmap-legend">
            Less <i />
            <i />
            <i />
            <i /> More
          </span>
        </div>
        <div className="heatmap-grid" aria-label="Study activity heatmap">
          {Array.from({ length: 84 }, (_, index) => (
            <span
              key={index}
              className={`heat-${(index * 7 + 3) % 6}`}
              title={`${(index * 7 + 3) % 6} focus blocks`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
function WeeklyActivity() {
  return (
    <section className="activity card">
      <div className="section-row">
        <div>
          <span className="eyebrow">THIS WEEK</span>
          <h3>Focused minutes</h3>
        </div>
        <span className="trend">
          <Zap size={14} /> +18%
        </span>
      </div>
      <div className="chart-figure">
        <ResponsiveContainer width="100%" height={168}>
          <AreaChart data={studyData} margin={{ top: 10, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="activityGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ad89ff" stopOpacity=".48" />
                <stop offset="100%" stopColor="#ad89ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#ecebf4" strokeDasharray="3 5" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#858292', fontSize: 11 }} />
            <YAxis hide domain={[0, 120]} />
            <Tooltip cursor={false} contentStyle={{ borderRadius: 12, border: '1px solid #e8e5ef' }} />
            <Area
              type="monotone"
              dataKey="mins"
              stroke="#a884ff"
              strokeWidth={2.5}
              fill="url(#activityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p>
        <b>458 min</b> total focus time
      </p>
    </section>
  );
}

function SortableSubject({
  subject,
  onOpen,
  onTogglePin,
  onDelete,
}: {
  subject: Subject;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const sortable = useSortable({ id: subject.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.45 : 1,
  };
  return (
    <div ref={sortable.setNodeRef} style={style}>
      <SubjectCard
        subject={subject}
        onOpen={onOpen}
        onTogglePin={onTogglePin}
        onDelete={onDelete}
        dragHandle={{ ...sortable.attributes, ...sortable.listeners }}
      />
    </div>
  );
}
function SubjectsPage({
  subjects,
  openSubject,
  openNewSubject,
  reorder,
  togglePin,
  deleteSubject,
}: {
  subjects: Subject[];
  openSubject: (id: string) => void;
  openNewSubject: () => void;
  reorder: (event: DragEndEvent) => void;
  togglePin: (id: string) => void;
  deleteSubject: (id: string) => void;
}) {
  const [filter, setFilter] = useState('All');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const filtered = subjects.filter((subject) =>
    filter === 'Pinned' ? subject.pinned : filter === 'Completed' ? getProgress(subject) === 100 : true,
  );
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING SPACES</span>
          <h1>My subjects</h1>
          <p>Drag the handle to reorder. Everything is saved automatically.</p>
        </div>
        <button className="primary-button" onClick={openNewSubject}>
          <Plus size={18} /> Create subject
        </button>
      </div>
      <div className="filter-row">
        {['All', 'Pinned', 'In progress', 'Completed'].map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'selected' : ''}>
            {item}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
          <SortableContext
            items={filtered.map((subject) => subject.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="subject-grid large-subject-grid">
              {filtered.map((subject) => (
                <SortableSubject
                  key={subject.id}
                  subject={subject}
                  onOpen={() => openSubject(subject.id)}
                  onTogglePin={() => togglePin(subject.id)}
                  onDelete={() => deleteSubject(subject.id)}
                />
              ))}
              <button className="create-subject" onClick={openNewSubject}>
                <span>
                  <FolderPlus size={22} />
                </span>
                <strong>Create a subject</strong>
                <small>Turn a goal into a plan</small>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Empty
          text="No subjects here yet. Create one to start your next learning journey."
          action="Create subject"
          onAction={openNewSubject}
        />
      )}
    </div>
  );
}

function PlannerPage({
  data,
  openNewTask,
  toggleTask,
}: {
  data: WorkspaceData;
  openNewTask: () => void;
  toggleTask: (id: string) => void;
}) {
  const events = [...data.tasks].sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR STUDY CALENDAR</span>
          <h1>A plan with room to breathe</h1>
          <p>Color-coded deadlines, revision prompts, and exams all in one timeline.</p>
        </div>
        <button className="primary-button" onClick={openNewTask}>
          <Plus size={18} /> Add block
        </button>
      </div>
      <div className="planner-layout">
        <section className="calendar-card card">
          <div className="calendar-head">
            <button>
              <ChevronDown size={18} /> Upcoming plan
            </button>
            <span className="calendar-key">
              <i className="violet" /> Assignment <i className="yellow" /> Exam <i className="green" />{' '}
              Revision
            </span>
          </div>
          <div className="day-strip">
            {['Mon 21', 'Tue 22', 'Wed 23', 'Thu 24', 'Fri 25', 'Sat 26', 'Sun 27'].map((day, index) => (
              <button className={index === 3 ? 'active-day' : ''} key={day}>
                <small>{day.split(' ')[0]}</small>
                <strong>{day.split(' ')[1]}</strong>
              </button>
            ))}
          </div>
          <div className="agenda">
            {events.length ? (
              events.map((task) => (
                <div className="agenda-row" key={task.id}>
                  <time>{formatDate(task.due)}</time>
                  <div
                    className={`agenda-line ${task.kind === 'exam' ? 'yellow' : task.kind === 'revision' ? 'green' : 'violet'}`}
                  />
                  <article className={task.done ? 'event-complete' : ''}>
                    <div>
                      <span className="event-status">
                        {task.kind.toUpperCase()} · {getSubjectName(data.subjects, task.subjectId)}
                      </span>
                      <h3>{task.title}</h3>
                      <p>
                        {task.priority} priority ·{' '}
                        {new Date(task.due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      aria-label={`Mark ${task.title} ${task.done ? 'incomplete' : 'complete'}`}
                      onClick={() => toggleTask(task.id)}
                    >
                      {task.done ? <Check size={17} /> : <Play size={15} fill="currentColor" />}
                    </button>
                  </article>
                </div>
              ))
            ) : (
              <Empty text="Add a deadline or a revision block to build your plan." />
            )}
          </div>
        </section>
        <aside className="planner-aside">
          <section className="ai-nudge card">
            <div className="bot-bubble">
              <Bot size={20} />
            </div>
            <span className="eyebrow">REVISION SCHEDULER</span>
            <h3>Recall it again tomorrow.</h3>
            <p>
              EduSync automatically spots your incomplete revision blocks. Schedule short, spaced retrieval
              sessions to make knowledge stick.
            </p>
            <button onClick={() => toast.success('A spaced-repetition review was added to your plan.')}>
              <Sparkles size={15} /> Schedule revision
            </button>
          </section>
          <section className="weekly-target card">
            <span className="eyebrow">WEEKLY TARGET</span>
            <div>
              <strong>6.5</strong>
              <span> / 8 hrs</span>
            </div>
            <Progress value={81} />
            <p>90 minutes left to meet your learning target.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function TasksPage({
  data,
  openNewTask,
  toggleTask,
  deleteTask,
}: {
  data: WorkspaceData;
  openNewTask: () => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}) {
  const [kind, setKind] = useState<'all' | TaskKind>('all');
  const displayed = data.tasks
    .filter((task) => kind === 'all' || task.kind === kind)
    .sort((a, b) => a.due.localeCompare(b.due));
  const exams = data.tasks.filter((task) => task.kind === 'exam' && !task.done);
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">DEADLINES, NOT DREAD</span>
          <h1>Tasks & exams</h1>
          <p>Track assignments, upcoming exams, and spaced-repetition review in one queue.</p>
        </div>
        <button className="primary-button" onClick={openNewTask}>
          <Plus size={18} /> Add task
        </button>
      </div>
      <div className="exam-strip">
        {exams.length ? (
          exams.map((exam) => (
            <article key={exam.id}>
              <CalendarCheck size={19} />
              <div>
                <span>UPCOMING EXAM</span>
                <strong>{exam.title}</strong>
                <small>
                  {formatDate(exam.due)} · {getSubjectName(data.subjects, exam.subjectId)}
                </small>
              </div>
            </article>
          ))
        ) : (
          <div>
            <CheckCircle2 size={18} /> No upcoming exams — your calendar is clear.
          </div>
        )}
      </div>
      <div className="filter-row">
        {[
          ['all', 'All tasks'],
          ['assignment', 'Assignments'],
          ['exam', 'Exams'],
          ['revision', 'Revision'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={kind === value ? 'selected' : ''}
            onClick={() => setKind(value as typeof kind)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="task-list card">
        {displayed.length ? (
          displayed.map((task) => (
            <article className={`task-row ${task.done ? 'task-done' : ''}`} key={task.id}>
              <button
                className="task-check"
                aria-label={`Mark ${task.title} ${task.done ? 'incomplete' : 'complete'}`}
                onClick={() => toggleTask(task.id)}
              >
                {task.done && <Check size={15} />}
              </button>
              <div className={`task-kind ${task.kind}`}>
                {task.kind === 'exam' ? (
                  <Trophy size={17} />
                ) : task.kind === 'revision' ? (
                  <Sparkles size={17} />
                ) : (
                  <FileText size={17} />
                )}
              </div>
              <div className="task-copy">
                <h3>{task.title}</h3>
                <p>
                  {getSubjectName(data.subjects, task.subjectId)} · Due {formatDate(task.due)}
                </p>
              </div>
              <span className={`priority ${task.priority}`}>{task.priority}</span>
              <IconButton label={`Delete ${task.title}`} onClick={() => deleteTask(task.id)}>
                <Trash2 size={16} />
              </IconButton>
            </article>
          ))
        ) : (
          <Empty
            text="Nothing here yet. Add an assignment, exam, or revision prompt."
            action="Add task"
            onAction={openNewTask}
          />
        )}
      </section>
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
  onVideoSummary: (subjectId: string, lectureId: string, summary: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(data.notes[0]?.id ?? '');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const note = data.notes.find((item) => item.id === selectedId) ?? data.notes[0];
  useEffect(() => {
    if (!data.notes.some((item) => item.id === selectedId)) setSelectedId(data.notes[0]?.id ?? '');
  }, [data.notes, selectedId]);
  if (!note)
    return (
      <div className="page simple-page">
        <Empty text="Your notebook is waiting for its first idea." action="New note" onAction={newNote} />
      </div>
    );
  const exportNote = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text(note.title, 14, 20);
    pdf.setFontSize(11);
    const body = pdf.splitTextToSize(note.body.replaceAll(/[#*_>`]/g, ''), 180);
    pdf.text(body, 14, 31);
    pdf.save(`${note.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    toast.success('Your note was exported as a PDF.');
  };
  return (
    <div className="notes-page">
      <aside className="notes-sidebar">
        <div className="notes-sidebar-head">
          <div>
            <span className="eyebrow">YOUR NOTEBOOK</span>
            <h2>Notes</h2>
          </div>
          <IconButton label="New note" onClick={newNote}>
            <Plus size={18} />
          </IconButton>
          <IconButton label="Summarize a YouTube video" onClick={() => setSummaryOpen(true)}>
            <Sparkles size={17} />
          </IconButton>
        </div>
        <div className="notes-list">
          {data.notes
            .slice()
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((item) => (
              <button
                className={item.id === note.id ? 'active' : ''}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <strong>{item.title}</strong>
                <span>
                  {getSubjectName(data.subjects, item.subjectId)} · {formatDate(item.updatedAt)}
                </span>
                <p>{item.body.replace(/[#*_>`]/g, '').slice(0, 55)}</p>
              </button>
            ))}
        </div>
      </aside>
      <main className="note-editor">
        <header>
          <div>
            <input
              aria-label="Note title"
              value={note.title}
              onChange={(event) =>
                updateNote({ ...note, title: event.target.value, updatedAt: new Date().toISOString() })
              }
            />
            <span>
              <CheckCircle2 size={13} /> Auto-saved locally
            </span>
          </div>
          <div>
            <button className="secondary-button" onClick={exportNote}>
              <Download size={15} /> PDF
            </button>
            <IconButton
              label="Delete note"
              onClick={() => {
                deleteNote(note.id);
                toast.info('Note deleted.');
              }}
            >
              <Trash2 size={17} />
            </IconButton>
          </div>
        </header>
        <div className="note-subject">
          <BookOpen size={14} /> {getSubjectName(data.subjects, note.subjectId)} · Markdown editor
        </div>
        <div className="editor-grid">
          <textarea
            aria-label="Note content"
            value={note.body}
            onChange={(event) =>
              updateNote({ ...note, body: event.target.value, updatedAt: new Date().toISOString() })
            }
            spellCheck
            placeholder="Start writing with Markdown…"
          />
          <article className="markdown-preview" aria-label="Rendered Markdown preview">
            <span className="eyebrow">PREVIEW</span>
            {renderMarkdown(note.body)}
          </article>
        </div>
      </main>
      <AnimatePresence>
        {summaryOpen && (
          <VideoSummaryModal
            subjects={data.subjects}
            onClose={() => setSummaryOpen(false)}
            onSave={(subjectId, lectureId, summary) => {
              onVideoSummary(subjectId, lectureId, summary);
              setSummaryOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
function VideoSummaryModal({
  subjects,
  onClose,
  onSave,
}: {
  subjects: Subject[];
  onClose: () => void;
  onSave: (subjectId: string, lectureId: string, summary: string) => void;
}) {
  const lectures = subjects.flatMap((subject) => subject.lectures.map((lecture) => ({ subject, lecture })));
  const [selected, setSelected] = useState(
    lectures[0] ? `${lectures[0].subject.id}:${lectures[0].lecture.id}` : '',
  );
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedLecture = lectures.find(({ subject, lecture }) => `${subject.id}:${lecture.id}` === selected);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLecture) return toast.error('Add a lecture before requesting a summary.');
    if (transcript.trim().length < 80)
      return toast.error('Paste at least a short transcript so the summary stays accurate.');
    setLoading(true);
    try {
      const result = await summarizeLecture({
        title: selectedLecture.lecture.title,
        transcript,
        courseContext: selectedLecture.subject.name,
      });
      onSave(selectedLecture.subject.id, selectedLecture.lecture.id, result.summary);
      toast.success('Video summary was added to your Notes.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The video summary could not be created.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal title="Summarize a YouTube video" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <p className="summary-explainer">
          Choose a saved lecture and paste its transcript. The server creates an accurate study summary and
          saves it as a Markdown note.
        </p>
        <label>
          Saved lecture
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {lectures.map(({ subject, lecture }) => (
              <option key={lecture.id} value={`${subject.id}:${lecture.id}`}>
                {subject.name} · {lecture.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Video transcript
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Paste the transcript here. EduSync will generate key ideas, recall questions, and a next step."
            rows={9}
          />
        </label>
        <button className="primary-button" disabled={loading || !lectures.length}>
          {loading ? (
            'Creating summary…'
          ) : (
            <>
              <Sparkles size={16} /> Create study summary
            </>
          )}
        </button>
        {!apiConfigured && (
          <p className="summary-hint">
            <ShieldCheck size={13} /> Configure the API URL and OPENAI_API_KEY to enable summaries.
          </p>
        )}
      </form>
    </Modal>
  );
}
function renderMarkdown(body: string) {
  return (
    <div className="markdown-body">
      {body
        .split('\n')
        .map((line, index) =>
          line.startsWith('# ') ? (
            <h1 key={index}>{line.slice(2)}</h1>
          ) : line.startsWith('## ') ? (
            <h2 key={index}>{line.slice(3)}</h2>
          ) : line.startsWith('- ') ? (
            <li key={index}>{line.slice(2)}</li>
          ) : line.startsWith('> ') ? (
            <blockquote key={index}>{line.slice(2)}</blockquote>
          ) : line ? (
            <p key={index}>{line}</p>
          ) : (
            <br key={index} />
          ),
        )}
    </div>
  );
}

function AnalyticsPage({ data }: { data: WorkspaceData }) {
  const focusData = data.subjects.map((subject) => ({
    name: subject.short,
    value: Math.max(getProgress(subject), 8),
    color: subject.color,
  }));
  const totalLectures = data.subjects.flatMap((subject) => subject.lectures);
  const completed = totalLectures.filter((lecture) => lecture.status === 'completed').length;
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING PATTERNS</span>
          <h1>Progress, not pressure.</h1>
          <p>Local stats update as you learn, plan, and complete work.</p>
        </div>
      </div>
      <div className="metric-grid">
        <Metric
          icon={<Clock3 />}
          title="Focus time"
          value={`${Math.round(data.studiedTodayMinutes / 60)}h ${data.studiedTodayMinutes % 60}m`}
          change="today"
        />
        <Metric
          icon={<Check />}
          title="Lessons completed"
          value={`${completed}`}
          change={`${totalLectures.length} total`}
        />
        <Metric
          icon={<Trophy />}
          title="Productivity score"
          value={`${Math.min(100, 68 + completed * 4)}`}
          change="steady progress"
        />
        <Metric icon={<Zap />} title="Current streak" value="7 days" change="personal best: 12" />
      </div>
      <div className="analytics-grid">
        <section className="analytics-chart card">
          <div className="section-row">
            <div>
              <span className="eyebrow">FOCUS TIME</span>
              <h3>Your most intentional week</h3>
            </div>
            <span className="trend">
              <Zap size={15} /> +18%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={studyData} margin={{ top: 28, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#edebf3" strokeDasharray="3 5" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8b8995', fontSize: 12 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#aaa7b3', fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: '#f3efff' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e8e5ef' }}
              />
              <Bar dataKey="mins" radius={[8, 8, 3, 3]}>
                {studyData.map((item, index) => (
                  <Cell key={`${item.day}${index}`} fill={index === 5 ? '#a884ff' : '#ded5f7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="focus-breakdown card">
          <span className="eyebrow">SUBJECT PROGRESS</span>
          <h3>Your current focus mix</h3>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie
                  data={focusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={76}
                  paddingAngle={4}
                  stroke="none"
                >
                  {focusData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <b>{data.subjects.length}</b>
              <span>subjects</span>
            </div>
          </div>
          <div className="legend">
            {focusData.map((item) => (
              <span key={item.name}>
                <i style={{ backgroundColor: item.color }} />
                {item.name}
                <b>{item.value}%</b>
              </span>
            ))}
          </div>
        </section>
      </div>
      <section className="insight-banner">
        <div className="insight-icon">
          <Lightbulb size={22} />
        </div>
        <div>
          <span className="eyebrow">A LITTLE INSIGHT</span>
          <h3>
            Your strongest current subject is{' '}
            {data.subjects.slice().sort((a, b) => getProgress(b) - getProgress(a))[0]?.name ??
              'waiting to be created'}
            .
          </h3>
          <p>Complete a lecture or revise a note to see your dashboard move in real time.</p>
        </div>
      </section>
    </div>
  );
}
function Metric({
  icon,
  title,
  value,
  change,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  change: string;
}) {
  return (
    <article className="metric card">
      <div className="metric-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{change}</small>
    </article>
  );
}

function LibraryPage({
  data,
  updateLecture,
}: {
  data: WorkspaceData;
  updateLecture: (subjectId: string, lecture: Lecture) => void;
}) {
  const [tab, setTab] = useState<'bookmarks' | 'favorites' | 'history'>('bookmarks');
  const resources = data.subjects
    .flatMap((subject) => subject.lectures.map((lecture) => ({ ...lecture, subject })))
    .filter((item) =>
      tab === 'bookmarks'
        ? item.bookmarked
        : tab === 'favorites'
          ? item.favorite
          : item.status !== 'not_started',
    );
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR KNOWLEDGE CABINET</span>
          <h1>Library</h1>
          <p>Bookmarked lectures, favorites, and recent learning history.</p>
        </div>
      </div>
      <div className="filter-row">
        {[
          ['bookmarks', 'Bookmarks'],
          ['favorites', 'Favorites'],
          ['history', 'Recent history'],
        ].map(([value, label]) => (
          <button
            className={tab === value ? 'selected' : ''}
            key={value}
            onClick={() => setTab(value as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="resource-list">
        {resources.length ? (
          resources.map((item) => (
            <article className="resource" key={item.id}>
              <div className="resource-icon">
                {tab === 'history' ? (
                  <Clock3 size={20} />
                ) : tab === 'favorites' ? (
                  <Heart size={20} />
                ) : (
                  <Bookmark size={20} />
                )}
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.subject.name} · {item.channel} · {item.duration}
                </p>
              </div>
              <span>{item.status.replace('_', ' ')}</span>
              <button
                className="library-toggle"
                aria-label={`Toggle favorite ${item.title}`}
                onClick={() => updateLecture(item.subject.id, { ...item, favorite: !item.favorite })}
              >
                <Heart size={18} fill={item.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                className="library-toggle"
                aria-label={`Toggle bookmark ${item.title}`}
                onClick={() => updateLecture(item.subject.id, { ...item, bookmarked: !item.bookmarked })}
              >
                <Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} />
              </button>
            </article>
          ))
        ) : (
          <Empty text={`No ${tab} yet. Use the controls inside a subject to save learning material here.`} />
        )}
      </div>
      <section className="library-empty card">
        <div>
          <Heart size={22} />
        </div>
        <h3>Save the sparks.</h3>
        <p>Favorites and bookmarks persist locally. Import a backup from Settings any time.</p>
      </section>
    </div>
  );
}

function SettingsPage({
  data,
  setData,
  onImport,
  onExport,
}: {
  data: WorkspaceData;
  setData: (data: WorkspaceData) => void;
  onImport: (file: File) => void;
  onExport: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useLocalStorage('edusync-email-summary', true);
  const [sessions, setSessions] = useLocalStorage('edusync-sessions', [
    { id: 'current', device: 'This browser', location: 'India', current: true },
    { id: 'old-mobile', device: 'iPhone · Safari', location: 'India', current: false },
  ]);
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">ACCOUNT & WORKSPACE</span>
          <h1>Settings</h1>
          <p>Control your language, local backup, sessions, and learning preferences.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="settings-card card">
          <div>
            <Languages size={19} />
            <h3>Language</h3>
          </div>
          <p>Switch your workspace language preference.</p>
          <div className="segmented">
            <button
              className={data.language === 'en' ? 'selected' : ''}
              onClick={() => setData({ ...data, language: 'en' })}
            >
              English
            </button>
            <button
              className={data.language === 'es' ? 'selected' : ''}
              onClick={() => setData({ ...data, language: 'es' })}
            >
              Español
            </button>
          </div>
        </section>
        <section className="settings-card card">
          <div>
            <Download size={19} />
            <h3>Back up your workspace</h3>
          </div>
          <p>Export all subjects, tasks, notes, goals, and settings as JSON or re-import it later.</p>
          <div className="settings-actions">
            <button className="secondary-button" onClick={onExport}>
              <Download size={15} /> Export data
            </button>
            <button className="secondary-button" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Import data
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])}
            />
          </div>
        </section>
        <section className="settings-card card">
          <div>
            <Inbox size={19} />
            <h3>Weekly progress summary</h3>
          </div>
          <p>A server-side email provider is needed to deliver emails; this stores your preference.</p>
          <label className="toggle-row">
            <input type="checkbox" checked={summary} onChange={(event) => setSummary(event.target.checked)} />
            <span /> Send my weekly summary
          </label>
        </section>
        <section className="settings-card card">
          <div>
            <Keyboard size={19} />
            <h3>Keyboard shortcuts</h3>
          </div>
          <dl>
            <dt>
              <kbd>⌘ K</kbd>
            </dt>
            <dd>Command palette</dd>
            <dt>
              <kbd>F</kbd>
            </dt>
            <dd>Focus mode</dd>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Close panels</dd>
          </dl>
        </section>
      </div>
      <section className="session-card card">
        <div className="section-row">
          <div>
            <span className="eyebrow">SESSION MANAGEMENT</span>
            <h3>Active sessions</h3>
          </div>
          <ShieldCheck size={20} />
        </div>
        {sessions.map((session) => (
          <article key={session.id}>
            <UserRound size={17} />
            <div>
              <strong>{session.device}</strong>
              <span>
                {session.location} {session.current && '· Current session'}
              </span>
            </div>
            {!session.current && (
              <button onClick={() => setSessions(sessions.filter((item) => item.id !== session.id))}>
                Sign out
              </button>
            )}
          </article>
        ))}
      </section>
      <section className="activity-log card">
        <span className="eyebrow">ACCOUNT ACTIVITY</span>
        <h3>Recent workspace activity</h3>
        {data.activity.map((item) => (
          <div key={item.id}>
            <span className={`activity-dot ${item.category}`} />
            <p>
              {item.label}
              <small>{item.time}</small>
            </p>
          </div>
        ))}
      </section>
      <FeedbackForm />
    </div>
  );
}
function FeedbackForm() {
  const [message, setMessage] = useState('');
  return (
    <section className="feedback card">
      <div>
        <MessageCircle size={20} />
        <h3>Feedback & bug report</h3>
      </div>
      <p>Tell us what would make your study space more useful.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!message.trim()) return;
          toast.success('Thanks — your feedback is saved for the project team.');
          setMessage('');
        }}
      >
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share feedback or report a bug…"
        />
        <button className="primary-button">
          Send <Send size={15} />
        </button>
      </form>
    </section>
  );
}

function AdminPage({ data }: { data: WorkspaceData }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState(['System health checked · just now']);
  useEffect(() => {
    listManagedUsers()
      .then(setUsers)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load users.'))
      .finally(() => setLoading(false));
  }, []);
  const mutateUser = async (user: AuthUser, update: Partial<AuthUser>, verb: string) => {
    try {
      const updated = await updateManagedUser(user.id, update);
      setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)));
      setLogs([`${user.fullName} was ${verb} · just now`, ...logs]);
      toast.success(`Account ${verb}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update this account.');
    }
  };
  const editUser = async (user: AuthUser) => {
    const fullName = window.prompt('Update full name', user.fullName)?.trim();
    if (!fullName || fullName === user.fullName) return;
    await mutateUser(user, { fullName }, 'updated');
  };
  const removeUser = async (user: AuthUser) => {
    if (!window.confirm(`Remove ${user.fullName} and their workspace? This cannot be undone.`)) return;
    try {
      await deleteManagedUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setLogs([`${user.fullName} was removed · just now`, ...logs]);
      toast.success('Account removed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove this account.');
    }
  };
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">ADMIN WORKSPACE</span>
          <h1>Platform overview</h1>
          <p>
            Manage every user account, roles, access, and audit activity from the protected administrator
            portal.
          </p>
        </div>
      </div>
      <div className="metric-grid">
        <Metric
          icon={<UserRound />}
          title="Total users"
          value={String(users.length)}
          change={loading ? 'loading…' : `${users.filter((user) => !user.isSuspended).length} active`}
        />
        <Metric
          icon={<Clock3 />}
          title="Watch time"
          value={`${Math.max(1, data.studiedTodayMinutes)} min`}
          change="this admin workspace"
        />
        <Metric
          icon={<BookOpen />}
          title="Subjects"
          value={String(data.subjects.length)}
          change="admin workspace"
        />
        <Metric
          icon={<ShieldCheck />}
          title="System health"
          value="Healthy"
          change={apiConfigured ? 'API connected' : 'browser preview'}
        />
      </div>
      <div className="admin-grid">
        <section className="admin-users card">
          <div className="section-row">
            <div>
              <span className="eyebrow">USER MANAGEMENT</span>
              <h3>Accounts</h3>
            </div>
            <Search size={18} />
          </div>
          {loading ? (
            <Empty text="Loading user accounts…" />
          ) : users.length ? (
            users.map((user) => (
              <article key={user.id}>
                <Avatar name={user.fullName} />
                <div>
                  <strong>{user.fullName}</strong>
                  <span>
                    {user.email} · {user.role} · {user.isEmailVerified ? 'verified' : 'unverified'}
                  </span>
                </div>
                <span className={`status ${user.isSuspended ? 'suspended' : 'active'}`}>
                  {user.isSuspended ? 'Suspended' : 'Active'}
                </span>
                <button
                  onClick={() =>
                    mutateUser(
                      user,
                      { isSuspended: !user.isSuspended },
                      user.isSuspended ? 'restored' : 'suspended',
                    )
                  }
                >
                  {user.isSuspended ? 'Restore' : 'Suspend'}
                </button>
                <button onClick={() => editUser(user)}>Edit</button>
                <button className="admin-delete" onClick={() => removeUser(user)}>
                  Remove
                </button>
              </article>
            ))
          ) : (
            <Empty text="No accounts have been created yet." />
          )}
        </section>
        <section className="audit-card card">
          <span className="eyebrow">ADMIN AUDIT LOG</span>
          <h3>Recent actions</h3>
          {logs.map((log, index) => (
            <div key={`${log}${index}`}>
              <span />
              <p>{log}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function SubjectWorkbench({
  subject,
  onClose,
  updateSubject,
  deleteSubject,
}: {
  subject: Subject;
  onClose: () => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const addLecture = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !url.trim()) return toast.error('Add a lecture title and a valid link.');
    try {
      new URL(url);
    } catch {
      return toast.error('Please use a complete URL.');
    }
    const lecture: Lecture = {
      id: makeId('lecture'),
      title: title.trim(),
      url: url.trim(),
      duration: 'New',
      channel: 'YouTube',
      status: 'not_started',
      favorite: false,
      bookmarked: false,
      tags: [],
      note: '',
    };
    updateSubject({ ...subject, lectures: [...subject.lectures, lecture] });
    setTitle('');
    setUrl('');
    toast.success('Lecture added with a YouTube thumbnail fallback.');
  };
  const updateLecture = (lecture: Lecture) =>
    updateSubject({
      ...subject,
      lectures: subject.lectures.map((item) => (item.id === lecture.id ? lecture : item)),
    });
  const removeLecture = (id: string) =>
    updateSubject({ ...subject, lectures: subject.lectures.filter((item) => item.id !== id) });
  const moveLecture = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= subject.lectures.length) return;
    updateSubject({ ...subject, lectures: arrayMove(subject.lectures, index, destination) });
  };
  const bulk = (action: 'complete' | 'favorite' | 'delete') => {
    if (!selected.length) return toast.info('Select one or more lectures first.');
    updateSubject({
      ...subject,
      lectures: subject.lectures
        .filter((lecture) => action !== 'delete' || !selected.includes(lecture.id))
        .map((lecture) =>
          selected.includes(lecture.id)
            ? action === 'complete'
              ? { ...lecture, status: 'completed' }
              : action === 'favorite'
                ? { ...lecture, favorite: true }
                : lecture
            : lecture,
        ),
    });
    setSelected([]);
    toast.success(`Bulk ${action} applied.`);
  };
  return (
    <Modal title={subject.name} onClose={onClose} wide>
      <div className="workbench-head">
        <div>
          <span className="subject-code" style={{ color: subject.color }}>
            {subject.short}
          </span>
          <p>{subject.detail}</p>
        </div>
        <button
          className="danger-button"
          onClick={() => {
            deleteSubject(subject.id);
            onClose();
          }}
        >
          <Trash2 size={14} /> Delete subject
        </button>
      </div>
      <form className="add-lecture" onSubmit={addLecture}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lecture title" />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="YouTube or learning link"
        />
        <button className="primary-button">
          <Plus size={15} /> Add lecture
        </button>
      </form>
      <div className="bulk-actions">
        <span>{selected.length ? `${selected.length} selected` : 'Select lectures for bulk actions'}</span>
        <button onClick={() => bulk('complete')}>
          <Check size={14} /> Complete
        </button>
        <button onClick={() => bulk('favorite')}>
          <Heart size={14} /> Favorite
        </button>
        <button onClick={() => bulk('delete')}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
      <div className="lecture-list">
        {subject.lectures.length ? (
          subject.lectures.map((lecture, index) => (
            <article key={lecture.id}>
              <input
                aria-label={`Select ${lecture.title}`}
                type="checkbox"
                checked={selected.includes(lecture.id)}
                onChange={() =>
                  setSelected(
                    selected.includes(lecture.id)
                      ? selected.filter((id) => id !== lecture.id)
                      : [...selected, lecture.id],
                  )
                }
              />
              <div className="lecture-thumb">
                {getThumbnail(lecture.url) ? (
                  <img src={getThumbnail(lecture.url)} alt="" />
                ) : (
                  <Play size={16} />
                )}
              </div>
              <div className="lecture-copy">
                <strong>{lecture.title}</strong>
                <span>
                  {lecture.channel} · {lecture.duration}
                </span>
                <div>
                  {lecture.tags.map((tag) => (
                    <i key={tag}>{tag}</i>
                  ))}
                </div>
              </div>
              <button
                className={`lecture-status ${lecture.status}`}
                onClick={() => updateLecture({ ...lecture, status: nextStatus(lecture.status) })}
              >
                {lecture.status.replace('_', ' ')}
              </button>
              <button
                className="lecture-button"
                aria-label={`Favorite ${lecture.title}`}
                onClick={() => updateLecture({ ...lecture, favorite: !lecture.favorite })}
              >
                <Heart size={16} fill={lecture.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                className="lecture-button"
                aria-label={`Bookmark ${lecture.title}`}
                onClick={() => updateLecture({ ...lecture, bookmarked: !lecture.bookmarked })}
              >
                <Bookmark size={16} fill={lecture.bookmarked ? 'currentColor' : 'none'} />
              </button>
              <div className="reorder-actions">
                <button
                  aria-label={`Move ${lecture.title} up`}
                  disabled={index === 0}
                  onClick={() => moveLecture(index, -1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  aria-label={`Move ${lecture.title} down`}
                  disabled={index === subject.lectures.length - 1}
                  onClick={() => moveLecture(index, 1)}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <button
                className="lecture-button"
                aria-label={`Remove ${lecture.title}`}
                onClick={() => removeLecture(lecture.id)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))
        ) : (
          <Empty text="No lectures yet. Paste a YouTube link to build this learning path." />
        )}
      </div>
    </Modal>
  );
}

function NewSubjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (subject: Subject) => void;
}) {
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [icon, setIcon] = useState('✦');
  const [color, setColor] = useState('#B896FF');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error('Give your subject a name.');
    onCreate({
      id: makeId('subject'),
      name: name.trim(),
      detail: detail.trim() || 'A new learning adventure',
      short: name
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      color,
      accent: 'lavender',
      deadline: '',
      icon,
      pinned: false,
      lectures: [],
    });
    onClose();
    toast.success('Your subject is ready.');
  };
  return (
    <Modal title="Create a subject" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>
          Subject name
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Product strategy"
          />
        </label>
        <label>
          A small description
          <input
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="What are you hoping to learn?"
          />
        </label>
        <div className="form-split">
          <label>
            Icon
            <input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={2} />
          </label>
          <label>
            Color
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
        </div>
        <button className="primary-button">
          Create subject <ChevronRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
function NewTaskModal({
  subjects,
  onClose,
  onCreate,
}: {
  subjects: Subject[];
  onClose: () => void;
  onCreate: (task: StudyTask) => void;
}) {
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [kind, setKind] = useState<TaskKind>('assignment');
  const [date, setDate] = useState('2026-10-25T10:00');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !subjectId) return toast.error('Give this task a title and subject.');
    onCreate({
      id: makeId('task'),
      title: title.trim(),
      subjectId,
      kind,
      due: date,
      priority: kind === 'exam' ? 'high' : 'medium',
      done: false,
    });
    onClose();
    toast.success('Added to your study calendar.');
  };
  return (
    <Modal title="Add a study block" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>
          Title
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Chapter 3 assignment"
          />
        </label>
        <label>
          Subject
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-split">
          <label>
            Type
            <select value={kind} onChange={(event) => setKind(event.target.value as TaskKind)}>
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="revision">Revision</option>
            </select>
          </label>
          <label>
            Due
            <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        <button className="primary-button">
          Add to plan <ChevronRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.section
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </header>
        {children}
      </motion.section>
    </div>
  );
}
function CommandPalette({
  open,
  close,
  setActive,
  openNewSubject,
  openNewTask,
  setFocusMode,
}: {
  open: boolean;
  close: () => void;
  setActive: (view: View) => void;
  openNewSubject: () => void;
  openNewTask: () => void;
  setFocusMode: (value: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);
  const items = [
    { label: 'Go to dashboard', action: () => setActive('Dashboard') },
    { label: 'Go to my subjects', action: () => setActive('My subjects') },
    { label: 'Open notes', action: () => setActive('Notes') },
    { label: 'Create a subject', action: openNewSubject },
    { label: 'Add a task', action: openNewTask },
    { label: 'Enter focus mode', action: () => setFocusMode(true) },
    { label: 'Open settings', action: () => setActive('Settings') },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <AnimatePresence>
      {open && (
        <div className="modal-backdrop command-backdrop" onMouseDown={close}>
          <motion.section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
          >
            <div>
              <Search size={19} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search commands…"
              />
              <kbd>Esc</kbd>
            </div>
            <section>
              {items.length ? (
                items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      close();
                    }}
                  >
                    <Command size={15} />
                    {item.label}
                    <ChevronRight size={15} />
                  </button>
                ))
              ) : (
                <p>No commands found.</p>
              )}
            </section>
            <footer>
              <Keyboard size={14} /> Use <kbd>↑</kbd>
              <kbd>↓</kbd> then <kbd>↵</kbd> to choose
            </footer>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
function Assistant({ open, onClose, data }: { open: boolean; onClose: () => void; data: WorkspaceData }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: 'Hey Alex! I can use your local workspace to suggest a next step.' },
  ]);
  const send = () => {
    if (!message.trim()) return;
    const recommendation = data.tasks.find((task) => !task.done);
    setMessages((current) => [
      ...current,
      { from: 'user', text: message },
      {
        from: 'ai',
        text: recommendation
          ? `Your best next action is “${recommendation.title}” for ${getSubjectName(data.subjects, recommendation.subjectId)}. Try one 25-minute focus block, then reassess.`
          : 'Your queue is clear. Consider a small revision block for your favorite subject.',
      },
    ]);
    setMessage('');
  };
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="assistant-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="assistant-panel"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 310, damping: 30 }}
          >
            <div className="assistant-head">
              <div>
                <div className="bot-bubble">
                  <Bot size={20} />
                </div>
                <div>
                  <strong>Study companion</strong>
                  <span>Local plan assistant</span>
                </div>
              </div>
              <IconButton label="Close assistant" onClick={onClose}>
                <X size={19} />
              </IconButton>
            </div>
            <div className="assistant-chat">
              {messages.map((item, index) => (
                <div className={`chat-message ${item.from}`} key={index}>
                  {item.from === 'ai' && <Bot size={15} />}
                  {item.text}
                </div>
              ))}
            </div>
            <div className="quick-prompts">
              <button onClick={() => setMessage('Plan my next study session')}>Plan my session</button>
              <button onClick={() => setMessage('What should I review?')}>What to review?</button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask about your learning…"
              />
              <button aria-label="Send message">
                <ChevronRight size={19} />
              </button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
function FocusOverlay({ exit }: { exit: () => void }) {
  return (
    <div className="focus-overlay">
      <button onClick={exit}>
        <X size={18} /> Exit focus
      </button>
      <div>
        <Timer size={30} />
        <span className="eyebrow">FOCUS MODE</span>
        <h1>
          Give this one thing
          <br />
          your full attention.
        </h1>
        <p>25 minutes · Design systems</p>
        <FocusTimer onFinish={() => undefined} />
      </div>
    </div>
  );
}
function Empty({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <Inbox size={22} />
      <p>{text}</p>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? (
      <div className="app-error">
        <ShieldCheck size={28} />
        <h1>We hit a small snag.</h1>
        <p>Your saved workspace is safe. Refresh to continue.</p>
        <button className="primary-button" onClick={() => window.location.reload()}>
          Refresh EduSync
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

function Workspace({ authUser, onLogout }: { authUser: AuthUser; onLogout: () => void }) {
  const emptyWorkspace: WorkspaceData = {
    ...seedWorkspace,
    subjects: [],
    tasks: [],
    notes: [],
    goals: [],
    activity: [],
    studiedTodayMinutes: 0,
  };
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useLocalStorage<WorkspaceData>(
    `edusync-workspace-v3-${authUser.id}`,
    authUser.role === 'admin' ? seedWorkspace : emptyWorkspace,
  );
  useEffect(() => {
    let cancelled = false;
    loadWorkspace()
      .then((remote) => {
        if (cancelled) return;
        if (remote) setData(remote);
        else persistWorkspace(data).catch(() => undefined);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setRemoteReady(true);
      });
    return () => { cancelled = true; };
  }, [authUser.id]);

  useEffect(() => {
    if (!remoteReady) return;
    const timer = window.setTimeout(() => {
      setSyncing(true);
      persistWorkspace(data)
        .catch(() => undefined)
        .finally(() => setSyncing(false));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, remoteReady]);
  const [active, setActive] = useState<View>(authUser.role === 'admin' ? 'Admin' : 'Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [dark, setDark] = useLocalStorage('edusync-theme', false);
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = data.language;
  }, [dark, data.language]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        event.key.toLowerCase() === 'f' &&
        (event.target as HTMLElement)?.tagName !== 'INPUT' &&
        (event.target as HTMLElement)?.tagName !== 'TEXTAREA'
      )
        setFocusMode(true);
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setModal(null);
        setAssistantOpen(false);
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const log = (label: string, category: Activity['category']) =>
    setData((current) => ({
      ...current,
      activity: [{ id: makeId('activity'), label, time: 'Just now', category }, ...current.activity].slice(
        0,
        12,
      ),
    }));
  const updateSubject = (subject: Subject) => {
    setData((current) => ({
      ...current,
      subjects: current.subjects.map((item) => (item.id === subject.id ? subject : item)),
    }));
    log(`Updated ${subject.name}`, 'study');
  };
  const openSubject = (id: string) => {
    setSelectedSubjectId(id);
    setModal('subject');
  };
  const deleteSubject = (id: string) => {
    const name = data.subjects.find((subject) => subject.id === id)?.name;
    setData((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject.id !== id),
      tasks: current.tasks.filter((task) => task.subjectId !== id),
      notes: current.notes.filter((note) => note.subjectId !== id),
    }));
    toast.info(`${name ?? 'Subject'} was removed.`);
  };
  const createSubject = (subject: Subject) => {
    setData((current) => ({ ...current, subjects: [...current.subjects, subject] }));
    log(`Created ${subject.name}`, 'study');
  };
  const createTask = (task: StudyTask) => {
    setData((current) => ({ ...current, tasks: [...current.tasks, task] }));
    log(`Added ${task.title}`, 'task');
  };
  const updateTask = (id: string) => {
    const task = data.tasks.find((item) => item.id === id);
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    }));
    if (task) log(`${task.done ? 'Reopened' : 'Completed'} ${task.title}`, 'task');
  };
  const updateLecture = (subjectId: string, lecture: Lecture) =>
    updateSubject({
      ...data.subjects.find((subject) => subject.id === subjectId)!,
      lectures: data.subjects
        .find((subject) => subject.id === subjectId)!
        .lectures.map((item) => (item.id === lecture.id ? lecture : item)),
    });
  const newNote = () => {
    const note: Note = {
      id: makeId('note'),
      title: 'Untitled note',
      subjectId: data.subjects[0]?.id ?? '',
      body: '# A new idea\n\nStart writing here…',
      updatedAt: new Date().toISOString(),
    };
    setData((current) => ({ ...current, notes: [note, ...current.notes] }));
    setActive('Notes');
    log('Created a new note', 'note');
  };
  const updateNote = (note: Note) =>
    setData((current) => ({
      ...current,
      notes: current.notes.map((item) => (item.id === note.id ? note : item)),
    }));
  const saveVideoSummary = (subjectId: string, lectureId: string, summary: string) => {
    const subject = data.subjects.find((item) => item.id === subjectId);
    const lecture = subject?.lectures.find((item) => item.id === lectureId);
    if (!subject || !lecture) return;
    const note: Note = {
      id: makeId('video-summary'),
      title: `${lecture.title} — video summary`,
      subjectId,
      body: `# ${lecture.title}\n\n${summary}`,
      updatedAt: new Date().toISOString(),
    };
    setData((current) => ({
      ...current,
      subjects: current.subjects.map((item) =>
        item.id === subjectId
          ? {
              ...item,
              lectures: item.lectures.map((entry) =>
                entry.id === lectureId ? { ...entry, summary } : entry,
              ),
            }
          : item,
      ),
      notes: [note, ...current.notes],
      activity: [
        {
          id: makeId('activity'),
          label: `Summarized “${lecture.title}”`,
          time: 'Just now',
          category: 'note' as const,
        },
        ...current.activity,
      ].slice(0, 12),
    }));
  };
  const exportData = () => {
    downloadFile(
      `edusync-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    );
    const csv = [
      'subject,lecture,status,favorite,bookmarked',
      ...data.subjects.flatMap((subject) =>
        subject.lectures.map(
          (lecture) =>
            `"${subject.name.replaceAll('"', '""')}","${lecture.title.replaceAll('"', '""')}",${lecture.status},${lecture.favorite},${lecture.bookmarked}`,
        ),
      ),
    ].join('\n');
    downloadFile('edusync-lectures.csv', csv, 'text/csv');
    toast.success('JSON backup and CSV lecture export downloaded.');
  };
  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WorkspaceData;
        if (!Array.isArray(parsed.subjects) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.notes))
          throw new Error('Invalid data');
        setData({ ...seedWorkspace, ...parsed });
        toast.success('Your EduSync backup was imported.');
      } catch {
        toast.error('That file is not a valid EduSync backup.');
      }
    };
    reader.readAsText(file);
  };
  const selectedSubject = data.subjects.find((subject) => subject.id === selectedSubjectId);
  const page = useMemo(
    () =>
      ({
        Dashboard: (
          <Dashboard
            data={data}
            user={authUser}
            setActive={setActive}
            openSubject={openSubject}
            openNewSubject={() => setModal('new-subject')}
            addMinutes={(minutes) => {
              setData((current) => ({
                ...current,
                studiedTodayMinutes: current.studiedTodayMinutes + minutes,
              }));
              log(`Completed a ${minutes}-minute focus session`, 'study');
            }}
            setFocusMode={setFocusMode}
          />
        ),
        'My subjects': (
          <SubjectsPage
            subjects={data.subjects}
            openSubject={openSubject}
            openNewSubject={() => setModal('new-subject')}
            togglePin={(id) =>
              setData((current) => ({
                ...current,
                subjects: current.subjects.map((subject) =>
                  subject.id === id ? { ...subject, pinned: !subject.pinned } : subject,
                ),
              }))
            }
            deleteSubject={deleteSubject}
            reorder={(event) => {
              const { active: drag, over } = event;
              if (!over || drag.id === over.id) return;
              setData((current) => ({
                ...current,
                subjects: arrayMove(
                  current.subjects,
                  current.subjects.findIndex((subject) => subject.id === drag.id),
                  current.subjects.findIndex((subject) => subject.id === over.id),
                ),
              }));
            }}
          />
        ),
        Planner: <PlannerPage data={data} openNewTask={() => setModal('new-task')} toggleTask={updateTask} />,
        Tasks: (
          <TasksPage
            data={data}
            openNewTask={() => setModal('new-task')}
            toggleTask={updateTask}
            deleteTask={(id) =>
              setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }))
            }
          />
        ),
        Notes: (
          <NotesPage
            data={data}
            updateNote={updateNote}
            newNote={newNote}
            deleteNote={(id) =>
              setData((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }))
            }
            onVideoSummary={saveVideoSummary}
          />
        ),
        Analytics: <AnalyticsPage data={data} />,
        Library: <LibraryPage data={data} updateLecture={updateLecture} />,
        Settings: <SettingsPage data={data} setData={setData} onExport={exportData} onImport={importData} />,
        Admin:
          authUser.role === 'admin' ? (
            <AdminPage data={data} />
          ) : (
            <Dashboard
              data={data}
              user={authUser}
              setActive={setActive}
              openSubject={openSubject}
              openNewSubject={() => setModal('new-subject')}
              addMinutes={() => undefined}
              setFocusMode={setFocusMode}
            />
          ),
      })[active],
    [active, authUser, data, selectedSubjectId],
  );
  return (
    <ErrorBoundary>
      <div className="app-shell">
        <Sidebar
          user={authUser}
          onLogout={onLogout}
          active={active}
          setActive={setActive}
          collapsed={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
        <main>
          <Header
            user={authUser}
            onMenu={() => setMenuOpen(true)}
            dark={dark}
            toggleDark={() => setDark((value) => !value)}
            openCommand={() => setCommandOpen(true)}
            setActive={setActive}
          />
          {page}
        </main>
        <button className="ai-fab" onClick={() => setAssistantOpen(true)}>
          <Sparkles size={19} />
          <span>Ask EduSync AI</span>
        </button>
        <Assistant open={assistantOpen} onClose={() => setAssistantOpen(false)} data={data} />
        <CommandPalette
          open={commandOpen}
          close={() => setCommandOpen(false)}
          setActive={setActive}
          openNewSubject={() => setModal('new-subject')}
          openNewTask={() => setModal('new-task')}
          setFocusMode={setFocusMode}
        />
        <AnimatePresence>
          {modal === 'new-subject' && (
            <NewSubjectModal onClose={() => setModal(null)} onCreate={createSubject} />
          )}
          {modal === 'new-task' && (
            <NewTaskModal subjects={data.subjects} onClose={() => setModal(null)} onCreate={createTask} />
          )}
          {modal === 'subject' && selectedSubject && (
            <SubjectWorkbench
              subject={selectedSubject}
              onClose={() => setModal(null)}
              updateSubject={updateSubject}
              deleteSubject={deleteSubject}
            />
          )}
        </AnimatePresence>
        {focusMode && <FocusOverlay exit={() => setFocusMode(false)} />}
      </div>
    </ErrorBoundary>
  );
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
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'admin-setup'>('sign-in');
  const [portal, setPortal] = useState<'student' | 'admin'>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const checks = passwordChecks(password);
  const strength = checks.filter(([, pass]) => pass).length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'sign-up') {
      if (!acceptedTerms) return toast.error('Please accept the terms to create an account.');
      if (strength < 5) return toast.error('Please meet every password requirement.');
      if (password !== confirmPassword) return toast.error('Your passwords do not match.');
    }
    if (mode === 'admin-setup' && strength < 5) return toast.error('Use a stronger administrator password.');
    setLoading(true);
    try {
      const user =
        mode === 'sign-up'
          ? await createAccount({ fullName, email, phone, password })
          : mode === 'admin-setup'
            ? await createDemoAdmin(email, password)
            : await signIn({ email, password, portal });
      if (mode === 'admin-setup')
        toast.success('Local administrator created. Sign in through the administrator portal.');
      else {
        onAuthenticated(user);
        toast.success(
          mode === 'sign-up' ? 'Your account is ready.' : `Welcome back, ${user.fullName.split(' ')[0]}.`,
        );
      }
      if (mode === 'admin-setup') {
        setMode('sign-in');
        setPortal('admin');
        setPassword('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to continue right now.');
    } finally {
      setLoading(false);
    }
  };

  const useGoogle = () => {
    try {
      googleSignIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google sign-in is not configured.');
    }
  };
  const isSignUp = mode === 'sign-up';
  const isAdminSetup = mode === 'admin-setup';
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <div className="brand-mark">
            <GraduationCap size={24} />
          </div>
          <span>EduSync</span>
        </div>
        <div className="auth-hero">
          <span className="eyebrow">A CALMER WAY TO LEARN</span>
          <h1>
            Turn your
            <br />
            <em>curiosity</em> into
            <br />
            momentum.
          </h1>
          <p>Plan your study, keep thoughtful notes, and make every small win count.</p>
          <div className="auth-testimonial">
            <Avatar name="Maya Chen" />
            <p>
              “My study weeks finally feel clear, not chaotic.”<small>Maya Chen · Design student</small>
            </p>
          </div>
        </div>
        <div className="auth-orbit auth-orbit-one" />
        <div className="auth-orbit auth-orbit-two" />
      </section>
      <section className="auth-form-panel">
        <div className="auth-topline">
          <span>
            {portal === 'admin' ? 'ADMINISTRATOR PORTAL' : isSignUp ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}
          </span>
          <button
            onClick={() => {
              setPortal(portal === 'student' ? 'admin' : 'student');
              setMode('sign-in');
            }}
          >
            {portal === 'student' ? 'Administrator sign in' : 'Student sign in'}
          </button>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <h2>
              {isAdminSetup
                ? 'Set up local admin'
                : isSignUp
                  ? 'Start learning with intention.'
                  : portal === 'admin'
                    ? 'Manage EduSync securely.'
                    : 'Welcome back.'}
            </h2>
            <p>
              {isAdminSetup
                ? 'This only exists in browser-only preview. Deployments create the admin from server environment variables.'
                : isSignUp
                  ? 'Your learning space starts with a thoughtful setup.'
                  : portal === 'admin'
                    ? 'Use your separate administrator credentials.'
                    : 'Sign in to continue your learning journey.'}
            </p>
          </div>
          {!isSignUp && !isAdminSetup && portal === 'student' && (
            <button className="google-button" onClick={useGoogle}>
              <span className="google-g">G</span> Continue with Google
            </button>
          )}
          {!isSignUp && !isAdminSetup && portal === 'student' && (
            <div className="auth-divider">
              <span>or continue with email</span>
            </div>
          )}
          <form className="auth-form" onSubmit={submit}>
            {(isSignUp || isAdminSetup) && !isAdminSetup && (
              <label>
                Full name
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  required
                />
              </label>
            )}
            {isSignUp && (
              <label>
                Phone number
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Your phone number"
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={isAdminSetup ? 'admin@yourdomain.com' : 'you@example.com'}
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete={isSignUp || isAdminSetup ? 'new-password' : 'current-password'}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            {(isSignUp || isAdminSetup) && (
              <>
                <div className="password-meter">
                  <div>
                    <span>Password strength</span>
                    <strong className={`strength-${strength}`}>
                      {strength < 3 ? 'Needs work' : strength < 5 ? 'Almost there' : 'Strong'}
                    </strong>
                  </div>
                  <i>
                    <b className={`strength-${strength}`} />
                  </i>
                </div>
                <ul className="password-checks">
                  {checks.map(([label, pass]) => (
                    <li className={pass ? 'pass' : ''} key={label}>
                      {pass ? <Check size={13} /> : <span />} {label}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {isSignUp && (
              <label>
                Confirm password
                <input
                  autoComplete="new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  required
                />
              </label>
            )}
            {isSignUp && (
              <label className="terms-check">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                />{' '}
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>
            )}
            {!isSignUp && !isAdminSetup && (
              <button
                type="button"
                className="forgot-link"
                onClick={() =>
                  toast.info('Password reset is available once the email provider is configured on the API.')
                }
              >
                Forgot password?
              </button>
            )}
            <button className="auth-submit" disabled={loading}>
              {loading
                ? 'Please wait…'
                : isSignUp
                  ? 'Create my account'
                  : isAdminSetup
                    ? 'Create local admin'
                    : portal === 'admin'
                      ? 'Sign in to admin portal'
                      : 'Sign in'}{' '}
              <ChevronRight size={17} />
            </button>
          </form>
          {!isAdminSetup && (
            <p className="auth-switch">
              {isSignUp ? 'Already have an account?' : 'New to EduSync?'}{' '}
              <button
                onClick={() => {
                  setMode(isSignUp ? 'sign-in' : 'sign-up');
                  setPortal('student');
                }}
              >
                {isSignUp ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          )}
          {!apiConfigured && portal === 'admin' && !isAdminSetup && (
            <button className="demo-admin-link" onClick={() => setMode('admin-setup')}>
              Set up a local administrator for preview
            </button>
          )}
          {!apiConfigured && (
            <p className="deployment-note">
              <ShieldCheck size={14} /> Browser preview mode. Add <code>VITE_API_URL</code> and server secrets
              for secure deployment.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState<AuthUser | null>(() => readSession());
  const logout = async () => {
    await signOut();
    clearSession();
    setSession(null);
    toast.info('You have signed out.');
  };
  if (!session)
    return (
      <AuthScreen
        onAuthenticated={(user) => {
          saveSession(user);
          setSession(user);
        }}
      />
    );
  return <Workspace key={session.id} authUser={session} onLogout={logout} />;
}

export default App;
