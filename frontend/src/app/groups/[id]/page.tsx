"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import {
  QrCode,
  Share2,
  Copy,
  Check,
  Plus,
  Calendar,
  Globe,
  Lock,
  ChevronRight,
  UserCheck,
  Settings,
  Crown,
  ArrowUpDown,
  UserX,
  AlertCircle,
} from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'
import { GroupDetailSkeleton } from '@/components/ui/skeleton'
import { InlineSpinner } from '@/components/ui/inline-spinner'

interface GroupMember {
  role: string
  user_id: string
  profiles: { id: string; full_name: string; skill_level: string; avatar_url: string | null }
}

interface GroupDetail {
  id: string
  name: string
  description: string | null
  is_public: boolean
  invite_code: string
  created_by: string
  created_at: string
  group_members: GroupMember[]
}

interface EventSummary {
  id: string
  title: string
  format: string
  event_date: string
  max_players: number
  status: string
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>()
  const groupId = params.id
  const { user } = useAuth()

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  const [memberActionError, setMemberActionError] = useState('')
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)

  const loadGroup = () =>
    Promise.all([
      apiFetch<{ data: GroupDetail }>(`/api/groups/${groupId}`),
      apiFetch<{ data: EventSummary[] }>(`/api/events?group_id=${groupId}`),
    ]).then(([groupRes, eventsRes]) => {
      setGroup(groupRes.data)
      setEvents(eventsRes.data)
    })

  useEffect(() => {
    if (!groupId) return
    loadGroup()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load group.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const myMembership = group?.group_members.find((m) => m.user_id === user?.id)
  const canCreateEvent = myMembership?.role === 'Organizer' || myMembership?.role === 'Group Admin'
  const isGroupAdmin = myMembership?.role === 'Group Admin'
  const inviteUrl = group && typeof window !== 'undefined'
    ? `${window.location.origin}/groups/join/${group.invite_code}`
    : ''

  const handleCopyLink = () => {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenEditModal = () => {
    if (!group) return
    setEditName(group.name)
    setEditDescription(group.description ?? '')
    setEditIsPublic(group.is_public)
    setSettingsError('')
    setShowEditModal(true)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsError('')
    try {
      const { data } = await apiFetch<{ data: GroupDetail }>(`/api/groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, description: editDescription, is_public: editIsPublic }),
      })
      setGroup((prev) => (prev ? { ...prev, ...data } : prev))
      setShowEditModal(false)
    } catch (err) {
      setSettingsError(err instanceof ApiError ? err.message : 'Failed to save group settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleChangeMemberRole = async (targetUserId: string, role: 'Player' | 'Organizer') => {
    setMemberActionError('')
    setUpdatingMemberId(targetUserId)
    try {
      await apiFetch(`/api/groups/${groupId}/members/${targetUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              group_members: prev.group_members.map((m) =>
                m.user_id === targetUserId ? { ...m, role } : m
              ),
            }
          : prev
      )
    } catch (err) {
      setMemberActionError(err instanceof ApiError ? err.message : 'Failed to change member role.')
    } finally {
      setUpdatingMemberId(null)
    }
  }

  const handleRemoveMember = async (targetUserId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this group?`)) return
    setMemberActionError('')
    setUpdatingMemberId(targetUserId)
    try {
      await apiFetch(`/api/groups/${groupId}/members/${targetUserId}`, { method: 'DELETE' })
      setGroup((prev) =>
        prev ? { ...prev, group_members: prev.group_members.filter((m) => m.user_id !== targetUserId) } : prev
      )
    } catch (err) {
      setMemberActionError(err instanceof ApiError ? err.message : 'Failed to remove member.')
    } finally {
      setUpdatingMemberId(null)
    }
  }

  if (loading) {
    return <GroupDetailSkeleton />
  }

  if (error || !group) {
    return <p className="max-w-7xl mx-auto px-4 py-16 text-xs text-rose-500 dark:text-rose-400">{error || 'Group not found.'}</p>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Group Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-200 dark:border-emerald-800/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200/70 dark:border-emerald-900/50 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                {group.is_public ? <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
                {group.is_public ? 'Public Group' : 'Private Group'}
              </span>
              {myMembership && (
                <span className="text-[10px] font-bold text-lime-600 dark:text-lime-400 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Your Role: {myMembership.role}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-white">{group.name}</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">{group.description}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isGroupAdmin && (
              <button
                onClick={handleOpenEditModal}
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-emerald-100/80 dark:bg-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-300/70 dark:border-emerald-700/50 px-4 py-2.5 rounded-xl transition-all"
              >
                <Settings className="h-4 w-4 text-lime-600 dark:text-lime-400" />
                Edit Group
              </button>
            )}
            <button
              onClick={() => setShowQRModal(true)}
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-emerald-100/80 dark:bg-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-300/70 dark:border-emerald-700/50 px-4 py-2.5 rounded-xl transition-all"
            >
              <QrCode className="h-4 w-4 text-lime-600 dark:text-lime-400" />
              Invite QR Code
            </button>
            {canCreateEvent && (
              <Link
                href="/events/create"
                className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-4 py-2.5 rounded-xl shadow-lg transition-all"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                Create Event
              </Link>
            )}
          </div>
        </div>

        {/* Invite Link Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/40">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 overflow-hidden">
            <Share2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-950 dark:text-white shrink-0">Invite Link:</span>
            <span className="truncate text-slate-500 dark:text-slate-400 select-all font-mono text-[11px]">{inviteUrl}</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-950 bg-lime-400 hover:bg-lime-300 px-3.5 py-1.5 rounded-xl transition-colors shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Main Grid: Events & Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Group Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-emerald-950 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Group Events
            </h2>
            {canCreateEvent && (
              <Link href="/events/create" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                + New Event
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {events.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 p-5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/60">
                No events in this group yet.
              </p>
            )}
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {evt.format}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{evt.event_date}</span>
                  </div>
                  <h3 className="text-base font-bold text-emerald-950 dark:text-white">{evt.title}</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Quota: {evt.max_players} players • {evt.status}</p>
                </div>

                <Link
                  href={`/events/${evt.id}/live`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-3.5 py-2 rounded-xl"
                >
                  Open Event
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Members List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-emerald-950 dark:text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Members ({group.group_members.length})
            </h2>
          </div>

          {memberActionError && (
            <p className="text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {memberActionError}
            </p>
          )}

          <div className="space-y-2.5">
            {group.group_members.map((m) => {
              const isOwner = m.user_id === group.created_by
              const isSelf = m.user_id === user?.id
              const canManage = isGroupAdmin && !isOwner && !isSelf

              return (
                <div
                  key={m.user_id}
                  className="p-3.5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-xs shrink-0">
                      {m.profiles.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-emerald-950 dark:text-white truncate flex items-center gap-1">
                        {m.profiles.full_name}
                        {isOwner && <Crown className="h-3 w-3 text-lime-600 dark:text-lime-400 shrink-0" />}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{m.profiles.skill_level}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        m.role.includes('Admin')
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : m.role.includes('Organizer')
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {m.role}
                    </span>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          disabled={updatingMemberId === m.user_id}
                          onClick={() =>
                            handleChangeMemberRole(m.user_id, m.role === 'Organizer' ? 'Player' : 'Organizer')
                          }
                          title={m.role === 'Organizer' ? 'Make Player' : 'Make Organizer'}
                          className="p-1.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800 text-slate-600 dark:text-slate-300 hover:text-emerald-950 dark:hover:text-white disabled:opacity-40"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={updatingMemberId === m.user_id}
                          onClick={() => handleRemoveMember(m.user_id, m.profiles.full_name)}
                          title="Remove from group"
                          className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:text-rose-800 dark:hover:text-white disabled:opacity-40"
                        >
                          <UserX className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* QR Code Invite Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-emerald-950 border border-emerald-300/70 dark:border-emerald-700/60 p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center space-y-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-emerald-950 dark:text-white">Group Invite QR Code</h3>

            <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-inner">
              <QRCodeSVG value={inviteUrl} size={176} bgColor="#ffffff" fgColor="#04211a" />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Invite code: <strong className="text-emerald-950 dark:text-white font-mono">{group.invite_code}</strong>. Share this
              link or code so players can join <strong className="text-emerald-950 dark:text-white">{group.name}</strong>.
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Group Settings Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white dark:bg-emerald-950 border border-emerald-300/70 dark:border-emerald-700/60 p-6 sm:p-8 rounded-3xl max-w-md w-full space-y-5 relative shadow-2xl"
          >
            <h3 className="text-lg font-bold text-emerald-950 dark:text-white">Edit Group Settings</h3>

            {settingsError && (
              <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {settingsError}
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Group Name</label>
              <input
                type="text"
                required
                minLength={3}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-2.5 text-sm text-emerald-950 dark:text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditIsPublic(true)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  editIsPublic ? 'bg-emerald-100 dark:bg-emerald-900/70 border-emerald-400 text-emerald-950 dark:text-white' : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Public
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditIsPublic(false)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !editIsPublic ? 'bg-emerald-100 dark:bg-emerald-900/70 border-emerald-400 text-emerald-950 dark:text-white' : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Private
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-1/2 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingSettings}
                aria-busy={savingSettings}
                className="w-1/2 py-2.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 rounded-xl shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {savingSettings && <InlineSpinner variant="dark" label="Saving group settings" />}
                <span>{savingSettings ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
