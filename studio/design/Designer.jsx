import { useEffect, useMemo, useState } from 'react'
import { Puck } from '@puckeditor/core'
import '@puckeditor/core/no-external.css' // 바깥 글꼴(rsms.me)을 부르지 않는 판 — 폐쇄망에서도 그대로 뜬다
import { config } from './config.jsx'
import { generateScreen } from './codegen.js'
import './design.css'

/*
 * 화면 설계 — Puck(MIT) 캔버스에 블록을 끌어 놓아 화면 골격을 그리고, 표준 골격의 .jsx 로 만든다.
 * 설계 데이터는 studio/designs/<이름>.json 에 남겨 다시 열 수 있다(코드 → 설계로 되돌리지는 않는다:
 * 손으로 고친 코드를 설계가 읽어 낼 방법이 없어서, 다시 만들면 코드를 덮는다고 묻는다).
 */
const DRAFT = 'moca-react-studio.designDraft'
const EMPTY = {
  root: { props: { title: '새 화면' } },
  content: [
    { type: 'Title', props: { id: 'Title-1' } },
    { type: 'SearchBox', props: { id: 'SearchBox-1', items: [{ label: '이름', key: 'USER_NM', kind: 'text', codes: '' }] } },
    { type: 'Grid', props: { id: 'Grid-1', label: '목록', queryId: '', search: true, sortable: false, rowStatus: false, columns: [{ key: 'ID', title: 'ID', width: 90, align: 'center' }, { key: 'NAME', title: '이름', width: null, align: 'left' }] } },
  ],
}
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT)) || EMPTY } catch { return EMPTY } }

export default function Designer({ ws, files, onMake, onOverwrite }) {
  const [data, setData] = useState(loadDraft)
  const [name, setName] = useState(null) // 열어 둔 설계 파일 이름(새 설계면 null)
  const [ver, setVer] = useState(0)       // 다른 설계를 열면 Puck 을 새로 그린다
  const [showCode, setShowCode] = useState(false)

  useEffect(() => { try { localStorage.setItem(DRAFT, JSON.stringify(data)) } catch { /* 넘침 — 초안만 못 남긴다 */ } }, [data])

  const designs = useMemo(() => files.filter((f) => /^studio\/designs\/[\w$]+\.json$/.test(f)).map((f) => f.slice(15, -5)), [files])
  const title = data?.root?.props?.title || '새 화면'
  const code = useMemo(() => (showCode ? generateScreen(data, { name: name || 'NewScreen', title }) : ''), [showCode, data, name, title])

  const openDesign = async (n) => {
    if (!n) { setData(EMPTY); setName(null); setVer((x) => x + 1); return }
    try {
      const d = JSON.parse(await ws.read(`studio/designs/${n}.json`))
      setData(d); setName(n); setVer((x) => x + 1)
    } catch (e) { window.alert('설계를 열지 못했습니다: ' + e.message) }
  }

  const actions = (
    <>
      <select className="dz-pick" value={name || ''} onChange={(e) => openDesign(e.target.value)} title="저장된 설계 열기">
        <option value="">＋ 새 설계</option>
        {designs.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button type="button" className="dz-act" onClick={() => setShowCode(true)}>코드 보기</button>
      {name
        ? <button type="button" className="dz-act primary" onClick={() => onOverwrite(name, data, generateScreen(data, { name, title }))}>{name}.jsx 다시 만들기</button>
        : <button type="button" className="dz-act primary" onClick={() => onMake(data, (n) => { setName(n) }, title)}>화면으로 만들기</button>}
    </>
  )

  return (
    <div className="designer">
      <Puck
        key={ver}
        config={config}
        data={data}
        onChange={setData}
        headerTitle={`화면 설계 — ${title}${name ? ` (${name})` : ''}`}
        overrides={{ headerActions: () => actions }}
        height="100%"
      />
      {showCode && (
        <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCode(false) }}>
          <div className="dlg code-dlg">
            <h3>만들어질 코드 <span className="dim small">— src/screens/{name || 'NewScreen'}.jsx</span></h3>
            <pre className="code">{code}</pre>
            <div className="btns">
              <button type="button" onClick={() => navigator.clipboard?.writeText(code)}>복사</button>
              <button type="button" className="primary" onClick={() => setShowCode(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
