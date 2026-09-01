import * as Tone from 'tone'

const SAMPLES: Record<string, string> = {
  A1: 'A1.mp3',
  A2: 'A2.mp3',
  A3: 'A3.mp3',
  A4: 'A4.mp3',
  A5: 'A5.mp3',
  A6: 'A6.mp3',
}

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
  const piano = await getPiano()
  if (piano === null) return false
  piano.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), duration)
  return true
}
