import { useState } from 'react'
import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import { useSelect } from '@teammoca/react-tran'
import ComTitle from './com/ComTitle'

// 사용자 목록 — **실 데이터**: MOCA 서버(8080)의 selectDemoUserList 로 H2 DB 의
// TDEMO_USER 를 조회한다. 검색조건(이름·부서)은 SQL 의 <if> LIKE 절이 받는다 —
// 조건을 state 로 두고 useSelect 에 넘기면 값이 바뀔 때 자동 재조회된다.
const columns = [
  { key: 'USER_ID', title: '사용자ID', width: 110 },
  { key: 'USER_NM', title: '이름', width: 100 },
  { key: 'DEPT_NM', title: '부서', width: 110, align: 'center' },
  { key: 'POSITION_NM', title: '직위', width: 90, align: 'center' },
  { key: 'EMAIL', title: '이메일' },
  { key: 'PHONE_NO', title: '연락처', width: 130, align: 'center' },
  { key: 'USE_YN', title: '사용', width: 50, align: 'center' },
  { key: 'REG_DT', title: '등록일', width: 96, align: 'center' },
]

function UserList({ menuInfo }) {
  const [q, setQ] = useState({ USER_NM: '', DEPT_NM: '' })
  const { rows, loading, error, reload } = useSelect('selectDemoUserList', q)
  const [selected, setSelected] = useState(null)

  const onChange = (key) => (e) => setQ((c) => ({ ...c, [key]: e.target.value }))

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:fit:auto">
        <ComTitle menu={menuInfo} onRefresh={reload} />

        <div className="ul-search">
          <label>이름</label>
          <input value={q.USER_NM} onChange={onChange('USER_NM')} placeholder="이름 검색" />
          <label>부서</label>
          <input value={q.DEPT_NM} onChange={onChange('DEPT_NM')} placeholder="부서 검색" />
          <span className="ul-state">
            {loading ? '조회중…' : error ? `조회 실패: ${error.message}` : `${rows.length}명`}
            {selected && ` · 선택: ${selected.USER_NM}(${selected.DEPT_NM})`}
          </span>
        </div>

        <MocaReactGrid
          label="사용자 목록"
          columns={columns}
          data={rows}
          onRowSelected={(row) => setSelected(row)}
          search
          rowStatus={false}
          delCheck={false}
        />
      </MocaReactLayout>

      <style>{`
        .ul-search { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 9px 12px; border: 1px solid #d8dee5; border-radius: 6px; font-size: 13px; }
        .ul-search label { color: #6b7280; }
        .ul-search input { padding: 5px 8px; border: 1px solid #c4ccd5; border-radius: 5px;
          font-size: 12px; background: transparent; color: inherit; width: 130px; }
        .ul-state { margin-left: auto; font-size: 12px; opacity: 0.7; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .ul-search { border-color: #2a3644; }

  :root:not([data-theme="light"]) .ul-search input { border-color: #3a4a5c; background: #0f161d; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .ul-search { border-color: #2a3644; }

:root[data-theme="dark"] .ul-search input { border-color: #3a4a5c; background: #0f161d; }

      `}</style>
    </div>
  )
}

export default UserList
