const KEY = 'mpa.tutorial.v1'

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

export interface TutorialProgress {
  completed: string[]
}

export function getTutorialProgress(): TutorialProgress {
  const raw = getRaw()
  if (!raw) return { completed: [] }
  try {
    const data = JSON.parse(raw) as { completed?: unknown }
    return {
      completed: Array.isArray(data.completed)
        ? data.completed.filter((x): x is string => typeof x === 'string')
        : [],
    }
  } catch {
    return { completed: [] }
  }
}

export function markLessonComplete(lessonId: string): TutorialProgress {
  const progress = getTutorialProgress()
  if (!progress.completed.includes(lessonId)) {
    progress.completed.push(lessonId)
    setRaw(JSON.stringify(progress))
  }
  return progress
}

export function isLessonCompleted(lessonId: string): boolean {
  return getTutorialProgress().completed.includes(lessonId)
}
