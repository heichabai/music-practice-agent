import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const MAX_EDGE = 1568
export const MAX_PDF_PAGES = 8

/** 将 PDF 每页渲染为 JPEG data URL（最长边不超过 1568px） */
export async function pdfToImageDataUrls(buffer: ArrayBuffer): Promise<string[]> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES)
  const urls: string[] = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(3, Math.max(1, MAX_EDGE / Math.max(base.width, base.height)))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    urls.push(canvas.toDataURL('image/jpeg', 0.85))
  }
  return urls
}
