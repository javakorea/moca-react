/*
 * MOCA React Studio — 개발 서버(vite dev) 전용 플러그인
 * ======================================================
 * 스튜디오(studio.html)가 이 저장소의 파일을 읽고 쓰게 하는 작은 파일 API 와,
 * 편집기(Monaco) 파일을 형제 저장소 moca2026ai 의 vendor 에서 그대로 내주는 통로를 붙인다.
 *
 *   GET  /__studio/fs/ping              → { ok, root }
 *   GET  /__studio/fs/list              → { files: ['src/App.jsx', …] }  (보이는 폴더만)
 *   GET  /__studio/fs/read?path=…       → 글자 그대로
 *   POST /__studio/fs/write?path=…      → 본문을 그 파일에 쓴다(새 파일이면 폴더도 만든다)
 *   GET  /vendor/monaco-editor_0.52.2/… → moca2026ai 의 vendor 사본 (운영은 같은 주소에 이미 있다)
 *
 * 저장하면 vite 가 파일 변경을 보고 HMR 로 미리보기(iframe 의 앱)를 그 자리에서 갱신한다.
 * ★ dev 서버에서만 붙는다(configureServer) — 빌드 결과에는 이 API 가 없다. 운영 스튜디오는 로컬 폴더로 연다.
 *
 * 울타리 — 개발 PC 의 파일을 쓰는 창구라 좁게 둔다:
 *   ① 루프백에서 온 요청만 ② 커스텀 헤더 X-Moca-Studio 필수(다른 사이트의 단순 요청·폼은 못 붙인다)
 *   ③ Origin 이 있으면 이 서버 자신이어야 한다 ④ 경로는 저장소 안 · 보이는 폴더 안 · 허용 확장자만
 */
import fs from 'node:fs'
import path from 'node:path'

const VISIBLE_DIRS = ['src', 'packages', 'docs', 'studio', 'public', 'tools']
const VISIBLE_ROOT_FILES = ['index.html', 'studio.html', 'vite.config.js', 'package.json']
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vite'])
const WRITE_EXT = new Set(['.jsx', '.js', '.cjs', '.mjs', '.css', '.json', '.md', '.html', '.svg', '.txt'])
const MONACO = 'monaco-editor_0.52.2'

const isLoopback = (a) => a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1'

function walk(root, rel, out) {
  const abs = path.join(root, rel)
  let ents
  try { ents = fs.readdirSync(abs, { withFileTypes: true }) } catch { return }
  for (const e of ents) {
    if (SKIP_DIRS.has(e.name)) continue
    const r = rel ? rel + '/' + e.name : e.name
    if (e.isDirectory()) walk(root, r, out)
    else if (e.isFile()) out.push(r)
  }
}

/** 저장소 안의 보이는 파일인지 — 아니면 null */
function safePath(root, p) {
  if (!p || typeof p !== 'string') return null
  const norm = p.replace(/\\/g, '/').replace(/^\/+/, '')
  if (norm.split('/').some((s) => s === '..' || s === '' || SKIP_DIRS.has(s))) return null
  const top = norm.split('/')[0]
  if (!VISIBLE_DIRS.includes(top) && !VISIBLE_ROOT_FILES.includes(norm)) return null
  const abs = path.resolve(root, norm)
  if (!abs.startsWith(path.resolve(root) + path.sep)) return null
  return { norm, abs }
}

function monacoDir(root) {
  const env = process.env.MOCA_MONACO_DIR
  if (env) return env
  return path.resolve(root, '..', 'moca2026ai', 'src', 'main', 'webapp', 'vendor', MONACO)
}

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.html': 'text/html' }

export default function studioPlugin() {
  let root = process.cwd()
  return {
    name: 'moca-react-studio',
    apply: 'serve',
    configResolved(cfg) { root = cfg.root },
    configureServer(server) {
      // 편집기 파일 — 운영(teammoca.co.kr)은 /vendor/monaco-editor_0.52.2/ 에 이미 있으므로 같은 주소로 맞춘다
      server.middlewares.use('/vendor/' + MONACO, (req, res, next) => {
        const dir = monacoDir(root)
        const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '')
        const abs = path.resolve(dir, rel)
        if (!abs.startsWith(path.resolve(dir) + path.sep) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return next()
        res.setHeader('Content-Type', MIME[path.extname(abs)] || 'application/octet-stream')
        fs.createReadStream(abs).pipe(res)
      })

      server.middlewares.use('/__studio/fs', (req, res) => {
        const send = (code, body, type = 'application/json; charset=utf-8') => {
          res.statusCode = code
          res.setHeader('Content-Type', type)
          res.setHeader('Cache-Control', 'no-store')
          res.end(typeof body === 'string' ? body : JSON.stringify(body))
        }
        if (!isLoopback(req.socket.remoteAddress)) return send(403, { error: '이 PC 에서만 쓸 수 있습니다' })
        if (req.headers['x-moca-studio'] !== '1') return send(403, { error: 'X-Moca-Studio 헤더가 없습니다' })
        const origin = req.headers.origin
        if (origin && origin !== 'http://' + req.headers.host) return send(403, { error: '다른 출처의 요청입니다' })

        const url = new URL(req.url || '/', 'http://x')
        const op = url.pathname.replace(/^\/+/, '')
        try {
          if (op === 'ping') return send(200, { ok: true, root: path.basename(root) })
          if (op === 'list') {
            const files = []
            for (const d of VISIBLE_DIRS) walk(root, d, files)
            for (const f of VISIBLE_ROOT_FILES) if (fs.existsSync(path.join(root, f))) files.push(f)
            files.sort()
            return send(200, { files })
          }
          const sp = safePath(root, url.searchParams.get('path'))
          if (!sp) return send(400, { error: '열 수 없는 경로입니다' })
          if (op === 'read' && req.method === 'GET') {
            if (!fs.existsSync(sp.abs)) return send(404, { error: '파일이 없습니다' })
            return send(200, fs.readFileSync(sp.abs, 'utf8'), 'text/plain; charset=utf-8')
          }
          if (op === 'write' && req.method === 'POST') {
            if (!WRITE_EXT.has(path.extname(sp.abs).toLowerCase())) return send(400, { error: '쓸 수 없는 확장자입니다' })
            const chunks = []
            req.on('data', (c) => chunks.push(c))
            req.on('end', () => {
              try {
                fs.mkdirSync(path.dirname(sp.abs), { recursive: true })
                fs.writeFileSync(sp.abs, Buffer.concat(chunks).toString('utf8'), 'utf8')
                send(200, { ok: true, path: sp.norm })
              } catch (e) { send(500, { error: e.message }) }
            })
            return
          }
          return send(404, { error: '모르는 요청입니다' })
        } catch (e) {
          return send(500, { error: e.message })
        }
      })
    },
  }
}
