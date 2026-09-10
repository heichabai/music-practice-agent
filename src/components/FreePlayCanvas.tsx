import { useEffect, useRef } from 'react'
import type { KeyboardLayout } from '../game/keyboard'
import { isBlack } from '../game/keyboard'
import { noteName } from '../game/keyboard'
import { noteHsl } from './notesPalette'

const CANVAS_H = 480
const HIT_LINE_OFFSET = 8
const RISE_SPEED = 120 // px/s，音块上升速度
const MIN_BLOCK_H = 14
const MAX_NOTES = 200

interface RisingNote {
  midi: number
  startMs: number
  endMs: number | null
}

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
}

interface Props {
  layout: KeyboardLayout
  width: number
  /** 画布高度（全屏布局下由父级测量传入），默认 480 */
  height?: number
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
  onNoteCountChange?: (count: number) => void
  onCurrentNoteChange?: (name: string) => void
}

export function FreePlayCanvas({ layout, width, height = CANVAS_H, canvasRef: externalRef, onNoteCountChange, onCurrentNoteChange }: Props) {
  const notesRef = useRef<RisingNote[]>([])
  const embersRef = useRef<Ember[]>([])
  const noteCountRef = useRef(0)
  const activeMidisRef = useRef<Set<number>>(new Set())
  const cbRef = useRef({ onNoteCountChange, onCurrentNoteChange })

  cbRef.current = { onNoteCountChange, onCurrentNoteChange }

  useEffect(() => {
    const canvas = externalRef?.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    // 监听统一音符事件
    const onAppNote = (e: Event) => {
      const detail = (e as CustomEvent<{ midi: number; on: boolean }>).detail
      if (!detail) return
      const now = performance.now()

      if (detail.on) {
        // 新音符
        notesRef.current.push({ midi: detail.midi, startMs: now, endMs: null })
        if (notesRef.current.length > MAX_NOTES) notesRef.current.shift()
        activeMidisRef.current.add(detail.midi)
        noteCountRef.current++

        // 粒子爆发
        if (!reduceMotion) {
          const g = layout.geom(detail.midi, width)
          const { h } = noteHsl(detail.midi)
          const cx = g.x + g.w / 2
          const cy = height - HIT_LINE_OFFSET
          for (let k = 0; k < 14; k++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2
            const speed = 60 + Math.random() * 120
            embersRef.current.push({
              x: cx + (Math.random() - 0.5) * g.w * 0.8,
              y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 500 + Math.random() * 300,
              maxLife: 800,
              size: 1.2 + Math.random() * 1.8,
              hue: h,
            })
          }
        }

        // 回调
        cbRef.current.onNoteCountChange?.(noteCountRef.current)
        const sorted: number[] = [...activeMidisRef.current].sort((a, b) => a - b)
        const names = sorted.map(m => noteName(m)).join(' + ')
        cbRef.current.onCurrentNoteChange?.(names)
      } else {
        // 松开
        const note = notesRef.current.find((n: RisingNote) => n.midi === detail.midi && n.endMs === null)
        if (note) note.endMs = now
        activeMidisRef.current.delete(detail.midi)
        if (activeMidisRef.current.size === 0) {
          // 稍延迟清空显示
          window.setTimeout(() => {
            if (activeMidisRef.current.size === 0) {
              cbRef.current.onCurrentNoteChange?.('')
            }
          }, 800)
        }
      }
    }
    window.addEventListener('app-note', onAppNote)

    let raf = 0
    let lastT = performance.now()

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000)
      lastT = now

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      // 背景：深夜舞台
      const bg = ctx.createLinearGradient(0, 0, 0, height)
      bg.addColorStop(0, '#0b0e15')
      bg.addColorStop(1, '#0d1019')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // 中央暖金聚光 + 四周暗角
      const halo = ctx.createRadialGradient(
        width * 0.5, height * 0.7, 0,
        width * 0.5, height * 0.7, Math.max(width, height) * 0.7,
      )
      halo.addColorStop(0, 'rgba(242,178,52,0.05)')
      halo.addColorStop(0.6, 'rgba(0,0,0,0)')
      halo.addColorStop(1, 'rgba(0,0,0,0.28)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, width, height)

      const hitY = height - HIT_LINE_OFFSET

      // 八度分隔线
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let m = layout.lo; m <= layout.hi; m++) {
        if (m % 12 === 0 && m !== layout.lo) {
          const g = layout.geom(m, width)
          ctx.beginPath()
          ctx.moveTo(g.x, 0)
          ctx.lineTo(g.x, height)
          ctx.stroke()
        }
      }

      // 上升音块
      const notes = notesRef.current

      // 同键防重叠：后按的音块顶边不超过前一个仍在屏内的音块底边，
      // 否则长按的音块越涨越高，会把先前短音的块盖住
      const topClamp = new Map<number, number>()
      const prevBottom = new Map<number, number>()
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i]
        const ageMs = now - n.startMs
        const bottomY = hitY - (ageMs / 1000) * RISE_SPEED
        const heldMs = n.endMs !== null ? n.endMs - n.startMs : now - n.startMs
        const naturalTop = bottomY - Math.max(MIN_BLOCK_H, (heldMs / 1000) * RISE_SPEED)
        const pb = prevBottom.get(n.midi)
        const topY = pb !== undefined && pb > 0 && naturalTop < pb ? pb : naturalTop
        topClamp.set(i, topY)
        prevBottom.set(n.midi, bottomY)
      }

      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i]
        const ageMs = now - n.startMs

        // 底边位置
        const bottomY = hitY - (ageMs / 1000) * RISE_SPEED
        const topY = topClamp.get(i) ?? bottomY - MIN_BLOCK_H
        const heightPx = Math.max(2, bottomY - topY)

        if (topY > height + 10 || bottomY < -20) {
          if (n.endMs !== null && bottomY < -40) notes.splice(i, 1)
          continue
        }

        const g = layout.geom(n.midi, width)
        const x = isBlack(n.midi) ? g.x : g.x + 2
        const w = isBlack(n.midi) ? g.w : g.w - 4

        const { h: hue, s: sat, l: lit } = noteHsl(n.midi)
        const isHeld = n.endMs === null

        // 渐隐（飘远后渐淡）
        const distFromLine = hitY - topY
        const fadeStart = height * 0.5
        const alpha = isHeld
          ? 0.88
          : Math.max(0, 1 - Math.max(0, distFromLine - fadeStart) / (height * 0.4)) * 0.85

        if (alpha <= 0.01) continue

        // 渐变填充
        const grad = ctx.createLinearGradient(x, topY, x, topY + heightPx)
        grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(96, lit + 12)}%, ${alpha})`)
        grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${Math.max(40, lit - 12)}%, ${alpha * 0.7})`)
        ctx.fillStyle = grad

        // 光晕
        if (isHeld) {
          ctx.shadowColor = `hsla(${hue}, ${sat}%, ${lit}%, 0.5)`
          ctx.shadowBlur = 14
        } else {
          ctx.shadowBlur = 0
        }

        // 圆角矩形
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, topY, w, heightPx, 5)
        } else {
          ctx.rect(x, topY, w, heightPx)
        }
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // 粒子
      if (!reduceMotion) {
        const embers = embersRef.current
        for (let i = embers.length - 1; i >= 0; i--) {
          const e = embers[i]
          e.life -= dt * 1000
          if (e.life <= 0) {
            embers.splice(i, 1)
            continue
          }
          e.vx *= Math.exp(-2 * dt)
          e.vy = e.vy * Math.exp(-2 * dt) - 20 * dt
          e.x += e.vx * dt
          e.y += e.vy * dt

          const t = e.life / e.maxLife
          ctx.shadowColor = `hsla(${e.hue}, 80%, 60%, ${t * 0.5})`
          ctx.shadowBlur = 8
          ctx.fillStyle = `hsla(${e.hue}, 75%, 55%, ${t})`
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.shadowBlur = 0
      }

      // 判定线（金色）
      ctx.fillStyle = 'rgba(242,178,52,0.4)'
      ctx.fillRect(0, hitY, width, 1.5)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('app-note', onAppNote)
    }
  }, [layout, width, height])

  return <canvas ref={externalRef ?? undefined} className="block" />
}

export { CANVAS_H as FREEPLAY_CANVAS_H }
