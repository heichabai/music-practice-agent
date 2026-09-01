import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'engine-locals')
const bin = join(homedir(), 'bin')

mkdirSync(out, { recursive: true })

// 1. Audiveris.app（自带 JRE 与模型）
const audiverisSrc = join(bin, 'Audiveris.app')
if (!existsSync(audiverisSrc)) {
  console.error('未找到 ~/bin/Audiveris.app，请先完成 OMR 引擎安装')
  process.exit(1)
}
rmSync(join(out, 'Audiveris.app'), { recursive: true, force: true })
cpSync(audiverisSrc, join(out, 'Audiveris.app'), { recursive: true })
execSync(`xattr -dr com.apple.quarantine "${join(out, 'Audiveris.app')}" 2>/dev/null || true`)

// 2. Real-ESRGAN（二进制 + 模型）
mkdirSync(join(out, 'realesrgan'), { recursive: true })
cpSync(join(bin, 'realesrgan/realesrgan-ncnn-vulkan'), join(out, 'realesrgan/realesrgan-ncnn-vulkan'))
cpSync(join(bin, 'realesrgan/models'), join(out, 'realesrgan/models'), { recursive: true })
execSync(`chmod +x "${join(out, 'realesrgan/realesrgan-ncnn-vulkan')}"`)
execSync(`xattr -dr com.apple.quarantine "${join(out, 'realesrgan')}" 2>/dev/null || true`)

// 3. 默认配置（从 .env 生成；分发安装包前请注意其中含密钥）
const envPath = join(root, '.env')
const cfg = {}
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) cfg[m[1]] = m[2]
  }
}
writeFileSync(join(out, 'default-config.json'), JSON.stringify(cfg, null, 2))

console.log('桌面打包资源就绪:')
console.log('  Audiveris.app + JRE + 模型')
console.log('  realesrgan + 模型')
console.log(`  default-config.json（${Object.keys(cfg).filter(k => cfg[k]).length} 项配置）`)
