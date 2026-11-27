/* 테마 — MOCA 헤더의 테마 선택(다크/라이트/고대비 combo)에 대응하는 React 판.
 *
 * MOCA 는 :root 에 theme-light/theme-hc 클래스를 붙이고 새로고침해서 적용하지만,
 * 여기서는 <html data-theme="light|dark"> 속성 하나로 즉시 바꾼다(새로고침 없음).
 *
 * ★ 저장값은 'system'|'light'|'dark' 인데, DOM 에는 **해석된 값**(light|dark)만 박는다.
 *   CSS 가 "지금 어떤 팔레트인가" 한 가지만 보면 되기 때문이다. 'system' 을 그대로 박으면
 *   패키지 CSS 마다 미디어쿼리와 속성을 다시 조합해야 한다.
 *
 * 패키지 CSS 규약(각 패키지의 다크 블록 주석 참고):
 *   - data-theme 이 없으면      → OS 설정을 따른다 (패키지만 가져다 쓴 외부 앱)
 *   - data-theme 이 있으면      → 그 선택이 이긴다
 *
 * 선택지가 셋인 이유: 팔레트가 두 벌(Warm Paper 라이트 / Technical Dark)뿐이라
 * MOCA 의 '고대비'에 해당하는 세 번째 팔레트는 아직 없다. 생기면 여기에 한 줄 추가하고
 * 각 패키지에 토큰 블록을 더하면 된다.
 */
const KEY = 'moca-react-theme'

export const THEMES = [
  { value: 'system', label: '🖥️ 시스템' },
  { value: 'light', label: '☀️ 라이트' },
  { value: 'dark', label: '🌙 다크' },
]

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export const getTheme = () => {
  try {
    const v = localStorage.getItem(KEY)
    return THEMES.some((t) => t.value === v) ? v : 'system'
  } catch {
    return 'system' // 프라이빗 모드 등 — 저장만 못 할 뿐 동작은 해야 한다
  }
}

/** 저장값을 실제 팔레트로 해석해 <html> 에 반영 */
export const applyTheme = (theme) => {
  const resolved = theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme
  document.documentElement.setAttribute('data-theme', resolved)
  return resolved
}

export const setTheme = (theme) => {
  try { localStorage.setItem(KEY, theme) } catch { /* 저장 실패는 무시 — 이번 세션은 적용된다 */ }
  return applyTheme(theme)
}

/** '시스템'을 고른 동안 OS 설정 변화를 따라간다. 해제 함수를 돌려준다 */
export const watchSystem = (theme) => {
  if (theme !== 'system') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => applyTheme('system')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
