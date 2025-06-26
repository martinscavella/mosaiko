'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface Module {
  id: string;
  name: string;
  icon: string;
  defaultPath: string;
  sections: {
    id: string;
    name: string;
    path: string;
    icon: string;
  }[];
}

const modules: Module[] = [
  {
    id: 'finance',
    name: 'Finanze',
    icon: 'CreditCard',
    defaultPath: '/finance/dashboard',
    sections: [
      { id: 'dashboard', name: 'Dashboard', path: '/finance/dashboard', icon: 'BarChart3' },
      { id: 'accounts', name: 'Account', path: '/finance/accounts', icon: 'Wallet' },
      { id: 'transactions', name: 'Transazioni', path: '/finance/transactions', icon: 'ArrowUpDown' },
      { id: 'assets', name: 'Asset', path: '/finance/assets', icon: 'TrendingUp' },
      { id: 'refunds', name: 'Rimborsi', path: '/finance/refunds', icon: 'RotateCcw' },
      { id: 'import', name: 'Import', path: '/finance/import', icon: 'Upload' },
      { id: 'reports', name: 'Report', path: '/finance/reports', icon: 'FileText' },
    ]
  },
  {
    id: 'health',
    name: 'Salute',
    icon: 'Heart',
    defaultPath: '/health/dashboard',
    sections: [
      { id: 'dashboard', name: 'Dashboard', path: '/health/dashboard', icon: 'Activity' },
    ]
  },
  {
    id: 'learning',
    name: 'Studio',
    icon: 'BookOpen',
    defaultPath: '/learning/dashboard',
    sections: [
      { id: 'dashboard', name: 'Dashboard', path: '/learning/dashboard', icon: 'GraduationCap' },
    ]
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: 'CheckSquare',
    defaultPath: '/tasks/dashboard',
    sections: [
      { id: 'dashboard', name: 'Dashboard', path: '/tasks/dashboard', icon: 'ListTodo' },
    ]
  },
];

interface ModuleContextType {
  currentModule: Module;
  currentSection: string;
  modules: Module[];
  setActiveModule: (moduleId: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [currentModuleId, setCurrentModuleId] = useState('finance'); // Default module
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Auto-detect current module from pathname
  useEffect(() => {
    if (pathname) {
      const moduleFromPath = modules.find(module => 
        pathname.startsWith(`/${module.id}/`) || pathname === `/${module.id}`
      );
      if (moduleFromPath) {
        setCurrentModuleId(moduleFromPath.id);
      }
    }
  }, [pathname]);

  const currentModule = modules.find(m => m.id === currentModuleId) || modules[0];
  
  // Determine current section
  const currentSection = currentModule.sections.find(section => 
    pathname === section.path
  )?.id || 'dashboard';

  const setActiveModule = (moduleId: string) => {
    setCurrentModuleId(moduleId);
    setIsMenuOpen(false);
  };

  return (
    <ModuleContext.Provider value={{
      currentModule,
      currentSection,
      modules,
      setActiveModule,
      isMenuOpen,
      setIsMenuOpen,
    }}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
}
