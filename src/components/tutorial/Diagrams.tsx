/** 课程示意图：键盘地图 / 五线谱 / 手指标记（线性风格，与全站图标一致） */

export function DiagramKeyboard() {
  const whites = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const blacks = [
    { pos: 1, label: 'C♯' },
    { pos: 2, label: 'D♯' },
    { pos: 4, label: 'F♯' },
    { pos: 5, label: 'G♯' },
    { pos: 6, label: 'A♯' },
  ]
  const WW = 52
  const W = whites.length * WW
  const H = 150
  return (
    <svg viewBox={`-8 -8 ${W + 16} ${H + 46}`} className="w-full max-w-sm">
      {whites.map((w, i) => (
        <g key={w}>
          <rect
            x={i * WW}
            y={0}
            width={WW}
            height={H}
            rx={5}
            fill={i === 0 ? '#f59e0b' : '#e8e8ec'}
            stroke="#0a0a0b"
            strokeWidth={1.5}
          />
          <text
            x={i * WW + WW / 2}
            y={H + 22}
            textAnchor="middle"
            fontSize={15}
            fontWeight={i === 0 ? 700 : 500}
            fill={i === 0 ? '#f59e0b' : '#9a9aa6'}
          >
            {w}
          </text>
        </g>
      ))}
      {blacks.map(b => (
        <rect
          key={b.label}
          x={b.pos * WW - 13}
          y={0}
          width={26}
          height={92}
          rx={4}
          fill="#151518"
        />
      ))}
      <circle cx={WW / 2} cy={H - 26} r={7} fill="#0a0a0b" opacity={0.75} />
      <path
        d={`M ${WW / 2 + 7} ${H - 40} l 26 -22`}
        stroke="#f59e0b"
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
      <text x={WW / 2 + 40} y={H - 34} fontSize={13} fill="#f59e0b">
        两个黑键左边 = C
      </text>
    </svg>
  )
}

export function DiagramStaff() {
  const W = 320
  const LINES = [40, 56, 72, 88, 104] // 自下而上 E4 G4 B4 D5 F5
  const CX = 226
  const CY = 120 // 下加一线 = C4
  return (
    <svg viewBox={`0 0 ${W} 168`} className="w-full max-w-sm">
      {LINES.map((y, i) => (
        <line key={i} x1={16} y1={y} x2={W - 16} y2={y} stroke="#9a9aa6" strokeWidth={1.4} />
      ))}
      <line x1={CX - 26} y1={CY} x2={CX + 26} y2={CY} stroke="#f59e0b" strokeWidth={2} />
      <text x={16} y={98} fontSize={64} fill="#f0f0f2" fontFamily="serif">
        𝄞
      </text>
      <ellipse cx={CX} cy={CY} rx={11} ry={8.5} fill="#f59e0b" transform={`rotate(-18 ${CX} ${CY})`} />
      <path
        d={`M ${CX + 10} ${CY - 2} l 0 -46`}
        stroke="#f59e0b"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <text x={CX} y={CY + 26} textAnchor="middle" fontSize={13} fill="#f59e0b">
        C4（下加一线）
      </text>
    </svg>
  )
}

export function DiagramFingers() {
  const fingers = [
    { n: 1, name: '拇指' },
    { n: 2, name: '食指' },
    { n: 3, name: '中指' },
    { n: 4, name: '无名指' },
    { n: 5, name: '小指' },
  ]
  return (
    <svg viewBox="0 0 320 132" className="w-full max-w-sm">
      {fingers.map((f, i) => (
        <g key={f.n}>
          <rect
            x={i * 62 + 8}
            y={34 - f.n * 3}
            width={44}
            height={64 + f.n * 3}
            rx={18}
            fill="#1e1e24"
            stroke={f.n === 1 ? '#f59e0b' : '#31313a'}
            strokeWidth={1.6}
          />
          <text
            x={i * 62 + 30}
            y={72}
            textAnchor="middle"
            fontSize={19}
            fontWeight={700}
            fill={f.n === 1 ? '#f59e0b' : '#f0f0f2'}
          >
            {f.n}
          </text>
          <text
            x={i * 62 + 30}
            y={122}
            textAnchor="middle"
            fontSize={12}
            fill="#9a9aa6"
          >
            {f.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** 手型插画（AI 生成） */
export function DiagramHandShape() {
  return (
    <img src="/tutorial/handshape.png" alt="拱形手型示意" className="w-full max-w-sm rounded-lg" />
  )
}

/** 抬指击键：掌关节抬起 → 垂直落下 */
export function DiagramStrike() {
  return (
    <svg viewBox="0 0 320 150" className="w-full max-w-sm">
      {/* 左：抬起 */}
      <text x="80" y="24" textAnchor="middle" fontSize="13" fill="#9a9aa6">① 抬起</text>
      <rect x="24" y="112" width="112" height="12" rx="3" fill="#e8e8ec" />
      <circle cx="48" cy="104" r="7" fill="none" stroke="#f59e0b" strokeWidth="2" />
      <path d="M 48 104 C 60 84, 84 66, 108 72" fill="none" stroke="#f0f0f2" strokeWidth="9" strokeLinecap="round" />
      <path d="M 108 72 l 10 -14 m -10 14 l -14 -8" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <text x="64" y="52" fontSize="11" fill="#f59e0b">掌关节发力</text>
      {/* 右：落下 */}
      <text x="240" y="24" textAnchor="middle" fontSize="13" fill="#9a9aa6">② 落键</text>
      <rect x="184" y="112" width="112" height="12" rx="3" fill="#e8e8ec" />
      <circle cx="208" cy="104" r="7" fill="none" stroke="#f59e0b" strokeWidth="2" />
      <path d="M 208 104 C 222 100, 240 96, 258 96 L 262 100" fill="none" stroke="#f0f0f2" strokeWidth="9" strokeLinecap="round" />
      <circle cx="262" cy="108" r="6" fill="#22c55e" />
      <path d="M 262 100 l 0 -18 m 0 18 l 0 0" stroke="#22c55e" strokeWidth="0" />
      <text x="252" y="66" fontSize="11" fill="#22c55e">垂直落键</text>
      <path d="M 262 66 l 0 14 m 0 -14 l -5 7 m 5 -7 l 5 7" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** 双手五指位俯视：左手 C3 起 / 右手 C4 起，相隔八度 */
export function DiagramBothHands() {
  const whitePC = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const octaves = 2
  const WW = 34
  const W = whitePC.length * octaves * WW
  const leftLabels = ['5', '4', '3', '2', '1']
  const rightLabels = ['1', '2', '3', '4', '5']
  return (
    <svg viewBox={`-8 -30 ${W + 16} 150`} className="w-full max-w-sm">
      {whitePC.map((_, i) => (
        <g key={i}>
          <rect x={i * WW} y="0" width={WW} height="86" rx="4" fill={i === 0 ? '#f59e0b33' : '#e8e8ec'} stroke="#0a0a0b" strokeWidth="1.2" />
          <text x={i * WW + WW / 2} y="102" textAnchor="middle" fontSize="11" fill={i === 0 ? '#f59e0b' : '#9a9aa6'}>C3</text>
        </g>
      ))}
      {whitePC.map((_, i) => (
        <g key={`u${i}`}>
          <rect x={(i + 7) * WW} y="0" width={WW} height="86" rx="4" fill={i === 0 ? '#f59e0b33' : '#e8e8ec'} stroke="#0a0a0b" strokeWidth="1.2" />
          <text x={(i + 7) * WW + WW / 2} y="102" textAnchor="middle" fontSize="11" fill={i === 0 ? '#f59e0b' : '#9a9aa6'}>C4</text>
        </g>
      ))}
      {leftLabels.map((n, i) => (
        <g key={`l${n}`}>
          <circle cx={i * WW + WW / 2} cy="34" r="11" fill="#38bdf8" opacity="0.92" />
          <text x={i * WW + WW / 2} y="38.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0a0a0b">{n}</text>
        </g>
      ))}
      {rightLabels.map((n, i) => (
        <g key={`r${n}`}>
          <circle cx={(i + 7) * WW + WW / 2} cy="34" r="11" fill="#f59e0b" opacity="0.95" />
          <text x={(i + 7) * WW + WW / 2} y="38.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0a0a0b">{n}</text>
        </g>
      ))}
      <text x={W / 2} y="140" textAnchor="middle" fontSize="12" fill="#9a9aa6">
        左手（蓝）与右手（琥珀）相隔一个八度，各走各的"铁轨"
      </text>
    </svg>
  )
}

/** 坐姿插画（AI 生成） */
export function DiagramPosture() {
  return (
    <img src="/tutorial/posture.png" alt="钢琴标准坐姿示意" className="w-full max-w-sm rounded-lg" />
  )
}
