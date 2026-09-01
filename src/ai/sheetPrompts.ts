import { LlmError } from './llmClient'
import type { Note } from '../types'

export const SHEET_PROMPT = `你是专业的乐谱识别器。请识别图片中乐谱的主旋律（单声部，通常是最高声部或唯一声部），并以严格的 JSON 输出。

规则：
- 只识别主旋律，忽略伴奏、和弦标记、歌词、指法数字
- midi 为音高编号：C4=60，C#4=61，D4=62，每半音加 1；C5=72
- time 为该音起始时间（拍），从 0 开始，四分音符=1拍
- duration 为时值（拍），八分音符=0.5，二分音符=2，附点四分=1.5
- 升降号、调号都要计入 midi
- 全曲为 4/4 拍，除非谱面明确标注其他拍号
- 只输出 JSON，不要任何解释文字

输出格式示例：
{"name":"小星星","bpm":96,"notes":[{"midi":60,"time":0,"duration":1},{"midi":60,"time":1,"duration":1},{"midi":67,"time":2,"duration":1}]}

name 取曲名（谱面没有就写"未命名曲目"），bpm 取谱面速度标记（没有就写 100）。`

export interface SheetDraft {
  name: string
  bpm: number
  notes: Note[]
}

/** 解析并规范化模型返回的 JSON，坏数据直接抛错 */
export function parseSheetResponse(raw: string, sourceName: string): SheetDraft {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fence) text = fence[1]
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new LlmError('识别结果中没有找到 JSON 数据')
  }
  let data: unknown
  try {
    data = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new LlmError('识别结果 JSON 解析失败，请重试或换一张更清晰的图片')
  }
  const obj = data as Partial<{ name: unknown; bpm: unknown; notes: unknown }>
  if (!Array.isArray(obj.notes) || obj.notes.length === 0) {
    throw new LlmError('没有识别出音符，请确认图片是乐谱')
  }

  const seen = new Set<string>()
  const notes: Note[] = []
  for (const item of obj.notes) {
    const n = item as Partial<Note>
    if (typeof n.midi !== 'number' || typeof n.time !== 'number' || typeof n.duration !== 'number') {
      continue
    }
    const midi = Math.round(n.midi)
    if (midi < 21 || midi > 108) continue
    const time = Math.max(0, Math.round(n.time * 4) / 4)
    const duration = Math.min(16, Math.max(0.25, Math.round(n.duration * 4) / 4))
    const key = `${midi}@${time}`
    if (seen.has(key)) continue
    seen.add(key)
    notes.push({ midi, time, duration })
  }
  if (notes.length === 0) {
    throw new LlmError('识别出的音符全部无效，请换一张更清晰的图片')
  }
  notes.sort((a, b) => a.time - b.time)

  const bpm =
    typeof obj.bpm === 'number' && obj.bpm >= 30 && obj.bpm <= 240 ? Math.round(obj.bpm) : 100
  const name =
    typeof obj.name === 'string' && obj.name.trim() !== '' ? obj.name.trim() : sourceName

  return { name, bpm, notes }
}
