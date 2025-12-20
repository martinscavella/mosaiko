"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { MosaikoLogo } from "@/components/ui/MosaikoLogo";
import { 
  Home, 
  Banknote, 
  /* Heart, 
  BookOpen,
  CheckSquare, */
  User,
  ChevronRight,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  Moon,
  Sun,
  Search,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

const navigation = [
  { 
    name: "Dashboard", 
    href: "/", 
    icon: Home,
    type: "single"
  },  { 
    name: "Finanze", 
    icon: Banknote,
    type: "module",
    basePath: "/finance",
    children: [
      { name: "Dashboard", href: "/finance/dashboard" },
      { name: "Account", href: "/finance/accounts" },
      { name: "Transazioni", href: "/finance/transactions" },
      { name: "Asset", href: "/finance/assets" },
      { name: "Rimborsi", href: "/finance/refunds" },
      { name: "Import Dati", href: "/finance/import" },
      { name: "Report", href: "/finance/reports" },
      // Qui puoi aggiungere altre sottopagine come:
      // { name: "Budget", href: "/finance/budget" },
      // { name: "Spese", href: "/finance/expenses" },
    ]
  }/*  ,
  { 
    name: "Salute", 
    icon: Heart,
    type: "module",
    basePath: "/health",
    children: [
      { name: "Dashboard", href: "/health/dashboard" },
      // { name: "Allenamenti", href: "/health/workouts" },
      // { name: "Dieta", href: "/health/diet" },
    ]
  },
  { 
    name: "Apprendimento", 
    icon: BookOpen,
    type: "module",
    basePath: "/learning",
    children: [
      { name: "Dashboard", href: "/learning/dashboard" },
      // { name: "Corsi", href: "/learning/courses" },
      // { name: "Progresso", href: "/learning/progress" },
    ]
  },
  { 
    name: "Tasks", 
    icon: CheckSquare,
    type: "module",
    basePath: "/tasks",
    children: [
      { name: "Dashboard", href: "/tasks/dashboard" },
      // { name: "Progetti", href: "/tasks/projects" },
      // { name: "Calendario", href: "/tasks/calendar" },
    ]
  },*/
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [hoverButtonPos, setHoverButtonPos] = useState({ x: 0, y: 0 });
  const [showHoverButton, setShowHoverButton] = useState(false);

  // Initialize expanded modules based on current path
  useEffect(() => {
    setMounted(true);
    const currentModule = navigation.find(item => 
      item.type === "module" && item.basePath && pathname.startsWith(item.basePath)
    );
    
    if (currentModule) {
      setExpandedModules(prev => new Set([...prev, currentModule.name]));
    }
  }, [pathname]);

  // Memoize user display name
  const userDisplayName = useMemo(() => {
    if (!user) return 'User';
    if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user.email?.split('@')[0] || 'User';
  }, [user]);

  const toggleModule = useCallback((moduleName: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleName)) {
        newSet.delete(moduleName);
      } else {
        newSet.add(moduleName);
      }
      return newSet;
    });
  }, []);

  const isModuleExpanded = useCallback((moduleName: string) => {
    return expandedModules.has(moduleName);
  }, [expandedModules]);

  const handleLogout = useCallback(async () => {
    await signOut();
    setProfileMenuOpen(false);
  }, [signOut]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
    // Qui potresti aggiungere la logica per salvare la preferenza
  }, []);

  const toggleCompact = useCallback(() => {
    setIsCompact(prev => !prev);
    if (!isCompact) {
      // Chiudi tutti i moduli quando compatti
      setExpandedModules(new Set());
      setProfileMenuOpen(false);
    }
    setShowHoverButton(false);
  }, [isCompact]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Per sidebar compatta: mostra bottone di espansione vicino al bordo destro
    if (isCompact && x > rect.width - 20) {
      setHoverButtonPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setShowHoverButton(true);
    }
    // Per sidebar espansa: mostra bottone di chiusura vicino al bordo destro
    else if (!isCompact && x > rect.width - 30) {
      setHoverButtonPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setShowHoverButton(true);
    } else {
      setShowHoverButton(false);
    }
  }, [isCompact]);

  const handleMouseLeave = useCallback(() => {
    setShowHoverButton(false);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  // Non mostrare la sidebar se l'utente non è autenticato
  if (!user) {
    return null;
  }

  return (
    <div 
      className={`relative flex h-full flex-col bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-xl transition-all duration-300 ${isCompact ? 'w-16' : 'w-72'}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bottone di espansione/chiusura che segue il mouse */}
      {showHoverButton && (
        <button
          onClick={toggleCompact}
          className="absolute w-8 h-8 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg shadow-lg flex items-center justify-center text-white hover:bg-opacity-30 hover:shadow-xl transition-all duration-200 z-20 pointer-events-auto"
          style={{
            left: `${hoverButtonPos.x - 16}px`,
            top: `${hoverButtonPos.y - 16}px`,
          }}
          title={isCompact ? "Espandi sidebar" : "Compatta sidebar"}
        >
          {isCompact ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      )}
      
      {/* Header with logo and actions */}
      <div className={`flex h-16 shrink-0 items-center ${isCompact ? 'justify-center px-4' : 'justify-between px-6'} border-b border-white border-opacity-20 transition-all duration-500 ease-in-out transform ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        {/* Logo section */}
        <div className="flex items-center">
          <MosaikoLogo size={isCompact ? 24 : 32} className={!isCompact ? "mr-3" : ""} src="/mosaiko.png" />
          {!isCompact && <h1 className="text-xl font-bold text-white">Mosaiko</h1>}
        </div>
        
        {/* Actions - Only show in expanded mode */}
        {!isCompact && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-md text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10 transition-all duration-200"
              title="Cerca (⌘K)"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10 transition-all duration-200"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex flex-1 flex-col ${isCompact ? 'px-2 py-6' : 'px-4 py-6'}`}>
        <ul role="list" className="flex flex-1 flex-col space-y-2">
          {navigation.map((item, index) => {
            if (item.type === "single") {
              const isActive = pathname === item.href;
              return (
                <li 
                  key={item.name}
                  className={`transition-all duration-400 ease-in-out transform ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                  style={{ transitionDelay: `${index * 75}ms` }}
                >
                  <Link
                    href={item.href!}
                    className={`
                      group flex items-center ${isCompact ? 'justify-center px-2 py-3' : 'gap-x-3 px-4 py-3'} rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
                      ${isActive 
                        ? 'bg-white bg-opacity-20 text-white shadow-sm' 
                        : 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-10 hover:text-white'
                      }
                    `}
                    title={isCompact ? item.name : undefined}
                  >
                    {isCompact ? (
                      <item.icon className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : (
                      <>
                        <div className="p-1.5 rounded-md transition-all duration-200 group-hover:bg-white group-hover:bg-opacity-15">
                          <item.icon className="h-4 w-4 text-white" aria-hidden="true" />
                        </div>
                        <span>{item.name}</span>
                      </>
                    )}
                  </Link>
                </li>
              );
            } else {
              // Module with children - nascosto in modalità compatta
              if (isCompact) {
                const isModuleActive = pathname.startsWith(item.basePath!);
                return (
                  <li 
                    key={item.name}
                    className={`transition-all duration-400 ease-in-out transform ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                    style={{ transitionDelay: `${index * 75}ms` }}
                  >
                    <Link
                      href={item.basePath + '/dashboard'}
                      className={`
                        group flex items-center justify-center px-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
                        ${isModuleActive 
                          ? 'bg-white bg-opacity-20 text-white shadow-sm' 
                          : 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-10 hover:text-white'
                        }
                      `}
                      title={item.name}
                    >
                      <item.icon className="h-5 w-5 text-white" aria-hidden="true" />
                    </Link>
                  </li>
                );
              }
              
              // Modalità espansa normale
              const isExpanded = isModuleExpanded(item.name);
              const isModuleActive = pathname.startsWith(item.basePath!);
              
              return (
                <li 
                  key={item.name}
                  className={`transition-all duration-400 ease-in-out transform ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                  style={{ transitionDelay: `${index * 75}ms` }}
                >
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(item.name)}
                    className={`
                      group w-full flex items-center gap-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out
                      ${isModuleActive 
                        ? 'bg-white bg-opacity-20 text-white shadow-sm' 
                        : 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-10 hover:text-white'
                      }
                    `}
                  >
                    <div className={`p-1.5 rounded-md transition-all duration-200 ${isModuleActive ? 'bg-white bg-opacity-25' : 'group-hover:bg-white group-hover:bg-opacity-15'}`}>
                      <item.icon className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronRight 
                      className={`h-4 w-4 transition-all duration-200 ease-in-out ${isExpanded ? 'rotate-90' : ''} text-white text-opacity-80`}
                    />
                  </button>

                  {/* Children */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                    {isExpanded && (
                      <ul className="ml-6 space-y-1">
                        {item.children?.map((child, childIndex) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <li 
                              key={child.name}
                              className="transition-all duration-200 ease-in-out"
                              style={{ transitionDelay: `${childIndex * 50}ms` }}
                            >
                              <Link
                                href={child.href}
                                className={`
                                  flex items-center gap-x-3 rounded-md px-4 py-2 text-sm transition-all duration-200 ease-in-out
                                  ${isChildActive 
                                    ? 'bg-white bg-opacity-15 text-white font-medium' 
                                    : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
                                  }
                                `}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isChildActive ? 'bg-white' : 'bg-white bg-opacity-60'}`}></div>
                                <span>{child.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            }
          })}
        </ul>



        {/* Profile Section */}
        <div className={`mt-6 transition-all duration-500 ease-in-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '400ms' }}>
          {user ? (
            <div className="relative">
              {/* Profile Button */}
              {isCompact ? (
                <Link
                  href="/profile"
                  className="w-full flex items-center justify-center px-2 py-3 rounded-lg text-sm transition-all duration-200 ease-in-out hover:bg-white hover:bg-opacity-10 group"
                  title={`${userDisplayName} - Vai al profilo`}
                >
                  {/* Avatar */}
                  {user.user_metadata?.avatar_url ? (
                    <div 
                      className="w-8 h-8 rounded-full bg-cover bg-center border-2 border-white border-opacity-30 transition-all duration-200 ease-in-out group-hover:border-opacity-50"
                      style={{ backgroundImage: `url(${user.user_metadata.avatar_url})` }}
                    />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </Link>
              ) : (
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-full flex items-center gap-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ease-in-out hover:bg-white hover:bg-opacity-10 group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out group-hover:bg-opacity-30 shrink-0">
                    {user.user_metadata?.avatar_url ? (
                      <div 
                        className="w-8 h-8 rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${user.user_metadata.avatar_url})` }}
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold truncate">
                        {userDisplayName}
                      </p>
                      {profileMenuOpen ? (
                        <ChevronUp className="w-4 h-4 text-white text-opacity-60 group-hover:text-white transition-colors duration-200" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white text-opacity-60 group-hover:text-white transition-colors duration-200" />
                      )}
                    </div>
                    <p className="text-white text-opacity-70 text-xs">
                      {user.user_metadata?.subscription_type || 'Free Plan'}
                    </p>
                  </div>
                </button>
              )}

              {/* Dropdown Menu - Only show in expanded mode */}
              {!isCompact && (
                <div className={`absolute bottom-full left-0 right-0 mb-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg shadow-lg border border-white border-opacity-20 overflow-hidden transition-all duration-200 ease-in-out ${profileMenuOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {profileMenuOpen && (
                    <div className="p-2 space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-x-3 rounded-md px-3 py-2 text-sm text-white text-opacity-90 hover:bg-white hover:bg-opacity-15 hover:text-white transition-all duration-200 ease-in-out"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Impostazioni</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-x-3 rounded-md px-3 py-2 text-sm text-white text-opacity-90 hover:bg-red-500 hover:bg-opacity-20 hover:text-white transition-all duration-200 ease-in-out"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xs text-white/60">
                <span>Powered by Mosaiko</span>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
