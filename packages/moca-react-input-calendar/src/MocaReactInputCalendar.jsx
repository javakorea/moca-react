import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import mdate from './date.js'
import { format, makeRange, normalize, pad2, resolveType } from './calCore.js'
import CalPanel from './CalPanel.jsx'
import './MocaReactInputCalendar.css'

// MOCA React InputCalendar — 입력칸 + 달력 팝업으로 날짜를 고르는 컴포넌트
// (MOCA inputCalendar 이식 — 데모 TPL042 대응)
//
// ── 한 속성이 전부를 정한다: dateType ──────────────────────────────────────
//   "이 달력이 무엇을 고르는가"를 화면이 dateType 하나로 선언하면, 값 자릿수 · 팝업 모드 ·
//   기본 표시형식이 전부 여기서 파생된다 (MOCA data-m-datetype 과 같은 계약).
//     yyyy           연 선택        값 4자리   팝업: 연 목록(연대 10년)
//     yyyyMM         연월 선택      값 6자리   팝업: 월 목록(12개월)
//     yyyyMMdd       일자 선택(기본) 값 8자리   팝업: 일자 격자
//     yyyyMMddHHmm   일시(분)       값 12자리  일자 격자 + 시·분 → [확인]
//     yyyyMMddHHmmss 일시(초)       값 14자리  일자 격자 + 시·분·초 → [확인]
//   대소문자·구분자는 무시한다('yyyyMMdd hh:mm:ss' = 'yyyyMMddHHmmss'). 별칭: year/month/date/day/datetime.
//   타입 파생·정규화·범위 판정 규칙은 calCore.js 에 있다(기간 달력과 공유).
//
// ── 값과 표시는 다르다 (MOCA 규약) ─────────────────────────────────────────
//   값은 언제나 "숫자만 있는 문자열"이고(서버·SQL 과 그대로 주고받는다), 화면 표시는
//   displayFormat 의 '#' 마스크가 만든다('####-##-##' → 2026-08-15).
//   setValue 는 타입 자릿수로 맞춘다 — 넘치면 자르고, 모자라면 월·일은 01, 시각은 00 으로 채운다.
//
// props
//   dateType     : 위 5종(기본 'yyyyMMdd')
//   value        : 제어 모드 값(숫자문자열). onChange 와 함께 쓴다
//   defaultValue : 비제어 초기값 — 숫자문자열 또는 상대일 표현('오늘' · '7일전' · '3개월전' · '당월' …)
//   onChange     : (value) => void — 값이 바뀔 때(제어 모드 필수)
//   onDateSelected : (value) => void — 값이 확정될 때(팝업 선택·타이핑 확정). MOCA data-m-ondateselected 대응
//   displayFormat: '#' 마스크(기본은 dateType 의 기본형식)
//   dateMin / dateMax : 선택가능 범위(yyyyMMdd) — 범위 밖 칸·이동버튼·[오늘]이 잠기고
//                  직접 타이핑도 확정 시 거부한다 (MOCA data-m-datemin/datemax)
//   readOnly     : 잠금(팝업도 열리지 않는다)
//   placeholder / className / style / width
//
// ref (imperative — MOCA 메서드 대응)
//   getValue() / setValue(v) / setReadOnly(b) / clear() / focus()

const MocaReactInputCalendar = forwardRef(function MocaReactInputCalendar({
  dateType = 'yyyyMMdd', value, defaultValue, onChange, onDateSelected,
  displayFormat, dateMin, dateMax, readOnly = false,
  placeholder, className, style, width,
}, ref) {
  const type = useMemo(() => resolveType(dateType), [dateType])
  const mask = displayFormat ?? type.fmt
  const range = useMemo(() => makeRange(dateMin, dateMax), [dateMin, dateMax])

  // 비제어 초기값 — 상대일 표현을 해석해 타입 자릿수로 맞춘다
  const [inner, setInner] = useState(() => normalize(mdate.resolveRelative(defaultValue), type.digits))
  const isControlled = value !== undefined
  const val = isControlled ? normalize(value, type.digits) : inner

  const [ro, setRo] = useState(readOnly)
  useEffect(() => setRo(readOnly), [readOnly])

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('') // 타이핑 중 원문(확정 전)
  const [typing, setTyping] = useState(false)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const popRef = useRef(null)

  // 팝업 상태 — 보고 있는 기준(연월/연대)과 시각 선택값
  const [viewYm, setViewYm] = useState(() => (val ? val.slice(0, 6) : mdate.getToday().slice(0, 6)))
  const [decade, setDecade] = useState(() => Math.floor(Number((val || mdate.getToday()).slice(0, 4)) / 10) * 10)
  const [time, setTime] = useState(() => ({
    h: val.slice(8, 10) || '00', m: val.slice(10, 12) || '00', s: val.slice(12, 14) || '00',
  }))

  const commit = (next, fire = true) => {
    const v = normalize(next, type.digits)
    if (!range.valueOk(v)) return false // 범위 밖 — 거부(MOCA 동일)
    if (!isControlled) setInner(v)
    onChange?.(v)
    if (fire) onDateSelected?.(v)
    return true
  }

  // deps 생략 — ref API 는 항상 "지금" 값·props 를 봐야 한다(매 렌더 갱신이 의도).
  // 목록을 적으면 commit 클로저가 낡아 setValue 가 옛 범위·옛 타입으로 판정한다
  useImperativeHandle(ref, () => ({
    getValue: () => val,
    setValue: (v) => commit(v, false), // API 세팅은 이벤트 미발화 (MOCA setValue 동일)
    setReadOnly: (b) => setRo(!!b),
    clear: () => commit('', false),
    focus: () => inputRef.current?.focus(),
  }))

  // 팝업 열기 — 기준 위치(보는 달·연대)와 시각을 현재 값으로 맞춘 뒤 연다.
  // effect(open 감시)가 아니라 여는 이벤트에서 하는 이유: effect 로 하면 팝업이 열려 있는 동안
  // 값이 바뀔 때마다(일시 타입에서 날짜 클릭) 보고 있던 달·고른 시각이 되돌아간다
  const openPop = () => {
    const base = val || mdate.getToday()
    setViewYm(base.slice(0, 6))
    setDecade(Math.floor(Number(base.slice(0, 4)) / 10) * 10)
    if (type.timeParts > 0) {
      setTime({ h: val.slice(8, 10) || '00', m: val.slice(10, 12) || '00', s: val.slice(12, 14) || '00' })
    }
    setOpen(true)
  }

  // 바깥 클릭 · ESC 로 닫기 — 팝업은 body 로 portal 되므로 rootRef 만 보면 안 된다(팝업 클릭이 바깥으로 잡힘)
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

  // ── 팝업 위치 ──
  // 팝업을 body 로 portal + fixed 로 띄운다: 업무 화면의 달력은 폼·패널처럼 overflow:auto 인
  // 스크롤 영역 안에 놓이는 게 흔한데, absolute 로 두면 그 경계에서 잘린다(실측). fixed 는
  // 잘리지 않으므로 입력칸 좌표를 계산해 붙이고, 스크롤·리사이즈 때 다시 계산한다.
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const place = useCallback(() => {
    const box = rootRef.current?.getBoundingClientRect()
    if (!box) return
    const ph = popRef.current?.offsetHeight ?? 250
    const pw = popRef.current?.offsetWidth ?? 240
    const below = box.bottom + 2
    const flipUp = below + ph > window.innerHeight && box.top - 2 - ph >= 0
    setPos({
      top: flipUp ? box.top - 2 - ph : below,
      left: Math.max(4, Math.min(box.left, window.innerWidth - pw - 4)), // 오른쪽 넘침 보정
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    // capture 로 들어야 안쪽 스크롤 컨테이너(폼·패널)의 스크롤까지 잡힌다
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, type.mode, place])

  const today = mdate.getToday()

  const pick = (picked) => {
    if (type.timeParts === 0) {
      if (commit(picked)) setOpen(false)
      return
    }
    // 일시 타입 — 날짜만 갱신하고 팝업은 열어둔다([확인]으로 확정. MOCA 동일)
    const t = `${time.h}${time.m}${type.timeParts === 3 ? time.s : ''}`
    commit(`${picked}${t}`, false)
  }

  const confirmTime = () => {
    const base = (val || today).slice(0, 8)
    const t = `${time.h}${time.m}${type.timeParts === 3 ? time.s : ''}`
    if (commit(`${base}${t}`)) setOpen(false)
  }

  /* [오늘] — **오늘을 고른다**(보기만 옮기지 않는다). MOCA 원본도 오늘로 값을 넣고 닫는다
     (inputCalendar.js 의 btn_today → calendarDateBtnEventSetting). 보기만 옮기면 "눌러도
     아무 일이 없다"로 보이고, 기간 달력의 빠른선택 [오늘](값을 넣는다)과 같은 이름이라
     더 헷갈린다(사용자 지적 2026-08-19).
     고르는 단위(연/월/일)에 맞춰 오늘을 잘라 넣는다 — 연 달력이면 올해, 월 달력이면 이번 달. */
  const goToday = () => {
    pick(today.slice(0, type.digits > 8 ? 8 : type.digits))
  }

  const move = (dir) => {
    if (type.mode === 'year') setDecade((d) => d + dir * 10)
    else if (type.mode === 'month') setViewYm((ym) => mdate.shiftYm(ym, dir * 12))
    else setViewYm((ym) => mdate.shiftYm(ym, dir))
  }

  const title = type.mode === 'year'
    ? `${decade} ~ ${decade + 9}`
    : type.mode === 'month'
      ? `${String(viewYm).slice(0, 4)}년`
      : `${String(viewYm).slice(0, 4)}년 ${Number(String(viewYm).slice(4, 6))}월`

  // 시·분·초 셀렉트
  const timeSelect = (unit, count) => (
    <select
      className="mic-time-sel"
      value={time[unit]}
      onChange={(e) => setTime((t) => ({ ...t, [unit]: e.target.value }))}
    >
      {Array.from({ length: count }, (_, i) => pad2(i)).map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  )

  return (
    <div ref={rootRef} className={`mic${ro ? ' mic-ro' : ''}${className ? ` ${className}` : ''}`} style={{ ...(width ? { width } : null), ...style }}>
      <div className="mic-box">
        <input
          ref={inputRef}
          className="mic-input"
          type="text"
          value={typing ? text : format(val, mask)}
          placeholder={placeholder ?? mask.replace(/#/g, '0')}
          readOnly={ro}
          maxLength={mask.length || type.digits}
          onChange={(e) => { setTyping(true); setText(e.target.value) }}
          onBlur={() => {
            if (!typing) return
            setTyping(false)
            const digits = text.replace(/[^\d]/g, '')
            if (digits === '') { commit(''); return }
            if (!commit(digits)) {
              // 범위 밖 타이핑 — 값은 그대로 두고 표시만 되돌린다(MOCA 도 확정 시 거부)
              console.warn(`MocaReactInputCalendar: 입력값 ${digits} 은 선택가능 범위(${dateMin ?? '-'} ~ ${dateMax ?? '-'}) 밖입니다.`)
            }
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />
        <button
          type="button"
          className="mic-btn"
          title="달력"
          disabled={ro}
          onClick={() => (open ? setOpen(false) : openPop())}
        >
          📅
        </button>
      </div>

      {open && !ro && createPortal(
        <div ref={popRef} className="mic-pop" style={{ top: pos.top, left: pos.left }}>
          <CalPanel
            mode={type.mode}
            viewYm={viewYm}
            decade={decade}
            selected={val}
            range={range}
            title={title}
            onPick={pick}
            onMove={move}
            onToday={goToday}
          />

          {/* 시각 선택 + 확인 — 일시 타입만 (MOCA: 일자 격자 + 시·분 → [확인] 으로 확정).
              **초는 고르지 않는다**(사용자 지시 2026-08-19) — 칸이 하나 늘 만큼 쓸모가 없다.
              값의 초 자리는 팝업을 열 때 읽은 것을 그대로 유지한다(기본 00). */}
          {type.timeParts > 0 && (
            <div className="mic-foot">
              <div className="mic-time">
                {timeSelect('h', 24)}<i>시</i>
                {timeSelect('m', 60)}<i>분</i>
              </div>
              <button type="button" className="mic-ok" onClick={confirmTime}>확인</button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
})

export default MocaReactInputCalendar
