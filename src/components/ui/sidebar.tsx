"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { MosaikoLogo } from "@/components/ui/MosaikoLogo";
import { 
  HomeIcon, 
  BanknotesIcon, 
  HeartIcon, 
  BookOpenIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  ChevronRightIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";

const navigation = [
  { 
    name: "Dashboard", 
    href: "/", 
    icon: HomeIcon,
    type: "single"
  },
  { 
    name: "Finanze", 
    icon: BanknotesIcon,
    type: "module",
    basePath: "/finance",
    children: [
      { name: "Dashboard", href: "/finance/dashboard" },
      // Qui puoi aggiungere altre sottopagine come:
      // { name: "Budget", href: "/finance/budget" },
      // { name: "Spese", href: "/finance/expenses" },
    ]
  },
  { 
    name: "Salute", 
    icon: HeartIcon,
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
    icon: BookOpenIcon,
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
    icon: ClipboardDocumentListIcon,
    type: "module",
    basePath: "/tasks",
    children: [
      { name: "Dashboard", href: "/tasks/dashboard" },
      // { name: "Progetti", href: "/tasks/projects" },
      // { name: "Calendario", href: "/tasks/calendar" },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [hoverExpandedModules, setHoverExpandedModules] = useState<string[]>([]);
  const [hoverTimeouts, setHoverTimeouts] = useState<{[key: string]: NodeJS.Timeout}>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Auto-expand module if current path belongs to it
    const currentModule = navigation.find(item => 
      item.type === "module" && pathname.startsWith(item.basePath!)
    );
    if (currentModule && !expandedModules.includes(currentModule.name)) {
      setExpandedModules(prev => [...prev, currentModule.name]);
    }
  }, [pathname, expandedModules]);

  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleName) 
        ? prev.filter(name => name !== moduleName)
        : [...prev, moduleName]
    );
  };
  const handleModuleHover = (moduleName: string, isEntering: boolean) => {
    // Clear any existing timeout for this module
    if (hoverTimeouts[moduleName]) {
      clearTimeout(hoverTimeouts[moduleName]);
      setHoverTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[moduleName];
        return newTimeouts;
      });
    }

    if (isEntering) {
      // Set a timeout to expand after 1 second
      const timeoutId = setTimeout(() => {
        setHoverExpandedModules(prev => [...prev, moduleName]);
        setHoverTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[moduleName];
          return newTimeouts;
        });
      }, 500); // Half second delay before closing

      setHoverTimeouts(prev => ({
        ...prev,
        [moduleName]: timeoutId
      }));
    } else {
      // Delay closing for half a second when mouse leaves
      const timeoutId = setTimeout(() => {
        setHoverExpandedModules(prev => prev.filter(name => name !== moduleName));
        setHoverTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[moduleName];
          return newTimeouts;
        });
      }, 500); // Half second delay before closing

      setHoverTimeouts(prev => ({
        ...prev,
        [moduleName]: timeoutId
      }));
    }
  };
  const isModuleExpanded = (moduleName: string) => {
    return expandedModules.includes(moduleName) || hoverExpandedModules.includes(moduleName);
  };

  const handleLogout = async () => {
    await signOut();
    setProfileMenuOpen(false);
  };

  // Non mostrare la sidebar se l'utente non è autenticato
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">      {/* Header with logo */}
      <div className={`flex h-16 shrink-0 items-center px-4 transition-all duration-500 ease-in-out transform ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <MosaikoLogo size={40} className="mr-3" />
        <h1 className="text-lg font-semibold text-white transition-all duration-300 ease-in-out">Mosaiko</h1>
      </div>{/* Navigation */}
      <nav className="flex flex-1 flex-col px-3 py-4">
        <ul role="list" className="flex flex-1 flex-col space-y-1">
          {navigation.map((item, index) => {
            if (item.type === "single") {
              const isActive = pathname === item.href;
              return (                <li 
                  key={item.name}
                  className={`transition-all duration-400 ease-in-out transform ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                  style={{ transitionDelay: `${index * 75}ms` }}
                ><Link
                    href={item.href!}
                    className={`
                      flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02]
                      ${isActive 
                        ? 'bg-white bg-opacity-25 text-white shadow-lg' 
                        : 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-15 hover:text-white'
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5 shrink-0 transition-transform duration-300 ease-in-out" aria-hidden="true" />
                    <span className="transition-all duration-300 ease-in-out">{item.name}</span>
                  </Link>
                </li>
              );            } else {
              // Module with children
              const isExpanded = isModuleExpanded(item.name);
              const isModuleActive = pathname.startsWith(item.basePath!);
              
              return (                <li 
                  key={item.name}
                  className={`transition-all duration-400 ease-in-out transform ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
                  style={{ transitionDelay: `${index * 75}ms` }}
                  onMouseEnter={() => handleModuleHover(item.name, true)}
                  onMouseLeave={() => handleModuleHover(item.name, false)}
                >
                  {/* Module Header */}                  <button
                    onClick={() => toggleModule(item.name)}
                    className={`
                      flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out w-full transform hover:scale-[1.02]
                      ${isModuleActive 
                        ? 'bg-white bg-opacity-25 text-white shadow-lg' 
                        : 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-15 hover:text-white'
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5 shrink-0 transition-transform duration-300 ease-in-out" aria-hidden="true" />
                    <span className="flex-1 text-left transition-all duration-300 ease-in-out">{item.name}</span>
                    <ChevronRightIcon 
                      className={`h-4 w-4 transition-all duration-300 ease-in-out ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>                  {/* Children */}
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    {isExpanded && (
                      <ul 
                        className="mt-2 ml-6 space-y-1 transform transition-all duration-300 ease-in-out"
                        onMouseEnter={() => {
                          // Cancel any pending close timeout when entering children
                          if (hoverTimeouts[item.name]) {
                            clearTimeout(hoverTimeouts[item.name]);
                            setHoverTimeouts(prev => {
                              const newTimeouts = { ...prev };
                              delete newTimeouts[item.name];
                              return newTimeouts;
                            });
                          }
                          // Keep expanded while on children
                          setHoverExpandedModules(prev => 
                            prev.includes(item.name) ? prev : [...prev, item.name]
                          );
                        }}                        onMouseLeave={() => {
                          // Delay hiding when leaving children - half second delay
                          setTimeout(() => {
                            setHoverExpandedModules(prev => prev.filter(name => name !== item.name));
                          }, 500);
                        }}
                        style={{ 
                          transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)',
                          transition: 'transform 0.4s ease-in-out, opacity 0.4s ease-in-out'
                        }}
                      >
                        {item.children?.map((child, childIndex) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <li 
                              key={child.name}
                              className="transition-all duration-300 ease-in-out transform hover:translate-x-1"
                              style={{ 
                                transitionDelay: `${childIndex * 75}ms`,
                                opacity: isExpanded ? 1 : 0,
                                transform: isExpanded ? 'translateX(0)' : 'translateX(-20px)'
                              }}
                            >
                              <Link
                                href={child.href}
                                className={`
                                  flex items-center gap-x-3 rounded-md px-3 py-1.5 text-sm transition-all duration-300 ease-in-out transform hover:scale-[1.02]
                                  ${isChildActive 
                                    ? 'bg-white bg-opacity-20 text-white font-medium shadow-md' 
                                    : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
                                  }
                                `}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-white bg-opacity-60 shrink-0 transition-all duration-300 ease-in-out"></div>
                                <span className="transition-all duration-300 ease-in-out">{child.name}</span>
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
          })}        </ul>        {/* Profile Section */}
        <div className={`mt-4 transition-all duration-500 ease-in-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} relative`} style={{ transitionDelay: '600ms' }}>
          {user ? (
            <div>
              {/* Profile Button */}
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-full flex items-center gap-x-3 rounded-lg px-3 py-3 text-sm transition-all duration-300 ease-in-out hover:bg-white hover:bg-opacity-15 group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out group-hover:bg-opacity-30 group-hover:scale-105 shrink-0">
                  {user.user_metadata?.avatar_url ? (
                    <div 
                      className="w-8 h-8 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${user.user_metadata.avatar_url})` }}
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-white" />
                  )}
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium truncate">
                      {user.user_metadata?.first_name && user.user_metadata?.last_name 
                        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                        : user.email?.split('@')[0] || 'User'
                      }
                    </p>
                    {profileMenuOpen ? (
                      <ChevronUpIcon className="w-4 h-4 text-white text-opacity-60 group-hover:text-opacity-100 transition-all duration-300 ease-in-out" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 text-white text-opacity-60 group-hover:text-opacity-100 transition-all duration-300 ease-in-out" />
                    )}
                  </div>
                  <p className="text-white text-opacity-70 text-xs">
                    {user.user_metadata?.subscription_type || 'Free Plan'}
                  </p>
                </div>
              </button>

              {/* Dropdown Menu */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${profileMenuOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                {profileMenuOpen && (
                  <div className="mt-2 space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-x-3 rounded-md px-3 py-2 text-sm text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
                    >
                      <CogIcon className="w-4 h-4" />
                      <span>Impostazioni Profilo</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-x-3 rounded-md px-3 py-2 text-sm text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xs text-white text-opacity-70 transition-all duration-300 ease-in-out hover:text-opacity-90">
                <span>Powered by Mosaiko</span>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
