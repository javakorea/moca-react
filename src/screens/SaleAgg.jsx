import { useState } from 'react'
import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import { useSelect } from '@teammoca/react-tran'
import ComTitle from './com/ComTitle'

// 판매실적 (소계/합계) — MOCA TPL018 의 React 판. **실 데이터**:
// MOCA 서버(8080)의 공용 쿼리 API 로 H2 DB 의 TDEMO_SALE_DTL 을 조회한다.
//   selectTdemoSaleDtlList          : 판매실적 상세 (ORDER BY REGION_NM, CATEGORY_NM, PROD_NM
//                                     — 소계 그룹 경계가 정렬로 보장된다)
//   selectTdemoSaleDtlRegionCombo   : 지역 콤보 (cd/nm)
//   selectTdemoSaleDtlCategoryCombo : 상품분류 콤보
// SQL 은 서버 매퍼(MocaMapper.xml)에 있고 화면은 queryId 만 안다 — MOCA 와 동일한 계약.

const comma = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString())

// 좌: 전 컬럼 sum (TPL018 grd_saleDtl) — 지역 merge + 소계 + 합계 아래 고정
const sumCols = [
  { key: 'REGION_NM', title: '지역', width: 90, align: 'center', merge: true },
  { key: 'CATEGORY_NM', title: '상품분류', width: 90, align: 'center' },
  { key: 'PROD_NM', title: '상품명' },
  { key: 'SALE_DT', title: '판매일', width: 96, align: 'center' },
  { key: 'SALE_QTY', title: '수량', width: 60, align: 'right', format: comma, calc: 'sum' },
  { key: 'UNIT_PRICE', title: '단가', width: 90, align: 'right', format: comma, calc: 'sum' },
  { key: 'SALE_AMT', title: '판매금액', width: 110, align: 'right', format: comma, calc: 'sum' },
]

// 우: avg/min/max (TPL018 grd_saleDtl2) — 합계 위 고정 + 소계 라벨 교체
const statCols = sumCols.map((c) => {
  if (c.key === 'SALE_QTY') return { ...c, calc: 'avg' }
  if (c.key === 'UNIT_PRICE') return { ...c, calc: 'min' }
  if (c.key === 'SALE_AMT') return { ...c, calc: 'max' }
  return c
})

function SaleAgg({ menuInfo }) {
  const [cond, setCond] = useState({ REGION_NM: '', CATEGORY_NM: '' })

  // 콤보 2종 — 조건 없이 1회 조회 (MOCA $p.code() 선언형 콤보 세팅 대응)
  const { rows: regions } = useSelect('selectTdemoSaleDtlRegionCombo')
  const { rows: categories } = useSelect('selectTdemoSaleDtlCategoryCombo')

  // 본 조회 — cond 가 바뀌면 자동 재조회(MOCA 는 fn_search 를 콤보 onchange 에 걸었다)
  const { rows, loading, error, reload } = useSelect('selectTdemoSaleDtlList', cond)

  const onChange = (key) => (e) => setCond((c) => ({ ...c, [key]: e.target.value }))

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:fit:auto">
        <ComTitle menu={menuInfo} onRefresh={reload} />

        {/* 조회영역 — fit 칸(내용 높이) */}
        <div className="sa-search">
          <label>지역</label>
          <select value={cond.REGION_NM} onChange={onChange('REGION_NM')}>
            <option value="">전체</option>
            {regions.map((r) => (
              <option key={r.cd} value={r.cd}>{r.nm}</option>
            ))}
          </select>
          <label>상품분류</label>
          <select value={cond.CATEGORY_NM} onChange={onChange('CATEGORY_NM')}>
            <option value="">전체</option>
            {categories.map((r) => (
              <option key={r.cd} value={r.cd}>{r.nm}</option>
            ))}
          </select>
          <span className="sa-state">
            {loading ? '조회중…' : error ? `조회 실패: ${error.message}` : `${rows.length}건`}
          </span>
        </div>

        <MocaReactLayout layout="h5:5">
          <MocaReactGrid
            label="판매실적 (합계 아래)"
            columns={sumCols}
            data={rows}
            subtotal="REGION_NM"
            rowStatus={false}
            delCheck={false}
          />
          <MocaReactGrid
            label='판매실적 total="top" (합계 위)'
            columns={statCols}
            data={rows}
            subtotal="REGION_NM"
            total="top"
            subtotalLabel="평균/최저/최대"
            rowStatus={false}
            delCheck={false}
          />
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .sa-search { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 9px 12px; border: 1px solid #d8dee5; border-radius: 6px; font-size: 13px; }
        .sa-search label { color: #6b7280; }
        .sa-search select { padding: 5px 8px; border: 1px solid #c4ccd5; border-radius: 5px;
          font-size: 12px; background: transparent; color: inherit; }
        .sa-state { margin-left: auto; font-size: 12px; opacity: 0.7; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .sa-search { border-color: #2a3644; }

  :root:not([data-theme="light"]) .sa-search select { border-color: #3a4a5c; background: #0f161d; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .sa-search { border-color: #2a3644; }

:root[data-theme="dark"] .sa-search select { border-color: #3a4a5c; background: #0f161d; }

      `}</style>
    </div>
  )
}

export default SaleAgg
