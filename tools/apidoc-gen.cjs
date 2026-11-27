#!/usr/bin/env node
/*
 * apidoc-gen — docs/catalog.js → docs/moca-react-api.html 전량 생성
 * ==========================================================================
 * 문서는 **카탈로그만 보고** 만든다. 손으로 쓴 내용을 섞지 않는다 —
 * 섞으면 생성할 때마다 날아가거나, 생성기를 못 돌리게 되기 때문.
 * 설명·시그니처를 고치려면 docs/catalog.js 를 고치고 다시 생성한다.
 * (MOCA 원본 vendor/moca/tools/apidoc-gen.js 와 같은 컨셉)
 *
 *   실행)  npm run apidoc   (= node tools/apidoc-gen.cjs)
 *
 * 화면 구성은 MOCA API 문서(vendor/moca/docs/moca-api.html)를 그대로 따른다 —
 * 사이드 목차 + 스크롤스파이(지금 보는 항목 표시) + sticky 제목 + 모바일 접이식 목차.
 * 두 문서가 한 식구로 보이도록 팔레트도 같은 것을 쓴다(가이드=밝은 문서 / API=어두운 문서).
 *
 * 카탈로그의 잎은 { prop|sig|field|value, desc } 형태(순수 데이터)라 vm 로드만으로 충분하다.
 * (.cjs 인 이유: 프로젝트가 "type": "module" 이라 .js 로 두면 require/vm 스크립트가 못 돈다)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'moca-react-api.html');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'docs', 'catalog.js'), 'utf8'), ctx);
const CAT = ctx.MOCAREACT_CATALOG;
if (!CAT || !CAT.components) { console.error('docs/catalog.js 를 읽지 못했습니다.'); process.exit(1); }

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 코드박스 — 복사 버튼을 함께 단다(개발자가 예제를 바로 가져다 쓰도록. MOCA 문서와 동일) */
const codeBox = (code, cls) =>
  `<pre class="ex${cls ? ' ' + cls : ''}"><code>${esc(code)}</code>`
  + '<button class="cp" type="button" aria-label="예제 복사">복사</button></pre>';

/* 설명을 「설명문」 + 「예제 코드」로 쪼갠다. desc 는 '…설명… 예) 코드' 형태(예) 는 항상 1개) */
const fmtDesc = (d) => {
  if (!d) return '';
  const m = String(d).match(/^([\s\S]*?)\s*예\)\s*([\s\S]+)$/);
  if (!m) return esc(d);
  return (m[1].trim() ? `<span class="dt">${esc(m[1].trim())}</span>` : '') + codeBox(m[2].trim());
};

const LEAF = ['prop', 'sig', 'field', 'value'];
const leafOf = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  for (const f of LEAF) if (typeof v[f] === 'string') return { val: v[f], desc: v.desc };
  return null;
};

/* {key:{prop,desc}} → 표. 중첩 오브젝트면 하위 표를 재귀로.
   메타 필드(desc/usage/kind/pkg)는 표에 싣지 않는다 — 카드 머리에서 따로 그린다. */
const META = new Set(['desc', 'usage', 'kind', 'pkg']);
function renderGroup(obj, title) {
  if (!obj) return '';
  const rows = [], subs = [];
  for (const [k, v] of Object.entries(obj)) {
    if (META.has(k)) continue;
    const lf = leafOf(v);
    if (lf) rows.push({ k, ...lf });
    else if (v && typeof v === 'object' && !Array.isArray(v)) subs.push([k, v]);
  }
  let h = '';
  if (rows.length) {
    h += '<div class="tbl">';
    for (const r of rows) {
      h += `\n<div class="row"><div class="k"><code>${esc(r.val)}</code></div><div class="d">${fmtDesc(r.desc)}</div></div>`;
    }
    h += '</div>';
  }
  for (const [k, v] of subs) h += `<h5>${esc(title)} · <span class="sub">${esc(k)}</span></h5>` + renderGroup(v, k);
  return h;
}

const SECT = { props: 'Props', events: '이벤트 (콜백 props)', methods: '메서드 (ref API)' };

/* 한 항목(컴포넌트/모듈/앱 규약) 카드.
   SECT 로 나뉘지 않는 항목(app.registry)은 남은 키를 통째로 한 표에 그린다. */
function renderEntry(id, title, c, importLine) {
  let h = `\n<article id="${esc(id)}" class="card"><h3>${esc(title)}</h3>`;
  if (importLine) h += `<div class="types"><code>${esc(importLine)}</code></div>`;
  if (c.desc) h += `<p class="cdesc">${esc(c.desc)}</p>`;
  /* 절마다 <div class="sect"> 로 감싼다 — h4 를 sticky 로 붙이기 위한 것이다.
     sticky 는 "가장 가까운 스크롤 조상" 안에서 버티므로, 감싸지 않으면 카드 하나가
     통째로 컨테이너가 되어 지나간 절 제목들이 전부 같은 자리에 겹쳐 쌓인다(실측으로 확인). */
  if (c.usage) h += `<div class="sect"><h4>사용 예</h4>${codeBox(c.usage, 'usage')}</div>`;
  let sectioned = false;
  for (const [sect, label] of Object.entries(SECT)) {
    const g = c[sect];
    if (!g || Object.keys(g).length === 0) continue;
    sectioned = true;
    h += `<div class="sect"><h4>${label}</h4>` + renderGroup(g, title) + '</div>';
  }
  if (!sectioned) h += renderGroup(c, title);
  return h + '</article>';
}

/* ── 목차 순서 ────────────────────────────────────────────────────────────
   묶음(kind) 안에서는 **이름순**으로 늘어놓는다. 카탈로그의 선언 순서는 만든 순서라
   "찾는 이름이 어디쯤 있는지" 예측할 수 없다 — 목차는 읽는 사람이 고르는 자리다.
   MocaReact 접두어가 같아 이름순이면 성격이 비슷한 것끼리 자연히 붙는다. */
const byName = (a, b) => a[0].localeCompare(b[0]);
const entries = Object.entries(CAT.components);
const comps = entries.filter(([, c]) => (c.kind || '컴포넌트') === '컴포넌트').sort(byName);
const mods = entries.filter(([, c]) => c.kind === '모듈').sort(byName);
const apps = Object.entries(CAT.app || {}).sort(byName);

let toc = '<a class="toc-top" href="#top">↑ 맨 위로</a>';
let body = '';

const group = (label, list, secId, lead, idOf, titleOf) => {
  if (!list.length) return;
  toc += `<div class="toc-g">${esc(label)}</div>`;
  body += `\n<section id="${secId}"><h2>${esc(label)}</h2>`;
  if (lead) body += `<p class="lead">${lead}</p>`;
  for (const [name, c] of list) {
    toc += `<a href="#${esc(idOf(name))}">${esc(titleOf(name))}</a>`;
    body += renderEntry(idOf(name), titleOf(name), c, c.pkg ? `import { ${name} } from '${c.pkg}'` : '');
  }
  body += '\n</section>';
};

group('컴포넌트', comps, 'components',
  '화면(<code>.jsx</code>)에 JSX 로 배치하고 <code>props</code> 로 설정한다. 명령형 API 가 있는 것은 <code>ref</code> 로 얻어 호출한다.',
  (n) => 'c-' + n, (n) => n);

group('모듈', mods, 'modules',
  '컴포넌트가 아니라 함수·훅 묶음이다 — 서버 통신(<code>tran</code>), 알림·확인(<code>msgbox</code>), 팝업(<code>popup</code>).',
  (n) => 'c-' + n, (n) => n);

group('앱 규약', apps, 'app',
  '데모 앱(<code>src/</code>)이 화면을 등록하고 메뉴에 올리는 방법 — 패키지 API 가 아니라 <b>이 앱의 약속</b>이다.',
  (n) => 'a-' + n, (n) => 'app.' + n);

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const counts = `컴포넌트 ${comps.length} · 모듈 ${mods.length} · 앱 규약 ${apps.length}`;

const html = `<!DOCTYPE html>
<html lang="ko" translate="no">
<head>
<meta charset="UTF-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MOCA React API</title>
<style>
/* 이 파일은 tools/apidoc-gen.cjs 가 catalog.js 로부터 생성합니다. 직접 수정하지 마세요. */
*{box-sizing:border-box;margin:0;padding:0}
:root{
  /* MOCA API 문서와 같은 팔레트 — 두 문서를 나란히 열어도 한 식구로 보이게 */
  --bg:#0b1016; --bg2:#111823; --card:#151d2a; --line:#243040;
  --tx:#dfe7f0; --tx2:#93a3b8; --acc:#4d9dff; --code:#0d1420; --codetx:#8fd6ff;
  /* 헤더 높이·카드 제목 높이 단일 소스 — sticky 제목(h3·h4)·목차(top)·앵커 여백(scroll-margin)·
     스크롤스파이(JS)가 전부 이 값을 참조한다. 기기마다 실측해 하드코딩할 일이 없다. */
  --hd-h:56px; --h3-h:40px;
}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--tx);font:15px/1.7 -apple-system,"Segoe UI","Malgun Gothic",sans-serif;
     word-break:keep-all;overflow-wrap:anywhere}
code{font-family:ui-monospace,"Cascadia Mono",Consolas,"D2Coding",monospace;font-size:.88em;
     background:var(--code);color:var(--codetx);padding:.12em .4em;border-radius:4px}
a{color:var(--acc)}

/* 헤더 — 높이는 --hd-h 로 고정하고 절대 줄바꿈하지 않는다(한 줄 통일).
   좁은 화면에서 meta 가 길면 두 줄로 접히는 대신 말줄임(…)으로 잘린다. */
.hd{position:sticky;top:0;z-index:10;background:rgba(11,16,22,.92);backdrop-filter:blur(8px);
    border-bottom:1px solid var(--line);height:var(--hd-h);padding:0 20px;
    display:flex;gap:12px;align-items:center;flex-wrap:nowrap;overflow:hidden}
.hd h1{font-size:18px;letter-spacing:.3px;flex-shrink:0}
/* ← 돌아가기 — 문서는 홈페이지에서 팝업(PC)/같은 탭(모바일)으로 열린다.
   특히 모바일에서 "홈페이지로 돌아갈 길"을 헤더에 명시적으로 둔다(뒤로가기와 같은 동작). */
.hd-back{flex-shrink:0;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;
         border:1px solid var(--line);border-radius:8px;background:var(--bg2);color:var(--tx);
         font-size:16px;line-height:1;cursor:pointer;padding:0}
.hd-back:hover{border-color:var(--acc);color:var(--acc)}
.hd .meta{color:var(--tx2);font-size:12px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* 가이드로 — 이 문서는 "낱낱의 목록"이라, 쓰는 법이 필요하면 건너뛸 길을 헤더에 둔다 */
.hd-guide{margin-left:auto;flex-shrink:0;text-decoration:none;font-size:12.5px;font-weight:700;
          border:1px solid var(--line);border-radius:8px;padding:6px 11px;background:var(--bg2)}
.hd-guide:hover{border-color:var(--acc)}

.wrap{display:flex;gap:28px;max-width:1180px;margin:0 auto;padding:24px 20px 80px}

/* 목차 — 데스크톱은 사이드 고정, 모바일은 하단 접이식 패널 */
.toc{position:sticky;top:calc(var(--hd-h) + 14px);align-self:start;flex:0 0 200px;
     max-height:calc(100vh - var(--hd-h) - 40px);overflow:auto;
     border-right:1px solid var(--line);padding-right:14px}
.toc a{display:block;color:var(--tx2);text-decoration:none;padding:4px 6px;border-radius:5px;font-size:13px;
       border-left:3px solid transparent}
.toc a:hover{background:var(--bg2);color:var(--tx)}
/* 현재 보고 있는 항목 — 스크롤을 따라 JS 가 .on 을 옮긴다.
   색만으로 구분하지 않는다(색각 이상 대응): 좌측 바 + 굵기 + 배경을 함께 준다. */
.toc a.on{background:var(--acc);color:#04121f;font-weight:700;border-left-color:#04121f}
.toc-g{color:var(--acc);font-size:11px;font-weight:700;letter-spacing:.8px;margin:14px 0 4px}
.toc-list::after{content:'';display:block;grid-column:1/-1;height:28px}

main{flex:1;min-width:0}
h2{font-size:22px;margin:28px 0 6px;padding-bottom:8px;border-bottom:2px solid var(--acc)}
section:first-child h2{margin-top:0}
.lead{color:var(--tx2);font-size:14px;margin-bottom:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0}

/* 카드 제목은 sticky — 카드 하나가 화면 여러 장 분량이라(Grid 는 props 만 40개 넘는다) 스크롤하면
   제목이 사라지고 "지금 보는 게 어느 컴포넌트인지" 알 수 없다. 헤더 바로 아래에 붙인다.
   좌우 마진을 카드 padding 만큼 음수로 빼서 배경이 카드 폭을 꽉 채운다
   (안 그러면 스크롤되는 내용이 제목 좌우로 비쳐 보인다). */
h3{position:sticky;top:var(--hd-h);z-index:5;height:var(--h3-h);
   display:flex;align-items:center;
   background:var(--card);border-bottom:1px solid var(--line);
   margin:-16px -18px 0;padding:0 18px;
   border-radius:9px 9px 0 0;
   font-size:17px;color:var(--acc)}
/* 절 제목(Props·이벤트·메서드)도 그 아래에 붙는다 — 표가 길어 "지금 보는 게 props 인지 메서드인지"를
   놓치기 쉽다. 두 줄이 겹치지 않게 제목 높이(--h3-h)만큼 내려 붙인다.
   모바일에서는 붙이지 않는다(헤더+제목+절 이 화면의 1/3 을 잡아먹는다 — 아래 미디어쿼리에서 해제). */
h4{position:sticky;top:calc(var(--hd-h) + var(--h3-h));z-index:4;
   background:var(--card);margin:16px -18px 6px;padding:7px 18px 5px;
   font-size:13px;color:var(--tx2);text-transform:uppercase;letter-spacing:.8px}
.sect{display:flow-root}   /* h4 sticky 의 컨테이너 — 절이 끝나면 그 제목도 함께 밀려난다 */
h5{font-size:12px;color:var(--tx2);margin:12px 0 4px}
h5 .sub{color:var(--acc)}
.types{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 4px}
.cdesc{margin:6px 0 2px;color:var(--tx);font-size:14px}

/* 표 — <table> 대신 grid. 좁아지면 자동으로 카드처럼 접힌다(가로 스크롤 없음) */
.tbl{border:1px solid var(--line);border-radius:8px;overflow:hidden}
.row{display:grid;grid-template-columns:minmax(180px,34%) 1fr;gap:0;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.k{padding:9px 12px;background:var(--bg2);border-right:1px solid var(--line);min-width:0}
.d{padding:9px 12px;color:var(--tx);font-size:13.5px;min-width:0}
.d .dt{display:block}

/* 예제 코드박스 — 설명 아래에 별도 블록으로. 좌측 액센트 바로 "예제"임을 표시.
   긴 예제는 좁은 화면에서 넘치므로 박스 안에서 줄바꿈시킨다(가로 스크롤 금지).
   body 의 overflow-wrap:anywhere 를 그대로 두면 식별자 중간이 잘리므로 break-word 로 덮는다. */
.ex{position:relative;display:block;margin:7px 0 1px;padding:8px 10px;
    background:var(--code);border:1px solid var(--line);border-left:3px solid var(--acc);
    border-radius:5px;overflow:hidden}
.ex.usage{margin:0 0 4px}
.ex code{background:transparent;padding:0 46px 0 0;color:var(--codetx);
         font-size:12.5px;line-height:1.6;
         white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;display:block}
/* 복사 버튼 — 평소엔 은은하게, 박스에 hover/focus 하면 또렷하게 */
.ex .cp{position:absolute;top:5px;right:5px;z-index:1;
        background:var(--bg2);color:var(--tx2);border:1px solid var(--line);
        border-radius:4px;padding:3px 8px;font-size:11px;line-height:1.4;cursor:pointer;
        opacity:.45;transition:opacity .12s,color .12s,border-color .12s}
.ex:hover .cp, .ex .cp:focus-visible{opacity:1}
.ex .cp:hover{color:var(--acc);border-color:var(--acc)}
.ex .cp.ok{opacity:1;color:#04121f;background:var(--acc);border-color:var(--acc);font-weight:700}
@media (hover:none){ .ex .cp{opacity:.9} }   /* 터치기기는 hover 가 없으니 항상 보이게 */

/* 앵커 점프 시 sticky 헤더가 제목을 가리지 않도록 */
section, article{scroll-margin-top:calc(var(--hd-h) + 14px)}

/* 목차 버튼 — 데스크톱에선 숨김(사이드바가 항상 보이므로) */
.toc-btn, .toc-dim{display:none}

@media (max-width:860px){
  .meta-x{display:none}   /* 좁은 화면에서 집계는 잘려 반쪽만 보이느니 숨긴다 */
  .wrap{flex-direction:column;gap:0;padding:16px 14px 80px}

  /* ── 목차: 가로스크롤 칩 금지 ──────────────────────────────────
     칩을 가로로 늘어놓으면 "가로로 훑어야 원하는 항목을 찾는" 구조가 된다.
     대신 평소엔 접어두고, 버튼으로 전체 목록을 덮어 띄운다.
     이 버튼은 화면 어디서나 떠 있으므로 **섹션으로 점프한 뒤 돌아오는 길**도 된다. */
  .toc-btn{display:flex;align-items:center;gap:6px;position:fixed;right:14px;bottom:14px;z-index:30;
           background:var(--acc);color:#04121f;border:0;border-radius:24px;
           padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;
           box-shadow:0 4px 16px rgba(0,0,0,.5)}
  .toc-dim{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:31}
  .toc{position:fixed;inset:auto 0 0 0;z-index:32;
       max-height:78vh;overflow-y:auto;overflow-x:hidden;   /* 세로로만 스크롤 */
       background:var(--card);border:0;border-top:2px solid var(--acc);
       border-radius:14px 14px 0 0;padding:8px 14px 20px;margin:0;
       transform:translateY(101%);transition:transform .18s ease-out;
       box-shadow:0 -8px 24px rgba(0,0,0,.5)}
  /* 목록은 2열로 감싼다 — 세로로 길어지는 것보다 훑기 쉽고, 가로스크롤이 없다 */
  .toc-list{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .toc a{display:block;background:var(--bg2);border:1px solid var(--line);border-radius:6px;
         border-left-width:1px;
         padding:10px 8px;font-size:12.5px;text-align:center;
         white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  /* 패널을 열었을 때 "지금 어디인지" 바로 보이도록 — 데스크톱과 같은 .on 을 쓴다.
     「맨 위로」(.toc-top)와 같은 액센트색이라 테두리로 구분한다. */
  .toc a.on{background:var(--acc);color:#04121f;border-color:#04121f}
  .toc-g{display:block;grid-column:1/-1;margin:10px 0 2px}
  .toc-top{grid-column:1/-1;background:var(--acc) !important;color:#04121f !important;
           border-color:var(--acc) !important;font-weight:700}

  /* 열림 상태 — 체크박스 해킹(JS 없이도 동작) */
  #tocOpen:checked ~ .toc{transform:translateY(0)}
  #tocOpen:checked ~ .toc-dim{display:block}
  #tocOpen:checked ~ .toc-btn{display:none}

  /* 표 → 카드: 이름 위 / 설명 아래 */
  .row{grid-template-columns:1fr}
  .k{border-right:0;border-bottom:1px solid var(--line)}
  .card{padding:12px 12px}
  h2{font-size:19px}
  h3{margin:-12px -12px 0;padding:0 12px;font-size:16px}
  h4{position:static;margin:16px -12px 6px;padding:7px 12px 5px}
}
@media (min-width:861px){ .toc-list{display:block} }
</style>
</head>
<body>
<div class="hd">
  <button type="button" class="hd-back" id="hdBack" title="돌아가기" aria-label="돌아가기">←</button>
  <h1>MOCA React API</h1>
  <span class="meta">업데이트 ${date}<span class="meta-x"> · ${esc(counts)}</span></span>
  <a class="hd-guide" href="moca-react-guide.html">가이드 →</a>
</div>
<div class="wrap">
  <!-- 목차 — 모바일에선 접이식 오버레이(아래 .toc-btn 으로 염). 체크박스 해킹이라 JS 없이도 열고 닫힌다 -->
  <input type="checkbox" id="tocOpen" hidden>
  <label class="toc-dim" for="tocOpen" aria-hidden="true"></label>
  <nav class="toc" aria-label="목차">
    <div class="toc-list">${toc}</div>
  </nav>
  <label class="toc-btn" for="tocOpen" role="button" tabindex="0">☰ 목차</label>
  <main>${body}
  </main>
</div>
<script>
/* ← 돌아가기 — 문서가 어떻게 열렸든 "왔던 곳"으로 돌아간다.
   PC 팝업(window.open, opener 있음) → 창 닫기 / 같은 탭 이동(모바일) → 뒤로가기 /
   직접 링크·새 탭 첫 진입(히스토리 없음) → 홈페이지로. */
(function(){
  document.getElementById('hdBack').addEventListener('click', function(){
    if (window.opener && !window.opener.closed) { window.close(); return; }
    if (history.length > 1) { history.back(); return; }
    location.href = '/system/homepage/index.html';
  });
})();

/* 목차 동작 — CSS 체크박스 해킹만으로 안 되는 두 가지만 JS 로 처리한다. */
(function(){
  var cb = document.getElementById('tocOpen');
  document.querySelector('.toc').addEventListener('click', function(e){
    var a = e.target.closest('a');
    if (!a) return;
    /* ① 항목을 고르면 패널을 닫는다 — 안 닫으면 점프 결과가 패널에 가려 안 보인다 */
    cb.checked = false;
    /* ② "맨 위로"는 앵커로 안 된다. #top 을 sticky 헤더에 걸면 브라우저가
          "이미 뷰포트 상단에 있다"고 보고 스크롤하지 않는다. 문서 최상단으로 직접 스크롤한다. */
    if (a.classList.contains('toc-top')) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      history.replaceState(null, '', location.pathname);
    }
  });
  window.addEventListener('hashchange', function(){ cb.checked = false; });   /* 뒤로가기로 패널이 열린 채 남지 않도록 */
})();

/* 목차 현재위치 표시 — 클릭뿐 아니라 스크롤을 따라 움직인다.
   (클릭 시점에만 표시하면 스크롤하는 순간 실제 위치와 어긋난다) */
(function(){
  var toc = document.querySelector('.toc');
  var links = {};
  toc.querySelectorAll('a[href^="#"]').forEach(function(a){
    var id = a.getAttribute('href').slice(1);
    if (id) links[id] = a;
  });
  var targets = [].slice.call(document.querySelectorAll('article[id], section[id]'))
                  .filter(function(t){ return links[t.id]; });
  if (!targets.length) return;

  var cur = null;
  var tocScrollLock = null;
  function activate(target, keepTocScroll){
    if (!target || !links[target.id] || target === cur) return;
    if (cur && links[cur.id]) links[cur.id].classList.remove('on');
    cur = target;
    var a = links[cur.id];
    a.classList.add('on');
    /* 목차(사이드바)가 스크롤되므로, 표시된 항목이 목차 밖에 있으면 표시해도 안 보인다.
       → 목차 안에서만 스크롤해 보이게 한다. scrollIntoView 는 페이지까지 움직이므로 쓰지 않는다. */
    if (!keepTocScroll && toc.scrollHeight > toc.clientHeight) {
      var t = a.offsetTop - toc.offsetTop;
      if (t < toc.scrollTop) toc.scrollTop = t - 8;
      else if (t + a.offsetHeight > toc.scrollTop + toc.clientHeight) toc.scrollTop = t + a.offsetHeight - toc.clientHeight + 8;
    }
  }
  /* 문서 끝쪽 항목은 남은 본문이 짧아 제목이 헤더 기준선까지 올라오지 못할 수 있다.
     해시 이동은 사용자가 고른 항목을 정확히 알고 있으므로 즉시 선택 표시한다. */
  function activateHash(){
    var id = decodeURIComponent(location.hash.slice(1));
    var target = id && document.getElementById(id);
    if (target && links[id]) activate(target);
  }
  /* 헤더 높이는 CSS 변수(--hd-h)가 단일 소스 — JS 도 그 값을 읽어 쓴다(하드코딩 금지) */
  var hdH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hd-h')) || 56;
  function activateLink(e){
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('toc-top')) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var target = id && document.getElementById(id);
    if (!target || !links[id]) return;
    /* 브라우저 기본 해시 점프와 선택상태 갱신을 따로 실행하면 일부 환경에서 문서 맨 위로 튄다.
       기본 이동을 막고 sticky 헤더 높이를 뺀 실제 섹션 위치로 한 번만 이동한다.
       클릭한 링크는 이미 목차 안에 보이므로 왼쪽 목차의 현재 스크롤 위치는 그대로 보존한다. */
    e.preventDefault();
    var tocTop = toc.scrollTop;
    tocScrollLock = tocTop;
    activate(target, true);
    var top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - (hdH + 14));
    history.pushState(null, '', '#' + id);
    window.scrollTo({ top: top });
    toc.scrollTop = tocTop;
    /* scroll 이벤트의 rAF 추적까지 끝난 뒤 잠금을 푼다 —
       한 프레임만 복원하면 두 번째 클릭부터 뒤늦은 spy 가 목차를 다시 맨 위로 움직인다. */
    requestAnimationFrame(function(){
      toc.scrollTop = tocTop;
      requestAnimationFrame(function(){
        toc.scrollTop = tocTop;
        if (tocScrollLock === tocTop) tocScrollLock = null;
      });
    });
  }
  function spy(){
    /* 헤더 아래로 지나간 것 중 마지막 = 지금 보고 있는 구간.
       IntersectionObserver 대신 이 방식을 쓴 이유: 대상이 십수 개뿐이라 비용이 무시할 수준이고,
       "헤더 바로 아래에 뭐가 있나"를 그대로 계산해서 sticky 제목과 항상 일치한다. */
    var found = targets[0];
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].getBoundingClientRect().top - (hdH + 14) <= 0) found = targets[i];
    }
    if (tocScrollLock !== null) { toc.scrollTop = tocScrollLock; return; }
    activate(found);
  }
  var tick = false;
  addEventListener('scroll', function(){
    if (tick) return;
    tick = true;
    requestAnimationFrame(function(){ spy(); tick = false; });
  }, { passive: true });
  addEventListener('resize', spy, { passive: true });
  spy();
  activateHash();
  toc.addEventListener('click', activateLink);
  addEventListener('hashchange', activateHash);
})();

/* 예제 코드박스 '복사' — 개발자가 샘플을 바로 가져다 쓰도록. */
(function(){
  /* navigator.clipboard 는 보안 컨텍스트(https/localhost)에서만 존재한다.
     운영은 https 라 정상 경로를 타지만, 사내망 http 미러·file:// 로 직접 열기·구형
     브라우저에서는 없을 수 있으므로 execCommand 폴백을 함께 둔다.
     ★ 있어도 실패할 수 있다 — 창에 포커스가 없거나 권한이 거부되면 writeText 가 reject 한다.
       그때도 폴백을 타게 이어붙인다(실측: 포커스 없는 창에서 "실패"가 떴다). */
  function copyText(t){
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(t).catch(function(){ return legacyCopy(t); });
    }
    return legacyCopy(t);
  }
  function legacyCopy(t){
    return new Promise(function(res, rej){
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly','');
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);   // iOS
      var ok = false;
      try { ok = document.execCommand('copy'); } catch(e) {}
      document.body.removeChild(ta);
      ok ? res() : rej(new Error('copy failed'));
    });
  }
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.ex .cp');
    if (!btn) return;
    var code = btn.parentElement.querySelector('code');
    copyText(code.innerText).then(function(){
      btn.textContent = '복사됨';
      btn.classList.add('ok');
    }).catch(function(){
      btn.textContent = '실패';        // 조용히 넘어가지 않는다 — 안 됐으면 안 됐다고 알린다
    }).then(function(){
      setTimeout(function(){ btn.textContent = '복사'; btn.classList.remove('ok'); }, 1200);
    });
  });
})();
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log('생성 완료: ' + path.relative(ROOT, OUT)
  + ` (${counts}, ` + Buffer.byteLength(html, 'utf8').toLocaleString() + ' bytes)');
