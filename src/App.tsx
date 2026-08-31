import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FallingNotes } from './components/FallingNotes'
import { PianoKeyboard } from './components/PianoKeyboard'
import { ReportScreen } from './components/ReportScreen'
import { MidiStatusBadge } from './components/ui/MidiStatusBadge'
import { GhostButton, PrimaryButton } from './components/ui/Button'
import { GameEngine, type HudSnapshot } from './game/engine'
import { KeyboardLayout } from './game/keyboard'
import { buildReport, type SessionReport } from './game/report'
import { SONGS } from './game/songs'
import type { PracticeMode } from './types'
import { useElementWidth } from './hooks/useElementWidth'
import { useMidiInput } from './midi/useMidiInput'

type Screen = 'select' | 'play' | 'report'

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
    a.misses === b.misses &&
    a.total === b.total &&
    a.progress === b.progress &&
    a.waiting === b.waiting &&
    a.finished === b.finished
  )
}

const MODE_INFO: Record<PracticeMode, { label: string; desc: string }> = {
  wait: { label: '等待式', desc: '弹对才前进，适合认音和入门' },
  free: { label: '自由式', desc: '连续播放，考察节奏和时值' },
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('select')
  const [songId, setSongId] = useState(SONGS[0].id)
  const [mode, setMode] = useState<PracticeMode>('wait')
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const [report, setReport] = useState<SessionReport | null>(null)
  const [pressedSet, setPressedSet] = useState<Set<number>>(new Set())
  const [targetSet, setTargetSet] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<{ midi: number; id: number } | null>(null)
  const [synthOn, setSynthOn] = useState(true)

  const engineRef = useRef<GameEngine | null>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const wrongTimerRef = useRef<number | null>(null)
  const finishedRef = useRef(false)
  const targetSigRef = useRef('')

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
    engineRef.current?.release(midi)
  }, [])

  const handleNote = useCallback(
    (midi: number, on: boolean) => {
      if (on) noteOn(midi)
      else noteOff(midi)
    },
    [noteOn, noteOff],
  )

  const { status: midiStatus, deviceName } = useMidiInput(handleNote)

  const startSong = useCallback(
    async (id: string, practiceMode: PracticeMode) => {
      setSongId(id)
      const s = SONGS.find(x => x.id === id) ?? SONGS[0]
      engineRef.current = new GameEngine(s, practiceMode)
      finishedRef.current = false
      targetSigRef.current = ''
      setTargetSet(new Set())
      setPressedSet(new Set())
      setWrong(null)
      setReport(null)
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
    },
    [],
  )

  // 主循环：推进引擎时间 + 同步 HUD 与目标键高亮
  useEffect(() => {
    if (screen !== 'play') return
    let raf = 0
    let last = performance.now()
    let lastTargetCheck = 0
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const engine = engineRef.current
      if (engine) {
        engine.update((dt * engine.song.bpm) / 60)
        const h = engine.hud()
        setHud(prev => (prev && sameHud(prev, h) ? prev : h))
        if (now - lastTargetCheck > 120) {
          lastTargetCheck = now
          const sig = engine.targetMidis().join(',')
          if (sig !== targetSigRef.current) {
            targetSigRef.current = sig
            setTargetSet(new Set(engine.targetMidis()))
          }
        }
        if (h.finished && !finishedRef.current) {
          finishedRef.current = true
          window.setTimeout(() => {
            setReport(buildReport(engine))
            setScreen('report')
          }, 600)
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

  const accuracy =
    hud && hud.hits + hud.errors > 0 ? hud.hits / (hud.hits + hud.errors) : 1

  return (
    <div className="flex min-h-screen flex-col items-center bg-base px-4 py-8 text-primary">
      {screen === 'select' && (
        <div className="screen-enter w-full max-w-3xl">
          {/* Hero：apple 式大字 + pill CTA，留白充足 */}
          <header className="pt-12 sm:pt-20">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Piano Practice · W2
            </p>
            <h1 className="mt-6 text-5xl font-light leading-[1.05] tracking-tight text-primary sm:text-6xl">
              琴键陪练
              <span className="text-accent-strong"> Agent.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-secondary">
              一处安静的练习场。逐音反馈，跟随霓虹音符学习弹琴。
            </p>
            <div className="mt-10 flex items-center gap-4">
              <PrimaryButton
                onClick={() => void startSong(SONGS[0].id, mode)}
                className="px-7 py-3"
              >
                开始练习
                <span aria-hidden>→</span>
              </PrimaryButton>
              <span className="text-xs text-muted">
                支持 MIDI 键盘或电脑键盘
              </span>
            </div>
          </header>

          <hr className="mt-20 border-border-subtle" />

          {/* MIDI 状态行 */}
          <section className="mt-10">
            <MidiStatusBadge status={midiStatus} deviceName={deviceName} />
          </section>

          <hr className="mt-12 border-border-subtle" />

          {/* 模式：pill segmented */}
          <section className="mt-10">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Practice Mode
            </h2>
            <div className="mt-5 inline-flex rounded-full border border-border-subtle p-1">
              {(Object.keys(MODE_INFO) as PracticeMode[]).map(m => {
                const info = MODE_INFO[m]
                const selected = mode === m
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-full px-5 py-2 text-sm transition-colors duration-150 ${
                      selected
                        ? 'bg-primary text-base shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {info.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 max-w-md text-sm text-muted">
              {MODE_INFO[mode].desc}
            </p>
          </section>

          <hr className="mt-12 border-border-subtle" />

          {/* 曲目：apple 式编号列表 */}
          <section className="mt-10 pb-16">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Pieces
            </h2>
            <ol className="mt-6">
              {SONGS.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => void startSong(s.id, mode)}
                    className="group flex w-full items-baseline gap-6 py-5 text-left transition-colors duration-150 hover:text-primary"
                  >
                    <span className="w-6 text-xs tabular-nums text-muted">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-base text-primary">{s.name}</span>
                    <span className="text-xs tabular-nums text-muted">
                      {s.bpm} BPM · {s.notes.length} 音
                    </span>
                    <span
                      aria-hidden
                      className="text-sm text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    >
                      开始 →
                    </span>
                  </button>
                  {i < SONGS.length - 1 && (
                    <hr className="border-border-subtle" />
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {screen === 'play' && (
        <div className="screen-enter w-full max-w-4xl">
          {/* 极简 HUD：发丝下边框 + 细线进度条 */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-subtle pb-4 text-sm max-sm:text-xs">
            <GhostButton onClick={() => setScreen('select')} className="px-3 py-1 text-xs">
              ‹ 退出
            </GhostButton>
            <span className="font-medium text-primary">
              {song.name}
              <span className="ml-2 text-muted">{MODE_INFO[mode].label}</span>
            </span>
            <div className="relative h-px min-w-16 flex-1 overflow-hidden bg-border-strong/60">
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-all duration-150"
                style={{ width: `${(hud?.progress ?? 0) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-x-5 tabular-nums">
              <span className="text-hit">命中 {hud?.hits ?? 0}</span>
              {mode === 'free' && <span className="text-miss">漏弹 {hud?.misses ?? 0}</span>}
              <span className="text-wrong">错音 {hud?.errors ?? 0}</span>
              <span className="text-secondary">
                {(accuracy * 100).toFixed(0)}%
              </span>
            </div>
            <button
              onClick={() => setSynthOn(v => !v)}
              className="rounded-full px-3 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-primary"
            >
              伴奏音 {synthOn ? '开' : '关'}
            </button>
          </div>

          {/* 画布 + 键盘无缝衔接 */}
          <div ref={playAreaRef} className="relative w-full">
            <FallingNotes engineRef={engineRef} layout={layout} width={width} />
            <PianoKeyboard
              layout={layout}
              width={width}
              pressedSet={pressedSet}
              targetSet={targetSet}
              wrong={wrong}
            />
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            {mode === 'wait'
              ? hud?.waiting
                ? '弹奏亮起的目标键 · 弹对才前进'
                : '音符下落中…'
              : '跟上节奏 · 音符到判定线时弹奏'}
          </p>
        </div>
      )}

      {screen === 'report' && report && (
        <div className="screen-enter flex w-full justify-center">
          <ReportScreen
            report={report}
            onRetry={() => void startSong(song.id, mode)}
            onSelect={() => setScreen('select')}
          />
        </div>
      )}
    </div>
  )
}
