"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Plus, Clock, MapPin, ChevronRight, LogIn } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'

interface GroupMembership {
  role: string
  groups: { id: string; name: string }
}

interface EventItem {
  id: string
  group_id: string
  title: string
  format: string
  event_date: string
  start_time: string
  location: string
  courts_count: number
  max_players: number
  status: string
}

export default function EventsPage() {
  const { user, loading: authLoading } = useAuth()
  const [events, setEvents] = useState<(EventItem & { groupName: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    apiFetch<{ data: GroupMembership[] }>('/api/groups')
      .then(async (groupsRes) => {
        const groupNameById = new Map(groupsRes.data.map((m) => [m.groups.id, m.groups.name]))

        const perGroupEvents = await Promise.all(
          groupsRes.data.map((m) =>
            apiFetch<{ data: EventItem[] }>(`/api/events?group_id=${m.groups.id}`)
          )
        )

        const merged = perGroupEvents
          .flatMap((res) => res.data)
          .map((evt) => ({ ...evt, groupName: groupNameById.get(evt.group_id) ?? 'Group' }))
          .sort((a, b) => a.event_date.localeCompare(b.event_date))

        setEvents(merged)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load events.'))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  if (!authLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <LogIn className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
        <h1 className="text-lg font-bold text-emerald-950 dark:text-white">Sign in to view events</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Events are only visible from groups you have joined.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 rounded-xl"
        >
          Sign In Now
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 dark:border-emerald-950/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-white flex items-center gap-2">
            <Calendar className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Padel Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            List of events from groups you have joined. Select an event to join or view live scores.
          </p>
        </div>

        <Link
          href="/events/create"
          className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Create New Event
        </Link>
      </div>

      {loading && <p className="text-xs text-slate-500 dark:text-slate-400">Loading events...</p>}
      {!loading && error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Calendar className="h-10 w-10 text-emerald-700 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No events yet in your groups.</p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-6 rounded-3xl glass-card glass-card-hover border border-emerald-200/70 dark:border-emerald-900/60 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {evt.format}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      evt.status === 'In Progress'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 animate-pulse'
                        : evt.status === 'Open'
                        ? 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-emerald-950 dark:text-white">{evt.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Group: {evt.groupName}</p>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{evt.event_date} • {evt.start_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{evt.location} ({evt.courts_count} Courts)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Quota: <span className="font-bold text-emerald-950 dark:text-white">{evt.max_players}</span> Players
                </div>

                <Link
                  href={`/events/${evt.id}/live`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-3.5 py-1.5 rounded-xl"
                >
                  Details & Live
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
