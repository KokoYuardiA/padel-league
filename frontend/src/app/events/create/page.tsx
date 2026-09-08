"use client"

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  RotateCw,
  Flame,
  Sparkles,
  Activity,
  Check,
  AlertCircle,
} from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'

interface GroupMembership {
  role: string
  groups: { id: string; name: string; is_public: boolean }
}

const EVENT_FORMATS = [
  { name: 'Americano', desc: 'Partners and opponents rotate each round. Individual points are accumulated.', icon: RotateCw },
  { name: 'Mexicano', desc: 'Partners are matched based on current standings each round.', icon: Flame },
  { name: 'Fixed Partner', desc: 'Partners stay fixed throughout the event. Opponents rotate each round.', icon: Users },
  { name: 'Mixed Partner', desc: 'Mixed doubles (men and women must be balanced per team).', icon: Sparkles },
  { name: 'Round Robin', desc: 'Every pair/player meets the same opponent exactly once.', icon: Activity },
]

export default function CreateEventPage() {
  return (
    <Suspense fallback={null}>
      <CreateEventForm />
    </Suspense>
  )
}

function CreateEventForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [eligibleGroups, setEligibleGroups] = useState<GroupMembership['groups'][]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [groupId, setGroupId] = useState('')
  const [format, setFormat] = useState('Americano')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [courtsCount, setCourtsCount] = useState(3)
  const [maxPlayers, setMaxPlayers] = useState(12)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ data: GroupMembership[] }>('/api/groups')
      .then((res) => {
        const eligible = res.data
          .filter((m) => m.role === 'Organizer' || m.role === 'Group Admin')
          .map((m) => m.groups)
        setEligibleGroups(eligible)

        const preselect = searchParams.get('group_id')
        if (preselect && eligible.some((g) => g.id === preselect)) {
          setGroupId(preselect)
        } else if (eligible.length > 0) {
          setGroupId(eligible[0].id)
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load groups.'))
      .finally(() => setGroupsLoading(false))
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!groupId) {
      setError('Select an organizing group first.')
      return
    }

    setLoading(true)
    try {
      const { data } = await apiFetch<{ data: { id: string } }>('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          group_id: groupId,
          title,
          format,
          event_date: date,
          start_time: startTime,
          location,
          courts_count: courtsCount,
          max_players: maxPlayers,
        }),
      })
      router.push(`/events/${data.id}/live`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create event. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-emerald-950 dark:text-white flex items-center gap-2">
          <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          Create New Padel Event
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure match details, player quota, and the automatic schedule generation algorithm.
        </p>
      </div>

      {!groupsLoading && eligibleGroups.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            You need to be an Organizer or Group Admin in a group to create an event. Create a new group
            or ask your group admin to make you an Organizer.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6 sm:p-8 rounded-3xl border border-emerald-200/70 dark:border-emerald-900/60">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Event Name</label>
          <input
            type="text"
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Example: Jakarta Padel Open — Round 4"
            className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Select Organizing Group</label>
          <select
            required
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            disabled={eligibleGroups.length === 0}
            className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-400 disabled:opacity-50"
          >
            {eligibleGroups.length === 0 && <option value="">No groups available</option>}
            {eligibleGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.is_public ? 'Public' : 'Private'})
              </option>
            ))}
          </select>
        </div>

        {/* 5 Match Formats Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            Select Match Format (Auto-Scheduler Engine)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EVENT_FORMATS.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setFormat(f.name)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  format === f.name
                    ? 'bg-emerald-100 dark:bg-emerald-900/70 border-emerald-400 text-emerald-950 dark:text-white shadow-md'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-950 dark:text-white flex items-center gap-1.5">
                    <f.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {f.name}
                  </span>
                  {format === f.name && <Check className="h-4 w-4 text-lime-600 dark:text-lime-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Event Details: Date, Location, Courts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-3 py-2.5 text-xs text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Start Time</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-3 py-2.5 text-xs text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Number of Courts</label>
            <input
              type="number"
              min={1}
              max={20}
              value={courtsCount}
              onChange={(e) => setCourtsCount(parseInt(e.target.value) || 1)}
              className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-3 py-2.5 text-xs text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Court Location</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
              <input
                type="text"
                required
                minLength={3}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Padel Pro Kemang"
                className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-emerald-950 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Maximum Players (Quota)</label>
            <input
              type="number"
              min={4}
              max={64}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 4)}
              className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading || eligibleGroups.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-6 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Event...' : 'Create Event'}
            {!loading && <ArrowRight className="h-4 w-4 stroke-[2.5]" />}
          </button>
        </div>
      </form>
    </div>
  )
}
