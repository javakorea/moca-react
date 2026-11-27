import { useCallback, useEffect, useRef, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactCalendar, mdate } from '@teammoca/react-input-calendar'
import ComTitle from './com/ComTitle'

// 표 한 줄 — 컴포넌트 정의는 화면 함수 "밖"에 (안에 두면 리렌더마다 재마운트된다)
const Row = ({ th, children, desc }) => (
  <div className="ci-row">
    <div className="ci-th">{th}</div>
    <div className="ci-td">
      {children}
      {desc && <span className="ci-desc">{desc}</span>}
    </div>
  </div>
)

// 붙박이 달력(calendar) 데모 — MOCA TPL044 의 React 판.
// inputCalendar 가 "입력칸 + 팝업"이라면 이쪽은 화면에 늘 펼쳐진 달력이다.
// 공휴일·휴무일은 컴포넌트가 모른다 — 화면이 조회해 dayInfo 로 넘긴다(여기서는 상수표를
// 조회 결과 삼아 넘긴다. 실무라면 tran.select 결과를 그대로 매핑).

/* 양력 고정 공휴일(MMdd) — 실무라면 공휴일 테이블 조회 결과 */
const HOLI = {
  '0101': '신정', '0301': '삼일절', '0505': '어린이날', '0606': '현충일',
  '0815': '광복절', '1003': '개천절', '1009': '한글날', '1225': '성탄절',
}
/* 회사 임시휴무(yyyyMMdd) — 공휴일은 아니지만 쉬는 날 */
const COMPANY_OFF = { 20260814: '창립기념일', 20260924: '워크숍' }

function CalendarInlineTest({ menuInfo }) {
  const cal = useRef(null)
  const calRange = useRef(null)
  const calYm = useRef(null)
  const calYear = useRef(null)

  const [dayInfo, setDayInfo] = useState({})
  const [log, setLog] = useState('')
  const [ro, setRo] = useState(false)
  const [rangeLabel, setRangeLabel] = useState('-')

  const say = (msg) => {
    const n = new Date()
    const t = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`
    setLog(`[${t}] ${msg}`)
  }

  // ── 공휴일·휴무일 세팅 — 이 화면의 유일한 "업무" 코드 ──
  // 컴포넌트는 dayInfo 만 받는다: holi(공휴일명) · off(비영업일) · badge(표식) · class(추가 클래스)
  const loadHoli = useCallback((ym) => {
    const info = {}
    mdate.getMonthMatrix(ym).forEach(({ ymd }) => {
      const holiNm = HOLI[ymd.slice(4)]
      const offNm = COMPANY_OFF[ymd]
      if (holiNm) info[ymd] = { holi: holiNm, off: true }
      else if (offNm) info[ymd] = { holi: '', off: true, badge: '휴' }
    })
    setDayInfo(info)
    return Object.keys(info).length
  }, [])

  // 초기 조회 — onViewChange 는 "기준이 바뀔 때"만 발화하므로 첫 조회는 화면이 직접 한다(MOCA 동일)
  useEffect(() => {
    const ym = cal.current?.getViewYm() ?? mdate.getToday().slice(0, 6)
    const cnt = loadHoli(ym)
    const r = calRange.current?.getDateRange()
    if (r) setRangeLabel(`${r.min} ~ ${r.max}`)
    setLog(`오늘 ${mdate.getToday()} — 휴일 ${cnt}건 표시. 달력에서 날짜를 골라 보세요.`)
  }, [loadHoli])

  // 표시 기준이 바뀌면 그 달 휴일을 다시 세팅 — 실무의 "월 이동 → 재조회"가 이 자리다
  const onViewChange = (ym, view) => {
    if (view === 'day') say(`onViewChange — ${ym} 휴일 ${loadHoli(ym)}건 재조회`)
    else say(`표시 기준 이동 — ${ym} (${view} 뷰)`)
  }

  // 값 확정 — 비영업일이면 알려준다(휴무일 판정은 화면 몫, 컴포넌트는 표시만)
  const onSelect = (v) => {
    const d = cal.current?.getDayInfo(v) ?? {}
    say(`onSelect — ${v}${d.holi ? ` (${d.holi})` : ''}${d.off ? ' ※ 비영업일' : ''}`)
  }

  const addDay = (n) => {
    const v = cal.current?.getValue() || mdate.getToday()
    cal.current?.setValue(mdate.addDay(v, n))
    say(`addDay(${n}) → ${cal.current?.getValue()}`)
  }
  const toggleRo = () => {
    const next = !ro
    setRo(next)
    cal.current?.setReadOnly(next)
    say(`setReadOnly(${next}) — 선택만 잠기고 달 이동은 된다`)
  }
  const showRange = (msg) => {
    const r = calRange.current?.getDateRange() ?? {}
    setRangeLabel(`${r.min} ~ ${r.max}`)
    if (msg) say(`${msg} → ${r.min} ~ ${r.max}`)
  }
  const rangeToday = () => {
    const from = mdate.getToday()
    calRange.current?.setDateRange(from, mdate.addDay(from, 30))
    setTimeout(() => showRange('setDateRange(오늘, +30일)'), 0)
  }
  const rangeReset = () => {
    calRange.current?.setDateRange('20260810', '20260828')
    setTimeout(() => showRange('setDateRange — 화면 선언값으로 원복'), 0)
  }
  const readAll = () => say(
    `일자 ${cal.current?.getValue() || '-'} / 연월 ${calYm.current?.getValue() || '-'}`
    + ` / 연 ${calYear.current?.getValue() || '-'} / 범위제한 ${calRange.current?.getValue() || '-'}`,
  )

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />

        <MocaReactLayout layout="h6:4">
          <div className="ci-scroll">
            <div className="ci-panel">
              <div className="ci-panel-head">
                <b>일자 선택(yyyyMMdd)</b> <span>공휴일 · 회사휴무 · 주말을 표시</span>
                <button className="ci-btn ci-out" onClick={readAll}>값 읽기</button>
              </div>

              <Row th="달력">
                <MocaReactCalendar
                  ref={cal}
                  dateType="yyyyMMdd"
                  dayInfo={dayInfo}
                  weekendOff
                  legend
                  onSelect={onSelect}
                  onViewChange={onViewChange}
                />
              </Row>

              <Row th="API">
                <button className="ci-btn ci-out" onClick={() => { cal.current?.setValue(mdate.getToday()); say(`setValue(오늘) → ${cal.current?.getValue()}`) }}>오늘 선택</button>
                <button className="ci-btn ci-out" onClick={() => { cal.current?.setValue('20260815'); say("setValue('20260815') — 광복절로 이동+선택") }}>2026-08-15</button>
                <button className="ci-btn ci-out" onClick={() => addDay(-1)}>-1일</button>
                <button className="ci-btn ci-out" onClick={() => addDay(1)}>+1일</button>
                <button className="ci-btn ci-out" onClick={() => { cal.current?.today(); say(`today() — 이동만(선택값 ${cal.current?.getValue() || '없음'})`) }}>오늘 달로(이동만)</button>
                <button className="ci-btn ci-neu" onClick={() => { cal.current?.clear(); say('clear() — 선택 해제') }}>선택 해제</button>
                <button className="ci-btn ci-neu" onClick={toggleRo}>readonly {ro ? 'ON' : 'OFF'}</button>
              </Row>

              <Row th="표시 규칙" desc="legend — 달력 아래 범례가 표시의 뜻을 알려준다(빗금=비영업일 등). 빗금 대상은 weekendOff(주말) + dayInfo 의 off:true(공휴일·회사휴무). 제목을 누르면 한 단계 위(일→월→연)로 올라간다" />
            </div>

            <div className="ci-panel">
              <div className="ci-panel-head"><b>연월 · 연 · 범위제한</b> <span>타입과 선택가능 범위</span></div>

              <Row th="연월" desc='dateType="yyyyMM" — 값 6자리, 월 클릭이 곧 확정'>
                <MocaReactCalendar ref={calYm} dateType="yyyyMM" todayButton={false}
                  onSelect={(v) => say(`연월 선택 — ${v}`)} />
              </Row>

              <Row th="연" desc='dateType="yyyy" — 값 4자리, 한 연대(2020~2029)를 한 장으로'>
                <MocaReactCalendar ref={calYear} dateType="yyyy" todayButton={false}
                  onSelect={(v) => say(`연 선택 — ${v}`)} />
              </Row>

              <Row th="범위 제한" desc="dateMin/dateMax 밖의 날짜는 눌리지 않는다">
                <MocaReactCalendar ref={calRange} dateType="yyyyMMdd"
                  startYm="202608" dateMin="20260810" dateMax="20260828" />
              </Row>

              <Row th="적용 범위">
                <span className="ci-hint">{rangeLabel}</span>
                <button className="ci-btn ci-out" onClick={rangeToday}>오늘~30일로 변경</button>
                <button className="ci-btn ci-neu" onClick={rangeReset}>원래대로</button>
              </Row>

              <Row th="쓰는 곳" desc="예약 가능일(오늘~30일) · 신청 기간 · 정산 마감일처럼 고를 수 있는 구간이 정해진 화면. 고정 구간이면 props 로 충분하고, 구간이 다른 값에서 정해지면 setDateRange(min, max)" />
            </div>
          </div>

          <MocaReactLayout layout="vfit:fit">
            <div className="ci-panel ci-note">
              <div className="ci-note-title">calendar — 붙박이 달력</div>
              <ul>
                <li>화면에 <b>늘 펼쳐진 달력</b> — 고른 날짜를 달력 위에서 확인한다</li>
                <li>입력칸이 필요하면 <b>InputCalendar</b>, 기간이면 <b>MultiCalendar</b></li>
                <li><b>dateType</b> — <b>yyyyMMdd</b>(일자·기본) · yyyyMM(연월) · yyyy(연)</li>
                <li>제목을 누르면 <b>한 단계 위</b>(일→월→연)로 올라가 먼 날짜로 빠르게 이동</li>
                <li>공휴일·비영업일은 컴포넌트가 모른다 — 화면이 조회해 <b>dayInfo</b>로 알려주고,
                  달을 옮길 때마다 <b>onViewChange</b>로 다시 조회</li>
              </ul>
            </div>

            <div className="ci-panel">
              <div className="ci-panel-head"><b>실행 로그</b> <span>방금 수행한 한 건</span></div>
              <pre className="ci-log">{log}</pre>
            </div>
          </MocaReactLayout>
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .ci-scroll { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
        /* flex: none — 없으면 공간이 부족할 때 패널이 압축되고 overflow:hidden 에 내용이 잘린다
           (붙박이 달력처럼 높이가 큰 내용에서 드러난다. 스크롤은 .ci-scroll 이 맡는다) */
        .ci-panel { flex: none; border: 1px solid #d8dee5; border-radius: 6px; overflow: hidden; }
        .ci-panel-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: #f4f6f8; border-bottom: 1px solid #d8dee5; font-size: 13px; }
        .ci-panel-head span { color: #8a8fa0; font-size: 12px; }
        .ci-panel-head button { margin-left: auto; }
        .ci-row { display: flex; border-top: 1px solid #eef1f4; font-size: 13px; }
        .ci-row:first-of-type { border-top: none; }
        .ci-th { flex: 0 0 100px; padding: 8px 10px; text-align: right; color: #5a6b7c;
          background: #fafbfc; box-sizing: border-box; }
        .ci-td { flex: 1; min-width: 0; padding: 8px 10px; display: flex; align-items: center;
          gap: 8px; flex-wrap: wrap; }
        .ci-desc { color: #5a6b7c; font-size: 11.5px; line-height: 1.6; }
        .ci-hint { color: #1c5d99; font-size: 12px; font-family: Consolas, monospace; }
        .ci-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 4px 9px; font-size: 12px; color: inherit; cursor: pointer; }
        .ci-btn:hover { background: rgba(127,127,127,0.12); }
        .ci-out { border-color: #1c5d99; color: #1c5d99; }
        .ci-neu { border-color: #8a8fa0; }
        .ci-note { padding: 10px 14px; }
        .ci-note-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
        .ci-note ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; color: #4a5568; }
        .ci-log { margin: 0; padding: 10px 12px; font-size: 12px; white-space: pre-wrap;
          font-family: Consolas, monospace; color: #4a5568; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .ci-panel { border-color: #2a3644; }

  :root:not([data-theme="light"]) .ci-panel-head { background: #161f29; border-bottom-color: #2a3644; }

  :root:not([data-theme="light"]) .ci-row { border-top-color: #1e2f3d; }

  :root:not([data-theme="light"]) .ci-th { background: #131a21; color: #93a5b6; }

  :root:not([data-theme="light"]) .ci-desc { color: #93a5b6; }

  :root:not([data-theme="light"]) .ci-hint { color: #7fc1ff; }

  :root:not([data-theme="light"]) .ci-btn { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .ci-out { border-color: #7fc1ff; color: #7fc1ff; }

  :root:not([data-theme="light"]) .ci-note ul,
:root:not([data-theme="light"]) .ci-log { color: #b9c6d3; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .ci-panel { border-color: #2a3644; }

:root[data-theme="dark"] .ci-panel-head { background: #161f29; border-bottom-color: #2a3644; }

:root[data-theme="dark"] .ci-row { border-top-color: #1e2f3d; }

:root[data-theme="dark"] .ci-th { background: #131a21; color: #93a5b6; }

:root[data-theme="dark"] .ci-desc { color: #93a5b6; }

:root[data-theme="dark"] .ci-hint { color: #7fc1ff; }

:root[data-theme="dark"] .ci-btn { border-color: #3a4a5c; }

:root[data-theme="dark"] .ci-out { border-color: #7fc1ff; color: #7fc1ff; }

:root[data-theme="dark"] .ci-note ul,
:root[data-theme="dark"] .ci-log { color: #b9c6d3; }

      `}</style>
    </div>
  )
}

export default CalendarInlineTest
