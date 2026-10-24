import type { View } from '../types/navigation';
import {
  BookOpen,
  Brain,
  CalendarDays,
  Grid2X2,
  Home,
  LineChart,
  ListChecks,
  PenLine,
  Rocket,
  Settings,
} from 'lucide-react';

export const nav: { label: View; icon: typeof Home }[] = [
  { label: 'Dashboard', icon: Home },
  { label: 'My subjects', icon: Grid2X2 },
  { label: 'Planner', icon: CalendarDays },
  { label: 'Tasks', icon: ListChecks },
  { label: 'Notes', icon: PenLine },
  { label: 'Analytics', icon: LineChart },
  { label: 'Study Lab', icon: Brain },
  { label: 'Feature Hub', icon: Rocket },
  { label: 'Library', icon: BookOpen },
  { label: 'Settings', icon: Settings },
];
