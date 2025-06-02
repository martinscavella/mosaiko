'use client';

import { useAuth } from './auth';

export function useForceLogout() {
  const { signOut } = useAuth();

  const forceLogout = async (reason = 'Manual logout') => {
    console.log(`🔨 Force logout initiated: ${reason}`);
    
    try {
      // Step 1: Try normal logout
      const result = await signOut();
      console.log('Normal logout result:', result);
      
      // Step 2: Additional cleanup
      if (typeof window !== 'undefined') {
        // Clear all possible auth-related storage
        const authKeys = [
          'sb-auth-token',
          'supabase.auth.token',
          'supabase-auth-token'
        ];
        
        authKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
        
        // Clear all cookies (if any)
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
      
      // Step 3: Force navigation and reload
      console.log('🔄 Forcing page reload...');
      
      // Use replace to avoid back button issues
      window.location.replace('/');
      
    } catch (error) {
      console.error('Force logout error:', error);
      // Last resort: just reload the page
      window.location.reload();
    }
  };

  return { forceLogout };
}

// Emergency logout function that can be called from anywhere
export const emergencyLogout = () => {
  console.log('🚨 EMERGENCY LOGOUT ACTIVATED');
  
  if (typeof window !== 'undefined') {
    // Clear everything
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Force reload
    window.location.href = '/';
  }
};
