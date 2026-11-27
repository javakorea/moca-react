import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { __registerHost } from './popup.js'
import './MocaReactPopupHost.css'

// 팝업 호스트 — 앱 루트에 한 번만 놓는다(App.jsx).
// popup.open(...) 요청이 여기로 와서 실제 모달 창으로 그려진다.
//
// ── 스택으로 겹쳐 열린다 ───────────────────────────────────────────────────
//   메시지박스는 큐(하나씩)지만 팝업은 스택이다 — 팝업 안에서 또 팝업을 여는 흐름이
//   업무 화면에서 흔하고(품목검색 → 거래처검색), MOCA 도 그렇게 동작한다.
//   각 팝업은 자기 데이터·결과만 소유하므로 겹쳐도 섞이지 않는다.
//
// 제목바를 잡아 옮길 수 있다(draggable, 기본 켜짐) — 모달 없이 띄운 보조창에서 특히 쓸모 있다.
// ESC 는 맨 위 팝업을 취소로 닫는다.

const clamp = (v, min, max) => Math.max(min, Math.min(v, max))

function PopupFrame({ item, index, onClose }) {
  const { component: Body, title, width, height, modal = true, data, draggable = true } = item
  const boxRef = useRef(null)
  const [offset, setOffset] = useState(null) // 드래그로 옮긴 위치(px). null 이면 중앙

  // 제목바 드래그 — 화면 밖으로 나가지 않게 클램프
  const onDragStart = (e) => {
    if (!draggable || e.button !== 0) return
    const box = boxRef.current
    const r = box.getBoundingClientRect()
    const sx = e.clientX
    const sy = e.clientY
    const base = offset ?? { x: r.left, y: r.top }
    const onMove = (ev) => {
      setOffset({
        x: clamp(base.x + ev.clientX - sx, 0, window.innerWidth - r.width),
        y: clamp(base.y + ev.clientY - sy, 0, window.innerHeight - 40),
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('mrp-dragging')
    }
    document.body.classList.add('mrp-dragging')
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...(offset ? { position: 'fixed', left: offset.x, top: offset.y, margin: 0 } : null),
  }

  return (
    // 모달이 아니면 딤을 통과시켜 뒤 화면을 계속 쓸 수 있게 한다(pointer-events 없음)
    <div
      className={`mrp-dim${modal ? '' : ' mrp-modeless'}`}
      style={{ zIndex: 7500 + index * 2 }}
    >
      <div ref={boxRef} className="mrp-box" style={style} role="dialog" aria-modal={modal} aria-label={title}>
        <div className={`mrp-head${draggable ? ' mrp-head-drag' : ''}`} onMouseDown={onDragStart}>
          <span className="mrp-title">{title}</span>
          <button type="button" className="mrp-x" title="닫기" onClick={() => onClose(undefined)}>×</button>
        </div>
        <div className="mrp-body">
          {/* 팝업 화면도 lazy 일 수 있다 — 받는 동안 안내를 띄운다 */}
          <Suspense fallback={<div className="mrp-loading">화면 로딩중…</div>}>
            {/* data = MOCA getParameter() · close = MOCA $p.close() */}
            <Body data={data} close={onClose} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function MocaReactPopupHost() {
  const [stack, setStack] = useState([])

  useEffect(() => __registerHost((req) => {
    if (req.action === 'closeAll') {
      setStack((s) => { s.forEach((it) => it.resolve(undefined)); return [] })
      return
    }
    if (req.action === 'close') {
      setStack((s) => {
        const target = req.id ? s.find((it) => it.id === req.id) : s[s.length - 1]
        if (!target) return s
        target.resolve(undefined)
        return s.filter((it) => it !== target)
      })
      return
    }
    setStack((s) => [...s, req])
  }), [])

  /** 팝업 닫기 — result 가 undefined 면 취소(콜백 미발화) */
  const closeItem = useCallback((id, result) => {
    setStack((s) => {
      const target = s.find((it) => it.id === id)
      if (!target) return s
      target.resolve(result)
      return s.filter((it) => it !== target)
    })
  }, [])

  // ESC — 맨 위 팝업을 취소로 닫는다
  useEffect(() => {
    if (stack.length === 0) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      const top = stack[stack.length - 1]
      closeItem(top.id, undefined)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [stack, closeItem])

  if (stack.length === 0) return null

  return createPortal(
    stack.map((item, i) => (
      <PopupFrame
        key={item.id}
        item={item}
        index={i}
        onClose={(result) => closeItem(item.id, result)}
      />
    )),
    document.body,
  )
}

export default MocaReactPopupHost
