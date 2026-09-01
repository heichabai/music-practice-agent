export const MAX_PDF_PAGES = 8

const MAX_EDGE = 1568

/** 把图片按竖条切分（带少量重叠），用于识谱输出截断时的分片重试 */
export async function splitImageDataUrl(
  dataUrl: string,
  parts: number,
  overlapRatio = 0.08,
): Promise<string[]> {
  const img = await createImageBitmap(await (await fetch(dataUrl)).blob())
  const width = Math.floor(img.width / parts * (1 + overlapRatio * (parts - 1)))
  const stride = Math.floor(img.width / parts) - Math.floor(img.width * overlapRatio / parts)
  const strips: string[] = []
  for (let i = 0; i < parts; i++) {
    const x = Math.min(i * stride, img.width - width)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, img.height)
    ctx.drawImage(img, x, 0, width, img.height, 0, 0, width, img.height)
    strips.push(canvas.toDataURL('image/jpeg', 0.85))
  }
  return strips
}

type PdfjsModule = typeof import('pdfjs-dist')

async function loadPdfjs(): Promise<PdfjsModule> {
  const mod = (await import('pdfjs-dist')) as unknown as {
    getDocument?: PdfjsModule['getDocument']
    GlobalWorkerOptions?: PdfjsModule['GlobalWorkerOptions']
    default?: PdfjsModule
  }
  const pdfjs =
    mod.getDocument !== undefined ? (mod as unknown as PdfjsModule) : (mod.default ?? (mod as unknown as PdfjsModule))
  const workerModule = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')) as {
    default: string
  }
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default
  }
  return pdfjs
}

/**
 * 将 PDF 每页渲染为 JPEG data URL（最长边不超过 1568px）。
 * pdfjs 按需动态加载，不进主包：老浏览器上仅 PDF 功能不可用，不影响其余功能。
 */
export async function pdfToImageDataUrls(buffer: ArrayBuffer): Promise<string[]> {
  const pdfjs = await loadPdfjs()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
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
    await page.render({ canvasContext: ctx, viewport }).promise
    urls.push(canvas.toDataURL('image/jpeg', 0.85))
  }
  return urls
}
