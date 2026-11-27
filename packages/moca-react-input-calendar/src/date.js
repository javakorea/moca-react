// 날짜 유틸 — MOCA moca.$g.date 대응 (숫자만 있는 문자열 기반)
//
// MOCA 규약: 날짜 값은 언제나 "숫자만 있는 문자열"이다 — 연 4('2026') · 연월 6('202608') ·
// 일자 8('20260815') · 일시 12/14. Date 객체를 값으로 쓰지 않는 이유는 서버(SQL)와
// 그대로 주고받고, 자릿수 자체가 "무엇을 고르는 값인가"를 말해주기 때문이다.

const p2 = (n) => String(n).padStart(2, '0')

/** 오늘 yyyyMMdd */
export const getToday = () => {
  const d = new Date()
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`
}

/** 지금 yyyyMMddHHmmss */
export const getNow = () => {
  const d = new Date()
  return `${getToday()}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`
}

/** yyyyMMdd → Date (로컬) */
export const toDate = (ymd) => {
  const s = String(ymd ?? '')
  if (s.length < 8) return null
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
  return isNaN(d.getTime()) ? null : d
}

/** Date → yyyyMMdd */
export const fromDate = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`

/** 일 더하기 — addDay('20260815', -1) → '20260814' */
export const addDay = (ymd, n) => {
  const d = toDate(ymd)
  if (!d) return ''
  d.setDate(d.getDate() + Number(n))
  return fromDate(d)
}

/** 월 더하기 — 말일 보정(1/31 +1개월 → 2/28) */
export const addMonth = (ymd, n) => {
  const d = toDate(ymd)
  if (!d) return ''
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + Number(n))
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return fromDate(d)
}

/** 연 더하기 */
export const addYear = (ymd, n) => addMonth(ymd, Number(n) * 12)

/** 그 달 1일 / 말일 (yyyyMMdd 또는 yyyyMM 허용) */
export const getFirstDayOfMonth = (ym) => `${String(ym).slice(0, 6)}01`
export const getLastDayOfMonth = (ym) => {
  const s = String(ym)
  const y = Number(s.slice(0, 4))
  const m = Number(s.slice(4, 6))
  return `${s.slice(0, 6)}${p2(new Date(y, m, 0).getDate())}`
}

/** 그 달 격자 정보 — 1일의 요일(0=일)과 일수 */
export const monthMeta = (ym) => {
  const y = Number(String(ym).slice(0, 4))
  const m = Number(String(ym).slice(4, 6))
  return { firstDow: new Date(y, m - 1, 1).getDay(), days: new Date(y, m, 0).getDate() }
}

/** 연월 이동 — shiftYm('202601', -1) → '202512' */
export const shiftYm = (ym, n) => {
  const y = Number(String(ym).slice(0, 4))
  const m = Number(String(ym).slice(4, 6)) + Number(n)
  const ny = y + Math.floor((m - 1) / 12)
  const nm = ((((m - 1) % 12) + 12) % 12) + 1
  return `${ny}${p2(nm)}`
}

/** 값이 범위 안인가 — 자릿수가 달라도 비교되게 같은 길이로 맞춰 비교 (MOCA inRange 대응) */
export const inRange = (value, min, max) => {
  const v = String(value ?? '')
  if (v === '') return true
  const cmp = (a, b) => {
    const n = Math.min(a.length, b.length)
    return a.slice(0, n).localeCompare(b.slice(0, n))
  }
  if (min && cmp(v, String(min)) < 0) return false
  if (max && cmp(v, String(max)) > 0) return false
  return true
}

/** 상대일 기본값 문법 — MOCA data-m-defaultvalue 대응.
 *  '오늘' · '전일'/'어제' · '내일' · 'N일전' · 'N일후' · 'N개월전' · 'N개월후' ·
 *  'N년전' · 'N년후' · '당월'(그 달 1일) · '전월' · 빈값. 숫자문자열을 주면 그대로 값이 된다. */
export const resolveRelative = (expr) => {
  const s = String(expr ?? '').trim()
  if (s === '') return ''
  if (/^\d+$/.test(s)) return s // 이미 값(숫자문자열)
  const today = getToday()
  if (s === '오늘') return today
  if (s === '전일' || s === '어제') return addDay(today, -1)
  if (s === '내일') return addDay(today, 1)
  if (s === '당월' || s === '이번달') return getFirstDayOfMonth(today)
  if (s === '전월') return getFirstDayOfMonth(addMonth(today, -1))
  const m = s.match(/^(\d+)\s*(일|개월|달|년)\s*(전|후)$/)
  if (m) {
    const n = Number(m[1]) * (m[3] === '전' ? -1 : 1)
    if (m[2] === '일') return addDay(today, n)
    if (m[2] === '년') return addYear(today, n)
    return addMonth(today, n) // 개월·달
  }
  console.warn(`MocaReactInputCalendar: defaultValue="${expr}" — 해석할 수 없는 상대일 표현이라 무시합니다.`)
  return ''
}

/** 요일 (0=일 … 6=토) */
export const getDow = (ymd) => toDate(ymd)?.getDay() ?? 0

/** 그 달의 날짜 목록 — [{ ymd, day, dow }] (MOCA getMonthMatrix 대응).
 *  화면이 공휴일·휴무 정보를 만들 때 그 달을 훑는 용도 예) 달력의 dayInfo 조립 */
export const getMonthMatrix = (ym) => {
  const base = String(ym).slice(0, 6)
  const { firstDow, days } = monthMeta(base)
  return Array.from({ length: days }, (_, i) => ({
    ymd: `${base}${String(i + 1).padStart(2, '0')}`,
    day: i + 1,
    dow: (firstDow + i) % 7,
  }))
}

/** 그 날이 속한 주의 시작(일요일)·종료(토요일) — MOCA getWeekTerm 규약(주는 일요일 시작) */
export const getWeekTerm = (ymd) => {
  const dow = getDow(ymd)
  return { from: addDay(ymd, -dow), to: addDay(ymd, 6 - dow) }
}

/** 그 날이 속한 분기의 시작·종료일 — MOCA getQuarterTerm */
export const getQuarterTerm = (ymd) => {
  const y = String(ymd).slice(0, 4)
  const q = Math.floor((Number(String(ymd).slice(4, 6)) - 1) / 3)
  return {
    from: `${y}${String(q * 3 + 1).padStart(2, '0')}01`,
    to: getLastDayOfMonth(`${y}${String(q * 3 + 3).padStart(2, '0')}01`),
  }
}

/** 그 해의 시작·종료일 */
export const getYearTerm = (ymd) => {
  const y = String(ymd).slice(0, 4)
  return { from: `${y}0101`, to: `${y}1231` }
}

/** 기간 프리셋 — MOCA data-m-defaultvalue / data-m-selecteritem 의 기간 문구 대응.
 *  '오늘' · '전일'/'어제' · '금주' · '전주' · '당월' · '전월' · '당분기' · '전분기' ·
 *  '당년' · '전년' · 'N일전'(N일 전 ~ 오늘) · 'N개월전' · 'N년전'.
 *  반환 { from, to } (둘 다 yyyyMMdd). 모르는 문구면 null. */
export const resolveTerm = (expr) => {
  const s = String(expr ?? '').trim()
  if (s === '') return null
  const today = getToday()
  switch (s) {
    case '오늘': return { from: today, to: today }
    case '전일': case '어제': { const y = addDay(today, -1); return { from: y, to: y } }
    case '금주': return getWeekTerm(today)
    case '전주': return getWeekTerm(addDay(today, -7))
    case '당월': case '이번달': return { from: getFirstDayOfMonth(today), to: getLastDayOfMonth(today) }
    case '전월': { const p = addMonth(getFirstDayOfMonth(today), -1); return { from: getFirstDayOfMonth(p), to: getLastDayOfMonth(p) } }
    case '당분기': return getQuarterTerm(today)
    case '전분기': return getQuarterTerm(addMonth(getFirstDayOfMonth(today), -3))
    case '당년': case '금년': return getYearTerm(today)
    case '전년': return getYearTerm(addYear(today, -1))
    default: break
  }
  // 'N일전' 류 — 그만큼 전부터 오늘까지의 기간
  const m = s.match(/^(\d+)\s*(일|개월|달|년)\s*전$/)
  if (m) {
    const n = Number(m[1])
    if (m[2] === '일') return { from: addDay(today, -n), to: today }
    if (m[2] === '년') return { from: addYear(today, -n), to: today }
    return { from: addMonth(today, -n), to: today }
  }
  console.warn(`MocaReactMultiCalendar: defaultValue/빠른선택 "${expr}" — 해석할 수 없는 기간 표현입니다.`)
  return null
}

export default {
  getToday, getNow, toDate, fromDate, addDay, addMonth, addYear,
  getFirstDayOfMonth, getLastDayOfMonth, monthMeta, shiftYm, inRange, resolveRelative,
  getDow, getMonthMatrix, getWeekTerm, getQuarterTerm, getYearTerm, resolveTerm,
}
