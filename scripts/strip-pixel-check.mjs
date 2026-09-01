import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

// 用与用户一致的真实曲目数据（同源 OMR 结果近似：全音域 + 和弦 + 密集八分音符）
const song = {
  id: 'px-test',
  name: '像素验收曲',
  bpm: 96,
  notes: [],
}
for (let i = 0; i < 60; i++) {
  song.notes.push({ midi: 60 + ((i * 5) % 25), time: i * 0.5, duration: 0.5 })
}
song.notes.push(
  { midi: 38, time: 0, duration: 2 },
  { midi: 93, time: 4, duration: 2 },
  { midi: 48, time: 8, duration: 1 },
  { midi: 55, time: 8, duration: 1 },
  { midi: 67, time: 8, duration: 1 },
)

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.evaluate(s => {
  localStorage.setItem('mpa.customSongs.v1', JSON.stringify([{ ...s, source: 'omr', createdAt: Date.now() }]))
}, song)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.locator('li button').first().click()
await page.waitForSelector('.abcjs-note', { timeout: 8000 })
await page.waitForTimeout(1200) // 等字体与二次测量

const vb = await page.evaluate(() => ({
  viewBox: document.querySelector('.score-strip svg')?.getAttribute('viewBox'),
  par: document.querySelector('.score-strip svg')?.getAttribute('preserveAspectRatio'),
}))
console.log('viewBox:', vb.viewBox, '| preserveAspectRatio:', vb.par)

await page.locator('.score-strip').screenshot({ path: '/tmp/strip.png' })
execSync('sips -s format bmp /tmp/strip.png --out /tmp/strip.bmp >/dev/null 2>&1')

// 解析 BMP：检测最底部 4 行像素中"非背景墨迹"占比（音符贴边=被裁剪）
const bmp = readFileSync('/tmp/strip.bmp')
const dataOffset = bmp.readUInt32LE(10)
const width = bmp.readUInt32LE(18)
const height = bmp.readUInt32LE(22)
const bpp = bmp.readUInt16LE(28)
const rowSize = Math.ceil((width * bpp) / 32) * 4

function rowInk(yFromBottom) {
  const y = height - 1 - yFromBottom
  let ink = 0
  for (let x = 0; x < width; x++) {
    const o = dataOffset + y * rowSize + x * (bpp / 8)
    const b = bmp[o]
    const g = bmp[o + 1]
    const r = bmp[o + 2]
    // 背景 ~#16161a；谱面墨迹为浅灰 #d4d4dc —— 亮度高于阈值记为墨
    if (r + g + b > 240) ink++
  }
  return ink / width
}

const rows = [1, 2, 3, 4].map(n => `底部第${n}行墨迹 ${(rowInk(n) * 100).toFixed(1)}%`)
const cut = [1, 2].some(n => rowInk(n) > 0.02)
console.log(rows.join(' | '))
console.log(cut ? '❌ 音符贴边被裁' : '✅ 底部无贴边墨迹，无裁剪')
await browser.close()
process.exit(cut ? 1 : 0)
