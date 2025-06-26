import { 
  CurrencyDollarIcon, 
  HeartIcon, 
  CheckCircleIcon, 
  BookOpenIcon 
} from '@heroicons/react/24/outline';

export type Module = {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  status: 'active' | 'coming_soon';
  href: string;
  color: string;
}

export const modules: Module[] = [
  {
    id: 'finance',
    name: 'Finance',
    icon: CurrencyDollarIcon,
    description: 'Gestisci le tue finanze personali',
    status: 'active',
    href: '/finance/dashboard',
    color: 'bg-green-500'
  },
  {
    id: 'health',
    name: 'Health',
    icon: HeartIcon,
    description: 'Monitora la tua salute e il benessere',
    status: 'coming_soon',
    href: '/health/dashboard',
    color: 'bg-red-500'
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckCircleIcon,
    description: 'Gestisci i tuoi compiti e progetti',
    status: 'coming_soon',
    href: '/tasks/dashboard',
    color: 'bg-blue-500'
  },
  {
    id: 'learning',
    name: 'Learning',
    icon: BookOpenIcon,
    description: 'Traccia il tuo percorso di apprendimento',
    status: 'coming_soon',
    href: '/learning/dashboard',
    color: 'bg-purple-500'
  }
];
