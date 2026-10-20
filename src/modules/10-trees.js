/* Module 10: Trees. Objective 10: describe the use of trees as a data structure in computer science.
   Labs: rooted-tree anatomy, Kruskal and Prim, a binary search tree playground, expression trees with
   a postfix stack, and a Huffman code builder. */
(() => {
  const escT = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------------- binary trees on plain objects {key, left, right} ---------------- */
  function bstInsert(root, key) {
    const node = { key, left: null, right: null };
    if (!root) return { root: node, path: [], node };
    const path = [];
    let cur = root;
    for (;;) {
      path.push(cur);
      if (key < cur.key) { if (!cur.left) { cur.left = node; break; } cur = cur.left; }
      else { if (!cur.right) { cur.right = node; break; } cur = cur.right; }
    }
    return { root, path, node };
  }
  function bstFrom(keys) { let root = null; for (const k of keys) root = bstInsert(root, k).root; return root; }
  const height = (n) => (n ? 1 + Math.max(height(n.left), height(n.right)) : -1);
  const size = (n) => (n ? 1 + size(n.left) + size(n.right) : 0);
  const leafCount = (n) => (!n ? 0 : !n.left && !n.right ? 1 : leafCount(n.left) + leafCount(n.right));
  function bstHas(n, k) { while (n) { if (k === n.key) return true; n = k < n.key ? n.left : n.right; } return false; }
  function orderOf(root, kind) {
    const out = [];
    if (kind === 'level') {
      const q = root ? [root] : [];
      for (let i = 0; i < q.length; i++) { out.push(q[i]); if (q[i].left) q.push(q[i].left); if (q[i].right) q.push(q[i].right); }
      return out;
    }
    (function walk(n) {
      if (!n) return;
      if (kind === 'pre') out.push(n);
      walk(n.left);
      if (kind === 'in') out.push(n);
      walk(n.right);
      if (kind === 'post') out.push(n);
    })(root);
    return out;
  }
  const TRAV = {
    pre: ['Preorder', 'visit the root, then the left subtree, then the right subtree'],
    in: ['Inorder', 'visit the left subtree, then the root, then the right subtree'],
    post: ['Postorder', 'visit the left subtree, then the right subtree, then the root'],
    level: ['Level order', 'visit level 0, then level 1, and so on, left to right within each level'],
  };

  /* Draws a binary tree as an SVG string: x = inorder position, y = depth.
     look(node) -> {cls, badge, sub} lets each lab colour vertices for its own state. */
  function binSVG(root, o = {}) {
    const dx = o.dx ?? 48, dy = o.dy ?? 62, r = o.r ?? 18, pad = o.pad ?? 30;
    const pos = new Map();
    let count = 0, maxD = 0;
    (function walk(n, d) {
      if (!n) return;
      walk(n.left, d + 1);
      pos.set(n, [count++, d]);
      if (d > maxD) maxD = d;
      walk(n.right, d + 1);
    })(root, 0);
    const cw = (Math.max(count, 1) - 1) * dx + 2 * pad;
    const ch = maxD * dy + 2 * pad + (o.below ?? 0);
    const W = Math.max(o.minW ?? 0, cw), H = Math.max(o.minH ?? 0, ch);
    const ox = (W - cw) / 2 + pad, oy = (H - ch) / 2 + pad;
    const xy = (n) => { const [i, d] = pos.get(n); return [ox + i * dx, oy + d * dy]; };
    let edges = '', nodes = '';
    for (const n of pos.keys()) {
      const [x, y] = xy(n);
      for (const c of [n.left, n.right]) {
        if (!c) continue;
        const [cx, cy] = xy(c);
        edges += `<line class="ed ${o.edge ? o.edge(n, c) : ''}" x1="${x}" y1="${y}" x2="${cx}" y2="${cy}" stroke="var(--ink-3)" fill="none"/>`;
      }
      const lk = (o.look && o.look(n)) || {};
      const label = o.label ? o.label(n) : n.key;
      let g = `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--sheet)" stroke="var(--ink-3)"/><text x="${x}" y="${y}" fill="var(--ink)">${escT(label)}</text>`;
      if (lk.sub != null) g += `<text class="sub" x="${x}" y="${y + r + 11}" fill="var(--accent)">${escT(lk.sub)}</text>`;
      if (lk.badge != null) g += `<g class="badge"><circle cx="${x + r * 0.9}" cy="${y - r * 0.9}" r="9" fill="var(--kw)"/><text x="${x + r * 0.9}" y="${y - r * 0.9}" fill="var(--sheet)">${lk.badge}</text></g>`;
      nodes += `<g class="nd ${lk.cls || ''}" data-key="${escT(n.key ?? '')}"${o.focusable ? ` tabindex="0" role="button" aria-label="vertex ${escT(label)}"` : ''}>${g}</g>`;
    }
    return `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escT(o.aria || 'Binary tree')}">${edges}${nodes}</svg>`;
  }

  /* ---------------- arithmetic expressions: + - * / ^ and parentheses ---------------- */
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' };
  function lex(src) {
    const s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-');
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const t = s.slice(i, j);
        if (!/^\d+(\.\d+)?$/.test(t)) throw new Error(`"${t}" is not a number I can read.`);
        out.push({ t: 'num', v: Number(t), s: t });
        i = j;
        continue;
      }
      if ('+-*/^()'.includes(c)) { out.push({ t: c }); i++; continue; }
      throw new Error(`I don't recognise "${c}". Use numbers, + − * / ^ and parentheses.`);
    }
    return out;
  }
  function parseExpr(src) {
    const t = lex(src);
    let i = 0;
    if (!t.length) throw new Error('Type an expression, for example (3 + 4) * (5 - 2).');
    function primary() {
      const k = t[i++];
      if (!k) throw new Error('The expression ends too early: an operator is missing its right-hand side.');
      if (k.t === 'num') return { op: null, v: k.v, s: k.s, key: k.s, left: null, right: null };
      if (k.t === '(') {
        const e = expr(1);
        if (!t[i] || t[i].t !== ')') throw new Error('A "(" is missing its matching ")".');
        i++;
        return e;
      }
      if (k.t === '-') throw new Error('Negative numbers are not supported here. Write (0 - 5) instead of -5.');
      throw new Error(`Unexpected "${k.t}".`);
    }
    function expr(minP) {
      let left = primary();
      for (;;) {
        const k = t[i];
        if (!k || !(k.t in PREC) || PREC[k.t] < minP) return left;
        i++;
        const p = PREC[k.t];
        const right = expr(k.t === '^' ? p : p + 1);
        left = { op: k.t, key: k.t, left, right };
      }
    }
    const tree = expr(1);
    if (i < t.length) throw new Error(t[i].t === ')' ? 'There is a ")" without a matching "(".' : `Unexpected "${t[i].t === 'num' ? t[i].s : t[i].t}": an operator is probably missing.`);
    return tree;
  }
  const applyOp = (op, a, b) => (op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : a ** b);
  const fmtNum = (v) => (!Number.isFinite(v) ? (Number.isNaN(v) ? 'undefined' : v > 0 ? '∞' : '−∞') : Number.isInteger(v) ? String(v) : String(+v.toFixed(4)));
  const exLabel = (n) => (n.op ? SYM[n.op] : n.s);
  // infix with only the parentheses the structure needs
  function infix(n, parentOp = null, isRight = false) {
    if (!n.op) return n.s;
    const s = `${infix(n.left, n.op, false)} ${SYM[n.op]} ${infix(n.right, n.op, true)}`;
    if (!parentOp) return s;
    const p = PREC[n.op], q = PREC[parentOp];
    return p < q || (p === q && (q === 3 ? !isRight : isRight)) ? `(${s})` : s;
  }
  function randExpr(R, ops) {
    if (ops === 0) { const v = R.int(1, 9); return { op: null, v, s: String(v), key: String(v), left: null, right: null }; }
    const l = R.int(0, ops - 1);
    const op = R.pick(['+', '-', '*']);
    return { op, key: op, left: randExpr(R, l), right: randExpr(R, ops - 1 - l) };
  }

  /* ---------------- Huffman: deterministic, matches the Python walkthrough ---------------- */
  // Trees are ordered by (weight, smallest symbol inside); the lighter one goes left (bit 0).
  const hcmp = (a, b) => a.w - b.w || (a.min < b.min ? -1 : a.min > b.min ? 1 : 0);
  function huffman(counts) {
    let forest = [...counts.keys()].sort().map((c) => ({ w: counts.get(c), sym: c, min: c, left: null, right: null }));
    forest.sort(hcmp);
    const snaps = [{ forest: forest.slice() }];
    while (forest.length > 1) {
      const [a, b] = forest;
      const m = { w: a.w + b.w, sym: null, min: a.min < b.min ? a.min : b.min, left: a, right: b };
      forest = forest.slice(2).concat([m]).sort(hcmp);
      snaps.push({ forest: forest.slice(), merged: m, a, b });
    }
    return snaps;
  }
  function huffCodes(tree, single) {
    const codes = new Map();
    (function walk(n, path) {
      if (!n.left) { codes.set(n.sym, single ? '0' : path); return; }
      walk(n.left, path + '0');
      walk(n.right, path + '1');
    })(tree, '');
    return codes;
  }
  const leavesOf = (t) => (t.left ? [...leavesOf(t.left), ...leavesOf(t.right)] : [t.sym]);
  const showSym = (c) => (c === ' ' ? '␣' : c);

  /* ---------------- static figures ---------------- */
  function threeGraphs() {
    const P = [[28, 30], [80, 18], [132, 36], [36, 96], [92, 82], [128, 120]];
    const sets = [
      { e: [[0, 1], [1, 2], [1, 4], [4, 3], [4, 5]], bad: [], t1: 'Tree', t2: '6 vertices, 5 edges' },
      { e: [[0, 1], [1, 2], [1, 4], [4, 3], [4, 5], [2, 5]], bad: [[1, 2], [2, 5], [4, 5], [1, 4]], t1: 'Not a tree: cycle', t2: '6 vertices, 6 edges' },
      { e: [[0, 1], [1, 2], [3, 4], [4, 5]], bad: [], t1: 'Forest of 2 trees', t2: '6 vertices, 4 edges' },
    ];
    let g = '';
    sets.forEach((st, k) => {
      const ox = 12 + k * 168;
      const isBad = (a, b) => st.bad.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
      for (const [a, b] of st.e) g += `<line x1="${ox + P[a][0]}" y1="${P[a][1]}" x2="${ox + P[b][0]}" y2="${P[b][1]}" stroke="${isBad(a, b) ? 'var(--false)' : 'var(--ink-2)'}" stroke-width="${isBad(a, b) ? 3.2 : 2}" fill="none"/>`;
      for (const [x, y] of P) g += `<circle cx="${ox + x}" cy="${y}" r="8" fill="var(--sheet)" stroke="var(--ink-2)" stroke-width="2"/>`;
      g += `<text x="${ox + 80}" y="152" text-anchor="middle" font-size="14" font-weight="700" fill="${k === 0 ? 'var(--true)' : k === 1 ? 'var(--false)' : 'var(--ink)'}">${st.t1}</text>`;
      g += `<text x="${ox + 80}" y="170" text-anchor="middle" font-size="12.5" fill="var(--ink-2)">${st.t2}</text>`;
    });
    return `<svg viewBox="0 0 504 178" role="img" aria-label="A tree, a graph with a cycle, and a forest" style="width:100%;height:auto;max-height:11.5rem">${g}</svg>`;
  }
  function minimaxFig() {
    const mins = [[3, 12, 8], [2, 4, 6], [14, 5, 2]];
    const mx = [72, 190, 308];
    let g = '';
    g += '<text x="6" y="30" font-size="11" font-family="var(--font-mono)" fill="var(--ink-3)">MAX</text><text x="6" y="94" font-size="11" font-family="var(--font-mono)" fill="var(--ink-3)">MIN</text>';
    mins.forEach((vals, i) => {
      const on = i === 0;
      g += `<line x1="190" y1="26" x2="${mx[i]}" y2="90" stroke="${on ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${on ? 3.2 : 1.6}" fill="none"/>`;
      const best = Math.min(...vals);
      vals.forEach((v, j) => {
        const lx = mx[i] + (j - 1) * 34;
        const pick = v === best;
        g += `<line x1="${mx[i]}" y1="90" x2="${lx}" y2="150" stroke="${on && pick ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${on && pick ? 3.2 : 1.4}" fill="none"/>`;
        g += `<rect x="${lx - 13}" y="${138}" width="26" height="24" rx="4" fill="var(--sheet)" stroke="var(--ink-3)"/><text x="${lx}" y="${155}" text-anchor="middle" font-size="13" fill="var(--ink)">${v}</text>`;
      });
      g += `<circle cx="${mx[i]}" cy="90" r="15" fill="${on ? 'var(--mark)' : 'var(--sheet)'}" stroke="var(--fnc)" stroke-width="2"/><text x="${mx[i]}" y="95" text-anchor="middle" font-size="14" font-weight="700" fill="${on ? 'var(--mark-ink)' : 'var(--ink)'}">${best}</text>`;
    });
    g += '<rect x="174" y="10" width="32" height="32" rx="5" fill="var(--mark)" stroke="var(--accent)" stroke-width="2"/><text x="190" y="31" text-anchor="middle" font-size="14" font-weight="700" fill="var(--mark-ink)">3</text>';
    return `<svg viewBox="0 0 360 168" role="img" aria-label="Minimax game tree: the MAX player picks the move whose worst case is best" style="width:100%;height:auto;max-height:9.5rem">${g}</svg>`;
  }
  function sortTreeFig() {
    // decision tree that sorts a, b, c: questions at internal vertices, the 3! = 6 orders at the leaves
    const Q = [[270, 20, 'a < b?'], [140, 66, 'b < c?'], [400, 66, 'a < c?'], [205, 112, 'a < c?'], [465, 112, 'b < c?']];
    const L = [[75, 112, 'a b c'], [335, 112, 'b a c'], [160, 158, 'a c b'], [250, 158, 'c a b'], [420, 158, 'b c a'], [510, 158, 'c b a']];
    const E = [[0, 1, 'yes', 'q'], [0, 2, 'no', 'q'], [1, 0, 'yes', 'l'], [1, 3, 'no', 'q'], [2, 1, 'yes', 'l'], [2, 4, 'no', 'q'], [3, 2, 'yes', 'l'], [3, 3, 'no', 'l'], [4, 4, 'yes', 'l'], [4, 5, 'no', 'l']];
    let g = '';
    for (const [a, b, lab, kind] of E) {
      const [x1, y1] = Q[a], [x2, y2] = kind === 'q' ? Q[b] : L[b];
      g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink-3)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${(x1 + x2) / 2 + (lab === 'yes' ? -12 : 12)}" y="${(y1 + y2) / 2}" text-anchor="middle" font-size="10.5" fill="var(--ink-3)">${lab}</text>`;
    }
    for (const [x, y, t] of Q) g += `<rect x="${x - 30}" y="${y - 11}" width="60" height="22" rx="11" fill="var(--sheet)" stroke="var(--fnc)" stroke-width="1.6"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" fill="var(--ink)">${escT(t)}</text>`;
    for (const [x, y, t] of L) g += `<rect x="${x - 25}" y="${y - 11}" width="50" height="22" rx="4" fill="var(--true-bg)" stroke="var(--true)" stroke-width="1.2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" font-family="var(--font-mono)" fill="var(--ink)">${t}</text>`;
    return `<svg viewBox="40 6 510 166" role="img" aria-label="Decision tree that sorts three items with at most three comparisons" style="width:100%;height:auto;max-height:8.2rem;margin-top:0.35rem">${g}</svg>`;
  }
  const EXAMPLE_EXPR = parseExpr('(3 + 4) * (5 - 2)');

  /* ---------------- lab data ---------------- */
  const ANAT = [['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e'], ['b', 'f'], ['c', 'g'], ['d', 'h'], ['d', 'i'], ['d', 'j'], ['f', 'k'], ['f', 'l'], ['h', 'm']];
  const MST_V = { A: [70, 84], B: [262, 46], C: [452, 82], D: [150, 226], E: [342, 208], F: [520, 248], G: [78, 362], H: [312, 362] };
  const MST_E = [['E', 'F', 1], ['D', 'E', 2], ['A', 'D', 3], ['A', 'B', 4], ['B', 'E', 5], ['B', 'D', 6], ['C', 'E', 7], ['B', 'C', 8], ['C', 'F', 9], ['D', 'G', 10], ['E', 'H', 11], ['G', 'H', 12], ['F', 'H', 13]];

  DM.module({
    id: 'trees',
    num: 10,
    title: 'Trees',
    objectives: [10],
    terms: {
      'tree': 'A connected graph with no cycles. Between any two of its vertices there is exactly one simple path, and a tree with n vertices has n − 1 edges.',
      'forest': 'A graph with no cycles. Each connected piece of a forest is a tree.',
      'rooted tree': 'A tree with one vertex singled out as the root. Every edge then points away from the root, which gives each vertex a parent, children and a level.',
      'parent': 'In a rooted tree, the parent of v is the neighbour of v one step closer to the root. Every vertex except the root has exactly one parent.',
      'child': 'In a rooted tree, w is a child of v when v is the parent of w. Children of the same parent are siblings.',
      'ancestor': 'Any vertex on the path from v up to the root (not counting v itself). The root is an ancestor of every other vertex.',
      'descendant': 'w is a descendant of v when v is an ancestor of w: w lies somewhere below v.',
      'leaf': 'A vertex with no children. A vertex that does have children is an internal vertex.',
      'level': 'The level (or depth) of a vertex is the number of edges on the path from the root to it. The root is at level 0.',
      'height': 'The height of a rooted tree is the largest level of any vertex: the number of edges on the longest path from the root down to a leaf.',
      'spanning tree': 'A subgraph of a connected graph that contains every vertex and is a tree. It keeps exactly n − 1 of the edges.',
      'minimal spanning tree': 'In a weighted graph, a spanning tree whose total edge weight is as small as possible. Kruskal\'s and Prim\'s algorithms find one.',
      'binary tree': 'A rooted tree in which every vertex has at most two children, each one labelled as the left child or the right child.',
      'full binary tree': 'A binary tree in which every internal vertex has exactly two children. With i internal vertices it has i + 1 leaves.',
      'binary search tree': 'A binary tree with a key in every vertex, arranged so that keys in each left subtree are smaller and keys in each right subtree are larger than the vertex\'s own key.',
      'traversal': 'A procedure that visits every vertex of a tree exactly once in a fixed order, such as preorder, inorder, postorder or level order.',
      'expression tree': 'A binary tree that stores a formula: leaves hold numbers or variables, and each internal vertex holds an operator applied to its two subtrees.',
      'prefix-free code': 'A code in which no code word is the beginning of another. Such a code can be decoded bit by bit without separators. Huffman codes are prefix-free.',
      'decision tree': 'A rooted tree in which each internal vertex asks a question, each branch is an answer, and each leaf is a final decision or outcome.',
      'minimax': 'A rule for choosing moves in a two-player game tree: the player to move takes the maximum of the children\'s values, the opponent takes the minimum.',
    },
    symbols: [
      ['n − 1', 'edges in a tree with n vertices', '7 vertices ⇒ 6 edges'],
      ['h', 'height of a rooted tree', 'root alone: h = 0'],
      ['2ʰ', 'most leaves a binary tree of height h can have', 'h = 3 ⇒ ≤ 8 leaves'],
      ['⌈log₂ t⌉', 'least height of a binary tree with t leaves', '⌈log₂ 6⌉ = 3'],
      ['⌈log₂ n!⌉', 'least worst-case comparisons to sort n items', 'n = 4 ⇒ 5'],
      ['w(T)', 'total weight of a spanning tree T', 'w(T) = 38'],
      ['T_L, T_R', 'left and right subtrees of a binary tree', 'inorder: T_L, root, T_R'],
    ],
    css: `
      .tr-grid { flex: 1 1 auto; min-height: 0; display: grid; gap: 0.9rem; grid-template-rows: minmax(0, 1fr); }
      .tr-col { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; min-width: 0; }
      .tr-col > :not(.tr-fig) { flex-shrink: 0; }
      .tr-fig { flex: 1 1 auto; min-height: 0; position: relative; background: var(--sheet); border: 1px solid var(--rule); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
      .tr-fig > svg, .tr-mini > svg, .tr-concept-fig > svg { width: 100%; height: 100%; display: block; }
      .tr-fig .tr-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ink-3); font-size: 0.9rem; padding: 1rem; text-align: center; }
      .tr-mini { height: 9rem; max-width: 24rem; margin-top: 0.4rem; }
      .tr-concept-fig { height: 8.6rem; }
      .tr-svg text { fill: var(--ink); font-family: var(--font-body); }
      .tr-svg .nd circle { fill: var(--sheet); stroke: var(--ink-3); stroke-width: 1.6; }
      .tr-svg .nd text { font-size: 14px; font-weight: 600; text-anchor: middle; dominant-baseline: central; }
      .tr-svg .ed { stroke: var(--ink-3); stroke-width: 1.6; fill: none; }
      .tr-svg .ed.on { stroke: var(--accent); stroke-width: 3.6; }
      .tr-svg .ed.anc { stroke: var(--fnc); stroke-width: 3.4; }
      .tr-svg .nd.on circle { fill: var(--mark); stroke: var(--accent); stroke-width: 3; }
      .tr-svg .nd.on text { fill: var(--mark-ink); }
      .tr-svg .nd.hit circle { fill: var(--true-bg); stroke: var(--true); stroke-width: 3.2; }
      .tr-svg .nd.miss circle { fill: var(--false-bg); stroke: var(--false); stroke-width: 3; }
      .tr-svg .nd.done circle { fill: var(--accent); stroke: var(--accent); }
      .tr-svg .nd.done text { fill: var(--accent-ink); }
      .tr-svg .nd.new circle { stroke: var(--kw); stroke-width: 3; stroke-dasharray: 4 3; }
      .tr-svg .nd.sel circle { fill: var(--mark); stroke: var(--accent); stroke-width: 3.2; }
      .tr-svg .nd.sel text { fill: var(--mark-ink); }
      .tr-svg .nd.par circle { stroke: var(--fnc); stroke-width: 3.6; }
      .tr-svg .nd.kid circle { fill: var(--true-bg); stroke: var(--true); stroke-width: 2.8; }
      .tr-svg .nd.sib circle { fill: var(--warn-bg); stroke: var(--warn); stroke-width: 2.8; }
      .tr-svg .nd.anc circle { stroke: var(--fnc); stroke-width: 2.4; stroke-dasharray: 4 3; }
      .tr-svg .nd.des circle { stroke: var(--true); stroke-width: 2.4; stroke-dasharray: 4 3; }
      .tr-svg .nd text.sub { font-size: 12.5px; font-weight: 700; fill: var(--accent); }
      .tr-svg .nd .badge text { fill: var(--sheet); font-size: 11px; font-weight: 700; }
      .tr-svg .el { font-size: 12px; font-family: var(--font-mono); fill: var(--ink-2); text-anchor: middle; dominant-baseline: central; }
      .tr-svg .cnt { font-size: 11.5px; fill: var(--ink-2); text-anchor: middle; }
      .tr-svg .sub-box { fill: var(--accent-2); stroke: var(--accent); stroke-dasharray: 5 4; opacity: 0.6; }
      .tr-svg .lvl { stroke: var(--rule); stroke-dasharray: 3 5; fill: none; }
      .tr-svg .lvl-t { font-size: 12px; fill: var(--ink-3); font-family: var(--font-mono); }
      .tr-click .nd, .tr-click .mv { cursor: pointer; }
      .tr-click .nd:focus, .tr-click .mv:focus { outline: none; }
      .tr-click .nd:focus circle, .tr-click .mv:focus circle { stroke-width: 4; }
      .tr-svg .me { stroke: var(--ink-3); stroke-width: 2; fill: none; opacity: 0.75; }
      .tr-svg .me.in { stroke: var(--true); stroke-width: 5.5; opacity: 1; }
      .tr-svg .me.out { stroke: var(--false); stroke-width: 2.2; stroke-dasharray: 6 5; opacity: 0.85; }
      .tr-svg .me.skip { opacity: 0.28; }
      .tr-svg .me.front { stroke: var(--fnc); stroke-width: 3; stroke-dasharray: 3 4; opacity: 1; }
      .tr-svg .me.next { stroke: var(--kw); stroke-width: 3.2; stroke-dasharray: 8 5; opacity: 1; }
      .tr-svg .me.cur { stroke: var(--kw); stroke-width: 7; opacity: 1; stroke-dasharray: none; }
      .tr-svg .me.cur.out { stroke: var(--false); }
      .tr-svg .me.cur.in { stroke: var(--true); }
      .tr-svg .wbg { fill: var(--sheet); stroke: var(--rule); }
      .tr-svg .wt { font-size: 13px; font-weight: 700; text-anchor: middle; dominant-baseline: central; fill: var(--ink); }
      .tr-svg .mv circle { fill: var(--sheet); stroke: var(--ink-2); stroke-width: 2.2; }
      .tr-svg .mv text { font-size: 15px; font-weight: 700; text-anchor: middle; dominant-baseline: central; }
      .tr-svg .mv.intree circle { fill: var(--accent); stroke: var(--accent); }
      .tr-svg .mv.intree text { fill: var(--accent-ink); }
      .tr-svg .mv.start circle { stroke-width: 4.5; }
      .tr-svg .mv.c0 circle { stroke: var(--accent); stroke-width: 4.5; }
      .tr-svg .mv.c1 circle { stroke: var(--fnc); stroke-width: 4.5; }
      .tr-svg .mv.c2 circle { stroke: var(--num); stroke-width: 4.5; }
      .tr-svg .mv.c3 circle { stroke: var(--kw); stroke-width: 4.5; }
      table.tr-tbl { font-size: 0.8rem; }
      table.tr-tbl th, table.tr-tbl td { padding: 0.13rem 0.45rem; }
      table.tr-tbl tr.in td { background: var(--true-bg); }
      table.tr-tbl tr.out td { color: var(--false); }
      table.tr-tbl tr.skip td { color: var(--ink-3); }
      table.tr-tbl tr.front td { color: var(--fnc); font-weight: 600; }
      table.tr-tbl tr.cur td { background: var(--mark); color: var(--mark-ink); font-weight: 600; }
      table.tr-terms td { padding: 0.18rem 0.45rem; vertical-align: top; }
      table.tr-terms td .tiny { line-height: 1.25; }
      .tr-toks { display: flex; flex-wrap: wrap; gap: 0.25rem; }
      .tr-tok { font-family: var(--font-mono); font-size: 0.85rem; padding: 0.02rem 0.45rem; border: 1px solid var(--rule); border-radius: 0.3rem; background: var(--sheet); }
      .tr-tok.done { color: var(--ink-3); }
      .tr-tok.cur { background: var(--mark); color: var(--mark-ink); border-color: var(--accent); font-weight: 600; }
      .tr-stack { display: flex; gap: 0.3rem; align-items: center; min-height: 2.3rem; padding: 0.3rem 0.5rem; border: 1px dashed var(--rule); border-radius: var(--radius); background: var(--sheet); flex-wrap: wrap; }
      .tr-stack .cell { font-family: var(--font-mono); font-size: 0.9rem; padding: 0.1rem 0.6rem; border-radius: 0.3rem; background: var(--accent-2); border: 1px solid var(--accent); color: var(--ink); }
      .tr-stack .cell.top { background: var(--mark); color: var(--mark-ink); }
      .tr-bits { font-family: var(--font-mono); font-size: 0.8rem; word-break: break-all; line-height: 1.45; }
      .tr-bits .b0 { color: var(--fnc); }
      .tr-bits .b1 { color: var(--num); }
      .tr-seq { min-height: 2.2rem; }
      .tr-kv { display: grid; grid-template-columns: auto 1fr; gap: 0.1rem 0.7rem; font-size: 0.84rem; }
      .tr-kv b { font-variant-numeric: tabular-nums; }
      .tr-ex-row td:first-child { white-space: nowrap; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Trees: connected graphs with no cycles',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">tree</span> is a connected graph with no cycles. A graph with no cycles that may fall apart into several pieces is a <span class="term">forest</span>: each piece is a tree.</div>
              <div class="thm">For a graph \(T\) with \(n\) vertices, these four statements are equivalent (each one implies the others):
                <ol style="margin-top:0.3rem">
                  <li>\(T\) is connected and has no cycles.</li>
                  <li>Between any two vertices there is <b>exactly one</b> simple path.</li>
                  <li>\(T\) is connected and has exactly \(n - 1\) edges.</li>
                  <li>\(T\) has no cycles and has exactly \(n - 1\) edges.</li>
                </ol></div>
              <p>Why \(n - 1\)? Grow a tree one vertex at a time. A single vertex needs 0 edges, and each new vertex hooks on with exactly one edge. An extra edge between two vertices that are already connected would create a second path between them, which is a cycle.</p>
            </div>
            <div class="stack">
              <div class="card">${threeGraphs()}</div>
              <div class="warn">The edge count alone is not enough. A triangle plus one isolated vertex has 4 vertices and 3 edges, yet it has a cycle and is disconnected. Check a second condition too.</div>
              <div class="ai">Folders on a disk, the elements of a web page and the grammar of a sentence are all trees. A decision tree classifier routes each input from the root to one leaf, and a random forest is a forest of such trees whose votes are combined.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Lab: anatomy of a rooted tree',
        kind: 'lab',
        html: String.raw`<p class="muted small">A <span class="term">rooted tree</span> is a tree with one vertex chosen as the root, drawn at the top. Every other vertex then has a <span class="term">parent</span> and a <span class="term">level</span>. Click any vertex to see its relatives and its subtree. Then make it the root: the same tree hangs differently, and every family word changes with it.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const adj = {};
          for (const [u, v] of ANAT) { (adj[u] ||= []).push(v); (adj[v] ||= []).push(u); }
          Object.values(adj).forEach((l) => l.sort());
          let root = 'a', sel = 'f';
          const fig = h('div.tr-fig.tr-click', { role: 'group', 'aria-label': 'Rooted tree. Select a vertex with click or Enter.' });
          const stats = h('span.small.muted');
          const rootBtn = h('button.btn.primary.sm', { onclick: () => { root = sel; draw(); } });
          const resetBtn = h('button.btn.sm', { onclick: () => { root = 'a'; draw(); } }, 'Put the root back at a');
          const tbody = h('tbody');
          const legend = h('div.legend', ...[['Selected', 'var(--mark)', 'var(--accent)'], ['Parent', 'var(--sheet)', 'var(--fnc)'], ['Children', 'var(--true-bg)', 'var(--true)'], ['Siblings', 'var(--warn-bg)', 'var(--warn)'], ['Ancestors (dashed)', 'var(--sheet)', 'var(--fnc)'], ['Lower descendants (dashed)', 'var(--sheet)', 'var(--true)']]
            .map(([t, bg, bd]) => h('span', h('span.swatch', { style: { background: bg, border: `2px solid ${bd}` } }), t)));
          const pick = (v) => { sel = v; draw(); const g = fig.querySelector(`[data-v="${v}"]`); if (g && document.activeElement && fig.contains(document.activeElement)) g.focus(); };
          fig.addEventListener('click', (e) => { const g = e.target.closest('[data-v]'); if (g) pick(g.dataset.v); });
          fig.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('[data-v]'); if (g) { e.preventDefault(); pick(g.dataset.v); } });
          body.append(h('div.tr-grid', { style: { gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)' } },
            h('div.tr-col', fig, legend, h('div.row', rootBtn, resetBtn, stats)),
            h('div.tr-col', h('table.data.tr-terms', h('thead', h('tr', h('th', 'Term'), h('th', 'For the selected vertex'))), tbody))));

          function hang() {
            const parent = { [root]: null }, kids = {}, level = { [root]: 0 }, order = [root];
            for (let i = 0; i < order.length; i++) {
              const u = order[i];
              kids[u] = [];
              for (const v of adj[u]) if (!(v in parent)) { parent[v] = u; level[v] = level[u] + 1; kids[u].push(v); order.push(v); }
            }
            return { parent, kids, level, order };
          }
          function draw() {
            const { parent, kids, level, order } = hang();
            const x = {};
            let next = 0;
            (function place(v) {
              const ks = kids[v];
              if (!ks.length) { x[v] = next++; return; }
              ks.forEach(place);
              x[v] = (x[ks[0]] + x[ks[ks.length - 1]]) / 2;
            })(root);
            const maxL = Math.max(...Object.values(level));
            const anc = [];
            for (let v = parent[sel]; v != null; v = parent[v]) anc.push(v);
            const des = [];
            (function down(v) { for (const k of kids[v]) { des.push(k); down(k); } })(sel);
            const sib = parent[sel] == null ? [] : kids[parent[sel]].filter((v) => v !== sel);
            const role = (v) => (v === sel ? 'sel' : v === parent[sel] ? 'par' : kids[sel].includes(v) ? 'kid' : sib.includes(v) ? 'sib' : anc.includes(v) ? 'anc' : des.includes(v) ? 'des' : '');
            const dx = 56, dy = 62, left = 74, pad = 34, r = 17;
            const W = left + pad + Math.max(next - 1, 1) * dx + pad, H = 2 * pad + Math.max(maxL, 2) * dy;
            const X = (v) => left + pad + x[v] * dx, Y = (v) => pad + level[v] * dy;
            let g = '';
            for (let d = 0; d <= maxL; d++) {
              g += `<line class="lvl" x1="${left - 4}" y1="${pad + d * dy}" x2="${W - 6}" y2="${pad + d * dy}" stroke="var(--rule)"/>`;
              g += `<text class="lvl-t" x="6" y="${pad + d * dy + 4}" fill="var(--ink-3)">level ${d}</text>`;
            }
            const sub = [sel, ...des];
            const xs = sub.map(X), ys = sub.map(Y);
            g += `<rect class="sub-box" x="${Math.min(...xs) - 27}" y="${Math.min(...ys) - 27}" width="${Math.max(...xs) - Math.min(...xs) + 54}" height="${Math.max(...ys) - Math.min(...ys) + 54}" rx="16" fill="var(--accent-2)"/>`;
            for (const v of order) if (parent[v] != null) {
              const up = v === sel || anc.includes(v);
              g += `<line class="ed ${up ? 'anc' : ''}" x1="${X(parent[v])}" y1="${Y(parent[v])}" x2="${X(v)}" y2="${Y(v)}" stroke="var(--ink-3)"/>`;
            }
            g += `<text class="lvl-t" x="${X(root) + r + 7}" y="${Y(root) + 4}" fill="var(--ink-3)">← root</text>`;
            for (const v of order) {
              g += `<g class="nd ${role(v)}" data-v="${v}" tabindex="0" role="button" aria-label="vertex ${v}${v === root ? ', the root' : ''}"><circle cx="${X(v)}" cy="${Y(v)}" r="${r}" fill="var(--sheet)" stroke="var(--ink-3)"/><text x="${X(v)}" y="${Y(v)}" fill="var(--ink)">${v}</text></g>`;
            }
            fig.innerHTML = `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rooted tree with root ${root}">${g}</svg>`;
            const list = (a) => (a.length ? a.join(', ') : 'none');
            const leaves = order.filter((v) => !kids[v].length);
            const rows = [
              ['root', root, 'the vertex with no parent'],
              ['parent', parent[sel] ?? 'none (it is the root)', 'one step closer to the root'],
              ['child', list(kids[sel]), 'one step farther from the root'],
              ['sibling', list(sib), 'other children of its parent'],
              ['ancestor', list(anc), 'on the path up to the root'],
              ['descendant', list(des), 'anywhere below it'],
              ['leaf', kids[sel].length ? 'no: an internal vertex' : 'yes', 'a vertex with no children'],
              ['level', String(level[sel]), 'edges from the root down to it'],
              ['subtree', sub.length === 13 ? 'the whole tree (13 vertices)' : `{${sub.join(', ')}}`, `${sel} plus all its descendants`],
              ['height', String(maxL), 'the largest level in the tree'],
            ];
            const glossed = new Set(['parent', 'child', 'ancestor', 'descendant', 'leaf', 'level', 'height']);
            ctx.rc(tbody, ...rows.map(([t, v, m]) => h('tr',
              h('td', h(glossed.has(t) ? 'span.term' : 'span', { style: { fontWeight: 600 }, 'data-term': glossed.has(t) ? t : null }, t[0].toUpperCase() + t.slice(1)), h('div.tiny.muted', m)),
              h('td.mono', { style: { fontSize: '0.84rem' } }, v))));
            rootBtn.textContent = sel === root ? `${sel} is the root` : `Make ${sel} the root`;
            rootBtn.disabled = sel === root;
            stats.textContent = `13 vertices, 12 edges · ${leaves.length} leaves · ${13 - leaves.length} internal`;
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Spanning trees and minimal spanning trees',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">spanning tree</span> of a connected graph \(G\) is a subgraph that contains <b>every</b> vertex of \(G\) and is a tree. It keeps \(n - 1\) edges: just enough to connect everything, with no redundant loops. Every connected graph has one, because you can delete edges on cycles until no cycle is left.</div>
              <div class="def" data-label="Definition">In a weighted graph every edge carries a number, such as a cost or a distance. A <span class="term">minimal spanning tree</span> (MST) is a spanning tree \(T\) whose total weight \(w(T)\) is as small as possible.</div>
              <div class="thm">The cut property. Split the vertices into any two groups. The lightest edge between the two groups belongs to some minimal spanning tree. Kruskal and Prim only ever add such an edge, which is why a greedy choice never needs to be undone.</div>
            </div>
            <div class="stack">
              <div class="card"><h3>Kruskal's algorithm</h3><ol class="small">
                <li>Sort all the edges from lightest to heaviest.</li>
                <li>Take each edge in turn. Keep it unless its two ends are already connected, because then it would close a cycle.</li>
                <li>Stop when you have \(n - 1\) edges.</li></ol></div>
              <div class="card"><h3>Prim's algorithm</h3><ol class="small">
                <li>Start a tree at any vertex.</li>
                <li>Add the cheapest edge with exactly one end in the tree.</li>
                <li>Repeat until every vertex is in the tree.</li></ol></div>
              <div class="ai">Single-link clustering builds an MST over the data points and deletes its \(k - 1\) heaviest edges, which leaves \(k\) clusters. MSTs also plan the cheapest cabling for a data centre or a sensor network.</div>
              <div class="warn">Greedy is not always safe. Planning a delivery route by always driving to the nearest unvisited city can give a tour far longer than the best one. The cut property is what makes greedy choices correct for spanning trees.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Lab: Kruskal and Prim, step by step',
        kind: 'lab',
        html: String.raw`<p class="muted small">Press <b>Step</b> to make one greedy choice at a time. Kruskal walks the sorted edge list (the dashed purple edge is next) and rejects any edge that would close a cycle. Prim grows one tree from a start vertex (click a vertex to change it). Both always reach the same total weight when the weights are all different.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const names = Object.keys(MST_V);
          const n = names.length;
          let edges = MST_E.map(([u, v, w]) => ({ u, v, w }));
          let mode = 'kruskal', start = 'A', st = null, timer = null;
          const fig = h('div.tr-fig.tr-click', { role: 'group', 'aria-label': 'Weighted graph' });
          const modeBtns = {
            kruskal: h('button', { onclick: () => setMode('kruskal') }, 'Kruskal'),
            prim: h('button', { onclick: () => setMode('prim') }, 'Prim'),
          };
          const stepBtn = h('button.btn.primary.sm', { onclick: () => { stop(); step(); draw(); } }, 'Step ▶');
          const runBtn = h('button.btn.sm', { onclick: () => run() }, 'Run to the end');
          const resetBtn = h('button.btn.sm', { onclick: () => reset() }, 'Reset');
          const newBtn = h('button.btn.sm', { onclick: () => { const ws = ctx.R.sample(Array.from({ length: 20 }, (_, i) => i + 1), edges.length); edges = edges.map((e, i) => ({ ...e, w: ws[i] })); reset(); } }, 'New weights');
          const msg = h('div.feedback.info', { 'aria-live': 'polite', style: { minHeight: '3.3em' } });
          const tbody = h('tbody');
          const pieces = h('div.small');
          const totalEl = h('div.small');
          fig.addEventListener('click', (e) => { const g = e.target.closest('[data-v]'); if (g) chooseStart(g.dataset.v); });
          fig.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('[data-v]'); if (g) { e.preventDefault(); chooseStart(g.dataset.v); } });
          body.append(h('div.tr-grid', { style: { gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)' } },
            h('div.tr-col', h('div.row', h('div.seg', { role: 'group', 'aria-label': 'Algorithm' }, modeBtns.kruskal, modeBtns.prim), stepBtn, runBtn, resetBtn, newBtn), fig, msg),
            h('div.tr-col', h('table.data.tr-tbl', h('thead', h('tr', h('th', 'Edge'), h('th', 'Weight'), h('th', 'Status'))), tbody), totalEl, pieces)));

          const stop = () => { if (timer) clearInterval(timer); timer = null; runBtn.textContent = 'Run to the end'; };
          function run() {
            if (timer) { stop(); return; }
            if (st.done) reset();
            runBtn.textContent = 'Pause';
            timer = setInterval(() => { step(); draw(); if (st.done) stop(); }, 650);
          }
          function chooseStart(v) {
            if (mode !== 'prim') { setMode('prim'); }
            start = v;
            reset();
            st.msg = `Prim will grow the tree from ${v}. Press Step.`;
            draw();
          }
          function setMode(m) { mode = m; reset(); }
          function reset() {
            stop();
            const order = edges.map((_, i) => i).sort((a, b) => edges[a].w - edges[b].w);
            st = { order, i: 0, status: edges.map(() => ''), cur: -1, total: 0, count: 0, parent: Object.fromEntries(names.map((v) => [v, v])), inTree: new Set([start]), done: false };
            st.msg = mode === 'kruskal'
              ? 'Kruskal looks at edges from lightest to heaviest. Every vertex starts as its own piece. Press Step.'
              : `Prim grows one tree, starting from ${start}. Press Step to add the cheapest edge leaving the tree.`;
            draw();
          }
          const find = (v) => { while (st.parent[v] !== v) v = st.parent[v]; return v; };
          const groups = () => {
            const g = {};
            for (const v of names) (g[find(v)] ||= []).push(v);
            return Object.values(g).sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
          };
          function treePath(a, b) {
            const adj = {};
            edges.forEach((e, j) => { if (st.status[j] === 'in') { (adj[e.u] ||= []).push(e.v); (adj[e.v] ||= []).push(e.u); } });
            const prev = { [a]: null }, q = [a];
            for (let i = 0; i < q.length; i++) for (const w of adj[q[i]] || []) if (!(w in prev)) { prev[w] = q[i]; q.push(w); }
            const path = [];
            for (let v = b; v != null; v = prev[v]) path.unshift(v);
            return path;
          }
          function finish() {
            st.done = true;
            st.status = st.status.map((s) => (s === '' ? 'skip' : s));
            st.msg += ` That makes ${n - 1} edges for ${n} vertices, so the spanning tree is complete. Total weight: ${st.total}.`;
          }
          function step() {
            if (st.done) return;
            if (mode === 'kruskal') {
              const j = st.order[st.i++];
              const e = edges[j];
              st.cur = j;
              const ru = find(e.u), rv = find(e.v);
              if (ru !== rv) {
                const pu = groups().find((g) => g.includes(e.u)), pv = groups().find((g) => g.includes(e.v));
                st.parent[ru] = rv;
                st.status[j] = 'in';
                st.total += e.w;
                st.count++;
                st.msg = `Add ${e.u}–${e.v} (weight ${e.w}). Its ends were in different pieces, {${pu.join(', ')}} and {${pv.join(', ')}}, so it cannot close a cycle.`;
                if (st.count === n - 1) finish();
              } else {
                st.status[j] = 'out';
                st.msg = `Skip ${e.u}–${e.v} (weight ${e.w}). ${e.u} and ${e.v} are already connected by ${treePath(e.u, e.v).join('–')}, so this edge would close a cycle.`;
              }
            } else {
              const frontier = edges.map((_, j) => j).filter((j) => st.status[j] === '' && st.inTree.has(edges[j].u) !== st.inTree.has(edges[j].v)).sort((a, b) => edges[a].w - edges[b].w);
              if (!frontier.length) { st.done = true; return; }
              const j = frontier[0];
              const e = edges[j];
              const nv = st.inTree.has(e.u) ? e.v : e.u;
              const before = [...st.inTree].sort();
              st.inTree.add(nv);
              st.status[j] = 'in';
              st.total += e.w;
              st.count++;
              st.cur = j;
              edges.forEach((x, k) => { if (st.status[k] === '' && st.inTree.has(x.u) && st.inTree.has(x.v)) st.status[k] = 'out'; });
              st.msg = `The tree holds {${before.join(', ')}}. Of the ${frontier.length} edge${frontier.length === 1 ? '' : 's'} leaving it, ${e.u}–${e.v} (weight ${e.w}) is the cheapest, so add it: ${nv} joins the tree.`;
              if (st.count === n - 1) finish();
            }
          }
          function draw() {
            modeBtns.kruskal.setAttribute('aria-pressed', String(mode === 'kruskal'));
            modeBtns.prim.setAttribute('aria-pressed', String(mode === 'prim'));
            stepBtn.disabled = st.done;
            const front = (j) => mode === 'prim' && st.status[j] === '' && st.inTree.has(edges[j].u) !== st.inTree.has(edges[j].v);
            const nextK = mode === 'kruskal' && !st.done ? st.order[st.i] : -1;
            let g = '';
            edges.forEach((e, j) => {
              const [x1, y1] = MST_V[e.u], [x2, y2] = MST_V[e.v];
              const cls = [st.status[j], front(j) ? 'front' : '', j === st.cur ? 'cur' : '', j === nextK ? 'next' : ''].join(' ');
              g += `<line class="me ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink-3)"/>`;
            });
            edges.forEach((e) => {
              const [x1, y1] = MST_V[e.u], [x2, y2] = MST_V[e.v];
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              g += `<rect class="wbg" x="${mx - 13}" y="${my - 11}" width="26" height="22" rx="5" fill="var(--sheet)"/><text class="wt" x="${mx}" y="${my}" fill="var(--ink)">${e.w}</text>`;
            });
            const gs = groups().filter((x) => x.length > 1);
            names.forEach((v) => {
              const [x, y] = MST_V[v];
              let cls = '';
              if (mode === 'prim') cls = (st.inTree.has(v) ? 'intree' : '') + (v === start ? ' start' : '');
              else { const gi = gs.findIndex((x) => x.includes(v)); if (gi >= 0) cls = 'c' + (gi % 4); }
              g += `<g class="mv ${cls}" data-v="${v}" tabindex="0" role="button" aria-label="vertex ${v}${mode === 'prim' ? ', click to start Prim here' : ''}"><circle cx="${x}" cy="${y}" r="19" fill="var(--sheet)" stroke="var(--ink-2)"/><text x="${x}" y="${y}" fill="var(--ink)">${v}</text></g>`;
            });
            fig.innerHTML = `<svg class="tr-svg" viewBox="20 14 560 386" role="img" aria-label="Weighted graph for the minimal spanning tree lab">${g}</svg>`;
            msg.textContent = st.msg;
            msg.className = 'feedback ' + (st.done ? 'good' : 'info');
            const label = (j) => {
              const s = st.status[j];
              if (mode === 'kruskal') return s === 'in' ? 'added ✓' : s === 'out' ? 'cycle ✗' : s === 'skip' ? 'not needed' : j === nextK ? 'next' : '';
              return s === 'in' ? 'in tree ✓' : s === 'out' ? 'inside tree ✗' : front(j) ? 'leaves tree' : s === 'skip' ? 'not needed' : '';
            };
            const sorted = edges.map((_, j) => j).sort((a, b) => edges[a].w - edges[b].w);
            ctx.rc(tbody, ...sorted.map((j) => h('tr', { class: j === st.cur ? 'cur' : st.status[j] || (front(j) ? 'front' : '') },
              h('td.mono', `${edges[j].u}–${edges[j].v}`), h('td', String(edges[j].w)), h('td', label(j)))));
            totalEl.innerHTML = `<b>Total weight so far: ${st.total}</b> · edges chosen: ${st.count} of ${n - 1}`;
            if (mode === 'kruskal') pieces.innerHTML = `<span class="muted">Pieces (union-find sets):</span> ${groups().map((x) => `{${x.join(', ')}}`).join(' ')}`;
            else pieces.innerHTML = `<span class="muted">In the tree:</span> {${[...st.inTree].sort().join(', ')}}<br><span class="muted">Dashed blue edges leave the tree; the cheapest one is added next.</span>`;
          }
          ctx.onHide(stop);
          reset();
        },
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Binary trees and binary search trees',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">binary tree</span> is a rooted tree in which every vertex has at most two children, each labelled <b>left child</b> or <b>right child</b>. In a <span class="term">full binary tree</span> every internal vertex has exactly two children.</div>
              <div class="thm">A full binary tree with \(i\) internal vertices has \(i + 1\) leaves and \(2i + 1\) vertices.<br>A binary tree of <span class="term">height</span> \(h\) has at most \(2^h\) leaves, so a binary tree with \(t\) leaves has \(h \ge \lceil \log_2 t \rceil\).</div>
              <p class="small">Why \(2^h\)? Level 0 holds one vertex, and each level can at most double the one above: 1, 2, 4, 8, …. After \(h\) levels there is room for \(2^h\) leaves.</p>
              <div class="ai">Databases index millions of rows with B-trees, balanced search trees with many children per vertex. Nearest-neighbour search in machine learning libraries uses k-d trees, which split on one coordinate per level, much like a BST.</div>
            </div>
            <div class="stack">
              <div class="def">A <span class="term">binary search tree</span> (BST) holds a key in each vertex. For every vertex \(v\), all keys in its left subtree are smaller than \(v\)'s key and all keys in its right subtree are larger.</div>
              <p class="small"><b>Search</b> starts at the root. Equal means found, smaller means go left, larger means go right, and falling off the tree means the key is absent. <b>Insert</b> searches, then attaches the new key where the search fell off. Both cost at most \(h + 1\) comparisons.</p>
              <div class="warn">Insertion order shapes the tree. Inserting 1, 2, 3, …, \(n\) in order builds a path of height \(n - 1\), so a search may compare against every key. Shuffled input usually stays close to balanced. Self-balancing trees (AVL, red-black) rotate after inserts to keep \(h\) near \(\log_2 n\).</div>
              <div class="card split" style="padding:0.45rem 0.6rem;gap:0.6rem">
                <div><div class="tr-concept-fig" style="height:9.4rem">${binSVG(bstFrom([4, 2, 6, 1, 3, 5, 7]), { dx: 34, dy: 25, r: 15, pad: 18, minH: 186, aria: 'Balanced BST of height 2' })}</div><p class="tiny muted center">insert 4 2 6 1 3 5 7: height 2</p></div>
                <div><div class="tr-concept-fig" style="height:9.4rem">${binSVG(bstFrom([1, 2, 3, 4, 5, 6, 7]), { dx: 34, dy: 25, r: 15, pad: 18, aria: 'Degenerate BST of height 6' })}</div><p class="tiny muted center">insert 1 2 3 4 5 6 7: height 6</p></div>
              </div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: binary search tree playground',
        kind: 'lab',
        html: String.raw`<p class="muted small">Insert keys, search for one, or play a traversal and watch the visit order. Click any vertex to search for it. Try <b>Sorted 1–10</b> to see a degenerate tree, then <b>Balanced 1–15</b> to see the best case.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          let root = null, token = 0, travKind = null;
          let look = new Map(), lit = new Set(), seq = [];
          const insIn = h('input.inp.mono', { value: '45', 'aria-label': 'Keys to insert, separated by commas', style: { width: '8.5rem' } });
          const findIn = h('input.inp.mono', { value: '65', 'aria-label': 'Key to search for', style: { width: '4.5rem' } });
          insIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doInsert(); });
          findIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
          const msg = h('div.feedback.info', { 'aria-live': 'polite' });
          const fig = h('div.tr-fig.tr-click', { role: 'group', 'aria-label': 'Binary search tree' });
          const statsEl = h('div.tr-kv');
          const seqEl = h('div.stack', { style: { gap: '0.3rem' } });
          const travBtns = Object.entries(TRAV).map(([k, [name, rule]]) => h('button', { dataset: { k }, title: rule, onclick: () => doTraverse(k) }, name));
          const presets = [
            ['Example', () => [50, 30, 70, 20, 40, 60, 80, 35, 65]],
            ['Sorted 1–10', () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
            ['Balanced 1–15', () => [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15]],
            ['Random 12', () => ctx.R.sample(Array.from({ length: 99 }, (_, i) => i + 1), 12)],
          ];
          fig.addEventListener('click', (e) => { const g = e.target.closest('[data-key]'); if (g) { findIn.value = g.dataset.key; doSearch(); } });
          fig.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('[data-key]'); if (g) { e.preventDefault(); findIn.value = g.dataset.key; doSearch(); } });
          body.append(
            h('div.row', { style: { gap: '0.45rem' } },
              h('span.small.muted', 'Insert'), insIn, h('button.btn.primary.sm', { onclick: () => doInsert() }, 'Insert'),
              h('span.small.muted', { style: { marginLeft: '0.6rem' } }, 'Search'), findIn, h('button.btn.sm', { onclick: () => doSearch() }, 'Search'),
              h('button.btn.sm', { onclick: () => { cancel(); root = null; clearMarks(); say('info', 'The tree is empty. Insert a key or pick a preset.'); draw(); } }, 'Clear'),
              h('span.small.muted', { style: { marginLeft: '0.6rem' } }, 'Presets'), ...presets.map(([name, fn]) => h('button.btn.sm', { onclick: () => loadPreset(name, fn()) }, name))),
            h('div.tr-grid', { style: { gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)' } },
              h('div.tr-col', fig),
              h('div.tr-col', statsEl, msg, h('div.stack', { style: { gap: '0.3rem' } }, h('div.tiny.mono.muted', 'TRAVERSALS'), h('div.seg', { role: 'group', 'aria-label': 'Traversal order' }, ...travBtns)), seqEl,
                h('div.legend', { style: { marginTop: 'auto' } }, ...[['On the search path', 'var(--mark)', 'var(--accent)'], ['Found', 'var(--true-bg)', 'var(--true)'], ['Not found', 'var(--false-bg)', 'var(--false)'], ['Just inserted', 'var(--sheet)', 'var(--kw)'], ['Visited (badge = order)', 'var(--accent)', 'var(--accent)']]
                  .map(([t, bg, bd]) => h('span', h('span.swatch', { style: { background: bg, border: `2px solid ${bd}` } }), t))))));

          const cancel = () => { token++; };
          const clearMarks = () => { look = new Map(); lit = new Set(); seq = []; travKind = null; };
          const say = (kind, text) => { msg.className = 'feedback ' + kind; msg.innerHTML = text; };
          function animate(frames, delay, instant) {
            const my = ++token;
            if (instant || ctx.print) { frames.forEach((f) => f()); return; }
            let i = 0;
            const tick = () => { if (my !== token) return; frames[i++](); if (i < frames.length) setTimeout(tick, delay); };
            tick();
          }
          function loadPreset(name, keys) {
            cancel(); clearMarks();
            root = bstFrom(keys);
            const hh = height(root), nn = size(root);
            say(hh === nn - 1 && nn > 3 ? 'bad' : 'info', `Inserted ${keys.join(', ')} in that order. ${hh === nn - 1 && nn > 3 ? `Every key was larger than the one before, so each one went right: the tree is a path of height ${hh}.` : `Height ${hh} for ${nn} keys.`}`);
            draw();
          }
          function doInsert() {
            const nums = (insIn.value.match(/-?\d+/g) || []).map(Number).filter((x) => x >= 0 && x <= 999);
            if (!nums.length) { say('bad', 'Type one or more whole numbers from 0 to 999, separated by commas or spaces.'); return; }
            cancel(); clearMarks();
            const added = [], dup = [];
            let last = null, capped = false;
            for (const k of nums) {
              if (bstHas(root, k)) { dup.push(k); continue; }
              if (size(root) >= 31) { capped = true; break; }
              const res = bstInsert(root, k);
              root = res.root;
              added.push(k);
              last = { ...res, k };
              look.set(res.node, { cls: 'new' });
            }
            let text = '';
            if (last) {
              const parts = last.path.map((p) => `${last.k} ${last.k < p.key ? '<' : '>'} ${p.key}, go ${last.k < p.key ? 'left' : 'right'}`);
              last.path.slice(1).forEach((p) => lit.add(p));
              if (last.path.length) lit.add(last.node);
              const par = last.path[last.path.length - 1];
              text = `Inserted ${added.join(', ')}. ` + (par ? `For ${last.k}: ${parts.join('; ')}; the spot is empty, so ${last.k} becomes the ${last.k < par.key ? 'left' : 'right'} child of ${par.key}.` : `${last.k} is the first key, so it becomes the root.`);
            }
            if (dup.length) text += ` ${dup.join(', ')} ${dup.length === 1 ? 'is' : 'are'} already in the tree; this BST keeps each key once.`;
            if (capped) text += ' The lab stops at 31 keys so the drawing stays readable.';
            say(added.length ? 'info' : 'bad', text.trim());
            draw();
          }
          function doSearch(instant) {
            const m = findIn.value.match(/-?\d+/);
            if (!m) { say('bad', 'Type a whole number to search for.'); return; }
            const k = Number(m[0]);
            cancel(); clearMarks();
            if (!root) { say('bad', 'The tree is empty, so every search fails at once.'); draw(); return; }
            const path = [];
            let cur = root;
            while (cur) { path.push(cur); if (k === cur.key) break; cur = k < cur.key ? cur.left : cur.right; }
            const found = path[path.length - 1].key === k;
            const parts = [];
            const frames = path.map((p, i) => () => {
              look.set(p, { cls: 'on' });
              if (i > 0) lit.add(p);
              parts.push(k === p.key ? `${k} = ${p.key}, found` : `${k} ${k < p.key ? '<' : '>'} ${p.key}, go ${k < p.key ? 'left' : 'right'}`);
              say('info', `Searching for ${k}: ${parts.join(' → ')}`);
              draw();
            });
            frames.push(() => {
              const endN = path[path.length - 1];
              if (found) { look.set(endN, { cls: 'hit' }); say('good', `Found ${k} at level ${path.length - 1} after ${path.length} comparison${path.length === 1 ? '' : 's'}: ${parts.join(' → ')}.`); }
              else { look.set(endN, { cls: 'miss' }); say('bad', `${parts.join(' → ')}, but that child is empty. ${k} is not in the tree (${path.length} comparisons). Inserting it would attach it as the ${k < endN.key ? 'left' : 'right'} child of ${endN.key}.`); }
              draw();
            });
            animate(frames, 520, instant);
          }
          function doTraverse(kind) {
            cancel(); clearMarks();
            travKind = kind;
            const [name, rule] = TRAV[kind];
            if (!root) { say('bad', 'The tree is empty, so there is nothing to visit.'); draw(); return; }
            const order = orderOf(root, kind);
            const frames = order.map((node, i) => () => { look.set(node, { cls: 'done', badge: i + 1 }); seq.push(node.key); draw(); });
            frames.push(() => {
              const extra = { in: 'For a search tree, inorder always lists the keys in increasing order.', pre: `The root ${root.key} comes first. Copying a tree in preorder rebuilds the same shape.`, post: `The root ${root.key} comes last. Deleting a tree in postorder frees children before their parent.`, level: 'A queue produces this order: take a vertex from the front, add its children to the back.' }[kind];
              say('good', `${name} visited all ${order.length} vertices. ${extra}`);
            });
            say('info', `${name}: ${rule}. The numbers on the vertices show the visit order.`);
            animate(frames, 360);
          }
          function draw() {
            fig.innerHTML = root
              ? binSVG(root, { minW: 430, minH: 250, look: (nd) => look.get(nd), edge: (_, c) => (lit.has(c) ? 'on' : ''), focusable: true, aria: 'Binary search tree' })
              : '<div class="tr-empty">The tree is empty. Insert a key or pick a preset.</div>';
            const nn = size(root), hh = height(root);
            const best = nn ? Math.floor(Math.log2(nn)) : 0;
            const shape = nn < 3 ? 'too small to judge' : hh === nn - 1 ? '<span class="bad">degenerate: a path</span>' : hh <= best + 1 ? '<span class="ok">well balanced</span>' : 'somewhat unbalanced';
            statsEl.innerHTML = `<span>Keys</span><b>${nn}</b><span>Height <i>h</i></span><b>${nn ? hh : '–'}</b><span>Smallest possible height</span><b>${nn ? best : '–'}</b><span>Worst-case search</span><b>${nn ? `${hh + 1} comparisons` : '–'}</b><span>Leaves</span><b>${leafCount(root)}</b><span>Shape</span><b>${shape}</b>`;
            travBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === travKind)));
            ctx.rc(seqEl, travKind ? h('div.small', h('b', TRAV[travKind][0] + ': '), h('span.mono', seq.length ? seq.join(', ') : '…')) : h('div.small.muted', 'Pick a traversal to list every key in that order.'));
          }
          root = bstFrom([50, 30, 70, 20, 40, 60, 80, 35, 65]);
          doSearch(true);
          ctx.onHide(cancel);
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Traversals and expression trees',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">traversal</span> visits every vertex of a tree exactly once, in a fixed order. Writing \(T_L\) and \(T_R\) for the left and right subtrees, the depth-first orders are recursive:</div>
              <table class="tt tr-ex-row" style="width:100%">
                <thead><tr><th class="l">Order</th><th class="l">Rule</th><th class="l">On the tree below</th></tr></thead>
                <tbody>
                  <tr><td class="l">Preorder</td><td class="l">root, \(T_L\), \(T_R\)</td><td class="l mono">× + 3 4 − 5 2</td></tr>
                  <tr><td class="l">Inorder</td><td class="l">\(T_L\), root, \(T_R\)</td><td class="l mono">3 + 4 × 5 − 2</td></tr>
                  <tr><td class="l">Postorder</td><td class="l">\(T_L\), \(T_R\), root</td><td class="l mono">3 4 + 5 2 − ×</td></tr>
                  <tr><td class="l">Level order</td><td class="l">level by level (a queue)</td><td class="l mono">× + − 3 4 5 2</td></tr>
                </tbody>
              </table>
              <div class="tr-concept-fig" style="height:10.5rem">${binSVG(EXAMPLE_EXPR, { label: exLabel, dx: 44, dy: 50, r: 16, pad: 20, aria: 'Expression tree for (3 + 4) × (5 − 2)' })}</div>
            </div>
            <div class="stack">
              <div class="def">An <span class="term">expression tree</span> stores a formula. Leaves hold numbers, and each internal vertex holds an operator applied to its two subtrees.</div>
              <p class="small">The three depth-first orders give three notations. Preorder gives <b>prefix</b> (Polish) notation. Inorder gives the usual <b>infix</b>, which needs parentheses to keep its meaning: \((3 + 4) \times (5 - 2)\). Postorder gives <b>postfix</b> (reverse Polish), which never needs parentheses.</p>
              <div class="ex">Evaluate postfix with a stack: push each number; at an operator, pop two values (the first pop is the right operand), apply it, and push the result.<br><span class="mono small">3 4 + → 7 &nbsp;·&nbsp; 7 5 2 − → 7 3 &nbsp;·&nbsp; 7 3 × → 21</span></div>
              <div class="ai">Python turns your source code into an abstract syntax tree before running it (see the <code>ast</code> module). Deep-learning frameworks record each computation as a graph and run backpropagation over it in reverse, children before parents.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: expression trees and the postfix stack',
        kind: 'lab',
        html: String.raw`<p class="muted small">Type an arithmetic expression with + − * / ^ and parentheses. The lab builds its tree (× and ÷ bind tighter than + and −, and ^ binds tightest), reads it in three orders, then evaluates the postfix form one token at a time with a stack.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const presets = ['(3 + 4) * (5 - 2)', '2 + 3 * 4', '(2 + 3) * 4', '10 - 4 - 3', '2 ^ 3 ^ 2', '(8 - 2) / (1 + 2) + 6 * 2'];
          let tree = null, post = [], steps = [], k = 0, timer = null;
          const inp = h('input.inp.mono', { value: presets[0], maxlength: 60, 'aria-label': 'Arithmetic expression', style: { flex: '1 1 15rem', fontSize: '1rem' } });
          inp.addEventListener('input', () => load(inp.value));
          const err = h('div.feedback');
          const fig = h('div.tr-fig');
          const nota = h('tbody');
          const toks = h('div.tr-toks');
          const stack = h('div.tr-stack', { 'aria-label': 'Stack, bottom to top' });
          const msg = h('div.feedback.info', { 'aria-live': 'polite', style: { minHeight: '4.4em' } });
          const backBtn = h('button.btn.sm', { onclick: () => { stop(); k = Math.max(0, k - 1); draw(); } }, '◀ Back');
          const stepBtn = h('button.btn.primary.sm', { onclick: () => { stop(); k = Math.min(post.length, k + 1); draw(); } }, 'Step ▶');
          const playBtn = h('button.btn.sm', { onclick: () => play() }, 'Play');
          const resetBtn = h('button.btn.sm', { onclick: () => { stop(); k = 0; draw(); } }, 'Reset');
          body.append(
            h('div.row', { style: { gap: '0.45rem' } }, inp, ...presets.slice(1).map((p) => h('button.btn.sm.mono', { onclick: () => { inp.value = p; load(p); } }, p)), err),
            h('div.tr-grid', { style: { gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' } },
              h('div.tr-col', fig),
              h('div.tr-col',
                h('table.data.tr-tbl', nota),
                h('div.tiny.mono.muted', 'POSTFIX, READ LEFT TO RIGHT'), toks,
                h('div.tiny.mono.muted', 'STACK (BOTTOM → TOP)'), stack, msg,
                h('div.row', backBtn, stepBtn, playBtn, resetBtn))));

          const stop = () => { if (timer) clearInterval(timer); timer = null; playBtn.textContent = 'Play'; };
          function play() {
            if (timer) { stop(); return; }
            if (!tree) return;
            if (k >= post.length) k = 0;
            playBtn.textContent = 'Pause';
            timer = setInterval(() => { k++; draw(); if (k >= post.length) stop(); }, 750);
            draw();
          }
          function load(src) {
            stop();
            try {
              tree = parseExpr(src);
              if (orderOf(tree, 'post').filter((x) => x.op).length > 12) throw new Error('Keep it to 12 operators or fewer so the tree stays readable.');
              err.textContent = '';
              err.className = 'feedback';
            } catch (e) {
              tree = null;
              err.textContent = e.message;
              err.className = 'feedback bad';
            }
            post = tree ? orderOf(tree, 'post') : [];
            steps = [];
            const st = [];
            for (const nd of post) {
              if (!nd.op) { st.push(nd.v); steps.push({ stack: st.slice(), text: `Read ${nd.s}: a number, so push it onto the stack.` }); }
              else {
                const b = st.pop(), a = st.pop();
                const v = applyOp(nd.op, a, b);
                nd.val = v;
                st.push(v);
                steps.push({ stack: st.slice(), text: `Read ${SYM[nd.op]}: pop ${fmtNum(b)} (the right operand), then pop ${fmtNum(a)} (the left operand). Compute ${fmtNum(a)} ${SYM[nd.op]} ${fmtNum(b)} = ${fmtNum(v)} and push the result.${Number.isFinite(v) ? '' : ' Division by zero has no numeric answer.'}` });
              }
            }
            k = 0;
            draw();
          }
          function draw() {
            const idx = new Map(post.map((nd, i) => [nd, i]));
            if (!tree) {
              fig.innerHTML = '<div class="tr-empty">Fix the expression to see its tree.</div>';
              ctx.rc(nota); ctx.rc(toks); ctx.rc(stack, h('span.tiny.muted', 'empty'));
              msg.className = 'feedback info';
              msg.textContent = 'The tree, the notations and the stack appear once the expression is valid.';
              [backBtn, stepBtn, playBtn, resetBtn].forEach((b) => (b.disabled = true));
              return;
            }
            [backBtn, stepBtn, playBtn, resetBtn].forEach((b) => (b.disabled = false));
            backBtn.disabled = k === 0;
            stepBtn.disabled = k >= post.length;
            fig.innerHTML = binSVG(tree, {
              label: exLabel, minW: 360, minH: 240, dx: 50, aria: 'Expression tree',
              look: (nd) => {
                const i = idx.get(nd);
                if (i >= k) return {};
                return { cls: i === k - 1 ? 'on' : 'done', sub: nd.op ? '= ' + fmtNum(nd.val) : null };
              },
              edge: (p, c) => (idx.get(c) < k ? 'on' : ''),
            });
            const raw = orderOf(tree, 'in').map(exLabel).join(' ');
            const par = infix(tree);
            ctx.rc(nota,
              h('tr', h('td.muted', 'Preorder → prefix'), h('td.mono', orderOf(tree, 'pre').map(exLabel).join(' '))),
              h('tr', h('td.muted', 'Inorder → infix'), h('td.mono', par)),
              raw !== par ? h('tr', h('td.muted', 'Inorder, no brackets'), h('td.mono', h('span', raw), h('span.tiny.bad', { style: { fontFamily: 'var(--font-body)' } }, '  loses the grouping'))) : null,
              h('tr', h('td.muted', 'Postorder → postfix'), h('td.mono', post.map(exLabel).join(' '))));
            ctx.rc(toks, ...post.map((nd, i) => h('span.tr-tok', { class: i < k - 1 ? 'done' : i === k - 1 ? 'cur' : '' }, exLabel(nd))));
            const cur = k ? steps[k - 1].stack : [];
            ctx.rc(stack, cur.length ? cur.map((v, i) => h('span.cell', { class: i === cur.length - 1 ? 'top' : '' }, fmtNum(v))) : h('span.tiny.muted', 'empty'));
            msg.className = 'feedback ' + (k === post.length ? 'good' : 'info');
            msg.textContent = k === 0
              ? `Postfix is read from left to right. There are ${post.length} tokens. Press Step to read the first one.`
              : steps[k - 1].text + (k === post.length ? ` The input is used up and the stack holds exactly one number, ${fmtNum(cur[0])}: the value of the whole expression.` : '');
          }
          ctx.onHide(stop);
          load(presets[0]);
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Trees that decide: codes, sorting and games',
        kind: 'concept',
        html: String.raw`
          <div class="split-wide">
            <div class="stack">
              <div class="card"><h3>Prefix-free codes</h3>
                <p class="small">ASCII spends 8 bits on every character. A variable-length code gives frequent symbols short code words. To decode without separators, no code word may be the beginning of another: a <span class="term">prefix-free code</span>. With \(a = 0,\ b = 10,\ c = 11\), the bits 01011 can only mean <i>a b c</i>. With \(a = 0,\ b = 01,\ c = 1\), the bits 01 could be <i>b</i> or <i>a c</i>.</p>
                <p class="small" style="margin-top:0.3rem">Prefix-free codes are binary trees: symbols sit at the leaves, and 0 means go left, 1 means go right. Huffman's greedy algorithm builds the best such tree (next slide).</p></div>
              <div class="card"><h3>Decision trees and the sorting bound</h3>
                <p class="small">In a <span class="term">decision tree</span> each internal vertex asks a question and each leaf is an outcome. A comparison sort asks "is \(x_i \lt x_j\)?" and must be able to end at any of the \(n!\) orders, so its tree has at least \(n!\) leaves and height at least \(\lceil \log_2 n! \rceil\). For \(n = 3\) that is 3 comparisons. This grows like \(n \log_2 n\), so merge sort is as fast as comparison sorting can be.</p>${sortTreeFig()}</div>
            </div>
            <div class="stack">
              <div class="card"><h3>Game trees and minimax</h3>
                ${minimaxFig()}
                <p class="small">Vertices are positions and children are the positions one move later. With <span class="term">minimax</span>, the opponent (MIN) takes the smallest child value and you (MAX) take the largest. Here the left move guarantees 3.</p></div>
              <div class="ai">Gradient-boosted trees and random forests are leading models for tabular data. AlphaGo chose moves with Monte Carlo Tree Search over a game tree. Huffman coding sits inside zip and PNG and is used to compress model weights.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: Huffman code builder',
        kind: 'lab',
        html: String.raw`<p class="muted small">Huffman's rule: start with one tree per symbol, weighted by its count, and repeatedly merge the two lightest trees. The lighter tree goes left (bit 0); ties go to the tree whose smallest symbol comes first. Type any text, then step through the merges.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const presets = ['abracadabra', 'mississippi', 'she sells sea shells', 'aaaaaaabbbccd', 'abcdefgh'];
          let text = '', counts = null, snaps = null, k = 0;
          const inp = h('input.inp.mono', { value: presets[0], maxlength: 48, 'aria-label': 'Text to encode', style: { flex: '1 1 13rem', fontSize: '1rem' } });
          inp.addEventListener('input', () => load(inp.value));
          const err = h('div.feedback');
          const fig = h('div.tr-fig');
          const msg = h('div.feedback.info', { 'aria-live': 'polite', style: { minHeight: '3.3em' } });
          const tbody = h('tbody');
          const statsEl = h('div.stack', { style: { gap: '0.25rem' } });
          const restartBtn = h('button.btn.sm', { onclick: () => { k = 0; draw(); } }, '⟲ Start over');
          const backBtn = h('button.btn.sm', { onclick: () => { k = Math.max(0, k - 1); draw(); } }, '◀ Back');
          const stepBtn = h('button.btn.primary.sm', { onclick: () => { k = Math.min(snaps.length - 1, k + 1); draw(); } }, 'Merge ▶');
          const allBtn = h('button.btn.sm', { onclick: () => { k = snaps.length - 1; draw(); } }, 'Build all');
          body.append(
            h('div.row', { style: { gap: '0.45rem' } }, h('span.small.muted', 'Text'), inp, ...presets.slice(1).map((p) => h('button.btn.sm.mono', { onclick: () => { inp.value = p; load(p); } }, p)), err),
            h('div.tr-grid', { style: { gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)' } },
              h('div.tr-col', fig, msg, h('div.row', restartBtn, backBtn, stepBtn, allBtn)),
              h('div.tr-col', h('table.data.tr-tbl', h('thead', h('tr', h('th', 'Symbol'), h('th', 'Count'), h('th', 'Code'), h('th', 'Bits'))), tbody), statsEl)));

          function load(src) {
            const t = [...String(src)].slice(0, 48).join('');
            const c = new Map();
            for (const ch of t) c.set(ch, (c.get(ch) || 0) + 1);
            const still = text ? ` Still showing "${text}".` : '';
            if (!t.length) { err.className = 'feedback bad'; err.textContent = 'Type some text first.' + still; return; }
            if (c.size > 12) { err.className = 'feedback bad'; err.textContent = `${c.size} different symbols: keep it to 12 so the forest fits.${still}`; return; }
            err.className = 'feedback'; err.textContent = '';
            text = t; counts = c; snaps = huffman(c);
            k = snaps.length - 1;
            draw();
          }
          function partial(forest) {
            const m = new Map();
            for (const t of forest) (function walk(n, p) { if (!n.left) { m.set(n.sym, p); return; } walk(n.left, p + '0'); walk(n.right, p + '1'); })(t, '');
            return m;
          }
          function forestSVG(snap) {
            const dx = 46, dy = 58, r = 17, pad = 30;
            let col = 0, maxD = 0;
            const items = [];
            for (const t of snap.forest) {
              const x = new Map(), d = new Map();
              let next = col;
              (function place(n, depth) {
                d.set(n, depth);
                if (depth > maxD) maxD = depth;
                if (!n.left) { x.set(n, next++); return; }
                place(n.left, depth + 1); place(n.right, depth + 1);
                x.set(n, (x.get(n.left) + x.get(n.right)) / 2);
              })(t, 0);
              items.push({ t, x, d });
              col = next + 0.55;
            }
            const units = col - 0.55;
            const cw = (units - 1) * dx + 2 * pad, ch = maxD * dy + 2 * pad + 16;
            const W = Math.max(380, cw), H = Math.max(210, ch);
            const ox = (W - cw) / 2 + pad, oy = (H - ch) / 2 + pad;
            let edges = '', nodes = '';
            for (const { t, x, d } of items) {
              const P = (n) => [ox + x.get(n) * dx, oy + d.get(n) * dy];
              (function walk(n) {
                const [px, py] = P(n);
                if (n.left) {
                  for (const [c, bit] of [[n.left, 0], [n.right, 1]]) {
                    const [cx, cy] = P(c);
                    edges += `<line class="ed" x1="${px}" y1="${py}" x2="${cx}" y2="${cy}" stroke="var(--ink-3)"/>`;
                    edges += `<text class="el" x="${(px + cx) / 2 + (bit ? 8 : -8)}" y="${(py + cy) / 2 - 3}" fill="var(--ink-2)">${bit}</text>`;
                    walk(c);
                  }
                }
                const on = n === snap.merged;
                const label = n.left ? String(n.w) : showSym(n.sym);
                nodes += `<g class="nd ${on ? 'on' : n.left ? '' : 'leafy'}"><circle cx="${px}" cy="${py}" r="${r}" fill="var(--sheet)" stroke="var(--ink-3)"/><text x="${px}" y="${py}" fill="var(--ink)">${escT(label)}</text>${n.left ? '' : `<text class="cnt" x="${px}" y="${py + r + 13}" fill="var(--ink-2)">${n.w}</text>`}</g>`;
              })(t);
            }
            return `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Huffman forest">${edges}${nodes}</svg>`;
          }
          function draw() {
            if (!snaps) return;
            const last = snaps.length - 1;
            const snap = snaps[k];
            const final = k === last;
            fig.innerHTML = forestSVG(snap);
            const single = counts.size === 1;
            const codes = final ? huffCodes(snap.forest[0], single) : partial(snap.forest);
            const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
            ctx.rc(tbody, ...rows.map(([c, n]) => h('tr',
              h('td.mono', { style: { fontWeight: 700 } }, showSym(c)), h('td', String(n)),
              h('td.mono', final ? codes.get(c) : h('span.muted', '…' + (codes.get(c) || ''))),
              h('td', final ? String(n * codes.get(c).length) : '–'))));
            const merges = snaps.slice(1, k + 1).map((s) => s.merged.w);
            if (k === 0) msg.textContent = `Start: ${counts.size} one-vertex trees, one per symbol, weighted by count. Press Merge to join the two lightest.`;
            else {
              const s = snaps[k];
              const desc = (t) => (t.sym != null ? `"${showSym(t.sym)}" (${t.w})` : `the tree {${leavesOf(t).map(showSym).join(', ')}} (${t.w})`);
              msg.textContent = `Merge ${k} of ${last}: join the two lightest trees, ${desc(s.a)} and ${desc(s.b)}, into one tree of weight ${s.a.w} + ${s.b.w} = ${s.merged.w}.${s.a.w === s.b.w ? ' Equal weights, so the tree with the earlier smallest symbol goes left.' : ''}${final ? ' One tree is left, so the code is finished.' : ''}`;
            }
            if (single && final) msg.textContent = 'Only one distinct symbol, so there is nothing to merge. By convention it gets the one-bit code 0.';
            msg.className = 'feedback ' + (final ? 'good' : 'info');
            restartBtn.disabled = backBtn.disabled = k === 0;
            stepBtn.disabled = allBtn.disabled = final;
            const N = text.length ? [...text].length : 0;
            if (!final) {
              ctx.rc(statsEl,
                h('div.small', { html: `Each merge puts one more bit in front of every symbol inside the two merged trees, so codes grow from the right. The <b>…</b> marks bits still to come.` }),
                h('div.small', { html: `Merged weights so far: ${merges.length ? merges.join(' + ') + ' = <b>' + merges.reduce((a, b) => a + b, 0) + '</b>' : 'none yet'}. At the end this sum equals the length of the encoded text in bits.` }));
              return;
            }
            const bits = rows.reduce((s, [c, n]) => s + n * codes.get(c).length, 0);
            const ascii = 8 * N;
            const fixedW = counts.size > 1 ? Math.ceil(Math.log2(counts.size)) : 1;
            const H2 = -rows.reduce((s, [, n]) => s + (n / N) * Math.log2(n / N), 0);
            const enc = [...text].map((c, i) => `<span class="b${i % 2}">${codes.get(c)}</span>`).join('');
            ctx.rc(statsEl,
              h('div.tr-kv', { html: `<span>Huffman</span><b>${bits} bits (${(bits / N).toFixed(2)} per symbol)</b><span>8-bit ASCII</span><b>${ascii} bits</b><span>Fixed ${fixedW}-bit code</span><b>${fixedW * N} bits</b><span>vs ASCII</span><b>${(ascii / bits).toFixed(2)} : 1, saving ${(100 * (1 - bits / ascii)).toFixed(1)}%</b><span>Entropy</span><b>${H2.toFixed(2)} bits per symbol</b>` }),
              h('div.tiny.muted', 'Entropy is the smallest average any code can reach for these counts.'),
              h('div.tiny.mono.muted', 'ENCODED TEXT (ALTERNATE COLOURS = NEXT SYMBOL)'),
              h('div.tr-bits', { html: enc }));
          }
          load(presets[0]);
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: a binary search tree in Python',
        kind: 'code',
        file: 'bst.py',
        html: String.raw`<p class="muted small">Each vertex is a small dictionary with a key and two links. Both functions are recursive: they solve the problem for one vertex and hand the rest to a subtree. Switch to <b>Trace</b> to watch the calls go down the tree and come back up.</p>`,
        fivew: {
          what: 'Builds a binary search tree from seven keys with a recursive <code>insert</code>, then lists the keys with a recursive inorder traversal.',
          why: 'Insert shows the search-tree rule in action (smaller goes left, larger goes right). Inorder shows the payoff: reading left subtree, root, right subtree returns the keys already sorted.',
          who: 'Anyone who implements ordered data: database engineers writing indexes, library authors building sorted maps, and students preparing for technical interviews, where BSTs are a classic topic.',
          where: 'Ordered maps and sets (Java\'s TreeMap, C++\'s std::map), database indexes, schedulers that always need the next event, and k-d trees for nearest-neighbour search in machine learning.',
          when: 'Use a search tree when you need fast lookups <i>and</i> sorted order or range queries. For lookups alone, a <code>dict</code> or <code>set</code> is simpler and faster.',
        },
        lines: [
          ['def insert(t, key):', 'Defines <code>insert</code>. The parameter <code>t</code> (short for tree) is the root of the subtree we are inserting into, and <code>key</code> is the new value. The function returns the root of that subtree after the insert, which lets the caller relink it.'],
          ['    if t is None:', 'The base case. <code>None</code> means we have walked off the bottom of the tree: this is the empty spot where the new key belongs. Every recursive call heads toward this case, one level deeper each time.'],
          ['        return {"key": key, "left": None, "right": None}', 'Creates a new leaf: a dictionary holding the key and two empty links. Returning it hands the new vertex to the caller, which stores it as its left or right child. For the very first key, this vertex becomes the root.'],
          ['    side = "left" if key < t["key"] else "right"', 'The search-tree rule in one line. A conditional expression picks <code>"left"</code> when the new key is smaller than this vertex\'s key and <code>"right"</code> otherwise. Inserting 40 at the root 50 gives <code>side = "left"</code>.'],
          ['    t[side] = insert(t[side], key)', 'The recursive step. Insert into the chosen subtree, then store whatever comes back in that link. If the subtree was empty, the new leaf comes back and is attached here; otherwise the same child comes back and the link is unchanged.'],
          ['    return t', 'Returns this vertex unchanged to its caller. The root of a subtree never moves during an insert, only a <code>None</code> link at the bottom gets filled in.'],
          ['', ''],
          ['def inorder(t):', 'Defines the inorder traversal. It returns a list of the keys in the subtree rooted at <code>t</code>, in the order left subtree, root, right subtree.'],
          ['    if t is None:', 'Base case again: an empty subtree contributes no keys. Without this line, the next lines would try to read <code>t["left"]</code> from <code>None</code> and crash with a <code>TypeError</code>.'],
          ['        return []', 'An empty list, so the caller can safely glue it onto other lists with <code>+</code>.'],
          ['    left, right = inorder(t["left"]), inorder(t["right"])', 'Two recursive calls: one lists every key in the left subtree (all smaller than this key), the other every key in the right subtree (all larger). Python runs the left call first. For the root 50 this gives <code>left = [20, 30, 40]</code> and <code>right = [60, 70, 80]</code>.'],
          ['    return left + [t["key"]] + right', 'Glues the three parts in inorder: smaller keys, this key, larger keys. Because the BST rule holds at every vertex, the result is sorted. For the root: <code>[20, 30, 40] + [50] + [60, 70, 80]</code>.'],
          ['root = None', 'The main program starts here, back at the left margin. <code>root = None</code> is an empty tree; the variable will hold the root vertex once the first key is inserted.'],
          ['for key in [50, 30, 70, 20, 40, 60, 80]:', 'Inserts the keys in this order. 50 arrives first, so it becomes the root. The order is chosen to give a perfectly balanced tree of height 2. Sorted order would give a path of height 6 instead.'],
          ['    root = insert(root, key)', 'Calls <code>insert</code> and keeps the returned root. The assignment matters only for the first key, when <code>root</code> changes from <code>None</code> to the new vertex. Writing it the same way every time keeps the code simple.'],
          ['print("inorder:", inorder(root))', 'Prints the traversal. Output: <code>inorder: [20, 30, 40, 50, 60, 70, 80]</code>. The keys went in shuffled and come out sorted, which is why sorting by "insert everything into a BST, then read it inorder" works (it is called tree sort).'],
        ],
        expected: 'inorder: [20, 30, 40, 50, 60, 70, 80]\n',
        tryIt: 'Change the list to <code>[10, 20, 30, 40, 50, 60, 70]</code> and use Trace to count how deep the recursion goes now. Then add a <code>height(t)</code> function that returns <code>-1</code> for <code>None</code> and <code>1 + max(...)</code> otherwise.',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: Huffman coding with a heap',
        kind: 'code',
        file: 'huffman.py',
        html: String.raw`<p class="muted small">This is the greedy algorithm from the lab, written with Python's <code>heapq</code> functions. Each heap entry is (count, smallest symbol, codes so far). The middle field breaks ties, so the output always matches the lab exactly.</p>`,
        fivew: {
          what: 'Counts the characters of a text, merges the two lightest groups until one remains, and prints the prefix-free code table and the encoded length next to 8-bit ASCII.',
          why: 'It shows how a priority queue turns "repeatedly take the two smallest" into fast code, and how codes grow one bit at a time as groups merge.',
          who: 'Engineers who build or tune compression (zip, PNG, JPEG and HTTP compression all use Huffman codes), and machine-learning engineers who compress model weights for phones and edge devices.',
          where: 'The DEFLATE format inside zip files and PNG images, JPEG and MP3 encoders, and weight-compression pipelines that quantize a network and then Huffman-code the result.',
          when: 'Use it when some symbols are much more common than others and a code must decode unambiguously. When all symbols are equally likely, Huffman gives no gain over a fixed-length code.',
        },
        lines: [
          ['from heapq import heappop, heappush', 'Imports two functions from Python\'s binary-heap module. A heap is a list that keeps its smallest item at index 0. <code>heappop</code> removes that item and <code>heappush</code> adds one, each in about \\(\\log_2 n\\) steps instead of re-sorting the whole list.'],
          ['from collections import Counter', '<code>Counter</code> counts how many times each item appears. It is a dictionary from item to count.'],
          ['', ''],
          ['text = "abracadabra"', 'The message to compress: 11 characters using 5 distinct symbols.'],
          ['counts = Counter(text)', 'Counts the characters: a 5, b 2, r 2, c 1, d 1. These counts are the weights Huffman\'s algorithm works with.'],
          ['heap = sorted((n, c, {c: ""}) for c, n in counts.items())', 'One entry per symbol <code>c</code>: its count, the symbol itself, and a dictionary of codes for the symbols in this group (an empty code for now). A sorted list already satisfies the heap rule, so no <code>heapify</code> is needed. Tuples compare field by field: the count decides first and the symbol breaks ties.'],
          ['while len(heap) > 1:', 'Repeat until a single group holds every symbol. With 5 symbols the loop runs 4 times, because each pass turns two groups into one.'],
          ['    n1, t1, left = heappop(heap)', 'Takes out the lightest group. The first pass gets <code>(1, "c", {"c": ""})</code>. Its codes will start with 0 because it becomes the left branch.'],
          ['    n2, t2, right = heappop(heap)', 'Takes out the next lightest group, <code>(1, "d", {"d": ""})</code> on the first pass. It becomes the right branch.'],
          ['    left = {c: "0" + b for c, b in left.items()}', 'A dictionary comprehension that puts a 0 in front of every code <code>b</code> (the bits so far) in the left group. Bits go on the front because each merge creates a new vertex <i>above</i> the old trees. After the first pass: <code>{"c": "0"}</code>.'],
          ['    right = {c: "1" + b for c, b in right.items()}', 'The same for the right group, with a 1 in front: <code>{"d": "1"}</code> on the first pass.'],
          ['    heappush(heap, (n1 + n2, min(t1, t2), left | right))', 'Pushes the merged group back. Its count is the sum, 2 on the first pass. <code>left | right</code> joins the two code dictionaries (the groups never share a symbol). The tie-breaker is the smaller symbol, so Python never has to compare two dictionaries, which would raise a <code>TypeError</code>.'],
          ['codes = heap[0][2]', 'After the loop exactly one entry is left. Its third field, index 2, is the finished code table.'],
          ['print(codes)', 'Prints the table: <code>{\'a\': \'0\', \'r\': \'10\', \'b\': \'110\', \'c\': \'1110\', \'d\': \'1111\'}</code>. The most common symbol gets the shortest code. The order is fixed because every tie is broken the same way.'],
          ['print(sum(len(codes[c]) for c in text), "bits")', 'Walks through the text one character at a time and adds up the length of each code. Five a\'s cost 1 bit each, so the total is \\(5 + 6 + 4 + 4 + 4 = 23\\) bits.'],
          ['print(8 * len(text), "bits in 8-bit ASCII")', 'ASCII needs \\(11 \\times 8 = 88\\) bits, almost four times as many.'],
        ],
        expected: "{'a': '0', 'r': '10', 'b': '110', 'c': '1110', 'd': '1111'}\n23 bits\n88 bits in 8-bit ASCII\n",
        tryIt: 'Change the text to <code>"mississippi"</code> and compare the codes with the Huffman lab. Then try a text where every letter appears once, such as <code>"abcdefgh"</code>, and explain why every code has the same length.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: trees in real code',
        kind: 'design',
        html: String.raw`<p class="muted small">Tree code is short but easy to get subtly wrong. These habits keep it fast, safe on bad input, and easy to change. Click each principle (or use <kbd>↓</kbd>).</p>`,
        principles: [
          {
            name: 'Keep search trees balanced, or let a library do it',
            html: '<p>A plain BST is only as good as its height. Real data often arrives sorted (timestamps, IDs, rows read from a sorted file), and sorted insertions build a path, so every lookup becomes a linear scan.</p><p>Python has no built-in balanced tree. For exact lookups use a <code>dict</code> or <code>set</code>. For sorted order and range queries, keep a sorted list and binary-search it with <code>bisect</code>, which behaves like a perfectly balanced tree. Bring in a self-balancing structure when you need fast inserts too.</p>',
            bad: 'root = None\nfor key in sorted(keys):       # sorted input...\n    root = insert(root, key)   # ...builds a path\n# every search is now O(n)',
            good: 'import bisect\nkeys.sort()                         # once\ni = bisect.bisect_left(keys, target)\nfound = i < len(keys) and keys[i] == target',
          },
          {
            name: 'Choose recursion or an explicit stack on purpose',
            html: '<p>Recursion matches the definition of a tree and is the clearest choice for balanced trees. But Python stops at about 1000 nested calls (<code>sys.getrecursionlimit()</code>), so a degenerate tree 5000 levels deep makes a recursive traversal crash with <code>RecursionError</code>.</p><p>When the tree\'s shape is not under your control, use a loop with your own stack. It handles any depth and uses memory only for the vertices waiting to be visited.</p>',
            bad: 'def total(node):\n    if node is None:\n        return 0\n    return node.key + total(node.left) + total(node.right)',
            good: 's, stack = 0, [root]        # explicit stack\nwhile stack:\n    node = stack.pop()\n    if node:\n        s += node.key\n        stack += [node.left, node.right]',
          },
          {
            name: 'Separate node data from the tree\'s structure',
            html: '<p>Let a <code>Node</code> hold a key, a value and two links, and let a <code>Tree</code> class own the root and every algorithm. Callers ask the tree (<code>tree.get(k)</code>) instead of walking <code>.left.right</code> chains themselves.</p><p>Then you can rebalance, switch to a different tree, or add a size counter without touching any calling code.</p>',
            bad: '# caller reaches into the structure\nif root.left.right.key == 42:\n    root.left.right.value = "x"',
            good: 'class Tree:\n    def __init__(self):\n        self.root = None\n    def get(self, key): ...\n    def insert(self, key, value): ...\ntree.insert(42, "x")',
          },
          {
            name: 'Name the traversal order in your API',
            html: '<p>"Visit every vertex" hides a choice. Preorder, inorder, postorder and level order give different sequences, and downstream code often depends on one of them, for example on keys arriving sorted. Name the order in the function, or take it as a parameter, and say it in the docstring.</p>',
            bad: 'def traverse(node):   # which order? callers guess\n    ...',
            good: 'def keys_inorder(node):\n    """Yield keys in ascending order (left, root, right)."""\n    if node:\n        yield from keys_inorder(node.left)\n        yield node.key\n        yield from keys_inorder(node.right)',
          },
          {
            name: 'Guard against cycles when building trees from data',
            html: '<p>Hierarchies loaded from files or databases (employee to manager, folder to parent folder) can contain mistakes: a vertex that is its own ancestor, a vertex with two parents, or two roots. A traversal over such a "tree" loops forever or recurses until it crashes.</p><p>Validate before you trust it: exactly one root, one parent for every other vertex, and walking up from any vertex never repeats.</p>',
            bad: 'def depth(v):                  # trusts the data\n    if parent[v] is None:\n        return 0\n    return 1 + depth(parent[v])  # a cycle never ends',
            good: 'def has_cycle(parent, v):      # parent: child -> parent\n    seen = set()\n    while v is not None and v not in seen:\n        seen.add(v)\n        v = parent.get(v)\n    return v is not None       # stopped on a repeat',
          },
          {
            name: 'Use heapq for greedy algorithms',
            html: '<p>Huffman, Prim and many schedulers repeatedly need "the smallest remaining item". Re-sorting the list or calling <code>min()</code> on every step costs \\(O(n)\\) or more per step. A binary heap does each push and pop in \\(O(\\log n)\\).</p><p>Store <code>(priority, tie_breaker, item)</code> tuples so that equal priorities never fall through to comparing the items themselves.</p>',
            bad: 'while len(trees) > 1:\n    trees.sort()                     # every step\n    a, b = trees.pop(0), trees.pop(0)\n    trees.append(merge(a, b))',
            good: 'heapq.heapify(trees)                 # O(n), once\nwhile len(trees) > 1:\n    a = heapq.heappop(trees)         # O(log n)\n    b = heapq.heappop(trees)\n    heapq.heappush(trees, merge(a, b))',
          },
          {
            name: 'Use union-find to ask "would this edge close a cycle?"',
            html: '<p>Kruskal\'s algorithm asks, for every edge, whether its two ends are already connected. Searching the partial tree each time costs time proportional to its size. A union-find (disjoint-set) structure answers almost instantly: every vertex points toward a representative of its piece, and two vertices are connected exactly when they reach the same representative.</p>',
            good: 'parent = {v: v for v in vertices}\ndef find(v):\n    while parent[v] != v:\n        v = parent[v]\n    return v\n# (u, w) closes a cycle iff find(u) == find(w)',
          },
          {
            name: 'Test with degenerate inputs',
            html: '<p>Tree bugs hide in the shapes nobody draws: the empty tree, a single vertex, sorted input (a path), repeated keys and very deep trees. Write tests that build these shapes and check invariants such as "inorder output is sorted" and "height is at most \\(n - 1\\)".</p>',
            good: 'for keys in ([], [7], list(range(2000)), [5] * 10):\n    root = build(keys)\n    assert list(keys_inorder(root)) == sorted(keys)\n    assert height(root) <= max(len(keys) - 1, 0)',
          },
        ],
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: trees',
        kind: 'practice',
        html: String.raw`<p class="muted small">Answers are numbers or lists. For a traversal, type the keys in order separated by commas, such as <code>50, 30, 70</code>. For postfix, separate tokens with spaces.</p>`,
        gens: [
          {
            label: 'Counting in trees',
            make(R, M) {
              const kind = R.int(0, 7);
              const ceilLog2 = (x) => { let e = 0; while (2 ** e < x) e++; return e; };
              if (kind === 0) {
                const n = R.int(5, 60);
                return { prompt: String.raw`A tree has \(${n}\) vertices. How many edges does it have?`, answer: n - 1, solution: String.raw`Every tree with \(n\) vertices has exactly \(n - 1\) edges, so this one has \(${n} - 1 = ${n - 1}\).` };
              }
              if (kind === 1) {
                const c = R.int(2, 5), n = R.int(10, 50);
                return { prompt: String.raw`A forest has \(${n}\) vertices and is made of \(${c}\) separate trees. How many edges does it have?`, answer: n - c, hint: 'apply the tree formula to each piece.', solution: String.raw`A tree with \(n_i\) vertices has \(n_i - 1\) edges. Adding over the \(${c}\) trees gives \((n_1 + \dots + n_{${c}}) - ${c} = ${n} - ${c} = ${n - c}\) edges.` };
              }
              if (kind === 2) {
                const i = R.int(3, 40);
                return { prompt: String.raw`A full binary tree has \(${i}\) internal vertices. How many leaves does it have?`, answer: i + 1, solution: String.raw`Each internal vertex has 2 children, so there are \(2 \cdot ${i} = ${2 * i}\) children plus the root: \(${2 * i + 1}\) vertices. Removing the \(${i}\) internal ones leaves \(${i} + 1 = ${i + 1}\) leaves.` };
              }
              if (kind === 3) {
                const t = R.int(4, 40);
                return { prompt: String.raw`A full binary tree has \(${t}\) leaves. How many vertices does it have in total?`, answer: 2 * t - 1, solution: String.raw`In a full binary tree, leaves \(= i + 1\), so there are \(i = ${t} - 1 = ${t - 1}\) internal vertices and \(${t} + ${t - 1} = ${2 * t - 1}\) vertices in total.` };
              }
              if (kind === 4) {
                const hh = R.int(2, 9);
                return { prompt: String.raw`What is the largest number of leaves a binary tree of height \(${hh}\) can have?`, answer: 2 ** hh, solution: String.raw`Each level can at most double the one above (1, 2, 4, …), so level \(${hh}\) holds at most \(2^{${hh}} = ${2 ** hh}\) vertices, and all the leaves can sit there.` };
              }
              if (kind === 5) {
                const t = R.int(5, 300), e = ceilLog2(t);
                return { prompt: String.raw`A binary tree has \(${t}\) leaves. What is the smallest height it can have?`, answer: e, solution: String.raw`Height \(h\) allows at most \(2^h\) leaves, so we need \(2^h \ge ${t}\). Since \(2^{${e - 1}} = ${2 ** (e - 1)}\) is too small and \(2^{${e}} = ${2 ** e}\) is enough, \(h = \lceil \log_2 ${t} \rceil = ${e}\).` };
              }
              if (kind === 6) {
                const n = R.int(3, 7), f = M.fact(n), e = ceilLog2(f);
                return { prompt: String.raw`At least how many comparisons does any comparison sort need, in the worst case, to sort \(${n}\) distinct items?`, answer: e, solution: String.raw`The sort is a binary decision tree with at least \(${n}! = ${f}\) leaves, one per possible order, so its height is at least \(\lceil \log_2 ${f} \rceil\). Since \(2^{${e - 1}} = ${2 ** (e - 1)} \lt ${f} \le 2^{${e}} = ${2 ** e}\), the answer is \(${e}\).` };
              }
              const hh = R.int(2, 8);
              return { prompt: String.raw`What is the largest number of vertices a binary tree of height \(${hh}\) can have?`, answer: 2 ** (hh + 1) - 1, solution: String.raw`Fill every level: \(1 + 2 + 4 + \dots + 2^{${hh}} = 2^{${hh + 1}} - 1 = ${2 ** (hh + 1) - 1}\).` };
            },
          },
          {
            label: 'Traversals',
            make(R) {
              const n = R.int(6, 8);
              const keys = R.sample(Array.from({ length: 90 }, (_, i) => i + 10), n);
              const root = bstFrom(keys);
              const kind = R.pick(['pre', 'pre', 'post', 'post', 'level', 'in']);
              const seq = orderOf(root, kind).map((x) => x.key);
              const [name, rule] = TRAV[kind];
              const want = seq.join(', ');
              const extra = {
                pre: `Start with the root ${root.key}, and finish the whole left subtree before touching the right one.`,
                post: `Both subtrees come before their root, so the root ${root.key} is last.`,
                level: 'Read the drawing row by row, left to right. In code a queue produces this order.',
                in: 'In a binary search tree, inorder always lists the keys in increasing order.',
              }[kind];
              return {
                prompt: `List the keys of this binary search tree in <b>${name.toLowerCase()}</b> order.<div class="tr-mini">${binSVG(root, { dx: 40, dy: 46, r: 15, pad: 20, aria: 'Binary search tree' })}</div>`,
                answer: want,
                answerText: want,
                check: (inp) => { const got = (String(inp).match(/-?\d+/g) || []).map(Number); return got.length === seq.length && got.every((x, i) => x === seq[i]); },
                placeholder: 'e.g. 50, 30, 70',
                solution: `${name} means: ${rule}. ${extra} Result: <b>${want}</b>.`,
              };
            },
          },
          {
            label: 'Expression trees',
            make(R) {
              const tree = randExpr(R, R.int(3, 4));
              const post = orderOf(tree, 'post');
              if (R.chance(0.6)) {
                const st = [], lines = [];
                const m = (x) => (x < 0 ? '−' + -x : String(x));
                const show = () => `[${st.map(m).join(', ')}]`;
                for (const nd of post) {
                  if (!nd.op) { st.push(nd.v); lines.push(`${nd.s}: push → ${show()}`); }
                  else { const b = st.pop(), a = st.pop(), v = applyOp(nd.op, a, b); st.push(v); lines.push(`${SYM[nd.op]}: pop ${m(b)} and ${m(a)}, ${m(a)} ${SYM[nd.op]} ${m(b)} = ${m(v)} → ${show()}`); }
                }
                return {
                  prompt: `Evaluate the postfix expression <code>${post.map(exLabel).join(' ')}</code>.`,
                  answer: st[0],
                  hint: 'push numbers; an operator pops two values, and the first one popped is the right operand.',
                  solution: `Read left to right with a stack:<br><span class="mono small">${lines.join('<br>')}</span><br>One value is left on the stack: <b>${m(st[0])}</b>.`,
                };
              }
              const want = post.map((nd) => nd.op || nd.s).join(' ');
              const norm = (s) => String(s).replace(/[×xX]/g, '*').replace(/[−–]/g, '-').replace(/÷/g, '/').replace(/\s+/g, '');
              return {
                prompt: `Write the <b>postfix</b> form of <code>${infix(tree)}</code>. Separate the tokens with spaces; you may type * for × and - for −.`,
                answer: want,
                answerText: want,
                check: (inp) => norm(inp) === norm(want),
                placeholder: 'e.g. 3 4 + 2 *',
                solution: `Picture the expression tree, then read it in postorder (left subtree, right subtree, operator): <b class="mono">${post.map(exLabel).join(' ')}</b>. The last operator applied, ${SYM[tree.op]}, is the root, so it comes last.<div class="tr-mini" style="height:7rem">${binSVG(tree, { label: exLabel, dx: 38, dy: 42, r: 14, pad: 18, aria: 'Expression tree' })}</div>`,
              };
            },
          },
          {
            label: 'Greedy trees',
            make(R) {
              if (R.chance(0.55)) {
                const V = ['A', 'B', 'C', 'D', 'E'];
                const ord = R.shuffle(V);
                const E = [];
                for (let i = 1; i < 5; i++) E.push([ord[i], ord[R.int(0, i - 1)]].sort());
                const key = (a, b) => [a, b].sort().join('');
                const have = new Set(E.map(([a, b]) => key(a, b)));
                const extra = [];
                for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (!have.has(key(V[i], V[j]))) extra.push([V[i], V[j]]);
                E.push(...R.sample(extra, R.int(2, 3)));
                const ws = R.sample(Array.from({ length: 15 }, (_, i) => i + 1), E.length);
                const edges = E.map(([u, v], i) => ({ u, v, w: ws[i] }));
                const shown = edges.slice().sort((a, b) => (a.u + a.v).localeCompare(b.u + b.v));
                const parent = Object.fromEntries(V.map((v) => [v, v]));
                const find = (v) => { while (parent[v] !== v) v = parent[v]; return v; };
                const lines = [];
                let total = 0, taken = 0;
                for (const e of edges.slice().sort((a, b) => a.w - b.w)) {
                  if (taken === 4) break;
                  const a = find(e.u), b = find(e.v);
                  if (a !== b) { parent[a] = b; total += e.w; taken++; lines.push(`take ${e.u}–${e.v} (${e.w})`); }
                  else lines.push(`skip ${e.u}–${e.v} (${e.w}), it would close a cycle`);
                }
                return {
                  prompt: `A network has these weighted edges: ${shown.map((e) => `${e.u}–${e.v}: ${e.w}`).join(', ')}. What is the total weight of a minimal spanning tree?`,
                  answer: total,
                  hint: 'Kruskal: sort the edges and keep each one that does not close a cycle, until you have 4.',
                  solution: `Kruskal, lightest first: ${lines.join('; ')}. Five vertices need 4 edges, so stop. Total weight: <b>${total}</b>.`,
                };
              }
              const syms = ['a', 'b', 'c', 'd', 'e'].slice(0, R.int(4, 5));
              const cnt = new Map(syms.map((s) => [s, R.int(1, 20)]));
              const snaps = huffman(cnt);
              const merges = snaps.slice(1).map((s) => s.merged);
              const total = merges.reduce((s, m) => s + m.w, 0);
              const codes = huffCodes(snaps[snaps.length - 1].forest[0], false);
              return {
                prompt: `A text uses the symbols ${syms.map((s) => `${s} (${cnt.get(s)} time${cnt.get(s) === 1 ? '' : 's'})`).join(', ')}. How many bits long is its Huffman encoding?`,
                answer: total,
                hint: 'merge the two smallest counts again and again; add up the merged weights.',
                solution: `Merge the two lightest each time: ${merges.map((m) => `${m.left.w} + ${m.right.w} = ${m.w}`).join('; ')}. Each merge adds one bit to every symbol beneath it, so the length is the sum of the merged weights: ${merges.map((m) => m.w).join(' + ')} = <b>${total}</b> bits. Check with the codes ${syms.map((s) => `${s} = ${codes.get(s)}`).join(', ')}: ${syms.map((s) => `${cnt.get(s)}·${codes.get(s).length}`).join(' + ')} = ${total}.`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: trees',
        kind: 'quiz',
        questions: [
          { q: 'A connected graph has 12 vertices and 11 edges. What can you conclude?', choices: ['It is a tree', 'It must contain a cycle', 'It might still be disconnected', 'Nothing without a drawing'], answer: 0, explain: String.raw`A connected graph with \(n\) vertices and \(n - 1\) edges is a tree: that is one of the equivalent characterizations. It cannot be disconnected, because we were told it is connected, and it cannot have a cycle, because removing a cycle edge would leave a connected graph with only \(n - 2\) edges, which is impossible.` },
          { q: 'In a rooted tree, vertex <i>v</i> is at level 3. How many ancestors does <i>v</i> have?', choices: ['1', '2', '3', '4'], answer: 2, explain: 'The ancestors are the vertices on the path from <i>v</i> up to the root, not counting <i>v</i>. Level 3 means that path has 3 edges, so it passes through 3 other vertices: the parent, the grandparent and the root.' },
          { q: 'Which traversal of a binary search tree lists its keys in increasing order?', choices: ['Preorder', 'Inorder', 'Postorder', 'Level order'], answer: 1, explain: 'Inorder visits the left subtree (all smaller keys), then the vertex, then the right subtree (all larger keys). Applied at every vertex, that produces sorted order.' },
          { q: 'The keys 10, 20, 30, 40, 50, 60 are inserted in that order into an empty binary search tree. What is its height?', choices: ['2', '3', '5', '6'], answer: 2, explain: 'Each new key is larger than every key before it, so it always goes right. The tree is a path of 6 vertices, which has 5 edges: height 5. Inserting the same keys in the order 40, 20, 50, 10, 30, 60 would give height 2.' },
          { q: 'Kruskal\'s algorithm is considering the edge C–F. It skips the edge when…', choices: ['C–F is heavier than every edge chosen so far', 'C and F are already connected by edges chosen earlier', 'C or F already touches two chosen edges', 'F is not yet in the tree'], answer: 1, explain: 'If C and F are already connected, adding C–F would create a second path between them, which is a cycle. Being heavier is expected (edges arrive sorted), vertices may touch any number of tree edges, and Kruskal has no single growing tree (that is Prim).' },
          { q: 'Evaluate the postfix expression <code>5 1 2 + 4 × + 3 −</code>.', choices: ['14', '16', '9', '20'], answer: 0, explain: 'With a stack: 5, 1, 2 are pushed; + gives 1 + 2 = 3 (stack 5, 3); 4 is pushed; × gives 3 × 4 = 12 (stack 5, 12); + gives 5 + 12 = 17; 3 is pushed; − gives 17 − 3 = 14.' },
          { q: 'Which set of code words is prefix-free?', choices: ['{0, 01, 11}', '{1, 10, 100}', '{0, 10, 110, 111}', '{00, 0, 11}'], answer: 2, explain: 'In {0, 10, 110, 111} no word begins another, so any bit string splits into words in only one way. In the others, 0 begins 01, 1 begins 10, and 0 begins 00.' },
          { q: 'At each step, Huffman\'s algorithm…', choices: ['merges the two trees with the smallest total counts', 'gives the most frequent symbol the code 0', 'merges the two most frequent symbols', 'assigns codes in alphabetical order'], answer: 0, explain: 'Merging the two lightest trees pushes the rarest symbols deepest, where long codes cost the least in total. The most frequent symbol does end up with a short code, but that is a result of the rule, not the rule itself.' },
          { q: 'Any algorithm that sorts 5 distinct items using only comparisons needs, in its worst case, at least how many comparisons?', choices: ['5', '7', '10', '120'], answer: 1, explain: String.raw`Its decision tree needs at least \(5! = 120\) leaves. A binary tree of height \(h\) has at most \(2^h\) leaves, and \(2^6 = 64 \lt 120 \le 128 = 2^7\), so \(h \ge 7\).` },
          { q: 'A recursive BST program works in testing but crashes with <code>RecursionError</code> on 50,000 keys loaded from a sorted file. What is the most likely cause?', choices: ['Python cannot store more than 1000 objects', 'Sorted insertions built a path about 50,000 levels deep', 'Inorder traversal cannot be written recursively', 'Dictionaries cannot hold integer keys'], answer: 1, explain: 'Sorted input makes every key go right, so the tree is a path and the recursion is as deep as the tree. Python stops at about 1000 nested calls. Fix it by balancing (shuffle, a balanced tree, or a sorted list with bisect) or by traversing with an explicit stack.' },
        ],
      },
    ],
  });
})();
