import { useEffect, useRef, useState } from 'react'
import type { PracticeMode } from '../types'

interface Props {
  mode: PracticeMode
  handFilter: 'R' | 'L' | 'both'
  tempoScale: number
  onChange: (patch: { mode?: PracticeMode; handFilter?: 'R' | 'L' | 'both'; tempoScale?: number }) => void
}

const MODE_LABELS: Record<PracticeMode, string> = { wait: '等待式', free: '自由式' }
const HAND_LABELS: Record<string, string> = { R: '右手', L: '左手', both: '双手' }

export function SettingsPopover({ mode, handFilter, tempoScale, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="练习设置"
        className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
          open ? 'bg-raised text-primary' : 'text-muted hover:bg-raised hover:text-primary'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 11 0-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="glass absolute right-0 top-10 z-50 w-56 rounded-xl p-4 shadow-panel" style={{ animation: 'screen-enter 180ms ease-out both' }}>
          <p className="text-micro font-medium uppercase text-muted">模式</p>
          <div className="mt-2 flex overflow-hidden rounded-lg border border-border-subtle">
            {(['wait', 'free'] as const).map(m => (
              <button
                key={m}
                onClick={() => onChange({ mode: m })}
                className={`flex-1 px-3 py-1.5 text-caption transition-colors ${
                  mode === m ? 'bg-primary text-on-accent font-medium' : 'text-secondary hover:text-primary'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <p className="mt-4 text-micro font-medium uppercase text-muted">声部</p>
          <div className="mt-2 flex overflow-hidden rounded-lg border border-border-subtle">
            {(['R', 'L', 'both'] as const).map(h => (
              <button
                key={h}
                onClick={() => onChange({ handFilter: h })}
                className={`flex-1 px-2 py-1.5 text-caption transition-colors ${
                  handFilter === h ? 'bg-primary text-on-accent font-medium' : 'text-secondary hover:text-primary'
                }`}
              >
                {HAND_LABELS[h]}
              </button>
            ))}
          </div>

          <p className="mt-4 text-micro font-medium uppercase text-muted">速度</p>
          <div className="mt-2 flex overflow-hidden rounded-lg border border-border-subtle">
            {[0.5, 0.75, 1].map(v => (
              <button
                key={v}
                onClick={() => onChange({ tempoScale: v })}
                className={`flex-1 px-2 py-1.5 text-caption tabular-nums transition-colors ${
                  tempoScale === v ? 'bg-primary text-on-accent font-medium' : 'text-secondary hover:text-primary'
                }`}
              >
                {v === 1 ? '原速' : `${v * 100}%`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
