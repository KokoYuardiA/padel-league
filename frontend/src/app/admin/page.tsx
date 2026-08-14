"use client"

import { useEffect, useState } from 'react'
import { ShieldAlert, Users, Globe, Lock, Ban, CheckCircle2 } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'

interface AdminGroup {
  id: string
  name: string
  description: string | null
  is_public: boolean
  suspended_at: string | null
  created_by: string
  created_at: string
  member_count: number
}

interface AdminUser {
  id: string
  email: string | null
  auth_created_at: string
  full_name: string | null
  phone_number: string | null
  skill_level: string | null
}

export default function AdminPage() {
  const { loading: authLoading } = useAuth()

  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    apiFetch<{ data: AdminGroup[] }>('/api/admin/groups')
      .then(async (groupsRes) => {
        setGroups(groupsRes.data)
        const usersRes = await apiFetch<{ data: AdminUser[] }>('/api/admin/users')
        setUsers(usersRes.data)
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setAccessDenied(true)
        } else {
          setError(err instanceof ApiError ? err.message : 'Gagal memuat data admin.')
        }
      })
      .finally(() => setLoading(false))
  }, [authLoading])

  const toggleSuspend = async (group: AdminGroup) => {
    setBusyGroupId(group.id)
    setActionError('')
    const action = group.suspended_at ? 'unsuspend' : 'suspend'
    try {
      const res = await apiFetch<{ data: AdminGroup }>(`/api/admin/groups/${group.id}/${action}`, {
        method: 'PATCH',
      })
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, suspended_at: res.data.suspended_at } : g)))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengubah status grup.')
    } finally {
      setBusyGroupId(null)
    }
  }

  if (authLoading || loading) {
    return <p className="max-w-6xl mx-auto px-4 py-16 text-xs text-slate-400">Memuat...</p>
  }

  if (accessDenied) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto" />
        <h1 className="text-lg font-bold text-white">Anda bukan Platform Admin.</h1>
        <p className="text-xs text-slate-400">Halaman ini hanya bisa diakses oleh Platform Admin.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-lime-400" />
          Platform Admin
        </h1>
        <p className="text-xs text-slate-400">Lihat seluruh grup & pengguna platform, dan suspend grup bila diperlukan.</p>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {actionError && <p className="text-xs text-rose-400">{actionError}</p>}

      {/* Groups Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">Semua Grup ({groups.length})</h2>
        <div className="glass-card rounded-3xl border border-emerald-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-900/80 bg-emerald-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nama</th>
                  <th className="py-3.5 px-4">Visibilitas</th>
                  <th className="py-3.5 px-4">Anggota</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40 text-xs">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-emerald-950/40 text-slate-300">
                    <td className="py-3.5 px-4 font-bold text-white">{g.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                        {g.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3 text-amber-400" />}
                        {g.is_public ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{g.member_count}</td>
                    <td className="py-3.5 px-4">
                      {g.suspended_at ? (
                        <span className="text-[10px] font-bold bg-rose-950 text-rose-300 px-2.5 py-1 rounded-full border border-rose-800">
                          Disuspend
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-800">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => toggleSuspend(g)}
                        disabled={busyGroupId === g.id}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 ${
                          g.suspended_at
                            ? 'text-emerald-300 border-emerald-700 hover:bg-emerald-900/40'
                            : 'text-rose-300 border-rose-800 hover:bg-rose-900/30'
                        }`}
                      >
                        {g.suspended_at ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {g.suspended_at ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" />
          Semua Pengguna ({users.length})
        </h2>
        <div className="glass-card rounded-3xl border border-emerald-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-900/80 bg-emerald-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nama</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Skill Level</th>
                  <th className="py-3.5 px-4">No. Telepon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/40 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-emerald-950/40 text-slate-300">
                    <td className="py-3.5 px-4 font-bold text-white">{u.full_name ?? '-'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{u.email ?? '-'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{u.skill_level ?? '-'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{u.phone_number ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
