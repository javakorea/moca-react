// MOCA React Tran — MOCA 공용 쿼리 API 통신 레이어 (MOCA moca.$t.tran.exe 대응)
//
// 서버(ProjectQueryController)는 queryId 기반 API 3개를 제공한다:
//   POST /common/select.do     { queryId, body }  → { result, list1, [list2…], body }
//   POST /common/selectone.do  { queryId, body }  → { result, data1 }
//   POST /common/save.do       { insertQueryId, updateQueryId, deleteQueryId, list } → { savedList }
// 화면은 SQL 을 모르고 queryId 만 안다 — SQL 은 서버 매퍼(MocaMapper.xml)에 있다.
//
// ── 이 레이어가 화면 대신 처리하는 것 (MOCA 엔진이 하던 일) ──
//   · CSRF : 서버가 쿠키 MOCA-CSRF-TOKEN 으로 내려준 토큰을 헤더 X-CSRF-TOKEN 으로 되돌린다
//            (POST 전부 대상 — 안 보내면 403). 화면은 신경 쓸 것이 없다.
//   · 세션 : credentials 'same-origin' — JSESSIONID 쿠키가 실린다. 개발 환경에서는 Vite
//            프록시가 /common 을 8080 으로 넘겨 동일 출처를 유지한다(vite.config.js).
//   · 인증/보안 실패 : 401(미로그인·세션만료) → onAuthFail, 403(CSRF) → onCsrfFail 콜백.
//            앱이 로그인 화면 전환 등을 여기 연결한다(configureTran).
//   · 결과 정규화 : select 는 rows 배열을 바로 돌려준다(list1 언랩). 서버가 컬럼 키를
//            대문자로도 함께 주므로(MapResultNormalizeInterceptor) row.SALE_AMT 로 읽는다.
//
// 사용 예)
//   const rows = await tran.select('selectTdemoSaleDtlList', { REGION_NM: '서울' })
//   const { list1, list2 } = await tran.selectMulti(['selectA', 'selectB'], { selectA: {...} })
//   await tran.save({ insertQueryId: 'insertX', list: rows })

const cfg = {
  base: '', // API 경로 접두어 — 서버 context-path 가 다르면 지정
  onAuthFail: null, // () => void — 401
  onCsrfFail: null, // () => void — 403
}

/** 앱 시작 시 1회 설정 (인증 실패 시 로그인 화면 전환 등) */
export function configureTran(options) {
  Object.assign(cfg, options)
}

/** 쿠키에서 CSRF 토큰 읽기 (MOCA moca.$g.csrfToken 이식) */
const csrfToken = () => {
  const m = document.cookie.match(/(?:^|;\s*)MOCA-CSRF-TOKEN=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : ''
}

/** 공통 POST — CSRF 헤더 자동 첨부 + 401/403 처리 (MOCA _fetchJson 대응) */
async function post(url, payload) {
  const headers = { 'Content-Type': 'application/json' }
  const t = csrfToken()
  if (t) headers['X-CSRF-TOKEN'] = t

  const res = await fetch(cfg.base + url, {
    method: 'POST',
    credentials: 'same-origin', // 세션 쿠키
    headers,
    body: JSON.stringify(payload ?? {}),
  })

  if (res.status === 401) {
    cfg.onAuthFail?.()
    throw new Error('AUTH_REQUIRED')
  }
  if (res.status === 403) {
    cfg.onCsrfFail?.()
    throw new Error('CSRF_INVALID')
  }
  if (!res.ok) throw new Error(`통신 실패 (HTTP ${res.status})`)

  const json = await res.json()
  // 서버가 200 으로 주는 논리 실패도 오류로 올린다(result FAIL)
  if (json?.result === 'FAIL') throw new Error(json.message || json.error || '요청이 거부되었습니다')
  return json
}

const tran = {
  /** 단일 조회 — rows 배열 반환 (list1 언랩) */
  async select(queryId, params) {
    const res = await post('/common/select.do', { queryId, body: params ?? {} })
    return res.list1 ?? []
  },

  /** 다건 조회 — { list1, list2, … } 반환. bodyMap 은 { queryId: params } 형태 */
  async selectMulti(queryIds, bodyMap) {
    const ids = Array.isArray(queryIds) ? queryIds.join(',') : queryIds
    const res = await post('/common/select.do', { queryId: ids, body: bodyMap ?? {} })
    return res.body ?? {}
  },

  /** 단건 조회 — row 객체 반환 (없으면 null) */
  async selectOne(queryId, params, preUpdateQueryId) {
    const res = await post('/common/selectone.do', {
      queryId,
      body: params ?? {},
      ...(preUpdateQueryId ? { preUpdateQueryId } : null),
    })
    return res.data1 ?? null
  },

  /** CRUD 저장 — list 각 행의 _system.status(C/U/D)에 따라 실행. savedList 반환 */
  async save({ insertQueryId = '', updateQueryId = '', deleteQueryId = '', list = [] }) {
    const res = await post('/common/save.do', { insertQueryId, updateQueryId, deleteQueryId, list })
    return res.savedList ?? []
  },

  /** 로그인 여부 확인 — 앱 부트가 가장 먼저 부른다. { logined, user } */
  async sessionCheck() {
    const res = await post('/common/sessionchk.do', {})
    return { logined: res.result === 'Y', user: res.userInfo ?? null }
  },

  /** ID/PW 로그인 — { ok, message, user } */
  async login(id, pw) {
    const res = await post('/common/login_idpw.do', { U_ID: id, U_PASS: pw })
    return { ok: res.result === 'success', message: res.message ?? '', user: res.userInfo ?? null }
  },

  async logout() {
    await post('/common/logout.do', {})
  },
}

export default tran
