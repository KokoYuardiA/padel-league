"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Users, Check, AlertCircle, LogIn, ShieldAlert } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/components/providers/auth-provider'

interface GroupJoinPreview {
  id: string
  name: string
  description: string | null
  suspended_at: string | null
  member_count: number
  already_member: boolean
}

export default function JoinGroupPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'loading' | 'preview' | 'joining' | 'success' | 'error'>('loading')
  const [preview, setPreview] = useState<GroupJoinPreview | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (authLoading || !params.code) return
    if (!user) return

    apiFetch<{ data: GroupJoinPreview }>(`/api/groups/join/${params.code}/preview`)
      .then((res) => {
        setPreview(res.data)
        setStatus('preview')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof ApiError ? err.message : 'Failed to load group info.')
      })
  }, [authLoading, user, params.code])

  const handleConfirmJoin = async () => {
    setStatus('joining')
    try {
      const res = await apiFetch<{ data: { message: string } }>(`/api/groups/join/${params.code}`, { method: 'POST' })
      setMessage(res.data.message)
      setStatus('success')
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Failed to join group.')
      setStatus('error')
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <LogIn className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
        <h1 className="text-lg font-bold text-emerald-950 dark:text-white">Sign in to join this group</h1>
        <Link
          href={`/login?next=/groups/join/${params.code}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 rounded-xl"
        >
          Sign In Now
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
      {status === 'loading' && (
        <>
          <Users className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto animate-pulse" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading group info...</p>
        </>
      )}

      {status === 'preview' && preview && (
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 space-y-4 text-left">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-xl font-extrabold text-emerald-950 dark:text-white">{preview.name}</h1>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-lime-600 dark:text-lime-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Users className="h-3.5 w-3.5" />
              {preview.member_count} Members
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{preview.description || 'No description.'}</p>

          <div className="pt-4 border-t border-emerald-200/70 dark:border-emerald-900/50">
            {preview.suspended_at ? (
              <p className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                This group is currently suspended and not accepting new members.
              </p>
            ) : preview.already_member ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">You are already a member of this group.</p>
                <button
                  onClick={() => router.push(`/groups/${preview.id}`)}
                  className="text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-3.5 py-1.5 rounded-xl"
                >
                  Open Group
                </button>
              </div>
            ) : (
              <button
                onClick={handleConfirmJoin}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                Join {preview.name}
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'joining' && (
        <>
          <Users className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto animate-pulse" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Joining group...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-sm text-slate-700 dark:text-slate-200">{message}</p>
          <button
            onClick={() => router.push(preview ? `/groups/${preview.id}` : '/groups')}
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-2.5 rounded-xl"
          >
            View Group
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-10 w-10 text-rose-500 dark:text-rose-400 mx-auto" />
          <p className="text-sm text-rose-600 dark:text-rose-300">{message}</p>
          <Link href="/groups" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Back to My Groups
          </Link>
        </>
      )}
    </div>
  )
}
