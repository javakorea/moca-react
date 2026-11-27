import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactInputCalendar, MocaReactMultiCalendar } from '@teammoca/react-input-calendar'
import { msgbox } from '@teammoca/react-msgbox'

/* 겹침 순서(z-index 사다리) 시험용 팝업 — 달력·메시지박스가 **팝업 위에** 떠야 정상이다.
   업무 화면에 두면 시험이 성립하지 않는다: 팝업이 뜨는 순간 딤(mrp-dim)이 뒤 화면을 덮어
   그 달력을 열 방법 자체가 없다(2026-08-19 사용자 지적으로 여기로 옮겼다).
   사다리: MDI 7000 < 업무 팝업 7500↑ < 달력 7800 < 메시지박스 8000 < 진행 모달 8100 */
function PopCalendarZ({ close }) {
  return (
    <div style={{ height: '100%', minHeight: 300, padding: 14, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto:fit" gap={10}>
        <div className="pcz-hint">
          아래 달력을 열어 보세요. <b>달력이 이 팝업 위에</b> 보이면 정상입니다.
        </div>

        <div className="pcz-body">
          <div className="pcz-row">
            <span>날짜</span>
            <MocaReactInputCalendar defaultValue="오늘" displayFormat="####-##-##" />
          </div>
          <div className="pcz-row">
            <span>기간</span>
            <MocaReactMultiCalendar displayFormat="####-##-##" defaultValue="당월" />
          </div>
          <div className="pcz-row">
            <span>메시지</span>
            <button type="button" className="pcz-btn"
              onClick={() => msgbox.alert('메시지박스는 달력보다도 위(8000)에 뜬다.')}>
              알림 띄우기
            </button>
          </div>
        </div>

        <div className="pcz-foot">
          <button type="button" className="pcz-btn" onClick={() => close()}>닫기</button>
        </div>
      </MocaReactLayout>

      <style>{`
        .pcz-hint { font-size: 12.5px; color: #5a6b7c; }
        .pcz-body { display: flex; flex-direction: column; gap: 12px; overflow: auto; }
        .pcz-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .pcz-row > span { width: 48px; color: #5a6b7c; font-size: 12.5px; flex: none; }
        .pcz-foot { display: flex; justify-content: flex-end; }
        .pcz-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 7px 16px; font-size: 12.5px; color: inherit; cursor: pointer; }
        .pcz-btn:hover { background: rgba(127,127,127,0.12); }
      `}</style>
      <style>{`
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .pcz-hint,
          :root:not([data-theme="light"]) .pcz-row > span { color: #9fb0c0; }
          :root:not([data-theme="light"]) .pcz-btn { border-color: #3a4a5a; }
        }
        :root[data-theme="dark"] .pcz-hint,
        :root[data-theme="dark"] .pcz-row > span { color: #9fb0c0; }
        :root[data-theme="dark"] .pcz-btn { border-color: #3a4a5a; }
      `}</style>
    </div>
  )
}

export default PopCalendarZ
