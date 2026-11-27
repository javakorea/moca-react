// oxlint-disable react/only-export-components -- 컴포넌트 파일이 아니라 화면 레지스트리(데이터)다.
// lazy 참조만 있어 Fast Refresh 경고가 오탐된다(화면 소스 수정은 각 화면 파일에서 HMR 됨)
import { lazy } from 'react'

// 화면은 전부 lazy 로딩 — MOCA frame 의 화면 지연 로드와 같은 컨셉.
// 빌드 시 화면(+그 화면만 쓰는 라이브러리, 예: 차트의 echarts)이 별도 청크로 잘리고,
// 사용자가 그 탭을 처음 열 때 네트워크로 가져온다. 로딩 중 표시는 App.jsx 의 Suspense.
const Dashboard = lazy(() => import('./Dashboard'))
const UserList = lazy(() => import('./UserList'))
const Notice = lazy(() => import('./Notice'))
const MenuManage = lazy(() => import('./MenuManage'))
const GridTest = lazy(() => import('./GridTest'))
const TreeGrid = lazy(() => import('./TreeGrid'))
const SaleAgg = lazy(() => import('./SaleAgg'))
const GridEditTest = lazy(() => import('./GridEditTest'))
const LayoutTest = lazy(() => import('./LayoutTest'))
const FabTest = lazy(() => import('./FabTest'))
const ChartTest = lazy(() => import('./ChartTest'))
const CalendarTest = lazy(() => import('./CalendarTest'))
const TermTest = lazy(() => import('./TermTest'))
const CalendarInlineTest = lazy(() => import('./CalendarInlineTest'))
const ScheduleTest = lazy(() => import('./ScheduleTest'))
const SearchComboTest = lazy(() => import('./SearchComboTest'))
const MsgBoxTest = lazy(() => import('./MsgBoxTest'))
const PopupTest = lazy(() => import('./PopupTest'))

// 메뉴 레지스트리 — MOCA 처럼 2단 구조.
// 1단(그룹)은 상단 메뉴바에, 2단(화면)은 좌측 메뉴에 표시된다.
//   그룹:  key · title · icon · children
//   화면:  key    : 고유 식별자 (같은 key의 창은 중복으로 열리지 않음)
//          title  : 창 제목 및 메뉴 표시명
//          icon   : 메뉴/창 제목에 표시할 이모지
//          component : 렌더링할 리액트 컴포넌트
// 새 화면을 추가하려면 원하는 그룹의 children 에 lazy 한 줄 + 등록 한 줄이면 된다.
const menus = [
  {
    key: 'home',
    title: '대시보드',
    icon: '🏠',
    children: [
      { key: 'dashboard', title: '대시보드', icon: '📊', component: Dashboard },
    ],
  },
  {
    key: 'work',
    title: '업무',
    icon: '🗂️',
    children: [
      { key: 'userlist', title: '사용자 목록', icon: '👥', component: UserList },
      { key: 'notice', title: '공지사항', icon: '📢', component: Notice },
      { key: 'menumanage', title: '메뉴관리', icon: '🧭', component: MenuManage },
    ],
  },
  {
    key: 'sample',
    title: '샘플',
    icon: '🧪',
    children: [
      { key: 'gridtest', title: '가상 그리드', icon: '⚡', component: GridTest },
      { key: 'treegrid', title: '트리그리드', icon: '🌲', component: TreeGrid },
      { key: 'saleagg', title: '소계·합계 그리드', icon: '🧮', component: SaleAgg },
      { key: 'gridedit', title: '편집·엑셀 그리드', icon: '✏️', component: GridEditTest },
      { key: 'layouttest', title: '레이아웃', icon: '📐', component: LayoutTest },
      { key: 'fabtest', title: '플로팅 버튼', icon: '🔘', component: FabTest },
      { key: 'charttest', title: '차트', icon: '📊', component: ChartTest },
      { key: 'calendartest', title: '날짜 선택(달력)', icon: '📅', component: CalendarTest },
      { key: 'termtest', title: '기간 선택(달력)', icon: '🗓️', component: TermTest },
      { key: 'calinline', title: '붙박이 달력', icon: '📆', component: CalendarInlineTest },
      { key: 'scheduletest', title: '일정 달력', icon: '🗒️', component: ScheduleTest },
      { key: 'searchcombo', title: '검색 콤보', icon: '🔎', component: SearchComboTest },
      { key: 'msgboxtest', title: '메시지박스', icon: '💬', component: MsgBoxTest },
      { key: 'popuptest', title: '팝업', icon: '🪟', component: PopupTest },
    ],
  },
]

export default menus
