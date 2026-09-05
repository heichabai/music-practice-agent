import type { Lesson } from '../game/lessons'
import { UNITS } from '../game/lessons'
import { getTutorialProgress } from '../storage/tutorialStore'

interface Props {
  lessons: Lesson[]
  onOpenLesson: (lesson: Lesson) => void
}

/**
 * 多邻国风格学习路径：
 * 按 Unit 分段，单元开头渲染彩色横幅；
 * 之字形排列的大圆节点，完成=金色✓，当前=单元色+脉冲，未来=灰色锁
 */
export function LearningPath({ lessons, onOpenLesson }: Props) {
  const completed = getTutorialProgress().completed
  const currentIdx = lessons.findIndex(l => !completed.includes(l.id))
  const current = currentIdx === -1 ? lessons.length : currentIdx

  let lastUnit = 0

  return (
    <div className="relative mx-auto max-w-sm pb-4">
      {/* 背景虚线路径 */}
      <svg
        className="absolute left-1/2 top-0 h-full -translate-x-1/2"
        width="80"
        viewBox="0 0 80 1000"
        preserveAspectRatio="none"
      >
        <path
          d="M 40 0 C 40 60, 10 80, 10 140 C 10 200, 70 220, 70 300 C 70 380, 10 400, 10 480 C 10 560, 70 580, 70 660 C 70 740, 10 760, 10 840 C 10 920, 40 940, 40 1000"
          fill="none"
          stroke="#d4d4dc"
          strokeWidth="4"
          strokeDasharray="8 8"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative flex flex-col items-center gap-6">
        {lessons.map((lesson, i) => {
          const isDone = completed.includes(lesson.id)
          const isCurrent = i === current
          const isLocked = i > current
          const unit = UNITS.find(u => u.id === lesson.unit) ?? UNITS[0]
          const color = unit.color

          // 之字形偏移
          const offset = i % 2 === 0 ? '-translate-x-10' : 'translate-x-10'

          const showBanner = lesson.unit !== lastUnit
          lastUnit = lesson.unit

          return (
            <div key={lesson.id} className="flex w-full flex-col items-center gap-6">
              {showBanner && (
                <div
                  className="mt-2 w-full max-w-xs rounded-2xl px-4 py-3 text-center"
                  style={{ background: unit.color, boxShadow: `0 3px 0 ${unit.shadow}` }}
                >
                  <p className="text-sm font-black uppercase tracking-wide text-white">
                    {unit.title}
                  </p>
                </div>
              )}

              <button
                onClick={() => !isLocked && onOpenLesson(lesson)}
                disabled={isLocked}
                className={`relative flex flex-col items-center transition-transform duration-200 ${offset} ${
                  isLocked ? 'cursor-not-allowed opacity-40' : 'hover:scale-110 active:scale-95'
                }`}
              >
                {/* 节点圆 */}
                <span
                  className={`relative grid h-[72px] w-[72px] place-items-center rounded-full text-2xl font-black text-white transition-all ${
                    isCurrent ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: isDone ? '#FFC800' : isLocked ? '#d4d4dc' : color,
                    boxShadow: isDone
                      ? '0 4px 0 #E6B400'
                      : isCurrent
                        ? `0 4px 0 ${unit.shadow}, 0 0 24px ${color}55`
                        : `0 4px 0 ${unit.shadow}80`,
                  }}
                >
                  {isDone ? (
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : isLocked ? (
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V7a4 4 0 018 0v4" />
                    </svg>
                  ) : (
                    <span className="text-xl font-black text-white drop-shadow">
                      {lesson.order}
                    </span>
                  )}
                </span>

                {/* 标签 */}
                <span
                  className={`mt-2 rounded-full px-3 py-1 text-[11px] font-bold ${
                    isDone
                      ? 'bg-[#FFC800]/15 text-[#B08900]'
                      : isCurrent
                        ? ''
                        : 'text-gray-400'
                  }`}
                  style={isCurrent ? { background: `${color}22`, color: unit.shadow } : undefined}
                >
                  {lesson.title}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
