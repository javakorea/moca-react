import { Children, createContext, forwardRef, useContext, useEffect, useImperativeHandle, useState } from 'react'
import { MocaReactFloatingButton } from '@teammoca/react-floating-button'
import './MocaReactLayout.css'

// MOCA React Layout — layout 속성 하나로 자식들을 반응형(비율) 분할 배치 (MOCA layout.js 이식)
//
// ── 문법: layout="{방향}{토큰:토큰[:토큰…]}" ─────────────────────────────────
//   방향 : v = 세로 스택(위/아래, 기본) · h = 가로 분할(좌/우)
//   토큰 : 자식 개수만큼 ':' 로 나열. 생략하면 균등(1:1:…). 개수 제한 없음.
//     · 숫자    : 상대 비율(flex-grow) — 합이 10일 필요 없다(2:8 = 1:4 = 20:80).
//                 0 을 주면 그 칸이 접힌다(setRatio('h0:10') 사이드 토글).
//     · '숫자px': 고정 크기 칸(주축 기준 — row 는 폭, col 은 높이). 예 '240px'
//     · 'fit'   : 내용 크기만큼(hug). 검색영역/버튼줄 용 — vfit:auto 가 가장 흔한 골격
//     · 'auto'  : 남은 공간 전부(내부적으로 grow 1). px/fit 고정 칸과 짝지어 쓴다
//   통짜(분할 없음)의 표준 표기는 v1.
//
// ── 중첩 ────────────────────────────────────────────────────────────────────
//   칸 안에 MocaReactLayout 을 다시 넣으면 그 칸 안에서 재분할된다. 칸 안에는
//   어떤 컴포넌트든 넣을 수 있다(그리드/폼/일반 div …).
//
// ── 반응형 (MOCA moca.css ≤768px 규칙 이식) ────────────────────────────────
//   데스크톱은 "부모를 스크롤 없이 꽉", 모바일(≤768px)은 방향 무관 세로 스택 +
//   페이지 스크롤. 고정 px 칸도 내용 높이로 풀리고, 그리드(.mrg)가 든 칸은 남은
//   높이를 채운다. 칸별 모바일 높이 고정은 mobileHeights 배열로.
//
// props
//   layout   : 분할 스펙 문자열 (기본 'v' — 세로 균등)
//   width / height : 루트 고정 크기(px 숫자 또는 CSS 값) — 주면 꽉채움 대신 그 크기
//                    기준으로 분할(넘치면 부모가 스크롤). MOCA data-m-width/height 대응
//   gap      : 칸 사이 간격(px 숫자 또는 CSS 값, 기본 15 — MOCA --m-layout-gap)
//   mobileHeights : 칸별 모바일(≤768px) 고정 높이 배열 — 해당 없는 칸은 null.
//                   MOCA data-m-mobileheight 마커 대응(PC 무영향) 예) [null, 360]
//   debug    : true 면 골격 미리보기 켠 채 시작 (기본 false)
//   wireframeButton : 루트 레이아웃 우하단의 골격 미리보기 토글 FAB 표시 (기본 true —
//                     MOCA _injectDebugFab/mconfig.wireframeBtn 대응. 운영 화면에서 숨기려면 false).
//                     중첩 레이아웃에는 절대 붙지 않는다(루트당 1개)
//
// ref (imperative)
//   setRatio(spec) : 런타임 비율(+방향) 변경 — setRatio('7:3')(방향 유지) / setRatio('h0:10')
//                    (방향 포함). MOCA $p.get('lay').setRatio 대응. layout prop 이 바뀌면 리셋
//
// 골격 미리보기(개발용) — Alt+L 로 토글(MOCA 동일 단축키). 루트 레이아웃(중첩 아님)이
// 키를 받아 자기 트리 전체에 와이어프레임(칸 구조·토큰 라벨)을 그린다.

// 중첩 판별 — 루트 레이아웃만 Alt+L 리스너와 디버그 상태를 소유한다
const NestedCtx = createContext(false)

// 토큰 파싱 (MOCA _parseRatios — px 를 숫자보다 먼저 매치해야 '200px' 가 안 잘린다)
const parseTokens = (spec) => {
  const m = String(spec).match(/(?:\d+px|\d+|auto|fit)(?::(?:\d+px|\d+|auto|fit))*/i)
  return m ? m[0].split(':') : []
}

const cssSize = (v) => (typeof v === 'number' ? `${v}px` : v)

// 골격 미리보기 FAB 아이콘 — MOCA icon_layout_debug.svg 대응(레이아웃 격자 모양 인라인 SVG)
const wireframeIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="12" y1="10" x2="12" y2="21" />
  </svg>
)

const MocaReactLayout = forwardRef(function MocaReactLayout(
  { layout = 'v', width, height, gap, mobileHeights, debug = false, wireframeButton = true, children },
  ref,
) {
  const nested = useContext(NestedCtx)
  const [override, setOverride] = useState(null) // setRatio 가 준 스펙 — prop 보다 우선
  const [debugOn, setDebugOn] = useState(debug)

  // layout prop 이 바뀌면(화면 코드가 스펙을 직접 교체) 런타임 변경분을 버린다
  useEffect(() => { setOverride(null) }, [layout])

  const spec = override ?? layout
  const isCol = !/^h/i.test(String(spec).trim()) // v 가 기본 (MOCA _isColumn)
  const tokens = parseTokens(spec)

  useImperativeHandle(ref, () => ({
    // 런타임 비율(+방향) 변경 — 방향 문자를 생략하면 현재 방향 유지(MOCA setRatio 동일)
    setRatio(ratioStr) {
      let s = String(ratioStr ?? '').trim()
      if (!/^[vh]/i.test(s)) s = (isCol ? 'v' : 'h') + s
      setOverride(s)
    },
  }), [isCol])

  // Alt+L 골격 미리보기 토글 — 루트 레이아웃만 (MOCA initLayoutDebugToggle 이식)
  useEffect(() => {
    if (nested) return
    const onKey = (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        setDebugOn((d) => !d)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [nested])

  // 칸(pane) — 자식마다 래퍼 div 하나. flex 값은 인라인 flex 가 아니라 CSS 변수로 넘긴다
  // (MOCA 와 같은 이유 — 인라인이면 모바일 미디어쿼리가 못 누른다)
  const renderPane = (child, i) => {
    const t = String(tokens[i] ?? '').trim()
    const style = {}
    let cls = 'mrl-pane'
    if (/^\d+px$/i.test(t)) {
      cls += ' mrl-pane-fixed'
      style['--mrl-basis'] = t.toLowerCase()
    } else if (/^fit$/i.test(t)) {
      cls += ' mrl-pane-fit'
    } else {
      // 숫자 = 비율, auto = 남은 공간(grow 1), 빈 토큰·음수·숫자아님 = 균등(1).
      // '0' 은 유효 — grow 0 = 칸 접기 (MOCA _weight 동일)
      const n = t === '' || /^auto$/i.test(t) ? 1 : Number(t)
      style['--mrl-grow'] = isNaN(n) || n < 0 ? 1 : n
    }
    const mbh = mobileHeights?.[i]
    if (mbh != null) style['--mrl-mbh'] = cssSize(mbh)
    return (
      <div
        key={child.key ?? i}
        className={cls}
        style={style}
        data-token={t || '1'}
        {...(mbh != null ? { 'data-mobileheight': '' } : null)}
      >
        {child}
      </div>
    )
  }

  const rootStyle = {}
  if (gap != null) rootStyle['--mrl-gap'] = cssSize(gap)
  if (width != null) rootStyle['--mrl-w'] = cssSize(width)
  if (height != null) rootStyle['--mrl-h'] = cssSize(height)

  return (
    <NestedCtx.Provider value={true}>
      <div
        className={
          `mrl ${isCol ? 'mrl-col' : 'mrl-row'}` +
          `${width != null || height != null ? ' mrl-fixed' : ''}` +
          `${!nested && debugOn ? ' mrl-debug' : ''}`
        }
        style={rootStyle}
        data-spec={spec}
      >
        {Children.toArray(children).map(renderPane)}
        {/* 골격 미리보기 토글 FAB — 루트 레이아웃 우하단(absolute 라 flex 칸 배치에서 제외).
            MOCA _injectDebugFab 대응 — Alt+L 과 같은 토글을 버튼으로 제공 */}
        {!nested && wireframeButton && (
          <MocaReactFloatingButton
            absolute
            icon={wireframeIcon}
            className={`mrl-debug-fab${debugOn ? ' mrl-debug-fab-on' : ''}`}
            title="레이아웃 구조 보기 (Alt+L)"
            aria-label="레이아웃 구조 보기"
            onClick={() => setDebugOn((d) => !d)}
          />
        )}
      </div>
    </NestedCtx.Provider>
  )
})

export default MocaReactLayout
