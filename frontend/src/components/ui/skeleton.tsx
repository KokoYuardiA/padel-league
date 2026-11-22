"use client"

import React from 'react'

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-surface rounded-xl ${className}`}
      {...props}
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading player dashboard"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      {/* Top Welcome Banner Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-200 dark:border-emerald-700/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 w-full max-w-md">
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-8 sm:h-9 w-64 sm:w-80 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Quick Stats Grid Skeleton (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between"
          >
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upcoming Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-2.5 w-full max-w-md">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-56 rounded-lg" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0">
                  <Skeleton className="h-7 w-16 rounded-lg" />
                  <Skeleton className="h-9 w-32 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Joined Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
            ))}
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function EventsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading padel events"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
          </div>
          <div className="pt-4 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function GroupsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading padel groups"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-6 w-2/3 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
            </div>
          </div>
          <div className="pt-4 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-end">
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DiscoverDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading public group details"
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      <Skeleton className="h-4 w-40 rounded-md" />
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
        <div className="pt-4 border-t border-emerald-200/70 dark:border-emerald-900/50">
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-52 rounded-lg" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GroupDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading group details"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-200 dark:border-emerald-800/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200/70 dark:border-emerald-900/50 pb-6">
          <div className="space-y-2.5 w-full max-w-lg">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-md" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                </div>
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EventLiveSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading live event engine"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      {/* Header Live Bar Skeleton */}
      <div className="p-6 rounded-3xl glass-card border border-emerald-200 dark:border-emerald-700/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2.5 w-full max-w-md">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/80 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-32 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
      </div>

      {/* Round Matches Grid Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-28 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="p-5 rounded-3xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-xl" />
                <Skeleton className="h-5 w-20 rounded-lg" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading player profile"
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      <div className="space-y-6 glass-card p-6 sm:p-8 rounded-3xl border border-emerald-200/70 dark:border-emerald-900/60">
        <div className="flex items-center gap-6 pb-6 border-b border-emerald-200/70 dark:border-emerald-900/50">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-3.5 w-48 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ProfileStatsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading match history"
      className="space-y-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-2xl glass-card border border-emerald-200/70 dark:border-emerald-900/50 space-y-2"
          >
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="p-5 rounded-3xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function AdminSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading platform admin dashboard"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>
      {[0, 1].map((section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="p-5 rounded-3xl glass-card border border-emerald-200/70 dark:border-emerald-900/60 space-y-3">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
