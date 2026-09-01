import * as midiModule from '@tonejs/midi'
import type { Note, Song } from '../types'

type MidiCtor = typeof import('@tonejs/midi').Midi

// CommonJS 包在不同环境下的导出位置不同，逐级兜底
const moduleShape = midiModule as unknown as {
  Midi?: MidiCtor
  default?: { Midi?: MidiCtor }
}
const Midi = moduleShape.Midi ?? moduleShape.default?.Midi

export interface MidiImportResult {
  song: Song
  info: string
}

/** 解析 .mid 文件为练习用单旋律曲目（自动选取音符最多的轨道） */
export function importMidiFile(buffer: ArrayBuffer, fileName: string): MidiImportResult {
  if (!Midi) {
    throw new Error('MIDI 解析模块加载失败，请刷新页面重试')
  }
  const midi = new Midi(buffer)
  const tracks = midi.tracks.filter(t => t.notes.length > 0)
  if (tracks.length === 0) {
    throw new Error('MIDI 文件中没有找到音符')
  }
  const track = tracks.reduce((a, b) => (b.notes.length > a.notes.length ? b : a))

  const bpm = midi.header.tempos[0]?.bpm ?? 100
  const secondsPerBeat = 60 / bpm

  const notes: Note[] = track.notes
    .map(n => ({
      midi: n.midi,
      time: n.time / secondsPerBeat,
      duration: Math.max(0.25, n.duration / secondsPerBeat),
    }))
    .filter(n => n.midi >= 21 && n.midi <= 108)
    .sort((a, b) => a.time - b.time)

  if (notes.length === 0) {
    throw new Error('有效音域内（A0-C8）没有音符')
  }

  const name = fileName.replace(/\.(midi?|MIDI?)$/, '').trim() || '导入曲目'
  const info =
    tracks.length > 1
      ? `文件含 ${tracks.length} 条轨道，已自动选取音符最多的主旋律轨道（${notes.length} 个音）`
      : `已导入 ${notes.length} 个音`

  return {
    song: {
      id: `midi-${Date.now().toString(36)}`,
      name,
      bpm: Math.round(Math.min(240, Math.max(30, bpm))),
      notes,
    },
    info,
  }
}
