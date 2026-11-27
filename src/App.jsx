import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MocaReactMdi } from '@teammoca/react-mdi'
import { configureTran, tran } from '@teammoca/react-tran'
import { MocaReactMsgHost, msgbox } from '@teammoca/react-msgbox'
import { MocaReactPopupHost, popup } from '@teammoca/react-popup'
import { MocaReactSearchCombo } from '@teammoca/react-search-combo'
import menus from './screens/registry'
import { THEMES, getTheme, setTheme, watchSystem } from './theme'
import ErrorBoundary from './ErrorBoundary'
import ComLogin from './screens/com/ComLogin'
import './App.css'

// 로그인 직후 열어 둘 화면 — 빈 MDI 대신 바로 볼 것을 준다(MOCA frame 의 초기 화면 오픈과 같은 컨셉).
// registry 의 그룹 key · 화면 key 로 가리킨다. 다른 화면으로 바꾸려면 여기만 고치고,
// 빈 화면으로 시작하고 싶으면 null 로 둔다.
const INITIAL_SCREEN = { group: 'sample', screen: 'gridtest' }

// 데모 앱 셸 — MOCA 처럼 2단 메뉴 구조 + MOCA 서버 세션 인증.
// 상단 메뉴바가 1단(그룹), 좌측 메뉴가 선택된 그룹의 2단(화면) 목록.
// 좌측 메뉴에서 화면을 열면 MocaReactMdi 탭으로 표시된다.
// 탭 목록(tabs)은 여기(부모)가 소유하고, MDI 는 분할/드래그 이동/활성화를 담당한다.
//
// 데이터는 MOCA 서버(Spring Boot 8080)의 공용 쿼리 API 를 그대로 쓴다 —
// 개발 중에는 Vite 프록시가 /common 을 8080 으로 넘겨 동일 출처를 유지한다(vite.config.js).
// 부팅 시 세션을 확인해(MOCA index.html 의 sessionchk 대응) 미로그인이면 로그인 화면만 보여준다.
function App() {
  const [tabs, setTabs] = useState([])
  const [groupKey, setGroupKey] = useState(menus[0].key)
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false) // 모바일(≤768px) 햄버거 드로어
  // 지금 보이는 화면 key 목록 — MDI 가 알려준다(분할 중이면 둘). 좌측 메뉴에서
  // "열려 있음(open)"과 "지금 보고 있음(active)"을 다르게 칠하는 데 쓴다
  const [activeKeys, setActiveKeys] = useState([])

  // 테마 — 실제 적용은 index.html 부트 스크립트가 페인트 전에 이미 해 뒀다.
  // 여기서는 그 저장값을 읽어 셀렉트에 표시하고, '시스템'인 동안 OS 변화를 따라간다
  const [theme, setThemeState] = useState(getTheme)
  useEffect(() => watchSystem(theme), [theme])
  const [auth, setAuth] = useState({ state: 'checking', user: null }) // checking | out | in
  const mdiRef = useRef(null)

  const group = menus.find((g) => g.key === groupKey)

  // 세션 확인(부팅) + 인증 실패 시 로그인 화면으로 되돌리는 통로 연결.
  // 통신 레이어가 401 을 받으면 onAuthFail 이 호출된다 — 화면들은 신경 쓰지 않는다
  useEffect(() => {
    configureTran({
      onAuthFail: () => setAuth({ state: 'out', user: null }),
      onCsrfFail: () => window.alert('보안 토큰이 유효하지 않습니다. 새로고침 후 다시 시도해 주세요.'),
    })
    tran
      .sessionCheck()
      .then(({ logined, user }) => setAuth({ state: logined ? 'in' : 'out', user }))
      .catch(() => setAuth({ state: 'out', user: null })) // 서버 미기동 등 — 로그인 화면에서 재시도
  }, [])

  /* 로그아웃 — 되돌릴 수 없는 동작(열린 화면이 전부 닫히고 세션이 끊긴다)이라 한 번 묻는다.
     열려 있는 화면 수를 같이 보여준다 — "그냥 로그아웃"과 "작업 중이던 화면들이 사라짐"은
     사용자에게 무게가 다르다 (msgbox 는 MOCA moca.$g.confirm 이식) */
  const logout = async () => {
    const opened = tabs.length
    const msg = opened > 0
      ? `열려 있는 화면 ${opened}개가 닫힙니다.\n로그아웃하시겠습니까?`
      : '로그아웃하시겠습니까?'
    if (!(await msgbox.confirm(msg))) return
    try { await tran.logout() } catch { /* 이미 끊긴 세션 — 화면 전환만 하면 된다 */ }
    popup.closeAll() // 열려 있던 팝업은 화면과 함께 정리한다
    setTabs([])
    setAuth({ state: 'out', user: null })
  }

  /* 좌측 메뉴에서 화면 닫기 — 그 화면을 보고 있지 않은 채 지우는 동작이라 한 번 묻는다
     (모바일은 탭바가 없어 이것이 유일한 닫기 수단이고, × 는 메뉴 항목과 붙어 있어 오폭이 쉽다).
     탭바의 × 는 그 화면을 보면서 누르는 것이라 묻지 않는다 — MDI 가 바로 닫는다 */
  const closeScreenFromMenu = async (screen) => {
    if (!(await msgbox.confirm(`[${screen.title}] 화면을 닫으시겠습니까?`))) return
    setTabs((ts) => ts.filter((t) => t.key !== screen.key))
  }

  const openScreen = useCallback((screen, grp) => {
    setTabs((ts) => {
      if (ts.some((t) => t.key === screen.key)) return ts
      const Screen = screen.component
      // 메뉴정보 주입 — MOCA frame 의 getParameter() 대응. 화면은 props 로 받아
      // 공통 타이틀(ComTitle) 등에 쓰고, 필요 없으면 무시하면 된다
      const menuInfo = {
        id: screen.key,
        label: screen.title,
        icon: screen.icon,
        path: [grp.title, screen.title],
      }
      return [...ts, {
        key: screen.key,
        title: `${screen.icon} ${screen.title}`,
        // 화면은 lazy 컴포넌트(registry) — 탭을 처음 열 때 청크를 받아온다.
        // 받는 동안(보통 수십 ms) Suspense fallback 표시 — MOCA frame 로딩과 같은 컨셉.
        // ErrorBoundary 로 탭 단위 오류 격리 — 한 화면이 죽어도 셸·다른 탭은 산다
        content: (
          <ErrorBoundary>
            <Suspense fallback={<div className="mdi-screen-loading">화면 로딩중…</div>}>
              <Screen menuInfo={menuInfo} />
            </Suspense>
          </ErrorBoundary>
        ),
      }]
    })
    mdiRef.current?.activate(screen.key) // 이미 열린 화면이면 활성화만 (새 탭은 자동 활성화)
  }, [])

  /* ── 헤더 메뉴 검색 (MOCA demo 헤더의 searchCombo 메뉴검색 이식) ──
     메뉴가 2단이라 "그 화면이 어느 그룹에 있는지" 를 알아야 열 수 있는데, 화면이 늘어날수록
     그게 부담이 된다. 검색은 그 단계를 건너뛴다 — 이름 몇 글자면 바로 열린다.
     표시문구에 [화면키] 아이콘 제목 — 그룹 을 전부 넣어 어느 것으로 타이핑해도 걸리게 한다
     (SearchCombo 의 필터는 표시문구 부분일치라, 검색시킬 값은 문구 안에 있어야 한다).
     MOCA 는 여기에 화면 파일명(TPL011)을 넣는데, React 판에서 그 자리에 해당하는 것이
     registry 의 화면 key 라 코드 자리에 그대로 쓴다. */
  const menuSearchList = useMemo(
    () => menus.flatMap((g) => g.children.map((s) => ({
      cd: s.key,
      nm: `[${s.key}] ${s.icon} ${s.title} — ${g.title}`,
    }))),
    [],
  )

  /* 검색에서 고른 화면 열기 — 탭을 열고 좌측 메뉴를 그 화면의 그룹으로 맞춘다
     (MOCA fn_menuSearchOpen 의 트리 선택 동기화에 해당). 모바일에서는 드로어를 비켜준다 */
  const openScreenByKey = useCallback((key) => {
    for (const g of menus) {
      const s = g.children.find((c) => c.key === key)
      if (!s) continue
      setGroupKey(g.key)
      openScreen(s, g)
      setDrawerOpen(false)
      return
    }
  }, [openScreen])

  /* 로그인 직후 첫 화면 열기.
     auth.state 가 'in' 이 되는 순간에만 돌므로, 사용자가 그 탭을 닫아도 다시 열리지 않는다
     (tabs 가 비었는지로 판단하면 닫을 때마다 되살아나 사용자와 싸우게 된다).
     로그아웃하면 tabs 를 비우고 'out' 으로 돌아가므로, 다시 로그인하면 또 열린다. */
  useEffect(() => {
    if (auth.state !== 'in') return
    // MOCA React Studio 미리보기 — 주소에 ?open=<화면 key> 가 있으면 첫 화면 대신 그 화면을 연다
    const openKey = new URLSearchParams(window.location.search).get('open')
    if (openKey) { openScreenByKey(openKey); return }
    if (!INITIAL_SCREEN) return
    const grp = menus.find((g) => g.key === INITIAL_SCREEN.group)
    const scr = grp?.children.find((s) => s.key === INITIAL_SCREEN.screen)
    if (!scr) return // registry 에서 화면이 빠졌거나 key 가 바뀐 경우 — 빈 화면으로 둔다
    setGroupKey(grp.key) // 좌측 메뉴도 그 화면이 속한 그룹으로 맞춘다
    openScreen(scr, grp)
  }, [auth.state, openScreen, openScreenByKey])

  /* 스튜디오가 미리보기 창(iframe)에 「이 화면을 열어라」를 보낸다 — 다시 싣지 않고 탭만 연다.
     같은 출처에서 온 것만 받는다(다른 사이트가 이 앱을 iframe 에 넣고 화면을 열지 못하게) */
  useEffect(() => {
    if (auth.state !== 'in') return
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'moca-studio-open' && typeof e.data.key === 'string') openScreenByKey(e.data.key)
    }
    window.addEventListener('message', onMsg)
    // 스튜디오에 「로그인 끝 — 이제 열 수 있다」를 알린다(로그인 전에 보낸 열기 요청은 받을 곳이 없었다)
    if (window.parent !== window) window.parent.postMessage({ type: 'moca-studio-ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMsg)
  }, [auth.state, openScreenByKey])

  /* 모바일 드로어 닫기 통로 — ESC, 그리고 데스크톱 폭으로 넓어졌을 때.
     드로어는 ≤768px 에서만 오버레이라, 열어 둔 채 넓히면 상태만 남아 다시 좁혔을 때
     느닷없이 열린 화면이 된다. 폭이 넘어가는 순간 정리한다. */
  useEffect(() => {
    if (!drawerOpen) return
    const mq = window.matchMedia('(max-width: 768px)')
    const close = () => setDrawerOpen(false)
    const onKey = (e) => { if (e.key === 'Escape') close() }
    const onWidth = () => { if (!mq.matches) close() }
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onWidth)
    return () => {
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onWidth)
    }
  }, [drawerOpen])

  // 메시지박스 호스트 — 앱에 한 번만. 어느 화면에서든 msgbox.alert/confirm 을 부를 수 있게 한다
  // (로그인 화면에서도 필요하므로 게이트보다 앞에 둔다)
  if (auth.state === 'checking') {
    return <><MocaReactMsgHost /><div className="mdi-boot">세션 확인중…</div></>
  }
  if (auth.state === 'out') {
    return <><MocaReactMsgHost /><ComLogin onSuccess={(user) => setAuth({ state: 'in', user })} /></>
  }

  return (
    <div className="mdi-shell">
      <MocaReactMsgHost />
      <MocaReactPopupHost />
      <header className="mdi-menubar">
        {/* 햄버거 — 모바일에서만 보인다(CSS). 좌측 메뉴를 오버레이 드로어로 연다 */}
        <button
          type="button"
          className={`mdi-hamburger${drawerOpen ? ' is-open' : ''}`}
          aria-label="메뉴"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
        <span className="mdi-logo">☕ MOCA React</span>
        <nav className="mdi-menu">
          {menus.map((g) => (
            <button
              key={g.key}
              className={g.key === groupKey ? 'active' : ''}
              onClick={() => setGroupKey(g.key)}
            >
              {g.icon} {g.title}
            </button>
          ))}
        </nav>
        {/* 메뉴 검색 — 화면키·제목·그룹 어느 것으로 타이핑해도 걸리고, 고르면 그 화면 탭이 열린다.
            좁은 폭(≤768px)에서는 48px 헤더에 자리가 없어 드로어 안으로 내려간다(CSS) —
            MOCA 는 모바일에서 헤더 검색을 그냥 숨기지만(mobile.css), 여기서는 테마 셀렉트와
            같은 방식으로 드로어에 자리를 만들어 기능을 남긴다 */}
        <MocaReactSearchCombo
          className="mdi-menu-search"
          list={menuSearchList}
          clearOnSelect
          placeholder="메뉴 검색 (이름·화면키)"
          emptyText="해당하는 메뉴가 없습니다"
          onChange={openScreenByKey}
        />
        <div className="mdi-user">
          <span>{auth.user?.U_NAME ?? auth.user?.U_ID ?? ''} 님</span>
          <button onClick={logout}>로그아웃</button>
        </div>
      </header>

      {/* 드로어 backdrop — 드로어가 헤더까지 덮으므로(햄버거가 가려진다) 닫는 통로는 여기와 ESC */}
      <div
        className={`mdi-drawer-backdrop${drawerOpen ? ' on' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <div className="mdi-body">
        <aside className={`mdi-sidebar${collapsed ? ' collapsed' : ''}${drawerOpen ? ' mob-open' : ''}`}>
          {/* 메뉴 검색(모바일) — 헤더 것과 같은 목록·같은 동작. 데스크톱에서는 CSS 로 숨긴다.
              인스턴스를 둘 두는 이유는 헤더와 드로어가 서로 다른 컨테이너라 한 벌을 옮겨 다닐
              수 없기 때문이고, 각자 입력 상태만 갖고 결과는 같은 openScreenByKey 로 모인다 */}
          <MocaReactSearchCombo
            className="mdi-menu-search-mob"
            list={menuSearchList}
            clearOnSelect
            placeholder="메뉴 검색 (이름·화면키)"
            emptyText="해당하는 메뉴가 없습니다"
            onChange={openScreenByKey}
          />
          {/* 테마 선택 — 좌측 메뉴 맨 위 (MOCA 는 헤더에 있지만, 여기 헤더는 48px 이라
              모바일에서 자리가 없다. 메뉴는 데스크톱·드로어 양쪽에서 같은 자리다) */}
          {(!collapsed || drawerOpen) && (
            <div className="mdi-theme">
              <label htmlFor="mdi-theme-sel">테마</label>
              <select
                id="mdi-theme-sel"
                value={theme}
                onChange={(e) => { setThemeState(e.target.value); setTheme(e.target.value) }}
              >
                {THEMES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
          {/* 1단(그룹) — 모바일 드로어 안에서만 보인다(CSS). 데스크톱은 상단 메뉴바가 맡는다.
              그룹만 바꾸는 것은 화면을 여는 동작이 아니므로 드로어를 닫지 않는다 */}
          <nav className="mdi-sidebar-groups">
            {menus.map((g) => (
              <button
                key={g.key}
                className={g.key === groupKey ? 'active' : ''}
                onClick={() => setGroupKey(g.key)}
              >
                {g.icon} {g.title}
              </button>
            ))}
          </nav>
          <div className="mdi-sidebar-head">
            {(!collapsed || drawerOpen) && <span className="mdi-sidebar-title">{group.title}</span>}
            <button
              className="mdi-sidebar-toggle"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
            >
              {collapsed ? '»' : '«'}
            </button>
          </div>
          {/* 드로어로 열렸을 때는 접기 상태(collapsed)를 무시한다 — 데스크톱에서 접어 둔 채
              모바일로 넘어오면 목록이 통째로 없는 빈 드로어가 된다 */}
          {(!collapsed || drawerOpen) && (
            <ul className="mdi-sidebar-list">
              {group.children.map((s) => {
                const isOpen = tabs.some((t) => t.key === s.key)
                return (
                  <li key={s.key}>
                    <button
                      className={
                        (activeKeys.includes(s.key) ? 'active' : '') + (isOpen ? ' open' : '')
                      }
                      onClick={() => {
                        openScreen(s, group)
                        setDrawerOpen(false) // 화면을 열면 드로어는 비켜준다(모바일 전용 동작)
                      }}
                    >
                      {s.icon} {s.title}
                    </button>
                    {/* 닫기 — 열려 있는 화면에만. 모바일은 탭바가 없어(U6) 여기가 유일한 닫기 수단이다.
                        메뉴 버튼 안에 넣으면 button 중첩이라 형제로 두고 위에 겹쳐 놓는다 */}
                    {isOpen && (
                      <button
                        type="button"
                        className="mdi-sidebar-close"
                        title={`${s.title} 닫기`}
                        aria-label={`${s.title} 닫기`}
                        onClick={() => closeScreenFromMenu(s)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <main className="mdi-main">
          <MocaReactMdi
            ref={mdiRef}
            tabs={tabs}
            onTabClose={(key) => setTabs((ts) => ts.filter((t) => t.key !== key))}
            onActiveChange={setActiveKeys}
            emptyHint="좌측 메뉴에서 화면을 선택하면 탭으로 열립니다"
          />
        </main>
      </div>
    </div>
  )
}

export default App
