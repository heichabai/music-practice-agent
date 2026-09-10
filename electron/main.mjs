import { app, BrowserWindow, session, net } from 'electron'
import http from 'node:http'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile, readdir, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir, homedir } from 'node:os'
import { musicxmlToSong } from '../scripts/musicxml.mjs'
import { resolveEngines, IS_WIN } from '../scripts/engines.mjs'
import { run, imageSize, resizeToPng, unzipTo } from '../scripts/native-tools.mjs'
import { loadConfig } from './config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.d.ts': 'text/plain',
}

// 引擎候选：打包资源（resources/engine）→ 项目内引擎目录（按平台）→ 开发机 ~/bin → 系统安装位置
const engineRoots = []
if (app.isPackaged) engineRoots.push(join(process.resourcesPath, 'engine'))
engineRoots.push(join(__dirname, '..', IS_WIN ? 'engine-locals-win' : 'engine-locals'))
engineRoots.push(join(homedir(), 'bin'))
const engines = resolveEngines(engineRoots)
const AUDIVERIS = engines.audiveris
const REALESRGAN = engines.realesrgan
const REALESRGAN_MODELS = engines.realesrganModels

// Audiveris 单张谱面有 2000 万像素硬上限（Too large image），留出余量
const MAX_PIXELS = 19_000_000

const DIST_ROOT = app.isPackaged
  ? join(app.getAppPath(), 'dist')
  : join(app.getAppPath(), 'dist')

const cfg = loadConfig(app.isPackaged, app.getPath('userData'))

function visionUpstream() {
  const provider = cfg.VISION_PROVIDER ?? 'zhipu'
  if (provider === 'gemini') {
    return {
      target: 'https://generativelanguage.googleapis.com',
      pathBase: '/v1beta/openai',
      key: cfg.GEMINI_API_KEY,
    }
  }
  if (provider === 'dashscope') {
    return {
      target: 'https://dashscope.aliyuncs.com',
      pathBase: '/compatible-mode/v1',
      key: cfg.DASHSCOPE_API_KEY,
    }
  }
  return {
    target: 'https://open.bigmodel.cn',
    pathBase: '/api/paas/v4',
    key: cfg.ZHIPU_API_KEY,
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function friendlyError(message) {
  if (/interline|resolution is too low/i.test(message)) {
    return '图片分辨率过低，识别不了谱线（请换更清晰/更大的图片，或直接用 PDF）'
  }
  if (/no multi-line staves/i.test(message)) {
    return '图中没有检测到五线谱（请确认是标准五线谱图片）'
  }
  if (/too large image/i.test(message)) {
    return '图片尺寸超出识别引擎上限（请适当缩小图片后再试）'
  }
  if (/ENOENT|not found|不是内部或外部命令/i.test(message)) {
    return '未找到 OMR 引擎（Audiveris），请先安装或配置 AUDIVERIS_BIN 环境变量'
  }
  return message || 'OMR 识别失败'
}

function isLowQuality(song) {
  const uniquePitches = new Set(song.notes.map(n => n.midi)).size
  return song.notes.length < 10 || uniquePitches < 4
}

async function runAudiveris(inputPath, parentDir) {
  if (!AUDIVERIS) throw new Error('Audiveris not found (set AUDIVERIS_BIN)')
  const stamp = Math.random().toString(36).slice(2, 6)
  const outDir = join(parentDir, `out-${stamp}`)
  await mkdir(outDir, { recursive: true })
  await run(AUDIVERIS, ['-batch', '-transcribe', '-export', '-output', outDir, '--', inputPath])
  const mxlFiles = (await readdir(outDir)).filter(f => f.endsWith('.mxl'))
  if (mxlFiles.length === 0) {
    throw new Error('NO_OUTPUT')
  }
  const xmlDir = join(parentDir, `xml-${stamp}`)
  await unzipTo(join(outDir, mxlFiles[0]), xmlDir)
  const xmlFiles = (await readdir(xmlDir)).filter(
    f => f.endsWith('.xml') && !f.startsWith('META'),
  )
  if (xmlFiles.length === 0) throw new Error('NO_OUTPUT')
  const xml = await readFile(join(xmlDir, xmlFiles[0]), 'utf8')
  return musicxmlToSong(xml, 'score')
}

async function superResolve(inputPath, parentDir) {
  if (!REALESRGAN) throw new Error('Real-ESRGAN not found (set REALESRGAN_BIN)')
  const outPath = join(parentDir, 'sr.png')
  const args = [
    '-i', inputPath, '-o', outPath,
    '-n', 'realesrgan-x4plus', '-s', '4',
    '-m', REALESRGAN_MODELS,
  ]
  try {
    await run(REALESRGAN, args)
  } catch (err) {
    if (/vulkan|gpu|device/i.test(err.stderr ?? '')) {
      await run(REALESRGAN, [...args, '-g', 'cpu'])
    } else {
      throw err
    }
  }
  const { h } = await imageSize(outPath)
  if (h > 0 && h < 2800) {
    const upPath = join(parentDir, 'sr-up.png')
    await resizeToPng(outPath, upPath, 2800)
    return upPath
  }
  return outPath
}

async function handleOmr(bytes, fileName) {
  const dir = await mkdtemp(join(tmpdir(), 'omr-'))
  try {
    const ext = extname(fileName).toLowerCase() || '.pdf'
    const originalPath = join(dir, `input${ext}`)
    await writeFile(originalPath, bytes)
    const isRaster = /\.(jpe?g|png|gif|bmp|tiff?)$/i.test(ext)

    let firstPath = originalPath
    if (isRaster) {
      const { w, h } = await imageSize(originalPath)
      if (h > 0 && h < 1000) {
        try {
          firstPath = await superResolve(originalPath, dir)
        } catch {
          // 超分失败退回普通放大
        }
      }
      if (firstPath === originalPath) {
        let target = h
        if (h > 0 && h < 2800) target = Math.min(4 * h, 3000)
        // 超过引擎像素上限的大图等比缩小，否则会被直接拒收
        if (w > 0 && h > 0 && w * h > MAX_PIXELS) {
          target = Math.floor(h * Math.sqrt(MAX_PIXELS / (w * h)))
        }
        const pngPath = join(dir, 'input-hq.png')
        await resizeToPng(originalPath, pngPath, Math.max(h, target))
        firstPath = pngPath
      }
    }

    let song = null
    let failed = false
    try {
      song = await runAudiveris(firstPath, dir)
    } catch (err) {
      if (!isRaster) throw err
      failed = true
    }

    const srEligible = isRaster && (failed || (song !== null && isLowQuality(song)))
    if (srEligible) {
      const { h } = await imageSize(originalPath)
      if (h > 0 && h < 2200) {
        const srPath = await superResolve(originalPath, dir)
        try {
          const song2 = await runAudiveris(srPath, dir)
          if (!isLowQuality(song2)) return song2
          if (song === null || song2.notes.length > song.notes.length) song = song2
        } catch {
          // 超分后仍失败，沿用首轮结果
        }
      }
    }

    if (song === null) {
      throw new Error(friendlyError('OMR 引擎没有产出乐谱（图片可能不够清晰或不是标准五线谱）'))
    }
    if (isLowQuality(song)) {
      return { ...song, lowQuality: true }
    }
    return song
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (req.method === 'POST' && url.pathname.startsWith('/api/omr')) {
      const name = decodeURIComponent(url.searchParams.get('name') ?? 'score.pdf')
      try {
        const song = await handleOmr(await readBody(req), name)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(song))
      } catch (err) {
        const message = err.stderr || err.message || String(err)
        console.error('[omr] 失败:', message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: friendlyError(message) }))
      }
      return
    }

    // AI 通道：主进程用 Chromium 网络栈转发（走系统代理，无 CORS）
    const aiRoutes = [
      { prefix: '/api/deepseek', target: 'https://api.deepseek.com', pathBase: '', key: cfg.DEEPSEEK_API_KEY },
      { prefix: '/api/vision', ...visionUpstream() },
    ]
    for (const route of aiRoutes) {
      if (req.method === 'POST' && url.pathname.startsWith(route.prefix)) {
        const body = await readBody(req)
        const upstreamPath = route.pathBase + url.pathname.slice(route.prefix.length)
        const headers = { 'Content-Type': 'application/json' }
        if (route.key) headers.Authorization = `Bearer ${route.key}`
        try {
          const upstream = await net.fetch(route.target + upstreamPath + url.search, {
            method: 'POST',
            headers,
            body,
          })
          const text = await upstream.text()
          res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
          res.end(text)
        } catch (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `上游请求失败：${String(err)}` }))
        }
        return
      }
    }

    // 静态资源（dist）
    let filePath = url.pathname === '/' ? '/index.html' : url.pathname
    filePath = filePath.replace(/\.\./g, '')
    const localPath = join(DIST_ROOT, filePath)
    if (!localPath.startsWith(DIST_ROOT)) {
      res.writeHead(403)
      res.end()
      return
    }
    try {
      const data = await readFile(localPath)
      res.writeHead(200, {
        'Content-Type': MIME[extname(localPath).toLowerCase()] ?? 'application/octet-stream',
      })
      res.end(data)
    } catch {
      res.writeHead(404)
      res.end('Not Found')
    }
  })
}

async function main() {
  // Electron 默认不启用 Chromium 的 Web MIDI 特性，需显式开启，
  // 否则渲染进程 navigator.requestMIDIAccess 不可用，MIDI 键盘无法识别
  app.commandLine.appendSwitch('enable-features', 'WebMIDI')

  const server = createServer()
  const port = Number(process.env.ELECTRON_APP_PORT ?? 0)
  await new Promise(resolve => {
    server.listen(port, '127.0.0.1', resolve)
  })
  const address = server.address()
  const actualPort = typeof address === 'object' && address !== null ? address.port : port
  console.log(`[desktop] 服务就绪: http://127.0.0.1:${actualPort}`)
  console.log(`[desktop] Audiveris: ${AUDIVERIS ?? '未找到（请安装或设置 AUDIVERIS_BIN）'}`)
  console.log(`[desktop] Real-ESRGAN: ${REALESRGAN ?? '未找到（超分救援不可用）'}`)

  await app.whenReady()

  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(true)
  })

  const win = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: '琴键陪练 Agent',
    backgroundColor: '#0a0a0b',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.setMenuBarVisibility(false)
  await win.loadURL(`http://127.0.0.1:${actualPort}/`)
}

app.on('window-all-closed', () => {
  app.quit()
})

void main()
