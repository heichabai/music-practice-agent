export interface Note {
  midi: number
  time: number
  duration: number
  /** 指法编号 1-5（拇指=1 小指=5），undefined = 未知/不显示 */
  finger?: number
  /** 左右手标记，undefined = 未分配 */
  hand?: 'L' | 'R'
}

export interface Song {
  id: string
  name: string
  bpm: number
  /** 每小节拍数（四分音符为一拍），默认 4 */
  beatsPerBar?: number
  notes: Note[]
}

export type NoteState = 'pending' | 'active' | 'hit' | 'missed'

/** wait: 等待式（弹对才前进） free: 自由式（连续播放，按窗口判定） */
export type PracticeMode = 'wait' | 'free'
