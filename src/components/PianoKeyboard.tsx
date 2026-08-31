import { isBlack, KeyboardLayout, noteName } from '../game/keyboard'

const HEIGHT_WHITE = 104
const HEIGHT_BLACK = 66

interface Props {
  layout: KeyboardLayout
  width: number
  pressedSet: Set<number>
  targetSet: Set<number>
  wrong: { midi: number; id: number } | null
}

export function PianoKeyboard({ layout, width, pressedSet, targetSet, wrong }: Props) {
  const midis: number[] = []
  for (let m = layout.lo; m <= layout.hi; m++) midis.push(m)

  return (
    <div className="relative select-none" style={{ width, height: HEIGHT_WHITE }}>
      {midis.map(m => {
        const g = layout.geom(m, width)
        const black = isBlack(m)
        const isPressed = pressedSet.has(m)
        const isTarget = targetSet.has(m)
        const isWrong = wrong !== null && wrong.midi === m

        let bg = black ? 'bg-slate-800' : 'bg-white'
        if (isTarget) bg = black ? 'bg-amber-600' : 'bg-amber-300'
        if (isPressed) bg = black ? 'bg-sky-600' : 'bg-sky-300'
        if (isWrong) bg = 'bg-red-500'

        const cls = black
          ? 'absolute z-10 rounded-b-md border border-black shadow-lg'
          : 'absolute z-0 rounded-b-md border border-slate-300 shadow-md'

        return (
          <div
            key={m}
            className={`${cls} ${bg} ${isTarget ? 'animate-pulse' : ''}`}
            style={{
              left: g.x,
              width: g.w,
              top: 0,
              height: black ? HEIGHT_BLACK : HEIGHT_WHITE,
            }}
          >
            {!black && m % 12 === 0 && (
              <span className="absolute inset-x-0 bottom-1 text-center text-[10px] text-slate-400">
                {noteName(m)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
