import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardLayout, isBlack } from '../../game/keyboard'
import type { LessonTask } from '../../game/lessons'
import { useElementSize } from '../../hooks/useElementWidth'

interface Props {
  task: LessonTask
  onSatisfied: () => void
}

/**
 * 页内互动任务：迷你键盘 + 按键验证。
 * 监听 App 广播的 app-note 事件（MIDI 与电脑键盘统一入口），不重复挂载 MIDI。
 * 键盘宽度随容器自适应（右栏/窄屏都能填满）。
 */
export function TaskKeyboard({ task, onSatisfied }: Props) {
  const layout = useMemo(() => new KeyboardLayout(48, 72), [])
  const { ref: kbRef, width: measured } = useElementSize<HTMLDivElement>()
  const width = Math.max(280, Math.round(measured))

  const [done, setDone] = useState(false)
  const [pressed, setPressed] = useState<Set<number>>(new Set())
  const [seqPos, setSeqPos] = useState(0)
  const [flash, setFlash] = useState<'none' | 'ok' | 'miss'>('none')
  const satisfiedRef = useRef(false)
  // 事件监听闭包里拿不到最新 state，用 ref 跟踪 sequence 进度
  const seqPosRef = useRef(0)

  useEffect(() => {
    const onNote = (e: Event) => {
      const detail = (e as CustomEvent<{ midi: number; on: boolean }>).detail
      if (!detail || satisfiedRef.current) return
      if (detail.on) {
        handlePress(detail.midi)
        setPressed(prev => {
          const next = new Set(prev)
          next.add(detail.midi)
          return next
        })
      } else {
        setPressed(prev => {
          const next = new Set(prev)
          next.delete(detail.midi)
          return next
        })
      }
    }
    window.addEventListener('app-note', onNote)
    return () => window.removeEventListener('app-note', onNote)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markFlash = (kind: 'ok' | 'miss') => {
    setFlash(kind)
    window.setTimeout(() => setFlash('none'), 400)
  }

  const handlePress = (midi: number) => {
    if (task.mode === 'any') {
      if (task.targets.includes(midi)) {
        markFlash('ok')
        setDone(true)
        satisfiedRef.current = true
        onSatisfied()
      }
      return
    }
    if (task.mode === 'all') {
      // 满足条件在松键/按住状态里判断：这里先记录，实际判定见下方 effect
      return
    }
    // sequence
    const pos = seqPosRef.current
    const expected = task.targets[pos]
    if (midi === expected) {
      markFlash('ok')
      const nextPos = pos + 1
      seqPosRef.current = nextPos
      setSeqPos(nextPos)
      if (nextPos >= task.targets.length) {
        setDone(true)
        satisfiedRef.current = true
        onSatisfied()
      }
    } else if (task.targets.includes(midi, pos + 1) === false) {
      // 弹错且不在余下序列里 → 重来
      markFlash('miss')
      seqPosRef.current = 0
      setSeqPos(0)
    }
  }

  // all 模式：所有目标同时按住即完成
  useEffect(() => {
    if (task.mode !== 'all' || done) return
    const allHeld = task.targets.every(t => pressed.has(t))
    if (allHeld) {
      setDone(true)
      satisfiedRef.current = true
      markFlash('ok')
      onSatisfied()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressed])

  const highlight = (m: number): string | undefined => {
    if (task.mode === 'sequence' && !done) {
      const expected = task.targets[seqPos]
      if (m === expected) return 'var(--color-accent)'
      const passed = task.targets.slice(0, seqPos).includes(m)
      return passed ? 'var(--color-hit)' : undefined
    }
    if (task.mode === 'sequence' && done) {
      return task.targets.includes(m) ? 'var(--color-hit)' : undefined
    }
    if (task.mode === 'any') return task.targets.includes(m) ? 'var(--color-accent)' : undefined
    return task.targets.includes(m) ? 'var(--color-accent)' : undefined
  }

  const H_WHITE = 84
  const H_BLACK = 54

  return (
    <div
      className={`glass rounded-xl p-5 transition-colors duration-300 ${
        flash === 'ok' ? 'border-hit/60' : flash === 'miss' ? 'border-wrong/60' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
            done ? 'bg-hit/20 text-hit' : 'bg-accent/15 text-accent-strong'
          }`}
        >
          {done ? '✓' : '？'}
        </span>
        <p className={`text-body font-medium ${done ? 'text-hit' : 'text-primary'}`}>
          {task.prompt}
        </p>
      </div>
      {task.hint !== undefined && !done && (
        <p className="mt-1 text-caption text-muted">{task.hint}</p>
      )}
      {task.mode === 'sequence' && !done && (
        <p className="mt-1 text-caption text-secondary">
          进度：{seqPos}/{task.targets.length}
        </p>
      )}

      <div className="mt-4 overflow-x-auto" ref={kbRef}>
        <div className="relative select-none" style={{ width, height: H_WHITE }}>
          {Array.from({ length: layout.hi - layout.lo + 1 }, (_, k) => layout.lo + k).map(m => {
            const g = layout.geom(m, width)
            const black = isBlack(m)
            const bg = highlight(m)
            return (
              <div
                key={m}
                className={`absolute ${black ? 'z-10 rounded-b-sm' : 'z-0'}`}
                style={{
                  left: g.x,
                  width: g.w,
                  top: 0,
                  height: black ? H_BLACK : H_WHITE,
                  background: bg
                    ? `linear-gradient(180deg, ${bg}, ${bg}cc)`
                    : black
                      ? 'linear-gradient(180deg, #26262c 0%, #0c0c0e 82%, #000 100%)'
                      : 'linear-gradient(180deg, #ffffff 0%, #f4f4f6 70%, #e3e3e8 100%)',
                  borderRight: black
                    ? '1px solid rgb(0 0 0 / 0.55)'
                    : '1px solid #d9d9de',
                  boxShadow:
                    bg === 'var(--color-accent)'
                      ? '0 0 14px 1px rgb(245 158 11 / 0.5)'
                      : undefined,
                  transition: 'background-color 200ms',
                }}
              />
            )
          })}
        </div>
      </div>

      <p className="mt-3 text-caption text-muted">
        {done
          ? '完成！做得好。'
          : task.mode === 'all'
            ? '把高亮的键同时按住'
            : task.mode === 'sequence'
              ? '跟随琥珀色高亮依次弹奏'
              : '按下任意一个高亮的键'}
      </p>
    </div>
  )
}
