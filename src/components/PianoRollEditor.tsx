import { useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { Note, Song } from '../types'
import { noteHex } from './notesPalette'
import { noteName } from '../game/keyboard'
import { getPiano } from '../audio/piano'
import { PrimaryButton, GhostButton } from './ui/Button'

interface Props {
  initial: Song
  source: 'image' | 'midi' | 'omr'
  info?: string
  onSave: (song: Song) => void
  onCancel: () => void
}

interface RollNote extends Note {
  id: number
}

const KEY_W = 56
const ROW_H = 16
const PX_PER_BEAT = 90
const SNAP = 0.25
const RESIZE_EDGE = 8

interface DragState {
  mode: 'move' | 'resize'
  id: number
  startX: number
  startY: number
  origTime: number
  origMidi: number
  origDur: number
}

const snap = (v: number) => Math.round(v / SNAP) * SNAP
const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12)

let nextId = 1

export function PianoRollEditor({ initial, source, info, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name)
  const [bpm, setBpm] = useState(initial.bpm)
  const [notes, setNotes] = useState<RollNote[]>(
    () => initial.notes.map(n => ({ ...n, id: nextId++ })),
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [playheadBeats, setPlayheadBeats] = useState<number | null>(null)

  const dragRef = useRef<DragState | null>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const rafRef = useRef(0)

  const range = useMemo(() => {
    let lo = 60
    let hi = 72
    if (notes.length > 0) {
      lo = Math.min(...notes.map(n => n.midi)) - 2
      hi = Math.max(...notes.map(n => n.midi)) + 2
    }
    lo = Math.max(21, Math.floor(lo / 12) * 12)
    hi = Math.min(108, Math.floor(hi / 12) * 12 + 11)
    return { lo, hi, rows: hi - lo + 1 }
  }, [notes])

  const totalBeats = useMemo(() => {
    const maxEnd = notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
    return Math.max(16, Math.ceil(maxEnd) + 4)
  }, [notes])

  const rowOf = (midi: number) => range.hi - midi

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      Tone.Transport.cancel()
      Tone.Transport.stop()
      synthRef.current?.dispose()
      synthRef.current = null
    }
  }, [])

  const stopPlayback = () => {
    cancelAnimationFrame(rafRef.current)
    Tone.Transport.cancel()
    Tone.Transport.stop()
    setPlaying(false)
    setPlayheadBeats(null)
  }

  const startPlayback = async () => {
    if (notes.length === 0) return
    stopPlayback()
    try {
      await Tone.start()
      let synth: Tone.PolySynth | null = synthRef.current
      const piano = await getPiano()
      if (!synth) {
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
        }).toDestination()
        synth.volume.value = -6
        synthRef.current = synth
      }
      const spb = 60 / bpm
      Tone.Transport.bpm.value = bpm
      const part = new Tone.Part(
        (time, value: { midi: number; dur: number }) => {
          if (piano !== null) {
            piano.triggerAttackRelease(
              Tone.Frequency(value.midi, 'midi').toFrequency(),
              value.dur,
              time,
            )
          } else {
            synth?.triggerAttackRelease(
              Tone.Frequency(value.midi, 'midi').toFrequency(),
              value.dur,
              time,
            )
          }
        },
        notes.map(n => ({
          time: n.time * spb,
          midi: n.midi,
          dur: Math.max(0.08, n.duration * spb * 0.9),
        })),
      )
      part.start(0)
      Tone.Transport.start()
      setPlaying(true)

      const maxEnd = notes.reduce((m, n) => Math.max(m, n.time + n.duration), 0)
      const tick = () => {
        const beats = Tone.Transport.seconds / spb
        if (beats > maxEnd + 1) {
          stopPlayback()
          return
        }
        setPlayheadBeats(beats)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      stopPlayback()
    }
  }

  const deleteSelected = () => {
    if (selectedId === null) return
    setNotes(prev => prev.filter(n => n.id !== selectedId))
    setSelectedId(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const addNoteAt = (beat: number, midi: number) => {
    const note: RollNote = {
      id: nextId++,
      midi,
      time: Math.max(0, snap(beat)),
      duration: 1,
    }
    setNotes(prev => [...prev, note].sort((a, b) => a.time - b.time))
    setSelectedId(note.id)
  }

  const onGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < KEY_W) return
    const beat = (x - KEY_W) / PX_PER_BEAT
    const midi = range.hi - Math.floor(y / ROW_H)
    if (midi < 21 || midi > 108) return
    setSelectedId(null)
    addNoteAt(beat, midi)
  }

  const onNotePointerDown = (e: React.PointerEvent<HTMLDivElement>, note: RollNote) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setSelectedId(note.id)
    const noteRect = e.currentTarget.getBoundingClientRect()
    const mode: DragState['mode'] =
      e.clientX > noteRect.right - RESIZE_EDGE ? 'resize' : 'move'
    dragRef.current = {
      mode,
      id: note.id,
      startX: e.clientX,
      startY: e.clientY,
      origTime: note.time,
      origMidi: note.midi,
      origDur: note.duration,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onNotePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = (e.clientX - drag.startX) / PX_PER_BEAT
    const dyRows = Math.round((e.clientY - drag.startY) / ROW_H)
    setNotes(prev =>
      prev.map(n => {
        if (n.id !== drag.id) return n
        if (drag.mode === 'move') {
          return {
            ...n,
            time: Math.max(0, snap(drag.origTime + dx)),
            midi: Math.min(108, Math.max(21, drag.origMidi - dyRows)),
          }
        }
        return { ...n, duration: Math.max(0.25, snap(drag.origDur + dx)) }
      }),
    )
  }

  const onNotePointerUp = () => {
    dragRef.current = null
  }

  const save = () => {
    if (notes.length === 0) return
    stopPlayback()
    onSave({
      id: initial.id,
      name: name.trim() || '未命名曲目',
      bpm,
      notes: notes.map(({ id, ...rest }) => rest),
    })
  }

  const changeBpm = (value: number) => {
    if (playing) stopPlayback()
    setBpm(Math.min(240, Math.max(30, Math.round(value) || 100)))
  }

  return (
    <div className="screen-enter w-full max-w-5xl">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-subtle pb-4 text-sm">
        <GhostButton onClick={onCancel} className="px-3 py-1 text-xs">
          ‹ 返回
        </GhostButton>
        <span className="text-xs font-black uppercase tracking-wider text-[#1CB0F6]">
          {source === 'image' ? '识谱校对' : source === 'omr' ? 'OMR 校对' : 'MIDI 校对'}
        </span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-44 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-sm text-primary outline-none focus-visible:border-accent"
          placeholder="曲名"
        />
        <label className="flex items-center gap-2 text-secondary">
          BPM
          <input
            type="number"
            value={bpm}
            min={30}
            max={240}
            onChange={e => changeBpm(Number(e.target.value))}
            className="w-20 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-sm tabular-nums text-primary outline-none focus-visible:border-accent"
          />
        </label>
        <div className="flex-1" />
        <GhostButton onClick={playing ? stopPlayback : () => void startPlayback()}>
          {playing ? '停止' : '试听'}
        </GhostButton>
        <PrimaryButton onClick={save} className={notes.length === 0 ? 'pointer-events-none opacity-40' : ''}>
          保存到曲库
        </PrimaryButton>
      </div>

      <p className="mt-3 text-xs text-muted">
        {info ?? '点击空白处添加音符 · 拖动音符调整音高和时间 · 拖右边缘改时值 · 选中后按 Delete 删除'}
      </p>

      <div className="mt-4 overflow-auto rounded-lg border border-border-subtle" style={{ maxHeight: '58vh' }}>
        <div
          className="relative select-none"
          style={{ width: KEY_W + totalBeats * PX_PER_BEAT, height: range.rows * ROW_H }}
          onPointerDown={onGridPointerDown}
        >
          {Array.from({ length: range.rows }, (_, r) => {
            const midi = range.hi - r
            return (
              <div
                key={midi}
                className="absolute"
                style={{
                  left: KEY_W,
                  right: 0,
                  top: r * ROW_H,
                  height: ROW_H,
                  background: isBlackKey(midi) ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
              />
            )
          })}

          {Array.from({ length: Math.floor(totalBeats / 4) }, (_, i) => (
            <div
              key={`bar-${i}`}
              className="absolute top-0 bottom-0"
              style={{ left: KEY_W + (i + 1) * 4 * PX_PER_BEAT, width: 1, background: 'rgba(255,255,255,0.10)' }}
            />
          ))}

          {playheadBeats !== null && (
            <div
              className="absolute top-0 bottom-0 z-10"
              style={{ left: KEY_W + playheadBeats * PX_PER_BEAT, width: 2, background: 'var(--color-accent)' }}
            />
          )}

          <div
            className="sticky left-0 z-20 absolute top-0"
            style={{ width: KEY_W, height: range.rows * ROW_H }}
            onPointerDown={e => e.stopPropagation()}
          >
            {Array.from({ length: range.rows }, (_, r) => {
              const midi = range.hi - r
              const black = isBlackKey(midi)
              return (
                <div
                  key={midi}
                  className="absolute right-0 flex items-center justify-end pr-2 text-[9px]"
                  style={{
                    top: r * ROW_H,
                    height: ROW_H,
                    width: black ? KEY_W * 0.68 : KEY_W,
                    background: black ? '#141416' : '#1f1f23',
                    borderRight: '1px solid #000',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--color-muted)',
                  }}
                >
                  {midi % 12 === 0 ? noteName(midi) : ''}
                </div>
              )
            })}
          </div>

          {notes.map(note => (
            <div
              key={note.id}
              onPointerDown={e => onNotePointerDown(e, note)}
              onPointerMove={onNotePointerMove}
              onPointerUp={onNotePointerUp}
              onPointerCancel={onNotePointerUp}
              className="absolute z-10 cursor-grab touch-none rounded-[3px]"
              style={{
                left: KEY_W + note.time * PX_PER_BEAT,
                top: rowOf(note.midi) * ROW_H + 1,
                width: Math.max(10, note.duration * PX_PER_BEAT - 2),
                height: ROW_H - 3,
                background: noteHex(note.midi),
                opacity: 0.88,
                boxShadow: selectedId === note.id ? `0 0 0 2px var(--color-accent)` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        共 {notes.length} 个音 · 选中后 Delete 删除 · 时值按 {SNAP} 拍吸附
      </p>
    </div>
  )
}
