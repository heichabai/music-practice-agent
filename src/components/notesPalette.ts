/**
 * 按音高生成柔和发光色（HSL）。
 * palette 起点 30° 避开纯红（红保留给 missed/wrong 语义）。
 * 高 lightness + 中低 saturation → 配合 canvas shadowBlur 做出
 * Embers 风格的"亮核 + bloom 泛光"质感（不刺眼）。
 */

const HUES: readonly number[] = [
  30,   // C   暖橙
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
  return hslToHex(h, 46, 81)
}

/** DOM/canvas 通用：返回 hsla 字符串 */
export function noteRgba(midi: number, alpha = 1): string {
  const h = noteHue(midi)
  const s = 46
  const l = 81
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`
}

/** DOM box-shadow 发光字符串（柔光） */
export function noteGlow(midi: number, blur = 18, alpha = 0.55): string {
  return `0 0 ${blur}px 0 ${noteRgba(midi, alpha)}`
}

/** canvas 用：拆出 h/s/l 用于构建渐变 */
export function noteHsl(midi: number): { h: number; s: number; l: number } {
  return { h: noteHue(midi), s: 46, l: 81 }
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