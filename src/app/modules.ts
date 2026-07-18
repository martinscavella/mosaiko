import { Wallet, HeartPulse, CheckSquare, BookOpen, Home, ShoppingBasket, LucideIcon } from 'lucide-react'

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
    id: 'house',
    name: 'House',
    icon: Home,
    description: 'Gestisci casa, bollette e manutenzioni',
    status: 'active',
    accentClasses: 'bg-module-house-subtle text-module-house'
  },
  {
    id: 'grocery',
    name: 'Grocery',
    icon: ShoppingBasket,
    description: 'Dispensa, lista della spesa e prezzi',
    status: 'coming_soon',
    accentClasses: 'bg-module-grocery-subtle text-module-grocery'
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
