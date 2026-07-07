'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'mosaiko-theme'

/**
 * Script inline eseguito prima dell'hydration per applicare subito
 * data-theme ed evitare il flash del tema sbagliato.
 */
export const themeInitScript = `
(function () {
  try {
    var pref = localStorage.getItem('${STORAGE_KEY}');
    var dark = pref === 'dark' || ((pref === null || pref === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`

interface ThemeContextValue {
  /** Preferenza scelta dall'utente (light/dark/system) */
  preference: ThemePreference
  /** Tema effettivamente applicato */
  resolvedTheme: ResolvedTheme
  setPreference: (pref: ThemePreference) => void
  /** Scorciatoia per il toggle rapido: alterna light/dark */
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  // Allinea lo stato React a quanto già applicato dallo script inline
  useEffect(() => {
    const pref = readStoredPreference()
    setPreferenceState(pref)
    setResolvedTheme(pref === 'system' ? systemTheme() : pref)
  }, [])

  // Applica il tema al documento e segui i cambi di preferenza di sistema
  useEffect(() => {
    const apply = (theme: ResolvedTheme) => {
      document.documentElement.dataset.theme = theme
      setResolvedTheme(theme)
    }

    if (preference !== 'system') {
      apply(preference)
      return
    }

    apply(systemTheme())
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref)
    if (pref === 'system') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, pref)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setPreference])

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme deve essere usato dentro ThemeProvider')
  }
  return ctx
}
