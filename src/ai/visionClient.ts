import { LlmError } from './llmClient'

interface ZhipuChatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
}

export interface VisionResult {
  content: string
  finishReason: string | null
}

/**
 * 智谱 GLM-4V 视觉模型客户端：请求发给本地 /api/zhipu，
 * 由 vite dev server 代理转发并注入密钥，密钥不进前端代码包。
 */
export async function visionChat(
  prompt: string,
  imageDataUrl: string,
  options: { timeoutMs?: number; maxTokens?: number } = {},
): Promise<VisionResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 120000)
  try {
    const res = await fetch('/api/zhipu/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'glm-4v-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageDataUrl } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: options.maxTokens ?? 1024,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new LlmError(`智谱请求失败（${res.status}）：${text.slice(0, 200)}`)
    }
    const data = (await res.json()) as ZhipuChatResponse
    const choice = data.choices?.[0]
    const content = choice?.message?.content
    if (!content) throw new LlmError('智谱返回内容为空')
    return { content, finishReason: choice?.finish_reason ?? null }
  } catch (err) {
    if (err instanceof LlmError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LlmError('识谱请求超时，请重试')
    }
    throw new LlmError(`网络请求失败：${String(err)}`)
  } finally {
    clearTimeout(timer)
  }
}
