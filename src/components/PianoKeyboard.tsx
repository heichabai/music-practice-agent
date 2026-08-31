import { isBlack, KeyboardLayout, noteName } from '../game/keyboard'
import { noteHex, noteRgba } from './notesPalette'

const HEIGHT_WHITE = 104
const HEIGHT_BLACK = 66

interface Props {
  layout: KeyboardLayout
  width: number
  pressedSet: Set<number>
  targetSet: Set<number>
  wrong: { midi: number; id: number } | null
}

export function PianoKeyboard({ layout, width, pressedSet, targetSet, wrong }: Props) {
  const midis: number[] = []
  for (let m = layout.lo; m <= layout.hi; m++) midis.push(m)

  return (
    <div
      className="relative select-none overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-b from-slate-900 to-black p-2 shadow-[0_8px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]"
      style={{ width, height: HEIGHT_WHITE + 16 }}
    >
      <div className="relative h-full w-full" style={{ height: HEIGHT_WHITE }}>
        {midis.map(m => {
          const g = layout.geom(m, width - 16)
          const black = isBlack(m)
          const isPressed = pressedSet.has(m)
          const isTarget = targetSet.has(m)
          const isWrong = wrong !== null && wrong.midi === m
          const hex = noteHex(m)
          const rgba = noteRgba(m, 0.9)

          // 白键：上亮下灰 + 底部暗影制造厚度
          let bg: string
          let boxShadow: string | undefined
          let transform: string | undefined

          if (black) {
            if (isWrong) {
              bg = 'linear-gradient(180deg, #fb7185 0%, #dc2626 60%, #7f1d1d 100%)'
              boxShadow = '0 0 22px 3px rgba(239,68,68,0.85), inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 14px rgba(0,0,0,0.7)'
            } else if (isPressed) {
              bg = 'linear-gradient(180deg, #7dd3fc 0%, #0ea5e9 55%, #075985 100%)'
              boxShadow = '0 0 20px 3px rgba(56,189,248,0.8), inset 0 1px 0 rgba(255,255,255,0.5), 0 3px 6px rgba(0,0,0,0.6)'
              transform = 'translateY(2px)'
            } else if (isTarget) {
              bg = `linear-gradient(180deg, ${hex} 0%, ${hex} 60%, #1e293b 100%)`
              boxShadow = `0 0 18px 3px ${noteRgba(m, 0.8)}, inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px rgba(0,0,0,0.7)`
            } else {
              bg = 'linear-gradient(180deg, #475569 0%, #1e293b 55%, #020617 100%)'
              boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(0,0,0,0.65)'
            }
          } else {
            if (isWrong) {
              bg = 'linear-gradient(180deg, #fecaca 0%, #ef4444 70%, #7f1d1d 100%)'
              boxShadow = '0 0 22px 3px rgba(239,68,68,0.85), inset 0 -3px 4px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.25)'
            } else if (isPressed) {
              bg = 'linear-gradient(180deg, #e0f2fe 0%, #7dd3fc 65%, #0284c7 100%)'
              boxShadow = '0 0 18px 2px rgba(56,189,248,0.75), inset 0 -3px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.25)'
              transform = 'translateY(2px)'
            } else if (isTarget) {
              bg = `linear-gradient(180deg, ${hex} 0%, ${hex} 70%, #fbbf24 100%)`
              boxShadow = `0 0 20px 3px ${rgba}, inset 0 -3px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.25)`
            } else {
              bg = 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 70%, #cbd5e1 100%)'
              boxShadow = 'inset 0 -3px 5px rgba(15,23,42,0.18), 0 1px 2px rgba(0,0,0,0.3)'
            }
          }

          return (
            <div
              key={m}
              className={`absolute rounded-b-md ${black ? 'z-10' : 'z-0'} ${isTarget ? 'target-pulse' : ''}`}
              style={{
                left: g.x + 8,
                width: g.w,
                top: 0,
                height: black ? HEIGHT_BLACK : HEIGHT_WHITE,
                background: bg,
                boxShadow,
                transform,
                transition: 'transform 80ms linear, box-shadow 150ms ease-out',
              }}
            >
              {!black && m % 12 === 0 && (
                <span
                  className="absolute inset-x-0 bottom-1 text-center text-[10px] font-medium"
                  style={{ color: isTarget || isPressed ? '#0f172a' : 'rgba(71,85,105,0.85)' }}
                >
                  {noteName(m)}
                </span>
              )}
              {!black && (
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}