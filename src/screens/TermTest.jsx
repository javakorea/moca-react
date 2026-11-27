import { useRef, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactMultiCalendar, mdate } from '@teammoca/react-input-calendar'
import ComTitle from './com/ComTitle'

// 표 한 줄 — 컴포넌트 정의는 화면 함수 "밖"에 (안에 두면 리렌더마다 재마운트되어 값이 초기화된다)
const Row = ({ th, children, hint }) => (
  <div className="tt-row">
    <div className="tt-th">{th}</div>
    <div className="tt-td">
      {children}
      {hint && <span className="tt-hint">{hint}</span>}
    </div>
  </div>
)

// 기간 선택(inputMultiCalendar) 데모 — MOCA TPL043 의 React 판.
// 한 컴포넌트가 from/to 두 칸을 관리하고, 팝업은 좌(시작)·우(종료) 두 판 + 빠른선택 버튼이다.
// dateType 은 단일 달력과 같은 계약이고, 기간이라서 더해지는 것은 빠른선택·최대기간·순서 보정.
function TermTest({ menuInfo }) {
  const [log, setLog] = useState('기본값 "당월"로 시작합니다 — 달력 아이콘을 눌러 빠른선택도 확인해 보세요.')
  const [locked, setLocked] = useState(false)

  const basic = useRef(null)
  const quick = useRef(null)
  const max31 = useRef(null)
  const ym = useRef(null)
  const year = useRef(null)
  const dt = useRef(null)
  const rDay = useRef(null)
  const rMonth = useRef(null)
  const rYear = useRef(null)

  const now = new Date()
  const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  const say = (msg) => setLog(`[${stamp}] ${msg}`)
  const t = (r) => { const v = r.current?.getTerm() ?? {}; return `${v.from || ''}~${v.to || ''}` }

  const readAll = () => say(`기본 ${t(basic)} / 빠른선택 ${t(quick)} / 최대31일 ${t(max31)}`)
  const readTypes = () => say(`연월 ${t(ym)} / 연 ${t(year)} / 일시 ${t(dt)}`)
  const readRange = () => say(`범위제한 — 년월일 ${t(rDay)} / 년월 ${t(rMonth)} / 년 ${t(rYear)}`)

  const setThisMonth = () => {
    const today = mdate.getToday()
    basic.current?.setMultiCalendar({ from: mdate.getFirstDayOfMonth(today), to: mdate.getLastDayOfMonth(today) })
    say(`setMultiCalendar(당월) → ${t(basic)}`)
  }
  const setLast7 = () => {
    const today = mdate.getToday()
    basic.current?.setFrom(mdate.addDay(today, -6))
    basic.current?.setTo(today)
    say(`setFrom/setTo(최근 7일) → ${t(basic)}`)
  }
  const lockToggle = () => {
    const next = !locked
    setLocked(next)
    basic.current?.setReadOnly(next)
    say(`setReadOnly(${next})`)
  }

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />

        <MocaReactLayout layout="h6:4">
          <div className="tt-scroll">
            <div className="tt-panel">
              <div className="tt-panel-head">
                <b>inputMultiCalendar</b> <span>속성별 변형</span>
                <button className="tt-btn tt-out" onClick={readAll}>값 읽기</button>
              </div>

              <Row th="기본(당월)" hint='defaultValue="당월" — 그 달 1일~말일'>
                <MocaReactMultiCalendar ref={basic} displayFormat="####-##-##" defaultValue="당월"
                  onTermSelected={(v) => say(`onTermSelected — ${v.from}~${v.to}`)} />
              </Row>

              <Row th="빠른선택 버튼" hint="quickItems — 팝업 왼쪽 목록">
                <MocaReactMultiCalendar ref={quick} displayFormat="####-##-##" defaultValue="금주"
                  quickItems="오늘,금주,전주,당월,전월,당분기,당년" />
              </Row>

              <Row th="최대 31일" hint="maxTermByDay={31} — 넘기면 선택 거부">
                <MocaReactMultiCalendar ref={max31} displayFormat="####-##-##" defaultValue="당월" maxTermByDay={31} />
              </Row>

              <Row th="연월 기간" hint='dateType="yyyyMM" — 팝업이 월 목록'>
                <MocaReactMultiCalendar ref={ym} dateType="yyyyMM" defaultValue="당년"
                  quickItems="당월,전월,당분기,전분기,당년" />
              </Row>

              <Row th="연 기간" hint="연 목록 + 최대 3년">
                <MocaReactMultiCalendar ref={year} dateType="yyyy" defaultValue="당년"
                  quickItems="당년,전년" maxTermByYear={3} />
              </Row>

              <Row th="일시 기간" hint="좌·우 달력 아래 시·분 → [확인] (초는 안 고른다 — 시작 00 · 종료 59 유지)">
                <MocaReactMultiCalendar ref={dt} dateType="yyyyMMdd hh:mm:ss" defaultValue="당월"
                  quickItems="오늘,금주,당월,전월" />
              </Row>

              <Row th="API">
                <button className="tt-btn tt-out" onClick={setThisMonth}>당월로</button>
                <button className="tt-btn tt-out" onClick={setLast7}>최근 7일</button>
                <button className="tt-btn tt-out" onClick={readTypes}>타입별 값 읽기</button>
                <button className="tt-btn tt-neu" onClick={lockToggle}>잠금 토글</button>
              </Row>
            </div>

            <div className="tt-panel">
              <div className="tt-panel-head">
                <b>범위 제한</b> <span>dateMin / dateMax — 좌·우 달력 모두 범위 밖 칸·이동버튼이 잠긴다</span>
                <button className="tt-btn tt-out" onClick={readRange}>값 읽기</button>
              </div>

              <Row th="년월일" hint="2026-07-10 ~ 2026-08-20">
                <MocaReactMultiCalendar ref={rDay} dateType="yyyyMMdd" defaultValue="오늘"
                  quickItems="오늘,금주" dateMin="20260710" dateMax="20260820" />
              </Row>

              <Row th="년월" hint="2026-03 ~ 2026-09 — 3~9월만">
                <MocaReactMultiCalendar ref={rMonth} dateType="yyyyMM" defaultValue="당월"
                  quickItems="당월,전월,당분기" dateMin="20260301" dateMax="20260930" />
              </Row>

              <Row th="년" hint="2024 ~ 2027">
                <MocaReactMultiCalendar ref={rYear} dateType="yyyy" defaultValue="당년"
                  quickItems="당년,전년" dateMin="20240101" dateMax="20271231" />
              </Row>
            </div>
          </div>

          <MocaReactLayout layout="vfit:fit">
            <div className="tt-panel tt-note">
              <div className="tt-note-title">inputMultiCalendar — 기간(from~to)</div>
              <ul>
                <li><b>한 컴포넌트가 두 칸</b>을 관리한다(팝업은 좌 = 시작, 우 = 종료)</li>
                <li><b>dateType</b> — yyyy(연) · yyyyMM(연월) · <b>yyyyMMdd</b>(일자, 기본) · yyyyMMdd hh:mm:ss(일시)</li>
                <li>기본값은 <b>당월 · 전월 · 금주 · 당분기 · 당년</b> 같은 문구로 준다</li>
                <li>팝업 <b>빠른선택 버튼</b>은 quickItems</li>
                <li><b>최대 기간</b>(일/월/년)을 넘기면 선택 거부, from&gt;to 면 반대쪽이 자동으로 따라온다</li>
              </ul>
            </div>

            <div className="tt-panel">
              <div className="tt-panel-head"><b>실행 로그</b> <span>방금 수행한 한 건</span></div>
              <pre className="tt-log">{log}</pre>
            </div>
          </MocaReactLayout>
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .tt-scroll { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
        /* flex: none — 공간 부족 시 패널이 압축되며 내용이 잘리는 것을 막는다(스크롤은 .tt-scroll) */
        .tt-panel { flex: none; border: 1px solid #d8dee5; border-radius: 6px; overflow: hidden; }
        .tt-panel-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: #f4f6f8; border-bottom: 1px solid #d8dee5; font-size: 13px; }
        .tt-panel-head span { color: #8a8fa0; font-size: 12px; }
        .tt-panel-head button { margin-left: auto; }
        .tt-row { display: flex; border-top: 1px solid #eef1f4; font-size: 13px; }
        .tt-row:first-of-type { border-top: none; }
        .tt-th { flex: 0 0 100px; padding: 8px 10px; text-align: right; color: #5a6b7c;
          background: #fafbfc; box-sizing: border-box; }
        .tt-td { flex: 1; min-width: 0; padding: 7px 10px; display: flex; align-items: center;
          gap: 8px; flex-wrap: wrap; }
        .tt-hint { color: #1c5d99; font-size: 11.5px; }
        .tt-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 4px 9px; font-size: 12px; color: inherit; cursor: pointer; }
        .tt-btn:hover { background: rgba(127,127,127,0.12); }
        .tt-out { border-color: #1c5d99; color: #1c5d99; }
        .tt-neu { border-color: #8a8fa0; }
        .tt-note { padding: 10px 14px; }
        .tt-note-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
        .tt-note ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; color: #4a5568; }
        .tt-log { margin: 0; padding: 10px 12px; font-size: 12px; white-space: pre-wrap;
          font-family: Consolas, monospace; color: #4a5568; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tt-panel { border-color: #2a3644; }

  :root:not([data-theme="light"]) .tt-panel-head { background: #161f29; border-bottom-color: #2a3644; }

  :root:not([data-theme="light"]) .tt-row { border-top-color: #1e2f3d; }

  :root:not([data-theme="light"]) .tt-th { background: #131a21; color: #93a5b6; }

  :root:not([data-theme="light"]) .tt-hint { color: #7fc1ff; }

  :root:not([data-theme="light"]) .tt-btn { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .tt-out { border-color: #7fc1ff; color: #7fc1ff; }

  :root:not([data-theme="light"]) .tt-note ul,
:root:not([data-theme="light"]) .tt-log { color: #b9c6d3; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .tt-panel { border-color: #2a3644; }

:root[data-theme="dark"] .tt-panel-head { background: #161f29; border-bottom-color: #2a3644; }

:root[data-theme="dark"] .tt-row { border-top-color: #1e2f3d; }

:root[data-theme="dark"] .tt-th { background: #131a21; color: #93a5b6; }

:root[data-theme="dark"] .tt-hint { color: #7fc1ff; }

:root[data-theme="dark"] .tt-btn { border-color: #3a4a5c; }

:root[data-theme="dark"] .tt-out { border-color: #7fc1ff; color: #7fc1ff; }

:root[data-theme="dark"] .tt-note ul,
:root[data-theme="dark"] .tt-log { color: #b9c6d3; }

      `}</style>
    </div>
  )
}

export default TermTest
