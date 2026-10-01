import type { View } from '../types/navigation';
import {
  BookOpen,
  CalendarDays,
  Grid2X2,
  Home,
  LineChart,
  ListChecks,
  PenLine,
} from 'lucide-react';

export const nav: { label: View; icon: typeof Home }[] = [
  { label: 'Dashboard', icon: Home },
  { label: 'My subjects', icon: Grid2X2 },
  { label: 'Planner', icon: CalendarDays },
  { label: 'Tasks', icon: ListChecks },
  { label: 'Notes', icon: PenLine },
  { label: 'Analytics', icon: LineChart },
  { label: 'Library', icon: BookOpen },
];
