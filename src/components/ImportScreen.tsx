import { useEffect, useRef, useState } from 'react'
import { importMidiFile } from '../game/midiImport'
import { visionChat } from '../ai/visionClient'
import { SHEET_PROMPT, parseSheetResponse, mergePageDrafts, type SheetDraft } from '../ai/sheetPrompts'
import { pdfToImageDataUrls, splitImageDataUrl, MAX_PDF_PAGES } from '../ai/pdfPages'
import type { Song } from '../types'
import { PrimaryButton, GhostButton } from './ui/Button'
import { IconChevronRight, IconMidiKeys, IconScanFrame, IconSparkles } from './icons'

interface Props {
  onDraft: (
    song: Song,
    source: 'image' | 'midi' | 'omr',
    info?: string,
    imageUrl?: string,
  ) => void
  onCancel: () => void
}

const MAX_EDGE = 1568
const STORE_EDGE = 1100

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
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
  const [busy, setBusy] = useState<'image' | 'midi' | 'omr' | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement | null>(null)
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

  const finishDraft = (draft: SheetDraft, pages: number, imageUrl?: string) => {
    const truncationHint = draft.salvaged ? '；识别输出曾被截断，后半段请重点核对' : ''
    onDraft(
      {
        id: `img-${Date.now().toString(36)}`,
        name: draft.name,
        bpm: draft.bpm,
        notes: draft.notes,
      },
      'image',
      (pages > 1
        ? `AI 识别 ${pages} 页共 ${draft.notes.length} 个音（按小节自动衔接）`
        : `AI 识别出 ${draft.notes.length} 个音`) +
        truncationHint +
        '，请试听并校对后保存',
      imageUrl !== '' ? imageUrl : undefined,
    )
  }

  const recognizeOnce = async (dataUrl: string, sourceName: string, allowEmpty: boolean) => {
    const { content, finishReason } = await visionChat(SHEET_PROMPT, dataUrl)
    return parseSheetResponse(content, sourceName, { allowEmpty, finishReason })
  }

  const recognizeWithSplit = async (
    dataUrl: string,
    sourceName: string,
    allowEmpty: boolean,
  ): Promise<SheetDraft> => {
    const first = await recognizeOnce(dataUrl, sourceName, allowEmpty)
    if (!first.salvaged) return first
    for (const parts of [2, 4]) {
      setProgress(`识别输出被截断，正在分 ${parts} 段重新识别…`)
      const strips = await splitImageDataUrl(dataUrl, parts)
      const drafts: SheetDraft[] = []
      for (const strip of strips) {
        try {
          drafts.push(await recognizeOnce(strip, sourceName, true))
        } catch {
          // 跳过识别失败的片段
        }
      }
      if (!drafts.some(d => d.notes.length > 0)) continue
      const merged = mergePageDrafts(drafts)
      if (drafts.every(d => !d.salvaged)) return merged
      if (parts === 4) return { ...merged, salvaged: true }
    }
    return first
  }

  const recognizePdf = async (file: File): Promise<{ draft: SheetDraft; pages: number }> => {
    const buffer = await file.arrayBuffer()
    const pages = await pdfToImageDataUrls(buffer)
    const sourceName = file.name.replace(/\.[^.]+$/, '')
    const drafts: SheetDraft[] = []
    let skipped = 0
    for (let i = 0; i < pages.length; i++) {
      setProgress(`正在识别第 ${i + 1}/${pages.length} 页…`)
      try {
        drafts.push(await recognizeWithSplit(pages[i], sourceName, true))
      } catch {
        try {
          drafts.push(await recognizeWithSplit(pages[i], sourceName, true))
        } catch {
          skipped++
        }
      }
    }
    if (skipped > 0 && drafts.some(d => d.notes.length > 0)) {
      setProgress(`已跳过 ${skipped} 个识别失败/空白页`)
    }
    return { draft: mergePageDrafts(drafts), pages: pages.length }
  }

  const handleImage = async (file: File) => {
    setBusy('image')
    setError('')
    setProgress('')
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (isPdf) {
        setProgress('正在解析 PDF…')
        const { draft, pages } = await recognizePdf(file)
        finishDraft(draft, pages)
      } else {
        setProgress('正在识别乐谱…')
        const dataUrl = await compressImage(file)
        const sourceName = file.name.replace(/\.[^.]+$/, '')
        let draft: SheetDraft
        try {
          draft = await recognizeWithSplit(dataUrl, sourceName, false)
        } catch {
          draft = await recognizeWithSplit(dataUrl, sourceName, false)
        }
        finishDraft(draft, 1, await shrinkForStore(dataUrl))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      setProgress('')
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleOmr = async (file: File) => {
    setBusy('omr')
    setError('')
    setProgress('本地 OMR 引擎识别中…')
    try {
      const res = await fetch(
        '/api/omr?name=' + encodeURIComponent(file.name),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: await file.arrayBuffer(),
        },
      )
      const data = (await res.json()) as {
        name?: string
        bpm?: number
        notes?: Array<{ midi: number; time: number; duration: number }>
        error?: string
        lowQuality?: boolean
      }
      if (!res.ok) throw new Error(data.error ?? `OMR 服务错误（${res.status}）`)
      if (!Array.isArray(data.notes) || data.notes.length === 0) {
        throw new Error('没有识别出音符')
      }
      if (data.lowQuality) {
        setProgress('图片质量不足以精确识别，自动切换 AI 通道（约 2 分钟）…')
        const dataUrl = await compressImage(file)
        const sourceName = file.name.replace(/\.[^.]+$/, '')
        let draft
        try {
          draft = await recognizeWithSplit(dataUrl, sourceName, false)
        } catch {
          throw new Error(
            '图片质量不足：精确识别无有效结果，AI 兜底也失败了。建议改用 PDF 文件或更清晰的截图',
          )
        }
        onDraft(
          {
            id: `img-${Date.now().toString(36)}`,
            name: draft.name,
            bpm: draft.bpm,
            notes: draft.notes,
          },
          'image',
          `OMR 判定图片质量不足，已由 AI 兜底识别出 ${draft.notes.length} 个音（准确率有限），请仔细校对后保存`,
          await shrinkForStore(dataUrl),
        )
        return
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
        storeImage !== '' ? storeImage : undefined,
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
        <h1 className="text-3xl font-light tracking-tight text-primary">导入乐谱</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary">
          上传乐谱图片由 AI 识别，或直接上传 MIDI 文件（100% 精确）。
          导入后都会进入校对编辑器，试听无误再存入曲库。
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
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-dim text-accent">
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
              支持图片与 PDF
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
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-raised-2 text-info">
              <IconSparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary">乐谱图片 / PDF · AI 识别</p>
            <p className="mt-1 text-xs text-muted">
              支持五线谱图片（截图或清晰照片）与 PDF 乐谱（最多识别前 {MAX_PDF_PAGES} 页，按小节自动衔接）；
              识别单旋律，建议使用清晰文件，糊照准确率会下降
            </p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) void handleImage(file)
              }}
            />
            <PrimaryButton
              className={`mt-4 ${busy !== null ? 'pointer-events-none opacity-40' : ''}`}
              onClick={() => imageInputRef.current?.click()}
            >
              {busy === 'image'
                ? `${progress || '正在识别乐谱…'}${elapsed > 10 ? ` · ${elapsed}s` : ''}`
                : '选择乐谱图片或 PDF'}
            </PrimaryButton>
            </div>
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface p-5 transition-colors duration-200 hover:border-border-strong">
            <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-raised-2 text-secondary">
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
