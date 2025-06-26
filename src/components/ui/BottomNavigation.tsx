'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  Menu,
  Plus,
  User
} from 'lucide-react';

export default function BottomNavigation() {
  const pathname = usePathname();

  // Don't show on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null;
  }

  return (
    <>
      {/* Bottom Navigation Bar - Solo 4 elementi principali */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pwa-safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          
          {/* Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 touch-target no-touch-select ${
              pathname === '/'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Home size={22} className={pathname === '/' ? 'text-blue-600' : ''} />
            <span className={`text-xs font-medium mt-1 ${pathname === '/' ? 'text-blue-600' : ''}`}>
              Home
            </span>
          </Link>

          {/* Menu */}
          <Link
            href="/finance/dashboard"
            className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 touch-target no-touch-select ${
              pathname?.startsWith('/finance/')
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Menu size={22} className={pathname?.startsWith('/finance/') ? 'text-blue-600' : ''} />
            <span className={`text-xs font-medium mt-1 ${pathname?.startsWith('/finance/') ? 'text-blue-600' : ''}`}>
              Finanze
            </span>
          </Link>

          {/* Quick Action */}
          <Link
            href="/finance/transactions"
            className="flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 touch-target no-touch-select text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <Plus size={22} />
            <span className="text-xs font-medium mt-1">Nuovo</span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 touch-target no-touch-select ${
              pathname === '/profile'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <User size={22} className={pathname === '/profile' ? 'text-blue-600' : ''} />
            <span className={`text-xs font-medium mt-1 ${pathname === '/profile' ? 'text-blue-600' : ''}`}>
              Profilo
            </span>
          </Link>
        </div>
      </div>

      {/* Spacer per evitare che il contenuto vada sotto la bottom nav */}
      <div className="md:hidden h-16 pwa-safe-area-bottom" />
    </>
  );
}
