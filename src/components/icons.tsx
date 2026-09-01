import type { CSSProperties } from 'react'

interface IconProps {
  className?: string
  style?: CSSProperties
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** 四点星光 · AI 能力 */
export function IconSparkles({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden {...strokeProps}>
      <path d="M12 4l1.8 4.9 4.7 1.6-4.7 1.7L12 16l-1.8-4.8L5.5 9.5l4.7-1.6L12 4z" />
      <path
        d="M18.6 15.4l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1z"
        strokeWidth={1.3}
      />
    </svg>
  )
}

/** 图片 · 乐谱图片识别 */
export function IconImage({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden {...strokeProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20 15.5l-4.5-4.5-8.5 8" />
    </svg>
  )
}

/** MIDI 键盘 · MIDI 直传 */
export function IconMidiKeys({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden {...strokeProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M8.5 4.5v9M12 4.5v9M15.5 4.5v9" />
    </svg>
  )
}

/** 取景框 · 本地 OMR 精确识别 */
export function IconScanFrame({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden {...strokeProps}>
      <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
      <path d="M6.5 9.5h11M6.5 13h11" strokeWidth={1.4} />
    </svg>
  )
}

/** 双音符 · 曲目 */
export function IconMusicNote({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden {...strokeProps}>
      <path d="M9.5 17.5V6.5l10-2.5V15" />
      <circle cx="7" cy="17.5" r="2.6" />
      <circle cx="17" cy="15" r="2.6" />
    </svg>
  )
}

/** 右箭头 · 列表行引导 */
export function IconChevronRight({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden {...strokeProps}>
      <path d="M9.5 6.5l5.5 5.5-5.5 5.5" />
    </svg>
  )
}

/** 垃圾桶 · 删除 */
export function IconTrash({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden {...strokeProps}>
      <path d="M4.5 7h15M10 11v5.5M14 11v5.5M6.5 7l.8 12.2a1 1 0 001 .8h7.4a1 1 0 001-.8L17.5 7M9.5 7V5.2a1.2 1.2 0 011.2-1.2h2.6a1.2 1.2 0 011.2 1.2V7" />
    </svg>
  )
}
