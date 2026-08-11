import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Crown,
  Ellipsis,
  Flame,
  FolderPlus,
  GraduationCap,
  Grid2X2,
  Headphones,
  Heart,
  HelpCircle,
  Home,
  Lightbulb,
  LineChart,
  ListTodo,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Target,
  Timer,
  TrendingUp,
  Trophy,
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

type View = 'Dashboard' | 'My subjects' | 'Planner' | 'Analytics' | 'Library';

type Subject = {
  id: number;
  name: string;
  detail: string;
  short: string;
  color: string;
  accent: string;
  progress: number;
  lessons: number;
  done: number;
  deadline: string;
  icon: string;
  active?: boolean;
};

const subjects: Subject[] = [
  {
    id: 1,
    name: 'Design systems',
    detail: 'Visual foundations & product thinking',
    short: 'DS',
    color: '#B896FF',
    accent: 'lavender',
    progress: 72,
    lessons: 18,
    done: 13,
    deadline: 'Oct 26',
    icon: '✦',
    active: true,
  },
  {
    id: 2,
    name: 'Machine learning',
    detail: 'Practical foundations',
    short: 'ML',
    color: '#F7C879',
    accent: 'peach',
    progress: 48,
    lessons: 24,
    done: 11,
    deadline: 'Nov 08',
    icon: '⌁',
  },
  {
    id: 3,
    name: 'Spanish essentials',
    detail: 'Daily practice routine',
    short: 'SE',
    color: '#73D4C1',
    accent: 'mint',
    progress: 33,
    lessons: 36,
    done: 12,
    deadline: 'Dec 01',
    icon: '◌',
  },
];

const nav = [
  { label: 'Dashboard', icon: Home },
  { label: 'My subjects', icon: Grid2X2 },
  { label: 'Planner', icon: CalendarDays },
  { label: 'Analytics', icon: LineChart },
  { label: 'Library', icon: BookOpen },
] as const;

const studyData = [
  { day: 'M', mins: 44 },
  { day: 'T', mins: 62 },
  { day: 'W', mins: 36 },
  { day: 'T', mins: 86 },
  { day: 'F', mins: 53 },
  { day: 'S', mins: 104 },
  { day: 'S', mins: 73 },
];

const focusData = [
  { name: 'Design', value: 44, color: '#b997ff' },
  { name: 'ML', value: 31, color: '#f3c770' },
  { name: 'Spanish', value: 25, color: '#77d9c4' },
];

function Avatar({ className = '' }: { className?: string }) {
  return (
    <div className={`avatar ${className}`} aria-label="Alex Morgan">
      AM
    </div>
  );
}

function Progress({ value, color = 'var(--violet)' }: { value: number; color?: string }) {
  return (
    <div className="progress-track">
      <motion.div
        className="progress-value"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
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
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function Sidebar({
  active,
  setActive,
  collapsed,
  onClose,
}: {
  active: View;
  setActive: (view: View) => void;
  collapsed: boolean;
  onClose: () => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <GraduationCap size={22} />
        </div>
        <span>EduSync</span>
        <button className="mobile-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        {nav.map(({ label, icon: Icon }) => (
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
            {label === 'Planner' && <i className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="upgrade-card">
        <Crown size={18} />
        <p>
          <strong>Go Pro</strong>
          <br />
          Unlock the AI study coach.
        </p>
        <button onClick={() => toast.success('You’re already experiencing the Pro preview!')}>
          Explore Pro
        </button>
      </div>
      <div className="profile-menu">
        <Avatar />
        <div>
          <strong>Alex Morgan</strong>
          <span>Free plan</span>
        </div>
        <MoreHorizontal size={18} />
      </div>
    </aside>
  );
}

function Header({ onMenu, dark, toggleDark }: { onMenu: () => void; dark: boolean; toggleDark: () => void }) {
  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMenu}>
        <Menu size={22} />
      </button>
      <div className="command-search">
        <Search size={18} />
        <span>Search anything</span>
        <kbd>⌘ K</kbd>
      </div>
      <div className="header-actions">
        <IconButton label="Toggle theme" onClick={toggleDark}>
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </IconButton>
        <div className="notification-wrap">
          <IconButton label="Notifications" onClick={() => toast('You’re all caught up!')}>
            <Bell size={19} />
          </IconButton>
          <span />
        </div>
        <Avatar className="top-avatar" />
      </div>
    </header>
  );
}

function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <motion.article
      className="subject-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className={`subject-visual ${subject.accent}`}>
        <span className="subject-symbol">{subject.icon}</span>
        <button aria-label={`More ${subject.name} options`}>
          <Ellipsis size={18} />
        </button>
        <div className="wave wave-one" />
        <div className="wave wave-two" />
      </div>
      <div className="subject-content">
        <div className="subject-topline">
          <span className="subject-code" style={{ color: subject.color }}>
            {subject.short}
          </span>
          <span className="deadline">Due {subject.deadline}</span>
        </div>
        <h3>{subject.name}</h3>
        <p>{subject.detail}</p>
        <div className="subject-progress">
          <span>
            {subject.done} of {subject.lessons} lessons
          </span>
          <b>{subject.progress}%</b>
        </div>
        <Progress value={subject.progress} color={subject.color} />
      </div>
    </motion.article>
  );
}

function DailyGoal() {
  return (
    <section className="daily-goal card">
      <div className="goal-icon">
        <Target size={22} />
      </div>
      <div className="goal-copy">
        <span className="eyebrow">DAILY GOAL</span>
        <strong>
          45 <small>/ 60 min</small>
        </strong>
        <p>You’re 75% there. Keep the rhythm going.</p>
      </div>
      <div className="goal-ring">
        <svg viewBox="0 0 44 44">
          <circle className="ring-bg" cx="22" cy="22" r="17" />
          <circle className="ring-progress" cx="22" cy="22" r="17" />
        </svg>
        <span>75%</span>
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
        {days.map((d, i) => (
          <div key={`${d}${i}`}>
            <span className={i < 6 ? 'completed' : 'today'}>{i < 6 ? <Check size={13} /> : d}</span>
            <small>{d}</small>
          </div>
        ))}
      </div>
      <p>
        <b>Best streak:</b> 12 days · You’re on fire!
      </p>
    </section>
  );
}

function FocusTimer() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setSeconds((current) => (current <= 1 ? 25 * 60 : current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [running]);
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

function Upcoming() {
  const items = [
    {
      time: '10:30',
      title: 'Typography systems',
      subject: 'Design systems',
      color: 'violet',
      action: 'Resume',
    },
    {
      time: '14:00',
      title: 'Gradient descent',
      subject: 'Machine learning',
      color: 'yellow',
      action: 'Start',
    },
    {
      time: '18:30',
      title: 'Verb practice',
      subject: 'Spanish essentials',
      color: 'green',
      action: 'Review',
    },
  ];
  return (
    <section className="upcoming card">
      <div className="section-row">
        <div>
          <span className="eyebrow">UP NEXT</span>
          <h3>Keep your momentum</h3>
        </div>
        <button className="text-button">
          View planner <ChevronRight size={15} />
        </button>
      </div>
      <div className="upcoming-list">
        {items.map((item) => (
          <div className="upcoming-item" key={item.title}>
            <div className={`time-badge ${item.color}`}>{item.time}</div>
            <div>
              <strong>{item.title}</strong>
              <span>{item.subject}</span>
            </div>
            <button onClick={() => toast.success(`${item.title} added to your active session`)}>
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Dashboard({ setActive }: { setActive: (view: View) => void }) {
  return (
    <div className="page dashboard-page">
      <section className="welcome-row">
        <div>
          <span className="date-chip">
            <CalendarDays size={14} /> Thursday, October 24
          </span>
          <h1>
            Good morning, Alex <span>✦</span>
          </h1>
          <p>Make today count. You’ve got a beautiful plan ahead.</p>
        </div>
        <button className="primary-button" onClick={() => toast.success('New subject workspace created')}>
          <Plus size={18} /> New subject
        </button>
      </section>
      <section className="spotlight-card">
        <div className="spotlight-glow" />
        <div className="spotlight-copy">
          <span className="eyebrow">YOUR NEXT BEST STEP</span>
          <h2>
            Finish your design
            <br />
            system foundations.
          </h2>
          <p>You’re just two lessons from your weekly goal.</p>
          <button className="white-button" onClick={() => toast.info('Opening “Components that scale”')}>
            <Play size={16} fill="currentColor" /> Continue learning
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
            <Check size={14} /> 72% complete
          </div>
          <div className="abstract-orbit" />
        </div>
      </section>
      <div className="stat-grid">
        <DailyGoal />
        <StreakCard />
        <FocusTimer />
      </div>
      <section className="section-heading">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h2>Subjects in progress</h2>
        </div>
        <button className="text-button" onClick={() => setActive('My subjects')}>
          See all subjects <ChevronRight size={16} />
        </button>
      </section>
      <div className="subject-grid">
        {subjects.map((subject) => (
          <SubjectCard subject={subject} key={subject.id} />
        ))}
        <button
          className="create-subject"
          onClick={() => toast.success('Ready for your next learning adventure')}
        >
          <span>
            <FolderPlus size={22} />
          </span>
          <strong>Create a subject</strong>
          <small>Turn a goal into a plan</small>
        </button>
      </div>
      <div className="dashboard-bottom">
        <Upcoming />
        <WeeklyActivity />
      </div>
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
          <TrendingUp size={15} /> +18%
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
            <Tooltip
              cursor={false}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e8e5ef',
                boxShadow: '0 12px 24px #24204314',
              }}
            />
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

function SubjectsPage() {
  const [filter, setFilter] = useState('All');
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING SPACES</span>
          <h1>My subjects</h1>
          <p>Keep every goal, resource, and tiny win in one calm place.</p>
        </div>
        <button className="primary-button" onClick={() => toast.success('Subject workspace created')}>
          <Plus size={18} /> Create subject
        </button>
      </div>
      <div className="filter-row">
        {['All', 'In progress', 'Completed', 'Archived'].map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'selected' : ''}>
            {item}
          </button>
        ))}
      </div>
      <div className="subject-grid large-subject-grid">
        {subjects.map((subject) => (
          <SubjectCard subject={subject} key={subject.id} />
        ))}
        <article className="subject-card coming-soon">
          <div className="subject-visual neutral">
            <span className="subject-symbol">+1</span>
          </div>
          <div className="subject-content">
            <span className="subject-code">COMING NEXT</span>
            <h3>Build your next skill</h3>
            <p>Capture a course, a dream, or a curious rabbit hole.</p>
            <button className="text-button" onClick={() => toast.info('Subject creator opened')}>
              Start a new journey <ChevronRight size={15} />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

function PlannerPage() {
  const events = [
    {
      time: '9:00',
      title: 'Finish card states',
      meta: 'Design systems · 45 min',
      color: 'violet',
      status: 'Done',
    },
    {
      time: '10:30',
      title: 'Typography systems',
      meta: 'Design systems · 35 min',
      color: 'violet',
      status: 'Next',
    },
    {
      time: '14:00',
      title: 'Gradient descent',
      meta: 'Machine learning · 50 min',
      color: 'yellow',
      status: 'Planned',
    },
    {
      time: '18:30',
      title: 'Verb practice',
      meta: 'Spanish essentials · 20 min',
      color: 'green',
      status: 'Planned',
    },
  ];
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">OCTOBER 24</span>
          <h1>A plan with room to breathe</h1>
          <p>Your AI-curated schedule protects momentum without crowding your day.</p>
        </div>
        <button className="primary-button" onClick={() => toast.success('A focus block was added')}>
          <Plus size={18} /> Add block
        </button>
      </div>
      <div className="planner-layout">
        <section className="calendar-card card">
          <div className="calendar-head">
            <button>
              <ChevronDown size={18} /> Today
            </button>
            <div>
              <IconButton label="Previous day">
                <ChevronRight className="flip" size={18} />
              </IconButton>
              <IconButton label="Next day">
                <ChevronRight size={18} />
              </IconButton>
            </div>
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
            {events.map((event, i) => (
              <div className="agenda-row" key={event.title}>
                <time>{event.time}</time>
                <div className={`agenda-line ${event.color}`} />
                <article className={i === 0 ? 'event-complete' : ''}>
                  <div>
                    <span className="event-status">{event.status}</span>
                    <h3>{event.title}</h3>
                    <p>{event.meta}</p>
                  </div>
                  <button onClick={() => toast.success(`${event.title} is on your schedule`)}>
                    {i === 0 ? <Check size={17} /> : <Play size={15} fill="currentColor" />}
                  </button>
                </article>
              </div>
            ))}
          </div>
        </section>
        <aside className="planner-aside">
          <section className="ai-nudge card">
            <div className="bot-bubble">
              <Bot size={20} />
            </div>
            <span className="eyebrow">AI SUGGESTION</span>
            <h3>Move gradient descent earlier?</h3>
            <p>
              Your focus usually peaks around 2pm. A 50-minute session then could help you finish this week’s
              goal.
            </p>
            <button onClick={() => toast.success('Your schedule has been optimized')}>
              <Sparkles size={15} /> Optimize my day
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

function AnalyticsPage() {
  const [range, setRange] = useState('This week');
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING PATTERNS</span>
          <h1>Progress, not pressure.</h1>
          <p>See the habits that are compounding into something remarkable.</p>
        </div>
        <div className="range-switch">
          {['This week', 'This month'].map((item) => (
            <button className={range === item ? 'selected' : ''} key={item} onClick={() => setRange(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="metric-grid">
        <Metric icon={<Clock3 />} title="Focus time" value="7h 38m" change="18%" />
        <Metric icon={<Check />} title="Lessons completed" value="16" change="4 this week" />
        <Metric icon={<Trophy />} title="Productivity score" value="86" change="Top 12%" />
        <Metric icon={<Zap />} title="Current streak" value="7 days" change="Personal best: 12" />
      </div>
      <div className="analytics-grid">
        <section className="analytics-chart card">
          <div className="section-row">
            <div>
              <span className="eyebrow">FOCUS TIME</span>
              <h3>Your most intentional week</h3>
            </div>
            <span className="trend">
              <TrendingUp size={15} /> 18% more
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
                {studyData.map((item, i) => (
                  <Cell key={item.day} fill={i === 5 ? '#a884ff' : '#ded5f7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="focus-breakdown card">
          <span className="eyebrow">TIME BY SUBJECT</span>
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
              <b>7.6h</b>
              <span>focused</span>
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
          <h3>Your learning sweet spot is 10:30 AM.</h3>
          <p>On average, you complete 28% more when you start a focused session before lunch.</p>
        </div>
        <button onClick={() => toast.success('A 10:30 AM focus block was added to your planner')}>
          Use this insight <ChevronRight size={16} />
        </button>
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
  icon: React.ReactNode;
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

function LibraryPage() {
  const resources = [
    {
      icon: <Headphones size={20} />,
      title: 'The design of everyday things',
      type: 'Podcast · 42 min',
      tag: 'Saved',
    },
    {
      icon: <BookOpen size={20} />,
      title: 'Practical machine learning notes',
      type: 'PDF · 18 pages',
      tag: 'Notes',
    },
    {
      icon: <Play size={20} />,
      title: 'Ser vs estar, finally explained',
      type: 'Video · 13 min',
      tag: 'Watch later',
    },
  ];
  return (
    <div className="page simple-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR KNOWLEDGE CABINET</span>
          <h1>Library</h1>
          <p>A home for the pieces worth coming back to.</p>
        </div>
        <button className="primary-button" onClick={() => toast.success('Upload modal ready')}>
          <Plus size={18} /> Add resource
        </button>
      </div>
      <div className="library-search">
        <Search size={19} />
        <input placeholder="Search your notes, links, and uploads" />
        <kbd>⌘ K</kbd>
      </div>
      <div className="resource-list">
        {resources.map((resource) => (
          <article className="resource" key={resource.title}>
            <div className="resource-icon">{resource.icon}</div>
            <div>
              <h3>{resource.title}</h3>
              <p>{resource.type}</p>
            </div>
            <span>{resource.tag}</span>
            <IconButton label={`More options for ${resource.title}`}>
              <MoreHorizontal size={20} />
            </IconButton>
          </article>
        ))}
      </div>
      <section className="library-empty card">
        <div>
          <Heart size={22} />
        </div>
        <h3>Save the sparks.</h3>
        <p>Bookmark a lecture, turn a thought into a note, or upload a PDF. It’ll all wait for you here.</p>
        <button className="text-button" onClick={() => toast.info('Your browser bookmarker is ready')}>
          Learn about the web clipper <ChevronRight size={16} />
        </button>
      </section>
    </div>
  );
}

function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: 'Hey Alex! I’ve looked at your plan. Want a quick way to make today feel lighter?' },
  ]);
  const send = () => {
    if (!message.trim()) return;
    setMessages((current) => [
      ...current,
      { from: 'user', text: message },
      {
        from: 'ai',
        text: 'I’d protect your 10:30 AM focus block for Design systems, then leave the afternoon for machine learning. Small, intentional wins.',
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
                  <span>Powered by EduSync AI</span>
                </div>
              </div>
              <IconButton label="Close assistant" onClick={onClose}>
                <X size={19} />
              </IconButton>
            </div>
            <div className="assistant-chat">
              {messages.map((item, i) => (
                <div className={`chat-message ${item.from}`} key={i}>
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

function App() {
  const [active, setActive] = useState<View>('Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setAssistantOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const page = useMemo(
    () =>
      ({
        Dashboard: <Dashboard setActive={setActive} />,
        'My subjects': <SubjectsPage />,
        Planner: <PlannerPage />,
        Analytics: <AnalyticsPage />,
        Library: <LibraryPage />,
      })[active],
    [active],
  );
  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        collapsed={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <main>
        <Header onMenu={() => setMenuOpen(true)} dark={dark} toggleDark={() => setDark((value) => !value)} />
        {page}
      </main>
      <button className="ai-fab" onClick={() => setAssistantOpen(true)}>
        <Sparkles size={19} />
        <span>Ask EduSync AI</span>
      </button>
      <Assistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}

export default App;
