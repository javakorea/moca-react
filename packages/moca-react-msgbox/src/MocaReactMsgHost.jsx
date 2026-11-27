import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { __registerHost } from './msgbox.js'
import './MocaReactMsgHost.css'

// 메시지박스 호스트 — 앱 루트에 한 번만 놓는다(App.jsx).
// msgbox.alert/error/confirm/showProgress 요청이 여기로 와서 실제 모달로 그려진다.
//
//   <MocaReactMsgHost />
//
// ── 큐로 순차 표시 ─────────────────────────────────────────────────────────
//   MOCA 는 부를 때마다 body 에 모달을 쌓아 여러 개가 겹쳤다. 여기서는 **한 번에 하나**만
//   보여주고 나머지는 줄을 세운다 — 답을 받아야 다음이 뜨므로 사용자가 무엇에 답하는지 명확하다.
//   진행 모달은 이 큐와 별개로 항상 위에 뜬다(작업 중 알림이 겹칠 수 있으므로).
//
// 접근성: 열리면 기본 버튼에 포커스, Enter=확인 · ESC=취소(confirm)/확인(alert·error).

const nl2br = (text) => String(text).split('\n').map((line, i) => (
  <span key={i}>{i > 0 && <br />}{line}</span>
))

/** 메시지 렌더 — 문자열은 텍스트로(줄바꿈만 반영), ReactNode 는 그대로 */
const renderMessage = (message) => (typeof message === 'string' ? nl2br(message) : message)

function MocaReactMsgHost() {
  const [queue, setQueue] = useState([]) // 대기 중 모달(첫 항목이 현재 표시)
  const [progress, setProgress] = useState(null) // { message } — 진행 모달
  const [radio, setRadio] = useState('') // confirm 선택목록의 현재 선택
  const okRef = useRef(null)
  const progressTimer = useRef(null)

  // 요청 수신 — 모달은 큐에 넣고, 진행 모달은 즉시 처리
  useEffect(() => __registerHost((req) => {
    if (req.kind === 'progress') {
      if (req.action === 'show') {
        clearTimeout(progressTimer.current)
        if (req.delay > 0) {
          progressTimer.current = setTimeout(() => setProgress({ message: req.message }), req.delay)
        } else {
          setProgress({ message: req.message })
        }
      } else if (req.action === 'msg') {
        // 아직 지연 중이면 표시 문구만 갈아두고, 떠 있으면 즉시 교체
        setProgress((p) => (p ? { message: req.message } : p))
      } else {
        clearTimeout(progressTimer.current)
        setProgress(null)
      }
      return
    }
    setQueue((q) => [...q, req])
  }), [])

  const cur = queue[0] ?? null

  // 모달이 바뀌면 선택목록 기본값을 잡고 기본 버튼에 포커스
  useEffect(() => {
    if (!cur) return
    if (cur.radios?.length) {
      const checked = cur.radios.find((r) => r.checked) ?? cur.radios[0]
      setRadio(String(checked.value))
    }
    // 페인트 후 포커스(모달이 붙은 다음)
    const t = setTimeout(() => okRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [cur])

  const close = useCallback((result) => {
    setQueue((q) => {
      const [done, ...rest] = q
      done?.resolve(result)
      return rest
    })
  }, [])

  // 키보드 — Enter=확인, ESC=취소(confirm)/확인(alert·error)
  useEffect(() => {
    if (!cur) return
    // 이 듣개를 붙인 때보다 먼저 생긴 키 입력은 무시한다 — 칸에서 Enter 로 조회하다 알림이 뜨면, React 가 keydown 안에서 바로 그려 이 듣개가 붙은 뒤
    //   같은 Enter 가 document 로 올라와 알림을 곧바로 닫았다(눈에 안 보임 — 2026-11-12 LIME 전환). event.timeStamp 와 performance.now() 는 같은 시계다
    const since = performance.now()
    const onKey = (e) => {
      if (e.timeStamp && e.timeStamp < since) return
      if (e.key === 'Enter') {
        e.preventDefault()
        close(cur.kind === 'confirm' ? (cur.radios ? radio : true) : undefined)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close(cur.kind === 'confirm' ? (cur.radios ? null : false) : undefined)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cur, radio, close])

  useEffect(() => () => clearTimeout(progressTimer.current), [])

  if (!cur && !progress) return null

  return createPortal(
    <>
      {cur && (
        <div className="mmb-dim">
          <div className={`mmb-box mmb-${cur.kind}`} role="alertdialog" aria-modal="true">
            <div className="mmb-ico">{cur.kind === 'error' ? '✕' : cur.kind === 'confirm' ? '?' : '!'}</div>
            <div className="mmb-msg">{renderMessage(cur.message)}</div>

            {/* 선택목록 — [확인] 시 고른 value 가 결과로 넘어간다(MOCA radios 대응) */}
            {cur.radios?.length > 0 && (
              <div className="mmb-radios">
                {cur.radios.map((r) => (
                  <label key={r.value} className={`mmb-radio${String(r.value) === radio ? ' mmb-radio-on' : ''}`}>
                    <input
                      type="radio"
                      name="mmb-radio"
                      value={String(r.value)}
                      checked={String(r.value) === radio}
                      onChange={() => setRadio(String(r.value))}
                    />
                    <span className="mmb-radio-body">
                      <b>{r.label}</b>
                      {r.desc && <i>{r.desc}</i>}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="mmb-btns">
              {cur.kind === 'confirm' && (
                <button type="button" className="mmb-btn mmb-cancel" onClick={() => close(cur.radios ? null : false)}>
                  취소
                </button>
              )}
              <button
                ref={okRef}
                type="button"
                className="mmb-btn mmb-ok"
                onClick={() => close(cur.kind === 'confirm' ? (cur.radios ? radio : true) : undefined)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 진행 모달 — 큐와 별개로 항상 위에 (작업 중 알림이 겹칠 수 있다) */}
      {progress && (
        <div className="mmb-dim mmb-dim-progress">
          <div className="mmb-progress" role="status" aria-live="polite">
            <span className="mmb-spin" />
            <span className="mmb-progress-msg">{renderMessage(progress.message)}</span>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}

export default MocaReactMsgHost
