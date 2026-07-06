import { Wallet, HeartPulse, CheckSquare, BookOpen, LucideIcon } from 'lucide-react'

export type Module = {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  status: 'active' | 'coming_soon';
}

export const modules: Module[] = [
  {
    id: 'finance',
    name: 'Finance',
    icon: Wallet,
    description: 'Gestisci le tue finanze personali',
    status: 'active'
  },
  {
    id: 'health',
    name: 'Health',
    icon: HeartPulse,
    description: 'Monitora la tua salute e il benessere',
    status: 'coming_soon'
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckSquare,
    description: 'Gestisci i tuoi compiti e progetti',
    status: 'coming_soon'
  },
  {
    id: 'learning',
    name: 'Learning',
    icon: BookOpen,
    description: 'Traccia il tuo percorso di apprendimento',
    status: 'coming_soon'
  }
];
