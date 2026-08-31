interface Props {
  /** 音名，如 G4 */
  name: string
  /** 问题标签列表（漏弹/弹错/抢拍/拖拍/时值不足） */
  issues: string[]
  /** 问题总次数 */
  count: number
}

/** 问题音胶囊：accent 描边 + 淡底，音名加粗 accent-strong（§4.3） */
export function ProblemChip({ name, issues, count }: Props) {
  return (
    <div className="rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm">
      <span className="font-semibold text-accent-strong">{name}</span>
      <span className="ml-2 text-secondary">
        {issues.join('、')}×{count}
      </span>
    </div>
  )
}
