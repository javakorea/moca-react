import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadMonaco, langOf } from './monaco.js'
import { COMPONENTS, splitExample } from './catalog.js'
import { outline, nodeAtLine } from './jsx.js'
import { REGISTRY_PATH, parseRegistry, screenOfFile, addScreen, TEMPLATES } from './registry.js'
import { devAvailable, devWorkspace, pickLocalWorkspace } from './fs.js'
import NewScreenDialog from './NewScreenDialog.jsx'

// 화면 설계(Puck)는 누를 때 싣는다 — 코드 편집만 쓰는 사람은 받지 않게
const Designer = lazy(() => import('./design/Designer.jsx'))

/*
 * MOCA React Studio — MOCA React 화면(.jsx)을 브라우저에서 편집하는 웹 IDE.
 * MOCA Web Studio(moca2026ai vendor/moca/docs/studio)의 React 판이다:
 *   탐색기 · 탭 편집기(Monaco) · 카탈로그 자동완성/호버 · 컴포넌트 Outline · 팔레트 · 미리보기 · 새 화면 등록
 * 지식(컴포넌트·속성·메서드)은 docs/catalog.js 하나에서 읽는다 — 여기에 목록을 옮겨 적지 않는다.
 */

const LS = 'moca-react-studio'
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(LS + '.' + k)); return v ?? d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(LS + '.' + k, JSON.stringify(v)) } catch { /* 프라이빗 모드 */ } }

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'

/* ── 탐색기 트리 ───────────────────────────────────────────── */
function buildTree(files) {
  const root = { name: '', path: '', dirs: new Map(), files: [] }
  for (const f of files) {
    const parts = f.split('/')
    let d = root
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts.slice(0, i + 1).join('/')
      if (!d.dirs.has(parts[i])) d.dirs.set(parts[i], { name: parts[i], path: p, dirs: new Map(), files: [] })
      d = d.dirs.get(parts[i])
    }
    d.files.push(f)
  }
  return root
}

function Explorer({ files, active, dirty, onOpen, filter }) {
  const [open, setOpen] = useState(() => new Set(load('openDirs', ['src', 'src/screens'])))
  const toggle = (p) => setOpen((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); save('openDirs', [...n]); return n })
  const shown = useMemo(() => (filter ? files.filter((f) => f.toLowerCase().includes(filter.toLowerCase())) : files), [files, filter])
  const tree = useMemo(() => buildTree(shown), [shown])
  const renderDir = (d, depth) => (
    <>
      {[...d.dirs.values()].sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
        const isOpen = filter || open.has(c.path)
        return (
          <li key={c.path}>
            <div className="ex-row dir" style={{ paddingLeft: 8 + depth * 12 }} onClick={() => toggle(c.path)}>
              <span className="chev">{isOpen ? '▾' : '▸'}</span>{c.name}
            </div>
            {isOpen && <ul>{renderDir(c, depth + 1)}</ul>}
          </li>
        )
      })}
      {d.files.map((f) => (
        <li key={f}>
          <div className={'ex-row file' + (f === active ? ' on' : '')} style={{ paddingLeft: 20 + depth * 12 }} onClick={() => onOpen(f)} title={f}>
            {f.split('/').pop()}{dirty.has(f) && <span className="dot">●</span>}
          </div>
        </li>
      ))}
    </>
  )
  return <ul className="ex-tree">{renderDir(tree, 0)}</ul>
}

/* ── Outline ──────────────────────────────────────────────── */
function OutlineView({ nodes, current, onPick }) {
  if (!nodes.length) return <div className="empty">컴포넌트 태그가 없습니다</div>
  const label = (n) => {
    const hint = n.attrs.layout || n.attrs.label || n.attrs.title || n.attrs.key
    return hint && typeof hint === 'string' ? hint.replace(/^\{|\}$/g, '') : ''
  }
  const walk = (list, depth) => list.map((n, i) => (
    <li key={n.line + ':' + i}>
      <div className={'ol-row' + (n === current ? ' on' : '') + (COMPONENTS[n.name] ? ' moca' : '')} style={{ paddingLeft: 8 + depth * 12 }} onClick={() => onPick(n)}>
        <span className="tag">{n.name}</span><span className="hint">{label(n)}</span><span className="ln">{n.line}</span>
      </div>
      {n.children.length > 0 && <ul>{walk(n.children, depth + 1)}</ul>}
    </li>
  ))
  return <ul className="ol-tree">{walk(nodes, 0)}</ul>
}

/* ── 컴포넌트 도움말(커서가 든 태그) ─────────────────────── */
function InfoView({ node }) {
  const [openAttr, setOpenAttr] = useState(null)
  const c = node && COMPONENTS[node.name]
  if (!c) return <div className="empty">MOCA React 컴포넌트 태그 안에 커서를 두면 속성 설명이 나옵니다</div>
  return (
    <div className="info">
      <div className="info-name">{c.name} <span className="pkg">{c.pkg}</span></div>
      <div className="info-desc">{splitExample(c.desc).text}</div>
      <ul className="attrs">
        {c.attrs.map((a) => (
          <li key={a.name} className={(node.attrs[a.name] !== undefined ? 'set' : '') + (a.event ? ' ev' : '')}>
            <div className="attr-row" onClick={() => setOpenAttr(openAttr === a.name ? null : a.name)}>
              <span className="an">{a.name}</span>
              <span className="av">{node.attrs[a.name] === undefined ? '' : String(node.attrs[a.name])}</span>
            </div>
            {openAttr === a.name && <div className="attr-desc">{a.desc}</div>}
          </li>
        ))}
      </ul>
      {c.methods.length > 0 && (
        <>
          <div className="info-sub">ref 메서드</div>
          <ul className="attrs">{c.methods.map((m) => <li key={m.name} title={m.desc}><div className="attr-row"><span className="an">{m.sig}</span></div></li>)}</ul>
        </>
      )}
    </div>
  )
}

/* ── 끌어 크기 바꾸는 막대 ────────────────────────────────── */
function Sash({ onDrag }) {
  const down = (e) => {
    e.preventDefault()
    let x = e.clientX
    const move = (ev) => { onDrag(ev.clientX - x); x = ev.clientX }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.classList.remove('dragging') }
    document.body.classList.add('dragging')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return <div className="sash" onPointerDown={down} />
}

export default function Studio() {
  const [monacoReady, setMonacoReady] = useState(false)
  const [bootErr, setBootErr] = useState('')
  const [ws, setWs] = useState(null)
  const [files, setFiles] = useState([])
  const [filter, setFilter] = useState('')
  const [tabs, setTabs] = useState([]) // 열린 파일 경로
  const [active, setActive] = useState(null)
  const [dirty, setDirty] = useState(() => new Set())
  const [registry, setRegistry] = useState({ groups: [], lazies: {} })
  const [nodes, setNodes] = useState([])
  const [cursorLine, setCursorLine] = useState(1)
  const [rightTab, setRightTab] = useState('outline')
  const [sizes, setSizes] = useState(() => load('sizes', { left: 240, right: 300, preview: 520 }))
  const [preview, setPreview] = useState(() => load('preview', true))
  const [previewKey, setPreviewKey] = useState(null)
  const [newDlg, setNewDlg] = useState(false)
  const [msg, setMsg] = useState(null)
  const [mode, setMode] = useState(() => load('mode', 'code')) // code | design
  const [designReq, setDesignReq] = useState(null) // 설계 → 화면 만들기 대화상자에 넘길 것

  const hostRef = useRef(null)
  const editorRef = useRef(null)
  const docsRef = useRef(new Map()) // path → { model, saved }
  const iframeRef = useRef(null)
  const wsRef = useRef(null)
  wsRef.current = ws
  const activeRef = useRef(null)
  activeRef.current = active

  const flash = useCallback((kind, text) => {
    setMsg({ kind, text })
    clearTimeout(flash.t)
    flash.t = setTimeout(() => setMsg(null), kind === 'err' ? 6000 : 2500)
  }, [])

  useEffect(() => save('sizes', sizes), [sizes])
  useEffect(() => save('preview', preview), [preview])

  /* ── 편집기 기동 ── */
  useEffect(() => {
    let disposed = false
    loadMonaco().then((monaco) => {
      if (disposed) return
      const ed = monaco.editor.create(hostRef.current, {
        model: null, automaticLayout: true, fontSize: 13, minimap: { enabled: false },
        theme: isDark() ? 'vs-dark' : 'vs', tabSize: 2, scrollBeyondLastLine: false,
        fontFamily: "Consolas, 'D2Coding', 'Malgun Gothic', monospace",
        // 한글 주석·문자열에 「헷갈리는 글자」 노란 상자가 덮이지 않게 — 한글 화면이라 전부 정상 글자다
        unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false, nonBasicASCII: false },
      })
      editorRef.current = ed
      ed.onDidChangeCursorPosition((e) => setCursorLine(e.position.lineNumber))
      setMonacoReady(true)
    }).catch((e) => setBootErr(e.message))
    return () => { disposed = true; editorRef.current?.dispose() }
  }, [])

  /* ── 작업 공간 열기 ── */
  const openWorkspace = useCallback(async (w) => {
    for (const d of docsRef.current.values()) d.model.dispose()
    docsRef.current.clear()
    setTabs([]); setActive(null); setDirty(new Set()); setNodes([])
    setWs(w)
    const list = await w.list()
    setFiles(list)
    if (list.includes(REGISTRY_PATH)) setRegistry(parseRegistry(await w.read(REGISTRY_PATH)))
    else setRegistry({ groups: [], lazies: {} })
    return list
  }, [])

  const openFile = useCallback(async (path) => {
    const w = wsRef.current
    if (!w || !editorRef.current) return
    let d = docsRef.current.get(path)
    if (!d) {
      let text
      try { text = await w.read(path) } catch (e) { flash('err', `열지 못했습니다: ${e.message}`); return }
      const monaco = window.monaco
      const model = monaco.editor.createModel(text, langOf(path), monaco.Uri.parse('file:///' + path))
      d = { model, saved: text }
      docsRef.current.set(path, d)
      let t
      model.onDidChangeContent(() => {
        setDirty((s) => {
          const isD = model.getValue() !== d.saved
          if (isD === s.has(path)) return s
          const n = new Set(s); if (isD) n.add(path); else n.delete(path); return n
        })
        clearTimeout(t); t = setTimeout(() => { if (activeRef.current === path) setNodes(langOf(path) === 'javascript' ? outline(model.getValue()) : []) }, 250)
      })
      setTabs((ts) => (ts.includes(path) ? ts : [...ts, path]))
    }
    editorRef.current.setModel(d.model)
    editorRef.current.focus()
    setActive(path)
    activeRef.current = path
    setNodes(langOf(path) === 'javascript' ? outline(d.model.getValue()) : [])
  }, [flash])

  // 시작 — 개발 서버면 이 저장소를 바로 연다(지난번에 열어 둔 탭도 되살린다)
  useEffect(() => {
    if (!monacoReady) return
    devAvailable().then(async (info) => {
      if (!info) return
      // 열기 전에 읽어 둔다 — 작업 공간을 여는 순간 빈 탭 목록이 저장돼 지난 기록을 덮는다
      const last = load('tabs', [])
      const act = load('active', null)
      const list = await openWorkspace(devWorkspace(info))
      for (const p of last) if (list.includes(p)) await openFile(p)
      if (act && last.includes(act)) openFile(act)
    })
  }, [monacoReady, openWorkspace, openFile])

  useEffect(() => { if (ws?.kind === 'dev') { save('tabs', tabs); save('active', active) } }, [ws, tabs, active])

  const closeTab = (path, e) => {
    e?.stopPropagation()
    if (dirty.has(path) && !window.confirm(`${path.split('/').pop()} 의 고친 내용을 버리고 닫을까요?`)) return
    const d = docsRef.current.get(path)
    const rest = tabs.filter((t) => t !== path)
    setTabs(rest)
    setDirty((s) => { const n = new Set(s); n.delete(path); return n })
    if (active === path) {
      const next = rest[rest.length - 1]
      if (next) openFile(next)
      else { editorRef.current?.setModel(null); setActive(null); setNodes([]) }
    }
    docsRef.current.delete(path)
    d?.model.dispose()
  }

  /* ── 저장 ── */
  const saveFile = useCallback(async (path) => {
    const d = docsRef.current.get(path)
    if (!d || !wsRef.current) return false
    const text = d.model.getValue()
    try { await wsRef.current.write(path, text) } catch (e) { flash('err', `저장 실패: ${e.message}`); return false }
    d.saved = text
    setDirty((s) => { const n = new Set(s); n.delete(path); return n })
    if (path === REGISTRY_PATH) setRegistry(parseRegistry(text))
    return true
  }, [flash])

  const saveActive = useCallback(async () => {
    const p = activeRef.current
    if (p && await saveFile(p)) flash('ok', `저장했습니다 — ${p.split('/').pop()}`)
  }, [saveFile, flash])

  const saveAll = async () => {
    let n = 0
    for (const p of dirty) if (await saveFile(p)) n++
    flash('ok', `${n}개 파일을 저장했습니다`)
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (e.shiftKey) saveAll(); else saveActive() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 닫기 전 경고 — 저장 안 한 파일이 있을 때만
  useEffect(() => {
    const h = (e) => { if (dirty.size) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  // 다른 편집기(VS Code·Claude)가 바꾼 파일 — 창으로 돌아오면 저장 안 한 것만 빼고 새로 읽는다
  useEffect(() => {
    const onFocus = async () => {
      const w = wsRef.current
      if (!w) return
      for (const [p, d] of docsRef.current) {
        if (d.model.getValue() !== d.saved) continue
        try {
          const t = await w.read(p)
          if (t !== d.saved) { d.saved = t; d.model.setValue(t); if (p === REGISTRY_PATH) setRegistry(parseRegistry(t)) }
        } catch { /* 지워진 파일 — 그대로 둔다 */ }
      }
      try { setFiles(await w.list()) } catch { /* 목록 실패는 넘어간다 */ }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  /* ── 미리보기 — 지금 파일이 메뉴 화면이면 그 화면을 앱 안에서 연다 ── */
  const activeScreen = active ? screenOfFile(registry, active) : null
  useEffect(() => {
    if (!activeScreen) return
    setPreviewKey(activeScreen.screen.key)
  }, [activeScreen?.screen.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const previewSrc = useMemo(() => './?open=' + encodeURIComponent(previewKey || ''), [ws]) // eslint-disable-line react-hooks/exhaustive-deps
  const previewKeyRef = useRef(null)
  previewKeyRef.current = previewKey
  const postOpen = () => {
    const key = previewKeyRef.current
    if (key) iframeRef.current?.contentWindow?.postMessage({ type: 'moca-studio-open', key }, window.location.origin)
  }
  useEffect(postOpen, [previewKey])
  // 앱이 로그인을 마치면 「준비됨」을 보낸다 — 그때 지금 화면을 연다(로그인 전에 보낸 것은 앱이 못 받는다)
  useEffect(() => {
    const onMsg = (e) => { if (e.origin === window.location.origin && e.data?.type === 'moca-studio-ready') postOpen() }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  /* ── Outline 선택 · 팔레트 끼워 넣기 ── */
  const current = useMemo(() => nodeAtLine(nodes, cursorLine), [nodes, cursorLine])
  const pickNode = (n) => {
    const ed = editorRef.current
    if (!ed) return
    ed.revealLineInCenter(n.line)
    ed.setPosition({ lineNumber: n.line, column: ed.getModel().getLineFirstNonWhitespaceColumn(n.line) })
    ed.focus()
  }
  const insertComponent = (name) => {
    const ed = editorRef.current
    if (!ed || !ed.getModel()) return
    const sel = ed.getSelection()
    ed.executeEdits('palette', [{ range: sel, text: `<${name} />` }])
    // import 줄도 — 자동완성과 같은 규칙(이미 있으면 안 넣는다)
    const model = ed.getModel(), monaco = window.monaco
    const pkg = COMPONENTS[name].pkg
    const text = model.getValue()
    const esc = pkg.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    const m = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${esc}['"]`).exec(text)
    if (m && !m[1].split(',').map((x) => x.trim()).includes(name)) {
      const pos = model.getPositionAt(m.index + m[0].indexOf('{') + 1 + m[1].replace(/\s+$/, '').length)
      ed.executeEdits('palette', [{ range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column), text: ', ' + name }])
    } else if (!m) {
      const imports = [...text.matchAll(/^import\b.*$/gm)]
      const line = imports.length ? model.getPositionAt(imports[imports.length - 1].index).lineNumber + 1 : 1
      ed.executeEdits('palette', [{ range: new monaco.Range(line, 1, line, 1), text: `import { ${name} } from '${pkg}'\n` }])
    }
    ed.focus()
  }

  /* ── 새 화면 ── */
  const createScreen = async (v) => {
    const w = wsRef.current
    const file = `src/screens/${v.name}.jsx`
    if (files.includes(file)) throw new Error(`이미 있는 파일입니다: ${file}`)
    // 레지스트리는 편집 중인 것이 있으면 그것을 기준으로(저장 안 한 내용을 덮지 않게)
    const regDoc = docsRef.current.get(REGISTRY_PATH)
    const base = regDoc ? regDoc.model.getValue() : await w.read(REGISTRY_PATH)
    const next = addScreen(base, v)
    const tpl = TEMPLATES.find((t) => t.id === v.template)
    await w.write(file, v.code ?? tpl.make(v))
    // 화면 설계로 만든 것이면 설계도 남긴다 — 다시 열어 고칠 수 있게
    if (v.design) await w.write(`studio/designs/${v.name}.json`, JSON.stringify(v.design, null, 2) + '\n')
    await w.write(REGISTRY_PATH, next)
    if (regDoc) { regDoc.saved = next; regDoc.model.setValue(next) }
    setRegistry(parseRegistry(next))
    setFiles(await w.list())
    await openFile(file)
    setPreviewKey(v.key)
    setMode('code')
    flash('ok', `새 화면을 만들고 메뉴에 등록했습니다 — ${v.title}`)
  }

  /* ── 화면 설계 → 코드 ── */
  useEffect(() => save('mode', mode), [mode])
  // 새로 만들기 — 이름·메뉴를 묻는 대화상자로 넘긴다(만들 코드는 그 이름으로 그때 만든다)
  const makeFromDesign = (data, onNamed, title) => setDesignReq({ data, onNamed, title })
  // 이미 만든 설계를 다시 — 코드를 덮으므로 묻는다(손으로 고친 코드가 있을 수 있다)
  const overwriteFromDesign = async (name, data, code) => {
    const w = wsRef.current
    const file = `src/screens/${name}.jsx`
    if (!window.confirm(`${file} 을(를) 설계대로 다시 만듭니다.\n손으로 고친 코드는 덮어씁니다. 계속할까요?`)) return
    try {
      await w.write(file, code)
      await w.write(`studio/designs/${name}.json`, JSON.stringify(data, null, 2) + '\n')
      const d = docsRef.current.get(file)
      if (d) { d.saved = code; d.model.setValue(code) }
      const scr = screenOfFile(registry, file)
      if (scr) setPreviewKey(scr.screen.key)
      flash('ok', `설계대로 다시 만들었습니다 — ${name}.jsx`)
    } catch (e) { flash('err', `다시 만들지 못했습니다: ${e.message}`) }
  }

  const pickLocal = async () => {
    if (dirty.size && !window.confirm('저장 안 한 파일이 있습니다. 버리고 다른 폴더를 열까요?')) return
    try { await openWorkspace(await pickLocalWorkspace()) } catch (e) { if (e.name !== 'AbortError') flash('err', e.message) }
  }
  const openDev = async () => {
    const info = await devAvailable()
    if (!info) { flash('err', '개발 서버(npm run dev)에서 연 스튜디오에서만 됩니다'); return }
    if (dirty.size && !window.confirm('저장 안 한 파일이 있습니다. 버리고 이 저장소를 열까요?')) return
    openWorkspace(devWorkspace(info))
  }

  const canPreview = ws?.preview && preview
  const grow = (k, min, max, sign = 1) => (dx) => setSizes((s) => ({ ...s, [k]: Math.max(min, Math.min(max, s[k] + dx * sign)) }))

  return (
    <div className="studio">
      <div className="titlebar">
        <span className="brand">◆ MOCA React Studio</span>
        <span className="ws">{ws ? ws.name : '작업 공간 없음'}</span>
        <span className="modes" role="tablist">
          <button type="button" className={mode === 'code' ? 'on' : ''} onClick={() => setMode('code')} title="코드 편집 — 자동완성·Outline·미리보기">코드</button>
          <button type="button" className={mode === 'design' ? 'on' : ''} onClick={() => setMode('design')} disabled={!ws} title="화면 설계 — 블록을 끌어 놓아 화면을 그리고 코드로 만듭니다(Puck)">화면 설계</button>
        </span>
        <span className="grow" />
        <button type="button" onClick={openDev} title="이 스튜디오를 띄운 개발 서버의 저장소를 엽니다(npm run dev)">이 저장소</button>
        <button type="button" onClick={pickLocal} title="이 PC 의 폴더를 엽니다 (Chrome·Edge)">로컬 폴더</button>
        <span className="sep" />
        <button type="button" onClick={() => setNewDlg(true)} disabled={!ws || !registry.groups.length} title="화면 파일을 만들고 메뉴(registry.jsx)에 등록합니다">＋ 새 화면</button>
        <button type="button" onClick={saveActive} disabled={!active} title="저장 (Ctrl+S)">저장</button>
        <button type="button" onClick={saveAll} disabled={!dirty.size} title="모두 저장 (Ctrl+Shift+S)">모두 저장{dirty.size ? ` (${dirty.size})` : ''}</button>
        <button type="button" className={preview ? 'on' : ''} onClick={() => setPreview((v) => !v)} title="미리보기 — 저장하면 바로 바뀝니다(개발 서버)">미리보기</button>
        <a className="help" href="./docs/moca-react-api.html" target="_blank" rel="noreferrer" title="API 문서">API</a>
      </div>

      {mode === 'design' && ws && (
        <div className="design-area">
          <Suspense fallback={<div className="empty">화면 설계를 불러오는 중…</div>}>
            <Designer ws={ws} files={files} onMake={makeFromDesign} onOverwrite={overwriteFromDesign} />
          </Suspense>
        </div>
      )}
      {/* 코드 화면은 설계 중에도 그대로 둔다(숨김) — 편집기·열린 탭·고친 내용이 살아 있게 */}
      <div className="main" style={mode === 'design' && ws ? { display: 'none' } : undefined}>
        <aside className="side left" style={{ width: sizes.left }}>
          <div className="sec-title">탐색기</div>
          <input className="filter" placeholder="파일 찾기" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="scroll">
            {ws ? <Explorer files={files} active={active} dirty={dirty} onOpen={openFile} filter={filter} />
              : <div className="empty">위의 「이 저장소」(개발 서버) 또는 「로컬 폴더」로 mocareact 저장소를 엽니다</div>}
          </div>
        </aside>
        <Sash onDrag={grow('left', 160, 520)} />

        <section className="center">
          <div className="tabs">
            {tabs.map((t) => (
              <div key={t} className={'tab' + (t === active ? ' on' : '')} onClick={() => openFile(t)} title={t}>
                {t.split('/').pop()}
                <button type="button" className="x" onClick={(e) => closeTab(t, e)} aria-label="닫기">{dirty.has(t) ? '●' : '×'}</button>
              </div>
            ))}
          </div>
          <div className="crumb">{active ? active.split('/').join(' › ') : ''}{activeScreen && <span className="screen-badge">메뉴 화면 · {activeScreen.group.title} › {activeScreen.screen.title} [{activeScreen.screen.key}]</span>}</div>
          <div className="editor-wrap">
            <div ref={hostRef} className="editor" />
            {!active && (
              <div className="welcome">
                {bootErr ? <p className="err">{bootErr}</p> : !monacoReady ? <p>편집기를 불러오는 중…</p> : (
                  <>
                    <h2>MOCA React Studio</h2>
                    <p>왼쪽 탐색기에서 화면(<code>src/screens/*.jsx</code>)을 열거나 <b>＋ 새 화면</b>으로 시작합니다.</p>
                    <ul>
                      <li><code>&lt;Moca</code> 를 치면 컴포넌트, 태그 안에서는 속성·이벤트가 설명과 함께 나옵니다(고르면 import 줄도 들어갑니다)</li>
                      <li><code>ref</code> 를 붙인 컴포넌트는 <code>grid.current.</code> 에서 그 메서드만, <code>tran.</code>·<code>msgbox.</code>·<code>popup.</code> 도 됩니다</li>
                      <li>저장(Ctrl+S)하면 오른쪽 미리보기가 그 자리에서 바뀝니다(개발 서버)</li>
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {canPreview && (
          <>
            <Sash onDrag={grow('preview', 280, 1400, -1)} />
            <section className="preview" style={{ width: sizes.preview }}>
              <div className="sec-title">미리보기 {previewKey ? <span className="dim">· {previewKey}</span> : <span className="dim">· 메뉴 화면을 열면 그 화면이 뜹니다</span>}
                <span className="grow" />
                <button type="button" className="mini" onClick={() => { if (iframeRef.current) iframeRef.current.src = './?open=' + encodeURIComponent(previewKey || '') }} title="다시 싣기">⟳</button>
              </div>
              <iframe ref={iframeRef} title="미리보기" src={previewSrc} />
            </section>
          </>
        )}

        <Sash onDrag={grow('right', 200, 560, -1)} />
        <aside className="side right" style={{ width: sizes.right }}>
          <div className="rtabs">
            {[['outline', 'Outline'], ['info', '속성'], ['palette', '팔레트']].map(([k, l]) => (
              <button type="button" key={k} className={rightTab === k ? 'on' : ''} onClick={() => setRightTab(k)}>{l}</button>
            ))}
          </div>
          <div className="scroll">
            {rightTab === 'outline' && <OutlineView nodes={nodes} current={current} onPick={pickNode} />}
            {rightTab === 'info' && <InfoView node={current} />}
            {rightTab === 'palette' && (
              <ul className="palette">
                {Object.values(COMPONENTS).map((c) => (
                  <li key={c.name} onClick={() => insertComponent(c.name)} title={splitExample(c.desc).text}>
                    <span className="an">{c.name}</span><span className="pkg">{c.pkg.replace('@teammoca/', '')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <div className="statusbar">
        <span>{ws ? ws.name : '—'}</span>
        <span>컴포넌트 {Object.keys(COMPONENTS).length}</span>
        {active && <span>{langOf(active)} · {cursorLine}행</span>}
        <span className="grow" />
        {msg && <span className={'msg ' + msg.kind}>{msg.text}</span>}
      </div>

      {designReq && (
        <NewScreenDialog
          groups={registry.groups}
          fromDesign
          initialTitle={designReq.title}
          onClose={() => setDesignReq(null)}
          onCreate={async (v) => {
            const { generateScreen } = await import('./design/codegen.js')
            await createScreen({ ...v, code: generateScreen(designReq.data, { name: v.name, title: v.title }), design: designReq.data })
            designReq.onNamed(v.name)
            setDesignReq(null)
          }}
        />
      )}
      {newDlg && <NewScreenDialog groups={registry.groups} onClose={() => setNewDlg(false)} onCreate={async (v) => { await createScreen(v); setNewDlg(false) }} />}
    </div>
  )
}
