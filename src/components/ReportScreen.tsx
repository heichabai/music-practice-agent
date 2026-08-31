import type { SessionReport } from '../game/report'
import { TimingGauge } from './ui/TimingGauge'
import { ProblemChip } from './ui/ProblemChip'
import { PrimaryButton, GhostButton } from './ui/Button'

interface Props {
  report: SessionReport
  onRetry: () => void
  onSelect: () => void
}

/**
 * Apple 式报告：命中率巨型字（font-light）作 hero，下方三栏规格，
 * 再下方问题音 + pill 操作。无外框，凭留白与发丝线组织版面。
 */
export function ReportScreen({ report, onRetry, onSelect }: Props) {
  const holdPct =
    report.holdAvgRatio !== null ? Math.min(100, report.holdAvgRatio * 100) : null

  return (
    <div className="screen-enter w-full max-w-3xl pb-16">
      {/* Hero 命中率 */}
      <header className="pt-12 sm:pt-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Practice Report
        </p>
        <p className="mt-4 text-sm text-secondary">
          {report.songName} · {report.mode === 'wait' ? '等待式' : '自由式'} · {report.total} 音
        </p>
        <div className="mt-6 flex items-baseline gap-3">
          <span className="text-7xl font-light leading-none tracking-tight tabular-nums text-primary sm:text-8xl">
            {(report.accuracy * 100).toFixed(0)}
            <span className="text-secondary">%</span>
          </span>
        </div>
        <p className="mt-3 text-sm text-muted">
          命中率 · {report.hits} 命中 / {report.total} 总音
        </p>
      </header>

      <hr className="mt-16 border-border-subtle" />

      {/* 三栏规格 */}
      <section className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Timing
          </p>
          {report.timingAvgBeats !== null ? (
            <TimingGauge avg={report.timingAvgBeats} />
          ) : (
            <p className="mt-3 text-sm text-muted">
              等待式不统计节奏偏差。<br />
              试试自由式获得时序反馈。
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Hold
          </p>
          <p className="mt-3 text-3xl font-light tabular-nums text-primary sm:text-4xl">
            {holdPct !== null ? `${holdPct.toFixed(0)}` : '—'}
            {holdPct !== null && <span className="text-xl text-muted">%</span>}
          </p>
          <p className="mt-2 text-xs text-muted">
            时值保持
            {holdPct !== null && report.tooShortCount > 0
              ? ` · ${report.tooShortCount} 个偏短`
              : ''}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Issues
          </p>
          <p className="mt-3 text-3xl font-light tabular-nums text-primary sm:text-4xl">
            {report.misses + report.wrongPresses}
          </p>
          <p className="mt-2 text-xs text-muted">
            漏弹 {report.misses} · 错音 {report.wrongPresses}
            {report.ghostPresses > 0 ? ` · 多余 ${report.ghostPresses}` : ''}
          </p>
        </div>
      </section>

      {report.problemNotes.length > 0 && (
        <>
          <hr className="mt-12 border-border-subtle" />
          <section className="mt-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Focus on
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {report.problemNotes.map(p => (
                <ProblemChip key={p.midi} name={p.name} issues={p.issues} count={p.count} />
              ))}
            </div>
          </section>
        </>
      )}

      <hr className="mt-12 border-border-subtle" />

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <PrimaryButton onClick={onRetry}>再练一次</PrimaryButton>
        <GhostButton onClick={onSelect}>换一首</GhostButton>
      </div>
    </div>
  )
}
