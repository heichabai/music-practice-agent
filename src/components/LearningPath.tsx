import type { Lesson } from '../game/lessons'
import { UNITS } from '../game/lessons'
import { getTutorialProgress, isDevMode } from '../storage/tutorialStore'

interface Props {
  lessons: Lesson[]
  onOpenLesson: (lesson: Lesson) => void
}

/* ---------- 谱面几何常量 ---------- */
const BOX_H = 250 // 谱面区块高度
const BASE_Y = 200 // s=0（下加一线）的 y 坐标
const HALF_GAP = 9 // 半个线间距（一个 diatonic 步进）
const STAFF_TOP_S = 10 // 顶线步进
const STAFF_BOT_S = 2 // 底线步进
const CLEF_W_PCT = 12 // 左侧谱号保留宽度（%）

const yOf = (s: number) => BASE_Y - s * HALF_GAP
const STAFF_LINES = [2, 4, 6, 8, 10].map(yOf)
const MOVEMENTS = ['I', 'II', 'III', 'IV', 'V']

/** 课序号 → 音高步进 s：k 节课均匀爬升 s=0..10（下加一线 → 顶线） */
function stepOf(i: number, total: number): number {
  if (total <= 1) return 5
  return Math.round((i / (total - 1)) * STAFF_TOP_S)
}

/** 课序号 → 横向位置（%）：谱号右侧起排 */
function xOf(i: number, total: number): number {
  if (total <= 1) return 55
  return CLEF_W_PCT + 4 + (i / (total - 1)) * (92 - CLEF_W_PCT)
}

interface NoteNodeProps {
  lesson: Lesson
  x: number // %
  s: number // 音高步进
  state: 'done' | 'current' | 'open' | 'locked'
  color: string
  dev: boolean
  onOpen: () => void
}

/** 课程音符：真符头+符干 SVG；完成=金色，当前=单元色呼吸辉光，可点=半透单元色，未解锁=空心暗色 */
function NoteNode({ lesson, x, s, state, color, dev, onOpen }: NoteNodeProps) {
  const locked = state === 'locked'
  const headFill =
    state === 'done' ? '#f2b234' : state === 'locked' ? '#171c28' : color
  const stroke = state === 'done' ? '#f2b234' : state === 'locked' ? '#35405c' : color

  return (
    <button
      onClick={() => !locked && onOpen()}
      disabled={locked}
      className={`group absolute flex flex-col items-center transition-transform duration-200 ${
        locked ? 'cursor-not-allowed' : 'hover:-translate-y-1.5 active:scale-95'
      }`}
      style={{ left: `${x}%`, top: yOf(s), transform: 'translate(-50%, -46%)' }}
    >
      {/* hover tooltip：课程副标题 */}
      <span className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-full border border-border-subtle bg-raised px-2.5 py-0.5 text-[10px] text-secondary opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100">
        {lesson.subtitle}
      </span>

      {/* 下加线（s=0 的音符穿一根 ledger line） */}
      {s < STAFF_BOT_S && (
        <span className="absolute left-1/2 top-[46%] h-px w-9 -translate-x-1/2 bg-white/15" />
      )}

      <svg
        viewBox="0 0 36 60"
        className="h-[54px] w-[33px]"
        style={{
          filter:
            state === 'current'
              ? `drop-shadow(0 0 10px ${color})`
              : state === 'done'
                ? 'drop-shadow(0 0 7px rgb(242 178 52 / 0.55))'
                : undefined,
          animation: state === 'current' ? 'target-pulse 1.6s ease-in-out infinite' : undefined,
        }}
      >
        {/* 符干 */}
        <line x1="25" y1="35" x2="25" y2="5" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        {/* 符头 */}
        <ellipse
          cx="14"
          cy="36"
          rx="12"
          ry="8.5"
          transform="rotate(-18 14 36)"
          fill={headFill}
          fillOpacity={state === 'open' ? 0.5 : 1}
          stroke={stroke}
          strokeWidth={locked ? 1.5 : 0}
        />
      </svg>

      {/* 课名标签 */}
      <span
        className={`absolute top-[62px] w-24 truncate text-center text-[11px] font-bold ${
          state === 'done'
            ? 'text-accent-strong'
            : state === 'current'
              ? ''
              : state === 'open'
                ? 'text-secondary'
                : 'text-muted'
        }`}
        style={state === 'current' ? { color } : undefined}
      >
        {state === 'done' ? '✓ ' : ''}
        {lesson.title}
      </span>
      {dev && (
        <span className="absolute top-[78px] w-24 text-center font-mono text-[9px] text-muted">
          {lesson.id}
        </span>
      )}
    </button>
  )
}

/**
 * 五线谱学习路径：每个单元一个乐章（全宽五条谱线），
 * 课程化作音符从左到右音高爬升；已完成的音符连成一条金色旋律。
 */
export function LearningPath({ lessons, onOpenLesson }: Props) {
  const dev = isDevMode()
  const completed = getTutorialProgress().completed
  const currentIdx = lessons.findIndex(l => !completed.includes(l.id))
  const current = currentIdx === -1 ? lessons.length : currentIdx

  return (
    <div className="space-y-16 pb-8">
      {UNITS.map(unit => {
        const uLessons = lessons.filter(l => l.unit === unit.id)
        if (uLessons.length === 0) return null
        const doneCount = uLessons.filter(l => completed.includes(l.id)).length

        // 已弹旋律折线：完成 + 当前课的符头中心依次相连
        const melodyPts = uLessons
          .map((l, i) => ({ l, i }))
          .filter(({ l }) => completed.includes(l.id) || lessons.indexOf(l) === current)
          .map(({ i }) => `${xOf(i, uLessons.length) * 10},${yOf(stepOf(i, uLessons.length)) + 2}`)
          .join(' ')

        return (
          <section key={unit.id}>
            {/* 乐章头部 */}
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span
                  className="text-micro font-medium uppercase tracking-[0.22em]"
                  style={{ color: unit.color }}
                >
                  Movement {MOVEMENTS[unit.id - 1] ?? unit.id}
                </span>
                <h3 className="text-h3 font-bold text-primary">
                  {unit.title.split('·')[1]?.trim() ?? unit.title}
                </h3>
              </div>
              <span className="text-caption tabular-nums text-muted">
                {doneCount}/{uLessons.length}
                {doneCount === uLessons.length && <span className="ml-1.5 text-accent-strong">✓</span>}
              </span>
            </div>
            <div
              className="mt-2.5 h-px"
              style={{ background: `linear-gradient(90deg, ${unit.color}59, transparent 55%)` }}
            />

            {/* 谱面 */}
            <div className="relative mt-2 select-none" style={{ height: BOX_H }}>
              {/* 谱号水印 */}
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[92px] leading-none text-white/[0.05]">
                𝄞
              </span>

              {/* 五条谱线 */}
              {STAFF_LINES.map(y => (
                <div key={y} className="absolute inset-x-0 h-px bg-white/[0.09]" style={{ top: y }} />
              ))}

              {/* 终止线（细+粗双线） */}
              <div
                className="absolute right-0 flex gap-[5px]"
                style={{ top: STAFF_LINES[0], height: STAFF_LINES[4] - STAFF_LINES[0] }}
              >
                <span className="w-px bg-white/15" />
                <span className="w-[3px] rounded-sm bg-white/25" />
              </div>

              {/* 金色旋律连线 */}
              {melodyPts.includes(' ') && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 1000 ${BOX_H}`}
                  preserveAspectRatio="none"
                  style={{ filter: 'drop-shadow(0 0 5px rgb(242 178 52 / 0.45))' }}
                >
                  <polyline
                    points={melodyPts}
                    fill="none"
                    stroke="#f2b234"
                    strokeOpacity="0.5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* 课程音符 */}
              {uLessons.map((lesson, i) => {
                const gi = lessons.indexOf(lesson)
                const state = completed.includes(lesson.id)
                  ? 'done'
                  : gi === current
                    ? 'current'
                    : !dev && gi > current
                      ? 'locked'
                      : 'open'
                return (
                  <NoteNode
                    key={lesson.id}
                    lesson={lesson}
                    x={xOf(i, uLessons.length)}
                    s={stepOf(i, uLessons.length)}
                    state={state}
                    color={unit.color}
                    dev={dev}
                    onOpen={() => onOpenLesson(lesson)}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
