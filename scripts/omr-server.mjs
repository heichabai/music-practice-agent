import http from 'node:http'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readdir, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { musicxmlToSong } from './musicxml.mjs'

const AUDIVERIS =
  process.env.AUDIVERIS_BIN ??
  `${process.env.HOME}/bin/Audiveris.app/Contents/MacOS/Audiveris`
const REALESRGAN =
  process.env.REALESRGAN_BIN ?? `${process.env.HOME}/bin/realesrgan/realesrgan-ncnn-vulkan`
const REALESRGAN_MODELS =
  process.env.REALESRGAN_MODELS ?? `${process.env.HOME}/bin/realesrgan/models`
const PORT = Number(process.env.OMR_PORT ?? 5175)

let queue = Promise.resolve()

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { timeout: 300000, maxBuffer: 16 * 1024 * 1024, ...opts },
      (err, stdout, stderr) => {
        if (err) {
          err.stderr = String(stderr).slice(-500)
          reject(err)
        } else {
          resolve(stdout)
        }
      },
    )
  })
}

function friendlyError(message) {
  if (/interline|resolution is too low/i.test(message)) {
    return '图片分辨率过低，识别不了谱线（请换更清晰/更大的图片，或直接用 PDF）'
  }
  if (/no multi-line staves/i.test(message)) {
    return '图中没有检测到五线谱（请确认是标准五线谱图片）'
  }
  return message || 'OMR 识别失败'
}

function isLowQuality(song) {
  const uniquePitches = new Set(song.notes.map(n => n.midi)).size
  return song.notes.length < 10 || uniquePitches < 4
}

async function runAudiveris(inputPath, parentDir) {
  const stamp = Math.random().toString(36).slice(2, 6)
  const outDir = join(parentDir, `out-${stamp}`)
  await mkdir(outDir, { recursive: true })
  await run(AUDIVERIS, ['-batch', '-transcribe', '-export', '-output', outDir, '--', inputPath])
  const mxlFiles = (await readdir(outDir)).filter(f => f.endsWith('.mxl'))
  if (mxlFiles.length === 0) {
    throw new Error('NO_OUTPUT')
  }
  const xmlDir = join(parentDir, `xml-${stamp}`)
  await run('unzip', ['-o', join(outDir, mxlFiles[0]), '-d', xmlDir])
  const xmlFiles = (await readdir(xmlDir)).filter(
    f => f.endsWith('.xml') && !f.startsWith('META'),
  )
  if (xmlFiles.length === 0) throw new Error('NO_OUTPUT')
  const xml = await readFile(join(xmlDir, xmlFiles[0]), 'utf8')
  return musicxmlToSong(xml, 'score')
}

async function superResolve(inputPath, parentDir) {
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
  const info = await run('sips', ['-g', 'pixelHeight', outPath])
  const h = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0)
  if (h > 0 && h < 2800) {
    const upPath = join(parentDir, 'sr-up.png')
    await run('sips', ['-s', 'format', 'png', '--resampleHeight', '2800', outPath, '--out', upPath])
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
      const info = await run('sips', ['-g', 'pixelHeight', originalPath])
      const h = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0)
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
        const pngPath = join(dir, 'input-hq.png')
        await run('sips', [
          '-s', 'format', 'png',
          '--resampleHeight', String(Math.max(h, target)),
          originalPath, '--out', pngPath,
        ])
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

    // 首轮失败或结果可疑（且是栅格图、原始尺寸在超分可救范围）→ AI 超分辨率后重试
    const srEligible = isRaster && (failed || (song !== null && isLowQuality(song)))
    if (srEligible) {
      const info = await run('sips', ['-g', 'pixelHeight', originalPath])
      const h = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0)
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
  console.log(`Audiveris: ${AUDIVERIS}`)
  console.log(`Real-ESRGAN: ${REALESRGAN}`)
})
