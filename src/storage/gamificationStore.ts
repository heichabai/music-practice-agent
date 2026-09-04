import { defaultGamificationState, type GamificationState } from '../game/gamification'

const KEY = 'mpa.gamification.v1'
const memory = new Map<string, string>()

function getRaw(): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(KEY)
  } catch {
    // 隐私模式
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

export function loadGamification(): GamificationState {
  const raw = getRaw()
  if (!raw) return defaultGamificationState()
  try {
    const data = JSON.parse(raw) as Partial<GamificationState>
    const defaults = defaultGamificationState()
    return {
      xp: typeof data.xp === 'number' ? data.xp : defaults.xp,
      level: typeof data.level === 'number' ? data.level : defaults.level,
      streak: typeof data.streak === 'number' ? data.streak : defaults.streak,
      lastPracticeDate: typeof data.lastPracticeDate === 'string' ? data.lastPracticeDate : null,
      todayNotes: typeof data.todayNotes === 'number' ? data.todayNotes : 0,
      todayMinutes: typeof data.todayMinutes === 'number' ? data.todayMinutes : 0,
      totalNotes: typeof data.totalNotes === 'number' ? data.totalNotes : 0,
      totalSessions: typeof data.totalSessions === 'number' ? data.totalSessions : 0,
      achievements: Array.isArray(data.achievements)
        ? data.achievements.filter(
            (a): a is GamificationState['achievements'][number] =>
              typeof a?.id === 'string' && typeof a?.name === 'string',
          )
        : defaults.achievements,
    }
  } catch {
    return defaultGamificationState()
  }
}

export function saveGamification(state: GamificationState): void {
  setRaw(JSON.stringify(state))
}
