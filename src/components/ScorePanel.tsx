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

const STRIP_H = 108

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
    if (!svg || sizedRef.current) return
    const natW = parseFloat(svg.getAttribute('width') ?? '') || svg.getBoundingClientRect().width
    const natH = parseFloat(svg.getAttribute('height') ?? '') || svg.getBoundingClientRect().height
    if (!Number.isFinite(natW) || !Number.isFinite(natH) || natW === 0 || natH === 0) return
    // abcjs 的 svg 不带 viewBox：直接改高度只会裁剪，必须显式补上才能等比缩放
    svg.setAttribute('viewBox', `0 0 ${natW} ${natH}`)
    const scale = STRIP_H / natH
    svg.style.width = `${natW * scale}px`
    svg.style.height = `${STRIP_H}px`
    svg.style.display = 'block'
    sizedRef.current = true
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''
    const { abc, noteBeats } = songToAbc(song)
    noteBeatsRef.current = noteBeats
    abcjs.renderAbc(host, abc, {
      add_classes: true,
      staffwidth: Math.max(1400, song.notes.length * 60),
      paddingleft: 0,
      paddingright: 0,
    })
    elemsRef.current = Array.from(host.querySelectorAll('.abcjs-note'))
    translateRef.current = 0
    sizedRef.current = false
    sizeSvg()
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
                const target = Math.max(0, intrinsicX - outer.clientWidth * 0.35)
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
