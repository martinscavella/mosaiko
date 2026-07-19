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
  Menu,
  House,
  Wrench,
  KeyRound,
  Package,
  Users,
  ShoppingBasket,
  ShoppingCart
} from "lucide-react";
import NewTransactionModal from "./NewTransactionModal";

export function BottomMenu() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isFinanceModule = pathname.startsWith("/finance");
  const isHouseModule = pathname.startsWith("/house");
  const isGroceryModule = pathname.startsWith("/grocery");

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

    if (isHouseModule) {
      // In Casa: Dashboard | Bollette | Aggiungi | Manutenzioni | Menu
      return [
        { name: "Casa", href: "/house/dashboard", icon: House, active: pathname === "/house/dashboard" },
        { name: "Bollette", href: "/house/bills", icon: Receipt, active: pathname === "/house/bills" },
        { name: "Aggiungi", action: handleFabClick, icon: Plus, active: false, isFab: true },
        { name: "Manutenzioni", href: "/house/maintenances", icon: Wrench, active: pathname === "/house/maintenances" },
        { name: "Altro", action: () => setShowMoreMenu(!showMoreMenu), icon: Menu, active: false },
      ];
    }

    if (isGroceryModule) {
      // In Spesa: Dashboard | Dispensa | Aggiungi | Lista | Menu
      return [
        { name: "Spesa", href: "/grocery/dashboard", icon: ShoppingBasket, active: pathname === "/grocery/dashboard" },
        { name: "Dispensa", href: "/grocery/pantry", icon: Package, active: pathname === "/grocery/pantry" },
        { name: "Aggiungi", action: handleFabClick, icon: Plus, active: false, isFab: true },
        { name: "Lista", href: "/grocery/shopping-list", icon: ShoppingCart, active: pathname === "/grocery/shopping-list" },
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
  }, [pathname, isFinanceModule, isHouseModule, isGroceryModule, showMoreMenu]);

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

    if (isHouseModule) {
      return [
        { name: "Affitto e mutuo", href: "/house/housing", icon: KeyRound },
        { name: "Inventario", href: "/house/inventory", icon: Package },
        { name: "Fornitori e contatti", href: "/house/contacts", icon: Users },
        { type: "divider" },
        { name: "Profilo", href: "/profile", icon: Settings },
      ];
    }

    if (isGroceryModule) {
      return [
        { name: "Scontrini e prezzi", href: "/grocery/receipts", icon: Receipt },
        { type: "divider" },
        { name: "Profilo", href: "/profile", icon: Settings },
      ];
    }

    return [
      { name: "Impostazioni", href: "/profile", icon: Settings },
    ];
  }, [isFinanceModule, isHouseModule, isGroceryModule]);

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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-edge z-40 safe-bottom">
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
                          item.active ? "text-primary" : "text-ink-muted active:bg-canvas"
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
                        item.active ? "text-primary" : "text-ink-muted active:bg-canvas"
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
                      className="flex-shrink-0 -mt-6 bg-primary text-white w-14 h-14 rounded-lg shadow-elevated flex items-center justify-center active:scale-95 hover:shadow-elevated transition-transform"
                    >
                      <Icon size={26} strokeWidth={2} />
                    </button>
                  );
                }

                return (
                  <Link 
                    key={fab.name}
                    href={fab.href!} 
                    className="flex-shrink-0 -mt-6 bg-primary text-white w-14 h-14 rounded-lg shadow-elevated flex items-center justify-center active:scale-95 hover:shadow-elevated transition-transform"
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
                          item.active ? "text-primary" : "text-ink-muted active:bg-canvas"
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
                        item.active ? "text-primary" : "text-ink-muted active:bg-canvas"
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
        <div className="md:hidden fixed bottom-20 right-4 left-4 sm:left-auto sm:w-72 bg-surface rounded-lg shadow-elevated border border-edge z-50 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header solo se utente loggato */}
          {user && (
            <div className="p-4 bg-canvas border-b border-edge-subtle">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">
                    {user?.user_metadata?.first_name && user?.user_metadata?.last_name
                      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                      : user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="py-2">
            {secondaryMenuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={`divider-${index}`} className="h-px bg-inset my-2" />;
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
                      ? "bg-primary-subtle text-primary" 
                      : "text-ink-secondary hover:bg-canvas active:bg-inset"
                  )}
                >
                  <IconComponent size={20} className={clsx("mr-3", isActive ? "text-primary" : "text-ink-muted")} />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Logout sempre presente */}
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-danger hover:bg-danger-subtle active:bg-danger-subtle transition-colors"
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
