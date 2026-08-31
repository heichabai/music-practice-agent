import type { NoteState, Song } from '../types'

export interface HudSnapshot {
  hits: number
  errors: number
  total: number
  progress: number
  waiting: boolean
  finished: boolean
}

// 提前按下容忍窗口（拍）：小于此值的提前按下仍算命中
const EARLY_TOLERANCE = 0.5

/**
 * 等待式判定引擎：
 * 时间推进到下一个待弹音符时暂停等待，弹对才继续；
 * 等待期间弹错计一次错音。
 */
export class GameEngine {
  readonly song: Song
  readonly states: NoteState[]
  cursor = 0
  hits = 0
  errors = 0
  waiting = false
  finished = false
  songTime: number

  constructor(song: Song, leadInBeats = 2) {
    this.song = song
    this.states = song.notes.map(() => 'pending' as NoteState)
    this.songTime = -leadInBeats
  }

  /** 当前需要弹的一组音符（同拍和弦）在 notes 中的下标 */
  currentGroup(): number[] {
    const res: number[] = []
    if (this.cursor >= this.song.notes.length) return res
    const t = this.song.notes[this.cursor].time
    for (let i = this.cursor; i < this.song.notes.length && this.song.notes[i].time === t; i++) {
      if (this.states[i] !== 'hit') res.push(i)
    }
    return res
  }

  /** 等待命中时，需要按下的 midi 音高（用于键盘高亮） */
  targetMidis(): number[] {
    if (!this.waiting) return []
    return this.currentGroup().map(i => this.song.notes[i].midi)
  }

  /** 用户按下某个键 */
  press(midi: number): 'hit' | 'wrong' | 'ignored' {
    if (this.finished) return 'ignored'
    const group = this.currentGroup()
    if (group.length === 0) return 'ignored'
    const noteTime = this.song.notes[this.cursor].time
    const match = group.find(i => this.song.notes[i].midi === midi)
    if (match !== undefined) {
      // 弹对了但过早（音符还在下落）则忽略
      if (!this.waiting && this.songTime < noteTime - EARLY_TOLERANCE) return 'ignored'
      this.states[match] = 'hit'
      this.hits++
      while (this.cursor < this.song.notes.length && this.states[this.cursor] === 'hit') {
        this.cursor++
      }
      if (this.cursor >= this.song.notes.length) {
        this.finished = true
        this.waiting = false
      } else {
        this.syncWaiting()
      }
      return 'hit'
    }
    if (this.waiting) {
      this.errors++
      return 'wrong'
    }
    return 'ignored'
  }

  /** 推进时间（单位：拍）；到达下一个待弹音符时停下等待 */
  update(dtBeats: number): void {
    if (this.finished || this.waiting) return
    this.songTime += dtBeats
    this.syncWaiting()
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

  hud(): HudSnapshot {
    return {
      hits: this.hits,
      errors: this.errors,
      total: this.song.notes.length,
      progress: this.song.notes.length ? this.cursor / this.song.notes.length : 0,
      waiting: this.waiting,
      finished: this.finished,
    }
  }
}
