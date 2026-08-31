import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface BaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

/** 实底主按钮：accent 底 + 深色文字，hover 转 accent-strong，active 缩放 0.98（§5） */
export function PrimaryButton({ children, className = '', ...rest }: BaseProps) {
  return (
    <button
      className={`rounded-lg bg-accent px-5 py-2 font-medium text-[#0f172a] transition-colors duration-150 hover:bg-accent-strong active:scale-[0.98] ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** 描边次按钮：border-strong，hover 变 bg-raised（§5） */
export function GhostButton({ children, className = '', ...rest }: BaseProps) {
  return (
    <button
      className={`rounded-lg border border-border-strong px-3 py-1 text-primary transition-colors duration-150 hover:bg-raised ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
