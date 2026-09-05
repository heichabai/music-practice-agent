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

const STRIP_H_SINGLE = 150
const STRIP_H_GRAND = 205 // 大谱表两行谱，需要更高

export function ScorePanel({ song, engineRef, imageUrl, onClose }: Props) {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState<'notation' | 'image'>('notation')
  const noteBeatsRef = useRef<number[]>([])
  const elemsRef = useRef<Element[]>([])
  const translateRef = useRef(0)
  const sizedRef = useRef(false)
  const pxRef = useRef<number[]>([])
  const grandRef = useRef(false)
  /** 是否大谱表：驱动乐谱条高度（state 保证重渲染） */
  const [grand, setGrand] = useState(false)
  // 当前拍高亮集合（大谱表时左右手同时高亮）
  const lastBeatRef = useRef(-1)
  const lastSetRef = useRef<Set<number>>(new Set())

  const sizeSvg = () => {
    const host = hostRef.current
    const svg = host?.querySelector('svg')
    if (!svg || !host) return
    // abcjs 会在宿主 div 上写入内联 height/overflow，把按新尺寸渲染的 svg 齐腰裁断 —— 强制清除
    host.style.height = '100%'
    host.style.overflow = 'visible'
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
    const stripH = grandRef.current ? STRIP_H_GRAND : STRIP_H_SINGLE
    const scale = stripH / vbH
    svg.style.maxWidth = 'none'
    svg.style.width = `${vbW * scale}px`
    svg.style.height = `${stripH}px`
    svg.style.display = 'block'
    // 窄于横条的谱面水平居中，宽谱保持左对齐由滚动接管
    const container = hostRef.current?.parentElement?.parentElement
    if (container instanceof HTMLElement && innerRef.current) {
      const w = vbW * scale
      innerRef.current.style.marginLeft =
        w < container.clientWidth ? `${Math.round((container.clientWidth - w) / 2)}px` : '0px'
    }
    sizedRef.current = true
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const { abc, noteBeats, grand } = songToAbc(song)
    noteBeatsRef.current = noteBeats
    grandRef.current = grand
    setGrand(grand)

    const renderWith = (width: number) => {
      host.innerHTML = ''
      abcjs.renderAbc(host, abc, {
        add_classes: true,
        staffwidth: width,
        paddingleft: 0,
        paddingright: 0,
      })
    }

    // 谱面宽度按音符数自适应密度：短曲紧凑不稀疏，长曲封顶后靠滚动
    let width = Math.min(1400, Math.max(500, song.notes.length * 90))
    renderWith(width)
    let tries = 0
    // 防换行重渲染：大谱表一行含 2 个谱表属正常，超过才算换行
    const staffPerSystem = grand ? 2 : 1
    while (host.querySelectorAll('.abcjs-staff').length > staffPerSystem && tries < 4) {
      width = Math.ceil(width * 1.8)
      renderWith(width)
      tries++
    }

    elemsRef.current = Array.from(host.querySelectorAll('.abcjs-note'))
    translateRef.current = 0
    sizedRef.current = false
    pxRef.current = []
    lastBeatRef.current = -1
    lastSetRef.current = new Set()
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
    const tick = () => {
      const engine = engineRef.current
      if (engine) {
        const beats = noteBeatsRef.current
        const elems = elemsRef.current

        // 初次或曲目变化后：transform 归零，测量每个音符元素的固有 x 坐标（只测一次）
        if (pxRef.current.length !== beats.length && beats.length > 0) {
          const inner = innerRef.current
          if (inner !== null) {
            inner.style.transform = 'translateX(0px)'
            translateRef.current = 0
            const innerRect = inner.getBoundingClientRect()
            pxRef.current = elems.map(e => e.getBoundingClientRect().left - innerRect.left)
          }
        }

        const t = engine.songTime

        // 当前拍 = 不超过 songTime 的最大起始拍；该拍的所有音符同时高亮（双手谱左右手同步）
        let cur = -1
        for (let i = 0; i < beats.length; i++) {
          if (beats[i] <= t + 0.05 && beats[i] > cur) cur = beats[i]
        }
        if (cur !== lastBeatRef.current) {
          for (const j of lastSetRef.current) elems[j]?.classList.remove('score-current')
          const next = new Set<number>()
          if (cur >= 0) {
            for (let i = 0; i < beats.length; i++) {
              if (Math.abs(beats[i] - cur) < 0.001) next.add(i)
            }
          }
          for (const j of next) elems[j]?.classList.add('score-current')
          lastSetRef.current = next
          lastBeatRef.current = cur
        }

        // 连续插值滚动：拍点升序去重，在相邻拍点位置之间按 songTime 线性滑行
        const pxs = pxRef.current
        const inner = innerRef.current
        if (pxs.length === beats.length && beats.length > 0 && inner !== null) {
          // 拍点 → 该拍所有音符的最小 px（同拍左右手取最左者）
          const uniq: number[] = []
          const pxFor: number[] = []
          for (let i = 0; i < beats.length; i++) {
            const b = beats[i]
            const k = uniq.indexOf(b)
            if (k === -1) {
              uniq.push(b)
              pxFor.push(pxs[i])
            } else if (pxs[i] < pxFor[k]) {
              pxFor[k] = pxs[i]
            }
          }
          // uniq 已是插入序≈升序（同拍去重），保险排序
          const order = uniq.map((_, i) => i).sort((a, b) => uniq[a] - uniq[b])
          const su = order.map(i => uniq[i])
          const sp = order.map(i => pxFor[i])

          let k = 0
          while (k + 1 < su.length && su[k + 1] <= t) k++
          let x = sp[k] ?? 0
          if (k + 1 < su.length && su[k + 1] > su[k]) {
            const ratio = Math.min(1, Math.max(0, (t - su[k]) / (su[k + 1] - su[k])))
            x = (sp[k] ?? 0) + ((sp[k + 1] ?? 0) - (sp[k] ?? 0)) * ratio
          }
          const outer = inner.parentElement
          if (outer !== null) {
            const maxScroll = Math.max(0, inner.scrollWidth - outer.clientWidth)
            const target = Math.min(maxScroll, Math.max(0, x - outer.clientWidth * 0.35))
            translateRef.current = target
            inner.style.transform = `translateX(${-target}px)`
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      const elems = elemsRef.current
      for (const j of lastSetRef.current) elems[j]?.classList.remove('score-current')
      lastSetRef.current = new Set()
      lastBeatRef.current = -1
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
      <div className="overflow-hidden" style={{ height: grand ? STRIP_H_GRAND : STRIP_H_SINGLE }}>
        <div
          ref={innerRef}
          className="h-full will-change-transform"
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
