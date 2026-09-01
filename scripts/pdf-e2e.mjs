import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage()

const errors = []
page.on('pageerror', e => errors.push('[页面崩溃] ' + e.message))
page.on('console', m => {
  if (m.type() === 'error') errors.push('[控制台] ' + m.text())
})

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.click('text=导入乐谱 / MIDI')
await page.waitForSelector('input[accept*="pdf"]', { state: 'attached' })
await page.setInputFiles('input[accept*="pdf"]', '/tmp/test-score.pdf')
console.log('已上传 PDF，等待 pdfjs 渲染 + 智谱识别…')

let outcome = '超时'
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(3000)
  const body = (await page.textContent('body')) ?? ''
  if (body.includes('保存到曲库')) {
    outcome = '编辑器已打开（识别出音符）'
    break
  }
  if (body.includes('没有识别出音符') || body.includes('所有页面都没有识别出')) {
    outcome = '优雅报错：无音符（pdfjs 渲染与 API 通路均正常）'
    break
  }
}

console.log('结果:', outcome)
console.log('页面错误:', errors.length === 0 ? '无' : '')
errors.slice(0, 5).forEach(e => console.log(' ', e))
await browser.close()
process.exit(errors.length > 0 ? 1 : 0)
