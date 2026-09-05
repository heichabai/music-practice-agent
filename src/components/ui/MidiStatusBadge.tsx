import type { MidiStatus } from '../../midi/useMidiInput'

interface Props {
  status: MidiStatus
  deviceName: string
}

const DOT_COLOR: Record<MidiStatus, string> = {
  ok: '#22c55e',
  'no-device': '#f59e0b',
  unsupported: '#f59e0b',
  init: '#5a5a63',
}

/** MIDI 连接状态：纯文本行 + 状态圆点（极简外壳） */
export function MidiStatusBadge({ status, deviceName }: Props) {
  return (
    <div className="flex items-center gap-2.5 py-2 text-sm">
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: DOT_COLOR[status] }}
      />
      {status === 'ok' && <span className="text-primary">MIDI 已连接 · {deviceName}</span>}
      {status === 'no-device' && (
        <span className="text-secondary">
          未检测到 MIDI 设备，可用电脑键盘弹奏（Z X C V B N M 低八度 · A S D F G H J K 白键 · W E T Y U 黑键）
        </span>
      )}
      {status === 'unsupported' && (
        <span className="text-secondary">
          当前浏览器不支持 Web MIDI，请用 Chrome / Edge 打开；电脑键盘仍可弹奏
        </span>
      )}
      {status === 'init' && <span className="text-muted">正在检测 MIDI 设备…</span>}
    </div>
  )
}