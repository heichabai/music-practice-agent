import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const exe = execSync(
  "ls ~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google\\ Chrome\\ for\\ Testing.app/Contents/MacOS/Google\\ Chrome\\ for\\ Testing",
).toString().trim()

const browser = await chromium.launch({ executablePath: exe, headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })

// 代表性曲目：八分音符（符尾）、和弦、加线（低音 C3 / 高音 A5）、附点
const song = {
  id: 'clip-test',
  name: '裁剪测试',
  bpm: 96,
  notes: [
    { midi: 74, time: 0, duration: 0.5 },
    { midi: 67, time: 0.5, duration: 0.5 },
    { midi: 48, time: 1, duration: 0.5 },
    { midi: 71, time: 1.5, duration: 1.5 },
    { midi: 60, time: 3, duration: 0.5 },
    { midi: 64, time: 3, duration: 0.5 },
    { midi: 67, time: 3, duration: 0.5 },
    { midi: 81, time: 4, duration: 0.25 },
    { midi: 93, time: 4.25, duration: 0.25 },
    { midi: 38, time: 4.5, duration: 1 },
  ],
}

await page.evaluate(songData => {
  localStorage.setItem('mpa.customSongs.v1', JSON.stringify([{ ...songData, source: 'omr', createdAt: Date.now() }]))
}, song)
await page.reload({ waitUntil: 'domcontentloaded' })

// 在页面上直接做三种渲染，横向铺开截图
await page.evaluate(async songData => {
  const abcjs = (await import('/node_modules/.vite/deps/abcjs.js')).default
  const { songToAbc } = await import('/src/game/abcNotation.ts')
  const { abc } = songToAbc(songData)
  window.__abc = abc
  window.__abcjs = abcjs

  const mk = (label, configure) => {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'padding:8px;border:2px solid #888;margin:10px;background:#111'
    const title = document.createElement('div')
    title.textContent = label
    title.style.cssText = 'color:#fff;font-size:18px;padding:4px'
    const host = document.createElement('div')
    host.style.cssText = 'background:#111;height:auto;overflow:visible'
    wrap.appendChild(title)
    wrap.appendChild(host)
    document.body.appendChild(host.parentNode)
    return host
  }

  // A: 现行方案（staffwidth 大 + viewBox 自然尺寸）
  const hostA = mk('A-current')
  abcjs.renderAbc(hostA, abc, { add_classes: true, staffwidth: 4000, paddingleft: 0, paddingright: 0 })
  const svgA = hostA.querySelector('svg')
  const aw = parseFloat(svgA.getAttribute('width'))
  const ah = parseFloat(svgA.getAttribute('height'))
  svgA.setAttribute('viewBox', `0 0 ${aw} ${ah}`)
  svgA.style.width = '1100px'
  svgA.style.height = `${Math.round((1100 / aw) * ah)}px`

  // B: viewBox 垂直扩展 ±50
  const hostB = mk('B-expand-viewbox')
  abcjs.renderAbc(hostB, abc, { add_classes: true, staffwidth: 4000, paddingleft: 0, paddingright: 0 })
  const svgB = hostB.querySelector('svg')
  const bw = parseFloat(svgB.getAttribute('width'))
  const bh = parseFloat(svgB.getAttribute('height'))
  svgB.setAttribute('viewBox', `0 -50 ${bw} ${bh + 100}`)
  const scaleB = 160 / (bh + 100)
  svgB.style.width = `${Math.round(bw * scaleB)}px`
  svgB.style.height = '160px'

  // C: abcjs 官方 viewportHorizontal
  const hostC = mk('C-viewport-horizontal')
  abcjs.renderAbc(hostC, abc, {
    add_classes: true,
    viewportHorizontal: true,
    viewportWidth: 1100,
    paddingleft: 0,
    paddingright: 0,
  })
  const svgC = hostC.querySelector('svg')
  if (svgC) {
    svgC.style.height = '150px'
    svgC.style.width = 'auto'
  }
  window.__done = true
}, song)

await page.waitForFunction('window.__done === true')
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/score-variants.png', fullPage: true })

const heights = await page.evaluate(() =>
  Array.from(document.querySelectorAll('svg')).map(s => ({
    h: s.getAttribute('height'),
    vb: s.getAttribute('viewBox')?.slice(0, 40),
  })),
)
console.log('SVG 参数:', JSON.stringify(heights))
console.log('截图: /tmp/score-variants.png')
await browser.close()

// 通义当裁判
const b64 = readFileSync('/tmp/score-variants.png').toString('base64')
const key = readFileSync(
  new URL('../.env', import.meta.url),
  'utf8',
).match(/^DASHSCOPE_API_KEY=(.+)$/m)[1].trim()
const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
  body: JSON.stringify({
    model: 'qwen3.8-flash',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'data:image/png;base64,' + b64 } },
          {
            type: 'text',
            text: '截图里有三个深色块（A-current / B-expand-viewbox / C-viewport-horizontal），各渲染一行五线谱。请逐个评估：音符符干、符尾、加线是否完整（没有被上下裁剪）？最后用一行结论回答：哪个方案完整度最高。',
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 600,
    enable_thinking: false,
  }),
})
const data = await res.json()
console.log('--- 通义评审 ---')
console.log(data.choices?.[0]?.message?.content ?? JSON.stringify(data).slice(0, 400))
