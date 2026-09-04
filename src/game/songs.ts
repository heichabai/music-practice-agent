import type { Note, Song } from '../types'

// [midi, 时值(拍)] 序列，起始时间自动累积
function seq(steps: Array<[number, number]>): Note[] {
  let t = 0
  return steps.map(([midi, duration]) => {
    const note: Note = { midi, time: t, duration }
    t += duration
    return note
  })
}

/** 右手五指位（C4-G4）自动推导指法：1=拇指C4 2=食指D4 3=中指E4 4=无名指F4 5=小指G4 */
function withFingering(notes: Note[], baseMidi = 60): Note[] {
  return notes.map(n => {
    const offset = n.midi - baseMidi
    if (offset >= 0 && offset <= 4) {
      return { ...n, finger: offset + 1, hand: 'R' as const }
    }
    return { ...n, hand: n.midi < 60 ? ('L' as const) : ('R' as const) }
  })
}

const C4 = 60
const D4 = 62
const E4 = 64
const F4 = 65
const G4 = 67
const A4 = 69

export const SONGS: Song[] = [
  {
    id: 'warmup',
    name: '热身 · 五指练习',
    bpm: 80,
    notes: withFingering(seq([
      [C4, 1], [D4, 1], [E4, 1], [F4, 1], [G4, 1],
      [F4, 1], [E4, 1], [D4, 1], [C4, 2],
    ])),
  },
  {
    id: 'twinkle',
    name: '小星星',
    bpm: 96,
    notes: withFingering(seq([
      [C4, 1], [C4, 1], [G4, 1], [G4, 1], [A4, 1], [A4, 1], [G4, 2],
      [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 1], [D4, 1], [C4, 2],
      [C4, 1], [C4, 1], [G4, 1], [G4, 1], [A4, 1], [A4, 1], [G4, 2],
      [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 1], [D4, 1], [C4, 2],
    ])),
  },
  {
    id: 'ode',
    name: '欢乐颂',
    bpm: 104,
    notes: withFingering(seq([
      [E4, 1], [E4, 1], [F4, 1], [G4, 1], [G4, 1], [F4, 1], [E4, 1], [D4, 1],
      [C4, 1], [C4, 1], [D4, 1], [E4, 1], [E4, 1.5], [D4, 0.5], [D4, 2],
      [E4, 1], [E4, 1], [F4, 1], [G4, 1], [G4, 1], [F4, 1], [E4, 1], [D4, 1],
      [C4, 1], [C4, 1], [D4, 1], [E4, 1], [D4, 1.5], [C4, 0.5], [C4, 2],
    ])),
  },
]
