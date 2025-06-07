'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import { createUserProfile, ProfileData } from './profiles'

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata?: { [key: string]: any }) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: any) => Promise<{ error: Error | null }>
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
      if (session?.user) {
        console.log('User logged in:', session.user)
        console.log('User metadata:', session.user.user_metadata)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        console.log('Auth state changed - User:', session.user)
        console.log('User metadata:', session.user.user_metadata)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Tentativo di login con:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      
      console.log('Risultato login:', { data, error })
      
      if (error) {
        console.error('Errore di login:', error)
      }
      
      return { error }
    } catch (error) {
      console.error('Errore catch login:', error)
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, metadata?: { [key: string]: any }) => {
    try {
      console.log('Tentativo di registrazione con:', { email, metadata })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      console.log('Risultato registrazione:', { data, error })

      if (error) {
        console.error('Errore di autenticazione:', error)
        return { error }
      }

      // Se la registrazione ha successo e abbiamo i metadati, creiamo anche il profilo
      if (!error && data.user && metadata) {
        // Assicuriamoci che first_name e last_name non siano vuoti (sono NOT NULL nel database)
        const firstName = metadata.firstName?.trim() || 'Nome'
        const lastName = metadata.lastName?.trim() || 'Utente'
        
        const profileData: ProfileData = {
          first_name: firstName,
          last_name: lastName,
          birth_date: metadata.birth_date || null,
          phone_number: metadata.phone_number || null,
          language: metadata.language || 'it',
          app_theme: metadata.app_theme || 'dark',
          notifications_enabled: metadata.notifications_enabled ?? true,
        }

        console.log('Creazione profilo con dati:', profileData)

        // Creiamo il profilo nella tabella profiles
        const { error: profileError } = await createUserProfile(data.user.id, profileData)
        
        if (profileError) {
          console.error('Errore nella creazione del profilo:', profileError)
          // Non blocchiamo la registrazione per errori del profilo
        } else {
          console.log('Profilo creato con successo!')
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

  const updateProfile = async (data: any) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: data
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile
    }}>
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
