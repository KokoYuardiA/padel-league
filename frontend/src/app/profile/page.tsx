"use client"

import { useEffect, useRef, useState } from 'react'
import { User, Phone, Mail, Check, Camera, Save, AlertCircle, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { apiFetch, ApiError } from '@/lib/api'

interface Profile {
  id: string
  full_name: string
  phone_number: string
  skill_level: string
  avatar_url: string | null
  gender: 'Male' | 'Female' | null
}

interface PlayerStatsSummary {
  matchesPlayed: number
  wins: number
  losses: number
  draws: number
  totalPoints: number
  winRatePercent: number
}

interface MatchHistoryItem {
  matchId: string
  eventId: string
  eventTitle: string
  groupName: string
  eventDate: string
  format: string
  myScore: number
  opponentScore: number
  result: 'win' | 'loss' | 'draw'
  opponents: { id: string; full_name: string }[]
}

const RESULT_BADGE: Record<MatchHistoryItem['result'], string> = {
  win: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  loss: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  draw: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
}
const RESULT_LABEL: Record<MatchHistoryItem['result'], string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
}

const skillOptions = [
  { level: 'Beginner', desc: 'Just starting out / beginner' },
  { level: 'Intermediate', desc: 'Has played in events / understands the rules' },
  { level: 'Advanced', desc: 'Regular player with a wide variety of shots' },
  { level: 'Pro', desc: 'Player at national/club competition level' },
]

// Only needed for the Mixed Partner event format (gender-balanced teams) — every
// other format never reads this field. Not collected at signup, only here.
const genderOptions: { value: 'Male' | 'Female'; label: string }[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
]

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [skillLevel, setSkillLevel] = useState('Beginner')
  const [gender, setGender] = useState<'Male' | 'Female' | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [statsSummary, setStatsSummary] = useState<PlayerStatsSummary | null>(null)
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name, phone_number, skill_level, avatar_url, gender')
      .eq('id', user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
        } else if (data) {
          setProfile(data)
          setFullName(data.full_name)
          setPhone(data.phone_number)
          setSkillLevel(data.skill_level)
          setGender(data.gender)
        }
        setLoading(false)
      })
  }, [user, authLoading])

  useEffect(() => {
    if (authLoading || !user) return
    apiFetch<{ data: { summary: PlayerStatsSummary; matches: MatchHistoryItem[] } }>('/api/players/me/stats')
      .then((res) => {
        setStatsSummary(res.data.summary)
        setMatchHistory(res.data.matches)
      })
      .catch((err) => setStatsError(err instanceof ApiError ? err.message : 'Failed to load match history.'))
      .finally(() => setStatsLoading(false))
  }, [user, authLoading])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone_number: phone, skill_level: skillLevel, gender })
      .eq('id', user.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setError('')

    const supabase = createClient()
    const path = `${user.id}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
    })

    if (uploadError) {
      setUploading(false)
      setError(
        `Failed to upload photo: ${uploadError.message}. Make sure a Storage bucket named "avatars" has been created in Supabase.`
      )
      return
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq('id', user.id)

    setUploading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrlData.publicUrl } : prev))
  }

  if (authLoading || loading) {
    return <p className="max-w-3xl mx-auto px-4 py-16 text-xs text-slate-400">Loading profile...</p>
  }

  if (!user) {
    return <p className="max-w-3xl mx-auto px-4 py-16 text-xs text-slate-400">Sign in to view your profile.</p>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-white">Player Profile</h1>
        <p className="text-xs text-slate-400">Manage your personal information and padel skill level.</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-lime-400" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 glass-card p-6 sm:p-8 rounded-3xl border border-emerald-900/60">
        {/* Avatar Upload */}
        <div className="flex items-center gap-6 pb-6 border-b border-emerald-900/50">
          <div className="relative">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={fullName}
                className="h-20 w-20 rounded-full object-cover shadow-xl"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 flex items-center justify-center text-emerald-950 font-extrabold text-2xl shadow-xl">
                {fullName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-900 border border-emerald-500 text-emerald-300 hover:text-white disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{fullName}</h3>
            <p className="text-xs text-slate-400">{uploading ? 'Uploading photo...' : user.email}</p>
            <span className="inline-block mt-2 text-[10px] font-bold bg-emerald-950 text-lime-400 px-2 py-0.5 rounded-md border border-emerald-800">
              {skillLevel} Player
            </span>
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/70" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-emerald-950/70 border border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email (Verified)</label>
            <div className="relative opacity-70">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/70" />
              <input
                type="email"
                disabled
                value={user.email ?? ''}
                className="w-full bg-emerald-950/50 border border-emerald-900 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Phone Number <span className="text-emerald-400 font-normal">(Contact information)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/70" />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-emerald-950/70 border border-emerald-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Skill Level Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Skill Level (Self-Declared)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {skillOptions.map((opt) => (
              <button
                key={opt.level}
                type="button"
                onClick={() => setSkillLevel(opt.level)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  skillLevel === opt.level
                    ? 'bg-emerald-900/60 border-emerald-400 text-white shadow-md'
                    : 'bg-emerald-950/40 border-emerald-900/60 text-slate-400 hover:border-emerald-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{opt.level}</span>
                  {skillLevel === opt.level && <Check className="h-3.5 w-3.5 text-lime-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Gender Selection — only needed for the Mixed Partner event format */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Gender <span className="text-emerald-400 font-normal">(Required to register for Mixed Partner format events)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  gender === opt.value
                    ? 'bg-emerald-900/60 border-emerald-400 text-white shadow-md'
                    : 'bg-emerald-950/40 border-emerald-900/60 text-slate-400 hover:border-emerald-800'
                }`}
              >
                <span className="text-xs font-bold text-white">{opt.label}</span>
                {gender === opt.value && <Check className="h-3.5 w-3.5 text-lime-400" />}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Statistics & Match History */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-lime-400" />
            Statistics & Match History
          </h2>
          <p className="text-xs text-slate-400">Summary of all confirmed matches across groups you have joined.</p>
        </div>

        {statsLoading ? (
          <p className="text-xs text-slate-400">Loading match history...</p>
        ) : statsError ? (
          <p className="text-xs text-rose-400">{statsError}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Matches Played', value: statsSummary?.matchesPlayed ?? 0 },
                { label: 'Wins', value: statsSummary?.wins ?? 0 },
                { label: 'Win Rate', value: `${statsSummary?.winRatePercent ?? 0}%` },
                { label: 'Total Points', value: statsSummary?.totalPoints ?? 0 },
              ].map((stat) => (
                <div key={stat.label} className="p-3.5 rounded-2xl glass-card border border-emerald-900/50">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-lg font-extrabold mt-1 text-emerald-400">{stat.value}</h3>
                </div>
              ))}
            </div>

            {matchHistory.length === 0 ? (
              <p className="text-xs text-slate-400 p-5 rounded-2xl glass-card border border-emerald-900/60">
                No match history yet.
              </p>
            ) : (
              <div className="glass-card rounded-3xl border border-emerald-900/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-emerald-900/80 bg-emerald-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Event / Group</th>
                        <th className="py-3.5 px-4">Format</th>
                        <th className="py-3.5 px-4">Opponent</th>
                        <th className="py-3.5 px-4">Score</th>
                        <th className="py-3.5 px-4 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/40 text-xs">
                      {matchHistory.map((m) => (
                        <tr key={m.matchId} className="hover:bg-emerald-950/40 text-slate-300">
                          <td className="py-3.5 px-4 text-slate-400">{m.eventDate}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-white">{m.eventTitle}</p>
                            <p className="text-[10px] text-slate-400">{m.groupName}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">{m.format}</td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {m.opponents.map((o) => o.full_name).join(' / ') || '-'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {m.myScore} - {m.opponentScore}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg border ${RESULT_BADGE[m.result]}`}>
                              {RESULT_LABEL[m.result]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
