"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Globe, Lock, ArrowRight, ShieldCheck, Check, AlertCircle } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'

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
      setError(err instanceof ApiError ? err.message : 'Gagal membuat grup. Coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-emerald-400" />
          Buat Grup Komunitas Baru
        </h1>
        <p className="text-xs text-slate-400">
          Buat ruang klub/komunitas padel Anda untuk mengorganisir event dan anggotanya secara terisolasi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6 sm:p-8 rounded-3xl border border-emerald-900/60">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Grup / Klub</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Jakarta Padel Community"
            className="w-full bg-emerald-950/70 border border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deskripsi Singkat</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan mengenai klub, lokasi bermain, dan jadwal rutin..."
            className="w-full bg-emerald-950/70 border border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Public vs Private Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Tipe Akses Grup</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isPublic
                  ? 'bg-emerald-900/60 border-emerald-400 text-white shadow-md'
                  : 'bg-emerald-950/40 border-emerald-900/60 text-slate-400 hover:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  Public Group
                </span>
                {isPublic && <Check className="h-4 w-4 text-lime-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Bisa ditemukan di pencarian dan diakses via Link/QR Code.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                !isPublic
                  ? 'bg-emerald-900/60 border-emerald-400 text-white shadow-md'
                  : 'bg-emerald-950/40 border-emerald-900/60 text-slate-400 hover:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-400" />
                  Private Group
                </span>
                {!isPublic && <Check className="h-4 w-4 text-lime-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Hanya pemain dengan Link / QR Code khusus yang bisa bergabung.
              </p>
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-6 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Membuat Grup...' : 'Buat Grup Sekarang'}
            {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
          </button>
        </div>
      </form>
    </div>
  )
}
