import { LlmError } from './llmClient'

interface ChatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
}

export interface VisionResult {
  content: string
  finishReason: string | null
}

const VISION_MODEL = import.meta.env.VITE_VISION_MODEL ?? 'glm-4v-flash'
const VISION_ENDPOINT = '/api/vision/chat/completions'
const IS_QWEN = VISION_MODEL.startsWith('qwen')
const THINKING_BUDGET = Number(import.meta.env.VITE_QWEN_THINKING_BUDGET ?? 8192)
const DEFAULT_MAX_TOKENS = VISION_MODEL.startsWith('gemini')
  ? 8192
  : IS_QWEN
    ? 4096
    : 1024
const DEFAULT_TIMEOUT_MS = IS_QWEN ? 240000 : 120000

/**
 * 视觉识谱客户端：请求发给本地 /api/vision，
 * 由 vite dev server 按 VISION_PROVIDER 转发到对应厂商并注入密钥。
 * 模型/厂商通过 .env 切换，无需改代码。
 */
export async function visionChat(
  prompt: string,
  imageDataUrl: string,
  options: { timeoutMs?: number; maxTokens?: number } = {},
): Promise<VisionResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetch(VISION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: VISION_MODEL,
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
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        // qwen 开思考模式读谱显著更准；预算上限防止思考跑飞
        ...(IS_QWEN ? { enable_thinking: true, thinking_budget: THINKING_BUDGET } : {}),
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new LlmError(`识谱服务请求失败（${res.status}）：${text.slice(0, 200)}`)
    }
    const data = (await res.json()) as ChatResponse
    const choice = data.choices?.[0]
    const content = choice?.message?.content
    if (!content) throw new LlmError('识谱服务返回内容为空')
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
