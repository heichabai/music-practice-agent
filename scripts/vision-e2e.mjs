import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const imagePath = process.argv[2] ?? '/tmp/minuet.pdf.png'
const model = process.argv[3] ?? 'glm-4v-flash'
const maxTokens = Number(process.argv[4] ?? 1024)
const apiPath = process.argv[5] ?? '/api/zhipu/chat/completions'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const dataUrl = 'data:image/png;base64,' + readFileSync(imagePath).toString('base64')

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })

const result = await page.evaluate(
  async ({ dataUrl, model, maxTokens, apiPath }) => {
    const mod = await import('/src/ai/sheetPrompts.ts')
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUrl } },
              { type: 'text', text: mod.SHEET_PROMPT },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: maxTokens,
      }),
    })
    const data = await res.json()
    return {
      status: res.status,
      content: data.choices?.[0]?.message?.content ?? '',
      finish: data.choices?.[0]?.finish_reason ?? null,
      error: data.error ? JSON.stringify(data.error).slice(0, 200) : null,
    }
  },
  { dataUrl, model, maxTokens, apiPath },
)

console.log(`模型: ${model} | HTTP: ${result.status} | finish_reason: ${result.finish}`)
if (result.error) {
  console.log('API 错误:', result.error)
  await browser.close()
  process.exit(1)
}
console.log('--- 原始返回（前 500 字）---')
console.log(result.content.slice(0, 500))
console.log('--- 后 100 字 ---')
console.log(result.content.slice(-100))

try {
  const parsed = JSON.parse(result.content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''))
  console.log(`\n解析: OK | 音符数: ${parsed.notes?.length} | bpm: ${parsed.bpm} | name: ${parsed.name}`)
  console.log('前 10 音:', (parsed.notes ?? []).slice(0, 10).map(n => `${n.midi}@${n.time}`).join(' '))
} catch {
  const objs = result.content.match(/\{[^{}]*\}/g) ?? []
  console.log(`\n直接解析失败 | 可打捞对象: ${objs.length}`)
}
await browser.close()
