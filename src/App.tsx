import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { FallingNotes } from './components/FallingNotes'
import { PianoKeyboard } from './components/PianoKeyboard'
import { ReportScreen } from './components/ReportScreen'
import { ImportScreen } from './components/ImportScreen'
import { PianoRollEditor } from './components/PianoRollEditor'
import { ScorePanel } from './components/ScorePanel'
import { PrimaryButton } from './components/ui/Button'
import { GameEngine, type HudSnapshot } from './game/engine'
import { KeyboardLayout } from './game/keyboard'
import { buildReport, type SessionReport } from './game/report'
import { SONGS } from './game/songs'
import { saveSession } from './storage/sessionStore'
import { listCustomSongs, saveCustomSong, deleteCustomSong, type CustomSong } from './storage/songStore'
import type { PracticeMode, Song } from './types'
import { useElementSize } from './hooks/useElementWidth'
import { useMidiInput } from './midi/useMidiInput'
import { playPianoNote, preloadPiano, pianoNoteOn, pianoNoteOff, pianoSetSustain } from './audio/piano'
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
import { markLessonComplete, getTutorialProgress, isDevMode, setDevMode } from './storage/tutorialStore'
import { LessonScreen } from './components/tutorial/LessonScreen'
import { Sidebar, type NavKey } from './components/Sidebar'

type Screen = 'select' | 'play' | 'report' | 'import' | 'editor' | 'lesson' | 'freeplay'

// 电脑键盘 → midi
// 高八度（A 行）：白键 A S D F G H J K L ; '，黑键 W E T Y U O
// 低八度（Z 行）：白键 Z X C V B N M（C3-B3，左手练习用）
const KEYBOARD_MAP: Record<string, number> = {
  KeyZ: 48, KeyX: 50, KeyC: 52, KeyV: 53, KeyB: 55,
  KeyN: 57, KeyM: 59,
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
  /** 主页 tab：学习路径 / 曲库 */
  const [homeTab, setHomeTab] = useState<'learn' | 'songs'>('learn')
  /** 开发者模式：解锁全部课程（持久化到 localStorage） */
  const [devMode, setDevModeState] = useState(isDevMode)
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
  const { ref: playAreaRef, width, height: areaH } = useElementSize<HTMLDivElement>()
  // 键盘占演奏区 20% 高（110~160px 之间），其余全部留给瀑布流画布
  const keyboardH = Math.round(Math.min(160, Math.max(110, areaH * 0.2)))
  const canvasH = Math.max(140, Math.round(areaH - keyboardH))

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
          // 自由弹奏：按下持续响（延音踏板可挂起），采样器不可用时回退合成音色短音
          void pianoNoteOn(midi).then(usedPiano => {
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
    if (engineRef.current === null) {
      // 自由弹奏：松开即释放（踏板踩下时由 piano.ts 挂起）
      void pianoNoteOff(midi)
    }
    engineRef.current?.release(midi)
  }, [])

  const [pedalDown, setPedalDown] = useState(false)

  const handlePedal = useCallback((on: boolean) => {
    setPedalDown(on)
    void pianoSetSustain(on)
  }, [])

  const handleNote = useCallback(
    (midi: number, on: boolean) => {
      if (on) noteOn(midi)
      else noteOff(midi)
    },
    [noteOn, noteOff],
  )

  const { status: midiStatus, deviceName } = useMidiInput(handleNote, handlePedal)

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

  // 离开练习页时清空引擎，避免残留引擎导致自由弹奏误走"对错判定"分支而不出声
  useEffect(() => {
    if (screen !== 'play') engineRef.current = null
  }, [screen])

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

  /** 带侧栏的页面；演奏/课程/自由弹奏为全屏沉浸页 */
  const withSidebar =
    screen === 'select' || screen === 'import' || screen === 'editor' || screen === 'report'

  const sidebarActive: NavKey | null =
    screen === 'select' ? homeTab : screen === 'import' || screen === 'editor' ? 'import' : null

  const handleNav = async (key: NavKey) => {
    if (key === 'learn' || key === 'songs') {
      setHomeTab(key)
      setScreen('select')
    } else if (key === 'import') {
      setScreen('import')
    } else {
      setFreePlayNoteCount(0)
      try {
        await Tone.start()
        Tone.getContext().lookAhead = 0.005
      } catch { /* ignore */ }
      preloadPiano()
      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
        }).toDestination()
        synthRef.current.volume.value = -6
      }
      setScreen('freeplay')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden text-primary">
      {withSidebar && (
        <Sidebar
          active={sidebarActive}
          onNav={handleNav}
          gamification={gamification}
          midiLabel={midiStatus === 'ok' ? `🎧 ${deviceName}` : '⌨️ 电脑键盘可用'}
          devMode={devMode}
          onToggleDev={() => {
            const next = !devMode
            setDevMode(next)
            setDevModeState(next)
          }}
        />
      )}

      <main className={`min-w-0 flex-1 ${withSidebar ? 'overflow-y-auto' : 'h-full'}`}>
      {screen === 'select' && (
        <div className="screen-enter mx-auto w-full max-w-6xl px-8 py-8">
          {/* ===== 继续练习大卡（多邻国式） ===== */}
          {homeTab === 'learn' && (
            <>
              <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-micro font-medium uppercase tracking-[0.2em] text-muted">
                    Learning Score
                  </p>
                  <h1 className="mt-1.5 text-h1 font-bold tracking-tight text-primary">学习路径</h1>
                  <p className="mt-1.5 text-sm text-secondary">
                    {MODE_INFO[mode].label} · {MODE_INFO[mode].desc}
                  </p>
                </div>
                <button
                  onClick={() => setMode(m => (m === 'wait' ? 'free' : 'wait'))}
                  className="rounded-full border border-border-strong px-4 py-1.5 text-xs text-secondary transition-colors hover:border-accent/60 hover:text-accent-strong"
                >
                  切换为{mode === 'wait' ? '自由式' : '等待式'}
                </button>
              </header>

              {/* 继续横幅 */}
              <div className="glass mt-6 flex flex-wrap items-center gap-4 rounded-2xl px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-micro font-medium uppercase tracking-[0.16em] text-muted">继续</p>
                  <p className="mt-1 truncate text-h3 font-bold text-primary">
                    {getTutorialProgress().completed.length < LESSONS.length
                      ? `第 ${getTutorialProgress().completed.length + 1} 课 · ${LESSONS[Math.min(getTutorialProgress().completed.length, LESSONS.length - 1)].title}`
                      : lastPlayed.name ?? SONGS[0].name}
                  </p>
                </div>
                <DuoButton
                  variant="green"
                  className="px-8 py-3"
                  onClick={() => {
                    const t = getTutorialProgress().completed.length
                    if (t < LESSONS.length) {
                      setActiveLesson(LESSONS[Math.min(t, LESSONS.length - 1)])
                      setScreen('lesson')
                    } else {
                      void startSong(lastPlayed.id ?? SONGS[0].id, mode)
                    }
                  }}
                >
                  {getTutorialProgress().completed.length < LESSONS.length ? '继续上课' : '继续练习'}
                </DuoButton>
              </div>

              {/* 五线谱学习路径（全宽） */}
              <section className="mt-10">
                {getTutorialProgress().completed.length < LESSONS.length ? (
                  <LearningPath
                    lessons={LESSONS}
                    onOpenLesson={lesson => {
                      setActiveLesson(lesson)
                      setScreen('lesson')
                    }}
                  />
                ) : (
                  <div className="rounded-2xl border border-accent/40 bg-accent-dim/20 px-6 py-10 text-center">
                    <p className="text-3xl">🎓</p>
                    <p className="mt-2 text-lg font-bold text-primary">全部课程已完成！</p>
                    <p className="mt-1 text-sm text-secondary">去曲库挑战更多曲目，或导入你喜欢的乐谱</p>
                  </div>
                )}
              </section>
            </>
          )}

          {homeTab === 'songs' && (
            <>
              <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-micro font-medium uppercase tracking-[0.2em] text-muted">
                    Library
                  </p>
                  <h1 className="mt-1.5 text-h1 font-bold tracking-tight text-primary">曲库</h1>
                  <p className="mt-1.5 text-sm text-secondary">
                    {allSongs.length} 首 · {MODE_INFO[mode].label}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {midiStatus === 'ok' ? `🎧 ${deviceName}` : '⌨️ 电脑键盘可用'}
                  {' · '}
                  <button onClick={() => void toggleMic()} className="text-info hover:underline">
                    {micEnabled ? '麦克风已开' : '开麦克风'}
                  </button>
                </p>
              </header>

              <section className="mt-8">
                <SongSection
                  songs={allSongs.map(s => ({ ...s, source: (s as CustomSong).source }))}
                  onPlay={s => void startSong(s.id, mode)}
                  onDelete={id => {
                    deleteCustomSong(id)
                    setCustomSongs(listCustomSongs())
                  }}
                />
              </section>
            </>
          )}
        </div>
      )}

      {screen === 'play' && (
        <div className="screen-enter flex h-full flex-col">
          {/* 顶部细 HUD：退出 / 曲名 / 进度 / 命中统计 / 开关 */}
          <div className="flex h-12 shrink-0 items-center gap-x-4 border-b border-border-subtle bg-surface/80 px-4 text-sm backdrop-blur-md max-sm:gap-x-2.5 max-sm:text-xs">
            <button
              onClick={() => setScreen('select')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-secondary transition-colors hover:bg-raised hover:text-primary"
              aria-label="退出练习"
            >
              ‹
            </button>
            <span className="min-w-0 shrink truncate font-medium text-primary">
              {song.name}
              <span className="ml-2 text-muted">{MODE_INFO[mode].label}</span>
            </span>
            <div className="relative h-1 min-w-16 flex-1 overflow-hidden rounded-full bg-raised-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-accent shadow-[0_0_10px_rgb(242_178_52/0.5)] transition-all duration-150"
                style={{ width: `${(hud?.progress ?? 0) * 100}%` }}
              />
            </div>
            <div className="flex shrink-0 items-center gap-x-4 tabular-nums max-sm:gap-x-2.5">
              <span className="text-hit">命中 {hud?.hits ?? 0}</span>
              {mode === 'free' && <span className="text-miss">漏弹 {hud?.misses ?? 0}</span>}
              <span className="text-wrong">错音 {hud?.errors ?? 0}</span>
              <span className="text-secondary">{(accuracy * 100).toFixed(0)}%</span>
            </div>
            <button
              onClick={() => setSynthOn(v => !v)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                synthOn ? 'bg-accent/15 text-accent-strong' : 'text-muted hover:bg-raised hover:text-primary'
              }`}
            >
              伴奏 {synthOn ? '开' : '关'}
            </button>
            <button
              onClick={() => setShowScore(v => !v)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                showScore ? 'bg-accent/15 text-accent-strong' : 'text-muted hover:bg-raised hover:text-primary'
              }`}
            >
              乐谱
            </button>
          </div>

          {/* 乐谱条：抽屉式横向滚动，跟随进度（谱纸白底） */}
          {showScore && (
            <ScorePanel
              song={song}
              engineRef={engineRef}
              imageUrl={(song as CustomSong).imageDataUrl}
              onClose={() => setShowScore(false)}
            />
          )}

          {/* 瀑布流占满剩余空间 + 键盘贴底 */}
          <div ref={playAreaRef} className="relative flex min-h-0 flex-1 flex-col">
            <FallingNotes engineRef={engineRef} layout={layout} width={width} height={canvasH} />
            <PianoKeyboard
              layout={layout}
              width={width}
              height={keyboardH}
              pressedSet={pressedSet}
              targetSet={targetSet}
              wrong={wrong}
              onNoteOn={noteOn}
              onNoteOff={noteOff}
            />
            <p
              className="pointer-events-none absolute inset-x-0 text-center text-[11px] text-muted"
              style={{ bottom: keyboardH + 10 }}
            >
              {mode === 'wait'
                ? hud?.waiting
                  ? '弹奏亮起的目标键 · 弹对才前进'
                  : '音符下落中…'
                : '跟上节奏 · 音符到判定线时弹奏'}
            </p>
          </div>
        </div>
      )}

      {screen === 'lesson' && activeLesson !== null && (
        <div className="screen-enter h-full overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
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
        </div>
      )}

      {screen === 'freeplay' && (
        <div className="screen-enter flex h-full flex-col">
          <div className="flex h-12 shrink-0 items-center gap-x-4 border-b border-border-subtle bg-surface/80 px-4 text-sm backdrop-blur-md">
            <button
              onClick={() => {
                if (videoRecorder.state === 'recording') videoRecorder.stop()
                setScreen('select')
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-secondary transition-colors hover:bg-raised hover:text-primary"
              aria-label="退出自由弹奏"
            >
              ‹
            </button>
            <span className="font-medium text-primary">自由弹奏</span>
            <span className="text-caption text-muted">弹奏任何音符 · 没有对错 · 享受音乐</span>
            <div className="flex-1" />
            <span className="text-caption tabular-nums text-muted">{freePlayNoteCount} 音</span>
            <span
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                pedalDown ? 'bg-accent/25 text-accent-strong' : 'text-muted'
              }`}
              title="延音踏板（MIDI CC64）"
            >
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  pedalDown ? 'bg-accent shadow-[0_0_8px_rgb(242_178_52/0.8)]' : 'bg-muted/50'
                }`}
              />
              延音
            </span>
            <button
              onClick={() => setSynthOn(v => !v)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                synthOn ? 'bg-accent/15 text-accent-strong' : 'text-muted hover:bg-raised hover:text-primary'
              }`}
            >
              伴奏 {synthOn ? '开' : '关'}
            </button>
            <button
              onClick={() => {
                if (videoRecorder.state === 'recording') videoRecorder.stop()
                else videoRecorder.start()
              }}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
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

          <div ref={playAreaRef} className="relative flex min-h-0 flex-1 flex-col">
            <FreePlayCanvas
              canvasRef={freePlayCanvasRef}
              layout={freePlayLayout}
              width={width}
              height={canvasH}
              onNoteCountChange={setFreePlayNoteCount}
            />
            <PianoKeyboard
              layout={freePlayLayout}
              width={width}
              height={keyboardH}
              pressedSet={pressedSet}
              targetSet={new Set()}
              wrong={null}
              onNoteOn={noteOn}
              onNoteOff={noteOff}
            />
          </div>
        </div>
      )}

      {screen === 'import' && (
        <div className="screen-enter mx-auto w-full max-w-5xl px-8 py-10">
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
        <div className="screen-enter w-full px-6 py-6">
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

      {screen === 'report' && report && (
        <div className="screen-enter mx-auto w-full max-w-4xl px-8 py-8">
          {fromLessonId !== null && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
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
          <ReportScreen
            report={report}
            onRetry={() => void startSong(song.id, mode)}
            onSelect={() => setScreen('select')}
          />
        </div>
      )}
      </main>
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
