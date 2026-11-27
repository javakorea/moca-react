import { useEffect, useMemo, useRef, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { popup } from '@teammoca/react-popup'
import PopDaySchedule from './pop/PopDaySchedule'
import { MocaReactScheduleCalendar } from '@teammoca/react-schedule-calendar'
import { mdate } from '@teammoca/react-input-calendar'
import ComTitle from './com/ComTitle'

// 일정 달력(scheduleCalendar) 데모 — MOCA TPL041 의 React 판.
// 화면이 하는 일은 셋뿐이다: ① 월 변경 시 조회 ② 아이템으로 매핑해 넘기기 ③ 일자 클릭 시 getDayItems.
// 연속일정 전개·정렬·바 그리기·공휴일/날씨 표기·스와이프는 컴포넌트가 한다.
// 이 데모는 서버 없이 도는 샘플이라 조회 대신 고정 시드로 그 달 일정을 만든다(새로고침해도 같은 그림).

const CATE = [
  { nm: '회의', bg: '#2B6BE0', fg: '#ffffff', mark: '◆', ico: '📌' },
  { nm: '출장', bg: '#22D3A0', fg: '#06130b', mark: '▲', ico: '✈️' },
  { nm: '교육', bg: '#A855F7', fg: '#ffffff', mark: '●', ico: '📚' },
  { nm: '개인', bg: '#FFA040', fg: '#1a1a1a', mark: '', ico: '🙂' },
  { nm: '마감', bg: '#E8684A', fg: '#ffffff', mark: '■', ico: '🔥' },
]
const TITLE = ['주간 업무보고', '고객사 미팅', '스프린트 리뷰', '신규 입사자 교육', '분기 마감 정산',
  '제품 데모', '코드 리뷰', '워크숍', '월간 점검', '기획 회의', '릴리스 준비', '정기 점검']
const HOLI = {
  '0101': '신정', '0301': '삼일절', '0505': '어린이날', '0606': '현충일',
  '0815': '광복절', '1003': '개천절', '1009': '한글날', '1225': '성탄절',
}

/* 고정 시드 난수 — 같은 달이면 항상 같은 일정이 나온다(MOCA 데모와 같은 방식).
   곱셈은 Math.imul(32비트 정수 곱)로 한다 — 그냥 `s * 1103515245` 로 쓰면 두 번째 반복부터
   안전 정수 범위(2^53)를 넘어 정밀도가 깨지고, 결과가 음수/NaN 이 되면 날짜가 'yyyyNaN' 처럼
   망가져 아래 일정 전개가 헛돈다(실측으로 확인) */
const seeded = (seed) => {
  let s = (Number(seed) || 1) >>> 0
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    return s / 4294967296
  }
}

/* 그 달의 일정 행 만들기 — 실제 화면에서는 이 자리에 tran.select 결과가 온다 */
const makeMonth = (ym) => {
  const rnd = seeded(Number(ym))
  const last = Number(mdate.getLastDayOfMonth(`${ym}01`).slice(6, 8))
  const rows = []
  const n = 12 + Math.floor(rnd() * 6)
  for (let i = 0; i < n; i++) {
    const c = CATE[Math.floor(rnd() * CATE.length)]
    const d = 1 + Math.floor(rnd() * (last - 1))
    const st = `${ym}${String(d).padStart(2, '0')}`
    const len = rnd() < 0.25 ? 1 + Math.floor(rnd() * 4) : 0 // 25% 는 연속일정
    let en = len ? mdate.addDay(st, len) : ''
    if (en && Number(en.slice(6, 8)) < d) en = '' // 달을 넘기면 단일로
    rows.push({
      SCH_ID: `${ym}-${String(i).padStart(3, '0')}`,
      TITLE: TITLE[Math.floor(rnd() * TITLE.length)] + (len ? ` (${len + 1}일)` : ''),
      START_YMD: st,
      END_YMD: en,
      START_TIME: `${String(8 + Math.floor(rnd() * 10)).padStart(2, '0')}00`,
      CATE_NM: c.nm,
      OWNER: ['김모카', '이수정', '박지훈', '최은지'][Math.floor(rnd() * 4)],
      DONE_YN: rnd() < 0.25 ? 'Y' : 'N',
      CRUCIAL_YN: rnd() < 0.15 ? 'Y' : 'N',
      BG: c.bg, FG: c.fg, MARK: c.mark, ICO: c.ico,
    })
  }
  return rows
}

/* 일자 메타 — 공휴일(빨간 날짜+이름) · 날씨 */
const makeDayInfo = (ym) => {
  const info = {}
  const rnd = seeded(Number(ym) + 7)
  const mm = ym.slice(4, 6)
  Object.keys(HOLI).forEach((k) => {
    if (k.slice(0, 2) === mm) info[`${ym}${k.slice(2, 4)}`] = { holi: HOLI[k] }
  })
  for (let d = 1; d <= 5; d++) { // 날씨는 5일치만(데모) — 실제로는 기상청 조회 결과
    const ymd = `${ym}${String(d).padStart(2, '0')}`
    info[ymd] = { ...(info[ymd] ?? {}), wthr: ['☀️', '⛅', '🌧️', '❄️', '🌤️'][Math.floor(rnd() * 5)] }
  }
  return info
}

const EMPTY_ROWS = [] // 매 렌더 새 [] 를 만들면 아래 useMemo 가 매번 다시 돈다

function ScheduleTest({ menuInfo }) {
  const scc = useRef(null)
  const [ym, setYm] = useState(() => mdate.getToday().slice(0, 6))
  const [raw, setRaw] = useState({}) // ym → 원본 행(재조회 없이 옵션만 바꿔 다시 그릴 때 사용)
  const [opt, setOpt] = useState({ done: true, ico: true, outside: false })
  const [ymInput, setYmInput] = useState('')

  // 월 변경 → 그 달 데이터 확보(실제 화면이라면 여기서 tran.select 조회)
  useEffect(() => {
    setRaw((r) => (r[ym] ? r : { ...r, [ym]: makeMonth(ym) }))
  }, [ym])

  const rows = raw[ym] ?? EMPTY_ROWS

  // 매핑 — 보기 옵션만 바뀐 경우 재조회 없이 다시 그린다(MOCA fn_apply 와 같은 구조)
  const schedules = useMemo(() => rows
    .filter((r) => opt.done || r.DONE_YN !== 'Y')
    .map((r) => ({
      start: r.START_YMD,
      end: r.END_YMD || '',
      title: r.TITLE,
      ico: opt.ico ? (r.ICO || '') : '',
      done: r.DONE_YN === 'Y',
      crucial: r.CRUCIAL_YN === 'Y',
      span: !!r.END_YMD && r.END_YMD !== r.START_YMD,
      bg: r.BG, fg: r.FG, mark: r.MARK,
      time: r.START_TIME || '',
      seq: r.SCH_ID,
      data: r, // 원본 행 — 일자 목록이 재조회 없이 쓴다
    })), [rows, opt.done, opt.ico])

  const dayInfo = useMemo(() => makeDayInfo(ym), [ym])

  /* 일자 클릭 → 그 날 일정 팝업 (MOCA TPL041 fn_dayClick 과 같다).
     getDayItems/getDayInfo 는 setData 가 만들어 둔 인덱스라 **서버를 다시 부르지 않는다.**
     팝업이 { changed, delId } 를 돌려줄 때만 원본에서 지우고 다시 그린다 — 취소면 콜백이 안 온다 */
  const onDayClick = (day) => {
    const d = day.ymd
    popup.open(PopDaySchedule, {
      title: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} 일정`,
      width: 640,
      data: {
        ymd: d,
        items: scc.current?.getDayItems(d) ?? [],
        info: scc.current?.getDayInfo(d) ?? {},
      },
      callback: (res) => {
        if (!res?.changed) return
        setRaw((r) => ({ ...r, [ym]: (r[ym] ?? []).filter((x) => x.SCH_ID !== res.delId) }))
      },
    })
  }

  const goYm = () => {
    const v = ymInput.replace(/\D/g, '')
    if (v.length !== 6) { window.alert('연월을 yyyyMM 형식으로 입력하세요. 예) 202608'); return }
    scc.current?.setYm(v)
  }

  const chk = (key, label) => (
    <label className="sc-chk">
      <input type="checkbox" checked={opt[key]} onChange={(e) => setOpt((o) => ({ ...o, [key]: e.target.checked }))} />
      {label}
    </label>
  )


  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:fit:auto">
        <ComTitle menu={menuInfo} />

        <div className="sc-hint">
          월간 일정 달력입니다. 화면이 하는 일은 <b>월 변경 시 조회 → 아이템 매핑</b>, 그리고
          <b> 일자 클릭 시 getDayItems</b> 뿐입니다 — 연속일정 전개·정렬·바 그리기·공휴일/날씨 표기·
          <b>좌우 스와이프</b>는 컴포넌트가 합니다. 일자를 클릭하면 우측에 그 날 목록이 뜨는데,
          <b> 서버를 다시 부르지 않고</b> 인덱스에서 꺼냅니다.
          <div className="sc-toolbar">
            <span className="sc-th">보기 옵션</span>
            {chk('done', '완료 일정')}
            {chk('ico', '이모지')}
            {chk('outside', '앞뒤월 일정')}
            <span className="sc-th">이동</span>
            <button className="sc-btn" onClick={() => scc.current?.prev()}>이전</button>
            <button className="sc-btn" onClick={() => scc.current?.today()}>오늘</button>
            <button className="sc-btn" onClick={() => scc.current?.next()}>다음</button>
            <span className="sc-th">연월</span>
            <input className="sc-ipt" value={ymInput} placeholder="202608" maxLength={6}
              onChange={(e) => setYmInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goYm() }} />
            <button className="sc-btn" onClick={goYm}>이동</button>
            <span className="sc-cnt">{schedules.length}건</span>
          </div>
        </div>

        <MocaReactScheduleCalendar
          ref={scc}
          schedules={schedules}
          dayInfo={dayInfo}
          hideOutside={!opt.outside}
          todayFlag
          menuButton
          onMenuClick={() => window.alert('메뉴 버튼은 훅만 제공합니다.\n여기서 옵션 패널·드로어를 열면 됩니다.')}
          onMonthChange={(next) => setYm(next)}
          onDayClick={onDayClick}
          dayRenderer={(day) => (day.dow === 0 || day.dow === 6 ? <span className="sc-off">휴일</span> : null)}
        />

      </MocaReactLayout>

      <style>{`
        .sc-hint { border: 1px solid #d8dee5; border-radius: 6px; padding: 9px 12px;
          font-size: 12.5px; line-height: 1.6; color: #4a5568; }
        .sc-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .sc-th { color: #5a6b7c; font-size: 12px; font-weight: 600; }
        .sc-chk { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; cursor: pointer; }
        .sc-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 3px 9px; font-size: 12px; color: inherit; cursor: pointer; }
        .sc-btn:hover { background: rgba(127,127,127,0.12); }
        .sc-ipt { width: 78px; padding: 3px 7px; border: 1px solid #c4ccd5; border-radius: 5px;
          font-size: 12px; background: transparent; color: inherit; }
        .sc-cnt { margin-left: auto; color: #1c5d99; font-size: 12px; font-weight: 700; }
        .sc-off { color: #1c5d99; }
        .sc-side { display: flex; flex-direction: column; height: 100%; box-sizing: border-box;
          border: 1px solid #d8dee5; border-radius: 6px; overflow: hidden; }
        .sc-side-head { flex: none; padding: 8px 10px; background: #f4f6f8;
          border-bottom: 1px solid #d8dee5; font-size: 13px; font-weight: 700; }
        .sc-side-holi, .sc-side-wthr { flex: none; padding: 5px 10px; font-size: 12px; color: #b4493e; }
        .sc-side-wthr { color: #5a6b7c; }
        .sc-side-list { flex: 1; min-height: 0; overflow: auto; padding: 6px; display: flex;
          flex-direction: column; gap: 5px; }
        .sc-item { display: flex; gap: 7px; padding: 6px 7px; border: 1px solid #eef1f4;
          border-radius: 5px; font-size: 12px; }
        .sc-item i { width: 4px; border-radius: 2px; flex: none; }
        .sc-item-body { min-width: 0; }
        .sc-item-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sc-item-title b { color: #E8684A; font-size: 10px; }
        .sc-item-sub { color: #8a8fa0; font-size: 11px; margin-top: 1px; }
        .sc-item-done .sc-item-title { text-decoration: line-through; opacity: 0.7; }
        .sc-empty { color: #8a8fa0; font-size: 12px; text-align: center; padding: 16px 0; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .sc-hint { border-color: #2a3644; color: #b9c6d3; }

  :root:not([data-theme="light"]) .sc-th { color: #93a5b6; }

  :root:not([data-theme="light"]) .sc-btn,
:root:not([data-theme="light"]) .sc-ipt { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .sc-cnt,
:root:not([data-theme="light"]) .sc-off { color: #7fc1ff; }

  :root:not([data-theme="light"]) .sc-side { border-color: #2a3644; }

  :root:not([data-theme="light"]) .sc-side-head { background: #161f29; border-bottom-color: #2a3644; }

  :root:not([data-theme="light"]) .sc-side-holi { color: #ff8a80; }

  :root:not([data-theme="light"]) .sc-side-wthr { color: #93a5b6; }

  :root:not([data-theme="light"]) .sc-item { border-color: #1e2f3d; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .sc-hint { border-color: #2a3644; color: #b9c6d3; }

:root[data-theme="dark"] .sc-th { color: #93a5b6; }

:root[data-theme="dark"] .sc-btn,
:root[data-theme="dark"] .sc-ipt { border-color: #3a4a5c; }

:root[data-theme="dark"] .sc-cnt,
:root[data-theme="dark"] .sc-off { color: #7fc1ff; }

:root[data-theme="dark"] .sc-side { border-color: #2a3644; }

:root[data-theme="dark"] .sc-side-head { background: #161f29; border-bottom-color: #2a3644; }

:root[data-theme="dark"] .sc-side-holi { color: #ff8a80; }

:root[data-theme="dark"] .sc-side-wthr { color: #93a5b6; }

:root[data-theme="dark"] .sc-item { border-color: #1e2f3d; }

      `}</style>
    </div>
  )
}

export default ScheduleTest
