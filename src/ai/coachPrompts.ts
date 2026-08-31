import type { ChatMessage } from './llmClient'
import type { SessionReport } from '../game/report'

export interface PracticePlan {
  focus: string
  steps: Array<{ name: string; description: string; minutes: number }>
  targetNotes: string[]
  tip: string
}

const MODE_LABEL: Record<string, string> = { wait: '等待式', free: '自由式' }

function describeReport(report: SessionReport): string {
  const lines = [
    `曲目：${report.songName}（${MODE_LABEL[report.mode] ?? report.mode}，${report.bpm} BPM，共 ${report.total} 个音）`,
    `命中 ${report.hits}/${report.total}（命中率 ${(report.accuracy * 100).toFixed(0)}%）`,
    `错音 ${report.wrongPresses} 次，漏弹 ${report.misses} 次，多余按键 ${report.ghostPresses} 次`,
  ]
  if (report.timingAvgBeats !== null) {
    const ms = (report.timingAvgBeats * 60000) / report.bpm
    const tend = ms < -25 ? '整体偏抢拍' : ms > 25 ? '整体偏拖拍' : '节奏基本稳'
    lines.push(`平均节奏偏差：${ms > 0 ? '+' : ''}${ms.toFixed(0)}ms（${tend}）`)
  } else {
    lines.push('平均节奏偏差：无数据（等待式模式）')
  }
  if (report.holdAvgRatio !== null) {
    lines.push(
      `时值保持：平均为期望时值的 ${(report.holdAvgRatio * 100).toFixed(0)}%` +
        (report.tooShortCount > 0 ? `，其中 ${report.tooShortCount} 个音明显偏短` : ''),
    )
  }
  if (report.problemNotes.length > 0) {
    lines.push(
      `问题音符：${report.problemNotes
        .map(p => `${p.name}（${p.issues.join('、')}×${p.count}）`)
        .join('；')}`,
    )
  }
  return lines.join('\n')
}

export const COACH_SYSTEM_PROMPT = `你是一位专业、温暖的钢琴陪练教练，正在给一位业余学琴的学生做练习复盘。
规则：
- 只依据给出的练习数据说话，引用具体数字，不编造
- 具体可操作，不说"多练习"这类空话
- 语气鼓励但不夸张，像真实的好老师
- 全程使用中文，不使用表情符号`

export function buildReviewMessages(
  report: SessionReport,
  historyBrief?: string,
): ChatMessage[] {
  const history = historyBrief ? `\n近期练习记录：\n${historyBrief}\n` : ''
  return [
    { role: 'system', content: COACH_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `本次练习数据：
${describeReport(report)}
${history}
请生成练习复盘，结构：
1. 一句话总体评价
2. 指出 2-3 个最值得注意的问题（引用数据）
3. 每个问题给一条立刻能做的练习方法
4. 一句话鼓励收尾
全文控制在 200 字以内，用短句。`,
    },
  ]
}

export function buildPlanMessages(
  report: SessionReport,
  historyBrief?: string,
): ChatMessage[] {
  const history = historyBrief ? `\n近期练习记录：\n${historyBrief}\n` : ''
  return [
    { role: 'system', content: COACH_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `本次练习数据：
${describeReport(report)}
${history}
基于以上数据，为学员制定下一次的练习计划（总时长 10 分钟以内）。
只输出 JSON，结构如下：
{
  "focus": "本次计划的重点，一句话",
  "steps": [
    { "name": "步骤名", "description": "具体怎么做，含指法或键位", "minutes": 2 }
  ],
  "targetNotes": ["重点练的音名，如 G4"],
  "tip": "一句话练习提示"
}
steps 有 3-4 个，minutes 为整数且总和不超过 10。`,
    },
  ]
}
