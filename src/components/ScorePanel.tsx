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
}

export function ScorePanel({ song, engineRef, imageUrl }: Props) {
  const notationRef = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState<'notation' | 'image'>(imageUrl ? 'image' : 'notation')
  const noteBeatsRef = useRef<number[]>([])
  const elemsRef = useRef<Element[]>([])

  useEffect(() => {
    const host = notationRef.current
    if (!host) return
    host.innerHTML = ''
    const { abc, noteBeats } = songToAbc(song)
    noteBeatsRef.current = noteBeats
    abcjs.renderAbc(host, abc, { add_classes: true, paddingleft: 0, paddingright: 0 })
    elemsRef.current = Array.from(host.querySelectorAll('.abcjs-note'))
  }, [song])

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
          if (idx >= 0 && elems[idx]) elems[idx].classList.add('score-current')
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
    <div className="absolute right-2 top-2 z-30 w-[46%] max-w-lg rounded-xl border border-border-subtle bg-white/95 shadow-lg backdrop-blur">
      <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-1 text-[11px]">
        <span className="font-medium uppercase tracking-[0.15em] text-slate-400">Score</span>
        <div className="flex-1" />
        {imageUrl !== undefined && (
          <div className="flex overflow-hidden rounded-full border border-slate-300 text-slate-600">
            <button
              onClick={() => setTab('notation')}
              className={`px-3 py-0.5 ${tab === 'notation' ? 'bg-slate-800 text-white' : ''}`}
            >
              五线谱
            </button>
            <button
              onClick={() => setTab('image')}
              className={`px-3 py-0.5 ${tab === 'image' ? 'bg-slate-800 text-white' : ''}`}
            >
              原图
            </button>
          </div>
        )}
      </div>
      <div className="max-h-60 overflow-auto p-2">
        {tab === 'notation' ? (
          <div ref={notationRef} className="score-svg" />
        ) : (
          <img src={imageUrl} alt={song.name} className="w-full" />
        )}
      </div>
    </div>
  )
}
