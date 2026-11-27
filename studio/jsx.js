/*
 * JSX 소스를 가볍게 읽는 도구 — 바벨 같은 파서를 싣지 않고 글자를 훑는다.
 * 목적은 편집기 보조(Outline·자동완성 문맥·ref 추적)라 「대개 맞으면 되는」 수준이다:
 * 대문자로 시작하는 컴포넌트 태그만 따라가고, 태그 안의 {…} 깊이와 따옴표는 지킨다(onClick={() => x} 의 > 를 태그 끝으로 보지 않게).
 */

const NAME_AT = /^[A-Z][\w$]*(?:\.[\w$]+)*/

/** 태그 속성 덩어리에서 key="값" · key={값} · key(불리언) 를 뽑는다 */
function readAttrs(src) {
  const out = {}
  let i = 0
  while (i < src.length) {
    const m = /^\s*([A-Za-z_$][\w$-]*)/.exec(src.slice(i))
    if (!m) { i++; continue }
    i += m[0].length
    const name = m[1]
    let j = i
    while (src[j] === ' ' || src[j] === '\n' || src[j] === '\t' || src[j] === '\r') j++
    if (src[j] !== '=') { out[name] = true; continue }
    j++
    while (src[j] === ' ') j++
    const q = src[j]
    if (q === '"' || q === "'") {
      const k = src.indexOf(q, j + 1)
      out[name] = src.slice(j + 1, k < 0 ? src.length : k)
      i = k < 0 ? src.length : k + 1
    } else if (q === '{') {
      let d = 0, k = j
      for (; k < src.length; k++) {
        if (src[k] === '{') d++
        else if (src[k] === '}') { d--; if (d === 0) break }
      }
      out[name] = '{' + src.slice(j + 1, k).trim() + '}'
      i = k + 1
    } else i = j
  }
  return out
}

/** 태그 안(< 다음)부터 끝(> 또는 />)을 찾는다 — { end, selfClose } 또는 null(아직 안 닫힘) */
function scanTagEnd(text, from) {
  let depth = 0, q = null
  for (let k = from; k < text.length; k++) {
    const ch = text[k]
    if (q) { if (ch === q && text[k - 1] !== '\\') q = null; continue }
    if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue }
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (depth === 0 && ch === '>') return { end: k, selfClose: text[k - 1] === '/' }
  }
  return null
}

function lineOf(starts, pos) {
  let lo = 0, hi = starts.length - 1
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1 }
  return lo + 1
}

/**
 * 컴포넌트 태그 트리 — [{ name, attrs, line, endLine, children }]
 * 태그 밖의 JS 문자열·주석은 건너뛴다(사용 예를 담은 문자열 속 <Moca…> 를 태그로 보지 않게).
 */
export function outline(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  const root = { children: [] }
  const stack = [root]
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    // 주석 · 문자열 (JSX 자식 글자 속 ' 는 문자열이 아니므로 컴포넌트 밖일 때만 건너뛴다)
    if (ch === '/' && text[i + 1] === '/') { const n = text.indexOf('\n', i); i = n < 0 ? text.length : n; continue }
    if (ch === '/' && text[i + 1] === '*') { const n = text.indexOf('*/', i + 2); i = n < 0 ? text.length : n + 2; continue }
    if (stack.length === 1 && (ch === '"' || ch === "'" || ch === '`')) {
      let k = i + 1
      while (k < text.length && !(text[k] === ch && text[k - 1] !== '\\')) { if (ch !== '`' && text[k] === '\n') break; k++ }
      i = k + 1; continue
    }
    if (ch === '<') {
      if (text[i + 1] === '/') {
        const m = NAME_AT.exec(text.slice(i + 2))
        if (m) {
          // 짝이 맞는 것까지 닫는다(짝 없는 닫는 태그는 무시)
          for (let s = stack.length - 1; s > 0; s--) {
            if (stack[s].name === m[0]) { stack[s].endLine = lineOf(starts, i); stack.length = s; break }
          }
          i += 2 + m[0].length; continue
        }
      } else {
        const m = NAME_AT.exec(text.slice(i + 1))
        if (m && (i === 0 || !/[\w$)\]]/.test(text[i - 1]))) {
          const end = scanTagEnd(text, i + 1 + m[0].length)
          if (!end) break
          const node = {
            name: m[0],
            attrs: readAttrs(text.slice(i + 1 + m[0].length, end.selfClose ? end.end - 1 : end.end)),
            line: lineOf(starts, i),
            endLine: lineOf(starts, end.end),
            children: [],
          }
          stack[stack.length - 1].children.push(node)
          if (!end.selfClose) stack.push(node)
          i = end.end + 1; continue
        }
      }
    }
    i++
  }
  // 안 닫힌 것은 파일 끝까지로 본다
  const last = starts.length
  for (let s = stack.length - 1; s > 0; s--) if (!stack[s].endLine || stack[s].endLine < stack[s].line) stack[s].endLine = last
  return root.children
}

/** 줄을 품은 가장 안쪽 노드 */
export function nodeAtLine(nodes, line) {
  for (const n of nodes) {
    if (line >= n.line && line <= n.endLine) return nodeAtLine(n.children, line) || n
  }
  return null
}

/** ref={grid} → { grid: 'MocaReactGrid' } */
export function refMap(nodes, out = {}) {
  for (const n of nodes) {
    const r = n.attrs.ref
    if (typeof r === 'string' && /^\{[\w$]+\}$/.test(r)) out[r.slice(1, -1)] = n.name
    refMap(n.children, out)
  }
  return out
}

/**
 * 커서 앞 글자로 문맥을 읽는다 — 열린 태그 안이면 { tag, typed, inValue, present }.
 * typed = 지금 치고 있는 속성 이름 조각, present = 이미 쓴 속성들
 */
export function tagContext(before) {
  const from = Math.max(0, before.length - 4000)
  const re = /<([A-Z][\w$]*(?:\.[\w$]+)*)/g
  re.lastIndex = from
  let m, last = null
  while ((m = re.exec(before))) last = m
  if (!last) return null
  const bodyStart = last.index + last[0].length
  if (scanTagEnd(before, bodyStart)) return null // 이미 닫힌 태그
  const body = before.slice(bodyStart)
  // 값 안({…} 또는 따옴표 안)이면 속성 이름 자동완성은 하지 않는다
  let depth = 0, q = null
  for (let k = 0; k < body.length; k++) {
    const ch = body[k]
    if (q) { if (ch === q) q = null; continue }
    if (ch === '"' || ch === "'") q = ch
    else if (ch === '{') depth++
    else if (ch === '}') depth--
  }
  const typed = (/([A-Za-z_$][\w$]*)$/.exec(body) || [])[1] || ''
  const present = Object.keys(readAttrs(body))
  return { tag: last[1], typed, inValue: depth > 0 || q !== null, atNameStart: /(^|\s)[A-Za-z_$]*$/.test(body), present }
}
