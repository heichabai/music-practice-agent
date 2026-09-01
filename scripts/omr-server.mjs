import http from 'node:http'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readdir, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { musicxmlToSong } from './musicxml.mjs'

const AUDIVERIS =
  process.env.AUDIVERIS_BIN ??
  `${process.env.HOME}/bin/Audiveris.app/Contents/MacOS/Audiveris`
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

async function handleOmr(bytes, fileName) {
  const dir = await mkdtemp(join(tmpdir(), 'omr-'))
  try {
    const ext = extname(fileName).toLowerCase() || '.pdf'
    let inputPath = join(dir, `input${ext}`)
    await writeFile(inputPath, bytes)

    // 栅格图片：统一转 PNG 去 JPEG 伪影；分辨率不足自动放大（Audiveris 需要约 300DPI）
    if (/\.(jpe?g|png|gif|bmp|tiff?)$/i.test(ext)) {
      const info = await run('sips', ['-g', 'pixelHeight', inputPath])
      const h = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0)
      let target = h
      if (h > 0 && h < 2800) target = Math.min(4 * h, 3000)
      const pngPath = join(dir, 'input-hq.png')
      await run('sips', [
        '-s', 'format', 'png',
        '--resampleHeight', String(Math.max(h, target)),
        inputPath, '--out', pngPath,
      ])
      inputPath = pngPath
    }

    const outDir = join(dir, 'out')
    await mkdir(outDir, { recursive: true })
    await run(AUDIVERIS, ['-batch', '-transcribe', '-export', '-output', outDir, '--', inputPath])
    const mxlFiles = (await readdir(outDir)).filter(f => f.endsWith('.mxl'))
    if (mxlFiles.length === 0) {
      throw new Error('OMR 引擎没有产出乐谱（图片可能不够清晰或不是标准五线谱）')
    }
    const xmlDir = join(dir, 'xml')
    await run('unzip', ['-o', join(outDir, mxlFiles[0]), '-d', xmlDir])
    const xmlFiles = (await readdir(xmlDir)).filter(
      f => f.endsWith('.xml') && !f.startsWith('META'),
    )
    if (xmlFiles.length === 0) throw new Error('MusicXML 包内容异常')
    const xml = await readFile(join(xmlDir, xmlFiles[0]), 'utf8')
    return musicxmlToSong(xml, fileName.replace(/\.[^.]+$/, ''))
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
})
