import { useState } from 'react'
import type { Lesson, LessonQuiz, DiagramKind } from '../../game/lessons'
import { SONGS } from '../../game/songs'
import { askTutor } from '../../ai/tutorChat'
import type { Song } from '../../types'
import { GhostButton, EnterButton } from '../ui/Button'
import { IconChevronRight, IconSparkles } from '../icons'
import { TaskKeyboard } from './TaskKeyboard'
import {
  DiagramKeyboard,
  DiagramFingers,
  DiagramStaff,
  DiagramHandShape,
  DiagramStrike,
  DiagramBothHands,
  DiagramPosture,
  DiagramOctaves,
  DiagramClefs,
  DiagramPositions,
  DiagramDurations,
  DiagramRests,
  DiagramTimeSig,
  DiagramEighth,
  DiagramDotted,
  DiagramChord,
  DiagramChordProg,
  DiagramMetronome,
  DiagramForm,
} from './Diagrams'

interface Props {
  lesson: Lesson
  nextLesson: Lesson | null
  onBack: () => void
  onPractice: (song: Song, lessonId: string) => void
  onNextLesson: (lesson: Lesson) => void
  /** 完成本课（去重发奖在 App 层处理） */
  onComplete: () => void
}

function Diagram({ kind }: { kind: DiagramKind }) {
  switch (kind) {
    case 'keyboard': return <DiagramKeyboard />
    case 'staff': return <DiagramStaff />
    case 'posture': return <DiagramPosture />
    case 'handshape': return <DiagramHandShape />
    case 'strike': return <DiagramStrike />
    case 'bothhands': return <DiagramBothHands />
    case 'octaves': return <DiagramOctaves />
    case 'clefs': return <DiagramClefs />
    case 'positions': return <DiagramPositions />
    case 'durations': return <DiagramDurations />
    case 'rests': return <DiagramRests />
    case 'timesig': return <DiagramTimeSig />
    case 'eighth': return <DiagramEighth />
    case 'dotted': return <DiagramDotted />
    case 'chord': return <DiagramChord />
    case 'chordprog': return <DiagramChordProg />
    case 'metronome': return <DiagramMetronome />
    case 'form': return <DiagramForm />
    default: return <DiagramFingers />
  }
}

function QuizBlock({ quiz, onCorrect }: { quiz: LessonQuiz; onCorrect: () => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const correct = picked === quiz.answer
  return (
    <div className="glass rounded-xl p-5">
      <p className="text-body font-medium text-primary">小结测验 · {quiz.question}</p>
      <div className="mt-3 space-y-2">
        {quiz.options.map((opt, i) => {
          const state =
            picked === null ? 'idle' : i === quiz.answer ? 'right' : i === picked ? 'wrong' : 'idle'
          return (
            <button
              key={i}
              onClick={() => {
                if (picked !== null) return
                setPicked(i)
                if (i === quiz.answer) onCorrect()
              }}
              className={`block w-full rounded-lg border px-4 py-2.5 text-left text-body transition-colors ${
                state === 'right'
                  ? 'border-hit/60 bg-hit/10 text-hit'
                  : state === 'wrong'
                    ? 'border-wrong/60 bg-wrong/10 text-wrong'
                    : 'border-border-subtle bg-raised/60 text-secondary hover:border-border-strong hover:text-primary'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <p className={`mt-3 text-caption ${correct ? 'text-hit' : 'text-wrong'}`}>
          {correct ? '回答正确！' : '再想想——'} {quiz.explain}
        </p>
      )}
    </div>
  )
}

function TutorBox({ lesson }: { lesson: Lesson }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const summary = lesson.steps.map(s => `${s.heading}：${s.body}`).join('；')

  const send = async () => {
    const q = question.trim()
    if (q === '' || loading) return
    setLoading(true)
    setError('')
    setAnswer('')
    try {
      setAnswer(await askTutor(lesson.title, summary, q))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2">
        <IconSparkles className="h-4 w-4 text-accent" />
        <p className="text-micro font-medium uppercase text-muted">问教练</p>
      </div>
      <p className="mt-2 text-caption text-muted">
        关于本课的任何疑问，AI 教练会结合课程内容回答
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void send()
          }}
          placeholder="例如：为什么拇指要侧着弹？"
          className="flex-1 rounded-lg border border-border-subtle bg-raised/60 px-3.5 py-2 text-body text-primary outline-none transition-colors placeholder:text-muted focus:border-accent/60"
        />
        <GhostButton onClick={() => void send()} className={loading ? 'pointer-events-none opacity-40' : ''}>
          {loading ? '思考中…' : '提问'}
        </GhostButton>
      </div>
      {error !== '' && <p className="mt-3 text-caption text-wrong">{error}</p>}
      {answer !== '' && (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface px-4 py-3 text-body leading-relaxed text-secondary">
          {answer}
        </div>
      )}
    </div>
  )
}

export function LessonScreen({ lesson, nextLesson, onBack, onPractice, onNextLesson, onComplete }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [taskDone, setTaskDone] = useState(false)
  const [quizOk, setQuizOk] = useState(false)
  const [completedNow, setCompletedNow] = useState(false)

  const step = lesson.steps[stepIdx]
  const isLast = stepIdx === lesson.steps.length - 1
  const canComplete =
    (lesson.task === undefined || taskDone) && (lesson.quiz === undefined || quizOk)
  const practiceSong =
    lesson.practiceSong ?? SONGS.find(s => s.id === lesson.practiceSongId) ?? null

  const complete = () => {
    onComplete()
    setCompletedNow(true)
  }

  /** 返回课程列表：已完成全部任务则自动记为完成 */
  const handleBack = () => {
    if (canComplete && !completedNow) complete()
    onBack()
  }

  return (
    <div className="w-full">
      {/* 顶栏：返回 + 课号 + 分段进度条 */}
      <div className="flex items-center gap-4">
        <GhostButton onClick={handleBack} className="px-3 py-1 text-xs">
          ‹ 课程
        </GhostButton>
        <span className="text-micro font-medium uppercase tracking-[0.18em] text-muted">
          Lesson {String(lesson.order).padStart(2, '0')} · Unit {lesson.unit}
        </span>
        <div className="flex flex-1 items-center justify-end gap-1">
          {lesson.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 w-8 rounded-full transition-colors duration-300 ${
                i < stepIdx
                  ? 'bg-hit/70'
                  : i === stepIdx
                    ? 'bg-accent shadow-[0_0_6px_rgb(242_178_52/0.6)]'
                    : 'bg-border-strong/60'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* 左栏：教学内容 */}
        <div className="min-w-0">
          <h1 className="text-h1 font-semibold text-primary">{lesson.title}</h1>
          <p className="mt-2 text-body text-secondary">{lesson.subtitle}</p>

          {/* 步骤卡片 */}
          <div className="glass mt-8 rounded-2xl p-7">
            <p className="text-micro font-medium uppercase text-muted">
              Step {stepIdx + 1} / {lesson.steps.length}
            </p>
            <h2 className="mt-3 text-h3 font-semibold text-primary">{step.heading}</h2>
            <p className="mt-3 text-body leading-relaxed text-secondary">{step.body}</p>
            {step.diagram !== undefined && (
              <div className="diagram-card mt-6 px-6 py-6">
                <Diagram kind={step.diagram} />
              </div>
            )}
            <div className="mt-7 flex items-center justify-between">
              <GhostButton
                onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                className={stepIdx === 0 ? 'pointer-events-none opacity-0' : ''}
              >
                上一步
              </GhostButton>
              <GhostButton onClick={() => setStepIdx(i => Math.min(lesson.steps.length - 1, i + 1))} className={isLast ? 'pointer-events-none opacity-0' : ''}>
                下一步
              </GhostButton>
            </div>
          </div>
        </div>

        {/* 右栏：sticky 练习面板 */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          {/* 互动任务 */}
          {lesson.task !== undefined && (
            <TaskKeyboard key={lesson.id} task={lesson.task} onSatisfied={() => setTaskDone(true)} />
          )}

          {/* 小结测验 */}
          {lesson.quiz !== undefined && (
            <QuizBlock quiz={lesson.quiz} onCorrect={() => setQuizOk(true)} />
          )}

          {/* 完成与课后练习 */}
          <div className="glass rounded-xl p-4">
            {practiceSong !== null && (
              <EnterButton
                onClick={() => onPractice(practiceSong, lesson.id)}
                className="w-full"
              >
                开始课后练习
                <IconChevronRight className="h-4 w-4" />
              </EnterButton>
            )}
            {completedNow ? (
              <p className={`rounded-full bg-hit/15 px-4 py-2 text-center text-body text-hit ${practiceSong !== null ? 'mt-3' : ''}`}>
                本课已完成 ✓
              </p>
            ) : (
              <GhostButton
                onClick={complete}
                className={`w-full justify-center ${practiceSong !== null ? 'mt-2.5' : ''} ${canComplete ? '' : 'pointer-events-none opacity-40'}`}
              >
                {canComplete ? '完成本课' : lesson.task !== undefined && !taskDone ? '先完成动手任务' : '先通过测验'}
              </GhostButton>
            )}
            {practiceSong !== null && lesson.practiceNote !== undefined && (
              <p className="mt-3 text-caption text-muted">{lesson.practiceNote}</p>
            )}
          </div>

          {/* 下一课 */}
          {nextLesson !== null && (
            <button
              onClick={() => {
                // 点击下一课 = 自动视为完成本课
                if (!completedNow) complete()
                onNextLesson(nextLesson)
              }}
              className="sheen group flex w-full items-center gap-4 rounded-xl border border-accent/40 bg-accent-dim/30 px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/70"
            >
              <span className="flex-1">
                <span className="block text-caption text-accent-strong">
                  下一课{completedNow ? '' : '（自动完成本课）'}
                </span>
                <span className="block text-body font-medium text-primary">
                  第 {nextLesson.order} 课 · {nextLesson.title}
                </span>
              </span>
              <IconChevronRight className="h-4 w-4 text-accent" />
            </button>
          )}

          {/* AI 答疑 */}
          <TutorBox lesson={lesson} />
        </aside>
      </div>
    </div>
  )
}
