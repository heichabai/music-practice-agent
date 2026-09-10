/**
 * 和弦识别（纯逻辑，无 UI 依赖）。
 * 输入一组 MIDI 音符，尽力推断最可能的和弦，兼容任意组合与不完整和弦。
 */

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const PC_NAMES_CN = ['C', '升C', 'D', '升D', 'E', 'F', '升F', 'G', '升G', 'A', '升A', 'B']

const INTERVAL_CN: Record<number, string> = {
  1: '小二度',
  2: '大二度',
  3: '小三度',
  4: '大三度',
  5: '纯四度',
  6: '三全音',
  7: '纯五度',
  8: '小六度',
  9: '大六度',
  10: '小七度',
  11: '大七度',
}

interface Template {
  /** 相对根音的半音音级（始终含 0） */
  intervals: number[]
  /** 和弦记号后缀，如 '' / 'm' / 'maj7' */
  symbol: string
  /** 中文性质名，如 大三和弦 / 小七和弦 */
  cn: string
  /** 同分数下的偏好权重（常见的在前） */
  bias: number
}

const TEMPLATES: Template[] = [
  { intervals: [0, 4, 7], symbol: '', cn: '大三和弦', bias: 90 },
  { intervals: [0, 3, 7], symbol: 'm', cn: '小三和弦', bias: 88 },
  { intervals: [0, 5, 7], symbol: 'sus4', cn: '挂四和弦', bias: 40 },
  { intervals: [0, 2, 7], symbol: 'sus2', cn: '挂二和弦', bias: 35 },
  { intervals: [0, 4, 8], symbol: 'aug', cn: '增三和弦', bias: 30 },
  { intervals: [0, 3, 6], symbol: 'dim', cn: '减三和弦', bias: 32 },
  { intervals: [0, 4, 7, 11], symbol: 'maj7', cn: '大七和弦', bias: 60 },
  { intervals: [0, 4, 7, 10], symbol: '7', cn: '属七和弦', bias: 58 },
  { intervals: [0, 3, 7, 10], symbol: 'm7', cn: '小七和弦', bias: 56 },
  { intervals: [0, 4, 7, 9], symbol: '6', cn: '大六和弦', bias: 30 },
  { intervals: [0, 3, 7, 9], symbol: 'm6', cn: '小六和弦', bias: 28 },
  { intervals: [0, 2, 4, 7], symbol: 'add9', cn: '大加九和弦', bias: 26 },
  { intervals: [0, 2, 3, 7], symbol: 'm(add9)', cn: '小加九和弦', bias: 24 },
  { intervals: [0, 3, 6, 10], symbol: 'm7b5', cn: '半减七和弦', bias: 22 },
  { intervals: [0, 3, 6, 9], symbol: 'dim7', cn: '减七和弦', bias: 20 },
  // 挂留七和弦
  { intervals: [0, 5, 7, 10], symbol: '7sus4', cn: '属七挂四和弦', bias: 35 },
  // 九和弦
  { intervals: [0, 2, 4, 7, 11], symbol: 'maj9', cn: '大九和弦', bias: 52 },
  { intervals: [0, 2, 4, 7, 10], symbol: '9', cn: '属九和弦', bias: 50 },
  { intervals: [0, 2, 3, 7, 10], symbol: 'm9', cn: '小九和弦', bias: 48 },
  { intervals: [0, 2, 4, 7, 9], symbol: '6/9', cn: '六九和弦', bias: 25 },
  { intervals: [0, 2, 3, 7, 9], symbol: 'm6/9', cn: '小六九和弦', bias: 23 },
  { intervals: [0, 2, 5, 7, 10], symbol: '9sus4', cn: '属九挂四和弦', bias: 20 },
  // 十一和弦
  { intervals: [0, 2, 4, 5, 7, 11], symbol: 'maj11', cn: '大十一和弦', bias: 42 },
  { intervals: [0, 2, 4, 5, 7, 10], symbol: '11', cn: '属十一和弦', bias: 40 },
  { intervals: [0, 2, 3, 5, 7, 10], symbol: 'm11', cn: '小十一和弦', bias: 38 },
  // 十三和弦（理论构成含 11 音）
  { intervals: [0, 2, 4, 5, 7, 9, 11], symbol: 'maj13', cn: '大十三和弦', bias: 48 },
  { intervals: [0, 2, 4, 5, 7, 9, 10], symbol: '13', cn: '属十三和弦', bias: 46 },
  { intervals: [0, 2, 3, 5, 7, 9, 10], symbol: 'm13', cn: '小十三和弦', bias: 44 },
  // 变化属和弦
  { intervals: [0, 1, 4, 7, 10], symbol: '7b9', cn: '属七降九和弦', bias: 18 },
  { intervals: [0, 3, 4, 7, 10], symbol: '7#9', cn: '属七升九和弦', bias: 17 },
  { intervals: [0, 4, 6, 7, 10], symbol: '7#11', cn: '属七升十一和弦', bias: 16 },
  { intervals: [0, 4, 6, 7, 11], symbol: 'maj7#11', cn: '大七升十一和弦', bias: 15 },
]

export interface ChordResult {
  /** 根音与最低音的音级（0-11） */
  rootPc: number
  bassPc: number
  /** 记号，如 C / F#m7 / C(no5) / C/E（转位带斜杠） */
  symbol: string
  /** 中文全名，如 升F小七和弦 */
  fullCn: string
  /** 有和弦音没弹（不完整和弦） */
  incomplete: boolean
  /** 缺失的和弦音级名，如 ['5'] / ['3','5'] */
  missingDegrees: string[]
  /** 有和弦外的音（如旋律经过音） */
  hasExtra: boolean
  /** 两音组合时的音程小注 */
  intervalHint: string | null
}

/** 省略记号的排序权重：根音→三音→五音→七音→延伸音 */
const DEGREE_ORDER: Record<string, number> = {
  R: 0,
  '3': 1,
  '♯9': 1.5,
  '5': 2,
  '♭7': 3,
  '7': 3,
  '9': 4,
  '♭9': 4.5,
  '11': 5,
  '♯11': 5.5,
  '6': 6,
  '13': 6,
}

const pcName = (pc: number) => PC_NAMES[((pc % 12) + 12) % 12]

/** 和弦音级名（用于省略记号，如 no5 / no3 / no♭7） */
function degreeLabel(tplSymbol: string, interval: number): string {
  switch (interval) {
    case 0:
      return 'R'
    case 1:
      return '♭9'
    case 2:
      return tplSymbol.includes('sus2') ? '2' : '9'
    case 3:
      return tplSymbol.includes('#9') ? '♯9' : '3'
    case 4:
      return '3'
    case 5:
      return tplSymbol.includes('sus') ? '4' : '11'
    case 6:
      return tplSymbol.includes('#11') ? '♯11' : '5'
    case 7:
      return '5'
    case 8:
      return '5'
    case 9:
      if (tplSymbol.includes('dim7')) return '7'
      return tplSymbol.includes('6') ? '6' : '13'
    case 10:
      return '7'
    case 11:
      return '7'
    default:
      return String(interval)
  }
}

/**
 * 推断和弦。规则：覆盖更多实际按下的音级优先；和弦外的音与缺失的和弦音
 * 都扣分（缺根音更要命，所以 missing 罚分较重）；原位（根音 = 最低音）与
 * 常见和弦（大三/小三在前）额外加分。
 */
export function detectChord(midis: number[]): ChordResult | null {
  const pcs = Array.from(new Set(midis.map(m => ((m % 12) + 12) % 12))).sort((a, b) => a - b)
  if (pcs.length < 2) return null
  // 最低音 = 实际音高最低的音的音级（不能用音级排序后的第一个）
  const bassPc = ((Math.min(...midis) % 12) + 12) % 12

  let best: {
    root: number
    tpl: Template
    contained: number
    extra: number
    missing: number
    score: number
  } | null = null

  for (let root = 0; root < 12; root++) {
    for (const tpl of TEMPLATES) {
      const inSet = new Set(tpl.intervals)
      let contained = 0
      let extra = 0
      for (const pc of pcs) {
        const rel = (pc - root + 12) % 12
        if (inSet.has(rel)) contained++
        else extra++
      }
      if (contained === 0) continue
      const missing = tpl.intervals.length - contained
      const rootBonus = root === bassPc ? 500 : 0
      const score =
        contained * 1000 - extra * 300 - missing * 450 + rootBonus + tpl.bias
      if (best === null || score > best.score) {
        best = { root, tpl, contained, extra, missing, score }
      }
    }
  }

  if (best === null || best.contained < 2) return null
  const { root, tpl, extra, missing } = best

  // 缺失的和弦音 → 严谨省略记号（如 no5 / no3 / no9,no11）
  const playedRel = new Set(pcs.map(pc => (pc - root + 12) % 12))
  const missingDegrees = tpl.intervals
    .filter(i => !playedRel.has(i))
    .map(i => degreeLabel(tpl.symbol, i))
    .sort((a, b) => (DEGREE_ORDER[a] ?? 99) - (DEGREE_ORDER[b] ?? 99))

  // 转位：最低音不是根音时加斜杠
  const inversion = root !== bassPc
  const omit = missingDegrees.length > 0 ? `(no${missingDegrees.join(',')})` : ''
  const symbol =
    pcName(root) + tpl.symbol + omit + (inversion ? '/' + pcName(bassPc) : '')

  let intervalHint: string | null = null
  if (pcs.length === 2) {
    const dist = (pcs[1] - pcs[0] + 12) % 12
    if (dist !== 0) intervalHint = INTERVAL_CN[dist] ?? null
  }

  return {
    rootPc: root,
    bassPc,
    symbol,
    fullCn: PC_NAMES_CN[root] + tpl.cn + (inversion ? '（转位）' : ''),
    incomplete: missing > 0,
    missingDegrees,
    hasExtra: extra > 0,
    intervalHint,
  }
}
