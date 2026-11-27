import { useRef, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactSearchCombo } from '@teammoca/react-search-combo'
import ComTitle from './com/ComTitle'

// 표 한 줄(라벨 + 컴포넌트 + 설명) — ★ 컴포넌트 정의는 화면 함수 "밖"에.
// 안에 두면 리렌더마다 새 타입이 되어 React 가 서브트리를 재마운트한다(입력값이 리셋된다)
const Row = ({ th, children, hint }) => (
  <div className="sct-row">
    <div className="sct-th">{th}</div>
    <div className="sct-td">
      {children}
      {hint && <span className="sct-hint">{hint}</span>}
    </div>
  </div>
)

// 지역 코드 — 짧은 목록(기본 동작 확인용)
const AREAS = [
  { cd: '1000', nm: '서울특별시' },
  { cd: '2600', nm: '부산광역시' },
  { cd: '2700', nm: '대구광역시' },
  { cd: '2800', nm: '인천광역시' },
  { cd: '2900', nm: '광주광역시' },
  { cd: '3000', nm: '대전광역시' },
  { cd: '3100', nm: '울산광역시' },
  { cd: '4100', nm: '경기도' },
]

// 필드명이 cd/nm 이 아닌 목록 — cdKey/nmKey 확인용
const DEPTS = [
  { DEPT_CD: 'D10', DEPT_NM: '경영지원팀' },
  { DEPT_CD: 'D20', DEPT_NM: '영업1팀' },
  { DEPT_CD: 'D30', DEPT_NM: '영업2팀' },
  { DEPT_CD: 'D40', DEPT_NM: '개발팀' },
  { DEPT_CD: 'D50', DEPT_NM: '품질보증팀' },
]

// 긴 목록 — 스크롤과 "아래 자리가 모자라면 위로 뒤집기" 확인용
const MANY = Array.from({ length: 300 }, (_, i) => ({
  cd: String(i + 1).padStart(4, '0'),
  nm: `품목 ${String(i + 1).padStart(4, '0')} — ${['볼트', '너트', '와셔', '베어링', '샤프트'][i % 5]}`,
}))

// SearchCombo 데모 — MOCA searchCombo(TPL013/TPL014) 의 React 판.
// 핵심은 "필터가 표시문구 기준" 이라는 것 — 코드로도 검색시키려면 displayFormat 으로
// 코드를 문구에 넣어야 한다. 헤더 메뉴 검색이 그 용법을 그대로 쓴다.
function SearchComboTest({ menuInfo }) {
  const [log, setLog] = useState('각 콤보에 타이핑해 보세요. ↓↑ 로 이동, Enter 로 확정, Esc 로 닫기.')
  const [area, setArea] = useState('2600') // 제어 컴포넌트 데모 — 값의 주인은 화면
  const basic = useRef(null)

  const now = new Date()
  const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  const say = (msg) => setLog(`[${stamp}] ${msg}`)

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />

        <MocaReactLayout layout="h6:4">
          <div className="sct-scroll">
            <div className="sct-panel">
              <div className="sct-panel-head">
                <b>SearchCombo</b> <span>속성별 변형</span>
                <button
                  className="sct-btn sct-out"
                  onClick={() => say(`기본 콤보 — 값 ${basic.current?.getValue() || '(없음)'} / 표시 ${basic.current?.getLabel() || '(없음)'}`)}
                >
                  값 읽기
                </button>
              </div>

              <Row th="기본" hint="이름으로만 검색된다 — 표시문구가 nm 뿐이라">
                <MocaReactSearchCombo
                  ref={basic}
                  list={AREAS}
                  placeholder="지역 검색"
                  onChange={(v, row) => say(`onChange — ${v} / ${row.nm}`)}
                />
              </Row>

              <Row th="코드까지 검색" hint='displayFormat="[value] · [label]" — "2600" 으로도 걸린다'>
                <MocaReactSearchCombo list={AREAS} displayFormat="[value] · [label]" width={200} />
              </Row>

              <Row th="필드명 지정" hint='cdKey="DEPT_CD" nmKey="DEPT_NM"'>
                <MocaReactSearchCombo
                  list={DEPTS}
                  cdKey="DEPT_CD"
                  nmKey="DEPT_NM"
                  defaultValue="D40"
                  width={180}
                  onChange={(v) => say(`부서 선택 — ${v}`)}
                />
              </Row>

              <Row th="제어 컴포넌트" hint={`value=${area} — 값의 주인은 화면(state)`}>
                <MocaReactSearchCombo
                  list={AREAS}
                  value={area}
                  onChange={(v) => { setArea(v); say(`제어 콤보 → ${v}`) }}
                />
                <button className="sct-btn sct-out" onClick={() => setArea('4100')}>경기도로</button>
                <button className="sct-btn sct-neu" onClick={() => setArea('')}>비우기</button>
              </Row>

              <Row th="읽기전용 / 비활성" hint="readOnly · disabled">
                <MocaReactSearchCombo list={AREAS} defaultValue="1000" readOnly />
                <MocaReactSearchCombo list={AREAS} defaultValue="1000" disabled />
              </Row>

              <Row th="검색창 용법" hint="clearOnSelect — 고르고 나면 입력칸을 비운다(헤더 메뉴검색과 같은 설정)">
                <MocaReactSearchCombo
                  list={AREAS}
                  clearOnSelect
                  placeholder="고르면 비워집니다"
                  width={200}
                  onChange={(v, row, changed) => say(`clearOnSelect — ${row.nm} (changed=${changed})`)}
                />
              </Row>

              <Row th="긴 목록(300건)" hint="스크롤 + 화면 아래쪽에서는 목록이 위로 뒤집힌다">
                <MocaReactSearchCombo list={MANY} displayFormat="[value] · [label]" width={240} />
              </Row>

              <Row th="ref API">
                <button className="sct-btn sct-out" onClick={() => { basic.current?.setValue('4100'); say("setValue('4100')") }}>setValue</button>
                <button className="sct-btn sct-out" onClick={() => { basic.current?.clear(); say('clear()') }}>clear</button>
                <button className="sct-btn sct-out" onClick={() => { basic.current?.open(); say('open()') }}>open</button>
                <button className="sct-btn sct-out" onClick={() => { basic.current?.focus(); say('focus()') }}>focus</button>
                <button className="sct-btn sct-neu" onClick={() => say(`getList().length = ${basic.current?.getList().length}`)}>getList</button>
              </Row>
            </div>
          </div>

          <div className="sct-scroll">
            <div className="sct-panel">
              <div className="sct-panel-head"><b>조작</b> <span>MOCA searchCombo 동일</span></div>
              <div className="sct-note">
                <ul>
                  <li><b>타이핑</b> — 목록이 열리며 표시문구 부분일치로 좁혀진다(대소문자 무시)</li>
                  <li><b>↓ / ↑</b> — 보이는 항목 사이 하이라이트 이동. <b>값은 아직 바뀌지 않는다</b></li>
                  <li><b>Enter</b> — 하이라이트 항목 확정 → onChange</li>
                  <li><b>Esc</b> — 목록 닫기</li>
                  <li><b>▼</b> — 필터를 풀고 전체 목록 열기/닫기</li>
                  <li><b>바깥 클릭</b> — 닫고 입력칸을 확정값 표시로 되돌린다</li>
                </ul>
              </div>
            </div>

            <div className="sct-panel">
              <div className="sct-panel-head"><b>알아둘 것</b></div>
              <div className="sct-note">
                <ul>
                  <li><b>필터는 표시문구 기준</b>이다. 코드로 검색시키려면 <code>displayFormat</code> 으로 코드를 문구에 넣는다</li>
                  <li>목록은 <code>fixed</code> 로 뜬다 — 레이아웃 칸이나 헤더 안에서 잘리지 않고, 아래 자리가 모자라면 위로 뒤집힌다</li>
                  <li>같은 항목을 다시 골라도 <code>onChange</code> 가 온다(<code>changed:false</code>) — 메뉴 검색처럼 &quot;행위&quot;가 필요한 화면 때문</li>
                  <li>이 화면의 위쪽 <b>헤더 메뉴 검색</b>이 같은 컴포넌트다 — <code>clearOnSelect</code> + 화면 목록</li>
                </ul>
              </div>
            </div>

            <div className="sct-panel">
              <div className="sct-panel-head"><b>로그</b></div>
              <pre className="sct-log">{log}</pre>
            </div>
          </div>
        </MocaReactLayout>
      </MocaReactLayout>

      <style>{`
        .sct-scroll { height: 100%; overflow: auto; padding-right: 4px; box-sizing: border-box; }
        .sct-panel { border: 1px solid #d8dee5; border-radius: 6px; margin-bottom: 10px; overflow: visible; }
        .sct-panel-head { display: flex; align-items: center; gap: 8px; padding: 7px 12px;
          background: #f4f6f8; border-bottom: 1px solid #d8dee5; font-size: 13px; }
        .sct-panel-head span { font-size: 12px; color: #8a8fa0; }
        .sct-panel-head button { margin-left: auto; }
        .sct-row { display: flex; align-items: center; border-top: 1px solid #eceff2; min-height: 40px; }
        .sct-row:first-of-type { border-top: none; }
        .sct-th { flex: 0 0 130px; padding: 6px 10px; background: #fafbfc; font-size: 12.5px;
          font-weight: 600; color: #46586a; align-self: stretch; display: flex; align-items: center; }
        .sct-td { flex: 1; min-width: 0; display: flex; align-items: center; flex-wrap: wrap;
          gap: 6px; padding: 6px 10px; }
        .sct-hint { font-size: 11.5px; color: #1c5d99; }
        .sct-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 4px 9px; font-size: 12px; color: inherit; cursor: pointer; }
        .sct-btn:hover { background: rgba(127,127,127,0.12); }
        .sct-out { border-color: #1c5d99; color: #1c5d99; }
        .sct-neu { border-color: #8a8fa0; }
        .sct-note { padding: 10px 14px; }
        .sct-note ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.8; color: #4a5568; }
        .sct-note code { font-family: Consolas, monospace; font-size: 12px; }
        .sct-log { margin: 0; padding: 10px 12px; font-size: 12px; white-space: pre-wrap;
          font-family: Consolas, monospace; color: #4a5568; }

        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .sct-panel { border-color: #2a3644; }
          :root:not([data-theme="light"]) .sct-panel-head { background: #161f29; border-bottom-color: #2a3644; }
          :root:not([data-theme="light"]) .sct-row { border-top-color: #1e2f3d; }
          :root:not([data-theme="light"]) .sct-th { background: #131a21; color: #93a5b6; }
          :root:not([data-theme="light"]) .sct-hint { color: #7fc1ff; }
          :root:not([data-theme="light"]) .sct-btn { border-color: #3a4a5c; }
          :root:not([data-theme="light"]) .sct-out { border-color: #7fc1ff; color: #7fc1ff; }
          :root:not([data-theme="light"]) .sct-note ul,
          :root:not([data-theme="light"]) .sct-log { color: #b9c6d3; }
        }

        /* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
        :root[data-theme="dark"] .sct-panel { border-color: #2a3644; }
        :root[data-theme="dark"] .sct-panel-head { background: #161f29; border-bottom-color: #2a3644; }
        :root[data-theme="dark"] .sct-row { border-top-color: #1e2f3d; }
        :root[data-theme="dark"] .sct-th { background: #131a21; color: #93a5b6; }
        :root[data-theme="dark"] .sct-hint { color: #7fc1ff; }
        :root[data-theme="dark"] .sct-btn { border-color: #3a4a5c; }
        :root[data-theme="dark"] .sct-out { border-color: #7fc1ff; color: #7fc1ff; }
        :root[data-theme="dark"] .sct-note ul,
        :root[data-theme="dark"] .sct-log { color: #b9c6d3; }
      `}</style>
    </div>
  )
}

export default SearchComboTest
