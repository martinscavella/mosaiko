'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import { createUserProfile, ProfileData } from './profiles'

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata?: Partial<ProfileData>) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Record<string, unknown>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) console.error('Errore di login:', error)
      return { error }
    } catch (error) {
      console.error('Errore catch login:', error)
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, metadata?: Partial<ProfileData>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      })

      if (error) {
        console.error('Errore di autenticazione:', error)
        return { error }
      }

      if (!error && data.user && metadata) {
        const md = metadata as Partial<Record<string, unknown>>
        const firstName = typeof md['first_name'] === 'string' ? (md['first_name'] as string).trim() : typeof md['firstName'] === 'string' ? (md['firstName'] as string).trim() : 'Nome'
        const lastName = typeof md['last_name'] === 'string' ? (md['last_name'] as string).trim() : typeof md['lastName'] === 'string' ? (md['lastName'] as string).trim() : 'Utente'

        const profileData: ProfileData = {
          first_name: firstName,
          last_name: lastName,
          birth_date: typeof md['birth_date'] === 'string' ? (md['birth_date'] as string) : typeof md['birthDate'] === 'string' ? (md['birthDate'] as string) : null,
          phone_number: typeof md['phone_number'] === 'string' ? (md['phone_number'] as string) : typeof md['phoneNumber'] === 'string' ? (md['phoneNumber'] as string) : null,
          language: typeof md['language'] === 'string' ? (md['language'] as string) : 'it',
          app_theme: typeof md['app_theme'] === 'string' ? (md['app_theme'] as string) : typeof md['appTheme'] === 'string' ? (md['appTheme'] as string) : 'dark',
          notifications_enabled: typeof md['notifications_enabled'] === 'boolean' ? (md['notifications_enabled'] as boolean) : typeof md['notificationsEnabled'] === 'boolean' ? (md['notificationsEnabled'] as boolean) : true,
        }

        const { error: profileError } = await createUserProfile(data.user.id, profileData)
        if (profileError) {
          console.error('Errore nella creazione del profilo:', profileError)
        }
      }

      return { error }
    } catch (error) {
      console.error('Errore catch registrazione:', error)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (data: Record<string, unknown>) => {
    try {
      const { error } = await supabase.auth.updateUser({ data })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider')
  }
  return context
}
