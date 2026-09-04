import { PitchDetector } from 'pitchy'

/**
 * YIN 音高检测封装：
 * 输入时域 PCM 数据，输出 (midi, confidence)，无 UI 依赖。
 */

export interface PitchResult {
  midi: number | null
  confidence: number
  rms: number
}

const MIN_RMS = 0.008
const MIN_CONFIDENCE = 0.88

export class PitchDetectorWrapper {
  private detector: PitchDetector<Float32Array>
  private buffer: Float32Array

  constructor(bufferSize = 2048) {
    this.buffer = new Float32Array(bufferSize)
    this.detector = PitchDetector.forFloat32Array(bufferSize)
  }

  get bufferSize(): number {
    return this.buffer.length
  }

  analyze(analyser: AnalyserNode): PitchResult {
    analyser.getFloatTimeDomainData(this.buffer)

    let sum = 0
    for (let i = 0; i < this.buffer.length; i++) {
      sum += this.buffer[i] * this.buffer[i]
    }
    const rms = Math.sqrt(sum / this.buffer.length)

    if (rms < MIN_RMS) {
      return { midi: null, confidence: 0, rms }
    }

    const [frequency, clarity] = this.detector.findPitch(this.buffer, 44100)

    if (clarity < MIN_CONFIDENCE || !Number.isFinite(frequency)) {
      return { midi: null, confidence: clarity, rms }
    }

    const midi = Math.round(12 * Math.log2(frequency / 440) + 69)
    if (midi < 21 || midi > 108) {
      return { midi: null, confidence: clarity, rms }
    }

    return { midi, confidence: clarity, rms }
  }
}
