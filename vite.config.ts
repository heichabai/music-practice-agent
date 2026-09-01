import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { HttpsProxyAgent } from 'https-proxy-agent'

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
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/deepseek/, ''),
          ...(deepseekKey ? { headers: { Authorization: `Bearer ${deepseekKey}` } } : {}),
        },
        '/api/omr': {
          target: 'http://localhost:5175',
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
