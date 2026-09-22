import { useState } from 'react'
import { MagnifyingGlass, MusicNotes, Play, Trash, X } from '@phosphor-icons/react'
import type { Song } from '../types'

interface Props {
  songs: Array<Song & { source?: string }>
  onPlay: (song: Song) => void
  onDelete?: (id: string) => void
}

export function SongSection({ songs, onPlay, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const visible = songs.filter(s => s.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (filter === 'all' || (filter === 'custom' ? s.source !== undefined : s.source === undefined)))
  return (
    <div className="song-library">
      <div className="library-toolbar">
        <div className="library-filters" role="group" aria-label="曲目来源">
          {([['all', '全部曲目'], ['builtin', '内置曲目'], ['custom', '我的乐谱']] as const).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={filter === value ? 'selected' : ''}>{label}</button>)}
        </div>
        <label className="song-search"><MagnifyingGlass size={18} /><input aria-label="搜索曲目" placeholder="搜索一首想弹的曲子" value={query} onChange={e => setQuery(e.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="清除搜索"><X size={14} /></button>}</label>
      </div>
      <div className="section-heading"><h2>把喜欢的旋律，留给今天</h2><span aria-live="polite">{visible.length} 首曲目</span></div>
      <div className="song-grid">
        {visible.map(song => {
          const index = songs.indexOf(song)
          return <article className="song-card" key={song.id}>
            <button className="song-card-play" onClick={() => onPlay(song)} aria-label={`练习 ${song.name}`}>
              <div className={`song-cover cover-${index % 4}`} aria-hidden="true"><span className="cover-label">{song.source ? 'MY COLLECTION' : 'PIANO STUDIES'}</span><div className="cover-staff">{[0,1,2,3,4].map(n => <i key={n} />)}<MusicNotes size={62} weight="thin" /></div><span className="cover-number">{String(index + 1).padStart(2, '0')}</span><span className="cover-play"><Play size={19} weight="fill" /></span></div>
              <div className="song-card-copy"><span className="song-source">{song.source ? '我的乐谱' : '基础练习'}</span><h3>{song.name}</h3><p><span>{song.bpm} <small>BPM</small></span><span>{song.notes.length} 个音符</span></p></div>
            </button>
            {song.source && onDelete && <div className="song-delete">{pendingDelete === song.id ? <><span>删除这首曲目？</span><button onClick={() => { onDelete(song.id); setPendingDelete(null) }}>删除</button><button onClick={() => setPendingDelete(null)}>取消</button></> : <button aria-label={`删除 ${song.name}`} onClick={() => setPendingDelete(song.id)}><Trash size={15} /> 删除</button>}</div>}
          </article>
        })}
      </div>
      {!visible.length && <div className="library-empty"><MusicNotes size={40} weight="thin" /><h3>{query ? '没有找到这首曲子' : '你的曲库，等待第一首收藏'}</h3><p>{query ? '试试其他曲名，或清除搜索条件。' : '从「导入乐谱」添加 MIDI、图片或 PDF。'}</p></div>}
    </div>
  )
}
