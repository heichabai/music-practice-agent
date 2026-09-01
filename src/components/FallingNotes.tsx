import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { GameEngine } from '../game/engine'
import { KeyboardLayout } from '../game/keyboard'
import { noteHsl } from './notesPalette'

export const CANVAS_H = 420
const HIT_LINE_OFFSET = 28
const VISIBLE_BEATS = 4

interface Props {
  engineRef: RefObject<GameEngine | null>
  layout: KeyboardLayout
  width: number
}

// 余烬 / 光晕粒子
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

const TRAIL_INTERVAL_MS = 75     // 每条音符两次拖尾发射最小间隔
const TRAIL_PROBABILITY = 0.85    // 达到间隔后实际发射概率
const TRAIL_NEAR_BEATS = 0.35     // 仅当 |noteTime - songTime| < 此值才发射拖尾
const HIT_BURST_COUNT = 26       // 命中瞬间每个音符的粒子数
const MAX_ALIVE = 360            // 粒子总上限

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

function makeNoteGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  hue: number,
  sat: number,
  lit: number,
  alpha: number,
): CanvasGradient {
  // 顶亮核 → 中饱和 → 底深
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(96, lit + 11)}%, ${alpha})`)
  g.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${lit}%, ${alpha})`)
  g.addColorStop(1, `hsla(${hue}, ${sat}%, ${Math.max(45, lit - 16)}%, ${alpha})`)
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

    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    const embers: Ember[] = []
    const prevStates: (string | null)[] = []
    const lastTrailAt = new Map<number, number>()
    // 命中闪光环：noteIndex → 命中时刻
    const hitRings = new Map<number, number>()

    let raf = 0
    let lastT = performance.now()

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000)
      lastT = now
      const engine = engineRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, CANVAS_H)

      // 背景：近纯黑（极简外壳）
      ctx.fillStyle = '#0a0a0b'
      ctx.fillRect(0, 0, width, CANVAS_H)

      // 中央微亮晕影（相机感）：稍微提亮画布中央，让粒子/音符更突出
      const halo = ctx.createRadialGradient(
        width * 0.5,
        CANVAS_H * 0.55,
        0,
        width * 0.5,
        CANVAS_H * 0.55,
        Math.max(width, CANVAS_H) * 0.85,
      )
      halo.addColorStop(0, 'rgba(255,255,255,0.02)')
      halo.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, width, CANVAS_H)

      if (!engine) {
        raf = requestAnimationFrame(draw)
        return
      }

      const hitY = CANVAS_H - HIT_LINE_OFFSET
      const pxPerBeat = (hitY - 12) / VISIBLE_BEATS

      // ---------- 粒子生成 ----------
      if (!reduceMotion) {
        // 1) 命中爆发
        for (let i = 0; i < engine.song.notes.length; i++) {
          const cur = engine.states[i]
          const prev = prevStates[i]
          if (cur === 'hit' && prev !== 'hit') {
            hitRings.set(i, now)
            const note = engine.song.notes[i]
            const g = layout.geom(note.midi, width)
            const hs = noteHsl(note.midi)
            const cx = g.x + g.w / 2
            // 取音符当前可见位置近似
            const noteBottom = hitY + (engine.songTime - note.time) * pxPerBeat
            const noteTop = noteBottom - Math.max(0.25, note.duration) * pxPerBeat + 5
            const cy = (noteTop + Math.min(noteBottom, hitY)) / 2

            const space = MAX_ALIVE - embers.length
            const count = Math.min(HIT_BURST_COUNT, Math.max(0, space))
            for (let k = 0; k < count; k++) {
              // 半球分布，向上偏置：让爆发读起来像"焰火绽放"
              const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3
              const speed = 70 + Math.random() * 160
              const maxLife = 750 + Math.random() * 600
              embers.push({
                x: cx + (Math.random() - 0.5) * g.w * 0.8,
                y: cy + (Math.random() - 0.5) * 16,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: maxLife,
                maxLife,
                size: 1.4 + Math.random() * 2.0,
                hue: hs.h,
              })
            }
          }
        }

        // 2) 下落音符持续发光拖尾：音符在接近命中线时持续"流出"小光点
        for (let i = 0; i < engine.song.notes.length; i++) {
          const note = engine.song.notes[i]
          const state = engine.states[i]
          if (state !== 'pending' && state !== 'active') continue
          const offset = engine.songTime - note.time
          if (Math.abs(offset) > TRAIL_NEAR_BEATS) continue
          const last = lastTrailAt.get(i) ?? 0
          if (now - last < TRAIL_INTERVAL_MS) continue
          if (Math.random() > TRAIL_PROBABILITY) continue
          lastTrailAt.set(i, now)

          const g = layout.geom(note.midi, width)
          const hs = noteHsl(note.midi)
          const cx = g.x + g.w / 2
          const bottom = hitY + offset * pxPerBeat

          // 拖尾粒子从音符顶端略上方生成，轻柔向上飘，让音
          // 符在画面中像披着一层辉光
          const maxLife = 380 + Math.random() * 240
          embers.push({
            x: cx + (Math.random() - 0.5) * g.w * 0.5,
            y: bottom - Math.max(0.25, note.duration) * pxPerBeat + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 8,
            vy: -8 - Math.random() * 16,
            life: maxLife,
            maxLife,
            size: 0.7 + Math.random() * 1.1,
            hue: hs.h,
          })
        }
      }

      // 同步 prevStates
      for (let i = 0; i < engine.song.notes.length; i++) {
        prevStates[i] = engine.states[i]
      }

      // ---------- 绘制粒子（在音符下面，让音符有"光辉扑出"） ----------
      if (!reduceMotion) {
        for (let i = embers.length - 1; i >= 0; i--) {
          const e = embers[i]
          e.life -= dt * 1000
          if (e.life <= 0) {
            embers.splice(i, 1)
            continue
          }
          e.vx *= Math.exp(-1.6 * dt)
          e.vy = e.vy * Math.exp(-1.6 * dt) - 12 * dt // 微弱上升
          e.x += e.vx * dt
          e.y += e.vy * dt

          const t = e.life / e.maxLife
          const flicker = 0.7 + 0.3 * Math.abs(Math.sin(now / 38 + i))
          const alpha = Math.max(0, t) * flicker

          ctx.shadowColor = `hsla(${e.hue}, 80%, 78%, ${alpha * 0.85})`
          ctx.shadowBlur = 12
          ctx.fillStyle = `hsla(${e.hue}, 80%, 92%, ${alpha})`
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.shadowBlur = 0
      }

      // ---------- 命中闪光环：命中线上一圈快速扩散的光环（信息性反馈，reduceMotion 下保留） ----------
      for (const [noteIdx, tHit] of hitRings) {
        const age = now - tHit
        if (age > 380) {
          hitRings.delete(noteIdx)
          continue
        }
        const note = engine.song.notes[noteIdx]
        const g = layout.geom(note.midi, width)
        const progress = age / 380
        const radius = 10 + progress * 30
        ctx.beginPath()
        ctx.arc(g.x + g.w / 2, hitY, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - progress) * 0.5})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // ---------- 绘制音符 ----------
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

        let fill: CanvasGradient
        let blur = 0
        let shadowCol: string | null = null

        if (state === 'hit') {
          // 命中：翠绿渐变 + 强 bloom
          fill = makeNoteGradient(ctx, x, top, h, 150, 75, 60, 1)
          blur = reduceMotion ? 0 : 14
          shadowCol = 'rgba(34,197,94,0.72)'
        } else if (state === 'missed') {
          fill = makeNoteGradient(ctx, x, top, h, 0, 75, 55, 0.85)
          blur = reduceMotion ? 0 : 9
          shadowCol = 'rgba(239,68,68,0.55)'
        } else if (state === 'active') {
          const pulse = 0.82 + 0.18 * Math.sin(now / 220)
          fill = makeNoteGradient(ctx, x, top, h, hs.h, hs.s, hs.l, pulse)
          blur = reduceMotion ? 0 : 12
          shadowCol = `hsla(${hs.h}, ${hs.s}%, ${Math.min(92, hs.l + 14)}%, 0.6)`
        } else {
          // pending：贴底色但保留极淡光晕
          fill = makeNoteGradient(
            ctx,
            x,
            top,
            h,
            hs.h,
            hs.s - 10,
            Math.max(45, hs.l - 12),
            0.85,
          )
          blur = reduceMotion ? 0 : 5
          shadowCol = `hsla(${hs.h}, ${hs.s}%, ${hs.l}%, 0.4)`
        }

        if (shadowCol && blur > 0) {
          ctx.shadowColor = shadowCol
          ctx.shadowBlur = blur
        } else {
          ctx.shadowBlur = 0
        }

        ctx.fillStyle = fill
        roundRect(ctx, x, top, w, h, 5)
        ctx.fill()
      }

      // ---------- 判定线：1px 发丝 ----------
      ctx.shadowBlur = 0
      const waitAlpha = engine.waiting
        ? 0.32 + 0.12 * Math.sin(now / 240)
        : 0.16
      ctx.fillStyle = `rgba(237,237,238,${waitAlpha})`
      ctx.fillRect(0, hitY, width, 1)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [engineRef, layout, width])

  return <canvas ref={canvasRef} className="block w-full" />
}