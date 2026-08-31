import { chatCompletion, LlmError } from './llmClient'
import { buildPlanMessages, buildReviewMessages, type PracticePlan } from './coachPrompts'
import type { SessionReport } from '../game/report'

export { LlmError }
export type { PracticePlan }

/** 生成教练复盘话术 */
export async function generateReview(
  report: SessionReport,
  historyBrief?: string,
): Promise<string> {
  const content = await chatCompletion(buildReviewMessages(report, historyBrief), {
    temperature: 0.7,
  })
  return content.trim()
}

/** 生成结构化练习计划 */
export async function generatePracticePlan(
  report: SessionReport,
  historyBrief?: string,
): Promise<PracticePlan> {
  const content = await chatCompletion(buildPlanMessages(report, historyBrief), {
    temperature: 0.4,
    jsonMode: true,
  })
  return parsePlan(content)
}

function parsePlan(raw: string): PracticePlan {
  let text = raw.trim()
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fence) text = fence[1]
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new LlmError('练习计划 JSON 解析失败')
  }
  const obj = data as Partial<PracticePlan>
  if (typeof obj.focus !== 'string' || !Array.isArray(obj.steps)) {
    throw new LlmError('练习计划结构不符合约定')
  }
  const steps = obj.steps
    .filter(
      (s): s is { name: string; description: string; minutes: number } =>
        typeof s?.name === 'string' &&
        typeof s?.description === 'string' &&
        typeof s?.minutes === 'number',
    )
    .map(s => ({ ...s, minutes: Math.max(1, Math.round(s.minutes)) }))
  if (steps.length === 0) throw new LlmError('练习计划没有任何有效步骤')
  return {
    focus: obj.focus,
    steps,
    targetNotes: Array.isArray(obj.targetNotes)
      ? obj.targetNotes.filter((n): n is string => typeof n === 'string')
      : [],
    tip: typeof obj.tip === 'string' ? obj.tip : '',
  }
}
