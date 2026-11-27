# @teammoca/react-input-calendar

MOCA React 달력 3종 — **날짜**(`MocaReactInputCalendar`) · **기간**(`MocaReactMultiCalendar`) ·
**붙박이**(`MocaReactCalendar`). MOCA 프레임워크 `inputCalendar` · `inputMultiCalendar` ·
`calendar` 의 React 구현체(데모 TPL042 · TPL043 · TPL044 대응).

## 설치

```bash
npm install @teammoca/react-input-calendar
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { MocaReactInputCalendar, mdate } from '@teammoca/react-input-calendar'

// 기본(일자) — 오늘로 시작, 값 확정 시 콜백
<MocaReactInputCalendar displayFormat="####-##-##" defaultValue="오늘"
  onDateSelected={(v) => console.log(v)} />   // v = '20260815'

// 연월 · 연 · 일시
<MocaReactInputCalendar dateType="yyyyMM" defaultValue="오늘" />
<MocaReactInputCalendar dateType="yyyy" defaultValue="3년전" width={110} />
<MocaReactInputCalendar dateType="yyyyMMdd hh:mm:ss" defaultValue="오늘" width={210} />

// 범위 제한 + ref API
const cal = useRef(null)
<MocaReactInputCalendar ref={cal} dateMin="20260710" dateMax="20260820" />
cal.current.setValue(mdate.addDay(cal.current.getValue(), 1))
```

## dateType — 한 속성이 전부를 정한다

| dateType | 고르는 것 | 값 자릿수 | 팝업 |
|---|---|---|---|
| `yyyy` | 연 | 4 | 연 목록(연대 10년) |
| `yyyyMM` | 연월 | 6 | 월 목록(12개월) |
| `yyyyMMdd` (기본) | 일자 | 8 | 일자 격자 |
| `yyyyMMddHHmm` | 일시(분) | 12 | 일자 격자 + 시·분 → [확인] |
| `yyyyMMdd hh:mm:ss` | 일시(초) | 14 | 일자 격자 + 시·분·초 → [확인] |

대소문자·구분자는 무시한다. 별칭: `year` · `month` · `date`/`day` · `datetime`.

## Props

| prop | 기본값 | 설명 |
|---|---|---|
| `dateType` | `'yyyyMMdd'` | 위 표 참조 |
| `value` / `onChange` | (없음) | 제어 모드 |
| `defaultValue` | (없음) | 비제어 초기값 — 숫자문자열 또는 상대일(`'오늘'` `'7일전'` `'3개월전'` `'당월'` `'전월'` …) |
| `displayFormat` | 타입 기본형식 | `#` 마스크 — 값은 그대로, 표시만 바뀐다 |
| `dateMin` / `dateMax` | (없음) | 선택가능 범위(yyyyMMdd) — 범위 밖 칸·이동버튼·[오늘] 잠김, 타이핑도 검증 |
| `readOnly` | `false` | 잠금(팝업도 안 열림) |
| `onDateSelected` | (없음) | `(value) => void` — 값 확정 시(`setValue` 는 미발화) |
| `width` | `160` | 입력칸 너비 |

## ref API

`getValue()` · `setValue(v)`(이벤트 미발화) · `setReadOnly(b)` · `clear()` · `focus()`

## 날짜 유틸 — `mdate`

MOCA `moca.$g.date` 대응. 전부 숫자문자열 기반이다.

```js
mdate.getToday()                    // '20260817'
mdate.addDay('20260817', -7)        // '20260810'
mdate.addMonth('20260131', 1)       // '20260228' (말일 보정)
mdate.getLastDayOfMonth('202602')   // '20260228'
mdate.shiftYm('202601', -1)         // '202512'
mdate.resolveRelative('3개월전')     // 상대일 → 값
```

## 기간 선택 — `MocaReactMultiCalendar`

한 컴포넌트가 입력칸 두 개(시작·종료)와 달력 두 판(좌 = 시작, 우 = 종료)을 관리한다.
`dateType` 계약은 단일 달력과 같고(같은 코어를 공유), 기간이라서 더해지는 것은 셋이다.

```jsx
import { MocaReactMultiCalendar, mdate } from '@teammoca/react-input-calendar'

<MocaReactMultiCalendar displayFormat="####-##-##" defaultValue="당월"
  onTermSelected={({ from, to }) => fnSearch(from, to)} />

<MocaReactMultiCalendar defaultValue="금주" maxTermByDay={31}
  quickItems="오늘,금주,당월,전월,당분기,당년" />     // 팝업 왼쪽 빠른선택 버튼

<MocaReactMultiCalendar dateType="yyyyMM" defaultValue="당년" />   // 연월 기간

term.current.getTerm()   // { from: '20260801', to: '20260831' }
term.current.setMultiCalendar({ from: '20260801', to: '20260831' })
```

| prop | 설명 |
|---|---|
| `defaultValue` | 기간 프리셋 문구 또는 `{ from, to }` |
| `quickItems` | 팝업 빠른선택 목록(기본 10종). `false` 면 숨김 |
| `maxTermByDay` / `maxTermByMonth` / `maxTermByYear` | 최대 기간 — 넘기면 선택 거부 |
| `from` / `to` / `onChange` | 제어 모드 |
| `onTermSelected` | `({from,to}) => void` — 기간 확정 시. 팝업에서는 **[확인]** 을 눌러야 발화(빠른선택·날짜 클릭만으로는 안 쏜다) |
| `dateMin` / `dateMax` / `readOnly` | 단일 달력과 동일 |

**기간 프리셋**(defaultValue·quickItems 공통): `오늘` · `전일` · `금주`(일~토) · `전주` ·
`당월`(1일~말일) · `전월` · `당분기` · `전분기` · `당년` · `전년` · `N일전/개월전/년전`.

**ref API**: `getTerm()` · `getValue()`(=from, MOCA 규약) · `setFrom(v)` · `setTo(v)` ·
`setMultiCalendar({from,to})` · `setReadOnly(b)` · `clear()` — set 계열은 이벤트 미발화.

- 종료값은 시각을 **23:59:59** 로 채운다 — 일시 타입에서 종료가 00:00:00 이면 그 날 하루가 빠진다.
- `from > to` 가 되면 **방금 고친 쪽을 살리고 반대쪽이 따라온다**.
- 팝업에서 기간 사이 칸은 연하게 채워져 선택 구간이 눈에 보인다.

## 붙박이 달력 — `MocaReactCalendar`

팝업이 아니라 **화면에 늘 펼쳐진 달력**이다 — 고른 날짜를 달력 위에서 확인하는 것이 목적
(예약일·근태·마감일 화면). 제목을 누르면 한 단계 위로 올라가고(일→월→연), 위 뷰에서 칸을
고르면 내려온다.

```jsx
import { MocaReactCalendar, mdate } from '@teammoca/react-input-calendar'

// 공휴일·휴무는 컴포넌트가 모른다 — 화면이 조회해 dayInfo 로 넘긴다
const [dayInfo, setDayInfo] = useState({})

<MocaReactCalendar ref={cal} dateType="yyyyMMdd"
  dayInfo={dayInfo}          // { '20260815': { holi: '광복절', off: true, badge: '휴' } }
  weekendOff legend
  onSelect={(v) => console.log(v, cal.current.getDayInfo(v))}
  onViewChange={(ym, view) => { if (view === 'day') loadHoli(ym) }} />

cal.current.setDateRange(mdate.getToday(), mdate.addDay(mdate.getToday(), 30))
```

| prop | 설명 |
|---|---|
| `dateType` | `'yyyyMMdd'`(기본) · `'yyyyMM'` · `'yyyy'` — 기본 뷰이면서 값 확정 단위 |
| `dayInfo` | `{ yyyyMMdd: { holi, off, badge, class } }` — 공휴일명·비영업일(빗금)·표식·추가 클래스 |
| `weekendOff` | 토·일 자동 비영업일. `dayInfo.off:false` 가 우선(예외 지정) |
| `legend` | 달력 아래 범례 — **지금 달력에 실제로 있는 표시만** 설명 |
| `startYm` / `header` / `todayButton` | 초기 기준 연월 · 헤더 · [오늘] 버튼. **[오늘]은 오늘을 고른다**(보기 이동이 아니다 — 달력 3종 공통). 읽기전용·연/월 목록 뷰에서는 이동만. ref `today()` 는 이동 전용으로 유지 |
| `dateMin` / `dateMax` / `readOnly` | 범위 제한 · 선택 잠금(이동은 가능) |
| `onSelect` / `onViewChange` | 값 확정 `(v, view)` · 기준 이동 `(ym, view)` |

**ref API**: `getValue/setValue/clear` · `setData({dayInfo})`/`getDayInfo(ymd)` ·
`setDateRange(min,max)`/`getDateRange()` · `getViewYm/setViewYm/today/next/prev/setReadOnly`

> `onViewChange` 는 "기준이 바뀔 때"만 발화한다 — **첫 조회는 화면이 `getViewYm()` 으로 직접**
> 한다(MOCA 와 같은 규약).

## 주요 동작

- **값과 표시의 분리**: 값은 숫자문자열(서버·SQL 과 그대로), 표시는 마스크가 만든다.
- **일시 타입은 시·분만 고른다**: 값의 초 자리는 들어온 값을 그대로 유지한다(기간이면 시작 00·종료 59). 값 자릿수는 타입 그대로(초까지면 14자리).
- **모바일(≤768px)**: 팝업이 입력칸 옆이 아니라 **화면 가운데 큰 달력**으로 열린다(딤 포함).
  손가락으로 짚을 수 있게 칸을 키우고, 기간 달력은 두 판을 세로로 쌓는다. 일시 타입의 시·분 셀렉트도 줄 폭을 나눠 크게 열린다. 설정할 props 는 없다.
- **팝업은 body 로 portal + fixed**: 폼·패널처럼 `overflow:auto` 인 스크롤 영역 안에서도
  잘리지 않고, 아래 공간이 없으면 위로 뜬다.
- **주말 색**(토 파랑·일 빨강)·오늘 표시·선택 표시는 MOCA 달력 규약을 따르며,
  OS 라이트/다크에 자동 대응한다.
