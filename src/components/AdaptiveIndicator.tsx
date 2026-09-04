import type { AdaptiveDecision } from '../game/adaptive'

interface Props {
  decision: AdaptiveDecision | null
  onDismiss: () => void
}

export function AdaptiveIndicator({ decision, onDismiss }: Props) {
  if (decision === null) return null

  const icon =
    decision.action === 'suggest-speed-up' ? '💡' :
    decision.action === 'suggest-slow-down' ? '💡' :
    decision.action === 'focus-note' ? '🎯' :
    decision.action === 'suggest-free' ? '🎹' :
    decision.action === 'suggest-wait' ? '⏸️' :
    decision.action === 'suggest-next' ? '🎓' :
    decision.action === 'encourage' ? '💪' : '✨'

  return (
    <button
      onClick={onDismiss}
      className="glass fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border-accent/40 px-4 py-2 text-body text-accent-strong shadow-panel"
      style={{ animation: 'screen-enter 250ms ease-out both' }}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="font-medium">{decision.message}</span>
    </button>
  )
}
