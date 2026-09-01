import { writeFileSync } from 'node:fs'

const objs = []
objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'
objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
objs[3] =
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>'
const stream = 'BT /F1 24 Tf 100 700 Td (Test Score) Tj ET'
objs[4] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

let pdf = '%PDF-1.4\n'
const offsets = []
for (let i = 1; i <= 5; i++) {
  offsets[i] = pdf.length
  pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`
}
const xrefPos = pdf.length
pdf += 'xref\n0 6\n0000000000 65535 f \n'
for (let i = 1; i <= 5; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
}
pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`

writeFileSync('/tmp/test-score.pdf', pdf, 'latin1')
console.log('测试 PDF 已生成: /tmp/test-score.pdf,', pdf.length, 'bytes')
