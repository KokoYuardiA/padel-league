import Link from 'next/link'
import { ShieldCheck, Heart } from 'lucide-react'
import { Logo } from '@/components/layout/logo'

export function Footer() {
  return (
    <footer className="border-t border-emerald-200/70 dark:border-emerald-950/80 bg-white/70 dark:bg-emerald-950/60 backdrop-blur-md pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-emerald-200/60 dark:border-emerald-900/40">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Logo size="sm" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              A fully automated padel event and community management platform. Automated schedules, live scores, and real-time rankings.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4">Features & Events</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li><Link href="/events" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Padel Events List</Link></li>
              <li><Link href="/events/create" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Create Event (5 Formats)</Link></li>
              <li><Link href="/events/evt-101/live" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Live Scoring & Engine</Link></li>
              <li><Link href="/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Player Dashboard</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4">Community</h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li><Link href="/groups" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Padel Clubs & Groups</Link></li>
              <li><Link href="/groups/create" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Create New Community</Link></li>
              <li><Link href="/profile" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Profile & Skill Level</Link></li>
              <li><Link href="/register" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Register as a New Player</Link></li>
            </ul>
          </div>

          {/* Tech & Isolation */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Security & Performance</h4>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/70 dark:border-emerald-800/30 text-slate-600 dark:text-slate-300 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-4 w-4" />
                Multi-Tenant Isolation
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Each club&apos;s member and match data is isolated independently and securely on the server.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Rally Hub. All rights reserved.</p>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <span>Built specifically for the Indonesian Padel community</span>
            <Heart className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 fill-emerald-500 dark:fill-emerald-400" />
          </div>
        </div>
      </div>
    </footer>
  )
}
