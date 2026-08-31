import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { SessionReport } from '../src/game/report'
import type { ChatMessage } from '../src/ai/llmClient'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 手动加载 .env（避免额外依赖）
try {
  for (const line of readFileSync(join(root, '.env'), 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  // 无 .env 时忽略，下方会给出明确报错
}

const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
  console.error('缺少 DEEPSEEK_API_KEY，请检查 .env 文件')
  process.exit(1)
}

// 模拟一份"小星星·自由式"练习报告：命中 25/28，偏抢拍，G4 是老大难
const fakeReport: SessionReport = {
  songName: '小星星',
  mode: 'free',
  bpm: 96,
  total: 28,
  hits: 25,
  misses: 1,
  wrongPresses: 2,
  ghostPresses: 3,
  accuracy: 25 / 28,
  timingAvgBeats: -0.12,
  holdAvgRatio: 0.72,
  tooShortCount: 4,
  problemNotes: [
    { midi: 67, name: 'G4', count: 4, issues: ['抢拍', '时值不足'] },
    { midi: 60, name: 'C4', count: 2, issues: ['弹错'] },
    { midi: 65, name: 'F4', count: 1, issues: ['漏弹'] },
  ],
}

const fakeHistory = [
  '8月29日 自由式：命中率 71%，主要问题：G4、C4',
  '8月30日 自由式：命中率 82%，主要问题：G4',
  '命中率从 71% 变为 82%',
  '累计最常出问题的音：G4、C4、F4',
].join('\n')

async function call(messages: ChatMessage[], jsonMode = false): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content
}

const { buildReviewMessages, buildPlanMessages } = await import('../src/ai/coachPrompts')

console.log('=== 模拟练习数据 ===')
console.log(`小星星（自由式） 命中 25/28 抢拍 -75ms G4×4 C4×2 F4×1`)

console.log('\n[1/2] 请求教练复盘...')
try {
  const review = await call(buildReviewMessages(fakeReport, fakeHistory))
  console.log('\n----- 教练复盘 -----\n')
  console.log(review)
} catch (err) {
  console.error('复盘请求失败：', err)
  process.exit(1)
}

console.log('\n[2/2] 请求练习计划...')
try {
  const plan = await call(buildPlanMessages(fakeReport, fakeHistory), true)
  console.log('\n----- 练习计划（原始 JSON） -----\n')
  console.log(plan)
  try {
    JSON.parse(plan)
    console.log('\nJSON 校验：OK')
  } catch {
    console.log('\nJSON 校验：失败（模型未返回标准 JSON）')
  }
} catch (err) {
  console.error('计划请求失败：', err)
  process.exit(1)
}
