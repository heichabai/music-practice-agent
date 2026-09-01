import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()

const errors = []
const pianoRequests = []
page.on('pageerror', e => errors.push('[崩溃] ' + e.message))
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('[控制台] ' + m.text())
})
page.on('response', r => {
  if (r.url().includes('/piano/')) pianoRequests.push(`${r.url().split('/').pop()} → ${r.status()}`)
})

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.click('text=开始练习')
await page.waitForSelector('.score-svg svg', { timeout: 8000 })

const noteCount = await page.locator('.abcjs-note').count()
const panelVisible = await page.locator('.score-svg svg').isVisible()
console.log('悬浮谱面板:', panelVisible ? '显示' : '隐藏', '| 渲染音符元素:', noteCount)
console.log('钢琴采样请求:', pianoRequests.length > 0 ? pianoRequests.slice(0, 3).join(' | ') : '（等待中）')
console.log('页面错误:', errors.length === 0 ? '无' : '')
errors.slice(0, 5).forEach(e => console.log(' ', e))
await browser.close()
process.exit(errors.length > 0 ? 1 : 0)
