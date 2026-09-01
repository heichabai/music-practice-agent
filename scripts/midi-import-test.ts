import midiPkg from '@tonejs/midi'

const { Midi } = midiPkg

const midi = new Midi()
midi.header.setTempo(96)

const melody = midi.addTrack()
melody.addNote({ midi: 60, time: 0, duration: 0.625 })
melody.addNote({ midi: 64, time: 0.625, duration: 0.625 })
melody.addNote({ midi: 67, time: 1.25, duration: 0.625 })
melody.addNote({ midi: 72, time: 1.875, duration: 1.25 })

const bass = midi.addTrack()
bass.addNote({ midi: 36, time: 0, duration: 2.5 })

const bytes = midi.toArray()

const { importMidiFile } = await import('../src/game/midiImport')
const { song, info } = importMidiFile(bytes, '测试旋律.mid')

console.log(info)
console.log(JSON.stringify(song, null, 2))

const fail = (msg: string): never => {
  console.error(`断言失败：${msg}`)
  process.exit(1)
}
if (song.bpm !== 96) fail(`bpm 应为 96，实际 ${song.bpm}`)
if (song.name !== '测试旋律') fail(`名称应为"测试旋律"，实际 ${song.name}`)
if (song.notes.length !== 4) fail(`应选 4 音的主旋律轨道，实际 ${song.notes.length}`)
if (song.notes[0].midi !== 60 || song.notes[0].time !== 0) fail('第一个音应为 C4/0拍')
if (Math.abs(song.notes[1].time - 1) > 0.001) fail(`第二个音时间应约 1 拍，实际 ${song.notes[1].time}`)
if (Math.abs(song.notes[3].duration - 2) > 0.001) fail(`第四个音时值应约 2 拍，实际 ${song.notes[3].duration}`)
console.log('\n全部断言通过')
