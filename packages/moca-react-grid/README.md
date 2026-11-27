# @teammoca/react-grid

MOCA React Grid — 가상 스크롤, 컬럼 리사이징, 특수컬럼(행상태/행번호/삭제체크)을 갖춘 업무용 React 그리드.
MOCA 프레임워크 grid 컴포넌트의 React 구현체이며, MOCA demo 디자인 시스템(Warm Paper 라이트 / Technical Dark)을 따른다.

## 설치

```bash
npm install @teammoca/react-grid
```

React 18 이상이 필요하다 (peerDependency).

## 사용법

```jsx
import { MocaReactGrid } from '@teammoca/react-grid'

const columns = [
  { key: 'id', title: '번호', width: 80 },   // width(px) 생략 시 남은 폭 균등 분배
  { key: 'name', title: '이름' },
  { key: 'dept', title: '부서', width: 100 },
]

const data = [
  { id: 1, name: '김철수', dept: '개발팀', _status: 'C' },  // _status: C/U/D → 행상태 컬럼에 표시
  { id: 2, name: '이영희', dept: '기획팀' },
]

function MyScreen() {
  return <MocaReactGrid columns={columns} data={data} />
}
```

## Props

| prop | 기본값 | 설명 |
|---|---|---|
| `columns` | (필수) | `[{ key, title, width?, cellType? }]` — width(px) 없으면 남은 폭 균등 분배(그리드가 넓어지면 그 컬럼들이 다시 흡수, 좁아지면 가로 스크롤). `cellType: 'tree'` 면 트리 컬럼(아래 참조) |
| `data` | (필수) | 행 객체 배열. 셀 값은 `row[col.key]`, 행상태는 `row._status`(C/U/D) |
| `rowHeight` | `26` | 행 높이(px) — MOCA defaultcellheight 기본값과 동일. 가상화 계산 기준 |
| `height` | (없음) | 그리드 전체 높이(px). 생략하면 부모를 100% 채움 (반응형) |
| `overscan` | `10` | 보이는 구간 위아래 여유 렌더 행 수 |
| `statusBar` | `true` | 하단 푸터에 **건수만 우측 정렬**로 표시 — 총 건수 + (트리 접힘 시) 표시 건수 + (삭제체크 시) 선택 건수. 렌더링 구간·DOM 행수는 가상 스크롤 개발용 표시라 제거됨(2026-08-19) |
| `rowStatus` | `true` | 특수컬럼: 행상태(C/U/D) 표시 |
| `rowNum` | `true` | 특수컬럼: 행번호 (콤마 표기, 좁은 폭엔 scaleX 가로압축) |
| `delCheck` | `true` | 특수컬럼: 삭제체크 (X 아이콘, 헤더 전체선택) |
| `label` | (없음) | 그리드 제목. 지정하면 상단 툴바(제목 · 찾기 · 행높이 · 전체화면 버튼) 표시. **건수는 툴바가 아니라 푸터**에 있다 — 좁은 폭에서 제목·찾기와 자리를 다투기 때문 |
| `fullScreen` | `true` | 툴바의 전체화면 버튼 표시 여부 (label 지정 시에만 의미) |
| `onRowSelected` | (없음) | 행 클릭 시 `(row, rowIndex)` 호출 — rowIndex 는 `data` 기준 절대 인덱스 |
| `rowHeightSelect` | `false` | `true` 면 툴바에 행높이 셀렉트박스 표시 (선택지 기본 `[22,26,32,40]`, 배열로 교체 가능). 선택값이 `rowHeight` 보다 우선 |
| `search` | `false` | `true` 면 툴바에 찾기(검색어 + 다음 버튼) 표시. 모든 데이터 컬럼 부분일치(대소문자 무시), 매치 행 선택 + 가운데 스크롤, 끝나면 순환. 검색 결과(총 검색건수·몇 번째)는 툴바가 아니라 **푸터 왼쪽**에 표시된다 |
| `sortable` | `false` | `true` 면 모든 데이터 컬럼 헤더에 정렬 버튼. 오름 → 내림 → 원래대로 3단 순환, 한 번에 한 컬럼. 컬럼별로 `columns[].sortable` 이 우선 |
| `filterable` | `false` | `true` 면 모든 데이터 컬럼 헤더에 필터 버튼(고유값 체크 드롭다운). 여러 컬럼은 AND. 컬럼별로 `columns[].filterable` 이 우선 |
| `filterDistinctLimit` | `1000` | 필터 목록을 만들 고유값 상한 — 넘으면 목록 대신 안내(체크박스 폭주 방지) |
| `subtotal` | (없음) | 소계 그룹 컬럼 key — 그룹값이 바뀔 때마다 소계행 삽입 (데이터는 그 컬럼으로 정렬 전제) |
| `total` | `true` | 합계행 위치 — `true`/`'bottom'`(맨 아래 고정) · `'top'`(위 고정) · `false`(없음) |
| `subtotalLabel` / `totalLabel` | `'소계'` / `'합 계'` | 집계행 라벨 |

## 트리 컬럼 (cellType: 'tree')

MOCA `data-m-celltype="tree"` 의 React 판. 별도 트리 데이터 구조 없이, **PATH 로 정렬된
평면 배열(SQL `ORDER BY PATH` 한 줄) + 깊이 컬럼(1부터)** 만 있으면 트리로 그려진다.

```jsx
const columns = [
  // MOCA 속성 대응: cellType=data-m-celltype · levelKey=data-m-levelid
  //                labelKey=data-m-labelid · treeKey=data-m-treeid · title=data-m-name
  { key: 'TREE', title: '메뉴', cellType: 'tree',
    levelKey: 'DEPTH', labelKey: 'MENU_NM', treeKey: 'MENU_ID', width: 240 },
  { key: 'MENU_ID', title: '메뉴ID', width: 80 },
]

const data = [ // PATH 정렬 평면 배열
  { MENU_ID: 'M001', MENU_NM: '시스템관리', DEPTH: 1, PATH: '0001' },
  { MENU_ID: 'M005', MENU_NM: '메뉴관리',   DEPTH: 2, PATH: '0001-0005' },
  { MENU_ID: 'M012', MENU_NM: '메뉴등록',   DEPTH: 3, PATH: '0001-0005-0012' },
]
```

- 부모/리프는 "다음 행의 깊이"로 판정(다음 행이 더 깊으면 부모 — MOCA 동일).
- 부모 노드 +/− 로 접고 펼침. 접으면 자손 전부 숨김 — 단 자손의 접힘 상태는 보존되어
  다시 펼치면 이전에 펼쳐져 있던 모습 그대로 복원(MOCA 는 하위 부모를 강제로 접는다 —
  의도된 개선). `data` 변경 시 전체 펼침으로 초기화.
- 가상 스크롤·찾기는 보이는 행 기준으로 동작하고, 행번호·선택·삭제체크는
  `data` 기준 절대 번호를 유지한다.

## 정렬 · 필터 (sortable · filterable)

MOCA `data-m-sortable`/`data-m-filterable`(doSort/doFilter) 의 React 판.

```jsx
<MocaReactGrid columns={columns} data={rows} sortable filterable />
```

- **`data` 는 바뀌지 않는다** — 그리드가 그 위에 "보기"를 얹는다. `onRowSelected` 의 인덱스는
  정렬·필터 뒤에도 **원본 `data` 기준**이라 `data[idx]` 가 그대로 맞는다.
- 정렬: 안정 정렬(동률은 원본 순서), 빈 값은 방향과 무관하게 뒤. 양쪽 다 숫자로 읽히면 숫자 비교 —
  **콤마를 찍은 문자열로 넣지 말고** 숫자로 두고 `format` 으로 표시만 가공할 것.
- 필터: 후보값은 전체 `data` 기준(다른 필터가 걸려도 목록이 줄지 않음), 값 검색 · 가나다순/건수순 ·
  전체선택 지원. 전체를 고른 채 적용하면 그 컬럼 해제. 걸려 있으면 푸터가 "필터 N/전체건",
  툴바에 [필터 해제] 표시.
- 집계(소계/합계)는 필터 결과 기준으로 재계산. 선택·삭제체크는 정렬·필터가 바뀌어도 따라온다.
- **트리 컬럼이 있으면 무시된다**(PATH 정렬 전제). `data` 참조가 바뀌면 정렬·필터가 초기화된다.

## 소계/합계 · 컬럼 병합 (calc · subtotal · total · merge)

MOCA `data-m-calc/subtotal/total/colmerge` 의 React 판. 그룹 컬럼으로 정렬된 평면 데이터면
소계/합계가 그대로 나온다.

```jsx
const comma = (v) => Number(v).toLocaleString()
const columns = [
  { key: 'REGION_NM', title: '지역', merge: true, align: 'center' },   // 연속 같은 값 세로 병합
  { key: 'PROD_NM', title: '상품명' },
  { key: 'SALE_QTY', title: '수량', calc: 'sum', align: 'right', format: comma },
  { key: 'SALE_AMT', title: '판매금액', calc: 'sum', align: 'right', format: comma },
]
<MocaReactGrid columns={columns} data={rows} subtotal="REGION_NM" total="bottom" />
```

- 컬럼 확장: `align`('left'|'center'|'right') · `format`((v, row) => 표시값) ·
  `calc`('sum'|'count'|'avg'|'min'|'max') · `merge`(true).
- 집계행은 파생물 — `data` 가 바뀌면 전부 재계산. avg 는 전체 합÷전체 건수(소수 2자리),
  빈 값은 안 센다. min/max 는 숫자/문자열 모두 동작(날짜 문자열 가능).
- 소계는 그룹값의 인접 런 단위 — 그룹이 흩어져 있으면 생략(틀린 소계 방지, MOCA 동일).
- 합계행은 스크롤과 무관하게 항상 고정(pin). 집계행은 선택/찾기 대상이 아니다.
- `merge` 컬럼 값은 병합 구간의 첫 표시 행에 그려져 스크롤 중에도 항상 보인다.
  집계행이 병합 런을 끊는다. 트리 컬럼과 집계는 동시 사용 불가.

## 셀 편집 · render · 다단 헤더 · 엑셀

```jsx
const grid = useRef(null)
<MocaReactGrid ref={grid} columns={columns} data={rows}
  editable onCellEdit={(row, idx, key, value, old) => {}} excel="사원목록" />

const columns = [
  { title: '인적사항', children: [                       // 다단 헤더 — 묶음 제목이 아래 칸 위로 가로 병합
    { key: 'EMP_NO', title: '사번', editable: false },
    { key: 'DEPT_CD', title: '부서', editType: 'select', options: [{ cd: 'D10', nm: '경영지원' }] } ] },
  { key: 'PAY', title: '급여', editType: 'number', colSpan: (row) => (row.LEAVE === 'Y' ? 2 : 1) },
  { key: 'USE_YN', title: '사용', editType: 'checkbox' },             // 'Y' / 'N'
  { key: 'STATE', title: '상태', render: (v) => <span className={'badge-' + v}>{v}</span> },
]
grid.current.exportExcel('사원목록')   // 툴바 버튼과 같다
grid.current.getChangedRows()          // _status 가 C/U/D 인 행 — 저장에 그대로
```

- **편집**: 더블클릭(폰은 두 번 톡) → Enter·바깥 클릭 반영 · Esc 취소 · Tab/Shift+Tab 옆 칸. 행 객체를 그 자리에서 고치고
  `_status='U'` 를 붙인다(원래 값으로 돌리면 뗀다). editType: text·number·select·checkbox·date. 컬럼 editable 은 함수도 된다.
- **render**: `(value, row, rowIndex) => ReactNode` — 칸 안을 React 로 직접 그린다.
- **다단 헤더**: `{ title, children }` 묶음(여러 단 가능). 본문 가로 병합은 `colSpan(row, rowIndex)`.
- **엑셀**: 지금 보이는 대로 .xlsx(필터·정렬·병합·소계/합계). 숫자 칸은 엑셀 숫자. `excel:false` 로 칸 제외, `excelValue(row)` 로 엑셀 전용 값. 의존성 없음.

## 주요 동작

- **가상 스크롤**: 데이터가 몇십만 행이어도 DOM 에는 보이는 구간 ± overscan 행만 존재.
  MOCA grid 와 같은 "전용 스크롤바" 방식 — 콘텐츠는 세로 네이티브 스크롤 없이 행 내용만
  갈아끼우므로, 아무리 빠르게 스크롤해도 빈 화면(플래시)이 구조적으로 발생하지 않는다.
- **터치 스크롤**: 손가락이 주 입력인 기기(`pointer: coarse`)에서는 표 위를 밀면 그대로 스크롤된다
  (네이티브 관성 포함). 전용 스크롤바를 행 영역 전체를 덮는 투명 오버레이로 넓혀 쓰는 방식이라
  가상 스크롤 구조는 그대로다 — 위치는 우측 막대로 표시되고 **그 막대를 잡아끌면 단번에 이동**한다
  (10만 행에서 밀기만으로는 뒷부분에 못 간다). 가로로 밀면 컬럼이 움직이며,
  행 클릭(선택·삭제체크·트리 토글)은 종전대로 동작한다. 설정할 props 는 없다.
- **컬럼 리사이징**: 헤더 셀 오른쪽 가장자리를 드래그. 최소 폭 40px. **마우스·손가락 공통**
  (Pointer Events + 핸들의 `touch-action:none` — 둘 중 하나만 빠져도 터치에서 조용히 안 먹는다).
  터치 기기에서는 핸들 폭이 8px → 20px 로 넓어진다(손가락이 8px 을 짚지 못한다).
  폭 합계가 그리드보다 커지면 가로 스크롤 (헤더 동반 스크롤).
- **행 선택**: 행 클릭 시 선택색 배경 + 좌측 3px 강조 바 표시, `onRowSelected(row, rowIndex)` 호출.
  가상 스크롤로 화면 밖에 나갔다 돌아와도 선택 유지. `data` 가 바뀌면(재조회) 선택 해제.
- **반응형**: `height` 미지정 시 부모 크기를 ResizeObserver 로 실측 추적.
- **테마**: OS 라이트/다크(`prefers-color-scheme`)에 따라 MOCA Warm Paper / Technical Dark 팔레트 적용.

## 데모 실행 (이 저장소 안에서)

저장소 루트에서:

```bash
npm install
npm run dev   # → http://localhost:5173 → ⚡ 가상 그리드
```
