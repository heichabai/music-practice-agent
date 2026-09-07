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
const STRIP_H_SINGLE = 250
const STRIP_H_GRAND = 340 // 大谱表两行谱，需要更高。
// 注：abcjs 只按内容密度自然排版（staffwidth 只压缩不拉伸，也不支持 %%musicspace），
// 想让每个音符有更多空间、每屏显示更少小节，唯一不失真的办法就是加高谱条做等比放大。

const SVG_NS = 'http://www.w3.org/2000/svg'

/** abcjs 画的大谱表花括号位置错误（只框住低音谱表）。
 *  移除后自绘：从高音谱表顶线到低音谱表底线，标准 "{ 形。 */
function fixGrandBrace(host: HTMLElement, grand: boolean) {
  const svg = host.querySelector('svg')
  svg?.querySelectorAll('.abcjs-brace').forEach(el => el.remove())
  if (!grand || !svg) return
  const staves = Array.from(svg.querySelectorAll('.abcjs-staff'))
  if (staves.length !== 2) return

  let top = Infinity
  let bottom = -Infinity
  let left = Infinity
  for (const s of staves) {
    const bb = (s as SVGGElement).getBBox()
    top = Math.min(top, bb.y)
    bottom = Math.max(bottom, bb.y + bb.height)
    left = Math.min(left, bb.x)
  }
  const x = left - 10
  const mid = (top + bottom) / 2
  const brace = document.createElementNS(SVG_NS, 'path')
  brace.setAttribute(
    'd',
    `M ${x + 8} ${top} ` +
      `C ${x + 3} ${top}, ${x} ${top + 2}, ${x} ${top + 8} ` +
      `V ${mid - 8} ` +
      `C ${x} ${mid - 4}, ${x - 8} ${mid - 4}, ${x - 8} ${mid} ` +
      `C ${x - 8} ${mid + 4}, ${x} ${mid + 4}, ${x} ${mid + 8} ` +
      `V ${bottom - 8} ` +
      `C ${x} ${bottom - 2}, ${x + 3} ${bottom}, ${x + 8} ${bottom}`,
  )
  brace.setAttribute('fill', 'none')
  brace.setAttribute('stroke', '#1a1a1a')
  brace.setAttribute('stroke-width', '1.8')
  brace.setAttribute('stroke-linecap', 'round')
  brace.setAttribute('class', 'grand-brace')
  svg.appendChild(brace)
}

interface AlignEvent {
  beat: number
  el: Element
  /** 符头中心 x（无符头的休止符取整体中心） */
  anchor: number
  /** 锚点左侧占用（含临时记号） */
  leftW: number
  /** 锚点右侧占用（含符干/符尾/附点） */
  rightW: number
  shift: number
}

/** 逐拍重排：abcjs 排版密度固定（staffwidth 只压不撑、不支持 %%musicspace），
 *  且多声部时拍点并不跨声部对齐。这里以"拍 → x"为准重排：
 *  - 间距与时值成正比：相邻事件间隔 = 拍差 × PER_BEAT（八分窄、四分宽、二分更宽）；
 *  - bbox 防重叠兜底（含临时记号/符干/附点的真实占用宽度）；
 *  - 同拍跨声部对齐到同一 x；整体只右移不压缩；
 *  - 小节线移到各小节统一末尾；连梁随符干平移+拉伸。
 *  返回各小节统一的小节线 x（供大谱表连通线使用）；数据不齐时返回 null（保持原样）。 */
function alignStaves(host: HTMLElement, eventBeats: number[][]): number[] | null {
  const svg = host.querySelector('svg')
  if (!svg) return null
  const voiceCount = eventBeats.length
  if (voiceCount === 0) return null

  // —— 测量阶段：全部 getBBox 必须发生在任何 transform 之前 ——
  const voices: AlignEvent[][] = []
  for (let v = 0; v < voiceCount; v++) {
    const els = Array.from(svg.querySelectorAll(`.abcjs-v${v}`)).filter(
      el => el.classList.contains('abcjs-note') || el.classList.contains('abcjs-rest'),
    )
    const beats = eventBeats[v] ?? []
    if (els.length === 0 || els.length !== beats.length) {
      console.warn('[ScorePanel] 对齐跳过：事件数与渲染元素数不一致', {
        voice: v,
        elements: els.length,
        beats: beats.length,
      })
      return null
    }
    voices.push(
      els.map((el, k) => {
        const head = el.querySelector('.abcjs-notehead') ?? el
        const hb = (head as SVGGraphicsElement).getBBox()
        const gb = (el as SVGGElement).getBBox()
        const anchor = hb.x + hb.width / 2
        return {
          beat: beats[k] ?? 0,
          el,
          anchor,
          leftW: Math.max(anchor - gb.x, hb.width / 2),
          rightW: Math.max(gb.x + gb.width - anchor, hb.width / 2),
          shift: 0,
        }
      }),
    )
  }
  const barEls: SVGGElement[][] = []
  for (let v = 0; v < voiceCount; v++) {
    barEls.push(Array.from(svg.querySelectorAll(`.abcjs-bar.abcjs-v${v}`)) as SVGGElement[])
  }
  const N = barEls[0]?.length ?? 0
  if (N === 0 || barEls.some(list => list.length !== N)) return null
  const barX = barEls.map(list => list.map(el => el.getBBox().x))

  // —— 计算阶段：逐小节、逐拍求目标 x（只加宽） ——
  const PER_BEAT = 24 // 每拍水平占位（单位：谱面单位，线间距 ≈ 7.75）
  const PAD = 6 // 相邻拍组边缘留白（不含符头/记号自身宽度）
  const BAR_PAD = 14 // 小节线后首事件留白
  const barTarget: number[] = []
  const G: number[] = new Array(voiceCount).fill(0) // 各声部进入当前小节时的累计右移量
  let prevBarRight = -Infinity
  for (let i = 0; i < N; i++) {
    const evs = voices.map(vs => vs.filter(e => Math.floor(e.beat / 4) === i))
    let base = -Infinity
    for (let v = 0; v < voiceCount; v++) {
      const first = evs[v]?.[0]
      if (first !== undefined) base = Math.max(base, first.anchor + (G[v] ?? 0))
    }
    if (i > 0) base = Math.max(base, prevBarRight + BAR_PAD)

    const byBeat = new Map<number, { v: number; e: AlignEvent }[]>()
    for (let v = 0; v < voiceCount; v++) {
      for (const e of evs[v] ?? []) {
        const arr = byBeat.get(e.beat) ?? []
        arr.push({ v, e })
        byBeat.set(e.beat, arr)
      }
    }
    let right = base
    let prevTarget = -Infinity
    let prevBeat = 0
    let prevRightW = 0
    for (const b of [...byBeat.keys()].sort((a, b2) => a - b2)) {
      const group = byBeat.get(b) ?? []
      const gLeftW = Math.max(0, ...group.map(g => g.e.leftW))
      const gRightW = Math.max(0, ...group.map(g => g.e.rightW))
      let target = base
      for (const { v, e } of group) target = Math.max(target, e.anchor + (G[v] ?? 0))
      if (prevTarget !== -Infinity) {
        // 时值比例空间：与前一事件的拍差越大，占位越宽
        target = Math.max(target, prevTarget + (b - prevBeat) * PER_BEAT)
        // 前组右缘 + 留白 + 本组左缘：保证两组 bbox 绝不重叠
        target = Math.max(target, prevTarget + prevRightW + gLeftW + PAD)
      } else if (i > 0) {
        // 小节首组：左缘（含临时记号）不越过小节线
        target = Math.max(target, prevBarRight + 4 + gLeftW)
      }
      for (const { e } of group) e.shift = target - e.anchor
      right = Math.max(right, target + gRightW + 10)
      prevTarget = target
      prevBeat = b
      prevRightW = gRightW
    }
    // 只加宽：不小于任一声部原小节线（平移后）的位置
    let t = right
    for (let v = 0; v < voiceCount; v++) t = Math.max(t, (barX[v]?.[i] ?? 0) + (G[v] ?? 0))
    barTarget.push(t)
    prevBarRight = t
    for (let v = 0; v < voiceCount; v++) G[v] = t - (barX[v]?.[i] ?? 0)
  }

  // —— 应用阶段 ——
  const shiftEl = (el: Element, dx: number) => {
    if (Math.abs(dx) < 0.01) return
    const prev = el.getAttribute('transform') ?? ''
    el.setAttribute('transform', `translate(${dx} 0)${prev === '' ? '' : ` ${prev}`}`)
  }
  for (const vs of voices) for (const e of vs) shiftEl(e.el, e.shift)
  for (let v = 0; v < voiceCount; v++) {
    for (let i = 0; i < N; i++) {
      const el = barEls[v]?.[i]
      if (el !== undefined) shiftEl(el, (barTarget[i] ?? 0) - (barX[v]?.[i] ?? 0))
    }
  }

  // 非事件元素：连梁按首尾符干平移+拉伸；临时记号/附点/连线等跟随最近事件
  const voiceSel = Array.from({ length: voiceCount }, (_, v) => `.abcjs-v${v}`).join(', ')
  for (const el of Array.from(svg.querySelectorAll(voiceSel))) {
    const cls = el.getAttribute('class') ?? ''
    if (
      el.classList.contains('abcjs-note') ||
      el.classList.contains('abcjs-rest') ||
      el.classList.contains('abcjs-bar')
    ) {
      continue
    }
    if (/clef|key|meter|time|staff|brace|title|tempo/.test(cls)) continue
    const vm = /abcjs-v(\d)/.exec(cls)?.[1]
    const v = vm === undefined ? -1 : Number(vm)
    const m = Number(/abcjs-m(\d+)/.exec(cls)?.[1])
    if (v < 0 || v >= voiceCount || !Number.isFinite(m) || m < 0 || m >= N) continue
    const evs = (voices[v] ?? []).filter(e => Math.floor(e.beat / 4) === m)
    if (evs.length === 0) continue
    const bb = (el as SVGGElement).getBBox()
    if (cls.includes('beam')) {
      // 连梁端点按符干 x 精确匹配（±3）：符干就是连梁锚点。
      // 不能用锚点±容差粗配——十六分音符间距仅 ~11 单位，会把邻组音符吸进来取错位移。
      const stemX = (e: AlignEvent): number => {
        const stem = e.el.querySelector('.abcjs-stem')
        if (stem === null) return e.anchor
        const sb = (stem as SVGGraphicsElement).getBBox()
        return sb.x + sb.width / 2
      }
      let sL: number | null = null
      let sR: number | null = null
      for (const e of evs) {
        const sx0 = stemX(e)
        if (sL === null && Math.abs(sx0 - bb.x) < 3) sL = e.shift
        if (sR === null && Math.abs(sx0 - (bb.x + bb.width)) < 3) sR = e.shift
      }
      if (sL === null && sR === null) continue
      const leftShift = sL ?? sR ?? 0
      const rightShift = sR ?? sL ?? 0
      const x1 = bb.x
      const x2 = bb.x + bb.width
      const sx = (x2 + rightShift - (x1 + leftShift)) / Math.max(1, x2 - x1)
      const tx = x1 + leftShift - sx * x1
      const prev = el.getAttribute('transform') ?? ''
      el.setAttribute('transform', `matrix(${sx} 0 0 1 ${tx} 0)${prev === '' ? '' : ` ${prev}`}`)
      continue
    }
    const cx = bb.x + bb.width / 2
    let best = evs[0]
    for (const e of evs) {
      if (best === undefined || Math.abs(e.anchor - cx) < Math.abs(best.anchor - cx)) best = e
    }
    if (best !== undefined) shiftEl(el, best.shift)
  }

  // 谱表横线右缘延长到最后一条小节线（对齐只加宽，原线不够长时补齐）
  const lastBar = barTarget[N - 1] ?? 0
  for (const s of Array.from(svg.querySelectorAll('.abcjs-staff'))) {
    const sb = (s as SVGGElement).getBBox()
    const newRight = Math.max(sb.x + sb.width, lastBar)
    if (newRight <= sb.x + sb.width + 1) continue
    s.querySelectorAll('path').forEach(p => {
      const d = p.getAttribute('d') ?? ''
      const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) ?? []
      if (nums.length === 0) return
      const maxX = Math.max(...nums)
      p.setAttribute(
        'd',
        d.replace(new RegExp(String(maxX).replace('.', '\\.'), 'g'), newRight.toFixed(2)),
      )
    })
  }
  return barTarget
}

/** 大谱表小节线连通：标准大谱表中小节线从高音谱表顶线一路画到低音谱表底线，
 *  上下谱表的小节线因此对齐成一条线。abcjs 只在各谱表内画短节线，这里补画连通竖线
 *  （含行首系统小节线）。优先用逐拍对齐后的小节线 x；否则退化为上方谱表的小节线位置。 */
function connectGrandBarlines(host: HTMLElement, grand: boolean, barTargets: number[] | null) {
  if (!grand) return
  const svg = host.querySelector('svg')
  if (!svg) return
  const staves = Array.from(svg.querySelectorAll('.abcjs-staff'))
  if (staves.length !== 2) return
  const topBb = (staves[0] as SVGGElement).getBBox()
  const botBb = (staves[1] as SVGGElement).getBBox()
  const y1 = topBb.y
  const y2 = botBb.y + botBb.height

  const xs: number[] = [topBb.x] // 行首系统小节线
  if (barTargets !== null && barTargets.length > 0) {
    xs.push(...barTargets.map(x => x + 0.5))
  } else {
    svg.querySelectorAll('.abcjs-bar.abcjs-v0').forEach(bar => {
      const line = bar.querySelector('path, line, rect')
      const bb = (line as SVGGraphicsElement | null)?.getBBox?.()
      if (bb) xs.push(bb.x + bb.width / 2)
    })
  }

  for (const x of xs) {
    const conn = document.createElementNS(SVG_NS, 'line')
    conn.setAttribute('x1', String(x))
    conn.setAttribute('x2', String(x))
    conn.setAttribute('y1', String(y1))
    conn.setAttribute('y2', String(y2))
    conn.setAttribute('stroke', '#000000')
    conn.setAttribute('stroke-width', '1')
    conn.setAttribute('class', 'grand-bar-connector')
    svg.appendChild(conn)
  }
}

export function ScorePanel({ song, engineRef, imageUrl, onClose }: Props) {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const imgBoxRef = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState<'notation' | 'image'>('notation')
  const tabRef = useRef(tab)
  tabRef.current = tab
  const totalBeatsRef = useRef(0)
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
    const { abc, noteBeats, grand, eventBeats } = songToAbc(song)
    noteBeatsRef.current = noteBeats
    grandRef.current = grand
    setGrand(grand)
    totalBeatsRef.current = Math.max(0, ...song.notes.map(n => n.time + n.duration))

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
    const barTargets = alignStaves(host, eventBeats)
    fixGrandBrace(host, grand)
    connectGrandBarlines(host, grand, barTargets)
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

        // 原图 tab：按弹奏进度等比横向跟踪（大图像素坐标无映射，取线性近似）
        if (tabRef.current === 'image') {
          const box = imgBoxRef.current
          const total = totalBeatsRef.current
          if (box !== null && total > 0) {
            const ratio = Math.min(1, Math.max(0, t / total))
            box.scrollLeft = ratio * Math.max(0, box.scrollWidth - box.clientWidth)
          }
        }

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
          <div ref={imgBoxRef} className="h-full overflow-auto">
            {/* 原始尺寸显示：高清谱图自然呈现放大效果，可拖动滚动，随进度横向跟踪 */}
            <img src={imageUrl} alt={song.name} className="block max-w-none rounded" />
          </div>
        )}
      </div>
    </div>
  )
}
