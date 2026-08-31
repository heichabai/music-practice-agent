/**
 * 按音高生成霓虹色（HSL）。palette 起点 30° 避开纯红，
 * 让红保留给 "missed" / "wrong" 语义（命中、转漏弹仍用红）。
 * 每跨八度亮度微调，增加深度感。
 */

const HUES: readonly number[] = [
  30,   // C   橙
  50,   // C#  琥珀黄
  75,   // D   黄绿
  100,  // D#  青柠
  140,  // E   翠绿
  175,  // F   青
  195,  // F#  浅蓝
  215,  // G   蓝
  245,  // G#  紫蓝
  280,  // A   紫
  315,  // A#  品红
  345,  // B   玫红
]

export function noteHue(midi: number): number {
  return HUES[((midi % 12) + 12) % 12]
}

/** 音高对应的 RGB hex（适合 DOM 用） */
export function noteHex(midi: number): string {
  const h = noteHue(midi)
  const s = 90
  const l = 60
  return hslToHex(h, s, l)
}

export function noteRgba(midi: number, alpha = 1): string {
  const h = noteHue(midi)
  const s = 90
  // 八度越高亮度越高一点（C4≈55%，每+12 增 3%）
  const octave = Math.floor(midi / 12) - 4
  const l = Math.min(72, 55 + octave * 3)
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`
}

/** DOM 用 box-shadow 的发光字符串 */
export function noteGlow(midi: number, blur = 18, alpha = 0.7): string {
  return `0 0 ${blur}px 2px ${noteRgba(midi, alpha)}`
}

/** 用于 canvas 内部：将颜色拆成 hsl+alpha，便于做线性渐变 */
export function noteHsl(midi: number): { h: number; s: number; l: number } {
  const h = noteHue(midi)
  const octave = Math.floor(midi / 12) - 4
  const l = Math.min(72, 55 + octave * 3)
  return { h, s: 90, l }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}