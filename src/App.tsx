import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FallingNotes } from './components/FallingNotes'
import { PianoKeyboard } from './components/PianoKeyboard'
import { ReportScreen } from './components/ReportScreen'
import { ImportScreen } from './components/ImportScreen'
import { PianoRollEditor } from './components/PianoRollEditor'
import { ScorePanel } from './components/ScorePanel'
import { GhostButton, PrimaryButton } from './components/ui/Button'
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
import { useAudioInput } from './audio/useAudioInput'
import { AdaptiveEngine, type AdaptiveDecision } from './game/adaptive'
import {
  onNoteHit as gamifyNoteHit,
  onSessionEnd as gamifySessionEnd,
  onLessonComplete as gamifyLessonComplete,
  onCustomSongImported as gamifyImport,
  type GamificationState,
  type Achievement,
} from './game/gamification'
import { loadGamification, saveGamification } from './storage/gamificationStore'
import { DuoButton } from './components/DuoButton'
import { LearningPath } from './components/LearningPath'
import { SongSection } from './components/SongCard'
import { AchievementToast, type AchievementToastData } from './components/AchievementToast'
import { AdaptiveIndicator } from './components/AdaptiveIndicator'
import { FreePlayCanvas } from './components/FreePlayCanvas'
import { useVideoRecorder } from './hooks/useVideoRecorder'
import { LESSONS, type Lesson } from './game/lessons'
import { markLessonComplete, getTutorialProgress } from './storage/tutorialStore'
import { LessonScreen } from './components/tutorial/LessonScreen'

type Screen = 'select' | 'play' | 'report' | 'import' | 'editor' | 'lesson' | 'freeplay'

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
  const [lastPlayed, setLastPlayed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mpa.lastPlayed') ?? '{}') } catch { return {} }
  })
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [fromLessonId, setFromLessonId] = useState<string | null>(null)
  const [lessonSongOverride, setLessonSongOverride] = useState<Song | null>(null)
  const [gamification, setGamification] = useState<GamificationState>(() => loadGamification())
  const [achievementQueue, setAchievementQueue] = useState<AchievementToastData[]>([])
  const [adaptiveDecision, setAdaptiveDecision] = useState<AdaptiveDecision | null>(null)
  const [micEnabled, setMicEnabled] = useState(false)
  const [freePlayNoteCount, setFreePlayNoteCount] = useState(0)
  const [freePlayCurrentNote, setFreePlayCurrentNote] = useState('')

  const engineRef = useRef<GameEngine | null>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const wrongTimerRef = useRef<number | null>(null)
  const finishedRef = useRef(false)
  const targetSigRef = useRef('')
  const adaptiveRef = useRef<AdaptiveEngine | null>(null)
  const sessionStartRef = useRef(0)

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

      if (result === 'hit') {
        applyGamification(gamifyNoteHit(gamification, midi))
        const decision = adaptiveRef.current?.onHit(midi, engine.songTime)
        if (decision) setAdaptiveDecision(decision)
      } else if (result === 'wrong') {
        const decision = adaptiveRef.current?.onError(midi, engine.songTime)
        if (decision) setAdaptiveDecision(decision)
      }

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

  const applyGamification = useCallback(
    (update: { state: GamificationState; newlyUnlocked: Achievement[] }) => {
      setGamification(update.state)
      saveGamification(update.state)
      if (update.newlyUnlocked.length > 0) {
        setAchievementQueue(prev => [
          ...prev,
          ...update.newlyUnlocked.map(a => ({ id: a.id, name: a.name, description: a.description })),
        ])
      }
    },
    [],
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

  const audioInput = useAudioInput(handleNote)

  const freePlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRecorder = useVideoRecorder(freePlayCanvasRef)
  const freePlayLayout = useMemo(() => new KeyboardLayout(36, 95), [])

  const toggleMic = useCallback(async () => {
    if (micEnabled) {
      audioInput.stop()
      setMicEnabled(false)
    } else {
      await audioInput.start()
      setMicEnabled(true)
    }
  }, [micEnabled, audioInput])

  const startLessonPractice = useCallback(
    async (s: Song, lessonId: string) => {
      setLessonSongOverride(s)
      setFromLessonId(lessonId)
      engineRef.current = new GameEngine(s, mode)
      adaptiveRef.current = new AdaptiveEngine(s.bpm, mode)
      sessionStartRef.current = Date.now()
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
      const songObj = allSongs.find(x => x.id === id) ?? allSongs[0]
      const lp = { id, name: songObj.name }
      setLastPlayed(lp)
      try { localStorage.setItem('mpa.lastPlayed', JSON.stringify(lp)) } catch {}
      const s = allSongs.find(x => x.id === id) ?? allSongs[0]
      engineRef.current = new GameEngine(s, practiceMode)
      adaptiveRef.current = new AdaptiveEngine(s.bpm, practiceMode)
      sessionStartRef.current = Date.now()
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
            const gUpdate = gamifySessionEnd(gamification, {
              notesHit: r.hits,
              errors: r.wrongPresses,
              misses: r.misses,
              durationMs: Date.now() - sessionStartRef.current,
              bpm: engine.song.bpm,
              mode: engine.mode,
              songName: engine.song.name,
            })
            applyGamification(gUpdate)
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
    if (screen !== 'play' && screen !== 'lesson' && screen !== 'freeplay') return
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
        <div className="screen-enter w-full max-w-lg pb-28">
          {/* ===== 顶部状态栏（多邻国式） ===== */}
          <div className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-2 bg-base/80 px-4 py-3 backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              <span className="text-xl">🔥</span>
              <span className="text-lg font-black text-[#FF9600]">{gamification.streak}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-lg">⚡</span>
              <span className="text-base font-bold text-[#FFC800]">{gamification.xp.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-lg">👑</span>
              <span className="text-base font-bold text-[#CE82FF]">Lv.{gamification.level}</span>
            </span>
            <div className="flex-1" />
            <button
              onClick={() => {
                const t = getTutorialProgress().completed.length
                if (t < LESSONS.length) {
                  setActiveLesson(LESSONS[Math.min(t, LESSONS.length - 1)])
                  setScreen('lesson')
                } else {
                  void startSong(lastPlayed.id ?? SONGS[0].id, mode)
                }
              }}
              className="flex items-center gap-1 text-xs font-bold text-[#58CC02] hover:underline"
            >
              {mode === 'wait' ? '⏸️ 等待式' : '🎵 自由式'}
              {' · '}
              <button onClick={() => setMode(m => m === 'wait' ? 'free' : 'wait')} className="text-[#1CB0F6] hover:underline">
                切换
              </button>
              {' · '}
              ⚙️ 设置
            </button>
          </div>

          {/* ===== 继续练习大卡（多邻国式） ===== */}
          <button
            onClick={() => {
              const t = getTutorialProgress().completed.length
              if (t < LESSONS.length) {
                setActiveLesson(LESSONS[Math.min(t, LESSONS.length - 1)])
                setScreen('lesson')
              } else {
                void startSong(lastPlayed.id ?? SONGS[0].id, mode)
              }
            }}
            className="mt-4 w-full"
          >
            <DuoButton variant="green" className="w-full py-4 text-lg">
              {getTutorialProgress().completed.length < LESSONS.length
                ? `继续第 ${getTutorialProgress().completed.length + 1} 课`
                : `继续练习 · ${lastPlayed.name ?? SONGS[0].name}`}
            </DuoButton>
          </button>

          {/* ===== 学习路径（多邻国之字形） ===== */}
          {getTutorialProgress().completed.length < LESSONS.length && (
            <section className="mt-8">
              <div className="mb-4 rounded-2xl bg-[#1CB0F6] px-4 py-3 text-center shadow-[0_3px_0_#1899D6]">
                <p className="text-sm font-black uppercase tracking-wide text-white">
                  UNIT 1 · 零基础入门
                </p>
              </div>
              <LearningPath
                lessons={LESSONS}
                onOpenLesson={lesson => {
                  setActiveLesson(lesson)
                  setScreen('lesson')
                }}
              />
            </section>
          )}

          {/* ===== 曲目 ===== */}
          <section className="mt-8">
            <div className="mb-4 rounded-2xl bg-[#CE82FF] px-4 py-3 text-center shadow-[0_3px_0_#A568CC]">
              <p className="text-sm font-black uppercase tracking-wide text-white">
                🎵 曲目
              </p>
            </div>
            <SongSection
              songs={allSongs.map(s => ({ ...s, source: (s as CustomSong).source }))}
              onPlay={s => void startSong(s.id, mode)}
              onDelete={id => {
                deleteCustomSong(id)
                setCustomSongs(listCustomSongs())
              }}
            />
          </section>

          {/* ===== 底部功能按钮 ===== */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <DuoButton
              variant="purple"
              className="py-3 text-sm"
              onClick={() => {
                setFreePlayNoteCount(0)
                setFreePlayCurrentNote('')
                void Tone.start()
                preloadPiano()
                setScreen('freeplay')
              }}
            >
              🎹 自由弹奏
            </DuoButton>
            <DuoButton
              variant="blue"
              className="py-3 text-sm"
              onClick={() => setScreen('import')}
            >
              📥 导入乐谱
            </DuoButton>
          </div>

          {/* MIDI 状态 */}
          <p className="mt-4 text-center text-xs text-gray-500">
            {midiStatus === 'ok' ? `🎧 ${deviceName}` : '⌨️ 电脑键盘可用'}
            {' · '}
            <button onClick={() => void toggleMic()} className="text-[#1CB0F6] hover:underline">
              {micEnabled ? '麦克风已开' : '开麦克风'}
            </button>
          </p>
        </div>
      )}

      {screen === 'play' && (
        <div className="screen-enter w-full max-w-4xl">
          {/* 极简 HUD：发丝下边框 + 细线进度条 */}
          <div className="glass flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-5 py-3.5 text-sm max-sm:text-xs">
            <button
              onClick={() => setScreen('select')}
              className="grid h-9 w-9 place-items-center rounded-full bg-gray-200 text-base text-gray-700 shadow-[0_2px_0_#c4c4c4] transition-all active:translate-y-[2px] active:shadow-none"
              aria-label="退出练习"
            >
              ‹
            </button>
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

      {screen === 'freeplay' && (
        <div className="screen-enter w-full max-w-4xl">
          <div className="glass flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3 text-sm">
            <GhostButton
              onClick={() => {
                if (videoRecorder.state === 'recording') videoRecorder.stop()
                setScreen('select')
              }}
              className="px-3 py-1 text-xs"
            >
              ‹ 退出
            </GhostButton>
            <span className="font-medium text-primary">自由弹奏</span>
            <div className="flex-1" />
            {freePlayCurrentNote !== '' && (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-body font-semibold tabular-nums text-accent-strong">
                {freePlayCurrentNote}
              </span>
            )}
            <span className="text-caption tabular-nums text-muted">{freePlayNoteCount} 音</span>
            <button
              onClick={() => setSynthOn(v => !v)}
              className="rounded-full px-3 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-primary"
            >
              伴奏音 {synthOn ? '开' : '关'}
            </button>
            <button
              onClick={() => {
                if (videoRecorder.state === 'recording') videoRecorder.stop()
                else videoRecorder.start()
              }}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                videoRecorder.state === 'recording'
                  ? 'bg-wrong/20 text-wrong'
                  : 'bg-accent/15 text-accent-strong hover:bg-accent/25'
              }`}
            >
              {videoRecorder.state === 'recording' ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-wrong" />
                  停止 {String(Math.floor(videoRecorder.duration / 60)).padStart(1, '0')}:
                  {String(videoRecorder.duration % 60).padStart(2, '0')}
                </>
              ) : (
                '● 录制视频'
              )}
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-b-xl">
            <FreePlayCanvas
              canvasRef={freePlayCanvasRef}
              layout={freePlayLayout}
              width={width || 900}
              onNoteCountChange={setFreePlayNoteCount}
              onCurrentNoteChange={setFreePlayCurrentNote}
            />
            <PianoKeyboard
              layout={freePlayLayout}
              width={width || 900}
              pressedSet={pressedSet}
              targetSet={new Set()}
              wrong={null}
            />
          </div>

          <p className="mt-3 text-center text-caption text-muted">
            弹奏任何音符 · 没有对错 · 享受音乐
          </p>
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
              applyGamification(gamifyImport(gamification))
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
                    if (lesson !== null) {
                      markLessonComplete(lesson.id)
                      applyGamification(gamifyLessonComplete(gamification, lesson.order))
                    }
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
      <AchievementToast
        queue={achievementQueue}
        onDismiss={id => setAchievementQueue(prev => prev.filter(a => a.id !== id))}
      />
      <AdaptiveIndicator
        decision={adaptiveDecision}
        onDismiss={() => setAdaptiveDecision(null)}
      />
    </div>
  )
}
