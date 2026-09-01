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

async function handleOmr(bytes, fileName) {
  const dir = await mkdtemp(join(tmpdir(), 'omr-'))
  try {
    const ext = extname(fileName).toLowerCase() || '.pdf'
    const inputPath = join(dir, `input${ext}`)
    await writeFile(inputPath, bytes)
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
          console.error('[omr] 失败:', err.message)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.stderr || err.message || String(err) }))
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
