import './ComTitle.css'

// 공통 화면 타이틀바 — MOCA /ui/com/COM_TITLE.html 대응.
// MOCA 에서는 frame 으로 삽입하고 부모 스코프의 getParameter() 로 메뉴정보를 받아왔지만,
// React 판은 일반 컴포넌트 + props 다: 셸(App.jsx)이 화면에 자동 주입하는 menuInfo 를
// 그대로 넘기면 [메뉴ID] · 아이콘 · 제목 · 브레드크럼이 표시된다.
//
// props
//   menu      : 셸이 주입한 메뉴정보 { id, label, icon?, path? } — 화면이 받은 것을 그대로 전달
//   label     : 제목 직접 지정 (menu.label 보다 우선 — MOCA data-m-label 대응)
//   onRefresh : 지정하면 우측에 새로고침 버튼 표시 — 화면의 재조회 함수를 연결
//               (MOCA frame.reload 대응 — React 에선 화면이 자기 조회 함수를 넘긴다)
//
// 사용 예)
//   function SaleScreen({ menuInfo }) {
//     return <ComTitle menu={menuInfo} onRefresh={fnSearch} />
//   }

// 라벨 키워드 → 아이콘 자동 매핑 (MOCA fn_getTitleIcon 이식). menu.icon 이 있으면 그것이 우선
const ICON_MAP = [
  { keys: ['매출', '매입', '수익', '영업', '판매', '거래'], icon: '💰' },
  { keys: ['재고', '창고', '입출고', '자재', '출고', '입고'], icon: '📦' },
  { keys: ['직원', '사원', '인사', '채용', '급여', '조직'], icon: '👥' },
  { keys: ['거래처', '고객', '협력사', '업체', '파트너'], icon: '🏢' },
  { keys: ['발주', '주문', '구매', '계약', '견적'], icon: '📋' },
  { keys: ['공지', '게시판', '알림', '공고', '뉴스'], icon: '📢' },
  { keys: ['보고서', '리포트', '분석', '통계', '현황'], icon: '📊' },
  { keys: ['일정', '스케줄', '달력', '캘린더', '계획'], icon: '📅' },
  { keys: ['설정', '환경', '코드', '공통', '기준'], icon: '⚙️' },
  { keys: ['대시보드', '모니터', '요약', '홈'], icon: '🖥️' },
  { keys: ['메뉴', '권한', '시스템', '관리자'], icon: '🗂️' },
  { keys: ['파일', '첨부', '문서', '양식'], icon: '📁' },
  { keys: ['로그', '이력', '감사', '기록'], icon: '🗒️' },
  { keys: ['배송', '물류', '운송', '배달'], icon: '🚚' },
  { keys: ['생산', '제조', '공정', '설비'], icon: '🏭' },
  { keys: ['품질', '검사', '불량', 'QC'], icon: '🔍' },
  { keys: ['회원', '사용자', '계정', '로그인'], icon: '👤' },
  { keys: ['프로젝트', '업무'], icon: '💼' },
]

const titleIcon = (label) => {
  for (const m of ICON_MAP) {
    if (m.keys.some((k) => label.includes(k))) return m.icon
  }
  return '📄'
}

function ComTitle({ menu, label, onRefresh }) {
  const text = label ?? menu?.label ?? ''
  const icon = menu?.icon ?? titleIcon(text)
  /* 브레드크럼은 **상위 경로만** 보여준다 — 마지막 칸은 현재 화면이고 그 이름은 바로 옆
     제목에 이미 크게 적혀 있다(두 번 쓰면 좁은 폭에서 자리만 먹는다). menuInfo.path 는
     셸이 [그룹, 화면] 으로 넣으므로 마지막 하나를 뺀다. path 를 직접 넘길 때도 같은 규약 —
     "현재 화면까지 포함한 전체 경로"를 주면 된다. */
  const path = (menu?.path ?? []).slice(0, -1)
  return (
    <div className="com-title">
      <span className="com-title-icon">{icon}</span>
      {menu?.id && <span className="com-title-id">[{menu.id}]</span>}
      <span className="com-title-text">{text}</span>
      {path.length > 0 && (
        <span className="com-title-path">
          <span title="홈">🏠</span>
          {path.map((t, i) => (
            <span key={i}> › {t}</span>
          ))}
        </span>
      )}
      {onRefresh && (
        <button type="button" className="com-title-refresh" title="새로고침" onClick={onRefresh}>
          ⟳
        </button>
      )}
    </div>
  )
}

export default ComTitle
