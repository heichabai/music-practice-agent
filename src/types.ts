export interface Note {
  midi: number
  time: number
  duration: number
}

export interface Song {
  id: string
  name: string
  bpm: number
  notes: Note[]
}

export type NoteState = 'pending' | 'active' | 'hit'
