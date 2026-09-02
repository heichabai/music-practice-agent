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

/** 手型：像握住一个鸡蛋（侧视：拱形手背 + 指腹触键） */
export function DiagramHandShape() {
  return (
    <svg viewBox="0 0 320 170" className="w-full max-w-sm">
      {/* 琴键面 */}
      <rect x="20" y="128" width="280" height="14" rx="3" fill="#e8e8ec" />
      <line x1="88" y1="128" x2="88" y2="142" stroke="#0a0a0b" strokeWidth="1.5" />
      <line x1="156" y1="128" x2="156" y2="142" stroke="#0a0a0b" strokeWidth="1.5" />
      <line x1="224" y1="128" x2="224" y2="142" stroke="#0a0a0b" strokeWidth="1.5" />
      {/* 鸡蛋（虚线） */}
      <ellipse cx="150" cy="104" rx="26" ry="34" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 5" />
      <text x="150" y="26" textAnchor="middle" fontSize="12" fill="#f59e0b">
        想象握着一个鸡蛋
      </text>
      <path d="M 150 34 L 150 52 m 0 0 l -5 -7 m 5 7 l 5 -7" stroke="#f59e0b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* 拱形手背 */}
      <path
        d="M 84 128 C 88 78, 122 52, 158 52 C 200 52, 228 78, 232 118 L 236 126"
        fill="none"
        stroke="#f0f0f2"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* 手指（指腹触键） */}
      {[0, 1, 2, 3].map(i => (
        <circle key={i} cx={168 + i * 20} cy={124} r="5.5" fill="#f0f0f2" />
      ))}
      {/* 指腹标注 */}
      <circle cx="188" cy="124" r="9" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
      <path d="M 197 116 l 24 -18" stroke="#38bdf8" strokeWidth="1.4" />
      <text x="224" y="94" fontSize="12" fill="#38bdf8">
        指腹触键
      </text>
    </svg>
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

/** 坐姿：侧视简笔图（几何示意，标注四个要点） */
export function DiagramPosture() {
  return (
    <svg viewBox="0 0 380 235" className="w-full max-w-md">
      {/* 地板 */}
      <line x1="12" y1="196" x2="368" y2="196" stroke="#31313a" strokeWidth="2" />
      {/* 钢琴（立式，左侧） */}
      <rect x="24" y="42" width="38" height="154" rx="5" fill="#1e1e24" stroke="#31313a" strokeWidth="1.6" />
      <rect x="62" y="126" width="84" height="13" rx="3" fill="#e8e8ec" />
      <line x1="90" y1="126" x2="90" y2="139" stroke="#0a0a0b" strokeWidth="1.2" />
      <line x1="118" y1="126" x2="118" y2="139" stroke="#0a0a0b" strokeWidth="1.2" />
      <rect x="62" y="139" width="10" height="57" fill="#1e1e24" stroke="#31313a" strokeWidth="1.2" />
      <line x1="62" y1="139" x2="62" y2="196" stroke="#31313a" strokeWidth="3" />
      <line x1="144" y1="139" x2="144" y2="196" stroke="#31313a" strokeWidth="3" />
      <line x1="72" y1="150" x2="144" y2="150" stroke="#1e1e24" strokeWidth="4" />
      {/* 琴凳 */}
      <rect x="178" y="146" width="66" height="11" rx="3" fill="#31313a" />
      <line x1="184" y1="157" x2="184" y2="196" stroke="#31313a" strokeWidth="3" />
      <line x1="238" y1="157" x2="238" y2="196" stroke="#31313a" strokeWidth="3" />
      {/* 人（侧视，面向左侧钢琴） */}
      {/* 头 */}
      <circle cx="246" cy="76" r="15" fill="#f0f0f2" />
      {/* 背（挺直，微前倾） */}
      <path d="M 240 92 L 226 148" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />
      {/* 大腿（水平） */}
      <path d="M 226 148 L 172 148" stroke="#f0f0f2" strokeWidth="9" strokeLinecap="round" />
      {/* 小腿（垂直） */}
      <path d="M 172 148 L 172 192" stroke="#f0f0f2" strokeWidth="9" strokeLinecap="round" />
      {/* 脚（平放） */}
      <path d="M 172 192 L 152 192" stroke="#f0f0f2" strokeWidth="8" strokeLinecap="round" />
      {/* 手臂：肩→肘→腕手在琴键 */}
      <path d="M 238 100 L 214 130 L 158 124" fill="none" stroke="#f0f0f2" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="154" cy="124" r="5.5" fill="#f0f0f2" />
      {/* 标注1：手肘与键盘齐平 */}
      <line x1="150" y1="132" x2="300" y2="132" stroke="#38bdf8" strokeWidth="1.3" strokeDasharray="5 4" />
      <circle cx="214" cy="130" r="10" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
      <text x="304" y="136" fontSize="12" fill="#38bdf8">手肘 ≈ 键盘高度</text>
      {/* 标注2：背部挺直 */}
      <line x1="234" y1="86" x2="266" y2="60" stroke="#f59e0b" strokeWidth="1.3" />
      <text x="270" y="58" fontSize="12" fill="#f59e0b">背部挺直</text>
      {/* 标注3：一拳距离 */}
      <path d="M 146 112 h 34 m -34 0 v -5 m 0 10 m 34 -5 v -5 m 0 10" stroke="#22c55e" strokeWidth="1.6" fill="none" />
      <path d="M 148 112 l -6 -5 m 6 5 l -6 5 M 178 112 l 6 -5 m -6 5 l 6 5" stroke="#22c55e" strokeWidth="1.6" fill="none" />
      <text x="186" y="102" fontSize="12" fill="#22c55e">离琴一拳</text>
      {/* 标注4：双脚平放 */}
      <line x1="162" y1="206" x2="162" y2="212" stroke="#9a9aa6" strokeWidth="1" />
      <text x="120" y="226" fontSize="12" fill="#9a9aa6">双脚平放</text>
      {/* 标注5：手腕放平 */}
      <circle cx="158" cy="118" r="9" fill="none" stroke="#38bdf8" strokeWidth="1.4" opacity="0" />
    </svg>
  )
}
