import { useState } from 'react'
import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import { useSelect } from '@teammoca/react-tran'
import { msgbox } from '@teammoca/react-msgbox'

// 사용자 검색 팝업 — **실 데이터** 판(MOCA 데모의 품목검색은 상수 배열이었다).
// 팝업 안에서도 화면과 똑같이 useSelect 로 서버를 조회한다(selectDemoUserList).
// 호출측이 넘긴 data.DEPT_NM 을 초기 검색조건으로 쓴다 — MOCA getParameter() 대응.
const columns = [
  { key: 'USER_ID', title: '사용자ID', width: 100 },
  { key: 'USER_NM', title: '이름', width: 90 },
  { key: 'DEPT_NM', title: '부서', width: 100, align: 'center' },
  { key: 'POSITION_NM', title: '직위', width: 80, align: 'center' },
  { key: 'EMAIL', title: '이메일' },
]

function PopUserSearch({ data, close }) {
  const [q, setQ] = useState({ USER_NM: '', DEPT_NM: data?.DEPT_NM ?? '' })
  const { rows, loading, error } = useSelect('selectDemoUserList', q)
  const [sel, setSel] = useState(null)

  const pick = (row) => {
    const target = row ?? sel
    if (!target) { msgbox.alert('사용자를 선택하세요.'); return }
    close(target)
  }

  return (
    // 목록 팝업은 최소 높이를 스스로 들고 있는다 — 이유는 PopItemSearch 주석 참고
    <div style={{ height: '100%', minHeight: 420, padding: 10, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto:fit" gap={8}>
        <div className="pus-search">
          {/* 조회 버튼이 없다(입력하면 바로 조회) — 그러니 입력칸이 **남는 폭을 나눠 갖고**,
              조건과 조건 사이는 넉넉히 벌린다. 라벨-입력은 붙이고 필드-필드를 띄워야
              "어디까지가 한 조건인지"가 보인다 */}
          <label className="pus-f">
            <span>이름</span>
            <input value={q.USER_NM} onChange={(e) => setQ((c) => ({ ...c, USER_NM: e.target.value }))} autoFocus />
          </label>
          <label className="pus-f">
            <span>부서</span>
            <input value={q.DEPT_NM} onChange={(e) => setQ((c) => ({ ...c, DEPT_NM: e.target.value }))} />
          </label>
          {/* 건수는 **그리드 푸터**가 표준 자리다(우측 정렬 "총 N건") — 여기서는 상태만 알린다 */}
          {(loading || error) && (
            <span className="pus-cnt">{loading ? '조회중…' : '조회 실패'}</span>
          )}
        </div>

        <MocaReactGrid
          columns={columns}
          data={rows}
          onRowSelected={(row) => setSel(row)}
          search
          rowStatus={false}
          delCheck={false}
        />

        <div className="pus-btns">
          <span className="pus-hint">행을 고르고 [선택] — 더블클릭 대신 버튼으로</span>
          <button className="pus-btn pus-primary" onClick={() => pick()}>선택</button>
          <button className="pus-btn" onClick={() => close()}>닫기</button>
        </div>
      </MocaReactLayout>

      <style>{`
        .pus-search { display: flex; align-items: center; gap: 8px 18px; font-size: 12.5px; flex-wrap: wrap; }
        .pus-f { display: flex; align-items: center; gap: 7px; flex: 1 1 150px; min-width: 0; }
        .pus-f > span { color: #5a6b7c; white-space: nowrap; }
        .pus-search input { flex: 1; min-width: 0; padding: 7px 9px; border: 1px solid #c4ccd5;
          border-radius: 5px; font-size: 13px; background: transparent; color: inherit; }
        .pus-cnt { flex: 0 0 auto; color: #1c5d99; font-size: 12px; font-weight: 700; }
        .pus-btns { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
        .pus-hint { margin-right: auto; color: #8a8fa0; font-size: 11.5px; }
        .pus-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 5px 14px; font-size: 12.5px; color: inherit; cursor: pointer; }
        .pus-btn:hover { background: rgba(127,127,127,0.12); }
        .pus-primary { background: #0f766e; border-color: #0f766e; color: #fff; font-weight: 700; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .pus-search label { color: #93a5b6; }

  :root:not([data-theme="light"]) .pus-search input,
:root:not([data-theme="light"]) .pus-btn { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .pus-cnt { color: #7fc1ff; }

  :root:not([data-theme="light"]) .pus-primary { background: #14b8a6; border-color: #14b8a6; color: #06131a; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .pus-search label { color: #93a5b6; }

:root[data-theme="dark"] .pus-search input,
:root[data-theme="dark"] .pus-btn { border-color: #3a4a5c; }

:root[data-theme="dark"] .pus-cnt { color: #7fc1ff; }

:root[data-theme="dark"] .pus-primary { background: #14b8a6; border-color: #14b8a6; color: #06131a; }

      `}</style>
    </div>
  )
}

export default PopUserSearch
