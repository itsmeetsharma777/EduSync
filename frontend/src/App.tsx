import {
  Component,
  type FormEvent,
  type ReactNode,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  ArrowRight,
  BarChart3,
  BatteryCharging,
  Bell,
  Brain,
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
import { Header, type AppNotification } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import type { View } from './types/navigation';
import { downloadFile, makeId, useLocalStorage } from './utils/storage';
import { parseYouTubeUrl } from './utils/youtube';
import { seedWorkspace } from './data/seedWorkspace';
import type { Lecture, LectureStatus, Note, StudyDay, StudyTask, Subject, TaskKind, WorkspaceData } from './types';
import {
  deleteManagedUser,
  listManagedUsers,
  loadAdminStats,
  summarizeLecture,
  updateManagedUser,
  type AuthUser,
} from './services/auth';

type ModalName = 'new-subject' | 'new-task' | 'subject' | 'contact' | null;

type AppearancePreset = 'crystal' | 'frosted' | 'deep' | 'liquid' | 'minimal';
type Preferences = {
  name: string;
  preset: AppearancePreset;
  accent: 'coral' | 'violet' | 'teal' | 'gold';
  glassOpacity: number;
  blur: number;
  reflection: number;
  depth: number;
  tilt: boolean;
  compact: boolean;
  fontScale: number;
  reduceEffects: boolean;
};

const defaultPreferences: Preferences = {
  name: '', preset: 'frosted', accent: 'coral', glassOpacity: 0.76, blur: 18, reflection: 0.42, depth: 0.5, tilt: true, compact: false, fontScale: 100, reduceEffects: false,
};

const appearancePresets: Record<AppearancePreset, Omit<Preferences, 'name' | 'preset' | 'accent' | 'tilt' | 'compact' | 'fontScale' | 'reduceEffects'>> = {
  crystal: { glassOpacity: 0.38, blur: 12, reflection: 0.7, depth: 0.3 },
  frosted: { glassOpacity: 0.76, blur: 18, reflection: 0.42, depth: 0.5 },
  deep: { glassOpacity: 0.88, blur: 24, reflection: 0.24, depth: 0.8 },
  liquid: { glassOpacity: 0.56, blur: 30, reflection: 0.85, depth: 0.7 },
  minimal: { glassOpacity: 0.93, blur: 4, reflection: 0.08, depth: 0.15 },
};

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
  const video = parseYouTubeUrl(url);
  return video ? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg` : '';
}

function cycleLectureStatus(status: LectureStatus): LectureStatus {
  if (status === 'not_started') return 'in_progress';
  if (status === 'in_progress') return 'completed';
  return 'not_started';
}

type YouTubePlayer = { getCurrentTime: () => number; getDuration: () => number; seekTo: (seconds: number, allowSeekAhead: boolean) => void; destroy: () => void };
type YouTubeApi = { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer; PlayerState: { ENDED: number; PLAYING: number } };
let youtubeApi: Promise<YouTubeApi> | undefined;

function loadYouTubeApi() {
  if (youtubeApi) return youtubeApi;
  youtubeApi = new Promise((resolve, reject) => {
    const existing = (window as Window & { YT?: YouTubeApi }).YT;
    if (existing?.Player) return resolve(existing);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Unable to load the YouTube player.'));
    const priorReady = (window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady;
    (window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      priorReady?.();
      const api = (window as Window & { YT?: YouTubeApi }).YT;
      if (api?.Player) resolve(api); else reject(new Error('YouTube player did not initialize.'));
    };
    document.head.append(script);
  });
  return youtubeApi;
}

function VideoPlayer({ lecture, onProgress }: { lecture: Lecture; onProgress: (lecture: Lecture) => void }) {
  const playerHost = useRef<HTMLDivElement>(null);
  const latest = useRef(lecture);
  const latestProgress = useRef(onProgress);
  const video = parseYouTubeUrl(lecture.url);
  const videoId = video?.videoId;
  const [playerError, setPlayerError] = useState('');

  useEffect(() => { latest.current = lecture; }, [lecture]);
  useEffect(() => { latestProgress.current = onProgress; }, [onProgress]);
  useEffect(() => {
    if (!videoId || !playerHost.current) return;
    let player: YouTubePlayer | undefined;
    let timer: number | undefined;
    let cancelled = false;
    const saveProgress = () => {
      if (!player) return;
      const current = latest.current;
      const position = player.getCurrentTime();
      const duration = player.getDuration();
      if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0 || position < 0) return;
      const percent = Math.min(100, Math.round((position / duration) * 100));
      if (Math.abs(position - (current.lastPositionSeconds ?? 0)) < 3 && percent === (current.progressPercent ?? 0)) return;
      latestProgress.current({ ...current, lastPositionSeconds: position, durationSeconds: duration, progressPercent: percent, lastWatchedAt: new Date().toISOString(), status: percent >= 90 ? 'completed' : position > 0 ? 'in_progress' : current.status, completedAt: percent >= 90 ? new Date().toISOString() : current.completedAt });
    };
    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerHost.current) return;
      player = new YT.Player(playerHost.current, {
        videoId,
        playerVars: { origin: window.location.origin, rel: 0, playsinline: 1, start: Math.floor(latest.current.lastPositionSeconds ?? 0) },
        events: {
          onReady: () => { const resume = latest.current.lastPositionSeconds ?? 0; if (resume > 0) player?.seekTo(resume, true); timer = window.setInterval(saveProgress, 5_000); },
          onStateChange: (event: { data: number }) => { if (event.data === YT.PlayerState.PLAYING) saveProgress(); if (event.data === YT.PlayerState.ENDED) latestProgress.current({ ...latest.current, progressPercent: 100, status: 'completed', completedAt: new Date().toISOString(), lastWatchedAt: new Date().toISOString() }); },
        },
      });
    }).catch((error) => setPlayerError(error instanceof Error ? error.message : 'Unable to load the YouTube player.'));
    return () => { if (timer) window.clearInterval(timer); saveProgress(); player?.destroy(); cancelled = true; };
  }, [videoId]);

  if (!video) return <p className="player-error">This lesson does not contain a supported YouTube URL.</p>;
  const resume = Math.max(0, Math.floor(lecture.lastPositionSeconds ?? 0));
  return <section className="video-player"><div ref={playerHost} className="youtube-host" aria-label={`YouTube player: ${lecture.title}`} />{playerError && <p className="player-error">{playerError}</p>}<div className="video-player-meta"><span>{lecture.progressPercent ?? 0}% watched{resume ? ` · resumes at ${Math.floor(resume / 60)}:${String(resume % 60).padStart(2, '0')}` : ''}</span><a href={lecture.url} target="_blank" rel="noreferrer">Open on YouTube</a></div></section>;
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
  const [duration, setDuration] = useState(25);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  const changeDuration = (next: number) => {
    const safeDuration = Math.min(180, Math.max(1, Math.floor(next) || 1));
    setDuration(safeDuration);
    if (!running) setSeconds(safeDuration * 60);
  };

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false);
          onFinish(duration);
          toast.success(`${duration}-minute focus block complete. Nice work.`);
          return duration * 60;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, onFinish, duration]);

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
        <p>Choose a duration that fits your energy. Completed blocks count toward today.</p>
        <div className="timer-controls" aria-label="Focus duration">
          {[15, 25, 45, 60].map((value) => <button key={value} type="button" className={duration === value ? 'selected' : ''} onClick={() => changeDuration(value)}>{value} min</button>)}
          <label>Custom <input type="number" min="1" max="180" value={duration} onChange={(event) => changeDuration(Number(event.target.value))} /> min</label>
        </div>
        <button className="button button-primary" onClick={() => setRunning((value) => !value)}>
          {running ? <><Clock3 size={16} /> Pause block</> : <><Play size={16} fill="currentColor" /> Start {duration} min</>}
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
        <MetricCard icon={<Zap size={18} />} label="Workspace" value="Private" hint="Saved only on this device" />
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

type Flashcard = { id: string; front: string; back: string; subjectId: string; createdAt: string; lastReviewedAt?: string; dueAt?: string; interval?: number; confidence?: 'hard' | 'good' | 'easy' };
type DailyPulse = { date: string; mood: number; energy: number; intention: string };
type VocabularyItem = { id: string; term: string; meaning: string; subjectId: string };
type CheatSheet = { id: string; title: string; body: string; subjectId: string };

function StudyLabPage({ data }: { data: WorkspaceData }) {
  const [cards, setCards] = useLocalStorage<Flashcard[]>('edusync-flashcards-v1', []);
  const [pulse, setPulse] = useLocalStorage<DailyPulse | null>('edusync-daily-pulse-v1', null);
  const [topThree, setTopThree] = useLocalStorage<string[]>('edusync-top-three-v1', ['', '', '']);
  const [vocabulary, setVocabulary] = useLocalStorage<VocabularyItem[]>('edusync-vocabulary-v1', []);
  const [cheatSheets, setCheatSheets] = useLocalStorage<CheatSheet[]>('edusync-cheat-sheets-v1', []);
  const [tab, setTab] = useState<'review' | 'plan' | 'toolkit'>('review');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [sourceNotes, setSourceNotes] = useState('');
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [sheetTitle, setSheetTitle] = useState('');
  const [sheetBody, setSheetBody] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const currentCard = cards[reviewIndex % Math.max(cards.length, 1)];
  const dueCards = cards.filter((card) => !card.dueAt || card.dueAt.slice(0, 10) <= today);
  const quizChoices = currentCard ? [currentCard.back, ...cards.filter((card) => card.id !== currentCard.id).slice(0, 3).map((card) => card.back)].sort((a, b) => a.localeCompare(b)) : [];
  const reviewedToday = cards.filter((card) => card.lastReviewedAt?.slice(0, 10) === today).length;
  const completedTasks = data.tasks.filter((task) => task.done).length;
  const focusPoints = data.studyHistory.reduce((total, entry) => total + entry.minutes, 0) + completedTasks * 10 + reviewedToday * 2;
  const currentPulse = pulse?.date === today ? pulse : null;
  const checkIn = (field: 'mood' | 'energy', value: number) => setPulse({ date: today, mood: currentPulse?.mood ?? 3, energy: currentPulse?.energy ?? 3, intention: currentPulse?.intention ?? '', [field]: value });
  const saveCard = (event: FormEvent) => {
    event.preventDefault();
    if (!front.trim() || !back.trim()) return toast.error('Add both a question and an answer.');
    setCards((current) => [{ id: makeId('card'), front: front.trim(), back: back.trim(), subjectId, createdAt: new Date().toISOString(), dueAt: new Date().toISOString(), interval: 0 }, ...current]);
    setFront(''); setBack(''); setReviewIndex(0); setRevealed(false);
    toast.success('Recall card added to your study lab.');
  };
  const reviewCard = (confidence: 'hard' | 'good' | 'easy' = 'good') => {
    if (!currentCard) return;
    const days = confidence === 'hard' ? 1 : confidence === 'easy' ? Math.max(7, (currentCard.interval ?? 1) * 2) : Math.max(3, (currentCard.interval ?? 1) + 2);
    const nextDue = new Date(); nextDue.setDate(nextDue.getDate() + days);
    setCards((current) => current.map((card) => card.id === currentCard.id ? { ...card, lastReviewedAt: new Date().toISOString(), dueAt: nextDue.toISOString(), interval: days, confidence } : card));
    setReviewIndex((current) => (current + 1) % cards.length);
    setRevealed(false); setQuizAnswer(null);
  };
  const importFromNotes = () => {
    const lines = sourceNotes.split(/[\n.!?]+/).map((line) => line.trim()).filter((line) => line.length > 12).slice(0, 12);
    if (!lines.length) return toast.error('Paste at least one complete idea from your notes.');
    setCards((current) => [...lines.map((line) => ({ id: makeId('card'), front: `Explain: ${line.slice(0, 72)}${line.length > 72 ? '…' : ''}`, back: line, subjectId, createdAt: new Date().toISOString(), dueAt: new Date().toISOString(), interval: 0 })), ...current]);
    setSourceNotes(''); toast.success(`${lines.length} recall cards created from your notes.`);
  };
  const addVocabulary = (event: FormEvent) => { event.preventDefault(); if (!term.trim() || !meaning.trim()) return; setVocabulary((current) => [{ id: makeId('word'), term: term.trim(), meaning: meaning.trim(), subjectId }, ...current]); setTerm(''); setMeaning(''); };
  const addCheatSheet = (event: FormEvent) => { event.preventDefault(); if (!sheetTitle.trim() || !sheetBody.trim()) return; setCheatSheets((current) => [{ id: makeId('sheet'), title: sheetTitle.trim(), body: sheetBody.trim(), subjectId }, ...current]); setSheetTitle(''); setSheetBody(''); };
  const pulseTip = currentPulse?.energy && currentPulse.energy <= 2
    ? 'Low-energy day: choose a 10-minute review, water, and a short break before a longer block.'
    : currentPulse?.mood && currentPulse.mood <= 2
      ? 'Be kind to yourself today. A small completed task is enough momentum to begin.'
      : 'You look ready to build momentum. Pick one task, set a timer, and start imperfectly.';

  return <div className="page study-lab-page">
    <PageHeader eyebrow="YOUR LEARNING PLAYGROUND" title="Study Lab" text="Turn passive notes into retrieval practice, notice your energy, and celebrate real momentum." />
    <div className="lab-metrics">
      <MetricCard icon={<Award size={18} />} label="Momentum points" value={String(focusPoints)} hint="Focus minutes + completed tasks + reviews" />
      <MetricCard icon={<Brain size={18} />} label="Recall cards" value={String(cards.length)} hint={`${dueCards.length} due · ${reviewedToday} reviewed today`} />
      <MetricCard icon={<BatteryCharging size={18} />} label="Daily readiness" value={currentPulse ? `${currentPulse.energy}/5` : '—'} hint={currentPulse ? 'Energy check-in saved' : 'Check in below'} />
    </div>
    <div className="lab-tabs"><button className={tab === 'review' ? 'selected' : ''} onClick={() => setTab('review')}>Recall & quiz</button><button className={tab === 'plan' ? 'selected' : ''} onClick={() => setTab('plan')}>Plan & reset</button><button className={tab === 'toolkit' ? 'selected' : ''} onClick={() => setTab('toolkit')}>Study toolkit</button></div>
    {tab === 'review' && <><div className="lab-grid">
      <Card className="pulse-card">
        <div className="card-heading"><div><span className="eyebrow">DAILY PULSE</span><h3>How are you arriving?</h3></div><Heart size={19} /></div>
        <p className="muted-copy">This stays private on this device. It helps you choose a study pace that fits today.</p>
        <div className="pulse-scale"><span>Mood</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} className={currentPulse?.mood === value ? 'selected' : ''} onClick={() => checkIn('mood', value)} aria-label={`Set mood to ${value} out of 5`}>{['😞', '😕', '😐', '🙂', '✨'][value - 1]}</button>)}</div></div>
        <div className="pulse-scale"><span>Energy</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} className={currentPulse?.energy === value ? 'selected' : ''} onClick={() => checkIn('energy', value)} aria-label={`Set energy to ${value} out of 5`}>{value}</button>)}</div></div>
        <label className="lab-intention">One intention for today<textarea value={currentPulse?.intention ?? ''} onChange={(event) => setPulse({ date: today, mood: currentPulse?.mood ?? 3, energy: currentPulse?.energy ?? 3, intention: event.target.value.slice(0, 180) })} placeholder="e.g. Understand one difficult idea, not everything at once." /></label>
        <div className="pulse-tip"><Sparkles size={16} /><span>{pulseTip}</span></div>
      </Card>
      <Card className="recall-card">
        <div className="card-heading"><div><span className="eyebrow">ACTIVE RECALL</span><h3>One card at a time</h3></div><Brain size={19} /></div>
        {currentCard ? <div className={`flashcard ${revealed ? 'revealed' : ''}`}><span>{revealed ? 'ANSWER' : 'QUESTION'} · {subjectName(data.subjects, currentCard.subjectId)}</span><strong>{revealed ? currentCard.back : currentCard.front}</strong><button className="text-link" onClick={() => setRevealed((value) => !value)}>{revealed ? 'Hide answer' : 'Reveal answer'} <ArrowRight size={14} /></button></div> : <EmptyState icon={<Brain size={22} />} title="Your recall deck is empty" text="Create a first question below. Small cards make revision feel lighter." />}
        {currentCard && <div className="flashcard-actions"><button className="button button-secondary" onClick={() => reviewCard('hard')}>Again tomorrow</button><button className="button button-secondary" onClick={() => reviewCard('good')}>Good · 3d</button><button className="button button-primary" onClick={() => reviewCard('easy')}><Check size={15} /> Easy · 7d+</button><button className="danger-icon" onClick={() => { setCards((current) => current.filter((card) => card.id !== currentCard.id)); setReviewIndex(0); }} aria-label="Delete flashcard"><Trash2 size={15} /></button></div>}
      </Card>
    </div>
    <Card className="create-card">
      <div className="card-heading"><div><span className="eyebrow">BUILD YOUR DECK</span><h3>Make a recall card</h3></div><Plus size={19} /></div>
      <form className="flashcard-form" onSubmit={saveCard}><input value={front} onChange={(event) => setFront(event.target.value)} placeholder="Question: What is the core idea?" /><input value={back} onChange={(event) => setBack(event.target.value)} placeholder="Answer: Explain it in your own words" /><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">General study</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><button className="button button-primary"><Plus size={15} /> Add card</button></form>
    </Card><Card className="quiz-card"><div className="card-heading"><div><span className="eyebrow">INSTANT FEEDBACK</span><h3>Quick knowledge check</h3></div><CheckCircle2 size={19} /></div>{currentCard ? <><p className="quiz-question">{currentCard.front}</p><div className="quiz-options">{quizChoices.map((choice) => <button key={choice} className={quizAnswer ? (choice === currentCard.back ? 'correct' : choice === quizAnswer ? 'wrong' : '') : ''} onClick={() => { if (!quizAnswer) { setQuizAnswer(choice); if (choice === currentCard.back) setQuizScore((score) => score + 1); } }}>{choice}</button>)}</div>{quizAnswer && <button className="button button-primary" onClick={() => reviewCard(quizAnswer === currentCard.back ? 'easy' : 'hard')}>Next question <ArrowRight size={15} /></button>}<small>Score this round: {quizScore}</small></> : <p className="muted-copy">Add a recall card to begin a low-pressure quiz.</p>}</Card></>}
    {tab === 'plan' && <div className="lab-grid"><Card className="top-three-card"><div className="card-heading"><div><span className="eyebrow">DAILY TOP THREE</span><h3>Only three wins today</h3></div><Target size={19} /></div>{topThree.map((item, index) => <label key={index}><span>{index + 1}</span><input value={item} onChange={(event) => setTopThree((current) => current.map((value, position) => position === index ? event.target.value.slice(0, 100) : value))} placeholder={['One meaningful task', 'One short review', 'One task for future you'][index]} /></label>)}<div className="pulse-tip"><Sparkles size={16} /><span>{pulseTip}</span></div></Card><Card className="plan-suggestion"><div className="card-heading"><div><span className="eyebrow">SMART NEXT STEP</span><h3>Make the workload lighter</h3></div><Timer size={19} /></div><strong>{data.tasks.find((task) => !task.done)?.title ?? 'Your queue is clear.'}</strong><p>{data.tasks.some((task) => !task.done) ? 'Try a 25-minute first pass, then decide whether to continue. The next step is more useful than the perfect plan.' : 'Use this time to create recall cards from today’s notes or prepare a small review deck.'}</p><div className="plan-chips"><span>25/5 Pomodoro</span><span>50/10 deep work</span><span>5-minute rescue start</span></div></Card></div>}
    {tab === 'toolkit' && <div className="toolkit-grid"><Card><div className="card-heading"><div><span className="eyebrow">NOTES → RECALL</span><h3>Make cards from notes</h3></div><Sparkles size={19} /></div><textarea className="toolkit-textarea" value={sourceNotes} onChange={(event) => setSourceNotes(event.target.value)} placeholder="Paste a few notes or ideas. EduSync will turn each sentence into a recall prompt." /><button className="button button-primary" onClick={importFromNotes}>Create recall cards</button></Card><Card><div className="card-heading"><div><span className="eyebrow">VOCABULARY BANK</span><h3>Terms worth remembering</h3></div><BookOpen size={19} /></div><form className="toolkit-form" onSubmit={addVocabulary}><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Term" /><input value={meaning} onChange={(event) => setMeaning(event.target.value)} placeholder="Meaning in your own words" /><button className="button button-secondary">Save term</button></form><div className="mini-list">{vocabulary.slice(0, 5).map((item) => <div key={item.id}><strong>{item.term}</strong><span>{item.meaning}</span></div>)}{!vocabulary.length && <p>Build a personal glossary as you learn.</p>}</div></Card><Card><div className="card-heading"><div><span className="eyebrow">CHEAT SHEETS</span><h3>Formula & concept sheets</h3></div><NotebookPen size={19} /></div><form className="cheat-form" onSubmit={addCheatSheet}><input value={sheetTitle} onChange={(event) => setSheetTitle(event.target.value)} placeholder="Sheet title" /><textarea value={sheetBody} onChange={(event) => setSheetBody(event.target.value)} placeholder="Formula, definition, method, or memory cue" /><button className="button button-secondary">Save sheet</button></form><div className="mini-list">{cheatSheets.slice(0, 4).map((sheet) => <div key={sheet.id}><strong>{sheet.title}</strong><span>{sheet.body}</span></div>)}{!cheatSheets.length && <p>Keep your most-used formulas and concepts close.</p>}</div></Card></div>}
  </div>;
}

type FeatureGroup = { title: string; description: string; items: { label: string; state: 'live' | 'local' | 'connect' }[] };
const featureGroups: FeatureGroup[] = [
  { title: 'Learning & revision', description: 'Learn actively, revisit at the right time, and turn material into practice.', items: [
    { label: 'Spaced-repetition flashcards', state: 'live' }, { label: 'Decks by subject and chapter', state: 'local' }, { label: 'Import flashcards from notes', state: 'live' }, { label: 'Quiz generator', state: 'live' }, { label: 'Multiple-choice, true/false & fill-in quizzes', state: 'local' }, { label: 'Weak-topic tracker', state: 'local' }, { label: 'Explain this simply tutor', state: 'connect' }, { label: 'Notes → mind map', state: 'local' }, { label: 'PDF upload, highlight & annotate', state: 'connect' }, { label: 'Voice notes & transcription', state: 'connect' }, { label: 'Text-to-speech notes', state: 'local' }, { label: 'Reading progress', state: 'local' }, { label: 'Formula sheets', state: 'live' }, { label: 'Citation organiser', state: 'local' }, { label: 'Assignment breakdown', state: 'local' }, { label: 'Exam countdown & timetable', state: 'local' }, { label: 'Topic confidence', state: 'local' }, { label: 'Learning-style preference', state: 'local' }, { label: 'Vocabulary & pronunciation', state: 'live' },
  ] },
  { title: 'Planning & productivity', description: 'See deadlines early, reduce work into small moves, and protect time for study.', items: [
    { label: 'Calendar study blocks', state: 'local' }, { label: 'Google / Outlook calendar sync', state: 'connect' }, { label: 'Adaptive auto-scheduler', state: 'local' }, { label: 'Priority matrix', state: 'local' }, { label: 'Recurring routines', state: 'local' }, { label: 'Daily Top 3', state: 'live' }, { label: 'Semester overview', state: 'local' }, { label: 'Exam timetable import', state: 'local' }, { label: 'Deadline-risk alerts', state: 'local' }, { label: 'Workload heatmap', state: 'local' }, { label: 'Habit tracker', state: 'local' }, { label: 'Morning & evening reflection', state: 'live' }, { label: 'Weekly review wizard', state: 'local' }, { label: 'What should I study next?', state: 'live' }, { label: 'Time estimates', state: 'local' }, { label: 'Pomodoro task breakdown', state: 'live' }, { label: 'Offline-first installable workspace', state: 'live' },
  ] },
  { title: 'Focus & anti-distraction', description: 'Protect attention while still treating the student with care.', items: [
    { label: 'Pomodoro, deep-work, exam-sprint & custom timers', state: 'live' }, { label: 'Break, stretch, hydration & eye-care prompts', state: 'local' }, { label: 'Focus ambience', state: 'local' }, { label: 'Fullscreen Zen mode', state: 'live' }, { label: 'Website-blocker extension guide', state: 'local' }, { label: 'Focus session history', state: 'live' }, { label: 'Distraction log', state: 'local' }, { label: 'End-session reflection', state: 'local' }, { label: 'Quiet in-app notifications', state: 'live' }, { label: 'Smart breaks from energy level', state: 'live' }, { label: 'Five-minute rescue start', state: 'live' },
  ] },
  { title: 'Analytics & wellbeing', description: 'Use data to understand your rhythm—not to punish yourself.', items: [
    { label: 'Monthly & semester reports', state: 'local' }, { label: 'Best study-time insights', state: 'local' }, { label: 'Subject distribution', state: 'live' }, { label: 'Goal forecast', state: 'local' }, { label: 'Consistency heatmap', state: 'local' }, { label: 'Focus-quality ratings', state: 'local' }, { label: 'Task trend & missed-deadline insights', state: 'local' }, { label: 'Revision coverage & mastery', state: 'local' }, { label: 'Planned vs actual time', state: 'local' }, { label: 'Gentle overload indicator', state: 'local' }, { label: 'Exportable report', state: 'local' }, { label: 'Mood, energy, sleep & stress check-ins', state: 'live' }, { label: 'Gratitude, wins & private journal', state: 'local' }, { label: 'Breathing exercise & burnout guidance', state: 'local' }, { label: 'Campus support resources', state: 'local' },
  ] },
  { title: 'Identity, community & AI', description: 'Make the workspace feel personal while keeping student data under control.', items: [
    { label: 'XP, milestones, badges & themes', state: 'live' }, { label: 'Avatar and profile card', state: 'local' }, { label: 'Custom dashboard widgets', state: 'local' }, { label: 'Theme, wallpaper, font & quote choices', state: 'live' }, { label: 'Study companion & seasonal challenges', state: 'local' }, { label: 'Shareable recap', state: 'local' }, { label: 'Custom shortcuts', state: 'live' }, { label: 'Private study rooms & shared timers', state: 'connect' }, { label: 'Accountability partners & study groups', state: 'connect' }, { label: 'Shared boards, decks & peer quizzes', state: 'connect' }, { label: 'Mentor workspace & coworking', state: 'connect' }, { label: 'AI planner, quizzes, summaries & tutor', state: 'connect' }, { label: 'AI feedback, translation & career guidance', state: 'connect' }, { label: 'AI-use guidance', state: 'local' },
  ] },
  { title: 'Trust & platform', description: 'Keep ownership clear while leaving a path to secure integrations.', items: [
    { label: 'Privacy-first local workspace', state: 'live' }, { label: 'Export and import backup', state: 'live' }, { label: 'Accessibility controls', state: 'live' }, { label: 'Multilingual interface foundation', state: 'live' }, { label: 'Secure cloud sync & continue on another device', state: 'connect' }, { label: 'Encrypted automated backup', state: 'connect' }, { label: 'Optional parent / teacher view', state: 'connect' }, { label: 'Feedback voting & feature requests', state: 'local' }, { label: 'Onboarding and sync status', state: 'local' },
  ] },
];

function FeatureHubPage({ setActive }: { setActive: (view: View) => void }) {
  const [expanded, setExpanded] = useState<string | null>('Learning & revision');
  const [integrationNotes, setIntegrationNotes] = useLocalStorage<Record<string, string>>('edusync-integration-notes-v1', {});
  const totals = featureGroups.flatMap((group) => group.items).reduce((count, item) => ({ ...count, [item.state]: count[item.state] + 1 }), { live: 0, local: 0, connect: 0 });
  return <div className="page feature-hub-page">
    <PageHeader eyebrow="EDUSYNC PRODUCT MAP" title="Feature Hub" text="Every requested capability has a home here. Local features work on this device; connection cards show exactly what you can wire to your own provider later." />
    <div className="feature-summary"><Card><strong>{totals.live}</strong><span>Working now</span></Card><Card><strong>{totals.local}</strong><span>Local-ready tools</span></Card><Card><strong>{totals.connect}</strong><span>Integration-ready</span></Card><button className="button button-primary" onClick={() => setActive('Study Lab')}>Open Study Lab <ArrowRight size={15} /></button></div>
    <Card className="integration-guide"><div><span className="eyebrow">CONNECT LATER</span><h3>Your integration handoff</h3><p>For calendar, AI, cloud sync, rooms, voice, and PDF services: connect your own provider keys through server-side environment variables. Do not paste private API keys into the browser.</p></div><ShieldCheck size={22} /></Card>
    <div className="feature-groups">{featureGroups.map((group) => <Card className="feature-group" key={group.title}><button className="feature-group-head" onClick={() => setExpanded((current) => current === group.title ? null : group.title)}><div><span className="eyebrow">{group.items.length} CAPABILITIES</span><h3>{group.title}</h3><p>{group.description}</p></div><ChevronRight size={20} className={expanded === group.title ? 'open' : ''} /></button>{expanded === group.title && <><div className="feature-list">{group.items.map((item) => <div key={item.label}><i className={item.state} /><span>{item.label}</span><b>{item.state === 'live' ? 'Working now' : item.state === 'local' ? 'Local-ready' : 'Connect provider'}</b></div>)}</div>{group.items.some((item) => item.state === 'connect') && <label className="integration-note">Implementation note for your developer<textarea value={integrationNotes[group.title] ?? ''} onChange={(event) => setIntegrationNotes((current) => ({ ...current, [group.title]: event.target.value.slice(0, 500) }))} placeholder="Add the provider you plan to connect, e.g. Google Calendar OAuth / OpenAI API / Supabase." /></label>}</>}</Card>)}</div>
  </div>;
}

function SettingsPage({
  data,
  setData,
  preferences,
  setPreferences,
  onExport,
  onImport,
}: {
  data: WorkspaceData;
  setData: Dispatch<SetStateAction<WorkspaceData>>;
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useLocalStorage('edusync-weekly-summary', false);
  const [studyProfile, setStudyProfile] = useLocalStorage('edusync-study-profile-v1', { style: 'practice', session: 25, breakReminders: true, hydration: true, buddyTone: 'warm', buddyName: 'Your Buddy', buddyFocus: 'balanced', buddyCheckins: true, dyslexiaFont: false, highContrast: false });
  useEffect(() => {
    document.documentElement.classList.toggle('dyslexia-friendly', studyProfile.dyslexiaFont);
    document.documentElement.classList.toggle('extra-contrast', studyProfile.highContrast);
  }, [studyProfile.dyslexiaFont, studyProfile.highContrast]);

  return (
    <div className="page">
      <PageHeader eyebrow="YOUR WORKSPACE" title="Settings" text="Personalize EduSync and keep control of your account and data." />
      <Card className="appearance-studio">
        <div className="card-heading"><div><span className="eyebrow">APPEARANCE STUDIO</span><h3>Make EduSync feel like yours</h3></div><Sparkles size={19} /></div>
        <div className="preference-grid">
          <label className="preference-name">Display name<input value={preferences.name} onChange={(event) => setPreferences((current) => ({ ...current, name: event.target.value.slice(0, 40) }))} placeholder="How should EduSync greet you?" /></label>
          <div className="preference-group"><span>Accent color</span><div className="accent-choices">{([['coral', 'Coral'], ['violet', 'Violet'], ['teal', 'Teal'], ['gold', 'Gold']] as const).map(([value, label]) => <button key={value} className={`accent-choice ${value} ${preferences.accent === value ? 'selected' : ''}`} onClick={() => setPreferences((current) => ({ ...current, accent: value }))} aria-label={`Use ${label} accent`}><i />{label}</button>)}</div></div>
          <div className="preference-group preset-group"><span>Liquid glass preset</span><div className="preset-choices">{([['crystal', 'Crystal'], ['frosted', 'Frosted'], ['deep', 'Deep'], ['liquid', 'Liquid'], ['minimal', 'Minimal']] as const).map(([value, label]) => <button key={value} className={preferences.preset === value ? 'selected' : ''} onClick={() => setPreferences((current) => ({ ...current, preset: value, ...appearancePresets[value] }))}>{label}</button>)}</div></div>
        </div>
        <div className="appearance-sliders">
          <RangeControl label="Glass transparency" value={Math.round(preferences.glassOpacity * 100)} min={5} max={95} suffix="%" onChange={(value) => setPreferences((current) => ({ ...current, preset: 'frosted', glassOpacity: value / 100 }))} />
          <RangeControl label="Background blur" value={preferences.blur} min={0} max={40} suffix="px" onChange={(value) => setPreferences((current) => ({ ...current, preset: 'frosted', blur: value }))} />
          <RangeControl label="Reflections" value={Math.round(preferences.reflection * 100)} min={0} max={100} suffix="%" onChange={(value) => setPreferences((current) => ({ ...current, preset: 'frosted', reflection: value / 100 }))} />
          <RangeControl label="Shadow depth" value={Math.round(preferences.depth * 100)} min={0} max={100} suffix="%" onChange={(value) => setPreferences((current) => ({ ...current, preset: 'frosted', depth: value / 100 }))} />
          <RangeControl label="Type size" value={preferences.fontScale ?? 100} min={90} max={120} suffix="%" onChange={(value) => setPreferences((current) => ({ ...current, fontScale: value }))} />
        </div>
        <div className="appearance-actions"><label className="switch-row"><input type="checkbox" checked={preferences.tilt} onChange={(event) => setPreferences((current) => ({ ...current, tilt: event.target.checked }))} /><span /> Interactive depth</label><label className="switch-row"><input type="checkbox" checked={preferences.compact} onChange={(event) => setPreferences((current) => ({ ...current, compact: event.target.checked }))} /><span /> Compact spacing</label><label className="switch-row"><input type="checkbox" checked={preferences.reduceEffects ?? false} onChange={(event) => setPreferences((current) => ({ ...current, reduceEffects: event.target.checked }))} /><span /> Quieter motion</label><button className="text-link" onClick={() => setPreferences(defaultPreferences)}>Reset appearance <RotateCcw size={14} /></button></div>
      </Card>
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
        <Card>
          <div className="settings-heading"><Brain size={19} /><div><h3>Learning profile</h3><p>Shape your default study experience around how you learn.</p></div></div>
          <div className="segmented">{(['visual', 'audio', 'practice', 'reading'] as const).map((style) => <button key={style} className={studyProfile.style === style ? 'selected' : ''} onClick={() => setStudyProfile((current) => ({ ...current, style }))}>{style}</button>)}</div>
          <RangeControl label="Default focus block" value={studyProfile.session} min={5} max={90} suffix=" min" onChange={(session) => setStudyProfile((current) => ({ ...current, session }))} />
        </Card>
        <Card>
          <div className="settings-heading"><Heart size={19} /><div><h3>Wellbeing nudges</h3><p>Gentle reminders that support focus without becoming distracting.</p></div></div>
          <div className="settings-toggle-list"><label className="switch-row"><input type="checkbox" checked={studyProfile.breakReminders} onChange={(event) => setStudyProfile((current) => ({ ...current, breakReminders: event.target.checked }))} /><span /> Stretch and eye-rest breaks</label><label className="switch-row"><input type="checkbox" checked={studyProfile.hydration} onChange={(event) => setStudyProfile((current) => ({ ...current, hydration: event.target.checked }))} /><span /> Water reminder during long sessions</label></div>
        </Card>
        <Card>
          <div className="settings-heading"><Sparkles size={19} /><div><h3>Your Buddy</h3><p>Choose how your supportive study guide communicates with you.</p></div></div>
          <label className="preference-name">Buddy name<input value={studyProfile.buddyName ?? 'Your Buddy'} onChange={(event) => setStudyProfile((current) => ({ ...current, buddyName: event.target.value.slice(0, 24) }))} placeholder="Your Buddy" /></label>
          <div className="segmented">{(['warm', 'direct', 'calm'] as const).map((tone) => <button key={tone} className={studyProfile.buddyTone === tone ? 'selected' : ''} onClick={() => setStudyProfile((current) => ({ ...current, buddyTone: tone }))}>{tone}</button>)}</div>
          <div className="segmented buddy-focus-choices">{([['balanced', 'Balance'], ['motivation', 'Motivate'], ['planning', 'Plan'], ['listening', 'Listen first']] as const).map(([focus, label]) => <button key={focus} className={(studyProfile.buddyFocus ?? 'balanced') === focus ? 'selected' : ''} onClick={() => setStudyProfile((current) => ({ ...current, buddyFocus: focus }))}>{label}</button>)}</div>
          <label className="switch-row"><input type="checkbox" checked={studyProfile.buddyCheckins ?? true} onChange={(event) => setStudyProfile((current) => ({ ...current, buddyCheckins: event.target.checked }))} /><span /> Offer gentle wellbeing check-ins</label>
        </Card>
        <Card>
          <div className="settings-heading"><ShieldCheck size={19} /><div><h3>Reading accessibility</h3><p>Make long study sessions easier on your eyes and attention.</p></div></div>
          <div className="settings-toggle-list"><label className="switch-row"><input type="checkbox" checked={studyProfile.dyslexiaFont} onChange={(event) => setStudyProfile((current) => ({ ...current, dyslexiaFont: event.target.checked }))} /><span /> Dyslexia-friendly letter spacing</label><label className="switch-row"><input type="checkbox" checked={studyProfile.highContrast} onChange={(event) => setStudyProfile((current) => ({ ...current, highContrast: event.target.checked }))} /><span /> Extra contrast</label></div>
        </Card>
      </div>
      <Card className="sessions-card">
        <div className="card-heading"><div><span className="eyebrow">PRIVACY</span><h3>Your workspace stays in this browser</h3></div><ShieldCheck size={19} /></div>
        <p className="muted-copy">EduSync is open to everyone and does not require an account. Your subjects, notes, goals, and study time are stored locally on this device. Export a backup before clearing browser data or changing devices.</p>
      </Card>
      <Card className="danger-zone">
        <div className="settings-heading"><ShieldAlert size={19} /><div><h3>Local data</h3><p>Workspace backups remain under your control.</p></div></div>
        <div className="danger-zone-note"><strong>Need to start fresh?</strong><span>Export a backup before removing local workspace data.</span></div>
        <button className="button button-secondary" onClick={() => { if (window.confirm('Clear this browser’s EduSync workspace? This cannot be undone unless you exported a backup.')) { localStorage.removeItem('edusync-public-workspace-v1'); toast.success('Local workspace cleared.'); window.location.reload(); } }}>Clear local workspace</button>
      </Card>
      <FeedbackForm />
    </div>
  );
}

function RangeControl({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="range-control"><span><b>{label}</b><output>{value}{suffix}</output></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  return (
    <Card className="feedback-card">
      <div className="settings-heading"><MessageCircle size={19} /><div><h3>Feedback</h3><p>Tell us what would make your study workflow clearer.</p></div></div>
      <form onSubmit={(event) => { event.preventDefault(); if (!message.trim() || sending) return; setSending(true); window.location.href = `mailto:meetsharma0702@gmail.com?subject=${encodeURIComponent('EduSync feedback')}&body=${encodeURIComponent(message.trim())}`; setMessage(''); setSending(false); toast.success('Your email client is ready with your feedback.'); }}>
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
      loadAdminStats(),
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
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const watching = subject.lectures.find((lecture) => lecture.id === watchingId);

  const addLecture = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !url.trim()) return toast.error('Add a lesson title and link.');
    const parsed = parseYouTubeUrl(url);
    if (!parsed) return toast.error('Use a supported HTTPS YouTube URL (watch, youtu.be, embed, or shorts).');
    if (subject.lectures.some((item) => parseYouTubeUrl(item.url)?.videoId === parsed.videoId)) return toast.error('This video is already in this subject.');
    const lecture: Lecture = {
      id: makeId('lecture'),
      title: title.trim(),
      url: parsed.canonicalUrl,
      duration: 'New',
      channel: 'Learning resource',
      status: 'not_started',
      favorite: false,
      bookmarked: false,
      tags: [],
      note: '',
      youtubeId: parsed.videoId,
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
      {watching && <VideoPlayer lecture={watching} onProgress={(lecture) => updateLecture(subject.id, lecture)} />}
      {tab === 'lessons' ? (
        <>
          <form className="add-lesson-form" onSubmit={addLecture}>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lesson title" />
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="YouTube URL" />
            <button className="button button-primary"><Plus size={15} /> Add lesson</button>
          </form>
          <div className="lecture-list-new">
            {subject.lectures.map((lecture) => (
              <article className="lecture-row-new" key={lecture.id}>
                <div className="lecture-thumb-new">{getYoutubeThumbnail(lecture.url) ? <img src={getYoutubeThumbnail(lecture.url)} alt="" /> : <Play size={17} />}</div>
                <button className="lecture-info lecture-open" onClick={() => setWatchingId(lecture.id)} aria-label={`Watch ${lecture.title}`}><strong>{lecture.title}</strong><span>{lecture.channel} · {lecture.duration}{lecture.progressPercent ? ` · ${lecture.progressPercent}% watched` : ''}</span><div className="tag-row">{lecture.tags.map((tag) => <i key={tag}>{tag}</i>)}</div></button>
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

function ContactModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('');
  return <Modal title="Contact EduSync" onClose={onClose}>
    <form className="modal-form" onSubmit={(event) => { event.preventDefault(); if (!message.trim()) return toast.error('Write a short message first.'); window.location.href = `mailto:meetsharma0702@gmail.com?subject=${encodeURIComponent('EduSync enquiry')}&body=${encodeURIComponent(message.trim())}`; toast.success('Your email client is ready.'); onClose(); }}>
      <p className="contact-intro">Need help, want to share an idea, or found an issue? Send the EduSync team a message.</p>
      <label>Your message<textarea autoFocus value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can we help?" /></label>
      <button className="button button-primary"><Send size={15} /> Start email</button>
    </form>
  </Modal>;
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
    ['Study Lab', () => setActive('Study Lab')],
    ['Feature Hub', () => setActive('Feature Hub')],
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
  const [studyProfile] = useLocalStorage('edusync-study-profile-v1', { style: 'practice', session: 25, breakReminders: true, hydration: true, buddyTone: 'warm', buddyName: 'Your Buddy', buddyFocus: 'balanced', buddyCheckins: true, dyslexiaFont: false, highContrast: false });
  const buddyName = studyProfile.buddyName?.trim() || 'Your Buddy';
  const [messages, setMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: `Hey, I’m ${buddyName}. I’m here to help you take the next small step—without judging you.` },
  ]);
  const send = () => {
    if (!message.trim()) return;
    const nextTask = data.tasks.find((task) => !task.done);
    const nextSubject = data.subjects.find((subject) => subject.lectures.some((lecture) => lecture.status !== 'completed'));
    const text = message.trim();
    const sensitive = /suicid|kill myself|hurt myself|self harm|abuse|unsafe|want to die/i.test(text);
    const overwhelmed = /sad|cry|lonely|anxious|stress|overwhelm|fail|hate myself|problem|family|breakup/i.test(text);
    const supportiveReply = sensitive
      ? 'I’m really glad you told me. You deserve support beyond a study app right now. Please contact someone you trust nearby—a family member, teacher, counsellor, or local emergency service—and stay around other people if you can. If you are in immediate danger, call your local emergency number now.'
      : overwhelmed
        ? 'That sounds heavy. You do not have to solve everything at once, and struggling does not mean you are failing. Take one slow breath, give yourself a little space, and consider telling a trusted person who can be with you. When you are ready, we can make today’s study plan much smaller.'
        : studyProfile.buddyFocus === 'listening' ? 'I hear you. Before we rush into fixing anything, what feels like the heaviest part right now? We can take it one piece at a time.' : nextTask ? `${studyProfile.buddyTone === 'direct' ? 'Here is the move:' : 'You can do this—start gently with'} “${nextTask.title}”. Give it one ${studyProfile.session}-minute block, then reassess.` : nextSubject ? `Let’s keep it simple: continue ${nextSubject.name} with one unfinished lesson, then make one recall card from it.` : 'Your queue is clear. That is a win. Try a short retrieval-practice session or make tomorrow easier with one tiny planned task.';
    setMessages((current) => [...current, { from: 'user', text }, { from: 'ai', text: supportiveReply }]);
    setMessage('');
  };
  return <AnimatePresence>{open && <><motion.div className="assistant-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} /><motion.aside className="assistant-panel" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}>
    <div className="assistant-head"><div className="assistant-brand"><span><Sparkles size={18} /></span><div><strong>{buddyName}</strong><small>Warm, private study support</small></div></div><button className="icon-button" onClick={close} aria-label={`Close ${buddyName}`}><X size={18} /></button></div>
    <div className="assistant-chat">{messages.map((item, index) => <div className={`chat-bubble ${item.from}`} key={index}>{item.text}</div>)}</div>
    <div className="quick-prompts"><button onClick={() => setMessage('What should I study next?')}>What next?</button><button onClick={() => setMessage('Help me plan a session')}>Plan a session</button><button onClick={() => setMessage('I feel overwhelmed')}>I feel overwhelmed</button></div>
    <form onSubmit={(event) => { event.preventDefault(); send(); }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell Your Buddy what is on your mind…" /><button aria-label="Send"><Send size={17} /></button></form>
  </motion.aside></>}</AnimatePresence>;
}

function FocusOverlay({ close, onFinish, onInterrupted }: { close: () => void; onFinish: (minutes: number) => void; onInterrupted: () => void }) {
  const [exitAttempts, setExitAttempts] = useState(0);
  const [fullScreenLost, setFullScreenLost] = useState(false);
  const [fullScreenSupported] = useState(() => Boolean(document.documentElement.requestFullscreen));
  const interruptedRef = useRef(onInterrupted);
  useEffect(() => { interruptedRef.current = onInterrupted; }, [onInterrupted]);
  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().then(() => setFullScreenLost(false)).catch(() => setFullScreenLost(false));
  };
  const requestExit = () => setExitAttempts((current) => { if (current === 0) interruptedRef.current(); return current + 1; });
  const confirmExit = () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined); close(); };

  useEffect(() => {
    document.body.classList.add('focus-active');
    const onFullscreenChange = () => setFullScreenLost(!document.fullscreenElement);
    const onVisibilityChange = () => {
      if (document.hidden) {
        setFullScreenLost(true);
        setExitAttempts((current) => { if (current === 0) interruptedRef.current(); return current + 1; });
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setExitAttempts((current) => current + 1); }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', onKeyDown, true);
    return () => { document.body.classList.remove('focus-active'); document.removeEventListener('fullscreenchange', onFullscreenChange); document.removeEventListener('visibilitychange', onVisibilityChange); window.removeEventListener('keydown', onKeyDown, true); };
  }, []);

  const warning = exitAttempts === 1 ? 'Stay for one more breath. Your focus block has barely begun.' : exitAttempts === 2 ? 'Two exits noticed. Finish the next small stretch before deciding again.' : '';
  return <div className="focus-overlay" role="dialog" aria-modal="true" aria-label="Focus mode">
    <button className="focus-exit" onClick={requestExit}><X size={17} /> Leave focus</button>
    {fullScreenLost && <div className="focus-return"><span>Focus mode works best in fullscreen.</span>{fullScreenSupported && <button onClick={enterFullscreen}>Return to fullscreen</button>}</div>}
    <div className="focus-center"><div className="focus-symbol"><GraduationCap size={28} /></div><span className="eyebrow">FOCUS MODE</span><h1>Give one thing your full attention.</h1><p>Fullscreen focus is active. EduSync hides its own distractions while you work.</p>{exitAttempts < 3 ? <><FocusTimer onFinish={onFinish} />{warning && <p className="focus-warning" role="status">{warning}</p>}</> : <div className="focus-reflection"><span className="eyebrow">PAUSE &amp; REFLECT</span><h2>“The minutes you give away do not return — but the next one is still yours.”</h2><p>You can begin again now, or end this session intentionally.</p><div><button className="button button-secondary" onClick={() => setExitAttempts(0)}>Continue focusing</button><button className="button button-primary" onClick={confirmExit}>End focus session</button></div></div>}</div>
  </div>;
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

function Workspace({ user }: { user: AuthUser }) {
  const blankWorkspace: WorkspaceData = { ...seedWorkspace, subjects: [], tasks: [], notes: [], goals: [], activity: [], studyHistory: [], studiedTodayMinutes: 0 };
  const [data, setData] = useLocalStorage<WorkspaceData>('edusync-public-workspace-v1', blankWorkspace);
  const [active, setActive] = useState<View>(user.role === 'admin' ? 'Admin' : 'Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useLocalStorage('edusync-theme-dark', false);
  const [preferences, setPreferences] = useLocalStorage<Preferences>('edusync-preferences-v1', defaultPreferences);
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>('edusync-notifications-v1', []);
  const notify = (title: string, body: string, tone: AppNotification['tone'] = 'focus') => setNotifications((current) => [{ id: makeId('notification'), title, body, tone, createdAt: new Date().toISOString(), read: false }, ...current].slice(0, 50));
  const startFocus = () => {
    setAssistantOpen(false);
    setCommandOpen(false);
    setModal(null);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    setFocusMode(true);
  };
  const toggleFocus = (value: boolean) => value ? startFocus() : setFocusMode(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = data.language;
  }, [dark, data.language]);

  useEffect(() => {
    const root = document.documentElement;
    const accents = dark ? {
      coral: ['#ff8766', '#ffab91', '#3e2528'],
      violet: ['#a89cff', '#c2bbff', '#2c294b'],
      teal: ['#5ed5c3', '#87e7d7', '#173d3a'],
      gold: ['#f3b35b', '#ffd08b', '#42331c'],
    } : {
      coral: ['#f16d45', '#d95631', '#fff0eb'],
      violet: ['#7c6cf2', '#6252d4', '#efedff'],
      teal: ['#129b8d', '#08766b', '#e2f7f3'],
      gold: ['#d58a19', '#ab6810', '#fff4dd'],
    } as const;
    const [accent, strong, soft] = accents[preferences.accent];
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-strong', strong);
    root.style.setProperty('--accent-soft', soft);
    root.style.setProperty('--accent-glow', `${accent}33`);
    root.style.setProperty('--glass-opacity', String(preferences.glassOpacity));
    root.style.setProperty('--glass-blur', `${preferences.blur}px`);
    root.style.setProperty('--reflection-strength', String(preferences.reflection));
    root.style.setProperty('--shadow-depth', String(preferences.depth));
    root.style.setProperty('--font-scale', String((preferences.fontScale ?? 100) / 100));
    root.dataset.glassTilt = preferences.tilt ? 'on' : 'off';
    root.classList.toggle('compact-ui', preferences.compact);
    root.classList.toggle('reduce-effects', preferences.reduceEffects ?? false);
  }, [preferences, dark]);

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
      if (!typing && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'f') startFocus();
      if (event.key === 'Escape' && !focusMode) { setCommandOpen(false); setModal(null); setAssistantOpen(false); }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [focusMode]);

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
    notify('Focus block complete', `You protected ${minutes} minutes for yourself. Your study time has been added to today’s progress.`, 'win');
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
  const displayUser = { ...user, fullName: preferences.name.trim() || user.fullName };

  const page = ({
    Dashboard: <Dashboard data={data} user={displayUser} setActive={setActive} openSubject={openSubject} openNewSubject={() => setModal('new-subject')} setFocusMode={toggleFocus} addMinutes={addMinutes} />,
    'My subjects': <SubjectsPage data={data} openSubject={openSubject} openNewSubject={() => setModal('new-subject')} togglePin={(id) => update((current) => ({ ...current, subjects: current.subjects.map((subject) => subject.id === id ? { ...subject, pinned: !subject.pinned } : subject) }))} deleteSubject={deleteSubject} />,
    Planner: <PlannerPage data={data} setActive={setActive} openNewTask={() => setModal('new-task')} />,
    Tasks: <TasksPage data={data} toggleTask={updateTask} deleteTask={(id) => update((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }))} openNewTask={() => setModal('new-task')} />,
    Notes: <NotesPage data={data} updateNote={updateNote} newNote={newNote} deleteNote={deleteNote} onVideoSummary={saveVideoSummary} />,
    Analytics: <AnalyticsPage data={data} />,
    'Study Lab': <StudyLabPage data={data} />,
    'Feature Hub': <FeatureHubPage setActive={setActive} />,
    Library: <LibraryPage data={data} updateLecture={updateLecture} />,
    Settings: <SettingsPage data={data} setData={setData} preferences={preferences} setPreferences={setPreferences} onExport={exportData} onImport={importData} />,
    Admin: <Dashboard data={data} user={displayUser} setActive={setActive} openSubject={openSubject} openNewSubject={() => setModal('new-subject')} setFocusMode={toggleFocus} addMinutes={addMinutes} />,
  } as Record<View, ReactNode>)[active];

  return <ErrorBoundary><div className="app-shell">
    <Sidebar active={active} setActive={setActive} collapsed={menuOpen} onClose={() => setMenuOpen(false)} onContact={() => setModal('contact')} />
    <main className="main-content">
      <Header onMenu={() => setMenuOpen(true)} dark={dark} toggleDark={() => setDark((value) => !value)} openCommand={() => setCommandOpen(true)} setActive={setActive} active={active} syncing={false} syncError={false} notifications={notifications} markAllRead={() => setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))} />
      {page}
    </main>
    <button className="assistant-fab" onClick={() => setAssistantOpen(true)}><Sparkles size={17} /><span>Your Buddy</span></button>
    <StudyAssistant open={assistantOpen} close={() => setAssistantOpen(false)} data={data} />
    <CommandPalette open={commandOpen} close={() => setCommandOpen(false)} setActive={setActive} openNewSubject={() => setModal('new-subject')} openNewTask={() => setModal('new-task')} setFocusMode={toggleFocus} />
    <AnimatePresence>
      {modal === 'new-subject' && <NewSubjectModal onClose={() => setModal(null)} onCreate={createSubject} />}
      {modal === 'new-task' && <NewTaskModal subjects={data.subjects} onClose={() => setModal(null)} onCreate={createTask} />}
      {modal === 'subject' && selectedSubject && <SubjectWorkbench subject={selectedSubject} onClose={() => setModal(null)} updateSubject={updateSubject} deleteSubject={deleteSubject} updateLecture={updateLecture} onVideoSummary={saveVideoSummary} />}
      {modal === 'contact' && <ContactModal onClose={() => setModal(null)} />}
    </AnimatePresence>
    {focusMode && <FocusOverlay close={() => setFocusMode(false)} onFinish={addMinutes} onInterrupted={() => notify('Focus interrupted', 'You left Focus Mode before completing the block. Come back for one small stretch—you still have time.', 'focus')} />}
  </div></ErrorBoundary>;
}

function App() {
  const visitor: AuthUser = { id: 'public-visitor', fullName: 'Study guest', email: '', phone: '', role: 'student', isEmailVerified: false };
  return <Workspace user={visitor} />;
}

export default App;
