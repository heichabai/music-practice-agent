import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FallingNotes } from './components/FallingNotes'
import { PianoKeyboard } from './components/PianoKeyboard'
import { ReportScreen } from './components/ReportScreen'
import { MidiStatusBadge } from './components/ui/MidiStatusBadge'
import { GhostButton } from './components/ui/Button'
import { noteHue } from './components/notesPalette'
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

const MODE_INFO: Record<PracticeMode, { label: string; desc: string; tag: string }> = {
  wait: { label: '等待式', desc: '弹对才前进，适合认音和入门', tag: '入门友好' },
  free: { label: '自由式', desc: '连续播放，考察节奏和时值', tag: '节奏训练' },
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
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden bg-base px-4 py-6 text-primary">
      {/* 顶部琥珀聚光灯光晕，透明度 ≤6%（§2.1） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(245,158,11,0.06),transparent_70%)]"
      />
      <div className="relative flex w-full flex-col items-center">
      {screen === 'select' && (
        <div className="screen-enter w-full max-w-2xl">
          {/* Hero */}
          <div className="relative pt-2 pb-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
              Piano Practice · Powered by AI
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              琴键陪练
              <span className="bg-gradient-to-r from-accent via-amber-300 to-orange-400 bg-clip-text text-transparent">
                {' '}Agent
              </span>
            </h1>
            <p className="mt-3 text-base text-secondary">
              支持 MIDI 键盘或电脑键盘，跟随霓虹音符实时反馈，结束后生成专属会话报告。
            </p>
          </div>

          <div className="mt-5">
            <MidiStatusBadge status={midiStatus} deviceName={deviceName} />
          </div>

          <div className="mt-7">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
              练习模式
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(Object.keys(MODE_INFO) as PracticeMode[]).map(m => {
                const info = MODE_INFO[m]
                const selected = mode === m
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                      selected
                        ? 'border-accent/70 bg-gradient-to-br from-accent/15 to-accent/5 shadow-[0_8px_28px_-8px_rgba(245,158,11,0.55)]'
                        : 'border-border-subtle bg-surface hover:-translate-y-0.5 hover:border-border-strong hover:bg-raised'
                    }`}
                  >
                    {/* 顶部高光条 */}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-0.5 transition-opacity ${
                        selected ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgb(251,191,36), transparent)',
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <div className={`text-base font-semibold ${selected ? 'text-accent-strong' : 'text-primary'}`}>
                        {info.label}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          selected
                            ? 'bg-accent/20 text-accent-strong'
                            : 'bg-raised text-secondary'
                        }`}
                      >
                        {info.tag}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-secondary">{info.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-7">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
              曲目
            </h2>
            <div className="mt-3 space-y-2.5">
              {SONGS.map(s => {
                const firstMidi = s.notes[0]?.midi ?? 60
                const hue = noteHue(firstMidi)
                return (
                  <button
                    key={s.id}
                    onClick={() => void startSong(s.id, mode)}
                    className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
                  >
                    {/* 左侧霓虹条 */}
                    <span
                      aria-hidden
                      className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                      style={{
                        background: `linear-gradient(180deg, hsl(${hue},90%,70%), hsl(${(hue + 40) % 360},90%,55%))`,
                        boxShadow: `0 0 12px hsla(${hue},90%,60%,0.7)`,
                      }}
                    />
                    <div className="min-w-0 flex-1 pl-3">
                      <div className="truncate text-base font-semibold text-primary">{s.name}</div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-secondary">
                        <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 font-medium text-primary">
                          <span className="h-1 w-1 rounded-full bg-accent" />
                          {s.bpm} BPM
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 font-medium text-primary">
                          {s.notes.length} 音
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-accent opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                      开始
                      <span aria-hidden>→</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {screen === 'play' && (
        <div className="screen-enter w-full max-w-4xl">
          {/* 玻璃 HUD 工具栏 */}
          <div className="glass mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-2.5 text-sm max-sm:text-xs">
            <GhostButton onClick={() => setScreen('select')} className="px-3 py-1 text-xs">
              ‹ 退出
            </GhostButton>
            <span className="font-semibold">
              {song.name}
              <span className="ml-2 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-strong">
                {MODE_INFO[mode].label}
              </span>
            </span>
            <div className="relative h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-raised/80 ring-1 ring-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent via-accent-strong to-orange-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-all"
                style={{ width: `${(hud?.progress ?? 0) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums max-sm:basis-full">
              <span className="inline-flex items-center gap-1.5 text-hit">
                <span className="h-1.5 w-1.5 rounded-full bg-hit shadow-[0_0_6px_var(--color-hit)]" />
                命中 {hud?.hits ?? 0}
              </span>
              {mode === 'free' && (
                <span className="inline-flex items-center gap-1.5 text-miss">
                  <span className="h-1.5 w-1.5 rounded-full bg-miss shadow-[0_0_6px_var(--color-miss)]" />
                  漏弹 {hud?.misses ?? 0}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-wrong">
                <span className="h-1.5 w-1.5 rounded-full bg-wrong shadow-[0_0_6px_var(--color-wrong)]" />
                错音 {hud?.errors ?? 0}
              </span>
              <span className="text-primary">正确率 {(accuracy * 100).toFixed(0)}%</span>
            </div>
            <GhostButton
              onClick={() => setSynthOn(v => !v)}
              className="px-3 py-1 text-xs"
            >
              {synthOn ? '🔊 伴奏音 开' : '🔇 伴奏音 关'}
            </GhostButton>
          </div>

          {/* 画布 + 键盘 舞台区 */}
          <div ref={playAreaRef} className="relative w-full">
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-black/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_-12px_rgba(245,158,11,0.25)] ring-1 ring-white/5">
              <FallingNotes engineRef={engineRef} layout={layout} width={width} />
            </div>
            <div className="mt-3">
              <PianoKeyboard
                layout={layout}
                width={width}
                pressedSet={pressedSet}
                targetSet={targetSet}
                wrong={wrong}
              />
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted">
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
    </div>
  )
}
