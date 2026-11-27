import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import mdate from './date.js'
import { format, makeRange, normalize, pad2, resolveType, withinMaxTerm } from './calCore.js'
import CalPanel from './CalPanel.jsx'
import './MocaReactInputCalendar.css'

// MOCA React MultiCalendar — 기간(from~to)을 고르는 컴포넌트
// (MOCA inputMultiCalendar 이식 — 데모 TPL043 대응)
//
// ── 한 컴포넌트가 두 칸을 관리한다 ─────────────────────────────────────────
//   입력칸 두 개(from · to)와 팝업의 달력 두 판(좌 = from, 우 = to)이 한 컴포넌트다.
//   dateType 은 단일 달력과 같은 계약이고(값 자릿수·팝업 모드·기본 표시형식이 파생),
//   기간이라서 더해지는 것은 셋이다:
//     · 빠른선택(quickItems) — 팝업 왼쪽에 '오늘/금주/당월/전월/당분기/당년' 버튼
//     · 최대 기간(maxTermByDay/Month/Year) — 넘기면 선택을 거부한다
//     · from > to 보정 — 한쪽을 고쳐 순서가 뒤집히면 반대쪽이 따라온다
//
// props
//   dateType   : 'yyyy' | 'yyyyMM' | 'yyyyMMdd'(기본) | 'yyyyMMddHHmm' | 'yyyyMMdd hh:mm:ss'
//   from / to  : 제어 모드 값(숫자문자열) — onChange 와 함께 쓴다
//   defaultValue : 비제어 초기 기간 — 프리셋 문구('당월' · '금주' · '전월' · '당분기' · '당년' ·
//                  '오늘' · '7일전' …) 또는 { from, to } 객체
//   onChange   : ({ from, to }) => void — 값이 바뀔 때
//   onTermSelected : ({ from, to }) => void — 기간이 확정될 때(팝업 선택·빠른선택·타이핑 확정)
//   displayFormat : '#' 마스크(기본은 dateType 의 기본형식)
//   quickItems : 빠른선택 버튼 목록 — 문자열('오늘,금주,당월') 또는 배열.
//                기본값은 MOCA 와 동일한 10종. false/빈값이면 버튼 영역을 숨긴다
//   maxTermByDay / maxTermByMonth / maxTermByYear : 최대 기간(MOCA data-m-maxtermby*)
//   dateMin / dateMax : 선택가능 범위 — 좌·우 달력 모두 범위 밖 칸·이동버튼이 잠긴다
//   readOnly / className / style / width
//
// ref (imperative — MOCA 메서드 대응)
//   getValue()  : from (MOCA getValue 가 from 을 준다)
//   getTerm()   : { from, to } — React 판 편의 API
//   setFrom(v) / setTo(v) / setMultiCalendar({from,to}) / setReadOnly(b) / clear()

const DEFAULT_QUICK = '오늘,전일,금주,전주,당월,전월,당분기,전분기,당년,전년'

const MocaReactMultiCalendar = forwardRef(function MocaReactMultiCalendar({
  dateType = 'yyyyMMdd', from, to, defaultValue, onChange, onTermSelected,
  displayFormat, quickItems = DEFAULT_QUICK,
  maxTermByDay, maxTermByMonth, maxTermByYear,
  dateMin, dateMax, readOnly = false, className, style, width,
}, ref) {
  const type = useMemo(() => resolveType(dateType, 'MocaReactMultiCalendar'), [dateType])
  const mask = displayFormat ?? type.fmt
  const range = useMemo(() => makeRange(dateMin, dateMax), [dateMin, dateMax])
  const maxTerm = { maxTermByDay, maxTermByMonth, maxTermByYear }

  // 비제어 초기값 — 프리셋 문구('당월')나 { from, to } 를 타입 자릿수로 맞춘다.
  // 종료쪽(to)은 isEnd=true 로 채워 시각이 23:59:59 가 된다(일시 타입에서 그 날 하루가 빠지지 않게)
  const [inner, setInner] = useState(() => {
    const t = typeof defaultValue === 'object' && defaultValue
      ? defaultValue
      : mdate.resolveTerm(defaultValue)
    return {
      from: normalize(t?.from, type.digits),
      to: normalize(t?.to, type.digits, true),
    }
  })
  const isControlled = from !== undefined || to !== undefined
  const term = isControlled
    ? { from: normalize(from, type.digits), to: normalize(to, type.digits, true) }
    : inner

  const [ro, setRo] = useState(readOnly)
  useEffect(() => setRo(readOnly), [readOnly])

  const [open, setOpen] = useState(false)
  const [typing, setTyping] = useState(null) // { side, text } — 타이핑 중인 칸
  const rootRef = useRef(null)
  const popRef = useRef(null)
  const snapRef = useRef(null) // 팝업을 열 때의 기간 — [취소] 로 되돌릴 기준

  // 좌·우 달력이 보고 있는 기준(각각 독립) + 시각
  const base = () => term.from || mdate.getToday()
  const [viewL, setViewL] = useState(() => base().slice(0, 6))
  const [viewR, setViewR] = useState(() => mdate.shiftYm((term.to || base()).slice(0, 6), 0))
  const [decL, setDecL] = useState(() => Math.floor(Number(base().slice(0, 4)) / 10) * 10)
  const [decR, setDecR] = useState(() => Math.floor(Number((term.to || base()).slice(0, 4)) / 10) * 10)
  const [timeL, setTimeL] = useState({ h: '00', m: '00', s: '00' })
  const [timeR, setTimeR] = useState({ h: '23', m: '59', s: '59' })

  /** 기간 확정 — 범위·최대기간을 검사하고 from>to 는 보정한다.
   *  reason: 'from' | 'to' | 'quick' — 어느 쪽을 고쳐서 생긴 변경인지(보정 방향 결정) */
  const commit = (next, { fire = true, reason = 'quick' } = {}) => {
    let f = normalize(next.from, type.digits)
    let t = normalize(next.to, type.digits, true)

    if (!range.valueOk(f) || !range.valueOk(t)) return false // 범위 밖 — 거부

    // from > to 보정 — 방금 고친 쪽을 살리고 반대쪽이 따라온다(MOCA 동일)
    if (f && t && f > t) {
      if (reason === 'to') f = t
      else t = f
    }

    if (!withinMaxTerm(f, t, maxTerm)) {
      console.warn(`MocaReactMultiCalendar: 최대 기간을 넘어 선택이 거부되었습니다 (${f}~${t}).`)
      return false
    }

    /* 값이 바뀐 쪽 달력을 그 달로 옮긴다 (MOCA 의 dateViewSetting 대응).
       없으면 빠른선택('전월')로 값만 7월이 되고 두 판은 8월을 보고 있어 **아무것도 칠해지지
       않는다** — "눌러도 반응이 없다"로 보인다(2026-08-19 실측으로 확인).
       from>to 보정으로 반대쪽이 따라 바뀐 경우에도 그 판이 함께 움직여야 한다.
       **바뀐 쪽만** 옮기는 것이 요점 — 한 판에서 달을 넘겨 보다가 다른 판을 고르면
       보던 달이 제자리로 튕겨서는 안 된다. */
    if (f !== term.from && f) {
      setViewL(f.slice(0, 6))
      setDecL(Math.floor(Number(f.slice(0, 4)) / 10) * 10)
    }
    if (t !== term.to && t) {
      setViewR(t.slice(0, 6))
      setDecR(Math.floor(Number(t.slice(0, 4)) / 10) * 10)
    }

    const v = { from: f, to: t }
    if (!isControlled) setInner(v)
    onChange?.(v)
    if (fire) onTermSelected?.(v)
    return true
  }

  // deps 생략 — ref API 는 항상 지금 값·props 를 봐야 한다(단일 달력과 같은 이유)
  useImperativeHandle(ref, () => ({
    getValue: () => term.from, // MOCA getValue() 는 from 을 준다
    getTerm: () => ({ ...term }),
    setFrom: (v) => commit({ from: v, to: term.to }, { fire: false, reason: 'from' }),
    setTo: (v) => commit({ from: term.from, to: v }, { fire: false, reason: 'to' }),
    setMultiCalendar: (t) => commit(t ?? {}, { fire: false }),
    setReadOnly: (b) => setRo(!!b),
    clear: () => commit({ from: '', to: '' }, { fire: false }),
  }))

  const openPop = () => {
    const f = term.from || mdate.getToday()
    const t = term.to || f
    setViewL(f.slice(0, 6))
    setViewR(t.slice(0, 6))
    setDecL(Math.floor(Number(f.slice(0, 4)) / 10) * 10)
    setDecR(Math.floor(Number(t.slice(0, 4)) / 10) * 10)
    if (type.timeParts > 0) {
      setTimeL({ h: f.slice(8, 10) || '00', m: f.slice(10, 12) || '00', s: f.slice(12, 14) || '00' })
      setTimeR({ h: t.slice(8, 10) || '23', m: t.slice(10, 12) || '59', s: t.slice(12, 14) || '59' })
    }
    // [취소] 로 되돌릴 기준 — 팝업을 여는 순간의 값. 팝업 안에서 고른 것은 전부 "고르는 중"이고
    // 확정은 [확인] 에서만 하므로, 취소하면 여기로 되돌린다
    snapRef.current = { ...term }
    setOpen(true)
  }

  /** [취소] — 팝업을 열 때의 기간으로 되돌리고 닫는다(확정 이벤트 없음) */
  const cancelPop = () => {
    const s = snapRef.current
    if (s) commit(s, { fire: false, reason: 'quick' })
    setOpen(false)
  }

  /** [확인] — 지금 고른 기간을 확정한다(onTermSelected). 일시 타입은 고른 시각을 붙여 확정 */
  const okPop = () => {
    if (type.timeParts > 0) {
      const f = term.from ? withTime(term.from.slice(0, 8), 'from') : ''
      const t2 = term.to ? withTime(term.to.slice(0, 8), 'to') : ''
      if (!commit({ from: f, to: t2 })) return // 범위·최대기간 위반 — 열어 둔 채 고치게 한다
    } else {
      onTermSelected?.({ ...term })
    }
    setOpen(false)
  }

  // 바깥 클릭 · ESC 로 닫기 (팝업이 portal 이라 popRef 도 함께 본다)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 팝업 위치 — body portal + fixed (스크롤 영역에서 잘리지 않게. 단일 달력과 같은 방식)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const place = useCallback(() => {
    const box = rootRef.current?.getBoundingClientRect()
    if (!box) return
    const ph = popRef.current?.offsetHeight ?? 300
    const pw = popRef.current?.offsetWidth ?? 560
    const below = box.bottom + 2
    const flipUp = below + ph > window.innerHeight && box.top - 2 - ph >= 0
    setPos({
      top: flipUp ? box.top - 2 - ph : below,
      left: Math.max(4, Math.min(box.left, window.innerWidth - pw - 4)),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, type.mode, place])

  const today = mdate.getToday()

  // 시각을 붙여 값 만들기 — 일시 타입일 때만 의미가 있다
  const withTime = (ymd, side) => {
    if (type.timeParts === 0) return ymd
    const t = side === 'to' ? timeR : timeL
    return `${ymd}${t.h}${t.m}${type.timeParts === 3 ? t.s : ''}`
  }

  /* 날짜를 고르는 것은 "고르는 중"일 뿐이다 — 확정(onTermSelected)은 [확인] 에서만 한다(MOCA 동일).
     기간은 두 번 골라야 완성되므로, 한 번 고를 때마다 확정 이벤트를 쏘면 반쪽짜리 기간으로
     조회가 돌아간다. 값 자체(onChange)는 즉시 반영해 화면에 보인다. */
  const pickFrom = (v) => commit({ from: withTime(v, 'from'), to: term.to }, { fire: false, reason: 'from' })
  const pickTo = (v) => commit({ from: term.from, to: withTime(v, 'to') }, { fire: false, reason: 'to' })

  // 빠른선택 — 프리셋 문구를 기간으로 바꿔 넣고 팝업을 닫는다(MOCA selecteritem)
  const quicks = useMemo(() => {
    if (!quickItems) return []
    const arr = Array.isArray(quickItems) ? quickItems : String(quickItems).split(',')
    return arr.map((s) => s.trim()).filter(Boolean)
  }, [quickItems])

  /* 빠른선택(당월·전분기…) — 기간만 넣고 **닫지 않는다.** 눌러 보고 "이 기간이 맞나" 확인한 뒤
     [확인] 으로 확정하게 한다(사용자 지적 2026-08-19). 바로 닫으면 잘못 눌렀을 때 다시 열어야 하고,
     여러 프리셋을 견줘 볼 수도 없다. */
  const applyQuick = (label) => {
    const t = mdate.resolveTerm(label)
    if (!t) return
    commit(t, { fire: false, reason: 'quick' })
  }

  // 기간 사이 칸 강조 — 표시 자릿수에 맞춰 접두 비교
  const between = (v) => {
    const n = v.length
    const f = term.from.slice(0, n)
    const t = term.to.slice(0, n)
    return !!(f && t && v > f && v < t)
  }

  const titleOf = (view, dec) => (type.mode === 'year'
    ? `${dec} ~ ${dec + 9}`
    : type.mode === 'month'
      ? `${String(view).slice(0, 4)}년`
      : `${String(view).slice(0, 4)}년 ${Number(String(view).slice(4, 6))}월`)

  const moveOf = (side) => (dir) => {
    const setView = side === 'to' ? setViewR : setViewL
    const setDec = side === 'to' ? setDecR : setDecL
    if (type.mode === 'year') setDec((d) => d + dir * 10)
    else if (type.mode === 'month') setView((ym) => mdate.shiftYm(ym, dir * 12))
    else setView((ym) => mdate.shiftYm(ym, dir))
  }
  /* 각 판의 [오늘] — **그 판의 날짜를 오늘로 고른다**(보기만 옮기지 않는다. MOCA 동일).
     빠른선택 [오늘]이 "시작·종료 둘 다 오늘"인 것과 달리, 이건 **그 한쪽만** 오늘로 바꾼다 —
     판마다 시작/종료 라벨이 붙어 있으므로 어느 쪽인지는 자리로 드러난다.
     보기 이동은 commit 이 알아서 한다(값이 바뀐 쪽만 그 달로 따라간다). */
  const todayOf = (side) => () => {
    const t = today.slice(0, type.digits > 8 ? 8 : type.digits)
    if (side === 'to') pickTo(t)
    else pickFrom(t)
  }

  // 입력칸 하나(from/to 공통)
  const sideInput = (side) => {
    const v = side === 'to' ? term.to : term.from
    const isTyping = typing?.side === side
    return (
      <input
        className="mic-input"
        type="text"
        value={isTyping ? typing.text : format(v, mask)}
        placeholder={mask.replace(/#/g, '0')}
        readOnly={ro}
        maxLength={mask.length || type.digits}
        onChange={(e) => setTyping({ side, text: e.target.value })}
        onBlur={() => {
          if (!isTyping) return
          const digits = typing.text.replace(/[^\d]/g, '')
          setTyping(null)
          const next = side === 'to' ? { from: term.from, to: digits } : { from: digits, to: term.to }
          if (!commit(next, { reason: side })) {
            console.warn(`MocaReactMultiCalendar: 입력값 ${digits} 은 허용 범위·최대기간을 벗어납니다.`)
          }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
    )
  }

  const timeSelect = (side, unit, count) => {
    const t = side === 'to' ? timeR : timeL
    const set = side === 'to' ? setTimeR : setTimeL
    return (
      <select className="mic-time-sel" value={t[unit]} onChange={(e) => set((p) => ({ ...p, [unit]: e.target.value }))}>
        {Array.from({ length: count }, (_, i) => pad2(i)).map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    )
  }

  /* 시·분만 고른다 — **초 셀렉트는 두지 않는다**(사용자 지시 2026-08-19).
     값의 초는 팝업을 열 때 읽은 것이 그대로 남는다(시작 00 · 종료 59). */
  /* 확정 줄 요약 — **초는 빼고** 보여준다. 고르지도 않는 두 자리 때문에 요약이 길어져
     [취소] 왼쪽에서 잘렸다(사용자 보고 2026-08-19). format 은 값이 마스크보다 짧으면
     남은 구분자를 안 붙이므로, 값만 잘라 넘기면 마스크는 그대로 써도 된다 */
  const brief = (v) =>
    format(type.timeParts === 3 ? String(v ?? '').slice(0, type.digits - 2) : v, mask) || '…'

  const timeFoot = (side) => (
    <div className="mic-time">
      {timeSelect(side, 'h', 24)}<i>시</i>
      {timeSelect(side, 'm', 60)}<i>분</i>
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={`mic mic-multi${ro ? ' mic-ro' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...(width ? { width } : null), ...style }}
    >
      <div className="mic-box">
        {sideInput('from')}
        <span className="mic-tilde">~</span>
        {sideInput('to')}
        <button
          type="button"
          className="mic-btn"
          title="기간 달력"
          disabled={ro}
          onClick={() => (open ? setOpen(false) : openPop())}
        >
          📅
        </button>
      </div>

      {open && !ro && createPortal(
        <div ref={popRef} className={`mic-pop mic-pop-multi${type.timeParts > 0 ? ' mic-pop-time' : ''}`} style={{ top: pos.top, left: pos.left }}>
          <div className="mic-multi-row">
            {/* 빠른선택 — 팝업 왼쪽 목록 (MOCA data-m-selecteritem) */}
            {quicks.length > 0 && (
              <div className="mic-quick">
                {quicks.map((q) => (
                  <button key={q} type="button" className="mic-quick-btn" onClick={() => applyQuick(q)}>{q}</button>
                ))}
              </div>
            )}

            {/* 좌: from */}
            <div className="mic-side">
              <div className="mic-side-label">시작</div>
              <CalPanel
                mode={type.mode}
                viewYm={viewL}
                decade={decL}
                selected=""
                edge={{ from: term.from, to: term.to }}
                inRangeSel={between}
                range={range}
                title={titleOf(viewL, decL)}
                onPick={pickFrom}
                onMove={moveOf('from')}
                onToday={todayOf('from')}
              />
              {type.timeParts > 0 && <div className="mic-foot">{timeFoot('from')}</div>}
            </div>

            {/* 우: to */}
            <div className="mic-side">
              <div className="mic-side-label">종료</div>
              <CalPanel
                mode={type.mode}
                viewYm={viewR}
                decade={decR}
                selected=""
                edge={{ from: term.from, to: term.to }}
                inRangeSel={between}
                range={range}
                title={titleOf(viewR, decR)}
                onPick={pickTo}
                onMove={moveOf('to')}
                onToday={todayOf('to')}
              />
              {type.timeParts > 0 && <div className="mic-foot">{timeFoot('to')}</div>}
            </div>
          </div>

          {/* 확정 줄 — **타입과 무관하게 항상 있다**(MOCA 기간 달력 동일).
              기간은 두 번 골라야 완성되므로 "다 골랐다"고 말할 자리가 필요하고, 잘못 골랐을 때
              되돌릴 [취소]도 있어야 한다. 지금 고른 기간을 그대로 보여줘 확인시킨다 */}
          <div className="mic-foot mic-foot-ok">
            <span className="mic-foot-hint">
              {term.from || term.to
                ? `${brief(term.from)} ~ ${brief(term.to)}`
                : '기간을 선택하세요'}
            </span>
            {/* 두 버튼은 **한 덩어리**로 묶는다 — 줄바꿈이 일어날 때 [취소]만 위에 남고
                [확인]이 아래로 떨어지는 것을 막는다(좁은 폭에서 실제로 그랬다) */}
            <div className="mic-foot-btns">
              <button type="button" className="mic-cancel" onClick={cancelPop}>취소</button>
              <button type="button" className="mic-ok" onClick={okPop}>확인</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
})

export default MocaReactMultiCalendar
