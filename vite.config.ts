import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { spawn, type ChildProcess } from 'node:child_process'

const OMR_PORT = Number(process.env.OMR_PORT ?? 5175)

/** 点击"本地精确识别"时按需拉起 OMR 服务（scripts/omr-server.mjs）。
 *  已在运行则直接放行；未运行则 spawn 并轮询 /health 就绪后再交给代理。 */
function omrAutostart(): Plugin {
  let proc: ChildProcess | null = null
  let starting: Promise<void> | null = null

  const ping = async (): Promise<boolean> => {
    try {
      const res = await fetch(`http://localhost:${OMR_PORT}/health`, {
        signal: AbortSignal.timeout(800),
      })
      return res.ok
    } catch {
      return false
    }
  }

  const ensure = (): Promise<void> => {
    if (starting) return starting
    starting = (async () => {
      if (await ping()) return
      console.log('[omr] 未检测到识别服务，正在自动启动…')
      proc = spawn(process.execPath, ['scripts/omr-server.mjs'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      proc.stdout?.on('data', d => process.stdout.write(`[omr] ${d}`))
      proc.stderr?.on('data', d => process.stderr.write(`[omr] ${d}`))
      // 进程退出后允许下次请求重试启动
      proc.on('exit', () => {
        proc = null
        starting = null
      })
      const deadline = Date.now() + 15000
      while (Date.now() < deadline) {
        if (await ping()) {
          console.log('[omr] 识别服务已就绪')
          return
        }
        await new Promise(r => setTimeout(r, 400))
      }
      proc.kill()
      proc = null
      starting = null
      throw new Error('启动超时')
    })()
    return starting
  }

  return {
    name: 'omr-autostart',
    configureServer(server) {
      server.middlewares.use('/api/omr', (_req, res, next) => {
        ensure()
          .then(() => next())
          .catch(err => {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: `OMR 服务自动启动失败（${err instanceof Error ? err.message : err}），可手动运行 npm run omr 排查`,
              }),
            )
          })
      })
      const cleanup = () => {
        proc?.kill()
      }
      server.httpServer?.on('close', cleanup)
      process.on('exit', cleanup)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const deepseekKey = env.DEEPSEEK_API_KEY
  if (!deepseekKey) {
    console.warn('[vite] 未配置 DEEPSEEK_API_KEY（.env），AI 教练功能不可用')
  }

  // 识谱供应商：zhipu / gemini / dashscope
  const provider = env.VISION_PROVIDER ?? 'zhipu'
  const upstream =
    provider === 'gemini'
      ? {
          target: 'https://generativelanguage.googleapis.com',
          rewriteBase: '/v1beta/openai',
          key: env.GEMINI_API_KEY,
        }
      : provider === 'dashscope'
        ? {
            target: 'https://dashscope.aliyuncs.com',
            rewriteBase: '/compatible-mode/v1',
            key: env.DASHSCOPE_API_KEY,
          }
        : {
            target: 'https://open.bigmodel.cn',
            rewriteBase: '/api/paas/v4',
            key: env.ZHIPU_API_KEY,
          }
  if (!upstream.key) {
    console.warn(`[vite] VISION_PROVIDER=${provider} 但未配置对应 API Key，图片识谱不可用`)
  }

  // gemini 需要走代理（本机 Clash），其余国内直连
  const localProxy = env.HTTPS_PROXY ?? env.HTTP_PROXY ?? 'http://127.0.0.1:7892'
  const useProxyAgent = provider === 'gemini' && env.GEMINI_PROXY !== 'off'

  return {
    base: './',
    plugins: [react(), tailwindcss(), omrAutostart()],
    server: {
      proxy: {
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/deepseek/, ''),
          ...(deepseekKey ? { headers: { Authorization: `Bearer ${deepseekKey}` } } : {}),
        },
        '/api/omr': {
          target: `http://localhost:${OMR_PORT}`,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/omr/, '/omr'),
        },
        '/api/vision': {
          target: upstream.target,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/vision/, upstream.rewriteBase),
          ...(upstream.key ? { headers: { Authorization: `Bearer ${upstream.key}` } } : {}),
          ...(useProxyAgent ? { agent: new HttpsProxyAgent(localProxy) } : {}),
        },
      },
    },
  }
})
