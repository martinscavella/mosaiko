import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Client Supabase per route handler / server (T4.8, sostituisce il deprecato
 * createRouteHandlerClient di @supabase/auth-helpers-nextjs).
 *
 * Legge la sessione dai cookie della richiesta. setAll è necessario perché
 * il client possa aggiornare i token di sessione quando li rinnova.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chiamato da un Server Component: i cookie non sono scrivibili,
            // il refresh della sessione avviene comunque lato client
          }
        },
      },
    }
  )
}
