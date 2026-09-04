import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('mpa.gamification.v1', '')
  localStorage.setItem('mpa.tutorial.v1', JSON.stringify({ completed: [] }))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)

// 1. 游戏化状态栏可见
const gamifyBar = await page.locator('text=今日目标').count()
console.log(gamifyBar > 0 ? '✓' : '✗', '游戏化状态栏')

// 2. 等级显示
const level = await page.locator('text=Lv.0').count()
console.log(level > 0 ? '✓' : '✗', '初始等级 Lv.0')

// 3. 麦克风按钮存在（切到练习 tab）
await page.click('text=练习')
await page.waitForTimeout(400)
const micBtn = await page.locator('text=开启麦克风').count()
console.log(micBtn > 0 ? '✓' : '✗', '麦克风按钮')

// 4. 进入练习弹几个音 → XP 增长
await page.click('text=热身 · 五指练习')
await page.waitForSelector('.abcjs-note', { timeout: 8000 })
await page.waitForTimeout(2000)
await page.keyboard.press('KeyA')
await page.waitForTimeout(600)
await page.keyboard.press('KeyS')
await page.waitForTimeout(600)
const xpAfter = await page.evaluate(() => {
  const raw = localStorage.getItem('mpa.gamification.v1')
  return raw ? (JSON.parse(raw).xp ?? 0) : 0
})
console.log(xpAfter > 0 ? '✓' : '✗', `弹奏后 XP=${xpAfter}`)

// 5. 持久化
const stored = await page.evaluate(() => {
  const raw = localStorage.getItem('mpa.gamification.v1')
  return raw ? (JSON.parse(raw).totalNotes ?? 0) : -1
})
console.log(stored > 0 ? '✓' : '✗', `localStorage totalNotes=${stored}`)

console.log('错误:', errors.length === 0 ? '无' : errors[0])
await browser.close()
