"use client"

import React from 'react'

interface PadelLoaderProps {
  label?: string
  size?: 'sm' | 'md' | 'lg'
  fullHeight?: boolean
  className?: string
}

export function PadelLoader({
  label = 'Loading...',
  size = 'md',
  fullHeight = false,
  className = '',
}: PadelLoaderProps) {
  const dimensions = {
    sm: { box: 'h-16 w-28', ball: 'h-6 w-6', net: 'w-24' },
    md: { box: 'h-20 w-36', ball: 'h-8 w-8', net: 'w-32' },
    lg: { box: 'h-24 w-44', ball: 'h-10 w-10', net: 'w-40' },
  }[size]

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${
        fullHeight ? 'min-h-[60vh]' : 'py-10'
      } ${className}`}
    >
      <div
        aria-hidden="true"
        className={`relative flex flex-col items-center justify-end ${dimensions.box}`}
      >
        {/* Bouncing Lime-Green Padel Ball */}
        <div
          className={`animate-padel-ball relative rounded-full bg-gradient-to-br from-lime-300 via-lime-400 to-emerald-500 shadow-[0_0_20px_rgba(255,204,0,0.45)] border border-lime-200/70 overflow-hidden ${dimensions.ball}`}
        >
          {/* Classic curved padel/tennis seam lines */}
          <svg
            viewBox="0 0 32 32"
            className="h-full w-full text-emerald-950/35"
            fill="none"
          >
            <path
              d="M4 10C10 10 13 15 13 21C13 24 11 27 8 29"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M28 22C22 22 19 17 19 11C19 8 21 5 24 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Dynamic Shadow on Court Surface */}
        <div
          className="animate-padel-shadow mt-1.5 h-1.5 w-8 rounded-full bg-emerald-950/50 dark:bg-black/65 blur-[1px]"
        />

        {/* Subtle Padel Net Line & Posts */}
        <div className={`mt-1.5 flex items-center justify-between ${dimensions.net}`}>
          <span className="h-2.5 w-1 rounded-full bg-emerald-500/60 dark:bg-emerald-400/60" />
          <div className="relative flex-1 h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-400/80 to-emerald-500/20">
            <div className="absolute inset-x-2 -top-1 h-2 border-t border-dashed border-lime-400/40" />
          </div>
          <span className="h-2.5 w-1 rounded-full bg-emerald-500/60 dark:bg-emerald-400/60" />
        </div>
      </div>

      {label && (
        <p className="text-xs font-semibold tracking-wide text-emerald-800 dark:text-emerald-200/90">
          {label}
        </p>
      )}
    </div>
  )
}
