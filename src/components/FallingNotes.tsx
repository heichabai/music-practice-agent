import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { GameEngine } from '../game/engine'
import { KeyboardLayout } from '../game/keyboard'
import { noteHsl } from './notesPalette'

export const CANVAS_H = 420
const HIT_LINE_OFFSET = 36
const VISIBLE_BEATS = 4

interface Props {
  engineRef: RefObject<GameEngine | null>
  layout: KeyboardLayout
  width: number
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

/** 给定 hsl 构建 canvas 线性渐变（顶亮底深），alpha 是整体透明度 */
function makeGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  hs: { h: number; s: number; l: number },
  alpha: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, `hsla(${hs.h}, ${hs.s}%, ${Math.min(85, hs.l + 25)}%, ${alpha})`)
  g.addColorStop(0.5, `hsla(${hs.h}, ${hs.s}%, ${hs.l}%, ${alpha})`)
  g.addColorStop(1, `hsla(${hs.h}, ${hs.s}%, ${Math.max(20, hs.l - 25)}%, ${alpha})`)
  return g
}

export function FallingNotes({ engineRef, layout, width }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.floor(CANVAS_H * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${CANVAS_H}px`

    let raf = 0
    const draw = (now: number) => {
      const engine = engineRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, CANVAS_H)

      // 背景：深色径向 + 垂直渐变，营造舞台感
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      bg.addColorStop(0, '#0b1024')
      bg.addColorStop(0.5, '#070b1c')
      bg.addColorStop(1, '#050912')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, CANVAS_H)

      // 顶部暖光（聚光灯感）
      const spot = ctx.createRadialGradient(width / 2, -40, 0, width / 2, -40, width * 0.7)
      spot.addColorStop(0, 'rgba(245,158,11,0.10)')
      spot.addColorStop(1, 'rgba(245,158,11,0)')
      ctx.fillStyle = spot
      ctx.fillRect(0, 0, width, CANVAS_H * 0.6)

      if (engine) {
        const hitY = CANVAS_H - HIT_LINE_OFFSET
        const pxPerBeat = (hitY - 12) / VISIBLE_BEATS

        // 八度分隔线
        ctx.strokeStyle = 'rgba(148,163,184,0.10)'
        ctx.lineWidth = 1
        for (let m = layout.lo; m <= layout.hi; m++) {
          if (m % 12 === 0) {
            const g = layout.geom(m, width)
            ctx.beginPath()
            ctx.moveTo(g.x, 0)
            ctx.lineTo(g.x, CANVAS_H)
            ctx.stroke()
          }
        }

        // 音符方块
        for (let i = 0; i < engine.song.notes.length; i++) {
          const note = engine.song.notes[i]
          const state = engine.states[i]
          const bottom = hitY + (engine.songTime - note.time) * pxPerBeat
          const top = bottom - Math.max(0.25, note.duration) * pxPerBeat + 5
          if (bottom < -10 || top > CANVAS_H) continue

          const g = layout.geom(note.midi, width)
          const x = g.black ? g.x : g.x + 2
          const w = g.black ? g.w : g.w - 4
          const h = Math.max(14, bottom - top)
          const hs = noteHsl(note.midi)

          let fill: CanvasGradient | string
          let glow: string | null = null
          let stroke: string | null = null

          if (state === 'hit') {
            // 命中：翠绿爆闪（短暂）+ 强发光
            fill = makeGradient(ctx, x, top, h, { h: 150, s: 80, l: 55 }, 1)
            glow = 'rgba(34,197,94,0.85)'
          } else if (state === 'missed') {
            fill = makeGradient(ctx, x, top, h, { h: 0, s: 80, l: 55 }, 0.8)
            glow = 'rgba(239,68,68,0.7)'
          } else if (state === 'active') {
            // 目标音：按音高霓虹色 + 强发光 + 边缘亮线 + 透明度脉冲
            const pulse = 0.85 + 0.15 * Math.sin(now / 180)
            fill = makeGradient(ctx, x, top, h, hs, pulse)
            glow = `hsla(${hs.h}, ${hs.s}%, ${Math.min(80, hs.l + 15)}%, 0.85)`
            stroke = `hsla(${hs.h}, ${hs.s}%, 92%, 0.95)`
          } else {
            // pending：按音高但低饱和度
            fill = makeGradient(ctx, x, top, h, { h: hs.h, s: hs.s, l: Math.max(40, hs.l - 5) }, 0.85)
            glow = `hsla(${hs.h}, ${hs.s}%, ${hs.l}%, 0.35)`
          }

          // 发光
          if (glow) {
            ctx.shadowColor = glow
            ctx.shadowBlur = state === 'pending' ? 6 : 18
          } else {
            ctx.shadowBlur = 0
          }

          ctx.fillStyle = fill
          roundRect(ctx, x, top, w, h, 5)
          ctx.fill()

          // 顶部高光线（强化立体感）
          if (h > 16) {
            ctx.shadowBlur = 0
            const hl = ctx.createLinearGradient(x, top, x, top + Math.min(8, h * 0.3))
            hl.addColorStop(0, 'rgba(255,255,255,0.35)')
            hl.addColorStop(1, 'rgba(255,255,255,0)')
            ctx.fillStyle = hl
            roundRect(ctx, x, top, w, Math.min(8, h * 0.3), 5)
            ctx.fill()
          }

          // 目标音：亮边
          if (stroke) {
            ctx.shadowBlur = 0
            ctx.strokeStyle = stroke
            ctx.lineWidth = 1.5
            roundRect(ctx, x + 0.5, top + 0.5, w - 1, h - 1, 5)
            ctx.stroke()
          }
        }

        // 判定线：发光横线（中央亮、两端渐隐）+ 等待时暖金脉冲
        ctx.shadowBlur = 0
        const judgeGlow = ctx.createLinearGradient(0, hitY, width, hitY)
        const waitAlpha = engine.waiting ? 0.6 + 0.4 * Math.sin(now / 220) : 0.7
        if (engine.waiting) {
          judgeGlow.addColorStop(0, 'rgba(245,158,11,0)')
          judgeGlow.addColorStop(0.5, `rgba(251,191,36,${waitAlpha})`)
          judgeGlow.addColorStop(1, 'rgba(245,158,11,0)')
        } else {
          judgeGlow.addColorStop(0, 'rgba(148,163,184,0)')
          judgeGlow.addColorStop(0.5, 'rgba(203,213,225,0.85)')
          judgeGlow.addColorStop(1, 'rgba(148,163,184,0)')
        }
        ctx.fillStyle = judgeGlow
        ctx.fillRect(0, hitY - 1, width, 3)

        // 中心判定点（一个小光核）
        ctx.shadowColor = engine.waiting ? 'rgba(251,191,36,0.9)' : 'rgba(203,213,225,0.7)'
        ctx.shadowBlur = 14
        ctx.fillStyle = engine.waiting ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.arc(width / 2, hitY + 0.5, 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [engineRef, layout, width])

  return <canvas ref={canvasRef} className="block w-full" />
}