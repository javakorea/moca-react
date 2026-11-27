// MOCA React MsgBox — 명령형 메시지박스 API (MOCA moca.$g.alert/error/confirm 이식)
//
// MOCA 는 어디서나 `moca.$g.alert('저장되었습니다')` 로 부를 수 있었다. React 에서 모달은 보통
// 컴포넌트+상태의 일이지만, 업무 화면에서 "이 자리에서 물어보고 답을 받는" 흐름은 명령형이
// 훨씬 읽기 쉽다(조건 분기 안에서 부르고, 답에 따라 다음 줄이 갈린다).
// 그래서 이 모듈은 **명령형 함수**를 제공하고, 실제 렌더는 앱 루트에 한 번 놓는
// <MocaReactMsgHost /> 가 맡는다.
//
//   import { msgbox, MocaReactMsgHost } from '@teammoca/react-msgbox'
//   <MocaReactMsgHost />                       // 앱 루트에 한 번(App.jsx)
//
//   msgbox.alert('저장되었습니다.')                          // MOCA 와 같은 호출
//   msgbox.alert('완료', () => reload())                     // 콜백(MOCA 호환)
//   await msgbox.alert('완료')                               // await 도 된다(React 친화)
//   if (await msgbox.confirm('저장하시겠습니까?')) save()      // 답을 그 자리에서 받는다
//   const mode = await msgbox.confirm('어디에 추가할까요?', { radios: [...] })
//
// ── 메시지는 문자열 또는 ReactNode ─────────────────────────────────────────
//   MOCA 는 메시지를 innerHTML 로 넣어 <b>·<br/> 을 쓸 수 있었다. React 판은 문자열을
//   **텍스트로** 넣고(줄바꿈 \n 만 반영) 강조가 필요하면 노드를 넘긴다:
//     msgbox.alert(<>성공 <b>12건</b> / 건너뜀 2건</>)
//   서버에서 온 문장을 그대로 HTML 로 넣던 통로를 막아 XSS 여지를 없앤 것이다(의도된 차이).

let host = null // 호스트가 등록한 처리 함수
const buffered = [] // 호스트 마운트 전에 들어온 요청

/** 호스트 등록 — MocaReactMsgHost 가 마운트될 때 호출한다(내부용) */
export const __registerHost = (fn) => {
  host = fn
  while (buffered.length) host(buffered.shift())
  return () => { host = null }
}

let warned = false
const send = (req) => {
  if (host) { host(req); return }
  buffered.push(req)
  // 호스트를 잊으면 조용히 사라진다 — 한 번만 알린다(첫 렌더 타이밍은 버퍼가 흡수한다)
  if (!warned) {
    warned = true
    setTimeout(() => {
      if (!host) console.error('[msgbox] <MocaReactMsgHost /> 가 앱에 없습니다 — 메시지박스가 표시되지 않습니다.')
    }, 1000)
  }
}

/** 공통 — 모달 요청을 보내고 결과를 Promise 로 돌려준다 */
const open = (req) => new Promise((resolve) => send({ ...req, resolve }))

const msgbox = {
  /** 알림(확인 1개). cb 는 [확인] 후 실행 — MOCA alert(msg, callback) 대응 */
  alert(message, cb) {
    return open({ kind: 'alert', message }).then(() => { cb?.() })
  },

  /** 오류 알림(확인 1개, danger 색 + ✕) — MOCA error(msg, callback) 대응 */
  error(message, cb) {
    return open({ kind: 'error', message }).then(() => { cb?.() })
  },

  /** 확인/취소.
   *  · confirm(msg)                          → Promise<boolean>
   *  · confirm(msg, okCb, cancelCb)          → MOCA 호환(콜백)
   *  · confirm(msg, okCb, cancelCb, {radios})→ MOCA 4-인자(선택목록). 확인 콜백에 선택값
   *  · confirm(msg, {radios})                → Promise<선택값|null> (취소면 null)
   *  radios: [{ value, label, desc, checked }] — checked 가 없으면 첫 항목이 기본 선택 */
  confirm(message, a, b, c) {
    const cbMode = typeof a === 'function' || typeof b === 'function'
    const opt = (cbMode ? c : a) ?? {}
    const p = open({ kind: 'confirm', message, radios: opt.radios })
    if (!cbMode) return p // Promise 모드 — radios 면 선택값(취소 null), 아니면 true/false
    return p.then((res) => {
      // 취소는 false(또는 null) — 라디오 모드에서는 확인 시 선택값이 온다
      if (res === false || res === null) { b?.(); return res }
      a?.(opt.radios ? res : undefined)
      return res
    })
  },

  /** 필수값 안내 — MOCA requiredFail(label, focusCb). **항상 false 를 즉시 반환**한다
   *  (`if (!v) return msgbox.requiredFail('사용자명', focus)` 패턴이 그대로 동작하도록) */
  requiredFail(label, focusCb) {
    this.alert(`${label || '필수항목'}은(는) 필수입력항목입니다.`, focusCb)
    return false
  },

  /** 진행 모달 표시 — delay(ms) 뒤에 나타난다(기본 300, 0 이면 즉시).
   *  짧은 작업에서 모달이 번쩍이는 것을 막기 위한 지연이다(MOCA showProgress 와 같은 의도) */
  showProgress(message = '처리중입니다', delay = 300) {
    send({ kind: 'progress', action: 'show', message, delay })
  },

  /** 진행 모달 문구 교체 */
  setProgressMsg(message) {
    send({ kind: 'progress', action: 'msg', message })
  },

  /** 진행 모달 닫기 */
  hideProgress() {
    send({ kind: 'progress', action: 'hide' })
  },
}

export default msgbox
