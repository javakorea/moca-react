import { lazy, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { popup } from '@teammoca/react-popup'
import ComTitle from './com/ComTitle'
import PopItemSearch from './pop/PopItemSearch'
import PopCalendarZ from './pop/PopCalendarZ'

// 팝업 화면도 lazy 로 받을 수 있다 — 무거운 조회 팝업은 필요할 때 내려받는다
const PopUserSearch = lazy(() => import('./pop/PopUserSearch'))

// 표 한 줄 — 컴포넌트 정의는 화면 함수 "밖"에
const Row = ({ th, children, hint }) => (
  <div className="pt-row">
    <div className="pt-th">{th}</div>
    <div className="pt-td">
      {children}
      {hint && <span className="pt-hint">{hint}</span>}
    </div>
  </div>
)

const comma = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString())

// 팝업 데모 — MOCA TPL037 의 React 판.
// 팝업 3동사: 열기 popup.open(Component, {…}) · 파라미터 props.data · 닫기 props.close(결과).
// MOCA 는 url 로 팝업 HTML 을 지정했지만 React 는 컴포넌트를 그대로 넘긴다.
function PopupTest({ menuInfo }) {
  const [log, setLog] = useState('버튼을 눌러 팝업을 열어 보세요. 결과(close 로 넘긴 값)가 여기 찍힙니다.')
  const [item, setItem] = useState({ ITEM_CD: '', ITEM_NM: '', PRICE: '' })
  const [keyword, setKeyword] = useState('마우스')

  const say = (msg) => {
    const n = new Date()
    const t = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`
    setLog(`[${t}] ${msg}`)
  }

  // ① 기본 — 결과를 폼에 반영. 취소하면 callback 이 호출되지 않는다(MOCA 규약)
  const openBasic = () => {
    popup.open(PopItemSearch, {
      title: '품목 검색',
      width: 640,
      callback: (row) => {
        setItem(row)
        say(`선택됨 — ${row.ITEM_CD} / ${row.ITEM_NM} / ${comma(row.PRICE)}원`)
      },
    })
    say('popup.open 호출(파라미터 없음)')
  }

  // ② 파라미터 전달 — 팝업이 props.data 로 받아 검색어를 미리 채운다
  const openWithParam = () => {
    popup.open(PopItemSearch, {
      title: '품목 검색 (검색어 전달)',
      width: 640,
      data: { keyword },
      callback: (row) => say(`선택됨 — ${row.ITEM_NM}`),
    })
    say(`popup.open data:{ keyword:'${keyword}' } — 팝업이 props.data 로 받는다`)
  }

  // ③ 크기 옵션 — 미지정 시 560px · maxHeight 90vh
  const openSize = (width) => {
    popup.open(PopItemSearch, { title: `품목 검색 (${width}px)`, width, callback: (row) => say(`선택됨 — ${row.ITEM_NM}`) })
    say(`popup.open width:${width}`)
  }

  // ④ 모달 없이 — 뒤 화면 클릭이 막히지 않는다(조회용 보조창). 제목바를 잡아 옮길 수 있다
  const openModeless = () => {
    popup.open(PopItemSearch, {
      title: '품목 검색 (모달 아님 — 제목바를 잡아 옮겨보세요)',
      width: 560,
      modal: false,
      callback: (row) => say(`선택됨(모달 아님) — ${row.ITEM_NM}`),
    })
    say('popup.open modal:false — 뒤 화면을 계속 쓸 수 있다')
  }

  // 겹침 순서 시험 — 팝업 안에서 달력·메시지박스를 열어 사다리를 눈으로 본다
  const openZ = () => {
    popup.open(PopCalendarZ, { title: '겹침 순서 시험 (달력 · 메시지박스)', width: 520 })
    say('popup.open — 팝업 안에서 달력을 열어 보세요(달력 7800 > 팝업 7500)')
  }

  // ⑤ await 형 — 답에 따라 다음 줄이 갈린다(React 에서 가장 읽기 쉬운 형태)
  const openAwait = async () => {
    const row = await popup.open(PopItemSearch, { title: '품목 검색 (await)', width: 600 })
    say(row ? `await 결과 — ${row.ITEM_NM}` : 'await 결과 — undefined (취소로 닫힘)')
  }

  // ⑥ 실 데이터 팝업(lazy) — 팝업 안에서도 서버를 조회한다
  const openUser = async () => {
    const row = await popup.open(PopUserSearch, {
      title: '사용자 검색 (실 데이터)',
      width: 640,
      data: { DEPT_NM: '' },
    })
    say(row ? `사용자 선택 — ${row.USER_NM}(${row.DEPT_NM} · ${row.USER_ID})` : '사용자 검색 취소')
  }

  // ⑦ 겹쳐 열기 — 팝업 안에서 또 팝업(각자 자기 결과만 소유한다)
  const openStacked = async () => {
    const row = await popup.open(PopItemSearch, { title: '1단 팝업 — 여기서 또 열어보세요', width: 600 })
    if (!row) { say('1단 팝업 취소'); return }
    const row2 = await popup.open(PopItemSearch, { title: '2단 팝업 (겹쳐 열림)', width: 520 })
    say(`1단 ${row.ITEM_NM} / 2단 ${row2 ? row2.ITEM_NM : '취소'}`)
  }

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />

        <MocaReactLayout layout="h6:4">
          <div className="pt-scroll">
            <div className="pt-panel">
              <div className="pt-panel-head"><b>팝업 열기</b> <span>옵션별로 눌러 보세요</span></div>

              <Row th="기본" hint="결과를 아래 폼에 반영">
                <button className="pt-btn pt-out" onClick={openBasic}>품목 검색</button>
              </Row>
              <Row th="파라미터 전달" hint="data → props.data">
                <input className="pt-ipt" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                <button className="pt-btn pt-out" onClick={openWithParam}>전달하며 열기</button>
              </Row>
              <Row th="크기" hint="미지정 시 560px · maxHeight 90vh">
                <button className="pt-btn pt-out" onClick={() => openSize(420)}>420</button>
                <button className="pt-btn pt-out" onClick={() => openSize(640)}>640</button>
                <button className="pt-btn pt-out" onClick={() => openSize(900)}>900</button>
              </Row>
              <Row th="모달" hint="modal:false — 뒤 화면 조작 가능 + 제목바 드래그">
                <button className="pt-btn pt-out" onClick={openModeless}>모달 없이 열기</button>
              </Row>
              <Row th="await" hint="const row = await popup.open(...)">
                <button className="pt-btn pt-out" onClick={openAwait}>await 로 받기</button>
              </Row>
              <Row th="실 데이터(lazy)" hint="팝업 안에서 useSelect 로 서버 조회">
                <button className="pt-btn pt-out" onClick={openUser}>사용자 검색</button>
              </Row>
              <Row th="겹쳐 열기" hint="팝업 위에 팝업 — 각자 자기 결과만">
                <button className="pt-btn pt-out" onClick={openStacked}>2단으로 열기</button>
              </Row>
              <Row th="취소 확인" hint="close() = 취소 → callback 미발화">
                <button className="pt-btn pt-neu" onClick={() => {
                  popup.open(PopItemSearch, {
                    title: '닫기(취소) 확인',
                    width: 560,
                    callback: (row) => say(`callback 발화 — 확정으로 닫힘: ${row.ITEM_NM}`),
                  })
                  say('이 팝업에서 [닫기]·× ·ESC 를 누르면 로그가 더 찍히지 않습니다(= 취소)')
                }}>열고 [닫기] 눌러보기</button>
              </Row>
            </div>

            <div className="pt-panel">
              <div className="pt-panel-head"><b>선택 결과</b> <span>callback 이 반영한 값</span></div>
              <Row th="코드"><input className="pt-ipt pt-ro" value={item.ITEM_CD} readOnly /></Row>
              <Row th="품목명"><input className="pt-ipt pt-ro" value={item.ITEM_NM} readOnly /></Row>
              <Row th="단가"><input className="pt-ipt pt-ro" value={comma(item.PRICE)} readOnly /></Row>
            </div>
          </div>

          <MocaReactLayout layout="vfit:fit:fit">
            <div className="pt-panel pt-note">
              <div className="pt-note-title">팝업 3동사</div>
              <ul>
                <li><b>열기</b> — popup.open(Component, {'{'} title, width, data, callback {'}'})<br />
                  MOCA 는 url 이었지만 React 는 <b>컴포넌트를 그대로</b> 넘긴다(lazy 도 가능)</li>
                <li><b>파라미터</b> — 팝업이 <b>props.data</b> 로 받는다(MOCA getParameter)</li>
                <li><b>닫기</b> — 팝업이 <b>props.close(결과)</b> = 확정 / <b>close()</b> = 취소(콜백 미발화)</li>
                <li>팝업 화면도 업무 화면과 <b>같은 레이아웃 골격</b>(vfit:auto:fit)</li>
                <li>닫기 버튼은 <b>푸터 한 곳</b>에 — 제목바 × 는 팝업 셸이 준다</li>
              </ul>
            </div>

            <div className="pt-panel">
              <div className="pt-panel-head"><b>겹침 순서</b> <span>달력·메시지박스가 팝업 위에 뜨는가</span></div>
              {/* 달력은 **팝업 안**에 있어야 시험이 된다 — 업무 화면에 두면 팝업 딤이 덮어
                  열 방법이 없다(사용자 지적 2026-08-19) */}
              <Row th="시험" hint="팝업이 열리면 그 안에서 달력을 열어 본다 — 달력이 팝업 위에 보이면 정상">
                <button className="pt-btn" onClick={openZ}>겹침 순서 팝업 열기</button>
              </Row>
            </div>

            <div className="pt-panel">
              <div className="pt-panel-head"><b>실행 로그</b> <span>방금 수행한 한 건</span></div>
              <pre className="pt-log">{log}</pre>
            </div>
          </MocaReactLayout>
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .pt-scroll { height: 100%; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
        .pt-panel { flex: none; border: 1px solid #d8dee5; border-radius: 6px; overflow: hidden; }
        .pt-panel-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: #f4f6f8; border-bottom: 1px solid #d8dee5; font-size: 13px; }
        .pt-panel-head span { color: #8a8fa0; font-size: 12px; }
        .pt-row { display: flex; border-top: 1px solid #eef1f4; font-size: 13px; }
        .pt-row:first-of-type { border-top: none; }
        .pt-th { flex: 0 0 110px; padding: 8px 10px; text-align: right; color: #5a6b7c;
          background: #fafbfc; box-sizing: border-box; }
        .pt-td { flex: 1; min-width: 0; padding: 7px 10px; display: flex; align-items: center;
          gap: 8px; flex-wrap: wrap; }
        .pt-hint { color: #1c5d99; font-size: 11.5px; }
        .pt-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 4px 10px; font-size: 12px; color: inherit; cursor: pointer; }
        .pt-btn:hover { background: rgba(127,127,127,0.12); }
        .pt-out { border-color: #1c5d99; color: #1c5d99; }
        .pt-neu { border-color: #8a8fa0; }
        .pt-ipt { padding: 5px 8px; border: 1px solid #c4ccd5; border-radius: 5px;
          font-size: 12px; background: transparent; color: inherit; width: 150px; }
        .pt-ro { background: rgba(127,127,127,0.08); }
        .pt-note { padding: 10px 14px; }
        .pt-note-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
        .pt-note ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; color: #4a5568; }
        .pt-log { margin: 0; padding: 10px 12px; font-size: 12px; white-space: pre-wrap;
          font-family: Consolas, monospace; color: #4a5568; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .pt-panel { border-color: #2a3644; }

  :root:not([data-theme="light"]) .pt-panel-head { background: #161f29; border-bottom-color: #2a3644; }

  :root:not([data-theme="light"]) .pt-row { border-top-color: #1e2f3d; }

  :root:not([data-theme="light"]) .pt-th { background: #131a21; color: #93a5b6; }

  :root:not([data-theme="light"]) .pt-hint { color: #7fc1ff; }

  :root:not([data-theme="light"]) .pt-btn,
:root:not([data-theme="light"]) .pt-ipt { border-color: #3a4a5c; }

  :root:not([data-theme="light"]) .pt-out { border-color: #7fc1ff; color: #7fc1ff; }

  :root:not([data-theme="light"]) .pt-note ul,
:root:not([data-theme="light"]) .pt-log { color: #b9c6d3; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .pt-panel { border-color: #2a3644; }

:root[data-theme="dark"] .pt-panel-head { background: #161f29; border-bottom-color: #2a3644; }

:root[data-theme="dark"] .pt-row { border-top-color: #1e2f3d; }

:root[data-theme="dark"] .pt-th { background: #131a21; color: #93a5b6; }

:root[data-theme="dark"] .pt-hint { color: #7fc1ff; }

:root[data-theme="dark"] .pt-btn,
:root[data-theme="dark"] .pt-ipt { border-color: #3a4a5c; }

:root[data-theme="dark"] .pt-out { border-color: #7fc1ff; color: #7fc1ff; }

:root[data-theme="dark"] .pt-note ul,
:root[data-theme="dark"] .pt-log { color: #b9c6d3; }

      `}</style>
    </div>
  )
}

export default PopupTest
