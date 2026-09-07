import type { ReactNode } from 'react'

type Variant = 'green' | 'blue' | 'purple' | 'orange' | 'dark'

const COLORS: Record<Variant, { from: string; to: string; glow: string }> = {
  green: { from: '#5be37d', to: '#1faf4a', glow: 'rgb(74 222 128 / 0.35)' },
  blue: { from: '#54c5f8', to: '#1d8fe0', glow: 'rgb(56 189 248 / 0.35)' },
  purple: { from: '#cb9dff', to: '#9d6bf5', glow: 'rgb(168 130 255 / 0.4)' },
  orange: { from: '#ffc05c', to: '#ef8a10', glow: 'rgb(251 146 60 / 0.4)' },
  dark: { from: '#2e3650', to: '#1f2637', glow: 'rgb(0 0 0 / 0.45)' },
}

interface Props {
  children: ReactNode
  variant?: Variant
  onClick?: () => void
  className?: string
  disabled?: boolean
}

/** 深色舞台按钮：竖向渐变 + 彩色辉光 + 顶部高光，按下微沉 */
export function DuoButton({ children, variant = 'green', onClick, className = '', disabled = false }: Props) {
  const c = COLORS[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative select-none rounded-xl font-bold tracking-wide text-white transition-all duration-150 hover:brightness-110 active:translate-y-[1px] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{
        background: `linear-gradient(180deg, ${c.from} 0%, ${c.to} 100%)`,
        boxShadow: `0 0 24px ${c.glow}, inset 0 1px 0 rgb(255 255 255 / 0.28), 0 3px 10px rgb(0 0 0 / 0.45)`,
        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
      }}
    >
      {children}
    </button>
  )
}
