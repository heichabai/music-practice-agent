import { useMemo } from 'react'
import {
  Path,
  MusicNotes,
  PianoKeys,
  FileArrowDown,
  Trophy,
  Wrench,
  Headphones,
  Keyboard,
  Flame,
  type Icon,
} from '@phosphor-icons/react'
import {
  levelFromXp,
  levelName,
  xpToNextLevel,
  DAILY_NOTE_GOAL,
  type GamificationState,
} from '../game/gamification'

export type NavKey = 'learn' | 'songs' | 'freeplay' | 'import' | 'progress'

interface Props {
  /** null = 当前页面不属于任何导航项（如报告页） */
  active: NavKey | null
  onNav: (key: NavKey) => void
  gamification: GamificationState
  midiLabel: string
  midiOk: boolean
  devMode: boolean
  onToggleDev: () => void
}

const NAV: Array<{ key: NavKey; Icon: Icon; label: string; desc: string }> = [
  { key: 'learn', Icon: Path, label: '学习路径', desc: '26 课系统入门' },
  { key: 'songs', Icon: MusicNotes, label: '曲库', desc: '内置与导入曲目' },
  { key: 'freeplay', Icon: PianoKeys, label: '自由弹奏', desc: '无对错纯演奏' },
  { key: 'import', Icon: FileArrowDown, label: '导入乐谱', desc: 'OMR / MIDI' },
  { key: 'progress', Icon: Trophy, label: '成长记录', desc: '等级与成就' },
]

/** 左侧固定导航：品牌 + 页面切换 + 底部游戏化状态栏（深色演奏厅骨架） */
export function Sidebar({ active, onNav, gamification, midiLabel, midiOk, devMode, onToggleDev }: Props) {
  const level = levelFromXp(gamification.xp)
  const { progress } = useMemo(() => xpToNextLevel(gamification.xp), [gamification.xp])
  const goalPct = Math.min(1, gamification.todayNotes / DAILY_NOTE_GOAL)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border-subtle bg-surface/80 backdrop-blur-md">
      {/* 品牌 */}
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-on-accent">
          <PianoKeys size={19} weight="fill" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-primary">琴键陪练</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Piano Agent</p>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(item => {
          const isActive = active === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                isActive
                  ? 'bg-raised text-primary'
                  : 'text-secondary hover:bg-raised/60 hover:text-primary'
              }`}
            >
              {/* 激活指示条 */}
              <span
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-accent transition-all duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <item.Icon
                size={18}
                weight={isActive ? 'fill' : 'regular'}
                className={isActive ? 'text-accent-strong' : 'text-muted transition-colors group-hover:text-secondary'}
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
                <span className="block truncate text-[10px] text-muted">{item.desc}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* 底部：游戏化状态 */}
      <div className="mx-3 mb-3 rounded-xl border border-border-subtle bg-raised/60 p-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Flame
              size={14}
              weight="fill"
              className={gamification.streak > 0 ? 'text-accent' : 'text-muted opacity-40'}
            />
            <span className="text-sm font-bold tabular-nums text-accent-strong">
              {gamification.streak}
            </span>
            <span className="text-[10px] text-muted">天连续</span>
          </span>
          <span className="text-[10px] font-medium tabular-nums text-muted">
            {gamification.todayNotes}/{DAILY_NOTE_GOAL} 今日
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-xs font-medium text-primary">
            Lv.{level} {levelName(level)}
          </span>
          <span className="text-[10px] tabular-nums text-muted">
            {gamification.xp.toLocaleString()} XP
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-strong/50">
          <div
            className="h-full rounded-full bg-gradient-accent transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {/* 每日目标细环条 */}
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border-strong/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              goalPct >= 1 ? 'bg-hit' : 'bg-info/80'
            }`}
            style={{ width: `${goalPct * 100}%` }}
          />
        </div>
      </div>

      {/* MIDI / 开发者 */}
      <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
          {midiOk ? <Headphones size={13} /> : <Keyboard size={13} />}
          <span className="truncate">{midiLabel}</span>
        </span>
        <button
          onClick={onToggleDev}
          title={devMode ? '开发者模式已开启：全部课程已解锁' : '开启开发者模式（解锁全部课程）'}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all ${
            devMode
              ? 'bg-accent/20 text-accent-strong ring-1 ring-accent/50'
              : 'text-muted opacity-40 hover:opacity-80'
          }`}
        >
          <Wrench size={12} />
        </button>
      </div>
    </aside>
  )
}
