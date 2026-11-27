# @teammoca/react-search-combo

MOCA React SearchCombo — 타이핑으로 목록을 좁혀 고르는 검색형 콤보.
MOCA 프레임워크 searchCombo 컴포넌트의 React 구현체.

## 설치

```bash
npm install @teammoca/react-search-combo
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { MocaReactSearchCombo } from '@teammoca/react-search-combo'

// 기본 — 코드/이름 목록에서 고르기
<MocaReactSearchCombo
  list={[{ cd: '1000', nm: '서울' }, { cd: '2000', nm: '부산' }]}
  value={area}
  onChange={(v) => setArea(v)}
/>

// 코드까지 검색되게 — 표시문구에 코드를 넣으면 코드로도 걸린다(필터는 표시문구 기준)
<MocaReactSearchCombo list={codes} displayFormat="[value] · [label]" width={220} />

// 검색창 용법 — 고르고 나면 입력칸을 비운다
<MocaReactSearchCombo list={menuList} clearOnSelect placeholder="메뉴 검색" onChange={openScreen} />
```

## Props

| prop | 기본값 | 설명 |
|---|---|---|
| `list` | (필수) | `[{ cd, nm }]` 목록. `null` 항목은 걸러낸다 |
| `cdKey` / `nmKey` | `'cd'` / `'nm'` | 코드·표시명 필드명 (MOCA `data-m-cdkey`/`nmkey`) |
| `value` | (없음) | 선택 코드값. 주면 **제어 컴포넌트** — 값을 바꾸는 책임은 화면에 있다 |
| `defaultValue` | `''` | 비제어일 때 초기 선택값 |
| `displayFormat` | (없음) | 표시문구 틀 — `[value]`/`[label]` 치환 (MOCA `data-m-displayformat`). **필터가 이 문구 기준**이라 검색시킬 값은 여기 들어 있어야 한다 |
| `placeholder` | `'내용을 입력하세요'` | 입력칸 안내문 (MOCA 동일) |
| `readOnly` | `false` | 입력 불가 + ▼ 버튼 없음 (MOCA `data-m-readonly`) |
| `disabled` | `false` | 비활성 |
| `clearOnSelect` | `false` | 확정 후 입력칸 비우기 — 검색창 용법 |
| `emptyText` | `'검색 결과가 없습니다'` | 결과 0건일 때 목록에 표시할 안내문 |
| `maxHeight` | `200` | 목록 최대 높이(px) — MOCA 동일 |
| `width` | (CSS 160px) | 컴포넌트 폭 |
| `className` | (없음) | 외형 확장 — 쓰는 쪽 CSS 가 기본 외형(`.mrsc`)을 덮을 수 있다 |
| `onChange` | (없음) | `(value, item, changed) => void` — **확정(Enter/클릭) 시에만**. `changed` 는 이전 값과 다른지 |

## ref API

```jsx
const scRef = useRef(null)
<MocaReactSearchCombo ref={scRef} list={rows} />
scRef.current.setValue('2000')
```

| 메서드 | 설명 |
|---|---|
| `getValue()` | 선택 코드값 |
| `getLabel()` | 선택 표시문구 |
| `setValue(v)` | 값 지정 + 입력칸 표시 갱신 |
| `clear()` | 선택·입력 초기화 |
| `focus()` | 입력칸 포커스 |
| `open()` / `close()` | 목록 열기(전체) / 닫기 |
| `getList()` | 현재 목록 사본 |

## 조작 (MOCA 동일)

| 조작 | 동작 |
|---|---|
| 타이핑 | 목록이 열리며 표시문구 부분일치로 좁혀진다 |
| `↓` `↑` | 보이는 항목 사이 하이라이트 이동 — **값은 아직 안 바뀐다** |
| `Enter` | 하이라이트 항목 확정 → `onChange` |
| `Esc` | 목록 닫기 |
| ▼ 버튼 | 필터를 풀고 전체 목록 열기/닫기 |
| 바깥 클릭 | 닫고 입력칸을 확정값 표시로 되돌린다 |

목록은 `position: fixed` 로 뷰포트 기준에 띄우고 아래 자리가 모자라면 위로 뒤집는다 —
레이아웃 pane(`overflow:auto`)이나 높이 48px 헤더 안에서도 잘리지 않는다(MOCA 와 같은 이유·방식).

## MOCA 와 일부러 다른 점

1. **대소문자 무시 필터** — MOCA 는 `textContent.includes` 라 `tpl011` 로 `TPL011` 이 안 걸린다.
2. **타이핑만으로는 값이 바뀌지 않는다** — 확정은 Enter/클릭뿐. MOCA 는 필터가 돌 때마다 첫 매칭을
   선값해서 치는 도중 값이 계속 바뀌고, 그래서 MOCA demo 의 헤더 메뉴 검색은 그 선값을 매번 지우는
   우회를 넣어야 했다.
3. **결과 0건이면 안내 한 줄을 보여준다** — MOCA 는 목록이 그냥 닫혀 고장인지 결과가 없는 건지 모른다.
4. **같은 항목을 다시 골라도 `onChange` 가 온다**(`changed:false`) — 메뉴 검색처럼 값이 아니라
   "행위"가 필요한 화면 때문. MOCA 는 값이 바뀔 때만 발화해 demo 헤더가 `li` 클릭을 직접 받아 우회했다.

## 테마

라이트/다크 자동 대응. 호스트가 `<html data-theme="dark">` 를 주면 그것을, 없으면
`prefers-color-scheme` 을 따른다 (다른 `@teammoca/*` 패키지와 동일).
