import {
  levelFromXp,
  levelName,
  xpToNextLevel,
  DAILY_NOTE_GOAL,
  type GamificationState,
} from '../game/gamification'

interface Props {
  gamification: GamificationState
}

const ICONS: Record<string, string> = {
  note: '🎵',
  lesson: '📖',
  graduation: '🎓',
  flame3: '🔥',
  flame7: '🔥',
  flame30: '🔥',
  target100: '🎯',
  target500: '🎯',
  target1000: '🎯',
  star: '⭐',
  diamond: '💎',
  import: '📥',
  mic: '🎤',
  rhythm: '🥁',
  bolt: '⚡',
  sunrise: '🌅',
  moon: '🌙',
  trophy: '🏆',
  chat: '💬',
  crown: '👑',
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-raised/60 px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-primary">{value}</p>
      {hint !== undefined && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

/** 成长记录页：等级 / 数据 / 成就墙 */
export function ProgressScreen({ gamification }: Props) {
  const level = levelFromXp(gamification.xp)
  const { current, next, progress } = xpToNextLevel(gamification.xp)
  const unlocked = gamification.achievements.filter(a => a.unlockedAt !== null).length
  const total = gamification.achievements.length
  const goalPct = Math.min(1, gamification.todayNotes / DAILY_NOTE_GOAL)

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-10">
      <header>
        <p className="text-micro font-medium uppercase tracking-[0.2em] text-muted">Progress</p>
        <h1 className="mt-1.5 text-h1 font-bold tracking-tight text-primary">成长记录</h1>
        <p className="mt-1.5 text-sm text-secondary">
          等级、练习数据与成就徽章，都记录在这里
        </p>
      </header>

      {/* 等级卡 */}
      <section className="glass mt-8 overflow-hidden rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-accent text-3xl font-black text-on-accent shadow-[0_8px_28px_rgb(242_178_52/0.4)]">
            {level}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <span className="text-h3 font-bold text-primary">Lv.{level} {levelName(level)}</span>
              <span className="text-caption tabular-nums text-muted">
                {gamification.xp.toLocaleString()} XP
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-border-strong/50">
              <div
                className="h-full rounded-full bg-gradient-accent shadow-[0_0_10px_rgb(242_178_52/0.5)] transition-all duration-700"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-caption text-muted">
              距离下一级还差 {(next - gamification.xp).toLocaleString()} XP（{current.toLocaleString()} / {next.toLocaleString()}）
            </p>
          </div>
        </div>
      </section>

      {/* 数据概览 */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="连续打卡" value={`${gamification.streak} 天`} hint={gamification.streak > 0 ? '保持住！' : '今天开始'} />
        <StatCard label="累计命中" value={gamification.totalNotes.toLocaleString()} hint="个音符" />
        <StatCard label="练习次数" value={gamification.totalSessions.toLocaleString()} hint="次会话" />
        <StatCard
          label="今日目标"
          value={`${gamification.todayNotes}/${DAILY_NOTE_GOAL}`}
          hint={goalPct >= 1 ? '已完成 ✓' : `${Math.round(goalPct * 100)}%`}
        />
      </section>

      {/* 成就墙 */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-h3 font-semibold text-primary">成就徽章</h2>
          <span className="text-caption tabular-nums text-muted">
            已解锁 {unlocked} / {total}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gamification.achievements.map(a => {
            const on = a.unlockedAt !== null
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
                  on
                    ? 'border-accent/40 bg-accent-dim/20'
                    : 'border-border-subtle bg-raised/40 opacity-60'
                }`}
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl ${
                    on
                      ? 'bg-accent/20 shadow-[0_0_14px_rgb(242_178_52/0.3)]'
                      : 'bg-border-strong/30 grayscale'
                  }`}
                >
                  {ICONS[a.icon] ?? '🏅'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-body font-medium ${on ? 'text-primary' : 'text-secondary'}`}>
                    {a.name}
                  </p>
                  <p className="truncate text-caption text-muted">{a.description}</p>
                  {on && (
                    <p className="mt-0.5 text-[10px] tabular-nums text-accent-strong">
                      {new Date(a.unlockedAt as number).toLocaleDateString('zh-CN')} 解锁
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
