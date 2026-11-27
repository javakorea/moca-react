import mdate from './date.js'
import { WEEK, dayCells, pad2 } from './calCore.js'

// 달력 한 판(헤더 + 격자) — 팝업 달력(단일·기간)과 붙박이 달력이 모두 이것을 쓴다.
// 상태를 갖지 않는 표시 전용 컴포넌트다: 보고 있는 기준(viewYm/decade)과 선택값은 부모가 들고,
// 여기서는 "무엇을 그리고 무엇이 잠기는가"만 계산한다.
//
// props (공통)
//   mode      : 'day' | 'month' | 'year' — 지금 그릴 격자
//   viewYm    : 'yyyyMM' — day/month 모드의 기준(월 모드는 연도만 사용)
//   decade    : 연 모드의 기준 연대 시작(2020 …)
//   selected  : 선택값(숫자문자열, 자릿수 무관) — 그 칸을 채워 표시
//   range     : makeRange() 결과 — okDay/okMonth/okYear/overlaps
//   title     : 헤더 제목(부모가 계산해 넘긴다)
//   onPick / onMove / onToday : 칸 클릭 · 이전·다음 이동 · [오늘]
//
// props (기간 달력용)
//   edge      : { from, to } — 기간의 양 끝 강조
//   inRangeSel: (value) => boolean — 기간 사이 칸 강조 판정
//
// props (붙박이 달력용 — 없으면 팝업과 동일하게 동작한다)
//   dayInfo    : { yyyyMMdd: { holi, off, badge, class } } — 업무 표시(MOCA setData 규약).
//                컴포넌트는 공휴일을 모른다: 화면이 조회해 넘긴 것만 그린다
//   weekendOff : true 면 토·일을 비영업일로 표시. dayInfo 의 off:false 가 이보다 우선한다
//                ("쉬는 토요일만 예외" 같은 지정이 가능. MOCA 동일)
//   onTitleClick : 있으면 제목이 버튼이 된다(한 단계 위 뷰로 — 일→월→연)
//   showHeader / showToday : 헤더·[오늘] 표시 여부(기본 true)
function CalPanel({
  mode, viewYm, decade, selected = '', range, title,
  onPick, onMove, onToday,
  edge, inRangeSel,
  dayInfo, weekendOff = false, onTitleClick, showHeader = true, showToday = true,
}) {
  const today = mdate.getToday()
  const y4 = Number(String(viewYm).slice(0, 4))

  // 이동 버튼 잠금 — 갈 곳에 유효한 칸이 하나도 없으면 잠근다(MOCA 동일)
  const spanOk = (dir) => {
    if (mode === 'year') {
      const d = decade + dir * 10
      return range.overlaps(`${d}0101`, `${d + 9}1231`)
    }
    if (mode === 'month') return range.okYear(y4 + dir)
    return range.okMonth(mdate.shiftYm(viewYm, dir))
  }
  const todayOk = mode === 'day' ? range.okMonth(today.slice(0, 6)) : range.okYear(today.slice(0, 4))

  /** 그 날이 비영업일인가 — dayInfo.off 가 주말 자동판정보다 우선(off:false 로 예외 지정 가능) */
  const isOff = (ymd, info) => (info.off === true)
    || (weekendOff && [0, 6].includes(mdate.getDow(ymd)) && info.off !== false)

  // 칸 하나 — 선택/오늘/기간내/잠김/업무표시를 한 곳에서 결정
  const cell = (key, value, label, extraClass = '') => {
    const dis = mode === 'day' ? !range.okDay(value) : mode === 'month' ? !range.okMonth(value) : !range.okYear(value)
    const n = value.length
    const isSel = selected.slice(0, n) === value
    const isEdge = edge && (String(edge.from ?? '').slice(0, n) === value || String(edge.to ?? '').slice(0, n) === value)
    const isBetween = !isEdge && inRangeSel?.(value)
    // 업무 표시는 일자 격자에서만 의미가 있다(연·월 칸에는 공휴일 개념이 없다)
    const info = mode === 'day' && dayInfo ? (dayInfo[value] ?? {}) : {}
    const off = mode === 'day' ? isOff(value, info) : false
    return (
      <button
        key={key}
        type="button"
        title={info.holi || undefined}
        className={
          `mic-cell${isSel || isEdge ? ' mic-sel' : ''}${isBetween ? ' mic-between' : ''}` +
          `${today.slice(0, n) === value ? ' mic-today-cell' : ''}${dis ? ' mic-dis' : ''}` +
          `${info.holi ? ' mic-holi' : ''}${off ? ' mic-off' : ''}${info.class ? ` ${info.class}` : ''}${extraClass}`
        }
        disabled={dis}
        onClick={() => onPick(value)}
      >
        {label}
        {info.holi && <span className="mic-holinm">{info.holi}</span>}
        {info.badge && <span className="mic-badge">{info.badge}</span>}
      </button>
    )
  }

  return (
    <div className="mic-panel">
      {showHeader && (
        <div className="mic-head">
          <button type="button" className="mic-nav" disabled={!spanOk(-1)} onClick={() => onMove(-1)}>‹</button>
          {/* 제목 — onTitleClick 이 있으면 버튼(한 단계 위 뷰로 올라간다. MOCA 동일) */}
          {onTitleClick ? (
            <button type="button" className="mic-title mic-title-btn" onClick={onTitleClick} title="위 단위로 보기">
              {title}
            </button>
          ) : (
            <span className="mic-title">{title}</span>
          )}
          {showToday && (
            <button type="button" className="mic-today" disabled={!todayOk} onClick={onToday}>오늘</button>
          )}
          <button type="button" className="mic-nav" disabled={!spanOk(1)} onClick={() => onMove(1)}>›</button>
        </div>
      )}

      <div className="mic-body">
        {/* 연 목록 — 한 연대 10년 */}
        {mode === 'year' && (
          <div className="mic-grid mic-grid-4">
            {Array.from({ length: 10 }, (_, i) => decade + i).map((y) => cell(y, String(y), y))}
          </div>
        )}

        {/* 월 목록 — 12개월 */}
        {mode === 'month' && (
          <div className="mic-grid mic-grid-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) =>
              cell(m, `${String(viewYm).slice(0, 4)}${pad2(m)}`, `${m}월`))}
          </div>
        )}

        {/* 일자 격자 */}
        {mode === 'day' && (
          <>
            <div className="mic-week">
              {WEEK.map((w, i) => (
                <span key={w} className={i === 0 ? 'mic-sun' : i === 6 ? 'mic-sat' : ''}>{w}</span>
              ))}
            </div>
            <div className="mic-grid mic-grid-7">
              {dayCells(viewYm).map((ymd, i) => {
                /* 빈 칸에도 글자 한 줄(&nbsp;)을 넣는다 — 비워 두면 줄 상자가 없어 칸이 주저앉고,
                   마지막 줄이 전부 빈 칸인 달(예: 2026년 4월)에서 격자가 한 줄만큼 짧아져
                   6줄 고정인데도 달력 높이가 달라진다(2026-08-19 실측: 160 ↔ 145).
                   폰트 크기가 달라도 따라오므로 px 로 높이를 박는 것보다 안전하다. */
                if (!ymd) return <span key={`e${i}`} className="mic-cell mic-empty">{' '}</span>
                const dow = i % 7
                return cell(ymd, ymd, Number(ymd.slice(6, 8)), dow === 0 ? ' mic-sun' : dow === 6 ? ' mic-sat' : '')
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CalPanel
