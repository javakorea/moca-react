/*
 * 설계 데이터(Puck) → MOCA React 화면 .jsx
 * 골격은 moca-react-screen 스킬의 표준 그대로다(예외 없음):
 *   <div 100%·padding 12> <MocaReactLayout layout=…> <ComTitle …/> …블록… </MocaReactLayout> (떠 있는 버튼) </div>
 * 제목줄이 맨 위에 없으면 넣는다. 떠 있는 버튼은 칸을 차지하지 않으므로 레이아웃 밖에 둔다.
 */
import { layoutOf, isFloating } from './layoutTokens.js'

const q = (s) => "'" + String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
// JSX 글자 — 꺾쇠·중괄호·줄바꿈이 있으면 문자열 식으로 감싼다({"…"})
const jsxText = (s) => { const t = String(s ?? ''); return /[{}<>\n]/.test(t) ? '{' + JSON.stringify(t) + '}' : t }
const attrStr = (s) => '"' + String(s ?? '').replace(/"/g, '&quot;') + '"'
const ident = (s) => (/^[A-Za-z_$][\w$]*$/.test(s) ? s : q(s))

/** 슬롯 안까지 모든 블록을 순서대로 */
function walk(items, fn) {
  for (const it of items || []) {
    fn(it)
    if (it.type === 'Split') walk(it.props.items, fn)
  }
}

export function generateScreen(data, { name, title }) {
  const content = [...(data?.content || [])]
  // 제목줄은 맨 위에 하나 — 표준 골격(빠지면 그 화면만 제목·경로가 없다)
  if (!content.some((c) => c.type === 'Title')) content.unshift({ type: 'Title', props: {} })

  const prefix = name.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase())
  const imports = new Map() // 패키지 → Set(이름)
  const addImport = (pkg, n) => { if (!imports.has(pkg)) imports.set(pkg, new Set()); imports.get(pkg).add(n) }
  addImport('@teammoca/react-layout', 'MocaReactLayout')

  // ── 검색조건 · 그리드 모으기 ──
  const conds = []
  const grids = []
  walk(content, (it) => {
    if (it.type === 'SearchBox') for (const c of it.props.items || []) if (c.key && !conds.some((x) => x.key === c.key)) conds.push(c)
    if (it.type === 'Grid') { it._n = grids.length + 1; grids.push(it) }
  })
  const hasSearch = conds.length > 0
  // 떠 있는 버튼은 어느 칸에 놓였든 레이아웃 밖(화면 루트)에 둔다
  const fabs = []
  walk(content, (it) => { if (isFloating(it)) fabs.push(it) })
  const hasFab = fabs.length > 0
  const reactHooks = new Set()
  if (hasSearch) reactHooks.add('useState')

  const top = []   // 함수 밖 상수(컬럼·고르기 목록)
  const body = []  // 함수 안 훅·처리기
  if (hasSearch) {
    const init = '{ ' + conds.map((c) => `${ident(c.key)}: ''`).join(', ') + ' }'
    body.push(`  // 검색조건 — 입력은 cond, [조회]를 누르면 params 로 옮겨 그 값으로 다시 조회한다`)
    body.push(`  const [cond, setCond] = useState(${init})`)
    body.push(`  const [params, setParams] = useState(${init})`)
    body.push(`  const setC = (key, value) => setCond((c) => ({ ...c, [key]: value }))`)
    body.push(`  const fnSearch = () => setParams({ ...cond })`)
    for (const c of conds) {
      if (c.kind !== 'combo') continue
      const list = String(c.codes || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
        const [cd, nm] = s.split(':')
        return `{ cd: ${q(cd.trim())}, nm: ${q((nm ?? cd).trim())} }`
      })
      top.push(`const ${c.key}_LIST = [${list.join(', ')}]`)
    }
  }
  const reloads = []
  for (const g of grids) {
    const n = g._n
    const cols = (g.props.columns || []).map((c) => {
      const parts = [`key: ${q(c.key || 'COL')}`, `title: ${q(c.title || c.key || '')}`]
      if (c.width) parts.push(`width: ${Number(c.width)}`)
      if (c.align && c.align !== 'left') parts.push(`align: ${q(c.align)}`)
      return `  { ${parts.join(', ')} },`
    })
    top.push(`const columns${n} = [\n${cols.join('\n')}\n]`)
    addImport('@teammoca/react-grid', 'MocaReactGrid')
    if (g.props.queryId) {
      addImport('@teammoca/react-tran', 'useSelect')
      body.push(`  const grid${n} = useSelect(${q(g.props.queryId)}${hasSearch ? ', params' : ''})`)
      reloads.push(`grid${n}.reload`)
    }
  }
  if (content.some((c) => c.type === 'Title')) addImport('./com/ComTitle', 'default:ComTitle')
  if (hasFab) { addImport('@teammoca/react-floating-button', 'MocaReactFloatingButton'); addImport('@teammoca/react-msgbox', 'msgbox') }

  // ── JSX ──
  const out = []
  const pad = (d) => '  '.repeat(d)
  const emit = (it, d) => {
    const P = it.props || {}
    switch (it.type) {
      case 'Title': {
        const r = reloads.length === 1 ? ` onRefresh={${reloads[0]}}` : reloads.length > 1 ? ` onRefresh={() => { ${reloads.map((x) => x + '()').join('; ')} }}` : ''
        out.push(`${pad(d)}<ComTitle menu={menuInfo}${r} />`)
        break
      }
      case 'SearchBox': {
        out.push(`${pad(d)}<div className="${prefix}-search">`)
        for (const c of P.items || []) {
          if (!c.key) continue
          out.push(`${pad(d + 1)}<label>${jsxText(c.label || c.key)}</label>`)
          if (c.kind === 'date') {
            addImport('@teammoca/react-input-calendar', 'MocaReactInputCalendar')
            out.push(`${pad(d + 1)}<MocaReactInputCalendar displayFormat="####-##-##" onDateSelected={(v) => setC(${q(c.key)}, v)} />`)
          } else if (c.kind === 'combo') {
            addImport('@teammoca/react-search-combo', 'MocaReactSearchCombo')
            out.push(`${pad(d + 1)}<MocaReactSearchCombo list={${c.key}_LIST} value={cond.${c.key}} onChange={(v) => setC(${q(c.key)}, v)} width={140} />`)
          } else {
            out.push(`${pad(d + 1)}<input value={cond.${c.key}} onChange={(e) => setC(${q(c.key)}, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fnSearch() }} />`)
          }
        }
        out.push(`${pad(d + 1)}<button type="button" onClick={fnSearch}>조회</button>`)
        out.push(`${pad(d)}</div>`)
        break
      }
      case 'Grid': {
        const n = it._n
        const g = P.queryId ? `grid${n}` : null
        const label = g
          ? `{\`${String(P.label || '').replace(/[`$\\]/g, '\\$&')}\${${g}.loading ? ' (조회중…)' : ${g}.error ? \` (실패: \${${g}.error.message})\` : ''}\`}`
          : attrStr(P.label || '')
        const attrs = [`label=${label}`, `columns={columns${n}}`, `data={${g ? g + '.rows' : '[]'}}`]
        if (P.search) attrs.push('search')
        if (P.sortable) attrs.push('sortable')
        if (!P.rowStatus) attrs.push('rowStatus={false}', 'delCheck={false}')
        out.push(`${pad(d)}<MocaReactGrid`)
        for (const a of attrs) out.push(`${pad(d + 1)}${a}`)
        out.push(`${pad(d)}/>`)
        break
      }
      case 'Split': {
        const kids = (P.items || []).filter((x) => !isFloating(x))
        out.push(`${pad(d)}<MocaReactLayout layout="${layoutOf(P.dir, P.ratio, kids)}">`)
        if (!kids.length) out.push(`${pad(d + 1)}<div />`)
        for (const k of kids) emit(k, d + 1)
        out.push(`${pad(d)}</MocaReactLayout>`)
        break
      }
      case 'Text':
        out.push(`${pad(d)}<div className="${prefix}-note">${jsxText(P.text)}</div>`)
        break
      case 'Fab': {
        const a = [`label=${attrStr(P.label || '')}`]
        if (P.icon) a.push(`icon=${attrStr(P.icon)}`)
        if (P.position && P.position !== 'rb') a.push(`position=${attrStr(P.position)}`)
        a.push(`onClick={() => msgbox.alert(${q((P.label || '버튼') + ' — 처리를 넣습니다')})}`)
        out.push(`${pad(d)}<MocaReactFloatingButton ${a.join(' ')} />`)
        break
      }
      default:
        out.push(`${pad(d)}{/* 모르는 블록: ${it.type} */}`)
    }
  }

  const main = content.filter((c) => !isFloating(c))
  out.push(`      <MocaReactLayout layout="${layoutOf('v', '', main)}">`)
  for (const it of main) emit(it, 4)
  out.push(`      </MocaReactLayout>`)
  for (const it of fabs) emit(it, 3)

  // ── 스타일(검색조건·안내문) — UserList 와 같은 꼴, 다크 테마 포함 ──
  const css = []
  if (hasSearch) {
    css.push(`.${prefix}-search { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 9px 12px; border: 1px solid #d8dee5; border-radius: 6px; font-size: 13px; }`)
    css.push(`.${prefix}-search label { color: #6b7280; }`)
    css.push(`.${prefix}-search input { padding: 5px 8px; border: 1px solid #c4ccd5; border-radius: 5px; font-size: 12px; background: transparent; color: inherit; width: 130px; }`)
    css.push(`.${prefix}-search button { padding: 5px 14px; border: 1px solid #c4ccd5; border-radius: 5px; background: transparent; color: inherit; cursor: pointer; }`)
    css.push(`:root[data-theme="dark"] .${prefix}-search { border-color: #2a3644; }`)
    css.push(`:root[data-theme="dark"] .${prefix}-search input, :root[data-theme="dark"] .${prefix}-search button { border-color: #3a4a5c; background: #0f161d; }`)
  }
  if (content.some((c) => c.type === 'Text') || JSON.stringify(content).includes('"Text"')) {
    css.push(`.${prefix}-note { padding: 8px 12px; font-size: 13px; opacity: .8; white-space: pre-wrap; }`)
  }
  if (css.length) {
    out.push('')
    out.push('      <style>{`')
    for (const l of css) out.push('        ' + l)
    out.push('      `}</style>')
  }

  // ── import ──
  const lines = []
  if (reactHooks.size) lines.push(`import { ${[...reactHooks].join(', ')} } from 'react'`)
  const order = [...imports.keys()].sort((a, b) => (a.startsWith('.') ? 1 : 0) - (b.startsWith('.') ? 1 : 0) || a.localeCompare(b))
  for (const pkg of order) {
    const names = [...imports.get(pkg)]
    const def = names.find((n) => n.startsWith('default:'))
    if (def) lines.push(`import ${def.slice(8)} from '${pkg}'`)
    const named = names.filter((n) => !n.startsWith('default:')).sort()
    if (named.length) lines.push(`import { ${named.join(', ')} } from '${pkg}'`)
  }

  return [
    ...lines,
    '',
    `// ${title} — MOCA React Studio 화면 설계로 만든 화면(studio/designs/${name}.json)`,
    ...(top.length ? [top.join('\n\n'), ''] : []),
    `function ${name}({ menuInfo }) {`,
    ...body,
    ...(body.length ? [''] : []),
    '  return (',
    `    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>`,
    ...out,
    '    </div>',
    '  )',
    '}',
    '',
    `export default ${name}`,
    '',
  ].join('\n')
}
