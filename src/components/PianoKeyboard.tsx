import { useRef } from 'react'
import * as Tone from 'tone'
import { isBlack, KeyboardLayout, noteName } from '../game/keyboard'
import { noteRgba } from './notesPalette'

interface Props {
  layout: KeyboardLayout
  width: number
  pressedSet: Set<number>
  targetSet: Set<number>
  wrong: { midi: number; id: number } | null
  /** 白键高度（全屏布局下随视口缩放），默认 118 */
  height?: number
  /** 点击/触摸琴键触发 */
  onNoteOn?: (midi: number) => void
  onNoteOff?: (midi: number) => void
  /** 正在发声的音：直接在琴键上显示音名（含踏板挂起音） */
  labelSet?: Set<number>
}

/**
 * 拟真琴键：
 * - 白键：竖向微渐变 + 键缝发丝线；按下下沉（位移 + 内阴影），带按压过渡
 * - 黑键：深黑渐变 + 顶部棱线高光；按下微降
 * - 目标音：按音高柔光呼吸（target-pulse）；错音红闪；C 音名标注
 */
export function PianoKeyboard({ layout, width, pressedSet, targetSet, wrong, height, onNoteOn, onNoteOff, labelSet }: Props) {
  const HEIGHT_WHITE = height ?? 118
  const HEIGHT_BLACK = Math.round(HEIGHT_WHITE * 0.627)
  const midis: number[] = []
  for (let m = layout.lo; m <= layout.hi; m++) midis.push(m)

  const heldRef = useRef(new Set<number>())

  const handlePointerDown = (midi: number) => {
    Tone.start().catch(() => {})
    heldRef.current.add(midi)
    onNoteOn?.(midi)
  }
  const handlePointerUp = () => {
    for (const m of heldRef.current) onNoteOff?.(m)
    heldRef.current.clear()
  }

  return (
    <div
      className="relative shrink-0 select-none overflow-hidden border-t border-border-strong bg-raised-2"
      style={{ width, height: HEIGHT_WHITE }}
      onPointerUp={handlePointerUp}
    >
      {midis.map(m => {
        const g = layout.geom(m, width)
        const black = isBlack(m)
        const isPressed = pressedSet.has(m)
        const isTarget = targetSet.has(m)
        const isWrong = wrong !== null && wrong.midi === m
        const showName = labelSet?.has(m) ?? false

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
            onPointerDown={e => { e.preventDefault(); handlePointerDown(m) }}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => { if (heldRef.current.has(m)) { heldRef.current.delete(m); onNoteOff?.(m) } }}
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
            {showName ? (
              <span
                className={`pointer-events-none absolute inset-x-0 bottom-1.5 text-center font-mono font-semibold tabular-nums ${
                  black ? 'text-[9px]' : 'text-[11px]'
                } ${isPressed ? '' : 'opacity-70'}`}
                style={{
                  color: black ? noteRgba(m, 0.95) : 'rgba(15,23,42,0.92)',
                  textShadow: black ? `0 0 6px ${noteRgba(m, 0.5)}` : undefined,
                }}
              >
                {noteName(m)}
              </span>
            ) : (
              !black &&
              m % 12 === 0 && (
                <span
                  className="absolute inset-x-0 bottom-1.5 text-center text-[10px] font-medium tabular-nums"
                  style={{ color: labelColor }}
                >
                  {noteName(m)}
                </span>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
