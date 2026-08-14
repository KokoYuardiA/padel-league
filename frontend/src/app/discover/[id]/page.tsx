"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'

interface PublicEvent {
  id: string
  title: string
  format: string
  event_date: string
  start_time: string
  location: string
  status: string
  max_players: number
  courts_count: number
}

interface PublicGroupDetail {
  id: string
  name: string
  description: string | null
  created_at: string
  member_count: number
  events: PublicEvent[]
}

export default function DiscoverGroupPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()

  const [group, setGroup] = useState<PublicGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ data: PublicGroupDetail }>(`/api/public/groups/${params.id}`)
      .then((res) => setGroup(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat grup.'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return <p className="max-w-4xl mx-auto px-4 py-16 text-xs text-slate-400">Memuat grup...</p>
  }

  if (error || !group) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-sm text-slate-400">{error || 'Grup tidak ditemukan atau bukan grup publik.'}</p>
        <Link href="/discover" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Jelajahi Grup
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link href="/discover" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Jelajahi Grup
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-900/60 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-extrabold text-white">{group.name}</h1>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-lime-400 bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-800">
            <Users className="h-3.5 w-3.5" />
            {group.member_count} Anggota
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{group.description || 'Tidak ada deskripsi.'}</p>

        <div className="pt-4 border-t border-emerald-900/50">
          {user ? (
            <p className="text-xs text-slate-400">
              Belum jadi anggota grup ini? Hubungi admin grup untuk mendapatkan kode undangan.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-400">Masuk atau daftar untuk mulai bergabung dengan komunitas padel.</p>
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-200 hover:text-white bg-emerald-900/40 border border-emerald-800 px-3.5 py-1.5 rounded-xl"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-3.5 py-1.5 rounded-xl"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-400" />
          Event
        </h2>

        {group.events.length === 0 ? (
          <p className="text-xs text-slate-400 p-5 rounded-2xl glass-card border border-emerald-900/60">
            Belum ada event publik dari grup ini.
          </p>
        ) : (
          <div className="space-y-3">
            {group.events.map((evt) => (
              <div key={evt.id} className="p-5 rounded-2xl glass-card border border-emerald-900/60 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                    {evt.format}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-lg border font-semibold bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                    {evt.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{evt.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    {evt.event_date} • {evt.start_time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    {evt.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
