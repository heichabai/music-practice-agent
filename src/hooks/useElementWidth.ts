import { useCallback, useRef, useState } from 'react'

/**
 * 元素宽高测量。必须用 callback ref 而非 useEffect：
 * 条件渲染（如 screen 切换）下元素在 hook 首次运行时才挂载，
 * useEffect(..., []) 会因 ref.current 为 null 而永远不再重试。
 */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 880, height: 560 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el) return
    setSize({ width: el.clientWidth, height: el.clientHeight })
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(el)
    observerRef.current = observer
  }, [])

  return { ref, width: size.width, height: size.height }
}

export function useElementWidth<T extends HTMLElement>() {
  const { ref, width } = useElementSize<T>()
  return { ref, width }
}
