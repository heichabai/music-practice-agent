import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push('[崩溃] ' + e.message))
page.on('console', m => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('[控制台] ' + m.text())
})

const results = []
const check = (name, ok) => {
  results.push(`${ok ? '✓' : '✗'} ${name}`)
  if (!ok) process.exitCode = 1
}

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.setItem('mpa.tutorial.v1', JSON.stringify({ completed: [] })))
await page.waitForTimeout(1000)

// 1. 双 tab 存在且默认学习
check('双 tab 存在', (await page.locator('button', { hasText: '学习' }).count()) > 0)
check('默认学习 tab 显示课程列表', (await page.locator('text=认识键盘').count()) > 0)

// 2. 打开第 1 课
await page.click('text=认识键盘')
await page.waitForSelector('text=Step 1 / 4', { timeout: 5000 })
check('第 1 课打开（4 个步骤）', true)

// 3. 步骤翻页
await page.click('text=下一步')
await page.waitForTimeout(300)
check('翻到第 2 步', (await page.locator('text=Step 2 / 4').count()) > 0)

// 4. 回到步骤 1，完成互动任务（按 C：电脑键盘 A=60）
await page.click('text=上一步')
await page.waitForTimeout(200)
await page.keyboard.press('KeyA')
await page.waitForTimeout(600)
check('互动任务按键验证（按 C4 → 完成）', (await page.locator('text=完成！做得好').count()) > 0)

// 5. 完成本课（无测验课，任务完成即可）
await page.click('text=完成本课')
await page.waitForTimeout(400)
check('完成本课标记', (await page.locator('text=本课已完成').count()) > 0)

// 6. 下一课按钮出现并跳转
await page.click('text=下一课')
await page.waitForTimeout(500)
check('跳转第 2 课', (await page.locator('text=五线谱入门').first().isVisible()))

// 7. AI 答疑（真实调用）
await page.fill('input[placeholder*="为什么"]', '五线谱为什么要五条线？')
await page.click('text=提问')
await page.waitForSelector('text=五条', { timeout: 30000 })
const tutorAnswer = await page.locator('.glass .text-secondary').last().textContent()
check('AI 答疑返回回答', tutorAnswer !== null && tutorAnswer.length > 20)

// 8. 课后练习闭环（第 2 课无 practiceSong，切第 3 课验证）
await page.goBack().catch(() => {})
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(600)
await page.click('text=认识键盘')
await page.waitForSelector('text=Step 1 / 4', { timeout: 5000 })
await page.click('text=第三课', { timeout: 2000 }).catch(() => {})
// 从课程列表进入第 3 课
await page.click('text=‹ 课程')
await page.waitForTimeout(400)
await page.click('text=右手五指')
await page.waitForSelector('text=开始课后练习', { timeout: 5000 })
check('第 3 课显示课后练习按钮', true)

// 9. 开始课后练习 → 进入练习页 → HUD 显示课程曲名
await page.click('text=开始课后练习')
await page.waitForTimeout(2500)
const hudText = await page.evaluate(() => document.body.textContent ?? '')
check('进入课后练习（热身曲）', hudText.includes('热身'))

// 10. 退出到选曲 → 进度持久化检查
const stored = await page.evaluate(() => localStorage.getItem('mpa.tutorial.v1') ?? '')
check('教程进度已持久化', stored.includes('l1-keyboard'))

console.log(results.join('\n'))
console.log('错误:', errors.length === 0 ? '无' : errors[0])
await browser.close()
