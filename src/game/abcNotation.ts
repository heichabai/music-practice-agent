import type { Song } from '../types'

export interface AbcResult {
  abc: string
  /** 每个渲染出的音符元素（不含休止符）对应的起始拍，用于高亮同步 */
  noteBeats: number[]
}

const SHARP_NAMES = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B']

function midiToAbcPitch(midi: number): string {
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const name = SHARP_NAMES[pc]
  if (octave < 4) return name + ','.repeat(4 - octave)
  if (octave === 4) return name
  return name.toLowerCase() + "'".repeat(octave - 5)
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** 拍数（四分音符=1）转 ABC 时值后缀 */
function durationToAbc(dur: number): string {
  const num = Math.max(1, Math.round(dur * 4))
  if (num === 4) return ''
  if (num === 2) return '/'
  const g = gcd(num, 4)
  const n = num / g
  const d = 4 / g
  if (d === 1) return String(n)
  return n === 1 ? `/${d}` : `${n}/${d}`
}

/** Song 音符 → ABC 记谱（和弦合并、休止补齐、每 4 拍小节线） */
export function songToAbc(song: Song): AbcResult {
  const sorted = [...song.notes].sort((a, b) => a.time - b.time)

  const events = new Map<number, { midis: number[]; dur: number }>()
  for (const n of sorted) {
    const t = Math.round(n.time * 4) / 4
    const dur = Math.max(0.25, Math.round(n.duration * 4) / 4)
    const ev = events.get(t) ?? { midis: [], dur: Infinity }
    ev.midis.push(n.midi)
    ev.dur = Math.min(ev.dur, dur)
    events.set(t, ev)
  }

  const noteBeats: number[] = []
  let body = ''
  let pos = 0
  let lastBar = 0

  for (const t of [...events.keys()].sort((a, b) => a - b)) {
    if (t - pos >= 0.25) {
      const gap = Math.round((t - pos) * 4) / 4
      body += 'z' + durationToAbc(gap) + ' '
      pos = t
    }
    const ev = events.get(t)!
    const durAbc = durationToAbc(ev.dur)
    if (ev.midis.length === 1) {
      body += midiToAbcPitch(ev.midis[0]) + durAbc + ' '
    } else {
      const chord = [...ev.midis].sort((a, b) => a - b).map(midiToAbcPitch).join('')
      body += `[${chord}]${durAbc} `
    }
    noteBeats.push(t)
    pos = t + ev.dur

    const bar = Math.floor(pos / 4)
    if (bar > lastBar) {
      body += '| '
      lastBar = bar
      if (bar % 4 === 0) body += '\n'
    }
  }
  body += '|]'

  const name = song.name.replace(/[:\r\n]/g, ' ').trim() || '未命名'
  const abc = `X:1\nT:${name}\nM:4/4\nL:1/4\nQ:${song.bpm}\nK:C\n${body}\n`
  return { abc, noteBeats }
}
