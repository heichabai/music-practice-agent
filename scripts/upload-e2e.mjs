import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const imagePath = process.argv[2] ?? '/tmp/minuet.pdf.png'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()

const errors = []
page.on('pageerror', e => errors.push('[页面崩溃] ' + e.message))
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('favicon')) {
    errors.push('[控制台] ' + m.text())
  }
})

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.click('text=导入乐谱 / MIDI')
await page.waitForSelector('input[type=file]', { state: 'attached' })
// 第一个文件输入是 OMR 卡片（本地精确识别）
await page.locator('input[type=file]').first().setInputFiles(imagePath)
console.log('已通过 OMR 通道上传真实乐谱，等待识别…')

let outcome = '超时（4 分钟）'
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(3000)
  const body = (await page.textContent('body')) ?? ''
  if (body.includes('保存到曲库')) {
    const noteCount = (await page.locator('div.cursor-grab').count()) || 0
    outcome = `编辑器已打开，卷帘上 ${noteCount} 个音符`
    break
  }
  if (body.includes('没有识别出音符') || body.includes('所有页面都没有识别出')) {
    outcome = '报错：无音符'
    break
  }
  if (body.includes('识谱服务请求失败') || body.includes('网络请求失败')) {
    outcome = '报错：请求失败'
    break
  }
}

console.log('结果:', outcome)
console.log('页面错误:', errors.length === 0 ? '无' : '')
errors.slice(0, 5).forEach(e => console.log(' ', e))
await browser.close()
process.exit(errors.length > 0 || outcome.startsWith('报错') ? 1 : 0)
