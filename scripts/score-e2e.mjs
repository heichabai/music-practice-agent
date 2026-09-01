import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()

const errors = []
page.on('pageerror', e => errors.push('[崩溃] ' + e.message))
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('[控制台] ' + m.text())
})

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.click('text=开始练习')
await page.waitForSelector('.abcjs-note', { timeout: 8000 })

const svg = page.locator('svg').filter({ has: page.locator('.abcjs-note') }).first()
const box = await svg.boundingBox()
console.log(
  '谱面条 SVG:',
  box ? `${Math.round(box.width)}x${Math.round(box.height)}px（单行宽条=${box.width > 600 && box.height < 160}）` : '未渲染',
)
console.log('音符元素:', await page.locator('.abcjs-note').count())

await page.click('button[aria-label="关闭乐谱条"]')
await page.waitForTimeout(300)
const closed = (await page.locator('.abcjs-note').count()) === 0
console.log('关闭按钮:', closed ? '生效（谱面条已隐藏）' : '未生效')
console.log('页面错误:', errors.length === 0 ? '无' : '')
errors.slice(0, 3).forEach(e => console.log(' ', e))
await browser.close()
process.exit(errors.length > 0 || !closed ? 1 : 0)
