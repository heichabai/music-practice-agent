import { useEffect, useRef, useState } from 'react'

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(880)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
