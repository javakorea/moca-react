import { useState } from 'react'
import { TEMPLATES } from './registry.js'

/* 새 화면 — 파일(src/screens/이름.jsx)을 템플릿으로 만들고 registry.jsx 에 lazy 한 줄 + 메뉴 한 줄을 넣는다 */
export default function NewScreenDialog({ groups, onClose, onCreate, fromDesign, initialTitle }) {
  const [v, setV] = useState({ name: '', key: '', title: initialTitle || '', icon: '📄', group: groups[1]?.key || groups[0]?.key || '', template: fromDesign ? 'design' : 'blank', queryId: '' })
  const [keyTouched, setKeyTouched] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => {
    const val = e.target.value
    setV((o) => {
      const n = { ...o, [k]: val }
      if (k === 'name' && !keyTouched) n.key = val.toLowerCase()
      return n
    })
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!/^[A-Z][A-Za-z0-9]*$/.test(v.name)) return setErr('컴포넌트 이름은 영문 대문자로 시작합니다 (예: SaleList)')
    if (!/^[a-z][a-z0-9_-]*$/.test(v.key)) return setErr('화면 key 는 영문 소문자로 씁니다 (예: salelist)')
    if (!v.title.trim()) return setErr('메뉴 이름을 적어 주세요')
    setBusy(true); setErr('')
    try { await onCreate({ ...v, title: v.title.trim() }) } catch (x) { setErr(x.message); setBusy(false) }
  }
  const tpl = TEMPLATES.find((t) => t.id === v.template)
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="dlg" onSubmit={submit}>
        <h3>새 화면</h3>
        <label>메뉴 이름<input autoFocus value={v.title} onChange={set('title')} placeholder="예: 판매 목록" /></label>
        <label>컴포넌트 이름(파일명)<input value={v.name} onChange={set('name')} placeholder="예: SaleList" /></label>
        <div className="row2">
          <label>화면 key<input value={v.key} onChange={(e) => { setKeyTouched(true); set('key')(e) }} placeholder="예: salelist" /></label>
          <label>아이콘<input value={v.icon} onChange={set('icon')} style={{ width: 60 }} /></label>
        </div>
        <label>메뉴 그룹
          <select value={v.group} onChange={set('group')}>
            {groups.map((g) => <option key={g.key} value={g.key}>{g.icon} {g.title}</option>)}
          </select>
        </label>
        {fromDesign ? <div className="dim small">화면 설계로 만든 코드가 들어갑니다 — 설계는 studio/designs/{v.name || '이름'}.json 에 함께 남습니다</div> : (
        <label>템플릿
          <select value={v.template} onChange={set('template')}>
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <span className="hint">{tpl?.desc}</span>
        </label>
        )}
        {v.template === 'list' && <label>조회 queryId<input value={v.queryId} onChange={set('queryId')} placeholder="예: selectDemoUserList" /></label>}
        <div className="dim small">만들 파일: src/screens/{v.name || '이름'}.jsx · 등록: registry.jsx</div>
        {err && <div className="err">{err}</div>}
        <div className="btns">
          <button type="button" onClick={onClose}>취소</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? '만드는 중…' : '만들기'}</button>
        </div>
      </form>
    </div>
  )
}
