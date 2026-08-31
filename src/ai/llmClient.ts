export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class LlmError extends Error {}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
}

/**
 * 浏览器端 DeepSeek 客户端：请求发给本地 /api/deepseek，
 * 由 vite dev server 代理转发并注入密钥，密钥不进前端代码包。
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; jsonMode?: boolean; timeoutMs?: number } = {},
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000)
  try {
    const res = await fetch('/api/deepseek/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: options.temperature ?? 0.7,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new LlmError(`DeepSeek 请求失败（${res.status}）：${text.slice(0, 200)}`)
    }
    const data = (await res.json()) as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new LlmError('DeepSeek 返回内容为空')
    return content
  } catch (err) {
    if (err instanceof LlmError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LlmError('DeepSeek 请求超时，请稍后重试')
    }
    throw new LlmError(`网络请求失败：${String(err)}`)
  } finally {
    clearTimeout(timer)
  }
}
