import { detectChord } from '../game/chords'

interface Props {
  /** 当前正在发声的 MIDI 音（升序） */
  midis: number[]
}

/**
 * 自由弹奏信息条：琴键正上方。
 * 音名已直接显示在对应琴键上，这里只保留右侧的和弦推断结果。
 */
export function FreePlayInfoBar({ midis }: Props) {
  const chord = midis.length >= 2 ? detectChord(midis) : null

  return (
    <div className="flex h-10 shrink-0 items-center border-b border-border-subtle bg-surface/60 px-4 backdrop-blur-sm">
      <span className="flex-1 text-caption text-muted/80">
        {midis.length === 0 ? '按住琴键 · 和弦实时识别' : ''}
      </span>
      <div className="flex shrink-0 items-baseline gap-2 border-l border-border-subtle pl-3">
        {chord ? (
          <>
            <span className="text-lg font-semibold tracking-wide text-accent-strong drop-shadow-[0_0_10px_rgba(242,178,52,0.35)]">
              {chord.symbol}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-caption text-secondary">{chord.fullCn}</span>
              <span className="flex gap-1 text-[10px]">
                {chord.hasExtra && (
                  <span className="rounded bg-info/15 px-1 text-info">经过音</span>
                )}
                {chord.intervalHint && (
                  <span className="rounded bg-accent/10 px-1 text-accent-strong">
                    {chord.intervalHint}
                  </span>
                )}
              </span>
            </span>
          </>
        ) : (
          midis.length >= 2 && <span className="text-caption text-muted">未识别和弦</span>
        )}
      </div>
    </div>
  )
}
