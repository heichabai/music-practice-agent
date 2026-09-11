import { MusicNote, MusicNotes, PianoKeys, Play, Robot } from '@phosphor-icons/react'
import type { Song } from '../types'

interface Props {
  songs: Array<Song & { source?: string }>
  onPlay: (song: Song) => void
  onDelete?: (id: string) => void
}


const CARD_COLORS = ['#38bdf8', '#a882ff', '#4ade80', '#d9a54a', '#f87171', '#2dd4bf']

function SourceIcon({ source, size = 18 }: { source?: string; size?: number }) {
  if (source === 'omr') return <MusicNotes size={size} weight="duotone" />
  if (source === 'image') return <Robot size={size} weight="duotone" />
  if (source === 'midi') return <PianoKeys size={size} weight="duotone" />
  return <MusicNote size={size} weight="duotone" />
}

/** 深色曲目卡片：彩色光条 + 标题 + BPM，全宽网格排布 */
export function SongCard({ song, onPlay, onDelete }: { song: Song & { source?: string }; onPlay: (s: Song) => void; onDelete?: (id: string) => void }) {
  const idx = Math.abs(song.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length
  const color = CARD_COLORS[idx]

  return (
    <div className="group relative">
      <button
        onClick={() => onPlay(song)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-raised/60 p-4 text-left transition-all duration-200 hover:border-border-strong hover:bg-raised hover:shadow-soft active:translate-y-[1px]"
      >
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ background: `${color}1a`, color, boxShadow: `inset 0 0 0 1px ${color}3d` }}
        >
          <SourceIcon source={song.source} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-primary">{song.name}</span>
          <span className="text-xs font-medium tabular-nums text-muted">
            {song.bpm} BPM / {song.notes.length} 音
          </span>
        </span>
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:scale-105"
          style={{ background: `${color}1a`, color }}
        >
          <Play size={13} weight="fill" />
        </span>
      </button>
      {onDelete !== undefined && (
        <button
          onClick={() => onDelete(song.id)}
          className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-wrong text-xs font-bold text-[#10131c] opacity-0 transition-opacity group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function SongSection({ songs, onPlay, onDelete }: Props) {
  const builtIn = songs.filter(s => s.source === undefined)
  const custom = songs.filter(s => s.source !== undefined)

  return (
    <div className="space-y-8">
      {custom.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-accent-strong">我的曲目</p>
          <div className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {custom.map(s => (
              <SongCard key={s.id} song={s} onPlay={onPlay} onDelete={onDelete} />
            ))}
          </div>
        </section>
      )}
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-info">内置曲目</p>
        <div className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {builtIn.map(s => (
            <SongCard key={s.id} song={s} onPlay={onPlay} />
          ))}
        </div>
      </section>
    </div>
  )
}
