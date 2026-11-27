// MOCA React Popup — 화면을 모달로 띄우고 결과를 받는다 (MOCA $p.openPop / $p.close 이식)
//
// ── 팝업 3동사 (MOCA 와 같은 계약) ─────────────────────────────────────────
//   열기     popup.open(Component, { title, width, height, modal, data, callback })
//   파라미터 팝업 컴포넌트가 props.data 로 받는다            ← MOCA $p.getParameter()
//   닫기     팝업 컴포넌트가 props.close(결과) 로 닫는다      ← MOCA $p.close(결과)
//            close(결과) = 확정(callback 발화 · Promise 결과) / close() = 취소(콜백 미발화)
//
// MOCA 는 url 로 팝업 화면(HTML)을 지정했지만 React 에서는 **컴포넌트를 그대로 넘긴다** —
// 화면이 곧 컴포넌트이므로 경로 문자열을 거칠 이유가 없고, lazy() 컴포넌트도 그대로 쓸 수 있다.
//
//   import { popup } from '@teammoca/react-popup'
//   import PopItemSearch from './pop/PopItemSearch'
//
//   // await 로 받기(권장 — 답에 따라 다음 줄이 갈린다)
//   const row = await popup.open(PopItemSearch, { title: '품목 검색', width: 640, data: { keyword } })
//   if (row) setItem(row)                     // 취소면 undefined
//
//   // 콜백(MOCA openPop 호환)
//   popup.open(PopItemSearch, { title: '품목 검색', callback: (row) => setItem(row) })
//
// 팝업 컴포넌트는 업무 화면과 똑같이 만들고(레이아웃·그리드 그대로), 결과를 close 로 넘긴다:
//   function PopItemSearch({ data, close }) {
//     return <button onClick={() => close(row)}>선택</button>   // close() 는 취소
//   }

let host = null
const buffered = []

/** 호스트 등록 — MocaReactPopupHost 가 마운트될 때 호출한다(내부용) */
export const __registerHost = (fn) => {
  host = fn
  while (buffered.length) host(buffered.shift())
  return () => { host = null }
}

let warned = false
const send = (req) => {
  if (host) { host(req); return }
  buffered.push(req)
  if (!warned) {
    warned = true
    setTimeout(() => {
      if (!host) console.error('[popup] <MocaReactPopupHost /> 가 앱에 없습니다 — 팝업이 표시되지 않습니다.')
    }, 1000)
  }
}

let seq = 0

const popup = {
  /** 팝업 열기 — 결과 Promise 를 돌려준다(취소면 undefined).
   *  options: { title, width, height, modal=true, data, callback, draggable=true } */
  open(component, options = {}) {
    if (!component) {
      console.error('[popup] open(component, options) — 팝업 컴포넌트가 없습니다.')
      return Promise.resolve(undefined)
    }
    const { callback, ...rest } = options
    return new Promise((resolve) => {
      send({
        id: ++seq,
        component,
        ...rest,
        resolve: (result) => {
          // close(결과) 만 확정 — close() 취소는 콜백을 부르지 않는다(MOCA 규약)
          if (result !== undefined) callback?.(result)
          resolve(result)
        },
      })
    })
  },

  /** 열려 있는 팝업을 바깥에서 닫는다(취소 처리). id 생략 시 가장 위 팝업 */
  close(id) {
    send({ action: 'close', id })
  },

  /** 열려 있는 팝업 전부 닫기(취소) — 화면 전환·로그아웃 때 */
  closeAll() {
    send({ action: 'closeAll' })
  },
}

export default popup
