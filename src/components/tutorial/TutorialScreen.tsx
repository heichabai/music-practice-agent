import type { Lesson } from '../../game/lessons'
import { getTutorialProgress } from '../../storage/tutorialStore'
import { IconChevronRight, IconMusicNote } from '../icons'

interface Props {
  lessons: Lesson[]
  onOpenLesson: (lesson: Lesson) => void
}

export function TutorialScreen({ lessons, onOpenLesson }: Props) {
  const completed = getTutorialProgress().completed
  const currentIdx = (() => {
    const next = lessons.findIndex(l => !completed.includes(l.id))
    return next === -1 ? lessons.length : next
  })()

  return (
    <div>
      <h2 className="text-micro font-medium uppercase text-muted">Piano Course</h2>
      <p className="mt-3 max-w-md text-body text-secondary">
        零基础入门 · {lessons.length} 课。每课 = 知识 + 动手任务 + 课后练习，全部完成后可挑战任意曲目。
      </p>

      <div className="mt-6 space-y-2.5">
        {lessons.map((lesson, idx) => {
          const isDone = completed.includes(lesson.id)
          const isCurrent = idx === currentIdx
          return (
            <button
              key={lesson.id}
              onClick={() => onOpenLesson(lesson)}
              className="sheen group flex w-full items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.025] px-4 py-3.5 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white/[0.05] hover:shadow-panel"
            >
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-lg"
                style={{
                  background: `linear-gradient(135deg, hsl(${lesson.hue} 42% 30%), hsl(${(lesson.hue + 40) % 360} 46% 15%))`,
                }}
              >
                <IconMusicNote
                  className="h-5 w-5"
                  style={{ color: `hsl(${lesson.hue} 70% 74%)` }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-caption text-muted">第 {lesson.order} 课</span>
                  {isDone && (
                    <span className="rounded-full bg-hit/15 px-2 py-0.5 text-[10px] text-hit">
                      已完成
                    </span>
                  )}
                  {isCurrent && !isDone && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent-strong">
                      继续学习
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-body font-medium text-primary">
                  {lesson.title}
                </span>
                <span className="block truncate text-caption text-muted">{lesson.subtitle}</span>
              </span>
              <IconChevronRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </button>
          )
        })}
      </div>

      <p className="mt-6 text-caption text-muted">
        进度保存在本机 · {completed.length}/{lessons.length} 课完成
      </p>
    </div>
  )
}
