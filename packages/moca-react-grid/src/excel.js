// 엑셀(.xlsx) 내보내기 — 외부 라이브러리 없이 만든다(이 패키지는 의존성 0 이 원칙).
//
// xlsx 는 XML 몇 장을 zip 으로 묶은 것이다. 압축 없이(STORE) 묶어도 엑셀이 그대로 연다 —
// 그리드 한 장 분량이면 크기 손해보다 의존성을 안 늘리는 이득이 크다. 문자열은 공유 문자열표
// 대신 셀에 바로 적는다(inlineStr) — 표 하나를 더 만들 필요가 없다.
//
// rows   : [[cell, …], …]  cell = { v, t:'n'|'s', s:스타일번호 } 또는 null(빈 칸)
// merges : [{ r1, c1, r2, c2 }]  (0부터)
// widths : 컬럼 폭(px) 배열 — 엑셀 문자 폭으로 바꿔 넣는다
// 스타일 번호: 0 기본 · 1 머리글 · 2 숫자(#,##0) · 3 집계 글자 · 4 집계 숫자 · 5 소수 숫자 · 6 집계 소수

const enc = new TextEncoder()

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// 무압축 zip — 로컬 헤더 + 데이터 … + 중앙 디렉터리 + 끝 레코드
function zip(files) {
  const parts = []
  const central = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)          // 필요 버전
    local.setUint16(6, 0x0800, true)      // UTF-8 이름
    local.setUint16(8, 0, true)           // STORE
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    parts.push(new Uint8Array(local.buffer), name, data)
    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true)
    cen.setUint16(4, 20, true)
    cen.setUint16(6, 20, true)
    cen.setUint16(8, 0x0800, true)
    cen.setUint16(10, 0, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, data.length, true)
    cen.setUint32(24, data.length, true)
    cen.setUint16(28, name.length, true)
    cen.setUint32(42, offset, true)
    central.push(new Uint8Array(cen.buffer), name)
    offset += 30 + name.length + data.length
  }
  const cenSize = central.reduce((a, p) => a + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cenSize, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// XML 에 못 넣는 제어문자 — 지우려고 일부러 찾는 것이라 규칙 경고를 끈다
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g
const esc = (s) => String(s)
  .replace(CTRL, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 0 → A, 26 → AA
function colName(c) {
  let s = ''
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts>
<fonts count="2"><font><sz val="10"/><name val="맑은 고딕"/></font><font><b/><sz val="10"/><name val="맑은 고딕"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3EFE6"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF0E8D3"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFD0C8B8"/></left><right style="thin"><color rgb="FFD0C8B8"/></right><top style="thin"><color rgb="FFD0C8B8"/></top><bottom style="thin"><color rgb="FFD0C8B8"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="3" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs></styleSheet>`

function sheetXml(rows, merges, widths, freezeRows) {
  const cols = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(6, Math.round(w / 7 * 10) / 10)}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const pane = freezeRows
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : ''
  const body = rows.map((r, ri) => {
    const cells = r.map((c, ci) => {
      if (!c) return ''
      const ref = `${colName(ci)}${ri + 1}`
      const s = c.s ? ` s="${c.s}"` : ''
      if (c.v == null || c.v === '') return `<c r="${ref}"${s}/>`
      if (c.t === 'n') return `<c r="${ref}"${s}><v>${c.v}</v></c>`
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`
    }).join('')
    return `<row r="${ri + 1}">${cells}</row>`
  }).join('')
  const mg = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${colName(m.c1)}${m.r1 + 1}:${colName(m.c2)}${m.r2 + 1}"/>`).join('')}</mergeCells>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${body}</sheetData>${mg}</worksheet>`
}

export function buildXlsx({ rows, merges = [], widths = [], sheetName = 'Sheet1', freezeRows = 0 }) {
  const name = esc(String(sheetName).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1')
  return zip([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { name: 'xl/styles.xml', data: STYLES },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml(rows, merges, widths, freezeRows) },
  ])
}

export function download(blob, fileName) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = /\.xlsx$/i.test(fileName) ? fileName : `${fileName}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
