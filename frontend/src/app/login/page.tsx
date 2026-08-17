"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/layout/logo'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email atau password salah.'
          : signInError.message
      )
      return
    }

    router.push(searchParams.get('next') || '/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-3xl border border-emerald-800/40 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <Logo size="lg" showWordmark={false} className="mb-2" />
          <h2 className="text-2xl font-extrabold text-white">Selamat Datang Kembali</h2>
          <p className="text-xs text-slate-400">Masuk ke akun Rally Hub Anda</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/70" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-emerald-950/70 border border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <Link href="/forgot-password" className="text-[11px] font-medium text-emerald-400 hover:underline">
                Lupa Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/70" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-emerald-950/70 border border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Memproses...' : 'Masuk'}
            {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-4 border-t border-emerald-900/40 text-center text-xs text-slate-400">
          Belum memiliki akun?{' '}
          <Link href="/register" className="font-bold text-lime-400 hover:underline">
            Daftar Pemain Baru
          </Link>
        </div>
      </div>
    </div>
  )
}
