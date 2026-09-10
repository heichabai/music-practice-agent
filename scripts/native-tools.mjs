/**
 * 跨平台系统工具封装：
 * - 图片尺寸读取 / 等比缩放并转 PNG：macOS 用 sips，Windows 用 PowerShell System.Drawing，Linux 用 ImageMagick
 * - zip 解压：macOS/Linux 用 unzip，Windows 用 PowerShell ZipFile（不要求 .zip 扩展名）
 * PowerShell 走 -EncodedCommand（UTF-16LE），中文/空格路径安全。
 */
import { execFile } from 'node:child_process'
import { platform } from 'node:os'

const IS_WIN = platform() === 'win32'
const IS_MAC = platform() === 'darwin'

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { timeout: 300000, maxBuffer: 16 * 1024 * 1024, windowsHide: true, ...opts },
      (err, stdout, stderr) => {
        if (err) {
          err.stderr = String(stderr).slice(-500)
          reject(err)
        } else {
          resolve(String(stdout))
        }
      },
    )
  })
}

const psQuote = s => `'${String(s).replace(/'/g, "''")}'`

function powershell(script) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  return run('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded])
}

/** 读取图片宽高；失败返回 { w: 0, h: 0 } */
export async function imageSize(path) {
  try {
    if (IS_WIN) {
      const out = await powershell(`
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile(${psQuote(path)})
        Write-Output ("{0} {1}" -f $img.Width, $img.Height)
        $img.Dispose()
      `)
      const m = out.match(/(\d+)\s+(\d+)/)
      return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 0, h: 0 }
    }
    if (IS_MAC) {
      const info = await run('sips', ['-g', 'pixelHeight', '-g', 'pixelWidth', path])
      const h = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0)
      const w = Number(info.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0)
      return { w, h }
    }
    const out = await run('identify', ['-format', '%w %h', path])
    const m = out.match(/(\d+)\s+(\d+)/)
    return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 0, h: 0 }
  } catch {
    return { w: 0, h: 0 }
  }
}

/** 等比缩放到指定高度并输出 PNG；返回输出路径 */
export async function resizeToPng(src, dest, targetHeight) {
  const h = Math.max(1, Math.round(targetHeight))
  if (IS_WIN) {
    await powershell(`
      Add-Type -AssemblyName System.Drawing
      $src = [System.Drawing.Image]::FromFile(${psQuote(src)})
      $h = ${h}
      $w = [Math]::Max(1, [Math]::Round($src.Width * $h / $src.Height))
      $bmp = New-Object System.Drawing.Bitmap($w, $h)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($src, 0, 0, $w, $h)
      $bmp.Save(${psQuote(dest)}, [System.Drawing.Imaging.ImageFormat]::Png)
      $g.Dispose(); $bmp.Dispose(); $src.Dispose()
    `)
    return dest
  }
  if (IS_MAC) {
    await run('sips', [
      '-s', 'format', 'png',
      '--resampleHeight', String(h),
      src, '--out', dest,
    ])
    return dest
  }
  await run('convert', [src, '-resize', `x${h}`, dest])
  return dest
}

/** 解压 zip 到目标目录（目录不存在时自动创建；已存在条目会被覆盖/报错策略交给调用方） */
export async function unzipTo(zipPath, destDir) {
  if (IS_WIN) {
    await powershell(`
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      [System.IO.Compression.ZipFile]::ExtractToDirectory(${psQuote(zipPath)}, ${psQuote(destDir)})
    `)
    return
  }
  await run('unzip', ['-o', zipPath, '-d', destDir])
}
