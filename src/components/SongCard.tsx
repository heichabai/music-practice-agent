import type { Song } from '../types'

interface Props {
  songs: Array<Song & { source?: string }>
  onPlay: (song: Song) => void
  onDelete?: (id: string) => void
}


const CARD_COLORS = ['#38bdf8', '#a882ff', '#4ade80', '#f2b234', '#f87171', '#2dd4bf']

/** 深色曲目卡片：彩色光条 + 标题 + BPM，全宽网格排布 */
export function SongCard({ song, onPlay, onDelete }: { song: Song & { source?: string }; onPlay: (s: Song) => void; onDelete?: (id: string) => void }) {
  const idx = Math.abs(song.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length
  const color = CARD_COLORS[idx]

  return (
    <div className="group relative">
      <button
        onClick={() => onPlay(song)}
        className="flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-raised/70 p-4 text-left transition-all duration-150 hover:border-border-strong hover:bg-raised hover:shadow-[0_6px_24px_rgb(0_0_0/0.4)] active:translate-y-[1px]"
      >
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lg"
          style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}
        >
          {song.source === 'omr' ? '🎼' : song.source === 'image' ? '🤖' : song.source === 'midi' ? '🎹' : '🎵'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-primary">{song.name}</span>
          <span className="text-xs font-medium text-muted">
            {song.bpm} BPM · {song.notes.length} 音
          </span>
        </span>
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all group-hover:scale-110"
          style={{ background: `${color}1e`, color }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
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
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {custom.map(s => (
              <SongCard key={s.id} song={s} onPlay={onPlay} onDelete={onDelete} />
            ))}
          </div>
        </section>
      )}
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-info">内置曲目</p>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {builtIn.map(s => (
            <SongCard key={s.id} song={s} onPlay={onPlay} />
          ))}
        </div>
      </section>
    </div>
  )
}
