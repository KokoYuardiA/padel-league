"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Lock, Globe, ChevronRight, Search, LogIn } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'

interface GroupMembership {
  role: string
  groups: {
    id: string
    name: string
    description: string | null
    is_public: boolean
    invite_code: string
    created_at: string
    suspended_at: string | null
  }
}

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth()
  const [search, setSearch] = useState('')
  const [memberships, setMemberships] = useState<GroupMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    apiFetch<{ data: GroupMembership[] }>('/api/groups')
      .then((res) => setMemberships(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load groups.'))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  const filteredGroups = memberships.filter((m) =>
    m.groups.name.toLowerCase().includes(search.toLowerCase())
  )

  if (!authLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <LogIn className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
        <h1 className="text-lg font-bold text-emerald-950 dark:text-white">Sign in to view your groups</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Groups you belong to are only visible after signing in.</p>
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 dark:border-emerald-950/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Community & Padel Club Groups
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your groups or join other communities using a link & QR Code.
          </p>
        </div>

        <Link
          href="/groups/create"
          className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-4 py-2.5 rounded-xl shadow-lg transition-all"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Create New Group
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search padel club groups..."
          className="w-full bg-white dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl pl-10 pr-4 py-2 text-xs text-emerald-950 dark:text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
        />
      </div>

      {/* Loading / Error / Empty States */}
      {loading && <p className="text-xs text-slate-500 dark:text-slate-400">Loading groups...</p>}
      {!loading && error && <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>}
      {!loading && !error && filteredGroups.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Users className="h-10 w-10 text-emerald-700 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">You have not joined any groups yet.</p>
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Create Your First Group
          </Link>
        </div>
      )}

      {/* Groups Grid */}
      {!loading && !error && filteredGroups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map(({ groups: grp, role }) => (
            <div
              key={grp.id}
              className="p-6 rounded-3xl glass-card glass-card-hover border border-emerald-200/70 dark:border-emerald-900/60 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {grp.is_public ? <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
                    {grp.is_public ? 'Public Group' : 'Private Group'}
                  </span>
                  {grp.suspended_at && (
                    <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                      Suspended
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-lime-600 dark:text-lime-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {role}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-emerald-950 dark:text-white">{grp.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{grp.description}</p>
              </div>

              <div className="pt-4 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-end">
                <Link
                  href={`/groups/${grp.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition-colors"
                >
                  View Details
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
