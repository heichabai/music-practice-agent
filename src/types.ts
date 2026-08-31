export interface Note {
  midi: number
  time: number
  duration: number
}

export interface Song {
  id: string
  name: string
  bpm: number
  notes: Note[]
}

export type NoteState = 'pending' | 'active' | 'hit' | 'missed'

/** wait: 等待式（弹对才前进） free: 自由式（连续播放，按窗口判定） */
export type PracticeMode = 'wait' | 'free'
