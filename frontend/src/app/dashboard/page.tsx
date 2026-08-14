"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Calendar,
  ArrowUpRight,
  Clock,
  ChevronRight,
  Plus,
  Trophy,
  Zap,
} from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'

interface GroupMembership {
  role: string
  groups: { id: string; name: string; is_public: boolean }
}

interface EventItem {
  id: string
  group_id: string
  title: string
  format: string
  event_date: string
  start_time: string
  location: string
  status: string
}

interface PlayerStatsSummary {
  matchesPlayed: number
  wins: number
  losses: number
  draws: number
  totalPoints: number
  winRatePercent: number
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<(EventItem & { groupName: string })[]>([])
  const [statsSummary, setStatsSummary] = useState<PlayerStatsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !user) return

    const supabase = createClient()
    supabase
      .from('profiles')
      .select('full_name, skill_level')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name)
          setSkillLevel(data.skill_level)
        }
      })

    apiFetch<{ data: GroupMembership[] }>('/api/groups')
      .then(async (groupsRes) => {
        setMemberships(groupsRes.data)

        const today = new Date().toISOString().slice(0, 10)
        const groupNameById = new Map(groupsRes.data.map((m) => [m.groups.id, m.groups.name]))

        const perGroupEvents = await Promise.all(
          groupsRes.data.map((m) => apiFetch<{ data: EventItem[] }>(`/api/events?group_id=${m.groups.id}`))
        )

        const upcoming = perGroupEvents
          .flatMap((res) => res.data)
          .filter((evt) => evt.event_date >= today && evt.status !== 'Cancelled' && evt.status !== 'Completed')
          .map((evt) => ({ ...evt, groupName: groupNameById.get(evt.group_id) ?? 'Grup' }))
          .sort((a, b) => a.event_date.localeCompare(b.event_date))
          .slice(0, 5)

        setUpcomingEvents(upcoming)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat data dashboard.'))
      .finally(() => setLoading(false))

    apiFetch<{ data: { summary: PlayerStatsSummary } }>('/api/players/me/stats')
      .then((res) => setStatsSummary(res.data.summary))
      .catch(() => {
        // Non-critical for the dashboard — quick-stat cards just fall back to 0 below.
      })
  }, [user, authLoading])

  if (!authLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-lg font-bold text-white">Masuk untuk melihat dashboard Anda</h1>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 rounded-xl"
        >
          Masuk Sekarang
        </Link>
      </div>
    )
  }

  if (authLoading || loading) {
    return <p className="max-w-7xl mx-auto px-4 py-16 text-xs text-slate-400">Memuat dashboard...</p>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900/60 to-slate-950 border border-emerald-700/50 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <SparklesIcon /> Player Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Selamat Datang, {fullName || user?.email}! 👋
          </h1>
          {skillLevel && (
            <p className="text-xs sm:text-sm text-slate-300">
              Skill Level: <span className="text-lime-400 font-bold">{skillLevel}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
          <Link
            href="/events/create"
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-4 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Buat Event Baru
          </Link>
          <Link
            href="/groups/create"
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-200 bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-900/60 px-4 py-2.5 rounded-xl transition-all"
          >
            <Users className="h-4 w-4 text-emerald-400" />
            Buat Grup
          </Link>
        </div>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Grup Diikuti', value: memberships.length, icon: Users },
          { label: 'Event Mendatang', value: upcomingEvents.length, icon: Calendar },
          { label: 'Total Kemenangan', value: statsSummary?.wins ?? 0, icon: Trophy },
          { label: 'Total Poin', value: statsSummary?.totalPoints ?? 0, icon: Zap },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-2xl glass-card border border-emerald-900/50 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-xl sm:text-2xl font-extrabold mt-1 text-emerald-400">{stat.value}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center">
              <stat.icon className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upcoming Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              Event Mendatang
            </h2>
            <Link href="/events" className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-slate-400 p-5 rounded-2xl glass-card border border-emerald-900/60">
                Tidak ada event mendatang di grup Anda.
              </p>
            )}
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl glass-card glass-card-hover border border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                      {evt.format}
                    </span>
                    <span className="text-[10px] text-slate-400">{evt.groupName}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{evt.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      {evt.event_date} • {evt.start_time}
                    </span>
                    <span className="text-emerald-400 font-medium">📍 {evt.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-emerald-900/40">
                  <span className="text-xs px-2.5 py-1 rounded-lg border font-semibold bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                    {evt.status}
                  </span>
                  <Link
                    href={`/events/${evt.id}/live`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-3.5 py-2 rounded-xl"
                  >
                    Buka Live Match
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Joined Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Grup Anda
            </h2>
            <Link href="/groups" className="text-xs font-semibold text-emerald-400 hover:underline">
              Kelola
            </Link>
          </div>

          <div className="space-y-3">
            {memberships.length === 0 && (
              <p className="text-xs text-slate-400 p-4 rounded-2xl glass-card border border-emerald-900/60">
                Anda belum bergabung dengan grup manapun.
              </p>
            )}
            {memberships.map(({ groups: grp, role }) => (
              <div
                key={grp.id}
                className="p-4 rounded-2xl glass-card border border-emerald-900/60 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">{grp.name}</h3>
                  <span className="text-xs text-emerald-400 font-medium">{role}</span>
                </div>

                <Link
                  href={`/groups/${grp.id}`}
                  className="p-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-800 text-slate-300 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}

            <Link
              href="/groups/create"
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-emerald-700/50 hover:border-emerald-500 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Buat Grup Klub Baru
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SparklesIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-lime-400 fill-lime-400" viewBox="0 0 24 24">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  )
}
