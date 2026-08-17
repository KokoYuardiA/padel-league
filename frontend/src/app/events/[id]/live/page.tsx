"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Trophy,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  CircleDot,
  Edit3,
  UserCheck,
  LogIn,
  Hourglass,
  Settings2,
  ShieldAlert,
  Users,
  Wand2,
} from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'
import { getSocket } from '@/lib/socket'

interface PlayerRef {
  id: string
  full_name: string
}

type MatchStatus = 'in_progress' | 'pending_confirmation' | 'confirmed' | 'disputed'

interface MatchItem {
  id: string
  round_number: number
  court_number: number
  score_a: number | null
  score_b: number | null
  status: MatchStatus
  reported_by: string | null
  needs_confirm_by: string | null
  team_a_player1: PlayerRef
  team_a_player2: PlayerRef | null
  team_b_player1: PlayerRef
  team_b_player2: PlayerRef | null
}

interface Registration {
  id: string
  status: 'registered' | 'waiting_list' | 'withdrawn'
  registered_at: string
  waiting_list_position: number | null
  profiles: { id: string; full_name: string; skill_level: string }
}

interface EventDetail {
  id: string
  group_id: string
  title: string
  format: string
  event_date: string
  location: string
  status: string
  max_players: number
  registrations: Registration[]
}

interface MatchPatchResult {
  id: string
  score_a: number | null
  score_b: number | null
  status: MatchStatus
  reported_by: string | null
  needs_confirm_by: string | null
}

interface GroupMembership {
  role: string
  groups: { id: string }
}

const EVENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  Draft: ['Open', 'Cancelled'],
  Open: ['Full', 'In Progress', 'Cancelled'],
  Full: ['Open', 'In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
}

function mergeMatchUpdate(prev: MatchItem[], patch: MatchPatchResult): MatchItem[] {
  return prev.map((m) =>
    m.id === patch.id
      ? {
          ...m,
          score_a: patch.score_a,
          score_b: patch.score_b,
          status: patch.status,
          reported_by: patch.reported_by,
          needs_confirm_by: patch.needs_confirm_by,
        }
      : m
  )
}

export default function EventLivePage() {
  const params = useParams<{ id: string }>()
  const eventId = params.id
  const { user, loading: authLoading } = useAuth()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [myGroupRole, setMyGroupRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard' | 'participants'>('matches')
  const [registering, setRegistering] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)
  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [generatingNextRound, setGeneratingNextRound] = useState(false)
  const [scheduleWarning, setScheduleWarning] = useState('')

  const [showInputModal, setShowInputModal] = useState(false)
  const [scoreModalMode, setScoreModalMode] = useState<'self' | 'override'>('self')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null)
  const [scoreTeamA, setScoreTeamA] = useState(21)
  const [scoreTeamB, setScoreTeamB] = useState(15)
  const [actionError, setActionError] = useState('')

  const isOrganizerOrAdmin = myGroupRole === 'Organizer' || myGroupRole === 'Group Admin'

  const loadData = () => {
    if (!eventId) return Promise.resolve()
    return Promise.all([
      apiFetch<{ data: EventDetail }>(`/api/events/${eventId}`),
      apiFetch<{ data: MatchItem[] }>(`/api/matches?event_id=${eventId}`),
      apiFetch<{ data: GroupMembership[] }>('/api/groups'),
    ]).then(([eventRes, matchesRes, groupsRes]) => {
      // Backend returns `registrations: null` (not []) when an event has no
      // registrations yet — normalize so array methods below never throw.
      setEvent({ ...eventRes.data, registrations: eventRes.data.registrations ?? [] })
      setMatches(matchesRes.data)
      const membership = groupsRes.data.find((g) => g.groups.id === eventRes.data.group_id)
      setMyGroupRole(membership?.role ?? null)
    })
  }

  useEffect(() => {
    if (!eventId || authLoading || !user) return
    setLoading(true)
    loadData()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load event.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, authLoading, user])

  useEffect(() => {
    if (!eventId || !user) return
    const socket = getSocket()
    socket.connect()
    socket.emit('join:event', eventId)

    const onScoreUpdated = ({ match }: { match: MatchPatchResult }) =>
      setMatches((prev) => mergeMatchUpdate(prev, match))
    const onScoreConfirmed = ({ match }: { match: MatchPatchResult }) =>
      setMatches((prev) => mergeMatchUpdate(prev, match))
    const onScoreDisputed = ({ match }: { match: MatchPatchResult }) =>
      setMatches((prev) => mergeMatchUpdate(prev, match))
    // Unlike the single-match patches above, a freshly generated schedule
    // didn't exist before — this is a full-array replace, not a merge.
    const onScheduleGenerated = ({ matches: newMatches }: { matches: MatchItem[] }) =>
      setMatches(newMatches)
    // A withdrawal (or the auto-promotion it triggers) changes more than just
    // the caller's own row — everyone's waiting-list position can shift — so
    // this is a full-array replace of `registrations`, not a per-row merge.
    const onRegistrationsUpdated = ({ registrations }: { registrations: Registration[] }) =>
      setEvent((prev) => (prev ? { ...prev, registrations } : prev))

    socket.on('score:updated', onScoreUpdated)
    socket.on('score:confirmed', onScoreConfirmed)
    socket.on('score:disputed', onScoreDisputed)
    socket.on('schedule:generated', onScheduleGenerated)
    socket.on('registrations:updated', onRegistrationsUpdated)

    return () => {
      socket.emit('leave:event', eventId)
      socket.off('score:updated', onScoreUpdated)
      socket.off('score:confirmed', onScoreConfirmed)
      socket.off('score:disputed', onScoreDisputed)
      socket.off('schedule:generated', onScheduleGenerated)
      socket.off('registrations:updated', onRegistrationsUpdated)
      socket.disconnect()
    }
  }, [eventId, user])

  const myRegistration = event?.registrations.find((r) => r.profiles.id === user?.id)
  const canWithdraw = !!event && ['Open', 'Full', 'In Progress'].includes(event.status)

  const registeredParticipants = useMemo(
    () =>
      (event?.registrations ?? [])
        .filter((r) => r.status === 'registered')
        .sort((a, b) => a.registered_at.localeCompare(b.registered_at)),
    [event]
  )
  const waitingListParticipants = useMemo(
    () =>
      (event?.registrations ?? [])
        .filter((r) => r.status === 'waiting_list')
        .sort((a, b) => a.registered_at.localeCompare(b.registered_at)),
    [event]
  )

  const handleRegister = async () => {
    if (!eventId) return
    setRegistering(true)
    setActionError('')
    try {
      await apiFetch(`/api/events/${eventId}/register`, { method: 'POST' })
      await loadData()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to register.')
    } finally {
      setRegistering(false)
    }
  }

  const handleWithdraw = async () => {
    if (!eventId) return
    setWithdrawing(true)
    setActionError('')
    try {
      const res = await apiFetch<{ data: Registration[] }>(`/api/events/${eventId}/withdraw`, {
        method: 'POST',
      })
      setEvent((prev) => (prev ? { ...prev, registrations: res.data } : prev))
      setShowWithdrawConfirm(false)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel registration.')
    } finally {
      setWithdrawing(false)
    }
  }

  const handlePromote = async (registrationId: string) => {
    if (!eventId) return
    setPromotingId(registrationId)
    setActionError('')
    try {
      const res = await apiFetch<{ data: Registration[] }>(
        `/api/events/${eventId}/registrations/${registrationId}/promote`,
        { method: 'POST' }
      )
      setEvent((prev) => (prev ? { ...prev, registrations: res.data } : prev))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to promote player.')
    } finally {
      setPromotingId(null)
    }
  }

  const isPlayerInMatch = (m: MatchItem) =>
    !!user &&
    [m.team_a_player1.id, m.team_a_player2?.id, m.team_b_player1.id, m.team_b_player2?.id].includes(user.id)

  const handleOpenScoreModal = (m: MatchItem) => {
    setSelectedMatch(m)
    setScoreTeamA(m.score_a ?? 21)
    setScoreTeamB(m.score_b ?? 15)
    setScoreModalMode('self')
    setActionError('')
    setShowInputModal(true)
  }

  const handleOpenOverrideModal = (m: MatchItem) => {
    setSelectedMatch(m)
    setScoreTeamA(m.score_a ?? 21)
    setScoreTeamB(m.score_b ?? 15)
    setScoreModalMode('override')
    setActionError('')
    setShowInputModal(true)
  }

  const handleSaveScore = async () => {
    if (!selectedMatch) return
    setActionError('')
    const endpoint =
      scoreModalMode === 'override'
        ? `/api/matches/${selectedMatch.id}/override`
        : `/api/matches/${selectedMatch.id}/score`
    try {
      const { data } = await apiFetch<{ data: MatchPatchResult }>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ score_a: scoreTeamA, score_b: scoreTeamB }),
      })
      setMatches((prev) => mergeMatchUpdate(prev, data))
      setShowInputModal(false)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to save score.')
    }
  }

  const handleChangeStatus = async (nextStatus: string) => {
    if (!eventId) return
    setChangingStatus(true)
    setActionError('')
    try {
      const { data } = await apiFetch<{ data: { status: string } }>(`/api/events/${eventId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setEvent((prev) => (prev ? { ...prev, status: data.status } : prev))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to change event status.')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleGenerateSchedule = async () => {
    if (!eventId) return
    setGeneratingSchedule(true)
    setActionError('')
    setScheduleWarning('')
    try {
      const { data, warning } = await apiFetch<{ data: MatchItem[]; warning?: string }>(
        `/api/events/${eventId}/generate-schedule`,
        { method: 'POST' }
      )
      setMatches(data)
      if (warning) setScheduleWarning(warning)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create match schedule.')
    } finally {
      setGeneratingSchedule(false)
    }
  }

  const handleGenerateNextRound = async () => {
    if (!eventId) return
    setGeneratingNextRound(true)
    setActionError('')
    setScheduleWarning('')
    try {
      const { data, warning } = await apiFetch<{ data: MatchItem[]; warning?: string }>(
        `/api/events/${eventId}/generate-next-round`,
        { method: 'POST' }
      )
      setMatches(data)
      if (warning) setScheduleWarning(warning)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to create next round.')
    } finally {
      setGeneratingNextRound(false)
    }
  }

  const handleConfirmScore = (m: MatchItem) => {
    setSelectedMatch(m)
    setActionError('')
    setShowConfirmModal(true)
  }

  const handleResolve = async (action: 'confirm' | 'dispute') => {
    if (!selectedMatch) return
    setActionError('')
    try {
      const { data } = await apiFetch<{ data: MatchPatchResult }>(`/api/matches/${selectedMatch.id}/confirm`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      setMatches((prev) => mergeMatchUpdate(prev, data))
      setShowConfirmModal(false)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to process confirmation.')
    }
  }

  const rounds = useMemo(() => {
    const byRound = new Map<number, MatchItem[]>()
    for (const m of matches) {
      if (!byRound.has(m.round_number)) byRound.set(m.round_number, [])
      byRound.get(m.round_number)!.push(m)
    }
    return [...byRound.entries()]
      .sort(([a], [b]) => a - b)
      .map(([round, ms]) => [round, ms.sort((a, b) => a.court_number - b.court_number)] as const)
  }, [matches])

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of matches) {
      for (const p of [m.team_a_player1, m.team_a_player2, m.team_b_player1, m.team_b_player2]) {
        if (p) map.set(p.id, p.full_name)
      }
    }
    return map
  }, [matches])

  const leaderboard = useMemo(() => {
    const points: Record<string, number> = {}
    const played: Record<string, number> = {}
    const wins: Record<string, number> = {}

    for (const m of matches) {
      if (m.status !== 'confirmed' || m.score_a === null || m.score_b === null) continue
      const teamA = [m.team_a_player1.id, m.team_a_player2?.id].filter(Boolean) as string[]
      const teamB = [m.team_b_player1.id, m.team_b_player2?.id].filter(Boolean) as string[]

      for (const p of teamA) {
        points[p] = (points[p] ?? 0) + m.score_a
        played[p] = (played[p] ?? 0) + 1
        if (m.score_a > m.score_b) wins[p] = (wins[p] ?? 0) + 1
      }
      for (const p of teamB) {
        points[p] = (points[p] ?? 0) + m.score_b
        played[p] = (played[p] ?? 0) + 1
        if (m.score_b > m.score_a) wins[p] = (wins[p] ?? 0) + 1
      }
    }

    return Object.entries(points)
      .map(([userId, pts]) => ({
        userId,
        name: nameById.get(userId) ?? 'Player',
        points: pts,
        matchesPlayed: played[userId] ?? 0,
        winRate: played[userId] ? Math.round(((wins[userId] ?? 0) / played[userId]) * 100) : 0,
      }))
      .sort((a, b) => b.points - a.points)
      .map((row, i) => ({ ...row, rank: i + 1 }))
  }, [matches, nameById])

  if (!authLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <LogIn className="h-10 w-10 text-emerald-400 mx-auto" />
        <h1 className="text-lg font-bold text-white">Sign in to view this event</h1>
      </div>
    )
  }

  if (loading) {
    return <p className="max-w-7xl mx-auto px-4 py-16 text-xs text-slate-400">Loading event...</p>
  }

  if (error || !event) {
    return <p className="max-w-7xl mx-auto px-4 py-16 text-xs text-rose-400">{error || 'Event not found.'}</p>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Live Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900/80 to-slate-950 border border-emerald-700/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> Live Event Engine
            </span>
            <span className="text-xs bg-emerald-950 text-lime-400 px-2.5 py-0.5 rounded-full border border-emerald-800 font-semibold">
              Format: {event.format}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{event.title}</h1>
          <p className="text-xs text-slate-300">
            {event.event_date} • {event.location} • Status: <span className="font-semibold text-white">{event.status}</span>
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 shrink-0">
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-emerald-400 to-lime-400 text-emerald-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Matches
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-emerald-400 to-lime-400 text-emerald-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Current Standings
          </button>
          {isOrganizerOrAdmin && (
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'participants'
                  ? 'bg-gradient-to-r from-emerald-400 to-lime-400 text-emerald-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Participants ({event.registrations.length})
            </button>
          )}
        </div>
      </div>

      {/* Organizer: Event Status Control */}
      {isOrganizerOrAdmin && (
        <div className="p-4 rounded-2xl glass-card border border-amber-800/40 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Organizer Controls — Current status: <strong className="text-white">{event.status}</strong>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {matches.length === 0 && ['Open', 'Full', 'In Progress'].includes(event.status) && (
              registeredParticipants.length >= 4 ? (
                <button
                  onClick={handleGenerateSchedule}
                  disabled={generatingSchedule}
                  className="text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 to-lime-300 hover:from-amber-200 hover:to-lime-200 px-3.5 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {generatingSchedule ? 'Creating schedule...' : 'Generate Schedule'}
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">
                  At least 4 registered players are required to generate a schedule (currently: {registeredParticipants.length}).
                </span>
              )
            )}
            {matches.length === 0 && !['Open', 'Full', 'In Progress'].includes(event.status) && (
              <span className="text-[11px] text-slate-500">
                Change the event status to Open first to open registration before you can generate a schedule.
              </span>
            )}
            {event.format === 'Mexicano' &&
              matches.length > 0 &&
              ['Open', 'Full', 'In Progress'].includes(event.status) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateNextRound}
                    disabled={generatingNextRound || !matches.every((m) => m.status === 'confirmed')}
                    title={
                      matches.every((m) => m.status === 'confirmed')
                        ? undefined
                        : 'Finish all scores for this round first (use Override if any are stuck)'
                    }
                    className="text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 to-lime-300 hover:from-amber-200 hover:to-lime-200 px-3.5 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {generatingNextRound ? 'Creating round...' : 'Generate Next Round'}
                  </button>
                  {!matches.every((m) => m.status === 'confirmed') && (
                    <span className="text-[11px] text-slate-500">Waiting for all scores in this round to be confirmed.</span>
                  )}
                </div>
              )}
            {EVENT_STATUS_TRANSITIONS[event.status]?.length ? (
              EVENT_STATUS_TRANSITIONS[event.status].map((next) => (
                <button
                  key={next}
                  onClick={() => handleChangeStatus(next)}
                  disabled={changingStatus}
                  className="text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-3.5 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {changingStatus ? '...' : `→ ${next}`}
                </button>
              ))
            ) : (
              <span className="text-[11px] text-slate-500">Final status, no further transitions available.</span>
            )}
          </div>
        </div>
      )}

      {/* Registration Bar */}
      {actionError && <p className="text-xs text-rose-400">{actionError}</p>}
      {scheduleWarning && <p className="text-xs text-amber-300">⚠️ {scheduleWarning}</p>}
      {!myRegistration && event.status === 'Open' && (
        <div className="p-4 rounded-2xl glass-card border border-emerald-900/60 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-300">You are not registered for this event yet.</p>
          <button
            onClick={handleRegister}
            disabled={registering}
            className="text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2 rounded-xl disabled:opacity-50 shrink-0"
          >
            {registering ? 'Registering...' : 'Register Now'}
          </button>
        </div>
      )}
      {myRegistration?.status === 'registered' && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-emerald-400">✓ You are registered for this event.</p>
          {canWithdraw && (
            <button
              onClick={() => setShowWithdrawConfirm(true)}
              className="text-xs font-semibold text-rose-300 underline hover:text-rose-200"
            >
              Cancel Registration
            </button>
          )}
        </div>
      )}
      {myRegistration?.status === 'waiting_list' && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-amber-300 flex items-center gap-1.5">
            <Hourglass className="h-3.5 w-3.5" /> You are on the waitlist (#{myRegistration?.waiting_list_position}).
          </p>
          {canWithdraw && (
            <button
              onClick={() => setShowWithdrawConfirm(true)}
              className="text-xs font-semibold text-rose-300 underline hover:text-rose-200"
            >
              Cancel Registration
            </button>
          )}
        </div>
      )}

      {/* MATCHES VIEW */}
      {activeTab === 'matches' && (
        <div className="space-y-8">
          {rounds.length === 0 && (
            <p className="text-xs text-slate-400 p-5 rounded-2xl glass-card border border-emerald-900/60">
              The match schedule has not been created yet. Waiting for the Organizer to close registration and generate the schedule.
            </p>
          )}

          {rounds.map(([round, roundMatches]) => (
            <div key={round} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <RotateCw className="h-5 w-5 text-emerald-400" />
                  Round {round}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roundMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-3xl glass-card border border-emerald-900/60 space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold bg-emerald-950 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-800">
                          Court {m.court_number}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${
                            m.status === 'confirmed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : m.status === 'pending_confirmation'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : m.status === 'disputed'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {m.status === 'confirmed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {m.status === 'pending_confirmation' && <CircleDot className="h-3.5 w-3.5 animate-spin" />}
                          {m.status === 'disputed' && <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
                          {m.status === 'in_progress' && <Radio className="h-3.5 w-3.5 animate-pulse" />}
                          {m.status === 'confirmed'
                            ? 'Confirmed'
                            : m.status === 'pending_confirmation'
                            ? 'Wait Confirm'
                            : m.status === 'disputed'
                            ? 'Disputed'
                            : 'Playing'}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-white block">{m.team_a_player1.full_name}</span>
                            {m.team_a_player2 && (
                              <span className="text-xs font-bold text-slate-300 block">{m.team_a_player2.full_name}</span>
                            )}
                          </div>
                          <span className="text-xl font-extrabold text-lime-400">
                            {m.score_a !== null ? m.score_a : '-'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-white block">{m.team_b_player1.full_name}</span>
                            {m.team_b_player2 && (
                              <span className="text-xs font-bold text-slate-300 block">{m.team_b_player2.full_name}</span>
                            )}
                          </div>
                          <span className="text-xl font-extrabold text-slate-400">
                            {m.score_b !== null ? m.score_b : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-emerald-900/40 space-y-2">
                      {m.status === 'disputed' && isPlayerInMatch(m) && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-rose-300 text-center font-medium">
                            ⚠️ The previous score was disputed. Please re-enter the score.
                          </p>
                          <button
                            onClick={() => handleOpenScoreModal(m)}
                            className="w-full py-2.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-rose-400 to-amber-300 hover:from-rose-300 hover:to-amber-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Re-enter Score
                          </button>
                        </div>
                      )}

                      {m.status === 'in_progress' && isPlayerInMatch(m) && (
                        <button
                          onClick={() => handleOpenScoreModal(m)}
                          className="w-full py-2.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Enter Match Score
                        </button>
                      )}

                      {m.status === 'in_progress' && !isPlayerInMatch(m) && (
                        <p className="text-[10px] text-slate-500 text-center">Waiting for score from players.</p>
                      )}

                      {m.status === 'pending_confirmation' && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-amber-300 text-center">
                            Entered by {nameById.get(m.reported_by ?? '') ?? 'Player'}. Waiting for opponent confirmation.
                          </p>
                          {m.needs_confirm_by === user?.id && (
                            <button
                              onClick={() => handleConfirmScore(m)}
                              className="w-full py-2 text-xs font-bold text-emerald-950 bg-lime-400 hover:bg-lime-300 rounded-xl transition-all flex items-center justify-center gap-1.5"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Confirm / Dispute Score
                            </button>
                          )}
                        </div>
                      )}

                      {m.status === 'confirmed' && (
                        <p className="text-[10px] text-emerald-400 text-center font-medium">
                          ✓ Final score confirmed and added to standings
                        </p>
                      )}

                      {isOrganizerOrAdmin && (
                        <button
                          onClick={() => handleOpenOverrideModal(m)}
                          className="w-full py-1.5 text-[10px] font-semibold text-amber-300 hover:text-amber-200 flex items-center justify-center gap-1.5"
                        >
                          <ShieldAlert className="h-3 w-3" />
                          Override Score (Organizer)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEADERBOARD VIEW */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-lime-400" />
              Individual Points Standings
            </h2>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-400 p-5 rounded-2xl glass-card border border-emerald-900/60">
              No confirmed scores yet.
            </p>
          ) : (
            <div className="glass-card rounded-3xl border border-emerald-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-900/80 bg-emerald-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Rank</th>
                      <th className="py-3.5 px-4">Player Name</th>
                      <th className="py-3.5 px-4">Matches Played</th>
                      <th className="py-3.5 px-4">Win Rate</th>
                      <th className="py-3.5 px-4 text-right">Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40 text-xs">
                    {leaderboard.map((row) => (
                      <tr
                        key={row.userId}
                        className={
                          row.rank === 1
                            ? 'bg-gradient-to-r from-emerald-900/50 to-lime-950/30 font-bold text-white'
                            : 'hover:bg-emerald-950/40 text-slate-300'
                        }
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-300">#{row.rank}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{row.name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{row.matchesPlayed} Matches</td>
                        <td className="py-3.5 px-4 text-emerald-400">{row.winRate}%</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-lime-400 text-sm">{row.points} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PARTICIPANTS VIEW (Organizer / Group Admin only) */}
      {activeTab === 'participants' && isOrganizerOrAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Registered Participants
            </h2>
            <span className="text-xs text-slate-400">
              <span className="text-white font-bold">{registeredParticipants.length}</span> / {event.max_players} quota
              {waitingListParticipants.length > 0 && (
                <>
                  {' '}• <span className="text-amber-300 font-bold">{waitingListParticipants.length}</span> on waitlist
                </>
              )}
            </span>
          </div>

          {event.registrations.length === 0 ? (
            <p className="text-xs text-slate-400 p-5 rounded-2xl glass-card border border-emerald-900/60">
              No participants have registered yet.
            </p>
          ) : (
            <div className="glass-card rounded-3xl border border-emerald-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-900/80 bg-emerald-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">#</th>
                      <th className="py-3.5 px-4">Player Name</th>
                      <th className="py-3.5 px-4">Skill Level</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Registered On</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40 text-xs">
                    {[...registeredParticipants, ...waitingListParticipants].map((r, i) => (
                      <tr key={r.id} className="hover:bg-emerald-950/40 text-slate-300">
                        <td className="py-3.5 px-4 font-bold text-slate-400">{i + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {r.profiles.full_name}
                          {r.profiles.id === user?.id && (
                            <span className="ml-1.5 text-[10px] text-emerald-400 font-normal">(You)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{r.profiles.skill_level}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              r.status === 'registered'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {r.status === 'registered'
                              ? 'Registered'
                              : `Waitlist${r.waiting_list_position ? ` (#${r.waiting_list_position})` : ''}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(r.registered_at).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {r.status === 'waiting_list' && (
                            <button
                              onClick={() => handlePromote(r.id)}
                              disabled={promotingId === r.id}
                              className="text-[11px] font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-2.5 py-1 rounded-lg disabled:opacity-50"
                            >
                              {promotingId === r.id ? 'Processing...' : 'Promote'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INPUT SCORE MODAL */}
      {showInputModal && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-emerald-950 border border-emerald-700/60 p-6 rounded-3xl max-w-md w-full space-y-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {scoreModalMode === 'override' ? 'Override Score (Organizer)' : 'Enter Score'} — Court{' '}
              {selectedMatch.court_number}
            </h3>
            {scoreModalMode === 'override' && (
              <p className="text-[11px] text-amber-300 -mt-4">
                This score is immediately final and does not require opponent confirmation.
              </p>
            )}

            {actionError && <p className="text-xs text-rose-400">{actionError}</p>}

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-800/50 space-y-2">
                <span className="text-xs font-bold text-emerald-300">
                  Team A: {[selectedMatch.team_a_player1.full_name, selectedMatch.team_a_player2?.full_name].filter(Boolean).join(' / ')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={scoreTeamA}
                  onChange={(e) => setScoreTeamA(parseInt(e.target.value) || 0)}
                  className="w-full bg-emerald-950 border border-emerald-700 rounded-xl p-2.5 text-center text-xl font-extrabold text-lime-400"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-800/50 space-y-2">
                <span className="text-xs font-bold text-slate-300">
                  Team B: {[selectedMatch.team_b_player1.full_name, selectedMatch.team_b_player2?.full_name].filter(Boolean).join(' / ')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={scoreTeamB}
                  onChange={(e) => setScoreTeamB(parseInt(e.target.value) || 0)}
                  className="w-full bg-emerald-950 border border-emerald-700 rounded-xl p-2.5 text-center text-xl font-extrabold text-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowInputModal(false)}
                className="w-1/2 py-2.5 text-xs font-semibold text-slate-300 bg-emerald-900/40 border border-emerald-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScore}
                className="w-1/2 py-2.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 rounded-xl shadow-lg"
              >
                {scoreModalMode === 'override' ? 'Save Override' : 'Submit Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION / DISPUTE MODAL */}
      {showConfirmModal && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-emerald-950 border border-emerald-700/60 p-6 rounded-3xl max-w-md w-full space-y-6 relative shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Confirm Match Score</h3>
              <p className="text-xs text-slate-300 mt-1">
                {nameById.get(selectedMatch.reported_by ?? '') ?? 'Player'} has entered a score:{' '}
                <strong className="text-lime-400">
                  {selectedMatch.score_a} - {selectedMatch.score_b}
                </strong>
                .
              </p>
              {actionError && <p className="text-xs text-rose-400 mt-2">{actionError}</p>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleResolve('dispute')}
                className="w-1/2 py-2.5 text-xs font-semibold text-rose-300 bg-rose-900/30 border border-rose-800 rounded-xl hover:bg-rose-900/50"
              >
                Dispute
              </button>
              <button
                onClick={() => handleResolve('confirm')}
                className="w-1/2 py-2.5 text-xs font-bold text-emerald-950 bg-lime-400 hover:bg-lime-300 rounded-xl shadow-lg"
              >
                Confirm Correct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW CONFIRMATION MODAL */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-emerald-950 border border-emerald-700/60 p-6 rounded-3xl max-w-md w-full space-y-6 relative shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Cancel Registration?</h3>
              <p className="text-xs text-slate-300 mt-1">
                You will leave this event. If there are players on the waitlist, one will
                automatically be promoted to take your slot.
              </p>
              {actionError && <p className="text-xs text-rose-400 mt-2">{actionError}</p>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowWithdrawConfirm(false)}
                disabled={withdrawing}
                className="w-1/2 py-2.5 text-xs font-semibold text-slate-300 bg-emerald-900/40 border border-emerald-800 rounded-xl hover:bg-emerald-900/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg disabled:opacity-50"
              >
                {withdrawing ? 'Processing...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
