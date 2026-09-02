import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FallingNotes } from './components/FallingNotes'
import { PianoKeyboard } from './components/PianoKeyboard'
import { ReportScreen } from './components/ReportScreen'
import { ImportScreen } from './components/ImportScreen'
import { PianoRollEditor } from './components/PianoRollEditor'
import { ScorePanel } from './components/ScorePanel'
import { MidiStatusBadge } from './components/ui/MidiStatusBadge'
import { GhostButton, PrimaryButton } from './components/ui/Button'
import { IconChevronRight, IconMusicNote, IconTrash } from './components/icons'
import { GameEngine, type HudSnapshot } from './game/engine'
import { KeyboardLayout } from './game/keyboard'
import { buildReport, type SessionReport } from './game/report'
import { SONGS } from './game/songs'
import { saveSession } from './storage/sessionStore'
import { listCustomSongs, saveCustomSong, deleteCustomSong, type CustomSong } from './storage/songStore'
import type { PracticeMode, Song } from './types'
import { useElementWidth } from './hooks/useElementWidth'
import { useMidiInput } from './midi/useMidiInput'
import { playPianoNote, preloadPiano } from './audio/piano'
import { LESSONS, type Lesson } from './game/lessons'
import { markLessonComplete } from './storage/tutorialStore'
import { TutorialScreen } from './components/tutorial/TutorialScreen'
import { LessonScreen } from './components/tutorial/LessonScreen'

type Screen = 'select' | 'play' | 'report' | 'import' | 'editor' | 'lesson'

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

/** 每首曲子一个稳定的色相，用于曲库封面色块 */
function songHue(song: Song): number {
  if (song.id === 'warmup') return 206
  if (song.id === 'twinkle') return 268
  if (song.id === 'ode') return 152
  return ((song.notes[0]?.midi ?? 60) * 47) % 360
}

function CoverTile({ song }: { song: Song }) {
  const hue = songHue(song)
  return (
    <span
      className="grid h-12 w-12 shrink-0 place-items-center rounded-lg"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 42% 30%), hsl(${(hue + 40) % 360} 46% 15%))`,
      }}
    >
      <IconMusicNote className="h-5 w-5" style={{ color: `hsl(${hue} 70% 74%)` }} />
    </span>
  )
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
  const [customSongs, setCustomSongs] = useState<CustomSong[]>(() => listCustomSongs())
  const [draft, setDraft] = useState<{
    song: Song
    source: 'image' | 'midi' | 'omr'
    info?: string
    imageUrl?: string
  } | null>(null)
  const [showScore, setShowScore] = useState(true)
  const [selectTab, setSelectTab] = useState<'learn' | 'practice'>('learn')
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [fromLessonId, setFromLessonId] = useState<string | null>(null)
  const [lessonSongOverride, setLessonSongOverride] = useState<Song | null>(null)

  const engineRef = useRef<GameEngine | null>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const wrongTimerRef = useRef<number | null>(null)
  const finishedRef = useRef(false)
  const targetSigRef = useRef('')

  const allSongs = useMemo(() => [...SONGS, ...customSongs], [customSongs])
  const song = useMemo(
    () => lessonSongOverride ?? allSongs.find(s => s.id === songId) ?? allSongs[0],
    [allSongs, songId, lessonSongOverride],
  )
  const layout = useMemo(() => KeyboardLayout.fromNotes(song.notes), [song])
  const { ref: playAreaRef, width } = useElementWidth<HTMLDivElement>()

  const noteOn = useCallback(
    (midi: number) => {
      window.dispatchEvent(new CustomEvent('app-note', { detail: { midi, on: true } }))
      setPressedSet(prev => {
        if (prev.has(midi)) return prev
        const next = new Set(prev)
        next.add(midi)
        return next
      })
      const engine = engineRef.current
      if (engine === null) {
        if (synthOn) {
          void playPianoNote(midi, 0.45).then(usedPiano => {
            if (!usedPiano && synthRef.current) {
              const freq = Tone.Frequency(midi, 'midi').toFrequency()
              synthRef.current.triggerAttackRelease(freq, 0.3, Tone.getContext().currentTime + 0.005)
            }
          })
        }
        return
      }
      const result = engine.press(midi)
      if (result === 'hit' && synthOn) {
        void playPianoNote(midi, 0.45).then(usedPiano => {
          if (!usedPiano && synthRef.current) {
            const freq = Tone.Frequency(midi, 'midi').toFrequency()
            synthRef.current.triggerAttackRelease(freq, 0.3, Tone.getContext().currentTime + 0.005)
          }
        })
      } else if (result === 'wrong') {
        setWrong({ midi, id: Date.now() })
        if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current)
        wrongTimerRef.current = window.setTimeout(() => setWrong(null), 220)
      }
    },
    [synthOn],
  )

  const noteOff = useCallback((midi: number) => {
    window.dispatchEvent(new CustomEvent('app-note', { detail: { midi, on: false } }))
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

  const startLessonPractice = useCallback(
    async (s: Song, lessonId: string) => {
      setLessonSongOverride(s)
      setFromLessonId(lessonId)
      engineRef.current = new GameEngine(s, mode)
      finishedRef.current = false
      targetSigRef.current = ''
      setTargetSet(new Set())
      setPressedSet(new Set())
      setWrong(null)
      setReport(null)
      try {
        await Tone.start()
        Tone.getContext().lookAhead = 0.005
        preloadPiano()
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
    [mode],
  )

  const startSong = useCallback(
    async (id: string, practiceMode: PracticeMode) => {
      setSongId(id)
      setLessonSongOverride(null)
      setFromLessonId(null)
      const s = allSongs.find(x => x.id === id) ?? allSongs[0]
      engineRef.current = new GameEngine(s, practiceMode)
      finishedRef.current = false
      targetSigRef.current = ''
      setTargetSet(new Set())
      setPressedSet(new Set())
      setWrong(null)
      setReport(null)
      try {
        await Tone.start()
        Tone.getContext().lookAhead = 0.005
        preloadPiano()
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
    [allSongs],
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
            const r = buildReport(engine)
            saveSession(r)
            setReport(r)
            setScreen('report')
          }, 600)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [screen])

  // 电脑键盘兜底输入（练习页 + 课程页互动任务）
  useEffect(() => {
    if (screen !== 'play' && screen !== 'lesson') return
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
    <div className="flex min-h-screen flex-col items-center px-4 py-8 text-primary">
      {screen === 'select' && (
        <div className="screen-enter w-full max-w-3xl">
          {/* Hero：apple 式大字 + pill CTA，留白充足 */}
          <header className="pt-12 sm:pt-20">
            <p className="text-micro font-medium uppercase text-muted">
              Piano Practice · W2
            </p>
            <h1 className="text-display mt-6 font-semibold text-primary sm:text-6xl">
              琴键陪练
              <span className="text-gradient-accent"> Agent.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-secondary">
              一处安静的练习场。逐音反馈，跟随霓虹音符学习弹琴。
            </p>
            <div className="mt-10 flex items-center gap-4">
              <PrimaryButton
                onClick={() => void startSong(SONGS[0].id, mode)}
                className="bg-gradient-accent px-7 py-3 shadow-[0_6px_24px_rgb(245_158_11/0.3)] transition-shadow hover:shadow-[0_8px_32px_rgb(245_158_11/0.45)]"
              >
                开始练习
                <span aria-hidden>→</span>
              </PrimaryButton>
              <span className="text-xs text-muted">
                支持 MIDI 键盘或电脑键盘
              </span>
            </div>
          </header>

          {/* 学习 / 练习 双 tab */}
          <div className="glass mt-12 inline-flex rounded-full p-1">
            <button
              onClick={() => setSelectTab('learn')}
              className={`rounded-full px-6 py-2 text-body transition-all duration-200 ${
                selectTab === 'learn' ? 'bg-gradient-accent font-semibold text-slate-950 shadow-[0_2px_12px_rgb(245_158_11/0.35)]' : 'text-secondary hover:text-primary'
              }`}
            >
              学习
            </button>
            <button
              onClick={() => setSelectTab('practice')}
              className={`rounded-full px-6 py-2 text-body transition-all duration-200 ${
                selectTab === 'practice' ? 'bg-gradient-accent font-semibold text-slate-950 shadow-[0_2px_12px_rgb(245_158_11/0.35)]' : 'text-secondary hover:text-primary'
              }`}
            >
              练习
            </button>
          </div>

          {selectTab === 'learn' ? (
            <section className="mt-8 pb-16">
              <TutorialScreen
                lessons={LESSONS}
                onOpenLesson={lesson => {
                  setActiveLesson(lesson)
                  setScreen('lesson')
                }}
              />
            </section>
          ) : (
          <>
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

          {/* 曲目：封面卡片 */}
          <section className="mt-10 pb-16">
            {customSongs.length > 0 && (
              <>
                <h2 className="text-micro font-medium uppercase text-muted">
                  My Pieces
                </h2>
                <div className="mt-4 space-y-2.5">
                  {customSongs.map(s => (
                    <div key={s.id} className="group relative">
                      <button
                        onClick={() => void startSong(s.id, mode)}
                        className="sheen group flex w-full items-center gap-4 rounded-xl border border-border-subtle bg-surface px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-raised"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border-subtle text-xs font-semibold text-secondary">
                          {s.source === 'image' ? 'AI' : s.source === 'omr' ? 'OMR' : 'MIDI'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body font-medium text-primary">
                            {s.name}
                          </span>
                          <span className="mt-0.5 block text-caption text-muted">
                            {s.bpm} BPM · {s.notes.length} 音
                          </span>
                        </span>
                        <IconChevronRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      </button>
                      <button
                        onClick={() => {
                          deleteCustomSong(s.id)
                          setCustomSongs(listCustomSongs())
                        }}
                        aria-label={`删除 ${s.name}`}
                        className="absolute -top-1.5 right-2 grid h-7 w-7 place-items-center rounded-full border border-border-subtle bg-raised text-muted opacity-0 transition-all duration-150 hover:border-wrong/60 hover:text-wrong group-hover:opacity-100"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <hr className="mt-8 border-border-subtle" />
                <h2 className="mt-8 text-micro font-medium uppercase text-muted">
                  Pieces
                </h2>
              </>
            )}
            <div className={customSongs.length > 0 ? 'mt-4 space-y-2.5' : 'mt-4 space-y-2.5'}>
              {SONGS.map(s => (
                <div key={s.id} className="group">
                  <button
                    onClick={() => void startSong(s.id, mode)}
                    className="sheen group flex w-full items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.025] px-4 py-3.5 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white/[0.05] hover:shadow-panel"
                  >
                    <CoverTile song={s} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium text-primary">{s.name}</span>
                      <span className="mt-0.5 block text-caption text-muted">
                        {s.bpm} BPM · {s.notes.length} 音
                      </span>
                    </span>
                    <IconChevronRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <GhostButton onClick={() => setScreen('import')}>导入乐谱 / MIDI</GhostButton>
              <span className="text-xs text-muted">
                乐谱图片 AI 识别，或 MIDI 直传，校对后入库
              </span>
            </div>
          </section>
          </>
          )}
          </div>
        )}

      {screen === 'play' && (
        <div className="screen-enter w-full max-w-4xl">
          {/* 极简 HUD：发丝下边框 + 细线进度条 */}
          <div className="glass flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl px-4 py-3 text-sm max-sm:text-xs">
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
            <button
              onClick={() => setShowScore(v => !v)}
              className="rounded-full px-3 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-primary"
            >
              乐谱 {showScore ? '开' : '关'}
            </button>
          </div>

          {/* 乐谱条：单行横向滚动，跟随进度 */}
          {showScore && (
            <ScorePanel
              song={song}
              engineRef={engineRef}
              imageUrl={(song as CustomSong).imageDataUrl}
              onClose={() => setShowScore(false)}
            />
          )}

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

      {screen === 'lesson' && activeLesson !== null && (
        <div className="screen-enter flex w-full justify-center">
          <LessonScreen
            lesson={activeLesson}
            nextLesson={LESSONS[activeLesson.order] ?? null}
            onBack={() => setScreen('select')}
            onPractice={(s, lessonId) => void startLessonPractice(s, lessonId)}
            onNextLesson={lesson => {
              setActiveLesson(lesson)
              window.scrollTo({ top: 0 })
            }}
          />
        </div>
      )}

      {screen === 'import' && (
        <div className="screen-enter flex w-full justify-center">
          <ImportScreen
            onDraft={(song, source, info, imageUrl) => {
              setDraft({ song, source, info, imageUrl })
              setScreen('editor')
            }}
            onCancel={() => setScreen('select')}
          />
        </div>
      )}

      {screen === 'editor' && draft !== null && (
        <div className="screen-enter flex w-full justify-center">
          <PianoRollEditor
            initial={draft.song}
            source={draft.source}
            info={draft.info}
            onSave={song => {
              saveCustomSong(song, draft.source, draft.imageUrl)
              setCustomSongs(listCustomSongs())
              setDraft(null)
              setScreen('select')
            }}
            onCancel={() => {
              setDraft(null)
              setScreen('import')
            }}
          />
        </div>
      )}

      {screen === 'report' && report && fromLessonId !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {(() => {
            const lesson = LESSONS.find(l => l.id === fromLessonId) ?? null
            const next = lesson !== null ? LESSONS[lesson.order] ?? null : null
            return (
              <>
                <span className="rounded-full bg-hit/15 px-4 py-2 text-body text-hit">
                  ✓ {lesson?.title ?? '课程'} 练习完成
                </span>
                <PrimaryButton
                  onClick={() => {
                    if (lesson !== null) markLessonComplete(lesson.id)
                    if (next !== null) {
                      setActiveLesson(next)
                      setFromLessonId(null)
                      setScreen('lesson')
                    } else {
                      setFromLessonId(null)
                      setScreen('select')
                    }
                  }}
                >
                  {next !== null ? `继续：第 ${next.order} 课 ${next.title}` : '返回课程'}
                </PrimaryButton>
              </>
            )
          })()}
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
