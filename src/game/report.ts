import type { GameEngine } from './engine'
import { noteName } from './keyboard'
import type { PracticeMode } from '../types'

export interface ProblemNote {
  midi: number
  name: string
  count: number
  issues: string[]
}

export interface SessionReport {
  songName: string
  mode: PracticeMode
  bpm: number
  total: number
  hits: number
  misses: number
  wrongPresses: number
  ghostPresses: number
  accuracy: number
  /** 平均节奏偏差（拍），负=抢拍；等待式为 null */
  timingAvgBeats: number | null
  holdAvgRatio: number | null
  tooShortCount: number
  problemNotes: ProblemNote[]
}

// 单音问题判定阈值（拍 / 比例）
const TIMING_ISSUE = 0.18
const HOLD_MIN = 0.55

export function buildReport(engine: GameEngine): SessionReport {
  const { song, judgements, wrongAttempts } = engine

  let misses = 0
  const offsets: number[] = []
  const holds: number[] = []
  const issueMap = new Map<number, Map<string, number>>()

  const addIssue = (midi: number, issue: string) => {
    if (!issueMap.has(midi)) issueMap.set(midi, new Map())
    const issues = issueMap.get(midi)!
    issues.set(issue, (issues.get(issue) ?? 0) + 1)
  }

  song.notes.forEach((note, i) => {
    const j = judgements[i]
    if (j.verdict === 'missed') {
      misses++
      addIssue(note.midi, '漏弹')
    }
    if (j.offsetBeats !== null) {
      offsets.push(j.offsetBeats)
      if (j.offsetBeats < -TIMING_ISSUE) addIssue(note.midi, '抢拍')
      else if (j.offsetBeats > TIMING_ISSUE) addIssue(note.midi, '拖拍')
    }
    if (j.holdRatio !== null) {
      holds.push(j.holdRatio)
      if (j.holdRatio < HOLD_MIN) addIssue(note.midi, '时值不足')
    }
  })

  for (const [midi, count] of wrongAttempts) {
    for (let k = 0; k < count; k++) addIssue(midi, '弹错')
  }

  const problemNotes: ProblemNote[] = Array.from(issueMap.entries())
    .map(([midi, issues]) => ({
      midi,
      name: noteName(midi),
      count: Array.from(issues.values()).reduce((a, b) => a + b, 0),
      issues: Array.from(issues.keys()),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    songName: song.name,
    mode: engine.mode,
    bpm: song.bpm,
    total: song.notes.length,
    hits: engine.hits,
    misses,
    wrongPresses: engine.errors,
    ghostPresses: engine.ghostPresses,
    accuracy: song.notes.length ? engine.hits / song.notes.length : 0,
    timingAvgBeats: offsets.length
      ? offsets.reduce((a, b) => a + b, 0) / offsets.length
      : null,
    holdAvgRatio: holds.length
      ? holds.reduce((a, b) => a + b, 0) / holds.length
      : null,
    tooShortCount: holds.filter(r => r < HOLD_MIN).length,
    problemNotes,
  }
}
