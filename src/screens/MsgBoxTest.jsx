import { useRef, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { msgbox } from '@teammoca/react-msgbox'
import { tran } from '@teammoca/react-tran'
import ComTitle from './com/ComTitle'

// 표 한 줄 — 컴포넌트 정의는 화면 함수 "밖"에
const Row = ({ th, children, hint }) => (
  <div className="mb-row">
    <div className="mb-th">{th}</div>
    <div className="mb-td">
      {children}
      {hint && <span className="mb-hint">{hint}</span>}
    </div>
  </div>
)

// 메시지박스 데모 — MOCA TPL023 의 React 판.
// 3종(alert · error · confirm) + 필수값 안내 + 진행 모달.
// MOCA 는 moca.$g.alert(...) 였고 React 판은 msgbox.alert(...) — 호출 자리는 그대로이고,
// 답을 await 로 받을 수도 있다(조건 분기 안에서 읽기 쉽다).
function MsgBoxTest({ menuInfo }) {
  const [log, setLog] = useState('화면이 로드되었습니다. 각 [실행] 버튼을 눌러 메시지박스를 확인하세요.')
  const [userNm, setUserNm] = useState('')
  const inputRef = useRef(null)

  const say = (msg) => {
    const n = new Date()
    const t = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`
    setLog((prev) => `[${t}] ${msg}${prev ? `\n${prev}` : ''}`)
  }

  // ── 1. alert ──
  const alertBasic = () => { msgbox.alert('저장되었습니다.'); say('alert(msg) — 알림 표시') }
  const alertCallback = () => msgbox.alert('등록이 완료되었습니다.\n목록으로 이동합니다.',
    () => say('alert 콜백 실행 — 여기서 재조회·화면이동 처리'))
  // 강조가 필요하면 문자열 대신 노드를 넘긴다(MOCA 는 innerHTML 이었다)
  const alertNode = () => {
    msgbox.alert(<>처리 결과<br />성공 <b style={{ color: '#22a07a' }}>12건</b> / 건너뜀 2건</>)
    say('alert — ReactNode 로 강조(문자열은 텍스트로 안전 처리)')
  }
  const alertAwait = async () => {
    await msgbox.alert('await 로도 기다립니다.')
    say('await msgbox.alert 이후 실행 — 콜백 없이 이어서 쓸 수 있다')
  }

  // ── 2. error ──
  const errorBasic = () => {
    msgbox.error(<>삭제할 수 없는 데이터입니다.<br />사유 : <b>하위 메뉴가 존재함</b></>)
    say('error(msg) — 오류 알림(danger + ✕)')
  }
  const errorCallback = () => msgbox.error('저장에 실패했습니다.\n잠시 후 다시 시도해 주세요.',
    () => say('error 콜백 실행 — 여기서 원상복구·재조회 처리'))

  // ── 3. confirm ──
  const confirmBasic = () => msgbox.confirm('저장하시겠습니까?',
    () => say('confirm 확인 — 여기서 tran.save 호출'))
  const confirmCancel = () => msgbox.confirm('작성 중인 내용이 사라집니다.\n계속할까요?',
    () => say('confirm 확인 — 편집 폐기'),
    () => say('confirm 취소 — 편집 유지(원복 처리)'))
  const confirmRadio = () => msgbox.confirm(
    <>선택한 <b>기준 메뉴</b>에 대해<br />새 메뉴를 어디에 추가할까요?</>,
    (mode) => say(`confirm 확인 — 선택값 : ${mode}`),
    () => say('confirm 취소 — 선택 없음'),
    { radios: [
      { value: 'child', label: '하위 메뉴로 추가', desc: '선택한 메뉴의 아래 단계(자식)로 생성됩니다.', checked: true },
      { value: 'sibling', label: '같은 레벨로 추가', desc: '선택한 메뉴와 동일한 단계(형제)로 생성됩니다.' },
    ] })
  // await 형 — 답에 따라 다음 줄이 갈린다(React 에서 가장 읽기 쉬운 형태)
  const confirmAwait = async () => {
    if (await msgbox.confirm('정말 삭제하시겠습니까?')) say('await confirm → true (삭제 진행)')
    else say('await confirm → false (취소)')
  }
  const confirmAwaitRadio = async () => {
    const mode = await msgbox.confirm('어떤 범위로 저장할까요?', { radios: [
      { value: 'all', label: '전체 저장', desc: '변경된 모든 행을 저장합니다.' },
      { value: 'sel', label: '선택 행만', desc: '체크한 행만 저장합니다.' },
    ] })
    say(mode ? `await confirm(radios) → ${mode}` : 'await confirm(radios) → null (취소)')
  }

  // ── 4. 필수값 안내 · validate 패턴 ──
  const requiredFail = () => {
    msgbox.requiredFail('사용자명', () => {
      inputRef.current?.focus()
      say('requiredFail 포커스 콜백 실행 — 해당 입력칸으로 포커스 이동')
    })
  }
  const validate = () => {
    // MOCA 의 form.validate() 실패 흐름과 같은 모양 — 항상 false 를 반환하므로 그대로 return 한다
    if (!userNm.trim()) { say('validate 실패 — 필수값 안내 표시'); return msgbox.requiredFail('사용자명', () => inputRef.current?.focus()) }
    msgbox.alert('검증 통과! 저장을 진행합니다.')
    say('validate 통과')
    return true
  }

  // ── 5. 진행 모달 ──
  const progressManual = async () => {
    msgbox.showProgress('처리중입니다', 0) // 0 = 지연 없이 즉시
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 700))
      msgbox.setProgressMsg(`데이터 처리중 ${i}/3`)
    }
    msgbox.hideProgress()
    msgbox.alert('처리가 완료되었습니다.')
    say('showProgress → setProgressMsg → hideProgress 완료')
  }
  const progressTran = async () => {
    msgbox.showProgress('조회중입니다', 0)
    try {
      const rows = await tran.select('selectDemoMenuDemoList')
      say(`tran.select 조회 완료 — ${rows.length}건`)
    } catch (e) {
      msgbox.error(`조회 실패: ${e.message}`)
    } finally {
      msgbox.hideProgress() // 성공·실패 어느 쪽이든 반드시 닫는다
    }
  }
  const progressDelay = async () => {
    msgbox.showProgress('짧은 작업', 300) // 300ms 안에 끝나면 모달이 아예 안 뜬다
    await new Promise((r) => setTimeout(r, 150))
    msgbox.hideProgress()
    say('showProgress(delay 300) — 150ms 만에 끝나 모달이 뜨지 않았다(깜빡임 방지)')
  }

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />

        <MocaReactLayout layout="h5:5">
          <div className="mb-scroll">
            <div className="mb-panel">
              <div className="mb-panel-head"><b>메시지박스 3종</b> <span>alert · error · confirm</span></div>

              <Row th="alert 기본" hint="msgbox.alert(msg)">
                <button className="mb-btn mb-out" onClick={alertBasic}>실행</button>
              </Row>
              <Row th="alert + 콜백" hint="msgbox.alert(msg, cb)">
                <button className="mb-btn mb-out" onClick={alertCallback}>실행</button>
              </Row>
              <Row th="alert + 강조" hint="문자열은 텍스트, 강조는 ReactNode">
                <button className="mb-btn mb-out" onClick={alertNode}>실행</button>
              </Row>
              <Row th="alert + await" hint="await msgbox.alert(msg)">
                <button className="mb-btn mb-out" onClick={alertAwait}>실행</button>
              </Row>
              <Row th="error 기본" hint="msgbox.error(msg) — danger + ✕">
                <button className="mb-btn mb-out" onClick={errorBasic}>실행</button>
              </Row>
              <Row th="error + 콜백" hint="msgbox.error(msg, cb)">
                <button className="mb-btn mb-out" onClick={errorCallback}>실행</button>
              </Row>
              <Row th="confirm 기본" hint="msgbox.confirm(msg, ok)">
                <button className="mb-btn mb-out" onClick={confirmBasic}>실행</button>
              </Row>
              <Row th="confirm + 취소" hint="msgbox.confirm(msg, ok, cancel)">
                <button className="mb-btn mb-out" onClick={confirmCancel}>실행</button>
              </Row>
              <Row th="confirm + 선택목록" hint="4번째 인자 { radios } → 확인 콜백에 선택값">
                <button className="mb-btn mb-out" onClick={confirmRadio}>실행</button>
              </Row>
              <Row th="confirm + await" hint="if (await msgbox.confirm(msg))">
                <button className="mb-btn mb-out" onClick={confirmAwait}>실행</button>
              </Row>
              <Row th="confirm(radios) await" hint="await → 선택값 또는 null">
                <button className="mb-btn mb-out" onClick={confirmAwaitRadio}>실행</button>
              </Row>
            </div>
          </div>

          <div className="mb-scroll">
            <div className="mb-panel">
              <div className="mb-panel-head"><b>필수값 안내 · validate 패턴</b> <span>빈 값으로 [검증]</span></div>
              <Row th="사용자명">
                <input ref={inputRef} className="mb-ipt" value={userNm} placeholder="필수 입력"
                  onChange={(e) => setUserNm(e.target.value)} />
              </Row>
              <Row th="검증" hint="실패 시 안내 + 포커스 (requiredFail 은 항상 false 반환)">
                <button className="mb-btn mb-primary" onClick={validate}>검증</button>
                <button className="mb-btn mb-out" onClick={requiredFail}>requiredFail 직접 호출</button>
              </Row>
            </div>

            <div className="mb-panel">
              <div className="mb-panel-head"><b>진행 모달</b> <span>showProgress · setProgressMsg · hideProgress</span></div>
              <Row th="수동 제어" hint="delay 0 = 즉시 표시">
                <button className="mb-btn mb-out" onClick={progressManual}>실행</button>
              </Row>
              <Row th="통신과 함께" hint="finally 에서 반드시 hideProgress">
                <button className="mb-btn mb-out" onClick={progressTran}>조회</button>
              </Row>
              <Row th="지연(깜빡임 방지)" hint="delay 안에 끝나면 모달이 뜨지 않는다">
                <button className="mb-btn mb-out" onClick={progressDelay}>실행</button>
              </Row>
            </div>

            <div className="mb-panel">
              <div className="mb-panel-head">
                <b>실행 로그</b> <span>콜백 호출 시점·선택값 확인</span>
                <button className="mb-btn mb-neu" onClick={() => setLog('')}>지우기</button>
              </div>
              <pre className="mb-log">{log}</pre>
            </div>
          </div>
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .mb-scroll { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
        .mb-panel { flex: none; border: 1px solid #d8dee5; border-radius: 6px; overflow: hidden; }
        .mb-panel-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: #f4f6f8; border-bottom: 1px solid #d8dee5; font-size: 13px; }
        .mb-panel-head span { color: #8a8fa0; font-size: 12px; }
        .mb-panel-head button { margin-left: auto; }
        .mb-row { display: flex; border-top: 1px solid #eef1f4; font-size: 13px; }
        .mb-row:first-of-type { border-top: none; }
        .mb-th { flex: 0 0 140px; padding: 8px 10px; text-align: right; color: #5a6b7c;
          background: #fafbfc; box-sizing: border-box; }
        .mb-td { flex: 1; min-width: 0; padding: 7px 10px; display: flex; align-items: center;
          gap: 8px; flex-wrap: wrap; }
        .mb-hint { color: #1c5d99; font-size: 11.5px; font-family: Consolas, monospace; }
        .mb-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 4px 10px; font-size: 12px; color: inherit; cursor: pointer; }
        .mb-btn:hover { background: rgba(127,127,127,0.12); }
        .mb-out { border-color: #1c5d99; color: #1c5d99; }
        .mb-neu { border-color: #8a8fa0; }
        .mb-primary { background: #0f766e; border-color: #0f766e; color: #fff; font-weight: 700; }
        .mb-ipt { padding: 5px 8px; border: 1px solid #c4ccd5; border-radius: 5px;
          font-size: 12px; background: transparent; color: inherit; width: 160px; }
        .mb-log { margin: 0; padding: 10px 12px; font-size: 12px; white-space: pre-wrap;
          font-family: Consolas, monospace; color: #4a5568; max-height: 260px; overflow: auto; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .mb-panel { border-color: #2a3644; }

  :root:not([data-theme="light"]) .mb-panel-head { background: #161f29; border-bottom-color: #2a3644; }

  :root:not([data-theme="light"]) .mb-row { border-top-color: #1e2f3d; }

  :root:not([data-theme="light"]) .mb-th { background: #131a21; color: #93a5b6; }

  :root:not([data-theme="light"]) .mb-hint { color: #7fc1ff; }

  :root:not([data-theme="light"]) .mb-btn,
:root:not([data-theme="light"]) .mb-ipt { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .mb-out { border-color: #7fc1ff; color: #7fc1ff; }

  :root:not([data-theme="light"]) .mb-primary { background: #14b8a6; border-color: #14b8a6; color: #06131a; }

  :root:not([data-theme="light"]) .mb-log { color: #b9c6d3; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .mb-panel { border-color: #2a3644; }

:root[data-theme="dark"] .mb-panel-head { background: #161f29; border-bottom-color: #2a3644; }

:root[data-theme="dark"] .mb-row { border-top-color: #1e2f3d; }

:root[data-theme="dark"] .mb-th { background: #131a21; color: #93a5b6; }

:root[data-theme="dark"] .mb-hint { color: #7fc1ff; }

:root[data-theme="dark"] .mb-btn,
:root[data-theme="dark"] .mb-ipt { border-color: #3a4a5c; }

:root[data-theme="dark"] .mb-out { border-color: #7fc1ff; color: #7fc1ff; }

:root[data-theme="dark"] .mb-primary { background: #14b8a6; border-color: #14b8a6; color: #06131a; }

:root[data-theme="dark"] .mb-log { color: #b9c6d3; }

      `}</style>
    </div>
  )
}

export default MsgBoxTest
