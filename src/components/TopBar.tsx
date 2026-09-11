import { useMemo } from 'react'
import {
  FileArrowDown,
  Flame,
  Headphones,
  Keyboard,
  MusicNotes,
  Path,
  PianoKeys,
  Trophy,
  Wrench,
  type Icon,
} from '@phosphor-icons/react'
import {
  levelFromXp,
  levelName,
  xpToNextLevel,
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

const NAV: Array<{ key: NavKey; Icon: Icon; label: string }> = [
  { key: 'learn', Icon: Path, label: '学习路径' },
  { key: 'songs', Icon: MusicNotes, label: '曲库' },
  { key: 'freeplay', Icon: PianoKeys, label: '自由弹奏' },
  { key: 'import', Icon: FileArrowDown, label: '导入乐谱' },
  { key: 'progress', Icon: Trophy, label: '成长记录' },
]

/** 顶部导航栏：品牌 + 主导航 + 状态区（连续/等级/MIDI/开发者） */
export function TopBar({ active, onNav, gamification, midiLabel, midiOk, devMode, onToggleDev }: Props) {
  const level = levelFromXp(gamification.xp)
  const { progress } = useMemo(() => xpToNextLevel(gamification.xp), [gamification.xp])

  return (
    <header className="shrink-0 border-b border-border-subtle bg-base/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-6 px-6">
        {/* 品牌 */}
        <button onClick={() => onNav('learn')} className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-on-accent">
            <PianoKeys size={19} weight="fill" />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold tracking-tight text-primary">琴键陪练</span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-muted">Piano Agent</span>
          </span>
        </button>

        {/* 主导航 */}
        <nav className="flex h-16 items-stretch gap-0.5">
          {NAV.map(item => {
            const isActive = active === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNav(item.key)}
                className={`relative flex items-center gap-2 px-3.5 text-sm transition-colors ${
                  isActive ? 'text-primary' : 'text-secondary hover:text-primary'
                }`}
              >
                <item.Icon
                  size={16}
                  weight={isActive ? 'fill' : 'regular'}
                  className={isActive ? 'text-accent-strong' : ''}
                />
                <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>
                <span
                  className={`absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-accent transition-opacity duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* 状态区 */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            title={`连续打卡 ${gamification.streak} 天`}
            className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-raised/50 px-3 py-1.5 text-xs"
          >
            <Flame
              size={13}
              weight="fill"
              className={gamification.streak > 0 ? 'text-accent' : 'text-muted opacity-40'}
            />
            <span className="font-semibold tabular-nums text-primary">{gamification.streak}</span>
          </span>

          <span
            title={`Lv.${level} ${levelName(level)} / ${gamification.xp.toLocaleString()} XP`}
            className="flex items-center gap-2 rounded-full border border-border-subtle bg-raised/50 px-3 py-1.5 text-xs"
          >
            <span className="font-semibold text-accent-strong">Lv.{level}</span>
            <span className="h-1 w-12 overflow-hidden rounded-full bg-border-strong/50">
              <span
                className="block h-full rounded-full bg-gradient-accent transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </span>
          </span>

          <span
            title={midiLabel}
            className="grid h-8 w-8 place-items-center rounded-full border border-border-subtle bg-raised/50 text-muted"
          >
            {midiOk ? <Headphones size={14} /> : <Keyboard size={14} />}
          </span>

          <button
            onClick={onToggleDev}
            title={devMode ? '开发者模式已开启：全部课程已解锁' : '开启开发者模式（解锁全部课程）'}
            className={`grid h-8 w-8 place-items-center rounded-full border transition-all ${
              devMode
                ? 'border-accent/40 bg-accent/15 text-accent-strong'
                : 'border-border-subtle bg-raised/50 text-muted opacity-60 hover:opacity-100'
            }`}
          >
            <Wrench size={13} />
          </button>
        </div>
      </div>
    </header>
  )
}
