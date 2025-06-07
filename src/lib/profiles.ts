import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export type ProfileData = {
  first_name: string
  last_name: string
  birth_date?: string | null
  phone_number?: string | null
  address?: string | null
  bio?: string | null
  avatar_url?: string | null
  language?: string
  app_theme?: string
  notifications_enabled?: boolean
  subscription_type?: string | null
}

export const createUserProfile = async (userId: string, profileData: ProfileData) => {
  const supabase = createClientComponentClient()
  
  console.log('🔥 Tentativo di creazione profilo per utente:', userId)
  console.log('🔥 Dati profilo ricevuti:', profileData)
  
  // Prepariamo solo i campi che esistono nella tabella profiles (esclusi quelli auto-generati)
  const insertData = {
    id: userId,
    first_name: profileData.first_name,
    last_name: profileData.last_name,
    birth_date: profileData.birth_date,
    phone_number: profileData.phone_number,
    address: profileData.address || null,
    bio: profileData.bio || null,
    avatar_url: profileData.avatar_url || null,
    language: profileData.language || 'it',
    app_theme: profileData.app_theme || 'dark',
    notifications_enabled: profileData.notifications_enabled !== undefined ? profileData.notifications_enabled : true,
    subscription_type: profileData.subscription_type || null
    // Non includiamo: full_name (auto-generato), created_at, updated_at (auto-generati)
  }
  
  console.log('🔥 Dati da inserire nel database:', insertData)
  
  const { data, error } = await supabase
    .from('profiles')
    .insert([insertData])
    .select()

  if (error) {
    console.error('🔥 ERRORE dettagliato creazione profilo:', error)
    console.error('🔥 Codice errore:', error.code)
    console.error('🔥 Messaggio errore:', error.message)
    console.error('🔥 Dettagli errore:', error.details)
  } else {
    console.log('🔥 ✅ Profilo creato con successo:', data)
  }

  return { data, error }
}

export const updateUserProfile = async (userId: string, profileData: Partial<ProfileData>) => {
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...profileData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()

  return { data, error }
}

export const getUserProfile = async (userId: string) => {
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}
