import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })

const result = await page.evaluate(async () => {
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = 400
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1000, 400)
  ctx.fillStyle = '#000'
  ctx.font = '24px serif'
  ctx.fillText('Test Melody', 60, 60)
  ctx.fillText('4/4', 60, 140)
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(100, 180 + i * 20, 860, 2)
  }
  const pitches = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65]
  pitches.forEach((midi, i) => {
    const step = midi - 64
    const y = 260 - step * 10
    const x = 160 + i * 62
    ctx.beginPath()
    ctx.ellipse(x, y, 13, 9, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x + 11, y - 55, 2.5, 55)
  })
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  const mod = await import('/src/ai/sheetPrompts.ts')
  const res = await fetch('/api/zhipu/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'glm-4v-flash',
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
      max_tokens: 1024,
    }),
  })
  const data = await res.json()
  return {
    status: res.status,
    content: data.choices?.[0]?.message?.content ?? '',
    finish: data.choices?.[0]?.finish_reason ?? null,
    error: data.error ? JSON.stringify(data.error).slice(0, 200) : null,
  }
})

console.log('HTTP:', result.status, '| finish_reason:', result.finish)
if (result.error) console.log('API 错误:', result.error)
console.log('--- 返回前 600 字 ---')
console.log(result.content.slice(0, 600))
console.log('--- 返回后 200 字 ---')
console.log(result.content.slice(-200))
try {
  const parsed = JSON.parse(result.content)
  console.log('\n直接解析: OK, 音符数 =', parsed.notes?.length)
} catch {
  const objs = result.content.match(/\{[^{}]*\}/g) ?? []
  console.log('\n直接解析失败；可打捞对象数 =', objs.length)
}
await browser.close()
