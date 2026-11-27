# @teammoca/react-floating-button

MOCA React FloatingButton — 화면 위에 떠 있는 원형/알약형 액션 버튼(FAB).
MOCA 프레임워크 floatingButton 컴포넌트의 React 구현체.

## 설치

```bash
npm install @teammoca/react-floating-button
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { MocaReactFloatingButton } from '@teammoca/react-floating-button'

<MocaReactFloatingButton onClick={fnNew} title="신규" />              // plus 원형(우하단 fixed)
<MocaReactFloatingButton label="저장" icon="💾" onClick={fnSave} />   // 알약형(label)
<MocaReactFloatingButton absolute position="rt" icon="✏️" bgColor="#b4493e" onClick={fnEdit} />
```

## Props

| prop | 기본값 | 설명 |
|---|---|---|
| `label` | (없음) | 주면 알약형(아이콘+텍스트), 생략하면 원형. aria-label 로도 사용 |
| `icon` | `'plus'` | `'plus'`(내장 SVG) · 이미지 경로(`/`나 `.` 포함 → `<img>`) · 글리프 텍스트(이모지) · ReactNode |
| `iconMode` | `'img'` | `'mask'` 면 경로 아이콘을 CSS mask 로 currentColor 채움(색·테마 자동 추종) |
| `bgColor` / `color` | 테마 토큰 | 배경 / 아이콘·글자색 |
| `position` | `'rb'` | 모서리 — `rb`·`lb`·`rt`·`lt` |
| `absolute` | `false` | `true` 면 fixed 대신 부모(positioned ancestor) 기준 절대배치. **그 부모에는 `min-height` 를 줄 것** — 안이 전부 absolute 면 부모 높이가 0 이 되어(모바일에서 칸이 내용 높이로 줄 때) 드래그가 좌우로만 된다. 여지가 없는 축은 화면 기준으로 클램프해 되살리지만, 높이를 주는 것이 정석 |
| `draggable` | `true` | 꾹 눌러(350ms) 드래그 이동. 드래그 직후 클릭은 무시. `false` 로 끔 |
| `onClick` | (없음) | 클릭 콜백 (Enter/Space 키보드 포함) |
| `className` / `title` | (없음) | 외형 확장 — 쓰는 쪽 CSS 가 기본 외형(`.mrf`)을 덮을 수 있다 |

## 주요 동작

- **드래그 이동**: 꾹 누르면(350ms) 드래그 모드(마우스·터치 공통, Pointer Events).
  누른 채 8px 이상 스치면(스크롤 등) 대기 취소. 이동 위치는 뷰포트(fixed)/부모(absolute)
  안으로 클램프되고 마운트 동안만 유지된다(영속화 없음).
- **표시/숨김**: React 답게 조건부 렌더로 처리한다.
- `@teammoca/react-layout` 의 골격 미리보기 버튼이 이 컴포넌트로 만들어져 있다.
