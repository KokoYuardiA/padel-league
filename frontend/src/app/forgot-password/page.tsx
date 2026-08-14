"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Mail, ArrowRight, AlertCircle, Check, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    // Always show the same success state regardless of whether the email is
    // registered — avoids leaking account existence to an anonymous caller.
    setSent(true)
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-3xl border border-emerald-800/40 shadow-2xl relative overflow-hidden">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 shadow-lg shadow-emerald-500/20 mb-2">
            <Trophy className="h-6 w-6 text-emerald-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Lupa Password</h2>
          <p className="text-xs text-slate-400">Masukkan email Anda untuk menerima link reset password</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>
              Jika <strong>{email}</strong> terdaftar, kami sudah mengirim link reset password. Cek inbox
              (dan folder spam) Anda.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-emerald-900/40 text-center text-xs text-slate-400">
          <Link href="/login" className="inline-flex items-center gap-1.5 font-bold text-lime-400 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    </div>
  )
}
