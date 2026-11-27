import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import studioPlugin from './tools/studio-plugin.js'

const here = path.dirname(fileURLToPath(import.meta.url))

/* docs/*.html 을 빌드 결과에 함께 넣는다 — 배포본(dist)만 옮기면 문서까지 따라가게.
   MOCA 가 문서를 엔진 옆(vendor/moca/docs/)에 두는 것과 같은 자리다:
   여기서는 앱과 함께 /system/react/docs/ 로 올라가 홈페이지가 그 주소로 링크를 건다.
   (dev 서버에서는 vite 가 프로젝트 루트를 서빙하므로 /docs/... 로 바로 열린다) */
const copyDocs = () => ({
  name: 'moca-react-copy-docs',
  closeBundle() {
    const from = path.join(here, 'docs')
    const to = path.join(here, 'dist', 'docs')
    fs.mkdirSync(to, { recursive: true })
    for (const f of fs.readdirSync(from)) {
      if (!f.endsWith('.html')) continue // catalog.js 는 생성 소스라 배포하지 않는다
      fs.copyFileSync(path.join(from, f), path.join(to, f))
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyDocs(), studioPlugin()],
  // 빌드 결과의 자원 참조를 상대경로로 — dist 를 WAS 의 어느 경로에 올려도 그대로 돈다
  // (/system/react/ 든 다른 경로든 index.html 기준으로 ./assets/... 를 찾는다).
  // 절대경로(base:'/...')로 박으면 배포 경로가 바뀔 때마다 재빌드해야 하고,
  // 개발 서버 주소까지 그 경로로 끌려간다. 라우터가 없어(주소가 안 변한다) 상대경로가 안전하다.
  base: './',
  build: {
    /* 소스맵은 끈다 — 배포본 크기가 몇 배로 커진다. 스택 추적이 필요하면 로컬에서 잠깐 켠다. */
    sourcemap: false,
    /* 입구 둘 — 앱(index.html)과 MOCA React Studio(studio.html → studio/).
       스튜디오는 앱과 같은 배포본에 실려 /system/react/studio.html 로 열린다 */
    rollupOptions: {
      input: {
        main: path.join(here, 'index.html'),
        studio: path.join(here, 'studio.html'),
      },
    },
  },
  resolve: {
    // React 사본을 하나로 고정 — workspaces 패키지(@teammoca/*)가 각자 react 를 해석하면
    // 사본이 둘이 되어 "Invalid hook call / more than one copy of React" 로 화면이 죽는다.
    // (새 패키지를 추가한 직후 실제로 겪음 — 캐시를 지워도 재발 가능하므로 구조적으로 막는다)
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // MOCA 서버(Spring Boot 8080)로 통신 API 프록시 —
    // 브라우저 입장에서는 전부 5173 동일 출처가 되어 세션(JSESSIONID)·CSRF 쿠키가
    // 그대로 동작한다(교차 출처면 쿠키·CSRF 가 막힌다).
    // 운영에서는 dist 를 같은 WAS 에 올리므로 자연히 동일 출처 — 프록시는 개발용.
    proxy: {
      '/common': {
        target: 'http://localhost:8080',
        changeOrigin: false, // 세션 쿠키의 도메인이 바뀌지 않게 그대로 전달
      },
    },
  },
})
