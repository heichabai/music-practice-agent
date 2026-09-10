import * as Tone from 'tone'

let clickSynth: Tone.Synth | null = null

/**
 * 轻量 UI 点击音效（按钮反馈）。
 * 极短高频正弦 + 快速衰减，音量很低不抢钢琴声。
 */
export function playUiClick(): void {
  try {
    void Tone.start()
    if (clickSynth === null) {
      clickSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
      }).toDestination()
      clickSynth.volume.value = -24
    }
    clickSynth.triggerAttackRelease('E6', 0.035, Tone.getContext().currentTime + 0.005)
  } catch {
    // 音频不可用时静默
  }
}
