import http from 'node:http'
import { mkdtemp, mkdir, writeFile, readdir, rm, readFile } from 'node:fs/promises'
import { tmpdir, homedir } from 'node:os'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { musicxmlToSong } from './musicxml.mjs'
import { resolveEngines, IS_WIN } from './engines.mjs'
import { run, imageSize, resizeToPng, unzipTo } from './native-tools.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 引擎候选：项目内引擎目录（按平台）→ 开发机 ~/bin → 系统安装位置
const engines = resolveEngines([
  join(root, IS_WIN ? 'engine-locals-win' : 'engine-locals'),
  join(homedir(), 'bin'),
])
const AUDIVERIS = engines.audiveris
const REALESRGAN = engines.realesrgan
const REALESRGAN_MODELS = engines.realesrganModels
const PORT = Number(process.env.OMR_PORT ?? 5175)

// Audiveris 单张谱面有 2000 万像素硬上限（Too large image），留出余量
const MAX_PIXELS = 19_000_000

let queue = Promise.resolve()

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
  // 超分后仍偏小则补放大到引擎需要的分辨率
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

    // 栅格图片：小图（<1000px）AI 超分优先——比 bicubic 放大更能恢复谱线边缘
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
        await resizeToPng(originalPath, pngPath, target)
        firstPath = pngPath
      }
    }

    let song = null
    let failed = false
    try {
      song = await runAudiveris(firstPath, dir)
    } catch (err) {
      if (!isRaster) throw err
      console.error('[omr] 首轮识别失败:', err.stderr || err.message)
      failed = true
    }

    // 首轮失败或结果可疑（且是栅格图、原始尺寸在超分可救范围）→ AI 超分辨率后重试
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

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/omr')) {
    const name =
      decodeURIComponent(new URL(req.url, 'http://localhost').searchParams.get('name')) ??
      'score.pdf'
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      queue = queue
        .then(() => handleOmr(Buffer.concat(chunks), name))
        .then(song => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(song))
        })
        .catch(err => {
          const message = err.stderr || err.message || String(err)
          console.error('[omr] 失败:', message)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: friendlyError(message) }))
        })
    })
    return
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`OMR sidecard: http://localhost:${PORT}`)
  console.log(`Audiveris: ${AUDIVERIS ?? '未找到（请安装或设置 AUDIVERIS_BIN）'}`)
  console.log(`Real-ESRGAN: ${REALESRGAN ?? '未找到（超分救援不可用）'}`)
})
