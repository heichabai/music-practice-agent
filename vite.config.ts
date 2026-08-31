import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.warn('[vite] 未配置 DEEPSEEK_API_KEY（.env），AI 教练功能不可用')
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
          ...(apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
        },
      },
    },
  }
})
