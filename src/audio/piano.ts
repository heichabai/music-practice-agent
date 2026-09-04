import * as Tone from 'tone'

const SAMPLES: Record<string, string> = {
  A1: 'A1.wav',
  A2: 'A2.wav',
  A3: 'A3.wav',
  A4: 'A4.wav',
  A5: 'A5.wav',
  A6: 'A6.wav',
}

// Tone 默认 lookAhead=0.1s（100ms 调度缓冲），练习反馈音必须低延迟。
// Tone 内部可能重置该值，所以每次触发前就地重设，保证恒为低延迟。
const LOW_LATENCY = 0.005

export function enforceLowLatency(): void {
  const ctx = Tone.getContext()
  if (ctx.lookAhead !== LOW_LATENCY) ctx.lookAhead = LOW_LATENCY
}

enforceLowLatency()

let sampler: Tone.Sampler | null = null
let loading: Promise<Tone.Sampler | null> | null = null
let failed = false

export function preloadPiano(): void {
  void getPiano()
}

/** 懒加载 Salamander 钢琴采样；失败或超时返回 null，由调用方回退合成音色 */
export function getPiano(): Promise<Tone.Sampler | null> {
  if (failed) return Promise.resolve(null)
  if (sampler !== null) return Promise.resolve(sampler)
  if (loading !== null) return loading

  loading = new Promise(resolve => {
    const s = new Tone.Sampler({
      urls: SAMPLES,
      baseUrl: '/piano/',
      release: 1.2,
      onload: () => {
        sampler = s
        enforceLowLatency()
        resolve(s)
      },
    }).toDestination()
    s.volume.value = -8

    window.setTimeout(() => {
      if (sampler === null) {
        failed = true
        resolve(null)
      }
    }, 15000)
  })
  return loading
}

/** 弹一个音；返回是否真的用了钢琴（否则调用方自行回退） */
export async function playPianoNote(midi: number, duration = 0.5): Promise<boolean> {
  try {
    await Tone.start()
  } catch {
    // AudioContext 恢复失败则回退合成音色
  }
  const piano = await getPiano()
  enforceLowLatency()
  if (piano === null) return false
  // 显式指定播放时刻，绕过 Tone.now() 的 lookAhead 缓冲（该值会被 Tone 内部重置，不可靠）
  const when = Tone.getContext().currentTime + LOW_LATENCY
  piano.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), duration, when)
  return true
}
