import { createSupabaseBrowserClient } from '@/lib/supabase/client'

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

export const updateUserProfile = async (userId: string, profileData: Partial<ProfileData>) => {
  const supabase = createSupabaseBrowserClient()
  
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
  const supabase = createSupabaseBrowserClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}
