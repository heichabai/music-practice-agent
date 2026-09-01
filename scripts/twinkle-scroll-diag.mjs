import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

// 小星星旋律（等待式要按的键序）
const KEYMAP = { 60: 'KeyA', 62: 'KeyS', 64: 'KeyD', 65: 'KeyF', 67: 'KeyG', 69: 'KeyH' }
const MELODY = [
  60, 60, 67, 67, 69, 69, 67,
  65, 65, 64, 64, 62, 62, 60,
  60, 60, 67, 67, 69, 69, 67,
  65, 65, 64, 64, 62, 62, 60,
]

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })

// 选小星星（内置第 2 首）并开始
await page.locator('ol button', { hasText: '小星星' }).click()
await page.waitForSelector('.score-strip .abcjs-note', { timeout: 8000 })
await page.waitForTimeout(2500) // 等待 lead-in 结束、第一个音进入等待

const sample = () =>
  page.evaluate(() => {
    const elems = Array.from(document.querySelectorAll('.score-strip .abcjs-note'))
    const idx = elems.findIndex(e => e.classList.contains('score-current'))
    const inner = document.querySelector('.score-strip div > div')
    return {
      高亮: idx,
      总数: elems.length,
      translate: inner?.style.transform || '(0)',
    }
  })

console.log('初始:', JSON.stringify(await sample()))
for (let i = 0; i < MELODY.length; i++) {
  await page.keyboard.press(KEYMAP[MELODY[i]])
  await page.waitForTimeout(350)
  const s = await sample()
  const expect = Math.min(i + 1, MELODY.length - 1)
  const ahead = s.高亮 - (i + 1)
  console.log(
    `按下第${i + 1}音(${MELODY[i]}) → 高亮=${s.高亮} 期望≤${expect}${ahead > 1 ? ' ←← 抢跑' + ahead + '个音!' : ''} ${s.translate}`,
  )
}
await browser.close()
