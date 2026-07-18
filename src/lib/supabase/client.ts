import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase per componenti client (T4.8, sostituisce il deprecato
 * createClientComponentClient di @supabase/auth-helpers-nextjs).
 *
 * createBrowserClient è un singleton (stessa istanza a ogni chiamata) e
 * condivide la sessione via cookie con i route handler server-side.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
