"use client"

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'

interface ThemeToggleProps {
  /** full-width row style for the mobile menu */
  variant?: 'icon' | 'row'
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, mounted, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-950 dark:hover:text-white bg-emerald-100/60 dark:bg-emerald-900/30 rounded-xl transition-colors"
      >
        {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {mounted ? (isDark ? 'Light Mode' : 'Dark Mode') : 'Theme'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white/70 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-white hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
    >
      {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
