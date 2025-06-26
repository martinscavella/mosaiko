'use client';

import { usePathname } from 'next/navigation';
import { ArrowLeft, Search, Bell } from 'lucide-react';
import Link from 'next/link';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  actions?: React.ReactNode;
}

export default function MobileHeader({ 
  title, 
  showBack = false, 
  backHref = '/',
  actions 
}: MobileHeaderProps) {
  const pathname = usePathname();

  // Auto-generate title from pathname if not provided
  const getPageTitle = () => {
    if (title) return title;
    
    if (pathname === '/') return 'Dashboard';
    if (pathname?.startsWith('/finance/dashboard')) return 'Finanze';
    if (pathname?.startsWith('/finance/accounts')) return 'Account';
    if (pathname?.startsWith('/finance/transactions')) return 'Transazioni';
    if (pathname?.startsWith('/finance/assets')) return 'Asset';
    if (pathname?.startsWith('/finance/refunds')) return 'Rimborsi';
    if (pathname?.startsWith('/finance/import')) return 'Import Dati';
    if (pathname?.startsWith('/finance/reports')) return 'Report';
    if (pathname?.startsWith('/health')) return 'Salute';
    if (pathname?.startsWith('/learning')) return 'Studio';
    if (pathname?.startsWith('/tasks')) return 'Tasks';
    if (pathname?.startsWith('/profile')) return 'Profilo';
    
    return 'Mosaiko';
  };

  // Don't show on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null;
  }

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 pwa-safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side */}
        <div className="flex items-center space-x-3">
          {showBack && (
            <Link 
              href={backHref}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 touch-target no-touch-select"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
          )}
          
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          {actions ? (
            actions
          ) : (
            <>
              <button className="p-2 rounded-lg hover:bg-gray-100 touch-target no-touch-select">
                <Search size={20} className="text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 touch-target no-touch-select relative">
                <Bell size={20} className="text-gray-600" />
                {/* Notification dot */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
