# @teammoca/react-schedule-calendar

MOCA React ScheduleCalendar — 월간 일정 달력. MOCA 프레임워크 `scheduleCalendar` 의 React
구현체(데모 TPL041 대응). 날짜를 **고르는** 달력은 `@teammoca/react-input-calendar` 쪽이다.

## 설치

```bash
npm install @teammoca/react-schedule-calendar
```

React 18 이상이 필요하다 (peerDependency). 날짜 유틸로 `@teammoca/react-input-calendar` 를 함께 받는다.

## 사용법 — 화면이 하는 일은 셋뿐

```jsx
import { MocaReactScheduleCalendar } from '@teammoca/react-schedule-calendar'

const scc = useRef(null)

<MocaReactScheduleCalendar ref={scc}
  schedules={schedules}      // 아이템 배열(아래 규격)
  dayInfo={dayInfo}          // { '20260815': { holi: '광복절', wthr: '☀️', badges: ['휴'] } }
  hideOutside todayFlag menuButton
  onMonthChange={(ym) => loadMonth(ym)}                       // ① 월 변경 시 조회
  onDayClick={(day) => show(scc.current.getDayItems(day.ymd))} // ③ 서버 재조회 없이 그 날 목록
  dayRenderer={(day) => (day.dow === 0 ? <span>휴일</span> : null)} />

// 초기 조회는 onMonthChange 가 발화하지 않는다 — 화면이 직접 한다
useEffect(() => { loadMonth(scc.current.getYm()) }, [])
```

① 월 변경 시 조회 → ② 결과를 아이템으로 매핑해 넘기기 → ③ 일자 클릭 시 `getDayItems`.
**연속일정 전개·정렬·바 그리기·공휴일/날씨 표기·좌우 스와이프는 컴포넌트가 한다.**

## 일정 아이템

| 필드 | 설명 |
|---|---|
| `start` | `yyyyMMdd` — 필수 |
| `end` | 생략하면 단일 일정 |
| `title` / `ico` | 제목 · 이모지(완료면 숨김) |
| `done` / `crucial` | 완료(배경 없음+취소선) · 중요(◆) |
| `span` | 연속 여부. 생략 시 `end > start` 로 판정 |
| `bg` / `fg` / `mark` | 바 배경 · 글자색 · 마커색(생략 시 fg) |
| `time` / `endTime` | `HHmm` — 시작시간은 정렬키, endTime 은 상세 표시용 |
| `seq` | 동순위 최후 정렬키(최근 우선) |
| `data` | 원본 행 — 컴포넌트는 보관만 하고 `getDayItems` 로 돌려준다 |

## Props

| prop | 설명 |
|---|---|
| `schedules` / `dayInfo` / `hideOutside` | 일정 · 일자메타 · 앞뒤월 칸 숨김 |
| `startYm` | 초기 표시 월(기본 이번 달) |
| `header` / `menuButton` / `todayFlag` | 내부 헤더 · 햄버거 버튼 · TODAY 깃발 |
| `dayRenderer` | `(day) => ReactNode` — 날짜 아래 추가 내용. day={ymd,dd,dow,inMonth,today} |
| `onMonthChange` / `onDayClick` / `onMenuClick` | 월 변경 · 일자 클릭 · 메뉴 클릭 |

## ref API

`setData({schedules,dayInfo,hideOutside})` · `getDayItems(ymd)` · `getDayInfo(ymd)` ·
`getYm()` · `setYm(ym)` · `today()` · `next()` · `prev()` · `refresh()`

`getDayItems` 는 **화면 순서 그대로** 돌려주고 각 항목에 `pos`('one'|'s'|'m'|'e')와 `ymd` 를 더한다.

## 정렬 규칙 (화면의 "줄"을 만든다)

① 완료는 뒤 ② 연속 우선(인접 칸에서 같은 슬롯을 유지해 한 줄로 이어져 보인다)
③ 시작일 ④ 시작시간(없으면 2359) ⑤ seq 내림 — MOCA 규칙 그대로다.
