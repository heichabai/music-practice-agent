import type { PracticeMode } from '../types'

/**
 * 自适应练习引擎（纯建议，不自动调整）：
 * 观察实时指标，输出提示信息。速度和模式由用户自主选择，AI 只做教练式建议。
 */

export interface AdaptiveMetrics {
  recentHits: number
  recentErrors: number
  windowSize: number
  consecutiveCorrect: number
  consecutiveWrong: number
  errorCounts: Map<number, number>
}

export type AdaptiveAction =
  | 'focus-note'
  | 'suggest-speed-up'
  | 'suggest-slow-down'
  | 'suggest-free'
  | 'suggest-wait'
  | 'suggest-next'
  | 'encourage'
  | 'none'

export interface AdaptiveDecision {
  action: AdaptiveAction
  value?: number
  message: string
}

const GOOD_THRESHOLD = 0.9
const STRUGGLE_THRESHOLD = 0.6
const WINDOW_SIZE = 8
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

  /** 每次命中调用 */
  onHit(_midi: number, beat: number): AdaptiveDecision | null {
    this.currentBeat = beat
    this.hitsWindow.push(true)
    if (this.hitsWindow.length > WINDOW_SIZE) this.hitsWindow.shift()
    this.consecutiveCorrect++
    this.consecutiveWrong = 0
    if (this.lastDecisionBeat > 0 && beat - this.lastDecisionBeat < 6) return null
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
    if (this.lastDecisionBeat > 0 && beat - this.lastDecisionBeat < 6) return null
    return this.evaluate()
  }

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
      errorCounts: this.errorCounts,
    }
  }

  private evaluate(): AdaptiveDecision | null {
    if (this.hitsWindow.length < WINDOW_SIZE) return null
    const accuracy = this.hitsWindow.filter(Boolean).length / this.hitsWindow.length

    // 热点音符：同一音错 3 次
    for (const [midi, count] of this.errorCounts) {
      if (count >= FOCUS_NOTE_ERROR_THRESHOLD) {
        this.lastDecisionBeat = this.currentBeat
        this.errorCounts.delete(midi)
        return {
          action: 'focus-note',
          value: midi,
          message: '这个音容易错，多注意一下',
        }
      }
    }

    // 表现很好 → 建议提速（不自动调，只提示）
    if (accuracy >= GOOD_THRESHOLD && this.consecutiveCorrect >= WINDOW_SIZE) {
      this.lastDecisionBeat = this.currentBeat
      this.hitsWindow = []
      if (this.mode === 'wait') {
        return {
          action: 'suggest-free',
          message: '认音已经很稳了，可以试试自由式练节奏',
        }
      }
      if (accuracy === 1) {
        return {
          action: 'suggest-next',
          message: '完美通过！可以挑战下一首了',
        }
      }
      return {
        action: 'suggest-speed-up',
        value: this.bpm + 5,
        message: `状态很好，可以试试提速到 ${this.bpm + 5} BPM`,
      }
    }

    // 遇到困难 → 建议降速或切模式（不自动调，只提示）
    if (accuracy <= STRUGGLE_THRESHOLD && this.consecutiveWrong >= 3) {
      this.lastDecisionBeat = this.currentBeat
      this.hitsWindow = []
      if (this.mode === 'free') {
        return {
          action: 'suggest-wait',
          message: '先用等待式稳一下认音',
        }
      }
      return {
        action: 'suggest-slow-down',
        value: Math.max(40, this.bpm - 5),
        message: `节奏有点跟不上，可以降速到 ${Math.max(40, this.bpm - 5)} BPM 试试`,
      }
    }

    // 恢复正常（从连续错误中走出来）
    if (this.consecutiveCorrect >= 4 && this.lastDecisionBeat > 0) {
      this.lastDecisionBeat = this.currentBeat
      this.hitsWindow = []
      return {
        action: 'encourage',
        message: '稳住了，保持这个感觉',
      }
    }

    return null
  }
}
