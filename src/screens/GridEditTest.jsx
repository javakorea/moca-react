import { useMemo, useRef, useState } from 'react'
import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import ComTitle from './com/ComTitle'

// 편집·엑셀 그리드 — 그리드 고급 기능 4종을 한 화면에서 직접 눌러 보는 시연 화면.
//   ① 셀 편집     : 칸을 더블클릭(폰은 두 번 톡) → 고치고 Enter. Tab 으로 옆 칸, Esc 취소.
//                   고친 행은 행상태 U 가 붙고, 원래 값으로 되돌리면 다시 떨어진다.
//   ② 셀 그리기   : 진행률 막대 · 상태 배지는 컬럼 render 로 React 가 직접 그린다.
//   ③ 다단 헤더   : 「인적사항」「급여」 묶음이 아래 칸 위로 가로 병합된다.
//      가로 병합   : 휴직자 행은 급여 세 칸이 한 칸으로 합쳐진다(colSpan).
//   ④ 엑셀        : 툴바의 엑셀 버튼 또는 위 [엑셀 내려받기] — 지금 보이는 대로(필터·정렬·병합·합계) 나간다.
// 데이터는 화면 안에서 만든다(서버 없이 시연).

const DEPTS = [
  { cd: 'D10', nm: '경영지원' }, { cd: 'D20', nm: '영업' }, { cd: 'D30', nm: '개발' },
  { cd: 'D40', nm: '디자인' }, { cd: 'D50', nm: '고객지원' },
]
const LAST = '김이박최정강조윤장임한오서신권황안송류홍'
const FIRST = ['민준', '서연', '도윤', '지우', '하준', '서윤', '시우', '하은', '주원', '지민', '예준', '수아', '건우', '채원']
const STATES = ['진행', '완료', '대기', '보류']

function makeRows(n) {
  const rows = []
  for (let i = 0; i < n; i++) {
    const leave = i % 17 === 5
    const base = 2800000 + ((i * 7919) % 30) * 100000
    rows.push({
      EMP_NO: `E${String(2026000 + i + 1)}`,
      EMP_NM: LAST[i % LAST.length] + FIRST[(i * 3) % FIRST.length],
      DEPT_CD: DEPTS[(i * 7) % DEPTS.length].cd,
      HIRE_DT: `20${String(15 + (i % 11)).padStart(2, '0')}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + ((i * 5) % 28)).padStart(2, '0')}`,
      BASE_PAY: leave ? '' : base,
      BONUS: leave ? '' : ((i * 37) % 10) * 50000,
      WORK_YN: leave ? 'N' : 'Y',
      LEAVE: leave ? 'Y' : 'N',
      PROGRESS: (i * 13) % 101,
      STATE: STATES[(i * 3) % STATES.length],
    })
    rows[i].PAY_SUM = Number(rows[i].BASE_PAY || 0) + Number(rows[i].BONUS || 0)
  }
  return rows
}

const won = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString())

function GridEditTest({ menuInfo }) {
  const gridRef = useRef(null)
  const [rows, setRows] = useState(() => makeRows(300))
  const [log, setLog] = useState([])
  const [changed, setChanged] = useState(0)

  const columns = useMemo(() => [
    {
      title: '인적사항',
      children: [
        { key: 'EMP_NO', title: '사번', width: 92, align: 'center', editable: false },
        { key: 'EMP_NM', title: '이름', width: 80, align: 'center' },
        { key: 'DEPT_CD', title: '부서', width: 90, align: 'center', editType: 'select', options: DEPTS, filterable: true },
        { key: 'HIRE_DT', title: '입사일', width: 104, align: 'center', editType: 'date' },
      ],
    },
    {
      title: '급여',
      children: [
        {
          key: 'BASE_PAY', title: '기본급', width: 110, align: 'right', editType: 'number', format: won, calc: 'sum',
          // 휴직자 — 급여 세 칸을 하나로(가로 병합) 합치고 안내 글을 그린다
          colSpan: (row) => (row.LEAVE === 'Y' ? 3 : 1),
          render: (v, row) => (row.LEAVE === 'Y' ? <span className="ge-leave">휴직 중 — 급여 없음</span> : won(v)),
          editable: (row) => row.LEAVE !== 'Y',
          excelValue: (row) => (row.LEAVE === 'Y' ? '휴직 중 — 급여 없음' : row.BASE_PAY),
        },
        { key: 'BONUS', title: '수당', width: 96, align: 'right', editType: 'number', format: won, calc: 'sum' },
        {
          key: 'PAY_SUM', title: '합계', width: 116, align: 'right', editable: false, calc: 'sum',
          // 합계 칸(PAY_SUM)은 화면이 계산해 넣는 값 — 기본급·수당을 고치면 onCellEdit 에서 같이 맞춘다
          render: (v, row) => <b>{won(Number(row.BASE_PAY || 0) + Number(row.BONUS || 0))}</b>,
        },
      ],
    },
    { key: 'WORK_YN', title: '재직', width: 56, align: 'center', editType: 'checkbox' },
    {
      key: 'PROGRESS', title: '진행률', width: 140, editType: 'number',
      // React 로 직접 그리는 칸 — 막대 + 숫자
      render: (v) => (
        <span className="ge-bar"><i style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }} /><em>{v}%</em></span>
      ),
    },
    {
      key: 'STATE', title: '상태', width: 80, align: 'center', editType: 'select',
      options: STATES.map((s) => ({ cd: s, nm: s })), filterable: true,
      render: (v) => <span className={`ge-badge ge-${v}`}>{v}</span>,
    },
  ], [])

  const onCellEdit = (row, idx, key, v, old) => {
    if (key === 'BASE_PAY' || key === 'BONUS') row.PAY_SUM = Number(row.BASE_PAY || 0) + Number(row.BONUS || 0)
    setLog((l) => [`${row.EMP_NM}(${row.EMP_NO}) · ${key}: ${old === '' ? '(빈 값)' : old} → ${v === '' ? '(빈 값)' : v}`, ...l].slice(0, 6))
    setChanged(gridRef.current?.getChangedRows().length ?? 0)
  }

  const reset = () => { setRows(makeRows(300)); setLog([]); setChanged(0) }

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:fit:auto:fit">
        <ComTitle menu={menuInfo} onRefresh={reset} />

        <div className="ge-bar-top">
          <span className="ge-hint">칸을 <b>더블클릭</b>해 고치세요 · Enter 반영 · Tab 옆 칸 · Esc 취소 · 재직은 한 번 클릭</span>
          <span className="ge-changed">고친 행 <b>{changed}</b>건</span>
          <button type="button" className="ge-btn" onClick={() => gridRef.current?.exportExcel('편집그리드_시연')}>엑셀 내려받기</button>
          <button type="button" className="ge-btn ge-btn-ghost" onClick={reset}>처음 데이터로</button>
        </div>

        <MocaReactGrid
          ref={gridRef}
          label="사원 급여 (편집 · 다단 헤더 · 엑셀)"
          columns={columns}
          data={rows}
          editable
          onCellEdit={onCellEdit}
          excel="사원급여"
          sortable
          search
        />

        <div className="ge-log">
          <b>편집 기록</b>
          {log.length === 0 ? <span className="ge-empty">아직 고친 칸이 없습니다</span>
            : log.map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </MocaReactLayout>

      <style>{`
        .ge-bar-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 8px 12px; border: 1px solid #d8dee5; border-radius: 6px; font-size: 12px; }
        .ge-hint { color: #6b7280; }
        .ge-changed { margin-left: auto; }
        .ge-changed b { color: #942ef5; }
        .ge-btn { padding: 5px 12px; border: 1px solid #0f766e; border-radius: 5px; background: #0f766e;
          color: #fff; font-size: 12px; cursor: pointer; }
        .ge-btn-ghost { background: transparent; color: inherit; border-color: #c4ccd5; }
        .ge-log { display: flex; flex-wrap: wrap; gap: 4px 14px; padding: 8px 12px; font-size: 12px;
          border: 1px dashed #d8dee5; border-radius: 6px; min-height: 18px; }
        .ge-log .ge-empty { opacity: 0.6; }
        .ge-leave { width: 100%; text-align: center; color: #b4493e; font-size: 12px; }
        .ge-bar { position: relative; display: block; width: 100%; height: 14px; border-radius: 7px;
          background: rgba(127,127,127,0.18); overflow: hidden; }
        .ge-bar i { position: absolute; left: 0; top: 0; bottom: 0; background: #0f766e; border-radius: 7px; }
        .ge-bar em { position: relative; display: block; text-align: center; font-style: normal;
          font-size: 10px; line-height: 14px; color: #fff; mix-blend-mode: difference; }
        .ge-badge { padding: 1px 8px; border-radius: 9px; font-size: 11px; color: #fff; }
        .ge-진행 { background: #2563eb; } .ge-완료 { background: #16a34a; }
        .ge-대기 { background: #94a3b8; } .ge-보류 { background: #d97706; }
        @media (max-width: 768px) { .ge-hint { display: none; } }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .ge-bar-top,
          :root:not([data-theme="light"]) .ge-log { border-color: #2a3644; }
          :root:not([data-theme="light"]) .ge-btn { background: #00b8c4; border-color: #00b8c4; color: #06131a; }
          :root:not([data-theme="light"]) .ge-bar i { background: #00b8c4; }
        }
        :root[data-theme="dark"] .ge-bar-top, :root[data-theme="dark"] .ge-log { border-color: #2a3644; }
        :root[data-theme="dark"] .ge-btn { background: #00b8c4; border-color: #00b8c4; color: #06131a; }
        :root[data-theme="dark"] .ge-bar i { background: #00b8c4; }
      `}</style>
    </div>
  )
}

export default GridEditTest
