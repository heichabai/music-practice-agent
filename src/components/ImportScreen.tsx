import { useEffect, useRef, useState } from 'react'
import { importMidiFile } from '../game/midiImport'
import type { Song } from '../types'
import { PrimaryButton, GhostButton } from './ui/Button'
import { IconChevronRight, IconMidiKeys, IconScanFrame } from './icons'

interface Props {
  onDraft: (
    song: Song,
    source: 'image' | 'midi' | 'omr',
    info?: string,
    imageUrl?: string,
  ) => void
  onCancel: () => void
}

const STORE_EDGE = 1100

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法处理图片')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** 生成存档用的小图（长边 1100、质量 0.72，控制 localStorage 体积） */
async function shrinkForStore(dataUrl: string): Promise<string> {
  try {
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob())
    const scale = Math.min(1, STORE_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return ''
  }
}

export function ImportScreen({ onDraft, onCancel }: Props) {
  const [busy, setBusy] = useState<'midi' | 'omr' | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const midiInputRef = useRef<HTMLInputElement | null>(null)
  const omrInputRef = useRef<HTMLInputElement | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (busy === null) {
      setElapsed(0)
      return
    }
    const timer = window.setInterval(() => setElapsed(s => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [busy])

  const handleOmr = async (file: File) => {
    setBusy('omr')
    setError('')
    setProgress('本地 OMR 引擎识别中（首次会自动启动服务）…')
    try {
      let res: Response
      try {
        res = await fetch('/api/omr?name=' + encodeURIComponent(file.name), {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: await file.arrayBuffer(),
        })
      } catch {
        throw new Error('无法连接本地 OMR 服务（自动启动失败），或改用 MIDI 导入')
      }
      // 服务未启动 / 代理 404 时返回的是 HTML 错误页，res.json() 会抛
      // "The string did not match the expected pattern" —— 先拦截给可读的指引
      let data: {
        name?: string
        bpm?: number
        notes?: Array<{ midi: number; time: number; duration: number }>
        error?: string
        lowQuality?: boolean
      }
      try {
        data = (await res.json()) as typeof data
      } catch {
        throw new Error('本地 OMR 服务未响应（已尝试自动启动），可手动运行 npm run omr 排查，或改用 MIDI 导入')
      }
      if (!res.ok) throw new Error(data.error ?? `OMR 服务错误（${res.status}）`)
      if (!Array.isArray(data.notes) || data.notes.length === 0) {
        throw new Error('没有识别出音符')
      }
      if (data.lowQuality) {
        throw new Error('图片质量不足以精确识别。建议换更清晰的扫描件 / PDF 原文件，或改用 MIDI 导入')
      }
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      const storeImage = isPdf ? undefined : await shrinkForStore(await compressImage(file))
      onDraft(
        {
          id: `omr-${Date.now().toString(36)}`,
          name: data.name ?? file.name.replace(/\.[^.]+$/, ''),
          bpm: data.bpm ?? 100,
          notes: data.notes,
        },
        'omr',
        `本地 OMR 精确识别出 ${data.notes.length} 个音（谱面全部声部，双手谱需双手练习），请试听确认后保存`,
        storeImage !== '' && storeImage !== undefined ? storeImage : undefined,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      setProgress('')
      if (omrInputRef.current) omrInputRef.current.value = ''
    }
  }

  const handleMidi = async (file: File) => {
    setBusy('midi')
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      const { song, info } = importMidiFile(buffer, file.name)
      onDraft(song, 'midi', info)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      if (midiInputRef.current) midiInputRef.current.value = ''
    }
  }

  return (
    <div className="screen-enter w-full max-w-2xl">
      <div className="flex items-center gap-5 border-b border-border-subtle pb-4">
        <GhostButton onClick={onCancel} className="px-3 py-1 text-xs">
          ‹ 返回
        </GhostButton>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          Import Score
        </span>
      </div>

      <section className="mt-12">
        <h1 className="text-h2 font-black tracking-tight text-primary">📥 导入乐谱</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary">
          上传乐谱图片 / PDF 由本地 OMR 引擎离线识别（印刷谱准确率高），或直接导入
          MIDI 文件（100% 精确）。导入后都会进入校对编辑器，试听无误再存入曲库。
        </p>

        <div className="mt-6 flex items-center gap-2 text-micro text-muted">
          <span className="rounded-full bg-raised-2 px-2.5 py-1 text-primary">导入</span>
          <IconChevronRight className="h-3 w-3 text-muted" />
          <span className="rounded-full bg-raised-2 px-2.5 py-1">校对</span>
          <IconChevronRight className="h-3 w-3 text-muted" />
          <span className="rounded-full bg-raised-2 px-2.5 py-1">入库练习</span>
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-accent/40 bg-surface p-5 transition-colors duration-200 hover:border-accent/70">
            <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400/90 to-orange-600/90 text-slate-950 shadow-[0_4px_16px_rgb(245_158_11/0.35)]">
              <IconScanFrame className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              本地精确识别
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-normal text-accent-strong">
                印刷谱推荐 · OMR 离线引擎
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">
              专业乐谱识别引擎（Audiveris），在本机离线运行，印刷五线谱准确率高；
              支持图片与 PDF，首次识别会自动启动本地识别服务
            </p>
            <input
              ref={omrInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) void handleOmr(file)
              }}
            />
            <PrimaryButton
              className={`mt-4 ${busy !== null ? 'pointer-events-none opacity-40' : ''}`}
              onClick={() => omrInputRef.current?.click()}
            >
              {busy === 'omr'
                ? `${progress}${elapsed > 10 ? ` · ${elapsed}s` : ''}`
                : '选择乐谱（本地精确识别）'}
            </PrimaryButton>
            </div>
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface p-5 transition-colors duration-200 hover:border-border-strong">
            <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-500/80 to-slate-700/80 text-white">
              <IconMidiKeys className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary">MIDI 文件 · 精确导入</p>
            <p className="mt-1 text-xs text-muted">
              支持 .mid / .midi，多轨道自动选取主旋律
            </p>
            <input
              ref={midiInputRef}
              type="file"
              accept=".mid,.midi,audio/midi,audio/mid"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) void handleMidi(file)
              }}
            />
            <GhostButton
              className={`mt-4 ${busy !== null ? 'pointer-events-none opacity-40' : ''}`}
              onClick={() => midiInputRef.current?.click()}
            >
              {busy === 'midi' ? '正在解析…' : '选择 MIDI 文件'}
            </GhostButton>
            </div>
            </div>
          </div>
        </div>

        {error !== '' && (
          <p className="mt-6 rounded-lg border border-wrong/40 bg-wrong/10 px-4 py-3 text-sm text-wrong">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}
