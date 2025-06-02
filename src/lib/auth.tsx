'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClientComponentClient } from './supabase'
import { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

interface UserMetadata {
  first_name?: string
  last_name?: string
  [key: string]: unknown
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (data: UserMetadata) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
        }
        
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Exception getting initial session:', error)
        if (mounted) {
          setSession(null)
          setUser(null)
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', { event, userEmail: session?.user?.email || 'null' })
        
        if (!mounted) return;
        
        // Handle different auth events explicitly
        switch (event) {
          case 'SIGNED_OUT':
            setSession(null)
            setUser(null)
            break
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
          default:
            setSession(session)
            setUser(session?.user ?? null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signUp = async (email: string, password: string, metadata?: UserMetadata) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signOut = async () => {
    try {
      console.log('Starting logout process...')
      
      // Method 1: Try normal signOut first
      let { error } = await supabase.auth.signOut()
      
      if (error) {
        console.warn('Normal signOut failed, trying local scope:', error.message)
        // Method 2: Try local scope signOut
        const localResult = await supabase.auth.signOut({ scope: 'local' })
        error = localResult.error
      }
      
      if (error) {
        console.error('Supabase signOut failed:', error)
      }
      
      // Clear browser storage regardless of Supabase result
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear()
          sessionStorage.clear()
          
          // Also clear any IndexedDB data related to Supabase
          if ('indexedDB' in window) {
            const databases = ['supabase-auth-token']
            databases.forEach(async (dbName) => {
              try {
                indexedDB.deleteDatabase(dbName)
              } catch (e) {
                console.warn(`Could not clear IndexedDB ${dbName}:`, e)
              }
            })
          }
        } catch (e) {
          console.warn('Error clearing storage:', e)
        }
      }
      
      // Force state update
      setUser(null)
      setSession(null)
      
      return { error }
      
    } catch (err) {
      console.error('SignOut exception:', err)
      // Emergency logout - clear everything
      setUser(null)
      setSession(null)
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      return { error: err as AuthError }
    }
  }

  const updateProfile = async (data: UserMetadata) => {
    const { error } = await supabase.auth.updateUser({
      data
    })
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom hooks for database operations
export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data)
        }
        setLoading(false)
      }

      fetchProfile()
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [user, supabase])

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return { error: new Error('No user') }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (data) {
      setProfile(data)
    }

    return { data, error }
  }

  return { profile, loading, updateProfile }
}