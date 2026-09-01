import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

// 模拟 OMR 全声部导入的复杂曲目：和弦、长休止、0.25 精度、跨三个八度
const complexSong = {
  id: 'debug-complex',
  name: '复杂测试曲',
  bpm: 96,
  notes: [
    { midi: 74, time: 0, duration: 0.5 },
    { midi: 38, time: 0, duration: 4 },
    { midi: 67, time: 0.5, duration: 0.5 },
    { midi: 41, time: 4, duration: 2 },
    { midi: 76, time: 6.5, duration: 0.25 },
    { midi: 79, time: 12.75, duration: 1.5 },
    { midi: 55, time: 12.75, duration: 1.5 },
    { midi: 60, time: 12.75, duration: 1.5 },
    { midi: 93, time: 21, duration: 8 },
    { midi: 67, time: 29.25, duration: 0.25 },
  ],
}

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()

const errors = []
page.on('pageerror', e => errors.push('[页面崩溃] ' + e.message))
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('[控制台] ' + m.text())
})

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.evaluate(song => {
  localStorage.setItem('mpa.customSongs.v1', JSON.stringify([{ ...song, source: 'omr', createdAt: Date.now() }]))
}, complexSong)
await page.reload({ waitUntil: 'domcontentloaded' })

await page.click('text=复杂测试曲')
await page.waitForTimeout(2000)

const noteCount = await page.locator('.abcjs-note').count()
const svgBox = await page.locator('svg').filter({ has: page.locator('.abcjs-note') }).first().boundingBox()
console.log('复杂曲音符元素:', noteCount)
console.log('SVG 尺寸:', svgBox ? `${Math.round(svgBox.width)}x${Math.round(svgBox.height)}px` : '未渲染')
console.log('错误:', errors.length === 0 ? '无' : '')
errors.slice(0, 3).forEach(e => console.log(' ', e))
await browser.close()
