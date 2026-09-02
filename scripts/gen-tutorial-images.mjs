import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const key = readFileSync(join(homedir(), 'music-practice-agent/.env'), 'utf8')
  .match(/^DASHSCOPE_API_KEY=(.+)$/m)[1].trim()

const JOBS = [
  {
    name: 'posture',
    prompt: [
      '极简扁平矢量插画风格',
      '一个几何简笔小人：圆形头部、圆润简洁的身体轮廓、无面部细节、无手指细节（手部仅为简单的圆端线条）',
      '小人侧坐在钢琴前的琴凳上，示范标准钢琴坐姿：背部自然挺直、双脚平放地面、小臂放平与键盘同高、坐在琴凳前一半',
      '钢琴为深色几何体块，琴键为浅灰白色条',
      '深色近黑背景，人物琥珀橙色，画面干净、构图居中、大量留白',
      '不含任何文字、字母、数字',
    ].join(','),
  },
  {
    name: 'handshape',
    prompt: [
      '极简扁平矢量插画风格，俯视视角',
      '一只高度简化的手放在钢琴白键上：五指自然弯曲、指尖圆点接触琴键、掌心向上拱起成圆顶，掌心下方有拱形空隙（像轻轻握着一个看不见的鸡蛋）',
      '手部为琥珀橙色单色几何形状，无需写实细节、无指纹、无指甲',
      '琴键浅灰白色，深色近黑背景，画面干净、构图居中',
      '不含任何文字、字母、数字',
    ].join(','),
  },
]

async function createTask(prompt) {
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
        input: { prompt },
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
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2500))
    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    const data = await res.json()
    if (data.output?.task_status === 'SUCCEEDED') {
      return data.output.results.map(r => r.url)
    }
    if (data.output?.task_status === 'FAILED') {
      throw new Error(`生成失败: ${JSON.stringify(data.output).slice(0, 150)}`)
    }
    process.stdout.write('.')
  }
  throw new Error('轮询超时')
}

mkdirSync('/tmp/tutorial-img', { recursive: true })

for (const job of JOBS) {
  for (let c = 1; c <= 4; c++) {
    await new Promise(r => setTimeout(r, 15000))
    const id = await createTask(job.prompt)
    console.log(`\n[${job.name}] 候选${c} 任务 ${id}`)
    const urls = await pollTask(id)
    const res = await fetch(urls[0])
    writeFileSync(`/tmp/tutorial-img/${job.name}-${c}.png`, Buffer.from(await res.arrayBuffer()))
    console.log(` 已保存 /tmp/tutorial-img/${job.name}-${c}.png`)
  }
}
console.log('\n全部完成')
