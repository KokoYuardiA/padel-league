"use client"

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Thin (3px) glowing lime-green top navigation progress bar using a native
 * <progress> element at the top of the viewport. Starts immediately when an
 * internal navigation link is clicked and smoothly completes once the new
 * route pathname/searchParams commit.
 */
export function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevUrlRef = useRef<string>('')

  const clearTimers = () => {
    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current)
      trickleTimerRef.current = null
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const startProgress = () => {
    clearTimers()
    setActive(true)
    setProgress(0.18)
    trickleTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev === undefined) return 0.3
        if (prev >= 0.88) return prev
        return Number((prev + (0.9 - prev) * 0.18).toFixed(3))
      })
    }, 160)
  }

  const completeProgress = () => {
    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current)
      trickleTimerRef.current = null
    }
    setProgress(1)
    hideTimerRef.current = setTimeout(() => {
      setActive(false)
      setProgress(undefined)
    }, 240)
  }

  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams?.toString() ?? ''}`
    if (prevUrlRef.current && prevUrlRef.current !== currentUrl) {
      if (!active) {
        setActive(true)
      }
      completeProgress()
    }
    prevUrlRef.current = currentUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      const anchor = (e.target as HTMLElement | null)?.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.href)
        if (targetUrl.origin !== window.location.origin) return
        const currentFull = `${window.location.pathname}${window.location.search}`
        const targetFull = `${targetUrl.pathname}${targetUrl.search}`
        if (currentFull !== targetFull) {
          startProgress()
        }
      } catch {
        // Ignore malformed URLs
      }
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => {
      document.removeEventListener('click', handleDocumentClick, true)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none h-[3px]"
    >
      <progress
        aria-label="Page navigation progress"
        max={1}
        value={progress}
        className="top-nav-progress block w-full h-[3px] shadow-[0_0_12px_rgba(255,204,0,0.75),0_0_4px_rgba(43,182,114,0.8)]"
      />
    </div>
  )
}
