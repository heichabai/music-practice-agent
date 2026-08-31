import { isBlack, KeyboardLayout, noteName } from '../game/keyboard'
import { noteRgba } from './notesPalette'

const HEIGHT_WHITE = 104
const HEIGHT_BLACK = 66

interface Props {
  layout: KeyboardLayout
  width: number
  pressedSet: Set<number>
  targetSet: Set<number>
  wrong: { midi: number; id: number } | null
}

/**
 * 极简扁平琴键（无 3D 渐变、无厚度阴影、无下沉位移）。
 * - 白键：白底 + 1px 发丝缝；目标音按音高柔和发光；按下=平坦填色。
 * - 黑键：纯黑底 + 微高光棱线；目标音同上；按下=同色平填。
 */
export function PianoKeyboard({ layout, width, pressedSet, targetSet, wrong }: Props) {
  const midis: number[] = []
  for (let m = layout.lo; m <= layout.hi; m++) midis.push(m)

  // 键盘与画布同宽、与画布底部无缝衔接（外层容器由调用方提供 padding）
  return (
    <div
      className="relative select-none overflow-hidden bg-raised"
      style={{ width, height: HEIGHT_WHITE }}
    >
      {midis.map(m => {
        const g = layout.geom(m, width)
        const black = isBlack(m)
        const isPressed = pressedSet.has(m)
        const isTarget = targetSet.has(m)
        const isWrong = wrong !== null && wrong.midi === m

        // 默认底色：白键纯白、黑键纯黑
        let bg = black ? '#0e0e10' : '#fafafa'
        if (isTarget) bg = noteRgba(m, 0.95)   // 目标音：同色柔光填充
        if (isPressed) bg = black ? '#38bdf8' : '#7dd3fc'  // 按下：天蓝平填
        if (isWrong) bg = '#ef4444'

        // 边框 + 阴影
        let boxShadow: string | undefined
        if (isTarget) {
          boxShadow = `0 0 14px 1px ${noteRgba(m, 0.55)}`
        }

        // 文字色
        let labelColor = black ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.4)'
        if (isTarget) labelColor = 'rgba(15,23,42,0.85)'
        if (isPressed) labelColor = 'rgba(15,23,42,0.9)'

        return (
          <div
            key={m}
            className={`absolute ${black ? 'z-10' : 'z-0'} ${isTarget ? 'target-pulse' : ''}`}
            style={{
              left: g.x,
              width: g.w,
              top: 0,
              height: black ? HEIGHT_BLACK : HEIGHT_WHITE,
              background: bg,
              borderRight: black
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid #e2e2e6',
              borderLeft: !black && m === layout.lo
                ? '1px solid #e2e2e6'
                : undefined,
              boxShadow,
            }}
          >
            {/* 黑键顶部微棱线（Embers 风格扁平琴键的微妙细节） */}
            {black && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
                }}
              />
            )}
            {/* C 音音名标注 */}
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