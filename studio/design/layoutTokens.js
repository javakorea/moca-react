/*
 * MocaReactLayout 토큰 계산 — 설계 화면(캔버스)과 코드 생성이 같은 규칙을 쓴다.
 * 문법은 catalog 의 MocaReactLayout(layout="{v|h}{토큰:토큰…}") 그대로:
 *   숫자 = 비율 · 숫자px = 고정 · fit = 내용 크기 · auto = 남은 공간
 */

/** 블록 종류별 기본 토큰 — 비율을 따로 안 적으면 이것으로 채운다 */
export const KIND_TOKEN = { Title: 'fit', SearchBox: 'fit', Text: 'fit', Grid: 'auto', Split: 'auto' }

/** 떠 있는 버튼은 칸을 차지하지 않는다 — 레이아웃 자식에서 뺀다 */
export const isFloating = (item) => item?.type === 'Fab'

/** dir + 비율 문자열(「3:7」, 비우면 자동) + 자식 → layout 문자열 */
export function layoutOf(dir, ratio, items) {
  const kids = (items || []).filter((i) => !isFloating(i))
  const given = String(ratio || '').split(':').map((s) => s.trim()).filter(Boolean)
  const tokens = kids.map((k, i) => given[i] || KIND_TOKEN[k.type] || 'auto')
  return (dir === 'h' ? 'h' : 'v') + (tokens.length ? tokens.join(':') : '1')
}

/** 토큰 → CSS flex (설계 캔버스용) */
export function flexOf(token) {
  if (/^\d+(\.\d+)?$/.test(token)) return { flex: `${token} 1 0`, minHeight: 0, minWidth: 0 }
  const px = /^(\d+)px$/.exec(token)
  if (px) return { flex: `0 0 ${px[1]}px` }
  if (token === 'fit') return { flex: '0 0 auto' }
  return { flex: '1 1 0', minHeight: 0, minWidth: 0 } // auto
}
