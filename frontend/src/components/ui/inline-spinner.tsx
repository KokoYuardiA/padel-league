"use client"

import React from 'react'

interface InlineSpinnerProps {
  label?: string
  variant?: 'lime' | 'dark'
  size?: number
  className?: string
}

/**
 * Accessible 16px micro-spinner built on the native <progress> element
 * (indeterminate by omitting `value`), styled with conic-gradient and
 * GPU-accelerated CSS rotation.
 */
export function InlineSpinner({
  label = 'Loading',
  variant = 'lime',
  size = 16,
  className = '',
}: InlineSpinnerProps) {
  return (
    <progress
      aria-label={label}
      style={{ '--size': `${size}px` } as React.CSSProperties}
      className={`loading-spinner ${variant === 'dark' ? 'spinner-dark' : ''} ${className}`}
    />
  )
}
