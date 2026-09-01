import { LlmError } from './llmClient'
import type { Note } from '../types'

export const SHEET_PROMPT = `你是专业的乐谱识别器。请识别图片中乐谱的主旋律（单声部，通常是最高声部或唯一声部）。

规则：
- 只识别主旋律，忽略伴奏、和弦标记、歌词、指法数字
- midi 为音高编号：C4=60，C#4=61，D4=62，每半音加 1；C5=72
- time 为该音起始时间（拍），从 0 开始，四分音符=1拍
- duration 为时值（拍），八分音符=0.5，二分音符=2，附点四分=1.5
- 升降号、调号都要计入 midi
- 全曲为 4/4 拍，除非谱面明确标注其他拍号

只输出一行紧凑的 JSON（不要换行、不要空格、不要任何解释文字），格式：
{"name":"小星星","bpm":96,"notes":[{"midi":60,"time":0,"duration":1},{"midi":67,"time":2,"duration":1}]}

name 取曲名（谱面没有就写"未命名曲目"），bpm 取谱面速度标记（没有就写 100）。`

export interface SheetDraft {
  name: string
  bpm: number
  notes: Note[]
  /** 输出被截断时靠打捞得到的（提示上层考虑分片重试） */
  salvaged?: boolean
}

function normalizeNote(item: unknown): Note | null {
  const n = item as Partial<Note>
  if (typeof n.midi !== 'number' || typeof n.time !== 'number' || typeof n.duration !== 'number') {
    return null
  }
  const midi = Math.round(n.midi)
  if (midi < 21 || midi > 108) return null
  const time = Math.max(0, Math.round(n.time * 4) / 4)
  const duration = Math.min(16, Math.max(0.25, Math.round(n.duration * 4) / 4))
  return { midi, time, duration }
}

/** 输出被截断时打捞：逐个提取响应里所有完整的音符对象 */
function salvageNotes(text: string): Note[] {
  const notes: Note[] = []
  for (const match of text.matchAll(/\{[^{}]*\}/g)) {
    try {
      const note = normalizeNote(JSON.parse(match[0]))
      if (note !== null) notes.push(note)
    } catch {
      // 跳过不完整对象
    }
  }
  return notes
}

/** 解析并规范化模型返回，坏数据直接抛错；JSON 截断时自动打捞完整音符 */
export function parseSheetResponse(
  raw: string,
  sourceName: string,
  opts: { allowEmpty?: boolean; finishReason?: string | null } = {},
): SheetDraft {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fence) text = fence[1]

  let name = sourceName
  let bpm = 100
  let notes: Note[] | null = null

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      const data = JSON.parse(text.slice(start, end + 1)) as {
        name?: unknown
        bpm?: unknown
        notes?: unknown
      }
      if (typeof data.name === 'string' && data.name.trim() !== '') name = data.name.trim()
      if (typeof data.bpm === 'number' && data.bpm >= 30 && data.bpm <= 240) {
        bpm = Math.round(data.bpm)
      }
      if (Array.isArray(data.notes)) {
        const parsed = data.notes.map(normalizeNote).filter((n): n is Note => n !== null)
        if (parsed.length > 0) notes = parsed
      }
    } catch {
      notes = null
    }
  }

  const salvaged = notes === null
  if (notes === null) {
    notes = salvageNotes(text)
  }

  if (notes.length === 0) {
    if (opts.allowEmpty) return { name, bpm, notes: [], salvaged }
    if (opts.finishReason === 'length' || salvaged) {
      throw new LlmError('识别结果异常（可能被截断），请重试；乐曲较长时建议分段截图识别')
    }
    throw new LlmError('没有识别出音符，请确认图片是乐谱且足够清晰')
  }

  const seen = new Set<string>()
  const unique = notes.filter(n => {
    const key = `${n.midi}@${n.time}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  unique.sort((a, b) => a.time - b.time)
  return { name, bpm, notes: unique, salvaged: salvaged || opts.finishReason === 'length' }
}

/** 合并多页识别结果：每页时间自动顺延到上一页结束后的下一小节 */
export function mergePageDrafts(drafts: SheetDraft[]): SheetDraft {
  const withNotes = drafts.filter(d => d.notes.length > 0)
  if (withNotes.length === 0) {
    throw new LlmError('所有页面都没有识别出音符，请确认文件是乐谱')
  }
  if (withNotes.length === 1) return withNotes[0]
  const notes: Note[] = []
  let offset = 0
  for (const draft of withNotes) {
    for (const n of draft.notes) {
      notes.push({ ...n, time: n.time + offset })
    }
    const maxEnd = draft.notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
    offset += Math.ceil((maxEnd + 0.001) / 4) * 4
  }
  notes.sort((a, b) => a.time - b.time)
  const bpm = withNotes.map(d => d.bpm).sort((a, b) => b - a)[0]
  return { name: withNotes[0].name, bpm, notes }
}
