import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import abcjs from 'abcjs'
import type { Song } from '../types'
import type { GameEngine } from '../game/engine'
import { songToAbc } from '../game/abcNotation'

interface Props {
  song: Song
  engineRef: RefObject<GameEngine | null>
  imageUrl?: string
  onClose: () => void
}

const STRIP_H = 150

export function ScorePanel({ song, engineRef, imageUrl, onClose }: Props) {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState<'notation' | 'image'>('notation')
  const noteBeatsRef = useRef<number[]>([])
  const elemsRef = useRef<Element[]>([])
  const translateRef = useRef(0)
  const sizedRef = useRef(false)

  const sizeSvg = () => {
    const svg = hostRef.current?.querySelector('svg')
    if (!svg) return
    // 自愈：已 sizing 且 viewBox 仍在就跳过；viewBox 丢失则重做
    if (sizedRef.current && svg.getAttribute('viewBox') !== null) return
    // getBBox 量出全部已绘制内容（含越界的符干/符尾/加线）的真实边界，viewBox 精确贴合
    let bb: { x: number; y: number; width: number; height: number }
    try {
      bb = svg.getBBox()
    } catch {
      return
    }
    if (bb.width === 0 || bb.height === 0) return
    // 小边距防抗锯齿裁边即可：缩放以内容为主，谱面占满横条
    const margin = 4
    const vbW = bb.width + margin * 2
    const vbH = bb.height + margin * 2
    svg.setAttribute('viewBox', `${bb.x - margin} ${bb.y - margin} ${vbW} ${vbH}`)
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    const scale = STRIP_H / vbH
    svg.style.width = `${vbW * scale}px`
    svg.style.height = `${STRIP_H}px`
    svg.style.display = 'block'
    sizedRef.current = true
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const { abc, noteBeats } = songToAbc(song)
    noteBeatsRef.current = noteBeats

    const renderWith = (width: number) => {
      host.innerHTML = ''
      abcjs.renderAbc(host, abc, {
        add_classes: true,
        staffwidth: width,
        paddingleft: 0,
        paddingright: 0,
      })
    }

    // 用谱线条数（而非总高度）判断折行，折了就加宽重排，保证单行
    let width = Math.max(1600, song.notes.length * 80)
    renderWith(width)
    let tries = 0
    while (host.querySelectorAll('.abcjs-staff').length > 1 && tries < 4) {
      width = Math.ceil(width * 1.8)
      renderWith(width)
      tries++
    }

    elemsRef.current = Array.from(host.querySelectorAll('.abcjs-note'))
    translateRef.current = 0
    sizedRef.current = false
    sizeSvg()

    // 字体加载会改变字形布局：字体就绪后重渲染并重测量（异步竞态的真正源头）
    let cancelled = false
    if (document.fonts?.ready !== undefined) {
      void document.fonts.ready.then(() => {
        if (cancelled) return
        sizedRef.current = false
        sizeSvg()
        // 若自校验失败（viewBox 未落上），再重试一次
        const svg = hostRef.current?.querySelector('svg')
        if (svg !== null && svg !== undefined && svg.getAttribute('viewBox') === null) {
          sizedRef.current = false
          sizeSvg()
        }
      })
    }
    return () => {
      cancelled = true
    }
  }, [song])

  useEffect(() => {
    if (tab === 'notation') sizeSvg()
  }, [tab])

  useEffect(() => {
    let raf = 0
    let lastIdx = -1
    const tick = () => {
      const engine = engineRef.current
      if (engine) {
        const beats = noteBeatsRef.current
        let idx = -1
        for (let i = 0; i < beats.length; i++) {
          if (beats[i] <= engine.songTime + 0.05) idx = i
          else break
        }
        if (idx !== lastIdx) {
          const elems = elemsRef.current
          if (lastIdx >= 0 && elems[lastIdx]) elems[lastIdx].classList.remove('score-current')
          const inner = innerRef.current
          if (idx >= 0 && elems[idx]) {
            elems[idx].classList.add('score-current')
            if (inner !== null) {
              const outer = inner.parentElement
              if (outer !== null) {
                const innerRect = inner.getBoundingClientRect()
                const elemRect = elems[idx].getBoundingClientRect()
                const intrinsicX = elemRect.left - innerRect.left + translateRef.current
                const maxScroll = Math.max(0, inner.scrollWidth - outer.clientWidth)
                const target = Math.min(
                  maxScroll,
                  Math.max(0, intrinsicX - outer.clientWidth * 0.35),
                )
                translateRef.current = target
                inner.style.transform = `translateX(${-target}px)`
              }
            }
          }
          lastIdx = idx
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      const elems = elemsRef.current
      if (lastIdx >= 0 && elems[lastIdx]) elems[lastIdx].classList.remove('score-current')
    }
  }, [engineRef])

  return (
    <div className="score-strip relative border-b border-border-subtle bg-raised/40">
      {imageUrl !== undefined && (
        <div className="absolute right-12 top-1.5 z-10 flex overflow-hidden rounded-full border border-border-strong text-[10px]">
          <button
            onClick={() => setTab('notation')}
            className={`px-2.5 py-0.5 transition-colors ${
              tab === 'notation' ? 'bg-primary text-base' : 'text-secondary hover:text-primary'
            }`}
          >
            五线谱
          </button>
          <button
            onClick={() => setTab('image')}
            className={`px-2.5 py-0.5 transition-colors ${
              tab === 'image' ? 'bg-primary text-base' : 'text-secondary hover:text-primary'
            }`}
          >
            原图
          </button>
        </div>
      )}
      <button
        onClick={onClose}
        aria-label="关闭乐谱条"
        className="absolute right-2 top-0.5 z-10 rounded-full px-2 py-0.5 text-sm text-muted transition-colors hover:text-wrong"
      >
        ×
      </button>
      <div className="overflow-hidden" style={{ height: STRIP_H }}>
        <div
          ref={innerRef}
          className="h-full transition-transform duration-300 will-change-transform"
          style={{ display: tab === 'notation' ? 'inline-block' : 'none' }}
        >
          <div ref={hostRef} className="h-full" />
        </div>
        {tab === 'image' && imageUrl !== undefined && (
          <div className="flex h-full items-center justify-center overflow-x-auto px-4">
            <img src={imageUrl} alt={song.name} className="max-h-full w-auto rounded" />
          </div>
        )}
      </div>
    </div>
  )
}
