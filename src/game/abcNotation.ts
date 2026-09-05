import type { Note, Song } from '../types'

export interface AbcResult {
  abc: string
  /** 每个渲染出的音符元素（不含休止符）对应的起始拍，用于高亮同步。
   *  大谱表时先右手声部后左手声部（与 abcjs DOM 顺序一致）。 */
  noteBeats: number[]
  /** 是否大谱表（含左手声部） */
  grand: boolean
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

/** 左手判定：显式 hand 字段优先，否则中央 C 以下视为左手 */
const isLeftHand = (n: Note): boolean => (n.hand !== undefined ? n.hand === 'L' : n.midi < 60)

interface VoiceEvent {
  midis: number[]
  dur: number
}

/** 单声部事件流 → ABC 正文（和弦合并、休止补齐、每 4 拍小节线） */
function buildVoiceBody(notes: Note[]): { body: string; noteBeats: number[]; total: number } {
  const events = new Map<number, VoiceEvent>()
  for (const n of [...notes].sort((a, b) => a.time - b.time)) {
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
    }
  }
  return { body, noteBeats, total: pos }
}

/** Song 音符 → ABC 记谱。
 *  含左手音时输出大谱表（高音谱表上手 + 低音谱表下手，%%score 分组），
 *  否则保持单高音谱表（与旧版渲染完全一致）。 */
export function songToAbc(song: Song): AbcResult {
  const sorted = [...song.notes].sort((a, b) => a.time - b.time)
  const left = sorted.filter(isLeftHand)

  // ---- 单声部：原路径 ----
  if (left.length === 0) {
    const { body, noteBeats } = buildVoiceBody(sorted)
    // 不输出曲名(T:)和速度(Q:)：谱面条场景下它们是竖向装饰行，浪费高度
    const abc = `X:1\nM:4/4\nL:1/4\nK:C\n${body}|]\n`
    return { abc, noteBeats, grand: false }
  }

  // ---- 大谱表：V:1 右手（高音谱号）+ V:2 左手（低音谱号） ----
  const right = sorted.filter(n => !isLeftHand(n))
  const r = buildVoiceBody(right)
  const l = buildVoiceBody(left)

  // 两声部等长：短的末尾补休止，保证小节线对齐
  const total = Math.max(r.total, l.total)
  const padVoice = (v: { body: string; total: number }): string => {
    const diff = Math.round((total - v.total) * 4) / 4
    return diff >= 0.25 ? `${v.body}z${durationToAbc(diff)} ` : v.body
  }

  const abc = [
    'X:1',
    'M:4/4',
    'L:1/4',
    'V:1 clef=treble',
    'V:2 clef=bass',
    'K:C',
    '%%score {1 | 2}',
    `[V:1] ${padVoice(r)}|]`,
    `[V:2] ${padVoice(l)}|]`,
    '',
  ].join('\n')

  // abcjs 按声部顺序渲染：先 V:1 全部音符，后 V:2
  return { abc, noteBeats: [...r.noteBeats, ...l.noteBeats], grand: true }
}
