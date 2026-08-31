import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FallingNotes } from './components/FallingNotes'
import { PianoKeyboard } from './components/PianoKeyboard'
import { GameEngine, type HudSnapshot } from './game/engine'
import { KeyboardLayout } from './game/keyboard'
import { SONGS } from './game/songs'
import { useElementWidth } from './hooks/useElementWidth'
import { useMidiInput } from './midi/useMidiInput'

type Screen = 'select' | 'play' | 'result'

// 电脑键盘 → midi（白键 A S D F G H J K，黑键 W E T Y U）
const KEYBOARD_MAP: Record<string, number> = {
  KeyA: 60, KeyW: 61, KeyS: 62, KeyE: 63, KeyD: 64,
  KeyF: 65, KeyT: 66, KeyG: 67, KeyY: 68, KeyH: 69,
  KeyU: 70, KeyJ: 71, KeyK: 72, KeyO: 73, KeyL: 74,
  Semicolon: 75, Quote: 76,
}

function sameHud(a: HudSnapshot, b: HudSnapshot): boolean {
  return (
    a.hits === b.hits &&
    a.errors === b.errors &&
    a.total === b.total &&
    a.progress === b.progress &&
    a.waiting === b.waiting &&
    a.finished === b.finished
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('select')
  const [songId, setSongId] = useState(SONGS[0].id)
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const [pressedSet, setPressedSet] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<{ midi: number; id: number } | null>(null)
  const [synthOn, setSynthOn] = useState(true)

  const engineRef = useRef<GameEngine | null>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const wrongTimerRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  const song = useMemo(() => SONGS.find(s => s.id === songId) ?? SONGS[0], [songId])
  const layout = useMemo(() => KeyboardLayout.fromNotes(song.notes), [song])
  const { ref: playAreaRef, width } = useElementWidth<HTMLDivElement>()

  const noteOn = useCallback(
    (midi: number) => {
      setPressedSet(prev => {
        if (prev.has(midi)) return prev
        const next = new Set(prev)
        next.add(midi)
        return next
      })
      const engine = engineRef.current
      if (!engine) return
      const result = engine.press(midi)
      if (result === 'hit' && synthRef.current && synthOn) {
        const freq = Tone.Frequency(midi, 'midi').toFrequency()
        synthRef.current.triggerAttackRelease(freq, 0.3)
      } else if (result === 'wrong') {
        setWrong({ midi, id: Date.now() })
        if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current)
        wrongTimerRef.current = window.setTimeout(() => setWrong(null), 220)
      }
      setHud(engine.hud())
    },
    [synthOn],
  )

  const noteOff = useCallback((midi: number) => {
    setPressedSet(prev => {
      if (!prev.has(midi)) return prev
      const next = new Set(prev)
      next.delete(midi)
      return next
    })
  }, [])

  const handleNote = useCallback(
    (midi: number, on: boolean) => {
      if (on) noteOn(midi)
      else noteOff(midi)
    },
    [noteOn, noteOff],
  )

  const { status: midiStatus, deviceName } = useMidiInput(handleNote)

  const startSong = useCallback(async (id: string) => {
    setSongId(id)
    const s = SONGS.find(x => x.id === id) ?? SONGS[0]
    engineRef.current = new GameEngine(s)
    finishedRef.current = false
    setHud(engineRef.current.hud())
    setPressedSet(new Set())
    setWrong(null)
    try {
      await Tone.start()
      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
        }).toDestination()
        synthRef.current.volume.value = -6
      }
    } catch {
      // 音频初始化失败不影响练习
    }
    setScreen('play')
  }, [])

  // 主循环：推进引擎时间
  useEffect(() => {
    if (screen !== 'play') return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const engine = engineRef.current
      if (engine) {
        engine.update((dt * engine.song.bpm) / 60)
        const h = engine.hud()
        setHud(prev => (prev && sameHud(prev, h) ? prev : h))
        if (h.finished && !finishedRef.current) {
          finishedRef.current = true
          window.setTimeout(() => setScreen('result'), 600)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [screen])

  // 电脑键盘兜底输入
  useEffect(() => {
    if (screen !== 'play') return
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const midi = KEYBOARD_MAP[e.code]
      if (midi !== undefined) {
        e.preventDefault()
        noteOn(midi)
      }
    }
    const up = (e: KeyboardEvent) => {
      const midi = KEYBOARD_MAP[e.code]
      if (midi !== undefined) noteOff(midi)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [screen, noteOn, noteOff])

  const targetSet =
    hud?.waiting && engineRef.current
      ? new Set(engineRef.current.targetMidis())
      : new Set<number>()

  const accuracy =
    hud && hud.hits + hud.errors > 0 ? hud.hits / (hud.hits + hud.errors) : 1

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-6 text-slate-100">
      {screen === 'select' && (
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold">琴键陪练 Agent</h1>
          <p className="mt-2 text-sm text-slate-400">
            跟弹模式：弹对自动前进，弹错即时提示。支持 MIDI 键盘或电脑键盘。
          </p>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            {midiStatus === 'ok' && (
              <span className="text-emerald-400">MIDI 已连接 · {deviceName}</span>
            )}
            {midiStatus === 'no-device' && (
              <span className="text-amber-400">
                未检测到 MIDI 设备，可用电脑键盘弹奏（A S D F G H J K 白键 · W E T Y U 黑键）
              </span>
            )}
            {midiStatus === 'unsupported' && (
              <span className="text-amber-400">
                当前浏览器不支持 Web MIDI，请用 Chrome / Edge 打开；电脑键盘仍可弹奏
              </span>
            )}
            {midiStatus === 'init' && <span className="text-slate-400">正在检测 MIDI 设备…</span>}
          </div>

          <div className="mt-6 space-y-3">
            {SONGS.map(s => (
              <button
                key={s.id}
                onClick={() => void startSong(s.id)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-5 py-4 text-left transition hover:border-amber-500/60 hover:bg-slate-800"
              >
                <span className="text-lg font-medium">{s.name}</span>
                <span className="text-sm text-slate-400">
                  {s.bpm} BPM · {s.notes.length} 音
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === 'play' && (
        <div className="w-full max-w-4xl">
          <div className="mb-3 flex items-center gap-4 text-sm">
            <button
              onClick={() => setScreen('select')}
              className="rounded border border-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-800"
            >
              退出
            </button>
            <span className="font-medium">{song.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${(hud?.progress ?? 0) * 100}%` }}
              />
            </div>
            <span className="text-emerald-400">命中 {hud?.hits ?? 0}</span>
            <span className="text-red-400">错音 {hud?.errors ?? 0}</span>
            <span className="text-slate-300">正确率 {(accuracy * 100).toFixed(0)}%</span>
            <button
              onClick={() => setSynthOn(v => !v)}
              className="rounded border border-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-800"
            >
              伴奏音 {synthOn ? '开' : '关'}
            </button>
          </div>

          <div ref={playAreaRef} className="w-full">
            <FallingNotes engineRef={engineRef} layout={layout} width={width} />
            <div className="mt-2">
              <PianoKeyboard
                layout={layout}
                width={width}
                pressedSet={pressedSet}
                targetSet={targetSet}
                wrong={wrong}
              />
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            {hud?.waiting ? '弹琥珀色亮起的键' : '音符下落中…'}
          </p>
        </div>
      )}

      {screen === 'result' && hud && (
        <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h2 className="text-2xl font-bold">练习完成</h2>
          <p className="mt-1 text-sm text-slate-400">{song.name}</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-800 p-4">
              <div className="text-2xl font-bold text-emerald-400">{hud.hits}</div>
              <div className="mt-1 text-xs text-slate-400">命中</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-4">
              <div className="text-2xl font-bold text-red-400">{hud.errors}</div>
              <div className="mt-1 text-xs text-slate-400">错音</div>
            </div>
            <div className="rounded-lg bg-slate-800 p-4">
              <div className="text-2xl font-bold text-amber-400">
                {(accuracy * 100).toFixed(0)}%
              </div>
              <div className="mt-1 text-xs text-slate-400">正确率</div>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={() => void startSong(song.id)}
              className="rounded-lg bg-amber-500 px-5 py-2 font-medium text-slate-950 hover:bg-amber-400"
            >
              再练一次
            </button>
            <button
              onClick={() => setScreen('select')}
              className="rounded-lg border border-slate-700 px-5 py-2 text-slate-300 hover:bg-slate-800"
            >
              换一首
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
