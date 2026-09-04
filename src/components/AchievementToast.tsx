import { useEffect, useState } from 'react'

export interface AchievementToastData {
  id: string
  name: string
  description: string
}

interface Props {
  queue: AchievementToastData[]
  onDismiss: (id: string) => void
}

export function AchievementToast({ queue, onDismiss }: Props) {
  const [visible, setVisible] = useState<AchievementToastData | null>(null)

  useEffect(() => {
    if (queue.length > 0 && visible === null) {
      const item = queue[0]
      setVisible(item)
      const timer = window.setTimeout(() => {
        onDismiss(item.id)
        setVisible(null)
      }, 3500)
      return () => window.clearTimeout(timer)
    }
  }, [queue, visible, onDismiss])

  if (visible === null) return null

  return (
    <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2">
      <div className="glass flex items-center gap-3 rounded-xl border-accent/50 px-5 py-3 shadow-panel" style={{ animation: 'screen-enter 300ms ease-out both' }}>
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
