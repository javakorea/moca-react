import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { buildXlsx, download } from './excel'
import iconExcel from './assets/icon_excel.svg'
import iconRowStatus from './assets/icon_row_status.svg'
import iconRowNum from './assets/icon_row_num.svg'
import iconGridFull from './assets/icon_grid_full.svg'
import iconGridReduce from './assets/icon_grid_reduce.svg'
import './MocaReactGrid.css'

// MOCA React Grid — 표시 + 가상 스크롤 + 컬럼 리사이징 + 특수컬럼 + 툴바/전체화면
//
// 가상 스크롤 아키텍처 (MOCA grid.js 의 .moca_scrollY_type1 방식 — "전용 스크롤바"):
//   콘텐츠(행 영역)는 세로로 네이티브 스크롤하지 않는다(overflow-y hidden).
//   오른쪽에 좁은 전용 스크롤바 요소를 따로 두고, 그 안의 빈 스페이서(행높이×전체행수)가
//   스크롤바 비율을 만든다. 스크롤바의 scrollTop 이 바뀌면 "어느 행부터 그릴지"만 다시 계산해
//   행 내용을 갈아끼운다 — 콘텐츠가 컴포지터에 의해 움직이는 일이 없으므로,
//   아무리 빨리 스크롤해도 빈 화면(플래시)이 구조적으로 발생하지 않는다.
//   (일반 네이티브 스크롤 방식은 컴포지터가 메인 스레드보다 먼저 픽셀을 밀어 빈 영역이 노출된다)
//
// 특수컬럼 (MOCA grid.js _injectAutoCols 와 같은 컨셉 — 기본 켜짐, prop 으로 끈다):
//   [0] 행상태 : row._status 값(C:신규 U:수정 D:삭제)을 색으로 표시
//   [1] 행번호 : 전체 데이터 기준 절대 번호. 좁은 폭에는 scaleX 가로압축으로 전부 표시
//   [2] 삭제체크 : X 아이콘 체크(행별) + 헤더 전체선택
//
// 트리 컬럼 (MOCA celltype="tree" 이식 — 별도 트리 컴포넌트가 아니라 "컬럼 타입"이다):
//   columns 중 하나에 cellType: 'tree' 를 주면 그 컬럼이 트리로 그려진다.
//   데이터는 평면 배열 그대로 — 단, PATH 로 정렬되어 있어야 하고(SQL ORDER BY PATH 한 줄),
//   levelKey 가 가리키는 깊이(1부터 시작 — 1은 들여쓰기 없음, 2부터 연결선)만 있으면 된다.
//   부모/리프 판정은 MOCA 와 동일하게 "다음 행의 깊이" 로 계산한다(다음 행이 더 깊으면 부모).
//   부모 노드의 +/− 로 접고 펼친다. 접으면 모든 자손이 숨지만 자손의 접힘 상태는
//   보존된다 — 부모를 다시 펼치면 이전에 펼쳐져 있던 모습 그대로 복원 (MOCA 는 접을 때
//   하위 부모를 강제로 접어 상태가 사라진다 — 의도된 개선). 가상 스크롤은 보이는
//   행 목록 위에서 동작하므로 대용량 트리도 그대로 빠르다.
//
// 소계/합계 (MOCA data-m-calc/subtotal/total 이식 — TPL018 참조):
//   컬럼에 calc('sum'|'count'|'avg'|'min'|'max')를 주면 집계 대상이 된다. 집계행은 데이터가
//   아니라 "파생물" — data 가 바뀔 때마다 전부 다시 계산해 끼워 넣는다(MOCA _applyCalc 동일).
//   소계는 subtotal 그룹값의 "인접 런" 단위로 삽입 — 런 수 > 고유값 수(그룹 흩어짐)면
//   틀린 소계를 보여주느니 생략한다(MOCA 동일). 합계행은 스크롤과 무관하게 위/아래 고정(pin).
//   avg 는 소수 2자리 반올림, 전체 합÷전체 건수(평균의 평균 함정 회피). 빈 값은 안 센다.
//   min/max 는 양쪽 다 숫자면 숫자, 아니면 문자열 비교(날짜 문자열 동작). 트리와는 동시 사용 불가.
//
// 컬럼 세로 병합 (MOCA data-m-colmerge 이식):
//   컬럼에 merge: true 를 주면 연속된 같은 값이 병합되어 보인다 — 값은 병합 구간의 첫 표시
//   행에만 그려진다(MOCA colmergealign="top" 방식). 집계행은 병합 런을 끊는다.
//   병합 계산은 렌더 창 안에서만 하므로(MOCA 동일) 대용량에서도 비용이 없다.
//
// 정렬 · 필터 (MOCA doSort/doFilter 이식):
//   **data 는 절대 건드리지 않는다** — data 는 화면(screen)의 소유물이고, 그리드는 그 위에
//   "보기(view)"를 얹을 뿐이다. 필터 → 정렬 순으로 걸러 view.rows 를 만들고, 트리·집계·가상
//   스크롤·찾기는 전부 그 view 위에서 돈다(MOCA 는 grd.list 를 갈아끼우고 ori_list 로 되돌린다).
//   정렬은 컬럼당 3단(오름차순 → 내림차순 → 원래대로)이고 한 번에 한 컬럼이다.
//   필터는 헤더 드롭다운에서 그 컬럼의 고유값을 골라 켜고, 여러 컬럼이면 AND 로 걸린다.
//   선택행·삭제체크는 **원본 인덱스**로 들고 있어 정렬·필터가 바뀌어도 따라간다(MOCA 는 다시
//   그리면서 잃는다 — 의도된 개선). 반대로 행번호와 찾기는 "지금 보이는 목록"의 위치다.
//   트리 컬럼이 있으면 정렬·필터를 켜지 않는다 — 트리는 PATH 정렬을 전제로 부모/자식을 읽는다.
//
// props
//   columns   : [{ key, title, width? }]  width(px) 없으면 최초 렌더 시 남은 폭을 균등 분배
//               + align  : 'left'(기본)|'center'|'right' — 셀 정렬 (헤더는 항상 중앙)
//               + format : (value, row) => 표시값 — 표시 가공 함수 (MOCA data-m-displayfunction)
//               + calc   : 'sum'|'count'|'avg'|'min'|'max' — 집계 연산 (MOCA data-m-calc)
//               + merge  : true 면 연속 같은 값 세로 병합 (MOCA data-m-colmerge)
//               트리 컬럼: { cellType: 'tree', levelKey, labelKey, treeKey? } 추가
//                 levelKey : 깊이 컬럼명 (MOCA data-m-levelid — 예: 'DEPTH', 1부터)
//                 labelKey : 트리에 표시할 라벨 컬럼명 (MOCA data-m-labelid — 예: 'MENU_NM')
//                 treeKey  : 노드 고유키 컬럼명 (MOCA data-m-treeid — 예: 'MENU_ID'.
//                            현재 표시에는 안 쓰이고 행 추가류 기능을 위해 예약)
//   data      : 행 객체 배열 — 셀 값은 row[col.key] 로 읽는다
//   rowHeight : 행 높이(px). 가상화 계산의 기준이라 모든 행이 같은 높이를 가진다
//               (기본 26 — MOCA grid 의 data-m-defaultcellheight 기본값과 동일)
//   height    : 그리드 전체 높이(px). 생략하면 부모를 100% 채우는 반응형이 된다
//   overscan  : 보이는 구간 위아래 여유 렌더 행 수 — 경계의 부분 행 대비 (기본 3)
//   statusBar : true 면 하단에 "전체/렌더링 행수" 표시 (기본 true)
//   rowStatus / rowNum / delCheck : 특수컬럼 표시 여부 (기본 true — MOCA 와 동일)
//   label     : 그리드 제목. 지정하면 상단 툴바(제목 + 총건수 + 전체화면 버튼)가 나타난다
//   fullScreen: 툴바의 전체화면 버튼 표시 여부 (기본 true — label 지정 시에만 의미)
//   onRowSelected : 행 클릭 시 (row, rowIndex) 로 호출 — rowIndex 는 data 기준 절대 인덱스.
//                   MOCA data-m-onrowselected 대응. 같은 행을 다시 클릭해도 매번 호출된다(MOCA 동일)
//   rowHeightSelect : true 면 툴바에 행높이 선택 셀렉트박스 표시 (기본 false — MOCA 원본에는 없는
//                     React 그리드 자체 기능). 배열을 주면 그 값들이 선택지가 된다 (기본 [22,26,32,40]).
//                     선택값이 rowHeight prop 보다 우선한다. label 없이 켜면 툴바가 셀렉트만 갖고 나타난다
//   subtotal  : 소계 그룹 컬럼 key (MOCA data-m-subtotal — 1단만). 데이터는 그 컬럼으로
//               정렬되어 내려와야 그룹 경계가 드러난다(SQL ORDER BY)
//   total     : 합계행 위치 — true/'bottom'(기본, 맨 아래 고정) | 'top'(맨 위 고정) | false(없음)
//               (MOCA data-m-total). calc 컬럼이 하나도 없으면 집계 자체가 꺼진 것
//   subtotalLabel / totalLabel : 집계행 라벨 (기본 '소계' / '합 계' — MOCA subtotallabel/totallabel)
//   search    : true 면 툴바에 찾기(검색어 입력 + 다음 버튼) 표시 (기본 false — 자체 기능).
//               모든 데이터 컬럼에서 부분일치(대소문자 무시)로 찾아, 다음/Enter 마다 다음 매치 행을
//               선택(행 선택 기능 재사용 — onRowSelected 도 발화)하고 화면 가운데로 스크롤. 끝나면 순환
//   sortable / filterable : 헤더에 정렬·필터 버튼 표시 (기본 false — MOCA data-m-sortable/filterable).
//               그리드에 주면 모든 데이터 컬럼, 컬럼에 주면 그 컬럼만. 컬럼 값이 그리드 값보다 우선
//   filterDistinctLimit : 필터 목록을 만들 고유값 상한 (기본 1000 — MOCA data-m-filterdistinctlimit).
//               넘으면 그 컬럼 필터는 열리지 않는다(체크박스 수십만 개를 만들지 않기 위한 가드)
//
// 셀 편집 (MOCA 셀 입력 + 행상태 이식):
//   editable(그리드) 또는 컬럼 editable 이 켜진 셀을 더블클릭하면 그 자리에 입력칸이 뜬다.
//   Enter·칸 밖 클릭 = 반영, Esc = 취소, Tab/Shift+Tab = 같은 행 다음/앞 편집 칸으로.
//   editType: 'text'(기본) | 'number' | 'select'(options [{cd,nm}] — MOCA itemset 필드명) |
//   'checkbox'(체크하면 trueValue 'Y', 풀면 falseValue 'N' — 한 번 클릭으로 바로 바뀐다) | 'date'.
//   **반영은 행 객체를 그 자리에서 고친다**(MOCA 와 같다) — data 참조가 그대로라 선택·정렬·필터·스크롤이
//   유지되고, 저장 때 화면은 data 에서 _status 가 붙은 행만 골라 보내면 된다. 고친 행은 _status='U'
//   (신규 'C' 는 그대로), 고친 값이 전부 원래대로 돌아가면 'U' 를 다시 뗀다. 화면에는 onCellEdit 으로 알린다.
//
// 셀 그리기 (render — AG Grid cellRenderer 대응):
//   컬럼 render: (value, row, rowIndex) => ReactNode — 칸 안을 React 로 직접 그린다(배지·버튼·막대 …).
//   format 은 글자만, render 는 무엇이든. 편집 중에는 입력칸이 먼저다. 엑셀에는 원래 값(또는 format)이 나간다.
//
// 다단 헤더 · 가로 병합:
//   columns 에 { title, children:[…] } 묶음을 넣으면 머리글이 여러 줄이 되고 묶음 제목이 아래 칸들 위로
//   가로 병합된다(MOCA thead 다단 colspan/rowspan). 묶음 안에 묶음도 된다. 묶음이 없는 칸의 제목은
//   머리글 높이 전체에 걸친다(rowspan). 정렬·필터·폭 조절은 맨 아래 칸(실제 컬럼) 단위 그대로다.
//   본문 가로 병합은 컬럼 colSpan: (row, rowIndex) => n — 그 칸이 오른쪽 n-1 칸을 덮는다.
//
// 엑셀 내보내기:
//   excel(true 또는 파일 이름) 을 주면 툴바에 엑셀 버튼이 생긴다. ref.exportExcel(파일이름) 으로도 부른다.
//   지금 보이는 대로 나간다 — 필터·정렬 결과, 다단 헤더(병합 포함), 세로 병합(merge), 소계·합계.
//   숫자 칸(calc · editType 'number' · 값이 숫자)은 엑셀 숫자로 나가 엑셀에서 바로 더할 수 있다.
//   컬럼 excel: false 면 그 칸은 빠진다(버튼만 있는 칸 등).
//   의존성 없이 직접 만든다(./excel.js — 무압축 zip 에 XML 몇 장).

/* 필터 드롭다운 (MOCA _doFilterForSingle 의 .itemTable 이식) — 그 컬럼의 고유값을 건수와 함께
   늘어놓고 체크로 고른다. 열려 있는 동안만 존재하는 별개 컴포넌트라, 검색어·정렬·임시 체크
   같은 "적용 전 상태"가 그리드 본체를 리렌더시키지 않는다(스크롤 경로가 flushSync 라 민감하다).
   MOCA 와 다르게 간 곳: ① 검색으로 숨은 항목의 체크도 적용에 포함한다(MOCA 는 보이는 것만
   거둬서, 검색해 놓고 적용하면 나머지가 조용히 풀린다) ② 전체선택은 "지금 보이는 목록" 기준. */
const EMPTY_LIST = [] // 매 렌더 새 배열이 되면 아래 useMemo 가 헛돈다
function MocaGridFilterPanel({ options, current, limit, style, onApply, onClear, onClose }) {
  const [q, setQ] = useState('')
  const [order, setOrder] = useState('alpha') // 'alpha'(가나다순) | 'count'(건수순)
  const all = options.list ?? EMPTY_LIST
  // 처음 열 때는 "지금 적용된 값" 이 체크된 상태 — 적용된 필터가 없으면 전부 체크(MOCA 동일)
  const [checked, setChecked] = useState(() => new Set(current ?? all.map((o) => o.v)))

  const sorted = useMemo(() => {
    const l = [...all]
    if (order === 'count') l.sort((a, b) => b.cnt - a.cnt || a.v.localeCompare(b.v, 'ko'))
    else l.sort((a, b) => a.v.localeCompare(b.v, 'ko', { numeric: true }))
    return l
  }, [all, order])
  const shown = q.trim() ? sorted.filter((o) => o.v.toLowerCase().includes(q.trim().toLowerCase())) : sorted
  const shownAllChecked = shown.length > 0 && shown.every((o) => checked.has(o.v))

  const toggle = (v) => setChecked((prev) => {
    const next = new Set(prev)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    return next
  })
  const toggleShown = () => setChecked((prev) => {
    const next = new Set(prev)
    for (const o of shown) {
      if (shownAllChecked) next.delete(o.v)
      else next.add(o.v)
    }
    return next
  })

  if (options.over) {
    return (
      <div className="mrg-fpanel" style={style} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mrg-fover">
          고유값이 {limit.toLocaleString()}개를 넘어 이 컬럼은 필터를 쓸 수 없습니다.
          <br />툴바의 찾기를 쓰거나 조회 조건을 좁혀 주세요.
        </div>
        <div className="mrg-fbtns"><button type="button" className="mrg-fbtn" onClick={onClose}>닫기</button></div>
      </div>
    )
  }

  return (
    <div className="mrg-fpanel" style={style} onMouseDown={(e) => e.stopPropagation()}>
      <div className="mrg-fhead">
        <label className="mrg-fall">
          <input type="checkbox" className="mrg-fchk" checked={shownAllChecked} onChange={toggleShown} />
          전체선택
        </label>
        <button type="button" className="mrg-fbtn mrg-fbtn-ghost"
          title="목록 정렬 순서" onClick={() => setOrder(order === 'alpha' ? 'count' : 'alpha')}>
          {order === 'alpha' ? '건수순' : '가나다순'}
        </button>
      </div>
      <input className="mrg-finput" type="text" placeholder="값 검색" value={q}
        onChange={(e) => setQ(e.target.value)} autoFocus />
      <ul className="mrg-flist">
        {shown.length === 0 && <li className="mrg-fempty">검색 결과가 없습니다</li>}
        {shown.map((o) => (
          <li key={o.v} className={checked.has(o.v) ? 'mrg-fon' : ''}>
            <label>
              <input type="checkbox" className="mrg-fchk" checked={checked.has(o.v)} onChange={() => toggle(o.v)} />
              <span className="mrg-fv">{o.v === '' ? '(빈 값)' : o.v}</span>
              <span className="mrg-fc">{o.cnt.toLocaleString()}건</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mrg-fbtns">
        <button type="button" className="mrg-fbtn mrg-fbtn-ghost" onClick={onClear}>해제</button>
        <button type="button" className="mrg-fbtn mrg-fbtn-ghost" onClick={onClose}>취소</button>
        <button type="button" className="mrg-fbtn mrg-fbtn-main"
          onClick={() => onApply(checked, all.length)}>적용</button>
      </div>
    </div>
  )
}

/* 셀 입력칸 — 편집 중인 칸 하나에만 뜬다. 고치는 값(draft)은 여기서만 들고 있어 타이핑이
   그리드 본체를 리렌더시키지 않는다(본체 스크롤 경로가 flushSync 라 민감하다).
   가상 스크롤로 그 행이 화면 밖으로 나가면 이 컴포넌트가 사라지는데, 그때도 고친 값을 잃지 않게
   사라질 때 반영한다(StrictMode 의 가짜 해제는 DOM 이 붙어 있는 것으로 가려낸다). */
function MocaGridEditor({ type, value, options, onCommit, onCancel, onTab }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  const draftRef = useRef(draft)
  draftRef.current = draft
  const doneRef = useRef(false)
  const elRef = useRef(null)
  const finish = (fn) => { if (doneRef.current) return; doneRef.current = true; fn() }
  const commit = (v = draftRef.current) => finish(() => onCommit(v))
  const cancel = () => finish(onCancel)
  useEffect(() => {
    const el = elRef.current
    el?.focus()
    if (el?.select && type !== 'select') el.select()
    return () => { if (!el?.isConnected) commit() } // 진짜로 사라졌을 때만(스크롤 밖)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 마운트·해제 한 번씩만
  const onKey = (e) => {
    e.stopPropagation() // 화면·MDI 단축키로 새지 않게
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
    else if (e.key === 'Tab') { e.preventDefault(); finish(() => onTab(draftRef.current, e.shiftKey ? -1 : 1)) }
  }
  const common = {
    ref: elRef, className: 'mrg-editor', onKeyDown: onKey, onBlur: () => commit(),
    onClick: (e) => e.stopPropagation(), onDoubleClick: (e) => e.stopPropagation(),
  }
  if (type === 'select') {
    return (
      <select {...common} value={draft} onChange={(e) => { setDraft(e.target.value); commit(e.target.value) }}>
        {!(options ?? []).some((o) => String(o.cd) === draft) && <option value={draft}>{draft}</option>}
        {(options ?? []).map((o) => <option key={o.cd} value={o.cd}>{o.nm}</option>)}
      </select>
    )
  }
  return (
    <input {...common} type={type === 'date' ? 'date' : 'text'} inputMode={type === 'number' ? 'decimal' : undefined}
      value={draft} onChange={(e) => setDraft(e.target.value)} />
  )
}

/* columns 를 펼친다 — 묶음({ title, children }) 은 머리글에만 쓰이고, 실제 칸은 맨 아래 잎들이다.
   leaves : 실제 컬럼 목록(종전 columns 자리) · depth : 잎마다 위에 있는 묶음 수 ·
   groups : 묶음마다 { title, depth, first, last(잎 번호) } · levels : 머리글 줄 수 */
function flattenColumns(cols) {
  const leaves = [], depth = [], groups = []
  const walk = (list, d) => {
    for (const c of list ?? []) {
      if (Array.isArray(c.children) && c.children.length) {
        const g = { title: c.title, depth: d, first: leaves.length, last: -1, align: c.align }
        groups.push(g)
        walk(c.children, d + 1)
        g.last = leaves.length - 1
        if (g.last < g.first) groups.pop() // 잎이 없는 묶음은 버린다
      } else {
        leaves.push(c)
        depth.push(d)
      }
    }
  }
  walk(cols, 0)
  const levels = 1 + depth.reduce((m, d) => Math.max(m, d), 0)
  return { leaves, depth, groups, levels }
}

const MIN_COL_WIDTH = 40 // 컬럼 최소 폭(px) — 드래그로 이 밑으로 줄어들지 않는다
const HEADER_H = 32 // 헤더 높이(px) — CSS .mrg-hcell height 와 반드시 같은 값 유지
const CALC_OPS = { sum: 1, count: 1, avg: 1, min: 1, max: 1 } // 지원 집계 연산 (MOCA 동일)
const ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' } // col.align → flex

const MocaReactGrid = forwardRef(function MocaReactGrid({
  columns: columnsProp, data, rowHeight = 26, height, overscan = 3, statusBar = true, countUnit = '건', // countUnit — 바닥 건수 단위(「총 n명」 등, 2026-11-12)
  rowStatus = true, rowNum = true, delCheck = true,
  label, fullScreen = true, onRowSelected, rowHeightSelect = false, search = false,
  subtotal, total = true, subtotalLabel = '소계', totalLabel = '합 계',
  sortable = false, filterable = false, filterDistinctLimit = 1000,
  editable = false, onCellEdit, selectedIndex, excel = false,
}, ref) {
  // 다단 헤더 — 묶음을 펼쳐 실제 컬럼(잎)만 columns 로 쓴다. 이하 코드는 종전과 같이 columns 를 본다
  const colTree = useMemo(() => flattenColumns(columnsProp), [columnsProp])
  const columns = colTree.leaves
  const headerH = HEADER_H * colTree.levels // 머리글 전체 높이 — 종전 HEADER_H 자리

  // 편집 — edit 는 지금 고치는 칸 { src(원본 인덱스), key }. rev 는 행을 그 자리에서 고친 횟수:
  // data 참조가 그대로라 보기·집계 메모가 모르므로 이것을 함께 물려 다시 계산하게 한다
  const [edit, setEdit] = useState(null)
  const [rev, setRev] = useState(0)
  const origRef = useRef(new WeakMap()) // 행 → { key: 처음 값 } — 원래대로 돌아오면 'U' 를 뗀다
  const bodyRef = useRef(null)
  const headerRef = useRef(null)
  const vscrollRef = useRef(null)
  const thumbRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)

  /* 터치 기기 여부 — 손가락 스크롤(아래 "터치 스크롤" 주석) 분기용.
     MOCA 는 UA(getDevice()!='pc')로 갈랐지만 여기서는 입력 방식으로 본다: (pointer: coarse) =
     주 입력이 손가락. 화면 폭이 아니라 입력 방식이 기준이라 태블릿·큰 폰도 걸리고,
     터치가 없는 좁은 창(PC 에서 창만 줄인 경우)은 걸리지 않는다 — 그쪽은 휠·스크롤바가 있다. */
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const onChange = () => setIsTouch(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // 전체화면 — MOCA _fullScreenGrid 의 overlayer 방식: 그리드 루트를 fixed 오버레이로 확장.
  // 크기 변화에 따른 가상스크롤 재계산은 ResizeObserver 가 자동으로 처리한다.
  const [isFull, setIsFull] = useState(false)

  // 행높이 셀렉트 선택값 — null 이면 미선택(rowHeight prop 사용). 선택하면 prop 보다 우선.
  const [rowHSel, setRowHSel] = useState(null)
  const rowH = rowHSel ?? rowHeight // 이하 모든 가상화 계산은 이 값 기준

  // 삭제체크 상태 — 절대 행번호(index)의 Set. 가상 스크롤로 행 DOM 이 재생성되어도 유지된다
  const [delChecked, setDelChecked] = useState(() => new Set())

  // 선택행 — 절대 행번호. MOCA 는 DOM 속성(data-m-selectedrealrowindex)에 들고 스크롤 시
  // 다시 그려질 때마다 tr 을 찾아 색을 재적용하지만, React 는 state 로 들고 있으면
  // 가상 스크롤로 행 DOM 이 재생성되어도 className 비교만으로 선택 표시가 유지된다
  const [selectedIdx, setSelectedIdx] = useState(null)
  // 선택 행을 바깥에서 정할 수 있다(selectedIndex — 원본 인덱스, 음수 · null = 없음). 화면이 행 이동을 확인창 [취소]로 되돌릴 때
  //   그리드 선택(줄 · 바닥 「n행」)만 누른 행에 남던 것을 막는다(2026-11-12 LIME 전환). undefined 면 종전처럼 그리드가 스스로 정한다
  const selIdx = selectedIndex === undefined ? selectedIdx : (selectedIndex == null || selectedIndex < 0 ? null : selectedIndex)

  // 찾기 — findQ 는 입력값, findState 는 마지막 실행 결과 캐시 { q, matches(행번호 배열), pos }.
  // 같은 검색어로 다시 실행하면 matches 를 재계산하지 않고 pos 만 다음으로 순환한다
  const [findQ, setFindQ] = useState('')
  const [findState, setFindState] = useState(null)

  // 트리 접힘 상태 — 접힌 부모 노드의 절대 행번호 Set (MOCA row._system.expand 대응)
  const [collapsedSet, setCollapsedSet] = useState(() => new Set())

  // 정렬 — { key, dir:'asc'|'desc' } 또는 null(원래 순서). 한 번에 한 컬럼 (MOCA doSort 동일)
  const [sortState, setSortState] = useState(null)
  // 필터 — { [컬럼key]: Set<표시문자열> }. 비어 있으면 null (MOCA grd.filter 대응)
  const [filterState, setFilterState] = useState(null)
  // 열려 있는 필터 드롭다운 — { key, left } (left 는 그리드 기준 x 위치)
  const [filterOpen, setFilterOpen] = useState(null)

  // 데이터가 바뀌면(재조회) 선택 해제 — MOCA drawGrid 가 selectedrealrowindex 를 비우는 것과 동일.
  // 찾기 결과 캐시도 행번호 기반이라 함께 무효화한다. 트리 접힘도 초기화(전체 펼침).
  // 정렬·필터도 푼다 — MOCA 도 새 목록을 그리면 filterRemoveAll 로 초기화한다. 남겨두면
  // "조회했는데 몇 건 안 나온다"의 원인이 헤더의 작은 아이콘 하나에 숨는다.
  useEffect(() => {
    setSelectedIdx(null)
    setFindState(null)
    setCollapsedSet(new Set())
    setDelChecked(new Set())
    setSortState(null)
    setFilterState(null)
    setFilterOpen(null)
    setEdit(null)
    origRef.current = new WeakMap()
  }, [data])

  /* ── 보기(view) 계산 — 필터 → 정렬 순 ────────────────────────────────────────
     src 는 "표시 i 번째 행이 data 의 몇 번째인가". 손대지 않은 경우(정렬·필터 없음)에는
     null 로 두어 배열을 하나도 만들지 않는다 — 대부분의 화면이 이 경로다.
     정렬 비교는 집계(_applyCalc)의 less 와 같은 규칙: 양쪽 다 숫자면 숫자, 아니면 문자열
     (날짜 문자열이 그대로 동작한다). 빈 값은 항상 뒤로 보낸다 — 오름/내림 어느 쪽이든
     "값이 없는 행"이 위에 쌓여 첫 화면을 가리는 것이 가장 쓸모없다.
     같은 값이면 원본 순서를 유지한다(안정 정렬) — 서버가 정해 준 2차 정렬이 살아 있다. */
  const fkey = (v) => (v == null ? '' : String(v)) // 필터 비교·집계용 표시 문자열
  const treeCol = columns.find((c) => c.cellType === 'tree')
  const view = useMemo(() => {
    if (treeCol || (!sortState && !filterState)) return { rows: data, src: null, srcPos: null }
    let idx = data.map((_, i) => i)
    if (filterState) {
      for (const [k, set] of Object.entries(filterState)) idx = idx.filter((i) => set.has(fkey(data[i][k])))
    }
    if (sortState) {
      const { key, dir } = sortState
      const sgn = dir === 'desc' ? -1 : 1
      const empty = (v) => v == null || String(v).trim() === ''
      idx.sort((a, b) => {
        const va = data[a][key], vb = data[b][key]
        const ea = empty(va), eb = empty(vb)
        if (ea || eb) return ea && eb ? a - b : (ea ? 1 : -1) // 빈 값은 방향과 무관하게 뒤
        const na = Number(va), nb = Number(vb)
        const c = !isNaN(na) && !isNaN(nb) ? (na < nb ? -1 : na > nb ? 1 : 0)
          : String(va) < String(vb) ? -1 : String(va) > String(vb) ? 1 : 0
        return c ? c * sgn : a - b // 동률은 원본 순서 (안정)
      })
    }
    // 원본 인덱스 → 표시 위치. 선택행이 지금 몇 번째 줄인지 푸터에 쓴다(매 렌더 탐색 방지)
    const srcPos = new Map()
    for (let i = 0; i < idx.length; i++) srcPos.set(idx[i], i)
    return { rows: idx.map((i) => data[i]), src: idx, srcPos }
  }, [data, sortState, filterState, treeCol, rev]) // eslint-disable-line react-hooks/exhaustive-deps -- rev = 행을 그 자리에서 고친 신호

  const rows = view.rows // 이하 "표시 대상 목록" — 종전에 data 를 쓰던 자리
  const srcOf = (vi) => (view.src ? view.src[vi] : vi) // 표시 위치 → 원본 인덱스
  const filtered = filterState != null && rows.length !== data.length
  // 선택행이 지금 몇 번째 줄인가 — 필터로 화면에서 사라졌으면 null(푸터에 표시하지 않는다)
  const selPos = selIdx == null ? null
    : view.srcPos ? (view.srcPos.has(selIdx) ? view.srcPos.get(selIdx) : null)
      : selIdx

  /* ── 정렬 · 필터 조작 ────────────────────────────────────────────────────── */
  // 컬럼별로 켜는가 — 컬럼 값이 그리드 값보다 우선. 트리에서는 둘 다 끈다(PATH 정렬이 전제)
  const canSort = (col) => !treeCol && !col.special && (col.sortable ?? sortable)
  const canFilter = (col) => !treeCol && !col.special && (col.filterable ?? filterable)

  // 3단 순환: 오름차순 → 내림차순 → 원래대로 (MOCA doSort 와 같은 차례)
  const cycleSort = (key) => {
    setSortState((cur) => (cur?.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null))
    setFindState(null) // 찾기 결과는 표시 위치 목록이라 순서가 바뀌면 못 쓴다
  }
  const sortDirOf = (key) => (sortState?.key === key ? sortState.dir : null)

  /* 필터 후보값 — 열려 있는 컬럼에 대해서만, 그것도 필요할 때만 만든다.
     기준은 **전체 data** 다(다른 컬럼 필터가 걸려도 후보 목록이 줄지 않는다 — MOCA 동일).
     고유값이 상한을 넘으면 목록을 만들다 말고 멈춘다: 체크박스 수십만 개를 만들면
     브라우저가 멈춘다(MOCA 의 filterDisabled 가드와 같은 이유). */
  const filterOptions = useMemo(() => {
    if (!filterOpen) return null
    const key = filterOpen.key
    const map = new Map()
    for (const r of data) {
      const v = fkey(r[key])
      map.set(v, (map.get(v) ?? 0) + 1)
      if (map.size > filterDistinctLimit) return { over: true }
    }
    return { over: false, list: [...map].map(([v, cnt]) => ({ v, cnt })) }
  }, [filterOpen, data, filterDistinctLimit])

  // 필터 적용 — 고른 값이 전체와 같으면 "이 컬럼 필터 해제"로 본다(MOCA _filterApply 와 동일 판정).
  // 안 그러면 결과는 전체인데 헤더 아이콘만 "적용됨"으로 남아 어긋난다
  const applyFilter = (key, checked, allCount) => {
    setFilterState((cur) => {
      const next = { ...(cur ?? {}) }
      if (checked.size === 0 || checked.size === allCount) delete next[key]
      else next[key] = checked
      return Object.keys(next).length ? next : null
    })
    setFilterOpen(null)
    setFindState(null)
  }
  const clearFilter = (key) => {
    setFilterState((cur) => {
      if (!cur || !cur[key]) return cur
      const next = { ...cur }
      delete next[key]
      return Object.keys(next).length ? next : null
    })
    setFindState(null)
  }

  /* 드롭다운 위치 — 그리드 루트 기준 좌표로 잡고 루트 안에 그린다(document.body 에 붙이면
     전체화면 오버레이·MDI 분할에서 따라다니게 만들 것이 는다). 오른쪽으로 넘치면 당겨 넣는다. */
  const rootRef = useRef(null)
  const openFilter = (e, key) => {
    if (filterOpen?.key === key) { setFilterOpen(null); return }   // 같은 버튼 다시 = 닫기
    const cell = e.currentTarget.closest('.mrg-hcell')
    if (!cell) return
    const cr = cell.getBoundingClientRect()
    const W = 240, MIN_H = 180
    const below = window.innerHeight - cr.bottom - 8
    const above = cr.top - 8
    // 아래가 좁으면 위로 편다 — 그리드가 화면 아래쪽에 있을 때 목록이 두 줄만 보이는 일이 없게
    const up = below < MIN_H && above > below
    setFilterOpen({
      key,
      left: Math.max(4, Math.min(cr.left, window.innerWidth - W - 4)),
      ...(up ? { bottom: window.innerHeight - cr.top, maxH: above } : { top: cr.bottom, maxH: below }),
    })
  }

  /* 바깥클릭·Esc·스크롤이면 닫는다. 스크롤을 캡처 단계로 듣는 이유: 가로 스크롤은 .mrg-body,
     세로는 전용 스크롤바(.mrg-vscroll)라 둘 다 버블링되지 않는다(scroll 이벤트는 안 올라온다). */
  useEffect(() => {
    if (!filterOpen) return
    const close = () => setFilterOpen(null)
    const onKey = (ev) => { if (ev.key === 'Escape') close() }
    // 패널·필터버튼 위가 아니면 닫는다. target 으로 보는 이유: 패널이 포털이라
    // 이벤트 경로가 그리드를 지나지 않아 stopPropagation 으로는 가려낼 수 없다
    const onDown = (ev) => {
      const t = ev.target
      if (t?.closest?.('.mrg-fpanel') || t?.closest?.('.mrg-filter')) return
      close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // 패널 안 목록을 굴린 것은 제외 — 그리드가 움직인 경우에만 닫는다
    const onScroll = (ev) => { if (!ev.target?.closest?.('.mrg-fpanel')) close() }
    const root = rootRef.current
    root?.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('resize', close)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      root?.removeEventListener('scroll', onScroll, true)
    }
  }, [filterOpen])

  // ── 트리 계산 (cellType: 'tree' 컬럼이 있을 때만) ──
  // levels  : 행별 깊이 (1부터)
  // parents : 행별 부모 여부 — 다음 행이 더 깊으면 부모, 아니면 리프 (path 정렬 전제, MOCA 동일)
  // vis     : 지금 보이는 행의 절대 행번호 목록 — 접힌 부모의 자손은 빠진다. 가상화는 이 목록 기준
  const treeInfo = useMemo(() => {
    if (!treeCol) return null
    const levels = data.map((r) => Math.max(1, parseInt(r[treeCol.levelKey], 10) || 1))
    const parents = levels.map((lv, i) => i + 1 < levels.length && levels[i + 1] > lv)
    const vis = []
    let hideUnder = null // 이 깊이보다 깊은 행은 숨김(접힌 부모의 자손 구간)
    for (let i = 0; i < data.length; i++) {
      if (hideUnder != null && levels[i] > hideUnder) continue
      hideUnder = parents[i] && collapsedSet.has(i) ? levels[i] : null
      vis.push(i)
    }
    return { levels, parents, vis }
  }, [data, collapsedSet, treeCol])

  // 접기/펼치기 — 누른 노드 하나만 Set 에 넣고 뺀다. 자손의 접힘 상태는 건드리지 않으므로
  // 부모를 닫았다 다시 펼치면 자손들이 이전에 펼쳐져 있던 모습 그대로 복원된다
  // (MOCA _grid_expand_loop 는 접을 때 하위 부모를 강제로 접어 상태가 사라진다 —
  //  숨은 노드의 상태는 vis 계산에서 어차피 무시되므로 보존하는 쪽이 공짜다. 의도된 개선).
  // 찾기 캐시는 표시 행 기준이라 무효화
  const toggleTree = (absIdx) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev)
      if (next.has(absIdx)) next.delete(absIdx)
      else next.add(absIdx)
      return next
    })
    setFindState(null)
  }

  // ── 소계/합계 계산 (MOCA _applyCalc 이식 — calc 컬럼이 있을 때만) ──
  // items    : 표시 행 목록 — { absIdx }(데이터 행) 또는 { agg: 'subtotal', row }(파생 집계행).
  //            합계행은 items 에 넣지 않고 totalRow 로 분리 — 스크롤과 무관하게 고정(pin) 렌더.
  // 누적기는 컬럼마다 {sum, ncnt, cnt, min, max} 를 항상 같이 쌓고 연산에 맞는 값만 꺼낸다.
  // 합계는 자기 누적기로 전 데이터를 다시 쌓아 avg 가 "소계 평균들의 평균"이 되지 않는다.
  const hasCalc = columns.some((c) => CALC_OPS[c.calc])
  const aggInfo = useMemo(() => {
    if (treeCol || !hasCalc || rows.length === 0) return null // 트리와 집계는 동시 사용 불가(MOCA 동일)
    const calcCols = columns.filter((c) => CALC_OPS[c.calc])
    const newSums = () => {
      const s = {}
      for (const c of calcCols) s[c.key] = { sum: 0, ncnt: 0, cnt: 0, min: null, max: null }
      return s
    }
    const less = (a, b) => {
      const na = Number(a), nb = Number(b)
      if (!isNaN(na) && !isNaN(nb)) return na < nb
      return String(a) < String(b) // 숫자가 아니면 문자열 비교 — 날짜 문자열 그대로 동작
    }
    const add = (s, row) => {
      for (const c of calcCols) {
        const raw = row[c.key]
        if (raw == null || String(raw).trim() === '') continue // 빈 값은 어떤 연산에도 안 센다
        const a = s[c.key]
        a.cnt++
        const v = Number(raw)
        if (!isNaN(v)) { a.sum += v; a.ncnt++ }
        if (a.min == null || less(raw, a.min)) a.min = raw
        if (a.max == null || less(a.max, raw)) a.max = raw
      }
    }
    const calcValue = (a, op) => {
      if (op === 'sum') return a.sum
      if (op === 'count') return a.cnt
      if (op === 'avg') return a.ncnt ? Math.round((a.sum / a.ncnt) * 100) / 100 : '' // 소수 2자리
      if (op === 'min') return a.min ?? ''
      return a.max ?? '' // max
    }
    // 라벨을 얹을 컬럼 — 소계/합계 모두 그룹 컬럼, 소계 미사용 시 첫 데이터 컬럼
    const groupKey = subtotal && columns.some((c) => c.key === subtotal) ? subtotal : null
    if (subtotal && !groupKey) console.warn(`MocaReactGrid: subtotal="${subtotal}" 에 해당하는 컬럼이 없습니다 — 소계를 건너뜁니다.`)
    const labelKey = groupKey ?? columns[0].key
    const mkRow = (kind, lbl, sums) => {
      const row = {}
      for (const c of calcCols) row[c.key] = calcValue(sums[c.key], c.calc)
      row[labelKey] = lbl
      return { agg: kind, row }
    }

    const totalSums = newSums()
    for (const r of rows) add(totalSums, r)

    // 소계 — 그룹값의 인접 런 단위. 런 수 > 고유값 수면 그룹이 흩어진 상태(다른 정렬) →
    // 틀린 소계를 보여주느니 생략한다(MOCA 동일)
    let items = null
    if (groupKey) {
      const runs = []
      const distinct = new Set()
      let cur = null
      for (let i = 0; i < rows.length; i++) {
        const gv = rows[i][groupKey]
        distinct.add(String(gv))
        if (!cur || cur.val !== gv) {
          cur = { val: gv, idxs: [], sums: newSums() }
          runs.push(cur)
        }
        cur.idxs.push(i)
        add(cur.sums, rows[i])
      }
      if (runs.length <= distinct.size) {
        items = []
        for (const run of runs) {
          for (const i of run.idxs) items.push({ absIdx: i })
          items.push(mkRow('subtotal', `${run.val ?? ''} ${subtotalLabel}`.trim(), run.sums))
        }
      }
    }
    if (!items) items = rows.map((_, i) => ({ absIdx: i }))

    const totalRow = total === false ? null : mkRow('total', totalLabel, totalSums)
    return { items, totalRow, totalPos: total === 'top' ? 'top' : 'bottom', labelKey }
  }, [rows, columns, treeCol, hasCalc, subtotal, total, subtotalLabel, totalLabel, rev]) // eslint-disable-line react-hooks/exhaustive-deps -- rev = 고친 값으로 집계 다시

  /* 선택은 **원본 인덱스**로 들고, 콜백에도 원본 인덱스를 준다 — 화면이 `data[idx]` 로 쓰는
     종전 계약이 정렬·필터 뒤에도 그대로 맞는다. 표시 위치(몇 번째 줄인가)는 view 가 안다. */
  const selectRow = (vi) => {
    const src = srcOf(vi)
    setSelectedIdx(src)
    if (onRowSelected) onRowSelected(rows[vi], src)
  }

  // 특수컬럼 정의 — MOCA _injectAutoCols 와 동일한 순서/폭: [상태 22px][행번호 28px][삭제선택 26px]
  const specialCols = []
  if (rowStatus) specialCols.push({ key: '_status', special: 'status', width: 22 })
  if (rowNum) specialCols.push({ key: '_rownum', special: 'rownum', width: 28 })
  if (delCheck) specialCols.push({ key: '_delchk', special: 'delcheck', width: 26 })
  const allCols = [...specialCols, ...columns]

  // 뷰포트 높이는 상수가 아니라 "실측" — 브라우저 리사이징·모바일 회전·부모 크기 변화를
  // ResizeObserver 가 알려줄 때마다 갱신되어, 그릴 행 수(endIdx)가 자동으로 재계산된다.
  const [viewportH, setViewportH] = useState(0)

  // 컬럼 폭(px 배열, allCols 순서). null 이면 아직 미실측 — 첫 렌더는 props 기준으로 그리고,
  // 직후 useLayoutEffect 가 실측해서 전부 px 로 고정한다. 이후 리사이징은 이 배열만 바꾼다.
  const [colWidths, setColWidths] = useState(null)

  // 폭을 스스로 정하지 못하는 컬럼 = width prop 이 없는 컬럼(첫 렌더에서 flex:1 로 나뉜다).
  // 이 컬럼들만 나중에 남는 폭을 흡수한다 — 지정폭 컬럼과 사용자가 드래그한 컬럼은 건드리지 않는다.
  const resizedRef = useRef(new Set()) // 사용자가 직접 드래그한 컬럼 인덱스
  const flexIdx = allCols.reduce((acc, col, i) => (col.width ? acc : [...acc, i]), [])
  const flexKey = flexIdx.join(',')

  // 그리드 폭이 바뀌면 유동 컬럼에 남는 폭을 다시 나눈다.
  // 없으면 마운트 시점 폭이 그대로 굳어, 그때보다 넓어진 경우(팝업이 열리며 커짐 ·
  // 레이아웃 setRatio · MDI 분할 · 창 크기)에 오른쪽에 빈 띠가 남고 내용이 잘려 보인다.
  const refitWidths = useCallback((availW) => {
    if (availW <= 0) return
    setColWidths((ws) => {
      if (!ws) return ws
      const flex = flexIdx.filter((i) => !resizedRef.current.has(i))
      if (flex.length === 0) return ws
      // 0 이 섞인 배열은 "아직 못 잰 것"이지 고정폭이 아니다 — 그 위에서 재배분하면 유동
      // 컬럼이 폭 전체를 먹는다. 다시 잴 때까지 손대지 않는다(measureCols 가 맡는다)
      if (ws.some((w) => w <= 0)) return ws
      const fixed = ws.reduce((a, w, i) => (flex.includes(i) ? a : a + w), 0)
      const room = availW - fixed
      // 넓힐 때만 재배분한다 — 좁아졌다고 컬럼을 줄이면, 컬럼이 많아 합계가 그리드보다 넓은
      // 화면(가로 스크롤이 정상인 화면)의 컬럼이 최소폭으로 붕괴한다. 좁아지면 가로 스크롤.
      if (room <= flex.reduce((a, i) => a + ws[i], 0)) return ws
      const each = Math.max(MIN_COL_WIDTH, Math.floor(room / flex.length))
      // 나머지 픽셀은 마지막 유동 컬럼이 흡수 — 합계가 availW 와 어긋나 1px 띠가 남지 않게
      const rest = availW - fixed - each * flex.length
      const next = ws.map((w, i) => (flex.includes(i) ? each : w))
      if (rest > 0) next[flex[flex.length - 1]] += rest
      return next.every((w, i) => w === ws[i]) ? ws : next
    })
  }, [flexKey]) // eslint-disable-line react-hooks/exhaustive-deps -- flexIdx 는 매 렌더 새 배열이라 문자열 키로 비교

  /* 컬럼 폭 실측 — 헤더 셀의 실제 폭을 그대로 px 로 굳힌다.
     **크기가 0 이면 굳히지 않는다.** MDI 는 탭 홀더를 부모의 레이아웃 이펙트에서 패널에
     붙이고 비활성 탭은 display:none 으로 두는데, 자식(그리드)의 레이아웃 이펙트는 그보다
     먼저 돈다 — 그 순간 재면 전부 0 이다. 0 을 "고정폭"으로 굳히면 이후 재배분이 유동 컬럼
     하나에 폭 전체를 몰아준다(로그아웃→재로그인 시 그리드가 깨지던 원인, 2026-08-19).
     못 잰 경우는 아래 두 경로(RO·매 렌더)가 다시 시도한다. */
  const measureCols = useCallback(() => {
    const head = headerRef.current
    if (!head) return
    const measured = Array.from(head.querySelectorAll('.mrg-hcell'), (c) =>
      Math.round(c.getBoundingClientRect().width))
    if (!measured.length || !measured.some((w) => w > 0)) return // 아직 화면에 없다 — 다음 기회에
    setColWidths(measured)
  }, [])

  // RO 콜백 안에서 "이미 쟀는가"를 보려면 최신 값이 필요하다(클로저는 첫 렌더 값에 묶인다)
  const colWidthsRef = useRef(null)
  colWidthsRef.current = colWidths

  useLayoutEffect(() => {
    // 최초 1회는 동기 실측 — ResizeObserver 의 첫 통지는 페인트 이후(백그라운드 탭은 더 늦게)라
    // 이게 없으면 첫 화면이 overscan 몇 줄만 그려진 채 잠깐 보인다
    setViewportH(bodyRef.current.clientHeight)
    measureCols()
    // 높이는 그릴 행 수, 폭은 유동 컬럼 재배분 — 둘 다 자기 크기 변화로 따라간다.
    // 아직 못 쟀으면(마운트 시점 크기 0) 재배분이 아니라 실측부터 다시 한다
    const ro = new ResizeObserver(([entry]) => {
      setViewportH(entry.contentRect.height)
      if (colWidthsRef.current) refitWidths(Math.round(entry.contentRect.width))
      else measureCols()
    })
    ro.observe(bodyRef.current)
    return () => ro.disconnect()
  }, [refitWidths, measureCols])

  // 폭 보정 두 번째 경로 — 매 렌더 후 실측해서 어긋나면 맞춘다.
  // ResizeObserver 통지는 백그라운드 탭에서 오지 않고(레이아웃 갱신이 멈춘다) 팝업처럼
  // 마운트 직후 부모가 커지는 경우도 있어, 렌더가 한 번이라도 돌면 여기서 잡힌다.
  // 이미 맞으면 setColWidths 가 같은 배열을 반환해 리렌더가 없다(수렴 보장).
  useLayoutEffect(() => {
    if (colWidths) refitWidths(bodyRef.current.clientWidth)
    else measureCols() // 마운트 때 크기가 0 이라 못 잰 경우 — 보이게 된 뒤 여기서 잡힌다
  })

  // 휠 → 전용 스크롤바로 전달. 콘텐츠는 세로 네이티브 스크롤이 없으므로 휠을 직접 받아
  // 스크롤바의 scrollTop 을 움직인다 (MOCA 도 콘텐츠 영역 wheel 을 스크롤바에 위임한다).
  // preventDefault 로 바깥(페이지) 스크롤 전파를 막아야 해서 passive:false 네이티브 리스너 사용
  // — React 의 onWheel 은 passive 라 preventDefault 가 무시된다.
  useLayoutEffect(() => {
    const el = bodyRef.current
    const onWheel = (e) => {
      const vs = vscrollRef.current
      if (!vs) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        el.scrollLeft += e.deltaX // 가로 휠(shift+휠/트랙패드)은 본문 가로 스크롤로
      } else {
        vs.scrollTop += e.deltaMode === 1 ? e.deltaY * rowH : e.deltaY
      }
      e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [rowH])

  /* ── 터치 스크롤 (MOCA grid.js 의 모바일 스와이프 오버레이 이식) ────────────────────
     PC 는 오른쪽 12px 스크롤바를 잡거나 휠을 굴리면 되지만, 손가락에는 둘 다 없다.
     MOCA 는 세로 스크롤 담당 요소(.moca_scrollY_type1 = 여기의 .mrg-vscroll)를 모바일에서만
     `width:100%; left:0` 으로 넓혀 **행 영역 전체를 덮는 투명 오버레이**로 만든다.
     그 안의 스페이서 높이가 이미 "행높이 × 전체행수" 라, 손가락으로 오버레이를 밀면
     브라우저 네이티브 세로 스크롤이 그대로 동작한다(관성까지 공짜). scroll 이벤트는
     기존 handleVScroll 로 들어와 어느 행부터 그릴지만 다시 계산한다 — 가상 스크롤 구조를
     하나도 바꾸지 않고 입력 수단만 늘리는 셈이다.
     대신 오버레이가 행을 덮으므로 두 가지를 손으로 되살려야 한다(MOCA 와 동일):
       ① 가로 스크롤 — 오버레이는 .mrg-body 의 형제라 제스처가 전달되지 않는다(체이닝 없음).
          touch-action:pan-y 로 세로만 네이티브에 맡기고, 가로는 아래에서 직접 위임한다.
       ② 클릭 — 오버레이가 먼저 받으므로 실제 대상에 합성 클릭을 재발행한다. */

  // 가짜 세로 썸 (MOCA _updateSwipeThumb) — 오버레이를 넓히면 네이티브 스크롤바가 iOS 에서는
  // 아예 안 그려지고 안드로이드는 상시 표시라 어색하다. 위치 표시를 직접 그려 통일한다.
  const updateThumb = useCallback(() => {
    const vs = vscrollRef.current
    const thumb = thumbRef.current
    if (!vs || !thumb) return
    const sh = vs.scrollHeight
    const ch = vs.clientHeight
    // 스크롤 여지가 없으면 숨기고 포인터도 통과시킨다 — 안 보이는 막대가 행 클릭을 먹으면 안 된다
    if (sh <= ch + 1) { thumb.style.opacity = '0'; thumb.style.pointerEvents = 'none'; return }
    thumb.style.pointerEvents = ''
    const thumbH = Math.max(24, (ch * ch) / sh)
    const maxTop = ch - thumbH
    const top = (vs.scrollTop / (sh - ch)) * maxTop
    thumb.style.height = `${Math.round(thumbH)}px`
    thumb.style.transform = `translateY(${Math.round(Math.min(maxTop, Math.max(0, top)))}px)`
    thumb.style.opacity = '1'
  }, [])

  // 스크롤바 이벤트 → 동기 리렌더. flushSync 로 페인트 전에 행 교체를 끝낸다
  // (React 스케줄러가 리렌더를 다음 매크로태스크로 미루면 한 프레임 늦게 그려진다)
  const handleVScroll = (e) => {
    const top = e.currentTarget.scrollTop
    flushSync(() => setScrollTop(top))
    updateThumb()
  }

  /* 썸 드래그 (MOCA _swipeThumbDragStart) — 잡아끌면 비율대로 오버레이 scrollTop 을 민다.
     손가락 플릭만으로는 10만 행의 뒷부분에 갈 수 없어서(한 번에 화면 몇 개 분량) 데스크톱
     스크롤바처럼 "잡아서 단번에" 가는 수단이 필요하다.
     scrollTop 을 넣으면 scroll 이벤트 → handleVScroll 로 기존 경로가 그대로 돈다 —
     여기서 행을 직접 그리지 않는다. */
  const startThumbDrag = (e) => {
    const vs = vscrollRef.current
    const thumb = thumbRef.current
    if (!vs || !thumb) return
    const sh = vs.scrollHeight
    const ch = vs.clientHeight
    if (sh <= ch + 1) return // 스크롤 여지 없음
    e.preventDefault()
    e.stopPropagation() // 아래 오버레이의 가로 위임(onTouchStart)까지 내려가지 않게
    const pid = e.pointerId
    const startY = e.clientY
    const startTop = vs.scrollTop
    // 썸이 트랙에서 움직일 수 있는 거리 대비 실제 스크롤 거리의 비율
    const ratio = (sh - ch) / Math.max(1, ch - thumb.getBoundingClientRect().height)
    thumb.classList.add('mrg-vthumb-drag')
    try { thumb.setPointerCapture(pid) } catch { /* 포인터 소멸 — window 리스너로 이어진다 */ }
    const onMove = (ev) => {
      if (ev.pointerId !== pid) return
      vs.scrollTop = startTop + (ev.clientY - startY) * ratio
    }
    const onUp = (ev) => {
      if (ev && ev.pointerId !== pid) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      thumb.classList.remove('mrg-vthumb-drag')
      try { thumb.releasePointerCapture(pid) } catch { /* 이미 해제됨 */ }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // ① 가로 제스처 위임 — 최초 우세축을 한 번만 판정해 고정하고(대각선 흔들림 방지),
  //    가로면 손가락 이동량만큼 본문 scrollLeft 를 직접 민다(관성 없음 — MOCA 와 동일)
  const swipeX = useRef(null)
  const onOverlayTouchStart = (e) => {
    const t = e.touches[0]
    if (!t) return
    swipeX.current = { x: t.clientX, y: t.clientY, left: bodyRef.current?.scrollLeft ?? 0, axis: '' }
  }
  const onOverlayTouchMove = (e) => {
    const s = swipeX.current
    const t = e.touches[0]
    if (!s || !t || !bodyRef.current) return
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (s.axis === '') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return // 판정 전 미세 이동은 무시
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (s.axis === 'x') bodyRef.current.scrollLeft = s.left - dx
  }

  // ② 클릭 위임 — 오버레이를 잠깐 숨기고 그 지점의 진짜 요소를 찾아 합성 클릭을 보낸다.
  //    행 선택·삭제체크·트리 +/− 가 전부 이 경로로 살아난다(React 루트까지 버블링되어
  //    onClick 이 그대로 불린다). 원본 클릭은 여기서 끊는다 — 그대로 두면 같은 탭에서
  //    합성 클릭과 둘 다 올라가 바깥클릭 판정(달력·필터 팝업)이 두 번 돈다.
  const onOverlayClick = (e) => {
    const vs = vscrollRef.current
    if (!vs) return
    vs.style.display = 'none'
    const target = document.elementFromPoint(e.clientX, e.clientY)
    vs.style.display = ''
    if (!target || vs.contains(target)) return
    e.stopPropagation()
    // 합성 클릭은 포커스를 옮기지 않는다 — 편집 중에 다른 곳을 누르면 입력칸을 직접 놓아 반영시킨다
    const ae = document.activeElement
    if (ae?.classList?.contains('mrg-editor') && !target.closest?.('.mrg-editing')) ae.blur()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    // 두 번 톡 = 더블클릭(셀 편집 시작) — 오버레이가 먼저 받으므로 이것도 손으로 넘긴다
    const now = Date.now(), last = lastTapRef.current
    if (last && last.target === target && now - last.t < 350) {
      target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }))
      lastTapRef.current = null
    } else lastTapRef.current = { target, t: now }
  }
  const lastTapRef = useRef(null)

  // 헤더 경계 드래그 — mousedown 시점의 폭을 기준으로, 문서 전체에 move/up 리스너를 걸어
  // 그리드 밖으로 마우스가 나가도 드래그가 이어진다
  /* 컬럼 폭 드래그 — Pointer Events 라 마우스·펜·손가락이 같은 코드로 돈다.
     mousedown/mousemove 로 짜면 **터치에서 동작하지 않는다**: 브라우저가 손가락 제스처를
     먼저 스크롤로 가져가고, 합성 마우스 이벤트는 제스처가 끝난 뒤에야(그것도 탭일 때만) 온다.
     핸들에 `touch-action: none`(CSS)을 함께 줘야 브라우저가 가로채지 않는다 — 둘 중 하나라도
     빠지면 조용히 안 먹는다(2026-08-19 제보). setPointerCapture 로 손가락이 핸들을 벗어나도
     이어진다. */
  const startResize = (e, idx) => {
    if (!colWidths) return
    e.preventDefault()
    const handle = e.currentTarget
    const pid = e.pointerId
    const startX = e.clientX
    const startW = colWidths[idx]
    // 사용자가 직접 정한 폭은 이후 폭 재배분에서 제외한다(손으로 맞춘 값을 뺏지 않는다)
    resizedRef.current.add(idx)
    document.body.classList.add('mrg-resizing')
    try { handle.setPointerCapture(pid) } catch { /* 포인터 소멸 — 캡처 없이도 window 리스너로 이어진다 */ }
    const onMove = (ev) => {
      if (ev.pointerId !== pid) return
      const w = Math.max(MIN_COL_WIDTH, Math.round(startW + ev.clientX - startX))
      flushSync(() => setColWidths((ws) => ws.map((x, j) => (j === idx ? w : x))))
    }
    const onUp = (ev) => {
      if (ev && ev.pointerId !== pid) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.classList.remove('mrg-resizing')
      try { handle.releasePointerCapture(pid) } catch { /* 이미 해제됨 */ }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  /* 삭제체크도 원본 인덱스 Set — 몇 건 골라 둔 뒤 정렬하거나 필터를 바꿔도 체크가 따라간다.
     전체선택은 "지금 보이는 목록 전부" 다(필터로 걸러낸 행까지 몰래 체크하지 않는다). */
  const toggleDel = (src) => {
    setDelChecked((prev) => {
      const next = new Set(prev)
      if (next.has(src)) next.delete(src)
      else next.add(src)
      return next
    })
  }
  // 매 렌더(스크롤 포함) 전수 검사를 하지 않도록 체크셋·보기가 바뀔 때만 다시 센다
  const allDelChecked = useMemo(
    () => rows.length > 0 && rows.every((_, i) => delChecked.has(srcOf(i))),
    [rows, delChecked, view], // eslint-disable-line react-hooks/exhaustive-deps -- srcOf 는 view 에서 파생
  )
  const toggleDelAll = () => {
    setDelChecked((prev) => {
      if (allDelChecked) { // 보이는 것만 해제 — 필터 밖에서 골라 둔 체크는 남긴다
        const next = new Set(prev)
        for (let i = 0; i < rows.length; i++) next.delete(srcOf(i))
        return next
      }
      const next = new Set(prev)
      for (let i = 0; i < rows.length; i++) next.add(srcOf(i))
      return next
    })
  }

  // ── 가상화 계산 ──
  // 표시 행 모델 — 트리면 vis 목록, 집계면 items(데이터+소계), 아니면 data 그대로.
  // rowAt(vi) → { row, absIdx, agg } — 집계행은 absIdx 가 null(선택/행번호/삭제체크 없음)
  const aggItems = aggInfo?.items ?? null
  const rowCount = treeInfo ? treeInfo.vis.length : aggItems ? aggItems.length : rows.length
  const rowAt = (vi) => {
    if (treeInfo) {
      const a = treeInfo.vis[vi]
      return { row: rows[a], absIdx: a, agg: null }
    }
    if (aggItems) {
      const it = aggItems[vi]
      return it.agg ? { row: it.row, absIdx: null, agg: it.agg } : { row: rows[it.absIdx], absIdx: it.absIdx, agg: null }
    }
    return { row: rows[vi], absIdx: vi, agg: null }
  }
  const totalHeight = rowCount * rowH
  // 고정 합계행(pin)이 있으면 그 높이만큼 행 표시 영역이 줄어든다
  const pinH = aggInfo?.totalRow ? rowH : 0
  const rowAreaH = Math.max(0, viewportH - headerH - pinH) // 헤더·고정행을 제외한 행 표시 영역

  /* 스크롤 오버레이(와 터치용 가짜 썸)의 세로 위치 — 고정 합계행이 있으면 그만큼 비켜서
     오버레이 높이 = 행 표시 영역(rowAreaH)을 유지한다. 안 맞으면 최대 scrollTop 이 부족해
     마지막 행까지 못 간다. 둘이 같은 자리를 써야 썸이 트랙과 어긋나지 않으므로 한 곳에서 만든다 */
  // 머리글이 여러 줄이면(다단 헤더) 그만큼 내려 시작한다 — CSS 의 top:32px 은 한 줄 기준
  //   높이는 rowAreaH 로 박는다 — bottom 으로 비키면 가로 스크롤바(행 영역 아래 16px)를 빼지 못해 오버레이가 행 영역보다 길었고,
  //   행 높이 합 = 오버레이 높이가 되면 스크롤할 것이 없어 마지막 행이 고정 합계행 뒤에 가린 채 닿지 못했다(합계행이 없어도 16px 모자랐다).
  //   LIME 전환(kt estate) 숙소배정 계약리스트 5건에서 찾음 — 2026-11-12
  const vscrollPos = { top: headerH + (pinH && aggInfo.totalPos === 'top' ? pinH : 0), bottom: 'auto', height: rowAreaH }

  // 행 수·표시 영역이 바뀌면 썸 비율도 다시 잡는다 (MOCA 는 _genTbody 렌더 직후에 호출한다)
  useLayoutEffect(() => {
    if (isTouch) updateThumb()
  }, [isTouch, totalHeight, rowAreaH, updateThumb])
  const startIdx = Math.max(0, Math.floor(scrollTop / rowH) - overscan)
  const endIdx = Math.min(rowCount, Math.ceil((scrollTop + rowAreaH) / rowH) + overscan)
  const viewRows = [] // 렌더 구간의 표시 행 모델 목록
  for (let vi = startIdx; vi < endIdx; vi++) viewRows.push(rowAt(vi))
  // 첫 렌더 행이 화면 위로 삐져나가는 양(부분 행 오프셋) — 행 단위로 뚝뚝 끊기지 않게 한다
  const offsetY = startIdx * rowH - scrollTop

  // 찾기 실행(다음 버튼/Enter) — 새 검색어면 전체 스캔으로 매치 행번호를 모으고(10만 행 수 ms),
  // 같은 검색어면 캐시된 목록에서 pos 만 전진(끝나면 처음으로 순환). 찾은 행은 선택 + 가운데 스크롤
  const doFind = () => {
    const q = findQ.trim().toLowerCase()
    if (!q) return
    let st = findState
    if (!st || st.q !== q) {
      const matches = [] // 표시 행 위치(vi) 목록 — 트리 접힘으로 숨은 행·집계행은 대상에서 제외
      for (let vi = 0; vi < rowCount; vi++) {
        const { row, absIdx } = rowAt(vi)
        if (absIdx == null) continue // 집계행
        for (const col of columns) {
          const v = row[col.key]
          if (v != null && String(v).toLowerCase().includes(q)) {
            matches.push(vi)
            break
          }
        }
      }
      st = { q, matches, pos: -1 }
    }
    if (st.matches.length === 0) {
      setFindState(st) // "0건" 표시용
      return
    }
    const pos = (st.pos + 1) % st.matches.length
    setFindState({ ...st, pos })
    const vi = st.matches[pos]
    selectRow(rowAt(vi).absIdx)
    const vs = vscrollRef.current
    if (vs) vs.scrollTop = Math.max(0, vi * rowH - (rowAreaH - rowH) / 2)
  }

  /* ── 셀 편집 ──────────────────────────────────────────────────────────────── */
  const editTypeOf = (col) => col.editType || 'text'
  const canEdit = (col, row) => {
    if (col.special || col.cellType === 'tree') return false
    const e = col.editable ?? editable
    return typeof e === 'function' ? !!e(row) : !!e
  }
  // 입력 글자 → 저장할 값. 숫자 칸은 콤마를 떼고 숫자로(못 읽으면 원래 값 유지), 비우면 ''
  const parseEdit = (col, raw, old) => {
    if (editTypeOf(col) !== 'number') return raw
    const s = String(raw ?? '').replace(/,/g, '').trim()
    if (s === '') return ''
    const n = Number(s)
    return isNaN(n) ? old : n
  }
  // 값 반영 — 행 객체를 그 자리에서 고치고 행상태를 맞춘다(MOCA 와 같다)
  const applyValue = (src, key, v) => {
    const row = data[src]
    if (!row) return
    const old = row[key]
    if (String(old ?? '') === String(v ?? '')) return
    const o = origRef.current.get(row) ?? { __st: row._status ?? '' }
    if (!(key in o)) o[key] = old
    origRef.current.set(row, o)
    row[key] = v
    if (row._status !== 'C' && row._status !== 'D') {
      const back = Object.keys(o).every((k) => k === '__st' || String(o[k] ?? '') === String(row[k] ?? ''))
      if (back && !o.__st) delete row._status
      else row._status = back ? o.__st : 'U'
    }
    setRev((r) => r + 1)
    if (onCellEdit) onCellEdit(row, src, key, v, old)
  }
  const colByKey = (key) => columns.find((c) => c.key === key)
  const commitEdit = (src, key, raw) => {
    const col = colByKey(key)
    setEdit(null)
    if (col) applyValue(src, key, parseEdit(col, raw, data[src]?.[key]))
  }
  // Tab — 반영하고 같은 행의 다음(앞) 편집 칸으로. 없으면 편집을 끝낸다
  const tabEdit = (src, key, raw, dir) => {
    const col = colByKey(key)
    if (col) applyValue(src, key, parseEdit(col, raw, data[src]?.[key]))
    const row = data[src]
    const i = columns.findIndex((c) => c.key === key)
    for (let j = i + dir; j >= 0 && j < columns.length; j += dir) {
      const c = columns[j]
      if (canEdit(c, row) && editTypeOf(c) !== 'checkbox') { setEdit({ src, key: c.key }); return }
    }
    setEdit(null)
  }
  const startEdit = (vi, col) => {
    const src = srcOf(vi)
    const row = data[src]
    if (!row || !canEdit(col, row) || editTypeOf(col) === 'checkbox') return
    setEdit({ src, key: col.key })
  }
  const checkOn = (col, v) => String(v ?? '') === String(col.trueValue ?? 'Y')
  // 화면에 보일 값 — select 는 코드 대신 이름, 나머지는 format
  const displayOf = (col, row) => {
    const v = row[col.key]
    if (col.format) return col.format(v, row)
    if (editTypeOf(col) === 'select' && col.options) {
      const o = col.options.find((x) => String(x.cd) === String(v ?? ''))
      return o ? o.nm : v
    }
    return v
  }

  /* ── 엑셀 내보내기 — 지금 보이는 대로(필터·정렬·다단 헤더·병합·소계/합계) ──────────── */
  const exportExcel = (name) => {
    const cols = columns.map((c, i) => ({ c, i })).filter((x) => x.c.excel !== false)
    if (!cols.length) return
    const at = new Map(cols.map((x, j) => [x.i, j])) // 잎 번호 → 엑셀 열
    const L = colTree.levels
    const out = []
    const merges = []
    // 머리글 — 빈 칸에도 머리글 모양(테두리·배경)을 깔아 병합 안쪽이 비어 보이지 않게
    for (let r = 0; r < L; r++) out.push(cols.map(() => ({ v: '', s: 1 })))
    cols.forEach((x, j) => {
      const d = colTree.depth[x.i]
      out[d][j] = { v: x.c.title ?? x.c.key, s: 1 }
      if (d < L - 1) merges.push({ r1: d, c1: j, r2: L - 1, c2: j })
    })
    for (const g of colTree.groups) {
      const js = []
      for (let i = g.first; i <= g.last; i++) if (at.has(i)) js.push(at.get(i))
      if (!js.length) continue
      out[g.depth][js[0]] = { v: g.title ?? '', s: 1 }
      if (js.length > 1) merges.push({ r1: g.depth, c1: js[0], r2: g.depth, c2: js[js.length - 1] })
    }
    const cellOf = (col, row, agg) => {
      let raw = row[col.key]
      if (col.cellType === 'tree' && !agg) {
        const lbl = row[col.labelKey ?? col.key]
        const lv = Math.max(1, parseInt(row[col.levelKey], 10) || 1)
        return { v: `${'    '.repeat(lv - 1)}${lbl ?? ''}`, t: 's', s: 0 }
      }
      if (agg && col.key !== aggInfo?.labelKey && !CALC_OPS[col.calc]) raw = ''
      if (!agg && col.excelValue) raw = col.excelValue(row) // 엑셀에만 다른 값을 낼 때(render 로 그린 글 등)
      const num = typeof raw === 'number' ? raw
        : raw != null && String(raw).trim() !== '' && (col.calc || editTypeOf(col) === 'number') && !isNaN(Number(raw)) ? Number(raw) : null
      if (num != null && isFinite(num)) {
        const int = Number.isInteger(num)
        return { v: num, t: 'n', s: agg ? (int ? 4 : 6) : (int ? 2 : 5) }
      }
      let shown = agg || col.excelValue ? raw : displayOf(col, row)
      if (shown != null && typeof shown === 'object') shown = raw // React 노드면 원래 값
      return { v: shown ?? '', t: 's', s: agg ? 3 : 0 }
    }
    const dataStart = out.length
    const kinds = [] // 행마다 집계행인가 — 세로 병합은 집계행에서 끊는다
    for (let vi = 0; vi < rowCount; vi++) {
      const { row, agg, absIdx } = rowAt(vi)
      const line = cols.map(() => null)
      for (let j = 0; j < cols.length; j++) {
        if (line[j]) continue
        const col = cols[j].c
        line[j] = cellOf(col, row, agg)
        const n = !agg && col.colSpan ? Math.max(1, col.colSpan(row, srcOf(absIdx)) | 0) : 1
        if (n > 1) { // 본문 가로 병합 — 덮이는 칸은 비운다
          const end = Math.min(cols.length - 1, j + n - 1)
          for (let k = j + 1; k <= end; k++) line[k] = { v: '', s: line[j].s }
          merges.push({ r1: out.length, c1: j, r2: out.length, c2: end })
          j = end
        }
      }
      kinds.push(!!agg)
      out.push(line)
    }
    if (aggInfo?.totalRow) {
      const line = cols.map((x) => cellOf(x.c, aggInfo.totalRow.row, 'total'))
      if (aggInfo.totalPos === 'top') { out.splice(dataStart, 0, line); kinds.unshift(true) }
      else { out.push(line); kinds.push(true) }
    }
    // 세로 병합(merge: true) — 집계행이 끊는다
    cols.forEach((x, j) => {
      if (!x.c.merge) return
      let s = 0
      for (let k = 1; k <= kinds.length; k++) {
        const r = dataStart + k
        const prev = out[r - 1][j]
        const same = k < kinds.length && !kinds[k] && !kinds[k - 1] && out[r][j] && prev && out[r][j].v === prev.v
        if (!same) {
          const r1 = dataStart + s, r2 = dataStart + k - 1
          if (r2 > r1 && !kinds[s]) {
            merges.push({ r1, c1: j, r2, c2: j })
            for (let q = r1 + 1; q <= r2; q++) out[q][j] = { v: '', s: out[q][j]?.s ?? 0 }
          }
          s = k
        }
      }
    })
    const widths = cols.map((x) => colWidths?.[specialCols.length + x.i] ?? x.c.width ?? 100)
    const d = new Date()
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const file = (typeof name === 'string' && name) || (typeof excel === 'string' && excel) || `${label || '그리드'}_${stamp}`
    download(buildXlsx({ rows: out, merges, widths, sheetName: label || 'Sheet1', freezeRows: L }), file)
  }

  // ref — 화면이 명령으로 부를 것: 엑셀 내보내기 · 고친 행 모으기(저장용) · 편집 끝내기
  useImperativeHandle(ref, () => ({
    exportExcel,
    getChangedRows: () => data.filter((r) => r._status === 'C' || r._status === 'U' || r._status === 'D'),
    stopEdit: () => setEdit(null),
  }))

  // 실측 전엔 props 기준(px 또는 flex 균등), 실측 후엔 고정 px
  const colStyle = (col, i) => {
    if (colWidths) return { width: colWidths[i], flex: 'none' }
    return col.width ? { width: col.width, flex: 'none' } : { flex: 1 }
  }
  // 데이터/집계 셀 스타일 — colStyle + 컬럼 정렬(align). 헤더는 항상 중앙이라 colStyle 그대로
  const cellStyle = (col, ci) => {
    const st = colStyle(col, ci)
    return col.align && ALIGN[col.align] ? { ...st, justifyContent: ALIGN[col.align] } : st
  }

  // 폭 합계 — 헤더/행의 최소폭으로 줘서, 합계가 그리드보다 크면 가로 스크롤이 생긴다
  const totalW = colWidths ? colWidths.reduce((a, b) => a + b, 0) : null
  const wideStyle = totalW ? { minWidth: totalW } : undefined

  // 행높이 셀렉트 선택지 — 배열 prop 이면 그 값, true 면 기본 목록.
  // 현재 행높이(rowHeight prop 초기값)가 목록에 없으면 끼워 넣어 셀렉트 표시값이 비지 않게 한다
  const rhBase = Array.isArray(rowHeightSelect) ? rowHeightSelect : [22, 26, 32, 40]
  const rhOptions = rhBase.includes(rowH) ? rhBase : [...rhBase, rowH].sort((a, b) => a - b)

  // 특수컬럼 헤더 — MOCA 와 동일한 아이콘(연필/목록) 사용, 라이트 테마 색 보정은 CSS filter 로
  // 행 클립(.mrg-rowsclip — overflow:hidden)은 스크롤하지 않는다. 칸에 포커스가 가면 브라우저가 클립을 직접 밀어 본문만 가로로 밀리고
  // 머리글과 어긋났다(2026-11-12 LIME 전환 — 담당자 표에서 Tab). 밀린 가로 양은 바깥 본문(.mrg-body — 가로 스크롤 담당)으로 옮기고, 세로는 가상 스크롤이 맡으므로 0 으로
  const onClipScroll = (e) => {
    const el = e.currentTarget
    if (el.scrollLeft) { const x = el.scrollLeft; el.scrollLeft = 0; if (bodyRef.current) bodyRef.current.scrollLeft += x }
    if (el.scrollTop) el.scrollTop = 0
  }

  const headerContent = (col) => {
    if (col.special === 'status')
      return <img src={iconRowStatus} className="mrg-th-icon" alt="상태" title="행상태 (C:신규 U:수정 D:삭제)" />
    if (col.special === 'rownum')
      return <img src={iconRowNum} className="mrg-th-icon" alt="번호" title="행번호" />
    if (col.special === 'delcheck')
      return (
        <input type="checkbox" className="mrg-chk" title="전체선택"
          checked={allDelChecked} onChange={toggleDelAll} />
      )
    return col.title
  }

  // 행번호 압축 표시 (MOCA _fn_display_rownum 과 동일한 기법) — 콤마 포함 숫자가 컬럼 폭을
  // 넘으면 폰트 크기는 12px 그대로 두고 transform:scaleX 로 가로만 압축한다(가독성 위해 최대 50%).
  const rownumContent = (absIdx, colW) => {
    const txt = (absIdx + 1).toLocaleString()
    const avail = colW - 4 // mrg-slim 좌우 패딩 2px씩 제외
    let need = 0
    for (const ch of txt) need += ch === ',' ? 4 : 7
    if (need <= avail) return txt
    const scale = Math.max(avail / need, 0.5)
    return (
      <span style={{ display: 'inline-block', transform: `scaleX(${scale.toFixed(3)})`, transformOrigin: 'center', whiteSpace: 'nowrap' }}>
        {txt}
      </span>
    )
  }

  // 트리 셀 (MOCA celltype tree 렌더 이식) — [조상 연속선 ×(depth-2)][├/└][+/−/•][라벨]
  // 연결선 모양은 MOCA 와 동일하게 "부모면 ├, 리프면 └" 로 고른다. 라벨이 비면 아무것도 안 그린다
  const treeCellContent = (row, absIdx) => {
    const label = row[treeCol.labelKey ?? treeCol.key]
    if (label == null || String(label).trim() === '') return null
    const { levels, parents } = treeInfo
    const lv = levels[absIdx]
    const isParent = parents[absIdx]
    const lines = []
    for (let k = 0; k < lv - 2; k++) lines.push(<span key={k} className="mrg-tree-line" />)
    if (lv >= 2) lines.push(<span key="c" className={isParent ? 'mrg-tree-mid' : 'mrg-tree-last'} />)
    return (
      <span className="mrg-tree">
        {lines}
        <span
          className={`mrg-tree-ico ${isParent ? (collapsedSet.has(absIdx) ? 'mrg-tree-plus' : 'mrg-tree-minus') : 'mrg-tree-leaf'}`}
          title={isParent ? (collapsedSet.has(absIdx) ? '펼치기' : '접기') : undefined}
          onClick={isParent ? (e) => { e.stopPropagation(); toggleTree(absIdx) } : undefined}
        />
        <span className="mrg-tree-label">{label}</span>
      </span>
    )
  }

  const cellContent = (col, row, absIdx, ci) => {
    if (col.cellType === 'tree') return treeCellContent(row, absIdx)
    if (col.special === 'status') {
      const s = row._status || ''
      return s ? <span className={`mrg-st mrg-st-${s}`}>{s}</span> : null
    }
    if (col.special === 'rownum')
      return rownumContent(absIdx, colWidths ? colWidths[ci] : col.width)
    if (col.special === 'delcheck') {
      const src = srcOf(absIdx)
      return (
        <input type="checkbox" className="mrg-chk"
          checked={delChecked.has(src)} onChange={() => toggleDel(src)} />
      )
    }
    const v = row[col.key]
    const src = srcOf(absIdx)
    if (edit && edit.src === src && edit.key === col.key) {
      return (
        <MocaGridEditor type={editTypeOf(col)} value={v} options={col.options}
          onCommit={(raw) => commitEdit(src, col.key, raw)}
          onCancel={() => setEdit(null)}
          onTab={(raw, dir) => tabEdit(src, col.key, raw, dir)} />
      )
    }
    if (editTypeOf(col) === 'checkbox') {
      const on = checkOn(col, v)
      const can = canEdit(col, row)
      return (
        <input type="checkbox" className="mrg-chk-edit" checked={on} disabled={!can}
          onClick={(e) => e.stopPropagation()}
          onChange={() => applyValue(src, col.key, on ? (col.falseValue ?? 'N') : (col.trueValue ?? 'Y'))} />
      )
    }
    if (col.render) return col.render(v, row, src) // React 로 직접 그리기 (AG Grid cellRenderer 대응)
    return displayOf(col, row) // format = MOCA data-m-displayfunction 대응
  }

  // 집계행 셀 — 라벨 컬럼엔 라벨, calc 컬럼엔 계산값(format 적용, 숫자는 콤마), 나머진 빈 칸
  const aggCellContent = (col, vr) => {
    if (col.special || col.cellType === 'tree') return null
    const v = vr.row[col.key]
    if (col.key === aggInfo.labelKey) return v
    if (!CALC_OPS[col.calc]) return null
    if (col.format) return col.format(v, vr.row)
    return typeof v === 'number' ? v.toLocaleString() : v
  }

  // 집계행 렌더 — 소계는 가상화 행으로, 합계는 고정(pin) 행으로 이 함수를 공유한다.
  // 집계행은 선택/체크 대상이 아니다(onClick 없음 — MOCA 도 집계행 선택을 차단한다)
  const renderAggRow = (vr, key, style, extraClass = '') => (
    <div key={key} className={`mrg-row mrg-agg mrg-agg-${vr.agg}${extraClass}`} style={style}>
      {allCols.map((col, ci) => (
        <div key={col.key} className={`mrg-cell${col.special ? ' mrg-slim' : ''}`} style={cellStyle(col, ci)}>
          {aggCellContent(col, vr)}
        </div>
      ))}
      <div className="mrg-filler" />
    </div>
  )

  // colMerge — 병합 계획을 렌더 창 안에서만 계산(MOCA 동일). label = 병합 구간의 첫 표시
  // 행에만 값 표시(MOCA colmergealign="top" 방식 — 스크롤해도 구간 첫 행이 항상 라벨을 가진다),
  // open = 아래 행과 이어짐(행 경계선을 배경색으로 덮는다). 집계행은 런을 끊는다
  const mergeAt = (i, col) => {
    const same = (a, b) => a != null && b != null && !a.agg && !b.agg && a.row[col.key] === b.row[col.key]
    const cur = viewRows[i]
    return { label: !same(viewRows[i - 1], cur), open: same(cur, viewRows[i + 1]) }
  }

  return (
    <div
      ref={rootRef}
      className={`mrg${isFull ? ' mrg-overlay' : ''}${isTouch ? ' mrg-touch' : ''}`}
      style={isFull ? undefined : { height: height ?? '100%' }}
    >
      {(label != null || rowHeightSelect || search || filterState || excel) && (
        <div className="mrg-toolbar">
          <div className="mrg-toolbar-left">
            {/* 헤더에는 제목만 — 건수는 푸터(mrg-status)로 옮겼다.
                좁은 폭에서 제목+건수+찾기+버튼이 한 줄을 다투기 때문 */}
            {label != null && <span className="mrg-title">{label}</span>}
          </div>
          <div className="mrg-toolbar-right">
            {/* 필터가 걸려 있을 때만 나오는 해제 버튼 — 어느 컬럼에 걸었는지 잊어도 한 번에 푼다.
                헤더 아이콘만으로는 "왜 몇 건 안 나오지"의 답을 찾기 어렵다 */}
            {filterState && (
              <button type="button" className="mrg-tb-btn mrg-tb-text"
                title={`필터 적용 컬럼: ${Object.keys(filterState).map((k) => columns.find((c) => c.key === k)?.title ?? k).join(', ')}`}
                onClick={() => { setFilterState(null); setFindState(null) }}>
                필터 해제 ({Object.keys(filterState).length})
              </button>
            )}
            {search && (
              <div className="mrg-find">
                <input
                  type="text"
                  className="mrg-find-input"
                  placeholder="찾기"
                  title="모든 컬럼에서 부분일치 검색 (Enter = 다음)"
                  value={findQ}
                  onChange={(e) => setFindQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doFind() }}
                />
                {/* 매치 위치("3/57")는 툴바에서 뺐다 — 좁은 폭에서 입력·버튼과 자리를 다퉜다.
                    검색 결과는 푸터 왼쪽에 모아 보여준다(2026-08-19) */}
                <button type="button" className="mrg-find-btn" onClick={doFind}>다음</button>
              </div>
            )}
            {rowHeightSelect && (
              <select
                className="mrg-rh-select"
                title="행높이"
                value={rowH}
                onChange={(e) => setRowHSel(Number(e.target.value))}
              >
                {rhOptions.map((h) => (
                  <option key={h} value={h}>{h}px</option>
                ))}
              </select>
            )}
            {excel && (
              <button type="button" className="mrg-tb-btn" title="엑셀로 내려받기 (지금 보이는 대로)"
                onClick={() => exportExcel()}>
                <img src={iconExcel} className="mrg-tb-icon mrg-tb-excel" alt="엑셀" />
              </button>
            )}
            {fullScreen && label != null && (
              <button
                type="button"
                className="mrg-tb-btn"
                title={isFull ? '원래 크기로' : '그리드 전체화면'}
                onClick={() => setIsFull((f) => !f)}
              >
                <img src={isFull ? iconGridReduce : iconGridFull} className="mrg-tb-icon" alt="" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mrg-bodywrap">
        {/* 본문 — 세로는 네이티브 스크롤 없음(overflow-y hidden). 가로만 네이티브 스크롤 */}
        <div ref={bodyRef} className="mrg-body">
          <div ref={headerRef} className="mrg-header" style={wideStyle}>
            {allCols.map((col, i) => {
              const s = canSort(col), f = canFilter(col)
              const dir = s ? sortDirOf(col.key) : null
              const on = f && filterState?.[col.key] != null
              // 다단 헤더 — 칸은 머리글 전체 높이를 차지하고, 위에 묶음이 있으면 그만큼 비운 아래쪽에 제목을 둔다
              const d = col.special ? 0 : colTree.depth[i - specialCols.length]
              const hst = colTree.levels > 1
                ? { ...colStyle(col, i), height: headerH, paddingTop: d * HEADER_H }
                : colStyle(col, i)
              return (
                <div
                  key={col.key}
                  className={`mrg-cell mrg-hcell${col.special ? ' mrg-slim' : ''}${s || f ? ' mrg-hcell-btn' : ''}`}
                  style={hst}
                >
                  <span className="mrg-hlabel">{headerContent(col)}</span>
                  {(s || f) && (
                    <span className="mrg-hbtns">
                      {s && (
                        <button type="button" className={`mrg-sort mrg-sort-${dir ?? 'none'}`}
                          title={dir === 'asc' ? '오름차순 — 누르면 내림차순' : dir === 'desc' ? '내림차순 — 누르면 원래대로' : '정렬(오름차순)'}
                          onClick={(e) => { e.stopPropagation(); cycleSort(col.key) }} />
                      )}
                      {f && (
                        <button type="button" className={`mrg-filter${on ? ' mrg-filter-on' : ''}`}
                          title={on ? '필터 적용됨 — 누르면 조건을 고친다' : '필터'}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); openFilter(e, col.key) }} />
                      )}
                    </span>
                  )}
                  {!col.special && <div className="mrg-resizer" onPointerDown={(e) => startResize(e, i)} />}
                </div>
              )
            })}
            <div className="mrg-filler" />
            {/* 묶음 제목 — 아래 칸들의 폭을 합쳐 가로로 병합. 폭을 잰 뒤에만 그린다(그 전 한 프레임은 생략) */}
            {colWidths && colTree.groups.map((g, gi) => {
              const a = specialCols.length + g.first, b = specialCols.length + g.last
              let left = 0, width = 0
              for (let k = 0; k < a; k++) left += colWidths[k]
              for (let k = a; k <= b; k++) width += colWidths[k]
              return (
                <div key={`g${gi}`} className="mrg-cell mrg-hgroup"
                  style={{ left, width, top: g.depth * HEADER_H, height: HEADER_H }}>
                  {g.title}
                </div>
              )
            })}
          </div>

          {/* 위 고정 합계행 (total="top") — body flex 컬럼의 일반 흐름이라 스크롤과 무관하게
              헤더 바로 아래 제자리다. 가로 스크롤은 body 가 헤더/행과 함께 움직인다 */}
          {aggInfo?.totalRow && aggInfo.totalPos === 'top' &&
            renderAggRow(aggInfo.totalRow, 'total', { height: rowH, ...wideStyle }, ' mrg-agg-pin mrg-agg-pin-top')}

          {/* 행 클립영역 — 가상화 행(translateY)의 위아래 overscan 삐져나옴을 잘라낸다.
              wideStyle 이 없으면 flex stretch 폭(=보이는 폭)으로 잘려 가로 스크롤 시 행이 잘린다 */}
          <div className="mrg-rowsclip" style={wideStyle} onScroll={onClipScroll}>
          {rows.length === 0 ? (
            <div className="mrg-empty">{filtered ? '필터 조건에 맞는 데이터가 없습니다' : '데이터가 없습니다'}</div>
          ) : (
            <div
              className="mrg-rows"
              style={{ transform: `translateY(${offsetY}px)`, ...wideStyle }}
            >
              {viewRows.map((vr, i) =>
                vr.agg ? (
                  // 소계행 — 가상화 대상 행(스크롤을 따라간다). key 는 표시 위치
                  renderAggRow(vr, `agg${startIdx + i}`, { height: rowH })
                ) : (
                  // 얼룩말 배경(mrg-even)은 표시 위치 기준 — 트리 접힘/소계 삽입에도 무늬가 안 깨진다.
                  // 선택/행번호/삭제체크는 절대 행번호(absIdx) 기준 유지
                  <div
                    key={vr.absIdx}
                    className={`mrg-row${(startIdx + i) % 2 === 1 ? ' mrg-even' : ''}${srcOf(vr.absIdx) === selIdx ? ' mrg-selected' : ''}`}
                    style={{ height: rowH }}
                    onClick={() => selectRow(vr.absIdx)}
                  >
                    {(() => {
                      const cells = []
                      for (let ci = 0; ci < allCols.length; ci++) {
                        const col = allCols[ci]
                        // 본문 가로 병합(colSpan) — 폭을 잰 뒤에만(덮을 칸들의 폭 합이 필요하다)
                        let span = 1
                        if (col.colSpan && !col.special && colWidths) {
                          span = Math.max(1, Math.min(allCols.length - ci, col.colSpan(vr.row, srcOf(vr.absIdx)) | 0))
                        }
                        const mg = span === 1 && col.merge && !col.special ? mergeAt(i, col) : null
                        const editing = edit && !col.special && edit.src === srcOf(vr.absIdx) && edit.key === col.key
                        let st = cellStyle(col, ci)
                        if (span > 1) {
                          let w = 0
                          for (let k = ci; k < ci + span; k++) w += colWidths[k]
                          st = { ...st, width: w }
                        }
                        cells.push(
                          <div
                            key={col.key}
                            className={`mrg-cell${col.special ? ' mrg-slim' : ''}${mg ? ` mrg-merge${mg.open ? ' mrg-merge-open' : ''}` : ''}${editing ? ' mrg-editing' : ''}${!col.special && canEdit(col, vr.row) ? ' mrg-editable' : ''}`}
                            style={st}
                            onDoubleClick={col.special ? undefined : () => startEdit(vr.absIdx, col)}
                          >
                            {mg && !mg.label ? null : cellContent(col, vr.row, vr.absIdx, ci)}
                          </div>,
                        )
                        ci += span - 1
                      }
                      return cells
                    })()}
                    <div className="mrg-filler" />
                  </div>
                )
              )}
            </div>
          )}
          </div>

          {/* 아래 고정 합계행 (기본) — 클립영역 아래 일반 흐름 */}
          {aggInfo?.totalRow && aggInfo.totalPos === 'bottom' &&
            renderAggRow(aggInfo.totalRow, 'total', { height: rowH, ...wideStyle }, ' mrg-agg-pin mrg-agg-pin-bottom')}
        </div>

        {/* 전용 세로 스크롤바 (MOCA .moca_scrollY_type1) — 안에는 전체 높이 스페이서뿐.
            고정 합계행이 있으면 그만큼 줄여 스크롤바 높이 = 행 표시 영역(rowAreaH)을 유지한다
            — 안 맞으면 최대 scrollTop 이 부족해 마지막 행에 끝까지 못 간다 */}
        <div
          ref={vscrollRef}
          className="mrg-vscroll"
          style={vscrollPos}
          onScroll={handleVScroll}
          {...(isTouch
            ? { onTouchStart: onOverlayTouchStart, onTouchMove: onOverlayTouchMove, onClick: onOverlayClick }
            : null)}
        >
          <div style={{ height: totalHeight, width: 1 }} />
        </div>

        {/* 가짜 세로 썸 — 오버레이의 형제로 둔다(안에 넣으면 스페이서와 함께 스크롤되어 흘러간다) */}
        {isTouch && (
          <div ref={thumbRef} className="mrg-vthumb" style={vscrollPos} onPointerDown={startThumbDrag} />
        )}

      </div>

      {/* 필터 드롭다운 — key 에 컬럼을 물려 다른 컬럼을 열면 검색어·임시 체크가 새로 시작한다 */}
      {filterOpen && filterOptions && createPortal(
        <MocaGridFilterPanel
          key={filterOpen.key}
          options={filterOptions}
          current={filterState?.[filterOpen.key]}
          limit={filterDistinctLimit}
          style={{
            left: filterOpen.left,
            ...(filterOpen.top != null ? { top: filterOpen.top } : { bottom: filterOpen.bottom }),
            maxHeight: Math.max(180, Math.min(340, filterOpen.maxH)),
          }}
          onApply={(checked, allCount) => applyFilter(filterOpen.key, checked, allCount)}
          onClear={() => { clearFilter(filterOpen.key); setFilterOpen(null) }}
          onClose={() => setFilterOpen(null)}
        />, document.body)}

      {/* 푸터 — 왼쪽은 "지금 무엇을 보고 있나"(검색 결과·포커스 행), 오른쪽은 "전체가 몇 건인가".
          렌더링 구간·DOM 행수는 가상 스크롤 개발 중 쓰던 디버깅 표시라 걷어냈다(2026-08-19).
          검색 위치는 툴바에서 여기로 옮겼다 — 좁은 폭 툴바에 입력·버튼과 함께 두기 어렵다 */}
      {statusBar && (
        <div className="mrg-status">
          <span className="mrg-status-left">
            {/* 입력을 고치면(실행 전) 이전 결과와 어긋나므로, 실행된 검색어와 같을 때만 보여준다 */}
            {findState && findState.q === findQ.trim().toLowerCase() && (
              findState.matches.length === 0
                ? '검색 0건'
                : `검색 ${findState.matches.length.toLocaleString()}건 · ${(findState.pos + 1).toLocaleString()}번째`
            )}
            {selPos != null && `${findState && findState.q === findQ.trim().toLowerCase() ? ' · ' : ''}${(selPos + 1).toLocaleString()}행`}
          </span>
          <span className="mrg-status-right">
            {/* 필터가 걸리면 "몇 건 중 몇 건"이 먼저다 — 총건수만 보이면 왜 적게 나오는지 알 수 없다
                (MOCA 도 필터 적용 시 건수를 "표시/전체" 로 바꾼다) */}
            {filtered
              ? <>필터 <b className="mrg-filtered-cnt">{rows.length.toLocaleString()}</b>/{data.length.toLocaleString()}{countUnit}</>
              : `총 ${data.length.toLocaleString()}${countUnit}`}
            {treeInfo && rowCount !== rows.length && ` · 표시 ${rowCount.toLocaleString()}건(접힘 제외)`}
            {delChecked.size > 0 && ` · 선택 ${delChecked.size.toLocaleString()}건`}
          </span>
        </div>
      )}
    </div>
  )
})

export default MocaReactGrid
