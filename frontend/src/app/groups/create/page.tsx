"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Globe, Lock, ArrowRight, ShieldCheck, Check, AlertCircle } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { InlineSpinner } from '@/components/ui/inline-spinner'

export default function CreateGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await apiFetch<{ data: { id: string } }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name, description: description || undefined, is_public: isPublic }),
      })
      router.push(`/groups/${data.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create group. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-emerald-950 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          Create New Community Group
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create your padel club/community space to organize events and members in isolation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6 sm:p-8 rounded-3xl border border-emerald-200/70 dark:border-emerald-900/60">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Group / Club Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Jakarta Padel Community"
            className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Short Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the club, playing location, and regular schedule..."
            className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Public vs Private Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Group Access Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isPublic
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 text-emerald-950 dark:text-white shadow-md'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Public Group
                </span>
                {isPublic && <Check className="h-4 w-4 text-lime-600 dark:text-lime-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Can be found in search and accessed via Link/QR Code.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                !isPublic
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 text-emerald-950 dark:text-white shadow-md'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Private Group
                </span>
                {!isPublic && <Check className="h-4 w-4 text-lime-600 dark:text-lime-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Only players with a specific Link / QR Code can join.
              </p>
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full sm:w-auto min-w-[180px] inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-6 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {loading && <InlineSpinner variant="dark" label="Creating group" />}
            <span>{loading ? 'Creating Group...' : 'Create Group Now'}</span>
            {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
          </button>
        </div>
      </form>
    </div>
  )
}
