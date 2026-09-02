import { chatCompletion } from './llmClient'

/** AI 教练答疑：携带本课上下文回答学员问题 */
export async function askTutor(
  lessonTitle: string,
  lessonSummary: string,
  question: string,
): Promise<string> {
  const content = await chatCompletion(
    [
      {
        role: 'system',
        content: `你是一位耐心、专业的钢琴启蒙老师，正在辅导一位刚学完《${lessonTitle}》课程的零基础学员。
本课要点：${lessonSummary}
回答要求：结合课程内容、具体可操作、200 字以内、语气鼓励，可以举简单例子。全程使用中文，不使用表情符号。`,
      },
      { role: 'user', content: question },
    ],
    { temperature: 0.7 },
  )
  return content.trim()
}
