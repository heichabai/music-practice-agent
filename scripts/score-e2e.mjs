import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const song = {
  id: 'e2e-song',
  name: 'E2E测试曲',
  bpm: 96,
  source: 'omr',
  createdAt: Date.now(),
  imageDataUrl: PIXEL_PNG,
  notes: [
    { midi: 60, time: 0, duration: 1 },
    { midi: 62, time: 1, duration: 1 },
    { midi: 64, time: 2, duration: 1 },
    { midi: 65, time: 3, duration: 1 },
  ],
}

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('[崩溃] ' + e.message))
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('[控制台] ' + m.text())
})

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.evaluate(s => {
  localStorage.setItem('mpa.customSongs.v1', JSON.stringify([s]))
}, song)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.click('text=E2E测试曲')
await page.waitForSelector('.abcjs-note', { timeout: 8000 })

const notationFirst = (await page.locator('.abcjs-note').count()) > 0
console.log('有原图的曲目默认显示五线谱:', notationFirst ? '是' : '否')

await page.click('text=原图')
await page.waitForTimeout(300)
const imgVisible = await page.locator('img').first().isVisible()
await page.click('text=五线谱')
await page.waitForTimeout(300)
const backToNotation = (await page.locator('.abcjs-note').count()) > 0
console.log('原图切换:', imgVisible ? '显示' : '失败', '| 切回五线谱:', backToNotation ? '正常' : '失败')

const stripBg = await page.evaluate(() => {
  const el = document.querySelector('.score-strip')
  return el ? getComputedStyle(el).backgroundColor : 'missing'
})
console.log('谱面条背景:', stripBg, stripBg.includes('255, 255, 255') ? '（白底，不融合!）' : '（暗色）')

await page.click('button[aria-label="关闭乐谱条"]')
await page.waitForTimeout(300)
console.log('关闭:', (await page.locator('.abcjs-note').count()) === 0 ? '生效' : '失败')
console.log('错误:', errors.length === 0 ? '无' : errors[0])
await browser.close()
process.exit(errors.length > 0 || !notationFirst ? 1 : 0)
