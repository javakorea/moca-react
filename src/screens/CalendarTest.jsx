import { useRef, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactInputCalendar, mdate } from '@teammoca/react-input-calendar'
import ComTitle from './com/ComTitle'

// 표 한 줄(라벨 + 입력 + 설명) — ★ 컴포넌트 정의는 반드시 화면 함수 "밖"에.
// 안에 두면 화면이 리렌더될 때마다 새 컴포넌트 타입이 되어 React 가 서브트리를 언마운트/
// 재마운트한다 → 그 안의 달력들이 매번 초기값으로 리셋된다(로그 setState 한 번에 값이 사라짐).
const Row = ({ th, children, hint }) => (
  <div className="ct-row">
    <div className="ct-th">{th}</div>
    <div className="ct-td">
      {children}
      {hint && <span className="ct-hint">{hint}</span>}
    </div>
  </div>
)

// 날짜 선택(inputCalendar) 데모 — MOCA TPL042 의 React 판.
// dateType 하나가 "무엇을 고르는 달력인가"를 정하고, 값 자릿수·팝업 모드·기본 표시형식이
// 전부 거기서 파생된다. 값은 항상 숫자문자열이고 표시는 displayFormat(# 마스크)이 만든다.
function CalendarTest({ menuInfo }) {
  const [log, setLog] = useState(`오늘: ${mdate.getToday()} — 각 달력의 값을 [값 읽기]로 확인해 보세요.`)
  const [locked, setLocked] = useState(false)

  // ref 로 명령형 API 사용 (MOCA $p.get('ipc_basic').getValue() 대응)
  const basic = useRef(null)
  const fmt = useRef(null)
  const ago = useRef(null)
  const ro = useRef(null)
  const ym = useRef(null)
  const year = useRef(null)
  const dtm = useRef(null)
  const dts = useRef(null)
  const rDay = useRef(null)
  const rMonth = useRef(null)
  const rYear = useRef(null)

  const now = new Date()
  const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  const say = (msg) => setLog(`[${stamp}] ${msg}`)

  const readAll = () => say(
    `기본 ${basic.current?.getValue()} / 표시형식 ${fmt.current?.getValue()} / 상대일 ${ago.current?.getValue()} / 잠금 ${ro.current?.getValue()}\n` +
    `연월 ${ym.current?.getValue()} / 연 ${year.current?.getValue()} / 일시(분) ${dtm.current?.getValue()} / 일시(초) ${dts.current?.getValue()}`,
  )
  const readRange = () => say(
    `범위제한 값 — 년월일 ${rDay.current?.getValue()} / 년월 ${rMonth.current?.getValue()} / 년 ${rYear.current?.getValue()}`,
  )
  const addDay = (n) => {
    const v = basic.current?.getValue() || mdate.getToday()
    basic.current?.setValue(mdate.addDay(v, n))
    say(`addDay(${n}) → ${basic.current?.getValue()}`)
  }
  const ymRange = () => {
    const v = ym.current?.getValue()
    if (!v) { say('연월을 먼저 선택하세요.'); return }
    say(`${v} 1일~말일: ${mdate.getFirstDayOfMonth(`${v}01`)} ~ ${mdate.getLastDayOfMonth(`${v}01`)}`)
  }
  const setSame = () => {
    ;[ym, year, dtm, dts].forEach((r) => r.current?.setValue('20260815'))
    say(`네 달력에 모두 setValue('20260815') → 연월 ${ym.current?.getValue()} / 연 ${year.current?.getValue()}`
      + ` / 일시(분) ${dtm.current?.getValue()} / 일시(초) ${dts.current?.getValue()}`)
  }
  const toggleLock = () => {
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
          {/* 좌: 속성별 변형 + 범위 제한 */}
          <div className="ct-scroll">
            <div className="ct-panel">
              <div className="ct-panel-head">
                <b>inputCalendar</b> <span>속성별 변형</span>
                <button className="ct-btn ct-out" onClick={readAll}>값 읽기</button>
              </div>

              <Row th="기본(오늘)" hint='defaultValue="오늘"'>
                <MocaReactInputCalendar
                  ref={basic}
                  displayFormat="####-##-##"
                  defaultValue="오늘"
                  onDateSelected={(v) => say(`onDateSelected — 기본 달력 값: ${v}`)}
                />
              </Row>

              <Row th="표시형식" hint="&quot;####/##/##&quot; — 값은 그대로 yyyyMMdd">
                <MocaReactInputCalendar ref={fmt} displayFormat="####/##/##" defaultValue="오늘" />
              </Row>

              <Row th="기본값(상대일)" hint='"7일전" · "3개월전" 등'>
                <MocaReactInputCalendar ref={ago} displayFormat="####-##-##" defaultValue="7일전" />
              </Row>

              <Row th="읽기전용" hint="readOnly">
                <MocaReactInputCalendar ref={ro} displayFormat="####-##-##" defaultValue="오늘" readOnly />
              </Row>

              <Row th="API">
                <button className="ct-btn ct-out" onClick={() => { basic.current?.setValue(mdate.getToday()); say('setValue(오늘)') }}>오늘로</button>
                <button className="ct-btn ct-out" onClick={() => { basic.current?.setValue('20260815'); say("setValue('20260815')") }}>2026-08-15</button>
                <button className="ct-btn ct-out" onClick={() => addDay(-1)}>-1일</button>
                <button className="ct-btn ct-out" onClick={() => addDay(1)}>+1일</button>
                <button className="ct-btn ct-neu" onClick={toggleLock}>잠금 토글</button>
              </Row>

              <Row th="연월 선택" hint='dateType="yyyyMM" — 값 6자리, 팝업은 월 목록'>
                <MocaReactInputCalendar ref={ym} dateType="yyyyMM" defaultValue="오늘" width={130} />
                <button className="ct-btn ct-out" onClick={ymRange}>그 달 1일~말일</button>
              </Row>

              <Row th="연 선택" hint='dateType="yyyy" — 값 4자리, 팝업은 연 목록'>
                <MocaReactInputCalendar ref={year} dateType="yyyy" defaultValue="오늘" width={110} />
              </Row>

              <Row th="일시(분까지)" hint="일자 격자 + 시·분 → [확인] 으로 확정">
                <MocaReactInputCalendar ref={dtm} dateType="yyyyMMddHHmm" defaultValue="오늘" width={190} />
              </Row>

              <Row th="일시(초까지)" hint="값 14자리 — 초는 안 고른다(들어온 값 유지)">
                <MocaReactInputCalendar ref={dts} dateType="yyyyMMdd hh:mm:ss" defaultValue="오늘" width={210} />
                <button className="ct-btn ct-out" onClick={setSame}>네 곳에 20260815</button>
              </Row>
            </div>

            <div className="ct-panel">
              <div className="ct-panel-head">
                <b>범위 제한</b> <span>dateMin / dateMax — 범위 밖 칸·이동버튼·[오늘]이 잠긴다</span>
                <button className="ct-btn ct-out" onClick={readRange}>값 읽기</button>
              </div>

              <Row th="년월일" hint="2026-07-10 ~ 2026-08-20 — 그 밖 일자는 회색으로 잠김">
                <MocaReactInputCalendar ref={rDay} dateType="yyyyMMdd" defaultValue="오늘" dateMin="20260710" dateMax="20260820" />
              </Row>

              <Row th="년월" hint="2026-03 ~ 2026-09 — 3~9월만 선택, 1·2·10~12월 잠김">
                <MocaReactInputCalendar ref={rMonth} dateType="yyyyMM" defaultValue="오늘" dateMin="20260301" dateMax="20260930" width={130} />
              </Row>

              <Row th="년" hint="2024 ~ 2027 — 그 밖 연도 잠김">
                <MocaReactInputCalendar ref={rYear} dateType="yyyy" defaultValue="오늘" dateMin="20240101" dateMax="20271231" width={110} />
              </Row>
            </div>
          </div>

          {/* 우: 설명 + 실행 로그 */}
          <MocaReactLayout layout="vfit:fit">
            <div className="ct-panel ct-note">
              <div className="ct-note-title">inputCalendar — 단일 날짜 입력</div>
              <ul>
                <li><b>dateType</b> 이 "무엇을 고르는 달력인가"를 정한다<br />
                  yyyy(연) · yyyyMM(연월) · <b>yyyyMMdd</b>(일자, 기본) · yyyyMMddHHmm · yyyyMMdd hh:mm:ss(일시)</li>
                <li>값 자릿수 · 팝업 모드(연 목록 / 월 목록 / 일자 격자+시각) · 기본 표시형식이 <b>전부 이 한 속성에서 파생</b></li>
                <li>값은 언제나 <b>숫자만 있는 문자열</b>, 표시는 <b>displayFormat</b>(# 마스크)</li>
                <li>선택 범위 제한은 <b>dateMin / dateMax</b>(직접 타이핑도 검증)</li>
              </ul>
            </div>

            <div className="ct-panel">
              <div className="ct-panel-head"><b>실행 로그</b> <span>방금 수행한 한 건</span></div>
              <pre className="ct-log">{log}</pre>
            </div>
          </MocaReactLayout>
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .ct-scroll { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
        /* flex: none — 공간 부족 시 패널이 압축되며 내용이 잘리는 것을 막는다(스크롤은 .ct-scroll) */
        .ct-panel { flex: none; border: 1px solid #d8dee5; border-radius: 6px; overflow: hidden; }
        .ct-panel-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: #f4f6f8; border-bottom: 1px solid #d8dee5; font-size: 13px; }
        .ct-panel-head span { color: #8a8fa0; font-size: 12px; }
        .ct-panel-head button { margin-left: auto; }
        .ct-row { display: flex; border-top: 1px solid #eef1f4; font-size: 13px; }
        .ct-row:first-of-type { border-top: none; }
        .ct-th { flex: 0 0 110px; padding: 8px 10px; text-align: right; color: #5a6b7c;
          background: #fafbfc; box-sizing: border-box; }
        .ct-td { flex: 1; min-width: 0; padding: 7px 10px; display: flex; align-items: center;
          gap: 8px; flex-wrap: wrap; }
        .ct-hint { color: #1c5d99; font-size: 11.5px; }
        .ct-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 4px 9px; font-size: 12px; color: inherit; cursor: pointer; }
        .ct-btn:hover { background: rgba(127,127,127,0.12); }
        .ct-out { border-color: #1c5d99; color: #1c5d99; }
        .ct-neu { border-color: #8a8fa0; }
        .ct-note { padding: 10px 14px; }
        .ct-note-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
        .ct-note ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; color: #4a5568; }
        .ct-log { margin: 0; padding: 10px 12px; font-size: 12px; white-space: pre-wrap;
          font-family: Consolas, monospace; color: #4a5568; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .ct-panel { border-color: #2a3644; }

  :root:not([data-theme="light"]) .ct-panel-head { background: #161f29; border-bottom-color: #2a3644; }

  :root:not([data-theme="light"]) .ct-row { border-top-color: #1e2f3d; }

  :root:not([data-theme="light"]) .ct-th { background: #131a21; color: #93a5b6; }

  :root:not([data-theme="light"]) .ct-hint { color: #7fc1ff; }

  :root:not([data-theme="light"]) .ct-btn { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .ct-out { border-color: #7fc1ff; color: #7fc1ff; }

  :root:not([data-theme="light"]) .ct-note ul,
:root:not([data-theme="light"]) .ct-log { color: #b9c6d3; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .ct-panel { border-color: #2a3644; }

:root[data-theme="dark"] .ct-panel-head { background: #161f29; border-bottom-color: #2a3644; }

:root[data-theme="dark"] .ct-row { border-top-color: #1e2f3d; }

:root[data-theme="dark"] .ct-th { background: #131a21; color: #93a5b6; }

:root[data-theme="dark"] .ct-hint { color: #7fc1ff; }

:root[data-theme="dark"] .ct-btn { border-color: #3a4a5c; }

:root[data-theme="dark"] .ct-out { border-color: #7fc1ff; color: #7fc1ff; }

:root[data-theme="dark"] .ct-note ul,
:root[data-theme="dark"] .ct-log { color: #b9c6d3; }

      `}</style>
    </div>
  )
}

export default CalendarTest
