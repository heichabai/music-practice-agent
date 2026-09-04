import type { PracticeMode } from '../types'

/**
 * 自适应练习引擎：
 * 观察实时指标，输出调整指令。纯逻辑，无 UI 依赖。
 */

export interface AdaptiveMetrics {
  recentHits: number
  recentErrors: number
  windowSize: number
  consecutiveCorrect: number
  consecutiveWrong: number
  lastNoteMidi: number | null
  errorCounts: Map<number, number>
}

export interface AdaptiveDecision {
  action: 'speed-up' | 'slow-down' | 'focus-note' | 'suggest-free' | 'suggest-wait' | 'suggest-next' | 'none'
  value?: number
  message: string
}

const SPEED_UP_THRESHOLD = 0.9
const SLOW_DOWN_THRESHOLD = 0.6
const WINDOW_SIZE = 8
const BPM_STEP = 5
const MIN_BPM = 40
const MAX_BPM = 200
const FOCUS_NOTE_ERROR_THRESHOLD = 3

export class AdaptiveEngine {
  private hitsWindow: boolean[] = []
  private consecutiveCorrect = 0
  private consecutiveWrong = 0
  private errorCounts = new Map<number, number>()
  private lastDecisionBeat = -10
  private currentBeat = 0

  constructor(
    private bpm: number,
    private mode: PracticeMode,
  ) {}

  get currentBpm(): number {
    return this.bpm
  }

  get currentMode(): PracticeMode {
    return this.mode
  }

  /** 每次命中调用 */
  onHit(_midi: number, beat: number): AdaptiveDecision | null {
    this.currentBeat = beat
    this.hitsWindow.push(true)
    if (this.hitsWindow.length > WINDOW_SIZE) this.hitsWindow.shift()
    this.consecutiveCorrect++
    this.consecutiveWrong = 0
    if (this.lastDecisionBeat > 0 && beat - this.lastDecisionBeat < 4) return null
    return this.evaluate()
  }

  /** 每次错误调用 */
  onError(midi: number, beat: number): AdaptiveDecision | null {
    this.currentBeat = beat
    this.hitsWindow.push(false)
    if (this.hitsWindow.length > WINDOW_SIZE) this.hitsWindow.shift()
    this.consecutiveCorrect = 0
    this.consecutiveWrong++
    this.errorCounts.set(midi, (this.errorCounts.get(midi) ?? 0) + 1)
    if (this.lastDecisionBeat > 0 && beat - this.lastDecisionBeat < 4) return null
    return this.evaluate()
  }

  /** 外部调整 BPM/模式后同步 */
  sync(bpm: number, mode: PracticeMode): void {
    this.bpm = bpm
    this.mode = mode
  }

  getMetrics(): AdaptiveMetrics {
    const recentHits = this.hitsWindow.filter(Boolean).length
    return {
      recentHits,
      recentErrors: this.hitsWindow.length - recentHits,
      windowSize: this.hitsWindow.length,
      consecutiveCorrect: this.consecutiveCorrect,
      consecutiveWrong: this.consecutiveWrong,
      lastNoteMidi: null,
      errorCounts: this.errorCounts,
    }
  }

  private evaluate(): AdaptiveDecision | null {
    if (this.hitsWindow.length < WINDOW_SIZE) return null

    const accuracy = this.hitsWindow.filter(Boolean).length / this.hitsWindow.length

    // 热点音符：同一音错 3 次以上
    for (const [midi, count] of this.errorCounts) {
      if (count >= FOCUS_NOTE_ERROR_THRESHOLD) {
        this.lastDecisionBeat = this.currentBeat
        this.errorCounts.delete(midi)
        return {
          action: 'focus-note',
          value: midi,
          message: `这个音容易错，多注意一下`,
        }
      }
    }

    // 命中率 > 90% 且连续对 8 音 → 提速
    if (accuracy >= SPEED_UP_THRESHOLD && this.consecutiveCorrect >= WINDOW_SIZE) {
      if (this.bpm < MAX_BPM) {
        this.bpm = Math.min(MAX_BPM, this.bpm + BPM_STEP)
        this.lastDecisionBeat = this.currentBeat
        this.hitsWindow = []
        return {
          action: 'speed-up',
          value: this.bpm,
          message: `状态很好，提速至 ${this.bpm} BPM`,
        }
      }
      if (this.mode === 'wait') {
        this.mode = 'free'
        this.lastDecisionBeat = this.currentBeat
        this.hitsWindow = []
        return {
          action: 'suggest-free',
          message: '认音已经很稳了，试试自由式练节奏',
        }
      }
      if (accuracy === 1) {
        this.lastDecisionBeat = this.currentBeat
        this.hitsWindow = []
        return {
          action: 'suggest-next',
          message: '完美通过，可以挑战下一首了',
        }
      }
    }

    // 命中率 < 60% 且连续错 3 音 → 降速
    if (accuracy <= SLOW_DOWN_THRESHOLD && this.consecutiveWrong >= 3) {
      if (this.mode === 'free') {
        this.mode = 'wait'
        this.lastDecisionBeat = this.currentBeat
        this.hitsWindow = []
        return {
          action: 'suggest-wait',
          message: '先用等待式稳一下认音',
        }
      }
      if (this.bpm > MIN_BPM) {
        this.bpm = Math.max(MIN_BPM, this.bpm - BPM_STEP)
        this.lastDecisionBeat = this.currentBeat
        this.hitsWindow = []
        return {
          action: 'slow-down',
          value: this.bpm,
          message: `降速至 ${this.bpm} BPM，慢慢来`,
        }
      }
    }

    return null
  }
}
