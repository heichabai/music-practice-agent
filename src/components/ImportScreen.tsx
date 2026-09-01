import { useRef, useState } from 'react'
import { importMidiFile } from '../game/midiImport'
import { visionChat } from '../ai/visionClient'
import { SHEET_PROMPT, parseSheetResponse, mergePageDrafts, type SheetDraft } from '../ai/sheetPrompts'
import { pdfToImageDataUrls, MAX_PDF_PAGES } from '../ai/pdfPages'
import type { Song } from '../types'
import { PrimaryButton, GhostButton } from './ui/Button'

interface Props {
  onDraft: (song: Song, source: 'image' | 'midi', info?: string) => void
  onCancel: () => void
}

const MAX_EDGE = 1568

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

export function ImportScreen({ onDraft, onCancel }: Props) {
  const [busy, setBusy] = useState<'image' | 'midi' | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const midiInputRef = useRef<HTMLInputElement | null>(null)

  const finishDraft = (draft: SheetDraft, pages: number) => {
    onDraft(
      {
        id: `img-${Date.now().toString(36)}`,
        name: draft.name,
        bpm: draft.bpm,
        notes: draft.notes,
      },
      'image',
      pages > 1
        ? `AI 识别 ${pages} 页共 ${draft.notes.length} 个音（按小节自动衔接），请试听并校对后保存`
        : `AI 识别出 ${draft.notes.length} 个音，请试听并校对后保存`,
    )
  }

  const recognizeImage = async (file: File) => {
    const dataUrl = await compressImage(file)
    const raw = await visionChat(SHEET_PROMPT, dataUrl)
    const draft = parseSheetResponse(raw, file.name.replace(/\.[^.]+$/, ''))
    finishDraft(draft, 1)
  }

  const recognizePdf = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const pages = await pdfToImageDataUrls(buffer)
    const drafts: SheetDraft[] = []
    for (let i = 0; i < pages.length; i++) {
      setProgress(`正在识别第 ${i + 1}/${pages.length} 页…`)
      const raw = await visionChat(SHEET_PROMPT, pages[i])
      drafts.push(
        parseSheetResponse(raw, file.name.replace(/\.[^.]+$/, ''), { allowEmpty: true }),
      )
    }
    const merged = mergePageDrafts(drafts)
    finishDraft(merged, pages.length)
  }

  const handleImage = async (file: File) => {
    setBusy('image')
    setError('')
    setProgress('')
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (isPdf) {
        await recognizePdf(file)
      } else {
        setProgress('正在识别乐谱…')
        await recognizeImage(file)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      setProgress('')
      if (imageInputRef.current) imageInputRef.current.value = ''
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

        <div className="mt-10 space-y-6">
          <div className="rounded-xl border border-border-subtle p-6">
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
              {busy === 'image' ? progress || '正在识别乐谱…' : '选择乐谱图片或 PDF'}
            </PrimaryButton>
          </div>

          <div className="rounded-xl border border-border-subtle p-6">
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

        {error !== '' && (
          <p className="mt-6 rounded-lg border border-wrong/40 bg-wrong/10 px-4 py-3 text-sm text-wrong">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}
