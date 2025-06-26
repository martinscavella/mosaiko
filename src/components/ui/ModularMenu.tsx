'use client';

import { useModule } from '@/lib/moduleContext';
import { useRouter } from 'next/navigation';
import { 
  X, 
  CreditCard, 
  Heart, 
  BookOpen, 
  CheckSquare,
  BarChart3,
  Wallet,
  ArrowUpDown,
  TrendingUp,
  RotateCcw,
  Upload,
  FileText,
  Activity,
  GraduationCap,
  ListTodo
} from 'lucide-react';

// Icon mapping
const iconMap = {
  CreditCard,
  Heart,
  BookOpen,
  CheckSquare,
  BarChart3,
  Wallet,
  ArrowUpDown,
  TrendingUp,
  RotateCcw,
  Upload,
  FileText,
  Activity,
  GraduationCap,
  ListTodo,
};

export default function ModularMenu() {
  const { modules, currentModule, isMenuOpen, setIsMenuOpen, setActiveModule } = useModule();
  const router = useRouter();

  const handleSectionClick = (path: string, moduleId: string) => {
    if (moduleId !== currentModule.id) {
      setActiveModule(moduleId);
    }
    router.push(path);
    setIsMenuOpen(false);
  };

  if (!isMenuOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={() => setIsMenuOpen(false)}
      />
      
      {/* Menu Panel */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 transform transition-transform duration-300 pwa-safe-area-bottom animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="p-2 rounded-xl hover:bg-gray-100 touch-target"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Current Module Highlight */}
        <div className="px-6 py-3 bg-blue-50 border-l-4 border-blue-500">
          <div className="flex items-center">
            {(() => {
              const IconComponent = iconMap[currentModule.icon as keyof typeof iconMap];
              return IconComponent ? <IconComponent size={20} className="text-blue-600 mr-3" /> : null;
            })()}
            <div>
              <p className="text-sm font-medium text-blue-900">Modulo Attivo</p>
              <p className="text-lg font-semibold text-blue-800">{currentModule.name}</p>
            </div>
          </div>
        </div>

        {/* Menu Content */}
        <div className="max-h-96 overflow-y-auto">
          {modules.map((module) => (
            <div key={module.id} className="border-b border-gray-100 last:border-b-0">
              {/* Module Header */}
              <div className="px-6 py-3 bg-gray-50">
                <div className="flex items-center">
                  {(() => {
                    const IconComponent = iconMap[module.icon as keyof typeof iconMap];
                    return IconComponent ? <IconComponent size={18} className="text-gray-600 mr-3" /> : null;
                  })()}
                  <span className="font-medium text-gray-900">{module.name}</span>
                  {module.id === currentModule.id && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      Attivo
                    </span>
                  )}
                </div>
              </div>

              {/* Module Sections */}
              <div className="px-4">
                {module.sections.map((section) => {
                  const IconComponent = iconMap[section.icon as keyof typeof iconMap];
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section.path, module.id)}
                      className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors touch-target"
                    >
                      {IconComponent && <IconComponent size={16} className="text-gray-500 mr-3" />}
                      <span className="text-gray-700">{section.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Tocca una sezione per navigare • Scorri per vedere tutti i moduli
          </p>
        </div>
      </div>
    </>
  );
}
