"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Mail, Lock, User, Phone, Award, ArrowRight, AlertCircle, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { InlineSpinner } from '@/components/ui/inline-spinner'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [skillLevel, setSkillLevel] = useState('Intermediate')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone_number: phone },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    // The `handle_new_user` DB trigger creates the profile row (full_name,
    // phone_number) from signup metadata but defaults skill_level to
    // 'Beginner' — set the player's actual choice once we have a session.
    if (data.session && data.user) {
      await supabase.from('profiles').update({ skill_level: skillLevel }).eq('id', data.user.id)
    }

    setLoading(false)

    if (data.session) {
      // Hard navigation so the request carries the just-set auth cookies —
      // see the same fix on the login page for why router.push races.
      window.location.href = '/dashboard'
    } else {
      // Email confirmation is required before a session is issued.
      setCheckEmail(true)
    }
  }

  const skillOptions = [
    { level: 'Beginner', desc: 'Just starting out / beginner' },
    { level: 'Intermediate', desc: 'Has played in events before / understands the rules' },
    { level: 'Advanced', desc: 'Regular player with a wide variety of shots' },
    { level: 'Pro', desc: 'Player at national/club competition level' },
  ]

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-lg space-y-8 glass-card p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/40 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 shadow-lg shadow-emerald-500/20 mb-2">
            <Trophy className="h-6 w-6 text-emerald-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-950 dark:text-white">Register Player Account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Join the padel community & take part in events</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Check-email Success Alert */}
        {checkEmail && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span>
              Account created successfully! Check the email <strong>{email}</strong> for confirmation before signing in.
            </span>
          </div>
        )}

        {/* Form */}
        {!checkEmail && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Phone Number <span className="text-emerald-600 dark:text-emerald-400 font-normal">(Required)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+6281234567890"
                className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          {/* Skill Level Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Select Your Skill Level (Self-Declared)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {skillOptions.map((opt) => (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => setSkillLevel(opt.level)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    skillLevel === opt.level
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 text-emerald-950 dark:text-white shadow-md'
                      : 'bg-white/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-950 dark:text-white">{opt.level}</span>
                    {skillLevel === opt.level && <Check className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 mt-4"
          >
            {loading && <InlineSpinner variant="dark" label="Creating account" />}
            <span>{loading ? 'Creating Account...' : 'Create Account Now'}</span>
            {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
          </button>
        </form>
        )}

        {/* Footer Link */}
        <div className="pt-4 border-t border-emerald-200/70 dark:border-emerald-900/40 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-lime-600 dark:text-lime-400 hover:underline">
            Sign In to Your Account
          </Link>
        </div>
      </div>
    </div>
  )
}
