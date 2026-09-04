import { isBlack, KeyboardLayout, noteName } from '../game/keyboard'
import { noteRgba } from './notesPalette'

const HEIGHT_WHITE = 118
const HEIGHT_BLACK = 74

interface Props {
  layout: KeyboardLayout
  width: number
  pressedSet: Set<number>
  targetSet: Set<number>
  wrong: { midi: number; id: number } | null
}

/**
 * 拟真琴键：
 * - 白键：竖向微渐变 + 键缝发丝线；按下下沉（位移 + 内阴影），带按压过渡
 * - 黑键：深黑渐变 + 顶部棱线高光；按下微降
 * - 目标音：按音高柔光呼吸（target-pulse）；错音红闪；C 音名标注
 */
export function PianoKeyboard({ layout, width, pressedSet, targetSet, wrong }: Props) {
  const midis: number[] = []
  for (let m = layout.lo; m <= layout.hi; m++) midis.push(m)

  return (
    <div
      className="relative select-none overflow-hidden rounded-b-lg bg-raised-2"
      style={{ width, height: HEIGHT_WHITE }}
    >
      {midis.map(m => {
        const g = layout.geom(m, width)
        const black = isBlack(m)
        const isPressed = pressedSet.has(m)
        const isTarget = targetSet.has(m)
        const isWrong = wrong !== null && wrong.midi === m

        let bg: string
        if (isWrong) {
          bg = 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)'
        } else if (isPressed) {
          bg = black
            ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(180deg, #d4dce6 0%, #b9c4d2 100%)'
        } else if (black) {
          bg = 'linear-gradient(180deg, #26262c 0%, #0c0c0e 82%, #000 100%)'
        } else {
          bg = 'linear-gradient(180deg, #ffffff 0%, #f4f4f6 70%, #e3e3e8 100%)'
        }

        const glow = isTarget ? `0 0 18px 2px ${noteRgba(m, 0.4)}` : undefined
        const pressShadow = isPressed ? 'inset 0 3px 8px rgb(0 0 0 / 0.32)' : undefined
        const boxShadow = [pressShadow, glow].filter(Boolean).join(', ') || undefined

        const translateY = isPressed ? (black ? 1 : 2) : 0

        const labelColor = isTarget
          ? 'rgba(15,23,42,0.9)'
          : isPressed
            ? 'rgba(15,23,42,0.9)'
            : black
              ? 'rgba(255,255,255,0.4)'
              : 'rgba(15,23,42,0.35)'

        return (
          <div
            key={m}
            className={`absolute ${black ? 'z-10 rounded-b-[3px]' : 'z-0'} ${isTarget ? 'target-pulse' : ''}`}
            style={{
              left: g.x,
              width: g.w,
              top: 0,
              height: black ? HEIGHT_BLACK : HEIGHT_WHITE,
              transform: `translateY(${translateY}px)`,
              background: bg,
              borderRight: black
                ? '1px solid rgb(0 0 0 / 0.55)'
                : '1px solid #d9d9de',
              borderLeft:
                !black && m === layout.lo ? '1px solid #d9d9de' : undefined,
              transition: `transform ${'70ms'} ease-out, background-color 90ms linear`,
              boxShadow,
            }}
          >
            {black && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-[3px] top-0 h-[2px] rounded-b"
                style={{
                  background:
                    'linear-gradient(180deg, rgb(255 255 255 / 0.22) 0%, rgb(255 255 255 / 0) 100%)',
                }}
              />
            )}
            {!black && m % 12 === 0 && (
              <span
                className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-medium tabular-nums"
                style={{ color: labelColor }}
              >
                {noteName(m)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
