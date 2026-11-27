/*
 * 화면 설계(Puck) 부품 — 끌어 놓는 블록 6종. 캔버스에 그리는 모양과 코드 생성(codegen.js)이 같은 데이터를 본다.
 *   Title(공통 제목줄) · SearchBox(검색조건) · Grid(목록) · Split(칸 나누기) · Text(안내문) · Fab(떠 있는 버튼)
 * 블록이 이 정도인 까닭: 업무 화면 대부분이 「제목 + 검색 + 목록(+ 좌우·상하 분할)」 골격이고(moca-react-screen),
 * 세부 동작은 만든 뒤 코드 편집기(자동완성)에서 고치는 것이 빠르다.
 */
import { MocaReactGrid } from '@teammoca/react-grid'
import { flexOf } from './layoutTokens.js'

const yesNo = [{ label: '예', value: true }, { label: '아니오', value: false }]

/* 칸 나누기 캔버스 — 실제 MocaReactLayout 은 자식 하나하나를 칸으로 감싸는데, 설계 화면의 놓는 자리(DropZone)는
   Puck 이 자기 상자로 감싼다. 그래서 같은 토큰을 CSS flex 로 흉내 낸다(nth-child 마다 flex 값) */
function zoneCss(scope, dir, ratio, count) {
  const given = String(ratio || '').split(':').map((s) => s.trim()).filter(Boolean)
  let css = ''
  for (let i = 0; i < count; i++) {
    if (!given[i]) continue
    const f = flexOf(given[i])
    css += `${scope} > :nth-child(${i + 1}){flex:${f.flex};}`
  }
  return css
}

export const config = {
  categories: {
    layout: { title: '골격', components: ['Title', 'Split'] },
    data: { title: '조회·목록', components: ['SearchBox', 'Grid'] },
    etc: { title: '기타', components: ['Text', 'Fab'] },
  },
  root: {
    fields: { title: { type: 'text', label: '메뉴 이름' } },
    defaultProps: { title: '새 화면' },
    render: ({ children }) => <div className="dz-root">{children}</div>,
  },
  components: {
    Title: {
      label: '제목줄 (ComTitle)',
      fields: {},
      render: () => (
        <div data-kind="Title" className="dz-title"><span className="dz-title-id">[ID]</span> 📄 메뉴 이름 <span className="dz-dim">— 그룹 › 화면</span><span className="dz-title-btn">⟳</span></div>
      ),
    },
    SearchBox: {
      label: '검색조건',
      fields: {
        items: {
          type: 'array', label: '조건',
          arrayFields: {
            label: { type: 'text', label: '라벨' },
            key: { type: 'text', label: '파라미터 키' },
            kind: { type: 'select', label: '입력 방식', options: [{ label: '글자', value: 'text' }, { label: '날짜', value: 'date' }, { label: '고르기', value: 'combo' }] },
            codes: { type: 'text', label: '고르기 항목 (코드:이름,…)' },
          },
          defaultItemProps: { label: '이름', key: 'NAME', kind: 'text', codes: '' },
          getItemSummary: (it) => `${it.label || '?'} (${it.key || '?'})`,
        },
      },
      defaultProps: { items: [{ label: '이름', key: 'USER_NM', kind: 'text', codes: '' }] },
      render: ({ items }) => (
        <div data-kind="SearchBox" className="dz-search">
          {(items || []).map((it, i) => (
            <span key={i} className="dz-cond">
              <label>{it.label}</label>
              {it.kind === 'date' ? <span className="dz-input">____-__-__ 📅</span>
                : it.kind === 'combo' ? <span className="dz-input">{(it.codes || '').split(',')[0]?.split(':')[1] || '선택'} ▾</span>
                  : <span className="dz-input" />}
            </span>
          ))}
          <span className="dz-btn">조회</span>
        </div>
      ),
    },
    Grid: {
      label: '목록 그리드',
      fields: {
        label: { type: 'text', label: '그리드 제목' },
        queryId: { type: 'text', label: '조회 queryId (MOCA 매퍼)' },
        columns: {
          type: 'array', label: '컬럼',
          arrayFields: {
            key: { type: 'text', label: '필드' },
            title: { type: 'text', label: '머리글' },
            width: { type: 'number', label: '폭(px, 비우면 나머지)' },
            align: { type: 'select', label: '정렬', options: [{ label: '왼쪽', value: 'left' }, { label: '가운데', value: 'center' }, { label: '오른쪽', value: 'right' }] },
          },
          defaultItemProps: { key: 'COL', title: '컬럼', width: 100, align: 'left' },
          getItemSummary: (c) => `${c.title || '?'} (${c.key || '?'})`,
        },
        search: { type: 'radio', label: '찾기 상자', options: yesNo },
        sortable: { type: 'radio', label: '머리글 정렬', options: yesNo },
        rowStatus: { type: 'radio', label: '행 상태·삭제 칸', options: yesNo },
      },
      defaultProps: {
        label: '목록', queryId: '', search: true, sortable: false, rowStatus: false,
        columns: [{ key: 'ID', title: 'ID', width: 90, align: 'center' }, { key: 'NAME', title: '이름', width: null, align: 'left' }],
      },
      render: ({ label, columns, search, sortable, rowStatus, queryId }) => {
        const cols = (columns || []).map((c) => ({ key: c.key || '?', title: c.title || c.key || '?', width: c.width || undefined, align: c.align }))
        const data = [1, 2, 3].map((n) => Object.fromEntries(cols.map((c) => [c.key, `${c.title} ${n}`])))
        return (
          <div data-kind="Grid" className="dz-grid">
            <MocaReactGrid label={label + (queryId ? `  ·  ${queryId}` : '')} columns={cols} data={data} search={!!search} sortable={!!sortable} rowStatus={!!rowStatus} delCheck={!!rowStatus} />
          </div>
        )
      },
    },
    Split: {
      label: '칸 나누기 (MocaReactLayout)',
      fields: {
        dir: { type: 'radio', label: '방향', options: [{ label: '가로(좌|우)', value: 'h' }, { label: '세로(위/아래)', value: 'v' }] },
        ratio: { type: 'text', label: '비율 (예: 3:7, 300px:auto — 비우면 자동)' },
        items: { type: 'slot', label: '칸' },
      },
      defaultProps: { dir: 'h', ratio: '3:7', items: [] },
      render: ({ id, dir, ratio, items: Items }) => {
        const scope = `[data-split="${id}"]`
        return (
          <div data-kind="Split" data-split={id} className="dz-split-wrap">
            <style>{zoneCss(scope + ' .dz-split', dir, ratio, 12)}</style>
            <div className="dz-split-tag">layout="{dir === 'h' ? 'h' : 'v'}{ratio || '(칸마다 자동)'}"</div>
            <Items className={'dz-split ' + (dir === 'h' ? 'h' : 'v')} minEmptyHeight={80} />
          </div>
        )
      },
    },
    Text: {
      label: '안내문',
      fields: { text: { type: 'textarea', label: '내용' } },
      defaultProps: { text: '안내 문구를 적습니다.' },
      render: ({ text }) => <div data-kind="Text" className="dz-text">{text}</div>,
    },
    Fab: {
      label: '떠 있는 버튼',
      fields: {
        label: { type: 'text', label: '글자 (비우면 아이콘만)' },
        icon: { type: 'text', label: '아이콘 (이모지 또는 plus)' },
        position: { type: 'select', label: '위치', options: [{ label: '오른쪽 아래', value: 'rb' }, { label: '오른쪽 위', value: 'rt' }, { label: '왼쪽 아래', value: 'lb' }, { label: '왼쪽 위', value: 'lt' }] },
      },
      defaultProps: { label: '저장', icon: '💾', position: 'rb' },
      render: ({ label, icon, position }) => <div data-kind="Fab" className="dz-fab">{icon} {label} <span className="dz-dim">({position} · 화면 위에 떠 있음)</span></div>,
    },
  },
}

