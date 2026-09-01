import type { Song } from '../types'

export type SongSource = 'image' | 'midi' | 'omr'

export interface CustomSong extends Song {
  source: SongSource
  createdAt: number
}

const KEY = 'mpa.customSongs.v1'
const MAX_SONGS = 50

const memory = new Map<string, string>()

function getRaw(): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(KEY)
  } catch {
    // 隐私模式等场景
  }
  return memory.get(KEY) ?? null
}

function setRaw(value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, value)
      return
    }
  } catch {
    // 同上
  }
  memory.set(KEY, value)
}

function parseAll(): CustomSong[] {
  const raw = getRaw()
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter((s): s is CustomSong => {
      const song = s as CustomSong
      return (
        typeof song?.id === 'string' &&
        typeof song?.name === 'string' &&
        typeof song?.bpm === 'number' &&
        Array.isArray(song?.notes) &&
        song.notes.every(n => typeof n?.midi === 'number' && typeof n?.time === 'number' && typeof n?.duration === 'number')
      )
    })
  } catch {
    return []
  }
}

export function listCustomSongs(): CustomSong[] {
  return parseAll()
}

export function saveCustomSong(song: Song, source: SongSource): CustomSong {
  const entry: CustomSong = {
    ...song,
    name: song.name.trim() || '未命名曲目',
    source,
    createdAt: Date.now(),
  }
  const rest = parseAll().filter(s => s.id !== entry.id)
  setRaw(JSON.stringify([entry, ...rest].slice(0, MAX_SONGS)))
  return entry
}

export function deleteCustomSong(id: string): void {
  setRaw(JSON.stringify(parseAll().filter(s => s.id !== id)))
}
