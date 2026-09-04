import type { ReactNode } from 'react'

type Variant = 'green' | 'blue' | 'purple' | 'orange' | 'dark'

const COLORS: Record<Variant, { bg: string; shadow: string; hover: string }> = {
  green: { bg: '#58CC02', shadow: '#46A302', hover: '#61E002' },
  blue: { bg: '#1CB0F6', shadow: '#1899D6', hover: '#31BAFF' },
  purple: { bg: '#CE82FF', shadow: '#A568CC', hover: '#D895FF' },
  orange: { bg: '#FF9600', shadow: '#E08600', hover: '#FFA31A' },
  dark: { bg: '#2B2B33', shadow: '#1E1E25', hover: '#35353E' },
}

interface Props {
  children: ReactNode
  variant?: Variant
  onClick?: () => void
  className?: string
  disabled?: boolean
}

/** 多邻国风格 3D 按压按钮：亮色底 + 深色底边 + 按下位移 */
export function DuoButton({ children, variant = 'green', onClick, className = '', disabled = false }: Props) {
  const c = COLORS[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative select-none rounded-2xl font-extrabold tracking-wide text-white transition-all duration-100 active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{
        background: c.bg,
        boxShadow: `0 4px 0 ${c.shadow}`,
        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = c.hover }}
      onMouseLeave={e => { e.currentTarget.style.background = c.bg }}
    >
      {children}
    </button>
  )
}
