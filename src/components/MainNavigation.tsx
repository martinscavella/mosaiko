'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useForceLogout } from '@/lib/force-logout';
import {
  ChartBarIcon,
  HeartIcon,
  AcademicCapIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

// Navigation items for authenticated users
const authenticatedNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Accounts', href: '/accounts', icon: ChartBarIcon },
  { name: 'Finance', href: '/finance/dashboard', icon: ChartBarIcon },
  { name: 'Fitness', href: '/fitness/workouts', icon: HeartIcon },
  { name: 'Learning', href: '/learning/courses', icon: AcademicCapIcon },
  { name: 'Profile', href: '/profile', icon: UserIcon },
];

// Navigation items for non-authenticated users
const publicNavigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
];

export default function MainNavigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { forceLogout } = useForceLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Don't show navigation on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  const navigation = user ? authenticatedNavigation : publicNavigation;

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    try {
      setIsSigningOut(true);
      console.log('🚪 MainNavigation: Starting logout...');
      
      // Close mobile menu immediately
      setIsMobileMenuOpen(false);
      
      // Try normal logout first
      const { error } = await signOut();
      
      if (error) {
        console.warn('⚠️ Normal logout failed, trying force logout...', error);
        // If normal logout fails, use force logout
        await forceLogout('Normal logout failed');
      } else {
        console.log('✅ Normal logout successful, redirecting...');
        // Even on success, force a reload to ensure clean state
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
    } catch (error) {
      console.error('❌ Logout error, forcing emergency logout:', error);
      // Emergency fallback
      await forceLogout('Exception during logout');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-white">
                Mosaiko
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname?.startsWith(item.href.split('/')[1]));
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'border-blue-400 text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-400 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-2" />
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            ) : (
              <div className="flex space-x-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center px-4 py-2 border border-white/20 text-sm leading-4 font-medium rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors duration-200"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 bg-white/10 backdrop-blur-md border-t border-white/20">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname?.startsWith(item.href.split('/')[1]));
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-500/20 border-blue-400 text-white'
                      : 'border-transparent text-gray-300 hover:bg-white/10 hover:border-gray-400 hover:text-white'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
            
            {/* Mobile auth buttons */}
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-300 hover:bg-white/10 hover:border-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center">
                  <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-3" />
                  {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </div>
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-300 hover:bg-white/10 hover:border-gray-400 hover:text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                    Sign In
                  </div>
                </Link>
                <Link
                  href="/auth/register"
                  className="block mx-3 my-2 px-4 py-2 bg-white/10 border border-white/20 rounded-md text-base font-medium text-white hover:bg-white/20 text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
