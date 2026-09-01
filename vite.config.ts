import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const deepseekKey = env.DEEPSEEK_API_KEY
  const zhipuKey = env.ZHIPU_API_KEY
  if (!deepseekKey) {
    console.warn('[vite] 未配置 DEEPSEEK_API_KEY（.env），AI 教练功能不可用')
  }
  if (!zhipuKey) {
    console.warn('[vite] 未配置 ZHIPU_API_KEY（.env），图片识谱功能不可用')
  }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // 浏览器请求 /api/deepseek/*，由 dev server 注入密钥后转发给 DeepSeek
        '/api/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/deepseek/, ''),
          ...(deepseekKey ? { headers: { Authorization: `Bearer ${deepseekKey}` } } : {}),
        },
        // 浏览器请求 /api/zhipu/*，由 dev server 注入密钥后转发给智谱
        '/api/zhipu': {
          target: 'https://open.bigmodel.cn',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/zhipu/, '/api/paas/v4'),
          ...(zhipuKey ? { headers: { Authorization: `Bearer ${zhipuKey}` } } : {}),
        },
      },
    },
  }
})
