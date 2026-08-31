import type { ReactNode } from 'react'

interface Props {
  /** 大数字（语义色由 valueClass 控制） */
  value: ReactNode
  /** 下方 caption 标签 */
  label: ReactNode
  /** 大数字颜色类，如 text-hit / text-wrong */
  valueClass?: string
  /** 交错入场延迟（ms），由父级按 index*60 传入 */
  delay?: number
}

/** 报告页统计卡：bg-raised 圆角 12px，大数字 24px/700 + caption 标签（§4.3） */
export function StatCard({ value, label, valueClass = 'text-primary', delay = 0 }: Props) {
  return (
    <div
      className="stat-enter rounded-lg bg-raised p-4 text-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs text-secondary">{label}</div>
    </div>
  )
}
