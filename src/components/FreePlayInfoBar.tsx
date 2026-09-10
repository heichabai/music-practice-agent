import { noteName } from '../game/keyboard'
import { detectChord } from '../game/chords'
import { noteRgba } from './notesPalette'

interface Props {
  /** 当前正在发声的 MIDI 音（升序） */
  midis: number[]
}

/**
 * 自由弹奏信息条：琴键正上方。
 * 左：当前发声音名小片（带八度 + 音高色点）
 * 右：推断和弦（记号 + 中文名 + 缺音/经过音标注）
 */
export function FreePlayInfoBar({ midis }: Props) {
  const chord = midis.length >= 2 ? detectChord(midis) : null

  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border-subtle bg-surface/60 px-4 backdrop-blur-sm">
      {midis.length === 0 ? (
        <span className="text-caption text-muted/80">
          按住琴键 · 实时显示音名与和弦
        </span>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {midis.map(m => (
              <span
                key={m}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-border-subtle bg-raised/80 px-2 py-0.5 font-mono text-xs font-medium text-primary"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: noteRgba(m, 0.95), boxShadow: `0 0 6px ${noteRgba(m, 0.7)}` }}
                />
                {noteName(m)}
              </span>
            ))}
          </div>

          <div className="flex shrink-0 items-baseline gap-2 border-l border-border-subtle pl-3">
            {chord ? (
              <>
                <span className="text-lg font-semibold tracking-wide text-accent-strong drop-shadow-[0_0_10px_rgba(242,178,52,0.35)]">
                  {chord.symbol}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-caption text-secondary">{chord.fullCn}</span>
                  <span className="flex gap-1 text-[10px]">
                    {chord.incomplete && (
                      <span className="rounded bg-wrong/15 px-1 text-wrong">缺音</span>
                    )}
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
              <span className="text-caption text-muted">无法识别和弦</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
