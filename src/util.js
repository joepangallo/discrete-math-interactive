/* Pure helpers shared by the course engine and its test suite: seeded random numbers, the
   number helpers practice generators receive as `M`, and the answer checker. This file has no
   DOM dependencies, so `node --test` can load it and fuzz every generator offline. */
(() => {
  'use strict';

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
    range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; },
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
  const normEl = (x) => String(x).toLowerCase().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/^'(.*)'$|^"(.*)"$/, '$1$2');
  function parseCollection(input) {
    let t = String(input).trim();
    if (/^(∅|\{\s*\}|empty|set\(\))$/i.test(t)) return [];
    if (/^[{[(]/.test(t) && /[}\])]$/.test(t)) t = t.slice(1, -1);
    return splitTop(t).map(normEl);
  }
  /* Accepts "3/8", "37.5%", "1,024" and the typographic minus (U+2212) that worked solutions print. */
  function parseNumber(input) {
    const t = String(input).trim().replace(/,/g, '').replace(/\s+/g, '').replace(/[−–]/g, '-');
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
    const n = (x) => String(x).toLowerCase().replace(/\s+/g, ' ').replace(/[−–]/g, '-').trim();
    return alts.some((a) => n(a) === n(input));
  }

  /* HTML escaping for text that ends up inside innerHTML strings. */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* A slide's key in the URL and in saved progress comes from its title ("Lab: Venn diagram
     calculator" -> "lab-venn-diagram-calculator"), so inserting or reordering slides does not move
     bookmarks. A title that is all symbols falls back to the position. */
  function slugKey(title, position) {
    const slug = String(title ?? '').replace(/<[^>]+>/g, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
    return /[a-z]/.test(slug) ? slug : String(position);
  }

  globalThis.DMUtil = { mulberry32, R, M, splitTop, normEl, parseCollection, parseNumber, checkAnswer, esc, slugKey };
})();
