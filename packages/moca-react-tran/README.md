# @teammoca/react-tran

MOCA React Tran — MOCA 서버의 공용 쿼리 API(queryId 기반 select/save)와 통신하는
데이터 레이어 + React 훅. MOCA 엔진 `tran.exe` 의 React 구현체.

## 설치

```bash
npm install @teammoca/react-tran
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { tran, useSelect, configureTran } from '@teammoca/react-tran'

// 앱 부팅 1회 — 인증 실패 시 앱이 할 일을 연결
configureTran({ onAuthFail: () => showLogin() })

// 화면 — 선언적 조회(조건이 바뀌면 자동 재조회)
function SaleScreen() {
  const [cond, setCond] = useState({ REGION_NM: '' })
  const { rows, loading, error, reload } = useSelect('selectTdemoSaleDtlList', cond)
  return <MocaReactGrid columns={cols} data={rows} />
}

// 명령형 호출
const rows = await tran.select('selectDemoUserList', { USER_NM: '김' })
await tran.save({ insertQueryId: 'insertDemoUser', list: dirtyRows })
```

화면은 **SQL 을 모르고 queryId 만 안다** — SQL 은 서버 매퍼에 있다(MOCA 와 같은 계약).

## API

| 함수 | 설명 |
|---|---|
| `tran.select(queryId, params)` | 단일 조회 — rows 배열 |
| `tran.selectMulti(queryIds, bodyMap)` | 다건 조회 — `{ list1, list2, … }` |
| `tran.selectOne(queryId, params, preUpdateQueryId?)` | 단건 조회 — row |
| `tran.save({ insertQueryId, updateQueryId, deleteQueryId, list })` | 행상태(C/U/D) 기반 CRUD |
| `tran.sessionCheck()` | `{ logined, user }` |
| `tran.login(id, pw)` / `tran.logout()` | 세션 로그인/로그아웃 |
| `useSelect(queryId, params, { enabled })` | 훅 — `{ rows, loading, error, reload }` |
| `configureTran({ base, onAuthFail, onCsrfFail })` | 전역 설정 |

## 레이어가 대신 처리하는 것

- **CSRF**: 서버가 쿠키(`MOCA-CSRF-TOKEN`)로 내려준 토큰을 헤더(`X-CSRF-TOKEN`)로 되돌린다.
  안 보내면 403 — 화면은 신경 쓸 것이 없다.
- **세션**: `credentials: same-origin` 으로 세션 쿠키를 실어 보낸다. 개발 환경은
  Vite 프록시로 동일 출처를 유지해야 한다(교차 출처면 쿠키가 막힌다).
- **401/403**: `configureTran` 의 콜백으로 앱에 위임(로그인 화면 전환 등).
- **결과 언랩**: `select` 는 `list1` 을 벗겨 rows 를 바로 준다. row 는 대문자 컬럼 키로 읽는다.
- **useSelect 경합 처리**: 조건이 빠르게 바뀌어도 늦게 온 응답이 새 결과를 덮지 않는다.
