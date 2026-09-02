import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const key = readFileSync(join(homedir(), 'music-practice-agent/.env'), 'utf8')
  .match(/^DASHSCOPE_API_KEY=(.+)$/m)[1].trim()

const PROMPT = [
  '扁平极简插画风格',
  '深色近黑背景',
  '琥珀橙与暖灰色调',
  '一位成年人侧坐在立式钢琴前的琴凳上，示范标准钢琴坐姿：',
  '背部自然挺直、双脚平放地面、手肘与键盘齐平、手腕放平、身体离琴一拳距离，双手自然搭在琴键上',
  '构图简洁、几何色块、干净线条',
  '画面中不要出现任何文字、字母、数字或标注',
].join(',')

async function createTask() {
  const res = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'qwen-image',
        input: { prompt: PROMPT },
        parameters: { n: 1, size: '1328*1328' },
      }),
    },
  )
  const data = await res.json()
  if (!res.ok || !data.output?.task_id) {
    throw new Error(`创建任务失败: ${JSON.stringify(data).slice(0, 200)}`)
  }
  return data.output.task_id
}

async function pollTask(taskId) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2500))
    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    const data = await res.json()
    if (data.output?.task_status === 'SUCCEEDED') {
      return data.output.results.map(r => r.url)
    }
    if (data.output?.task_status === 'FAILED') {
      throw new Error(`生成失败: ${JSON.stringify(data.output).slice(0, 200)}`)
    }
    process.stdout.write('.')
  }
  throw new Error('轮询超时')
}

execSync('mkdir -p /tmp/posture-candidates-v2')
const taskIds = []
for (let i = 0; i < 4; i++) {
  if (i > 0) await new Promise(r => setTimeout(r, 15000))
  const id = await createTask()
  taskIds.push(id)
  console.log('任务', i + 1, ':', id)
}
const urls = []
for (let i = 0; i < taskIds.length; i++) {
  urls.push(...(await pollTask(taskIds[i])))
}
console.log('\n生成完毕，下载候选…')
const { writeFileSync } = await import('node:fs')
for (let i = 0; i < urls.length; i++) {
  const res = await fetch(urls[i])
  writeFileSync(`/tmp/posture-candidates-v2/${i + 1}.png`, Buffer.from(await res.arrayBuffer()))
}
console.log(`已保存 ${urls.length} 张: /tmp/posture-candidates-v2/`)
