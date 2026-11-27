/*
 * 편집기(Monaco) 싣기 + MOCA React 자동완성·호버
 * Monaco 는 npm 으로 번들하지 않고 MOCA 서버에 이미 있는 사본(/vendor/monaco-editor_0.52.2/)을 AMD 로 싣는다 —
 * 운영(teammoca.co.kr)은 그 주소에 그대로 있고, 개발 서버는 tools/studio-plugin.js 가 형제 저장소의 사본을 같은 주소로 내준다.
 * (번들하면 배포본이 수 MB 커진다 — 호스팅 디스크·트래픽 한도가 작다)
 */
import { COMPONENTS, MODULES, EXPORTS, splitExample } from './catalog.js'
import { outline, refMap, tagContext } from './jsx.js'

const VS = window.location.origin + '/vendor/monaco-editor_0.52.2/min/vs'
let loading = null

export function loadMonaco() {
  if (loading) return loading
  // 이미 실린 편집기(개발 중 이 파일이 HMR 로 다시 돈 경우) — 다시 싣지 않고 공급자만 새로 건다
  if (window.monaco) { setup(window.monaco); return (loading = Promise.resolve(window.monaco)) }
  loading = new Promise((resolve, reject) => {
    // 워커는 절대 URL 이어야 한다(MOCA Web Studio 와 같은 방식)
    window.MonacoEnvironment = {
      getWorkerUrl: () => URL.createObjectURL(new Blob([
        'self.MonacoEnvironment={baseUrl:' + JSON.stringify(VS.replace(/\/vs$/, '/')) + '};importScripts(' + JSON.stringify(VS + '/base/worker/workerMain.js') + ');',
      ], { type: 'text/javascript' })),
    }
    const s = document.createElement('script')
    s.src = VS + '/loader.js'
    s.onerror = () => reject(new Error('편집기 파일(/vendor/monaco-editor_0.52.2)을 불러오지 못했습니다'))
    s.onload = () => {
      window.require.config({ paths: { vs: VS }, 'vs/nls': { availableLanguages: { '*': 'ko' } } })
      window.require(['vs/editor/editor.main'], () => {
        setup(window.monaco)
        resolve(window.monaco)
      }, reject)
    }
    document.head.appendChild(s)
  })
  return loading
}

function md(desc, extra) {
  const { text, example } = splitExample(desc)
  let s = text
  if (example) s += '\n\n```jsx\n' + example + '\n```'
  if (extra) s += '\n\n' + extra
  return { value: s }
}

/** 이 파일에 그 이름을 import 하는 줄을 넣는 편집 — 이미 있으면 [] */
function importEdit(monaco, model, name) {
  const pkg = EXPORTS[name]
  if (!pkg) return []
  const text = model.getValue()
  const esc = pkg.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${esc}['"]`)
  const m = re.exec(text)
  if (m) {
    if (m[1].split(',').map((x) => x.trim()).includes(name)) return []
    // { a, b } → { a, b, name } — 마지막 이름 바로 뒤에 붙인다
    const braceStart = m.index + m[0].indexOf('{') + 1
    const at = braceStart + m[1].replace(/\s+$/, '').length
    const pos = model.getPositionAt(at)
    return [{ range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column), text: m[1].trim() ? ', ' + name : ' ' + name + ' ' }]
  }
  if (new RegExp(`\\b${name}\\b[^\\n]*from\\s*['"]`).test(text)) return []
  const imports = [...text.matchAll(/^import\b.*$/gm)]
  const line = imports.length ? model.getPositionAt(imports[imports.length - 1].index).lineNumber + 1 : 1
  return [{ range: new monaco.Range(line, 1, line, 1), text: `import { ${name} } from '${pkg}'\n` }]
}

/* 속성을 고르면 무엇을 넣나 — 카탈로그 설명에서 꼴을 읽는다(타입 정보가 따로 없다).
   불리언(「true 면」·「기본 true/false」·예가 이름뿐) → 이름만 / 예가 name="…" → 따옴표 / 그 밖 → {…} */
function attrSnippet(a) {
  if (a.event) return a.name + '={$0}'
  const { example } = splitExample(a.desc)
  if (new RegExp('(^|\\s)' + a.name + '="').test(example)) return a.name + '="$0"'
  if (new RegExp('(^|\\s)' + a.name + '\\s*$').test(example)) return a.name
  // 기본이 true 인 불리언은 끄려고 쓰는 것이라 {false} 로 넣는다(rowStatus·delCheck…)
  if (/^true\s*\(기본\)|기본\s*true/.test(a.desc)) return a.name + '={false}'
  if (/^true\s*이?면|기본\s*false/.test(a.desc)) return a.name
  return a.name + '={$0}'
}

function setup(monaco) {
  // 공급자는 한 벌만 — 다시 걸 때 앞의 것을 걷는다(안 걷으면 후보가 겹쳐 나온다)
  for (const d of window.__mocaStudioProviders || []) d.dispose()
  const reg = (window.__mocaStudioProviders = [])
  const js = monaco.languages.typescript.javascriptDefaults
  js.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    allowJs: true,
    allowNonTsExtensions: true,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  })
  // 패키지를 편집기 안에서 풀지 않으므로 「모듈을 못 찾음」 같은 뜻 검사는 끈다 — 문법 오류만 빨간 줄
  js.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false })

  const K = monaco.languages.CompletionItemKind
  reg.push(monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['<', ' ', '.'],
    provideCompletionItems(model, position) {
      const before = model.getValueInRange({ startLineNumber: Math.max(1, position.lineNumber - 200), startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column })
      const word = model.getWordUntilPosition(position)
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }

      // ① <Moca… — 컴포넌트 이름(고르면 import 도 넣는다)
      if (/<([A-Z][\w$]*)?$/.test(before)) {
        return {
          suggestions: Object.values(COMPONENTS).map((c) => ({
            label: c.name, kind: K.Class, detail: c.pkg, documentation: md(c.desc),
            insertText: c.name, range, sortText: '0' + c.name,
            additionalTextEdits: importEdit(monaco, model, c.name),
          })),
        }
      }

      // ② ref.current?.메서드 — ref={x} 로 붙인 컴포넌트를 찾아 그 메서드만
      const rm = /([\w$]+)\.current\??\.([\w$]*)$/.exec(before)
      if (rm) {
        const comp = COMPONENTS[refMap(outline(model.getValue()))[rm[1]]]
        if (!comp) return { suggestions: [] }
        return { suggestions: comp.methods.map((m) => ({ label: m.name, kind: K.Method, detail: m.sig, documentation: md(m.desc), insertText: m.name, range })) }
      }

      // ③ tran. · msgbox. · popup. — 함수 묶음
      const mm = /(?:^|[^\w$.])([\w$]+)\.([\w$]*)$/.exec(before)
      if (mm && MODULES[mm[1]]) {
        return { suggestions: MODULES[mm[1]].methods.map((m) => ({ label: m.name, kind: K.Function, detail: m.sig, documentation: md(m.desc), insertText: m.name, range })) }
      }

      // ④ 열린 컴포넌트 태그 안 — 속성·이벤트(이미 쓴 것은 빼고)
      const ctx = tagContext(before)
      if (ctx && !ctx.inValue && ctx.atNameStart) {
        const comp = COMPONENTS[ctx.tag]
        if (!comp) return { suggestions: [] }
        return {
          suggestions: comp.attrs.filter((a) => a.name === ctx.typed || !ctx.present.includes(a.name)).map((a, i) => ({
            label: a.name,
            kind: a.event ? K.Event : K.Property,
            detail: (a.event ? '이벤트 · ' : '속성 · ') + comp.name,
            documentation: md(a.desc),
            insertText: attrSnippet(a),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: (a.event ? '1' : '0') + String(i).padStart(3, '0'),
          })),
        }
      }

      // ⑤ 그 밖 — import 안 된 공개 export 이름(useSelect·msgbox 등)
      if (word.word && /^[a-zA-Z]/.test(word.word)) {
        return {
          suggestions: Object.keys(EXPORTS).filter((n) => n.toLowerCase().startsWith(word.word.toLowerCase())).map((n) => ({
            label: n, kind: COMPONENTS[n] ? K.Class : K.Function, detail: EXPORTS[n] + ' (자동 import)',
            documentation: md((COMPONENTS[n] || MODULES[n] || {}).desc || ''),
            insertText: n, range, additionalTextEdits: importEdit(monaco, model, n),
          })),
        }
      }
      return { suggestions: [] }
    },
  }))

  reg.push(monaco.languages.registerHoverProvider('javascript', {
    provideHover(model, position) {
      const w = model.getWordAtPosition(position)
      if (!w) return null
      const range = new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn)
      const c = COMPONENTS[w.word] || MODULES[w.word]
      if (c) return { range, contents: [{ value: `**${c.name}** — \`${c.pkg}\`` }, md(c.desc, c.usage ? '```jsx\n' + c.usage + '\n```' : '')] }
      const lineText = model.getLineContent(position.lineNumber)
      const before = model.getValueInRange({ startLineNumber: Math.max(1, position.lineNumber - 200), startColumn: 1, endLineNumber: position.lineNumber, endColumn: w.startColumn })
      // 속성 이름 위
      const ctx = tagContext(before)
      if (ctx && !ctx.inValue && COMPONENTS[ctx.tag]) {
        const a = COMPONENTS[ctx.tag].attrs.find((x) => x.name === w.word)
        if (a) return { range, contents: [{ value: `**${a.name}** — ${ctx.tag} ${a.event ? '이벤트' : '속성'}` }, md(a.desc)] }
      }
      // 모듈·ref 메서드 위
      const pre = lineText.slice(0, w.startColumn - 1)
      const mm = /([\w$]+)\.$/.exec(pre)
      if (mm && MODULES[mm[1]]) {
        const m = MODULES[mm[1]].methods.find((x) => x.name === w.word)
        if (m) return { range, contents: [{ value: '`' + m.sig + '`' }, md(m.desc)] }
      }
      const rm = /([\w$]+)\.current\??\.$/.exec(pre)
      if (rm) {
        const comp = COMPONENTS[refMap(outline(model.getValue()))[rm[1]]]
        const m = comp?.methods.find((x) => x.name === w.word)
        if (m) return { range, contents: [{ value: '`' + m.sig + '` — ' + comp.name }, md(m.desc)] }
      }
      return null
    },
  }))
}

export function langOf(path) {
  if (/\.(jsx?|cjs|mjs)$/.test(path)) return 'javascript'
  if (/\.css$/.test(path)) return 'css'
  if (/\.json$/.test(path)) return 'json'
  if (/\.html?$/.test(path)) return 'html'
  if (/\.md$/.test(path)) return 'markdown'
  return 'plaintext'
}
