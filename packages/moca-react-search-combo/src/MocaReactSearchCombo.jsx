import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import './MocaReactSearchCombo.css'

// MOCA React SearchCombo — 타이핑으로 목록을 좁혀 고르는 검색형 콤보
// (MOCA vendor/moca/js/searchCombo.js 이식)
//
// 일반 콤보(select)는 항목이 수십 개만 넘어가도 눈으로 훑어야 하지만, 이 컴포넌트는
// 입력칸에 몇 글자 치면 그 글자를 포함한 항목만 남는다. 코드·이름·분류를 한 줄에
// 담아 두면(displayFormat) 어느 것으로 쳐도 걸린다 — 데모 앱의 헤더 메뉴 검색이 그 용법이다.
//
// ── 목록 구조 ─────────────────────────────────────────────────────────────
//   list = [{ cd: '1000', nm: '서울' }, ...]   (필드명은 cdKey/nmKey 로 변경)
//   표시문구 = displayFormat 이 있으면 '[value]'/'[label]' 치환, 없으면 nm 그대로.
//   **필터는 이 표시문구 기준**이므로, 검색시키고 싶은 값은 표시문구에 들어 있어야 한다.
//
// ── 조작 (MOCA 동일) ──────────────────────────────────────────────────────
//   타이핑     : 목록이 열리며 표시문구 부분일치로 좁혀진다
//   ↓ / ↑      : 보이는 항목 사이 하이라이트 이동 (값은 아직 안 바뀐다)
//   Enter      : 하이라이트 항목 확정 → onChange
//   Esc        : 목록 닫기
//   ▼ 버튼     : 필터를 풀고 전체 목록 열기/닫기 (MOCA _searchComboFullShow)
//   바깥 클릭  : 닫고 입력칸을 확정값 표시로 되돌린다
//
// ── MOCA 와 일부러 다르게 한 것 ───────────────────────────────────────────
//   ① 대소문자 무시 필터. MOCA 는 textContent.includes 라 대소문자를 가려서
//      'tpl011' 로는 'TPL011' 이 안 걸린다 — 검색 컴포넌트에서 그 구분은 득이 없다.
//   ② 타이핑만으로는 값이 바뀌지 않는다(확정은 Enter/클릭뿐). MOCA 는 필터가 돌 때마다
//      첫 매칭을 선값해서 "치는 도중 값이 계속 바뀌는" 상태가 된다. 실제로 MOCA demo 의
//      헤더 메뉴 검색은 그 선값을 매번 지우는 우회를 넣어야 했다(index.html fn_menuSearchReady).
//   ③ 결과가 없으면 목록을 닫지 않고 안내 한 줄(emptyText)을 보여준다 — MOCA 는 그냥 닫혀서
//      "고장인지 결과가 없는 건지" 알 수 없다.
//
// props
//   list         : [{ cd, nm }] 목록 (필수)
//   cdKey/nmKey  : 코드·표시명 필드명 (기본 'cd'/'nm' — MOCA data-m-cdkey/nmkey)
//   value        : 선택 코드값. 주면 제어 컴포넌트(바꾸는 책임은 화면)
//   defaultValue : 비제어일 때 초기 선택값 (기본 '')
//   displayFormat: 표시문구 틀 — '[value]'/'[label]' 치환 (MOCA data-m-displayformat)
//   placeholder  : 입력칸 안내문 (기본 '내용을 입력하세요' — MOCA 동일)
//   readOnly     : 입력 불가 + ▼ 버튼 없음 (MOCA data-m-readonly)
//   disabled     : 비활성
//   clearOnSelect: 확정 후 입력칸을 비운다 — 검색창 용법(메뉴 검색)
//   emptyText    : 결과 없을 때 안내문
//   maxHeight    : 목록 최대 높이(px, 기본 200 — MOCA 동일)
//   width        : 컴포넌트 폭 (기본 CSS 160px)
//   className    : 외형 확장용 추가 class
//   onChange     : (value, item, changed) => void — 확정(Enter/클릭) 시에만
//   ref          : getValue / getLabel / setValue / clear / focus / open / close / getList

const GAP = 2 // 입력칸과 목록 사이 간격(px) — MOCA 동일
const EDGE = 4 // 화면 가장자리 여백(px) — MOCA 동일

const MocaReactSearchCombo = forwardRef(function MocaReactSearchCombo({
  list, cdKey = 'cd', nmKey = 'nm',
  value, defaultValue = '', displayFormat,
  placeholder = '내용을 입력하세요',
  readOnly = false, disabled = false, clearOnSelect = false,
  emptyText = '검색 결과가 없습니다',
  maxHeight = 200, width, className,
  onChange,
}, ref) {
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const popRef = useRef(null)

  const rows = useMemo(() => (Array.isArray(list) ? list.filter((r) => r != null) : []), [list])

  // 선택값 — value prop 을 주면 제어 컴포넌트, 아니면 내부 state (React 표준 이중 모드)
  const [innerValue, setInnerValue] = useState(defaultValue)
  const controlled = value !== undefined
  const curValue = controlled ? value : innerValue

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('') // 입력칸에 실제로 들어 있는 문자열
  const [typed, setTyped] = useState(false) // 열린 뒤 타이핑했나 — ▼ 로 연 전체목록과 구분
  const [hi, setHi] = useState(-1) // 하이라이트 인덱스 (보이는 목록 기준)
  const [pos, setPos] = useState(null) // 목록 위치 — 뷰포트 기준 fixed

  // 표시문구 — 필터도, 확정 후 입력칸 표시도 전부 이 문자열 기준 (MOCA codeToDispLabelMap)
  const labelOf = useCallback((row) => {
    const cd = row[cdKey]
    const nm = row[nmKey]
    return (displayFormat && String(cd) !== '')
      ? String(displayFormat).replace('[value]', cd).replace('[label]', nm)
      : String(nm ?? '')
  }, [cdKey, nmKey, displayFormat])

  const curLabel = useMemo(() => {
    const found = rows.find((r) => String(r[cdKey]) === String(curValue))
    return found ? labelOf(found) : ''
  }, [rows, cdKey, curValue, labelOf])

  // 확정값이 밖에서 바뀌거나 목록이 갈리면 입력칸 표시를 맞춘다 —
  // 단 사용자가 타이핑 중일 때는 건드리지 않는다(치는 글자가 튕겨나간다)
  useEffect(() => {
    if (typed) return
    setText(clearOnSelect ? '' : curLabel)
  }, [curLabel, typed, clearOnSelect])

  const visible = useMemo(() => {
    if (!typed || text === '') return rows
    const k = text.toLowerCase()
    return rows.filter((r) => labelOf(r).toLowerCase().includes(k))
  }, [rows, typed, text, labelOf])

  /* 목록 위치 — 레이아웃 pane(overflow:auto)이나 48px 헤더 안에서 잘리지 않도록
     부모가 아니라 뷰포트 기준(fixed)으로 띄운다. 아래 자리가 모자라면 위로 뒤집는다.
     (MOCA _positionSearchComboPopup 이식) */
  const relocate = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vw = document.documentElement.clientWidth || window.innerWidth
    const vh = document.documentElement.clientHeight || window.innerHeight
    const w = Math.min(r.width, Math.max(0, vw - EDGE * 2))
    const left = Math.max(EDGE, Math.min(r.left, vw - w - EDGE))
    const need = Math.min(popRef.current?.scrollHeight || maxHeight, maxHeight)
    const below = vh - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    const up = below < need && above > below
    const h = Math.min(need, Math.max(0, up ? above : below))
    setPos({ left, width: w, maxHeight: h, top: up ? Math.max(EDGE, r.top - GAP - h) : r.bottom + GAP })
  }, [maxHeight])

  const closeList = useCallback(() => {
    setOpen(false)
    setTyped(false)
    setHi(-1)
    setText(clearOnSelect ? '' : curLabel) // 고르지 않고 나가면 확정값 표시로 되돌린다
  }, [clearOnSelect, curLabel])

  /* 열려 있는 동안만 따라다닌다 — 스크롤/리사이즈로 입력칸이 움직이면 목록도 같이 옮긴다.
     scroll 은 capture 로 받아야 안쪽 스크롤 컨테이너(레이아웃 pane·그리드)까지 걸린다. */
  useEffect(() => {
    if (!open) return
    relocate()
    const onMove = () => relocate()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, relocate, visible.length])

  // 바깥을 누르면 닫는다 — MOCA 는 document click 위임 + blur 200ms 지연이었는데,
  // pointerdown 하나면 "목록 항목을 누르는 중에 blur 로 먼저 닫혀 클릭이 유실되는" 문제가 없다
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target)) return
      closeList()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open, closeList])

  const openList = (fromButton) => {
    if (disabled) return
    if (fromButton) setTyped(false) // ▼ 는 필터를 풀고 전체를 보여준다 (MOCA _searchComboFullShow)
    setOpen(true)
    setHi(-1)
  }

  const commit = (row) => {
    if (!row) return
    const v = row[cdKey]
    const changed = String(v) !== String(curValue)
    if (!controlled) setInnerValue(v)
    setOpen(false)
    setTyped(false)
    setHi(-1)
    setText(clearOnSelect ? '' : labelOf(row))
    // 같은 항목을 다시 골라도 알린다 — 메뉴 검색처럼 "값"이 아니라 "행위"가 필요한 화면이 있다.
    // (MOCA 는 값이 바뀔 때만 inneronchange 라 같은 항목 재선택이 먹히지 않아, demo 헤더가
    //  li 클릭을 직접 받아 우회했다 — index.html fn_menuSearchReady 주석. changed 로 구분한다)
    onChange?.(v, row, changed)
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Escape') { if (open) { e.stopPropagation(); closeList() } return }
    if (e.key === 'Enter') {
      if (!open) return // 닫힌 상태의 Enter 는 화면 몫(검색 버튼 등) — MOCA 동일
      e.preventDefault()
      commit(visible[hi >= 0 ? hi : 0])
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault() // 캐럿이 문자열 처음/끝으로 튀는 것 방지
    if (!open) { openList(false); return }
    if (visible.length === 0) return
    const next = e.key === 'ArrowDown'
      ? (hi + 1 >= visible.length ? 0 : hi + 1)
      : (hi <= 0 ? visible.length - 1 : hi - 1)
    setHi(next)
  }

  // 하이라이트가 보이는 범위 밖이면 스크롤해 들여온다(키보드 이동용)
  useEffect(() => {
    if (!open || hi < 0) return
    popRef.current?.querySelectorAll('li')[hi]?.scrollIntoView({ block: 'nearest' })
  }, [open, hi])

  useImperativeHandle(ref, () => ({
    getValue: () => curValue,
    getLabel: () => curLabel,
    setValue: (v) => {
      const row = rows.find((r) => String(r[cdKey]) === String(v))
      if (!controlled) setInnerValue(v)
      setText(clearOnSelect ? '' : (row ? labelOf(row) : ''))
    },
    clear: () => {
      if (!controlled) setInnerValue('')
      setText('')
      setTyped(false)
    },
    focus: () => inputRef.current?.focus(),
    open: () => openList(true),
    close: closeList,
    getList: () => rows.slice(),
  }))

  return (
    <div
      ref={rootRef}
      className={`mrsc${disabled ? ' mrsc-disabled' : ''}${readOnly ? ' mrsc-ro' : ''}${className ? ` ${className}` : ''}`}
      style={width ? { width } : undefined}
    >
      <div className="mrsc-box">
        <input
          ref={inputRef}
          type="text"
          className="mrsc-input"
          value={text}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onChange={(e) => { setText(e.target.value); setTyped(true); setOpen(true); setHi(-1) }}
          onFocus={() => { if (!readOnly) openList(false) }}
          onKeyDown={onKeyDown}
        />
        {!readOnly && (
          <button
            type="button"
            className="mrsc-btn"
            tabIndex={-1}
            disabled={disabled}
            aria-label={open ? '목록 닫기' : '목록 열기'}
            onClick={() => (open ? closeList() : openList(true))}
          />
        )}
      </div>

      {open && pos && (
        <div
          ref={popRef}
          className="mrsc-pop"
          style={{ left: pos.left, top: pos.top, width: pos.width, minWidth: pos.width, maxHeight: pos.maxHeight }}
        >
          {visible.length === 0
            ? <div className="mrsc-empty">{emptyText}</div>
            : (
              <ul role="listbox">
                {visible.map((row, i) => (
                  <li
                    key={`${row[cdKey]}-${i}`}
                    role="option"
                    aria-selected={String(row[cdKey]) === String(curValue)}
                    className={`${i === hi ? 'on' : ''}${String(row[cdKey]) === String(curValue) ? ' sel' : ''}`}
                    onMouseOver={() => setHi(i)}
                    onClick={() => commit(row)}
                  >
                    {labelOf(row)}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </div>
  )
})

export default MocaReactSearchCombo
