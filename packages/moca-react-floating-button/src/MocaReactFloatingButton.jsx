import { isValidElement, useEffect, useRef } from 'react'
import './MocaReactFloatingButton.css'

// MOCA React FloatingButton — 화면 위에 떠 있는 원형/알약형 액션 버튼(FAB)
// (MOCA floatingButton.js 이식)
//
// - 기본 위치는 우하단(fixed), position 으로 4모서리 지정. absolute 를 주면 fixed 대신
//   부모(positioned ancestor) 기준 절대배치가 된다 — 레이아웃 안에 넣는 버튼용.
// - label 을 주면 아이콘 옆에 텍스트가 붙는 확장형(알약)이 되고, 생략하면 아이콘만 원형.
// - icon 해석 (MOCA 동일 + React 확장):
//     ① 'plus'(기본)      = 내장 SVG — stroke currentColor 라 color 를 따라간다
//     ② '/' 나 '.' 포함    = 이미지 경로 <img>. iconMode="mask" 면 CSS mask 로
//                           currentColor 를 채워 그린다(파일 아이콘도 색·테마 자동 추종)
//     ③ 그 외 문자열       = 글리프 텍스트 그대로 출력(이모지 '✏️' 등)
//     ④ ReactNode          = 그대로 렌더 (React 판 확장 — 인라인 SVG 등)
// - 색: bgColor(배경) / color(아이콘·글자) — 기본은 테마 토큰이라 라이트/다크 자동 추종.
//
// ── 드래그 이동 (기본 켜짐, draggable={false} 로 끔 — MOCA _bindDrag 이식) ──
//   꾹 누르면(350ms) 드래그 모드로 전환돼 버튼을 옮길 수 있다(마우스·터치 공통, Pointer
//   Events). 짧은 탭/클릭은 그대로 onClick. 누른 채 8px 이상 움직이면 드래그 의도가
//   아니라고 보고(스크롤 등) 대기를 취소한다. 드래그로 이동한 직후의 click 은 무시해
//   onClick 오발화를 막는다. 이동 위치는 뷰포트(fixed)/offsetParent(absolute) 안으로
//   클램프하며, 마운트가 살아 있는 동안만 유지된다(영속화 없음).
//
// props
//   label     : 버튼 텍스트 — 주면 알약형(MOCA data-m-label). aria-label 로도 들어간다
//   icon      : 위 4형태 (기본 'plus' — MOCA data-m-icon)
//   iconMode  : 'img'(기본) | 'mask' — 경로 아이콘의 색 추종 여부 (MOCA data-m-iconmode)
//   bgColor / color : 배경/전경색 (MOCA data-m-bgcolor/color)
//   position  : 'rb'(기본) | 'lb' | 'rt' | 'lt' (MOCA data-m-position)
//   absolute  : true 면 fixed 대신 부모 기준 절대배치 (레이아웃 와이어프레임 버튼 등)
//   draggable : 꾹 눌러 드래그 이동 (기본 true — MOCA data-m-draggable)
//   onClick   : 클릭 콜백 (MOCA data-m-onclick)
//   className / title : 외형 확장 — 쓰는 쪽 CSS 가 기본 외형을 덮을 수 있다
//                       (MOCA moca_layout_debug_fab 이 .moca_fab 을 덮는 패턴)

const HOLD_MS = 350 // 꾹 누름 판정(ms) — MOCA 동일
const CANCEL_PX = 8 // 대기 중 이 이상 움직이면 드래그 의도 아님 — MOCA 동일

function MocaReactFloatingButton({
  label, icon = 'plus', iconMode = 'img', bgColor, color,
  position = 'rb', absolute = false, draggable = true,
  onClick, className, title, 'aria-label': ariaLabel,
}) {
  const elRef = useRef(null)
  const movedRef = useRef(false) // 드래그로 이동했으면 이어지는 click 무시

  // ── 꾹 눌러 드래그 이동 (MOCA _bindDrag/_moveTo 이식 — Pointer Events) ──
  useEffect(() => {
    if (!draggable) return
    const el = elRef.current
    let timer = null, sx = 0, sy = 0, dragging = false

    const clamp = (v, range) => Math.max(0, Math.min(v, range))

    const moveTo = (cx, cy) => {
      const r = el.getBoundingClientRect()
      let x = cx - r.width / 2
      let y = cy - r.height / 2
      const vx = window.innerWidth - r.width // 화면 기준 이동 여지
      const vy = window.innerHeight - r.height
      if (getComputedStyle(el).position === 'absolute' && el.offsetParent) {
        const op = el.offsetParent
        const pr = op.getBoundingClientRect()
        const rx = op.clientWidth - r.width // 부모 안에서의 이동 여지
        const ry = op.clientHeight - r.height
        /* 부모가 버튼보다 작으면 여지가 음수가 되고 clamp(_, 음수) 가 항상 0 이라
           그 축이 조용히 죽는다 — "좌우는 되는데 위아래만 안 되는" 증상이 이것이다.
           모바일에서 레이아웃 칸이 내용 높이로 줄고 그 안이 전부 absolute 라 높이가
           0 이 되는 경우가 실제로 있었다(2026-08-19 실측). 그런 축은 부모 대신 화면을
           기준으로 클램프한다 — 버튼은 어차피 부모 밖으로 나와 보이는 상태이므로
           못 움직이는 것보다 낫다. 부모 기준 좌표계라 클램프 후 부모 원점을 뺀다. */
        x = rx >= 0 ? clamp(x - pr.left, rx) : clamp(x, vx) - pr.left
        y = ry >= 0 ? clamp(y - pr.top, ry) : clamp(y, vy) - pr.top
      } else {
        x = clamp(x, vx)
        y = clamp(y, vy)
      }
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.right = 'auto'
      el.style.bottom = 'auto'
    }

    const onDown = (e) => {
      if (!e.isPrimary) return
      sx = e.clientX
      sy = e.clientY
      movedRef.current = false
      timer = setTimeout(() => {
        dragging = true
        el.classList.add('mrf-dragging')
        try { el.setPointerCapture(e.pointerId) } catch { /* 포인터 소멸 등 — 드래그만 무산 */ }
      }, HOLD_MS)
    }
    const onMove = (e) => {
      if (!dragging) {
        if (timer && (Math.abs(e.clientX - sx) > CANCEL_PX || Math.abs(e.clientY - sy) > CANCEL_PX)) {
          clearTimeout(timer)
          timer = null
        }
        return
      }
      movedRef.current = true
      moveTo(e.clientX, e.clientY)
    }
    const onEnd = () => {
      if (timer) { clearTimeout(timer); timer = null }
      if (dragging) { dragging = false; el.classList.remove('mrf-dragging') }
    }
    const onCtx = (e) => e.preventDefault() // 모바일 길게누름 컨텍스트메뉴 차단(드래그와 충돌)

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onEnd)
    el.addEventListener('pointercancel', onEnd)
    el.addEventListener('contextmenu', onCtx)
    return () => {
      if (timer) clearTimeout(timer)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onEnd)
      el.removeEventListener('pointercancel', onEnd)
      el.removeEventListener('contextmenu', onCtx)
    }
  }, [draggable])

  const handleClick = () => {
    if (movedRef.current) { movedRef.current = false; return } // 드래그 직후 click 무시
    onClick?.()
  }

  // 아이콘 — 헤더 주석의 4형태 해석
  let iconNode
  if (isValidElement(icon)) {
    iconNode = icon
  } else if (icon === 'plus') {
    iconNode = (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  } else if (String(icon).includes('/') || String(icon).includes('.')) {
    iconNode = iconMode === 'mask'
      ? <span className="mrf-icon-mask" style={{ '--mrf-icon': `url('${icon}')` }} />
      : <img className="mrf-icon-img" src={icon} alt="" />
  } else {
    iconNode = <span className="mrf-icon-txt">{icon}</span>
  }

  // 위치 — 기본 우하단(rb, CSS). 나머지 3모서리는 인라인으로 뒤집는다 (MOCA 동일)
  const posStyle = {}
  if (position === 'lb' || position === 'lt') { posStyle.left = 18; posStyle.right = 'auto' }
  if (position === 'rt' || position === 'lt') { posStyle.top = 18; posStyle.bottom = 'auto' }

  return (
    <div
      ref={elRef}
      className={`mrf${label ? ' mrf-ext' : ''}${absolute ? ' mrf-abs' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...posStyle, ...(bgColor ? { background: bgColor } : null), ...(color ? { color } : null) }}
      role="button"
      tabIndex={0}
      title={title}
      aria-label={label ?? ariaLabel ?? 'action'}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
    >
      <span className="mrf-icon">{iconNode}</span>
      {label && <span className="mrf-label">{label}</span>}
    </div>
  )
}

export default MocaReactFloatingButton
