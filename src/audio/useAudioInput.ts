import { useCallback, useEffect, useRef, useState } from 'react'

export type AudioInputStatus = 'idle' | 'requesting' | 'listening' | 'error' | 'unsupported'

export interface AudioInputState {
  status: AudioInputStatus
  error: string
  detectedMidi: number | null
  volume: number
}

/**
 * 麦克风实时音高检测：
 * getUserMedia → AnalyserNode → YIN 每帧分析 → 统一 note on/off 事件。
 * 与 MIDI/电脑键盘共用 handleNote 回调，引擎不区分输入来源。
 */
export function useAudioInput(
  handleNote: (midi: number, on: boolean) => void,
): {
  state: AudioInputState
  start: () => Promise<void>
  stop: () => void
} {
  const [state, setState] = useState<AudioInputState>({
    status: 'idle',
    error: '',
    detectedMidi: null,
    volume: 0,
  })

  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef(0)
  const currentMidiRef = useRef<number | null>(null)
  const silentFramesRef = useRef(0)
  const handleNoteRef = useRef(handleNote)

  useEffect(() => {
    handleNoteRef.current = handleNote
  }, [handleNote])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    analyserRef.current = null
    void ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    currentMidiRef.current = null
    silentFramesRef.current = 0
    setState(prev => ({ ...prev, status: 'idle', detectedMidi: null, volume: 0 }))
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState(prev => ({ ...prev, status: 'unsupported', error: '当前浏览器不支持麦克风' }))
      return
    }
    setState(prev => ({ ...prev, status: 'requesting', error: '' }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      streamRef.current = stream

      const ctx = new AudioContext()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0
      source.connect(analyser)
      analyserRef.current = analyser

      const buffer = new Float32Array(analyser.fftSize)
      const detector = analyser.getFloatTimeDomainData.bind(analyser)

      // YIN 检测器（延迟导入避免 pitchy 类型问题）
      const { PitchDetector } = await import('pitchy')
      const pitchDetector = PitchDetector.forFloat32Array(analyser.fftSize)

      const MIN_RMS = 0.008
      const MIN_CLARITY = 0.88
      const SILENT_FRAMES_TO_RELEASE = 4

      const loop = () => {
        detector(buffer as unknown as Float32Array<ArrayBuffer>)

        let sum = 0
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
        const rms = Math.sqrt(sum / buffer.length)

        let detected: number | null = null

        if (rms >= MIN_RMS) {
          const [freq, clarity] = pitchDetector.findPitch(buffer, ctx.sampleRate)
          if (clarity >= MIN_CLARITY && Number.isFinite(freq)) {
            const midi = Math.round(12 * Math.log2(freq / 440) + 69)
            if (midi >= 21 && midi <= 108) detected = midi
          }
        }

        const prev = currentMidiRef.current

        if (detected !== null) {
          silentFramesRef.current = 0
          if (detected !== prev) {
            if (prev !== null) handleNoteRef.current(prev, false)
            handleNoteRef.current(detected, true)
            currentMidiRef.current = detected
          }
        } else {
          silentFramesRef.current++
          if (silentFramesRef.current >= SILENT_FRAMES_TO_RELEASE && prev !== null) {
            handleNoteRef.current(prev, false)
            currentMidiRef.current = null
            silentFramesRef.current = 0
          }
        }

        setState(prev => ({
          ...prev,
          status: 'listening',
          detectedMidi: detected,
          volume: Math.min(1, rms * 8),
        }))

        rafRef.current = requestAnimationFrame(loop)
      }

      rafRef.current = requestAnimationFrame(loop)
    } catch (err) {
      cleanup()
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '无法访问麦克风',
      }))
    }
  }, [cleanup])

  const stop = useCallback(() => cleanup(), [cleanup])

  return { state, start, stop }
}
