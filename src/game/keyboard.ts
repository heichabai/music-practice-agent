const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const isBlack = (midi: number): boolean => BLACK_SEMITONES.has(midi % 12)

export const noteName = (midi: number): string =>
  `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`

/**
 * 键盘几何布局：下落音符与琴键共用同一套 x 坐标计算，保证纵向对齐。
 * 范围自动扩展到完整八度（lo 取 C，hi 取 B）。
 */
export class KeyboardLayout {
  readonly lo: number
  readonly hi: number
  readonly whiteCount: number

  constructor(lo: number, hi: number) {
    this.lo = Math.max(21, Math.floor(lo / 12) * 12)
    this.hi = Math.min(108, Math.floor(hi / 12) * 12 + 11)
    let count = 0
    for (let m = this.lo; m <= this.hi; m++) {
      if (!isBlack(m)) count++
    }
    this.whiteCount = count
  }

  static fromNotes(notes: Array<{ midi: number }>, pad = 2): KeyboardLayout {
    if (notes.length === 0) return new KeyboardLayout(60, 72)
    const lo = Math.min(...notes.map(n => n.midi)) - pad
    const hi = Math.max(...notes.map(n => n.midi)) + pad
    return new KeyboardLayout(lo, hi)
  }

  private whiteIndexBefore(midi: number): number {
    let count = 0
    for (let m = this.lo; m < midi; m++) {
      if (!isBlack(m)) count++
    }
    return count
  }

  /** 返回某 midi 音高在宽为 width 的画布上的位置与键宽 */
  geom(midi: number, width: number): { x: number; w: number; black: boolean } {
    const whiteWidth = width / this.whiteCount
    if (isBlack(midi)) {
      const w = whiteWidth * 0.62
      const boundary = this.whiteIndexBefore(midi)
      return { x: boundary * whiteWidth - w / 2, w, black: true }
    }
    const index = this.whiteIndexBefore(midi)
    return { x: index * whiteWidth, w: whiteWidth, black: false }
  }
}
