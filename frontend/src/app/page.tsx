"use client"

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Users,
  Zap,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Shield,
  Activity,
  QrCode,
  Smartphone,
  Play,
  RotateCw,
  CircleDot,
  Radio,
  Flame,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [loading, user, router])

  if (loading || user) {
    return null
  }

  return (
    <div className="relative overflow-hidden min-h-screen flex flex-col justify-between">
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-3/4 left-1/4 w-[450px] h-[450px] bg-lime-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide backdrop-blur-md mb-8 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-lime-400 fill-lime-400" />
          <span>Platform Turnamen Padel Modern #1</span>
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
          Kelola Turnamen Padel <br className="hidden sm:inline" />
          <span className="gradient-text">Otomatis & Real-Time</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed mb-10">
          Buat event, otomatisasi jadwal pertandingan & alokasi lapangan, jalankan skor langsung dengan konfirmasi otomatis pemain, dan dapatkan klasemen real-time tanpa spreadsheet.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 text-base font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-7 py-3.5 rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 group"
          >
            Buat Event Sekarang
            <ArrowRight className="h-5 w-5 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#formats"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold text-slate-200 hover:text-white bg-emerald-900/30 border border-emerald-700/40 hover:bg-emerald-900/50 px-6 py-3.5 rounded-2xl backdrop-blur-md transition-all duration-200"
          >
            Lihat 5 Format Match
          </Link>
        </div>

        {/* Hero Interactive Live Scoring Mockup */}
        <div className="relative mx-auto max-w-5xl rounded-3xl p-3 sm:p-5 bg-emerald-950/60 border border-emerald-700/40 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/60 bg-emerald-950/80 rounded-2xl mb-4 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Jakarta Padel Open 2026 — Americano
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Round 3 / 6
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Court 1 & Court 2 • In Progress</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-900/40 px-3 py-1.5 rounded-xl border border-emerald-800/40">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Live WebSocket Sync
            </div>
          </div>

          {/* Matches & Courts Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {/* Court 1 Card */}
            <div className="p-4 rounded-2xl bg-emerald-900/30 border border-emerald-800/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/50">
                  Court 1
                </span>
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1">
                  <CircleDot className="h-3 w-3 fill-amber-300" /> Wait Confirmation
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/30">
                  <span className="text-sm font-semibold text-white">Rizky / Alex</span>
                  <span className="text-lg font-extrabold text-lime-400">21</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/30">
                  <span className="text-sm font-semibold text-slate-300">Budi / Dani</span>
                  <span className="text-lg font-extrabold text-slate-400">15</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-800/30 flex items-center justify-between text-xs text-slate-400">
                <span>Self-reported by Rizky</span>
                <span className="text-emerald-400 font-medium">Pending Alex's Confirm</span>
              </div>
            </div>

            {/* Court 2 Card */}
            <div className="p-4 rounded-2xl bg-emerald-900/30 border border-emerald-800/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/50">
                  Court 2
                </span>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/30">
                  <span className="text-sm font-semibold text-white">Kevin / Marcus</span>
                  <span className="text-lg font-extrabold text-lime-400">24</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/30">
                  <span className="text-sm font-semibold text-slate-300">Hendra / Ahsan</span>
                  <span className="text-lg font-extrabold text-slate-400">18</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-800/30 flex items-center justify-between text-xs text-slate-400">
                <span>Score Final</span>
                <span className="text-lime-400 font-medium">+24 Points to Ranking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Match Formats Section */}
      <section id="formats" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center w-full">
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
            Algoritma Schedulers
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Mendukung 5 Format Pertandingan Padel
          </p>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">
            Sistem kami membuat rotasi pasangan, alokasi lapangan, dan babak secara otomatis tanpa mengulang pasangan yang sama secara konsisten.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              name: 'Americano',
              desc: 'Rotasi pasangan & lawan setiap babak. Poin individu diakumulasi.',
              icon: RotateCw,
              tag: 'Paling Populer',
            },
            {
              name: 'Mexicano',
              desc: 'Pasangan disesuaikan dengan peringkat klasemen sementara per babak.',
              icon: Flame,
              tag: 'Kompetitif',
            },
            {
              name: 'Fixed Partner',
              desc: 'Pasangan tetap sepanjang event. Lawan berotasi setiap babak.',
              icon: Users,
              tag: 'Duet Tim',
            },
            {
              name: 'Mixed Partner',
              desc: 'Format ganda campuran dengan syarat komposisi gender seimbang.',
              icon: Sparkles,
              tag: 'Campuran',
            },
            {
              name: 'Round Robin',
              desc: 'Setiap tim bertemu lawan yang sama tepat satu kali.',
              icon: Activity,
              tag: 'Sistem Liga',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl glass-card glass-card-hover flex flex-col justify-between text-left space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
              <div className="pt-3 border-t border-emerald-900/50 flex items-center text-[11px] font-medium text-emerald-400">
                <span>Auto-Scheduler Ready</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="space-y-6 text-center">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Dirancang Khusus Komunitas Padel
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Fitur Lengkap dari Pendaftaran hingga Klasemen Akhir
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl mx-auto">
            Platform Rally Hub menggantikan tugas manual organizer dengan otomatisasi menyeluruh. Dari pendaftaran pemain hingga penentuan juara.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-10">
          {[
            {
              title: 'Self-Reported Score & Konfirmasi Pemain',
              desc: 'Pemain menginput skor sendiri, lalu partner/lawan melakukan konfirmasi. Mencegah manipulasi skor.',
              icon: CheckCircle2,
            },
            {
              title: 'Update Klasemen & Lapangan Real-Time',
              desc: 'Menggunakan WebSocket (Socket.IO). Semua penonton dan pemain melihat skor tanpa perlu refresh.',
              icon: Zap,
            },
            {
              title: 'Isolasi Komunitas & Multi-Tenant',
              desc: 'Setiap klub/grup memiliki ruang data sendiri. Privasi anggota dan statistik event terjamin.',
              icon: Shield,
            },
            {
              title: 'Undangan QR Code & Link Publik',
              desc: 'Undang anggota grup atau pendaftar event dengan cepat menggunakan QR code atau link instant.',
              icon: QrCode,
            },
          ].map((feature, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-900/50">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{feature.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-900/80 via-emerald-950 to-slate-950 border border-emerald-700/50 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Siap Menjalankan Event Padel Pertama Anda?
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Bergabung sekarang sebagai pemain atau buat grup klub Anda secara gratis dalam hitungan menit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto text-sm font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 px-8 py-3.5 rounded-xl shadow-lg transition-all"
              >
                Daftar Akun Gratis
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-sm font-semibold text-slate-200 hover:text-white bg-emerald-900/40 border border-emerald-800 px-6 py-3.5 rounded-xl"
              >
                Sudah Punya Akun? Masuk
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
