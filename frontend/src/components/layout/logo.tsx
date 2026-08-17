import Link from 'next/link'
import { Trophy } from 'lucide-react'

const ICON_BOX_SIZE = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const

const ICON_SIZE = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

interface LogoProps {
  size?: keyof typeof ICON_BOX_SIZE
  showWordmark?: boolean
  showSubtitle?: boolean
  className?: string
}

/**
 * Placeholder brand mark (icon box + wordmark) until a real logo image is
 * supplied. The icon box below is the one unit to swap for an <Image> once
 * that arrives — wordmark/subtitle logic can stay as-is.
 */
export function Logo({ size = 'md', showWordmark = true, showSubtitle = false, className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div
        className={`flex ${ICON_BOX_SIZE[size]} items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-500 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200`}
      >
        <Trophy className={`${ICON_SIZE[size]} text-emerald-950 stroke-[2.5]`} />
      </div>
      {showWordmark && (
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-none tracking-tight text-white group-hover:text-emerald-400 transition-colors">
            Rally<span className="text-lime-400">Hub</span>
          </span>
          {showSubtitle && (
            <span className="text-[10px] leading-tight font-medium text-emerald-400/80 uppercase tracking-widest">
              Community Platform
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
