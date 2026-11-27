import { useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactFloatingButton } from '@teammoca/react-floating-button'
import ComTitle from './com/ComTitle'

// 플로팅 버튼 데모 — MOCA floatingButton 의 React 판.
// 원형(아이콘만)/알약형(label), 4모서리 position, 색 지정, 꾹(350ms) 눌러 드래그 이동.
// 화면 골격은 표준대로 MocaReactLayout — 우하단의 격자 버튼(Alt+L)은 레이아웃이
// 자동으로 붙인 골격 미리보기 FAB 다(이것도 이 컴포넌트로 만들어져 있다).
function FabTest({ menuInfo }) {
  const [log, setLog] = useState([])
  const hit = (name) => setLog((l) => [`${name} 클릭`, ...l].slice(0, 5))

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:fit:auto">
        <ComTitle menu={menuInfo} />
        <div className="fab-desc">
          <b>플로팅 버튼(FAB)</b> — 짧은 클릭은 동작 실행, <b>꾹 누르면(350ms) 드래그 모드</b>로
          자유롭게 옮길 수 있습니다(마우스·터치 공통). 아래 상자 안 버튼들은 absolute
          (상자 기준), 우하단 격자 버튼은 레이아웃의 골격 미리보기 토글(Alt+L과 동일)입니다.
          <div className="fab-log">{log.length ? log.join(' · ') : '버튼을 클릭해 보세요'}</div>
        </div>

        {/* mrl-fill — 모바일 세로스택에서 이 칸이 남은 높이를 채우게 하는 레이아웃 표식.
            안이 전부 absolute 라 내재 높이가 0 이어서, 없으면 상자가 주저앉고 화면 아래가 빈다 */}
        <div className="fab-playground mrl-fill">
          {/* 기본형 — plus 아이콘 원형(우하단) */}
          <MocaReactFloatingButton absolute onClick={() => hit('신규(plus)')} title="신규" />
          {/* 알약형 — label 지정 */}
          <MocaReactFloatingButton absolute position="lb" label="저장" icon="💾" onClick={() => hit('저장')} />
          {/* 글리프 아이콘 + 색 지정 */}
          <MocaReactFloatingButton absolute position="rt" icon="✏️" bgColor="#b4493e" onClick={() => hit('편집')} title="편집" />
          {/* 좌상단 */}
          <MocaReactFloatingButton absolute position="lt" icon="🔍" onClick={() => hit('검색')} title="검색" />
        </div>
      </MocaReactLayout>

      <style>{`
        .fab-desc { padding: 10px 12px; border: 1px solid #d8dee5; border-radius: 6px;
          font-size: 13px; line-height: 1.6; }
        .fab-log { margin-top: 6px; font-size: 12px; opacity: 0.7; }
        /* 높이가 핵심 — 이 상자의 내용은 전부 absolute(=높이에 기여 안 함)라, 모바일에서
           칸이 내용 높이로 줄면 0 이 된다. 그러면 버튼의 상하 이동 여지도 0 이 되어 좌우로만
           움직인다(2026-08-19 실측). 칸 자체를 채우는 것은 위 mrl-fill 표식이 하고,
           여기 min-height 는 남은 높이가 거의 없을 때의 바닥값이다. */
        .fab-playground { position: relative; height: 100%; min-height: 160px; box-sizing: border-box;
          border: 2px dashed #c4ccd5; border-radius: 8px; }
        @media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .fab-desc { border-color: #2a3644; }

  :root:not([data-theme="light"]) .fab-playground { border-color: #3a4a5c; }
}

/* 사용자가 테마를 고른 경우 — 위 블록과 값이 같아야 한다(호스트가 data-theme 을 지정) */
:root[data-theme="dark"] .fab-desc { border-color: #2a3644; }

:root[data-theme="dark"] .fab-playground { border-color: #3a4a5c; }

      `}</style>
    </div>
  )
}

export default FabTest
