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

// 不在模块加载时创建 AudioContext（否则会在用户手势前以 suspended 状态创建，
// 部分浏览器无法可靠恢复）。改为监听首次用户手势时再创建 + 恢复。
let unlocked = false
export function ensureAudioUnlocked(): void {
  if (unlocked || typeof window === 'undefined') return
  unlocked = true
  const unlock = () => {
    try {
      // 必须先 getContext() 创建真实上下文（Tone.start() 只对真实上下文有效，
      // 默认 globalContext 是 DummyContext，resume 是空操作）
      Tone.getContext()
      void Tone.start()
    } catch {
      /* ignore */
    }
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchstart', unlock)
}
ensureAudioUnlocked()

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

// ---------------------------------------------------------------- 延音踏板支持
let pedalDown = false
const pedaledNotes = new Set<number>()

export function isPedalDown(): boolean {
  return pedalDown
}

/** 实时弹奏按下：triggerAttack 持续响，直到 noteOff / 踏板控制释放 */
export async function pianoNoteOn(midi: number): Promise<boolean> {
  try {
    await Tone.start()
  } catch {
    // ignore
  }
  const piano = await getPiano()
  enforceLowLatency()
  if (piano === null) return false
  piano.triggerAttack(
    Tone.Frequency(midi, 'midi').toFrequency(),
    Tone.getContext().currentTime + LOW_LATENCY,
  )
  return true
}

/** 实时弹奏松开：踏板未踩则立即释放；踩下则挂起等踏板抬起 */
export async function pianoNoteOff(midi: number): Promise<boolean> {
  const piano = await getPiano()
  enforceLowLatency()
  if (piano === null) return false
  if (pedalDown) {
    pedaledNotes.add(midi)
    return true
  }
  piano.triggerRelease(
    Tone.Frequency(midi, 'midi').toFrequency(),
    Tone.getContext().currentTime + LOW_LATENCY,
  )
  return true
}

/** 踏板事件：踩下(true)后松键不断音；抬起(false)时把所有挂起的音一起释放 */
export async function pianoSetSustain(on: boolean): Promise<void> {
  pedalDown = on
  if (on) return
  if (pedaledNotes.size === 0) return
  const piano = await getPiano()
  enforceLowLatency()
  if (piano === null) {
    pedaledNotes.clear()
    return
  }
  const when = Tone.getContext().currentTime + LOW_LATENCY
  for (const midi of pedaledNotes) {
    piano.triggerRelease(Tone.Frequency(midi, 'midi').toFrequency(), when)
  }
  pedaledNotes.clear()
}
