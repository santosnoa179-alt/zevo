import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// THEME TOGGLE — Bouton animé Soleil / Lune
// ═══════════════════════════════════════════════════════════════

export default function ThemeToggle({ size = 'md' }) {
  const { isDark, toggleTheme } = useTheme()

  const sz = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
  const iconSz = size === 'sm' ? 15 : 17

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className={`${sz} rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90
        ${isDark
          ? 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] text-amber-300'
          : 'bg-gray-100 hover:bg-gray-200 text-amber-500'
        }`}
    >
      <div className="relative w-[18px] h-[18px] flex items-center justify-center">
        {/* Soleil */}
        <Sun
          size={iconSz}
          className={`absolute transition-all duration-300 ${
            isDark
              ? 'opacity-0 rotate-90 scale-0'
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        {/* Lune */}
        <Moon
          size={iconSz}
          className={`absolute transition-all duration-300 ${
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0'
          }`}
        />
      </div>
    </button>
  )
}
