'use client'

import { useTheme } from '@/context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)]"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-[var(--text-primary)]" />
      )}
    </button>
  )
}