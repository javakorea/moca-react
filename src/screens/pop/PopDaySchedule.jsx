import { useMemo, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactGrid } from '@teammoca/react-grid'
import { msgbox } from '@teammoca/react-msgbox'

/* 일자 일정 목록 팝업 (MOCA POP_DAYSCH.html 이식)
 *   받는다   props.data = { ymd, items, info }
 *            items = 달력의 getDayItems(ymd) 결과 — setData 가 만들어 둔 인덱스라 **서버 재조회가 없다.**
 *            각 항목 = setData 아이템 사본 + pos('one'|'s'|'m'|'e') + ymd, 그리고 data(원본 행).
 *   돌려준다 close({ changed: true, delId }) — 달력을 다시 그려야 할 때만.
 *            그냥 닫으면 close() → 부모 callback 미발화(변경 없음).
 * ★ 목록에 필요한 업무 필드(담당자·분류 등)는 달력 조회 때 미리 실어 보내야 "재조회 없음"이 성립한다. */

const POS = { one: '단일', s: '시작', m: '진행', e: '종료' }
const DOW = ['일', '월', '화', '수', '목', '금', '토']

const columns = [
  { key: 'TITLE', title: '일정', width: 180, align: 'left' },
  { key: 'CATE_NM', title: '분류', width: 70 },
  { key: 'OWNER', title: '담당', width: 70 },
  { key: 'TERM', title: '기간', width: 150 },
  { key: 'POS', title: '구간', width: 56 },
  { key: 'STATE', title: '상태', width: 56 },
]

function PopDaySchedule({ data, close }) {
  const { ymd = '', items = [], info = {} } = data ?? {}
  const [sel, setSel] = useState(null)

  const dow = useMemo(() => {
    if (ymd.length !== 8) return ''
    return DOW[new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)).getDay()]
  }, [ymd])

  // 그리드에 넣기 좋게 평평하게 편다 — pos 로 연속일정의 어느 지점인지 알 수 있다
  const rows = useMemo(() => items.map((it) => {
    const r = it.data ?? {}
    return {
      SCH_ID: r.SCH_ID ?? '',
      TITLE: `${it.ico ? it.ico + ' ' : ''}${it.title ?? ''}`,
      CATE_NM: r.CATE_NM ?? '',
      OWNER: r.OWNER ?? '',
      TERM: !it.end || it.start === it.end ? '당일' : `${it.start}~${it.end}`,
      POS: POS[it.pos] ?? '',
      STATE: it.done ? '완료' : it.crucial ? '중요' : '',
    }
  }), [items])

  // 삭제 — 실제 화면이라면 tran.delete 로 지우고 닫는다. 여기서는 id 만 돌려준다
  const del = async () => {
    if (!sel) return msgbox.alert('삭제할 일정을 선택하세요.')
    if (!(await msgbox.confirm(`[${sel.TITLE}] 을(를) 삭제하시겠습니까?`))) return
    close({ changed: true, delId: sel.SCH_ID })
  }

  return (
    <div style={{ height: '100%', minHeight: 380, padding: 10, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto:fit" gap={8}>
        <div className="pds-head">
          <span className="pds-date">{ymd.slice(0, 4)}.{ymd.slice(4, 6)}.{ymd.slice(6, 8)} ({dow})</span>
          <span className="pds-meta">
            {[info.holi, info.wthr].filter(Boolean).join(' · ') || '-'}
          </span>
        </div>

        <MocaReactGrid
          columns={columns}
          data={rows}
          onRowSelected={(row) => setSel(row)}
          rowStatus={false}
          delCheck={false}
        />

        <div className="pds-foot">
          <span className="pds-hint">행을 고르고 [삭제]</span>
          <button type="button" className="pds-btn" onClick={del}>삭제</button>
          <button type="button" className="pds-btn" onClick={() => close()}>닫기</button>
        </div>
      </MocaReactLayout>

      <style>{`
        .pds-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; }
        .pds-date { color: #1c5d99; font-weight: 700; }
        .pds-meta { color: #8a8fa0; font-size: 12px; }
        .pds-foot { display: flex; align-items: center; gap: 6px; }
        .pds-hint { margin-right: auto; color: #8a8fa0; font-size: 11.5px; }
        .pds-btn { border: 1px solid #c4ccd5; background: transparent; border-radius: 5px;
          padding: 7px 16px; font-size: 12.5px; color: inherit; cursor: pointer; }
        .pds-btn:hover { background: rgba(127,127,127,0.12); }
      `}</style>
      <style>{`
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .pds-date { color: #7fc1ff; }
          :root:not([data-theme="light"]) .pds-btn { border-color: #3a4a5a; }
        }
        :root[data-theme="dark"] .pds-date { color: #7fc1ff; }
        :root[data-theme="dark"] .pds-btn { border-color: #3a4a5a; }
      `}</style>
    </div>
  )
}

export default PopDaySchedule
