import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import mdate from './date.js'
import { makeRange, normalize, resolveType } from './calCore.js'
import CalPanel from './CalPanel.jsx'
import './MocaReactInputCalendar.css'

// MOCA React Calendar — 화면에 늘 펼쳐진 "붙박이" 날짜 선택 달력
// (MOCA calendar 이식 — 데모 TPL044 대응)
//
// inputCalendar 가 "입력칸 + 눌러서 뜨는 달력"이라면 이쪽은 팝업이 아니다 —
// 고른 날짜를 달력 위에서 눈으로 확인하는 것이 목적이다(예약일·근태·마감일 화면).
//
// ── 뷰 전환 (MOCA 동일) ────────────────────────────────────────────────────
//   dateType 이 기본 뷰를 정한다: yyyyMMdd → 일자 격자 · yyyyMM → 월 목록 · yyyy → 연 목록.
//   제목을 누르면 한 단계 위로 올라가고(일→월→연), 위 뷰에서 칸을 고르면 한 단계 내려온다.
//   그 타입의 뷰에서 칸을 고르면 값이 확정된다 — 먼 날짜로 빠르게 이동하는 통로다.
//
// ── 공휴일·비영업일은 컴포넌트가 모른다 ────────────────────────────────────
//   화면이 조회해서 dayInfo 로 알려준다(MOCA setData({dayInfo}) 규약):
//     { '20260815': { holi: '광복절', off: true, badge: '휴', class: '' } }
//   holi=공휴일명(빨간 날짜 + 칸에 이름) · off=비영업일(빗금) · badge=칸 우측 위 표식 ·
//   class=그 칸에 덧붙일 클래스. weekendOff 로 주말을 자동 비영업일 처리하되
//   dayInfo 의 off:false 가 그보다 우선한다("쉬는 토요일만 예외" 지정 가능).
//   달을 옮기면 onViewChange 가 발화하므로 그 자리에서 다시 조회한다.
//
// props
//   dateType   : 'yyyyMMdd'(기본) | 'yyyyMM' | 'yyyy'
//   value / defaultValue / onChange : 값(숫자문자열). defaultValue 는 상대일 표현 가능('오늘' …)
//   onSelect   : (value, view) => void — 값 확정 시 (MOCA data-m-onselect). setValue 는 미발화
//   onViewChange : (ym, view) => void — 표시 기준이 바뀔 때(이전/다음·오늘·뷰 전환).
//                  초기화 시에는 발화하지 않는다 — 첫 조회는 화면이 getViewYm() 으로 직접 한다(MOCA 동일)
//   dayInfo    : 위 업무 표시 데이터
//   weekendOff : true 면 토·일을 비영업일로 표시
//   legend     : true 면 달력 아래 범례 — 지금 달력에 실제로 있는 표시만 설명한다(MOCA 동일)
//   startYm    : 초기 표시 기준 연월(yyyyMM). 미지정 시 값이 가리키는 달, 값도 없으면 이번 달
//   header / todayButton : 헤더·[오늘] 버튼 표시(기본 true)
//   dateMin / dateMax : 선택가능 범위. 런타임 변경은 ref.setDateRange
//   readOnly   : 선택만 잠긴다(달 이동·둘러보기는 그대로 — MOCA 동일)
//
// ref (imperative — MOCA 메서드 대응)
//   getValue() / setValue(v)(선택 + 그 달로 이동, 이벤트 미발화) / clear()
//   setData({dayInfo}) / getDayInfo(ymd)
//   setDateRange(min, max) / getDateRange()
//   getViewYm() / setViewYm(ym) / today()(이동만) / next() / prev() / setReadOnly(b)

const EMPTY_INFO = {}

const MocaReactCalendar = forwardRef(function MocaReactCalendar({
  dateType = 'yyyyMMdd', value, defaultValue, onChange, onSelect, onViewChange,
  dayInfo, weekendOff = false, legend = false, startYm,
  header = true, todayButton = true,
  dateMin, dateMax, readOnly = false, className, style,
}, ref) {
  const type = useMemo(() => resolveType(dateType, 'MocaReactCalendar'), [dateType])

  const [inner, setInner] = useState(() => normalize(mdate.resolveRelative(defaultValue), type.digits))
  const isControlled = value !== undefined
  const val = isControlled ? normalize(value, type.digits) : inner

  const [ro, setRo] = useState(readOnly)
  useEffect(() => setRo(readOnly), [readOnly])

  // 선택가능 범위 — 속성이 기본이고 setDateRange 가 런타임에 덮는다(MOCA 우선순위 규약)
  const [rangeOv, setRangeOv] = useState(null)
  const effMin = rangeOv ? rangeOv.min : dateMin
  const effMax = rangeOv ? rangeOv.max : dateMax
  const range = useMemo(() => makeRange(effMin, effMax), [effMin, effMax])

  // 업무 표시 데이터 — props(dayInfo) 또는 setData 로 들어온 것.
  // 빈 기본값은 상수로 — 매 렌더 새 {} 를 만들면 아래 범례 useMemo 가 매번 다시 돈다
  const [dataOv, setDataOv] = useState(null)
  const info = dataOv ?? dayInfo ?? EMPTY_INFO

  // 지금 보고 있는 뷰와 기준 — 뷰는 타입 기본에서 시작하고 제목/칸 클릭으로 오르내린다
  const [view, setView] = useState(type.mode)
  useEffect(() => setView(type.mode), [type.mode])
  const [cursor, setCursor] = useState(() => {
    const base = startYm || (val ? val.slice(0, 6) : mdate.getToday().slice(0, 6))
    return String(base).slice(0, 6)
  })
  const [decade, setDecade] = useState(() => Math.floor(Number(cursor.slice(0, 4)) / 10) * 10)

  const commit = (next, fire = true) => {
    const v = normalize(next, type.digits)
    if (!range.valueOk(v)) return false
    if (!isControlled) setInner(v)
    onChange?.(v)
    if (fire) onSelect?.(v, view)
    return true
  }

  // 기준 이동 알림 — 화면이 그 달의 공휴일을 다시 조회하는 자리(MOCA onviewchange)
  const fireView = (ym, v) => onViewChange?.(String(ym).slice(0, 6), v)

  // deps 생략 — ref API 는 항상 지금 값·props 를 봐야 한다(다른 달력 컴포넌트와 같은 이유)
  useImperativeHandle(ref, () => ({
    getValue: () => val,
    setValue: (v) => {
      const nv = normalize(v, type.digits)
      if (!commit(nv, false)) return false
      // 선택 + "그 값이 보이는 달로 이동" 이 setValue 의 규약(MOCA 동일)
      if (nv) {
        setCursor(nv.slice(0, 6).padEnd(6, '0'))
        setDecade(Math.floor(Number(nv.slice(0, 4)) / 10) * 10)
        setView(type.mode)
      }
      return true
    },
    clear: () => commit('', false),
    setData: (d) => setDataOv(d?.dayInfo ?? {}),
    getDayInfo: (ymd) => ({ ...(info[ymd] ?? {}) }),
    setDateRange: (min, max) => setRangeOv({ min: min || undefined, max: max || undefined }),
    getDateRange: () => ({ min: effMin ?? '', max: effMax ?? '' }),
    getViewYm: () => cursor,
    setViewYm: (ym) => {
      const next = String(ym).slice(0, 6)
      if (next === cursor) return
      setCursor(next)
      setDecade(Math.floor(Number(next.slice(0, 4)) / 10) * 10)
      fireView(next, view)
    },
    today: () => { // 이동만 — 선택값은 건드리지 않는다(MOCA today())
      const t = mdate.getToday()
      if (view === 'year') { setDecade(Math.floor(Number(t.slice(0, 4)) / 10) * 10); fireView(t.slice(0, 6), view); return }
      if (t.slice(0, 6) !== cursor) { setCursor(t.slice(0, 6)); fireView(t.slice(0, 6), view) }
    },
    next: () => move(1),
    prev: () => move(-1),
    setReadOnly: (b) => setRo(!!b),
  }))

  const move = (dir) => {
    if (view === 'year') {
      const d = decade + dir * 10
      setDecade(d)
      fireView(`${d}01`, view)
      return
    }
    if (view === 'month') {
      const ym = `${Number(cursor.slice(0, 4)) + dir}${cursor.slice(4, 6)}`
      setCursor(ym)
      setDecade(Math.floor(Number(ym.slice(0, 4)) / 10) * 10)
      fireView(ym, view)
      return
    }
    const ym = mdate.shiftYm(cursor, dir)
    setCursor(ym)
    fireView(ym, view)
  }

  /* 헤더의 [오늘] — **오늘을 고른다**(달력 3종이 같은 동작이어야 한다는 사용자 판단 2026-08-19).
     ★ MOCA 원본은 여기만 "이동 전용"이다(calendar.js today(): "선택값은 그대로 — 이동 전용").
       붙박이 달력은 일정·공휴일을 둘러보는 용도로도 쓰여, 선택을 건드리지 않고 오늘 달로
       돌아가는 수단이 필요하다는 판단이었을 것이다. 우리는 세 달력의 [오늘]을 같은 동사로
       통일하는 쪽을 택했다 — 대신 **둘러보기 전용이 필요하면 readOnly** 로 쓰면 된다
       (아래처럼 선택이 잠긴 동안에는 종전대로 이동만 한다).
       ref 의 `today()` 는 문서대로 **이동 전용을 유지**한다 — 화면이 명시적으로 부르는 API 라
       버튼과 달리 의도가 분명하고, 바꾸면 쓰던 화면이 조용히 값을 잃는다. */
  const goToday = () => {
    const t = mdate.getToday()
    if (ro || view !== type.mode) { // 선택 잠김 · 상위 뷰(연/월 목록) — 이동만
      if (view === 'year') { setDecade(Math.floor(Number(t.slice(0, 4)) / 10) * 10); fireView(t.slice(0, 6), view); return }
      if (t.slice(0, 6) !== cursor) { setCursor(t.slice(0, 6)); fireView(t.slice(0, 6), view) }
      return
    }
    if (t.slice(0, 6) !== cursor) { setCursor(t.slice(0, 6)); fireView(t.slice(0, 6), view) }
    pick(t.slice(0, type.digits > 8 ? 8 : type.digits))
  }

  // 제목 클릭 — 한 단계 위로(일→월→연). 연 뷰에서는 더 올라갈 곳이 없다
  const drillUp = () => {
    if (view === 'year') return
    const next = view === 'day' ? 'month' : 'year'
    setView(next)
    fireView(cursor, next)
  }

  // 칸 클릭 — 타입의 뷰면 값 확정, 위 뷰면 한 단계 내려간다(MOCA 동일)
  const pick = (picked) => {
    if (view === type.mode) {
      if (ro) return // 선택만 잠긴다 — 이동·둘러보기는 그대로
      commit(picked)
      return
    }
    const next = view === 'year' ? 'month' : 'day'
    const ym = picked.length >= 6 ? picked.slice(0, 6) : `${picked}01`
    setCursor(ym)
    setDecade(Math.floor(Number(ym.slice(0, 4)) / 10) * 10)
    setView(next)
    fireView(ym, next)
  }

  const title = view === 'year'
    ? `${decade} ~ ${decade + 9}`
    : view === 'month'
      ? `${cursor.slice(0, 4)}년`
      : `${cursor.slice(0, 4)}년 ${Number(cursor.slice(4, 6))}월`

  // 범례 — 일자 뷰에서만, 그리고 "지금 달력에 실제로 있는 표시만" 설명한다(MOCA _legendHtml).
  // 없는 표시를 설명하면 화면이 시끄러워지고 사용자가 없는 규칙을 찾게 된다
  const legendItems = useMemo(() => {
    if (!legend || view !== 'day') return []
    const items = [{ key: 'today', cls: 'mic-lg-today', label: '오늘' }, { key: 'sel', cls: 'mic-lg-sel', label: '선택' }]
    const vals = Object.values(info)
    if (vals.some((d) => d?.holi)) items.push({ key: 'holi', cls: 'mic-lg-holi', label: '공휴일' })
    if (weekendOff || vals.some((d) => d?.off === true)) items.push({ key: 'off', cls: 'mic-lg-off', label: '비영업일' })
    return items
  }, [legend, view, info, weekendOff])

  return (
    <div className={`mrc${ro ? ' mrc-ro' : ''}${className ? ` ${className}` : ''}`} style={style}>
      <CalPanel
        mode={view}
        viewYm={cursor}
        decade={decade}
        selected={val}
        range={range}
        title={title}
        onPick={pick}
        onMove={move}
        onToday={goToday}
        dayInfo={info}
        weekendOff={weekendOff}
        onTitleClick={view === 'year' ? undefined : drillUp}
        showHeader={header}
        showToday={todayButton}
      />

      {legendItems.length > 0 && (
        <div className="mic-legend">
          {legendItems.map((it) => (
            <span key={it.key} className="mic-lg">
              <i className={it.cls} />{it.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})

export default MocaReactCalendar
