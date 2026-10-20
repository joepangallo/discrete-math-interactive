/* Module 4: Functions, Sequences & Relations. Objective 4: describe the use of functions, sequences and
   relations in computer science and engineering. */
(() => {
  const LET = ['a', 'b', 'c', 'd', 'e'];
  const range = (n) => [...Array(n).keys()];
  const fmt = (arr) => (arr.length ? '{' + arr.join(', ') + '}' : '∅');
  const texSet = (arr) => (arr.length ? '\\{' + arr.join(', ') + '\\}' : '\\varnothing');
  const CLASS_COLORS = ['var(--fnc)', 'var(--num)', 'var(--kw)', 'var(--str)', 'var(--accent)', 'var(--warn)'];
  const STROKE = { base: 'var(--ink-3)', acc: 'var(--accent)', bad: 'var(--false)', good: 'var(--true)', inv: 'var(--fnc)' };

  // ---- drawing helpers shared by the concept slides and the labs ----
  function markers(s, prefix) {
    return s('defs', null, ...Object.entries(STROKE).map(([k, c]) =>
      s('marker', { id: `${prefix}-${k}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 10, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto' },
        s('path', { d: 'M0,0 L10,5 L0,10 z', fill: c }))));
  }
  // shorten a segment so it starts and ends on the rims of two circles
  function trim(x1, y1, x2, y2, r1, r2) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    return [x1 + (dx / L) * r1, y1 + (dy / L) * r1, x2 - (dx / L) * r2, y2 - (dy / L) * r2];
  }

  /* Arrow diagram: inputs on the left, outputs on the right. arrows: [{ from, to, kind, reverse }].
     Dots become keyboard-reachable buttons when onX / onY handlers are given. */
  function arrowDiagram(s, o) {
    const W = 440, H = 330, xl = 115, xr = 325, cy = 182;
    const yAt = (k, n) => cy + (k - (n - 1) / 2) * Math.min(56, 230 / Math.max(1, n - 1));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label });
    svg.append(markers(s, o.prefix));
    for (const [x, title] of [[xl, o.xTitle], [xr, o.yTitle]]) {
      svg.append(s('ellipse', { cx: x, cy, rx: 62, ry: 142, fill: 'var(--paper)', stroke: 'var(--rule)', 'stroke-width': 1.5 }));
      svg.append(s('text', { x, y: 22, 'text-anchor': 'middle', fill: 'var(--ink-2)', 'font-size': 15, 'font-weight': 600, text: title }));
    }
    const nx = o.X.length, ny = o.Y.length;
    for (const a of o.arrows) {
      let p = [xl, yAt(a.from, nx), xr, yAt(a.to, ny)];
      if (a.reverse) p = [p[2], p[3], p[0], p[1]];
      const [x1, y1, x2, y2] = trim(...p, 18, 19);
      svg.append(s('line', { x1, y1, x2, y2, fill: 'none', stroke: STROKE[a.kind], 'stroke-width': a.kind === 'bad' ? 3 : 2.2, 'marker-end': `url(#${o.prefix}-${a.kind})` }));
    }
    const dot = (x, y, label, st, onPick, aria) => {
      const g = s('g', onPick ? { class: 'm4-dot', tabindex: 0, role: 'button', 'aria-label': aria } : null);
      g.append(s('circle', { cx: x, cy: y, r: 16, fill: st.fill || 'var(--sheet)', stroke: st.stroke || 'var(--ink-2)', 'stroke-width': st.w || 1.6, 'stroke-dasharray': st.dash || null }));
      g.append(s('text', { x, y: y + 5, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 15, 'font-weight': 600, text: label }));
      if (onPick) {
        g.addEventListener('click', onPick);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } });
      }
      return g;
    };
    o.X.forEach((lbl, i) => svg.append(dot(xl, yAt(i, nx), lbl, o.xStyle ? o.xStyle(i) : {}, o.onX && (() => o.onX(i)), `input ${lbl}`)));
    o.Y.forEach((lbl, j) => svg.append(dot(xr, yAt(j, ny), lbl, o.yStyle ? o.yStyle(j) : {}, o.onY && (() => o.onY(j)), `output ${lbl}`)));
    return svg;
  }

  /* Digraph of a relation on n points around a circle. edge(i, j) returns null or { kind, dashed }.
     When both directions are drawn, each arrow bends to its own side so the two stay apart. */
  function digraph(s, o) {
    const W = o.size || 300, c = W / 2, R = W * 0.33, r = W * 0.068;
    const P = range(o.n).map((i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / o.n; return [c + R * Math.cos(a), c + R * Math.sin(a)]; });
    const svg = s('svg', { viewBox: `0 0 ${W} ${W}`, role: 'img', 'aria-label': o.label });
    svg.append(markers(s, o.prefix));
    for (let i = 0; i < o.n; i++) for (let j = 0; j < o.n; j++) {
      const e = o.edge(i, j);
      if (!e) continue;
      const st = { fill: 'none', stroke: STROKE[e.kind], 'stroke-width': e.kind === 'base' ? 1.7 : 2.8, 'stroke-dasharray': e.dashed ? '5 4' : null };
      if (i === j) {
        const [x, y] = P[i];
        const L = Math.hypot(x - c, y - c) || 1;
        svg.append(s('circle', { cx: x + ((x - c) / L) * (r + 10), cy: y + ((y - c) / L) * (r + 10), r: 12, ...st }));
        continue;
      }
      const [x1, y1] = P[i], [x2, y2] = P[j];
      const L = Math.hypot(x2 - x1, y2 - y1);
      const bend = o.edge(j, i) ? 20 : 0;
      const mx = (x1 + x2) / 2 - ((y2 - y1) / L) * bend, my = (y1 + y2) / 2 + ((x2 - x1) / L) * bend;
      const [sx, sy] = trim(x1, y1, mx, my, r, 0);
      const [, , ex, ey] = trim(mx, my, x2, y2, 0, r + 2);
      svg.append(s('path', { d: `M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`, ...st, 'marker-end': `url(#${o.prefix}-${e.kind})` }));
    }
    P.forEach(([x, y], i) => {
      svg.append(s('circle', { cx: x, cy: y, r, fill: 'var(--sheet)', stroke: 'var(--ink-2)', 'stroke-width': 1.6 }));
      const tint = o.tint && o.tint(i);
      if (tint) svg.append(s('circle', { cx: x, cy: y, r, fill: tint, 'fill-opacity': 0.3, stroke: tint, 'stroke-width': 2.6 }));
      svg.append(s('text', { x, y: y + W * 0.02, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': W * 0.058, 'font-weight': 600, text: o.labels[i] }));
    });
    return svg;
  }

  /* Hasse diagram of a partial order: lt(i, j) means "i comes strictly before j". Each element sits on a
     level equal to the length of the longest chain below it; only covering pairs get a line. */
  function hasse(s, o) {
    const n = o.labels.length, W = o.w || 300, H = o.h || 300, r = o.r || 17;
    const level = new Array(n).fill(0);
    for (let pass = 0; pass < n; pass++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (o.lt(i, j)) level[j] = Math.max(level[j], level[i] + 1);
    const top = Math.max(0, ...level);
    const pos = [];
    range(top + 1).forEach((L) => {
      const ids = range(n).filter((i) => level[i] === L);
      ids.forEach((i, k) => { pos[i] = [(W * (k + 1)) / (ids.length + 1), top ? H - r - 8 - (L * (H - 2 * r - 16)) / top : H / 2]; });
    });
    const covers = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (o.lt(i, j) && !range(n).some((k) => o.lt(i, k) && o.lt(k, j))) covers.push([i, j]);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label });
    covers.forEach(([i, j]) => svg.append(s('line', { x1: pos[i][0], y1: pos[i][1], x2: pos[j][0], y2: pos[j][1], stroke: 'var(--accent)', 'stroke-width': 2.2, fill: 'none' })));
    range(n).forEach((i) => {
      svg.append(s('circle', { cx: pos[i][0], cy: pos[i][1], r, fill: 'var(--sheet)', stroke: 'var(--ink-2)', 'stroke-width': 1.6 }));
      svg.append(s('text', { x: pos[i][0], y: pos[i][1] + 5, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': o.fs || 15, 'font-weight': 600, text: o.labels[i] }));
    });
    return { svg, covers };
  }

  // ---- relation property checks that return a witness (the pairs that break the property) ----
  function relProps(M) {
    const n = M.length, P = (i, j) => [i, j];
    const out = { refl: null, sym: null, anti: null, trans: null };
    for (let i = 0; i < n && !out.refl; i++) if (!M[i][i]) out.refl = { have: [], miss: [P(i, i)] };
    for (let i = 0; i < n && !out.sym; i++) for (let j = 0; j < n && !out.sym; j++) if (M[i][j] && !M[j][i]) out.sym = { have: [P(i, j)], miss: [P(j, i)] };
    for (let i = 0; i < n && !out.anti; i++) for (let j = i + 1; j < n && !out.anti; j++) if (M[i][j] && M[j][i]) out.anti = { have: [P(i, j), P(j, i)], miss: [] };
    for (let i = 0; i < n && !out.trans; i++) for (let j = 0; j < n && !out.trans; j++) for (let k = 0; k < n && !out.trans; k++) if (M[i][j] && M[j][k] && !M[i][k]) out.trans = { have: [P(i, j), P(j, k)], miss: [P(i, k)] };
    return out;
  }

  // ---- a tiny, safe formula language for the sum lab: numbers, i, + - * / ^, parentheses ----
  function lex(src) {
    const t = [];
    const str = String(src).replace(/[·×]/g, '*').replace(/−/g, '-').replace(/\*\*/g, '^');
    let k = 0;
    while (k < str.length) {
      const ch = str[k];
      if (/\s/.test(ch)) { k++; continue; }
      const num = /^\d+(\.\d+)?/.exec(str.slice(k));
      if (num) { t.push({ t: 'num', v: parseFloat(num[0]) }); k += num[0].length; continue; }
      if (ch === 'i') { t.push({ t: 'i' }); k++; continue; }
      if ('+-*/^()'.includes(ch)) { t.push({ t: ch }); k++; continue; }
      throw new Error(`I don't understand "${ch}". Use numbers, i, + − * / ^ and parentheses.`);
    }
    return t;
  }
  function parseFormula(src) {
    const t = lex(src);
    let k = 0;
    const peek = () => (t[k] ? t[k].t : null);
    function expr() { let n = term(); while (peek() === '+' || peek() === '-') { const op = t[k++].t; n = { op, a: n, b: term() }; } return n; }
    function term() {
      let n = unary();
      for (;;) {
        if (peek() === '*' || peek() === '/') { const op = t[k++].t; n = { op, a: n, b: unary() }; }
        else if (peek() === 'num' || peek() === 'i' || peek() === '(') n = { op: '*', a: n, b: power(), implicit: true };
        else return n;
      }
    }
    function unary() { if (peek() === '-') { k++; return { op: 'neg', a: unary() }; } return power(); }
    function power() { const base = atom(); if (peek() === '^') { k++; return { op: '^', a: base, b: unary() }; } return base; }
    function atom() {
      const tok = t[k++];
      if (!tok) throw new Error('The formula ends too early.');
      if (tok.t === 'num') return { v: tok.v };
      if (tok.t === 'i') return { i: true };
      if (tok.t === '(') { const n = expr(); if (peek() !== ')') throw new Error('A "(" is missing its ")".'); k++; return n; }
      throw new Error(`Unexpected "${tok.t}".`);
    }
    if (!t.length) throw new Error('Type a formula in i, for example 2i - 1.');
    const tree = expr();
    if (k < t.length) throw new Error('Unexpected symbol near the end of the formula.');
    return tree;
  }
  function evalF(n, i) {
    if ('v' in n) return n.v;
    if (n.i) return i;
    if (n.op === 'neg') return -evalF(n.a, i);
    const a = evalF(n.a, i), b = evalF(n.b, i);
    if (n.op === '+') return a + b;
    if (n.op === '-') return a - b;
    if (n.op === '*') return a * b;
    if (n.op === '/') { if (b === 0) throw new Error(`The term for i = ${i} divides by zero, so it is undefined. Start the index higher.`); return a / b; }
    return a ** b;
  }
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
  function texF(n, p = 0) {
    if ('v' in n) return String(n.v);
    if (n.i) return 'i';
    let q = PREC[n.op], out;
    if (n.op === 'neg') out = '-' + texF(n.a, q);
    else if (n.op === '/') { out = `\\frac{${texF(n.a)}}{${texF(n.b)}}`; q = 5; }
    else if (n.op === '^') out = `${texF(n.a, 5)}^{${texF(n.b)}}`;
    else if (n.op === '*') out = n.implicit && !('v' in n.b) ? texF(n.a, q) + texF(n.b, q + 0.5) : `${texF(n.a, q)} \\cdot ${texF(n.b, q + 0.5)}`;
    else out = `${texF(n.a, q)} ${n.op} ${texF(n.b, q + 0.5)}`;
    return q < p ? `\\left(${out}\\right)` : out;
  }
  function pyF(n, p = 0) {
    if ('v' in n) return String(n.v);
    if (n.i) return 'i';
    const q = PREC[n.op];
    let out;
    if (n.op === 'neg') out = '-' + pyF(n.a, q);
    else if (n.op === '^') out = `${pyF(n.a, 5)}**${pyF(n.b, 4)}`;
    else if (n.op === '*') out = `${pyF(n.a, q)}*${pyF(n.b, q + 0.5)}`;
    else out = `${pyF(n.a, q)} ${n.op} ${pyF(n.b, q + 0.5)}`;
    return q < p ? `(${out})` : out;
  }
  const num = (x) => {
    if (!Number.isFinite(x)) return String(x);
    if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
    if (Math.abs(x) >= 1e15 || (x !== 0 && Math.abs(x) < 1e-4)) return x.toExponential(4).replace('e+', '×10^').replace('e-', '×10^-');
    return String(parseFloat(x.toFixed(6)));
  };
  const fact = (n) => { let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };

  DM.module({
    id: 'relations',
    num: 4,
    title: 'Functions, Sequences & Relations',
    objectives: [4],
    terms: {
      'function': 'A rule f: X → Y that assigns each element of X exactly one element of Y. Formally, a set of ordered pairs in which every x ∈ X appears as a first coordinate exactly once.',
      'domain': 'The set X of allowed inputs of a function f: X → Y.',
      'codomain': 'The set Y that the outputs of f: X → Y are declared to come from. Not every element of Y has to be used.',
      'range': 'The set of outputs a function actually produces, {f(x) | x ∈ X}. Also called the image. It is always a subset of the codomain.',
      'one-to-one': 'Injective: different inputs always give different outputs. If f(x₁) = f(x₂) then x₁ = x₂.',
      'onto': 'Surjective: every element of the codomain is the output of at least one input, so the range equals the codomain.',
      'bijection': 'A function that is both one-to-one and onto. Exactly the bijections have an inverse function f⁻¹, which reverses every arrow.',
      'composition': '(g ∘ f)(x) = g(f(x)): apply f first, then apply g to the result. Order matters: g ∘ f and f ∘ g are usually different.',
      'floor': '⌊x⌋ is the greatest integer less than or equal to x, so ⌊2.7⌋ = 2 and ⌊−2.7⌋ = −3. Its partner, the ceiling ⌈x⌉, is the least integer greater than or equal to x.',
      'hash function': 'A function that maps keys from a huge domain (such as all strings) to a small set of slots {0, 1, …, m − 1}. It must be deterministic. With more keys than slots it cannot be one-to-one, so collisions happen.',
      'sequence': 'A function whose domain is a set of consecutive integers. The value at n is the n-th term, written sₙ.',
      'string': 'A finite sequence of symbols from an alphabet X. The empty string is λ, the length of s is |s|, and X* is the set of all strings over X.',
      'relation': 'A relation R from A to B is any subset of A × B. We write a R b when (a, b) ∈ R. A relation on A is a subset of A × A.',
      'reflexive': 'A relation R on A is reflexive if x R x for every x ∈ A: every vertex of the digraph has a loop.',
      'symmetric': 'R is symmetric if x R y always implies y R x: every arrow has a return arrow, and the matrix equals its transpose.',
      'antisymmetric': 'R is antisymmetric if x R y and y R x together force x = y: no two different elements point at each other.',
      'transitive': 'R is transitive if x R y and y R z always imply x R z: every two-step path has a shortcut. The transitive closure adds the fewest pairs needed to make this true.',
      'equivalence relation': 'A relation that is reflexive, symmetric and transitive. The equivalence class [a] collects everything related to a, and the classes partition the set.',
      'partial order': 'A relation that is reflexive, antisymmetric and transitive, such as ≤, "divides" or ⊆. Drawn compactly as a Hasse diagram.',
      'n-ary relation': 'A subset of A₁ × A₂ × ⋯ × Aₙ, that is, a set of n-tuples. A table in a relational database is an n-ary relation: each row is a tuple.',
    },
    symbols: [
      ['f: X → Y', 'f is a function from X to Y', 'f: ℤ → ℤ, f(x) = x²'],
      ['f(X)', 'range (image) of f', 'f(X) ⊆ Y'],
      ['f⁻¹', 'inverse function', 'f⁻¹(f(x)) = x'],
      ['g ∘ f', 'composition: f first, then g', '(g ∘ f)(x) = g(f(x))'],
      ['⌊x⌋', 'floor: round down to an integer', '⌊−2.3⌋ = −3'],
      ['⌈x⌉', 'ceiling: round up to an integer', '⌈2.1⌉ = 3'],
      ['n mod m', 'remainder when n is divided by m', '17 mod 5 = 2'],
      ['sₙ', 'n-th term of a sequence', 's₃ = 7 for sₙ = 2n + 1'],
      ['λ', 'the empty string', '|λ| = 0'],
      ['X*', 'all strings over the alphabet X', 'abba ∈ {a, b}*'],
      ['Σ', 'sum notation', 'Σᵢ₌₁³ i = 1 + 2 + 3'],
      ['Π', 'product notation', 'Πᵢ₌₁⁴ i = 24'],
      ['a R b', 'a is related to b: (a, b) ∈ R', '2 | 6'],
      ['a | b', 'a divides b', '3 | 12'],
      ['[a]', 'equivalence class of a', '[1] = {…, 1, 4, 7, …} mod 3'],
      ['a ≡ b (mod n)', 'a and b leave the same remainder mod n', '17 ≡ 2 (mod 5)'],
      ['⪯', 'a partial order', '{1} ⪯ {1, 2} under ⊆'],
      ['σ π ⋈', 'select, project, join', 'π_name(σ_major=AI(Student))'],
    ],
    css: `
      .m4-dot { cursor: pointer; outline: none; }
      .m4-dot:hover circle, .m4-dot:focus-visible circle { stroke: var(--accent); stroke-width: 3; }
      .m4-verdict { display: grid; grid-template-columns: 1.7rem minmax(0, 1fr); gap: 0.5rem; align-items: start; font-size: 0.9rem; line-height: 1.4; }
      .m4-verdict .pill { text-align: center; padding: 0.05rem 0; }
      .m4-panel .pill.na, .m4-props .pill.na { color: var(--ink-3); background: var(--paper); }
      .m4-mat { border-collapse: separate; border-spacing: 3px; }
      .m4-mat th { font-family: var(--font-mono); font-size: 0.8rem; color: var(--ink-3); font-weight: 600; padding: 0 0.2rem; }
      .m4-mat td { padding: 0; }
      .m4-mat button { width: 2.15rem; height: 2.15rem; border: 1px solid var(--rule); border-radius: 0.3rem; background: var(--sheet); color: var(--ink-3); font-family: var(--font-mono); font-size: 0.9rem; cursor: pointer; padding: 0; }
      .m4-mat button:hover { border-color: var(--accent); }
      .m4-mat button.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
      .m4-mat button.new { background: var(--true-bg); border: 2px solid var(--true); color: var(--true); font-weight: 700; }
      .m4-mat button.wit { box-shadow: 0 0 0 3px var(--false); }
      .m4-mat button.miss { background: var(--false-bg); color: var(--false); border: 2px dashed var(--false); font-weight: 600; }
      .m4-relgrid { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(0, 1.3fr); gap: 1rem; min-height: 0; align-items: stretch; }
      .m4-props { display: grid; gap: 0.3rem; }
      .m4-props button { display: grid; grid-template-columns: 1.7rem minmax(0, 1fr); gap: 0.5rem; align-items: start; text-align: left; border: 1px solid var(--rule); background: var(--sheet); border-radius: var(--radius); padding: 0.3rem 0.55rem; cursor: pointer; font-size: 0.86rem; line-height: 1.35; color: var(--ink); }
      .m4-props button.on { border-color: var(--false); background: var(--false-bg); }
      .m4-props .pill { text-align: center; }
      .m4-db table.data { font-size: 0.8rem; }
      .m4-db table.data th, .m4-db table.data td { padding: 0.12rem 0.4rem; line-height: 1.25; }
      .m4-db table.data th.keep { color: var(--accent); }
      .m4-db table.data tr.hit td { background: var(--mark); color: var(--mark-ink); }
      .m4-db pre { margin: 0; font-size: 0.78rem; line-height: 1.45; white-space: pre-wrap; background: var(--code-bg); border: 1px solid var(--rule); border-radius: 0.35rem; padding: 0.35rem 0.55rem; }
      .m4-db .cap { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 0.15rem; }
      .m4-db select { font-size: 0.85rem; padding: 0.15rem 0.3rem; }
      .m4-db label.chk { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; font-family: var(--font-mono); }
      .m4-sum pre { margin: 0; font-size: 0.8rem; white-space: pre-wrap; background: var(--code-bg); border: 1px solid var(--rule); border-radius: 0.35rem; padding: 0.35rem 0.6rem; }
      .m4-modstrip { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.2rem; }
      .m4-modstrip span { text-align: center; font-family: var(--font-mono); font-size: 0.8rem; border-radius: 0.25rem; padding: 0.05rem 0; border: 1.5px solid; background: var(--sheet); }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Functions: domain, codomain and range',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">function</span> \(f\) from a set \(X\) to a set \(Y\), written \(f: X \to Y\), assigns <b>each</b> element \(x \in X\) <b>exactly one</b> element \(f(x) \in Y\).</div>
              <ul>
                <li>The <span class="term">domain</span> \(X\) is the set of allowed inputs.</li>
                <li>The <span class="term">codomain</span> \(Y\) is the set the outputs are declared to come from.</li>
                <li>The <span class="term">range</span>, or image, is the set of outputs actually produced: \(f(X) = \{f(x) \mid x \in X\} \subseteq Y\).</li>
              </ul>
              <p>Formally, a function <i>is</i> a set of ordered pairs \(f \subseteq X \times Y\) in which every \(x\) appears as a first coordinate exactly once. The picture on the right is the function \(f = \{(1, b), (2, d), (3, b)\}\).</p>
              <div class="ex">A function \(\mathbb{R} \to \mathbb{R}\) passes the <b>vertical-line test</b>: each vertical line \(x = c\) meets its graph exactly once. The circle \(x^2 + y^2 = 1\) fails, because the line \(x = 0\) meets it twice, at \(y = 1\) and \(y = -1\). So "\(y\) as a function of \(x\)" is not defined by the circle.</div>
            </div>
            <div class="stack">
              <div class="card stack" style="gap:0.3rem">
                <div class="figure" id="m4-arrow1"></div>
                <p class="small muted">Each input has exactly one arrow. Two inputs may share an output (1 and 3 both go to \(b\)), and outputs may go unused (\(a\) and \(c\)). Range \(= \{b, d\}\), codomain \(= \{a, b, c, d\}\).</p>
              </div>
              <div class="ai">Activation functions in neural networks are functions \(\mathbb{R} \to \mathbb{R}\). ReLU, \(f(x) = \max(0, x)\), has codomain \(\mathbb{R}\) and range \([0, \infty)\). The sigmoid has range \((0, 1)\), which is why its output can be read as a probability.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const svg = arrowDiagram(ctx.s, {
            prefix: 'm4a1', label: 'Arrow diagram of f from {1, 2, 3} to {a, b, c, d}', xTitle: 'X (domain)', yTitle: 'Y (codomain)',
            X: ['1', '2', '3'], Y: ['a', 'b', 'c', 'd'],
            arrows: [{ from: 0, to: 1, kind: 'acc' }, { from: 1, to: 3, kind: 'acc' }, { from: 2, to: 1, kind: 'acc' }],
            yStyle: (j) => (j === 0 || j === 2 ? { stroke: 'var(--ink-3)', dash: '4 3' } : { fill: 'var(--accent-2)', stroke: 'var(--accent)' }),
          });
          svg.style.maxHeight = '15.5rem';
          body.querySelector('#m4-arrow1').append(svg);
        },
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'One-to-one, onto, inverses and composition',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">\(f: X \to Y\) is <span class="term">one-to-one</span> (injective) when different inputs give different outputs: \(f(x_1) = f(x_2) \Rightarrow x_1 = x_2\). No two arrows land on the same point.</div>
              <div class="def">\(f\) is <span class="term">onto</span> (surjective) when every \(y \in Y\) is hit by some \(x\). Then the range equals the codomain.</div>
              <div class="def">A <span class="term">bijection</span> is both. It pairs \(X\) with \(Y\) perfectly, so two finite sets joined by a bijection have the same size.</div>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">\(f: \mathbb{Z} \to \mathbb{Z}\)</th><th>one-to-one?</th><th>onto?</th></tr></thead>
                <tbody>
                  <tr><td class="l">\(f(x) = 2x\)</td><td class="T">yes</td><td class="F">no: 3 is never hit</td></tr>
                  <tr><td class="l">\(f(x) = \lfloor x/2 \rfloor\)</td><td class="F">no: \(f(4) = f(5) = 2\)</td><td class="T">yes</td></tr>
                  <tr><td class="l">\(f(x) = x + 1\)</td><td class="T">yes</td><td class="T">yes</td></tr>
                </tbody>
              </table>
            </div>
            <div class="stack">
              <div class="thm">\(f\) has an inverse \(f^{-1}: Y \to X\) exactly when \(f\) is a bijection. Reverse every arrow: \(f^{-1}(y) = x \iff f(x) = y\), so \(f^{-1}(f(x)) = x\).</div>
              <div class="def">The <span class="term">composition</span> \(g \circ f\) applies \(f\) first, then \(g\): \((g \circ f)(x) = g(f(x))\). The outputs of \(f\) must be valid inputs for \(g\).</div>
              <div class="warn">Order matters. With \(f(x) = x + 1\) and \(g(x) = 2x\): \((g \circ f)(3) = g(4) = 8\) but \((f \circ g)(3) = f(6) = 7\). Also, \(f^{-1}(x)\) means the inverse function, never \(1 / f(x)\).</div>
              <div class="ai">A neural network is a composition of layers, \(f_L \circ \cdots \circ f_2 \circ f_1\), so the input passes through \(f_1\) first. A tokenizer's encoder is a bijection between its tokens and their ID numbers, which is why decoding the IDs gives back exactly the original tokens.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: draw a function, test its properties',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click an input on the left, then an output on the right to add that arrow (click the same output again to remove it). The verdicts update instantly and name the exact element that breaks each property. Red marks the evidence.</p>`,
        render(body, ctx) {
          const { h, R } = ctx;
          const XL = ['1', '2', '3', '4', '5'];
          const PRESETS = [
            ['Bijection', 4, 4, [[1], [3], [0], [2]]],
            ['One-to-one, not onto', 3, 4, [[2], [0], [3]]],
            ['Onto, not one-to-one', 5, 4, [[0], [1], [2], [3], [1]]],
            ['Neither', 4, 4, [[0], [1], [0], [2]]],
            ['Not a function', 4, 4, [[1], [0, 2], [3], []]],
          ];
          let nx = 4, ny = 4, arrows = [[0], [1], [0], [2]], sel = null, showInv = false;
          const segX = h('div.seg'), segY = h('div.seg');
          [2, 3, 4, 5].forEach((k) => {
            segX.append(h('button', { onclick: () => { nx = k; while (arrows.length < nx) arrows.push([]); arrows.length = nx; sel = null; draw(); } }, String(k)));
            segY.append(h('button', { onclick: () => { ny = k; arrows = arrows.map((ys) => ys.filter((j) => j < ny)); draw(); } }, String(k)));
          });
          const presetRow = h('div.row', { style: { gap: '0.3rem' } },
            PRESETS.map(([name, a, b, arr]) => h('button.btn.sm', { onclick: () => { nx = a; ny = b; arrows = arr.map((x) => x.slice()); sel = null; showInv = false; draw(); } }, name)),
            h('button.btn.sm', { onclick: () => { arrows = range(nx).map(() => [R.int(0, ny - 1)]); sel = null; draw(); } }, 'Random function'),
            h('button.btn.sm', { onclick: () => { arrows = range(nx).map(() => []); sel = 0; draw(); } }, 'Clear arrows'));
          const fig = h('div.figure.fill', { style: { minHeight: 0 } });
          const hint = h('p.small', { 'aria-live': 'polite', style: { minHeight: '1.4em' } });
          const panel = h('div.stack.m4-panel', { style: { gap: '0.45rem', minHeight: 0 } });
          body.append(
            h('div.row', { style: { gap: '0.5rem' } }, h('span.small.muted', 'Inputs |X|'), segX, h('span.small.muted', { style: { marginLeft: '0.4rem' } }, 'Outputs |Y|'), segY, h('span', { style: { width: '0.6rem' } }), presetRow),
            h('div.split.fill', { style: { minHeight: 0, alignItems: 'stretch' } }, h('div.stack', { style: { minHeight: 0, gap: '0.3rem' } }, fig, hint), panel));

          function analyze() {
            const noArrow = [], multi = [];
            arrows.forEach((ys, i) => { if (!ys.length) noArrow.push(i); else if (ys.length > 1) multi.push(i); });
            const isFn = !noArrow.length && !multi.length;
            const hitBy = range(ny).map(() => []);
            arrows.forEach((ys, i) => ys.forEach((j) => hitBy[j].push(i)));
            const collide = hitBy.findIndex((xs) => xs.length > 1);
            const unhit = range(ny).filter((j) => !hitBy[j].length);
            return { noArrow, multi, isFn, hitBy, collide, unhit, inj: isFn && collide < 0, surj: isFn && !unhit.length };
          }
          function pickX(i) { sel = sel === i ? null : i; draw(); }
          function pickY(j) {
            if (sel == null) { hint.textContent = 'Pick an input on the left first, then click this output.'; return; }
            const ys = arrows[sel];
            const at = ys.indexOf(j);
            if (at >= 0) ys.splice(at, 1);
            else { ys.push(j); ys.sort(); if (sel < nx - 1) sel++; }
            draw();
          }
          function draw() {
            [...segX.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.textContent === nx)));
            [...segY.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.textContent === ny)));
            const a = analyze();
            const bij = a.inj && a.surj;
            if (!bij) showInv = false;
            const X = XL.slice(0, nx), Y = LET.slice(0, ny);
            const list = [];
            arrows.forEach((ys, i) => ys.forEach((j) => {
              const bad = (!a.isFn && a.multi.includes(i)) || (a.isFn && a.collide === j);
              list.push({ from: i, to: j, kind: showInv ? 'inv' : bad ? 'bad' : 'acc', reverse: showInv });
            }));
            const svg = arrowDiagram(ctx.s, {
              prefix: 'm4fn', label: 'Arrow diagram you can edit', xTitle: showInv ? 'X (now the codomain)' : 'X (domain)', yTitle: showInv ? 'Y (now the domain)' : 'Y (codomain)',
              X, Y, arrows: list, onX: pickX, onY: pickY,
              xStyle: (i) => (i === sel ? { fill: 'var(--mark)', stroke: 'var(--accent)', w: 3 } : a.noArrow.includes(i) || a.multi.includes(i) ? { stroke: 'var(--false)', w: 2.4, dash: a.noArrow.includes(i) ? '4 3' : null } : {}),
              yStyle: (j) => (a.isFn && a.unhit.includes(j) ? { stroke: 'var(--false)', w: 2.4, dash: '4 3' } : a.hitBy[j].length ? { fill: 'var(--accent-2)' } : {}),
            });
            ctx.rc(fig, svg);
            hint.innerHTML = sel != null ? `Input <b>${X[sel]}</b> is selected: click an output on the right to give it an arrow.` : 'Click an input on the left (it turns yellow), then an output on the right.';

            const row = (ok, label, text) => h('div.m4-verdict', h('span.pill.' + (ok === null ? 'na' : ok ? 't' : 'f'), ok === null ? '–' : ok ? '✓' : '✗'), h('div', h('b', label), ' ', h('span', { html: text })));
            let fnText;
            if (a.isFn) fnText = 'Every input has exactly one arrow.';
            else if (a.multi.length) { const i = a.multi[0]; fnText = `Input ${X[i]} has ${arrows[i].length} arrows (to ${arrows[i].map((j) => Y[j]).join(' and ')}), so \\(f(${X[i]})\\) would be ambiguous.`; }
            else { const i = a.noArrow[0]; fnText = `Input ${X[i]} has no arrow, so \\(f(${X[i]})\\) is undefined. A function must use its whole domain.`; }
            let injText, surjText;
            if (!a.isFn) injText = surjText = 'Only defined once the diagram is a function.';
            else {
              injText = a.inj ? 'Different inputs always reach different outputs.' : `\\(f(${X[a.hitBy[a.collide][0]]}) = f(${X[a.hitBy[a.collide][1]]}) = ${Y[a.collide]}\\): two inputs share one output.`;
              if (!a.inj && nx > ny) injText += ` With ${nx} inputs and only ${ny} outputs this is unavoidable (the pigeonhole principle).`;
              surjText = a.surj ? 'Every output is hit, so the range equals the codomain.' : `Nothing maps to ${a.unhit.map((j) => `\\(${Y[j]}\\)`).join(' or ')}, so the range is smaller than the codomain.`;
              if (!a.surj && nx < ny) surjText += ` With fewer inputs than outputs, no function can be onto.`;
            }
            const pairs = arrows.flatMap((ys, i) => ys.map((j) => `(${X[i]}, ${Y[j]})`));
            const rangeEls = Y.filter((_, j) => a.hitBy[j].length);
            let invBox;
            if (bij) {
              invBox = h('div.box.small', h('div', { html: String.raw`\(f^{-1} = \{${arrows.map((ys, i) => `(${Y[ys[0]]}, ${X[i]})`).join(', ')}\}\)` }),
                h('button.btn.sm', { style: { marginTop: '0.35rem' }, 'aria-pressed': String(showInv), onclick: () => { showInv = !showInv; draw(); } }, showInv ? 'Show f again' : 'Reverse the arrows: show f⁻¹'));
            } else if (a.isFn) {
              const why = !a.inj ? `reversed, the arrows would send \\(${Y[a.collide]}\\) to two places (${a.hitBy[a.collide].map((i) => X[i]).join(' and ')}), so the reverse is not a function.` : `reversed, the arrows would leave \\(${Y[a.unhit[0]]}\\) with no output, so the reverse is not defined on all of \\(Y\\).`;
              invBox = h('div.box.small', { html: `<b>No inverse:</b> ${why}` });
            } else invBox = null;
            const legend = h('div.box.small', h('span.lbl.muted', 'Reading the picture'),
              h('div', { html: 'Solid <b class="bad">red arrows</b> are the evidence for the first failure. A <b class="bad">dashed red ring</b> marks an input with no arrow or an output nothing reaches. Shaded outputs form the range.' }),
              h('div.muted', { style: { marginTop: '0.25rem' }, html: 'One-to-one asks "does any output get two arrows?" Onto asks "does every output get at least one?"' }));
            ctx.rc(panel,
              row(a.isFn, 'Function?', fnText),
              row(a.isFn ? a.inj : null, 'One-to-one?', injText),
              row(a.isFn ? a.surj : null, 'Onto?', surjText),
              row(a.isFn ? bij : null, 'Bijection?', !a.isFn ? 'Needs a function first.' : bij ? 'One-to-one and onto: a perfect pairing, so \\(f\\) has an inverse.' : 'Needs to be one-to-one <i>and</i> onto.'),
              h('hr.soft'),
              h('div.small', { html: String.raw`${a.isFn ? '\\(f' : 'As a relation, \\(R'} = ${texSet(pairs)}\)` }),
              h('div.small', { html: String.raw`Range \(= ${texSet(rangeEls)} \subseteq\) codomain \(${texSet(Y)}\)` }),
              invBox, legend);
            ctx.tex(panel);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Floor, ceiling, mod and hash functions',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">The <span class="term">floor</span> \(\lfloor x \rfloor\) is the greatest integer \(\le x\). The ceiling \(\lceil x \rceil\) is the least integer \(\ge x\). Both are functions \(\mathbb{R} \to \mathbb{Z}\).</div>
              <table class="tt" style="width:100%">
                <thead><tr><th>\(x\)</th><th>\(2.3\)</th><th>\(-2.3\)</th><th>\(5\)</th><th class="l">used for</th></tr></thead>
                <tbody>
                  <tr><td>\(\lfloor x \rfloor\)</td><td>2</td><td>\(-3\)</td><td>5</td><td class="l small">middle index \(\lfloor (lo + hi)/2 \rfloor\)</td></tr>
                  <tr><td>\(\lceil x \rceil\)</td><td>3</td><td>\(-2\)</td><td>5</td><td class="l small">23 people, 4 per table: \(\lceil 23/4 \rceil = 6\) tables</td></tr>
                </tbody>
              </table>
              <div class="def">\(n \bmod m\) is the remainder \(r\) with \(0 \le r \lt m\) and \(n = m \cdot q + r\), where \(q = \lfloor n/m \rfloor\). So "mod \(m\)" is a function \(\mathbb{Z} \to \{0, 1, \dots, m - 1\}\): onto, never one-to-one.</div>
              <div class="warn">Python follows the math: <code>-7 % 3</code> is <code>2</code>, because \(-7 = 3 \cdot (-3) + 2\). C, Java and JavaScript return \(-1\) instead.</div>
            </div>
            <div class="stack">
              <div class="def">A <span class="term">hash function</span> maps keys from a huge domain (all possible strings) to a small codomain of slots \(\{0, \dots, m - 1\}\). A common recipe turns the key into an integer, then takes it mod \(m\).</div>
              <div class="ex">With \(h(k) = k \bmod 11\): \(h(15) = 4\), \(h(26) = 4\), \(h(40) = 7\). Keys 15 and 26 <b>collide</b> in slot 4.</div>
              <div class="thm">If there are more keys than slots, \(h\) cannot be one-to-one, so collisions are certain (the pigeonhole principle). A good hash spreads keys evenly over the slots.</div>
              <div class="tip">A hash must be a function: the same key gives the same slot every time. That is why Python dictionary keys must be immutable.</div>
              <div class="ai">An embedding table is a function from token IDs \(\{0, \dots, V - 1\}\) to vectors in \(\mathbb{R}^d\). The "hashing trick" maps an unlimited vocabulary into \(m\) feature columns with \(\text{hash}(w) \bmod m\).</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Code: functions as dictionaries',
        kind: 'code',
        file: 'functions.py',
        html: String.raw`<p class="muted small">A Python <code>dict</code> is a finite function: its keys are the domain and its values are the outputs. Click any line (or press <kbd>↓</kbd>) for its explanation, or switch to <b>Trace</b> to watch the comprehensions run.</p>`,
        fivew: {
          what: 'Stores a function as a dictionary, finds its range, tests one-to-one and onto, composes two functions, and builds an inverse.',
          why: 'Every property from the last three slides becomes one short, checkable line of code. Seeing the math as code makes both easier to remember.',
          who: 'Anyone writing lookup tables: grade-point converters, unit converters, the token-to-ID vocabulary of a language model, or a configuration map.',
          where: 'Tokenizers (encode and decode are inverse dictionaries), data-cleaning maps that recode categories, and caches that remember f(x) for inputs already seen.',
          when: 'Use a dict whenever the domain is finite and known, so the whole function can be written down as data instead of as an if/elif chain.',
        },
        lines: [
          ['f = {1: "b", 2: "c", 3: "a", 4: "c"}', 'Defines the function \\(f: \\{1, 2, 3, 4\\} \\to \\{a, b, c, d\\}\\) as a dict. Each key is an input and its value is the single output, so \\(f(1) = b\\). A dict cannot hold the same key twice, which matches the rule that each input has exactly one output.'],
          ['Y = {"a", "b", "c", "d"}', 'The codomain, stored separately as a set. A dict only records the outputs that are used, so Python cannot know the codomain unless we state it. Onto is a question about this set.'],
          ['image = set(f.values())', '<code>f.values()</code> lists the outputs <code>"b", "c", "a", "c"</code>; wrapping them in <code>set</code> removes the repeated <code>"c"</code>. The result is the range (image) of \\(f\\): <code>{"a", "b", "c"}</code>. (The domain is just the keys, which you get by looping over <code>f</code>.)'],
          ['print("one-to-one:", len(image) == len(f))', 'One-to-one means no two inputs share an output, so the number of distinct outputs must equal the number of inputs. <code>len(f)</code> counts the keys (4) and <code>len(image)</code> the distinct outputs (3), because 2 and 4 both map to <code>"c"</code>. Output: <code>one-to-one: False</code>.'],
          ['print("onto:", image == Y, "never hit:", sorted(Y - image))', 'Onto means the range equals the codomain. <code>Y - image</code> is the set difference: the outputs nobody maps to. We sort it because sets of strings print in an unpredictable order. Output: <code>onto: False never hit: [\'d\']</code>. Reporting <i>which</i> element fails is more useful than a bare False.'],
          ['', ''],
          ['def compose(g, f):', 'Defines a function that builds \\(g \\circ f\\). The parameter order matches the math notation: the function written first is applied last.'],
          ['    return {x: g[f[x]] for x in f}', 'A dict comprehension: for every input <code>x</code> of \\(f\\), the new value is <code>g[f[x]]</code>, which is \\(g(f(x))\\). The inner lookup <code>f[x]</code> runs first. If some <code>f[x]</code> were not a key of <code>g</code>, Python would raise <code>KeyError</code>: the composition needs the outputs of \\(f\\) to lie in the domain of \\(g\\).'],
          ['', ''],
          ['g = {"a": 10, "b": 20, "c": 30, "d": 40}', 'A second function \\(g: \\{a, b, c, d\\} \\to \\{10, 20, 30, 40\\}\\). Its domain is exactly the codomain of \\(f\\), so \\(g \\circ f\\) is defined.'],
          ['print("g∘f:", compose(g, f))', 'Composes and prints. \\(f(1) = b\\) and \\(g(b) = 20\\), so 1 maps to 20. Output: <code>g∘f: {1: 20, 2: 30, 3: 10, 4: 30}</code>. Dicts keep insertion order, so the keys print as 1, 2, 3, 4.'],
          ['h = {1: "b", 2: "c", 3: "a", 4: "d"}', 'A third function, \\(h\\). Unlike \\(f\\), it sends the four inputs to four different outputs and hits every letter, so it is a bijection.'],
          ['h_inv = {y: x for x, y in h.items()}', '<code>h.items()</code> yields the ordered pairs <code>(1, "b")</code>, <code>(2, "c")</code>, …. The comprehension swaps each pair, which reverses every arrow. This only gives a correct inverse because \\(h\\) is one-to-one; if two keys shared a value, the later one would silently overwrite the earlier one. Result: <code>{"b": 1, "c": 2, "a": 3, "d": 4}</code> (watch it appear in Trace mode).'],
          ['print("h⁻¹∘h:", compose(h_inv, h))', 'Reuses <code>compose</code> to apply \\(h\\) and then \\(h^{-1}\\). Every input comes back to itself, so the result is the identity function: <code>h⁻¹∘h: {1: 1, 2: 2, 3: 3, 4: 4}</code>. That is the defining property \\(h^{-1}(h(x)) = x\\), and exactly the test a tokenizer must pass: decoding the encoded text returns the original text.'],
        ],
        expected: "one-to-one: False\nonto: False never hit: ['d']\ng∘f: {1: 20, 2: 30, 3: 10, 4: 30}\nh⁻¹∘h: {1: 1, 2: 2, 3: 3, 4: 4}\n",
        tryIt: 'Add <code>print({y: x for x, y in f.items()})</code> to try inverting \\(f\\). Which input disappeared, and why? Then change <code>f[4]</code> to <code>"d"</code> and predict both verdicts before you run.',
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Sequences, strings and sum notation',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">sequence</span> is a function whose domain is a set of consecutive integers. Its value at \(n\) is the \(n\)-th term \(s_n\). Example: \(s_n = 2n + 1\) gives \(3, 5, 7, 9, \dots\)</div>
              <ul class="small">
                <li><b>Explicit</b> formula: compute any term directly, as in \(s_n = 2^n\).</li>
                <li><b>Recursive</b> formula: give a starting term and a rule built from earlier terms. With \(t_1 = 1\) and \(t_n = t_{n-1} + n\) we get \(1, 3, 6, 10, 15, \dots\)</li>
                <li><b>Increasing</b> means \(s_n \lt s_{n+1}\) for every \(n\); <b>decreasing</b> means \(s_n \gt s_{n+1}\).</li>
                <li>A <b>subsequence</b> keeps some terms in their original order: \(3, 10, 15\) is a subsequence of \(1, 3, 6, 10, 15\), while \(10, 3\) is not.</li>
              </ul>
              <div class="def">A <span class="term">string</span> over an alphabet \(X\) is a finite sequence of symbols from \(X\). \(\lambda\) is the empty string, \(|s|\) is the length, and \(X^*\) is the set of all strings. Over \(X = \{a, b\}\) there are \(2^n\) strings of length \(n\).</div>
            </div>
            <div class="stack">
              <div class="def" data-label="Sum and product notation">\[\sum_{i=m}^{n} a_i = a_m + a_{m+1} + \cdots + a_n \qquad \prod_{i=m}^{n} a_i = a_m \cdot a_{m+1} \cdots a_n\]
                The index \(i\) runs from the lower limit \(m\) to the upper limit \(n\). When \(m \gt n\) there are no terms: the empty sum is 0 and the empty product is 1.</div>
              <div class="thm">Arithmetic sum: \(\displaystyle\sum_{i=1}^{n} i = \frac{n(n+1)}{2}\). Geometric sum: \(\displaystyle\sum_{i=0}^{n} r^i = \frac{r^{n+1} - 1}{r - 1}\) for \(r \ne 1\).</div>
              <div class="ex">\(1 + 2 + \cdots + 100 = \frac{100 \cdot 101}{2} = 5050\), and \(1 + 2 + 4 + \cdots + 2^9 = 2^{10} - 1 = 1023\).</div>
              <div class="ai">A prompt sent to a language model is a string over its vocabulary, stored as a sequence of token IDs. A time series is a sequence of readings, and a recurrent network defines its memory recursively: \(h_t = f(h_{t-1}, x_t)\).</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Lab: Σ and Π explorer',
        kind: 'lab',
        html: String.raw`<p class="muted small">Pick an operator and a formula for the \(i\)-th term (or type your own using <code>i</code>, numbers, <code>+ - * / ^</code> and parentheses). Each bar is a running total: the pale part is the total so far and the strong part is the new term. The panel shows the expanded sum, the closed form and the same calculation in Python.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const SUMS = [
            { f: '2i - 1', m: 1, n: 10, cf: (m, n) => ({ sym: 'n^2 - (m-1)^2', val: n * n - (m - 1) ** 2 }) },
            { f: 'i', m: 1, n: 10, cf: (m, n) => ({ sym: '\\frac{n(n+1)}{2} - \\frac{(m-1)m}{2}', val: (n * (n + 1) - (m - 1) * m) / 2 }) },
            { f: 'i^2', m: 1, n: 10, cf: (m, n) => ({ sym: '\\frac{n(n+1)(2n+1)}{6} - \\frac{(m-1)m(2m-1)}{6}', val: (n * (n + 1) * (2 * n + 1) - (m - 1) * m * (2 * m - 1)) / 6 }) },
            { f: 'i^3', m: 1, n: 8, cf: (m, n) => ({ sym: '\\left(\\frac{n(n+1)}{2}\\right)^2 - \\left(\\frac{(m-1)m}{2}\\right)^2', val: ((n * (n + 1)) / 2) ** 2 - (((m - 1) * m) / 2) ** 2 }) },
            { f: '2^i', m: 0, n: 10, cf: (m, n) => ({ sym: '2^{n+1} - 2^{m}', val: 2 ** (n + 1) - 2 ** m }) },
            { f: '1/2^i', m: 0, n: 10, cf: (m, n) => ({ sym: '2^{1-m} - 2^{-n}', val: 2 ** (1 - m) - 2 ** -n }) },
          ];
          const PRODS = [
            { f: 'i', m: 1, n: 8, cf: (m, n) => (m >= 1 ? { sym: '\\frac{n!}{(m-1)!}', val: fact(n) / fact(m - 1) } : null) },
            { f: '2', m: 1, n: 10, cf: (m, n) => ({ sym: '2^{\\,n-m+1}', val: 2 ** (n - m + 1) }) },
            { f: '1 + 1/i', m: 1, n: 10, cf: (m, n) => (m >= 1 ? { sym: '\\frac{n+1}{m}', val: (n + 1) / m } : null) },
            { f: '2i - 1', m: 1, n: 7, cf: null },
          ];
          let op = 'sum', formula = '2i - 1', m = 1, n = 10;
          const opSeg = h('div.seg', { 'aria-label': 'Operator' });
          for (const [k, lbl] of [['sum', 'Σ sum'], ['prod', 'Π product']]) opSeg.append(h('button', { dataset: { k }, onclick: () => { op = k; const p = (op === 'sum' ? SUMS : PRODS)[0]; formula = p.f; m = p.m; n = p.n; sync(); } }, lbl));
          const fIn = h('input.inp.mono', { 'aria-label': 'Formula for the i-th term', style: { width: '9.5rem' } });
          fIn.addEventListener('input', () => { formula = fIn.value; draw(); });
          const presetRow = h('div.row', { style: { gap: '0.25rem' } });
          const mIn = h('input', { type: 'range', min: 0, max: 10, 'aria-label': 'Lower limit m', style: { width: '7rem' } });
          const nIn = h('input', { type: 'range', min: 0, max: 20, 'aria-label': 'Upper limit n', style: { width: '9rem' } });
          const mLbl = h('span.mono.small'), nLbl = h('span.mono.small');
          mIn.addEventListener('input', () => { m = +mIn.value; draw(); });
          nIn.addEventListener('input', () => { n = +nIn.value; draw(); });
          const chartBox = h('div.figure', { style: { minHeight: 0 } });
          const panel = h('div.stack.m4-sum', { style: { gap: '0.45rem', minHeight: 0 } });
          const msg = h('div.feedback');
          body.append(
            h('div.row', { style: { gap: '0.6rem' } }, opSeg, h('label.row.small', { style: { gap: '0.35rem' } }, h('span.muted', 'term \\(a_i\\) ='), fIn), presetRow),
            h('div.row', { style: { gap: '1.2rem' } }, h('label.row.small', { style: { gap: '0.4rem' } }, h('span.muted', 'lower limit'), mIn, mLbl), h('label.row.small', { style: { gap: '0.4rem' } }, h('span.muted', 'upper limit'), nIn, nLbl), msg),
            h('div.split-wide.fill', { style: { minHeight: 0, alignItems: 'stretch' } }, chartBox, panel));

          function sync() {
            fIn.value = formula; mIn.value = m; nIn.value = n;
            [...opSeg.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === op)));
            ctx.rc(presetRow, ...(op === 'sum' ? SUMS : PRODS).map((p) => {
              const b = h('button.btn.sm', { onclick: () => { formula = p.f; m = p.m; n = p.n; sync(); } }, '');
              b.innerHTML = '\\(' + texF(parseFormula(p.f)) + '\\)';
              ctx.tex(b);
              return b;
            }));
            draw();
          }
          function draw() {
            mLbl.textContent = `m = ${m}`;
            nLbl.textContent = `n = ${n}`;
            let tree;
            try { tree = parseFormula(formula); } catch (e) { msg.className = 'feedback bad'; msg.textContent = e.message; ctx.rc(chartBox); ctx.rc(panel); return; }
            const terms = [];
            try { for (let i = m; i <= n; i++) terms.push({ i, v: evalF(tree, i) }); } catch (e) { msg.className = 'feedback bad'; msg.textContent = e.message; ctx.rc(chartBox); ctx.rc(panel); return; }
            msg.className = 'feedback'; msg.textContent = '';
            const isSum = op === 'sum';
            const id = isSum ? 0 : 1;
            let acc = id;
            const run = terms.map((t) => { const prev = acc; acc = isSum ? acc + t.v : acc * t.v; return { ...t, prev, tot: acc }; });
            const total = acc;
            const sym = isSum ? '\\sum' : '\\prod';
            const a = texF(tree);
            const head = `${sym}_{i=${m}}^{${n}} ${tree.op && PREC[tree.op] <= (isSum ? 1 : 2) ? `\\left(${a}\\right)` : a}`;
            const show = (v) => (v < 0 ? `(${num(v)})` : num(v));
            const vals = terms.map((t) => show(t.v));
            const joiner = isSum ? ' + ' : ' \\cdot ';
            const expanded = !terms.length ? (isSum ? '0' : '1') : vals.length <= 8 ? vals.join(joiner) : vals.slice(0, 4).join(joiner) + joiner + '\\cdots' + joiner + vals.slice(-2).join(joiner);
            // chart of running totals
            const W = 560, H = 300, pl = 54, pr = 10, pt = 14, pb = 30;
            const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Bar chart of the running totals' });
            if (run.length) {
              const all = run.flatMap((r) => [r.prev, r.tot]);
              const useLog = !isSum && all.every((v) => v > 0) && Math.max(...all) / Math.min(...all) > 1000;
              const tf = useLog ? Math.log10 : (v) => v;
              const lo = useLog ? Math.min(...all.map(tf)) - 0.3 : Math.min(0, ...all), hi = useLog ? Math.max(...all.map(tf)) + 0.1 : Math.max(0, ...all);
              const span = hi - lo || 1;
              const Y = (v) => pt + (H - pt - pb) * (1 - (tf(v) - lo) / span);
              const base = useLog ? H - pb : Y(0);
              const bw = (W - pl - pr) / run.length;
              svg.append(s('line', { x1: pl, x2: W - pr, y1: base, y2: base, stroke: 'var(--ink-3)', 'stroke-width': 1, fill: 'none' }));
              const ticks = useLog ? [lo + 0.3, hi - 0.1].map((t) => 10 ** t) : [...new Set([hi, lo, 0])];
              ticks.forEach((t) => {
                svg.append(s('line', { x1: pl - 4, x2: W - pr, y1: Y(t), y2: Y(t), stroke: 'var(--rule)', 'stroke-width': 1, 'stroke-dasharray': '3 4', fill: 'none' }));
                svg.append(s('text', { x: pl - 7, y: Y(t) + 4, 'text-anchor': 'end', fill: 'var(--ink-3)', 'font-size': 11, text: num(t) }));
              });
              run.forEach((r, k) => {
                const x = pl + k * bw + bw * 0.14, w = bw * 0.72;
                const g = s('g');
                const yPrev = Y(r.prev), yTot = Y(r.tot);
                g.append(s('rect', { x, width: w, y: Math.min(base, yPrev), height: Math.abs(base - yPrev), fill: 'var(--accent-2)', stroke: 'none' }));
                const down = r.tot < r.prev;
                g.append(s('rect', { x, width: w, y: Math.min(yPrev, yTot), height: Math.max(1.5, Math.abs(yPrev - yTot)), fill: down ? 'var(--false)' : 'var(--accent)', stroke: 'none' }));
                if (run.length <= 21) g.append(s('text', { x: x + w / 2, y: H - pb + 15, 'text-anchor': 'middle', fill: 'var(--ink-2)', 'font-size': 11, text: String(r.i) }));
                g.append(s('title', { text: `i = ${r.i}: term ${num(r.v)}, running ${isSum ? 'sum' : 'product'} ${num(r.tot)}` }));
                svg.append(g);
              });
              svg.append(s('text', { x: W - pr, y: H - 2, 'text-anchor': 'end', fill: 'var(--ink-3)', 'font-size': 11, text: useLog ? 'index i · log scale (values grow too fast for a straight scale)' : 'index i' }));
            } else {
              svg.append(s('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', fill: 'var(--ink-2)', 'font-size': 15, text: `No terms: the lower limit ${m} is above the upper limit ${n}.` }));
            }
            ctx.rc(chartBox, svg);
            // closed form, if the formula is one of the presets
            const preset = (isSum ? SUMS : PRODS).find((p) => p.f.replace(/\s/g, '') === formula.replace(/\s/g, ''));
            const cf = preset && preset.cf && m <= n ? preset.cf(m, n) : null;
            const agree = cf && Math.abs(cf.val - total) <= 1e-9 * Math.max(1, Math.abs(total));
            const py = `${isSum ? 'sum' : 'math.prod'}(${pyF(tree)} for i in range(${m}, ${n + 1}))`;
            ctx.rc(panel,
              h('div', { html: terms.length ? String.raw`\[${head} = ${expanded} = ${num(total)}\]` : String.raw`\[${head} = ${num(total)} \quad \text{(no terms)}\]` }),
              terms.length ? h('div.small', { html: `<b>${terms.length}</b> term${terms.length === 1 ? '' : 's'} (from \\(i = ${m}\\) to \\(i = ${n}\\)). Running ${isSum ? 'sums' : 'products'}: ${run.slice(0, 10).map((r) => num(r.tot)).join(', ')}${run.length > 10 ? ', …' : ''}` }) : null,
              !terms.length ? h('div.small', { html: `An empty ${isSum ? 'sum is 0' : 'product is 1'}: that value changes nothing when you ${isSum ? 'add' : 'multiply'} it in, so loops that start from it work for every input.` }) : null,
              cf ? h('div.box.small', { html: String.raw`<b>Closed form:</b> \(${cf.sym} = ${num(cf.val)}\) <span class="${agree ? 'ok' : 'bad'}">${agree ? '✓ agrees with the term-by-term total' : '✗ disagrees'}</span>` })
                : h('div.small.muted', { html: preset && preset.cf === null ? 'This product has no short closed form; it is computed term by term.' : !preset ? 'Custom formula: computed term by term. Pick a preset to see a closed form.' : '' }),
              h('div', h('div.tiny.mono.muted', 'SAME THING IN PYTHON'), h('pre', { html: (isSum ? '' : ctx.hlPy('import math') + '\n') + ctx.hlPy(py) + '\n' + ctx.hlPy(`# ${num(total)}`) })),
              h('p.small.muted', { html: `<code>range(${m}, ${n + 1})</code> stops <i>before</i> its second argument, so the upper limit ${n} becomes ${n + 1}. A generator expression feeds the terms one at a time to <code>${isSum ? 'sum' : 'math.prod'}</code>.` }));
            ctx.tex(panel);
          }
          sync();
        },
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Relations and their four key properties',
        kind: 'concept',
        html: String.raw`
          <div class="split-narrow">
            <div class="stack">
              <div class="def">A <span class="term">relation</span> \(R\) from \(A\) to \(B\) is any subset \(R \subseteq A \times B\). We write \(a \mathrel{R} b\) when \((a, b) \in R\). A relation on \(A\) is a subset of \(A \times A\). Every function is a relation, but a relation may link an element to many partners or to none.</div>
              <p class="small">Example: "divides" on \(A = \{1, 2, 3, 4\}\), where \(x \mathrel{R} y\) means \(y\) is a multiple of \(x\). Draw an arrow \(x \to y\) for each pair (a loop for \((x, x)\)), or fill a matrix with a 1 in row \(x\), column \(y\).</p>
              <div class="row" style="align-items:center;gap:0.8rem;flex-wrap:nowrap" id="m4-rel-ex"></div>
            </div>
            <div class="stack">
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">Property</th><th class="l">Rule, for all \(x, y, z \in A\)</th><th class="l">In the digraph</th><th class="l">Fails for</th></tr></thead>
                <tbody class="small">
                  <tr><td class="l"><span class="term">reflexive</span></td><td class="l">\(x \mathrel{R} x\)</td><td class="l">a loop at every vertex</td><td class="l">\(\lt\) on \(\mathbb{Z}\): \(3 \lt 3\) is false</td></tr>
                  <tr><td class="l"><span class="term">symmetric</span></td><td class="l">\(x \mathrel{R} y \Rightarrow y \mathrel{R} x\)</td><td class="l">every arrow has a return arrow</td><td class="l">divides: \(2 \mid 4\), \(4 \nmid 2\)</td></tr>
                  <tr><td class="l"><span class="term">antisymmetric</span></td><td class="l">\(x \mathrel{R} y \wedge y \mathrel{R} x \Rightarrow x = y\)</td><td class="l">no two-way arrows between different vertices</td><td class="l">"is a sibling of"</td></tr>
                  <tr><td class="l"><span class="term">transitive</span></td><td class="l">\(x \mathrel{R} y \wedge y \mathrel{R} z \Rightarrow x \mathrel{R} z\)</td><td class="l">every two-step path has a shortcut</td><td class="l">"is a parent of"</td></tr>
                </tbody>
              </table>
              <div class="warn">Antisymmetric does not mean "not symmetric". Equality \(=\) is both symmetric and antisymmetric, and \(\{(1,2), (2,1), (1,3)\}\) on \(\{1,2,3\}\) is neither.</div>
              <div class="tip">In the matrix, reflexive means the diagonal is all 1s, and symmetric means the matrix equals its own transpose (mirror image across the diagonal).</div>
              <div class="ai">A knowledge graph stores facts as triples (subject, predicate, object), such as (Paris, capital_of, France). Each predicate is a relation, so these properties tell a reasoner what it may infer.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const n = 4, div = (i, j) => (j + 1) % (i + 1) === 0;
          const svg = digraph(s, { n, prefix: 'm4dex', size: 260, labels: ['1', '2', '3', '4'], label: 'Digraph of divides on {1, 2, 3, 4}', edge: (i, j) => (div(i, j) ? { kind: i === j ? 'base' : 'acc' } : null) });
          svg.style.width = '12.5rem';
          const tbl = h('table.tt', h('thead', h('tr', h('th', 'R'), ...range(n).map((j) => h('th', String(j + 1))))),
            h('tbody', ...range(n).map((i) => h('tr', h('th', String(i + 1)), ...range(n).map((j) => h('td', { style: div(i, j) ? { background: 'var(--accent-2)', fontWeight: 700 } : { color: 'var(--ink-3)' } }, div(i, j) ? '1' : '0'))))));
          body.querySelector('#m4-rel-ex').append(svg, tbl);
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Equivalence relations and partial orders',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">An <span class="term">equivalence relation</span> is reflexive, symmetric and transitive. The equivalence class of \(a\) is \([a] = \{x \in A \mid x \mathrel{R} a\}\).</div>
              <div class="thm">The equivalence classes <b>partition</b> \(A\): they are nonempty, never overlap, and together cover \(A\). Conversely, every partition defines the equivalence relation "is in the same block as".</div>
              <div class="ex" style="padding-bottom:0.6rem">Congruence mod \(n\): \(a \equiv b \pmod{n}\) when \(n \mid (a - b)\), that is, \(a\) and \(b\) leave the same remainder. Choose \(n\) to see the classes of \(0, \dots, 11\):
                <div class="row" style="gap:0.5rem;margin:0.35rem 0 0.3rem"><span class="small muted">n =</span><span id="m4-modseg"></span></div>
                <div class="m4-modstrip" id="m4-modstrip"></div>
                <div class="small" id="m4-modtxt" style="margin-top:0.3rem"></div>
              </div>
            </div>
            <div class="stack">
              <div class="def">A <span class="term">partial order</span> \(\preceq\) is reflexive, antisymmetric and transitive: \(\le\) on numbers, "divides" on positive integers, \(\subseteq\) on sets. It is a <b>total order</b> if every two elements are comparable. \(\le\) is total; divides is not, because \(2 \nmid 3\) and \(3 \nmid 2\).</div>
              <div class="row" style="gap:0.8rem;align-items:center;flex-wrap:nowrap">
                <div id="m4-hasse12" style="flex:none"></div>
                <p class="small">A <b>Hasse diagram</b> draws a partial order with less ink: drop the loops, drop every arrow implied by transitivity, and put smaller elements lower so arrowheads are unnecessary. Left: divisors of 12 under "divides".</p>
              </div>
              <p class="small">The <b>closure</b> of \(R\) adds the fewest pairs that give it a property: loops for reflexive, return arrows for symmetric, and \((x, z)\) for every path from \(x\) to \(z\) for transitive. The next lab computes all three.</p>
              <div class="ai">A taxonomy such as dog \(\preceq\) mammal \(\preceq\) animal is a partial order, and ontologies are stored as Hasse diagrams. Entity resolution, which decides that "J. Smith" and "John Smith" are the same customer, groups records into equivalence classes.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const divs = [1, 2, 3, 4, 6, 12];
          const { svg } = hasse(s, { labels: divs.map(String), lt: (i, j) => i !== j && divs[j] % divs[i] === 0, w: 170, h: 175, r: 15, label: 'Hasse diagram of the divisors of 12' });
          svg.style.width = '9.5rem';
          body.querySelector('#m4-hasse12').append(svg);
          const seg = h('div.seg');
          const strip = body.querySelector('#m4-modstrip'), txt = body.querySelector('#m4-modtxt');
          let n = 3;
          [2, 3, 4, 5, 6].forEach((k) => seg.append(h('button', { onclick: () => { n = k; draw(); } }, String(k))));
          body.querySelector('#m4-modseg').append(seg);
          function draw() {
            [...seg.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.textContent === n)));
            ctx.rc(strip, ...range(12).map((x) => h('span', { style: { borderColor: CLASS_COLORS[x % n], color: 'var(--ink)', boxShadow: `inset 0 -0.3rem 0 ${CLASS_COLORS[x % n]}` } }, String(x))));
            txt.innerHTML = range(n).map((r) => `<span style="color:${CLASS_COLORS[r]};font-weight:700">[${r}]</span> = {${range(12).filter((x) => x % n === r).join(', ')}, …}`).join(' &nbsp; ');
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: relation matrix and digraph',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click matrix cells to add or remove pairs. The digraph redraws, and each property shows a ✓ or the exact pairs that break it (solid red = present, dashed red = missing). Click a property to highlight its evidence. The closure buttons add the missing pairs and report each one.</p>`,
        render(body, ctx) {
          const { h, s, R } = ctx;
          const START = [[1, 1], [2, 2], [3, 3], [4, 4], [1, 2], [2, 1], [2, 3]];
          const build = (n, fn) => range(n).map((i) => range(n).map((j) => !!fn(i + 1, j + 1)));
          const PRESETS = [
            ['Start example', (n) => build(n, (a, b) => START.some(([x, y]) => x === a && y === b))],
            ['≡ mod 2', (n) => build(n, (a, b) => (a - b) % 2 === 0)],
            ['divides', (n) => build(n, (a, b) => b % a === 0)],
            ['≤', (n) => build(n, (a, b) => a <= b)],
            ['<', (n) => build(n, (a, b) => a < b)],
            ['chain 1→2→3…', (n) => build(n, (a, b) => b === a + 1)],
            ['empty', (n) => build(n, () => false)],
            ['random', (n) => build(n, () => R.chance(0.35))],
          ];
          let n = 4, M = PRESETS[0][1](4), undo = null, added = new Set(), log = '', focus = null, view = 'digraph';
          const nSeg = h('div.seg');
          [3, 4, 5, 6].forEach((k) => nSeg.append(h('button', { onclick: () => { M = range(k).map((i) => range(k).map((j) => !!(M[i] && M[i][j]))); n = k; reset(); } }, String(k))));
          const presetRow = h('div.row', { style: { gap: '0.25rem' } }, PRESETS.map(([name, fn]) => h('button.btn.sm', { onclick: () => { M = fn(n); reset(); } }, name)));
          const matBox = h('div.stack', { style: { gap: '0.4rem', alignItems: 'center' } });
          const figBox = h('div.figure.fill', { style: { minHeight: 0 } });
          const viewSeg = h('div.seg', { style: { alignSelf: 'center' } });
          const panel = h('div.stack', { style: { gap: '0.45rem', minHeight: 0 } });
          body.append(
            h('div.row', { style: { gap: '0.5rem' } }, h('span.small.muted', 'A = {1, …, n}, n ='), nSeg, h('span.small.muted', { style: { marginLeft: '0.5rem' } }, 'Load:'), presetRow),
            h('div.m4-relgrid.fill', matBox, h('div.stack', { style: { minHeight: 0, gap: '0.35rem' } }, figBox, viewSeg), panel));
          function reset() { undo = null; added = new Set(); log = ''; focus = null; draw(); }
          const key = (p) => p[0] + ',' + p[1];
          function closure(kind) {
            undo = M.map((r) => r.slice());
            added = new Set();
            focus = null;
            const add = (i, j) => { if (!M[i][j]) { M[i][j] = true; added.add(i + ',' + j); return `(${i + 1}, ${j + 1})`; } return null; };
            if (kind === 'refl') {
              const got = range(n).map((i) => add(i, i)).filter(Boolean);
              log = got.length ? `Reflexive closure added the loops ${got.join(', ')}.` : 'Already reflexive: nothing to add.';
            } else if (kind === 'sym') {
              const got = [];
              range(n).forEach((i) => range(n).forEach((j) => { if (undo[i][j]) { const g = add(j, i); if (g) got.push(g); } }));
              log = got.length ? `Symmetric closure added the return arrows ${got.join(', ')}.` : 'Already symmetric: nothing to add.';
            } else {
              const steps = [];
              for (let k = 0; k < n; k++) {
                const got = [];
                for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i][k] && M[k][j]) { const g = add(i, j); if (g) got.push(g); }
                steps.push(`k = ${k + 1}: ${got.length ? got.join(', ') : 'nothing'}`);
              }
              log = `Warshall's algorithm lets each element k act as a stepping stone and adds (i, j) whenever (i, k) and (k, j) are both present. ${steps.join(' · ')}.`;
            }
            draw();
          }
          function draw() {
            [...nSeg.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.textContent === n)));
            const p = relProps(M);
            const order = ['refl', 'sym', 'anti', 'trans'];
            if (!focus || !p[focus]) focus = order.find((k) => p[k]) || null;
            const w = focus ? p[focus] : { have: [], miss: [] };
            const have = new Set(w.have.map(key)), miss = new Set(w.miss.map(key));
            const eq = !p.refl && !p.sym && !p.trans, po = !p.refl && !p.anti && !p.trans;
            if (!po) view = 'digraph';
            // equivalence classes for colouring
            const cls = new Array(n).fill(-1);
            const classes = [];
            if (eq) range(n).forEach((i) => { if (cls[i] < 0) { const c = range(n).filter((j) => M[i][j]); c.forEach((j) => { cls[j] = classes.length; }); classes.push(c.map((j) => j + 1)); } });
            // matrix
            const size = M.flat().filter(Boolean).length;
            const tbl = h('table.m4-mat', h('thead', h('tr', h('th', 'R'), ...range(n).map((j) => h('th', String(j + 1))))),
              h('tbody', ...range(n).map((i) => h('tr', h('th', String(i + 1)), ...range(n).map((j) => {
                const k = i + ',' + j;
                const c = [M[i][j] ? (added.has(k) ? 'new' : 'on') : '', have.has(k) ? 'wit' : '', miss.has(k) ? 'miss' : ''].filter(Boolean).join(' ');
                return h('td', h('button', { class: c, 'aria-label': `pair (${i + 1}, ${j + 1}) ${M[i][j] ? 'is in R' : 'is not in R'}; click to toggle`, onclick: () => { M[i][j] = !M[i][j]; added = new Set(); undo = null; log = ''; draw(); } }, miss.has(k) && !M[i][j] ? '?' : M[i][j] ? '1' : '0'));
              })))));
            const sw = (style, label) => h('div.row', { style: { gap: '0.4rem', flexWrap: 'nowrap' } }, h('span.swatch', { style: { width: '1rem', height: '1rem', margin: 0, flex: 'none', ...style } }), h('span', label));
            ctx.rc(matBox, tbl, h('p.tiny.muted', { style: { maxWidth: '15rem', textAlign: 'center' } }, `Row x, column y holds 1 when x R y. |R| = ${size} of ${n * n} possible pairs.`),
              h('div.stack.tiny', { style: { gap: '0.25rem', alignSelf: 'stretch', color: 'var(--ink-2)' } },
                sw({ background: 'var(--accent)' }, 'pair in R'),
                sw({ background: 'var(--true-bg)', border: '2px solid var(--true)' }, 'pair added by the last closure'),
                sw({ background: 'var(--sheet)', boxShadow: '0 0 0 2px var(--false)' }, 'evidence: present pair'),
                sw({ background: 'var(--false-bg)', border: '2px dashed var(--false)' }, 'evidence: missing pair (?)')));
            // picture
            let pic;
            if (view === 'hasse') pic = hasse(s, { labels: range(n).map((i) => String(i + 1)), lt: (i, j) => i !== j && M[i][j], w: 300, h: 300, label: 'Hasse diagram of the partial order' }).svg;
            else pic = digraph(s, {
              n, prefix: 'm4rel', size: 300, labels: range(n).map((i) => String(i + 1)), label: 'Digraph of the relation',
              edge: (i, j) => { const k = i + ',' + j; if (M[i][j]) return { kind: have.has(k) ? 'bad' : added.has(k) ? 'good' : 'base' }; return miss.has(k) ? { kind: 'bad', dashed: true } : null; },
              tint: (i) => (eq ? CLASS_COLORS[cls[i] % CLASS_COLORS.length] : null),
            });
            ctx.rc(figBox, pic);
            ctx.rc(viewSeg, ...[['digraph', 'Digraph'], ['hasse', 'Hasse diagram']].map(([k, lbl]) => h('button', { 'aria-pressed': String(view === k), disabled: k === 'hasse' && !po, title: k === 'hasse' && !po ? 'Only partial orders have a Hasse diagram' : '', onclick: () => { view = k; draw(); } }, lbl)));
            // properties
            const P = (i, j) => `(${i + 1}, ${j + 1})`;
            const info = {
              refl: ['Reflexive', p.refl ? `${P(...p.refl.miss[0])} is missing: ${p.refl.miss[0][0] + 1} is not related to itself.` : 'Every element has a loop: the diagonal is all 1s.'],
              sym: ['Symmetric', p.sym ? `${P(...p.sym.have[0])} is in R but ${P(...p.sym.miss[0])} is not.` : size ? 'Every arrow has a return arrow.' : 'True with no pairs at all: there is no arrow that could lack a return.'],
              anti: ['Antisymmetric', p.anti ? `${P(...p.anti.have[0])} and ${P(...p.anti.have[1])} are both in R, yet ${p.anti.have[0][0] + 1} ≠ ${p.anti.have[0][1] + 1}.` : 'No two different elements point at each other.'],
              trans: ['Transitive', p.trans ? `${P(...p.trans.have[0])} and ${P(...p.trans.have[1])} are in R, so ${P(...p.trans.miss[0])} must be too, but it is missing.` : 'Every two-step path has its shortcut.'],
            };
            const props = h('div.m4-props', ...order.map((k) => h('button', { class: focus === k ? 'on' : '', onclick: () => { focus = k; draw(); } },
              h('span.pill.' + (p[k] ? 'f' : 't'), p[k] ? '✗' : '✓'), h('span', h('b', info[k][0]), ' ', info[k][1]))));
            let struct;
            if (eq && po) struct = '<b>Both</b> an equivalence relation and a partial order. Only equality (just the loops) manages that.';
            else if (eq) struct = `<b>Equivalence relation.</b> Its classes ${classes.map((c) => fmt(c)).join(', ')} partition A; the colours on the digraph show the blocks.`;
            else if (po) {
              const inc = range(n).flatMap((i) => range(n).filter((j) => j > i && !M[i][j] && !M[j][i]).map((j) => [i + 1, j + 1]))[0];
              struct = `<b>Partial order.</b> ${inc ? `Not total: ${inc[0]} and ${inc[1]} are incomparable.` : 'Every pair is comparable, so it is a total order.'} Switch the picture to its Hasse diagram.`;
            } else {
              const need = (ks) => ks.filter((k) => p[k]).map((k) => info[k][0].toLowerCase()).join(' and ');
              struct = `<b>Neither</b> kind of special relation. An equivalence relation still needs to be ${need(['refl', 'sym', 'trans'])}; a partial order still needs to be ${need(['refl', 'anti', 'trans'])}.`;
            }
            ctx.rc(panel, props,
              h('div.box.small', { html: struct }),
              h('div.row', { style: { gap: '0.3rem' } },
                h('button.btn.sm', { onclick: () => closure('refl') }, 'Reflexive closure'),
                h('button.btn.sm', { onclick: () => closure('sym') }, 'Symmetric closure'),
                h('button.btn.sm', { onclick: () => closure('trans') }, 'Transitive closure'),
                h('button.btn.sm', { disabled: !undo, onclick: () => { if (undo) { M = undo; reset(); } } }, 'Undo')),
              log ? h('p.small', { html: log + (added.size ? ' <span class="ok">Green</span> marks the added pairs.' : '') }) : h('p.small.muted', 'The closures add pairs and never remove any: each is the smallest relation containing R with that property.'));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Lab: a tiny relational database',
        kind: 'lab',
        html: String.raw`<div class="def">An <span class="term">n-ary relation</span> on sets \(A_1, \dots, A_n\) is a subset of \(A_1 \times \cdots \times A_n\), a set of \(n\)-tuples. A database table is one: each row is a tuple, each column an attribute. <b>Select</b> \(\sigma\) keeps the rows that pass a test, <b>project</b> \(\pi\) keeps chosen columns, and <b>join</b> \(\bowtie\) glues together tuples that agree on a shared attribute (here <code>sid</code>).</div>`,
        render(body, ctx) {
          const { h } = ctx;
          const T = {
            S: { name: 'Student', cols: ['sid', 'name', 'major', 'year'], rows: [[1, 'Ana', 'AI', 2], [2, 'Ben', 'CS', 3], [3, 'Chloe', 'AI', 1], [4, 'Dev', 'Math', 2], [5, 'Eli', 'CS', 1]] },
            E: { name: 'Enroll', cols: ['sid', 'course', 'grade'], rows: [[1, 'Discrete', 'A'], [1, 'Python', 'B'], [2, 'Discrete', 'B'], [2, 'Stats', 'A'], [3, 'Python', 'A'], [3, 'Stats', 'A'], [4, 'Discrete', 'C']] },
          };
          const jsrc = [];
          T.S.rows.forEach((sr, a) => T.E.rows.forEach((er, b) => { if (sr[0] === er[0]) jsrc.push([a, b]); }));
          T.J = { name: 'Student ⋈ Enroll', cols: ['sid', 'name', 'major', 'year', 'course', 'grade'], rows: jsrc.map(([a, b]) => [...T.S.rows[a], T.E.rows[b][1], T.E.rows[b][2]]) };
          const PRESETS = [
            ['Who earned an A?', 'J', [true, 'grade', '=', 'A'], ['name', 'course']],
            ['Which majors exist?', 'S', [false, 'major', '=', 'AI'], ['major']],
            ['AI students', 'S', [true, 'major', '=', 'AI'], ['sid', 'name', 'major', 'year']],
            ['Discrete roster', 'J', [true, 'course', '=', 'Discrete'], ['name', 'grade']],
            ['Upper years', 'S', [true, 'year', '>', 1], ['name', 'year']],
          ];
          let q;
          const load = (p) => { q = { src: p[1], on: p[2][0], col: p[2][1], op: p[2][2], val: p[2][3], keep: new Set(p[3]) }; };
          load(PRESETS[0]);
          const ctl = h('div.stack', { style: { gap: '0.4rem' } });
          const left = h('div.stack', { style: { gap: '0.5rem', minHeight: 0 } });
          const mid = h('div.stack', { style: { gap: '0.45rem', minHeight: 0 } });
          const right = h('div.stack', { style: { gap: '0.4rem', minHeight: 0 } });
          body.append(h('div.m4-db.stack.fill', { style: { minHeight: 0, gap: '0.55rem' } }, ctl,
            h('div.m4-db-grid', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.05fr)', gap: '0.9rem', minHeight: 0, alignItems: 'start' } }, left, mid, right)));
          const lit = (v, lang) => (typeof v === 'number' ? String(v) : lang === 'tex' ? `\\text{'${v}'}` : `'${v}'`);
          const cmp = (a, op, b) => (op === '=' ? a === b : op === '≠' ? a !== b : op === '<' ? a < b : a > b);
          function draw() {
            const src = T[q.src];
            if (!src.cols.includes(q.col)) { q.col = src.cols[1]; q.val = src.rows[0][1]; }
            const ci = src.cols.indexOf(q.col);
            const values = [...new Set(src.rows.map((r) => r[ci]))].sort((a, b) => (typeof a === 'number' ? a - b : String(a).localeCompare(String(b))));
            if (!values.includes(q.val)) q.val = values[0];
            let keep = src.cols.filter((c) => q.keep.has(c));
            if (!keep.length) { keep = src.cols.slice(); q.keep = new Set(keep); }
            // controls
            const colSel = h('select.inp', { 'aria-label': 'Column to test', onchange: (e) => { q.col = e.target.value; const k = src.cols.indexOf(q.col); q.val = src.rows[0][k]; draw(); } }, src.cols.map((c) => h('option', { value: c, selected: c === q.col }, c)));
            const opSel = h('select.inp', { 'aria-label': 'Comparison', onchange: (e) => { q.op = e.target.value; draw(); } }, ['=', '≠', '<', '>'].map((o) => h('option', { value: o, selected: o === q.op }, o)));
            const valSel = h('select.inp', { 'aria-label': 'Value', onchange: (e) => { const raw = e.target.value; q.val = typeof values[0] === 'number' ? Number(raw) : raw; draw(); } }, values.map((v) => h('option', { value: String(v), selected: v === q.val }, String(v))));
            ctx.rc(ctl,
              h('div.row', { style: { gap: '0.3rem' } }, h('span.small.muted', 'Try:'), PRESETS.map((p) => h('button.btn.sm', { onclick: () => { load(p); draw(); } }, p[0]))),
              h('div.row', { style: { gap: '0.9rem' } },
                h('div.row', { style: { gap: '0.35rem' } }, h('span.small.muted', 'From'), h('div.seg', ...[['S', 'Student'], ['E', 'Enroll'], ['J', 'Student ⋈ Enroll']].map(([k, lbl]) => h('button', { 'aria-pressed': String(q.src === k), onclick: () => { q.src = k; q.keep = new Set(T[k].cols); draw(); } }, lbl)))),
                h('div.row', { style: { gap: '0.3rem' } }, h('label.chk', h('input', { type: 'checkbox', checked: q.on, onchange: (e) => { q.on = e.target.checked; draw(); } }), 'σ where'), colSel, opSel, valSel),
                h('div.row', { style: { gap: '0.45rem' } }, h('span.small.muted', 'π keep'), src.cols.map((c) => h('label.chk', h('input', { type: 'checkbox', checked: q.keep.has(c), onchange: (e) => { if (e.target.checked) q.keep.add(c); else q.keep.delete(c); draw(); } }), c)))));
            [colSel, opSel, valSel].forEach((el) => { el.disabled = !q.on; });
            // evaluate: select rows, then project columns, then remove duplicate tuples
            const passIdx = src.rows.map((r, i) => i).filter((i) => !q.on || cmp(src.rows[i][ci], q.op, q.val));
            const ki = keep.map((c) => src.cols.indexOf(c));
            const seen = new Map();
            passIdx.forEach((i) => { const t = ki.map((k) => src.rows[i][k]); const id = JSON.stringify(t); if (!seen.has(id)) seen.set(id, t); });
            const result = [...seen.values()];
            // which source rows took part
            const hitS = new Set(), hitE = new Set();
            passIdx.forEach((i) => { if (q.src === 'S') hitS.add(i); else if (q.src === 'E') hitE.add(i); else { hitS.add(jsrc[i][0]); hitE.add(jsrc[i][1]); } });
            const srcTable = (t, hits, active) => h('div',
              h('div.cap', `${t.name} (${t.rows.length} tuples)`),
              h('table.data', h('thead', h('tr', t.cols.map((c) => h('th', { class: active && keep.includes(c) ? 'keep' : '' }, c)))),
                h('tbody', t.rows.map((r, i) => h('tr', { class: hits.has(i) ? 'hit' : '' }, r.map((v) => h('td', String(v))))))));
            ctx.rc(left, srcTable(T.S, hitS, q.src !== 'E'), srcTable(T.E, hitE, q.src !== 'S'),
              h('p.tiny.muted', 'Highlighted rows feed the result; coloured headers mark the columns kept.'));
            // result and step counts
            const steps = [];
            if (q.src === 'J') steps.push(`<b>Join:</b> checked ${T.S.rows.length} × ${T.E.rows.length} = ${T.S.rows.length * T.E.rows.length} (student, enrollment) pairs; ${T.J.rows.length} share a sid. Eli (sid 5) has no enrollment, so no joined tuple mentions Eli.`);
            if (q.on) steps.push(`<b>Select:</b> kept ${passIdx.length} of ${src.rows.length} tuples, a horizontal cut.`);
            if (keep.length < src.cols.length) steps.push(`<b>Project:</b> kept ${keep.length} of ${src.cols.length} columns, a vertical cut. ${passIdx.length} tuples became ${result.length} distinct ones${passIdx.length > result.length ? ` (${passIdx.length - result.length} duplicate${passIdx.length - result.length > 1 ? 's' : ''} removed, because a relation is a set)` : ''}.`);
            ctx.rc(mid,
              h('div', h('div.cap', `Result (${result.length} tuple${result.length === 1 ? '' : 's'})`),
                result.length ? h('table.data', h('thead', h('tr', keep.map((c) => h('th.keep', c)))), h('tbody', result.map((t) => h('tr', t.map((v) => h('td', String(v)))))))
                  : h('p.small', { html: 'No tuple passes the test, so the result is the empty relation \\(\\varnothing\\).' })),
              ...steps.map((x) => h('p.small', { html: x })));
            // the same query in three notations
            const rel = { S: '\\text{Student}', E: '\\text{Enroll}', J: '\\text{Student} \\bowtie \\text{Enroll}' }[q.src];
            let ra = rel;
            if (q.on) ra = `\\sigma_{\\text{${q.col}} ${{ '=': '=', '≠': '\\ne', '<': '\\lt', '>': '\\gt' }[q.op]} ${lit(q.val, 'tex')}}(${ra})`;
            if (keep.length < src.cols.length) ra = `\\pi_{\\text{${keep.join(', ')}}}(${ra})`;
            const sqlFrom = { S: 'Student', E: 'Enroll', J: 'Student JOIN Enroll USING (sid)' }[q.src];
            const sql = `SELECT DISTINCT ${keep.length === src.cols.length ? '*' : keep.join(', ')}\nFROM ${sqlFrom}${q.on ? `\nWHERE ${q.col} ${{ '=': '=', '≠': '<>', '<': '<', '>': '>' }[q.op]} ${lit(q.val)}` : ''};`;
            const pyOp = { '=': '==', '≠': '!=', '<': '<', '>': '>' }[q.op];
            const out = keep.length === 1 ? keep[0] : `(${keep.join(', ')})`;
            const loops = q.src === 'S' ? [' for (sid, name, major, year) in student'] : q.src === 'E' ? [' for (sid, course, grade) in enroll'] : [' for (sid, name, major, year) in student', ' for (sid2, course, grade) in enroll'];
            const conds = [q.src === 'J' ? 'sid == sid2' : null, q.on ? `${q.col} ${pyOp} ${lit(q.val)}` : null].filter(Boolean);
            const py = `{${out}\n${loops.join('\n')}${conds.length ? `\n if ${conds.join(' and ')}` : ''}}`;
            ctx.rc(right,
              h('div', h('div.cap', 'Relational algebra'), h('div', { html: `\\(${ra}\\)` })),
              h('div', h('div.cap', 'SQL'), h('pre', sql)),
              h('div', h('div.cap', 'Python set comprehension'), h('pre', { html: py.split('\n').map(ctx.hlPy).join('\n') })),
              h('p.tiny.muted', 'SQL keeps duplicate rows unless you write DISTINCT; relational algebra and a Python set remove them automatically.'));
            ctx.tex(right);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: checking relation properties',
        kind: 'code',
        file: 'relation_properties.py',
        html: String.raw`<p class="muted small">A relation on a finite set is a Python set of tuples. Each property becomes a search for counterexamples, so the program reports <i>why</i> a property fails. This is the start example from the matrix lab, restricted to \(\{1, 2, 3\}\).</p>`,
        fivew: {
          what: 'Stores a relation as a set of ordered pairs and tests reflexive, symmetric, antisymmetric and transitive by listing the pairs that break each rule. Then it repairs transitivity.',
          why: 'Each definition is a "for all" statement, and a "for all" fails exactly when a counterexample exists. Collecting the counterexamples turns a yes/no check into an explanation.',
          who: 'Engineers validating data: a "reports to" table must not contain cycles, a "same customer as" link should be an equivalence relation, a dependency graph should be a partial order.',
          where: 'Database integrity checks, knowledge-graph reasoning (inferring missing facts by transitivity), and build systems that order tasks by their dependencies.',
          when: 'Whenever a relation must have a property for later code to be correct, check it once at the boundary instead of trusting the data.',
        },
        lines: [
          ['A = [1, 2, 3]', 'The underlying set. A list keeps the elements in a fixed order, which makes the printed results predictable. Only reflexivity needs \\(A\\), because it asks about every element, including ones that appear in no pair.'],
          ['R = {(1, 1), (2, 2), (3, 3), (1, 2), (2, 1), (2, 3)}', 'The relation as a set of tuples, exactly \\(R \\subseteq A \\times A\\). Tuples are immutable and hashable, so they can live in a set and <code>(x, y) in R</code> is a fast hash lookup.'],
          ['', ''],
          ['def gaps(R):', 'Defines a function that finds the transitivity counterexamples. We will call it twice, once before and once after the repair, so it is worth a name.'],
          ['    return {(x, z) for (x, y) in R for (w, z) in R', 'A set comprehension with two loops: it pairs every pair \\((x, y)\\) with every pair \\((w, z)\\), which is \\(|R|^2 = 36\\) combinations here. The next line filters them. The result is a set, so each missing pair is reported once.'],
          ['            if y == w and (x, z) not in R}', 'Keeps the combinations that form a two-step path \\(x \\to y \\to z\\) (the middle elements match, <code>y == w</code>) whose shortcut \\((x, z)\\) is missing. That is precisely a counterexample to "\\(x \\mathrel{R} y \\wedge y \\mathrel{R} z \\Rightarrow x \\mathrel{R} z\\)".'],
          ['', ''],
          ['no_loop = [x for x in A if (x, x) not in R]', 'Reflexive asks: is \\((x, x) \\in R\\) for every \\(x \\in A\\)? This list collects the elements that fail. All three loops are present, so <code>no_loop</code> is <code>[]</code>.'],
          ['one_way = {(x, y) for x, y in R if (y, x) not in R}', 'Symmetric asks: does every pair have its reverse? This set comprehension collects the pairs whose reverse is missing. <code>for x, y in R</code> unpacks each tuple into its two coordinates. \\((2, 3) \\in R\\) but \\((3, 2) \\notin R\\), so the result is <code>{(2, 3)}</code>.'],
          ['both = {(x, y) for x, y in R if x < y and (y, x) in R}', 'Antisymmetric forbids two different elements pointing at each other, so we collect the pairs present in <i>both</i> directions. <code>x &lt; y</code> skips loops and reports each offending pair once. \\((1, 2)\\) and \\((2, 1)\\) are both present, so the result is <code>{(1, 2)}</code>.'],
          ['print("reflexive:", not no_loop, no_loop)', 'An empty list counts as false in Python, so <code>not no_loop</code> is True exactly when there are no counterexamples. Output: <code>reflexive: True []</code>.'],
          ['print("symmetric:", not one_way, sorted(one_way))', 'An empty set is also false, so <code>not one_way</code> is the verdict. <code>sorted</code> turns the set into an ordered list just for printing, because a set has no fixed order. Output: <code>symmetric: False [(2, 3)]</code>: the verdict and its evidence side by side.'],
          ['print("antisymmetric:", not both, sorted(both))', 'Output: <code>antisymmetric: False [(1, 2)]</code>. This relation is neither symmetric nor antisymmetric, which shows that the two words are not opposites.'],
          ['print("transitive:", not gaps(R), sorted(gaps(R)))', 'Calls <code>gaps</code>. The path \\(1 \\to 2 \\to 3\\) exists, but the shortcut \\((1, 3)\\) does not. Output: <code>transitive: False [(1, 3)]</code>. Adding the reported gaps is the first step of building the transitive closure; the Try-this box below does exactly that.'],
        ],
        expected: 'reflexive: True []\nsymmetric: False [(2, 3)]\nantisymmetric: False [(1, 2)]\ntransitive: False [(1, 3)]\n',
        tryIt: 'Repair transitivity: add <code>R2 = R | gaps(R)</code> and <code>print(sorted(gaps(R2)))</code> at the end. An empty list means <code>R2</code> is the transitive closure. Then add <code>(3, 2)</code> to <code>R</code> and predict all four lines before you run.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: functions and relations in code',
        kind: 'design',
        html: String.raw`<p class="muted small">The mathematics of functions and relations maps directly onto habits that keep real code correct. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Write pure functions',
            html: '<p>A <b>pure</b> function returns the same output for the same input and changes nothing outside itself. That is the mathematical definition of a function. Pure functions are easy to test (no setup), safe to cache (memoize) and safe to run in parallel.</p><p>Hidden state turns <code>f(3)</code> into a value that depends on history, so the same call can give different answers.</p>',
            bad: 'total = 0\ndef add_score(x):\n    global total\n    total += x        # hidden side effect\n    return total      # depends on history',
            good: 'def add_score(total, x):\n    return total + x  # same input, same output',
          },
          {
            name: 'Store a finite mapping as a dict',
            html: '<p>A lookup table <i>is</i> a function given as data: the keys are the domain and the values are the outputs. A dict states the whole mapping in one place, answers in constant time, and makes properties checkable. A chain of <code>if</code>/<code>elif</code> hides the same function inside control flow.</p>',
            bad: 'def points(g):\n    if g == "A": return 4\n    elif g == "B": return 3\n    elif g == "C": return 2',
            good: 'POINTS = {"A": 4, "B": 3, "C": 2, "D": 1, "F": 0}\nis_one_to_one = len(set(POINTS.values())) == len(POINTS)',
          },
          {
            name: 'Validate the domain at the boundary',
            html: '<p>A function is only defined on its domain. When an input falls outside it, fail loudly at the entry point with a clear message. Returning a made-up default looks friendly but quietly corrupts every later result, and the bug surfaces far from its cause.</p>',
            bad: 'def points(g):\n    return POINTS.get(g, 0)   # "Z" silently means F',
            good: 'def points(g):\n    if g not in POINTS:\n        raise ValueError(f"unknown grade {g!r}")\n    return POINTS[g]',
          },
          {
            name: 'Use tuples for pairs and records',
            html: '<p>An ordered pair \\((a, b)\\) never changes once it is formed. Python tuples are immutable and hashable, so a relation can be stored as a <b>set of tuples</b> with fast membership tests, exactly matching \\(R \\subseteq A \\times B\\). Lists are mutable, cannot go inside a set, and make every membership test a scan.</p>',
            bad: 'R = [[1, 2], [2, 3]]       # list of lists\nif [1, 2] in R: ...        # scans the whole list',
            good: 'R = {(1, 2), (2, 3)}       # set of tuples\nif (1, 2) in R: ...        # one hash lookup',
          },
          {
            name: 'Store each fact once (normalize)',
            html: '<p>In a well-designed database every fact lives in exactly one relation. Copying a student\'s major into every enrollment row means a change of major must update many rows, and missing one leaves the data contradicting itself. Store the key (<code>sid</code>) and <b>join</b> when you need the combined view.</p>',
            bad: 'enroll = [(1, "Ana", "AI", "Discrete"),\n          (1, "Ana", "AI", "Python")]\n# Ana\'s major is stored twice',
            good: 'student = {1: ("Ana", "AI")}\nenroll = [(1, "Discrete"), (1, "Python")]\n# join on sid when you need names',
          },
          {
            name: 'Make __eq__ and __hash__ agree',
            html: '<p>Python assumes <code>==</code> is an <b>equivalence relation</b>: reflexive, symmetric and transitive. Sets and dicts also assume that equal objects have equal hashes, because they search by hash first. If you redefine equality, hash the same normalized key, or two "equal" objects land in different buckets and duplicates slip into your sets.</p>',
            bad: 'class Email:\n    def __eq__(a, b): return a.s.lower() == b.s.lower()\n    def __hash__(a): return hash(a.s)  # case-sensitive!',
            good: 'class Email:\n    def __init__(self, s): self.key = s.strip().lower()\n    def __eq__(a, b): return a.key == b.key\n    def __hash__(a): return hash(a.key)',
          },
          {
            name: 'Name functions by what they return',
            html: '<p><code>is_onto(f, Y)</code> returns a bool, <code>range_of(f)</code> returns a set, <code>compose(g, f)</code> returns a function. A reader knows the type of the result from the name alone. Vague names like <code>check()</code> or <code>process()</code> could print, mutate or return anything, so every caller has to read the body.</p>',
            bad: 'def check(f, Y):\n    print("ok" if set(f.values()) == Y else "no")',
            good: 'def is_onto(f, Y):\n    return set(f.values()) == Y',
          },
        ],
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: functions, sequences and relations',
        kind: 'practice',
        html: String.raw`<p class="muted small">Numbers can be typed as integers or fractions (<code>-4</code>, <code>7/2</code>). Sets use braces, such as <code>{2, 5, 8}</code>.</p>`,
        gens: [
          {
            label: 'Function properties',
            make(R) {
              const kind = R.pick(['bij', 'inj', 'surj', 'neither']);
              let nx, ny, out;
              if (kind === 'bij') { nx = ny = R.int(3, 4); out = R.shuffle(range(ny)); }
              else if (kind === 'inj') { nx = R.int(2, 3); ny = nx + 1; out = R.sample(range(ny), nx); }
              else if (kind === 'surj') { ny = R.int(2, 3); nx = ny + 1; out = R.shuffle([...range(ny), R.int(0, ny - 1)]); }
              else { nx = ny = R.int(3, 4); do { out = range(nx).map(() => R.int(0, ny - 1)); } while (new Set(out).size === nx); }
              const X = range(nx).map((i) => i + 1), Y = LET.slice(0, ny);
              const hit = Y.map((_, j) => X.filter((_, i) => out[i] === j));
              const col = hit.findIndex((xs) => xs.length > 1);
              const miss = Y.filter((_, j) => !hit[j].length);
              const inj = col < 0, surj = !miss.length;
              const answer = inj && surj ? 'Bijection' : inj ? 'One-to-one only' : surj ? 'Onto only' : 'Neither';
              const why = [
                inj ? 'No two inputs share an output, so \\(f\\) is one-to-one.' : `\\(f(${hit[col][0]}) = f(${hit[col][1]}) = ${Y[col]}\\), so \\(f\\) is not one-to-one.`,
                surj ? 'Every element of \\(Y\\) is hit, so \\(f\\) is onto.' : `Nothing maps to ${miss.map((y) => `\\(${y}\\)`).join(' or ')}, so \\(f\\) is not onto.`,
              ];
              return {
                prompt: String.raw`Let \(X = \{${X.join(', ')}\}\), \(Y = \{${Y.join(', ')}\}\) and \(f = \{${X.map((x, i) => `(${x}, ${Y[out[i]]})`).join(', ')}\}\). Which describes \(f: X \to Y\)?`,
                options: ['One-to-one only', 'Onto only', 'Bijection', 'Neither'],
                answer,
                solution: `<b>${answer}.</b> ${why.join(' ')}${nx !== ny ? ` (Since \\(|X| = ${nx}\\) and \\(|Y| = ${ny}\\), ${nx > ny ? 'one-to-one was impossible from the start' : 'onto was impossible from the start'}.)` : ''}`,
              };
            },
          },
          {
            label: 'Floor, ceiling and mod',
            make(R, M) {
              const kind = R.int(0, 4);
              if (kind <= 1) {
                let x; do { x = R.int(-95, 95) / 10; } while (Number.isInteger(x));
                const lo = Math.floor(x), hi = Math.ceil(x);
                return kind === 0
                  ? { prompt: String.raw`Compute \(\lfloor ${x} \rfloor\).`, answer: lo, hint: 'the greatest integer that is less than or equal to the number.', solution: String.raw`\(${x}\) lies between the integers \(${lo}\) and \(${hi}\). The floor rounds <b>down</b> (toward \(-\infty\)), so \(\lfloor ${x} \rfloor = ${lo}\).${x < 0 ? ' For negative numbers that means moving away from zero.' : ''}` }
                  : { prompt: String.raw`Compute \(\lceil ${x} \rceil\).`, answer: hi, hint: 'the least integer that is greater than or equal to the number.', solution: String.raw`\(${x}\) lies between \(${lo}\) and \(${hi}\). The ceiling rounds <b>up</b> (toward \(+\infty\)), so \(\lceil ${x} \rceil = ${hi}\).${x < 0 ? ' For negative numbers that means moving toward zero.' : ''}` };
              }
              if (kind === 2) {
                const a = R.int(-40, 80), m = R.int(2, 12), r = M.mod(a, m), q = Math.floor(a / m);
                return { prompt: String.raw`Compute \(${a} \bmod ${m}\) (the remainder \(r\) with \(0 \le r \lt ${m}\)).`, answer: r, solution: String.raw`\(q = \lfloor ${a}/${m} \rfloor = ${q}\), and \(${a} = ${m} \cdot (${q}) + ${r}\) with \(0 \le ${r} \lt ${m}\). So \(${a} \bmod ${m} = ${r}\).${a < 0 ? ' Python agrees: <code>' + a + ' % ' + m + '</code> is ' + r + '.' : ''}` };
              }
              if (kind === 3) {
                const k = R.int(3, 9);
                let n; do { n = R.int(12, 90); } while (n % k === 0);
                return { prompt: `A server handles requests in batches of ${k}. How many batches does it need for ${n} requests?`, answer: Math.ceil(n / k), solution: String.raw`\(${n}/${k} \approx ${(n / k).toFixed(2)}\). A partial batch still needs a whole batch, so round up: \(\lceil ${n}/${k} \rceil = ${Math.ceil(n / k)}\).` };
              }
              const x = R.int(10, 60), m = R.int(3, 7), firstFloor = R.chance(0.5);
              const f = (v) => Math.floor(v / 2), g = (v) => M.mod(v, m);
              const ans = firstFloor ? g(f(x)) : f(g(x));
              return {
                prompt: String.raw`Let \(f(x) = \lfloor x/2 \rfloor\) and \(g(x) = x \bmod ${m}\). Compute \((${firstFloor ? 'g \\circ f' : 'f \\circ g'})(${x})\).`,
                answer: ans,
                solution: firstFloor
                  ? String.raw`Apply \(f\) first: \(f(${x}) = \lfloor ${x}/2 \rfloor = ${f(x)}\). Then \(g(${f(x)}) = ${f(x)} \bmod ${m} = ${ans}\).`
                  : String.raw`Apply \(g\) first: \(g(${x}) = ${x} \bmod ${m} = ${g(x)}\). Then \(f(${g(x)}) = \lfloor ${g(x)}/2 \rfloor = ${ans}\).`,
              };
            },
          },
          {
            label: 'Sums and sequences',
            make(R, M) {
              const kind = R.int(0, 4);
              if (kind === 0) {
                const a = R.int(1, 5), b = R.int(-3, 5), n = R.int(4, 12);
                const term = (a === 1 ? 'i' : `${a}i`) + (b > 0 ? ` + ${b}` : b < 0 ? ` - ${-b}` : '');
                const ans = (a * n * (n + 1)) / 2 + b * n;
                return { prompt: String.raw`Evaluate \(\displaystyle\sum_{i=1}^{${n}} \left(${term}\right)\).`, answer: ans, solution: String.raw`Split the sum: \(${a} \sum_{i=1}^{${n}} i ${b ? (b > 0 ? '+' : '-') + ' \\sum_{i=1}^{' + n + '} ' + Math.abs(b) : ''} = ${a} \cdot \frac{${n} \cdot ${n + 1}}{2} ${b ? (b > 0 ? '+' : '-') + ' ' + Math.abs(b) + ' \\cdot ' + n : ''} = ${(a * n * (n + 1)) / 2} ${b ? (b > 0 ? '+' : '-') + ' ' + Math.abs(b * n) : ''} = ${ans}\).` };
              }
              if (kind === 1) {
                const m = R.int(2, 7), n = m + R.int(3, 14);
                const ans = (n * (n + 1) - (m - 1) * m) / 2;
                return { prompt: String.raw`Evaluate \(\displaystyle\sum_{i=${m}}^{${n}} i\).`, answer: ans, hint: 'subtract the part of 1 + 2 + ⋯ that is not included.', solution: String.raw`\(\sum_{i=${m}}^{${n}} i = \sum_{i=1}^{${n}} i - \sum_{i=1}^{${m - 1}} i = \frac{${n} \cdot ${n + 1}}{2} - \frac{${m - 1} \cdot ${m}}{2} = ${(n * (n + 1)) / 2} - ${((m - 1) * m) / 2} = ${ans}\).` };
              }
              if (kind === 2) {
                const r = R.pick([2, 3]), n = R.int(3, 7);
                const ans = (r ** (n + 1) - 1) / (r - 1);
                return { prompt: String.raw`Evaluate \(\displaystyle\sum_{i=0}^{${n}} ${r}^i\).`, answer: ans, solution: String.raw`Geometric sum with ratio \(r = ${r}\): \(\frac{${r}^{${n + 1}} - 1}{${r} - 1} = \frac{${r ** (n + 1)} - 1}{${r - 1}} = ${ans}\). Check by adding: \(${range(n + 1).map((i) => r ** i).join(' + ')} = ${ans}\).` };
              }
              if (kind === 3) {
                const n = R.int(3, 7);
                if (R.chance(0.5)) return { prompt: String.raw`Evaluate \(\displaystyle\prod_{i=1}^{${n}} i\).`, answer: M.fact(n), solution: String.raw`\(\prod_{i=1}^{${n}} i = ${range(n).map((i) => i + 1).join(' \\cdot ')} = ${M.fact(n)}\), which is \(${n}!\).` };
                return { prompt: String.raw`Evaluate \(\displaystyle\prod_{i=1}^{${n}} \left(1 + \frac{1}{i}\right)\).`, answer: n + 1, solution: String.raw`Each factor is \(\frac{i+1}{i}\), so the product is \(\frac{2}{1} \cdot \frac{3}{2} \cdots \frac{${n + 1}}{${n}}\). Every numerator cancels the next denominator (it <b>telescopes</b>), leaving \(\frac{${n + 1}}{1} = ${n + 1}\).` };
              }
              const c = R.int(1, 4), n = R.int(4, 6), dbl = R.chance(0.5);
              const seq = [c];
              for (let k = 2; k <= n; k++) seq.push(dbl ? 2 * seq[k - 2] + 1 : seq[k - 2] + k);
              return {
                prompt: String.raw`A sequence is defined by \(a_1 = ${c}\) and \(a_k = ${dbl ? '2a_{k-1} + 1' : 'a_{k-1} + k'}\) for \(k \ge 2\). Find \(a_${n}\).`,
                answer: seq[n - 1],
                solution: `Apply the rule one step at a time: ${seq.map((v, i) => `\\(a_${i + 1} = ${i === 0 ? v : dbl ? `2 \\cdot ${seq[i - 1]} + 1 = ${v}` : `${seq[i - 1]} + ${i + 1} = ${v}`}\\)`).join(', ')}. A recursive definition only lets you reach \\(a_${n}\\) through all the earlier terms.`,
              };
            },
          },
          {
            label: 'Relations',
            make(R) {
              if (R.chance(0.3)) {
                const n = R.int(3, 6), N = 3 * n + R.int(1, 5), a = R.int(0, n - 1);
                const ans = range(N + 1).filter((x) => x % n === a);
                return { prompt: String.raw`For congruence mod ${n} on \(\{0, 1, \dots, ${N}\}\), list the equivalence class \([${a}]\).`, answer: ans, format: 'set', solution: String.raw`\([${a}]\) holds every \(x\) with \(x \equiv ${a} \pmod{${n}}\), that is, remainder ${a} when divided by ${n}: start at ${a} and add ${n} repeatedly. \([${a}] = ${texSet(ans)}\).` };
              }
              const A = [1, 2, 3];
              const M = range(3).map(() => range(3).map(() => R.chance(0.42)));
              const tweak = R.int(0, 3);
              if (tweak === 0) range(3).forEach((i) => { M[i][i] = true; });
              if (tweak === 1) range(3).forEach((i) => range(3).forEach((j) => { if (M[i][j]) M[j][i] = true; }));
              if (tweak === 2) for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (M[i][k] && M[k][j]) M[i][j] = true;
              const pairs = [];
              range(3).forEach((i) => range(3).forEach((j) => { if (M[i][j]) pairs.push(`(${A[i]}, ${A[j]})`); }));
              const p = relProps(M);
              const prop = R.pick(['refl', 'sym', 'anti', 'trans']);
              const name = { refl: 'reflexive', sym: 'symmetric', anti: 'antisymmetric', trans: 'transitive' }[prop];
              const w = p[prop], P = (q) => `(${q[0] + 1}, ${q[1] + 1})`;
              const why = !w
                ? { refl: 'All three loops (1, 1), (2, 2), (3, 3) are present.', sym: pairs.length ? 'Every pair appears together with its reverse.' : 'With no pairs there is nothing that could lack a reverse, so the rule holds vacuously.', anti: 'No two different elements are related in both directions.', trans: 'Every two-step path x → y → z already has its shortcut (x, z).' }[prop]
                : { refl: () => `${P(w.miss[0])} is missing.`, sym: () => `${P(w.have[0])} is in R but its reverse ${P(w.miss[0])} is not.`, anti: () => `${P(w.have[0])} and ${P(w.have[1])} are both in R although the elements differ.`, trans: () => `${P(w.have[0])} and ${P(w.have[1])} are in R, but ${P(w.miss[0])} is not.` }[prop]();
              return {
                prompt: String.raw`Let \(A = \{1, 2, 3\}\) and \(R = ${pairs.length ? '\\{' + pairs.join(', ') + '\\}' : '\\varnothing'}\). True or false: \(R\) is ${name}.`,
                options: ['True', 'False'], answer: w ? 'False' : 'True',
                solution: `<b>${w ? 'False' : 'True'}.</b> ${why}`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: functions, sequences and relations',
        kind: 'quiz',
        questions: [
          { q: String.raw`Let \(f: \{1, 2, 3\} \to \{a, b\}\) be any function. Which statement must be true?`, choices: ['\\(f\\) is one-to-one', '\\(f\\) is onto', '\\(f\\) is not one-to-one', '\\(f\\) is a bijection'], answer: 2, explain: String.raw`Three inputs share two outputs, so at least two inputs land on the same output (the pigeonhole principle). Whether \(f\) is onto depends on the arrows: \(f\) could send everything to \(a\).` },
          { q: String.raw`For \(f: \mathbb{Z} \to \mathbb{Z}\) with \(f(x) = x^2\), what is the range?`, choices: ['\\(\\mathbb{Z}\\)', 'all nonnegative integers', 'the perfect squares \\(\\{0, 1, 4, 9, \\dots\\}\\)', '\\(\\{1, 4, 9, \\dots\\}\\)'], answer: 2, explain: String.raw`The codomain is \(\mathbb{Z}\), but only perfect squares are ever produced, and \(0 = 0^2\) counts. Numbers like 2 and 3 are nonnegative yet never hit, so \(f\) is not onto.` },
          { q: String.raw`With \(f(x) = x + 3\) and \(g(x) = 2x\), what is \((g \circ f)(4)\)?`, choices: ['11', '14', '24', '7'], answer: 1, explain: String.raw`\((g \circ f)(4) = g(f(4)) = g(7) = 14\): apply \(f\) first. The other order gives \((f \circ g)(4) = f(8) = 11\), so composition order matters.` },
          { q: String.raw`What is \(\lfloor -2.5 \rfloor + \lceil 2.5 \rceil\)?`, choices: ['0', '1', '−1', '5'], answer: 0, explain: String.raw`\(\lfloor -2.5 \rfloor = -3\) (round down, which for a negative number moves away from zero) and \(\lceil 2.5 \rceil = 3\). The sum is 0.` },
          { q: String.raw`What is \(\displaystyle\sum_{i=1}^{100} i\)?`, choices: ['5000', '5050', '10100', '100'], answer: 1, explain: String.raw`\(\frac{n(n+1)}{2} = \frac{100 \cdot 101}{2} = 5050\). Pair the terms from the outside in: \(1 + 100\), \(2 + 99\), …, giving 50 pairs that each add to 101.` },
          { q: 'A hash table has 10 slots and uses <code>h(k) = k % 10</code>. You insert 11 different integer keys. What must happen?', choices: ['No collisions, since the keys are distinct', 'At least two keys share a slot', 'Every slot receives exactly one key', 'h stops being a function'], answer: 1, explain: 'Eleven keys go into ten slots, so <code>h</code> cannot be one-to-one: some slot gets two keys (the pigeonhole principle). <code>h</code> is still a function, because each key has exactly one slot.' },
          { q: 'Which relation on a set of people is an equivalence relation?', choices: ['"is a parent of"', '"has the same birthday as"', '"is taller than"', '"is a friend of"'], answer: 1, explain: 'Same birthday is reflexive, symmetric and transitive, and its classes are the 366 possible birthdays. "Parent of" is not reflexive or transitive, "taller than" is not reflexive or symmetric, and friendship is usually not transitive.' },
          { q: 'The relation "divides" on the positive integers is a partial order. Which property does it lack?', choices: ['Reflexive', 'Symmetric', 'Antisymmetric', 'Transitive'], answer: 1, explain: String.raw`\(2 \mid 4\) but \(4 \nmid 2\), so it is not symmetric. It is reflexive (\(a \mid a\)), antisymmetric (\(a \mid b\) and \(b \mid a\) force \(a = b\) for positive integers) and transitive.` },
          { q: String.raw`Let \(R = \{(1,2), (2,3), (3,4)\}\) on \(\{1, 2, 3, 4\}\). How many pairs does the transitive closure of \(R\) contain?`, choices: ['3', '5', '6', '10'], answer: 2, explain: String.raw`The closure adds a shortcut for every path: \((1,3)\), \((2,4)\) and \((1,4)\). That gives 6 pairs, which is exactly the relation \(\lt\) on \(\{1, 2, 3, 4\}\).` },
          { q: String.raw`Three students in the <code>Student</code> table major in AI. How many rows does \(\pi_{\text{major}}(\sigma_{\text{major = 'AI'}}(\text{Student}))\) contain?`, choices: ['3', '1', '0', 'It is an error, because major is not a key'], answer: 1, explain: 'Selection keeps the three AI rows; projecting onto <code>major</code> turns them into three copies of the tuple (AI). A relation is a set, so the copies collapse into one tuple. SQL would print three rows unless you write SELECT DISTINCT.' },
        ],
      },
    ],
  });
})();
