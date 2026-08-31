import type { SessionReport } from '../game/report'

interface Props {
  report: SessionReport
  onRetry: () => void
  onSelect: () => void
}

const TIMING_LABEL_ABS = 0.08

function timingLabel(avg: number | null): string {
  if (avg === null) return '—'
  if (avg < -TIMING_LABEL_ABS) return '偏抢拍'
  if (avg > TIMING_LABEL_ABS) return '偏拖拍'
  return '节奏稳定'
}

function TimingGauge({ avg }: { avg: number | null }) {
  if (avg === null) {
    return (
      <div className="rounded-lg bg-slate-800 p-4">
        <div className="text-2xl font-bold text-slate-400">—</div>
        <div className="mt-1 text-xs text-slate-400">等待式无节奏数据，试试自由式</div>
      </div>
    )
  }
  const clamped = Math.max(-0.4, Math.min(0.4, avg))
  const pos = 50 + (clamped / 0.4) * 50
  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <div className="text-2xl font-bold text-sky-400">{timingLabel(avg)}</div>
      <div className="relative mt-3 h-2 rounded-full bg-slate-700">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
        <div
          className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full bg-sky-400"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>抢拍</span>
        <span>拖拍</span>
      </div>
      <div className="mt-1 text-xs text-slate-400">
        平均偏差 {(avg * 1000 / 2).toFixed(0)}ms 级别
      </div>
    </div>
  )
}

export function ReportScreen({ report, onRetry, onSelect }: Props) {
  const holdPct =
    report.holdAvgRatio !== null ? Math.min(100, report.holdAvgRatio * 100) : null

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-8">
      <h2 className="text-center text-2xl font-bold">练习报告</h2>
      <p className="mt-1 text-center text-sm text-slate-400">
        {report.songName} · {report.mode === 'wait' ? '等待式' : '自由式'} · {report.total} 音
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-slate-800 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {(report.accuracy * 100).toFixed(0)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">命中率 {report.hits}/{report.total}</div>
        </div>
        <TimingGauge avg={report.timingAvgBeats} />
        <div className="rounded-lg bg-slate-800 p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {holdPct !== null ? `${holdPct.toFixed(0)}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            时值保持{holdPct !== null && report.tooShortCount > 0
              ? ` · ${report.tooShortCount} 个偏短`
              : ''}
          </div>
        </div>
        <div className="rounded-lg bg-slate-800 p-4 text-center">
          <div className="text-2xl font-bold text-red-400">
            {report.misses + report.wrongPresses}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            漏弹 {report.misses} · 错音 {report.wrongPresses}
            {report.ghostPresses > 0 ? ` · 多余 ${report.ghostPresses}` : ''}
          </div>
        </div>
      </div>

      {report.problemNotes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-300">需要重点练习的音</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {report.problemNotes.map(p => (
              <div
                key={p.midi}
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-sm"
              >
                <span className="font-semibold text-amber-300">{p.name}</span>
                <span className="ml-2 text-slate-300">{p.issues.join('、')}×{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={onRetry}
          className="rounded-lg bg-amber-500 px-5 py-2 font-medium text-slate-950 hover:bg-amber-400"
        >
          再练一次
        </button>
        <button
          onClick={onSelect}
          className="rounded-lg border border-slate-700 px-5 py-2 text-slate-300 hover:bg-slate-800"
        >
          换一首
        </button>
      </div>
    </div>
  )
}
