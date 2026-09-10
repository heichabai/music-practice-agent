import { useEffect, useRef, useState } from 'react'

export interface AchievementToastData {
  id: string
  name: string
  description: string
}

interface Props {
  queue: AchievementToastData[]
  onDismiss: (id: string) => void
}

/** 单条成就弹窗展示时长（毫秒） */
const TOAST_MS = 1000

export function AchievementToast({ queue, onDismiss }: Props) {
  const [visible, setVisible] = useState<AchievementToastData | null>(null)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  // 出队：空闲且有排队时显示队首
  useEffect(() => {
    if (visible === null && queue.length > 0) setVisible(queue[0])
  }, [queue, visible])

  // 显示后短暂停留即自动消失（仅随 visible 变化重设定时器，父组件重渲染不重置）
  useEffect(() => {
    if (visible === null) return
    const timer = window.setTimeout(() => {
      onDismissRef.current(visible.id)
      setVisible(null)
    }, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [visible])

  if (visible === null) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2">
      <div className="glass flex items-center gap-3 rounded-xl border-accent/50 px-5 py-3 shadow-panel" style={{ animation: 'screen-enter 200ms ease-out both' }}>
        <span className="text-3xl" role="img" aria-label="成就解锁">
          🏆
        </span>
        <div>
          <div className="text-micro font-medium uppercase text-accent-strong">成就解锁</div>
          <div className="text-body font-semibold text-primary">{visible.name}</div>
          <div className="text-caption text-secondary">{visible.description}</div>
        </div>
      </div>
    </div>
  )
}
