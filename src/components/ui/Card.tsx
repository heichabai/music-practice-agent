import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

/** 卡片面板：bg-surface + border-subtle，圆角 12px（§5） */
export function Card({ children, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-border-subtle bg-surface ${className}`}>
      {children}
    </div>
  )
}
