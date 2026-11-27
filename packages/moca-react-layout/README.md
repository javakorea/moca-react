# @teammoca/react-layout

MOCA React Layout — `layout` 속성 하나로 자식들을 방향(v/h) + 비율 토큰으로 반응형 분할
배치하는 레이아웃 컴포넌트. MOCA 프레임워크 layout 컴포넌트의 React 구현체.

## 설치

```bash
npm install @teammoca/react-layout
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { MocaReactLayout } from '@teammoca/react-layout'

// 가장 흔한 골격 — 검색영역(fit) + 본문(auto). 본문은 h3:7 중첩(목록:상세)
<MocaReactLayout layout="vfit:auto">
  <div>검색영역</div>
  <MocaReactLayout layout="h3:7" ref={bodyRef}>
    <div>목록 (3)</div>
    <div>상세 (7)</div>
  </MocaReactLayout>
</MocaReactLayout>

bodyRef.current?.setRatio('h0:10')   // 런타임 변경 — 0 = 칸 접기
```

## 문법 — `layout="{방향}{토큰:토큰[:…]}"`

방향: `v` = 세로 스택(기본) · `h` = 가로 분할. 토큰은 자식 개수만큼 `:` 로 나열
(개수 제한 없음, 생략 시 균등 분할). 통짜(분할 없음)의 표준 표기는 `v1`.

| 토큰 | 의미 | 전형적 용도 |
|---|---|---|
| 숫자 | 상대 비율(flex-grow) — 합이 10일 필요 없다(2:8 = 1:4). `0` = 칸 접힘 | `h3:7` 목록:상세 |
| 숫자px | 고정 크기(주축 — h는 폭, v는 높이) | `h240px:auto` 사이드바 고정 |
| `fit` | 내용 크기만큼(hug) | `vfit:auto` 검색+본문 · `vfit:auto:fit` 팝업 골격 |
| `auto` | 남은 공간 전부(내부적으로 grow 1) | px/fit 고정 칸과 짝 |

## Props

| prop | 기본값 | 설명 |
|---|---|---|
| `layout` | `'v'` | 분할 스펙 문자열 |
| `width` / `height` | (없음) | 루트 고정 크기 — 주면 꽉채움 대신 이 크기 기준 분할(넘치면 부모 스크롤) |
| `gap` | `15` | 칸 사이 간격(px 숫자 또는 CSS 값) |
| `mobileHeights` | (없음) | 칸별 모바일(≤768px) 고정 높이 배열 — 해당 없는 칸은 `null`. PC 무영향 |
| `debug` | `false` | `true` 면 골격 미리보기 켠 채 시작 |
| `wireframeButton` | `true` | 루트 우하단의 골격 미리보기 토글 FAB(@teammoca/react-floating-button). 운영 화면은 `false` 로 숨김 |

## ref API

- `setRatio(spec)` — 런타임 비율(+방향) 변경. 방향 문자 생략 시 현재 방향 유지.
  예) `setRatio('7:3')` · `setRatio('h0:10')`(좌측 접기) · `setRatio('v5:5')`(세로 전환)

## 주요 동작

- **반응형**: 데스크톱은 부모를 스크롤 없이 꽉 채우고, 모바일(≤768px)은 방향 무관
  세로 스택 + 페이지 스크롤. 고정 px 칸은 내용 높이로 풀리고, 그리드(@teammoca/react-grid)가
  든 칸은 남은 높이를 채운다.
- **`mrl-fill` 표식**: 내재 높이가 없는 박스(내용이 전부 absolute, 캔버스 등)를 넣은 칸은 모바일
  세로스택에서 0 으로 주저앉아 화면 아래가 빈다. 그 박스에 `className="... mrl-fill"` 을 붙이면
  그 칸이 남은 높이를 채운다(그리드 칸 규칙의 일반형 — 그리드는 자동이라 표식 불필요).
- **중첩**: 칸 안에 MocaReactLayout 을 다시 넣으면 그 칸 안에서 재분할.
- **골격 미리보기**: `Alt+L` 또는 루트 우하단 격자 FAB 로 토글 — 칸 구조·스펙·토큰 라벨을
  와이어프레임으로 표시(개발용). 켜짐 상태는 FAB 가 primary 글로우로 표시.
- flex 값은 인라인이 아니라 CSS 변수로 전달 — 모바일 미디어쿼리가 눌러쓸 수 있게(MOCA 동일).
