/*
 * MOCA React API 카탈로그 — 패키지가 화면에 제공하는 공개 API 의 단일 선언부
 * ==========================================================================
 * @teammoca/* 패키지 컴포넌트의 props/events/methods(ref API) + 데모 앱 규약(화면 레지스트리)을
 * 이 파일 한 곳에 모은다. **API 문서(docs/moca-react-api.html) 생성은 이 파일만 보면 되도록**
 * 하는 것이 목적이다. (MOCA 원본 vendor/moca/js/catalog.js 와 같은 컨셉)
 *
 * ── 구조 ──────────────────────────────────────────────────────────────────
 *   components : 컴포넌트 공개 API. key=컴포넌트명(export 명)
 *                kind    = 문서 목차 묶음. 생략하면 '컴포넌트', '모듈' 이면 함수/훅 묶음(tran·msgbox·popup)
 *                props   = JSX 로 넘기는 속성 (React 판의 attrs)
 *                events  = 콜백 prop — 이름이 on* 인 것 (React 판의 events)
 *                methods = ref 로 호출하는 명령형 API (React 판의 methods)
 *   app        : 데모 앱(src/) 규약 — 화면 레지스트리 등록 방법
 *
 * ── 규칙 (MOCA catalog.js 규칙 이식) ──────────────────────────────────────
 * - **런타임 미로드** : 앱/패키지가 이 파일을 import 하지 않는다. 문서 생성 전용.
 * - **공개 API 만 싣는다** : 내부 구현(state·내부 함수)은 뺀다.
 * - **한 항목 = API 하나** : 여러 API 를 한 항목에 묶지 않는다. 별칭도 각자 항목.
 * - desc 끝의 '예) 코드' 는 문서 생성기가 코드박스로 분리한다. 예) 는 항목당 1개.
 *
 * ※ 수동 동기화다. 패키지의 props/events/ref 를 고치면 이 파일도 같이 고치고
 *   `npm run apidoc` 으로 문서를 재생성한다.
 */
// eslint-disable-next-line no-unused-vars -- 런타임 미로드: 생성기(tools/apidoc-gen.cjs)가 vm 으로 읽는다
var MOCAREACT_CATALOG = {

	/* ══════════════════════════════════════════════════════════════════════
	   components — @teammoca/* 패키지 컴포넌트
	   ══════════════════════════════════════════════════════════════════════ */
	components: {

		/* ═══ MocaReactGrid — packages/moca-react-grid ═══ */
		MocaReactGrid: {
			pkg: '@teammoca/react-grid',
			desc: '가상 스크롤 그리드 — 전용 스크롤바 아키텍처(MOCA .moca_scrollY_type1 이식)로 10만 행에서도 스크롤 플래시가 구조적으로 없다. 컬럼 리사이징 · 특수컬럼(행상태/행번호/삭제체크) · 행 선택 · 툴바(제목/총건수/전체화면/행높이/찾기) · 셀 편집(행상태 자동) · 셀을 React 로 그리기(render) · 다단 헤더/가로 병합 · 엑셀(.xlsx) 내보내기 내장',
			usage: "import { MocaReactGrid } from '@teammoca/react-grid'\n\n<MocaReactGrid\n  label=\"사원 목록\"\n  columns={[{ key: 'name', title: '이름', width: 120 }, { key: 'dept', title: '부서' }]}\n  data={rows}\n  onRowSelected={(row, idx) => setSelected(row)}\n  search rowHeightSelect\n/>",

			props: {
				columns: { prop: 'columns', desc: '컬럼 정의 [{ key, title, width?, align?, format?, calc?, merge?, cellType? }]. width(px) 없으면 남은 폭을 균등 분배하고, **그리드가 넓어지면 그 컬럼들이 다시 흡수한다**(팝업이 열리며 커질 때·레이아웃 setRatio·MDI 분할·창 크기 — 오른쪽에 빈 띠가 남지 않는다). 좁아질 때는 줄이지 않고 가로 스크롤이 생기며, 사용자가 헤더를 드래그해 정한 폭은 이후 재배분에서 제외된다. 셀 값은 row[key] 로 읽는다. cellType: "tree" 면 트리 컬럼(아래 treeColumn 절), calc/merge 는 집계·병합(아래 aggColumn 절) 예) columns={[{ key: "name", title: "이름", width: 120 }]}' },
				align: { prop: 'columns[].align', desc: '셀 정렬 — "left"(기본)|"center"|"right". 헤더는 항상 중앙 예) { key: "SALE_AMT", title: "판매금액", align: "right" }' },
				format: { prop: 'columns[].format', desc: '표시 가공 함수 (value, row) => 표시값 (MOCA data-m-displayfunction 대응). 집계행 값에도 적용된다 예) { key: "SALE_AMT", format: (v) => Number(v).toLocaleString() }' },
				data: { prop: 'data', desc: '행 객체 배열. 참조가 바뀌면(재조회) 선택·찾기 캐시가 초기화된다 — MOCA drawGrid 와 동일 예) data={rows}' },
				rowHeight: { prop: 'rowHeight', desc: '행 높이(px, 기본 26 — MOCA data-m-defaultcellheight 기본값). 가상화 계산 기준이라 모든 행이 같은 높이' },
				height: { prop: 'height', desc: '그리드 전체 높이(px). 생략하면 부모를 100% 채우는 반응형 — MDI 탭 안에서는 생략이 기본' },
				overscan: { prop: 'overscan', desc: '보이는 구간 위아래 여유 렌더 행 수(기본 3) — 경계의 부분 행 대비' },
				statusBar: { prop: 'statusBar', desc: 'true(기본) 면 하단 푸터 표시. 왼쪽(좌측 정렬) = 지금 보고 있는 것 — 검색했으면 "검색 N건 · M번째", 선택한 행이 있으면 "K행". 오른쪽(우측 정렬) = 전체 규모 — 총 건수, 트리 접힘 시 표시 건수, 삭제체크 시 선택 건수. 헤더에는 건수를 두지 않는다(좁은 폭에서 제목·찾기와 자리를 다툰다)' },
				rowStatus: { prop: 'rowStatus', desc: 'true(기본) 면 특수컬럼 [0] 행상태(22px) 표시 — row._status 값(C:신규 U:수정 D:삭제)을 색으로' },
				rowNum: { prop: 'rowNum', desc: 'true(기본) 면 특수컬럼 [1] 행번호(28px) 표시 — 전체 데이터 기준 절대 번호, 좁은 폭에는 scaleX 가로압축' },
				delCheck: { prop: 'delCheck', desc: 'true(기본) 면 특수컬럼 [2] 삭제체크(26px) 표시 — 행별 X 체크 + 헤더 전체선택' },
				label: { prop: 'label', desc: '그리드 제목. 지정하면 상단 툴바(제목 + 찾기·행높이·전체화면 버튼)가 나타난다. 건수는 툴바가 아니라 푸터(statusBar)에 있다 예) label="사원 목록"' },
				fullScreen: { prop: 'fullScreen', desc: 'true(기본) 면 툴바에 전체화면 버튼 — label 지정 시에만 의미. MOCA _fullScreenGrid 의 overlayer 방식' },
				rowHeightSelect: { prop: 'rowHeightSelect', desc: 'true 면 툴바에 행높이 셀렉트(기본 false — React 판 자체 기능). 배열을 주면 그 값들이 선택지(기본 [22,26,32,40]). 선택값이 rowHeight prop 보다 우선 예) rowHeightSelect={[20, 26, 36]}' },
				search: { prop: 'search', desc: 'true 면 툴바에 찾기(검색어 + 다음 버튼, 기본 false — 자체 기능). 검색 결과(총 검색건수·몇 번째)는 툴바가 아니라 푸터 왼쪽에 표시된다. 모든 데이터 컬럼 부분일치(대소문자 무시), Enter/다음마다 다음 매치 행 선택 + 가운데 스크롤, 끝나면 순환. 트리에서 접혀 숨은 행·집계행은 대상에서 제외' },
				sortable: { prop: 'sortable', desc: 'true 면 모든 데이터 컬럼 헤더에 정렬 버튼 (기본 false — MOCA data-m-sortable 대응). 누를 때마다 오름차순 → 내림차순 → 원래대로 3단 순환이고, 한 번에 한 컬럼만 걸린다. 같은 값이면 원본 순서를 지키고(안정 정렬), 빈 값은 방향과 무관하게 뒤로 보낸다. 양쪽 다 숫자면 숫자 비교라 **콤마를 찍어 문자열로 만든 값은 정렬이 틀어진다** — 숫자로 두고 columns[].format 으로 표시만 가공할 것. 트리 컬럼이 있으면 무시된다(PATH 정렬이 전제) 예) sortable' },
				colSortable: { prop: 'columns[].sortable', desc: '그 컬럼만 정렬 버튼 켜기/끄기 — 그리드의 sortable 보다 우선 예) { key: "MEMO", title: "비고", sortable: false }' },
				filterable: { prop: 'filterable', desc: 'true 면 모든 데이터 컬럼 헤더에 필터 버튼 (기본 false — MOCA data-m-filterable 대응). 그 컬럼의 고유값을 건수와 함께 늘어놓은 드롭다운에서 골라 켠다(값 검색 · 가나다순/건수순 · 전체선택). 여러 컬럼에 걸면 AND 이고, 전체를 고른 채 적용하면 그 컬럼 필터는 해제된 것으로 본다. 걸려 있는 동안 푸터 건수가 "필터 N/전체"로 바뀌고 툴바에 [필터 해제] 가 나타난다. 트리 컬럼이 있으면 무시된다 예) filterable' },
				colFilterable: { prop: 'columns[].filterable', desc: '그 컬럼만 필터 버튼 켜기/끄기 — 그리드의 filterable 보다 우선. 고유값이 많은 키 컬럼(사번·일련번호)은 꺼 두는 편이 좋다 예) { key: "EMP_NO", title: "사번", filterable: false }' },
				filterDistinctLimit: { prop: 'filterDistinctLimit', desc: '필터 목록을 만들 고유값 상한 (기본 1000 — MOCA data-m-filterdistinctlimit 대응). 넘는 컬럼은 드롭다운을 열어도 목록 대신 안내만 나온다 — 체크박스를 수십만 개 만들면 브라우저가 멈추기 때문 예) filterDistinctLimit={3000}' },
				subtotal: { prop: 'subtotal', desc: '소계 그룹 컬럼 key (MOCA data-m-subtotal 대응 — 1단만). 그룹값의 인접 런(연속 구간) 단위로 소계행이 삽입되므로 데이터는 그 컬럼으로 정렬되어 내려와야 한다(SQL ORDER BY). 런 수 > 고유값 수(그룹 흩어짐)면 틀린 소계를 보여주느니 생략한다 예) subtotal="REGION_NM"' },
				total: { prop: 'total', desc: '합계행 위치 — true/"bottom"(기본, 맨 아래 고정) | "top"(헤더 아래 고정) | false(없음) (MOCA data-m-total 대응). 합계행은 스크롤과 무관하게 항상 제자리(pin). calc 컬럼이 하나도 없으면 집계 자체가 꺼진 것 예) total="top"' },
				subtotalLabel: { prop: 'subtotalLabel', desc: '소계행 라벨 (기본 "소계" — MOCA data-m-subtotallabel 대응). 그룹값 뒤에 붙어 "서울 소계" 처럼 표시된다 예) subtotalLabel="평균/최저/최대"' },
				totalLabel: { prop: 'totalLabel', desc: '합계행 라벨 (기본 "합 계" — MOCA data-m-totallabel 대응)' },

				editable: { prop: 'editable', desc: 'true 면 모든 데이터 컬럼을 고칠 수 있다(기본 false). 칸을 더블클릭(폰은 두 번 톡)하면 그 자리에 입력칸이 뜨고 Enter·칸 밖 클릭 = 반영, Esc = 취소, Tab/Shift+Tab = 같은 행 다음/앞 편집 칸. **반영은 행 객체를 그 자리에서 고친다**(MOCA 와 같다) — data 참조가 그대로라 선택·정렬·필터·스크롤이 유지되고, 고친 행에 _status="U" 가 붙는다(신규 "C" 는 그대로). 고친 값이 전부 원래대로 돌아가면 "U" 를 다시 뗀다. 저장 때는 ref.getChangedRows() 로 모은다 예) <MocaReactGrid editable onCellEdit={fn} … />' },
				excel: { prop: 'excel', desc: 'true 또는 파일 이름 — 툴바에 엑셀 버튼을 단다(기본 false). 지금 보이는 대로 .xlsx 로 내려받는다: 필터·정렬 결과, 다단 헤더(병합 포함), merge 세로 병합, colSpan 가로 병합, 소계·합계, 머리글 줄 고정. 숫자 칸(calc · editType "number" · 숫자 값)은 엑셀 숫자로 나가 엑셀에서 바로 더할 수 있다. 외부 라이브러리 없이 만든다. 이름을 안 주면 "제목_yyyyMMdd.xlsx" 예) excel="사원목록"' },
				children: { prop: 'columns[].children', desc: '다단 헤더 — { title, children:[…] } 묶음을 넣으면 머리글이 여러 줄이 되고 묶음 제목이 아래 칸들 위로 가로 병합된다(MOCA thead colspan/rowspan). 묶음 안에 묶음도 된다. 묶음이 없는 칸의 제목은 머리글 높이 전체에 걸친다. 정렬·필터·폭 조절은 맨 아래 칸(실제 컬럼) 단위 예) columns={[{ title: "급여", children: [{ key: "BASE", title: "기본급" }, { key: "BONUS", title: "수당" }] }]}' },
				render: { prop: 'columns[].render', desc: '칸 안을 React 로 직접 그린다 (value, row, rowIndex) => ReactNode — AG Grid cellRenderer 대응. 배지·버튼·진행 막대 등 무엇이든 넣을 수 있다. format 은 글자만, render 는 노드. 편집 중에는 입력칸이 먼저이고, 엑셀에는 원래 값(또는 format·excelValue)이 나간다 예) { key: "STATE", render: (v) => <span className={"badge-" + v}>{v}</span> }' },
				colSpan: { prop: 'columns[].colSpan', desc: '본문 가로 병합 — (row, rowIndex) => n. n 이 2 이상이면 그 칸이 오른쪽 n-1 칸을 덮는다(덮인 칸은 그리지 않는다). 엑셀에도 병합으로 나간다 예) { key: "BASE_PAY", colSpan: (row) => (row.LEAVE === "Y" ? 3 : 1) }' },
				colExcel: { prop: 'columns[].excel / excelValue', desc: 'excel: false 면 그 칸은 엑셀에서 뺀다(버튼만 있는 칸 등). excelValue: (row) => 값 — 엑셀에만 다른 값을 낼 때(render 로 그린 안내글 등) 예) { key: "ACT", render: …, excel: false }' },

				/* 편집 컬럼 — columns 항목의 editable/editType (MOCA 셀 입력 + 행상태 이식) */
				editColumn: {
					editable: { field: 'editable: true | false | (row) => bool', desc: '그 컬럼만 편집 켜기/끄기 — 그리드 editable 보다 우선. 함수면 행마다 정한다 예) { key: "EMP_NO", editable: false } · { key: "PAY", editable: (row) => row.LEAVE !== "Y" }' },
					editType: { field: "editType: 'text'|'number'|'select'|'checkbox'|'date'", desc: '입력칸 종류(기본 text). number = 콤마를 떼고 숫자로 저장(못 읽으면 원래 값 유지, 비우면 ""). select = options 의 cd 를 저장하고 화면엔 nm 을 보인다(고르면 바로 반영). checkbox = 칸에 늘 체크박스가 보이고 한 번 클릭으로 바뀐다(편집 불가면 잠긴 체크). date = 브라우저 날짜 입력(yyyy-MM-dd)' },
					options: { field: 'options: [{ cd, nm }]', desc: 'select 의 선택지 — MOCA itemset 과 같은 필드명(cd/nm) 예) { key: "DEPT_CD", editType: "select", options: [{ cd: "D10", nm: "경영지원" }] }' },
					trueValue: { field: "trueValue / falseValue (기본 'Y' / 'N')", desc: 'checkbox 의 켜짐·꺼짐 값 예) { key: "USE_YN", editType: "checkbox", trueValue: "1", falseValue: "0" }' },
				},

				/* 집계·병합 컬럼 — columns 항목의 calc/merge (MOCA data-m-calc/colmerge 이식, TPL018 참조).
				 * 집계행은 데이터가 아니라 파생물 — data 가 바뀔 때마다 전부 다시 계산된다(MOCA _applyCalc). */
				aggColumn: {
					calc: { field: "calc: 'sum'|'count'|'avg'|'min'|'max'", desc: '이 컬럼을 집계 대상으로 (MOCA data-m-calc 대응). avg 는 소수 2자리 반올림 · 전체 합÷전체 건수(소계 평균들의 평균이 아님). 빈 값은 어떤 연산에도 안 센다. min/max 는 양쪽 다 숫자면 숫자, 아니면 문자열 비교(날짜 문자열 동작). 트리와 동시 사용 불가 예) { key: "SALE_QTY", title: "수량", calc: "sum", align: "right", format: comma }' },
					merge: { field: 'merge: true', desc: '연속된 같은 값을 세로 병합해 표시 (MOCA data-m-colmerge 대응) — 값은 병합 구간의 첫 표시 행에만 그려진다(colmergealign="top" 방식이라 스크롤해도 구간 첫 행이 항상 라벨을 가진다). 집계행은 병합 런을 끊는다. 병합 셀은 배경이 불투명해 지브라/hover/선택 강조가 비치지 않는다(rowspan 병합과 같은 규칙) 예) { key: "REGION_NM", title: "지역", merge: true }' },
				},

				/* 트리 컬럼 — columns 항목에 cellType: 'tree' 를 주면 그 컬럼이 트리로 그려진다
				 * (MOCA celltype="tree" 이식). 데이터는 평면 배열 그대로 — PATH 정렬(SQL ORDER BY
				 * PATH 한 줄) + 깊이 컬럼만 있으면 된다. 부모/리프는 "다음 행의 깊이"로 판정. */
				treeColumn: {
					cellType: { field: "cellType: 'tree'", desc: '이 컬럼을 트리로 그린다 (MOCA data-m-celltype="tree" 대응, title 이 data-m-name 대응). 부모 노드의 +/− 로 접고 펼친다 — 접으면 모든 자손이 숨지만 자손의 접힘 상태는 보존되어, 부모를 다시 펼치면 이전에 펼쳐져 있던 모습 그대로 복원된다(MOCA 는 접을 때 하위 부모를 강제로 접어 상태가 사라진다 — 의도된 개선). 가상 스크롤은 보이는 행 목록 위에서 동작하므로 대용량 트리도 그대로 빠르다. data 가 바뀌면 전체 펼침으로 초기화 예) { key: "TREE", title: "메뉴", cellType: "tree", levelKey: "DEPTH", labelKey: "MENU_NM", treeKey: "MENU_ID", width: 240 }' },
					levelKey: { field: 'levelKey', desc: '깊이 컬럼명 (MOCA data-m-levelid 대응). 깊이는 1부터 — 1은 들여쓰기 없음, 2부터 연결선(│├└)이 그려진다' },
					labelKey: { field: 'labelKey', desc: '트리에 함께 표시할 라벨 컬럼명 (MOCA data-m-labelid 대응). 라벨이 빈 행은 트리 셀을 그리지 않는다' },
					treeKey: { field: 'treeKey', desc: '트리 계산용 노드 고유키 컬럼명 (MOCA data-m-treeid 대응). 현재 표시에는 쓰이지 않고 행 추가류 기능을 위해 예약' },
				},
			},

			events: {
				onCellEdit: { prop: 'onCellEdit', desc: '칸 값이 반영될 때 (row, rowIndex, key, value, oldValue) — 값이 실제로 바뀐 경우만. 행은 이미 고쳐진 뒤다(row[key] === value). 다른 칸을 따라 맞출 때(합계 다시 계산 등) 여기서 row 를 고친다 예) onCellEdit={(row, i, key) => { if (key === "QTY") row.AMT = row.QTY * row.PRICE }}' },
				onRowSelected: { prop: 'onRowSelected', desc: '행 클릭 시 (row, rowIndex) 로 호출 — rowIndex 는 data 기준 절대 인덱스. 같은 행을 다시 클릭해도 매번 호출된다(MOCA data-m-onrowselected 동일). 찾기로 행이 선택될 때도 발화 예) onRowSelected={(row, idx) => setSelected(row)}' },
			},

			/* methods — ref 로 부르는 명령형 API (const grid = useRef(null); <MocaReactGrid ref={grid} …/>) */
			methods: {
				exportExcel: { sig: 'exportExcel(fileName?)', desc: '지금 보이는 대로 .xlsx 로 내려받는다 — 툴바 엑셀 버튼과 같다(excel prop 없이도 된다). 이름이 없으면 excel prop 의 이름, 그것도 없으면 "제목_yyyyMMdd" 예) grid.current.exportExcel("사원목록")' },
				getChangedRows: { sig: 'getChangedRows()', desc: '_status 가 C/U/D 인 행만 모아 돌려준다 — 저장(tran.save)에 그대로 넘긴다 예) const list = grid.current.getChangedRows()' },
				stopEdit: { sig: 'stopEdit()', desc: '열린 입력칸을 반영 없이 닫는다(재조회 직전 등)' },
			},
		},

		/* ═══ tran / useSelect — packages/moca-react-tran ═══ */
		tran: {
			kind: '모듈',   // 컴포넌트가 아니라 함수/훅 묶음 — 문서 목차에서 따로 묶인다
			pkg: '@teammoca/react-tran',
			desc: 'MOCA 서버 공용 쿼리 API 통신 레이어 (MOCA moca.$t.tran.exe 대응). 화면은 SQL 을 모르고 queryId 만 안다 — SQL 은 서버 매퍼(MocaMapper.xml)에 있다. CSRF 토큰 자동 첨부(쿠키 MOCA-CSRF-TOKEN → 헤더 X-CSRF-TOKEN), 세션 쿠키 동반, 401(미로그인)/403(CSRF) 콜백 처리, 결과 언랩(list1 → rows)을 대신한다. 개발 중에는 Vite 프록시가 /common 을 8080 으로 넘겨 동일 출처를 유지한다(vite.config.js)',
			usage: "import { tran, useSelect, configureTran } from '@teammoca/react-tran'\n\n// 화면 — 선언적 조회(조건이 바뀌면 자동 재조회)\nconst { rows, loading, error, reload } = useSelect('selectTdemoSaleDtlList', { REGION_NM })\n\n// 명령형 호출\nconst rows = await tran.select('selectDemoUserList', { USER_NM: '김' })\nawait tran.save({ insertQueryId: 'insertDemoUser', list: rows })\n\n// 앱 부팅 1회 — 인증 실패 시 로그인 화면 전환 통로\nconfigureTran({ onAuthFail: () => setAuth('out') })",

			props: {},
			events: {},

			methods: {
				select: { sig: 'tran.select(queryId, params)', desc: '단일 조회 — rows 배열 반환(list1 언랩). 서버 응답은 컬럼 키를 대문자로도 함께 주므로 row.SALE_AMT 로 읽는다 예) const rows = await tran.select("selectDemoUserList", { DEPT_NM: "개발" })' },
				selectMulti: { sig: 'tran.selectMulti(queryIds, bodyMap)', desc: '다건 조회 — { list1, list2, … } 반환. bodyMap 은 { queryId: params } 형태 예) const { list1, list2 } = await tran.selectMulti(["selectDashSalesMonthly", "selectDashDeptMember"])' },
				selectOne: { sig: 'tran.selectOne(queryId, params, preUpdateQueryId?)', desc: '단건 조회 — row 객체 반환(없으면 null). preUpdateQueryId 를 주면 조회 전 UPDATE 실행(조회수 증가 등)' },
				save: { sig: 'tran.save({ insertQueryId, updateQueryId, deleteQueryId, list })', desc: 'CRUD 저장 — list 각 행의 _system.status(C/U/D)에 따라 서버가 분기 실행하고 savedList 를 반환한다(그리드 행상태와 같은 규약)' },
				sessionCheck: { sig: 'tran.sessionCheck()', desc: '로그인 여부 확인 — { logined, user }. 앱 부팅이 가장 먼저 부른다(MOCA index.html 의 sessionchk 대응)' },
				login: { sig: 'tran.login(id, pw)', desc: 'ID/PW 로그인 — { ok, message, user }. 데모 계정 moca/moca 예) const { ok } = await tran.login("moca", "moca")' },
				logout: { sig: 'tran.logout()', desc: '세션 종료' },
				useSelect: { sig: 'useSelect(queryId, params, { enabled })', desc: '조회 훅 — { rows, loading, error, reload }. params 내용이 바뀌면 자동 재조회(검색조건 변경 = 재조회), 늦게 온 응답은 폐기, enabled:false 로 조회 보류. MOCA 의 onpageload + tran.exe 콜백 패턴을 선언형으로 바꾼 것 예) const { rows, reload } = useSelect("selectDemoUserList", { USER_NM })' },
				configureTran: { sig: 'configureTran({ base, onAuthFail, onCsrfFail })', desc: '앱 시작 시 1회 설정 — 401/403 을 받았을 때 앱이 할 일(로그인 화면 전환 등)을 연결한다. base 는 서버 context-path 가 다를 때만' },
			},
		},

		/* ═══ MocaReactInputCalendar — packages/moca-react-input-calendar ═══ */
		MocaReactInputCalendar: {
			pkg: '@teammoca/react-input-calendar',
			desc: '날짜 선택 — 입력칸 + 달력 팝업 (MOCA inputCalendar 이식, 데모 TPL042 대응). dateType 하나가 "무엇을 고르는 달력인가"를 정하고 값 자릿수·팝업 모드(연 목록/월 목록/일자 격자+시각)·기본 표시형식이 전부 거기서 파생된다. 값은 언제나 숫자만 있는 문자열(서버·SQL 과 그대로 주고받는다)이고 표시는 displayFormat 의 # 마스크가 만든다. 팝업은 body 로 portal + fixed — 폼·패널처럼 overflow:auto 인 스크롤 영역 안에서도 잘리지 않는다',
			usage: "import { MocaReactInputCalendar, mdate } from '@teammoca/react-input-calendar'\n\n// 기본(일자) — 오늘로 시작, 값 확정 시 콜백\n<MocaReactInputCalendar displayFormat=\"####-##-##\" defaultValue=\"오늘\"\n  onDateSelected={(v) => console.log(v)} />   {/* v = '20260815' */}\n\n// 연월 · 연 · 일시\n<MocaReactInputCalendar dateType=\"yyyyMM\" defaultValue=\"오늘\" />        {/* 값 6자리 */}\n<MocaReactInputCalendar dateType=\"yyyy\" defaultValue=\"3년전\" />          {/* 값 4자리 */}\n<MocaReactInputCalendar dateType=\"yyyyMMdd hh:mm:ss\" defaultValue=\"오늘\" />\n\n// 범위 제한 + ref API\nconst cal = useRef(null)\n<MocaReactInputCalendar ref={cal} dateMin=\"20260710\" dateMax=\"20260820\" />\ncal.current.setValue(mdate.addDay(cal.current.getValue(), 1))",

			props: {
				dateType: { prop: 'dateType', desc: '무엇을 고르는 달력인가 — 값 자릿수·팝업 모드·기본 표시형식이 여기서 파생된다(기본 yyyyMMdd). 대소문자·구분자 무시("yyyyMMdd hh:mm:ss" = yyyyMMddHHmmss), 별칭 year/month/date/day/datetime (MOCA data-m-datetype 대응). 일시 타입의 팝업은 **시·분만** 고르게 한다 — 값의 초 자리는 들어온 값을 그대로 유지한다(기간이면 시작 00·종료 59)' },
				value: { prop: 'value', desc: '제어 모드 값(숫자문자열) — onChange 와 함께 쓴다. 폼 상태를 화면이 들고 있을 때' },
				defaultValue: { prop: 'defaultValue', desc: '비제어 초기값 — 숫자문자열 또는 상대일 표현: "오늘" · "전일"/"어제" · "내일" · "N일전/후" · "N개월전/후" · "N년전/후" · "당월"(그 달 1일) · "전월" (MOCA data-m-defaultvalue 대응) 예) defaultValue="7일전"' },
				displayFormat: { prop: 'displayFormat', desc: '표시형식 — "#" 마스크(기본은 dateType 의 기본형식). 값은 그대로 숫자문자열이고 표시만 바뀐다 (MOCA data-m-displayformat 대응) 예) displayFormat="####/##/##"' },
				dateMin: { prop: 'dateMin', desc: '선택가능 하한(yyyyMMdd) — 범위 밖 칸·이동버튼·[오늘]이 잠기고 직접 타이핑도 확정 시 거부된다. 연/연월 타입은 "그 값이 덮는 기간이 범위와 겹치는가"로 판정한다(MOCA data-m-datemin 대응)' },
				dateMax: { prop: 'dateMax', desc: '선택가능 상한(yyyyMMdd) — MOCA data-m-datemax 대응' },
				readOnly: { prop: 'readOnly', desc: 'true 면 잠금 — 입력·팝업 모두 막힌다 (MOCA data-m-readonly 대응)' },
				width: { prop: 'width', desc: '입력칸 너비(px 또는 CSS 값, 기본 160). 연 선택처럼 짧은 값은 110 정도가 적당' },
				placeholder: { prop: 'placeholder', desc: '안내문(기본은 표시형식을 0 으로 바꾼 모양)' },
			},

			events: {
				onChange: { prop: 'onChange', desc: '(value) => void — 값이 바뀔 때(제어 모드 필수). 값은 타입 자릿수로 정규화된 숫자문자열' },
				onDateSelected: { prop: 'onDateSelected', desc: '(value) => void — 값이 확정될 때(팝업 선택·타이핑 확정). ref.setValue 로 넣을 때는 발화하지 않는다(MOCA data-m-ondateselected 와 같은 규약) 예) onDateSelected={(v) => fnSearch(v)}' },
			},

			methods: {
				getValue: { sig: 'getValue()', desc: '현재 값(숫자문자열, 없으면 "") 예) const v = cal.current.getValue()' },
				setValue: { sig: 'setValue(v)', desc: '값 설정 — 타입 자릿수로 맞춘다(넘치면 자르고, 모자라면 월·일 01 / 시각 00 으로 채움). 이벤트 미발화 예) cal.current.setValue("20260815")' },
				setReadOnly: { sig: 'setReadOnly(bool)', desc: '잠금 토글 (MOCA setReadOnly 대응)' },
				clear: { sig: 'clear()', desc: '값 비우기(이벤트 미발화)' },
				focus: { sig: 'focus()', desc: '입력칸 포커스' },
				mdate: { sig: "import { mdate } from '@teammoca/react-input-calendar'", desc: '날짜 유틸(MOCA moca.$g.date 대응) — getToday/getNow · addDay/addMonth/addYear · getFirstDayOfMonth/getLastDayOfMonth · shiftYm · inRange · resolveRelative. 전부 숫자문자열 기반 예) mdate.addDay(mdate.getToday(), -7)' },
			},
		},

		/* ═══ MocaReactMultiCalendar — packages/moca-react-input-calendar ═══ */
		MocaReactMultiCalendar: {
			pkg: '@teammoca/react-input-calendar',
			desc: '기간 선택(from~to) — 한 컴포넌트가 입력칸 두 개와 달력 두 판(좌=시작, 우=종료)을 관리한다 (MOCA inputMultiCalendar 이식, 데모 TPL043 대응). dateType 계약은 단일 달력과 같고(값 자릿수·팝업 모드·기본 표시형식 파생, calCore 공유), 기간이라서 더해지는 것은 셋: 빠른선택 버튼(quickItems) · 최대 기간(maxTermBy*) · from>to 자동 보정. 종료값은 시각을 23:59:59 로 채워 그 날 하루가 빠지지 않게 한다(MOCA 규약)',
			usage: "import { MocaReactMultiCalendar, mdate } from '@teammoca/react-input-calendar'\n\n// 기본 — 당월(1일~말일)로 시작\n<MocaReactMultiCalendar displayFormat=\"####-##-##\" defaultValue=\"당월\"\n  onTermSelected={({ from, to }) => fnSearch(from, to)} />\n\n// 빠른선택 + 최대 31일\n<MocaReactMultiCalendar defaultValue=\"금주\" quickItems=\"오늘,금주,당월,전월,당분기,당년\"\n  maxTermByDay={31} />\n\n// 연월·연·일시 기간 (단일 달력과 같은 dateType)\n<MocaReactMultiCalendar dateType=\"yyyyMM\" defaultValue=\"당년\" />\n\n// ref API\nterm.current.setMultiCalendar({ from: '20260801', to: '20260831' })\nterm.current.getTerm()   // { from, to }",

			props: {
				dateType: { prop: 'dateType', desc: '단일 달력과 같은 5종(기본 yyyyMMdd) — 값 자릿수·팝업 모드(연 목록/월 목록/일자 격자)·기본 표시형식이 파생된다' },
				from: { prop: 'from', desc: '제어 모드 시작값(숫자문자열) — onChange 와 함께 쓴다' },
				to: { prop: 'to', desc: '제어 모드 종료값' },
				defaultValue: { prop: 'defaultValue', desc: '비제어 초기 기간 — 프리셋 문구 또는 { from, to } 객체. 프리셋: "오늘" · "전일" · "금주"(일~토) · "전주" · "당월"(1일~말일) · "전월" · "당분기" · "전분기" · "당년" · "전년" · "N일전/개월전/년전"(그만큼 전 ~ 오늘) (MOCA data-m-defaultvalue 대응) 예) defaultValue="당월"' },
				quickItems: { prop: 'quickItems', desc: '팝업 왼쪽 빠른선택 버튼 목록 — 문자열("오늘,금주,당월") 또는 배열. 기본은 MOCA 와 같은 10종(오늘,전일,금주,전주,당월,전월,당분기,전분기,당년,전년). false/빈값이면 버튼 영역을 숨긴다 (MOCA data-m-selecteritem 대응)' },
				maxTermByDay: { prop: 'maxTermByDay', desc: '최대 기간(일) — 넘기면 선택이 거부된다(양 끝 포함. 31 이면 8/1~8/31 까지 허용). MOCA data-m-maxtermbyday 대응' },
				maxTermByMonth: { prop: 'maxTermByMonth', desc: '최대 기간(개월) — MOCA data-m-maxtermbymonth' },
				maxTermByYear: { prop: 'maxTermByYear', desc: '최대 기간(년) — MOCA data-m-maxtermbyyear' },
				dateMin: { prop: 'dateMin', desc: '선택가능 하한 — 좌·우 달력 모두 범위 밖 칸·이동버튼이 잠기고 타이핑도 거부된다' },
				dateMax: { prop: 'dateMax', desc: '선택가능 상한' },
				readOnly: { prop: 'readOnly', desc: 'true 면 두 칸 모두 잠금(팝업도 안 열린다)' },
			},

			events: {
				onChange: { prop: 'onChange', desc: '({ from, to }) => void — 값이 바뀔 때(제어 모드 필수)' },
				onTermSelected: { prop: 'onTermSelected', desc: '({ from, to }) => void — 기간이 확정될 때. 팝업에서는 **[확인] 을 눌렀을 때만** 발화한다(2026-08-19 — 기간은 두 번 골라야 완성되므로 고를 때마다 쏘면 반쪽 기간으로 조회가 돈다). 빠른선택은 기간만 채우고 팝업을 닫지 않는다. 타이핑 확정(blur)은 종전대로 즉시. set* API 는 발화하지 않는다 예) onTermSelected={({from,to}) => fnSearch(from,to)}' },
			},

			methods: {
				getValue: { sig: 'getValue()', desc: '시작값(from) — MOCA getValue() 가 from 을 주는 규약 그대로' },
				getTerm: { sig: 'getTerm()', desc: '{ from, to } 반환 — React 판 편의 API 예) const { from, to } = ref.current.getTerm()' },
				setFrom: { sig: 'setFrom(v)', desc: '시작값 설정(이벤트 미발화). to 보다 뒤면 to 가 따라온다' },
				setTo: { sig: 'setTo(v)', desc: '종료값 설정(이벤트 미발화). from 보다 앞이면 from 이 따라온다' },
				setMultiCalendar: { sig: 'setMultiCalendar({from, to})', desc: '기간 일괄 설정(이벤트 미발화) 예) ref.current.setMultiCalendar({ from: mdate.getFirstDayOfMonth(t), to: mdate.getLastDayOfMonth(t) })' },
				setReadOnly: { sig: 'setReadOnly(bool)', desc: '잠금 토글' },
				clear: { sig: 'clear()', desc: '기간 비우기' },
			},
		},

		/* ═══ MocaReactCalendar — packages/moca-react-input-calendar ═══ */
		MocaReactCalendar: {
			pkg: '@teammoca/react-input-calendar',
			desc: '붙박이 달력 — 화면에 늘 펼쳐진 날짜 선택 달력 (MOCA calendar 이식, 데모 TPL044 대응). InputCalendar 가 "입력칸 + 눌러서 뜨는 달력"이라면 이쪽은 팝업이 아니다: 고른 날짜를 달력 위에서 눈으로 확인하는 것이 목적(예약일·근태·마감일 화면). 제목을 누르면 한 단계 위 뷰로 올라가고(일→월→연) 위 뷰에서 칸을 고르면 내려온다 — 먼 날짜로 빠르게 이동하는 통로. 공휴일·비영업일은 컴포넌트가 모르고 화면이 dayInfo 로 알려준다',
			usage: "import { MocaReactCalendar, mdate } from '@teammoca/react-input-calendar'\n\n// 공휴일·휴무는 화면이 조회해 넘긴다(달을 옮기면 onViewChange 에서 다시 조회)\nconst [dayInfo, setDayInfo] = useState({})\n\n<MocaReactCalendar ref={cal} dateType=\"yyyyMMdd\"\n  dayInfo={dayInfo}        // { '20260815': { holi: '광복절', off: true, badge: '휴' } }\n  weekendOff legend\n  onSelect={(v) => console.log(v, cal.current.getDayInfo(v))}\n  onViewChange={(ym, view) => { if (view === 'day') loadHoli(ym) }} />\n\n// 예약 가능일처럼 구간이 런타임에 정해지는 화면\ncal.current.setDateRange(mdate.getToday(), mdate.addDay(mdate.getToday(), 30))",

			props: {
				dateType: { prop: 'dateType', desc: "'yyyyMMdd'(기본·일자 격자) | 'yyyyMM'(연월 — 12개월) | 'yyyy'(연 — 한 연대 10년). 이 타입이 기본 뷰이면서 값 확정 단위다(그 뷰에서 칸을 고르면 확정, 위 뷰에서는 내려간다)" },
				value: { prop: 'value', desc: '제어 모드 값(숫자문자열) — onChange 와 함께 쓴다' },
				defaultValue: { prop: 'defaultValue', desc: "비제어 초기값 — 숫자문자열 또는 상대일 표현('오늘' · '7일전' …)" },
				dayInfo: { prop: 'dayInfo', desc: "업무 표시 데이터 (MOCA setData({dayInfo}) 규약) — { yyyyMMdd: { holi, off, badge, class } }. holi=공휴일명(날짜가 빨개지고 칸에 이름 표시) · off=비영업일(빗금) · badge=칸 우측 위 표식 · class=그 칸에 덧붙일 클래스. 컴포넌트는 공휴일을 모른다 — 화면이 조회한 것만 그린다 예) dayInfo={{ '20260815': { holi: '광복절', off: true } }}" },
				weekendOff: { prop: 'weekendOff', desc: 'true 면 토·일을 비영업일(빗금)로 표시한다. dayInfo 의 off:false 가 이보다 우선하므로 "쉬는 토요일만 예외" 같은 지정이 가능하다(MOCA 동일)' },
				legend: { prop: 'legend', desc: 'true 면 달력 아래 범례를 표시한다 — 오늘·선택은 항상, 공휴일·비영업일은 지금 달력에 실제로 있을 때만 설명한다(없는 규칙을 찾게 만들지 않으려는 MOCA 규약). 일자 뷰에서만 나온다' },
				startYm: { prop: 'startYm', desc: '초기 표시 기준 연월(yyyyMM) — 미지정 시 값이 가리키는 달, 값도 없으면 이번 달' },
				header: { prop: 'header', desc: 'false 면 내부 헤더(이전·제목·오늘·다음)를 숨긴다 — 화면이 이동 UI 를 직접 만들 때(MOCA data-m-header)' },
				todayButton: { prop: 'todayButton', desc: 'false 면 헤더의 [오늘] 버튼만 숨긴다(기본 표시). [오늘]은 보기를 옮기는 것이 아니라 오늘을 고른다 — 달력 3종이 같은 동작이다(MOCA 는 붙박이만 이동 전용이었는데 일관성을 택해 다르게 갔다). 읽기전용이거나 연·월 목록 뷰에서는 종전대로 이동만 한다' },
				dateMin: { prop: 'dateMin', desc: '선택가능 하한 — 범위 밖 칸·이동버튼이 잠긴다. 런타임 변경은 setDateRange' },
				dateMax: { prop: 'dateMax', desc: '선택가능 상한' },
				readOnly: { prop: 'readOnly', desc: 'true 면 선택만 잠긴다 — 달 이동·둘러보기는 그대로(MOCA 동일)' },
			},

			events: {
				onChange: { prop: 'onChange', desc: '(value) => void — 값이 바뀔 때(제어 모드 필수)' },
				onSelect: { prop: 'onSelect', desc: '(value, view) => void — 값이 확정될 때 (MOCA data-m-onselect). setValue 는 발화하지 않는다(초기 바인딩·취소 원복용) 예) onSelect={(v) => say(v)}' },
				onViewChange: { prop: 'onViewChange', desc: '(ym, view) => void — 표시 기준이 바뀔 때(이전/다음·오늘·뷰 전환). **공휴일 재조회를 여기에 건다**. 초기화 시엔 발화하지 않으므로 첫 조회는 화면이 getViewYm() 으로 직접 한다(MOCA 와 같은 규약) 예) onViewChange={(ym, view) => { if (view === "day") loadHoli(ym) }}' },
			},

			methods: {
				getValue: { sig: 'getValue()', desc: '선택값(숫자문자열 — 타입 자릿수, 선택 없으면 "")' },
				setValue: { sig: 'setValue(v)', desc: '선택값 설정 + 그 값이 보이는 달로 이동(이벤트 미발화) 예) cal.current.setValue("20260815")' },
				clear: { sig: 'clear()', desc: '선택 해제(이벤트 미발화)' },
				setData: { sig: 'setData({dayInfo})', desc: '업무 표시 데이터를 명령형으로 넣는다 — dayInfo prop 대신 ref 로 넘기고 싶을 때(MOCA setData 대응). 넘긴 즉시 다시 그린다' },
				getDayInfo: { sig: 'getDayInfo(ymd)', desc: '그 날의 표시 데이터 반환(없으면 빈 객체) — 비영업일 판정 같은 업무 로직은 화면 몫이다 예) if (cal.current.getDayInfo(v).off) alert("휴무일입니다")' },
				setDateRange: { sig: 'setDateRange(min, max)', desc: '선택가능 범위를 런타임에 지정 — 경계가 다른 값에서 오는 화면용(예약 가능일이 "오늘~30일", 입고일 하한이 발주일인 경우). 고정 구간이면 props 로 충분하다 예) cal.current.setDateRange(today, mdate.addDay(today, 30))' },
				getDateRange: { sig: 'getDateRange()', desc: '지금 적용 중인 범위 { min, max } — props 와 setDateRange 가 합쳐진 최종값' },
				getViewYm: { sig: 'getViewYm()', desc: '지금 보고 있는 기준 연월(yyyyMM) — 공휴일 조회 파라미터. 첫 조회에 쓴다' },
				setViewYm: { sig: 'setViewYm(ym)', desc: '표시 기준 이동(선택값은 그대로). 기준이 바뀌면 onViewChange 발화' },
				today: { sig: 'today()', desc: '오늘이 속한 달로 이동 — 선택값은 안 바뀐다(이동 전용). 헤더의 [오늘] 버튼과 다르다: 버튼은 오늘을 고르고, 이 메서드는 화면이 명시적으로 부르는 것이라 값을 건드리지 않는다' },
				next: { sig: 'next()', desc: '다음으로 이동(단위는 현재 뷰 — 일=1개월·월=1년·연=10년)' },
				prev: { sig: 'prev()', desc: '이전으로 이동' },
				setReadOnly: { sig: 'setReadOnly(bool)', desc: '선택 잠금 토글(달 이동은 그대로)' },
			},
		},

		/* ═══ MocaReactScheduleCalendar — packages/moca-react-schedule-calendar ═══ */
		MocaReactScheduleCalendar: {
			pkg: '@teammoca/react-schedule-calendar',
			desc: '월간 일정 달력 (MOCA scheduleCalendar 이식, 데모 TPL041 대응). 앞의 달력 3종이 "날짜를 고르는" 컴포넌트라면 이쪽은 "일정을 보여주는" 컴포넌트다. 화면이 하는 일은 셋뿐: ① 월 변경 시 그 달 조회 ② 아이템으로 매핑해 넘기기 ③ 일자 클릭 시 getDayItems. 연속일정 일자 전개(pos one/s/m/e)·정렬(완료 뒤·연속 우선·시작일·시작시간·seq)·바 마크업·공휴일/날씨/뱃지 표기·좌우 스와이프는 컴포넌트가 한다',
			usage: "import { MocaReactScheduleCalendar } from '@teammoca/react-schedule-calendar'\n\n<MocaReactScheduleCalendar ref={scc}\n  schedules={schedules}      // [{ start, end, title, ico, done, crucial, bg, fg, mark, time, seq, data }]\n  dayInfo={dayInfo}          // { '20260815': { holi: '광복절', wthr: '☀️', badges: ['휴'] } }\n  hideOutside todayFlag menuButton\n  onMonthChange={(ym) => loadMonth(ym)}   // 초기 조회는 화면이 getYm() 으로 직접\n  onDayClick={(day) => setPicked({ ymd: day.ymd, items: scc.current.getDayItems(day.ymd) })}\n  dayRenderer={(day) => day.dow === 0 ? <span>휴일</span> : null} />",

			props: {
				schedules: { prop: 'schedules', desc: '일정 아이템 배열 — { start:"yyyyMMdd"(필수), end(생략=단일), title, ico, done, crucial, span(생략 시 end>start 로 판정), bg, fg, mark(마커색 — 생략 시 fg), time:"HHmm"(시작시간 정렬키), endTime(상세용), seq(동순위 최후 정렬키 — 최근 우선), data(원본 행 — 컴포넌트는 보관만 하고 getDayItems 로 되돌려준다) }. ref.setData 로 넘겨도 된다 예) schedules={rows.map(toItem)}' },
				dayInfo: { prop: 'dayInfo', desc: '{ yyyyMMdd: { holi, wthr, badges[] } } — 공휴일명(날짜 위에 표시·날짜 빨강) · 날씨 · 뱃지. 컴포넌트는 공휴일을 모른다(화면이 조회해 넘긴 것만 그린다)' },
				hideOutside: { prop: 'hideOutside', desc: 'true 면 표시 월 밖 칸(전월 말·익월 초)에는 일정·메타를 그리지 않고 날짜만 남긴다(MOCA data-m-hideoutside 대응)' },
				startYm: { prop: 'startYm', desc: '초기 표시 월(yyyyMM, 기본 이번 달)' },
				header: { prop: 'header', desc: 'false 면 내부 헤더(메뉴·이전·연월·다음·오늘)를 숨긴다 — 화면이 이동 UI 를 직접 만들 때' },
				menuButton: { prop: 'menuButton', desc: 'true 면 헤더 맨 앞에 햄버거 버튼 — 화면이 옵션·드로어를 여는 진입점(컴포넌트는 훅만 준다. onMenuClick 과 함께)' },
				todayFlag: { prop: 'todayFlag', desc: 'true 면 오늘 칸에 TODAY 깃발을 꽂는다(칸 위로 살짝 올라간 형태. 첫 주는 위 공간이 없어 칸 안쪽에 세운다. 클릭은 아래 칸이 받는다). 모션 최소화 설정에서는 흔들림만 멈춘다' },
				dayRenderer: { prop: 'dayRenderer', desc: '(day) => ReactNode — 날짜 배지 아래에 넣을 내용. day={ymd,dd,dow,inMonth,today}. MOCA 는 HTML 문자열을 반환했지만 React 판은 노드를 반환한다 예) dayRenderer={(day) => day.dow === 0 ? <span>휴일</span> : null}' },
			},

			events: {
				onMonthChange: { prop: 'onMonthChange', desc: '(ym) => void — 표시 월 변경 시(헤더 버튼·오늘·setYm·스와이프). **초기화 시엔 미발화** — 첫 조회는 화면이 getYm() 으로 직접 한다(MOCA 와 같은 규약) 예) onMonthChange={(ym) => loadMonth(ym)}' },
				onDayClick: { prop: 'onDayClick', desc: '(day) => void — 일 칸 클릭. day={ymd,dd,dow,inMonth,today}. 여기서 getDayItems 로 그 날 목록을 꺼낸다(서버 재조회 없음)' },
				onMenuClick: { prop: 'onMenuClick', desc: '() => void — 헤더 햄버거 클릭(menuButton 과 함께)' },
			},

			methods: {
				setData: { sig: 'setData({schedules, dayInfo, hideOutside})', desc: '일정 표시 데이터를 명령형으로 넣는다(MOCA 표준 API). props 로 넘기는 방식과 같은 결과 — 기존 MOCA 화면을 옮길 때 이 형태가 편하다' },
				getDayItems: { sig: 'getDayItems(ymd)', desc: '그 날의 일정 목록을 **화면 순서 그대로** 반환 — 이미 인덱싱해 둔 것이라 서버 재조회가 필요 없다. 각 항목 = 아이템 사본 + pos("one"|"s"|"m"|"e" — 그 날이 단일/시작/중간/종료 중 무엇인지) + ymd. data(원본 행)를 담아 넘겼다면 그대로 실려 온다 예) const items = scc.current.getDayItems(day.ymd)' },
				getDayInfo: { sig: 'getDayInfo(ymd)', desc: '그 날의 일자메타({holi,wthr,badges}) 반환 — getDayItems 와 대칭. 일자 목록에 공휴일·날씨까지 재조회 없이 함께 보여줄 때' },
				getYm: { sig: 'getYm()', desc: '현재 표시 월(yyyyMM) — 초기 조회에 쓴다 예) loadMonth(scc.current.getYm())' },
				setYm: { sig: 'setYm(ym)', desc: '그 월로 이동 — 월이 바뀌면 onMonthChange 발화' },
				today: { sig: 'today()', desc: '오늘이 속한 월로 이동' },
				next: { sig: 'next()', desc: '다음 달' },
				prev: { sig: 'prev()', desc: '이전 달' },
				refresh: { sig: 'refresh()', desc: '강제 재렌더 — React 는 데이터가 바뀌면 자동으로 다시 그리므로 보통 필요 없다(dayRenderer 가 외부 값을 읽는 화면에서 MOCA 호환용)' },
			},
		},

		/* ═══ msgbox / MocaReactMsgHost — packages/moca-react-msgbox ═══ */
		msgbox: {
			kind: '모듈',   // 컴포넌트가 아니라 함수/훅 묶음 — 문서 목차에서 따로 묶인다
			pkg: '@teammoca/react-msgbox',
			desc: '메시지박스 3종(alert · error · confirm) + 필수값 안내 + 진행 모달 (MOCA moca.$g.alert/error/confirm·requiredFail·showProgress 이식, 데모 TPL023 대응). MOCA 처럼 화면 어디서나 명령형으로 부르고, React 답게 await 로 답을 받을 수도 있다. 실제 렌더는 앱 루트에 한 번 놓는 <MocaReactMsgHost /> 가 맡는다(없으면 콘솔 경고). 모달은 큐로 한 번에 하나씩 표시하고(MOCA 는 겹쳐 쌓였다 — 의도된 개선), 진행 모달은 그 위에 별도로 뜬다. Enter=확인 · ESC=취소(confirm)/확인(alert·error), 열리면 확인 버튼에 포커스',
			usage: "import { msgbox, MocaReactMsgHost } from '@teammoca/react-msgbox'\n\n<MocaReactMsgHost />                      // 앱 루트에 한 번(App.jsx)\n\nmsgbox.alert('저장되었습니다.')             // MOCA 와 같은 호출\nmsgbox.alert('완료', () => reload())       // 콜백(MOCA 호환)\nif (await msgbox.confirm('저장하시겠습니까?')) save()      // 답을 그 자리에서\nconst mode = await msgbox.confirm('어디에 추가할까요?', { radios: [...] })\n\nif (!name) return msgbox.requiredFail('사용자명', () => ref.current.focus())",

			props: {
				message: { prop: 'message(문자열 | ReactNode)', desc: '문자열은 **텍스트로** 넣고 줄바꿈(\\n)만 반영한다. 강조가 필요하면 노드를 넘긴다 — MOCA 는 innerHTML 이라 <b>/<br/> 을 썼지만, 서버 문장을 그대로 HTML 로 넣던 통로를 막아 XSS 여지를 없앤 것이다(의도된 차이) 예) msgbox.alert(<>성공 <b>12건</b></>)' },
			},
			events: {},

			methods: {
				alert: { sig: 'msgbox.alert(message, cb?)', desc: '알림(확인 1개, ! 아이콘). cb 는 [확인] 후 실행. Promise 도 반환하므로 await 가능 예) msgbox.alert("저장되었습니다.")' },
				error: { sig: 'msgbox.error(message, cb?)', desc: '오류 알림 — alert 과 같은 구조이되 danger 색 + ✕ 아이콘으로 구분한다(MOCA 동일) 예) msgbox.error("삭제할 수 없는 데이터입니다.")' },
				confirm: { sig: 'msgbox.confirm(message, okCb?, cancelCb?, {radios}?)', desc: '확인/취소. 호출 형태 4가지 — confirm(msg) → Promise<boolean> · confirm(msg, ok, cancel) → MOCA 호환 콜백 · confirm(msg, ok, cancel, {radios}) → 확인 콜백에 선택값 · confirm(msg, {radios}) → Promise<선택값|null>(취소 null). radios=[{value,label,desc,checked}] — checked 가 없으면 첫 항목이 기본 선택 예) const mode = await msgbox.confirm("어디에 추가할까요?", { radios: [{ value: "child", label: "하위로" }] })' },
				requiredFail: { sig: 'msgbox.requiredFail(label, focusCb?)', desc: '필수값 안내 — "{label}은(는) 필수입력항목입니다." 를 띄우고 **항상 false 를 즉시 반환**한다(MOCA 와 같은 규약이라 `if (!v) return msgbox.requiredFail(...)` 패턴이 그대로 동작). focusCb 는 [확인] 후 실행 — 해당 입력칸으로 포커스를 옮긴다 예) if (!name) return msgbox.requiredFail("사용자명", () => ref.current.focus())' },
				showProgress: { sig: 'msgbox.showProgress(message?, delay?)', desc: '진행 모달 표시 — delay(ms, 기본 300) 뒤에 나타난다. 그 안에 작업이 끝나면 모달이 아예 뜨지 않아 짧은 작업의 깜빡임이 없다(MOCA 와 같은 의도). 0 이면 즉시 예) msgbox.showProgress("조회중입니다", 0)' },
				setProgressMsg: { sig: 'msgbox.setProgressMsg(message)', desc: '진행 모달 문구 교체(단계 표시) 예) msgbox.setProgressMsg("데이터 처리중 2/3")' },
				hideProgress: { sig: 'msgbox.hideProgress()', desc: '진행 모달 닫기 — 통신과 함께 쓸 때는 **finally 에서** 부른다(실패해도 반드시 닫히게)' },
				MocaReactMsgHost: { sig: '<MocaReactMsgHost />', desc: '메시지박스 호스트 — 앱 루트에 **한 번만** 놓는다(App.jsx). 이것이 없으면 msgbox 호출이 표시되지 않고 콘솔에 경고가 뜬다. 로그인 화면에서도 쓸 수 있어야 하므로 인증 게이트보다 앞에 둔다' },
			},
		},

		/* ═══ popup / MocaReactPopupHost — packages/moca-react-popup ═══ */
		popup: {
			kind: '모듈',   // 컴포넌트가 아니라 함수/훅 묶음 — 문서 목차에서 따로 묶인다
			pkg: '@teammoca/react-popup',
			desc: '화면을 모달 창으로 띄우고 결과를 받는다 (MOCA $p.openPop / $p.getParameter / $p.close 이식, 데모 TPL037 대응). **팝업 3동사** — 열기 popup.open(Component, 옵션) · 파라미터 팝업이 props.data 로 받기 · 닫기 팝업이 props.close(결과)로 닫기. MOCA 는 url 로 팝업 HTML 을 지정했지만 React 는 **컴포넌트를 그대로** 넘긴다(lazy 컴포넌트도 가능). 실제 렌더는 앱 루트에 한 번 놓는 <MocaReactPopupHost /> 가 맡는다(없으면 콘솔 경고). 메시지박스가 큐(하나씩)인 것과 달리 팝업은 **스택**이라 팝업 안에서 또 팝업을 열 수 있고(품목검색 → 거래처검색) 각 팝업은 자기 데이터·결과만 소유한다. 제목바 드래그 이동, ESC 로 맨 위 팝업 취소',
			usage: "import { popup, MocaReactPopupHost } from '@teammoca/react-popup'\nimport PopItemSearch from './pop/PopItemSearch'\n\n<MocaReactPopupHost />                    // 앱 루트에 한 번(App.jsx)\n\n// await 로 받기(권장 — 답에 따라 다음 줄이 갈린다)\nconst row = await popup.open(PopItemSearch, { title: '품목 검색', width: 640, data: { keyword } })\nif (row) setItem(row)                     // 취소면 undefined\n\n// 콜백(MOCA openPop 호환) — 취소면 콜백이 아예 불리지 않는다\npopup.open(PopItemSearch, { title: '품목 검색', callback: (row) => setItem(row) })\n\n// 팝업 화면 — 업무 화면과 똑같이 만들고 결과를 close 로 넘긴다\nfunction PopItemSearch({ data, close }) {\n  return <button onClick={() => close(row)}>선택</button>   // close() 는 취소\n}",

			props: {
				title: { prop: 'title', desc: '제목바 문구 — aria-label 로도 들어간다' },
				width: { prop: 'width', desc: '팝업 너비(숫자=px 또는 CSS 문자열). 생략 시 560px. 화면보다 크면 화면 폭에 맞춰 줄어든다 예) width: 640' },
				height: { prop: 'height', desc: '팝업 높이(숫자=px 또는 CSS 문자열). 생략 시 내용 높이에 맞추고 최대 90vh. **그리드를 담은 팝업은 height 를 주거나 팝업 화면 루트에 minHeight 를 준다** — 높이가 내용 기준이면 레이아웃의 auto(남는 공간) 칸이 0 이 되어 목록이 보이지 않는다(데모 팝업 화면들이 minHeight 방식) 예) height: 520' },
				modal: { prop: 'modal', desc: 'false 면 뒤 화면을 계속 조작할 수 있는 보조창(딤이 클릭을 막지 않는다). 기본 true 예) modal: false' },
				data: { prop: 'data', desc: '팝업에 넘기는 파라미터 — 팝업 컴포넌트가 **props.data** 로 받는다 (MOCA $p.getParameter() 대응) 예) data: { keyword: "마우스" }' },
				callback: { prop: 'callback', desc: '확정 결과를 받는 콜백(MOCA openPop 호환). close(결과)로 닫힐 때만 호출되고 **취소(close()·× ·ESC)면 호출되지 않는다** — MOCA 와 같은 규약. await 를 쓰면 없어도 된다' },
				draggable: { prop: 'draggable', desc: 'false 면 제목바 드래그 이동 금지 (기본 true). 이동 위치는 화면 밖으로 나가지 않게 클램프된다' },
			},

			events: {},

			methods: {
				open: { sig: 'popup.open(Component, { title, width, height, modal, data, callback, draggable })', desc: '팝업 열기 — **결과 Promise** 를 돌려준다(확정=close 로 넘긴 값, 취소=undefined). Component 는 화면 컴포넌트 자체이며 lazy() 도 된다(받는 동안 "화면 로딩중…"). 이미 팝업이 떠 있으면 그 위로 겹쳐 쌓인다 예) const row = await popup.open(PopItemSearch, { title: "품목 검색", width: 640 })' },
				close_prop: { sig: 'props.close(결과)  ← 팝업 안에서', desc: '팝업이 스스로 닫는 방법 (MOCA $p.close 대응). **close(결과)=확정** — callback 발화 + Promise 결과 / **close()=취소** — 콜백 미발화 + Promise undefined. 닫기 버튼은 푸터 한 곳에만 두면 된다(제목바 × 는 셸이 준다)' },
				close: { sig: 'popup.close(id?)', desc: '바깥에서 팝업을 닫는다(취소 처리). id 생략 시 가장 위 팝업 — 통신 실패로 팝업을 접어야 할 때' },
				closeAll: { sig: 'popup.closeAll()', desc: '열린 팝업 전부 닫기(모두 취소) — 화면 전환·로그아웃 때 부른다(App.jsx 로그아웃에 적용)' },
				MocaReactPopupHost: { sig: '<MocaReactPopupHost />', desc: '팝업 호스트 — 앱 루트에 **한 번만** 놓는다(App.jsx). 없으면 popup.open 이 표시되지 않고 콘솔에 경고가 뜬다. document.body 포털로 그리므로 화면의 overflow 에 잘리지 않는다. z-index 는 7500 부터 겹친 순서대로(메시지박스 8000·달력 7800 이 그 위에 오도록 설계)' },
			},
		},

		/* ═══ MocaReactEchart — packages/moca-react-echart ═══ */
		MocaReactEchart: {
			pkg: '@teammoca/react-echart',
			desc: 'Apache ECharts 를 감싼 차트 컴포넌트 (MOCA plugins/echart.js 이식). option 문법은 ECharts 제품 API 그대로 — 래퍼는 내용을 해석하지 않고 인스턴스 관리(생성·리사이즈·해제)만 담당한다. ResizeObserver 로 크기 변화를 자동 추종(레이아웃 setRatio·MDI 분할·창 크기·모바일 스택 전환에 화면 코드 불필요). 언마운트 시 자동 dispose',
			usage: "import { MocaReactEchart } from '@teammoca/react-echart'\n\nconst option = { xAxis: {...}, yAxis: {...}, series: [{ type: 'bar', data: [...] }] }\n<MocaReactEchart option={option} />   {/* 부모(레이아웃 pane)를 100% 채운다 */}\n\n// 제품 API 직접 사용 — ref 로 실제 echarts 인스턴스를 받는다\nchartRef.current?.getChart((c) => c.dispatchAction({ type: 'highlight', dataIndex: 0 }))",

			props: {
				option: { prop: 'option', desc: 'ECharts option 객체 — 바뀔 때마다 전체 교체(notMerge) 적용 (MOCA setValue 대응). null/undefined 면 차트를 비운다(clear). option 문법은 ECharts 제품 문서를 그대로 따른다' },
				merge: { prop: 'merge', desc: 'true 면 전체 교체 대신 병합(setOption 기본 동작) — 시리즈 데이터만 갈아끼우는 부분 갱신용 (기본 false)' },
				theme: { prop: 'theme', desc: '"auto"(기본 — OS 다크면 echarts 내장 "dark" 테마, MOCA 앱 기조 대응) | echarts 테마명 | null(기본 테마). 테마가 바뀌면 인스턴스를 재생성한다(echarts 테마는 init 시점 고정)' },
				height: { prop: 'height', desc: '차트 높이(px). 생략하면 부모를 100% 채운다 — 레이아웃 pane 안에서는 생략이 기본. 높이가 0 이면 조용히 안 보이니 부모 높이를 확인할 것(MOCA 동일 주의)' },
			},

			events: {},

			methods: {
				getChart: { sig: 'getChart(cb)', desc: 'echarts 인스턴스를 콜백으로 넘긴다 — 제품 API 직접 사용 진입점 (MOCA 대응) 예) ref.current?.getChart((c) => c.on("click", fn))' },
				getChartObj: { sig: 'getChartObj()', desc: 'echarts 인스턴스 즉시 반환 (마운트 전이면 null)' },
				resize: { sig: 'resize()', desc: '수동 리사이즈 — 크기 변화는 ResizeObserver 가 자동 추종하므로 즉시 반영이 필요할 때만' },
				clear: { sig: 'clear()', desc: '차트 비우기 (option prop 을 null 로 줘도 동일)' },
			},
		},

		/* ═══ MocaReactFloatingButton — packages/moca-react-floating-button ═══ */
		MocaReactFloatingButton: {
			pkg: '@teammoca/react-floating-button',
			desc: '화면 위에 떠 있는 원형/알약형 액션 버튼(FAB) — MOCA floatingButton 이식. 기본 우하단(fixed), 꾹 누르면(350ms) 드래그 모드로 자유롭게 이동(마우스·터치 공통, 뷰포트/부모 클램프, 드래그 직후 click 무시). 레이아웃의 골격 미리보기 버튼도 이 컴포넌트다',
			usage: "import { MocaReactFloatingButton } from '@teammoca/react-floating-button'\n\n<MocaReactFloatingButton onClick={fnNew} title=\"신규\" />              {/* plus 원형 */}\n<MocaReactFloatingButton label=\"저장\" icon=\"💾\" onClick={fnSave} />   {/* 알약형 */}\n<MocaReactFloatingButton absolute position=\"rt\" icon=\"✏️\" bgColor=\"#b4493e\" onClick={fnEdit} />",

			props: {
				label: { prop: 'label', desc: '버튼 텍스트 (MOCA data-m-label 대응) — 주면 아이콘 옆에 텍스트가 붙는 알약형, 생략하면 아이콘만 원형. aria-label 로도 들어간다' },
				icon: { prop: 'icon', desc: "아이콘 (기본 'plus' — MOCA data-m-icon 대응). 'plus'=내장 SVG(색 추종) · '/' 나 '.' 포함=이미지 경로 <img> · 그 외 문자열=글리프 텍스트(이모지) · ReactNode=그대로 렌더(React 판 확장) 예) icon=\"✏️\"" },
				iconMode: { prop: 'iconMode', desc: '"img"(기본) | "mask" — 경로 아이콘을 CSS mask 로 currentColor 를 채워 그린다(파일 아이콘도 색·테마 자동 추종, MOCA data-m-iconmode 대응)' },
				bgColor: { prop: 'bgColor', desc: '배경색 (MOCA data-m-bgcolor 대응). 기본은 테마 토큰(primary)이라 라이트/다크 자동 추종 — 화면 고유색을 줄 때만 지정' },
				color: { prop: 'color', desc: '아이콘·글자색 (MOCA data-m-color 대응)' },
				position: { prop: 'position', desc: '모서리 위치 — "rb"(기본·우하단) | "lb" | "rt" | "lt" (MOCA data-m-position 대응)' },
				absolute: { prop: 'absolute', desc: 'true 면 fixed 대신 부모(positioned ancestor) 기준 절대배치 — 레이아웃/컨테이너 안 버튼용. 드래그 클램프도 부모 기준이 된다' },
				draggable: { prop: 'draggable', desc: '꾹 눌러 드래그 이동 (기본 true — MOCA data-m-draggable 대응). 짧은 클릭은 onClick, 350ms 홀드 후 이동, 대기 중 8px 이상 움직이면 취소. 이동 위치는 마운트 동안만 유지(영속화 없음)' },
				className: { prop: 'className', desc: '외형 확장 — 쓰는 쪽 CSS 가 기본 외형(.mrf)을 덮을 수 있다 예) 레이아웃의 mrl-debug-fab' },
			},

			events: {
				onClick: { prop: 'onClick', desc: '클릭 콜백 (MOCA data-m-onclick 대응). Enter/Space 키보드도 발화(접근성). 드래그로 이동한 직후의 클릭은 무시된다' },
			},

			methods: {},
		},

		/* ═══ MocaReactSearchCombo — packages/moca-react-search-combo ═══ */
		MocaReactSearchCombo: {
			pkg: '@teammoca/react-search-combo',
			desc: '타이핑으로 목록을 좁혀 고르는 검색형 콤보 — MOCA searchCombo 이식. 항목이 수십·수백 건이라 select 로는 훑기 힘든 자리에 쓴다. **필터는 화면에 보이는 표시문구 기준**(대소문자 무시)이라, 코드로도 검색시키려면 displayFormat 으로 코드를 문구에 넣는다. ↓↑ 로 이동하고 Enter/클릭으로 확정하며, 목록은 뷰포트 기준(fixed)으로 띄워 레이아웃 칸이나 헤더 안에서 잘리지 않고 아래 자리가 모자라면 위로 뒤집힌다. 데모 앱 헤더의 메뉴 검색이 이 컴포넌트다',
			usage: "import { MocaReactSearchCombo } from '@teammoca/react-search-combo'\n\n<MocaReactSearchCombo list={areas} value={area} onChange={(v) => setArea(v)} />\n\n{/* 코드까지 검색되게 — 필터는 표시문구 기준이다 */}\n<MocaReactSearchCombo list={codes} displayFormat=\"[value] · [label]\" width={220} />\n\n{/* 검색창 용법 — 고르고 나면 입력칸을 비운다(헤더 메뉴 검색) */}\n<MocaReactSearchCombo list={menuList} clearOnSelect placeholder=\"메뉴 검색\" onChange={openScreen} />",

			props: {
				list: { prop: 'list', desc: '목록 [{ cd, nm }] (필수). null 항목은 걸러낸다. 참조가 바뀌면 그 자리에서 목록이 갈린다 — 서버 조회 후 setState 로 넘기면 된다 예) list={areas}' },
				cdKey: { prop: 'cdKey', desc: "코드 필드명 (기본 'cd' — MOCA data-m-cdkey 대응) 예) cdKey=\"DEPT_CD\"" },
				nmKey: { prop: 'nmKey', desc: "표시명 필드명 (기본 'nm' — MOCA data-m-nmkey 대응) 예) nmKey=\"DEPT_NM\"" },
				value: { prop: 'value', desc: '선택 코드값. 주면 **제어 컴포넌트**가 되어 값을 바꾸는 책임이 화면(state)에 있다 — onChange 에서 반영하지 않으면 값이 그대로 남는다. 비제어로 쓰려면 defaultValue' },
				defaultValue: { prop: 'defaultValue', desc: "비제어일 때 초기 선택값 (기본 ''). 목록에 없는 값이면 표시는 빈 칸" },
				displayFormat: { prop: 'displayFormat', desc: "표시문구 틀 — '[value]'/'[label]' 을 코드/표시명으로 치환한다 (MOCA data-m-displayformat 대응). **필터가 이 문구 기준**이라 코드·분류로도 검색시키려면 여기 넣어야 한다 예) displayFormat=\"[value] · [label]\"" },
				placeholder: { prop: 'placeholder', desc: "입력칸 안내문 (기본 '내용을 입력하세요' — MOCA 동일)" },
				readOnly: { prop: 'readOnly', desc: '입력 불가 + ▼ 버튼 없음 (MOCA data-m-readonly 대응). 값은 표시만 된다' },
				disabled: { prop: 'disabled', desc: 'true 면 비활성 — 입력·열기 모두 막고 흐리게 표시' },
				clearOnSelect: { prop: 'clearOnSelect', desc: 'true 면 확정 후 입력칸을 비운다 (기본 false — React 판 자체 기능). "값을 고르는 칸"이 아니라 "검색해서 실행하는 칸"일 때 쓴다 예) clearOnSelect' },
				emptyText: { prop: 'emptyText', desc: "결과가 0건일 때 목록에 표시할 안내문 (기본 '검색 결과가 없습니다'). MOCA 는 목록을 닫아버려 고장과 구분이 안 됐다" },
				maxHeight: { prop: 'maxHeight', desc: '목록 최대 높이(px, 기본 200 — MOCA 동일). 남은 공간이 이보다 작으면 그만큼만 쓰고 스크롤한다' },
				width: { prop: 'width', desc: '컴포넌트 폭 (기본 CSS 160px — MOCA 기본 140px 과 달리 표시문구가 길어지는 용법을 기준으로 잡았다)' },
				className: { prop: 'className', desc: '외형 확장 — 쓰는 쪽 CSS 가 기본 외형(.mrsc)을 덮을 수 있다 예) 데모 앱 헤더의 mdi-menu-search 가 입력칸만 반투명으로 덮는다' },
			},

			events: {
				onChange: { prop: 'onChange', desc: '(value, item, changed) => void — **확정(Enter/클릭) 시에만** 발화한다. 타이핑 중에는 오지 않는다(MOCA 는 필터가 돌 때마다 첫 매칭을 선값해 값이 계속 바뀌었다). changed 는 이전 값과 다른지 여부로, **같은 항목을 다시 골라도 changed:false 로 발화**한다 — 메뉴 검색처럼 값이 아니라 행위가 필요한 화면 때문 예) onChange={(v, row) => setArea(v)}' },
			},

			methods: {
				getValue: { sig: 'getValue()', desc: '선택 코드값 (MOCA getValue 대응)' },
				getLabel: { sig: 'getLabel()', desc: '선택 표시문구 (MOCA getLabel 대응)' },
				setValue: { sig: 'setValue(value)', desc: '값 지정 + 입력칸 표시 갱신 (MOCA setValue 대응). 제어 모드면 표시만 갱신되고 값의 주인은 그대로 화면이다' },
				clear: { sig: 'clear()', desc: '선택·입력 초기화' },
				focus: { sig: 'focus()', desc: '입력칸 포커스 — 화면을 열자마자 검색부터 시키고 싶을 때' },
				open: { sig: 'open()', desc: '필터를 풀고 전체 목록 열기 (MOCA _searchComboFullShow 대응)' },
				close: { sig: 'close()', desc: '목록 닫기 — 입력칸은 확정값 표시로 되돌아간다' },
				getList: { sig: 'getList()', desc: '현재 목록 사본 (MOCA getList 대응)' },
			},
		},

		/* ═══ MocaReactLayout — packages/moca-react-layout ═══ */
		MocaReactLayout: {
			pkg: '@teammoca/react-layout',
			desc: '반응형 분할 레이아웃 — layout 속성 하나로 자식들을 방향(v/h) + 비율 토큰으로 분할 배치한다(MOCA layout.js 이식). 모든 화면 골격의 시작점. 데스크톱은 부모를 스크롤 없이 꽉 채우고, 모바일(≤768px)은 방향 무관 세로 스택으로 전환된다. 중첩 가능, Alt+L 로 골격 미리보기(와이어프레임)',
			usage: "import { MocaReactLayout } from '@teammoca/react-layout'\n\n// 가장 흔한 골격 — 검색영역(fit) + 본문(auto), 본문은 h3:7 중첩\n<MocaReactLayout layout=\"vfit:auto\">\n  <div>검색영역</div>\n  <MocaReactLayout layout=\"h3:7\" ref={bodyRef}>\n    <MocaReactGrid ... />   {/* 목록 3 */}\n    <MocaReactGrid ... />   {/* 상세 7 */}\n  </MocaReactLayout>\n</MocaReactLayout>\n\nbodyRef.current?.setRatio('h0:10')  // 런타임 변경 — 좌측 접기",

			props: {
				layout: { prop: 'layout', desc: '분할 스펙 "{방향}{토큰:토큰[:…]}" (기본 "v"). 방향 v=세로 스택·h=가로 분할. 토큰은 자식 개수만큼 ":" 나열(개수 제한 없음, 생략 시 균등). 통짜(분할 없음)의 표준 표기는 v1. 토큰 종류는 아래 tokens 절 예) layout="vfit:auto:fit"' },
				width: { prop: 'width', desc: '루트 고정 폭(px 숫자 또는 CSS 값 — MOCA data-m-width 대응). 주면 꽉채움 대신 이 크기 기준으로 분할하고 넘치면 부모가 스크롤' },
				height: { prop: 'height', desc: '루트 고정 높이 (MOCA data-m-height 대응)' },
				gap: { prop: 'gap', desc: '칸 사이 간격(px 숫자 또는 CSS 값, 기본 15 — MOCA --m-layout-gap 대응)' },
				mobileHeights: { prop: 'mobileHeights', desc: '칸별 모바일(≤768px) 고정 높이 배열 — 해당 없는 칸은 null (MOCA data-m-mobileheight 마커 대응, PC 무영향). h(가로) 레이아웃은 토큰이 "폭"이라 모바일 높이를 명시할 방법이 없어 생긴 장치 예) mobileHeights={[null, 360]}' },
				debug: { prop: 'debug', desc: 'true 면 골격 미리보기를 켠 채 시작(기본 false). 런타임 토글은 Alt+L 또는 우하단 FAB — 루트 레이아웃이 트리 전체에 칸 구조·토큰 라벨을 그린다' },
				wireframeButton: { prop: 'wireframeButton', desc: '루트 레이아웃 우하단의 골격 미리보기 토글 FAB 표시 (기본 true — MOCA _injectDebugFab/mconfig.wireframeBtn 대응). 실체는 MocaReactFloatingButton 이고 켜짐 상태는 primary 글로우로 표시. 운영 화면에서 숨기려면 false. 중첩 레이아웃에는 붙지 않는다(루트당 1개)' },

				/* 토큰 종류 — layout 스펙의 각 칸 값 */
				tokens: {
					number: { value: '숫자', desc: '상대 비율(flex-grow) — 합이 10일 필요 없다(2:8 = 1:4 = 20:80). 0 을 주면 그 칸이 접힌다(setRatio("h0:10") 사이드 토글) 예) layout="h3:7"' },
					px: { value: '숫자px', desc: '고정 크기 칸(주축 기준 — h 는 폭, v 는 높이). 모바일 세로스택에서는 내용 높이로 풀린다(그리드가 든 칸은 예외 — 높이 유지) 예) layout="h240px:auto"' },
					fit: { value: 'fit', desc: '내용 크기만큼(hug) — 검색영역/버튼줄 용. vfit:auto 가 가장 흔한 화면 골격, vfit:auto:fit 이 팝업 표준 골격' },
					auto: { value: 'auto', desc: '남은 공간 전부(내부적으로 grow 1 — 2:auto 는 2:1 과 동일). px/fit 고정 칸과 짝지어 "고정+나머지" 패턴으로 쓰는 것이 의도' },
				},

				/* 화면이 자기 박스에 붙이는 표식 클래스 */
				markers: {
					'mrl-fill': { value: 'class="mrl-fill"', desc: '모바일(≤768px) 세로스택에서 그 칸이 남은 높이를 채우게 하는 표식. 모바일은 칸을 내용 높이로 푸는데, 내용이 전부 absolute 이거나(플로팅 버튼 상자) 캔버스처럼 내재 높이가 없는 박스는 0 으로 주저앉아 화면 아래가 빈 채로 남는다. 그리드가 든 칸은 자동으로 채워지므로 표식이 필요 없다 예) &lt;div className="myBox mrl-fill"&gt;' },
				},
			},

			events: {},

			methods: {
				setRatio: { sig: 'setRatio(spec)', desc: '런타임 비율(+방향) 변경 (MOCA $p.get("lay").setRatio 대응). 방향 문자를 생략하면 현재 방향 유지. layout prop 이 바뀌면 런타임 변경분은 리셋된다 예) ref.current?.setRatio("7:3") — 방향 유지 / setRatio("v5:5") — 세로 전환' },
			},
		},

		/* ═══ MocaReactMdi — packages/moca-react-mdi ═══ */
		MocaReactMdi: {
			pkg: '@teammoca/react-mdi',
			desc: 'MDI 탭 셸 — 좌우 화면분할 + 탭 드래그 이동(MOCA mdi.js 이식). 탭 목록(tabs)은 부모가 소유하고 MDI 는 분할/이동/활성화를 담당. 탭별 고정 홀더 + createPortal 로 패널 이동 시에도 화면 상태(그리드 스크롤·선택 등)가 보존된다',
			usage: "import { MocaReactMdi } from '@teammoca/react-mdi'\n\nconst mdiRef = useRef(null)\n<MocaReactMdi\n  ref={mdiRef}\n  tabs={tabs}\n  onTabClose={(key) => setTabs((ts) => ts.filter((t) => t.key !== key))}\n  emptyHint=\"좌측 메뉴에서 화면을 선택하세요\"\n/>\nmdiRef.current?.activate('userlist')  // 이미 열린 탭 활성화",

			props: {
				tabs: { prop: 'tabs', desc: '열린 탭 목록 [{ key, title, content, pinned? }] — 부모가 소유. title 은 ReactNode 가능, content 는 렌더할 화면 ReactNode, pinned 는 닫기 버튼 없음(MOCA 고정탭 컨셉). 새로 추가된 탭은 자동 활성화 예) setTabs((ts) => [...ts, { key, title, content: <Screen /> }])' },
				emptyHint: { prop: 'emptyHint', desc: '분할 아님 + 탭 0개일 때 메인 패널에 보여줄 안내 문구' },
			},

			events: {
				onTabClose: { prop: 'onTabClose', desc: '닫기/전체닫기 요청 시 (key) 로 호출. 실제 제거(tabs 에서 빼기)는 부모 몫 예) onTabClose={(key) => setTabs((ts) => ts.filter((t) => t.key !== key))}' },
				onActiveChange: { prop: 'onActiveChange', desc: '지금 보이는 탭 key 배열로 호출 — 분할 중이면 두 개(메인, 서브). 좌측 메뉴에서 "열려 있음"과 "지금 보고 있음"을 구분해 칠하는 용도. 값이 실제로 바뀔 때만 호출되고, 탭이 닫히거나 패널을 옮겨 활성 탭이 자동 보정된 경우도 반영된다 예) onActiveChange={setActiveKeys}' },
			},

			methods: {
				activate: { sig: 'activate(key)', desc: '이미 열린 탭을 활성화 — 메뉴에서 같은 화면을 다시 클릭했을 때 사용(새 탭은 자동 활성화라 부를 필요 없다) 예) mdiRef.current?.activate("userlist")' },
			},
		},
	},

	/* ══════════════════════════════════════════════════════════════════════
	   app — 데모 앱(src/) 규약: 화면을 만들고 메뉴에 등록하는 방법
	   ══════════════════════════════════════════════════════════════════════ */
	app: {

		registry: {
			desc: '화면 레지스트리(src/screens/registry.jsx) — MOCA 처럼 2단 메뉴 구조. 1단(그룹)은 상단 메뉴바에, 2단(화면)은 좌측 메뉴에 표시된다. 화면 컴포넌트는 전부 lazy 로딩(MOCA frame 의 화면 지연 로드 대응) — 빌드 시 화면별 청크로 잘리고 탭을 처음 열 때 받아온다(로딩 중 표시는 App.jsx 의 Suspense). 새 화면은 lazy 한 줄 + 그룹 children 등록 한 줄이면 메뉴에 자동으로 나타나고 MDI 탭으로 열린다',
			usage: "// src/screens/registry.jsx — lazy 선언 한 줄 + 그룹의 children 에 한 줄\nconst UserList = lazy(() => import('./UserList'))\n{\n  key: 'work', title: '업무', icon: '🗂️',\n  children: [\n    { key: 'userlist', title: '사원 목록', icon: '👥', component: UserList },\n  ],\n}",

			group: {
				key: { field: 'key', desc: '그룹 고유 식별자' },
				title: { field: 'title', desc: '상단 메뉴바에 표시할 그룹명' },
				icon: { field: 'icon', desc: '메뉴에 표시할 이모지' },
				children: { field: 'children', desc: '이 그룹의 화면 목록(아래 screen 필드)' },
			},

			screen: {
				menuInfo: { field: 'props.menuInfo', desc: '셸(App.jsx)이 모든 화면에 자동 주입하는 메뉴정보 { id, label, icon, path } (MOCA frame 의 getParameter() 대응). 공통 타이틀 <ComTitle menu={menuInfo} /> 에 그대로 전달하면 [ID]·아이콘·제목·브레드크럼이 표시된다. 필요 없으면 무시 예) function SaleAgg({ menuInfo }) { ... }' },
				key: { field: 'key', desc: '화면 고유 식별자 — 같은 key 의 탭은 중복으로 열리지 않고 활성화만 된다' },
				title: { field: 'title', desc: '좌측 메뉴 표시명 겸 탭 제목' },
				icon: { field: 'icon', desc: '메뉴/탭 제목에 표시할 이모지' },
				component: { field: 'component', desc: '렌더링할 리액트 컴포넌트(src/screens/*.jsx)' },
			},
		},

		studio: {
			desc: 'MOCA React Studio(studio.html) 미리보기 약속 — 스튜디오는 앱(index.html)을 iframe 에 띄우고, 편집 중인 화면을 이 통로로 연다. 저장하면 vite HMR 이 그 화면을 그 자리에서 바꾼다. 같은 출처에서 온 메시지만 받는다',
			usage: "// 주소로 — 로그인 직후 첫 화면(INITIAL_SCREEN) 대신 그 화면을 연다\n./index.html?open=userlist\n\n// 메시지로 — 다시 싣지 않고 탭만 연다(앱이 로그인을 마치면 moca-studio-ready 를 먼저 보낸다)\niframe.contentWindow.postMessage({ type: 'moca-studio-open', key: 'userlist' }, location.origin)",

			url: {
				open: { field: '?open=<화면 key>', desc: '로그인 직후 그 화면을 연다(registry 의 화면 key). 없는 key 면 아무것도 열지 않는다 예) ./?open=userlist' },
			},
			message: {
				open: { field: "{ type: 'moca-studio-open', key }", desc: '부모(스튜디오) → 앱. 그 화면 탭을 연다 — 이미 열려 있으면 활성화만' },
				ready: { field: "{ type: 'moca-studio-ready' }", desc: '앱 → 부모. 로그인을 마쳐 화면을 열 수 있게 됐다는 신호 — 로그인 전에 보낸 열기 요청은 받을 곳이 없어서, 스튜디오는 이 신호를 받고 다시 보낸다' },
			},
		},
	},
};

/* 문서 생성기(tools/apidoc-gen.cjs)가 vm 으로 읽는다 — 브라우저/앱에서는 로드하지 않는다 */
