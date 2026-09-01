import { readFileSync } from 'node:fs'

const model = process.argv[2] ?? 'qwen3.8-flash'
const thinking = process.argv[3] === '1'
const budget = Number(process.argv[4] ?? 4096)

const GROUND_TRUTH_16 = [74, 67, 69, 71, 72, 74, 67, 67, 76, 72, 74, 76, 78, 79, 67, 67]

const ts = readFileSync(new URL('../src/ai/sheetPrompts.ts', import.meta.url), 'utf8')
const prompt = ts.match(/SHEET_PROMPT = `([\s\S]*?)`/)[1]
const b64 = readFileSync('/tmp/minuet.pdf.png').toString('base64')
const key = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .match(/^DASHSCOPE_API_KEY=(.+)$/m)[1].trim()

const t0 = Date.now()
const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
  body: JSON.stringify({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 8192,
    ...(thinking ? { enable_thinking: true, thinking_budget: budget } : { enable_thinking: false }),
  }),
  signal: AbortSignal.timeout(480000),
})

const data = await res.json()
const content = data.choices?.[0]?.message?.content ?? ''
const reasoning = data.choices?.[0]?.message?.reasoning_content
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

if (!content) {
  console.log(`${model} thinking=${thinking}: HTTP ${res.status} | ${elapsed}s | 错误: ${JSON.stringify(data.error ?? data).slice(0, 150)}`)
  process.exit(1)
}

let notes = []
try {
  const j = JSON.parse(content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''))
  notes = j.notes ?? []
} catch {
  notes = [...content.matchAll(/\{[^{}]*\}/g)]
    .map(m => { try { return JSON.parse(m[0]) } catch { return null } })
    .filter(n => n && typeof n.midi === 'number')
}

const got16 = notes.slice(0, 16).map(n => n.midi)
let exact = 0
let near = 0
GROUND_TRUTH_16.forEach((g, i) => {
  if (got16[i] === g) exact++
  else if (got16[i - 1] === g || got16[i + 1] === g) near++
})
const thinkingLen = reasoning ? reasoning.length : 0
console.log(
  `${model} thinking=${thinking}${thinking ? `(budget${budget})` : ''} | ${elapsed}s | 总音数${notes.length} | 前16音准确 ${exact}/16，错位${near} | 思考${thinkingLen}字 | finish=${data.choices?.[0]?.finish_reason}`,
)
console.log('  模型输出:', got16.join(' '))
console.log('  标准答案:', GROUND_TRUTH_16.join(' '))
