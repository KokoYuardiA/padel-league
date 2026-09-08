"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Lock, ArrowRight, AlertCircle, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Password and confirmation password do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (authLoading) {
    return <p className="max-w-md mx-auto px-4 py-20 text-center text-xs text-slate-500 dark:text-slate-400">Loading...</p>
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 dark:text-rose-400 mx-auto" />
        <h1 className="text-lg font-bold text-emerald-950 dark:text-white">Link is invalid or has expired</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please request a new password reset link.</p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 rounded-xl"
        >
          Request New Link
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/40 shadow-2xl relative overflow-hidden">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 shadow-lg shadow-emerald-500/20 mb-2">
            <Trophy className="h-6 w-6 text-emerald-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-950 dark:text-white">Create New Password</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Enter a new password for your account</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Check className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Saving...' : 'Save New Password'}
            {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
          </button>
        </form>
      </div>
    </div>
  )
}
