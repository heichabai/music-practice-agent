interface Props {
  /** 音名，如 G4 */
  name: string
  /** 问题标签列表（漏弹/弹错/抢拍/拖拍/时值不足） */
  issues: string[]
  /** 问题总次数 */
  count: number
}

/** 问题音胶囊：发丝描边，文字克制（极简外壳） */
export function ProblemChip({ name, issues, count }: Props) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1 text-sm">
      <span className="font-semibold text-primary tabular-nums">{name}</span>
      <span className="text-secondary">
        {issues.join('、')}×{count}
      </span>
    </div>
  )
}