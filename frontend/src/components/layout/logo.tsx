import Link from 'next/link'
import Image from 'next/image'

const ICON_BOX_SIZE = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const

const ICON_PX = {
  sm: 36,
  md: 40,
  lg: 48,
} as const

interface LogoProps {
  size?: keyof typeof ICON_BOX_SIZE
  showWordmark?: boolean
  showSubtitle?: boolean
  className?: string
}

export function Logo({ size = 'md', showWordmark = true, showSubtitle = false, className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 group ${className}`}>
      <div className={`relative ${ICON_BOX_SIZE[size]} shrink-0 group-hover:scale-105 transition-transform duration-200`}>
        <Image
          src="/brand/icon.png"
          alt="Rally Hub"
          fill
          sizes={`${ICON_PX[size]}px`}
          className="object-contain"
          priority
        />
      </div>
      {showWordmark && (
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-none tracking-tight text-emerald-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            Rally<span className="text-lime-600 dark:text-[#FFCC00]">Hub</span>
          </span>
          {showSubtitle && (
            <span className="text-[10px] leading-tight font-medium text-emerald-600/90 dark:text-emerald-400/80 uppercase tracking-widest">
              Where Players Come Together
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
