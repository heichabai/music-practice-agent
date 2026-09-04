/**
 * 游戏化系统：XP / 连续打卡 / 每日目标 / 成就徽章
 * 纯逻辑模块，UI 层读取 state 并渲染。
 */

// ---------- 数据结构 ----------

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: number | null
}

export interface DailyGoal {
  date: string
  notesHit: number
  targetNotes: number
  completed: boolean
}

export interface GamificationState {
  xp: number
  level: number
  streak: number
  lastPracticeDate: string | null
  todayNotes: number
  todayMinutes: number
  totalNotes: number
  totalSessions: number
  achievements: Achievement[]
}

// ---------- 常量 ----------

export const XP_PER_NOTE = 10
export const XP_PER_LESSON = 500
export const XP_PER_SONG = 200
export const XP_PERFECT_BONUS = 100

export const LEVEL_THRESHOLDS = [
  0, 200, 500, 1000, 1800, 2800, 4000, 5500, 7200, 9200, 11500,
  14000, 16800, 19800, 23000, 26500, 30200, 34200, 38500, 43000, 48000,
]

export const DAILY_NOTE_GOAL = 50

const LEVEL_NAMES = [
  '初识琴键', '入门新手', '小有进步', '渐入佳境', '指间流畅',
  '节奏稳定', '双手机动', '和弦自如', '视奏入门', '曲目挑战者',
  '表现自如', '技巧娴熟', '音乐表达', '高级学员', '准专业',
  '专业级', '大师之路', '音乐会选手', '钢琴家', '演奏大师',
]

// ---------- 工具 ----------

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function yesterdayStr(): string {
  const d = new Date(Date.now() - 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function levelFromXp(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i
  }
  return 0
}

export function levelName(level: number): string {
  return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)] ?? ''
}

export function xpToNextLevel(xp: number): { current: number; next: number; progress: number } {
  const level = levelFromXp(xp)
  const current = LEVEL_THRESHOLDS[level] ?? 0
  const next = LEVEL_THRESHOLDS[level + 1] ?? current + 5000
  const progress = Math.min(1, (xp - current) / (next - current))
  return { current, next, progress }
}

// ---------- 成就定义 ----------

const ACHIEVEMENT_DEFS: Array<Omit<Achievement, 'unlockedAt'>> = [
  { id: 'first-note', name: '第一个音', description: '完成第一次弹奏', icon: 'note' },
  { id: 'first-lesson', name: '开学第一课', description: '完成第 1 课教程', icon: 'lesson' },
  { id: 'all-lessons', name: '课程毕业', description: '完成全部 7 课教程', icon: 'graduation' },
  { id: 'streak-3', name: '三日打卡', description: '连续 3 天练习', icon: 'flame3' },
  { id: 'streak-7', name: '一周坚持', description: '连续 7 天练习', icon: 'flame7' },
  { id: 'streak-30', name: '月度大师', description: '连续 30 天练习', icon: 'flame30' },
  { id: 'notes-100', name: '百发百中', description: '累计命中 100 个音', icon: 'target100' },
  { id: 'notes-500', name: '五百强', description: '累计命中 500 个音', icon: 'target500' },
  { id: 'notes-1000', name: '千音斩', description: '累计命中 1000 个音', icon: 'target1000' },
  { id: 'perfect-song', name: '完美演出', description: '以 100% 命中率完成一首曲子', icon: 'star' },
  { id: 'no-errors', name: '零失误', description: '一首曲子零错音零漏弹', icon: 'diamond' },
  { id: 'first-import', name: '自选曲目', description: '首次导入自定义乐谱', icon: 'import' },
  { id: 'mic-user', name: '裸琴玩家', description: '使用麦克风识别练习', icon: 'mic' },
  { id: 'free-mode', name: '节奏大师', description: '在自由式达到 90%+ 命中率', icon: 'rhythm' },
  { id: 'speed-demon', name: '速度恶魔', description: '在 120+ BPM 下完成自由式', icon: 'bolt' },
  { id: 'early-bird', name: '晨练者', description: '早上 7 点前开始练习', icon: 'sunrise' },
  { id: 'night-owl', name: '夜猫子', description: '晚上 11 点后仍在练习', icon: 'moon' },
  { id: 'marathon', name: '马拉松', description: '单次练习超过 15 分钟', icon: 'trophy' },
  { id: 'ai-fan', name: '教练之友', description: '使用 AI 答疑 5 次', icon: 'chat' },
  { id: 'level-10', name: '十级达成', description: '达到等级 10', icon: 'crown' },
]

export function defaultGamificationState(): GamificationState {
  return {
    xp: 0,
    level: 0,
    streak: 0,
    lastPracticeDate: null,
    todayNotes: 0,
    todayMinutes: 0,
    totalNotes: 0,
    totalSessions: 0,
    achievements: ACHIEVEMENT_DEFS.map(def => ({ ...def, unlockedAt: null })),
  }
}

// ---------- 更新函数（返回新 state + 新解锁的成就列表） ----------

export interface GamificationUpdate {
  state: GamificationState
  newlyUnlocked: Achievement[]
}

function checkAchievements(state: GamificationState): GamificationUpdate {
  const newlyUnlocked: Achievement[] = []
  const check = (id: string, condition: boolean) => {
    const ach = state.achievements.find(a => a.id === id)
    if (ach && ach.unlockedAt === null && condition) {
      ach.unlockedAt = Date.now()
      newlyUnlocked.push(ach)
    }
  }

  check('first-note', state.totalNotes >= 1)
  check('notes-100', state.totalNotes >= 100)
  check('notes-500', state.totalNotes >= 500)
  check('notes-1000', state.totalNotes >= 1000)
  check('streak-3', state.streak >= 3)
  check('streak-7', state.streak >= 7)
  check('streak-30', state.streak >= 30)
  check('level-10', levelFromXp(state.xp) >= 10)

  return { state, newlyUnlocked }
}

export function onNoteHit(prev: GamificationState, _midi: number): GamificationUpdate {
  const today = todayStr()
  const state = { ...prev, achievements: prev.achievements.map(a => ({ ...a })) }

  // 连续打卡逻辑
  if (state.lastPracticeDate !== today) {
    if (state.lastPracticeDate === yesterdayStr()) {
      state.streak++
    } else {
      state.streak = 1
    }
    state.lastPracticeDate = today
    state.todayNotes = 0
    state.todayMinutes = 0
  }

  state.xp += XP_PER_NOTE
  state.todayNotes++
  state.totalNotes++
  state.level = levelFromXp(state.xp)

  return checkAchievements(state)
}

export function onSessionEnd(
  prev: GamificationState,
  stats: {
    notesHit: number
    errors: number
    misses: number
    durationMs: number
    bpm: number
    mode: string
    songName: string
  },
): GamificationUpdate {
  const state = { ...prev, achievements: prev.achievements.map(a => ({ ...a })) }
  const today = todayStr()

  if (state.lastPracticeDate !== today) {
    if (state.lastPracticeDate === yesterdayStr()) {
      state.streak++
    } else {
      state.streak = 1
    }
    state.lastPracticeDate = today
  }

  state.totalSessions++
  state.todayMinutes += Math.round(stats.durationMs / 60000)

  // 完美通过奖励
  if (stats.errors === 0 && stats.misses === 0 && stats.notesHit > 0) {
    state.xp += XP_PERFECT_BONUS
    const ach = state.achievements.find(a => a.id === 'perfect-song')
    if (ach && ach.unlockedAt === null) {
      ach.unlockedAt = Date.now()
    }
    const ach2 = state.achievements.find(a => a.id === 'no-errors')
    if (ach2 && ach2.unlockedAt === null) {
      ach2.unlockedAt = Date.now()
    }
  }

  // 自由式高分
  if (stats.mode === 'free' && stats.notesHit > 0) {
    const acc = stats.notesHit / (stats.notesHit + stats.errors + stats.misses)
    if (acc >= 0.9) {
      const ach = state.achievements.find(a => a.id === 'free-mode')
      if (ach && ach.unlockedAt === null) ach.unlockedAt = Date.now()
    }
    if (stats.bpm >= 120 && acc >= 0.8) {
      const ach = state.achievements.find(a => a.id === 'speed-demon')
      if (ach && ach.unlockedAt === null) ach.unlockedAt = Date.now()
    }
  }

  // 马拉松
  if (stats.durationMs >= 15 * 60 * 1000) {
    const ach = state.achievements.find(a => a.id === 'marathon')
    if (ach && ach.unlockedAt === null) ach.unlockedAt = Date.now()
  }

  // 时段成就
  const hour = new Date().getHours()
  if (hour < 7) {
    const ach = state.achievements.find(a => a.id === 'early-bird')
    if (ach && ach.unlockedAt === null) ach.unlockedAt = Date.now()
  }
  if (hour >= 23) {
    const ach = state.achievements.find(a => a.id === 'night-owl')
    if (ach && ach.unlockedAt === null) ach.unlockedAt = Date.now()
  }

  state.level = levelFromXp(state.xp)
  return checkAchievements(state)
}

export function onLessonComplete(prev: GamificationState, lessonOrder: number): GamificationUpdate {
  const state = { ...prev, achievements: prev.achievements.map(a => ({ ...a })) }
  state.xp += XP_PER_LESSON
  state.level = levelFromXp(state.xp)

  const ach1 = state.achievements.find(a => a.id === 'first-lesson')
  if (ach1 && ach1.unlockedAt === null && lessonOrder >= 1) {
    ach1.unlockedAt = Date.now()
  }
  const ach2 = state.achievements.find(a => a.id === 'all-lessons')
  if (ach2 && ach2.unlockedAt === null && lessonOrder >= 7) {
    ach2.unlockedAt = Date.now()
  }

  return checkAchievements(state)
}

export function onCustomSongImported(prev: GamificationState): GamificationUpdate {
  const state = { ...prev, achievements: prev.achievements.map(a => ({ ...a })) }
  const ach = state.achievements.find(a => a.id === 'first-import')
  if (ach && ach.unlockedAt === null) ach.unlockedAt = Date.now()
  return checkAchievements(state)
}

export function onMicUsed(prev: GamificationState): GamificationUpdate {
  const state = { ...prev, achievements: prev.achievements.map(a => ({ ...a })) }
  const ach = state.achievements.find(a => a.id === 'mic-user')
  if (ach && ach.unlockedAt === null) ach.unlockedAt = Date.now()
  return checkAchievements(state)
}
