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
      <text x={16} y={98} fontSize={64} fill="#1e293b" fontFamily="serif">
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
            fill="#ffffff"
            stroke={f.n === 1 ? '#f59e0b' : '#cbd5e1'}
            strokeWidth={1.6}
          />
          <text
            x={i * 62 + 30}
            y={72}
            textAnchor="middle"
            fontSize={19}
            fontWeight={700}
            fill={f.n === 1 ? '#f59e0b' : '#1e293b'}
          >
            {f.n}
          </text>
          <text
            x={i * 62 + 30}
            y={122}
            textAnchor="middle"
            fontSize={12}
            fill="#64748b"
          >
            {f.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** 手型：俯视图（五指落键 + 掌心拱起虚线） */
export function DiagramHandShape() {
  const WW = 40
  const keyX = (i: number) => 20 + i * WW
  const tips = [
    { n: 1, cx: 40, cy: 142 },
    { n: 2, cx: 102, cy: 130 },
    { n: 3, cx: 142, cy: 128 },
    { n: 4, cx: 182, cy: 130 },
    { n: 5, cx: 222, cy: 134 },
  ]
  return (
    <svg viewBox="0 0 320 216" className="w-full max-w-sm">
      {Array.from({ length: 7 }, (_, i) => (
        <rect
          key={i}
          x={keyX(i)}
          y="120"
          width={WW}
          height="50"
          rx="3"
          fill="#e8e8ec"
          stroke="#0a0a0b"
          strokeWidth="1.2"
        />
      ))}
      {[0, 1, 3, 4, 5].map(i => (
        <rect key={`b${i}`} x={keyX(i) + 28} y="120" width="22" height="30" rx="3" fill="#151518" />
      ))}
      <text x={keyX(0) + WW / 2} y="184" textAnchor="middle" fontSize="11" fill="#f59e0b">C4</text>
      <text x={keyX(2) + WW / 2} y="184" textAnchor="middle" fontSize="11" fill="#64748b">E4</text>
      <text x={keyX(4) + WW / 2} y="184" textAnchor="middle" fontSize="11" fill="#64748b">G4</text>

      <path
        d="M 92 128 C 96 84, 128 60, 164 60 C 202 60, 230 84, 232 128 L 232 136 C 232 148, 92 148, 92 136 Z"
        fill="#64748b"
        opacity="0.10"
        stroke="#64748b"
        strokeWidth="1.6"
      />
      <rect x="142" y="34" width="46" height="26" rx="12" fill="#64748b" opacity="0.10" stroke="#64748b" strokeWidth="1.6" />

      <ellipse cx="162" cy="102" rx="36" ry="24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 5" />
      <text x="162" y="20" textAnchor="middle" fontSize="12" fill="#f59e0b">
        手心拱起——像握着鸡蛋的空腔
      </text>
      <path d="M 162 26 L 162 48 m 0 0 l -5 -7 m 5 7 l 5 -7" stroke="#f59e0b" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {tips.map(t => (
        <g key={t.n}>
          <circle cx={t.cx} cy={t.cy} r="13" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.4" />
          <text x={t.cx} y={t.cy + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0a0a0b">{t.n}</text>
        </g>
      ))}
      <circle cx="142" cy="128" r="18" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
      <path d="M 156 118 l 30 -26" stroke="#38bdf8" strokeWidth="1.3" />
      <text x="190" y="88" fontSize="12" fill="#38bdf8">指腹触键</text>
    </svg>
  )
}

/** 抬指击键：掌关节抬起 → 垂直落下 */
export function DiagramStrike() {
  return (
    <svg viewBox="0 0 320 150" className="w-full max-w-sm">
      {/* 左：抬起 */}
      <text x="80" y="24" textAnchor="middle" fontSize="13" fill="#64748b">① 抬起</text>
      <rect x="24" y="112" width="112" height="12" rx="3" fill="#e8e8ec" />
      <circle cx="48" cy="104" r="7" fill="none" stroke="#f59e0b" strokeWidth="2" />
      <path d="M 48 104 C 60 84, 84 66, 108 72" fill="none" stroke="#64748b" strokeWidth="9" strokeLinecap="round" />
      <path d="M 108 72 l 10 -14 m -10 14 l -14 -8" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <text x="64" y="52" fontSize="11" fill="#f59e0b">掌关节发力</text>
      {/* 右：落下 */}
      <text x="240" y="24" textAnchor="middle" fontSize="13" fill="#64748b">② 落键</text>
      <rect x="184" y="112" width="112" height="12" rx="3" fill="#e8e8ec" />
      <circle cx="208" cy="104" r="7" fill="none" stroke="#f59e0b" strokeWidth="2" />
      <path d="M 208 104 C 222 100, 240 96, 258 96 L 262 100" fill="none" stroke="#64748b" strokeWidth="9" strokeLinecap="round" />
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
      <text x={W / 2} y="140" textAnchor="middle" fontSize="12" fill="#64748b">
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

/* ================= 以下为浅色主题新配图 ================= */

const INK = '#1e293b' // 主墨色
const GRAY = '#64748b' // 次要文字
const AMBER = '#f59e0b' // 强调
const BLUE = '#38bdf8' // 左手/次强调
const GREEN = '#22c55e' // 正确/进行

/** 五线（高音谱表区域），lines 自下而上 E4 G4 B4 D5 F5 */
function StaffLines({ x1 = 16, x2 = 304, top = 40 }: { x1?: number; x2?: number; top?: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1={x1} y1={top + i * 14} x2={x2} y2={top + i * 14} stroke={INK} strokeWidth={1.2} opacity={0.7} />
      ))}
    </>
  )
}

/** 音符头 + 符杆。filled=四分/八分，空心=二分/全 */
function NoteGlyph({ x, y, filled = true, stem = true, color = INK, stemH = 38 }: { x: number; y: number; filled?: boolean; stem?: boolean; color?: string; stemH?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={9.5} ry={7} fill={filled ? color : '#ffffff'} stroke={color} strokeWidth={filled ? 0 : 2} transform={`rotate(-18 ${x} ${y})`} />
      {stem && <line x1={x + 8.5} y1={y - 3} x2={x + 8.5} y2={y - stemH} stroke={color} strokeWidth={2.2} strokeLinecap="round" />}
    </g>
  )
}

/** 八度：整条键盘上 8 个 C 高亮 */
export function DiagramOctaves() {
  const WW = 26
  const whites = 22 // 略多于 3 个八度
  return (
    <svg viewBox={`-6 -26 ${whites * WW + 12} 118`} className="w-full max-w-md">
      {Array.from({ length: whites }, (_, i) => {
        const isC = i % 7 === 0
        return (
          <g key={i}>
            <rect x={i * WW} y={0} width={WW} height={64} rx={3} fill={isC ? AMBER : '#ffffff'} stroke={INK} strokeWidth={1} opacity={isC ? 0.9 : 1} />
            {isC && (
              <text x={i * WW + WW / 2} y={80} textAnchor="middle" fontSize={11} fontWeight={700} fill={AMBER}>C</text>
            )}
          </g>
        )
      })}
      {/* 黑键 */}
      {Array.from({ length: whites }, (_, i) =>
        [0, 1, 3, 4, 5].includes(i % 7) && i + 1 < whites ? (
          <rect key={`b${i}`} x={i * WW + WW - 7} y={0} width={14} height={38} rx={2} fill={INK} />
        ) : null,
      )}
      <text x={(whites * WW) / 2} y={-12} textAnchor="middle" fontSize={12} fill={GRAY}>
        键盘上每个"两个黑键左边"都是 C——相隔八度，同名不同高
      </text>
    </svg>
  )
}

/** 大谱表：高音谱号 + 低音谱号，中间是中央 C。
 *  坐标严格按真实谱面：线间距 14px。
 *  高音谱表（top=30）自下而上 E4 G4 B4 D5 F5 → 线在 y=86,72,58,44,30
 *  低音谱表（top=114）自下而上 G2 B2 D3 F3 A3 → 线在 y=170,156,142,128,114
 *  C4 = 高音谱表下加一线 = 低音谱表上加一线 = y=100（同一条水平线） */
export function DiagramClefs() {
  return (
    <svg viewBox="0 0 320 204" className="w-full max-w-sm">
      {/* 高音谱表 */}
      <StaffLines top={30} />
      <text x={18} y={89} fontSize={56} fill={INK} fontFamily="serif">𝄞</text>
      <text x={306} y={42} fontSize={11} fill={GRAY} textAnchor="end">高音谱号 · 右手</text>
      {/* G 谱号的螺旋应圈住 G4（第二线，y=72） */}
      <circle cx={35} cy={72} r={9} fill="none" stroke={AMBER} strokeWidth={1.4} strokeDasharray="3 3" />

      {/* 低音谱表 */}
      <StaffLines top={114} />
      <text x={22} y={151} fontSize={40} fill={INK} fontFamily="serif">𝄢</text>
      <text x={306} y={122} fontSize={11} fill={GRAY} textAnchor="end">低音谱号 · 左手</text>

      {/* 中央 C：两个谱表共用同一条加线 y=100 */}
      <line x1={150} y1={100} x2={186} y2={100} stroke={AMBER} strokeWidth={2} />
      <NoteGlyph x={168} y={100} color={AMBER} stemH={30} />
      <text x={198} y={104} fontSize={12} fontWeight={700} fill={AMBER}>C4 中央 C</text>
      {/* 大谱表括号 */}
      <path d="M 14 24 C 4 62, 4 128, 14 176" fill="none" stroke={GRAY} strokeWidth={1.6} />

      {/* 底部统一标注，避免与谱面拥挤 */}
      <text x={160} y={198} fontSize={11} fill={GRAY} textAnchor="middle">
        𝄞 螺旋圈住 G4（第二线） · 𝄢 两点夹住 F3（第四线）
      </text>
    </svg>
  )
}

/** 音位：C4 D4 E4 F4 G4 在谱面上依次爬升 */
export function DiagramPositions() {
  // y 自下而上：C4=下加一线, D4=下加一间, E4=一线, F4=一间, G4=二线
  const notes = [
    { n: 'C4', y: 118, ledger: true, finger: 1 },
    { n: 'D4', y: 111, ledger: false, finger: 2 },
    { n: 'E4', y: 104, ledger: false, finger: 3 },
    { n: 'F4', y: 97, ledger: false, finger: 4 },
    { n: 'G4', y: 90, ledger: false, finger: 5 },
  ]
  return (
    <svg viewBox="0 0 340 150" className="w-full max-w-sm">
      <StaffLines top={48} x2={324} />
      <text x={18} y={100} fontSize={48} fill={INK} fontFamily="serif">𝄞</text>
      {notes.map((n, i) => {
        const x = 100 + i * 48
        return (
          <g key={n.n}>
            {n.ledger && <line x1={x - 16} y1={n.y} x2={x + 16} y2={n.y} stroke={INK} strokeWidth={1.4} />}
            <NoteGlyph x={x} y={n.y} color={i === 0 ? AMBER : INK} />
            <text x={x} y={140} textAnchor="middle" fontSize={11} fontWeight={600} fill={i === 0 ? AMBER : GRAY}>
              {n.n} · {n.finger}指
            </text>
          </g>
        )
      })}
      <path d="M 92 126 C 140 134, 240 134, 300 120" fill="none" stroke={AMBER} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} />
      <text x={170} y={20} fontSize={12} fill={GRAY} textAnchor="middle">线与间交替向上 = 键盘上白键依次向右</text>
    </svg>
  )
}

/** 时值金字塔：全音符 4 / 二分 2 / 四分 1 / 八分 ½ */
export function DiagramDurations() {
  const rows = [
    { label: '全音符', beats: '4 拍', filled: false, stem: false, w: 220, y: 30 },
    { label: '二分音符', beats: '2 拍', filled: false, stem: true, w: 110, y: 66 },
    { label: '四分音符', beats: '1 拍', filled: true, stem: true, w: 55, y: 102 },
    { label: '八分音符', beats: '½ 拍', filled: true, stem: true, flag: true, w: 27.5, y: 138 },
  ]
  return (
    <svg viewBox="0 0 440 168" className="w-full max-w-md">
      {rows.map((r, i) => (
        <g key={r.label}>
          <NoteGlyph x={52} y={r.y} filled={r.filled} stem={r.stem} color={INK} stemH={30} />
          {i === 3 && <path d="M 60.5 106 q 12 4 8 18" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />}
          <text x={84} y={r.y + 4} fontSize={13} fill={INK}>{r.label}</text>
          {/* 时值比例条 */}
          <rect x={170} y={r.y - 8} width={r.w} height={14} rx={4} fill={AMBER} opacity={0.18 + i * 0.06} />
          <rect x={170} y={r.y - 8} width={r.w} height={14} rx={4} fill="none" stroke={AMBER} strokeWidth={1.2} />
          <text x={176 + r.w} y={r.y + 4} fontSize={12} fontWeight={700} fill={AMBER}>{r.beats}</text>
        </g>
      ))}
      <text x={170} y={164} fontSize={11} fill={GRAY} textAnchor="start">每往下一级，时值减半</text>
    </svg>
  )
}

/** 休止符：四分（闪电）/ 二分（坐线）/ 全休止（吊线） */
export function DiagramRests() {
  return (
    <svg viewBox="0 0 340 130" className="w-full max-w-sm">
      {/* 四分休止 */}
      <g>
        <path d="M 60 22 C 50 32, 72 36, 62 48 C 54 57, 70 62, 66 74 L 58 88 C 66 84, 74 78, 72 68" fill="none" stroke={AMBER} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <text x={62} y={112} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK}>四分休止</text>
        <text x={62} y={126} textAnchor="middle" fontSize={11} fill={GRAY}>安静 1 拍</text>
      </g>
      {/* 二分休止：坐在第 3 线上的方块 */}
      <g>
        <line x1={140} y1={58} x2={196} y2={58} stroke={INK} strokeWidth={1.2} />
        <rect x={156} y={48} width={24} height={10} fill={AMBER} rx={1.5} />
        <text x={168} y={112} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK}>二分休止</text>
        <text x={168} y={126} textAnchor="middle" fontSize={11} fill={GRAY}>安静 2 拍 · 坐在线上</text>
      </g>
      {/* 全休止：吊在第 4 线下的方块 */}
      <g>
        <line x1={244} y1={44} x2={300} y2={44} stroke={INK} strokeWidth={1.2} />
        <rect x={260} y={44} width={24} height={10} fill={AMBER} rx={1.5} />
        <text x={272} y={112} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK}>全休止</text>
        <text x={272} y={126} textAnchor="middle" fontSize={11} fill={GRAY}>安静 4 拍 · 吊在线下的</text>
      </g>
    </svg>
  )
}

/** 拍号 4/4：每小节 4 拍，第 1 拍最强 */
export function DiagramTimeSig() {
  return (
    <svg viewBox="0 0 340 150" className="w-full max-w-sm">
      <StaffLines top={34} x2={330} />
      <text x={30} y={66} fontSize={30} fontWeight={800} fill={INK} fontFamily="serif">4</text>
      <text x={30} y={96} fontSize={30} fontWeight={800} fill={INK} fontFamily="serif">4</text>
      {/* 一小节 4 个四分音符 */}
      {[0, 1, 2, 3].map(i => {
        const x = 96 + i * 56
        const strong = i === 0
        return (
          <g key={i}>
            <NoteGlyph x={x} y={76} color={strong ? AMBER : INK} />
            <text x={x} y={120} textAnchor="middle" fontSize={12} fontWeight={strong ? 800 : 500} fill={strong ? AMBER : GRAY}>
              {i + 1}
            </text>
            <text x={x} y={136} textAnchor="middle" fontSize={10} fill={strong ? AMBER : GRAY}>
              {strong ? '强' : '弱'}
            </text>
          </g>
        )
      })}
      {/* 小节线 */}
      <line x1={330} y1={34} x2={330} y2={90} stroke={INK} strokeWidth={1.6} />
      <text x={64} y={62} fontSize={11} fill={GRAY}>每小节</text>
      <text x={64} y={76} fontSize={11} fill={GRAY}>4 拍</text>
    </svg>
  )
}

/** 八分音符："1 & 2 &" 数拍 */
export function DiagramEighth() {
  return (
    <svg viewBox="0 0 340 140" className="w-full max-w-sm">
      <StaffLines top={26} x2={330} />
      {/* 第一拍：两个八分（符尾相连） */}
      {[0, 1].map(i => {
        const x = 80 + i * 34
        return <NoteGlyph key={i} x={x} y={68} color={i === 0 ? AMBER : INK} />
      })}
      <line x1={88.5} y1={30} x2={122.5} y2={30} stroke={INK} strokeWidth={4} />
      {/* 第二拍：两个八分 */}
      {[0, 1].map(i => {
        const x = 170 + i * 34
        return <NoteGlyph key={`b${i}`} x={x} y={68} color={i === 0 ? AMBER : INK} />
      })}
      <line x1={178.5} y1={30} x2={212.5} y2={30} stroke={INK} strokeWidth={4} />
      {/* 数拍行 */}
      {[
        { t: '1', x: 80, strong: true },
        { t: '&', x: 114, strong: false },
        { t: '2', x: 170, strong: true },
        { t: '&', x: 204, strong: false },
      ].map(c => (
        <text key={c.t + c.x} x={c.x} y={112} textAnchor="middle" fontSize={c.strong ? 16 : 13} fontWeight={c.strong ? 800 : 500} fill={c.strong ? AMBER : GRAY}>
          {c.t}
        </text>
      ))}
      <text x={170} y={134} textAnchor="middle" fontSize={11} fill={GRAY}>正拍落在数字上，半拍落在 & 上</text>
    </svg>
  )
}

/** 附点：附点四分 1.5 拍 + 八分 0.5 拍 = 2 拍 */
export function DiagramDotted() {
  return (
    <svg viewBox="0 0 380 150" className="w-full max-w-md">
      <StaffLines top={30} x2={370} />
      {/* 附点四分 */}
      <NoteGlyph x={92} y={72} color={AMBER} />
      <circle cx={108} cy={68} r={3.2} fill={AMBER} />
      {/* 八分 */}
      <NoteGlyph x={176} y={72} color={INK} />
      <path d="M 184.5 37 q 13 4 9 19" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      {/* 拆解标注 */}
      <text x={92} y={112} textAnchor="middle" fontSize={12} fontWeight={700} fill={AMBER}>1 + &</text>
      <text x={176} y={112} textAnchor="middle" fontSize={12} fontWeight={600} fill={GRAY}>2</text>
      <path d="M 66 120 C 100 128, 160 128, 198 118" fill="none" stroke={GRAY} strokeWidth={1} strokeDasharray="3 3" />
      <text x={238} y={76} fontSize={13} fill={INK}>附点四分 = 1.5 拍</text>
      <text x={238} y={94} fontSize={13} fill={INK}>八分 = 0.5 拍</text>
      <text x={238} y={116} fontSize={12} fontWeight={700} fill={GREEN}>合起来正好 2 拍</text>
    </svg>
  )
}

/** C 和弦：谱面三音叠置 + 迷你键盘 */
export function DiagramChord() {
  // C4=下加一线, E4=第一线, G4=第二线
  const keys = [
    { n: 'C', x: 0, finger: 1 },
    { n: 'D', x: 1, finger: 0 },
    { n: 'E', x: 2, finger: 3 },
    { n: 'F', x: 3, finger: 0 },
    { n: 'G', x: 4, finger: 5 },
  ]
  const WW = 30
  return (
    <svg viewBox="0 0 340 160" className="w-full max-w-sm">
      {/* 左：谱面叠置 */}
      <StaffLines top={34} x1={8} x2={150} />
      <text x={12} y={82} fontSize={44} fill={INK} fontFamily="serif">𝄞</text>
      <line x1={86} y1={104} x2={118} y2={104} stroke={INK} strokeWidth={1.4} />
      <NoteGlyph x={102} y={104} color={AMBER} stem={false} />
      <NoteGlyph x={102} y={90} color={AMBER} stem={false} />
      <NoteGlyph x={102} y={76} color={AMBER} stem={false} />
      <line x1={110.5} y1={72} x2={110.5} y2={40} stroke={AMBER} strokeWidth={2.2} strokeLinecap="round" />
      <text x={76} y={140} textAnchor="middle" fontSize={11} fill={GRAY}>三个音叠在一起</text>
      {/* 右：迷你键盘 */}
      <g>
        {keys.map(k => (
          <g key={k.n}>
            <rect x={176 + k.x * WW} y={40} width={WW} height={58} rx={3} fill={k.finger > 0 ? AMBER : '#ffffff'} stroke={INK} strokeWidth={1} opacity={k.finger > 0 ? 0.92 : 1} />
            {k.finger > 0 && (
              <text x={176 + k.x * WW + WW / 2} y={70} textAnchor="middle" fontSize={12} fontWeight={800} fill="#ffffff">{k.finger}</text>
            )}
            <text x={176 + k.x * WW + WW / 2} y={112} textAnchor="middle" fontSize={10} fill={k.finger > 0 ? AMBER : GRAY}>{k.n}</text>
          </g>
        ))}
        <text x={252} y={140} textAnchor="middle" fontSize={11} fill={GRAY}>键盘上隔一键按一键 · 1-3-5 指</text>
      </g>
    </svg>
  )
}

/** 和弦进行：C → F → G → C */
export function DiagramChordProg() {
  const chords = [
    { n: 'C', tones: 'C-E-G', color: '#1CB0F6', feel: '家' },
    { n: 'F', tones: 'F-A-C', color: '#CE82FF', feel: '探险' },
    { n: 'G', tones: 'G-B-D', color: '#FF9600', feel: '紧张' },
    { n: 'C', tones: 'C-E-G', color: '#58CC02', feel: '落地' },
  ]
  return (
    <svg viewBox="0 0 360 120" className="w-full max-w-md">
      {chords.map((c, i) => {
        const x = 14 + i * 88
        return (
          <g key={i}>
            <rect x={x} y={26} width={64} height={52} rx={10} fill={c.color} opacity={0.15} stroke={c.color} strokeWidth={1.6} />
            <text x={x + 32} y={50} textAnchor="middle" fontSize={20} fontWeight={800} fill={c.color}>{c.n}</text>
            <text x={x + 32} y={68} textAnchor="middle" fontSize={10} fill={GRAY}>{c.tones}</text>
            <text x={x + 32} y={98} textAnchor="middle" fontSize={11} fill={GRAY}>{c.feel}</text>
            {i < 3 && (
              <path d={`M ${x + 68} 52 l 14 0 m -5 -5 l 5 5 l -5 5`} fill="none" stroke={GRAY} strokeWidth={1.6} strokeLinecap="round" />
            )}
          </g>
        )
      })}
      <text x={180} y={14} textAnchor="middle" fontSize={11} fill={GRAY}>从家出发，制造紧张，再回家——和声的"呼吸"</text>
    </svg>
  )
}

/** 节拍器与提速阶梯 */
export function DiagramMetronome() {
  return (
    <svg viewBox="0 0 340 150" className="w-full max-w-sm">
      {/* 节拍器 */}
      <g>
        <path d="M 66 128 L 96 24 L 124 128 Z" fill="#ffffff" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M 66 128 L 124 128 L 118 112 L 72 112 Z" fill={INK} opacity={0.08} />
        <line x1="95" y1="112" x2="112" y2="44" stroke={AMBER} strokeWidth={3} strokeLinecap="round" />
        <circle cx="112" cy="44" r={6} fill={AMBER} />
        <circle cx="95" cy="112" r={4} fill={INK} />
        <text x={95} y={146} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK}>节拍器</text>
      </g>
      {/* 提速阶梯 */}
      <g>
        {[60, 80, 100, 120].map((bpm, i) => {
          const h = 22 + i * 22
          return (
            <g key={bpm}>
              <rect x={170} y={126 - h} width={40 + i * 18} height={h} rx={4} fill={BLUE} opacity={0.12 + i * 0.07} stroke={BLUE} strokeWidth={1.2} />
              <text x={176} y={120 - h} fontSize={11} fontWeight={700} fill={BLUE}>{bpm} BPM</text>
            </g>
          )
        })}
        <path d="M 168 122 L 280 40" stroke={GREEN} strokeWidth={1.6} strokeDasharray="4 4" fill="none" />
        <text x={252} y={146} textAnchor="middle" fontSize={11} fill={GRAY}>每次 +5~10，零失误再提速</text>
      </g>
    </svg>
  )
}

/** 曲式结构：A B A 乐句块 */
export function DiagramForm() {
  const blocks = [
    { t: 'A', sub: '开头主题', color: '#58CC02' },
    { t: 'B', sub: '中间变化', color: '#FF9600' },
    { t: 'A', sub: '回到开头', color: '#58CC02' },
  ]
  return (
    <svg viewBox="0 0 340 110" className="w-full max-w-sm">
      {blocks.map((b, i) => {
        const x = 20 + i * 108
        return (
          <g key={i}>
            <rect x={x} y={24} width={88} height={46} rx={10} fill={b.color} opacity={0.15} stroke={b.color} strokeWidth={1.6} />
            <text x={x + 44} y={52} textAnchor="middle" fontSize={20} fontWeight={800} fill={b.color}>{b.t}</text>
            <text x={x + 44} y={88} textAnchor="middle" fontSize={11} fill={GRAY}>{b.sub}</text>
            {i < 2 && <path d={`M ${x + 92} 47 l 12 0 m -4 -4 l 4 4 l -4 4`} fill="none" stroke={GRAY} strokeWidth={1.6} strokeLinecap="round" />}
          </g>
        )
      })}
      <text x={170} y={14} textAnchor="middle" fontSize={11} fill={GRAY}>会了 A 段，整首歌就会了一半</text>
    </svg>
  )
}
