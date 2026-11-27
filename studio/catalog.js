/*
 * 스튜디오가 쓰는 MOCA React 지식 — docs/catalog.js 를 그대로 읽는다(목록을 여기에 옮겨 적지 않는다).
 * catalog.js 는 앱이 import 하지 않는 문서용 파일이지만, 스튜디오는 IntelliSense 같은 도구라 읽어도 된다.
 * ?raw 로 글자째 받아 실행하므로 dev 에서는 catalog.js 를 고치면 HMR 로 바로 바뀐다.
 */
import catalogSrc from '../docs/catalog.js?raw'

function evalCatalog(src) {
  // var MOCAREACT_CATALOG = {…} 한 덩어리 — 바깥 값을 건드리지 않게 함수 안에서 돌린다
  return new Function(src + '\n;return MOCAREACT_CATALOG;')()
}

export const CATALOG = evalCatalog(catalogSrc)

/* 카탈로그에 컴포넌트 항목이 따로 없는 공개 export — 자동 import 용(무엇을 어느 패키지에서 가져오나) */
const EXTRA_EXPORTS = {
  useSelect: '@teammoca/react-tran',
  configureTran: '@teammoca/react-tran',
  MocaReactMsgHost: '@teammoca/react-msgbox',
  MocaReactPopupHost: '@teammoca/react-popup',
  mdate: '@teammoca/react-input-calendar',
}

const IDENT = /^[A-Za-z_$][\w$]*$/

/** 컴포넌트 이름 → { name, pkg, desc, usage, attrs: [{name, desc, event}], methods: [{name, sig, desc}] } */
export const COMPONENTS = {}
/** 함수 묶음(tran·msgbox·popup) → { name, pkg, desc, methods } */
export const MODULES = {}
/** export 이름 → 패키지 */
export const EXPORTS = { ...EXTRA_EXPORTS }

for (const [name, c] of Object.entries(CATALOG.components || {})) {
  EXPORTS[name] = c.pkg
  const attrs = []
  for (const p of Object.values(c.props || {})) {
    const n = String(p.prop || '').split('(')[0].trim()
    if (IDENT.test(n)) attrs.push({ name: n, desc: p.desc || '', event: false })
  }
  for (const [k, e] of Object.entries(c.events || {})) {
    const n = String(e.prop || k).trim()
    if (IDENT.test(n)) attrs.push({ name: n, desc: e.desc || '', event: true })
  }
  // 컬럼 정의처럼 하위 키를 쓰는 항목(columns[].align) — 객체 리터럴 안에서 보조로 쓴다
  const subKeys = []
  for (const p of Object.values(c.props || {})) {
    const m = /\[\]\.([A-Za-z_$][\w$]*)/.exec(String(p.prop || ''))
    if (m) subKeys.push({ name: m[1], desc: p.desc || '', of: String(p.prop).split('[')[0] })
  }
  const methods = Object.entries(c.methods || {})
    .filter(([k]) => IDENT.test(k))
    .map(([k, m]) => ({ name: k, sig: m.sig || k + '()', desc: m.desc || '' }))
  const rec = { name, pkg: c.pkg, desc: c.desc || '', usage: c.usage || '', attrs, subKeys, methods }
  if (c.kind === '모듈') MODULES[name] = rec
  else COMPONENTS[name] = rec
}

/** 「예) 코드」 를 떼어 설명과 예를 나눈다 — 문서 생성기와 같은 규칙 */
export function splitExample(desc) {
  const i = String(desc || '').lastIndexOf(' 예) ')
  if (i < 0) return { text: desc || '', example: '' }
  return { text: desc.slice(0, i), example: desc.slice(i + 4) }
}
