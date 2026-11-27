import { useMemo, useState } from 'react'
import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import { msgbox } from '@teammoca/react-msgbox'

// 품목 검색 팝업 — MOCA /ui/page/POP_ITEMSEARCH.html 대응.
//   받는다  props.data = { keyword }   ← 호출측 popup.open 의 data (MOCA getParameter())
//   돌려준다 close(선택행) → 호출측 callback/await 로 전달
//           그냥 close() → 값이 없으므로 취소(콜백 미발화)
// 골격은 업무 화면과 같이 레이아웃으로 짠다: vfit:auto:fit (검색 · 목록 · 버튼).
// 닫기 버튼은 푸터 한 곳에만 둔다(제목바 × 는 팝업 셸이 준다).
const ITEM = [
  { ITEM_CD: 'A-1001', ITEM_NM: '무선 마우스', SPEC: '2.4G / 정숙형', UNIT: 'EA', PRICE: 18900 },
  { ITEM_CD: 'A-1002', ITEM_NM: '기계식 키보드', SPEC: '적축 / 텐키리스', UNIT: 'EA', PRICE: 89000 },
  { ITEM_CD: 'A-1003', ITEM_NM: '27인치 모니터', SPEC: 'QHD / 75Hz', UNIT: 'EA', PRICE: 249000 },
  { ITEM_CD: 'B-2001', ITEM_NM: 'USB-C 허브', SPEC: '7포트 / PD', UNIT: 'EA', PRICE: 42000 },
  { ITEM_CD: 'B-2002', ITEM_NM: '노트북 거치대', SPEC: '알루미늄', UNIT: 'EA', PRICE: 32000 },
  { ITEM_CD: 'C-3001', ITEM_NM: 'A4 복사용지', SPEC: '80g / 2500매', UNIT: 'BOX', PRICE: 26500 },
  { ITEM_CD: 'C-3002', ITEM_NM: '토너 카트리지', SPEC: '검정 / 대용량', UNIT: 'EA', PRICE: 118000 },
  { ITEM_CD: 'D-4001', ITEM_NM: '회의용 화이트보드', SPEC: '1200x900', UNIT: 'EA', PRICE: 96000 },
]

const comma = (v) => (v == null ? '' : Number(v).toLocaleString())

const columns = [
  { key: 'ITEM_CD', title: '코드', width: 80 },
  { key: 'ITEM_NM', title: '품목명', width: 150 },
  { key: 'SPEC', title: '규격' },
  { key: 'UNIT', title: '단위', width: 50, align: 'center' },
  { key: 'PRICE', title: '단가', width: 90, align: 'right', format: comma },
]

function PopItemSearch({ data, close }) {
  const [kw, setKw] = useState(data?.keyword ?? '')
  const [sel, setSel] = useState(null)

  const rows = useMemo(() => {
    const q = kw.trim()
    if (!q) return ITEM
    const up = q.toUpperCase()
    return ITEM.filter((r) => r.ITEM_NM.includes(q) || r.ITEM_CD.includes(up))
  }, [kw])

  const pick = () => {
    if (!sel) { msgbox.alert('품목을 선택하세요.'); return }
    close(sel) // 선택행을 그대로 돌려준다 — 반영은 호출측 몫
  }

  return (
    // minHeight 가 목록 팝업의 핵심 — 호출측이 height 를 안 주면 팝업은 "내용 높이"로 잡히고
    // 그러면 레이아웃의 auto(남는 공간) pane 이 0 이 되어 그리드가 안 보인다.
    // 최소 높이를 화면이 스스로 들고 있으면 height 없이 열어도 목록이 나오고,
    // 호출측이 height 를 주면 height:100% 로 그 크기를 채운다.
    <div style={{ height: '100%', minHeight: 400, padding: 10, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto:fit" gap={8}>
        <div className="pis-search">
          <label>품목명/코드</label>
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="검색어" autoFocus />
        </div>

        <MocaReactGrid
          columns={columns}
          data={rows}
          onRowSelected={(row) => setSel(row)}
          rowStatus={false}
          delCheck={false}
        />

        <div className="pis-btns">
          <button className="pis-btn pis-primary" onClick={pick}>선택</button>
          <button className="pis-btn" onClick={() => close()}>닫기</button>
        </div>
      </MocaReactLayout>

      <style>{`
        .pis-search { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
        .pis-search label { color: #5a6b7c; }
        .pis-search input { flex: 1; min-width: 0; padding: 5px 8px; border: 1px solid #c4ccd5;
          border-radius: 5px; font-size: 12px; background: transparent; color: inherit; }
        .pis-btns { display: flex; justify-content: flex-end; gap: 6px; }
        .pis-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 5px 14px; font-size: 12.5px; color: inherit; cursor: pointer; }
        .pis-btn:hover { background: rgba(127,127,127,0.12); }
        .pis-primary { background: #0f766e; border-color: #0f766e; color: #fff; font-weight: 700; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .pis-search label { color: #93a5b6; }

  :root:not([data-theme="light"]) .pis-search input,
:root:not([data-theme="light"]) .pis-btn { border-color: #3a4a5c; }


  :root:not([data-theme="light"]) .pis-primary { background: #14b8a6; border-color: #14b8a6; color: #06131a; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .pis-search label { color: #93a5b6; }

:root[data-theme="dark"] .pis-search input,
:root[data-theme="dark"] .pis-btn { border-color: #3a4a5c; }


:root[data-theme="dark"] .pis-primary { background: #14b8a6; border-color: #14b8a6; color: #06131a; }

      `}</style>
    </div>
  )
}

export default PopItemSearch
