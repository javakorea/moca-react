/*
 * 화면 레지스트리(src/screens/registry.jsx) 읽기·고치기 — 스튜디오가 「이 파일이 어느 메뉴 화면인가」를 알고
 * 새 화면을 메뉴에 등록하는 데 쓴다. 규약은 moca-react-screen 스킬과 같다:
 *   const 이름 = lazy(() => import('./이름'))      ← lazy 선언 한 줄
 *   { key, title, icon, component: 이름 }          ← 그룹 children 에 한 줄
 */
export const REGISTRY_PATH = 'src/screens/registry.jsx'

export function parseRegistry(text) {
  const lazies = {}
  for (const m of text.matchAll(/const\s+([\w$]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)\s*\)/g)) lazies[m[1]] = m[2]
  const groups = []
  const gRe = /key:\s*'([^']+)',\s*title:\s*'([^']*)',\s*icon:\s*'([^']*)',\s*children:\s*\[/g
  const marks = []
  for (const m of text.matchAll(gRe)) marks.push({ index: m.index, key: m[1], title: m[2], icon: m[3] })
  marks.forEach((g, i) => {
    const seg = text.slice(g.index, i + 1 < marks.length ? marks[i + 1].index : text.length)
    const screens = []
    for (const s of seg.matchAll(/\{\s*key:\s*'([^']+)',\s*title:\s*'([^']*)',\s*icon:\s*'([^']*)',\s*component:\s*([\w$]+)\s*\}/g)) {
      const imp = lazies[s[4]]
      screens.push({ key: s[1], title: s[2], icon: s[3], component: s[4], file: imp ? toFile(imp) : null })
    }
    groups.push({ key: g.key, title: g.title, icon: g.icon, screens })
  })
  return { groups, lazies }
}

/** './UserList' → 'src/screens/UserList.jsx' */
function toFile(imp) {
  const rel = imp.replace(/^\.\//, '')
  return 'src/screens/' + (/\.\w+$/.test(rel) ? rel : rel + '.jsx')
}

/** 파일 경로 → 그 화면 { group, screen } */
export function screenOfFile(reg, path) {
  for (const g of reg.groups) for (const s of g.screens) if (s.file === path) return { group: g, screen: s }
  return null
}

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"

/** 새 화면 등록 — 고친 레지스트리 글자를 돌려준다(못 찾으면 오류) */
export function addScreen(text, { name, key, title, icon, group }) {
  const reg = parseRegistry(text)
  if (reg.lazies[name]) throw new Error(`이미 등록된 컴포넌트입니다: ${name}`)
  if (reg.groups.some((g) => g.screens.some((s) => s.key === key))) throw new Error(`이미 쓰는 화면 key 입니다: ${key}`)

  // ① lazy 선언 — 마지막 lazy 줄 다음
  const lazyLines = [...text.matchAll(/^const\s+[\w$]+\s*=\s*lazy\(.*$/gm)]
  if (!lazyLines.length) throw new Error('lazy 선언 줄을 찾지 못했습니다')
  const lastLazy = lazyLines[lazyLines.length - 1]
  const lazyAt = lastLazy.index + lastLazy[0].length
  text = text.slice(0, lazyAt) + `\nconst ${name} = lazy(() => import('./${name}'))` + text.slice(lazyAt)

  // ② 그룹 children 끝 — 여는 [ 부터 짝 맞는 ] 앞에 한 줄
  const gm = new RegExp(`key:\\s*'${group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s*title:\\s*'[^']*',\\s*icon:\\s*'[^']*',\\s*children:\\s*\\[`).exec(text)
  if (!gm) throw new Error(`그룹을 찾지 못했습니다: ${group}`)
  let i = gm.index + gm[0].length, depth = 1
  for (; i < text.length; i++) {
    if (text[i] === '[') depth++
    else if (text[i] === ']') { depth--; if (depth === 0) break }
  }
  const lineStart = text.lastIndexOf('\n', i) + 1
  const body = text.slice(gm.index + gm[0].length, lineStart)
  const indent = (/\n([ \t]+)\{/.exec(body) || [])[1] || '      '
  const entry = `${indent}{ key: ${q(key)}, title: ${q(title)}, icon: ${q(icon)}, component: ${name} },\n`
  return text.slice(0, lineStart) + entry + text.slice(lineStart)
}

/* ── 새 화면 템플릿 — 모든 화면은 같은 골격(moca-react-screen 스킬: ComTitle + MocaReactLayout) ── */
export const TEMPLATES = [
  {
    id: 'blank',
    label: '빈 화면',
    desc: '제목줄 + 내용 칸 하나',
    make: ({ name, title }) => `import { MocaReactLayout } from '@teammoca/react-layout'
import ComTitle from './com/ComTitle'

// ${title}
function ${name}({ menuInfo }) {
  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />
        <div>내용</div>
      </MocaReactLayout>
    </div>
  )
}

export default ${name}
`,
  },
  {
    id: 'list',
    label: '목록(조회 그리드)',
    desc: '제목줄 + 서버 조회 그리드 — queryId 로 MOCA 서버(8080)를 부른다',
    make: ({ name, title, queryId }) => `import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import { useSelect } from '@teammoca/react-tran'
import ComTitle from './com/ComTitle'

// ${title} — queryId ${queryId || '(정할 것)'} 로 조회한다
const columns = [
  { key: 'ID', title: 'ID', width: 90, align: 'center' },
  { key: 'NAME', title: '이름' },
]

function ${name}({ menuInfo }) {
  const { rows, loading, error, reload } = useSelect('${queryId || 'selectXxxList'}')

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} onRefresh={reload} />
        <MocaReactGrid
          label={\`${title}\${loading ? ' (조회중…)' : error ? \` (실패: \${error.message})\` : ''}\`}
          columns={columns}
          data={rows}
          search
        />
      </MocaReactLayout>
    </div>
  )
}

export default ${name}
`,
  },
]
