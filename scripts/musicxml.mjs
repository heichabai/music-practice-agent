const STEP_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function musicxmlToSong(xml, fallbackName) {
  const nameMatch = xml.match(/<work-title>([^<]*)<\/work-title>/)
    || xml.match(/<movement-title>([^<]*)<\/movement-title>/)
  const name = nameMatch && nameMatch[1].trim() !== '' ? nameMatch[1].trim() : fallbackName

  const tempoMatch = xml.match(/<sound[^>]*\stempo="([\d.]+)"/)
  const bpm = tempoMatch ? Math.round(Math.min(240, Math.max(30, Number(tempoMatch[1])))) : 100

  const partMatch = xml.match(/<part\b[^>]*>([\s\S]*?)<\/part>/)
  if (!partMatch) throw new Error('MusicXML 中没有找到声部（part）')
  const body = partMatch[1]

  let divisions = 1
  const voices = new Map()
  let posQ = 0
  let lastOnsetQ = 0
  const eventRe =
    /<note\b[^>]*>([\s\S]*?)<\/note>|<backup\b[^>]*>([\s\S]*?)<\/backup>|<forward\b[^>]*>([\s\S]*?)<\/forward>|<divisions>(\d+)<\/divisions>/g

  let m
  while ((m = eventRe.exec(body)) !== null) {
    if (m[4] !== undefined) {
      divisions = Math.max(1, Number(m[4]))
      continue
    }
    if (m[2] !== undefined) {
      const dur = Number(m[2].match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0)
      posQ -= dur / divisions
      continue
    }
    if (m[3] !== undefined) {
      const dur = Number(m[3].match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0)
      posQ += dur / divisions
      continue
    }

    const noteXml = m[1]
    if (noteXml.includes('<grace')) continue
    const durQ =
      Number(noteXml.match(/<duration>(\d+)<\/duration>/)?.[1] ?? 0) / divisions
    if (noteXml.includes('<rest')) {
      posQ += durQ
      lastOnsetQ = posQ
      continue
    }
    const pitch = noteXml.match(
      /<pitch>\s*<step>([A-G])<\/step>\s*(?:<alter>(-?\d+)<\/alter>)?\s*<octave>(\d+)<\/octave>\s*<\/pitch>/,
    )
    const voice = Number(noteXml.match(/<voice>(\d+)<\/voice>/)?.[1] ?? 1)
    const staff = Number(noteXml.match(/<staff>(\d+)<\/staff>/)?.[1] ?? 1)
    const isChord = noteXml.includes('<chord')

    if (pitch) {
      const midi = (Number(pitch[3]) + 1) * 12 + STEP_SEMI[pitch[1]] + Number(pitch[2] ?? 0)
      const onset = isChord ? lastOnsetQ : posQ
      const key = `${staff}:${voice}`
      if (!voices.has(key)) voices.set(key, { notes: [], sum: 0 })
      const group = voices.get(key)
      group.notes.push({ midi, onset, durQ })
      group.sum += midi
    }
    if (!isChord) {
      posQ += durQ
      lastOnsetQ = posQ - durQ
    }
  }

  if (voices.size === 0) throw new Error('MusicXML 中没有可用的音符')

  // 全声部合并：谱面上有什么音符就输出什么（双手谱两个声部都保留）
  const all = []
  for (const group of voices.values()) {
    all.push(...group.notes)
  }

  const seen = new Set()
  const notes = all
    .map(n => ({
      midi: n.midi,
      time: Math.max(0, Math.round(n.onset * 4) / 4),
      duration: Math.min(16, Math.max(0.25, Math.round(n.durQ * 4) / 4)),
    }))
    .filter(n => {
      if (n.midi < 21 || n.midi > 108) return false
      const key = `${n.midi}@${n.time}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.time - b.time)

  return { name, bpm, notes }
}
