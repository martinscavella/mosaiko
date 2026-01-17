"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { clsx } from "clsx";
import { 
  Home, 
  PiggyBank, 
  Plus,
  Receipt,
  User,
  LogOut,
  Settings,
  Wallet,
  TrendingUp,
  FileText,
  RotateCcw,
  Upload,
  BarChart3,
  Menu
} from "lucide-react";
import NewTransactionModal from "./NewTransactionModal";

export function BottomMenu() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isFinanceModule = pathname.startsWith("/finance");

  // Menu principale - cambia in base al modulo attivo
  const mainMenuItems = useMemo(() => {
    // Determina l'azione del FAB in base al pathname
    const handleFabClick = () => {
      // Emette un evento custom che le pagine possono intercettare
      const event = new CustomEvent('openNewItemModal', { 
        detail: { pathname } 
      });
      window.dispatchEvent(event);
    };

    if (isFinanceModule) {
      // In Finance: Dashboard | Transazioni | Aggiungi | Account | Menu
      return [
        { name: "Dashboard", href: "/finance/dashboard", icon: BarChart3, active: pathname === "/finance/dashboard" },
        { name: "Transazioni", href: "/finance/transactions", icon: Receipt, active: pathname === "/finance/transactions" },
        { name: "Aggiungi", action: handleFabClick, icon: Plus, active: false, isFab: true },
        { name: "Account", href: "/finance/accounts", icon: Wallet, active: pathname === "/finance/accounts" },
        { name: "Altro", action: () => setShowMoreMenu(!showMoreMenu), icon: Menu, active: false },
      ];
    }
    
    // Home o altre sezioni: Home | Finanze | Aggiungi | Profilo
    return [
      { name: "Home", href: "/", icon: Home, active: pathname === "/" },
      { name: "Finanze", href: "/finance/dashboard", icon: PiggyBank, active: pathname.startsWith("/finance") },
      { name: "Aggiungi", action: handleFabClick, icon: Plus, active: false, isFab: true },
      { name: "Profilo", action: () => setShowMoreMenu(!showMoreMenu), icon: User, active: pathname.startsWith("/profile") },
    ];
  }, [pathname, isFinanceModule, showMoreMenu]);

  // Menu secondario - voci che vanno nel popup "Altro/Profilo"
  const secondaryMenuItems = useMemo(() => {
    if (isFinanceModule) {
      return [
        { name: "Asset", href: "/finance/assets", icon: TrendingUp },
        { name: "Rimborsi", href: "/finance/refunds", icon: RotateCcw },
        { name: "Import Dati", href: "/finance/import", icon: Upload },
        { name: "Report", href: "/finance/reports", icon: FileText },
        { type: "divider" },
        { name: "Profilo", href: "/profile", icon: Settings },
      ];
    }
    
    return [
      { name: "Impostazioni", href: "/profile", icon: Settings },
    ];
  }, [isFinanceModule]);

  const handleSignOut = async () => {
    await signOut();
    setShowMoreMenu(false);
  };

  // Preparazione voci non-FAB divise in sinistra/destra per allineamento simmetrico
  const nonFabItems = mainMenuItems.filter(i => !i.isFab);
  const midIndex = Math.floor(nonFabItems.length / 2);
  const leftItems = nonFabItems.slice(0, midIndex);
  const rightItems = nonFabItems.slice(midIndex);

  return (
    <>
      {/* Bottom Menu - mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-bottom">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10">
          <div className="max-w-md mx-auto w-full px-2">
            <div className="flex items-center justify-center h-16 gap-1">
              {/* Left Items */}
              <div className="flex-1 flex items-center justify-center gap-0">
                {leftItems.map((item) => {
                  const IconComponent = item.icon;

                  if (item.action) {
                    return (
                      <button
                        key={item.name}
                        onClick={item.action}
                        className={clsx(
                          "flex-1 flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-lg transition-all duration-200",
                          item.active ? "text-blue-600" : "text-gray-500 active:bg-gray-50"
                        )}
                      >
                        <IconComponent size={24} strokeWidth={item.active ? 2.5 : 2} />
                        <span className={clsx(
                          "text-[10px] font-medium",
                          item.active && "font-semibold"
                        )}>
                          {item.name}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href!}
                      className={clsx(
                        "flex-1 flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-lg transition-all duration-200",
                        item.active ? "text-blue-600" : "text-gray-500 active:bg-gray-50"
                      )}
                    >
                      <IconComponent size={24} strokeWidth={item.active ? 2.5 : 2} />
                      <span className={clsx(
                        "text-[10px] font-medium",
                        item.active && "font-semibold"
                      )}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Center FAB - nel flusso normale con shrink-0 */}
              {mainMenuItems.find(i => i.isFab) && (() => {
                const fab = mainMenuItems.find(i => i.isFab)!;
                const Icon = fab.icon;

                if (fab.action) {
                  return (
                    <button
                      key={fab.name}
                      onClick={fab.action}
                      aria-label={fab.name}
                      className="flex-shrink-0 -mt-6 bg-blue-600 text-white w-14 h-14 rounded-xl shadow-lg flex items-center justify-center active:scale-95 hover:shadow-xl transition-transform"
                    >
                      <Icon size={26} strokeWidth={2} />
                    </button>
                  );
                }

                return (
                  <Link 
                    key={fab.name}
                    href={fab.href!} 
                    className="flex-shrink-0 -mt-6 bg-blue-600 text-white w-14 h-14 rounded-xl shadow-lg flex items-center justify-center active:scale-95 hover:shadow-xl transition-transform"
                  >
                    <Icon size={26} strokeWidth={2} />
                  </Link>
                );
              })()}

              {/* Right Items */}
              <div className="flex-1 flex items-center justify-center gap-0">
                {rightItems.map((item) => {
                  const IconComponent = item.icon;

                  if (item.action) {
                    return (
                      <button
                        key={item.name}
                        onClick={item.action}
                        className={clsx(
                          "flex-1 flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-lg transition-all duration-200",
                          item.active ? "text-blue-600" : "text-gray-500 active:bg-gray-50"
                        )}
                      >
                        <IconComponent size={24} strokeWidth={item.active ? 2.5 : 2} />
                        <span className={clsx(
                          "text-[10px] font-medium",
                          item.active && "font-semibold"
                        )}>
                          {item.name}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href!}
                      className={clsx(
                        "flex-1 flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-lg transition-all duration-200",
                        item.active ? "text-blue-600" : "text-gray-500 active:bg-gray-50"
                      )}
                    >
                      <IconComponent size={24} strokeWidth={item.active ? 2.5 : 2} />
                      <span className={clsx(
                        "text-[10px] font-medium",
                        item.active && "font-semibold"
                      )}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* More Menu Popup */}
      {showMoreMenu && (
        <div className="md:hidden fixed bottom-20 right-4 left-4 sm:left-auto sm:w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header solo se utente loggato */}
          {user && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center ring-2 ring-blue-100">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.user_metadata?.first_name && user?.user_metadata?.last_name
                      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                      : user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="py-2">
            {secondaryMenuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={`divider-${index}`} className="h-px bg-gray-200 my-2" />;
              }
              
              const IconComponent = item.icon!;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  onClick={() => setShowMoreMenu(false)}
                  className={clsx(
                    "flex items-center px-4 py-3 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                  )}
                >
                  <IconComponent size={20} className={clsx("mr-3", isActive ? "text-blue-600" : "text-gray-400")} />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Logout sempre presente */}
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              <LogOut size={20} className="mr-3" />
              Esci dall'Account
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {showMoreMenu && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      <NewTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => setShowTransactionModal(false)}
      />
    </>
  );
}
