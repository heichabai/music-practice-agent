import type { MidiStatus } from '../../midi/useMidiInput'

interface Props {
  status: MidiStatus
  deviceName: string
}

const DOT: Record<MidiStatus, string> = {
  ok: 'bg-hit',
  'no-device': 'bg-accent',
  unsupported: 'bg-accent',
  init: 'bg-muted',
}

/** MIDI 连接状态徽标：全宽卡片行 + 8px 状态圆点，四态（§4.1） */
export function MidiStatusBadge({ status, deviceName }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[status]}`} aria-hidden />
      {status === 'ok' && <span className="text-hit">MIDI 已连接 · {deviceName}</span>}
      {status === 'no-device' && (
        <span className="text-accent">
          未检测到 MIDI 设备，可用电脑键盘弹奏（A S D F G H J K 白键 · W E T Y U 黑键）
        </span>
      )}
      {status === 'unsupported' && (
        <span className="text-accent">
          当前浏览器不支持 Web MIDI，请用 Chrome / Edge 打开；电脑键盘仍可弹奏
        </span>
      )}
      {status === 'init' && <span className="text-secondary">正在检测 MIDI 设备…</span>}
    </div>
  )
}
