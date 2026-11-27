import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { mdate } from '@teammoca/react-input-calendar'
import './MocaReactScheduleCalendar.css'

// MOCA React ScheduleCalendar — 월간 일정 달력 (MOCA scheduleCalendar 이식, 데모 TPL041 대응)
//
// ── 화면이 하는 일은 셋뿐이다 (MOCA 와 같은 계약) ──────────────────────────
//   ① 월이 바뀌면(onMonthChange) 그 달 일정을 조회한다
//   ② 조회 결과를 아이템으로 매핑해 schedules 로 넘긴다(또는 ref.setData 한 번)
//   ③ 일자 클릭(onDayClick)에서 getDayItems 로 그 날 목록을 꺼내 쓴다 — 서버 재조회 없음
//   연속일정 일자 전개 · 정렬 · 바 마크업 · 공휴일/날씨 표기 · 스와이프는 컴포넌트가 한다.
//
// ── 일정 아이템 (schedules 항목) ───────────────────────────────────────────
//   { start:'yyyyMMdd'(필수), end(생략=단일), title, ico, done, crucial,
//     span(연속 여부 — 생략 시 end>start 로 판정), bg, fg, mark(마커색 — 생략 시 fg),
//     time:'HHmm'(시작시간 정렬키), endTime(상세용), seq(동순위 최후 정렬키 — 최근 우선),
//     data(원본 행 — 컴포넌트는 쓰지 않고 보관만 한다. getDayItems 로 되돌려받아 일자 목록·상세가
//          업무 필드를 재조회 없이 쓴다) }
//
// ── 정렬 규칙 (MOCA _cmp 이식 — 이 순서가 화면의 "줄"을 만든다) ────────────
//   ① 완료는 무조건 뒤 ② 연속 우선(인접 칸에서 같은 슬롯을 유지해 한 줄로 이어져 보인다)
//   ③ 시작일 빠른 순 ④ 시작시간(없으면 2359) ⑤ seq 내림(최근 우선)
//
// props
//   schedules  : 일정 아이템 배열(위 규격). ref.setData 로 넘겨도 된다
//   dayInfo    : { yyyyMMdd: { holi, wthr, badges[] } } — 공휴일명·날씨·뱃지
//   hideOutside: true 면 표시 월 밖 칸(전월 말·익월 초)에는 일정·메타를 그리지 않고 날짜만 남긴다
//   startYm    : 초기 표시 월(yyyyMM, 기본 이번 달)
//   header     : false 면 내부 헤더(메뉴·이전·연월·다음·오늘) 숨김 — 화면이 이동 UI 를 직접 만들 때
//   menuButton : true 면 헤더 맨 앞에 햄버거 버튼 — 화면이 옵션·드로어를 여는 진입점(훅만 제공)
//   todayFlag  : true 면 오늘 칸에 TODAY 깃발 표시
//   dayRenderer: (day) => ReactNode — 날짜 배지 아래에 넣을 내용. day={ymd,dd,dow,inMonth,today}
//                (MOCA 는 HTML 문자열, React 판은 노드 — 더 안전하고 자연스럽다)
//   onMonthChange : (ym) => void — 월 변경 시(버튼·오늘·스와이프·setYm). **초기화 시엔 미발화** —
//                   첫 조회는 화면이 getYm() 으로 직접 한다(MOCA 와 같은 규약)
//   onDayClick / onMenuClick : (day) => void / () => void
//
// ref (imperative — MOCA 메서드 대응)
//   setData({schedules, dayInfo, hideOutside}) / getDayItems(ymd) / getDayInfo(ymd)
//   getYm() / setYm(ym) / today() / next() / prev() / refresh()

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const EMPTY_ARR = []
const EMPTY_OBJ = {}

/** 일정 목록 → 일자별 인덱스 (MOCA _indexSchedules 이식).
 *  연속일정을 시작~종료 일자로 전개하고(pos: one/s/m/e, 최대 100일 가드) 정렬한다. */
const indexSchedules = (list) => {
  const idx = {}
  list.forEach((it) => {
    let s = it.start
    let e = it.end || s
    if (!s) return
    if (e < s) { const t = s; s = e; e = t } // 뒤집혀 들어와도 살린다
    const span = it.span !== undefined ? !!it.span : s !== e
    let ymd = s
    let guard = 0
    while (ymd <= e && guard++ < 100) { // 100일 가드(MOCA 동일) — 잘못된 데이터로 폭주하지 않게
      const pos = s === e ? 'one' : ymd === s ? 's' : ymd === e ? 'e' : 'm'
      ;(idx[ymd] = idx[ymd] || []).push({ it, span, pos, ymd })
      const next = mdate.addDay(ymd, 1)
      // 날짜가 아닌 값이 들어오면 addDay 가 '' 를 준다 — 그대로 두면 같은 칸에 가드 한도까지
      // 쌓이며 헛돈다. 전진하지 못하면 그 아이템은 여기서 끊는다
      if (!next || next <= ymd) break
      ymd = next
    }
  })
  const cmp = (a, b) => {
    const A = a.it
    const B = b.it
    if (!A.done !== !B.done) return A.done ? 1 : -1 // ① 완료는 뒤
    if (a.span !== b.span) return a.span ? -1 : 1 // ② 연속 우선
    if (A.start !== B.start) return A.start < B.start ? -1 : 1 // ③ 시작일
    const ta = A.time || '2359'
    const tb = B.time || '2359'
    if (ta !== tb) return ta < tb ? -1 : 1 // ④ 시작시간
    const sa = String(A.seq ?? '')
    const sb = String(B.seq ?? '')
    return sa > sb ? -1 : sa < sb ? 1 : 0 // ⑤ seq 최근 우선
  }
  Object.keys(idx).forEach((k) => idx[k].sort(cmp))
  return idx
}

/** 그 달 6주 격자 — 앞뒤월 칸을 포함해 항상 42칸(월마다 높이가 뛰지 않게) */
const buildMatrix = (ym) => {
  const first = `${ym}01`
  const { firstDow } = mdate.monthMeta(ym)
  const today = mdate.getToday()
  const start = mdate.addDay(first, -firstDow) // 그 주 일요일부터
  return Array.from({ length: 42 }, (_, i) => {
    const ymd = mdate.addDay(start, i)
    return {
      ymd,
      dd: Number(ymd.slice(6, 8)),
      dow: i % 7,
      inMonth: ymd.slice(0, 6) === ym,
      today: ymd === today,
    }
  })
}

const MocaReactScheduleCalendar = forwardRef(function MocaReactScheduleCalendar({
  schedules, dayInfo, hideOutside = false,
  startYm, header = true, menuButton = false, todayFlag = false,
  dayRenderer, onMonthChange, onDayClick, onMenuClick,
  className, style,
}, ref) {
  const [ym, setYmState] = useState(() => String(startYm || mdate.getToday().slice(0, 6)).slice(0, 6))

  // 명령형 setData 로 들어온 값(있으면 props 보다 우선) — MOCA 계약과 React 방식을 함께 지원
  const [ov, setOv] = useState(null)
  const list = ov?.schedules ?? schedules ?? EMPTY_ARR
  const info = ov?.dayInfo ?? dayInfo ?? EMPTY_OBJ
  const hideOut = ov?.hideOutside ?? hideOutside

  // refresh() 는 리렌더만 유발한다 — React 는 데이터가 바뀌면 자동으로 다시 그리므로
  // MOCA 호환용 훅이다(dayRenderer 안에서 외부 값을 읽는 화면이 강제로 다시 그릴 때)
  const [, setNonce] = useState(0)
  const idx = useMemo(() => indexSchedules(list), [list])
  const matrix = useMemo(() => buildMatrix(ym), [ym])

  const go = useCallback((next) => {
    const v = String(next).slice(0, 6)
    if (v === ym) return
    setYmState(v)
    onMonthChange?.(v)
  }, [ym, onMonthChange])

  // deps 생략 — ref API 는 항상 지금 값·props 를 봐야 한다(다른 달력 컴포넌트와 같은 이유)
  useImperativeHandle(ref, () => ({
    setData: (d) => setOv({
      schedules: d?.schedules ?? EMPTY_ARR,
      dayInfo: d?.dayInfo ?? EMPTY_OBJ,
      hideOutside: !!d?.hideOutside,
    }),
    // 그 날 목록 — 화면 순서 그대로. setData 가 만들어 둔 인덱스라 서버 재조회가 필요 없다.
    // 각 항목 = 아이템 사본 + pos + ymd (MOCA 반환 규격)
    getDayItems: (ymd) => (idx[ymd] ?? []).map((b) => ({ ...b.it, pos: b.pos, ymd: b.ymd })),
    getDayInfo: (ymd) => ({ ...(info[ymd] ?? {}) }),
    getYm: () => ym,
    setYm: (v) => go(v),
    today: () => go(mdate.getToday().slice(0, 6)),
    next: () => go(mdate.shiftYm(ym, 1)),
    prev: () => go(mdate.shiftYm(ym, -1)),
    refresh: () => setNonce((n) => n + 1),
  }))

  // ── 좌우 스와이프로 월 이동 (모바일 — MOCA 동일 UX) ──
  const bodyRef = useRef(null)
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    let sx = 0
    let sy = 0
    let active = false
    const onDown = (e) => {
      if (!e.isPrimary || e.pointerType === 'mouse') return // 마우스는 헤더 버튼으로
      sx = e.clientX
      sy = e.clientY
      active = true
    }
    const onUp = (e) => {
      if (!active) return
      active = false
      const dx = e.clientX - sx
      const dy = e.clientY - sy
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return // 가로로 충분히 움직였을 때만
      go(mdate.shiftYm(ym, dx < 0 ? 1 : -1)) // 왼쪽으로 밀면 다음 달
    }
    const onCancel = () => { active = false }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
    }
  }, [ym, go])

  /** 일정 바 하나 (MOCA _barsHtml 이식)
   *  시작·단일: [마커][◆중요][이모지][제목] / 종료일: [제목][이모지][마커] 우측정렬 / 중간일: 색깔만.
   *  완료: 배경 없음 + 취소선 + 마커·아이콘 숨김. 제목 공백은 제거(좁은 칸에서 글자 수 확보). */
  const bar = (b, i) => {
    const it = b.it
    const done = !!it.done
    const fg = it.fg || 'var(--msc-text)'
    const style = done ? undefined : { background: it.bg || 'var(--msc-primary-l)', color: fg }
    const mark = done ? null : <i className="msc-mark" style={{ background: it.mark || fg }} />
    const title = <em>{String(it.title ?? '').replace(/\s/g, '')}</em>
    const ico = done ? null : it.ico || null
    return (
      <span key={`${it.seq ?? it.start}-${i}`} className={`msc-bar msc-bar-${b.pos}${done ? ' msc-bar-done' : ''}`} style={style} title={it.title}>
        {b.pos === 'e' ? (
          <>{title}{ico}{mark}</>
        ) : b.pos === 'm' ? null : (
          <>{mark}{it.crucial && <b className="msc-cru">◆</b>}{ico}{title}</>
        )}
      </span>
    )
  }

  /** 날짜 영역 — 공휴일이면 이름을 날짜 위에 얹고 날씨·뱃지를 오른쪽에 둔다(MOCA _dateHtml) */
  const dateArea = (day, di) => {
    const meta = (di.wthr || di.badges?.length) ? (
      <span className="msc-meta">
        {di.wthr && <i className="msc-wthr">{di.wthr}</i>}
        {di.badges?.length ? <i className="msc-badge">{di.badges.join('')}</i> : null}
      </span>
    ) : null

    if (!di.holi) {
      return (
        <span className="msc-datewrap">
          <span className={`msc-date${day.today ? ' msc-now' : ''}`}>{day.dd}</span>
          {meta}
        </span>
      )
    }
    return (
      <span className="msc-datewrap msc-date-holiday">
        <span className="msc-date-top">
          <span className="msc-holi">{di.holi}</span>
          {meta}
        </span>
        <span className={`msc-date${day.today ? ' msc-now' : ''}`}>{day.dd}</span>
      </span>
    )
  }

  return (
    <div className={`msc${className ? ` ${className}` : ''}`} style={style}>
      {header && (
        <div className="msc-head">
          {menuButton && (
            <button type="button" className="msc-hbtn msc-menu" title="메뉴" onClick={() => onMenuClick?.()}>☰</button>
          )}
          <button type="button" className="msc-hbtn" title="이전 달" onClick={() => go(mdate.shiftYm(ym, -1))}>‹</button>
          <span className="msc-title">{ym.slice(0, 4)}.{ym.slice(4, 6)}</span>
          <button type="button" className="msc-hbtn" title="다음 달" onClick={() => go(mdate.shiftYm(ym, 1))}>›</button>
          <button type="button" className="msc-hbtn msc-today-btn" title="오늘" onClick={() => go(mdate.getToday().slice(0, 6))}>오늘</button>
        </div>
      )}

      <div className="msc-week">
        {WEEK.map((w, i) => (
          <span key={w} className={i === 0 ? 'msc-sun' : i === 6 ? 'msc-sat' : ''}>{w}</span>
        ))}
      </div>

      <div className="msc-body" ref={bodyRef}>
        {matrix.map((day, ci) => {
          // 표시 월 밖 칸 — hideOutside 면 일정·메타를 그리지 않고 날짜만 남긴다(MOCA 규약)
          const muted = !day.inMonth
          const skip = muted && hideOut
          const di = skip ? EMPTY_OBJ : (info[day.ymd] ?? EMPTY_OBJ)
          const bars = skip ? EMPTY_ARR : (idx[day.ymd] ?? EMPTY_ARR)
          return (
            <div
              key={day.ymd}
              className={`msc-day${muted ? ' msc-out' : ''}${day.today ? ' msc-today' : ''}${day.dow === 0 ? ' msc-sun' : day.dow === 6 ? ' msc-sat' : ''}`}
              onClick={() => onDayClick?.(day)}
            >
              {/* 오늘 깃발 — 첫 주는 위 공간이 없어 칸 안쪽에 세운다(MOCA 동일) */}
              {todayFlag && day.today && day.inMonth && (
                <span className={`msc-flag${ci < 7 ? ' msc-flag-in' : ''}`}>TODAY</span>
              )}
              {dateArea(day, di)}
              {dayRenderer && !skip && <span className="msc-dayextra">{dayRenderer(day)}</span>}
              <span className="msc-day-body">{bars.map(bar)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default MocaReactScheduleCalendar
