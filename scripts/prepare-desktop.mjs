import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { IS_WIN, IS_MAC, findAudiveris } from './engines.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 目标平台：--platform=win|mac（默认当前平台）
const arg = process.argv.find(a => a.startsWith('--platform='))
const target = arg ? arg.split('=')[1] : IS_WIN ? 'win' : IS_MAC ? 'mac' : 'linux'

const out = join(root, target === 'win' ? 'engine-locals-win' : 'engine-locals')
mkdirSync(out, { recursive: true })

function writeDefaultConfig() {
  const envPath = join(root, '.env')
  const cfg = {}
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m) cfg[m[1]] = m[2]
    }
  }
  writeFileSync(join(out, 'default-config.json'), JSON.stringify(cfg, null, 2))
  return cfg
}

if (target === 'mac') {
  // macOS：~/bin 的 Audiveris.app / realesrgan → engine-locals
  const bin = join(homedir(), 'bin')
  const audiverisSrc = join(bin, 'Audiveris.app')
  if (!existsSync(audiverisSrc)) {
    console.error('未找到 ~/bin/Audiveris.app，请先完成 OMR 引擎安装')
    process.exit(1)
  }
  rmSync(join(out, 'Audiveris.app'), { recursive: true, force: true })
  cpSync(audiverisSrc, join(out, 'Audiveris.app'), { recursive: true })
  execSync(`xattr -dr com.apple.quarantine "${join(out, 'Audiveris.app')}" 2>/dev/null || true`)

  mkdirSync(join(out, 'realesrgan'), { recursive: true })
  cpSync(join(bin, 'realesrgan/realesrgan-ncnn-vulkan'), join(out, 'realesrgan/realesrgan-ncnn-vulkan'))
  cpSync(join(bin, 'realesrgan/models'), join(out, 'realesrgan/models'), { recursive: true })
  execSync(`chmod +x "${join(out, 'realesrgan/realesrgan-ncnn-vulkan')}"`)
  execSync(`xattr -dr com.apple.quarantine "${join(out, 'realesrgan')}" 2>/dev/null || true`)

  console.log('桌面打包资源就绪（macOS）:')
  console.log('  Audiveris.app + JRE + 模型')
  console.log('  realesrgan + 模型')
} else if (target === 'win') {
  // Windows：engine-locals-win/Audiveris（可从已安装目录复制）+ realesrgan（需预置）
  const bundledAudiveris = join(out, 'Audiveris')
  if (!existsSync(join(bundledAudiveris, 'Audiveris.exe'))) {
    const installed = findAudiveris(
      [
        process.env['ProgramFiles'],
        process.env['ProgramFiles(x86)'],
        process.env['LOCALAPPDATA'],
      ].filter(Boolean),
    )
    if (!installed) {
      console.error(
        '未找到 Windows 版 Audiveris。\n' +
          '请任选其一：\n' +
          '  1) 安装官方 MSI（https://github.com/Audiveris/audiveris/releases）后重跑本脚本\n' +
          '  2) 手动把 Audiveris 程序目录放到 engine-locals-win/Audiveris/（内含 Audiveris.exe）',
      )
      process.exit(1)
    }
    const appDir = dirname(installed)
    console.log(`从已安装位置复制 Audiveris: ${appDir}`)
    rmSync(bundledAudiveris, { recursive: true, force: true })
    cpSync(appDir, bundledAudiveris, { recursive: true })
  }
  if (!existsSync(join(out, 'realesrgan', 'realesrgan-ncnn-vulkan.exe'))) {
    console.warn(
      '警告：未找到 engine-locals-win/realesrgan/realesrgan-ncnn-vulkan.exe\n' +
        '      （超分救援不可用；可从 Real-ESRGAN releases 下载 windows 包解压放入）',
    )
  }

  console.log('桌面打包资源就绪（Windows）:')
  console.log('  Audiveris' + (existsSync(bundledAudiveris) ? ' ✓' : ' ✗'))
  console.log('  realesrgan' + (existsSync(join(out, 'realesrgan')) ? ' ✓' : ' ✗'))
} else {
  console.error(`暂不支持的平台: ${target}`)
  process.exit(1)
}

const cfg = writeDefaultConfig()
console.log(`  default-config.json（${Object.keys(cfg).filter(k => cfg[k]).length} 项配置）`)
