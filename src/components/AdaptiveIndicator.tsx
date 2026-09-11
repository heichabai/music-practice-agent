import { GraduationCap, Lightbulb, Pause, PianoKeys, Sparkle, Target } from '@phosphor-icons/react'
import type { AdaptiveDecision } from '../game/adaptive'

interface Props {
  decision: AdaptiveDecision | null
  onDismiss: () => void
}

export function AdaptiveIndicator({ decision, onDismiss }: Props) {
  if (decision === null) return null

  const Icon =
    decision.action === 'suggest-speed-up' || decision.action === 'suggest-slow-down'
      ? Lightbulb
      : decision.action === 'focus-note'
        ? Target
        : decision.action === 'suggest-free'
          ? PianoKeys
          : decision.action === 'suggest-wait'
            ? Pause
            : decision.action === 'suggest-next'
              ? GraduationCap
              : decision.action === 'encourage'
                ? Sparkle
                : Sparkle

  return (
    <button
      onClick={onDismiss}
      className="glass fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border-accent/35 px-4 py-2 text-body text-accent-strong shadow-panel"
      style={{ animation: 'screen-enter 250ms ease-out both' }}
    >
      <Icon size={16} weight="fill" className="shrink-0" />
      <span className="font-medium">{decision.message}</span>
    </button>
  )
}
