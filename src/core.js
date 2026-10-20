/* Discrete Mathematics & Probability: interactive course engine.
   Modules call DM.module({...}); this file turns them into one-viewport slides, wires the
   code walkthroughs to real Python running in the browser, and draws the navigation. */
(() => {
  'use strict';

  const PYODIDE_URL = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.7/';
  const BRYTHON_URL = 'https://cdnjs.cloudflare.com/ajax/libs/brython/3.14.3/';
  const RUN_TIMEOUT_MS = 10000;
  const params = new URLSearchParams(location.search);
  const PRINT = params.has('print');

  const DM = (window.DM = {
    modules: [],
    kinds: {},
    terms: new Map(),
    symbols: [],
    print: PRINT,
  });

  /* ---------------- small utilities ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /** h('div.card#id', {onclick, style:{...}, html:'<b>x</b>'}, child, 'text', [more]) */
  function h(tag, attrs, ...kids) {
    const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => (t === '.' ? el.classList.add(v) : (el.id = v)));
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'class') el.className += ' ' + v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    appendKids(el, kids);
    return el;
  }
  /** replaceChildren that skips null/false, so conditional children are easy */
  function rc(el, ...kids) {
    el.replaceChildren();
    appendKids(el, kids);
    return el;
  }
  function appendKids(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  /** s('circle', {cx, cy, r, class}) creates SVG elements */
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    appendKids(el, kids);
    return el;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('dm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('dm.' + k, JSON.stringify(v)); } catch { /* storage blocked: keep going */ } },
  };

  /* Seeded random numbers so practice problems are reproducible in the printed companion. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = {
    _r: mulberry32((Date.now() ^ 0x9e3779b9) >>> 0),
    seed(n) { this._r = mulberry32(n >>> 0); },
    random() { return this._r(); },
    int(a, b) { return a + Math.floor(this._r() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(this._r() * arr.length)]; },
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this._r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sample(arr, k) { return this.shuffle(arr).slice(0, k); },
    chance(p) { return this._r() < p; },
    subset(arr, p = 0.5) { return arr.filter(() => this._r() < p); },
  };
  if (PRINT) R.seed(20261020);

  /* Number helpers authors use in practice generators. */
  const M = {
    gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; },
    mod(a, n) { return ((a % n) + n) % n; },
    fact(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; },
    C(n, k) { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); },
    P(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r *= n - i; return r; },
    isPrime(n) { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; },
    frac(num, den) { const g = M.gcd(num, den) || 1; const s = den < 0 ? -1 : 1; return { n: (s * num) / g, d: (s * den) / g, toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; } }; },
    fmtSet(arr) { return arr.length ? '{' + arr.join(', ') + '}' : '∅'; },
    sortNum(arr) { return arr.slice().sort((x, y) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)))); },
  };

  /* ---------------- Python syntax highlighting ---------------- */
  const PY_KW = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' '));
  const PY_BI = new Set('print len range set list dict tuple int float str bool sum min max abs sorted enumerate zip map filter any all round pow divmod frozenset isinstance type repr reversed iter next hash id chr ord format super object bin hex oct sorted Exception ValueError TypeError KeyError IndexError ZeroDivisionError RecursionError'.split(' '));
  function hlPy(line) {
    const re = /(#.*$)|((?:[rbfRBF]{1,2})?(?:"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?))|(\b\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?\b)|(@[A-Za-z_]\w*)|([A-Za-z_]\w*)|(\s+)|([^\w\s])/g;
    let out = '', m, prevKw = '';
    while ((m = re.exec(line))) {
      const [t, cmt, str, num, deco, id, ws, op] = m;
      if (cmt) out += `<span class="tok-cmt">${esc(cmt)}</span>`;
      else if (str) out += `<span class="tok-str">${esc(str)}</span>`;
      else if (num) out += `<span class="tok-num">${esc(num)}</span>`;
      else if (deco) out += `<span class="tok-fn">${esc(deco)}</span>`;
      else if (id) {
        const next = line.slice(re.lastIndex).match(/^\s*\(/);
        if (PY_KW.has(id)) out += `<span class="tok-kw">${id}</span>`;
        else if (prevKw === 'def' || prevKw === 'class') out += `<span class="tok-fn">${id}</span>`;
        else if (PY_BI.has(id)) out += `<span class="tok-bi">${id}</span>`;
        else if (next) out += `<span class="tok-fn">${id}</span>`;
        else out += esc(id);
        prevKw = id;
        continue;
      } else if (ws) out += ws;
      else if (op) out += `<span class="tok-op">${esc(op)}</span>`;
      else out += esc(t);
      if (!ws) prevKw = '';
    }
    return out;
  }
  DM.hlPy = hlPy;

  /* ---------------- math: \( inline \) and \[ display \] rendered to native MathML ---------------- */
  function renderMath(root) {
    if (!root || !window.katex) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!/\\\(|\\\[/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || p.closest('pre, code, textarea, script, style, .no-math, math')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const re = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = re.exec(text))) {
        frag.append(text.slice(last, m.index));
        const span = document.createElement('span');
        span.className = 'tex';
        try {
          window.katex.render(m[1] ?? m[2], span, { output: 'mathml', throwOnError: false, displayMode: !!m[2], strict: 'ignore' });
          fixMathVariants(span);
          fixMathSpacing(span);
        } catch { span.textContent = m[0]; }
        frag.append(span);
        last = re.lastIndex;
      }
      frag.append(text.slice(last));
      node.replaceWith(frag);
    }
  }
  DM.renderMath = renderMath;
  const MV = {
    'double-struck': { up: 0x1d538, lo: 0x1d552, dig: 0x1d7d8, ex: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' } },
    script: { up: 0x1d49c, lo: 0x1d4b6, ex: { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' } },
    fraktur: { up: 0x1d504, lo: 0x1d51e, ex: { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' } },
    bold: { up: 0x1d400, lo: 0x1d41a, dig: 0x1d7ce, ex: {} },
    'sans-serif': { up: 0x1d5a0, lo: 0x1d5ba, dig: 0x1d7e2, ex: {} },
    monospace: { up: 0x1d670, lo: 0x1d68a, dig: 0x1d7f6, ex: {} },
  };
  /* Chrome renders MathML Core, which drops some of KaTeX's spacing and alignment hints:
     whitespace-only <mtext> collapses, function names like log/gcd get no side spacing,
     and mtable columnalign is ignored. Restore all three with plain CSS. */
  const SPACE_EM = { '\u2009': 0.1667, '\u2005': 0.2222, '\u2004': 0.2778, '\u00a0': 0.25, ' ': 0.25, '\u2002': 0.5, '\u2003': 1, '\u200a': 0.0833, '\u2006': 0.1667 };
  function fixMathSpacing(root) {
    // KaTeX in the browser emits \, and \; as bare whitespace text nodes between elements
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const loose = [];
    while (tw.nextNode()) { const n = tw.currentNode; if (n.parentElement && !/^(mi|mn|mo|mtext|ms|annotation|span)$/.test(n.parentElement.tagName) && n.nodeValue && [...n.nodeValue].every((ch) => ch in SPACE_EM)) loose.push(n); }
    for (const n of loose) {
      const sp = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mspace');
      sp.setAttribute('width', [...n.nodeValue].reduce((a, ch) => a + SPACE_EM[ch], 0).toFixed(4) + 'em');
      n.replaceWith(sp);
    }
    for (const t of root.querySelectorAll('mtext')) {
      const txt = t.textContent;
      if (!txt || txt.trim() !== '' && ![...txt].every((ch) => ch in SPACE_EM)) continue;
      const w = [...txt].reduce((a, ch) => a + (SPACE_EM[ch] ?? 0.25), 0);
      const sp = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'mspace');
      sp.setAttribute('width', w.toFixed(4) + 'em');
      t.replaceWith(sp);
    }
    const isFn = (el) => el && ((el.tagName === 'mi' && el.textContent.length > 1 && !el.children.length) || (/^msu[bp]/.test(el.tagName) && isFn(el.firstElementChild)) || (el.tagName === 'mrow' && isFn(el.firstElementChild)));
    for (const el of root.querySelectorAll('mi, msub, msup, msubsup')) {
      const par = el.parentElement;
      const inScriptBase = /^msu[bp]/.test(par.tagName) || (par.tagName === 'mrow' && /^msu[bp]/.test(par.parentElement?.tagName || '') && par.parentElement.firstElementChild === par);
      if (!isFn(el) || (el.tagName === 'mi' && inScriptBase)) continue;
      let next = el.nextElementSibling;
      if (next && next.tagName === 'mo' && next.textContent === '\u2061') next = next.nextElementSibling;
      if (next && next.tagName !== 'mo') el.style.marginRight = '0.1667em';
      const prev = el.previousElementSibling;
      if (prev && /^(mi|mn|mrow|msub|msup|msubsup)$/.test(prev.tagName)) el.style.marginLeft = '0.1667em';
    }
    for (const tb of root.querySelectorAll('mtable[columnalign]')) {
      const al = tb.getAttribute('columnalign').split(/\s+/);
      for (const tr of tb.children) [...tr.children].forEach((td, i) => { td.style.textAlign = al[Math.min(i, al.length - 1)]; td.style.paddingInline = '0.1em'; });
    }
  }
  function fixMathVariants(root) {
    for (const el of root.querySelectorAll('[mathvariant]')) {
      const v = MV[el.getAttribute('mathvariant')];
      if (!v || el.children.length) continue;
      el.textContent = [...el.textContent].map((ch) => {
        if (v.ex[ch]) return v.ex[ch];
        const c = ch.charCodeAt(0);
        if (c >= 65 && c <= 90) return String.fromCodePoint(v.up + c - 65);
        if (c >= 97 && c <= 122) return String.fromCodePoint(v.lo + c - 97);
        if (v.dig && c >= 48 && c <= 57) return String.fromCodePoint(v.dig + c - 48);
        return ch;
      }).join('');
      el.setAttribute('mathvariant', 'normal');
    }
  }
  /** html string -> element with math rendered and glossary terms wired */
  function rich(tag, html) {
    const el = h(tag, { html: html || '' });
    renderMath(el);
    return el;
  }

  /* ---------------- Python engine: Pyodide or Brython, always inside a Web Worker ----------------
     Both engines run student code off the main thread, so an endless loop can be stopped by
     terminating the worker. Runs are queued one at a time, and each run's 10-second clock starts
     only when it actually begins. */
  const PY_HELPER = String.raw`
import sys, io, json, types, traceback, contextlib
# keep private references so a student program that replaces json.dumps or io.StringIO
# cannot break the page's own reporting on the next run
__dm_dumps = json.dumps
__dm_StringIO = io.StringIO
__dm_redirect = contextlib.redirect_stdout
__dm_settrace = sys.settrace
__dm_extract_tb = traceback.extract_tb
def __dm_short(v, n=70):
    try:
        r = repr(v)
    except Exception:
        r = '<?>'
    return r if len(r) <= n else r[: n - 1] + '…'
def __dm_err(e):
    line = None
    if isinstance(e, SyntaxError) and e.filename == '<lesson>':
        line = e.lineno
    for fr in __dm_extract_tb(e.__traceback__):
        if fr.filename == '<lesson>':
            line = fr.lineno
    msg = e.msg if isinstance(e, SyntaxError) else str(e)
    return {'type': type(e).__name__, 'msg': msg, 'line': line}
def __dm_run(src):
    buf = __dm_StringIO()
    err = None
    g = {'__name__': '__main__'}
    try:
        code = compile(src, '<lesson>', 'exec')
        with __dm_redirect(buf):
            exec(code, g)
    except BaseException as e:
        err = __dm_err(e)
    return __dm_dumps({'out': buf.getvalue(), 'err': err})
def __dm_trace(src, limit=700):
    buf = __dm_StringIO()
    steps = []
    err = None
    limit_reached = False
    g = {'__name__': '__main__'}
    skip = (types.ModuleType, types.FunctionType, type, types.BuiltinFunctionType)
    class _Limit(BaseException):
        pass
    def snap(frame):
        d = {}
        for k, v in list(frame.f_locals.items()):
            if k.startswith('__') or isinstance(v, skip):
                continue
            d[k] = __dm_short(v)
        return d
    def depth(frame):
        n = 0
        f = frame.f_back
        while f is not None:
            if f.f_code.co_filename == '<lesson>':
                n += 1
            f = f.f_back
        return n
    def tracer(frame, event, arg):
        nonlocal limit_reached
        if frame.f_code.co_filename != '<lesson>':
            return None
        if event in ('line', 'return'):
            if len(steps) >= limit:
                limit_reached = True
                raise _Limit()
            st = {'line': frame.f_lineno, 'ev': event, 'fn': frame.f_code.co_name,
                  'vars': snap(frame), 'out': buf.getvalue(), 'depth': depth(frame)}
            if event == 'return':
                st['ret'] = __dm_short(arg)
            steps.append(st)
        return tracer
    try:
        code = compile(src, '<lesson>', 'exec')
        with __dm_redirect(buf):
            __dm_settrace(tracer)
            try:
                exec(code, g)
            finally:
                __dm_settrace(None)
    except _Limit:
        pass
    except BaseException as e:
        err = __dm_err(e)
    # A student can catch even BaseException. Keep the incomplete-trace warning
    # independently of the exception, including any error raised afterward.
    if limit_reached:
        msg = 'Stopped recording after %d steps. The trace is incomplete.' % limit
        if err is not None:
            where = ' (line %s)' % err['line'] if err['line'] is not None else ''
            msg += '\nProgram error after tracing stopped: %s%s: %s' % (err['type'], where, err['msg'])
        err = {'type': 'StepLimit', 'msg': msg, 'line': None}
    return __dm_dumps({'out': buf.getvalue(), 'err': err, 'steps': steps})
`;

  // Pyodide: real CPython compiled to WebAssembly (module worker).
  const PYODIDE_WORKER = `
import { loadPyodide } from "${PYODIDE_URL}pyodide.mjs";
const HELPER = ${JSON.stringify(PY_HELPER)};
let py;
const ready = (async () => {
  py = await loadPyodide({ indexURL: "${PYODIDE_URL}" });
  py.runPython(HELPER);
  return py.runPython("import sys; sys.version.split()[0]");
})();
ready.then((v) => postMessage({ ready: true, version: v }), (e) => postMessage({ ready: false, error: String(e) }));
onmessage = async (e) => {
  const { id, op, code } = e.data;
  try {
    await ready;
    py.globals.set("__dm_src", code);
    const res = py.runPython(op === "trace" ? "__dm_trace(__dm_src)" : "__dm_run(__dm_src)");
    postMessage({ id, ok: true, result: res });
  } catch (err) {
    postMessage({ id, ok: false, error: String(err) });
  }
};
`;

  // Brython: a Python-to-JavaScript compiler loaded as plain scripts, for hosts that block WebAssembly downloads.
  const BRY_HELPER = PY_HELPER.replace('def __dm_trace', 'def __dm_trace_unused')
    .replace("code = compile(src, '<lesson>', 'exec')\n        with __dm_redirect(buf):\n            exec(code, g)", 'with __dm_redirect(buf):\n            exec(src, g)')
    .replaceAll("filename == '<lesson>'", "filename in ('<lesson>', '<string>')") + `
from browser import self as __dm_global
__dm_global.__dm_run = __dm_run
`;
  const BRYTHON_WORKER = `
importScripts("${BRYTHON_URL}brython.min.js", "${BRYTHON_URL}brython_stdlib.min.js");
let fn = null;
try { __BRYTHON__.runPythonSource(${JSON.stringify(BRY_HELPER)}, { id: "__dm_helper" }); }
catch (e) { postMessage({ ready: false, error: String((e && e.message) || e) }); }
let tries = 0;
(function poll() {
  fn = self.__dm_run;
  if (typeof fn === "function") postMessage({ ready: true, version: (__BRYTHON__.implementation || [3]).slice(0, 3).join(".") });
  else if (tries++ < 50) setTimeout(poll, 100);
  else postMessage({ ready: false, error: "Brython helper did not load" });
})();
onmessage = (e) => {
  const { id, op, code } = e.data;
  if (op === "trace") { postMessage({ id, ok: false, error: "Tracing needs the Pyodide engine." }); return; }
  try { postMessage({ id, ok: true, result: fn(code) }); }
  catch (err) { postMessage({ id, ok: false, error: String(err) }); }
};
`;

  /** a worker reply must have exactly the shape the page renders, or Python is restarted */
  function validResult(r) {
    const str = (x) => typeof x === 'string';
    if (!r || typeof r !== 'object' || !str(r.out)) return false;
    if (r.err != null && (typeof r.err !== 'object' || !str(r.err.type) || !str(r.err.msg) || !(r.err.line == null || Number.isInteger(r.err.line)))) return false;
    if (r.steps === undefined) return true;
    if (!Array.isArray(r.steps)) return false;
    return r.steps.every((st) => st && typeof st === 'object' && Number.isInteger(st.line) && (st.ev === 'line' || st.ev === 'return') && str(st.fn) && str(st.out)
      && Number.isInteger(st.depth) && st.vars && typeof st.vars === 'object' && !Array.isArray(st.vars) && Object.values(st.vars).every(str) && (st.ret === undefined || str(st.ret)));
  }

  const PY = (DM.py = {
    state: 'idle', // idle | loading | ready | failed
    engine: null, // pyodide | brython | null
    version: '',
    canTrace: false,
    listeners: new Set(),
    worker: null,
    workerUrl: null,
    ready: null, // promise for the current worker's startup
    pending: new Map(),
    seq: 0,
    queue: Promise.resolve(),
    _ensure: null,
    set(state, extra) {
      this.state = state;
      Object.assign(this, extra || {});
      for (const fn of this.listeners) fn(this);
    },
    label() {
      if (this.state === 'idle') return 'Python loads on first run';
      if (this.state === 'loading') return this.engine === 'brython' ? 'Loading Python (Brython)…' : 'Loading Python 3 (one-time download)…';
      if (this.state === 'ready') return this.engine === 'pyodide' ? `Python ${this.version} · Pyodide` : `Python ${this.version} · Brython`;
      return 'Live Python unavailable here, showing expected output';
    },
    /** Picks an engine once: Pyodide first, Brython if the host blocks it. */
    ensure() {
      if (this._ensure) return this._ensure;
      const forced = params.get('py');
      this._ensure = (async () => {
        if (forced === 'none') throw new Error('disabled');
        if (forced !== 'brython') {
          try {
            this.set('loading', { engine: 'pyodide' });
            await this._boot();
            this.set('ready', { canTrace: true });
            return;
          } catch (e) {
            console.warn('[DM] Pyodide unavailable, trying Brython:', e.message);
            this._kill();
          }
        }
        this.set('loading', { engine: 'brython' });
        await this._boot();
        this.set('ready', { canTrace: false });
      })().catch((e) => {
        console.warn('[DM] No Python engine:', e.message);
        this._kill();
        this.set('failed', { engine: null });
        throw e;
      });
      return this._ensure;
    },
    /** Starts a worker for the chosen engine; every caller shares the same startup promise. */
    _boot() {
      if (this.ready) return this.ready;
      const pyodide = this.engine === 'pyodide';
      const boot = new Promise((resolve, reject) => {
        let url = null;
        let w;
        try {
          url = URL.createObjectURL(new Blob([pyodide ? PYODIDE_WORKER : BRYTHON_WORKER], { type: 'text/javascript' }));
          w = new Worker(url, { type: pyodide ? 'module' : 'classic' });
        } catch (e) {
          if (url) URL.revokeObjectURL(url);
          reject(e);
          return;
        }
        this.worker = w;
        this.workerUrl = url;
        const done = () => { clearTimeout(timer); if (this.workerUrl === url) { URL.revokeObjectURL(url); this.workerUrl = null; } };
        const timer = setTimeout(() => { done(); reject(new Error('Python load timed out')); }, 60000);
        w.onerror = (e) => { done(); reject(new Error(e.message || 'worker error')); };
        w.onmessage = (e) => {
          const d = e.data || {};
          if ('ready' in d) {
            done();
            if (d.ready) { this.version = d.version; resolve(); } else reject(new Error(d.error));
            return;
          }
          const p = this.pending.get(d.id);
          if (!p) return;
          this.pending.delete(d.id);
          clearTimeout(p.timer);
          let res;
          try {
            if (!d.ok) throw new Error(d.error || 'Python could not report the result');
            res = JSON.parse(d.result);
            if (!validResult(res)) throw new Error('unexpected result');
          } catch {
            this._kill();
            p.resolve({ out: '', err: { type: 'Restarted', msg: 'Python could not report this program\'s result. Its session was reset; the next run will start fresh.', line: null }, steps: [] });
            return;
          }
          p.resolve(res);
        };
      });
      this.ready = boot;
      boot.catch(() => { if (this.ready === boot) this._kill(); });
      return boot;
    },
    _kill() {
      if (this.worker) this.worker.terminate();
      if (this.workerUrl) URL.revokeObjectURL(this.workerUrl);
      this.worker = null;
      this.workerUrl = null;
      this.ready = null;
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('stopped')); }
      this.pending.clear();
    },
    /** Queues a run so only one program executes at a time. */
    exec(op, code) {
      const job = this.queue.then(() => this._run(op, code));
      this.queue = job.catch(() => {});
      return job;
    },
    async _run(op, code) {
      await this.ensure();
      if (op === 'trace' && !this.canTrace) throw new Error('Tracing needs the Pyodide engine.');
      if (!this.worker) {
        this.set('loading');
        try { await this._boot(); } catch (e) { this.set('failed'); throw e; }
        this.set('ready');
      } else await this.ready;
      const id = ++this.seq;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          this._kill(); // the next run starts a fresh worker
          resolve({ out: '', err: { type: 'Timeout', msg: `Stopped after ${RUN_TIMEOUT_MS / 1000} seconds. Look for a loop that never ends.`, line: null }, steps: [] });
        }, RUN_TIMEOUT_MS);
        this.pending.set(id, { resolve, reject, timer });
        this.worker.postMessage({ id, op, code });
      });
    },
    run(code) { return this.exec('run', code); },
    trace(code) { return this.exec('trace', code); },
  });

  /* ---------------- slide kinds ---------------- */
  const KIND_LABEL = { concept: 'Concept', lab: 'Interactive lab', code: 'Code walkthrough', design: 'Design practice', practice: 'Practice', quiz: 'Check yourself' };

  DM.kinds.concept = (body, sl, ctx) => {
    if (sl.html) body.append(...rich('div', sl.html).childNodes);
  };
  DM.kinds.lab = (body, sl, ctx) => {
    if (sl.html) body.append(...rich('div', sl.html).childNodes);
  };

  /* Code walkthrough: read line by line, edit and run, or trace execution step by step. */
  DM.kinds.code = (body, sl, ctx) => {
    if (sl.html) body.append(...rich('div', sl.html).childNodes);
    const src = sl.lines.map((l) => (Array.isArray(l) ? { code: l[0], ex: l[1] } : l));
    const original = src.map((l) => l.code).join('\n');
    let code = original;
    let mode = 'read';
    let cur = 0;
    let explainAll = false;
    let trace = null; // {steps, i, res}, only when the trace has at least one step
    let gen = 0; // bumps on every mode change or new request, so late results from an old request are ignored
    let busy = false;
    let playing = null;
    const firstReal = Math.max(0, src.findIndex((l) => l.code.trim() !== ''));
    cur = firstReal;

    const tabs = h('div.seg', { role: 'tablist', 'aria-label': 'Walkthrough mode' });
    const modeBtns = {};
    for (const [k, label] of [['read', 'Read'], ['edit', 'Edit & run'], ['trace', 'Trace']]) {
      modeBtns[k] = h('button', { role: 'tab', 'aria-selected': String(k === mode), onclick: () => setMode(k), title: { read: 'Explanation for every line', edit: 'Change the code and run it', trace: 'Run one line at a time and watch the variables' }[k] }, label);
      tabs.append(modeBtns[k]);
    }
    const view = h('div.cw-view');
    const status = h('span.py-status');
    const runBtn = h('button.btn.primary.sm', { onclick: () => run() }, '▶ Run');
    const resetBtn = h('button.btn.sm', { onclick: () => resetCode(), hidden: true }, 'Reset code');
    const out = h('pre', { 'aria-live': 'polite' });
    const outWrap = h('div.cw-out', h('div.cw-out-head', h('span.lbl', 'Output'), status, resetBtn, runBtn), out);
    const main = h('div.cw-main', h('div.cw-bar', h('span.cw-file', sl.file || 'example.py'), tabs), view, outWrap);

    const explain = h('div.cw-explain');
    const fivew = h('div.fivew');
    const side = h('aside.cw-side', explain, fivew);
    body.append(h('div.cw', main, side));

    // 5W card: who / what / where / when / why for the whole example
    const fw = sl.fivew || {};
    const fwKeys = ['what', 'why', 'who', 'where', 'when'].filter((k) => fw[k]);
    if (fwKeys.length) {
      const seg = h('div.seg', { role: 'tablist', 'aria-label': 'About this example' });
      const p = h('p');
      const show = (k) => { p.innerHTML = fw[k]; renderMath(p); $$('button', seg).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.k === k))); };
      fwKeys.forEach((k) => seg.append(h('button', { role: 'tab', dataset: { k }, onclick: () => show(k) }, k[0].toUpperCase() + k.slice(1))));
      fivew.append(seg, p);
      show(fwKeys[0]);
    } else fivew.hidden = true;

    const updStatus = () => { status.textContent = PY.label(); status.className = 'py-status ' + PY.state; };
    PY.listeners.add(updStatus);
    updStatus();
    if (ctx.print) {
      out.innerHTML = `<span class="dim">Output:</span>\n${esc(sl.expected ?? '')}`;
      status.textContent = 'Runs with real Python 3 in the interactive version';
    } else {
      out.innerHTML = `<span class="dim">Press Run to execute this program with real Python 3, right in your browser.</span>`;
    }

    function lineEx(i) {
      const l = src[i];
      if (!l) return '';
      return l.ex || (l.code.trim() === '' ? 'A blank line. Python ignores it; programmers leave blank lines to separate ideas, the way paragraphs separate thoughts in an essay.' : '');
    }
    function codeLines() { return code.split('\n'); }
    function edited() { return code !== original; }

    function drawLines(opts = {}) {
      const lines = codeLines();
      const ol = h('ol.cw-lines');
      lines.forEach((t, i) => {
        const li = h('li', { dataset: { i }, onclick: () => { if (mode === 'trace' && trace) return; select(i); } },
          h('span.ln', String(i + 1)), h('code', { html: hlPy(t) || ' ' }));
        if (explainAll && mode === 'read' && lineEx(i)) li.append(rich('div.inline-note', lineEx(i)));
        ol.append(li);
      });
      rc(view, ol);
    }
    function select(i, scroll = true) {
      const lines = codeLines();
      cur = Math.max(0, Math.min(lines.length - 1, i));
      $$('.cw-lines li', view).forEach((li) => li.classList.toggle('on', +li.dataset.i === cur));
      const li = $(`.cw-lines li[data-i="${cur}"]`, view);
      if (li && scroll) li.scrollIntoView({ block: 'nearest' });
      if (mode === 'read') drawExplain();
    }
    function drawExplain() {
      const lines = codeLines();
      const t = lines[cur] ?? '';
      const changed = src[cur] && src[cur].code !== t;
      rc(explain,
        h('div.where', h('span', `Line ${cur + 1} of ${lines.length}`), h('button.btn.sm', { class: explainAll ? 'on' : '', 'aria-pressed': String(explainAll), onclick: () => { explainAll = !explainAll; drawLines(); select(cur, false); } }, explainAll ? 'Hide notes in code' : 'Show all notes in code')),
        h('div.cw-echo', { html: hlPy(t) }),
        changed ? h('p.small.muted', 'You edited this line, so the explanation below describes the original version.') : null,
        rich('div.cw-text', lineEx(cur) || '<p class="muted">You added this line. Run the program to see what it does.</p>'),
        h('div.cw-nav',
          h('button.btn.sm', { onclick: () => select(prevReal(cur)), disabled: cur === 0 }, '↑ Previous line'),
          h('button.btn.sm', { onclick: () => select(nextReal(cur)), disabled: cur >= lines.length - 1 }, 'Next line ↓'),
          h('span.grow'),
          h('span.tiny.muted', h('kbd', '↑'), ' ', h('kbd', '↓'), ' step lines')),
      );
    }
    const isBlank = (i) => (codeLines()[i] ?? '').trim() === '';
    function nextReal(i) { let j = i + 1; const n = codeLines().length; while (j < n - 1 && isBlank(j)) j++; return Math.min(j, n - 1); }
    function prevReal(i) { let j = i - 1; while (j > 0 && isBlank(j)) j--; return Math.max(j, 0); }

    function drawEditor() {
      const wrap = h('div.editor');
      const pre = h('pre', { 'aria-hidden': 'true' });
      const gutter = h('div.gutter', { 'aria-hidden': 'true' });
      const ta = h('textarea', { spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Python code editor' });
      ta.value = code;
      const sync = () => {
        code = ta.value;
        const lines = code.split('\n');
        pre.innerHTML = lines.map((l) => hlPy(l)).join('\n') + '\n';
        gutter.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
        resetBtn.hidden = !edited();
      };
      ta.addEventListener('input', sync);
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          const { selectionStart: a, selectionEnd: b } = ta;
          ta.setRangeText('    ', a, b, 'end');
          sync();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          run();
        } else if (e.key === 'Escape') ta.blur();
      });
      wrap.append(gutter, pre, ta);
      rc(view, wrap);
      sync();
      const gutterRows = () => { const lh = parseFloat(getComputedStyle(pre).lineHeight); $$('div', gutter).forEach((d) => (d.style.height = lh + 'px')); };
      requestAnimationFrame(gutterRows);
      // let the textarea grow with its content so the code view scrolls as one piece
      const grow = () => { wrap.style.height = Math.max(view.clientHeight, pre.scrollHeight) + 'px'; };
      ta.addEventListener('input', grow);
      requestAnimationFrame(grow);
      rc(explain,
        h('div.where', h('span', 'Edit & run')),
        rich('div.cw-text', (sl.tryIt ? `<p><b>Try this:</b> ${sl.tryIt}</p>` : '') +
          '<p>Change anything you like, then press <b>Run</b> (or <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd>). Your edits stay put while you move between slides. <b>Reset code</b> brings back the original.</p>' +
          '<p class="small muted">Programs stop automatically after 10 seconds, so an accidental endless loop cannot freeze the page.</p>'),
      );
    }

    async function startTrace() {
      const my = gen;
      const stale = () => my !== gen || mode !== 'trace';
      rc(explain, h('div.where', h('span', 'Trace')), h('p.cw-text', 'Running your program one line at a time…'));
      rc(view, );
      drawLines();
      try {
        await PY.ensure();
      } catch {
        if (stale()) return;
        rc(explain, h('div.where', h('span', 'Trace')), h('p.cw-text', 'Tracing needs live Python, which this page cannot load right now. Use Read mode for the line-by-line explanation.'));
        return;
      }
      if (stale()) return;
      if (!PY.canTrace) {
        rc(explain, h('div.where', h('span', 'Trace')), h('p.cw-text', 'Step-by-step tracing needs the Pyodide engine, which this page cannot load here. Run still works, and Read mode explains every line.'));
        return;
      }
      const res = await PY.trace(code).catch((e) => ({ out: '', err: { type: 'Error', msg: e.message }, steps: [] }));
      if (stale()) return;
      const steps = Array.isArray(res.steps) ? res.steps : [];
      trace = steps.length ? { steps, i: 0, res } : null;
      showOutput(res);
      if (!trace) {
        rc(explain, h('div.where', h('span', 'Trace')), h('p.cw-text', 'The program stopped before running a single line. Check the error in the output panel.'));
        return;
      }
      drawTraceStep();
    }
    function drawTraceStep() {
      if (!trace || !trace.steps[trace.i]) return;
      const { steps } = trace;
      const i = trace.i;
      const st = steps[i];
      const prev = steps[i - 1];
      $$('.cw-lines li', view).forEach((li) => {
        li.classList.toggle('on', +li.dataset.i === st.line - 1);
        li.classList.remove('err');
      });
      const li = $(`.cw-lines li[data-i="${st.line - 1}"]`, view);
      if (li) li.scrollIntoView({ block: 'nearest' });
      const where = st.fn === '<module>' ? 'top level' : `inside ${st.fn}()`;
      const atEnd = i === steps.length - 1;
      const incomplete = trace.res.err?.type === 'StepLimit';
      let headline;
      if (atEnd && incomplete) headline = 'Last recorded step; tracing reached its limit. Later execution is not shown.';
      else if (st.ev === 'return') headline = st.fn === '<module>' ? 'The program has finished.' : `${st.fn}() returns ${st.ret}`;
      else headline = `Line ${st.line} is about to run (${where}).`;
      const rows = Object.entries(st.vars);
      const prevVars = prev && prev.depth === st.depth && prev.fn === st.fn ? prev.vars : {};
      const table = h('table.vars', h('tbody', rows.length ? rows.map(([k, v]) => h('tr', { class: prevVars[k] !== v ? 'changed' : '' }, h('td', k), h('td', v))) : h('tr', h('td', { colspan: 2, class: 'muted' }, 'No variables yet'))));
      const lineIdx = st.line - 1;
      const exHtml = src[lineIdx] && src[lineIdx].code === codeLines()[lineIdx] ? lineEx(lineIdx) : '<p class="muted">This line differs from the original, so there is no prepared note for it.</p>';
      const slider = h('input', { type: 'range', min: 0, max: steps.length - 1, value: i, 'aria-label': 'Trace step', oninput: (e) => { stopPlay(); trace.i = +e.target.value; drawTraceStep(); } });
      const captured = atEnd ? trace.res.out : st.out;
      const outputLabel = atEnd ? 'Final captured output:' : 'Output so far:';
      const outSoFar = captured ? `<span class="dim">${outputLabel}</span>\n${esc(captured)}` : `<span class="dim">${atEnd ? 'Nothing printed.' : 'Nothing printed yet.'}</span>`;
      out.innerHTML = outSoFar + ((atEnd || incomplete) && trace.res.err ? `\n<span class="err">${esc(trace.res.err.type)}: ${esc(trace.res.err.msg)}</span>` : '');
      rc(explain,
        h('div.where', h('span', `Step ${i + 1} of ${steps.length}`), h('span', where)),
        h('p', { style: { fontWeight: 600 } }, headline),
        h('div.trace-ctl',
          h('button.btn.sm', { onclick: () => stepTrace(-1), disabled: i === 0, 'aria-label': 'Previous step' }, '◀'),
          h('button.btn.sm', { onclick: () => togglePlay(), 'aria-label': playing ? 'Pause' : 'Play' }, playing ? '❚❚' : '▶'),
          slider,
          h('button.btn.sm', { onclick: () => stepTrace(1), disabled: i === steps.length - 1, 'aria-label': 'Next step' }, '▶|'),
          h('button.btn.sm', { onclick: () => { stopPlay(); trace.i = steps.length - 1; drawTraceStep(); } }, 'End')),
        h('div', h('div.tiny.muted', { style: { marginBottom: '0.2rem' } }, 'Variables right now (yellow = just changed)'), table),
        rich('div.cw-text.small', exHtml),
      );
    }
    function stepTrace(d) { if (!trace || !trace.steps.length) return; trace.i = Math.max(0, Math.min(trace.steps.length - 1, trace.i + d)); drawTraceStep(); }
    function togglePlay() {
      if (!trace) return;
      if (playing) { stopPlay(); drawTraceStep(); return; }
      playing = setInterval(() => { if (!trace || trace.i >= trace.steps.length - 1) { stopPlay(); drawTraceStep(); return; } trace.i++; drawTraceStep(); }, 650);
      drawTraceStep();
    }
    function stopPlay() { if (playing) clearInterval(playing); playing = null; }

    function setMode(k) {
      stopPlay();
      gen++;
      mode = k;
      trace = null;
      Object.entries(modeBtns).forEach(([n, b]) => b.setAttribute('aria-selected', String(n === k)));
      fivew.hidden = k === 'trace' || !fwKeys.length;
      resetBtn.hidden = !(k === 'edit' && edited());
      runBtn.textContent = k === 'trace' ? '▶ Trace again' : '▶ Run';
      if (k === 'read') { drawLines(); select(cur, false); }
      else if (k === 'edit') drawEditor();
      else startTrace();
    }
    function resetCode() {
      gen++;
      code = original;
      if (mode === 'edit') drawEditor();
      resetBtn.hidden = true;
      out.innerHTML = '<span class="dim">Code reset to the original.</span>';
    }
    function showOutput(res) {
      $$('.cw-lines li', view).forEach((li) => li.classList.remove('err'));
      let html = res.out ? esc(res.out) : '';
      if (res.err) {
        const where = res.err.line ? ` (line ${res.err.line})` : '';
        html += `${html && !html.endsWith('\n') ? '\n' : ''}<span class="err">${esc(res.err.type)}${where}: ${esc(res.err.msg)}</span>`;
        if (res.err.line) { const li = $(`.cw-lines li[data-i="${res.err.line - 1}"]`, view); if (li) li.classList.add('err'); }
      }
      out.innerHTML = html || '<span class="dim">(The program ran and printed nothing.)</span>';
    }
    async function run() {
      if (mode === 'trace') { setMode('trace'); return; }
      if (busy) return;
      busy = true;
      const my = ++gen;
      const snapshot = code;
      runBtn.disabled = true;
      out.innerHTML = '<span class="dim">Running…</span>';
      try {
        const res = await PY.run(snapshot);
        if (my === gen || (mode !== 'trace' && snapshot === code)) showOutput(res);
      } catch {
        if (my !== gen && (mode === 'trace' || snapshot !== code)) return;
        out.innerHTML = snapshot !== original
          ? '<span class="err">Live Python is unavailable on this page, so edited code cannot run here.</span>'
          : `<span class="dim">Expected output (live Python is unavailable here):</span>\n${esc(sl.expected ?? '')}`;
      } finally { busy = false; runBtn.disabled = false; }
    }

    ctx.keys = (e) => {
      if (mode === 'read') {
        if (e.key === 'ArrowDown') { select(nextReal(cur)); return true; }
        if (e.key === 'ArrowUp') { select(prevReal(cur)); return true; }
      } else if (mode === 'trace' && trace && trace.steps.length) {
        if (e.key === 'ArrowDown') { stepTrace(1); return true; }
        if (e.key === 'ArrowUp') { stepTrace(-1); return true; }
      }
      return false;
    };
    ctx.onHide(stopPlay);
    drawLines();
    select(cur, false);
    DM._codeHooks.push({ slide: sl, run: () => run(), getOut: () => out.textContent, setMode, explainAllLines: () => src.map((_, i) => lineEx(i)) });
  };
  DM._codeHooks = [];

  /* Design practice: a list of principles, each with a plain explanation and a do/avoid comparison. */
  DM.kinds.design = (body, sl, ctx) => {
    if (sl.html) body.append(...rich('div', sl.html).childNodes);
    const list = h('div.dp-list', { role: 'tablist', 'aria-label': 'Design principles' });
    const detail = h('div.dp-detail', { role: 'tabpanel' });
    body.append(h('div.dp', list, detail));
    const codeBox = (kind, c) => h('div.dp-code.' + (kind === 'bad' ? 'avoid' : 'good'), h('div.hd', c.label || (kind === 'good' ? '✓ Do this' : '✗ Avoid this')), h('pre', { html: c.code.split('\n').map(hlPy).join('\n') }));
    let cur = 0;
    const show = (i) => {
      cur = i;
      $$('button', list).forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); });
      const p = sl.principles[i];
      const norm = (c) => (typeof c === 'string' ? { code: c } : c);
      const cmp = p.good || p.bad ? h('div.dp-compare' + (p.good && p.bad ? '' : '.one'), p.bad ? codeBox('bad', norm(p.bad)) : null, p.good ? codeBox('good', norm(p.good)) : null) : null;
      rc(detail, h('div.where.tiny.muted.mono', `Principle ${i + 1} of ${sl.principles.length}`), h('h3', p.name), rich('div.stack', p.html), cmp);
    };
    sl.principles.forEach((p, i) => list.append(h('button', { role: 'tab', onclick: () => show(i) }, h('span.n', String(i + 1).padStart(2, '0')), h('span', p.name))));
    show(0);
    ctx.keys = (e) => {
      if (e.key === 'ArrowDown') { show(Math.min(sl.principles.length - 1, cur + 1)); return true; }
      if (e.key === 'ArrowUp') { show(Math.max(0, cur - 1)); return true; }
      return false;
    };
  };

  /* Answer checking for practice problems */
  function splitTop(str) {
    const out = [];
    let depth = 0, buf = '';
    for (const ch of str) {
      if ('([{'.includes(ch)) depth++;
      if (')]}'.includes(ch)) depth--;
      if (ch === ',' && depth === 0) { out.push(buf); buf = ''; } else buf += ch;
    }
    out.push(buf);
    return out.map((x) => x.trim()).filter((x) => x !== '');
  }
  const normEl = (x) => String(x).toLowerCase().replace(/\s+/g, '').replace(/^'(.*)'$|^"(.*)"$/, '$1$2');
  function parseCollection(input) {
    let t = String(input).trim();
    if (/^(∅|\{\s*\}|empty|set\(\))$/i.test(t)) return [];
    if (/^[{[(]/.test(t) && /[}\])]$/.test(t)) t = t.slice(1, -1);
    return splitTop(t).map(normEl);
  }
  function parseNumber(input) {
    const t = String(input).trim().replace(/,/g, '').replace(/\s+/g, '');
    const f = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(t);
    if (f) return Number(f[1]) / Number(f[2]);
    const pct = /^(-?\d+(?:\.\d+)?)%$/.exec(t);
    if (pct) return Number(pct[1]) / 100;
    return t === '' ? NaN : Number(t);
  }
  function checkAnswer(p, input) {
    if (p.check) return !!p.check(input);
    const fmt = p.format || (Array.isArray(p.answer) ? 'set' : typeof p.answer === 'number' ? 'number' : 'text');
    const alts = [p.answer, ...(p.accept || [])];
    if (fmt === 'set') {
      const got = new Set(parseCollection(input));
      return alts.some((a) => { const want = new Set((Array.isArray(a) ? a : parseCollection(a)).map(normEl)); return want.size === got.size && [...want].every((x) => got.has(x)); });
    }
    if (fmt === 'list') {
      const got = parseCollection(input);
      return alts.some((a) => { const want = (Array.isArray(a) ? a : parseCollection(a)).map(normEl); return want.length === got.length && want.every((x, i) => x === got[i]); });
    }
    if (fmt === 'number') {
      const g = parseNumber(input);
      return alts.some((a) => { const w = typeof a === 'number' ? a : parseNumber(a); return Number.isFinite(g) && Math.abs(g - w) <= Math.max(1e-9, p.tol || 0, Math.abs(w) * 1e-9); });
    }
    const n = (x) => String(x).toLowerCase().replace(/\s+/g, ' ').trim();
    return alts.some((a) => n(a) === n(input));
  }
  DM.checkAnswer = checkAnswer;

  /* Practice: endless generated problems with instant checking and worked solutions. */
  DM.kinds.practice = (body, sl, ctx) => {
    if (sl.html) body.append(...rich('div', sl.html).childNodes);
    const key = 'score.' + ctx.module.id;
    const saved = store.get(key, null);
    const okCount = (n) => Number.isSafeInteger(n) && n >= 0;
    const score = saved && typeof saved === 'object' && okCount(saved.tried) && okCount(saved.right) && okCount(saved.streak) && saved.streak <= saved.right && saved.right <= saved.tried && (saved.right !== saved.tried || saved.streak === saved.right)
      ? { tried: saved.tried, right: saved.right, streak: saved.streak } : { tried: 0, right: 0, streak: 0 };
    let gi = 0, prob = null, answered = false;
    const promptEl = h('div.pr-prompt');
    const input = h('input.inp', { type: 'text', 'aria-label': 'Your answer', autocomplete: 'off', spellcheck: 'false', onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } } });
    const choiceRow = h('div.choice-row');
    const checkBtn = h('button.btn.primary', { onclick: () => check() }, 'Check');
    const answerRow = h('div.pr-answer', input, checkBtn);
    const hintEl = h('div.small.muted');
    const fb = h('div.feedback', { 'aria-live': 'polite' });
    const sol = h('div.pr-solution', { hidden: true });
    const solBtn = h('button.btn', { onclick: () => { sol.hidden = !sol.hidden; solBtn.textContent = sol.hidden ? 'Show worked solution' : 'Hide worked solution'; } }, 'Show worked solution');
    const newBtn = h('button.btn', { onclick: () => fresh() }, 'New problem ↻');
    const mainEl = h('div.pr-main', h('div.tiny.mono.muted', { class: 'pr-type' }), promptEl, answerRow, choiceRow, hintEl, fb, h('div.row', solBtn, newBtn), sol);
    const types = h('div.pr-types');
    const scoreEl = h('div.pr-score');
    const side = h('div.pr-side', h('div.tiny.mono.muted', 'PROBLEM TYPE'), types, scoreEl, h('p.tiny.muted', 'Problems are generated fresh every time, so you can keep practicing as long as you like. Answers to sets can be typed like {1, 2, 3}; fractions like 3/8 work for numbers.'));
    body.append(h('div.pr', mainEl, side));
    sl.gens.forEach((g, i) => types.append(h('button.btn', { onclick: () => { gi = i; fresh(); } }, g.label)));
    const drawScore = () => rc(scoreEl,
      h('div', h('b', String(score.right)), h('span', 'Correct')),
      h('div', h('b', String(score.tried)), h('span', 'Tried')),
      h('div', h('b', String(score.streak)), h('span', 'Streak')));
    function fresh() {
      prob = sl.gens[gi].make(R, M);
      answered = false;
      $$('button', types).forEach((b, i) => b.classList.toggle('on', i === gi));
      $('.pr-type', mainEl).textContent = sl.gens[gi].label.toUpperCase();
      promptEl.innerHTML = prob.prompt; renderMath(promptEl);
      hintEl.innerHTML = prob.hint ? `Hint: ${prob.hint}` : ''; renderMath(hintEl);
      fb.textContent = ''; fb.className = 'feedback';
      sol.hidden = true; solBtn.textContent = 'Show worked solution';
      sol.innerHTML = prob.solution || ''; renderMath(sol);
      input.value = '';
      input.placeholder = prob.placeholder || 'Type your answer';
      if (prob.options) {
        answerRow.hidden = true;
        choiceRow.hidden = false;
        rc(choiceRow, ...prob.options.map((o) => { const b = h('button.btn', { html: String(o), onclick: () => check(String(o)) }); renderMath(b); return b; }));
      } else { answerRow.hidden = false; choiceRow.hidden = true; }
    }
    function check(val) {
      const v = val ?? input.value;
      if (!String(v).trim()) { fb.className = 'feedback info'; fb.textContent = 'Type an answer first, or open the worked solution.'; return; }
      const ok = checkAnswer(prob, v);
      if (!answered) { score.tried++; if (ok) { score.right++; score.streak++; } else score.streak = 0; store.set(key, score); drawScore(); }
      answered = true;
      fb.className = 'feedback ' + (ok ? 'good' : 'bad');
      fb.innerHTML = ok ? (prob.praise || 'Correct.') + ' Press <b>New problem</b> for another.' : 'Not quite. ' + (prob.wrongHint || 'Compare your answer with the worked solution.');
      if (!ok) { sol.hidden = false; solBtn.textContent = 'Hide worked solution'; }
      if (prob.options) $$('button', choiceRow).forEach((b) => b.classList.toggle('on', b.textContent === String(v)));
    }
    drawScore();
    fresh();
    if (ctx.print) { sol.hidden = false; }
    DM._practiceHooks.push({ slide: sl, sample: (n) => { const outp = []; for (let i = 0; i < n; i++) { const g = sl.gens[i % sl.gens.length]; outp.push({ label: g.label, ...g.make(R, M) }); } return outp; } });
  };
  DM._practiceHooks = [];

  /* Quiz: one question at a time, instant feedback with an explanation. */
  DM.kinds.quiz = (body, sl, ctx) => {
    if (sl.html) body.append(...rich('div', sl.html).childNodes);
    const qs = sl.questions;
    const picks = new Array(qs.length).fill(null);
    let qi = 0;
    const card = h('div.qz-card');
    const dots = h('div.qz-dots');
    const scoreEl = h('div.small');
    const nav = h('div.qz-nav', h('div.tiny.mono.muted', 'QUESTIONS'), dots, scoreEl,
      h('button.btn.sm', { onclick: () => { picks.fill(null); show(0); } }, 'Start over'));
    body.append(h('div.qz', card, nav));
    function show(i) {
      qi = i;
      const q = qs[i];
      const picked = picks[i];
      const choices = h('div.qz-choices');
      q.choices.forEach((c, j) => {
        const b = h('button', { onclick: () => { if (picks[i] != null) return; picks[i] = j; show(i); }, disabled: picked != null },
          h('span.k', 'ABCDEFG'[j]), rich('span', c));
        if (picked != null) {
          if (j === q.answer) b.classList.add('right');
          else if (j === picked) b.classList.add('wrong');
        }
        choices.append(b);
      });
      const explain = picked != null ? rich('div.feedback.' + (picked === q.answer ? 'good' : 'bad'), (picked === q.answer ? '<b>Correct.</b> ' : `<b>Not quite.</b> The answer is ${'ABCDEFG'[q.answer]}. `) + (q.explain || '')) : null;
      if (explain) explain.style.color = 'var(--ink)';
      rc(card,
        h('div.tiny.mono.muted', `QUESTION ${i + 1} OF ${qs.length}`),
        rich('div.qz-q', q.q), choices, explain,
        h('div.row', { style: { marginTop: 'auto' } },
          h('button.btn', { onclick: () => show(Math.max(0, i - 1)), disabled: i === 0 }, '← Previous question'),
          h('button.btn.primary', { onclick: () => show(Math.min(qs.length - 1, i + 1)), disabled: i === qs.length - 1 }, 'Next question →')),
      );
      rc(dots, ...qs.map((_, j) => h('button', { class: [j === i ? 'cur' : '', picks[j] == null ? '' : picks[j] === qs[j].answer ? 'right' : 'wrong'].join(' '), onclick: () => show(j), 'aria-label': `Question ${j + 1}` }, String(j + 1))));
      const done = picks.filter((p) => p != null).length;
      const right = picks.filter((p, j) => p === qs[j].answer).length;
      scoreEl.innerHTML = done ? `<b>${right}</b> of <b>${done}</b> answered correctly${done === qs.length ? (right === qs.length ? '. Perfect score.' : '. Review the red ones, then start over.') : ''}` : 'Pick an answer to see feedback.';
    }
    show(0);
  };

  /* ---------------- module registry ---------------- */
  DM.module = (m) => {
    if (!m || !m.id || !Array.isArray(m.slides)) { console.error('[DM] bad module', m); return; }
    DM.modules.push(m);
    if (m.css) document.head.append(Object.assign(document.createElement('style'), { textContent: m.css }));
    for (const [term, def] of Object.entries(m.terms || {})) if (!DM.terms.has(term.toLowerCase())) DM.terms.set(term.toLowerCase(), { term, def, mod: m });
    for (const sym of m.symbols || []) DM.symbols.push({ sym: sym[0], name: sym[1], ex: sym[2] || '', mod: m });
  };

  /* ---------------- app shell ---------------- */
  const ICON = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    sigma: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5H6l6 7-6 7h12"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
  };

  let flat = [];
  let curIndex = -1;
  const slideEls = new Map();
  const slideCtx = new Map();
  const savedVisited = store.get('visited', []);
  let visited = new Set(Array.isArray(savedVisited) ? savedVisited.filter((x) => typeof x === 'string') : []);

  function slideKey(f) { return `${f.m.id}-${f.si + 1}`; }

  function buildFlat() {
    DM.modules.sort((a, b) => a.num - b.num);
    flat = [];
    DM.modules.forEach((m, mi) => m.slides.forEach((sl, si) => flat.push({ m, mi, sl, si })));
  }

  function makeCtx(f) {
    const hide = [], show = [];
    return {
      module: f.m, slide: f.sl, print: PRINT, h, s, rc, esc, R, M, store,
      tex: renderMath, rich, hlPy,
      onHide: (fn) => hide.push(fn), onShow: (fn) => show.push(fn),
      _hide: hide, _show: show, keys: null,
      go: (id) => goTo(id),
    };
  }

  function renderSlide(f, ctx) {
    const { m, sl } = f;
    const kind = sl.kind || 'concept';
    const sec = h('section.slide.kind-' + kind, { 'aria-label': sl.title, dataset: { key: slideKey(f) } });
    const eyebrow = m.num === 0 ? 'Start here' : m.num >= 14 ? m.title : `Module ${m.num} · ${m.title}`;
    sec.append(h('header.slide-head',
      h('div', h('p.eyebrow', eyebrow), h('h2', { html: sl.title })),
      h('span.kind-tag.' + kind, KIND_LABEL[kind] || kind)));
    const body = h('div.slide-body');
    sec.append(body);
    try {
      (DM.kinds[kind] || DM.kinds.concept)(body, sl, ctx);
      if (typeof sl.render === 'function') sl.render(body, ctx);
    } catch (e) {
      console.error(`[DM] slide ${slideKey(f)} failed:`, e);
      body.append(h('div.warn', `This slide hit an error while drawing: ${e.message}`));
    }
    renderMath(body);
    $$('h2', sec).forEach(renderMath);
    return sec;
  }

  function goTo(target, opts = {}) {
    let idx = target;
    if (typeof target === 'number' && !Number.isInteger(target)) return;
    if (typeof target !== 'number' && typeof target !== 'string') return;
    if (typeof target === 'string') {
      const [mid, n] = target.split(/-(?=\d+$)/);
      idx = flat.findIndex((f) => f.m.id === mid && (n ? f.si === +n - 1 : f.si === 0));
      if (idx < 0) idx = flat.findIndex((f) => f.m.id === target);
    }
    if (idx < 0 || idx >= flat.length || idx === curIndex) return;
    const swap = () => {
      const old = flat[curIndex];
      if (old) {
        const el = slideEls.get(curIndex);
        if (el) el.hidden = true;
        slideCtx.get(curIndex)?._hide.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      }
      curIndex = idx;
      const f = flat[idx];
      let el = slideEls.get(idx);
      if (!el) {
        const ctx = makeCtx(f);
        el = renderSlide(f, ctx);
        slideEls.set(idx, el);
        slideCtx.set(idx, ctx);
        $('#stage').append(el);
      }
      el.hidden = false;
      slideCtx.get(idx)._show.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      visited.add(slideKey(f));
      store.set('visited', [...visited]);
      store.set('last', slideKey(f));
      updateChrome();
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce && !opts.instant && curIndex >= 0) document.startViewTransition(swap);
    else swap();
    try { history.replaceState(null, '', '#' + slideKey(flat[idx])); } catch { /* sandboxed: ignore */ }
  }
  DM.goTo = goTo;

  function updateChrome() {
    const f = flat[curIndex];
    const { m, si } = f;
    $('#crumb-mod').textContent = m.num === 0 ? m.title : m.num >= 14 ? m.title : `${m.num}. ${m.title}`;
    $('#crumb-slide').innerHTML = esc(f.sl.title.replace(/<[^>]+>/g, ''));
    const dots = $('#dots');
    rc(dots, ...m.slides.map((sl, j) => h('button', {
      class: [j === si ? 'on' : '', visited.has(`${m.id}-${j + 1}`) ? 'seen' : ''].join(' '),
      title: sl.title.replace(/<[^>]+>/g, ''), 'aria-label': `Slide ${j + 1}: ${sl.title.replace(/<[^>]+>/g, '')}`,
      onclick: () => goTo(flat.findIndex((x) => x.m === m && x.si === j)),
    })));
    $$('.rail button[data-mod]').forEach((b) => {
      const on = b.dataset.mod === m.id;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      const mod = DM.modules.find((x) => x.id === b.dataset.mod);
      const seen = mod.slides.filter((_, j) => visited.has(`${mod.id}-${j + 1}`)).length;
      const c = $('.fg', b);
      const len = 2 * Math.PI * 6;
      c.setAttribute('stroke-dasharray', `${(seen / mod.slides.length) * len} ${len}`);
    });
    $('#prev').disabled = curIndex === 0;
    $('#next').disabled = curIndex === flat.length - 1;
    const nextF = flat[curIndex + 1];
    $('#next-label').textContent = nextF ? (nextF.m !== m ? 'Next module' : 'Next') : 'Done';
    $('#count').textContent = `Slide ${si + 1} of ${m.slides.length} · ${visited.size} of ${flat.length} slides visited`;
    $('#bar').style.width = `${((curIndex + 1) / flat.length) * 100}%`;
    document.title = `${f.sl.title.replace(/<[^>]+>/g, '')} · Discrete Mathematics & Probability`;
  }

  function buildRail() {
    const rail = $('#rail');
    const groups = [['Start', (m) => m.num === 0], ['Modules', (m) => m.num > 0 && m.num < 14], ['Capstone', (m) => m.num >= 14]];
    for (const [label, test] of groups) {
      const mods = DM.modules.filter(test);
      if (!mods.length) continue;
      rail.append(h('h2', label));
      const ol = h('ol');
      for (const m of mods) {
        const ring = `<svg class="ring" viewBox="0 0 16 16" aria-hidden="true"><circle class="bg" cx="8" cy="8" r="6"/><circle class="fg" cx="8" cy="8" r="6" stroke-dasharray="0 40"/></svg>`;
        const b = h('button', { dataset: { mod: m.id }, onclick: () => { goTo(flat.findIndex((f) => f.m === m)); closeDrawer(); } },
          h('span.num', m.num === 0 ? '·' : m.num >= 14 ? '★' : String(m.num)), h('span', m.title), h('span', { html: ring }));
        ol.append(h('li', b));
      }
      rail.append(ol);
    }
  }

  /* glossary popover for <span class="term">…</span> */
  function wireTerms() {
    const pop = $('#term-pop');
    let timer;
    const show = (el) => {
      const key = (el.dataset.term || el.textContent).toLowerCase().trim();
      const t = DM.terms.get(key) || DM.terms.get(key.replace(/s$/, ''));
      if (!t) return;
      pop.innerHTML = `<b>${esc(t.term)}</b>${t.def}`;
      renderMath(pop);
      try { pop.showPopover(); } catch { pop.hidden = false; }
      const r = el.getBoundingClientRect();
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let x = Math.min(window.innerWidth - pw - 8, Math.max(8, r.left));
      let y = r.bottom + 6;
      if (y + ph > window.innerHeight - 8) y = r.top - ph - 6;
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
    };
    const hide = () => { try { pop.hidePopover(); } catch { pop.hidden = true; } };
    document.addEventListener('pointerover', (e) => { const t = e.target.closest?.('.term'); if (t) { clearTimeout(timer); show(t); } });
    document.addEventListener('pointerout', (e) => { if (e.target.closest?.('.term')) timer = setTimeout(hide, 120); });
    document.addEventListener('focusin', (e) => { const t = e.target.closest?.('.term'); if (t) show(t); });
    document.addEventListener('focusout', (e) => { if (e.target.closest?.('.term')) hide(); });
    const obs = new MutationObserver(() => $$('.term:not([tabindex])').forEach((t) => t.setAttribute('tabindex', '0')));
    obs.observe($('#stage'), { childList: true, subtree: true });
  }

  /* dialogs: search palette, notation, glossary, keyboard help */
  function openPalette() {
    const dlg = $('#dlg-palette');
    const input = $('.palette-input', dlg);
    const list = $('.palette-list', dlg);
    let sel = 0;
    const items = [
      ...flat.map((f, i) => ({ label: f.sl.title.replace(/<[^>]+>/g, ''), meta: f.m.num > 0 && f.m.num < 14 ? `Module ${f.m.num} · ${f.m.title}` : f.m.title, kind: f.sl.kind || 'concept', go: () => goTo(i) })),
      ...[...DM.terms.values()].map((t) => ({ label: t.term, meta: 'Glossary · ' + t.mod.title, kind: 'term', go: () => goTo(flat.findIndex((f) => f.m === t.mod)) })),
    ];
    const draw = () => {
      const q = input.value.toLowerCase().trim();
      const hits = items.filter((it) => !q || (it.label + ' ' + it.meta + ' ' + it.kind).toLowerCase().includes(q)).slice(0, 40);
      sel = Math.min(sel, Math.max(0, hits.length - 1));
      rc(list, ...hits.map((it, i) => h('li', h('button', { class: i === sel ? 'sel' : '', onclick: () => { dlg.close(); it.go(); } }, h('span', it.label), h('span.meta', it.meta)))));
      list._hits = hits;
    };
    input.value = '';
    input.oninput = () => { sel = 0; draw(); };
    input.onkeydown = (e) => {
      const hits = list._hits || [];
      if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && hits[sel]) { dlg.close(); hits[sel].go(); }
    };
    draw();
    dlg.showModal();
    input.focus();
  }
  function openNotation() {
    const dlg = $('#dlg-notation');
    const body = $('.dlg-body', dlg);
    rc(body, h('p.small.muted', { style: { marginBottom: '0.6rem' } }, 'Every symbol used in this course, in the order the modules introduce them.'),
      h('div.sym-grid', DM.symbols.map((x) => h('div', h('span.s', x.sym), h('span', h('div.n', x.name), h('div.e', x.ex))))));
    dlg.showModal();
  }
  function openGlossary() {
    const dlg = $('#dlg-glossary');
    const body = $('.dlg-body', dlg);
    const terms = [...DM.terms.values()].sort((a, b) => a.term.localeCompare(b.term));
    const dl = h('dl.gloss');
    for (const t of terms) { dl.append(h('dt', t.term, ' ', h('span.from', '· ' + t.mod.title))); dl.append(rich('dd', t.def)); }
    rc(body, dl);
    dlg.showModal();
  }

  function toggleTheme() {
    const root = document.documentElement;
    const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
  }

  function onKey(e) {
    if (e.defaultPrevented || document.querySelector('dialog[open]')) return;
    const t = e.target;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // inside a tab group, left/right move between tabs (standard tab behaviour) instead of changing slides
    const tab = t.closest && t.closest('[role="tab"]');
    if (tab && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')) {
      const list = tab.closest('[role="tablist"]') || tab.parentElement;
      const tabs = [...list.querySelectorAll('[role="tab"]')].filter((x) => !x.disabled && x.offsetParent !== null);
      const i = tabs.indexOf(tab);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      if (tabs[j]) { e.preventDefault(); tabs[j].focus(); tabs[j].click(); }
      return;
    }
    const ctx = slideCtx.get(curIndex);
    if (ctx && ctx.keys && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && ctx.keys(e)) { e.preventDefault(); return; }
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': e.preventDefault(); goTo(curIndex + 1); break;
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); goTo(curIndex - 1); break;
      case ']': { const i = flat.findIndex((f, j) => j > curIndex && f.si === 0); if (i >= 0) goTo(i); break; }
      case '[': { const m = flat[curIndex].m; const start = flat.findIndex((f) => f.m === m); const prevStart = flat.findIndex((f) => f.m === DM.modules[DM.modules.indexOf(m) - 1]); goTo(flat[curIndex].si > 0 ? start : prevStart); break; }
      case '/': e.preventDefault(); openPalette(); break;
      case '?': $('#dlg-help').showModal(); break;
      case 'n': openNotation(); break;
      case 'g': openGlossary(); break;
      case 't': toggleTheme(); break;
      case 'm': toggleRail(); break;
      default:
    }
  }
  const NARROW = '(max-width: 1100px)';
  /** keeps the module list out of the tab order whenever it is off screen, and reports its state */
  function syncRail(focusInto) {
    const app = $('#app'), rail = $('#rail'), btn = $('#rail-btn');
    if (!rail || !btn) return;
    const narrow = matchMedia(NARROW).matches;
    const open = narrow ? app.classList.contains('rail-open') : !app.classList.contains('rail-collapsed');
    rail.inert = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open && focusInto && narrow) { const b = rail.querySelector('button.on') || rail.querySelector('button'); if (b) b.focus(); }
    if (!open && rail.contains(document.activeElement)) btn.focus();
  }
  function closeDrawer() { const app = $('#app'); if (app.classList.contains('rail-open')) { app.classList.remove('rail-open'); syncRail(); } }
  function toggleRail() {
    const app = $('#app');
    if (matchMedia(NARROW).matches) app.classList.toggle('rail-open');
    else { app.classList.toggle('rail-collapsed'); store.set('railCollapsed', app.classList.contains('rail-collapsed')); }
    syncRail(true);
  }

  function buildChrome() {
    const app = $('#app');
    app.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" id="rail-btn" aria-label="Show or hide the module list (M)" title="Modules (M)">${ICON.menu}</button>
        <div class="brand"><span class="qed" aria-hidden="true">∎</span><span class="full">Discrete Math &amp; Probability</span></div>
        <div class="crumbs"><span class="sep" aria-hidden="true">/</span><span id="crumb-mod"></span><span class="sep" aria-hidden="true">/</span><span id="crumb-slide"></span></div>
        <div class="dots" id="dots" aria-label="Slides in this module"></div>
        <div class="tools">
          <button class="icon-btn" id="search-btn" title="Search slides and terms (Ctrl/⌘ K)" aria-label="Search">${ICON.search}<span class="lbl">Search</span></button>
          <button class="icon-btn" id="notation-btn" title="Notation reference (N)" aria-label="Notation reference">${ICON.sigma}</button>
          <button class="icon-btn" id="gloss-btn" title="Glossary (G)" aria-label="Glossary">${ICON.book}</button>
          <button class="icon-btn" id="theme-btn" title="Light or dark (T)" aria-label="Switch light or dark theme">${ICON.theme}</button>
          <button class="icon-btn" id="help-btn" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">${ICON.help}</button>
        </div>
      </header>
      <nav class="rail" id="rail" aria-label="Modules"></nav>
      <main class="stage" id="stage" tabindex="-1" style="view-transition-name: stage"></main>
      <footer class="botbar">
        <button class="nav-btn" id="prev" aria-label="Previous slide (left arrow)">← <span>Back</span></button>
        <div class="progress"><div class="bar"><i id="bar"></i></div><div class="hint" id="count"></div></div>
        <button class="nav-btn next" id="next" aria-label="Next slide (right arrow)"><span id="next-label">Next</span> →</button>
      </footer>`;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="dlg-palette" aria-label="Search"><div class="dlg-body" style="max-height:none"><input class="inp palette-input" id="palette-q" placeholder="Search slides, topics and glossary terms…" aria-label="Search"><ul class="palette-list"></ul></div></dialog>
      <dialog id="dlg-notation"><div class="dlg-head"><h2>Notation reference</h2><button class="btn sm" data-close>Close</button></div><div class="dlg-body"></div></dialog>
      <dialog id="dlg-glossary"><div class="dlg-head"><h2>Glossary</h2><button class="btn sm" data-close>Close</button></div><div class="dlg-body"></div></dialog>
      <dialog id="dlg-help"><div class="dlg-head"><h2>Keyboard shortcuts</h2><button class="btn sm" data-close>Close</button></div><div class="dlg-body"><div class="keys">
        <span><kbd>→</kbd> <kbd>←</kbd></span><span>Next or previous slide</span>
        <span><kbd>]</kbd> <kbd>[</kbd></span><span>Next module, or back to the start of this one</span>
        <span><kbd>↓</kbd> <kbd>↑</kbd></span><span>Step through code lines, trace steps, or design principles</span>
        <span><kbd>Ctrl</kbd>/<kbd>⌘</kbd> <kbd>K</kbd> or <kbd>/</kbd></span><span>Search every slide and glossary term</span>
        <span><kbd>N</kbd></span><span>Notation reference</span>
        <span><kbd>G</kbd></span><span>Glossary</span>
        <span><kbd>M</kbd></span><span>Show or hide the module list</span>
        <span><kbd>T</kbd></span><span>Light or dark theme</span>
        <span><kbd>Ctrl</kbd>/<kbd>⌘</kbd> <kbd>Enter</kbd></span><span>Run code while editing</span>
      </div></div></dialog>
      <div id="term-pop" popover="manual" role="tooltip"></div>`);
    $$('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    $$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
    $('#rail-btn').onclick = toggleRail;
    $('#search-btn').onclick = openPalette;
    $('#notation-btn').onclick = openNotation;
    $('#gloss-btn').onclick = openGlossary;
    $('#theme-btn').onclick = toggleTheme;
    $('#help-btn').onclick = () => $('#dlg-help').showModal();
    $('#prev').onclick = () => goTo(curIndex - 1);
    $('#next').onclick = () => goTo(curIndex + 1);
    app.addEventListener('click', (e) => { if (e.target === app) closeDrawer(); });
    document.addEventListener('pointerdown', (e) => { if (app.classList.contains('rail-open') && !e.target.closest('.rail, #rail-btn')) closeDrawer(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    if (store.get('railCollapsed', false) === true) app.classList.add('rail-collapsed');
    $('#rail-btn').setAttribute('aria-controls', 'rail');
    matchMedia(NARROW).addEventListener('change', () => syncRail());
  }

  /* ---------------- print mode: one 16:9 page per slide, plus answer and explanation pages ---------------- */
  function chunk(items, weight, max) {
    const pages = [[]];
    let w = 0;
    for (const it of items) {
      const iw = weight(it);
      if (w + iw > max && pages[pages.length - 1].length) { pages.push([]); w = 0; }
      pages[pages.length - 1].push(it);
      w += iw;
    }
    return pages;
  }
  function buildPrint() {
    document.body.classList.add('print-mode');
    document.documentElement.dataset.theme = 'light';
    const app = $('#app');
    app.innerHTML = '';
    let pageNo = 0;
    const page = (inner, label, extraClass = '') => {
      pageNo++;
      const pg = h('div.print-page' + extraClass, inner, h('div.pfoot', h('span', 'Discrete Mathematics & Probability'), h('span', label), h('span', String(pageNo))));
      app.append(pg);
      return pg;
    };
    const docSlide = (eyebrow, title, ...content) => {
      const sec = h('section.slide', h('header.slide-head', h('div', h('p.eyebrow', eyebrow), h('h2', { html: title }))), h('div.slide-body', ...content));
      renderMath(sec);
      return sec;
    };
    for (const [idx, f] of flat.entries()) {
      const ctx = makeCtx(f);
      const sec = renderSlide(f, ctx);
      const label = f.m.num > 0 && f.m.num < 14 ? `Module ${f.m.num} · ${f.m.title}` : f.m.title;
      page(sec, label);
      ctx._show.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      const sl = f.sl;
      const t = sl.title.replace(/<[^>]+>/g, '');
      if (sl.kind === 'code') {
        const rows = sl.lines.map((l, i) => (Array.isArray(l) ? { n: i + 1, code: l[0], ex: l[1] } : { n: i + 1, code: l.code, ex: l.ex })).filter((r) => r.code.trim() !== '');
        const pages = chunk(rows, (r) => 1 + Math.floor((r.ex || '').replace(/<[^>]+>/g, '').length / 140), 27);
        pages.forEach((rs, k) => page(docSlide(label, `${t}: every line explained${pages.length > 1 ? ` (${k + 1}/${pages.length})` : ''}`,
          h('table.print-lines', h('tbody', rs.map((r) => h('tr', h('td.n', String(r.n)), h('td.c', h('code', { html: hlPy(r.code) })), rich('td', r.ex || '')))))), label, '.doc'));
      } else if (sl.kind === 'quiz') {
        const txt = (x) => (x || '').replace(/<[^>]+>/g, '');
        const pages = chunk(sl.questions.map((q, i) => ({ q, i })), (x) => 3 + Math.floor((txt(x.q.q).length + txt(x.q.choices[x.q.answer]).length + txt(x.q.explain).length) / 80), 50);
        pages.forEach((qs, k) => page(docSlide(label, `${t}: answers explained${pages.length > 1 ? ` (${k + 1}/${pages.length})` : ''}`,
          h('div.print-flow.two', ...qs.map(({ q, i }) => h('div.box', rich('div', `<b>${i + 1}.</b> ${q.q}`), rich('div.small', `<b class="ok">Answer ${'ABCDEFG'[q.answer]}:</b> ${q.choices[q.answer]}`), rich('div.small.muted', q.explain || ''))))), label, '.doc'));
      } else if (sl.kind === 'practice') {
        const hook = DM._practiceHooks.find((x) => x.slide === sl);
        if (hook) {
          const probs = hook.sample(Math.min(4, Math.max(3, sl.gens.length)));
          page(docSlide(label, `${t}: sample problems with solutions`, h('div.cols', probs.map((p) => h('div.box', h('div.tiny.mono.muted', p.label.toUpperCase()), rich('div', p.prompt), rich('div.small', p.solution || `Answer: ${esc(Array.isArray(p.answer) ? M.fmtSet(p.answer) : p.answer)}`))))), label, '.doc');
        }
      } else if (sl.kind === 'design') {
        const code = (c) => (c ? (typeof c === 'string' ? c : c.code) : '');
        const pages = chunk(sl.principles, (p) => 4 + Math.floor((p.html || '').replace(/<[^>]+>/g, '').length / 60) + (p.good ? code(p.good).split('\n').length + 1 : 0), 72);
        pages.forEach((ps, k) => page(docSlide(label, `${t}: all principles${pages.length > 1 ? ` (${k + 1}/${pages.length})` : ''}`,
          h('div.print-flow', ps.map((p) => h('div.box', h('h3', { style: { fontSize: '1rem' } }, p.name), rich('div.small', p.html), p.good ? h('pre.small', { style: { margin: '0.3rem 0 0', whiteSpace: 'pre-wrap' }, html: code(p.good).split('\n').map(hlPy).join('\n') }) : null)))), label, '.doc'));
      }
      void idx;
    }
    document.body.dataset.printReady = '1';
  }

  /* ---------------- boot ---------------- */
  function boot() {
    const theme = store.get('theme', null);
    if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
    buildFlat();
    if (PRINT) { buildPrint(); return; }
    buildChrome();
    buildRail();
    syncRail();
    wireTerms();
    document.addEventListener('keydown', onKey);
    const readHash = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } };
    const hash = readHash();
    const last = store.get('last', null);
    const start = (hash && flat.some((f) => slideKey(f) === hash || f.m.id === hash)) ? hash : typeof last === 'string' ? last : null;
    curIndex = -1;
    if (start) goTo(start, { instant: true });
    if (curIndex < 0) goTo(0, { instant: true });
    window.addEventListener('hashchange', () => { const k = readHash(); if (k && k !== slideKey(flat[curIndex])) goTo(k); });
    document.body.dataset.ready = '1';
  }
  DM.boot = boot;
  DM.util = { h, s, rc, esc, R, M, store, renderMath, rich, hlPy, checkAnswer, parseCollection, parseNumber };
})();
