'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  ChartBarIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
  UserIcon,
  HomeIcon,
  ArrowLeftOnRectangleIcon,
  FolderIcon,
  FlagIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Navigation items for authenticated users
const authenticatedNavigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Accounts', href: '/finance/accounts', icon: CreditCardIcon },
  { name: 'Transactions', href: '/finance/transactions', icon: CurrencyDollarIcon },
  { name: 'Categories', href: '/finance/categories', icon: FolderIcon },
  { name: 'Goals', href: '/finance/goals', icon: FlagIcon },
  { name: 'Reports', href: '/finance/reports', icon: PresentationChartLineIcon },
];

const accountNavigation = [
  { name: 'Notifications', href: '/notifications', icon: BellIcon, badge: '24' },
  { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, badge: '8' },
  { name: 'Settings', href: '/finance/settings', icon: CogIcon },
];

// Navigation items for non-authenticated users
const publicNavigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Don't show sidebar on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  const navigation = user ? authenticatedNavigation : publicNavigation;

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 bg-white shadow-md"
        >
          <span className="sr-only">Open sidebar</span>
          {isSidebarOpen ? (
            <XMarkIcon className="block h-6 w-6" />
          ) : (
            <Bars3Icon className="block h-6 w-6" />
          )}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 bg-white shadow-lg transform transition-all duration-300 ease-in-out border-r border-gray-200
        lg:translate-x-0 lg:static lg:inset-0 lg:z-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
        w-64
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-base">M</span>
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Mosaiko</h1>
                  <p className="text-xs text-gray-500">Finance Manager</p>
                </div>
              )}
            </div>
            
            {/* Desktop controls */}
            <div className="hidden lg:flex items-center space-x-1">
              {!isCollapsed && (
                <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white hover:shadow-sm transition-all">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white hover:shadow-sm transition-all"
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="w-4 h-4" />
                ) : (
                  <ChevronLeftIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* User Type Toggle */}
          {user && !isCollapsed && (
            <div className="px-4 pt-4 pb-3">
              <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100">
                <button className="flex-1 py-2 px-4 text-sm font-medium bg-white text-blue-600 rounded-lg shadow-sm transition-all border border-blue-100">
                  Personal
                </button>
                <button className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                  Business
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {user ? (
              <>
                {/* Main Navigation */}
                {authenticatedNavigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/' && pathname?.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className={`flex-shrink-0 w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                      {!isCollapsed && item.name}
                    </Link>
                  );
                })}

                {/* Account Section */}
                {!isCollapsed && (
                  <div className="pt-6 pb-2">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Account
                    </h3>
                  </div>
                )}
                
                {accountNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center">
                        <item.icon className={`flex-shrink-0 w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                        {!isCollapsed && item.name}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                          item.name === 'Notifications' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {isCollapsed && item.badge && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                    </Link>
                  );
                })}
              </>
            ) : (
              // Public navigation for non-authenticated users
              publicNavigation.map((item) => {
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className={`flex-shrink-0 w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                    {!isCollapsed && item.name}
                  </Link>
                );
              })
            )}
          </nav>

          {/* User Profile/Auth Section */}
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            {user ? (
              <div className="space-y-3">
                {/* User Profile */}
                <Link 
                  href="/profile"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center p-3 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-sm border border-gray-100 ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  )}
                </Link>

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className={`flex items-center w-full p-3 text-sm font-medium text-gray-600 bg-white rounded-xl hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-gray-100 ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                  title={isCollapsed ? 'Sign Out' : undefined}
                >
                  <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="ml-3">
                      {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              // Auth buttons for non-authenticated users
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-600 bg-white rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm border border-gray-200"
                >
                  {isCollapsed ? 'In' : 'Sign In'}
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                >
                  {isCollapsed ? '↗' : 'Get Started'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
