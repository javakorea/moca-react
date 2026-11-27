# @teammoca/react-msgbox

MOCA React MsgBox — 알림(alert) · 오류(error) · 확인(confirm, 선택목록) · 필수값 안내 ·
진행 모달. MOCA 프레임워크 `moca.$g.alert/error/confirm`·`requiredFail`·`showProgress` 의
React 구현체(데모 TPL023 대응).

## 설치

```bash
npm install @teammoca/react-msgbox
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { msgbox, MocaReactMsgHost } from '@teammoca/react-msgbox'

// ① 앱 루트에 호스트를 한 번 놓는다
function App() {
  return (
    <>
      <MocaReactMsgHost />
      <Shell />
    </>
  )
}

// ② 어느 화면에서든 명령형으로 부른다
msgbox.alert('저장되었습니다.')                            // 알림(! 아이콘)
msgbox.alert('완료', () => reload())                       // 콜백(MOCA 호환)
msgbox.error('삭제할 수 없는 데이터입니다.')                 // 오류(danger + ✕)

// ③ await 로 답을 받으면 조건 분기가 읽기 쉽다
if (await msgbox.confirm('정말 삭제하시겠습니까?')) remove()

const mode = await msgbox.confirm('어디에 추가할까요?', {
  radios: [
    { value: 'child',   label: '하위 메뉴로 추가', desc: '아래 단계(자식)로 생성됩니다.', checked: true },
    { value: 'sibling', label: '같은 레벨로 추가', desc: '동일 단계(형제)로 생성됩니다.' },
  ],
})   // → 'child' | 'sibling' | null(취소)

// ④ 필수값 안내 — 항상 false 를 반환한다
if (!name) return msgbox.requiredFail('사용자명', () => ref.current.focus())

// ⑤ 진행 모달
msgbox.showProgress('조회중입니다', 0)   // 0 = 즉시(기본 300ms 지연 — 깜빡임 방지)
try { await tran.select('selectX') } finally { msgbox.hideProgress() }
```

## API

| 함수 | 설명 |
|---|---|
| `alert(message, cb?)` | 알림(확인 1개). Promise 반환 |
| `error(message, cb?)` | 오류 알림(danger + ✕) |
| `confirm(message, okCb?, cancelCb?, {radios}?)` | 확인/취소. 아래 4형태 |
| `requiredFail(label, focusCb?)` | 필수값 안내 — **항상 false 즉시 반환** |
| `showProgress(message?, delay=300)` | 진행 모달(delay 안에 끝나면 안 뜸) |
| `setProgressMsg(message)` / `hideProgress()` | 문구 교체 / 닫기 |

### confirm 호출 형태

| 호출 | 결과 |
|---|---|
| `confirm(msg)` | `Promise<boolean>` |
| `confirm(msg, ok, cancel)` | MOCA 호환 콜백 |
| `confirm(msg, ok, cancel, {radios})` | 확인 콜백에 선택값 |
| `confirm(msg, {radios})` | `Promise<선택값 \| null>` |

## 메시지는 문자열 또는 ReactNode

문자열은 **텍스트로** 들어가고 줄바꿈(`\n`)만 반영된다. 강조가 필요하면 노드를 넘긴다:

```jsx
msgbox.alert(<>처리 결과<br />성공 <b>12건</b> / 건너뜀 2건</>)
```

MOCA 는 메시지를 `innerHTML` 로 넣어 `<b>`·`<br/>` 을 썼지만, 서버에서 온 문장을 그대로 HTML 로
넣던 통로를 막아 XSS 여지를 없앤 것이다(의도된 차이).

## 동작

- 모달은 **큐로 한 번에 하나씩** 표시된다(MOCA 는 겹쳐 쌓였다). 진행 모달은 그 위에 별도로 뜬다.
- 키보드: `Enter`=확인, `ESC`=취소(confirm)/확인(alert·error). 열리면 확인 버튼에 포커스.
- 호스트(`<MocaReactMsgHost />`)가 없으면 표시되지 않고 콘솔에 경고가 뜬다.
- 라이트/다크 테마 자동 대응(MOCA demo 토큰).
