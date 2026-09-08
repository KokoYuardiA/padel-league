"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users,
  Calendar,
  LayoutDashboard,
  User,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Compass,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'

  const handleSignOut = async () => {
    setMobileMenuOpen(false)
    await signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Groups', href: '/groups', icon: Users },
    { name: 'Discover', href: '/discover', icon: Compass },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-200/70 dark:border-emerald-950/60 bg-white/70 dark:bg-emerald-950/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo */}
        <Logo size="md" showSubtitle />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href) && link.href !== '/events')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30'
                }`}
              >
                <link.icon className={`h-4 w-4 ${isActive ? 'text-lime-600 dark:text-lime-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Desktop CTA & Profile */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {loading ? null : user ? (
            <>
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  pathname === '/profile'
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-white border-emerald-500'
                    : 'bg-white/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-slate-600 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950 flex items-center justify-center font-bold text-[11px]">
                  {initials}
                </div>
                <span>My Profile</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200"
              >
                Sign Up
                <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-emerald-200 dark:border-emerald-950/80 bg-white/95 dark:bg-emerald-950/95 backdrop-blur-2xl px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-base font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                    : 'text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                }`}
              >
                <link.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                {link.name}
              </Link>
            )
          })}

          {user && (
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-base font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl"
            >
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              My Profile
            </Link>
          )}

          <div className="pt-3 border-t border-emerald-200/70 dark:border-emerald-900/60 flex flex-col gap-2">
            <ThemeToggle variant="row" />
            {user ? (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-1.5 text-center py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-950 dark:hover:text-white bg-emerald-100/60 dark:bg-emerald-900/30 rounded-xl"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-950 dark:hover:text-white bg-emerald-100/60 dark:bg-emerald-900/30 rounded-xl"
            >
              Sign In
            </Link>
            )}
            {!user && (
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 rounded-xl shadow-lg"
            >
              Sign Up Now
            </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
