"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { 
  Home, 
  PiggyBank, 
  Plus,
  Receipt,
  User,
  LogOut,
  Settings
} from "lucide-react";
import NewTransactionModal from "./NewTransactionModal";

interface MenuItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action?: () => void;
  isAction: boolean;
  active: boolean;
}

export function BottomMenu() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuItems: MenuItem[] = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      active: pathname === "/",
      isAction: false
    },
    {
      name: "Finanze",
      href: "/finance/dashboard",
      icon: PiggyBank,
      active: pathname.startsWith("/finance"),
      isAction: false
    },
    {
      name: "Nuova",
      icon: Plus,
      action: () => setShowTransactionModal(true),
      isAction: true,
      active: false
    },
    {
      name: "Transazioni",
      href: "/finance/transactions",
      icon: Receipt,
      active: pathname === "/finance/transactions",
      isAction: false
    },
    {
      name: "Profilo",
      icon: User,
      action: () => setShowProfileMenu(!showProfileMenu),
      isAction: true,
      active: pathname.startsWith("/profile")
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    setShowProfileMenu(false);
  };

  return (
    <>
      {/* Bottom Menu - visible only on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-2 py-2 z-40 shadow-lg">
        <div className="flex justify-around items-center max-w-sm mx-auto">
          {menuItems.map((item) => (
            <div key={item.name} className="relative">
              {item.isAction ? (
                <button
                  onClick={item.action}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 transform
                    ${item.name === "Nuova" 
                      ? "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-lg shadow-blue-200" 
                      : item.active 
                        ? "text-blue-600 bg-blue-50 scale-105" 
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 hover:scale-105"
                    }
                  `}
                >
                  <item.icon 
                    size={item.name === "Nuova" ? 26 : 22} 
                    className={`${item.name === "Nuova" ? "mb-0" : "mb-1"} transition-transform duration-200`} 
                  />
                  {item.name !== "Nuova" && (
                    <span className="text-xs font-medium">{item.name}</span>
                  )}
                </button>
              ) : (
                item.href && (
                  <Link
                    href={item.href}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 transform
                      ${item.active 
                        ? "text-blue-600 bg-blue-50 scale-105" 
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 hover:scale-105"
                      }
                    `}
                  >
                    <item.icon size={22} className="mb-1 transition-transform duration-200" />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Profile Menu Popup */}
      {showProfileMenu && (
        <div className="md:hidden fixed bottom-20 right-4 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 z-50 w-56 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {user?.user_metadata?.first_name && user?.user_metadata?.last_name
                    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                    : user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          
          <div className="py-2">
            <Link
              href="/profile"
              onClick={() => setShowProfileMenu(false)}
              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings size={18} className="mr-3 text-gray-500" />
              Impostazioni
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close profile menu */}
      {showProfileMenu && (
        <div 
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}

      {/* New Transaction Modal */}
      <NewTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => {
          setShowTransactionModal(false);
          // Optionally refresh data or show success message
        }}
      />
    </>
  );
}
