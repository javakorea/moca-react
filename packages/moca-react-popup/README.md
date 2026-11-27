# @teammoca/react-popup

MOCA React Popup — 화면(컴포넌트)을 모달 창으로 띄우고 결과를 받는다.
MOCA 프레임워크 `$p.openPop` · `$p.getParameter` · `$p.close` 의 React 구현체(데모 TPL037 대응).

## 설치

```bash
npm install @teammoca/react-popup
```

React 18 이상이 필요하다 (peerDependency).

## 팝업 3동사

| 동사 | React | MOCA |
|---|---|---|
| 열기 | `popup.open(Component, 옵션)` | `$p.openPop(url, 옵션)` |
| 파라미터 | 팝업이 `props.data` 로 받는다 | `$p.getParameter()` |
| 닫기 | 팝업이 `props.close(결과)` | `$p.close(결과)` |

MOCA 는 팝업 화면을 **url**(HTML 경로)로 지정했지만 React 는 **컴포넌트를 그대로 넘긴다** —
화면이 곧 컴포넌트이므로 경로 문자열을 거칠 이유가 없고, `lazy()` 컴포넌트도 그대로 쓸 수 있다.

## 사용법

```jsx
import { popup, MocaReactPopupHost } from '@teammoca/react-popup'
import PopItemSearch from './pop/PopItemSearch'

// ① 앱 루트에 호스트를 한 번 놓는다
function App() {
  return (
    <>
      <MocaReactPopupHost />
      <Shell />
    </>
  )
}

// ② await 로 받기 — 권장. 답에 따라 다음 줄이 갈린다
const row = await popup.open(PopItemSearch, {
  title: '품목 검색',
  width: 640,
  data: { keyword },       // ← 팝업이 props.data 로 받는다
})
if (row) setItem(row)      // 취소면 undefined

// ③ 콜백 — MOCA openPop 호환. 취소면 콜백이 아예 불리지 않는다
popup.open(PopItemSearch, { title: '품목 검색', callback: (row) => setItem(row) })

// ④ 바깥에서 닫기
popup.close()              // 맨 위 팝업 취소
popup.closeAll()           // 전부 취소 — 화면 전환·로그아웃 때
```

### 팝업 화면

업무 화면과 **똑같이** 만든다. 다른 점은 파라미터를 `props.data` 로 받고 결과를
`props.close()` 로 돌려주는 것뿐이다.

```jsx
function PopItemSearch({ data, close }) {
  const [kw, setKw] = useState(data?.keyword ?? '')
  const [sel, setSel] = useState(null)

  return (
    <MocaReactLayout layout="vfit:auto:fit">           {/* 검색 · 목록 · 버튼 */}
      <SearchBar value={kw} onChange={setKw} />
      <MocaReactGrid columns={columns} data={rows} onRowSelected={setSel} />
      <footer>
        <button onClick={() => close(sel)}>선택</button>  {/* 확정 */}
        <button onClick={() => close()}>닫기</button>     {/* 취소 */}
      </footer>
    </MocaReactLayout>
  )
}
```

닫기 버튼은 **푸터 한 곳**에만 둔다 — 제목바 `×` 는 팝업 셸이 준다.

> **그리드를 담은 팝업은 높이를 확보해야 한다.** 높이가 "내용 기준"이면 레이아웃의 `auto`
> (남는 공간) 칸이 0 이 되어 목록이 보이지 않는다. 호출측에서 `height` 를 주거나, 팝업 화면
> 루트에 `minHeight` 를 준다:
>
> ```jsx
> <div style={{ height: '100%', minHeight: 400, padding: 10, boxSizing: 'border-box' }}>
> ```
>
> `height:'100%'` 와 함께 두면 호출측이 `height` 를 줬을 때 그 크기를 채우고, 안 줬을 때도
> 목록이 나온다.

## 옵션

| 옵션 | 설명 |
|---|---|
| `title` | 제목바 문구(aria-label 겸용) |
| `width` | 너비(숫자=px 또는 CSS). 생략 시 560px |
| `height` | 높이. 생략 시 내용 높이, 최대 90vh (그리드 팝업은 아래 주의) |
| `modal` | `false` 면 뒤 화면을 계속 쓸 수 있는 보조창 (기본 true) |
| `data` | 팝업에 넘기는 파라미터 → `props.data` |
| `callback` | 확정 결과 콜백(MOCA 호환). 취소면 호출되지 않는다 |
| `draggable` | 제목바 드래그 이동 (기본 true) |

## 확정과 취소

- `close(결과)` = **확정** → `callback` 발화 + Promise 결과
- `close()` · 제목바 `×` · `ESC` · `popup.close()` = **취소** → 콜백 미발화 + Promise `undefined`

MOCA 규약 그대로다. 취소에도 뭔가 해야 하면 콜백 대신 await 형을 쓴다.

## 동작

- 팝업은 **스택**이라 겹쳐 열린다(품목검색 → 거래처검색). 각 팝업은 자기 `data`·결과만 소유한다.
- `document.body` 포털 + `position:fixed` — 화면의 `overflow:auto` 에 잘리지 않는다.
- 팝업 컴포넌트가 `lazy()` 면 받는 동안 "화면 로딩중…" 을 보여준다(`Suspense` 내장).
- z-index 는 7500 부터 겹친 순서대로 — 달력(7800)·메시지박스(8000)가 팝업 위에 오도록 설계.
- 호스트(`<MocaReactPopupHost />`)가 없으면 표시되지 않고 콘솔에 경고가 뜬다.
- 라이트/다크 테마 자동 대응(MOCA demo 토큰).
