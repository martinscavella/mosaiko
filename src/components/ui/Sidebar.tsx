"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { MosaikoLogo } from "@/components/ui/MosaikoLogo";
import clsx from "clsx";
import {
  Home,
  Banknote,
  House,
  ShoppingBasket,
  User,
  ChevronRight,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
} from "lucide-react";

const navigation = [
  { 
    name: "Dashboard", 
    href: "/", 
    icon: Home,
    type: "single"
  },
  {
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
    ]
  },
  {
    name: "Casa",
    icon: House,
    type: "module",
    basePath: "/house",
    children: [
      { name: "Dashboard", href: "/house/dashboard" },
      { name: "Bollette", href: "/house/bills" },
      { name: "Manutenzioni", href: "/house/maintenances" },
      { name: "Affitto e mutuo", href: "/house/housing" },
      { name: "Inventario", href: "/house/inventory" },
      { name: "Fornitori e contatti", href: "/house/contacts" },
    ]
  },
  {
    name: "Spesa",
    icon: ShoppingBasket,
    type: "module",
    basePath: "/grocery",
    children: [
      { name: "Dashboard", href: "/grocery/dashboard" },
      { name: "Dispensa", href: "/grocery/pantry" },
      { name: "Lista della spesa", href: "/grocery/shopping-list" },
      { name: "Scontrini e prezzi", href: "/grocery/receipts" },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Initialize expanded modules based on current path
  useEffect(() => {
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

  const toggleCompact = useCallback(() => {
    setIsCompact(prev => !prev);
    if (!isCompact) {
      setExpandedModules(new Set());
      setProfileMenuOpen(false);
    }
  }, [isCompact]);

  // Non mostrare la sidebar se l'utente non è autenticato
  if (!user) {
    return null;
  }

  return (
    <div 
      className={clsx(
        "relative flex h-full flex-col bg-surface border-r border-edge transition-all duration-200",
        isCompact ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={clsx(
        "flex h-16 shrink-0 items-center border-b border-edge",
        isCompact ? "justify-center px-3" : "justify-between px-4"
      )}>
        <div className="flex items-center gap-3">
          <MosaikoLogo size={isCompact ? 24 : 28} src="/mosaiko.png" />
          {!isCompact && <span className="font-semibold text-ink">Mosaiko</span>}
        </div>
        
        {!isCompact && (
          <button
            onClick={toggleCompact}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-secondary hover:bg-inset transition-colors"
            title="Comprimi sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button for compact mode */}
      {isCompact && (
        <button
          onClick={toggleCompact}
          className="mx-auto mt-3 p-1.5 rounded-lg text-ink-muted hover:text-ink-secondary hover:bg-inset transition-colors"
          title="Espandi sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className={clsx("flex-1 py-4", isCompact ? "px-2" : "px-3")}>
        <ul className="space-y-1">
          {navigation.map((item) => {
            if (item.type === "single") {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href!}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isCompact && "justify-center",
                      isActive 
                        ? "bg-primary-subtle text-primary" 
                        : "text-ink-secondary hover:bg-inset"
                    )}
                    title={isCompact ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!isCompact && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            } else {
              const isExpanded = isModuleExpanded(item.name);
              const isModuleActive = pathname.startsWith(item.basePath!);
              
              if (isCompact) {
                return (
                  <li key={item.name}>
                    <Link
                      href={item.basePath + '/dashboard'}
                      className={clsx(
                        "flex items-center justify-center rounded-lg p-2 transition-colors",
                        isModuleActive 
                          ? "bg-primary-subtle text-primary" 
                          : "text-ink-secondary hover:bg-inset"
                      )}
                      title={item.name}
                    >
                      <item.icon className="w-5 h-5" />
                    </Link>
                  </li>
                );
              }
              
              return (
                <li key={item.name}>
                  <button
                    onClick={() => toggleModule(item.name)}
                    className={clsx(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isModuleActive 
                        ? "bg-primary-subtle text-primary" 
                        : "text-ink-secondary hover:bg-inset"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronRight 
                      className={clsx(
                        "w-4 h-4 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-edge pl-3">
                      {item.children?.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className={clsx(
                                "block rounded-md px-3 py-1.5 text-sm transition-colors",
                                isChildActive 
                                  ? "bg-primary-subtle text-primary font-medium" 
                                  : "text-ink-secondary hover:bg-inset hover:text-ink"
                              )}
                            >
                              {child.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className={clsx("px-3 pb-2", isCompact && "px-2")}>
        <button
          onClick={toggleTheme}
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-inset transition-colors",
            isCompact ? "justify-center w-auto mx-auto p-2" : "w-full"
          )}
          title={resolvedTheme === "dark" ? "Tema chiaro" : "Tema scuro"}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-5 h-5 shrink-0" />
          ) : (
            <Moon className="w-5 h-5 shrink-0" />
          )}
          {!isCompact && (
            <span>{resolvedTheme === "dark" ? "Tema chiaro" : "Tema scuro"}</span>
          )}
        </button>
      </div>

      {/* Profile Section */}
      <div className={clsx("border-t border-edge p-3", isCompact && "px-2")}>
        {user ? (
          <div className="relative">
            {isCompact ? (
              <Link
                href="/profile"
                className="flex items-center justify-center p-2 rounded-lg text-ink-secondary hover:bg-inset transition-colors"
                title={userDisplayName}
              >
                {user.user_metadata?.avatar_url ? (
                  <div 
                    className="w-8 h-8 rounded-full bg-cover bg-center border border-edge"
                    style={{ backgroundImage: `url(${user.user_metadata.avatar_url})` }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-inset flex items-center justify-center">
                    <User className="w-4 h-4 text-ink-muted" />
                  </div>
                )}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-inset transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    <div 
                      className="w-9 h-9 rounded-full bg-cover bg-center border border-edge shrink-0"
                      style={{ backgroundImage: `url(${user.user_metadata.avatar_url})` }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-inset flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-ink-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-ink truncate">{userDisplayName}</p>
                    <p className="text-xs text-ink-muted truncate">{user.email}</p>
                  </div>
                </button>

                {profileMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-elevated rounded-lg shadow-elevated border border-edge overflow-hidden">
                    <div className="p-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-secondary hover:bg-inset rounded-md transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Impostazioni</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-subtle rounded-md transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
