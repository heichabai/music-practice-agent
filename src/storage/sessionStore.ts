import type { SessionReport } from '../game/report'

export interface StoredSession {
  id: string
  timestamp: number
  report: SessionReport
}

const KEY = 'mpa.sessions.v1'
const MAX_SESSIONS = 100

// Node 环境兜底（冒烟脚本用），浏览器走 localStorage
const memory = new Map<string, string>()

function getRaw(): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(KEY)
  } catch {
    // 隐私模式等场景
  }
  return memory.get(KEY) ?? null
}

function setRaw(value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, value)
      return
    }
  } catch {
    // 同上
  }
  memory.set(KEY, value)
}

function parseAll(): StoredSession[] {
  const raw = getRaw()
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter((s): s is StoredSession => {
      const r = (s as StoredSession)?.report
      return (
        typeof (s as StoredSession)?.id === 'string' &&
        typeof (s as StoredSession)?.timestamp === 'number' &&
        !!r &&
        typeof r.songName === 'string'
      )
    })
  } catch {
    return []
  }
}

export function saveSession(report: SessionReport): StoredSession {
  const session: StoredSession = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    report,
  }
  setRaw(JSON.stringify([session, ...parseAll()].slice(0, MAX_SESSIONS)))
  return session
}

export function listSessions(limit?: number): StoredSession[] {
  const all = parseAll()
  return limit ? all.slice(0, limit) : all
}

export function clearSessions(): void {
  memory.delete(KEY)
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export interface NoteIssueTally {
  midi: number
  name: string
  total: number
  issues: Record<string, number>
}

/** 跨次累计问题音符排行 */
export function aggregateProblemNotes(sessions: StoredSession[], top = 5): NoteIssueTally[] {
  const map = new Map<number, NoteIssueTally>()
  for (const s of sessions) {
    for (const p of s.report.problemNotes) {
      const entry = map.get(p.midi) ?? { midi: p.midi, name: p.name, total: 0, issues: {} }
      entry.total += p.count
      for (const issue of p.issues) {
        entry.issues[issue] = (entry.issues[issue] ?? 0) + 1
      }
      map.set(p.midi, entry)
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, top)
}

/** 给教练看的同曲近期练习摘要 */
export function getHistoryBrief(songName: string, recent = 5): string {
  const sessions = listSessions()
    .filter(s => s.report.songName === songName)
    .slice(0, recent)
  if (sessions.length === 0) return ''
  const lines = sessions.map(s => {
    const date = new Date(s.timestamp).toLocaleDateString('zh-CN')
    const acc = `${(s.report.accuracy * 100).toFixed(0)}%`
    const issues = s.report.problemNotes.slice(0, 2).map(p => p.name).join('、')
    return `${date} ${s.report.mode === 'wait' ? '等待式' : '自由式'}：命中率 ${acc}${issues ? `，主要问题：${issues}` : ''}`
  })
  const trend =
    sessions.length >= 2
      ? `命中率从 ${(sessions[sessions.length - 1].report.accuracy * 100).toFixed(0)}% 变为 ${(sessions[0].report.accuracy * 100).toFixed(0)}%`
      : ''
  const tally = aggregateProblemNotes(sessions, 3)
  const hot = tally.length ? `累计最常出问题的音：${tally.map(t => t.name).join('、')}` : ''
  return [...lines, trend, hot].filter(Boolean).join('\n')
}
