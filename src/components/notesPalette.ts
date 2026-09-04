/**
 * 音符配色：
 * - 有 hand 标记：右手蓝色系、左手橙色系（Simply Piano 风格双手区分）
 * - 无 hand 标记（自由弹奏/导入曲）：按音高着色（原粉彩方案）
 */

const RIGHT_HUE = 215 // 蓝
const LEFT_HUE = 28   // 橙

const PITCH_HUES: readonly number[] = [
  30, 50, 75, 100, 140, 175, 195, 215, 245, 280, 315, 345,
]

export function noteHue(midi: number, hand?: 'L' | 'R'): number {
  if (hand === 'R') return RIGHT_HUE
  if (hand === 'L') return LEFT_HUE
  return PITCH_HUES[((midi % 12) + 12) % 12]
}

export function noteHsl(midi: number, hand?: 'L' | 'R'): { h: number; s: number; l: number } {
  return { h: noteHue(midi, hand), s: 46, l: 81 }
}

/** DOM/canvas 通用：返回 hsla 字符串 */
export function noteRgba(midi: number, alpha = 1, hand?: 'L' | 'R'): string {
  const { h, s, l } = noteHsl(midi, hand)
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`
}

/** 音高对应的 RGB hex（适合 DOM 用） */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

export function noteHex(midi: number, hand?: 'L' | 'R'): string {
  const { h, s, l } = noteHsl(midi, hand)
  return hslToHex(h, s, l)
}
