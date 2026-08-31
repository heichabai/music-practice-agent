import { StatCard } from './StatCard'

const TIMING_LABEL_ABS = 0.08

function timingLabel(avg: number): string {
  if (avg < -TIMING_LABEL_ABS) return '偏抢拍'
  if (avg > TIMING_LABEL_ABS) return '偏拖拍'
  return '节奏稳定'
}

interface Props {
  /** 平均节奏偏差（拍），负=抢拍；等待式为 null */
  avg: number | null
  /** 交错入场延迟（ms） */
  delay?: number
}

/** 节奏仪表卡：横条 + 中心刻度 + info 色 marker；等待式显示占位（§4.3） */
export function TimingGauge({ avg, delay = 0 }: Props) {
  if (avg === null) {
    return (
      <StatCard value="—" label="等待式无节奏数据，试试自由式" valueClass="text-muted" delay={delay} />
    )
  }
  const clamped = Math.max(-0.4, Math.min(0.4, avg))
  const pos = 50 + (clamped / 0.4) * 50
  return (
    <div
      className="stat-enter rounded-lg bg-raised p-4 text-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-2xl font-bold text-info tabular-nums">{timingLabel(avg)}</div>
      <div className="relative mt-3 h-2 rounded-full bg-border-strong">
        <div className="absolute inset-y-0 left-1/2 w-px bg-secondary" />
        <div
          className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full bg-info"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-secondary">
        <span>抢拍</span>
        <span>拖拍</span>
      </div>
      <div className="mt-1 text-xs text-secondary">
        平均偏差 {((avg * 1000) / 2).toFixed(0)}ms 级别
      </div>
    </div>
  )
}
