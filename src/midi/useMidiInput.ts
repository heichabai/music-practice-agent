import { useEffect, useRef, useState } from 'react'

export type MidiStatus = 'init' | 'unsupported' | 'no-device' | 'ok'
export type NoteEvent = (midi: number, on: boolean) => void

export function useMidiInput(onNote: NoteEvent) {
  const [status, setStatus] = useState<MidiStatus>('init')
  const [deviceName, setDeviceName] = useState('')
  const onNoteRef = useRef(onNote)

  useEffect(() => {
    onNoteRef.current = onNote
  }, [onNote])

  useEffect(() => {
    if (typeof navigator.requestMIDIAccess !== 'function') {
      setStatus('unsupported')
      return
    }

    let access: MIDIAccess | null = null
    let cancelled = false

    const handleMessage = (e: MIDIMessageEvent) => {
      const data = e.data
      if (!data || data.length < 3) return
      const cmd = data[0] & 0xf0
      const note = data[1]
      const velocity = data[2]
      if (cmd === 0x90 && velocity > 0) {
        onNoteRef.current(note, true)
      } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
        onNoteRef.current(note, false)
      }
    }

    const bindInputs = () => {
      if (!access) return
      const inputs = Array.from(access.inputs.values())
      for (const input of inputs) input.onmidimessage = handleMessage
      if (inputs.length > 0) {
        setStatus('ok')
        // 优先显示物理 MIDI 键盘，跳过 IAC 虚拟总线等系统虚拟设备
        const preferred =
          inputs.find(i => !/IAC|驱动程序|总线|Bus/i.test(i.name ?? '')) ?? inputs[0]
        setDeviceName(preferred.name ?? 'MIDI 设备')
      } else {
        setStatus('no-device')
        setDeviceName('')
      }
    }

    navigator
      .requestMIDIAccess()
      .then(acc => {
        if (cancelled) return
        access = acc
        access.onstatechange = bindInputs
        bindInputs()
      })
      .catch(() => setStatus('no-device'))

    return () => {
      cancelled = true
      if (access) {
        access.onstatechange = null
        for (const input of access.inputs.values()) input.onmidimessage = null
      }
    }
  }, [])

  return { status, deviceName }
}
