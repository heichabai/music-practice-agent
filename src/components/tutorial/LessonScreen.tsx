import { useState } from 'react'
import type { Lesson, LessonQuiz } from '../../game/lessons'
import { SONGS } from '../../game/songs'
import { markLessonComplete } from '../../storage/tutorialStore'
import { askTutor } from '../../ai/tutorChat'
import type { Song } from '../../types'
import { PrimaryButton, GhostButton } from '../ui/Button'
import { IconChevronRight, IconSparkles } from '../icons'
import { TaskKeyboard } from './TaskKeyboard'
import { DiagramKeyboard, DiagramFingers, DiagramStaff } from './Diagrams'

interface Props {
  lesson: Lesson
  nextLesson: Lesson | null
  onBack: () => void
  onPractice: (song: Song, lessonId: string) => void
  onNextLesson: (lesson: Lesson) => void
}

function Diagram({ kind }: { kind: 'keyboard' | 'staff' | 'fingers' }) {
  if (kind === 'keyboard') return <DiagramKeyboard />
  if (kind === 'staff') return <DiagramStaff />
  return <DiagramFingers />
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

export function LessonScreen({ lesson, nextLesson, onBack, onPractice, onNextLesson }: Props) {
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

  return (
    <div className="screen-enter w-full max-w-2xl pb-16">
      <div className="flex items-center gap-4">
        <GhostButton onClick={onBack} className="px-3 py-1 text-xs">
          ‹ 课程
        </GhostButton>
        <span className="text-caption text-muted">第 {lesson.order} 课</span>
        <div className="flex flex-1 items-center justify-end gap-1.5">
          {lesson.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIdx
                  ? 'w-5 bg-accent'
                  : i < stepIdx
                    ? 'w-1.5 bg-hit/70'
                    : 'w-1.5 bg-border-strong'
              }`}
            />
          ))}
        </div>
      </div>

      <h1 className="mt-8 text-h1 font-semibold text-primary">{lesson.title}</h1>
      <p className="mt-2 text-body text-secondary">{lesson.subtitle}</p>

      {/* 步骤卡片 */}
      <div className="glass mt-8 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <p className="text-micro font-medium uppercase text-muted">
            Step {stepIdx + 1} / {lesson.steps.length}
          </p>
        </div>
        <h2 className="mt-3 text-h3 font-semibold text-primary">{step.heading}</h2>
        <p className="mt-3 text-body leading-relaxed text-secondary">{step.body}</p>
        {step.diagram !== undefined && (
          <div className="mt-5 rounded-lg bg-base/50 px-4 py-4">
            <Diagram kind={step.diagram} />
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
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

      {/* 互动任务 */}
      {lesson.task !== undefined && (
        <div className="mt-4">
          <TaskKeyboard task={lesson.task} onSatisfied={() => setTaskDone(true)} />
        </div>
      )}

      {/* 小结测验 */}
      {lesson.quiz !== undefined && (
        <div className="mt-4">
          <QuizBlock quiz={lesson.quiz} onCorrect={() => setQuizOk(true)} />
        </div>
      )}

      {/* 完成与课后练习 */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {practiceSong !== null && (
          <PrimaryButton
            onClick={() => onPractice(practiceSong, lesson.id)}
            className="bg-gradient-accent shadow-[0_6px_24px_rgb(245_158_11/0.3)]"
          >
            开始课后练习
            <IconChevronRight className="h-4 w-4" />
          </PrimaryButton>
        )}
        {completedNow ? (
          <span className="rounded-full bg-hit/15 px-4 py-2 text-body text-hit">
            本课已完成 ✓
          </span>
        ) : (
          <GhostButton
            onClick={() => {
              markLessonComplete(lesson.id)
              setCompletedNow(true)
            }}
            className={canComplete ? '' : 'pointer-events-none opacity-40'}
          >
            {canComplete ? '完成本课' : lesson.task !== undefined && !taskDone ? '先完成动手任务' : '先通过测验'}
          </GhostButton>
        )}
      </div>
      {practiceSong !== null && lesson.practiceNote !== undefined && (
        <p className="mt-3 text-caption text-muted">{lesson.practiceNote}</p>
      )}

      {completedNow && nextLesson !== null && (
        <button
          onClick={() => onNextLesson(nextLesson)}
          className="sheen group mt-4 flex w-full items-center gap-4 rounded-xl border border-accent/40 bg-accent-dim/30 px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/70"
        >
          <span className="flex-1">
            <span className="block text-caption text-accent-strong">下一课</span>
            <span className="block text-body font-medium text-primary">
              第 {nextLesson.order} 课 · {nextLesson.title}
            </span>
          </span>
          <IconChevronRight className="h-4 w-4 text-accent" />
        </button>
      )}

      {/* AI 答疑 */}
      <div className="mt-8">
        <TutorBox lesson={lesson} />
      </div>
    </div>
  )
}
