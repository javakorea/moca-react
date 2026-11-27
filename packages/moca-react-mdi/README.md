# @teammoca/react-mdi

MOCA React MDI — 좌우 화면분할과 탭 드래그 이동(화면 상태 보존)을 갖춘 업무용 React MDI 탭 셸.
MOCA 프레임워크 mdi 컴포넌트의 React 구현체이며, MOCA demo 디자인 시스템(Warm Paper 라이트 / Technical Dark)을 따른다.

## 설치

```bash
npm install @teammoca/react-mdi
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { useRef, useState } from 'react'
import { MocaReactMdi } from '@teammoca/react-mdi'

function App() {
  const [tabs, setTabs] = useState([])
  const mdiRef = useRef(null)

  const openScreen = (key, title, content) => {
    setTabs((ts) => (ts.some((t) => t.key === key) ? ts : [...ts, { key, title, content }]))
    mdiRef.current?.activate(key) // 이미 열려 있으면 활성화만 (새 탭은 자동 활성화)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav>{/* 메뉴에서 openScreen(...) 호출 */}</nav>
      <main style={{ flex: 1, minHeight: 0 }}>
        <MocaReactMdi
          ref={mdiRef}
          tabs={tabs}
          onTabClose={(key) => setTabs((ts) => ts.filter((t) => t.key !== key))}
          emptyHint="메뉴에서 화면을 선택하세요"
        />
      </main>
    </div>
  )
}
```

## Props

| prop | 기본값 | 설명 |
|---|---|---|
| `tabs` | (필수) | `[{ key, title, content, pinned? }]` — 열린 탭 목록(부모가 소유). `title`/`content` 는 ReactNode. `pinned` 탭은 닫기 버튼 없음 |
| `onTabClose` | (없음) | `(key) => void` — 닫기/전체닫기 요청. 실제 제거(tabs 에서 빼기)는 부모 몫 |
| `onActiveChange` | (없음) | `(keys) => void` — 지금 보이는 탭 key 배열(분할 중이면 둘). 좌측 메뉴에서 "열려 있음"과 "지금 보고 있음"을 구분해 칠하는 용도. 값이 실제로 바뀔 때만 호출 |
| `emptyHint` | (없음) | 분할 아님 + 탭 0개일 때 보여줄 안내 문구 |

## ref (imperative)

| 메서드 | 설명 |
|---|---|
| `activate(key)` | 이미 열린 탭을 활성화 — 메뉴에서 같은 화면을 다시 클릭했을 때. 새로 추가된 탭은 자동 활성화 |

## 주요 동작

- **좌우 분할**: 탭바 우측 분할 버튼으로 서브 패널 토글. 패널 사이 리사이징바로 폭 조절(양쪽 최소 280px).
- **탭 드래그 이동**: 탭을 반대쪽 패널로 드래그하면 화면이 이동한다. 빈 패널에는 점선 드롭존과
  "탭을 드래그하여 이곳에 놓으세요" 힌트가 뜬다.
- **화면 상태 보존**: 탭 이동/전환 시 콘텐츠가 리마운트되지 않는다 — 탭별 고정 홀더에 portal 로
  렌더하고 홀더 DOM 만 패널 간에 옮기는 구조(MOCA 의 appendChild 이동과 동일한 효과).
- **병합**: 분할을 끄면 서브 패널의 탭이 메인 탭바에 합류하고, 다시 분할하면 원래 배치로 복귀
  (MOCA 는 서브 패널을 숨기지만, React 판은 탭 접근성을 위해 합류 방식을 택했다).
- **전체닫기**: 패널별 휴지통 버튼 — confirm 후 그 패널의 탭 전부에 `onTabClose` 를 호출한다.
- **테마**: OS 라이트/다크(`prefers-color-scheme`)에 따라 MOCA Warm Paper / Technical Dark 팔레트 적용.
- **모바일(≤768px)**: 탭바를 통째로 숨기고(탭·분할·전체닫기 버튼이 모두 그 안에 있다), 분할 중이면
  좌우가 아니라 위아래로 쌓는다. 설정할 props 는 없다 — 폭에만 반응한다. 탭바가 없는 동안 화면
  전환은 `activate(key)` 가 맡으므로, 셸의 메뉴에서 그 호출만 이어 주면 된다.

## 데모 실행 (이 저장소 안에서)

저장소 루트에서:

```bash
npm install
npm run dev   # → http://localhost:5173 — 데모 앱 셸 자체가 이 컴포넌트다
```
