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

/** 多声部曲：交替写入右手/左手音符，时间各自累积 */
function hands(right: Array<[number, number]>, left: Array<[number, number]>, leftBase = 48): Note[] {
  const rh = withFingering(seq(right))
  const lh = seq(left).map(n => {
    const offset = n.midi - leftBase
    return {
      ...n,
      midi: n.midi,
      hand: 'L' as const,
      finger: offset >= 0 && offset <= 4 ? 5 - offset : undefined,
    }
  })
  // 合并并排序
  return [...rh, ...lh].sort((a, b) => a.time - b.time)
}

const C4 = 60
const D4 = 62
const E4 = 64
const F4 = 65
const G4 = 67
const A4 = 69
const C3 = 48
const D3 = 50
const E3 = 52
const F3 = 53
const G3 = 55

export const SONGS: Song[] = [
  // ===== UNIT 1: 热身 =====
  {
    id: 'warmup',
    name: '热身 · 五指练习',
    bpm: 80,
    notes: withFingering(seq([
      [C4, 1], [D4, 1], [E4, 1], [F4, 1], [G4, 1],
      [F4, 1], [E4, 1], [D4, 1], [C4, 2],
    ])),
  },
  // ===== UNIT 3: 右手旋律 =====
  {
    id: 'mini-cde',
    name: '三音小曲',
    bpm: 80,
    notes: withFingering(seq([
      [C4, 1], [D4, 1], [E4, 1],
      [E4, 1], [D4, 1], [C4, 1],
      [D4, 2], [E4, 1], [D4, 1], [C4, 2],
    ])),
  },
  {
    id: 'mini-five',
    name: '五音下行',
    bpm: 80,
    notes: withFingering(seq([
      [G4, 1], [F4, 1], [E4, 1], [D4, 1], [C4, 1],
      [C4, 1], [D4, 1], [E4, 1], [F4, 1], [G4, 2],
      [G4, 1], [F4, 1], [E4, 1], [D4, 1], [C4, 2],
    ])),
  },
  {
    id: 'mary',
    name: '玛丽的小羊',
    bpm: 90,
    notes: withFingering(seq([
      [E4, 1], [D4, 1], [C4, 1], [D4, 1], [E4, 1], [E4, 1], [E4, 2],
      [D4, 1], [D4, 1], [D4, 2], [E4, 1], [G4, 1], [G4, 2],
      [E4, 1], [D4, 1], [C4, 1], [D4, 1], [E4, 1], [E4, 1], [E4, 1], [E4, 1],
      [D4, 1], [D4, 1], [E4, 1], [D4, 1], [C4, 4],
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
  // ===== UNIT 4: 节奏进阶 =====
  {
    id: 'eighth-ex',
    name: '八分音符练习曲',
    bpm: 100,
    notes: withFingering(seq([
      [C4, 0.5], [D4, 0.5], [E4, 0.5], [D4, 0.5], [C4, 0.5], [D4, 0.5], [E4, 1],
      [E4, 0.5], [F4, 0.5], [G4, 0.5], [F4, 0.5], [E4, 0.5], [F4, 0.5], [G4, 1],
      [G4, 0.5], [A4, 0.5], [G4, 0.5], [F4, 0.5], [E4, 0.5], [D4, 0.5], [C4, 2],
    ])),
  },
  // ===== UNIT 5: 左手与双手 =====
  {
    id: 'hands-unison',
    name: '双手齐奏入门',
    bpm: 72,
    notes: hands(
      [
        [C4, 1], [D4, 1], [E4, 1], [F4, 1], [G4, 2],
        [F4, 1], [E4, 1], [D4, 1], [C4, 3],
      ],
      [
        [C3, 1], [D3, 1], [E3, 1], [F3, 1], [G3, 2],
        [F3, 1], [E3, 1], [D3, 1], [C3, 3],
      ],
    ),
  },
  {
    id: 'chord-c',
    name: 'C 和弦练习',
    bpm: 80,
    notes: [
      // C-E-G 同时按下，保持 2 拍，重复 4 次
      ...Array.from({ length: 4 }, (_, i) => [
        { midi: 60, time: i * 3, duration: 2, finger: 1, hand: 'R' as const },
        { midi: 64, time: i * 3, duration: 2, finger: 3, hand: 'R' as const },
        { midi: 67, time: i * 3, duration: 2, finger: 5, hand: 'R' as const },
      ]).flat(),
    ],
  },
  {
    id: 'chord-prog',
    name: '和弦进行 · C-F-G-C',
    bpm: 80,
    notes: [
      // C 和弦 (C-E-G)
      { midi: 60, time: 0, duration: 2, finger: 1, hand: 'R' as const },
      { midi: 64, time: 0, duration: 2, finger: 3, hand: 'R' as const },
      { midi: 67, time: 0, duration: 2, finger: 5, hand: 'R' as const },
      // F 和弦 (F-A-C)
      { midi: 65, time: 3, duration: 2, finger: 4, hand: 'R' as const },
      { midi: 69, time: 3, duration: 2, finger: 2, hand: 'R' as const },
      { midi: 72, time: 3, duration: 2, finger: 1, hand: 'R' as const },
      // G 和弦 (G-B-D)
      { midi: 67, time: 6, duration: 2, finger: 5, hand: 'R' as const },
      { midi: 71, time: 6, duration: 2, finger: 3, hand: 'R' as const },
      { midi: 74, time: 6, duration: 2, finger: 1, hand: 'R' as const },
      // C 和弦
      { midi: 60, time: 9, duration: 3, finger: 1, hand: 'R' as const },
      { midi: 64, time: 9, duration: 3, finger: 3, hand: 'R' as const },
      { midi: 67, time: 9, duration: 3, finger: 5, hand: 'R' as const },
    ],
  },
  {
    id: 'hands-melody',
    name: '双手练习曲',
    bpm: 70,
    notes: hands(
      // 右手：简单旋律
      [
        [C4, 1], [E4, 1], [G4, 1], [E4, 1], [F4, 1], [D4, 1], [C4, 2],
        [D4, 1], [F4, 1], [A4, 1], [F4, 1], [G4, 1], [E4, 1], [C4, 2],
      ],
      // 左手：根音
      [
        [C3, 2], [C3, 2], [F3, 2], [C3, 2],
        [G3, 2], [G3, 2], [C3, 2], [C3, 2],
      ],
    ),
  },
]
