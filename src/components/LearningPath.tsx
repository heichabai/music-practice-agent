import { ArrowUpRight, Check, LockSimple, Play, PianoKeys, MusicNotes, Hand, Metronome, HandsClapping } from '@phosphor-icons/react'
import type { Lesson } from '../game/lessons'
import { UNITS } from '../game/lessons'
import { getTutorialProgress, isDevMode } from '../storage/tutorialStore'

interface Props { lessons: Lesson[]; onOpenLesson: (lesson: Lesson) => void }
const UNIT_ICONS = [PianoKeys, MusicNotes, Hand, Metronome, HandsClapping]
const UNIT_DESCRIPTIONS = ['从一个音开始，认识你的钢琴。', '把纸上的音符，变成指尖的音乐。', '让熟悉的旋律，第一次从指间流出。', '找到音乐的脉搏，弹得从容而准确。', '让旋律与伴奏，在双手之间相遇。']

export function LearningPath({ lessons, onOpenLesson }: Props) {
  const dev = isDevMode()
  const completed = getTutorialProgress().completed
  const next = lessons.findIndex(l => !completed.includes(l.id))
  const current = next === -1 ? lessons.length : next
  return (
    <div className="curriculum">
      <div className="section-heading"><div><p className="eyebrow">YOUR CURRICULUM</p><h2>一步一步，弹出自己的音乐</h2></div><span>5 个单元 · {lessons.length} 节课</span></div>
      {UNITS.map((unit, index) => {
        const items = lessons.filter(l => l.unit === unit.id)
        const done = items.filter(l => completed.includes(l.id)).length
        const UnitIcon = UNIT_ICONS[index] ?? PianoKeys
        return (
          <section className="unit-card" key={unit.id}>
            <div className={`unit-intro unit-tint-${index}`}>
              <span className="eyebrow">UNIT {String(unit.id).padStart(2, '0')}</span>
              <UnitIcon className="unit-illustration" size={54} weight="thin" aria-hidden="true" />
              <h3>{unit.title.split('·')[1]?.trim() ?? unit.title}</h3>
              <p>{UNIT_DESCRIPTIONS[index]}</p>
              <div className="unit-progress"><span style={{ width: `${done / items.length * 100}%` }} /></div>
              <span className="unit-count">{done} / {items.length} 已完成</span>
            </div>
            <div className="lesson-list">
              {items.map(lesson => {
                const done = completed.includes(lesson.id)
                const active = lessons.indexOf(lesson) === current
                const locked = !done && !dev && lessons.indexOf(lesson) > current
                return (
                  <button className={`lesson-row ${active ? 'is-current' : ''}`} key={lesson.id} disabled={locked} onClick={() => onOpenLesson(lesson)} aria-current={active ? 'step' : undefined}>
                    <span className={`lesson-status ${done ? 'is-done' : ''}`}>
                      {done ? <Check size={16} weight="bold" /> : locked ? <LockSimple size={15} /> : <span>{String(lesson.order).padStart(2, '0')}</span>}
                    </span>
                    <span className="lesson-copy"><strong>{lesson.title}</strong><small>{lesson.subtitle}</small></span>
                    <span className="lesson-action">{active ? <><span>开始学习</span><Play size={14} weight="fill" /></> : done ? <><span>复习</span><ArrowUpRight size={17} /></> : locked ? <span>待解锁</span> : <ArrowUpRight size={17} />}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
