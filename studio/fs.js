/*
 * 작업 공간(파일을 어디서 읽고 어디에 쓰나) — 두 가지:
 *   dev   : 이 스튜디오를 띄운 vite 개발 서버(tools/studio-plugin.js) — 저장하면 HMR 로 미리보기가 바로 바뀐다
 *   local : 이 PC 의 폴더(File System Access — Chrome·Edge). 운영 주소에서 열었을 때 쓴다(미리보기 없음)
 * 둘 다 같은 꼴: { kind, name, list(), read(path), write(path, text) }
 */

const SKIP = new Set(['node_modules', 'dist', '.git', '.vite'])
const API = '/__studio/fs/'
const H = { 'X-Moca-Studio': '1' }

async function api(op, opt = {}) {
  const r = await fetch(API + op, { ...opt, headers: { ...H, ...(opt.headers || {}) }, cache: 'no-store' })
  if (!r.ok) {
    let msg = r.status + ''
    try { msg = (await r.json()).error || msg } catch { /* 본문 없음 */ }
    throw new Error(msg)
  }
  return r
}

/** 개발 서버가 파일 API 를 주는지 — 운영(정적 배포)에서는 404 라 false */
export async function devAvailable() {
  try {
    const r = await fetch(API + 'ping', { headers: H, cache: 'no-store' })
    if (!r.ok) return null
    const j = await r.json()
    return j.ok ? j : null
  } catch { return null }
}

export function devWorkspace(info) {
  return {
    kind: 'dev',
    name: info.root + ' (개발 서버)',
    preview: true,
    async list() { return (await (await api('list')).json()).files },
    async read(path) { return (await api('read?path=' + encodeURIComponent(path))).text() },
    async write(path, text) {
      await api('write?path=' + encodeURIComponent(path), { method: 'POST', body: text, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    },
  }
}

async function walkDir(dir, prefix, out) {
  for await (const [name, h] of dir.entries()) {
    if (SKIP.has(name)) continue
    const p = prefix ? prefix + '/' + name : name
    if (h.kind === 'directory') await walkDir(h, p, out)
    else out.push(p)
  }
}

async function handleFor(dir, path, create) {
  const parts = path.split('/')
  let d = dir
  for (let i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i], { create })
  return d.getFileHandle(parts[parts.length - 1], { create })
}

export async function pickLocalWorkspace() {
  if (!window.showDirectoryPicker) throw new Error('이 브라우저는 로컬 폴더 열기를 지원하지 않습니다 (Chrome·Edge 에서 열어 주세요)')
  const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
  return {
    kind: 'local',
    name: dir.name + ' (로컬 폴더)',
    preview: false,
    async list() { const out = []; await walkDir(dir, '', out); return out.sort() },
    async read(path) { return (await (await handleFor(dir, path, false)).getFile()).text() },
    async write(path, text) {
      const w = await (await handleFor(dir, path, true)).createWritable()
      await w.write(text)
      await w.close()
    },
  }
}
