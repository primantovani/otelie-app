// Otelie logo — paths extracted directly from the official otelie-logo.svg
// Symbol group has translate(0,-20) in original; y values below are already adjusted.
// Colors: gold #D1A23A · dark green #1a1a1a (official brand files)

type Variant  = 'horizontal' | 'stacked' | 'symbol'
type Size     = 'sm' | 'md' | 'lg'

// Symbol viewBox: x 448–754, y 135–553  →  306 × 418
const SYMBOL_VIEWBOX = '440 127 322 434'

const SIZES: Record<Size, { px: number; textClass: string; gap: string }> = {
  sm: { px: 36,  textClass: 'text-xl',        gap: 'gap-2'   },
  md: { px: 52,  textClass: 'text-[1.7rem]',  gap: 'gap-3'   },
  lg: { px: 76,  textClass: 'text-5xl',        gap: 'gap-4'   },
}

function Symbol({ px }: { px: number }) {
  // y values = original y − 20 (to absorb the translate(0,−20) from the source file)
  return (
    <svg
      width={px}
      height={Math.round(px * 434 / 322)}
      viewBox={SYMBOL_VIEWBOX}
      fill="none"
      aria-hidden="true"
    >
      {/* Gold arc */}
      <path
        d="M600 135
           C516 135 448 203 448 287
           L448 401
           C448 485 516 553 600 553
           L600 497
           C547 497 504 454 504 401
           L504 287
           C504 234 547 191 600 191
           C653 191 696 234 696 287
           L696 385
           C696 400 708 412 723 412
           L752 412
           L752 287
           C752 203 684 135 600 135Z"
        fill="#D1A23A"
      />
      {/* Dark green bowl */}
      <path
        d="M642 444
           L754 444
           C754 490 716 527 669 527
           C623 527 586 490 586 444
           L642 444Z"
        fill="#1a1a1a"
      />
    </svg>
  )
}

export default function Logo({
  variant   = 'horizontal',
  size      = 'md',
  className = '',
}: {
  variant?:   Variant
  size?:      Size
  className?: string
}) {
  const { px, textClass, gap } = SIZES[size]

  const wordmark = (
    <span
      className={`${textClass} font-bold leading-none`}
      style={{ color: '#1a1a1a', fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}
    >
      otelie
    </span>
  )

  if (variant === 'symbol') {
    return <span className={className} aria-label="Otelie"><Symbol px={px} /></span>
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`} aria-label="Otelie">
        <Symbol px={px} />
        {wordmark}
      </div>
    )
  }

  return (
    <div className={`flex items-center ${gap} ${className}`} aria-label="Otelie">
      <Symbol px={px} />
      {wordmark}
    </div>
  )
}
