import { useCallback, useEffect, useState } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import type { ReactNode } from 'react'
import type { SessionReport } from '../game/report'
import { generatePracticePlan, generateReview, type PracticePlan } from '../ai/coach'
import { getHistoryBrief } from '../storage/sessionStore'
import { TimingGauge } from './ui/TimingGauge'
import { ProblemChip } from './ui/ProblemChip'
import { PrimaryButton, GhostButton } from './ui/Button'
import { IconSparkles } from './icons'

interface Props {
  report: SessionReport
  onRetry: () => void
  onSelect: () => void
}

type LoadState = 'loading' | 'done' | 'error'

function renderLite(text: string): ReactNode[] {
  return text
    .split('\n')
    .filter(line => line.trim() !== '')
    .map((line, i) => (
      <p key={i} className="mt-2 text-sm leading-relaxed text-secondary">
        {line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
          seg.startsWith('**') && seg.endsWith('**') ? (
            <strong key={j} className="font-medium text-primary">
              {seg.slice(2, -2)}
            </strong>
          ) : (
            seg
          ),
        )}
      </p>
    ))
}

function CoachPanel({ report }: { report: SessionReport }) {
  const [review, setReview] = useState<string | null>(null)
  const [reviewState, setReviewState] = useState<LoadState>('loading')
  const [plan, setPlan] = useState<PracticePlan | null>(null)
  const [planState, setPlanState] = useState<'idle' | LoadState>('idle')
  const [error, setError] = useState('')

  const loadReview = useCallback(async () => {
    setReviewState('loading')
    try {
      const brief = getHistoryBrief(report.songName)
      const text = await generateReview(report, brief)
      setReview(text)
      setReviewState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setReviewState('error')
    }
  }, [report])

  useEffect(() => {
    void loadReview()
  }, [loadReview])

  const loadPlan = async () => {
    setPlanState('loading')
    try {
      const brief = getHistoryBrief(report.songName)
      const p = await generatePracticePlan(report, brief)
      setPlan(p)
      setPlanState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPlanState('error')
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <IconSparkles className="h-4 w-4 text-accent" />
        <p className="text-micro font-medium uppercase text-muted">AI Coach</p>
      </div>

      {reviewState === 'loading' && (
        <p className="mt-4 animate-pulse text-sm text-muted">教练正在分析你的表现…</p>
      )}

      {reviewState === 'error' && (
        <div className="mt-4">
          <p className="text-sm text-wrong">{error}</p>
          <GhostButton className="mt-3" onClick={() => void loadReview()}>
            重试
          </GhostButton>
        </div>
      )}

      {reviewState === 'done' && review !== null && (
        <div className="mt-3 rounded-xl border border-border-subtle bg-surface px-5 py-4">
          {renderLite(review)}
        </div>
      )}

      {reviewState === 'done' && (
        <div className="mt-8 border-t border-border-subtle pt-6">
          {planState === 'idle' && (
            <GhostButton onClick={() => void loadPlan()}>生成练习计划</GhostButton>
          )}
          {planState === 'loading' && (
            <p className="animate-pulse text-sm text-muted">正在制定 10 分钟练习计划…</p>
          )}
          {planState === 'error' && (
            <div>
              <p className="text-sm text-wrong">{error}</p>
              <GhostButton className="mt-3" onClick={() => void loadPlan()}>
                重试
              </GhostButton>
            </div>
          )}
          {planState === 'done' && plan !== null && (
            <div>
              <p className="text-sm text-primary">{plan.focus}</p>
              <ol className="mt-4 space-y-4">
                {plan.steps.map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="w-14 shrink-0 pt-0.5 text-xs tabular-nums text-accent-strong">
                      {s.minutes} 分钟
                    </span>
                    <div>
                      <p className="text-sm font-medium text-primary">{s.name}</p>
                      <p className="mt-1 text-sm leading-relaxed text-secondary">
                        {s.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              {plan.tip && <p className="mt-4 text-sm text-muted">{plan.tip}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * Apple 式报告：命中率巨型字（font-light）作 hero，下方三栏规格，
 * 再下方问题音 + pill 操作。无外框，凭留白与发丝线组织版面。
 */
export function ReportScreen({ report, onRetry, onSelect }: Props) {
  const countUp = useCountUp(report.accuracy, 900)
  const holdPct =
    report.holdAvgRatio !== null ? Math.min(100, report.holdAvgRatio * 100) : null

  return (
    <div className="w-full">
      {/* Hero 命中率 */}
      <header className="pt-4">
        <p className="text-micro font-medium uppercase text-muted">
          Practice Report
        </p>
        <p className="mt-4 text-sm text-secondary">
          {report.songName} · {report.mode === 'wait' ? '等待式' : '自由式'} · {report.total} 音
        </p>
        <div className="mt-6 flex items-baseline gap-3">
          <span className="text-gradient-accent num-hero text-7xl leading-none tabular-nums sm:text-8xl">
            {countUp ? (countUp * 100).toFixed(0) : '0'}
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
          <p className="text-micro font-medium uppercase text-muted">
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
          <p className="text-micro font-medium uppercase text-muted">
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
          <p className="text-micro font-medium uppercase text-muted">
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
            <p className="text-micro font-medium uppercase text-muted">
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

      <CoachPanel report={report} />

      <hr className="mt-12 border-border-subtle" />

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <PrimaryButton onClick={onRetry}>再练一次</PrimaryButton>
        <GhostButton onClick={onSelect}>换一首</GhostButton>
      </div>
    </div>
  )
}
