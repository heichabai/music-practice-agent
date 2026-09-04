import type { NoteState, PracticeMode, Song } from '../types'

export interface HudSnapshot {
  hits: number
  errors: number
  misses: number
  total: number
  progress: number
  waiting: boolean
  finished: boolean
}

export interface NoteJudgement {
  verdict: 'hit' | 'missed' | null
  /** 命中时刻与理想时刻的偏差（拍），负=抢拍；等待式为 null */
  offsetBeats: number | null
  /** 实际按住时值 / 期望时值 */
  holdRatio: number | null
}

interface HeldNote {
  index: number
  hitAtPerfMs: number
}

// 等待式：提前按下容忍窗口（拍）
const EARLY_TOLERANCE = 0.5
// 自由式：命中判定窗口（拍）
export const HIT_WINDOW = 0.75

export class GameEngine {
  readonly song: Song
  readonly mode: PracticeMode
  readonly states: NoteState[]
  readonly judgements: NoteJudgement[]
  hits = 0
  errors = 0
  ghostPresses = 0
  waiting = false
  finished = false
  songTime: number
  cursor = 0
  /** 弹错时目标音的累计次数（用于报告定位问题音符） */
  readonly wrongAttempts = new Map<number, number>()

  private held = new Map<number, HeldNote>()

  constructor(song: Song, mode: PracticeMode = 'wait', leadInBeats = 2) {
    this.song = song.notes.length > 0 ? song : { ...song, notes: [{ midi: 60, time: 0, duration: 1 }] }
    this.mode = mode
    this.states = this.song.notes.map(() => 'pending' as NoteState)
    this.judgements = this.song.notes.map(() => ({
      verdict: null,
      offsetBeats: null,
      holdRatio: null,
    }))
    this.songTime = -leadInBeats
  }

  /** 当前需要弹的一组音符（同拍和弦）在 notes 中的下标（等待式） */
  currentGroup(): number[] {
    const res: number[] = []
    if (this.cursor >= this.song.notes.length) return res
    const t = this.song.notes[this.cursor].time
    for (let i = this.cursor; i < this.song.notes.length && this.song.notes[i].time === t; i++) {
      if (this.states[i] !== 'hit') res.push(i)
    }
    return res
  }

  /** 键盘上应高亮的目标音 */
  targetMidis(): number[] {
    if (this.mode === 'wait') {
      if (!this.waiting) return []
      return this.currentGroup().map(i => this.song.notes[i].midi)
    }
    return this.song.notes
      .filter(
        (n, i) =>
          (this.states[i] === 'pending' || this.states[i] === 'active') &&
          Math.abs(this.songTime - n.time) <= HIT_WINDOW,
      )
      .map(n => n.midi)
  }

  press(midi: number): 'hit' | 'wrong' | 'ignored' {
    if (this.finished) return 'ignored'
    return this.mode === 'wait' ? this.pressWait(midi) : this.pressFree(midi)
  }

  /** 松开琴键：结算时值 */
  release(midi: number): void {
    const info = this.held.get(midi)
    if (!info) return
    this.finalizeHold(info)
    this.held.delete(midi)
  }

  /** 推进时间（单位：拍） */
  update(dtBeats: number): void {
    if (this.finished) return
    if (this.mode === 'wait' && this.waiting) return
    this.songTime += dtBeats

    if (this.mode === 'wait') {
      this.syncWaiting()
      if (this.cursor >= this.song.notes.length) this.finishAll()
      return
    }

    for (let i = 0; i < this.song.notes.length; i++) {
      const state = this.states[i]
      if (state !== 'pending' && state !== 'active') continue
      const offset = this.songTime - this.song.notes[i].time
      if (state === 'pending' && Math.abs(offset) <= HIT_WINDOW) {
        this.states[i] = 'active'
      } else if (offset > HIT_WINDOW) {
        this.states[i] = 'missed'
        this.judgements[i].verdict = 'missed'
      }
    }

    const last = this.song.notes[this.song.notes.length - 1]
    if (last && this.songTime > last.time + last.duration + 1.5) {
      this.finishAll()
    }
  }

  hud(): HudSnapshot {
    let misses = 0
    for (const j of this.judgements) {
      if (j.verdict === 'missed') misses++
    }
    const progress =
      this.mode === 'wait'
        ? this.song.notes.length
          ? this.cursor / this.song.notes.length
          : 0
        : this.song.notes.length
          ? (this.hits + misses) / this.song.notes.length
          : 0
    return {
      hits: this.hits,
      errors: this.errors,
      misses,
      total: this.song.notes.length,
      progress,
      waiting: this.waiting,
      finished: this.finished,
    }
  }

  private pressWait(midi: number): 'hit' | 'wrong' | 'ignored' {
    const group = this.currentGroup()
    if (group.length === 0) return 'ignored'
    const noteTime = this.song.notes[this.cursor].time
    const match = group.find(i => this.song.notes[i].midi === midi)
    if (match !== undefined) {
      if (!this.waiting && this.songTime < noteTime - EARLY_TOLERANCE) return 'ignored'
      this.markHit(match, null)
      while (this.cursor < this.song.notes.length && this.states[this.cursor] === 'hit') {
        this.cursor++
      }
      if (this.cursor >= this.song.notes.length) {
        this.finishAll()
      } else {
        this.syncWaiting()
      }
      return 'hit'
    }
    if (this.waiting) {
      this.errors++
      for (const i of group) this.recordWrongAttempt(this.song.notes[i].midi)
      return 'wrong'
    }
    return 'ignored'
  }

  private pressFree(midi: number): 'hit' | 'wrong' | 'ignored' {
    let best = -1
    let bestAbs = Infinity
    let anyInWindow = false
    for (let i = 0; i < this.song.notes.length; i++) {
      const state = this.states[i]
      if (state !== 'pending' && state !== 'active') continue
      const note = this.song.notes[i]
      const offset = this.songTime - note.time
      if (Math.abs(offset) > HIT_WINDOW) continue
      anyInWindow = true
      if (note.midi === midi && Math.abs(offset) < bestAbs) {
        bestAbs = Math.abs(offset)
        best = i
      }
    }
    if (best >= 0) {
      this.markHit(best, this.songTime - this.song.notes[best].time)
      return 'hit'
    }
    if (anyInWindow) {
      this.errors++
      for (let i = 0; i < this.song.notes.length; i++) {
        const state = this.states[i]
        if (state !== 'pending' && state !== 'active') continue
        const note = this.song.notes[i]
        if (Math.abs(this.songTime - note.time) <= HIT_WINDOW) {
          this.recordWrongAttempt(note.midi)
        }
      }
      return 'wrong'
    }
    this.ghostPresses++
    return 'wrong'
  }

  private markHit(index: number, offsetBeats: number | null): void {
    const note = this.song.notes[index]
    const prev = this.held.get(note.midi)
    if (prev) this.finalizeHold(prev)
    this.states[index] = 'hit'
    this.judgements[index].verdict = 'hit'
    this.judgements[index].offsetBeats = offsetBeats
    this.hits++
    this.held.set(note.midi, { index, hitAtPerfMs: performance.now() })
  }

  private finalizeHold(info: HeldNote): void {
    const note = this.song.notes[info.index]
    const heldBeats = ((performance.now() - info.hitAtPerfMs) / 1000) * (this.song.bpm / 60)
    const ratio = Math.max(0, heldBeats / Math.max(0.25, note.duration))
    this.judgements[info.index].holdRatio = Math.min(2.5, ratio)
  }

  private recordWrongAttempt(midi: number): void {
    this.wrongAttempts.set(midi, (this.wrongAttempts.get(midi) ?? 0) + 1)
  }

  private syncWaiting(): void {
    if (this.finished) return
    const next = this.song.notes[this.cursor]
    if (next && this.songTime >= next.time) {
      this.songTime = next.time
      this.waiting = true
      for (const i of this.currentGroup()) this.states[i] = 'active'
    } else {
      this.waiting = false
    }
  }

  private finishAll(): void {
    for (const info of this.held.values()) this.finalizeHold(info)
    this.held.clear()
    if (this.mode === 'free') {
      for (let i = 0; i < this.song.notes.length; i++) {
        if (this.states[i] === 'pending' || this.states[i] === 'active') {
          this.states[i] = 'missed'
          this.judgements[i].verdict = 'missed'
        }
      }
    }
    this.finished = true
    this.waiting = false
  }
}
