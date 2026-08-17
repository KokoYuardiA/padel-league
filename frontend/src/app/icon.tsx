import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/**
 * Code-generated placeholder favicon (brand gradient + "R" lettermark) until
 * a real logo image is supplied — see components/layout/logo.tsx.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
          background: 'linear-gradient(to bottom right, #34d399, #a3e635)',
          color: '#022c22',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        R
      </div>
    ),
    { ...size }
  )
}
