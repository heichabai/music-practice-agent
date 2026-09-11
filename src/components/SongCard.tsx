import { MusicNote, MusicNotes, PianoKeys, Play, Robot, Trash } from '@phosphor-icons/react'
import type { Song } from '../types'

interface Props {
  songs: Array<Song & { source?: string }>
  onPlay: (song: Song) => void
  onDelete?: (id: string) => void
}

const ROW_COLORS = ['#38bdf8', '#a882ff', '#4ade80', '#d9a54a', '#f87171', '#2dd4bf']

function SourceIcon({ source, size = 15 }: { source?: string; size?: number }) {
  if (source === 'omr') return <MusicNotes size={size} weight="duotone" />
  if (source === 'image') return <Robot size={size} weight="duotone" />
  if (source === 'midi') return <PianoKeys size={size} weight="duotone" />
  return <MusicNote size={size} weight="duotone" />
}

/** 曲目行：序号 / 来源图标 / 标题 / 元信息 / 播放 */
function SongRow({
  song,
  index,
  onPlay,
  onDelete,
}: {
  song: Song & { source?: string }
  index: number
  onPlay: (s: Song) => void
  onDelete?: (id: string) => void
}) {
  const idx = Math.abs(song.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % ROW_COLORS.length
  const color = ROW_COLORS[idx]

  return (
    <div className="group relative flex items-center">
      <button
        onClick={() => onPlay(song)}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors duration-150 hover:bg-raised/50"
      >
        <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">
          {String(index).padStart(2, '0')}
        </span>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{ background: `${color}17`, color, boxShadow: `inset 0 0 0 1px ${color}33` }}
        >
          <SourceIcon source={song.source} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-primary">{song.name}</span>
          <span className="text-xs font-medium tabular-nums text-muted">
            {song.bpm} BPM / {song.notes.length} 音
          </span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-accent-strong opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <Play size={14} weight="fill" />
        </span>
      </button>
      {onDelete !== undefined && (
        <button
          onClick={() => onDelete(song.id)}
          title="删除该曲目"
          className="absolute right-12 grid h-7 w-7 place-items-center rounded-full text-muted opacity-0 transition-opacity duration-150 hover:bg-wrong/15 hover:text-wrong group-hover:opacity-100"
        >
          <Trash size={13} />
        </button>
      )}
    </div>
  )
}

/** 曲库：分组曲目列表（我的曲目 / 内置曲目） */
export function SongSection({ songs, onPlay, onDelete }: Props) {
  const builtIn = songs.filter(s => s.source === undefined)
  const custom = songs.filter(s => s.source !== undefined)

  const groups: Array<{ title: string; items: Array<Song & { source?: string }>; deletable: boolean }> = []
  if (custom.length > 0) groups.push({ title: '我的曲目', items: custom, deletable: true })
  groups.push({ title: '内置曲目', items: builtIn, deletable: false })

  return (
    <div className="space-y-10">
      {groups.map(group => (
        <section key={group.title}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-h3 font-semibold text-primary">{group.title}</h2>
            <span className="text-caption tabular-nums text-muted">{group.items.length} 首</span>
          </div>
          <div className="mt-2 divide-y divide-border-subtle/60">
            {group.items.map((s, i) => (
              <SongRow
                key={s.id}
                song={s}
                index={i + 1}
                onPlay={onPlay}
                onDelete={group.deletable ? onDelete : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
