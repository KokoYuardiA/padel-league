"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Compass, Globe, Users, ChevronRight, Search } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'

interface PublicGroup {
  id: string
  name: string
  description: string | null
  created_at: string
  member_count: number
}

export default function DiscoverPage() {
  const [search, setSearch] = useState('')
  const [groups, setGroups] = useState<PublicGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ data: PublicGroup[] }>('/api/public/groups')
      .then((res) => setGroups(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load public groups.'))
      .finally(() => setLoading(false))
  }, [])

  const filteredGroups = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-950/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <Compass className="h-7 w-7 text-emerald-400" />
            Explore Community Groups
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Public groups visible to anyone. Sign in or register to join via an invite link.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400/70" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search padel club groups..."
          className="w-full bg-emerald-950/70 border border-emerald-800/50 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
        />
      </div>

      {/* Loading / Error / Empty States */}
      {loading && <p className="text-xs text-slate-400">Loading public groups...</p>}
      {!loading && error && <p className="text-xs text-rose-400">{error}</p>}
      {!loading && !error && filteredGroups.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Compass className="h-10 w-10 text-emerald-700 mx-auto" />
          <p className="text-sm text-slate-400">No public groups to explore yet.</p>
        </div>
      )}

      {/* Groups Grid */}
      {!loading && !error && filteredGroups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((grp) => (
            <div
              key={grp.id}
              className="p-6 rounded-3xl glass-card glass-card-hover border border-emerald-900/60 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-800">
                    <Globe className="h-3 w-3 text-emerald-400" />
                    Public Group
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-lime-400 bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-800">
                    <Users className="h-3 w-3" />
                    {grp.member_count}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{grp.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{grp.description}</p>
              </div>

              <div className="pt-4 border-t border-emerald-900/40 flex items-center justify-end">
                <Link
                  href={`/discover/${grp.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-200 hover:text-emerald-400 hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition-colors"
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
