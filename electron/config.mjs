import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseEnv(text) {
  const out = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

/**
 * 开发态：读项目根目录 .env
 * 打包态：读 userData/config.json（首次启动从内置默认模板生成）
 */
export function loadConfig(isPackaged, userDataPath) {
  if (!isPackaged) {
    const envPath = join(__dirname, '..', '.env')
    if (existsSync(envPath)) return parseEnv(readFileSync(envPath, 'utf8'))
    return {}
  }
  const userCfgPath = join(userDataPath, 'config.json')
  if (existsSync(userCfgPath)) {
    try {
      return JSON.parse(readFileSync(userCfgPath, 'utf8'))
    } catch {
      // 配置损坏则重建
    }
  }
  let cfg = {}
  const defPath = join(process.resourcesPath, 'default-config.json')
  if (existsSync(defPath)) {
    try {
      cfg = JSON.parse(readFileSync(defPath, 'utf8'))
    } catch {
      // 无默认配置
    }
  }
  try {
    mkdirSync(userDataPath, { recursive: true })
    writeFileSync(userCfgPath, JSON.stringify(cfg, null, 2))
  } catch {
    // 只读环境则跳过
  }
  return cfg
}
