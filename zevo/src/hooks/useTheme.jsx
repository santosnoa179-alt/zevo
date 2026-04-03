import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════
// THEME CONTEXT — Dark / Light mode
// ═══════════════════════════════════════════════════════════════

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {}, isDark: true })

const STORAGE_KEY = 'zevo-theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Vérifier localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    // 2. Sinon, préférence système
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
    // 3. Par défaut : dark
    return 'dark'
  })

  // Appliquer la classe sur <html> + meta theme-color
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)

    // Mettre à jour la meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0D0D0D' : '#F5F5F3')
    }
  }, [theme])

  // Écouter les changements de préférence système
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      // Seulement si l'user n'a pas choisi manuellement
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
