import type { SessionReport } from '../game/report'
import { Card } from './ui/Card'
import { StatCard } from './ui/StatCard'
import { TimingGauge } from './ui/TimingGauge'
import { ProblemChip } from './ui/ProblemChip'
import { PrimaryButton, GhostButton } from './ui/Button'

interface Props {
  report: SessionReport
  onRetry: () => void
  onSelect: () => void
}

interface Rating {
  letter: string
  label: string
  gradient: string
  glow: string
}

function rateFromAccuracy(acc: number, misses: number, errors: number): Rating {
  const total = acc + (misses + errors) * 0.02 // 漏弹错音轻微压分
  if (total >= 0.95) return { letter: 'S', label: '完美', gradient: 'from-amber-300 via-orange-400 to-pink-500', glow: 'rgba(251,191,36,0.7)' }
  if (total >= 0.85) return { letter: 'A', label: '出色', gradient: 'from-emerald-300 via-teal-400 to-sky-500', glow: 'rgba(34,197,94,0.7)' }
  if (total >= 0.7) return { letter: 'B', label: '不错', gradient: 'from-sky-300 via-cyan-400 to-blue-500', glow: 'rgba(56,189,248,0.7)' }
  return { letter: 'C', label: '加油', gradient: 'from-slate-400 via-slate-500 to-slate-700', glow: 'rgba(148,163,184,0.5)' }
}

export function ReportScreen({ report, onRetry, onSelect }: Props) {
  const holdPct =
    report.holdAvgRatio !== null ? Math.min(100, report.holdAvgRatio * 100) : null
  const rating = rateFromAccuracy(report.accuracy, report.misses, report.wrongPresses)

  return (
    <Card className="w-full max-w-2xl overflow-hidden p-0 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
      {/* 顶部光带 */}
      <div
        aria-hidden
        className={`h-1 w-full bg-gradient-to-r ${rating.gradient}`}
        style={{ boxShadow: `0 0 24px ${rating.glow}` }}
      />

      <div className="p-6 sm:p-8">
        {/* 标题 + 评级 */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">练习报告</h2>
            <p className="mt-1 text-sm text-secondary">
              {report.songName} · {report.mode === 'wait' ? '等待式' : '自由式'} · {report.total} 音
            </p>
          </div>
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 blur-2xl"
              style={{ background: rating.glow, opacity: 0.5 }}
            />
            <div
              className={`rating-enter relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${rating.gradient} text-3xl font-black text-slate-950 shadow-2xl ring-1 ring-white/20 sm:h-24 sm:w-24 sm:text-4xl`}
            >
              {rating.letter}
            </div>
            <div className="mt-1 text-center text-xs font-medium text-secondary">
              {rating.label}
            </div>
          </div>
        </div>

        {/* 统计卡 */}
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            value={`${(report.accuracy * 100).toFixed(0)}%`}
            label={`命中率 ${report.hits}/${report.total}`}
            valueClass="text-hit"
            delay={0}
          />
          <TimingGauge avg={report.timingAvgBeats} delay={60} />
          <StatCard
            value={holdPct !== null ? `${holdPct.toFixed(0)}%` : '—'}
            label={
              holdPct !== null && report.tooShortCount > 0
                ? `时值保持 · ${report.tooShortCount} 个偏短`
                : '时值保持'
            }
            valueClass="text-accent-strong"
            delay={120}
          />
          <StatCard
            value={report.misses + report.wrongPresses}
            label={
              `漏弹 ${report.misses} · 错音 ${report.wrongPresses}` +
              (report.ghostPresses > 0 ? ` · 多余 ${report.ghostPresses}` : '')
            }
            valueClass="text-wrong"
            delay={180}
          />
        </div>

        {/* 问题音 */}
        {report.problemNotes.length > 0 && (
          <div className="mt-7">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-wrong shadow-[0_0_8px_var(--color-wrong)]" />
              需要重点练习的音
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.problemNotes.map(p => (
                <ProblemChip key={p.midi} name={p.name} issues={p.issues} count={p.count} />
              ))}
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <PrimaryButton onClick={onRetry} className="px-6 py-2.5">
            再练一次
          </PrimaryButton>
          <GhostButton onClick={onSelect} className="px-6 py-2.5">
            换一首
          </GhostButton>
        </div>
      </div>
    </Card>
  )
}