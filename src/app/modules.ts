import { Wallet, HeartPulse, CheckSquare, BookOpen, LucideIcon } from 'lucide-react'

export type Module = {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  status: 'active' | 'coming_soon';
  /** Classi accent del modulo (token --color-module-*), usate in navigazione e header */
  accentClasses: string;
}

export const modules: Module[] = [
  {
    id: 'finance',
    name: 'Finance',
    icon: Wallet,
    description: 'Gestisci le tue finanze personali',
    status: 'active',
    accentClasses: 'bg-module-finance-subtle text-module-finance'
  },
  {
    id: 'health',
    name: 'Health',
    icon: HeartPulse,
    description: 'Monitora la tua salute e il benessere',
    status: 'coming_soon',
    accentClasses: 'bg-module-health-subtle text-module-health'
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckSquare,
    description: 'Gestisci i tuoi compiti e progetti',
    status: 'coming_soon',
    accentClasses: 'bg-module-tasks-subtle text-module-tasks'
  },
  {
    id: 'learning',
    name: 'Learning',
    icon: BookOpen,
    description: 'Traccia il tuo percorso di apprendimento',
    status: 'coming_soon',
    accentClasses: 'bg-module-learning-subtle text-module-learning'
  }
];
