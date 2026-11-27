import { useRef, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactGrid } from '@teammoca/react-grid'
import ComTitle from './com/ComTitle'

// 레이아웃 데모 — MOCA layout 컴포넌트의 React 판.
// 골격: vfit:auto (검색영역 + 본문 — 가장 흔한 화면 골격). 본문은 h3:7 중첩 분할.
// 버튼으로 setRatio 런타임 변경(비율/접기/방향), Alt+L 로 골격 미리보기.
const DEPTS = ['개발팀', '기획팀', '영업팀', '디자인팀', '인사팀']
const buildRows = (n, tag) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `${tag} ${i + 1}`,
    dept: DEPTS[i % DEPTS.length],
    score: 60 + ((i * 17) % 40),
  }))

const cols = [
  { key: 'id', title: '번호', width: 60, align: 'center' },
  { key: 'name', title: '이름' },
  { key: 'dept', title: '부서', width: 90, align: 'center' },
  { key: 'score', title: '점수', width: 70, align: 'right' },
]

const RATIOS = ['h3:7', 'h5:5', 'h7:3', 'h0:10', 'v5:5']

function LayoutTest({ menuInfo }) {
  const bodyRef = useRef(null) // 중첩(본문) 레이아웃 — setRatio 대상
  const [cur, setCur] = useState('h3:7')
  const [left] = useState(() => buildRows(300, '목록'))
  const [right] = useState(() => buildRows(1000, '상세'))

  const apply = (r) => {
    bodyRef.current?.setRatio(r)
    setCur(r)
  }

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:fit:auto">
        <ComTitle menu={menuInfo} />
        {/* fit 칸 — 내용 높이만큼(검색영역 자리). setRatio 데모 버튼들 */}
        <div className="lt-bar">
          <b>본문 분할</b>
          {RATIOS.map((r) => (
            <button
              key={r}
              className={`lt-btn${cur === r ? ' lt-on' : ''}`}
              onClick={() => apply(r)}
            >
              {r === 'h0:10' ? 'h0:10 (좌측 접기)' : r}
            </button>
          ))}
          <span className="lt-hint">Alt+L = 골격 미리보기 (와이어프레임)</span>
        </div>

        {/* auto 칸 — 남은 높이 전부. 안에서 다시 h3:7 중첩 분할 */}
        <MocaReactLayout layout="h3:7" ref={bodyRef}>
          <MocaReactGrid label="목록 (3)" columns={cols} data={left} rowStatus={false} delCheck={false} />
          <MocaReactGrid label="상세 (7)" columns={cols} data={right} search rowStatus={false} delCheck={false} />
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .lt-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 10px 12px; border: 1px solid #d8dee5; border-radius: 6px; font-size: 13px; }
        .lt-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 6px;
          padding: 5px 10px; cursor: pointer; font-size: 12px; color: inherit; }
        .lt-btn:hover { background: rgba(127, 127, 127, 0.12); }
        .lt-on { border-color: #1c5d99; color: #1c5d99; font-weight: 700; }
        .lt-hint { margin-left: auto; opacity: 0.6; font-size: 12px; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .lt-bar { border-color: #2a3644; }

  :root:not([data-theme="light"]) .lt-btn { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .lt-on { border-color: #7fc1ff; color: #7fc1ff; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .lt-bar { border-color: #2a3644; }

:root[data-theme="dark"] .lt-btn { border-color: #3a4a5c; }

:root[data-theme="dark"] .lt-on { border-color: #7fc1ff; color: #7fc1ff; }

      `}</style>
    </div>
  )
}

export default LayoutTest
