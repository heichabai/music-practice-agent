import { Flame, Keyboard, MusicNotes, Path, PianoKeys, Trophy, UploadSimple, Wrench, type Icon } from '@phosphor-icons/react'
import { levelFromXp, type GamificationState } from '../game/gamification'

export type NavKey = 'learn' | 'songs' | 'freeplay' | 'import' | 'progress'
interface Props {
  active: NavKey | null
  onNav: (key: NavKey) => void
  gamification: GamificationState
  midiLabel: string
  midiOk: boolean
  devMode: boolean
  onToggleDev: () => void
}
const NAV: Array<{ key: NavKey; icon: Icon; label: string }> = [
  { key: 'learn', icon: Path, label: '学习路径' },
  { key: 'songs', icon: MusicNotes, label: '曲库' },
  { key: 'freeplay', icon: PianoKeys, label: '自由弹奏' },
  { key: 'import', icon: UploadSimple, label: '导入乐谱' },
  { key: 'progress', icon: Trophy, label: '成长记录' },
]
export function TopBar({ active, onNav, gamification, midiLabel, midiOk, devMode, onToggleDev }: Props) {
  return (
    <header className="studio-navigation">
      <button className="studio-brand" onClick={() => onNav('learn')} aria-label="琴键陪练首页">
        <span className="brand-mark"><PianoKeys size={25} weight="light" /></span>
        <span><strong>琴键陪练<span className="brand-dot">.</span></strong><small>YOUR PIANO STUDIO</small></span>
      </button>
      <nav aria-label="主导航">{NAV.map(item => <button key={item.key} onClick={() => onNav(item.key)} aria-current={active === item.key ? 'page' : undefined}><item.icon size={18} weight={active === item.key ? 'fill' : 'regular'} /><span>{item.label}</span></button>)}</nav>
      <div className="nav-status">
        <span title={midiLabel} className="device-state"><span className={midiOk ? 'connected' : ''} /><Keyboard size={17} /><span>{midiOk ? 'MIDI 已连接' : '电脑键盘'}</span></span>
        <span className="streak-state" title={`连续打卡 ${gamification.streak} 天`}><Flame size={17} />{gamification.streak}</span>
        <span className="level-state" title={`${gamification.xp.toLocaleString()} XP`}>Lv.{levelFromXp(gamification.xp)}</span>
        <button className="dev-toggle" onClick={onToggleDev} aria-label={devMode ? '关闭开发者模式' : '开启开发者模式'} aria-pressed={devMode} title="开发者模式"><Wrench size={16} /></button>
      </div>
    </header>
  )
}
