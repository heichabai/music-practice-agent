import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { GameEngine } from '../game/engine'
import { KeyboardLayout } from '../game/keyboard'

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

      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      bg.addColorStop(0, '#020617')
      bg.addColorStop(1, '#0f172a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, CANVAS_H)

      if (engine) {
        const hitY = CANVAS_H - HIT_LINE_OFFSET
        const pxPerBeat = (hitY - 12) / VISIBLE_BEATS

        // 八度分隔线
        ctx.strokeStyle = 'rgba(148,163,184,0.12)'
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

          if (state === 'hit') {
            ctx.fillStyle = 'rgba(34,197,94,0.85)'
          } else if (state === 'missed') {
            ctx.fillStyle = 'rgba(239,68,68,0.75)'
          } else if (state === 'active') {
            const pulse = 0.7 + 0.3 * Math.sin(now / 120)
            ctx.fillStyle = `rgba(245,158,11,${pulse.toFixed(3)})`
          } else {
            ctx.fillStyle = 'rgba(226,232,240,0.9)'
          }
          roundRect(ctx, x, top, w, h, 5)
          ctx.fill()
        }

        // 判定线
        ctx.fillStyle = engine.waiting
          ? 'rgba(245,158,11,0.95)'
          : 'rgba(148,163,184,0.7)'
        ctx.fillRect(0, hitY, width, 2)
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [engineRef, layout, width])

  return <canvas ref={canvasRef} className="block rounded-lg" />
}
