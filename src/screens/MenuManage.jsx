import { useEffect, useState } from 'react'
import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import { tran, useSelect } from '@teammoca/react-tran'
import { msgbox } from '@teammoca/react-msgbox'
import ComTitle from './com/ComTitle'

/* 메뉴관리 — MOCA TPL019(메뉴관리 데모) 이식. **같은 서비스**를 그대로 쓴다:
 *   조회 selectDemoMenuDemoList · 콤보 selectDemoMenuDemoParentCombo
 *   저장 insertDemoMenuDemo / updateDemoMenuDemo · 삭제 deleteDemoMenuDemo
 * 대상 테이블은 연습용 사본(TDEMO_MENU_DEMO)이라 마음껏 등록/수정/삭제해도
 * MOCA 의 실제 좌측 메뉴(TDEMO_MENU)에는 영향이 없다.
 *
 * MOCA 와 다른 점 하나 — MOCA 는 그리드에 신규행을 addRow 하고 폼이 refgrid 로 그 행을
 * 실시간 반영한 뒤 getModifiedJSON() 으로 모아 보낸다. React 판 그리드는 명령형 API 를
 * 두지 않았으므로(데이터는 화면 state 가 소유) **폼 한 건을 그대로 저장**한다.
 * 보내는 모양(_system.status C/U/D)과 queryId 는 MOCA 와 같다. */

const columns = [
  // 트리 컬럼 — DEPTH(1:최상위 2:하위)로 계층을 만든다. TreeGrid 화면과 같은 규약
  { key: 'TREE', title: '메뉴', cellType: 'tree', levelKey: 'DEPTH', labelKey: 'MENU_NM', treeKey: 'MENU_ID', width: 220 },
  { key: 'MENU_ID', title: '메뉴ID', width: 90, align: 'center' },
  { key: 'PARENT_NM', title: '상위메뉴', width: 110 },
  { key: 'SORT_ORDER', title: '정렬', width: 56, align: 'center' },
  { key: 'MENU_URL', title: '화면URL' },
  { key: 'DEFAULT_OPEN', title: '기본열기', width: 68, align: 'center' },
  { key: 'USE_YN', title: '사용', width: 50, align: 'center' },
  { key: 'REG_DT', title: '등록일', width: 96, align: 'center' },
]

const EMPTY = { MENU_ID: '', MENU_NM: '', PARENT_ID: '', MENU_URL: '', SORT_ORDER: '0', DEFAULT_OPEN: 'N', USE_YN: 'Y' }

function MenuManage({ menuInfo }) {
  const [q, setQ] = useState({ PARENT_ID: '', MENU_NM: '', USE_YN: '' })
  const { rows, loading, error, reload } = useSelect('selectDemoMenuDemoList', q)
  const { rows: parents, reload: reloadParents } = useSelect('selectDemoMenuDemoParentCombo')

  const [sel, setSel] = useState(null)   // 그리드에서 고른 행(원본)
  const [form, setForm] = useState(EMPTY)
  const [mode, setMode] = useState('R')  // R 상세 · U 수정 · C 신규 (MOCA form status 와 같은 값)

  // 조회하면 편집을 접는다 — MOCA fn_search 가 폼을 reset + setStatus('R') 하는 것과 같다
  useEffect(() => { setSel(null); setForm(EMPTY); setMode('R') }, [rows])

  const pick = (row) => {
    if (mode !== 'R') return // 편집 중에는 다른 행으로 갈아타지 않는다(저장/취소가 먼저)
    setSel(row)
    setForm({ ...EMPTY, ...row })
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const ro = mode === 'R'

  /* [신규] — 고른 노드를 기준으로 상위메뉴를 정한다(MOCA fn_new 와 같은 규칙).
     2뎁스 고정이라 최상위 노드를 고른 때만 "하위/같은 레벨" 을 묻는다. */
  const onNew = async () => {
    let parentId = ''
    if (sel?.MENU_ID) {
      if (sel.PARENT_ID) parentId = sel.PARENT_ID // 이미 2뎁스 → 같은 레벨로만
      else {
        const where = await msgbox.confirm(`선택한 [${sel.MENU_NM}] 을(를) 기준으로\n새 메뉴를 어디에 추가할까요?`, {
          radios: [
            { value: 'child', label: '하위 메뉴로 추가', desc: '선택한 메뉴의 아래 단계(자식)로 생성됩니다.', checked: true },
            { value: 'sibling', label: '같은 레벨로 추가', desc: '선택한 메뉴와 동일한 최상위 레벨로 생성됩니다.' },
          ],
        })
        if (!where) return // 취소
        parentId = where === 'child' ? sel.MENU_ID : ''
      }
    }
    setForm({ ...EMPTY, PARENT_ID: parentId })
    setMode('C')
  }

  const onEdit = () => {
    if (!sel?.MENU_ID) return msgbox.alert('수정할 메뉴를 선택하세요.')
    setMode('U') // MENU_ID(사용자 입력 PK)는 수정 불가 — 아래 readOnly 가 mode 로 판단한다
  }

  const onCancel = () => {
    setForm(sel ? { ...EMPTY, ...sel } : EMPTY)
    setMode('R')
  }

  const onSave = async () => {
    if (!form.MENU_ID.trim()) return msgbox.requiredFail('메뉴ID')
    if (!form.MENU_NM.trim()) return msgbox.requiredFail('메뉴명')
    if (!(await msgbox.confirm('저장하시겠습니까?'))) return

    // DEPTH 는 클라이언트 계산(상위메뉴 있으면 2, 없으면 1) — MOCA fn_save 와 같다
    const row = { ...form, DEPTH: form.PARENT_ID ? 2 : 1, _system: { status: mode === 'C' ? 'C' : 'U' } }
    try {
      msgbox.showProgress('저장 중…')
      await tran.save({ insertQueryId: 'insertDemoMenuDemo', updateQueryId: 'updateDemoMenuDemo', list: [row] })
      msgbox.hideProgress()
      await msgbox.alert('저장되었습니다.')
      reloadParents()
      reload()
    } catch (e) {
      msgbox.hideProgress()
      msgbox.error(`저장 실패: ${e.message}`)
    }
  }

  const onDelete = async () => {
    if (!sel?.MENU_ID) return msgbox.alert('삭제할 메뉴를 선택하세요.')
    const ok = await msgbox.confirm(`${sel.MENU_ID} 메뉴를 삭제하시겠습니까?\n하위 메뉴가 있으면 삭제되지 않습니다.`)
    if (!ok) return
    try {
      msgbox.showProgress('삭제 중…')
      await tran.save({ deleteQueryId: 'deleteDemoMenuDemo', list: [{ _system: { status: 'D' }, MENU_ID: sel.MENU_ID }] })
      msgbox.hideProgress()
      await msgbox.alert('삭제되었습니다.')
      reloadParents()
      reload()
    } catch (e) {
      msgbox.hideProgress()
      msgbox.error(`삭제 실패: ${e.message}`)
    }
  }

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:fit:auto">
        <ComTitle menu={menuInfo} onRefresh={reload} />

        <div className="mm-search">
          <label className="mm-f">
            <span>상위메뉴</span>
            <select value={q.PARENT_ID} onChange={(e) => setQ((c) => ({ ...c, PARENT_ID: e.target.value }))}>
              <option value="">전체</option>
              {parents.map((p) => <option key={p.MENU_ID} value={p.MENU_ID}>{p.MENU_NM}</option>)}
            </select>
          </label>
          <label className="mm-f">
            <span>메뉴명</span>
            <input value={q.MENU_NM} onChange={(e) => setQ((c) => ({ ...c, MENU_NM: e.target.value }))} placeholder="메뉴명 검색" />
          </label>
          <label className="mm-f">
            <span>사용여부</span>
            <select value={q.USE_YN} onChange={(e) => setQ((c) => ({ ...c, USE_YN: e.target.value }))}>
              <option value="">전체</option>
              <option value="Y">사용</option>
              <option value="N">미사용</option>
            </select>
          </label>
          {(loading || error) && (
            <span className="mm-state">{loading ? '조회중…' : `조회 실패: ${error.message}`}</span>
          )}
        </div>

        <MocaReactLayout layout="h5:5" gap={10} mobileHeights={[360, null]}>
          <MocaReactGrid
            label="메뉴 목록"
            columns={columns}
            data={rows}
            onRowSelected={pick}
            search
            rowStatus={false}
            delCheck={false}
          />

          <div className="mm-detail mrl-fill">
            <div className="mm-detail-head">
              <b>{mode === 'C' ? '신규 등록' : mode === 'U' ? '수정' : '상세'}</b>
              <div className="mm-btns">
                {ro && <button className="mm-btn" onClick={onNew}>신규</button>}
                {ro && <button className="mm-btn" onClick={onEdit}>수정</button>}
                {!ro && <button className="mm-btn mm-primary" onClick={onSave}>저장</button>}
                {!ro && <button className="mm-btn" onClick={onCancel}>취소</button>}
                {ro && <button className="mm-btn" onClick={onDelete}>삭제</button>}
              </div>
            </div>

            <div className="mm-form">
              <label className="mm-row">
                <span>메뉴ID</span>
                {/* 사용자 입력 PK — 신규에서만 편집한다(MOCA fn_edit 이 다시 잠그는 것과 같은 규칙) */}
                <input value={form.MENU_ID} onChange={set('MENU_ID')} readOnly={mode !== 'C'} maxLength={30} />
              </label>
              <label className="mm-row">
                <span>상위메뉴</span>
                <select value={form.PARENT_ID} onChange={set('PARENT_ID')} disabled={ro}>
                  <option value="">(없음-최상위)</option>
                  {parents.filter((p) => p.MENU_ID !== form.MENU_ID).map((p) => (
                    <option key={p.MENU_ID} value={p.MENU_ID}>{p.MENU_NM}</option>
                  ))}
                </select>
              </label>
              <label className="mm-row">
                <span>메뉴명</span>
                <input value={form.MENU_NM} onChange={set('MENU_NM')} readOnly={ro} maxLength={50} />
              </label>
              <label className="mm-row">
                <span>정렬순서</span>
                <input value={form.SORT_ORDER} readOnly={ro} inputMode="numeric"
                  onChange={(e) => setForm((f) => ({ ...f, SORT_ORDER: e.target.value.replace(/\D/g, '') }))} />
              </label>
              <label className="mm-row">
                <span>기본열기</span>
                <select value={form.DEFAULT_OPEN} onChange={set('DEFAULT_OPEN')} disabled={ro}>
                  <option value="N">N</option>
                  <option value="Y">Y</option>
                </select>
              </label>
              <label className="mm-row">
                <span>사용여부</span>
                <select value={form.USE_YN} onChange={set('USE_YN')} disabled={ro}>
                  <option value="Y">사용</option>
                  <option value="N">미사용</option>
                </select>
              </label>
              <label className="mm-row mm-row-wide">
                <span>화면URL</span>
                <input value={form.MENU_URL} onChange={set('MENU_URL')} readOnly={ro} placeholder="/system/demo/ui/page/TPL019.html" />
              </label>
            </div>
          </div>
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .mm-search { display: flex; align-items: center; gap: 8px 18px; flex-wrap: wrap;
          padding: 9px 12px; border: 1px solid #d8dee5; border-radius: 6px; font-size: 13px; }
        .mm-f { display: flex; align-items: center; gap: 7px; flex: 1 1 170px; min-width: 0; }
        .mm-f > span { color: #6b7280; white-space: nowrap; }
        .mm-search input, .mm-search select { flex: 1; min-width: 0; padding: 7px 9px;
          border: 1px solid #c4ccd5; border-radius: 5px; font-size: 13px; background: transparent; color: inherit; }
        .mm-state { color: #8a8fa0; font-size: 12px; }

        .mm-detail { display: flex; flex-direction: column; min-height: 0;
          border: 1px solid #d8dee5; border-radius: 6px; overflow: hidden; }
        .mm-detail-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: #f4f6f8; border-bottom: 1px solid #d8dee5; font-size: 13px; }
        .mm-btns { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
        .mm-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 6px 14px; font-size: 12.5px; color: inherit; cursor: pointer; }
        .mm-btn:hover { background: rgba(127,127,127,0.12); }
        .mm-primary { border-color: #0f766e; background: #0f766e; color: #fff; font-weight: 700; }
        .mm-primary:hover { filter: brightness(1.12); }

        .mm-form { display: flex; flex-wrap: wrap; gap: 10px 16px; padding: 12px; overflow: auto; }
        .mm-row { display: flex; align-items: center; gap: 8px; flex: 1 1 240px; min-width: 0; font-size: 13px; }
        .mm-row-wide { flex: 1 1 100%; }
        .mm-row > span { width: 66px; flex: none; color: #6b7280; }
        .mm-row input, .mm-row select { flex: 1; min-width: 0; padding: 7px 9px;
          border: 1px solid #c4ccd5; border-radius: 5px; font-size: 13px; background: transparent; color: inherit; }
        .mm-row input[readonly], .mm-row select:disabled { background: rgba(127,127,127,0.08); color: inherit; opacity: 1; }
      `}</style>
      <style>{`
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .mm-search,
          :root:not([data-theme="light"]) .mm-detail { border-color: #2b3a4a; }
          :root:not([data-theme="light"]) .mm-detail-head { background: #16202b; border-bottom-color: #2b3a4a; }
          :root:not([data-theme="light"]) .mm-search input,
          :root:not([data-theme="light"]) .mm-search select,
          :root:not([data-theme="light"]) .mm-row input,
          :root:not([data-theme="light"]) .mm-row select,
          :root:not([data-theme="light"]) .mm-btn { border-color: #3a4a5a; }
          :root:not([data-theme="light"]) .mm-f > span,
          :root:not([data-theme="light"]) .mm-row > span { color: #9fb0c0; }
          :root:not([data-theme="light"]) .mm-primary { border-color: #14b8a6; background: #14b8a6; color: #06131a; }
        }
        :root[data-theme="dark"] .mm-search,
        :root[data-theme="dark"] .mm-detail { border-color: #2b3a4a; }
        :root[data-theme="dark"] .mm-detail-head { background: #16202b; border-bottom-color: #2b3a4a; }
        :root[data-theme="dark"] .mm-search input,
        :root[data-theme="dark"] .mm-search select,
        :root[data-theme="dark"] .mm-row input,
        :root[data-theme="dark"] .mm-row select,
        :root[data-theme="dark"] .mm-btn { border-color: #3a4a5a; }
        :root[data-theme="dark"] .mm-f > span,
        :root[data-theme="dark"] .mm-row > span { color: #9fb0c0; }
        :root[data-theme="dark"] .mm-primary { border-color: #14b8a6; background: #14b8a6; color: #06131a; }
      `}</style>
    </div>
  )
}

export default MenuManage
