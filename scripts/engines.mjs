/**
 * 跨平台引擎路径解析（Audiveris / Real-ESRGAN）。
 * 优先级：环境变量 > 传入的候选根目录（打包资源/项目内引擎目录） > 系统常见安装位置。
 */
import { existsSync } from 'node:fs'
import { platform } from 'node:os'
import { join } from 'node:path'

export const IS_WIN = platform() === 'win32'
export const IS_MAC = platform() === 'darwin'

const AUDIVERIS_LAYOUTS = IS_WIN
  ? [
      ['Audiveris', 'Audiveris.exe'],
      ['Audiveris', 'bin', 'Audiveris.exe'],
      ['Audiveris.exe'],
      ['audiveris', 'Audiveris.exe'],
    ]
  : IS_MAC
    ? [['Audiveris.app', 'Contents', 'MacOS', 'Audiveris']]
    : [
        ['Audiveris', 'bin', 'Audiveris'],
        ['Audiveris', 'Audiveris'],
        ['bin', 'audiveris'],
      ]

const REALESRGAN_EXE = IS_WIN ? 'realesrgan-ncnn-vulkan.exe' : 'realesrgan-ncnn-vulkan'
const REALESRGAN_LAYOUTS = [
  ['realesrgan', REALESRGAN_EXE],
  ['realesrgan', 'bin', REALESRGAN_EXE],
  [REALESRGAN_EXE],
]

export function findAudiveris(roots) {
  for (const root of roots) {
    if (!root) continue
    for (const parts of AUDIVERIS_LAYOUTS) {
      const p = join(root, ...parts)
      if (existsSync(p)) return p
    }
  }
  return null
}

export function findRealesrgan(roots) {
  for (const root of roots) {
    if (!root) continue
    for (const parts of REALESRGAN_LAYOUTS) {
      const p = join(root, ...parts)
      if (existsSync(p)) {
        const models = join(root, 'realesrgan', 'models')
        return { bin: p, models: existsSync(models) ? models : null }
      }
    }
  }
  return null
}

/** 系统常见安装位置（Audiveris MSI / Homebrew / 发行版包） */
export function systemRoots() {
  if (IS_WIN) {
    return [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      process.env['LOCALAPPDATA'],
      process.env['APPDATA'],
    ].filter(Boolean)
  }
  if (IS_MAC) return ['/Applications', '/opt/homebrew', '/usr/local']
  return ['/usr', '/usr/local', '/opt']
}

/**
 * 解析引擎路径。extraRoots 建议按优先级传入：
 * 打包资源目录（resources/engine）→ 项目引擎目录（engine-locals / engine-locals-win）→ 开发机 ~/bin
 */
export function resolveEngines(extraRoots = []) {
  const roots = [...extraRoots, ...systemRoots()]
  const audiveris = process.env.AUDIVERIS_BIN ?? findAudiveris(roots)
  const srFromEnv = process.env.REALESRGAN_BIN
  const sr = srFromEnv
    ? { bin: srFromEnv, models: process.env.REALESRGAN_MODELS ?? null }
    : findRealesrgan(roots)
  return {
    audiveris,
    realesrgan: sr?.bin ?? null,
    realesrganModels: process.env.REALESRGAN_MODELS ?? sr?.models ?? null,
  }
}
