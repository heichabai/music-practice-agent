import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'

export type RecorderState = 'idle' | 'recording' | 'error'

/**
 * Canvas + 音频 录制 Hook：
 * 将画布视觉流与 Tone.js 音频流合成 webm 视频，停止后自动下载。
 */
export function useVideoRecorder(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [state, setState] = useState<RecorderState>('idle')
  const [duration, setDuration] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef(0)
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  const start = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const videoStream = canvas.captureStream(30)

      // 音频流：从 Tone 主输出分流
      const ctx = Tone.getContext().rawContext as AudioContext
      const dest = ctx.createMediaStreamDestination()
      const toneOut = Tone.getDestination() as unknown as AudioNode
      toneOut.connect(dest)
      audioDestRef.current = dest

      const stream = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()])

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `琴键陪练-弹奏-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.webm`
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 5000)

        // 清理音频连接
        if (audioDestRef.current) {
          try { toneOut.disconnect(audioDestRef.current) } catch { /* ignore */ }
          audioDestRef.current = null
        }
      }

      recorder.start(100)
      recorderRef.current = recorder
      setState('recording')
      setDuration(0)

      const t0 = Date.now()
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - t0) / 1000))
      }, 500)
    } catch {
      setState('error')
    }
  }, [canvasRef])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
      recorderRef.current = null
    }
    window.clearInterval(timerRef.current)
    setState('idle')
  }, [])

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current)
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      if (audioDestRef.current) audioDestRef.current = null
    }
  }, [])

  return { state, duration, start, stop }
}
