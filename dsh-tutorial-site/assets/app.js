/* DeepSeek Harness 教程站 — 前端路由 + 渲染 + 检索 + 进度 */

const NAV = [
  {
    section: '先跑起来',
    pages: [
      { id: 'overview', num: '00', title: '一切皆插件有多夸张', desc: '这项目解决什么问题，为什么找不到 main()' },
      { id: 'quickstart', num: '01', title: '五分钟跑起来', desc: '装依赖、起 Web UI、看见真实的配置树' },
      { id: 'mental-model', num: '02', title: '把它想成一家公司', desc: '一个类比装下整个框架' },
    ],
  },
  {
    section: 'Cordis 框架',
    pages: [
      { id: 'cordis-plugin', num: '03', title: '写一个「员工」', desc: '插件长什么样，组装清单怎么写' },
      { id: 'cordis-lifecycle', num: '04', title: '离职要交工牌', desc: 'effect：借了就得还，否则热重载会漏' },
      { id: 'cordis-service', num: '05', title: '认岗不认人', desc: 'ctx.key 与 inject，换人不用改代码' },
      { id: 'cordis-events', num: '06', title: '广播、审批与套娃', desc: '五种分发，以及那个吞掉一切的坑' },
      { id: 'cordis-config', num: '07', title: '填错表当场退回', desc: '配置校验，错了要响亮地失败' },
      { id: 'cordis-hmr', num: '08', title: '改组织不用重启公司', desc: '分组、隔离、热重载，和「查无此人」的排查' },
    ],
  },
  {
    section: 'Harness 架构',
    pages: [
      { id: 'arch-overview', num: '09', title: '一棵树怎么长出来', desc: 'profile、组合包、patch 三层叠加' },
      { id: 'arch-turn', num: '10', title: '模型的一个回合', desc: 'turn 与 step，主循环全流程' },
      { id: 'arch-session', num: '11', title: '没记账就等于没发生', desc: '会话日志为什么是唯一真源' },
      { id: 'arch-tools', num: '12', title: '一次工具调用的安检', desc: '三道关卡，策略该挂哪一道' },
      { id: 'arch-seams', num: '13', title: '换灯泡不用换电线', desc: 'seam 三角色，可替换性从哪来' },
    ],
  },
  {
    section: '动手实践',
    pages: [
      { id: 'lab-plugin', num: '14', title: '实验一：第一个插件', desc: '六步跑通，不需要 API 密钥' },
      { id: 'lab-tool', num: '15', title: '实验二：写一个工具', desc: '让模型能调用你写的东西' },
      { id: 'lab-capability', num: '16', title: '实验三：造一个能力', desc: '三角色拆包，提供方可替换' },
    ],
  },
  {
    section: '随时来查',
    pages: [
      { id: 'ref-map', num: '17', title: '我想做 X，挂哪儿', desc: '需求到扩展点的查询表' },
      { id: 'ref-glossary', num: '18', title: '术语表', desc: 'seam / scope / turn / step / Ralph 等规范术语' },
      { id: 'ref-repo', num: '19', title: '仓库导航与规约', desc: '目录、命令，那些会被 CI 拦住的硬规则' },
    ],
  },
];

const PAGES = NAV.flatMap(s => s.pages.map(p => ({ ...p, section: s.section })));
const PAGE_BY_ID = new Map(PAGES.map(p => [p.id, p]));
const LS_DONE = 'dsh-tutorial-done';
const LS_THEME = 'dsh-tutorial-theme';
const LS_NAVSTATE = 'dsh-tutorial-nav';

/* ---------- theme ---------- */

function initTheme() {
  const saved = localStorage.getItem(LS_THEME);
  const theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(LS_THEME, next);
  configureMermaid();
  renderMermaid();
}

/* ---------- progress ---------- */

function getDone() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_DONE) || '[]')); }
  catch { return new Set(); }
}

function setDone(set) {
  localStorage.setItem(LS_DONE, JSON.stringify([...set]));
  paintProgress();
  paintNavDone();
}

function paintProgress() {
  const done = getDone();
  const hit = PAGES.filter(p => done.has(p.id)).length;
  document.getElementById('progress-text').textContent = `${hit} / ${PAGES.length}`;
  document.getElementById('progress-bar').style.width = `${(hit / PAGES.length) * 100}%`;
}

function paintNavDone() {
  const done = getDone();
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('done', done.has(a.dataset.id));
  });
}

/* ---------- nav ---------- */

function buildNav() {
  const collapsed = new Set(JSON.parse(localStorage.getItem(LS_NAVSTATE) || '[]'));
  const tree = document.getElementById('nav-tree');
  tree.innerHTML = '';
  for (const sec of NAV) {
    const box = document.createElement('div');
    box.className = 'nav-section' + (collapsed.has(sec.section) ? ' collapsed' : '');
    const btn = document.createElement('button');
    btn.className = 'nav-section-title';
    btn.innerHTML = `<span class="caret">▼</span><span>${sec.section}</span>`;
    btn.onclick = () => {
      box.classList.toggle('collapsed');
      const now = new Set(JSON.parse(localStorage.getItem(LS_NAVSTATE) || '[]'));
      box.classList.contains('collapsed') ? now.add(sec.section) : now.delete(sec.section);
      localStorage.setItem(LS_NAVSTATE, JSON.stringify([...now]));
    };
    const links = document.createElement('div');
    links.className = 'nav-links';
    for (const p of sec.pages) {
      const a = document.createElement('a');
      a.className = 'nav-link';
      a.href = `#/${p.id}`;
      a.dataset.id = p.id;
      a.innerHTML = `<span class="nl-num">${p.num}</span><span class="nl-title">${p.title}</span>`;
      links.appendChild(a);
    }
    box.append(btn, links);
    tree.appendChild(box);
  }
  paintNavDone();
}

/* ---------- markdown ---------- */

hljs.configure({ ignoreUnescapedHTML: true });

const renderer = new marked.Renderer();
const origCode = renderer.code.bind(renderer);
renderer.code = function (token) {
  const lang = (token.lang || '').trim();
  if (lang === 'mermaid') {
    return `<div class="mermaid-box" data-mermaid="${encodeURIComponent(token.text)}"></div>`;
  }
  return origCode(token);
};

marked.setOptions({ renderer, gfm: true, breaks: false });

function slugify(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w一-龥]+/g, '-').replace(/^-+|-+$/g, '');
}

function enhance(root) {
  // headings get ids for TOC
  root.querySelectorAll('h2, h3').forEach(h => {
    if (!h.id) h.id = slugify(h.textContent);
  });
  // highlight + copy button
  root.querySelectorAll('pre > code').forEach(code => {
    const cls = [...code.classList].find(c => c.startsWith('language-'));
    const lang = cls ? cls.slice(9) : '';
    if (lang && hljs.getLanguage(lang)) {
      code.innerHTML = hljs.highlight(code.textContent, { language: lang }).value;
    }
    const pre = code.parentElement;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentElement.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = '已复制';
      } catch {
        btn.textContent = '复制失败';
      }
      setTimeout(() => (btn.textContent = '复制'), 1400);
    };
    wrap.appendChild(btn);
  });
  wireQuiz(root);
  wireTerms(root);
}

/* 术语悬浮解释：<span class="term" data-def="...">词</span> */
let termPop;
function wireTerms(root) {
  termPop?.remove();
  termPop = null;
  root.querySelectorAll('.term[data-def]').forEach(el => {
    const show = () => {
      hideTerm();
      termPop = document.createElement('div');
      termPop.className = 'term-pop';
      termPop.innerHTML = `<span class="tp-word">${el.textContent}</span>${el.dataset.def}`;
      document.body.appendChild(termPop);
      const r = el.getBoundingClientRect();
      const pw = termPop.offsetWidth;
      const ph = termPop.offsetHeight;
      let left = r.left + r.width / 2 - pw / 2;
      left = Math.max(10, Math.min(left, innerWidth - pw - 10));
      // Flip below the term when there is not enough room above.
      const top = r.top - ph - 9 < 8 ? r.bottom + 9 : r.top - ph - 9;
      termPop.style.left = `${left}px`;
      termPop.style.top = `${top}px`;
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('focus', show);
    el.addEventListener('mouseleave', hideTerm);
    el.addEventListener('blur', hideTerm);
    el.tabIndex = 0;
  });
}

function hideTerm() {
  termPop?.remove();
  termPop = null;
}

function wireQuiz(root) {
  root.querySelectorAll('.quiz').forEach(box => {
    const why = box.querySelector('.quiz-why');
    box.querySelectorAll('.quiz-opt').forEach(opt => {
      opt.onclick = () => {
        const right = opt.dataset.answer === 'yes';
        opt.classList.add(right ? 'right' : 'wrong');
        if (right) {
          box.querySelectorAll('.quiz-opt').forEach(o => (o.disabled = true));
        }
        why?.classList.add('show');
      };
    });
  });
}

/* ---------- mermaid ---------- */

function configureMermaid() {
  const dark = document.documentElement.dataset.theme === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'var(--sans)',
    themeVariables: { fontSize: '13px' },
    flowchart: { htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true, wrap: true },
  });
}

let mermaidSeq = 0;
async function renderMermaid() {
  const boxes = [...document.querySelectorAll('.mermaid-box[data-mermaid]')];
  for (const box of boxes) {
    const src = decodeURIComponent(box.dataset.mermaid);
    try {
      const { svg } = await mermaid.render(`m${mermaidSeq++}`, src);
      box.innerHTML = svg;
    } catch (err) {
      box.innerHTML = `<pre style="text-align:left">${src.replace(/</g, '&lt;')}</pre>`;
      console.warn('mermaid render failed', err);
    }
  }
}

/* ---------- toc ---------- */

function buildToc(root) {
  const list = document.getElementById('toc-list');
  list.innerHTML = '';
  const heads = [...root.querySelectorAll('h2, h3')];
  for (const h of heads) {
    const a = document.createElement('a');
    a.className = 'toc-link' + (h.tagName === 'H3' ? ' lv3' : '');
    a.href = `#/${currentId()}@${h.id}`;
    a.textContent = h.textContent;
    a.dataset.target = h.id;
    a.onclick = e => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update the address bar without re-routing the page.
      history.replaceState(null, '', a.href);
    };
    list.appendChild(a);
  }
  observeHeads(heads);
}

let headObserver;
function observeHeads(heads) {
  headObserver?.disconnect();
  if (!heads.length) return;
  const links = new Map([...document.querySelectorAll('.toc-link')].map(a => [a.dataset.target, a]));
  headObserver = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach(a => a.classList.remove('active'));
        links.get(e.target.id)?.classList.add('active');
      }
    },
    { rootMargin: '-70px 0px -75% 0px' },
  );
  heads.forEach(h => headObserver.observe(h));
}

/* ---------- search ---------- */

const searchIndex = [];

async function buildSearchIndex() {
  await Promise.all(
    PAGES.map(async p => {
      const md = await loadMd(p.id);
      const plain = md
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#*`>|_\-]/g, ' ')
        .replace(/\s+/g, ' ');
      // index per heading block for precise jumps
      const blocks = md.split(/\n(?=##\s)/);
      for (const b of blocks) {
        const m = b.match(/^##\s+(.+)/);
        const heading = m ? m[1].trim() : p.title;
        const body = b.replace(/```[\s\S]*?```/g, ' ').replace(/[#*`>|_]/g, ' ').replace(/\s+/g, ' ');
        searchIndex.push({ page: p, heading, anchor: m ? slugify(heading) : '', body });
      }
      searchIndex.push({ page: p, heading: p.title, anchor: '', body: p.desc + ' ' + plain.slice(0, 400) });
    }),
  );
}

function runSearch(q) {
  const box = document.getElementById('search-results');
  const query = q.trim().toLowerCase();
  if (query.length < 1) {
    box.hidden = true;
    return;
  }
  const terms = query.split(/\s+/);
  const scored = [];
  for (const item of searchIndex) {
    const hay = (item.heading + ' ' + item.body).toLowerCase();
    let score = 0;
    let all = true;
    for (const t of terms) {
      const inHead = item.heading.toLowerCase().includes(t);
      const inBody = hay.includes(t);
      if (!inBody) { all = false; break; }
      score += inHead ? 12 : 3;
    }
    if (!all) continue;
    scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const top = [];
  for (const s of scored) {
    const key = s.item.page.id + '#' + s.item.anchor;
    if (seen.has(key)) continue;
    seen.add(key);
    top.push(s.item);
    if (top.length >= 12) break;
  }

  if (!top.length) {
    box.innerHTML = '<div class="search-empty">没有匹配结果</div>';
    box.hidden = false;
    return;
  }

  box.innerHTML = top
    .map(item => {
      const idx = item.body.toLowerCase().indexOf(terms[0]);
      const snip = idx >= 0 ? item.body.slice(Math.max(0, idx - 30), idx + 90) : item.body.slice(0, 110);
      const hl = s => {
        let out = s.replace(/</g, '&lt;');
        for (const t of terms) {
          out = out.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`);
        }
        return out;
      };
      const href = `#/${item.page.id}${item.anchor ? '@' + item.anchor : ''}`;
      return `<a class="search-item" href="${href}">
        <div class="si-crumb">${item.page.section} · ${item.page.num} ${item.page.title}</div>
        <div class="si-title">${hl(item.heading)}</div>
        <div class="si-snip">…${hl(snip)}…</div>
      </a>`;
    })
    .join('');
  box.hidden = false;
}

/* ---------- routing ---------- */

const mdCache = new Map();

async function loadMd(id) {
  if (mdCache.has(id)) return mdCache.get(id);
  const res = await fetch(`content/${id}.md`);
  if (!res.ok) throw new Error(`missing content/${id}.md`);
  const text = await res.text();
  mdCache.set(id, text);
  return text;
}

function currentId() {
  const raw = location.hash.replace(/^#\/?/, '');
  return decodeHash(raw.split('@')[0]) || 'overview';
}

function currentAnchor() {
  const raw = location.hash.replace(/^#\/?/, '');
  return decodeHash(raw.split('@')[1] || '');
}

// Browsers percent-encode non-ASCII hash fragments, so heading anchors built
// from Chinese text arrive encoded and would never match an element id.
function decodeHash(part) {
  try { return decodeURIComponent(part); } catch { return part; }
}

async function route() {
  const id = currentId();
  const page = PAGE_BY_ID.get(id);
  const content = document.getElementById('content');

  if (!page) {
    content.innerHTML = `<h1>页面不存在</h1><p>没有 <code>${id}</code> 这一章。<a href="#/overview">回到开头</a>。</p>`;
    return;
  }

  document.title = `${page.title} · DeepSeek Harness 教程`;

  let md;
  try {
    md = await loadMd(id);
  } catch (err) {
    content.innerHTML = `<h1>加载失败</h1><p><code>content/${id}.md</code> 读取失败。</p>`;
    return;
  }

  content.innerHTML = marked.parse(md);
  enhance(content);
  buildToc(content);
  await renderMermaid();

  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.id === id));
  const activeLink = document.querySelector('.nav-link.active');
  activeLink?.scrollIntoView({ block: 'nearest' });

  // pager
  const i = PAGES.findIndex(p => p.id === id);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  const prevEl = document.getElementById('prev-link');
  const nextEl = document.getElementById('next-link');
  if (prev) { prevEl.hidden = false; prevEl.href = `#/${prev.id}`; prevEl.textContent = prev.title; }
  else prevEl.hidden = true;
  if (next) { nextEl.hidden = false; nextEl.href = `#/${next.id}`; nextEl.textContent = next.title; }
  else nextEl.hidden = true;

  // done checkbox
  const chk = document.getElementById('done-toggle');
  chk.checked = getDone().has(id);
  chk.onchange = () => {
    const set = getDone();
    chk.checked ? set.add(id) : set.delete(id);
    setDone(set);
  };

  // scroll
  const anchor = currentAnchor();
  if (anchor) {
    document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  } else {
    window.scrollTo(0, 0);
  }

  closeSidebar();
  hideTerm();
  document.getElementById('search-results').hidden = true;
}

/* ---------- sidebar (mobile) ---------- */

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').hidden = false;
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').hidden = true;
}

/* ---------- boot ---------- */

initTheme();
configureMermaid();
buildNav();
paintProgress();

document.getElementById('theme-toggle').onclick = toggleTheme;
document.getElementById('menu-toggle').onclick = openSidebar;
document.getElementById('overlay').onclick = closeSidebar;
document.getElementById('progress-reset').onclick = () => {
  if (confirm('清空所有已读标记？')) setDone(new Set());
  document.getElementById('done-toggle').checked = false;
};

const searchEl = document.getElementById('search');
searchEl.addEventListener('input', e => runSearch(e.target.value));
searchEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') { searchEl.value = ''; document.getElementById('search-results').hidden = true; searchEl.blur(); }
  if (e.key === 'Enter') { document.querySelector('.search-item')?.click(); searchEl.value = ''; }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) document.getElementById('search-results').hidden = true;
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== searchEl) { e.preventDefault(); searchEl.focus(); }
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); searchEl.focus(); }
});

window.addEventListener('hashchange', route);
route();
buildSearchIndex();
