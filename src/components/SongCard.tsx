import type { Song } from '../types'

interface Props {
  songs: Array<Song & { source?: string }>
  onPlay: (song: Song) => void
  onDelete?: (id: string) => void
}


const CARD_COLORS = ['#1CB0F6', '#CE82FF', '#58CC02', '#FF9600', '#FF4B4B', '#00CD9C']

/** 多邻国风格曲目卡片：彩色左边框 + 大标题 + BPM */
export function SongCard({ song, onPlay, onDelete }: { song: Song & { source?: string }; onPlay: (s: Song) => void; onDelete?: (id: string) => void }) {
  const idx = Math.abs(song.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % CARD_COLORS.length
  const color = CARD_COLORS[idx]

  return (
    <div className="group relative">
      <button
        onClick={() => onPlay(song)}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 text-left transition-all duration-150 hover:border-current active:translate-y-[2px]"
        style={{ borderLeftColor: color }}
      >
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl font-black text-gray-900"
          style={{ background: color, boxShadow: `0 3px 0 ${color}80` }}
        >
          {song.source === 'omr' ? '🎼' : song.source === 'image' ? '🤖' : song.source === 'midi' ? '🎹' : '🎵'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold text-gray-900">{song.name}</span>
          <span className="text-xs font-medium text-gray-400">
            {song.bpm} BPM · {song.notes.length} 音
          </span>
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-500 transition-transform group-hover:scale-125" fill="currentColor">
          <path d="M8 5.14v14l11-7-11-7z" />
        </svg>
      </button>
      {onDelete !== undefined && (
        <button
          onClick={() => onDelete(song.id)}
          className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-[#FF4B4B] text-xs text-gray-900 opacity-0 transition-opacity group-hover:opacity-100"
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
    <div className="space-y-3">
      {custom.length > 0 && (
        <>
          <p className="text-xs font-black uppercase tracking-wider text-[#CE82FF]">我的曲目</p>
          {custom.map(s => (
            <SongCard key={s.id} song={s} onPlay={onPlay} onDelete={onDelete} />
          ))}
          <div className="h-2" />
        </>
      )}
      <p className="text-xs font-black uppercase tracking-wider text-[#1CB0F6]">曲目</p>
      {builtIn.map(s => (
        <SongCard key={s.id} song={s} onPlay={onPlay} />
      ))}
    </div>
  )
}
