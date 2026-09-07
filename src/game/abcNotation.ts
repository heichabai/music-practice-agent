import type { Note, Song } from '../types'

export interface AbcResult {
  abc: string
  /** 每个渲染出的音符元素（不含休止符）对应的起始拍，用于高亮同步。
   *  大谱表时先右手声部后左手声部（与 abcjs DOM 顺序一致）。 */
  noteBeats: number[]
  /** 每个声部的全部事件（音符 + 休止符）起始拍，DOM 顺序一致，用于大谱表逐拍对齐 */
  eventBeats: number[][]
  /** 是否大谱表（含左手声部） */
  grand: boolean
}

const SHARP_NAMES = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B']

/** 常用大调调号（教学曲目范围：≤4 个升降号）。
 *  diatonic = 调内音级集合；spell = 调号已含的变音 → 书写时只写字母（由 K: 调号呈现，不再画临时记号） */
const MAJOR_KEYS = [
  { name: 'C', diatonic: new Set([0, 2, 4, 5, 7, 9, 11]), spell: new Map<number, string>() },
  { name: 'G', diatonic: new Set([0, 2, 4, 6, 7, 9, 11]), spell: new Map([[6, 'F']]) },
  { name: 'D', diatonic: new Set([1, 2, 4, 6, 7, 9, 11]), spell: new Map([[1, 'C'], [6, 'F']]) },
  { name: 'A', diatonic: new Set([1, 2, 4, 6, 8, 9, 11]), spell: new Map([[1, 'C'], [6, 'F'], [8, 'G']]) },
  { name: 'E', diatonic: new Set([1, 3, 4, 6, 8, 9, 11]), spell: new Map([[1, 'C'], [3, 'D'], [6, 'F'], [8, 'G']]) },
  { name: 'F', diatonic: new Set([0, 2, 4, 5, 7, 9, 10]), spell: new Map([[10, 'B']]) },
  { name: 'Bb', diatonic: new Set([0, 2, 3, 5, 7, 9, 10]), spell: new Map([[3, 'E'], [10, 'B']]) },
  { name: 'Eb', diatonic: new Set([0, 2, 3, 5, 7, 8, 10]), spell: new Map([[3, 'E'], [8, 'A'], [10, 'B']]) },
]

type KeyChoice = (typeof MAJOR_KEYS)[number]

const TONIC_PC: Record<string, number> = {
  C: 0, G: 7, D: 2, A: 9, E: 4, F: 5, Bb: 10, Eb: 3,
}

/** 按时长加权选出"调外音最少"的调；并列时靠首/末音的主音归属裁决（旋律通常起于或收于主音） */
function detectKey(notes: Note[]): KeyChoice {
  let minPenalty = Infinity
  for (const k of MAJOR_KEYS) {
    let penalty = 0
    for (const n of notes) {
      const pc = ((n.midi % 12) + 12) % 12
      if (!k.diatonic.has(pc)) penalty += n.duration
    }
    if (penalty < minPenalty) minPenalty = penalty
  }
  const candidates = MAJOR_KEYS.filter(k => {
    let penalty = 0
    for (const n of notes) {
      const pc = ((n.midi % 12) + 12) % 12
      if (!k.diatonic.has(pc)) penalty += n.duration
    }
    return Math.abs(penalty - minPenalty) < 1e-9
  })
  if (candidates.length === 1) return candidates[0]

  // 并列裁决：末音（终止式）优先，其次首音
  const melody = [...notes].sort((a, b) => a.time - b.time)
  const pcs = (m: number) => ((m % 12) + 12) % 12
  const lastPc = pcs(melody[melody.length - 1]?.midi ?? 60)
  const firstPc = pcs(melody[0]?.midi ?? 60)
  for (const tonic of [lastPc, firstPc]) {
    const hit = candidates.find(k => TONIC_PC[k.name] === tonic)
    if (hit) return hit
  }
  return candidates[0]
}

function midiToAbcPitch(midi: number, key: KeyChoice): string {
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const name = key.spell.get(pc) ?? SHARP_NAMES[pc]
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

interface Tok {
  text: string
  start: number
  dur: number
  /** 带符尾（时值 < 1 拍），可参与连梁 */
  flagged: boolean
}

/** 单声部事件流 → ABC 正文。
 *  音值组合法：拍内同时值音符符尾相连（ABC 无空格=连梁），跨拍断开；
 *  跨小节的长音/长休止按小节拆分，音符用 - 连线；
 *  重叠事件（OMR 常见）钳位到当前位置，防止单小节超拍导致两声部小节线错位。 */
function buildVoiceBody(
  notes: Note[],
  key: KeyChoice,
  minTotal = 0,
): { body: string; noteBeats: number[]; eventBeats: number[]; total: number } {
  const events = new Map<number, VoiceEvent>()
  for (const n of [...notes].sort((a, b) => a.time - b.time)) {
    const t = Math.round(n.time * 4) / 4
    const dur = Math.max(0.25, Math.round(n.duration * 4) / 4)
    const ev = events.get(t) ?? { midis: [], dur: Infinity }
    ev.midis.push(n.midi)
    ev.dur = Math.min(ev.dur, dur)
    events.set(t, ev)
  }

  const toks: Tok[] = []
  let pos = 0

  /** 把一段从 start 开始、长 dur 的内容按小节线切片输出（音符片之间用 - 连线） */
  const emit = (text: string, start: number, dur: number, isNote: boolean) => {
    let cur = start
    let remaining = dur
    while (remaining > 0) {
      const inBar = cur % 4
      const toBar = inBar === 0 ? 4 : 4 - inBar
      const part = Math.min(remaining, Math.round(toBar * 4) / 4)
      toks.push({
        text: text + durationToAbc(part) + (isNote && remaining - part > 0 ? '-' : ''),
        start: cur,
        dur: part,
        flagged: part < 1,
      })
      remaining = Math.round((remaining - part) * 4) / 4
      cur += part
    }
  }

  for (const t of [...events.keys()].sort((a, b) => a - b)) {
    if (t - pos >= 0.25) {
      const gap = Math.round((t - pos) * 4) / 4
      emit('z', pos, gap, false)
      pos = t
    }
    const start = Math.max(t, pos) // 与前序事件重叠：钳到当前位置
    const ev = events.get(t)!
    const text =
      ev.midis.length === 1
        ? midiToAbcPitch(ev.midis[0], key)
        : `[${[...ev.midis].sort((a, b) => a - b).map(m => midiToAbcPitch(m, key)).join('')}]`
    emit(text, start, ev.dur, true)
    pos = start + ev.dur
  }
  // 末尾补休止到 minTotal（大谱表两声部等长）：必须走 emit 成为 token，
  // 否则渲染元素数与 eventBeats 数不一致，逐拍对齐器会整体跳过
  if (minTotal - pos >= 0.25) {
    emit('z', pos, Math.round((minTotal - pos) * 4) / 4, false)
    pos = minTotal
  }

  // 组装：拍内双符尾相连（不加空格），其余一律空格分隔
  let body = ''
  let lastBar = 0
  let prev: Tok | null = null
  let justBarred = false
  for (const tok of toks) {
    if (prev !== null) {
      const beam =
        !justBarred &&
        prev.flagged &&
        tok.flagged &&
        Math.floor(prev.start) === Math.floor(tok.start) &&
        !prev.text.startsWith('z') &&
        !tok.text.startsWith('z')
      body += beam ? '' : ' '
    }
    body += tok.text
    justBarred = false
    prev = tok
    const end = tok.start + tok.dur
    const bar = Math.floor(end / 4)
    if (bar > lastBar) {
      body += ' |'
      lastBar = bar
      justBarred = true
    }
  }
  const total = toks.length > 0 ? toks[toks.length - 1].start + toks[toks.length - 1].dur : 0
  // 按渲染元素（token）记录拍点：连线的每个片段都是独立音符元素，须各自对应
  const noteBeats = toks.filter(tk => !tk.text.startsWith('z')).map(tk => tk.start)
  const eventBeats = toks.map(tk => tk.start)
  return { body, noteBeats, eventBeats, total }
}

/** Song 音符 → ABC 记谱。
 *  含左手音时输出大谱表（高音谱表上手 + 低音谱表下手，%%score 分组），
 *  否则保持单高音谱表（与旧版渲染完全一致）。 */
export function songToAbc(song: Song): AbcResult {
  const sorted = [...song.notes].sort((a, b) => a.time - b.time)
  const left = sorted.filter(isLeftHand)
  const key = detectKey(sorted)

  // ---- 单声部：原路径 ----
  if (left.length === 0) {
    const r = buildVoiceBody(sorted, key)
    // 不输出曲名(T:)和速度(Q:)：谱面条场景下它们是竖向装饰行，浪费高度
    const abc = `X:1\nM:4/4\nL:1/4\nK:${key.name}\n${r.body}|]\n`
    return { abc: abc, noteBeats: r.noteBeats, eventBeats: [r.eventBeats], grand: false }
  }

  // ---- 大谱表：V:1 右手（高音谱号）+ V:2 左手（低音谱号） ----
  const right = sorted.filter(n => !isLeftHand(n))
  const total = Math.max(
    buildVoiceBody(right, key).total,
    buildVoiceBody(left, key).total,
  )
  const r = buildVoiceBody(right, key, total)
  const l = buildVoiceBody(left, key, total)

  const abc = [
    'X:1',
    'M:4/4',
    'L:1/4',
    'V:1 clef=treble',
    'V:2 clef=bass',
    `K:${key.name}`,
    '%%score {1 | 2}',
    `[V:1] ${r.body}|]`,
    `[V:2] ${l.body}|]`,
    '',
  ].join('\n')

  // abcjs 按声部顺序渲染：先 V:1 全部音符，后 V:2
  return {
    abc,
    noteBeats: [...r.noteBeats, ...l.noteBeats],
    eventBeats: [r.eventBeats, l.eventBeats],
    grand: true,
  }
}
