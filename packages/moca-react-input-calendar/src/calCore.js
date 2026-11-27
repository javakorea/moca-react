// 달력 공용 코어 — 단일 날짜(MocaReactInputCalendar)와 기간(MocaReactMultiCalendar)이 함께 쓴다.
// 타입 파생 규칙·값 정규화·표시 마스크·선택범위 판정이 한 곳에 있어야 두 컴포넌트의 동작이
// 어긋나지 않는다(MOCA 도 inputCalendar.js 한 파일에서 두 컴포넌트가 같은 함수를 쓴다).
import mdate from './date.js'

/* 날짜 타입 — "이 달력이 무엇을 고르는가". 값 자릿수·팝업 모드·기본 표시형식이 여기서 파생된다
   (MOCA MOCA_CAL_TYPES 이식) */
export const TYPES = {
  yyyy: { key: 'yyyy', digits: 4, mode: 'year', timeParts: 0, fmt: '####' },
  yyyymm: { key: 'yyyyMM', digits: 6, mode: 'month', timeParts: 0, fmt: '####-##' },
  yyyymmdd: { key: 'yyyyMMdd', digits: 8, mode: 'day', timeParts: 0, fmt: '####-##-##' },
  yyyymmddhhmm: { key: 'yyyyMMddHHmm', digits: 12, mode: 'day', timeParts: 2, fmt: '####-##-## ##:##' },
  yyyymmddhhmmss: { key: 'yyyyMMddHHmmss', digits: 14, mode: 'day', timeParts: 3, fmt: '####-##-## ##:##:##' },
}
const ALIAS = { year: 'yyyy', month: 'yyyymm', date: 'yyyymmdd', day: 'yyyymmdd', datetime: 'yyyymmddhhmmss' }

/** dateType 문자열 → 타입 정의 (대소문자·구분자 무시, 별칭 허용) */
export const resolveType = (raw, who = 'MocaReactInputCalendar') => {
  const key0 = String(raw ?? '').replace(/[^a-zA-Z]/g, '').toLowerCase()
  const key = ALIAS[key0] || key0
  if (TYPES[key]) return TYPES[key]
  if (key !== '') console.warn(`${who}: dateType="${raw}" — 지원하지 않는 값이라 yyyyMMdd 로 처리합니다.`)
  return TYPES.yyyymmdd
}

/** 값 → 타입 자릿수로 정규화 (MOCA _calNormalize).
 *  넘치면 자르고, 모자라면 자리별 기본값으로 채운다 — 월·일은 01, 시각은 00.
 *  isEnd=true(기간의 종료쪽)면 시각을 23:59:59 로 채운다 — 종료가 00:00:00 이면 그 날 하루가
 *  통째로 빠지기 때문(MOCA 와 같은 이유). */
const FILL_START = '00000101000000'
const FILL_END = '00001231235959'
export const normalize = (v, digits, isEnd = false) => {
  const s = String(v ?? '').replace(/[^\d]/g, '')
  if (s === '') return ''
  if (s.length >= digits) return s.slice(0, digits)
  // 일자까지는 01 로 채우고(연만 있으면 0101), 시각만 종료쪽에서 23:59:59
  const fill = isEnd ? FILL_END : FILL_START
  return s + fill.slice(s.length, digits)
}

/** 값 → 표시문자 (# 마스크. MOCA displayformat) */
export const format = (v, mask) => {
  const s = String(v ?? '')
  if (s === '' || !mask) return s
  let i = 0
  let out = ''
  for (const ch of mask) {
    if (ch === '#') {
      if (i >= s.length) break
      out += s[i++]
    } else if (i < s.length) {
      out += ch
    }
  }
  return out
}

/** 선택범위 판정기 — "그 값이 덮는 기간이 [min, max] 와 겹치는가" 하나로 통일한다.
 *  연/연월 타입은 값 하나가 기간을 뜻하므로(2026 = 그 해 전체) 겹침으로 봐야 맞다:
 *  min 이 20260315 여도 연월 202603 은 선택 가능해야 하고, 이동 버튼도 그 구간에 유효 일자가
 *  하나라도 있으면 열려 있어야 한다(MOCA 동일). */
export const makeRange = (dateMin, dateMax) => {
  const min8 = dateMin ? normalize(dateMin, 8) : ''
  const max8 = dateMax ? normalize(dateMax, 8) : ''
  const overlaps = (from8, to8) => !(min8 && to8 < min8) && !(max8 && from8 > max8)
  const okDay = (ymd) => overlaps(ymd, ymd)
  const okMonth = (ym) => overlaps(`${ym}01`, mdate.getLastDayOfMonth(`${ym}01`))
  const okYear = (y) => overlaps(`${y}0101`, `${y}1231`)
  /** 값(자릿수 무관)이 범위 안인가 — 타입별로 그 값이 덮는 기간으로 판정 */
  const valueOk = (v) => {
    if (v === '') return true
    if (v.length <= 4) return okYear(v.slice(0, 4))
    if (v.length <= 6) return okMonth(v.slice(0, 6))
    return okDay(v.slice(0, 8))
  }
  return { overlaps, okDay, okMonth, okYear, valueOk }
}

/** 일자 격자 셀 — 앞쪽 빈칸(1일의 요일) + 일자들 + 뒤쪽 빈칸.
 *  **항상 6줄(42칸)로 채운다.** 필요한 만큼만 채우면 달에 따라 5줄/6줄이 되어 월을 넘길 때마다
 *  달력 높이가 늘었다 줄었다 한다 — 팝업이면 위치까지 같이 흔들려 안정감이 없다(사용자 지적
 *  2026-08-19). MOCA 달력도 6줄 고정이다. 빈칸은 클릭 대상이 아니라 레이아웃만 차지한다. */
const ROWS = 6
export const dayCells = (viewYm) => {
  const { firstDow, days } = mdate.monthMeta(viewYm)
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(`${viewYm}${String(d).padStart(2, '0')}`)
  while (cells.length < ROWS * 7) cells.push(null)
  return cells
}

export const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export const pad2 = (n) => String(n).padStart(2, '0')

/** 최대 기간 검사 — maxTermByDay/Month/Year (MOCA data-m-maxtermby*).
 *  from~to 가 한도를 넘으면 false. 값은 8자리로 맞춰 비교한다. */
export const withinMaxTerm = (from, to, { maxTermByDay, maxTermByMonth, maxTermByYear } = {}) => {
  if (!from || !to) return true
  const f = normalize(from, 8)
  const t = normalize(to, 8)
  if (maxTermByDay) {
    // 양 끝 포함 일수 — 31일 한도면 1일~31일이 딱 허용
    const limit = mdate.addDay(f, Number(maxTermByDay) - 1)
    if (t > limit) return false
  }
  if (maxTermByMonth) {
    const limit = mdate.addDay(mdate.addMonth(f, Number(maxTermByMonth)), -1)
    if (t > limit) return false
  }
  if (maxTermByYear) {
    const limit = mdate.addDay(mdate.addYear(f, Number(maxTermByYear)), -1)
    if (t > limit) return false
  }
  return true
}
