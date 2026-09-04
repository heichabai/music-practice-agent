import { useMemo } from 'react'
import {
  levelName,
  xpToNextLevel,
  DAILY_NOTE_GOAL,
  type GamificationState,
} from '../game/gamification'

interface Props {
  state: GamificationState
}

export function GamificationBar({ state }: Props) {
  const { level, progress } = useMemo(() => xpToNextLevel(state.xp), [state.xp])
  const goalProgress = Math.min(1, state.todayNotes / DAILY_NOTE_GOAL)
  const hasStreak = state.streak > 0

  return (
    <div className="glass flex items-center gap-4 rounded-xl px-4 py-3">
      {/* 连续打卡火焰 */}
      <div className="flex items-center gap-1.5">
        <span
          className={`text-2xl leading-none ${hasStreak ? '' : 'opacity-25 grayscale'}`}
          role="img"
          aria-label="连续打卡"
        >
          {hasStreak ? '🔥' : '🕯️'}
        </span>
        <div>
          <div className="text-h3 font-bold leading-none text-accent-strong">
            {state.streak}
          </div>
          <div className="text-micro text-muted">天连续</div>
        </div>
      </div>

      <div className="h-8 w-px bg-border-subtle" />

      {/* 等级与 XP */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-caption font-medium text-primary">
            Lv.{level} {levelName(level)}
          </span>
          <span className="text-micro tabular-nums text-muted">
            {state.xp.toLocaleString()} XP
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-border-strong/50">
          <div
            className="h-full rounded-full bg-gradient-accent shadow-[0_0_8px_rgb(245_158_11/0.4)] transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="h-8 w-px bg-border-subtle" />

      {/* 每日目标 */}
      <div className="flex items-center gap-2">
        {goalProgress >= 1 ? (
          <span className="text-lg leading-none" role="img" aria-label="目标完成">
            ✅
          </span>
        ) : (
          <div className="relative h-9 w-9">
            <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#31313a" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="var(--color-accent)" strokeWidth="3"
                strokeDasharray={`${goalProgress * 94.2} 94.2`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>
        )}
        <div>
          <div className="text-caption font-medium leading-tight text-primary">
            {state.todayNotes}/{DAILY_NOTE_GOAL} 音
          </div>
          <div className="text-micro text-muted">今日目标</div>
        </div>
      </div>
    </div>
  )
}
