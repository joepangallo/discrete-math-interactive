/* Module 10: Trees. Objective 10: describe the use of trees as a data structure in computer science.
   Labs: rooted-tree anatomy, tree isomorphism, Kruskal and Prim, a binary search tree playground,
   expression trees with a postfix stack, a Huffman code builder, and minimax on a game tree. */
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
     look(node) -> {cls, badge, sub} lets each lab color vertices for its own state. */
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
    return `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="${o.focusable ? 'group' : 'img'}" aria-label="${escT(o.aria || 'Binary tree')}">${edges}${nodes}</svg>`;
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
      throw new Error(`I don't recognize "${c}". Use numbers, + − * / ^ and parentheses.`);
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

  /* ---------------- unrooted trees as adjacency lists over 0..n-1, for the isomorphism slides ---------------- */
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  function adjOf(n, edges) { const adj = range(n).map(() => []); for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); } return adj; }
  // strip every leaf, again and again; the one or two vertices left standing are the center
  function centersOf(adj) {
    const deg = adj.map((a) => a.length);
    let layer = range(adj.length).filter((v) => deg[v] <= 1), left = adj.length;
    while (left > 2) {
      left -= layer.length;
      const next = [];
      for (const v of layer) for (const w of adj[v]) if (--deg[w] === 1) next.push(w);
      layer = next;
    }
    return layer;
  }
  const cmpName = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
  // AHU name of the subtree below v: a leaf is (), any other vertex wraps its children's sorted names
  const ahu = (adj, v, parent = -1) => '(' + adj[v].filter((w) => w !== parent).map((w) => ahu(adj, w, v)).sort(cmpName).join('') + ')';
  // the name of an unrooted tree is the smaller of its (at most two) center-rooted names
  function canonical(adj) {
    const named = centersOf(adj).map((c) => ({ c, name: ahu(adj, c) })).sort((x, y) => cmpName(x.name, y.name));
    return { name: named[0].name, root: named[0].c };
  }
  // a vertex correspondence between two trees with equal names: pair up children with equal names, top down
  function isoMap(adjA, adjB) {
    const A = canonical(adjA), B = canonical(adjB);
    if (A.name !== B.name) return null;
    const map = new Map();
    const kidsBy = (adj, v, p) => adj[v].filter((w) => w !== p).map((w) => ({ w, name: ahu(adj, w, v) })).sort((x, y) => cmpName(x.name, y.name));
    (function pair(a, pa, b, pb) {
      map.set(a, b);
      const ka = kidsBy(adjA, a, pa), kb = kidsBy(adjB, b, pb);
      ka.forEach((x, i) => pair(x.w, a, kb[i].w, b));
    })(A.root, -1, B.root, -1);
    return map;
  }
  const degSeq = (adj) => adj.map((a) => a.length).sort((x, y) => y - x);
  // each vertex's degree followed by its neighbors' degrees; a count that differs between two trees explains why they differ
  const degProfile = (adj) => adj.map((a) => `${a.length}:${a.map((w) => adj[w].length).sort((x, y) => y - x).join('')}`).sort();
  function hangFrom(adj, root) {
    const parent = { [root]: -1 }, depth = { [root]: 0 }, order = [root], kids = {};
    for (let i = 0; i < order.length; i++) {
      const u = order[i];
      kids[u] = [];
      for (const v of adj[u]) if (!(v in parent)) { parent[v] = u; depth[v] = depth[u] + 1; kids[u].push(v); order.push(v); }
    }
    return { parent, depth, order, kids, height: Math.max(...Object.values(depth)) };
  }
  // draws an unrooted tree hung from `root`; look(v) -> {cls, badge, sub, aria} decorates vertices
  function treeSVG(adj, root, o = {}) {
    const { depth, order, kids, height: ht } = hangFrom(adj, root);
    const x = {};
    let next = 0;
    (function place(v) {
      const ks = kids[v];
      if (!ks.length) { x[v] = next++; return; }
      ks.forEach(place);
      x[v] = (x[ks[0]] + x[ks[ks.length - 1]]) / 2;
    })(root);
    const dx = o.dx ?? 46, dy = o.dy ?? 50, r = o.r ?? 15, pad = o.pad ?? 26;
    const cw = Math.max(next - 1, 0) * dx + 2 * pad, ch = ht * dy + 2 * pad;
    const W = Math.max(o.minW ?? 0, cw), H = Math.max(o.minH ?? 0, ch);
    const ox = (W - cw) / 2 + pad, oy = (H - ch) / 2 + pad;
    const X = (v) => ox + x[v] * dx, Y = (v) => oy + depth[v] * dy;
    let g = '';
    for (const v of order) for (const w of kids[v]) g += `<line class="ed" x1="${X(v)}" y1="${Y(v)}" x2="${X(w)}" y2="${Y(w)}" stroke="var(--ink-3)"/>`;
    for (const v of order) {
      const lk = (o.look && o.look(v)) || {};
      const label = o.label ? o.label(v) : String(v);
      g += `<g class="nd ${lk.cls || ''}" data-v="${v}"${o.focusable ? ` tabindex="0" role="button" aria-label="${escT(lk.aria || `vertex ${label}`)}"` : ''}>`;
      g += `<circle cx="${X(v)}" cy="${Y(v)}" r="${r}" fill="var(--sheet)" stroke="var(--ink-3)"/><text x="${X(v)}" y="${Y(v)}" fill="var(--ink)">${escT(label)}</text>`;
      if (lk.sub != null) g += `<text class="sub" x="${X(v)}" y="${Y(v) + r + 11}" fill="var(--accent)">${escT(lk.sub)}</text>`;
      if (lk.badge != null) g += `<g class="badge"><circle cx="${X(v) + r * 0.9}" cy="${Y(v) - r * 0.9}" r="8.5" fill="var(--kw)"/><text x="${X(v) + r * 0.9}" y="${Y(v) - r * 0.9}" fill="var(--sheet)">${escT(lk.badge)}</text></g>`;
      g += '</g>';
    }
    return `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="${o.focusable ? 'group' : 'img'}" aria-label="${escT(o.aria || 'Tree')}"${o.style ? ` style="${o.style}"` : ''}>${g}</svg>`;
  }
  // small trees as edge lists over 0..n-1; the names say what the shape looks like
  const SHAPES = {
    path5: { n: 5, e: [[0, 1], [1, 2], [2, 3], [3, 4]], desc: 'a path of 5 vertices' },
    spider211: { n: 5, e: [[0, 1], [1, 2], [0, 3], [0, 4]], desc: 'a vertex of degree 3 with legs of length 2, 1, 1' },
    star5: { n: 5, e: [[0, 1], [0, 2], [0, 3], [0, 4]], desc: 'a star with 4 leaves' },
    spider221: { n: 6, e: [[0, 1], [1, 2], [0, 3], [3, 4], [0, 5]], desc: 'a vertex of degree 3 with legs of length 2, 2, 1' },
    spider311: { n: 6, e: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5]], desc: 'a vertex of degree 3 with legs of length 3, 1, 1' },
    dstar6: { n: 6, e: [[0, 1], [0, 2], [0, 3], [3, 4], [3, 5]], desc: 'two adjacent vertices of degree 3, each with two leaves' },
    spider411: { n: 7, e: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [0, 6]], desc: 'a vertex of degree 3 with legs of length 4, 1, 1' },
    spider321: { n: 7, e: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [0, 6]], desc: 'a vertex of degree 3 with legs of length 3, 2, 1' },
    spider222: { n: 7, e: [[0, 1], [1, 2], [0, 3], [3, 4], [0, 5], [5, 6]], desc: 'a vertex of degree 3 with legs of length 2, 2, 2' },
    hubs7a: { n: 7, e: [[0, 1], [0, 2], [0, 3], [3, 4], [3, 5], [5, 6]], desc: 'two adjacent vertices of degree 3, one of them also carrying a leg of length 2' },
    hubs7b: { n: 7, e: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5], [4, 6]], desc: 'two vertices of degree 3 joined through a middle vertex of degree 2' },
  };
  // pairs with the same degree sequence that are still different trees, and pairs whose degree sequences already differ
  const LOOKALIKES = [['spider221', 'spider311'], ['spider411', 'spider321'], ['spider321', 'spider222'], ['spider411', 'spider222'], ['hubs7a', 'hubs7b']];
  const UNALIKE = [['path5', 'spider211'], ['path5', 'star5'], ['spider211', 'star5'], ['dstar6', 'spider221'], ['dstar6', 'spider311'], ['hubs7a', 'spider321'], ['hubs7b', 'spider222'], ['hubs7a', 'spider411']];
  // a relabeled, reshuffled copy of a shape, so the same tree never looks the same twice
  function scramble(R, key) {
    const { n, e } = SHAPES[key];
    const perm = R.shuffle(range(n));
    const edges = R.shuffle(e.map(([u, v]) => (R.chance(0.5) ? [perm[u], perm[v]] : [perm[v], perm[u]])));
    return { key, n, edges, adj: adjOf(n, edges) };
  }
  // kind: 'iso' (one tree twice), 'look' (same degree sequence, different trees), 'diff' (different degree sequences)
  function treePair(R, kind) {
    const [ka, kb] = kind === 'iso' ? [R.pick(Object.keys(SHAPES))].flatMap((k) => [k, k]) : R.shuffle(R.pick(kind === 'look' ? LOOKALIKES : UNALIKE));
    return { kind, A: scramble(R, ka), B: scramble(R, kb) };
  }
  const LETTERS = 'abcdefg', DIGITS = '1234567';
  const edgeText = (t, names) => t.edges.map(([u, v]) => `${names[u]}–${names[v]}`).join(', ');
  // the single fact that tells two non-isomorphic trees apart, in words
  function whyDifferent(A, B) {
    const da = degSeq(A.adj), db = degSeq(B.adj);
    if (da.join() !== db.join()) return `Their degree sequences differ: ${da.join(', ')} for tree A against ${db.join(', ')} for tree B.`;
    const pa = degProfile(A.adj), pb = degProfile(B.adj);
    const count = (arr, p) => arr.filter((x) => x === p).length;
    const p = pa.find((q) => count(pa, q) !== count(pb, q));
    const names = `The canonical names settle it: ${canonical(A.adj).name} against ${canonical(B.adj).name}.`;
    if (!p) return `Even the neighbor degrees agree, so only the full structure tells them apart. ${names}`;
    const [d, nb] = p.split(':');
    const ca = count(pa, p);
    return `Same degree sequence, but tree A has ${ca} ${ca === 1 ? 'vertex' : 'vertices'} of degree ${d} whose neighbors have degrees ${[...nb].join(', ')}, and tree B has ${count(pb, p)}. ${names}`;
  }

  /* ---------------- game trees: nested arrays with numbers at the leaves, MAX to move at the root ---------------- */
  const minimax = (node, max) => (typeof node === 'number' ? node : (max ? Math.max : Math.min)(...node.map((c) => minimax(c, !max))));
  // alpha-beta in left-to-right order: how many leaves it must look at before the root value is certain
  function alphaBetaLeaves(node, max, alpha = -Infinity, beta = Infinity) {
    if (typeof node === 'number') return { value: node, leaves: 1 };
    let best = max ? -Infinity : Infinity, leaves = 0;
    for (const c of node) {
      const r = alphaBetaLeaves(c, !max, alpha, beta);
      leaves += r.leaves;
      if (max) { best = Math.max(best, r.value); alpha = Math.max(alpha, best); } else { best = Math.min(best, r.value); beta = Math.min(beta, best); }
      if (beta <= alpha) break;
    }
    return { value: best, leaves };
  }
  // shape [3, 3, 3] = three MIN nodes with three leaves each; [[2, 2], [2, 2]] adds a MAX level in between
  const randGame = (R, shape) => shape.map((k) => (Array.isArray(k) ? randGame(R, k) : range(k).map(() => R.int(0, 9))));
  // flattens a game tree into drawable nodes: id (R, A, B, A1, ...), depth, whose turn, value, position
  function gameNodes(tree, o = {}) {
    const dy = o.dy ?? 62, lw = o.leafW ?? 30, gap = o.gap ?? 8, top = o.top ?? 16;
    const pad = o.pad ?? (o.levels === false ? 14 : 42);
    const nodes = [];
    let leafX = 0, maxD = 0;
    (function walk(node, depth, max, id) {
      const me = { node, depth, max, id, kids: [], leaf: typeof node === 'number', value: minimax(node, max) };
      maxD = Math.max(maxD, depth);
      if (me.leaf) { me.x = pad + leafX * (lw + gap) + lw / 2; leafX++; }
      else {
        node.forEach((c, i) => me.kids.push(walk(c, depth + 1, !max, depth === 0 ? 'ABCD'[i] : id + (i + 1))));
        me.x = (me.kids[0].x + me.kids[me.kids.length - 1].x) / 2;
      }
      me.y = top + depth * dy;
      nodes.push(me);
      return me;
    })(tree, 0, true, 'R');
    return { nodes, W: 2 * pad + leafX * (lw + gap) - gap, H: top + maxD * dy + 22, maxD, root: nodes[nodes.length - 1], pad, top, dy };
  }
  // text(n) -> what to write in an internal node; cls(n) -> state class; best: highlight the root's chosen move
  function gameSVG(tree, o = {}) {
    const { nodes, W, H, maxD, root, top, dy } = gameNodes(tree, o);
    const best = o.best ? root.kids.find((k) => k.value === root.value) : null;
    let g = '';
    if (o.levels !== false) for (let d = 0; d < maxD; d++) g += `<text class="gm-lvl" x="4" y="${top + d * dy}" fill="var(--ink-3)">${d % 2 === 0 ? 'MAX' : 'MIN'}</text>`;
    for (const n of nodes) for (const k of n.kids) g += `<line class="ed${best && n === root && k === best ? ' on' : ''}" x1="${n.x}" y1="${n.y}" x2="${k.x}" y2="${k.y}" stroke="var(--ink-3)"/>`;
    for (const n of nodes) {
      if (n.leaf) { g += `<g class="gm leaf"><rect x="${n.x - 13}" y="${n.y - 11}" width="26" height="22" rx="4" fill="var(--sheet)" stroke="var(--ink-3)"/><text x="${n.x}" y="${n.y}" fill="var(--ink)">${n.node}</text></g>`; continue; }
      const text = o.text ? o.text(n) : String(n.value);
      g += `<g class="gm ${n.max ? 'mx' : 'mn'} ${(o.cls && o.cls(n)) || ''}">`;
      g += n.max ? `<rect x="${n.x - 15}" y="${n.y - 15}" width="30" height="30" rx="6" fill="var(--sheet)" stroke="var(--fnc)"/>` : `<circle cx="${n.x}" cy="${n.y}" r="15" fill="var(--sheet)" stroke="var(--fnc)"/>`;
      g += `<text x="${n.x}" y="${n.y}" fill="var(--ink)">${escT(text)}</text>`;
      if (o.ids) g += `<text class="gm-id" x="${n.x - 24}" y="${n.y - 18}" fill="var(--ink-3)">${n.id}</text>`;
      g += '</g>';
    }
    return `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escT(o.aria || 'Game tree')}"${o.style ? ` style="${o.style}"` : ''}>${g}</svg>`;
  }
  // the concept slide's pair: same degree sequence, same height from the center, different trees
  const ISO_FIG = (() => {
    const a = adjOf(6, SHAPES.spider221.e), b = adjOf(6, SHAPES.spider311.e);
    const opt = { dx: 40, dy: 40, r: 13, pad: 18, minW: 230, minH: 118, label: (v) => LETTERS[v] };
    return { a: treeSVG(a, canonical(a).root, { ...opt, aria: 'Tree with legs of length 2, 2 and 1' }), b: treeSVG(b, canonical(b).root, { ...opt, aria: 'Tree with legs of length 3, 1 and 1' }), na: canonical(a).name, nb: canonical(b).name };
  })();

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

  /* ---------------- worked example data: BST insertion and Huffman, computed by generators ---------------- */
  /* Each preset carries its own data object. For the BST, the parent, comparison path,
     inorder list and height are computed by actually inserting the preset's keys; for
     Huffman, the preset's tree (leaves plus the merge nodes the Huffman rule creates,
     in creation order) drives the computed forest, notes, codewords and weighted path
     length. The stepsFor functions narrate that computed data for either preset. */
  function bstDataFor(keys, pos, viewBox, checkpoint) {
    let root = null;
    const parent = {}, path = {};
    for (const k of keys) {
      if (!root) { root = bstInsert(null, k).root; parent[k] = null; path[k] = [k]; continue; }
      const p = [root.key];
      let cur = root;
      for (;;) { const nxt = k < cur.key ? cur.left : cur.right; if (!nxt) break; cur = nxt; p.push(cur.key); }
      parent[k] = cur.key; path[k] = [...p, k];
      root = bstInsert(root, k).root;
    }
    return { keys, pos, parent, path, viewBox, checkpoint, inorder: orderOf(root, 'in').map((n) => n.key), height: height(root), rootKey: root.key };
  }
  function bstStepsFor(D) {
    const steps = [{ inserted: 0, note: `The empty tree · insert order: ${D.keys.join(', ')}`, caption: 'Start with an empty tree and the binary search tree rule: at every node, smaller keys go to the left subtree and larger keys go to the right subtree. That single rule decides every placement, because each insertion just follows the comparisons down from the root.' }];
    D.keys.forEach((k, i) => {
      const par = D.parent[k];
      const cmps = D.path[k].slice(0, -1).map((n) => `${k} ${k < n ? '<' : '>'} ${n}, go ${k < n ? 'left' : 'right'}`).join('; ');
      const landing = par == null ? 'there is nothing to compare it against, so it simply becomes the root' : `the ${k < par ? 'left' : 'right'} child of ${par} is empty, so ${k} lands there`;
      steps.push({ inserted: i + 1, note: `Inserted ${k} — ${par == null ? 'it becomes the root' : `${k < par ? 'left' : 'right'} child of ${par}`}`, caption: `Insert ${k}: ${cmps ? cmps + '; ' : ''}${landing}. Every later key is measured against the keys already placed, which is why the insertion order shapes the whole tree.` });
    });
    const chain = D.height === D.keys.length - 1 && D.keys.length > 1;
    steps.push({ inserted: D.keys.length, note: `The finished tree — all ${D.keys.length} keys placed`, answer: true, caption: `Answer: an inorder traversal of any binary search tree visits keys in sorted order, and this one comes out perfectly sorted — ${D.inorder.join(', ')} — which cross-checks every placement. The finished tree has ${D.rootKey} at the root and height ${D.height}${chain ? ': every key was larger than all the keys before it, so every insertion went right and the tree degenerated into a chain, the worst case for searching' : ''}.` });
    const cp = steps.find((st) => st.inserted === D.checkpoint.at);
    if (cp) cp.checkpoint = D.checkpoint.text;
    return steps;
  }
  const EX_BST_DATA = bstDataFor(
    [50, 30, 70, 20, 40, 60, 80],
    { 50: [320, 42], 30: [160, 112], 70: [480, 112], 20: [80, 182], 40: [240, 182], 60: [400, 182], 80: [560, 182] },
    '0 0 640 232',
    { at: 3, text: 'Predict: 20 is inserted next and it is smaller than 50 and smaller than 30 — where exactly will 20 land?' });
  const EX_BST_INORDER = EX_BST_DATA.inorder;
  const VAR_BST_KEYS = [10, 20, 30, 40, 50, 60];
  const VAR_BST_DATA = bstDataFor(
    VAR_BST_KEYS,
    Object.fromEntries(VAR_BST_KEYS.map((k, i) => [k, [70 + i * 100, 38 + i * 56]])),
    '0 0 640 368',
    { at: 2, text: 'Predict: 30 is larger than both keys already placed — will it tuck in somewhere on the left, or keep extending the tree to the right?' });
  const VAR_BST_ANSWER = VAR_BST_DATA.inorder;

  /* ---------------- worked example data: Huffman coding ---------------- */
  const EX_HUFF_FREQ = [['A', 45], ['B', 13], ['C', 12], ['D', 16], ['E', 9], ['F', 5]];
  // Final layout: leaves share the bottom row, internal nodes sit above the pair they merged.
  // Left edge = 0, right edge = 1, so the codewords below are read off these positions.
  const EX_HUFF_NODES = [
    { id: 'C', label: 'C', sub: '12', w: 12, x: 80, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'B', label: 'B', sub: '13', w: 13, x: 160, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'F', label: 'F', sub: '5', w: 5, x: 260, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'E', label: 'E', sub: '9', w: 9, x: 340, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'D', label: 'D', sub: '16', w: 16, x: 440, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'A', label: 'A', sub: '45', w: 45, x: 570, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'n25', label: '25', w: 25, x: 120, y: 168, r: 17, created: 2, left: 'C', right: 'B' },
    { id: 'n14', label: '14', w: 14, x: 300, y: 168, r: 17, created: 1, left: 'F', right: 'E' },
    { id: 'n30', label: '30', w: 30, x: 370, y: 120, r: 17, created: 3, left: 'n14', right: 'D' },
    { id: 'n55', label: '55', w: 55, x: 245, y: 76, r: 17, created: 4, left: 'n25', right: 'n30' },
    { id: 'n100', label: '100', w: 100, x: 408, y: 32, r: 18, created: 5, left: 'n55', right: 'A' },
  ];
  const EX_HUFF_CODES = { A: '1', B: '001', C: '000', D: '011', E: '0101', F: '0100' };
  const EX_HUFF_ANSWER = { lengths: { A: 1, B: 3, C: 3, D: 3, E: 4, F: 4 }, wpl: 224 };
  const VAR_HUFF_FREQ = [['A', 10], ['B', 10], ['C', 10], ['D', 10]];
  const VAR_HUFF_NODES = [
    { id: 'A', label: 'A', sub: '10', w: 10, x: 120, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'B', label: 'B', sub: '10', w: 10, x: 260, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'C', label: 'C', sub: '10', w: 10, x: 380, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'D', label: 'D', sub: '10', w: 10, x: 520, y: 225, r: 20, leaf: true, created: 0 },
    { id: 'n20a', label: '20', w: 20, x: 190, y: 168, r: 17, created: 1, left: 'A', right: 'B' },
    { id: 'n20b', label: '20', w: 20, x: 450, y: 168, r: 17, created: 2, left: 'C', right: 'D' },
    { id: 'n40', label: '40', w: 40, x: 320, y: 110, r: 18, created: 3, left: 'n20a', right: 'n20b' },
  ];
  const VAR_HUFF_ANSWER = { lengths: { A: 2, B: 2, C: 2, D: 2 }, wpl: 80 };

  function huffInfo(D) {
    const byId = {};
    for (const n of D.nodes) byId[n.id] = n;
    const merges = D.nodes.filter((n) => !n.leaf).sort((a, b) => a.created - b.created);
    const codes = {};
    (function walk(n, p) {
      if (n.leaf) { codes[n.id] = p; return; }
      walk(byId[n.left], p + '0');
      walk(byId[n.right], p + '1');
    })(merges[merges.length - 1], '');
    const total = D.freqList.reduce((sum, [, f]) => sum + f, 0);
    const wpl = D.freqList.reduce((sum, [sym, f]) => sum + f * codes[sym].length, 0);
    const sorted = [...D.freqList].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
    return { byId, merges, codes, total, wpl, sorted };
  }
  function huffStepsFor(D) {
    const info = huffInfo(D);
    const desc = (n) => (n.leaf ? `${n.id} (${n.w})` : `the ${n.w} tree`);
    let forest = info.sorted.map(([, f]) => f);
    const steps = [{ merges: 0, forest: [...forest], note: `${info.sorted.length} leaves, sorted by frequency: ${info.sorted.map(([s, f]) => `${s} ${f}`).join(', ')}`, caption: `Setup: write the symbols as leaves sorted by frequency, lightest first: ${info.sorted.map(([s, f]) => `${s} ${f}`).join(', ')}. The Huffman rule is to repeatedly merge the two lightest trees, because the rarest symbols should travel the deepest and merging them first keeps them deep.` }];
    info.merges.forEach((m, i) => {
      const L = info.byId[m.left], R = info.byId[m.right];
      forest = [...forest];
      forest.splice(forest.indexOf(L.w), 1);
      forest.splice(forest.indexOf(R.w), 1);
      forest.push(m.w);
      forest.sort((a, b) => a - b);
      const last = i === info.merges.length - 1;
      steps.push({
        merges: i + 1, forest: [...forest],
        note: `Merge ${i + 1}: ${desc(L)} + ${desc(R)} = ${m.w} · forest weights now ${forest.join(', ')}`,
        caption: last
          ? `Merge ${desc(L)} and ${desc(R)}, the last two trees, into the root of weight ${m.w}, and label every left edge 0 and every right edge 1. The tree is complete: every symbol sits at a leaf, and symbols merged earliest sit deepest, which is what makes the frequent symbols cheap and the rare ones expensive.`
          : `Merge ${desc(L)} and ${desc(R)}, the two lightest trees, into a new tree of weight ${m.w}, drawn with ${desc(L)} on the left and ${desc(R)} on the right. Every symbol under this new tree gains one level of depth, and the forest shrinks to ${forest.length} trees.`,
      });
    });
    const codeList = D.freqList.map(([sym]) => `${sym} = ${info.codes[sym]}`).join(', ');
    const terms = D.freqList.map(([sym, f]) => `${f}·${info.codes[sym].length}`).join(' + ');
    const mergeSum = info.merges.map((m) => m.w).join(' + ');
    const expected = String(+((info.wpl / info.total).toFixed(4)));
    steps.push({ merges: info.merges.length, forest: [info.total], note: 'The finished Huffman tree: codewords read off the root-to-leaf paths', answer: true, caption: `Answer: reading each root-to-leaf path gives ${codeList}, with expected length (${terms}) / ${info.total} = ${info.wpl} / ${info.total} = ${expected} bits per symbol. Check: the code is prefix-free because every symbol is a leaf, and the weighted path length ${info.wpl} equals the sum of the merge weights ${mergeSum} = ${info.wpl}.` });
    const cp = steps.find((st) => st.merges === D.checkpoint.at);
    if (cp) cp.checkpoint = D.checkpoint.text;
    return steps;
  }
  const EX_HUFF_DATA = { freqList: EX_HUFF_FREQ, nodes: EX_HUFF_NODES, checkpoint: { at: 2, text: 'Predict: the two lightest trees are now the 14 tree and D at 16 — what weight will their merge create, and which symbols sink a level deeper?' } };
  const VAR_HUFF_DATA = { freqList: VAR_HUFF_FREQ, nodes: VAR_HUFF_NODES, checkpoint: { at: 1, text: 'Predict: C and D merge next, just as A and B did — will any of the four equal symbols end up with a shorter code than the others?' } };

  /* ---------------- lab data ---------------- */
  const ANAT = [['a', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'e'], ['b', 'f'], ['c', 'g'], ['d', 'h'], ['d', 'i'], ['d', 'j'], ['f', 'k'], ['f', 'l'], ['h', 'm']];
  const MST_V = { A: [70, 84], B: [262, 46], C: [452, 82], D: [150, 226], E: [342, 208], F: [520, 248], G: [78, 362], H: [312, 362] };
  const MST_E = [['E', 'F', 1], ['D', 'E', 2], ['A', 'D', 3], ['A', 'B', 4], ['B', 'E', 5], ['B', 'D', 6], ['C', 'E', 7], ['B', 'C', 8], ['C', 'F', 9], ['D', 'G', 10], ['E', 'H', 11], ['G', 'H', 12], ['F', 'H', 13]];

  /* ---------------- worked example data: BST search, traversal orders, Kruskal MST ---------------- */
  /* Search paths are computed by a recursive walk of the tree the BST example built; the
     verifies redo the search with an iterative loop. Traversal orders come from orderOf;
     the verifies recompute them with their own recursive walks. The MST steps run Kruskal
     (union-find) over the lab graph and a six-station variant; the verifies use Prim. */
  function bstSearchDataFor(keys, target, checkpoint) {
    const root = bstFrom(keys);
    const path = [];
    (function walk(n) { if (!n) return; path.push(n.key); if (target !== n.key) walk(target < n.key ? n.left : n.right); })(root);
    const found = path[path.length - 1] === target;
    const last = path[path.length - 1];
    return { keys, target, path, found, checkpoint, pos: EX_BST_DATA.pos, viewBox: '0 0 640 300', inorder: orderOf(root, 'in').map((n) => n.key), ghost: found ? null : [EX_BST_DATA.pos[last][0] + (target < last ? -40 : 40), 252] };
  }
  function bstSearchStepsFor(D) {
    const steps = [{ vis: 0, note: `Search for ${D.target} in the BST built from ${D.keys.join(', ')}`, caption: `Search uses the placement rule in reverse. At each node, one comparison either finds the target, sends the search into the left subtree, or sends it into the right subtree, so the search only ever visits the nodes on a single root-to-leaf path.` }];
    D.path.forEach((k, i) => {
      const outcome = D.target === k ? `${D.target} = ${k}: equal, so the search stops here — the key is found` : `${D.target} ${D.target < k ? '<' : '>'} ${k}, so the target, if it is present at all, must lie in the ${D.target < k ? 'left' : 'right'} subtree: go ${D.target < k ? 'left' : 'right'}`;
      const tail = i === D.path.length - 1 && !D.found ? ` The ${D.target < k ? 'left' : 'right'} child of ${k} is empty, and there is nowhere left to go, which settles the search.` : ` Each comparison also discards the part of the tree on the wrong side of ${k}, which is why the path stays short on a balanced tree.`;
      steps.push({ vis: i + 1, note: `Comparison ${i + 1}: at node ${k}`, caption: `Comparison ${i + 1}, at node ${k}: ${outcome}.${tail}` });
    });
    const last = D.path[D.path.length - 1], side = D.target < last ? 'left' : 'right';
    steps.push({ vis: D.path.length, note: D.found ? `Found: ${D.target} after ${D.path.length} comparisons` : `Not found: ${D.target} is absent after ${D.path.length} comparisons`, answer: true, caption: D.found
      ? `Answer: ${D.target} is in the tree, reached along the path ${D.path.join(' → ')} in ${D.path.length} comparisons. Cross-check: the inorder list ${D.inorder.join(', ')} does contain ${D.target}, and every step obeyed the rule that smaller keys live in left subtrees and larger keys in right subtrees.`
      : `Answer: ${D.target} is not in the tree. The search fell off the ${side} of ${last} after ${D.path.length} comparisons — the dashed node marks that empty link, and it is exactly where an insertion would attach ${D.target}, as the ${side} child of ${last}. Cross-check: the inorder list ${D.inorder.join(', ')} has no ${D.target}.` });
    if (steps[D.checkpoint.at]) steps[D.checkpoint.at].checkpoint = D.checkpoint.text;
    return steps;
  }
  function bstSearchVerify(D, ans) {
    let root = null;
    const ins = (n, k) => { if (!n) return { key: k, left: null, right: null }; if (k < n.key) n.left = ins(n.left, k); else n.right = ins(n.right, k); return n; };
    for (const k of D.keys) root = ins(root, k);
    const path = [];
    let cur = root;
    while (cur) { path.push(cur.key); if (cur.key === D.target) break; cur = D.target < cur.key ? cur.left : cur.right; }
    const inorder = [];
    (function w(n) { if (!n) return; w(n.left); inorder.push(n.key); w(n.right); })(root);
    const found = path[path.length - 1] === D.target;
    return found === ans.found && ans.comparisons === path.length && path.join(',') === ans.path.join(',')
      && (found ? inorder.includes(D.target) : !inorder.includes(D.target) && ans.insertAs === `${D.target < path[path.length - 1] ? 'left' : 'right'} child of ${path[path.length - 1]}`);
  }
  const EX_SEARCH_DATA = bstSearchDataFor([50, 30, 70, 20, 40, 60, 80], 40, { at: 2, text: 'Predict: the search is at 30 and 40 is larger than 30 — will the next comparison find 40, or will the search fall off the tree?' });
  const EX_SEARCH_ANSWER = { target: 40, found: true, path: EX_SEARCH_DATA.path, comparisons: EX_SEARCH_DATA.path.length };
  const VAR_SEARCH_DATA = bstSearchDataFor([50, 30, 70, 20, 40, 60, 80], 65, { at: 2, text: 'Predict: the search is at 70 and 65 is smaller, so it drops to 60 — will 65 be sitting there, or will the search fall off the tree?' });
  const VAR_SEARCH_ANSWER = { target: 65, found: false, path: VAR_SEARCH_DATA.path, comparisons: VAR_SEARCH_DATA.path.length, insertAs: 'right child of 60' };

  const tnd = (key, left = null, right = null) => ({ key, left, right });
  function travDataFor(root, desc, checkpoint) {
    const orders = { pre: orderOf(root, 'pre').map((n) => n.key), in: orderOf(root, 'in').map((n) => n.key), post: orderOf(root, 'post').map((n) => n.key) };
    return { root, desc, checkpoint, orders, size: orders.pre.length, rootKey: root.key };
  }
  function travStepsFor(D) {
    const kinds = [['pre', 'Preorder', 'root, then left subtree, then right subtree', 'the root is written before either subtree, so it leads its listing'], ['in', 'Inorder', 'left subtree, then root, then right subtree', 'the walk dives into the left subtree first, so the deepest left node is written before the root'], ['post', 'Postorder', 'left subtree, then right subtree, then root', 'both subtrees are finished before their root, so the leaves come first and the root comes last']];
    const steps = [{ phase: '', shown: 0, note: 'One stated tree, drawn once, for all three orders', caption: `The tree stays fixed for all three orders: ${D.desc}. A traversal is a rule for when a node gets written down relative to its subtrees — before them, between them, or after them — and each rule produces its own listing of the same ${D.size} nodes.` }];
    for (const [kind, name, rule, why] of kinds) {
      const seq = D.orders[kind], half = Math.ceil(seq.length / 2);
      const rootNote = kind === 'pre' ? `The root ${D.rootKey} leads the list, because preorder writes each node before its subtrees.` : kind === 'in' ? `The root ${D.rootKey} sits at position ${seq.indexOf(D.rootKey) + 1} of ${seq.length}, exactly between its left and right subtrees.` : `The root ${D.rootKey} closes the list, because postorder writes each node only after both of its subtrees.`;
      steps.push({ phase: kind, shown: half, note: `${name} (${rule}): the first ${half} visits`, caption: `${name} — ${rule}. Here ${why}. The listing so far is ${seq.slice(0, half).join(', ')}: ${half} of the ${seq.length} nodes, accumulated in the ribbon under the tree in visit order.` });
      steps.push({ phase: kind, shown: seq.length, note: `${name} complete: ${seq.join(', ')}`, caption: `${name} completes as ${seq.slice(half).join(', ')} follows, giving the full listing ${seq.join(', ')}. ${rootNote} Every node appears exactly once; only the visiting rule separates this order from the other two.` });
    }
    steps.push({ phase: 'post', shown: D.size, note: 'All three orders, side by side', answer: true, caption: `Answer: preorder ${D.orders.pre.join(', ')}; inorder ${D.orders.in.join(', ')}; postorder ${D.orders.post.join(', ')}. Same tree and the same ${D.size} nodes in each list — a traversal changes only the order of the visits, never the set of nodes visited, and each list can be rechecked by running its rule subtree by subtree.` });
    const cp = steps.find((st) => st.phase === D.checkpoint.phase && st.shown === D.size);
    if (cp) cp.checkpoint = D.checkpoint.text;
    return steps;
  }
  function travVerify(D, ans) {
    const rec = (n, kind, out) => { if (!n) return out; if (kind === 'pre') out.push(n.key); rec(n.left, kind, out); if (kind === 'in') out.push(n.key); rec(n.right, kind, out); if (kind === 'post') out.push(n.key); return out; };
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const keyOf = { pre: 'preorder', in: 'inorder', post: 'postorder' };
    return ['pre', 'in', 'post'].every((kind) => same(rec(D.root, kind, []), ans[keyOf[kind]]))
      && same([...ans.preorder].sort(), [...ans.inorder].sort()) && same([...ans.preorder].sort(), [...ans.postorder].sort());
  }
  const EX_TRAV_DATA = travDataFor(tnd('A', tnd('B', tnd('D'), tnd('E', tnd('G'))), tnd('C', null, tnd('F', tnd('H')))), 'root A, with B and C below it, D and E below B, G below E, F below C, and H below F', { phase: 'pre', text: 'Predict: inorder writes each root between its two subtrees — will the first inorder entry be the root A, or the deepest left leaf D?' });
  const EX_TRAV_ANSWER = { preorder: EX_TRAV_DATA.orders.pre, inorder: EX_TRAV_DATA.orders.in, postorder: EX_TRAV_DATA.orders.post };
  const VAR_TRAV_DATA = travDataFor(tnd('A', null, tnd('B', null, tnd('C', null, tnd('D', null, tnd('E', null, tnd('F', null, tnd('G', null, tnd('H')))))))), 'the same eight labels A to H, but every node has only a right child, so the tree is one long chain', { phase: 'pre', text: 'Predict: every node in this chain has only a right child — will inorder come out identical to preorder, or reversed end to end?' });
  const VAR_TRAV_ANSWER = { preorder: VAR_TRAV_DATA.orders.pre, inorder: VAR_TRAV_DATA.orders.in, postorder: VAR_TRAV_DATA.orders.post };

  function kruskalStepsFor(D) {
    const names = Object.keys(D.V);
    const sorted = D.E.map(([u, v, w], i) => ({ u, v, w, i })).sort((a, b) => a.w - b.w);
    const parent = {};
    const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
    names.forEach((v) => { parent[v] = v; });
    const comps = () => { const g = {}; for (const v of names) (g[find(v)] ||= []).push(v); return Object.values(g).sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1)); };
    const steps = [{ seen: 0, cur: -1, acc: [], rej: [], total: 0, comps: comps(), note: `Kruskal: ${names.length} stations, ${D.E.length} candidate links, sorted by cost`, caption: `Kruskal's algorithm sorts every candidate link by cost and considers them lightest first. A link is accepted only when its two ends are still in different pieces, because a link inside one piece would close a cycle; the pieces below the graph track exactly that test.` }];
    const acc = [], rej = [];
    let total = 0;
    for (const e of sorted) {
      if (acc.length === names.length - 1) break;
      const before = comps();
      const ok = find(e.u) !== find(e.v);
      let caption;
      if (ok) {
        const cu = before.find((g) => g.includes(e.u)), cv = before.find((g) => g.includes(e.v));
        parent[find(e.u)] = find(e.v);
        acc.push(e.i); total += e.w;
        caption = `Consider ${e.u}–${e.v}, cost ${e.w}, the lightest link not yet considered. Its ends sit in different pieces, {${cu.join(', ')}} and {${cv.join(', ')}}, so no path between them exists yet: accept it, merge the two pieces, and the running total becomes ${total}.`;
      } else {
        rej.push(e.i);
        const adj = {};
        for (const i2 of acc) { const [a, b] = D.E[i2]; (adj[a] ||= []).push(b); (adj[b] ||= []).push(a); }
        const prev = { [e.u]: null }, q = [e.u];
        for (let qi = 0; qi < q.length; qi++) for (const w of adj[q[qi]] || []) if (!(w in prev)) { prev[w] = q[qi]; q.push(w); }
        const pth = [];
        for (let v = e.v; v != null; v = prev[v]) pth.unshift(v);
        caption = `Consider ${e.u}–${e.v}, cost ${e.w}. Its ends are already connected by the accepted path ${pth.join('–')}, so adding it would close a cycle and waste cable: reject it, even though it is cheap, and the total stays ${total}.`;
      }
      steps.push({ seen: steps.length, cur: e.i, acc: [...acc], rej: [...rej], total, comps: comps(), note: `Link ${e.u}–${e.v} (${e.w}): ${ok ? 'accepted' : 'rejected — would close a cycle'} · total ${total}`, caption });
    }
    const accNames = acc.map((i) => `${D.E[i][0]}–${D.E[i][1]}`);
    steps.push({ seen: steps.length - 1, cur: -1, acc: [...acc], rej: [...rej], total, comps: comps(), note: `The minimum spanning tree: ${acc.length} links, total cost ${total}`, answer: true, caption: `Answer: the accepted links ${accNames.join(', ')} form a minimum spanning tree of total cost ${total}. It has ${acc.length} = ${names.length} − 1 links, reaches every station, and contains no cycle; an independent Prim computation, growing the tree from one station, reaches the same total ${total}.` });
    const cp = steps.find((st) => st.seen === D.checkpoint.seen);
    if (cp) cp.checkpoint = D.checkpoint.text;
    return steps;
  }
  function mstVerify(D, ans) {
    const names = Object.keys(D.V);
    const inT = new Set([names[0]]);
    let total = 0;
    while (inT.size < names.length) {
      let best = null;
      for (const [u, v, w] of D.E) if (inT.has(u) !== inT.has(v) && (!best || w < best[2])) best = [u, v, w];
      if (!best) return false;
      total += best[2];
      inT.add(inT.has(best[0]) ? best[1] : best[0]);
    }
    const byName = {};
    for (const [u, v] of D.E) byName[`${u}–${v}`] = [u, v];
    const parent = {};
    const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
    names.forEach((v) => { parent[v] = v; });
    if (ans.edges.length !== names.length - 1 || ans.total !== total) return false;
    for (const nm of ans.edges) {
      const pr = byName[nm];
      if (!pr || find(pr[0]) === find(pr[1])) return false;
      parent[find(pr[0])] = find(pr[1]);
    }
    return names.every((v) => find(v) === find(names[0]));
  }
  const EX_MST_DATA = { V: MST_V, E: MST_E, viewBox: '20 14 560 386', checkpoint: { seen: 4, text: 'Predict: the next link is B–E at cost 5, one of the cheapest left — will Kruskal accept it, or does a path B–A–D–E already join its ends?' } };
  const EX_MST_STEPS = kruskalStepsFor(EX_MST_DATA);
  const EX_MST_LAST = EX_MST_STEPS[EX_MST_STEPS.length - 1];
  const EX_MST_ANSWER = { edges: EX_MST_LAST.acc.map((i) => `${MST_E[i][0]}–${MST_E[i][1]}`), total: EX_MST_LAST.total };
  const VAR_MST_DATA = { V: { A: [80, 64], B: [240, 44], C: [400, 72], D: [170, 214], E: [350, 238], F: [520, 190] }, E: [['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 3], ['C', 'D', 4], ['D', 'E', 5], ['B', 'D', 6], ['E', 'F', 7], ['A', 'F', 8], ['D', 'F', 9], ['C', 'E', 10]], viewBox: '0 0 600 300', checkpoint: { seen: 2, text: 'Predict: the next link is A–C at cost 3, the third cheapest of all — will Kruskal accept it, or do A and C already have a path between them?' } };
  const VAR_MST_STEPS = kruskalStepsFor(VAR_MST_DATA);
  const VAR_MST_LAST = VAR_MST_STEPS[VAR_MST_STEPS.length - 1];
  const VAR_MST_ANSWER = { edges: VAR_MST_LAST.acc.map((i) => `${VAR_MST_DATA.E[i][0]}–${VAR_MST_DATA.E[i][1]}`), total: VAR_MST_LAST.total };

  DM.module({
    id: 'trees',
    num: 10,
    title: 'Trees',
    objectives: [10],
    terms: {
      'tree': 'A connected graph with no cycles. Between any two of its vertices there is exactly one simple path, and a tree with n vertices has n − 1 edges.',
      'forest': 'A graph with no cycles. Each connected piece of a forest is a tree.',
      'rooted tree': 'A tree with one vertex singled out as the root. Every edge then points away from the root, which gives each vertex a parent, children and a level.',
      'parent': 'In a rooted tree, the parent of v is the neighbor of v one step closer to the root. Every vertex except the root has exactly one parent.',
      'child': 'In a rooted tree, w is a child of v when v is the parent of w. Children of the same parent are siblings.',
      'ancestor': 'Any vertex on the path from v up to the root (not counting v itself). The root is an ancestor of every other vertex.',
      'descendant': 'w is a descendant of v when v is an ancestor of w: w lies somewhere below v.',
      'leaf': 'A vertex with no children. A vertex that does have children is an internal vertex.',
      'level': 'The level (or depth) of a vertex is the number of edges on the path from the root to it. The root is at level 0.',
      'height': 'The height of a rooted tree is the largest level of any vertex: the number of edges on the longest path from the root down to a leaf.',
      'spanning tree': 'A subgraph of a connected graph that contains every vertex and is a tree. It keeps exactly n − 1 of the edges.',
      'minimal spanning tree': 'In a weighted graph, a spanning tree whose total edge weight is as small as possible. Kruskal\'s and Prim\'s algorithms find one.',
      'binary tree': 'A rooted tree in which every vertex has at most two children, each one labeled as the left child or the right child.',
      'full binary tree': 'A binary tree in which every internal vertex has exactly two children. With i internal vertices it has i + 1 leaves.',
      'binary search tree': 'A binary tree with a key in every vertex, arranged so that keys in each left subtree are smaller and keys in each right subtree are larger than the vertex\'s own key.',
      'traversal': 'A procedure that visits every vertex of a tree exactly once in a fixed order, such as preorder, inorder, postorder or level order.',
      'expression tree': 'A binary tree that stores a formula: leaves hold numbers or variables, and each internal vertex holds an operator applied to its two subtrees.',
      'prefix-free code': 'A code in which no code word is the beginning of another. Such a code can be decoded bit by bit without separators. Huffman codes are prefix-free.',
      'decision tree': 'A rooted tree in which each internal vertex asks a question, each branch is an answer, and each leaf is a final decision or outcome.',
      'minimax': 'A rule for choosing moves in a two-player game tree: the player to move takes the maximum of the children\'s values, the opponent takes the minimum.',
      'tree isomorphism': 'Two trees are isomorphic when their vertices can be matched one to one so that adjacency is preserved: the same tree drawn twice. For rooted trees the roots must match too.',
      'center of a tree': 'The one or two vertices left after repeatedly removing all the leaves. Hanging a tree from its center gives it the smallest possible height.',
      'canonical name': 'A string that is the same for every drawing of a tree: a leaf is (), and any other vertex wraps the sorted names of its children in parentheses. Equal names mean isomorphic trees.',
      'game tree': 'A rooted tree whose vertices are positions in a two-player game and whose children are the positions one move later. Leaves carry the value of the final position for the first player.',
    },
    symbols: [
      ['n − 1', 'edges in a tree with n vertices', '7 vertices ⇒ 6 edges'],
      ['h', 'height of a rooted tree', 'root alone: h = 0'],
      ['2ʰ', 'most leaves a binary tree of height h can have', 'h = 3 ⇒ ≤ 8 leaves'],
      ['⌈log₂ t⌉', 'least height of a binary tree with t leaves', '⌈log₂ 6⌉ = 3'],
      ['⌈log₂ n!⌉', 'least worst-case comparisons to sort n items', 'n = 4 ⇒ 5'],
      ['w(T)', 'total weight of a spanning tree T', 'w(T) = 38'],
      ['T_L, T_R', 'left and right subtrees of a binary tree', 'inorder: T_L, root, T_R'],
      ['()', 'canonical name of a leaf', '(()()) = a vertex with two leaf children'],
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
      .tr-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.6rem; flex: 1 1 auto; min-height: 0; }
      .tr-two > .tr-col { min-height: 0; }
      .tr-cmp td:nth-child(4) { white-space: nowrap; font-weight: 600; }
      .tr-mm { display: flex; flex-direction: column; gap: 0.3rem; }
      .tr-mm-row { display: grid; grid-template-columns: 2.4rem minmax(0, 1fr) 3.6rem 1.2rem; gap: 0.4rem; align-items: center; font-size: 0.85rem; }
      .tr-mm-row .inp { width: 100%; padding: 0.2rem 0.4rem; text-align: center; }
      .tr-mm-mark { font-weight: 700; }
      .tr-mm-mark.ok { color: var(--true); }
      .tr-mm-mark.bad { color: var(--false); }
      .tr-svg .gm text { font-size: 13px; font-weight: 700; text-anchor: middle; dominant-baseline: central; }
      .tr-svg .gm rect, .tr-svg .gm circle { stroke-width: 1.8; }
      .tr-svg .gm.leaf text { font-weight: 600; }
      .tr-svg .gm-lvl { font-size: 11px; font-family: var(--font-mono); fill: var(--ink-3); dominant-baseline: central; }
      .tr-svg .gm-id { font-size: 10.5px; font-family: var(--font-mono); font-weight: 600; fill: var(--ink-3); }
      .tr-svg .gm.ok rect, .tr-svg .gm.ok circle { fill: var(--true-bg); stroke: var(--true); stroke-width: 2.8; }
      .tr-svg .gm.bad rect, .tr-svg .gm.bad circle { fill: var(--false-bg); stroke: var(--false); stroke-width: 2.8; }
      .tr-svg .gm.best rect, .tr-svg .gm.best circle { fill: var(--mark); stroke: var(--accent); stroke-width: 3; }
      .tr-svg .gm.best text { fill: var(--mark-ink); }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Trees: connected graphs with no cycles',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">tree</span> is a connected graph with no cycles. A graph with no cycles that may fall apart into several pieces is a <span class="term">forest</span>: each piece is a tree.<div class="eg">The path a–b–c is a tree; the triangle a–b–c–a is not, since it has a cycle. Delete edge b–c from the path and you get a forest: a–b and the lone vertex \(c\).</div></div>
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
            fig.innerHTML = `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Rooted tree with root ${root}">${g}</svg>`;
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
        id: 'tree-isomorphism',
        title: 'When are two trees the same tree?',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">Two trees are <b>isomorphic</b> (<span class="term">tree isomorphism</span>) when one can be relabeled into the other: a one-to-one correspondence between their vertices under which two vertices are adjacent exactly when their partners are. Isomorphic trees are one tree drawn twice. For <b>rooted</b> trees it must also send root to root, and so children to children.<div class="eg">Edges a–b, b–c, c–d and p–r, r–s, s–q give isomorphic trees: sending \(a, b, c, d\) to \(p, r, s, q\) keeps every edge.</div></div>
              <div class="thm">Isomorphic trees agree on every property that ignores the names: the number of vertices and edges, the <span class="term">degree sequence</span>, the length of the longest path, and the height when each is hung from its <span class="term" data-term="center of a tree">center</span>. So a single mismatch proves two trees different. Agreement proves nothing: the two trees on the right share all of these numbers and are still different.</div>
              <div class="ex">A path of three vertices hung from its middle vertex has height 1; hung from an end it has height 2. As plain trees the two drawings are isomorphic. As rooted trees they are not, because the roots are vertices of different degree.</div>
            </div>
            <div class="stack">
              <div class="card" style="padding:0.45rem 0.6rem">
                <div class="cols" style="grid-template-columns:1fr 1fr;gap:0.5rem">
                  <div><div class="tr-concept-fig" style="height:7.4rem">${ISO_FIG.a}</div><p class="tiny muted center">degrees 3, 2, 2, 1, 1, 1 · name <span class="mono">${ISO_FIG.na}</span></p></div>
                  <div><div class="tr-concept-fig" style="height:7.4rem">${ISO_FIG.b}</div><p class="tiny muted center">degrees 3, 2, 2, 1, 1, 1 · name <span class="mono">${ISO_FIG.nb}</span></p></div>
                </div>
                <p class="small" style="margin-top:0.3rem">Both have 6 vertices, 5 edges, the same degree sequence, a longest path of 4 edges and height 2 from the center. Yet on the left the degree-3 vertex touches two vertices of degree 2, on the right only one, and no relabeling can change that.</p>
              </div>
              <div class="def" data-label="Canonical name">A <span class="term">canonical name</span> is a string that depends only on the shape. Name a leaf <code>()</code>; name any other vertex by its children's names, sorted, inside one pair of parentheses. Two rooted trees are isomorphic exactly when their roots get the same name. Hang an unrooted tree from its center first: strip all leaves repeatedly until one or two vertices remain.<div class="eg">A root with two leaf children is <code>(()())</code>. Give either leaf a child and the root becomes <code>(()(()))</code>.</div></div>
              <div class="ai">Canonical forms turn "same structure?" into string equality. Chemical databases use them to match molecules; compilers and query engines, to find repeated code and sub-expressions.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 4 */
      {
        id: 'same-tree-lab',
        title: 'Lab: same tree or not?',
        kind: 'lab',
        html: String.raw`<p class="muted small">Two trees, drawn differently. Reveal one invariant at a time, then give your verdict. Click a vertex to hang that tree from it: the height changes with the root, which is why the fair comparison hangs both trees from their centers. Some pairs pass every quick check and are still different.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          let pair = null, rootA = 0, rootB = 0, shown = new Set(), verdict = null, mapping = null;
          const figA = h('div.tr-fig.tr-click', { role: 'group', 'aria-label': 'Tree A. Select a vertex to make it the root.' });
          const figB = h('div.tr-fig.tr-click', { role: 'group', 'aria-label': 'Tree B. Select a vertex to make it the root.' });
          const capA = h('div.tiny.muted.mono'), capB = h('div.tiny.muted.mono');
          const tbody = h('tbody');
          const fb = h('div.feedback', { 'aria-live': 'polite' });
          const mapEl = h('div.small.mono', { style: { lineHeight: 1.5 } });
          const CHECKS = [
            ['count', 'Vertices, edges', (t) => `${t.n} vertices, ${t.edges.length} edges`],
            ['deg', 'Degree sequence', (t) => degSeq(t.adj).join(', ')],
            ['height', 'Height from the center', (t) => String(hangFrom(t.adj, canonical(t.adj).root).height)],
            ['name', 'Canonical name', (t) => canonical(t.adj).name],
          ];
          const revealBtns = CHECKS.map(([k, label]) => h('button.btn.sm', { dataset: { k }, 'aria-pressed': 'false', onclick: () => { shown.add(k); draw(); } }, label));
          const isoBtn = h('button.btn.primary.sm', { onclick: () => decide(true) }, 'Isomorphic');
          const notBtn = h('button.btn.primary.sm', { onclick: () => decide(false) }, 'Not isomorphic');
          const newBtn = h('button.btn.sm', { onclick: () => fresh() }, 'New pair');
          const centerBtn = h('button.btn.sm', { onclick: () => { rootA = canonical(pair.A.adj).root; rootB = canonical(pair.B.adj).root; draw(); } }, 'Hang both from the center');
          const onPick = (which) => (e) => {
            const g = e.target.closest('[data-v]');
            if (!g) return;
            if (e.type === 'keydown') { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); }
            if (which === 'A') rootA = +g.dataset.v; else rootB = +g.dataset.v;
            draw();
            if (e.type === 'keydown') (which === 'A' ? figA : figB).querySelector(`[data-v="${g.dataset.v}"]`)?.focus({ preventScroll: true });
          };
          for (const [fig, w] of [[figA, 'A'], [figB, 'B']]) { fig.addEventListener('click', onPick(w)); fig.addEventListener('keydown', onPick(w)); }
          body.append(h('div.tr-grid', { style: { gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)' } },
            h('div.tr-col',
              h('div.tr-two', h('div.tr-col', capA, figA), h('div.tr-col', capB, figB)),
              h('div.row', centerBtn, newBtn)),
            h('div.tr-col',
              h('div.tiny.mono.muted', 'REVEAL AN INVARIANT'), h('div.row', { style: { gap: '0.35rem' } }, ...revealBtns),
              h('table.data.tr-tbl.tr-cmp', h('thead', h('tr', h('th', 'Invariant'), h('th', 'Tree A'), h('th', 'Tree B'), h('th', ''))), tbody),
              h('div.row', h('span.small.muted', 'Your verdict:'), isoBtn, notBtn), fb, mapEl)));

          function fresh() {
            pair = treePair(ctx.R, ctx.R.pick(['iso', 'iso', 'iso', 'look', 'look', 'diff']));
            rootA = ctx.R.int(0, pair.A.n - 1);
            rootB = ctx.R.int(0, pair.B.n - 1);
            shown = new Set(); verdict = null; mapping = null;
            draw();
          }
          function decide(saysIso) {
            const iso = pair.kind === 'iso';
            verdict = saysIso === iso ? 'right' : 'wrong';
            mapping = iso ? isoMap(pair.A.adj, pair.B.adj) : null;
            shown = new Set(CHECKS.map(([k]) => k));
            draw();
          }
          function draw() {
            const { A, B } = pair;
            const nameA = (v) => LETTERS[v], nameB = (v) => DIGITS[v];
            const showCenter = shown.has('height') || shown.has('name');
            const order = mapping ? [...mapping.keys()] : [];
            const badgeOf = (which, v) => {
              if (!mapping) return null;
              const a = which === 'A' ? v : [...mapping.entries()].find(([, b]) => b === v)[0];
              return String(order.indexOf(a) + 1);
            };
            const look = (which, t, root) => { const cs = new Set(centersOf(t.adj)); return (v) => ({ cls: v === root ? 'sel' : showCenter && cs.has(v) ? 'par' : '', badge: badgeOf(which, v), aria: `vertex ${which === 'A' ? nameA(v) : nameB(v)}${v === root ? ', the root' : ''}${showCenter && cs.has(v) ? ', a center' : ''}` }); };
            figA.innerHTML = treeSVG(A.adj, rootA, { label: nameA, focusable: true, look: look('A', A, rootA), minW: 230, minH: 200, aria: 'Tree A' });
            figB.innerHTML = treeSVG(B.adj, rootB, { label: nameB, focusable: true, look: look('B', B, rootB), minW: 230, minH: 200, aria: 'Tree B' });
            capA.textContent = `Tree A · root ${nameA(rootA)} · height ${hangFrom(A.adj, rootA).height}${showCenter ? ' · center ringed' : ''}`;
            capB.textContent = `Tree B · root ${nameB(rootB)} · height ${hangFrom(B.adj, rootB).height}${showCenter ? ' · center ringed' : ''}`;
            revealBtns.forEach((b) => { b.setAttribute('aria-pressed', String(shown.has(b.dataset.k))); b.classList.toggle('on', shown.has(b.dataset.k)); });
            ctx.rc(tbody, ...CHECKS.map(([k, label, fn]) => {
              if (!shown.has(k)) return h('tr', h('td', label), h('td.muted', '?'), h('td.muted', '?'), h('td'));
              const a = fn(A), b = fn(B);
              return h('tr', { class: a === b ? 'in' : 'out' }, h('td', label), h('td.mono', a), h('td.mono', b), h('td', a === b ? 'same' : 'differ'));
            }));
            isoBtn.disabled = notBtn.disabled = !!verdict;
            if (!verdict) { fb.className = 'feedback'; fb.textContent = ''; ctx.rc(mapEl); return; }
            const iso = pair.kind === 'iso';
            const lead = verdict === 'right' ? '<b>Correct.</b>' : '<b>Not quite.</b>';
            fb.className = 'feedback ' + (verdict === 'right' ? 'good' : 'bad');
            if (iso) {
              const rootedSame = ahu(A.adj, rootA) === ahu(B.adj, rootB);
              fb.innerHTML = `${lead} The trees are isomorphic: each is ${SHAPES[A.key].desc}, and the canonical names match. The numbered badges show one correspondence. ${rootedSame ? 'Hung from the vertices drawn on top, they are even isomorphic as rooted trees.' : 'As rooted trees, hung from the vertices drawn on top, they are not isomorphic; hang both from the center to see the same picture.'}`;
              ctx.rc(mapEl, [...mapping.entries()].map(([a, b]) => `${nameA(a)} ↔ ${nameB(b)}`).join('   '));
            } else {
              fb.innerHTML = `${lead} The trees are not isomorphic. ${whyDifferent(A, B)}`;
              ctx.rc(mapEl);
            }
          }
          fresh();
        },
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Spanning trees and minimal spanning trees',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">spanning tree</span> of a connected graph \(G\) is a subgraph that contains <b>every</b> vertex of \(G\) and is a tree. It keeps \(n - 1\) edges: just enough to connect everything, with no redundant loops. Every connected graph has one, because you can delete edges on cycles until no cycle is left.<div class="eg">Drop any one edge of the square a–b–c–d–a and the path that is left is a spanning tree: all 4 vertices, 3 edges.</div></div>
              <div class="def" data-label="Definition">In a weighted graph every edge carries a number, such as a cost or a distance. A <span class="term">minimal spanning tree</span> (MST) is a spanning tree \(T\) whose total weight \(w(T)\) is as small as possible.<div class="eg">Triangle a–b–c with weights a–b 1, b–c 2, c–a 3: its three spanning trees weigh 3, 4 and 5, so the MST is a–b plus b–c.</div></div>
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
              <div class="ai">Single-link clustering builds an MST over the data points and deletes its \(k - 1\) heaviest edges, which leaves \(k\) clusters. MSTs also plan the cheapest cabling for a data center or a sensor network.</div>
              <div class="warn">Greedy is not always safe. Planning a delivery route by always driving to the nearest unvisited city can give a tour far longer than the best one. The cut property is what makes greedy choices correct for spanning trees.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: Kruskal and Prim, step by step',
        kind: 'lab',
        html: String.raw`<p class="muted small">Press <b>Step</b> to make one greedy choice at a time. Kruskal walks the sorted edge list (the dashed purple edge is next) and rejects any edge that would close a cycle. Prim grows one tree from a start vertex (click a vertex to change it). Both always reach the same total weight when the weights are all different.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const names = Object.keys(MST_V);
          const n = names.length;
          let edges = MST_E.map(([u, v, w]) => ({ u, v, w }));
          let mode = 'kruskal', start = 'A', st = null;
          const fig = h('div.tr-fig.tr-click', { role: 'group', 'aria-label': 'Weighted graph' });
          const modeBtns = {
            kruskal: h('button', { onclick: () => setMode('kruskal') }, 'Kruskal'),
            prim: h('button', { onclick: () => setMode('prim') }, 'Prim'),
          };
          const stepBtn = h('button.btn.primary.sm', { onclick: () => { stop(); step(); draw(); } }, 'Step ▶');
          const runBtn = h('button.btn.sm', { onclick: () => run() });
          const runner = ctx.ticker({ ms: 650, button: runBtn, tick: () => { step(); draw(); return !st.done; } });
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

          const stop = () => runner.stop();
          function run() {
            if (runner.playing) { stop(); return; }
            if (st.done) reset();
            runner.start();
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
            fig.innerHTML = `<svg class="tr-svg" viewBox="20 14 560 386" role="group" aria-label="Weighted graph for the minimal spanning tree lab">${g}</svg>`;
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
          reset();
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Binary trees and binary search trees',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">binary tree</span> is a rooted tree in which every vertex has at most two children, each labeled <b>left child</b> or <b>right child</b>. In a <span class="term">full binary tree</span> every internal vertex has exactly two children.<div class="eg">A root with only a left child is a binary tree, but not full. Add a right child and it is full: 1 internal vertex, 2 leaves.</div></div>
              <div class="thm">A full binary tree with \(i\) internal vertices has \(i + 1\) leaves and \(2i + 1\) vertices.<br>A binary tree of <span class="term">height</span> \(h\) has at most \(2^h\) leaves, so a binary tree with \(t\) leaves has \(h \ge \lceil \log_2 t \rceil\).</div>
              <p class="small">Why \(2^h\)? Level 0 holds one vertex, and each level can at most double the one above: 1, 2, 4, 8, …. After \(h\) levels there is room for \(2^h\) leaves.</p>
              <div class="ai">Databases index millions of rows with B-trees, balanced search trees with many children per vertex. Nearest-neighbor search in machine learning libraries uses k-d trees, which split on one coordinate per level, much like a BST.</div>
            </div>
            <div class="stack">
              <div class="def">A <span class="term">binary search tree</span> (BST) holds a key in each vertex. For every vertex \(v\), all keys in its left subtree are smaller than \(v\)'s key and all keys in its right subtree are larger.<div class="eg">Root 5 with left child 3 and right child 8 is a BST: \(3 < 5 < 8\).</div></div>
              <p class="small"><b>Search</b> starts at the root. Equal means found, smaller means go left, larger means go right, and falling off the tree means the key is absent. <b>Insert</b> searches, then attaches the new key where the search fell off. Both cost at most \(h + 1\) comparisons.</p>
              <div class="warn">Insertion order shapes the tree. Inserting 1, 2, 3, …, \(n\) in order builds a path of height \(n - 1\), so a search may compare against every key. Shuffled input usually stays close to balanced. Self-balancing trees (AVL, red-black) rotate after inserts to keep \(h\) near \(\log_2 n\).</div>
              <div class="card split" style="padding:0.45rem 0.6rem;gap:0.6rem">
                <div><div class="tr-concept-fig" style="height:9.4rem">${binSVG(bstFrom([4, 2, 6, 1, 3, 5, 7]), { dx: 34, dy: 25, r: 15, pad: 18, minH: 186, aria: 'Balanced BST of height 2' })}</div><p class="tiny muted center">insert 4 2 6 1 3 5 7: height 2</p></div>
                <div><div class="tr-concept-fig" style="height:9.4rem">${binSVG(bstFrom([1, 2, 3, 4, 5, 6, 7]), { dx: 34, dy: 25, r: 15, pad: 18, aria: 'Degenerate BST of height 6' })}</div><p class="tiny muted center">insert 1 2 3 4 5 6 7: height 6</p></div>
              </div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: binary search tree playground',
        kind: 'lab',
        html: String.raw`<p class="muted small">Insert keys, search for one, or play a traversal and watch the visit order. Click any vertex to search for it. Try <b>Sorted 1–10</b> to see a degenerate tree, then <b>Balanced 1–15</b> to see the best case.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          let root = null, anim = null, travKind = null;
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

          // one ticker per frame rate (searches and traversals run at different speeds); cancel() stops whichever is running
          const tickers = new Map();
          const cancel = () => { anim = null; for (const t of tickers.values()) t.stop(); };
          const clearMarks = () => { look = new Map(); lit = new Set(); seq = []; travKind = null; };
          const say = (kind, text) => { msg.className = 'feedback ' + kind; msg.innerHTML = text; };
          function animate(frames, delay, instant) {
            cancel();
            if (instant || ctx.print) { frames.forEach((f) => f()); return; }
            frames[0]();
            if (frames.length === 1) return;
            if (!tickers.has(delay)) tickers.set(delay, ctx.ticker({ ms: delay, tick: () => { if (!anim) return false; anim.frames[anim.i++](); return anim.i < anim.frames.length; } }));
            anim = { frames, i: 1 };
            tickers.get(delay).start();
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
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Traversals and expression trees',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">traversal</span> visits every vertex of a tree exactly once, in a fixed order. Writing \(T_L\) and \(T_R\) for the left and right subtrees, the depth-first orders in the table are recursive.<div class="eg">Root \(r\) with left child \(a\) and right child \(b\): preorder \(r, a, b\); inorder \(a, r, b\); postorder \(a, b, r\).</div></div>
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
              <div class="def">An <span class="term">expression tree</span> stores a formula. Leaves hold numbers, and each internal vertex holds an operator applied to its two subtrees.<div class="eg">For \(2 \times (1 + 3)\), the root × has leaf 2 on its left and, on its right, a + vertex with leaves 1 and 3.</div></div>
              <p class="small">The three depth-first orders give three notations. Preorder gives <b>prefix</b> (Polish) notation. Inorder gives the usual <b>infix</b>, which needs parentheses to keep its meaning: \((3 + 4) \times (5 - 2)\). Postorder gives <b>postfix</b> (reverse Polish), which never needs parentheses.</p>
              <div class="ex">Evaluate postfix with a stack: push each number; at an operator, pop two values (the first pop is the right operand), apply it, and push the result.<br><span class="mono small">3 4 + → 7 &nbsp;·&nbsp; 7 5 2 − → 7 3 &nbsp;·&nbsp; 7 3 × → 21</span></div>
              <div class="ai">Python turns your source code into an abstract syntax tree before running it (see the <code>ast</code> module). Deep-learning frameworks record each computation as a graph and run backpropagation over it in reverse, children before parents.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: expression trees and the postfix stack',
        kind: 'lab',
        html: String.raw`<p class="muted small">Type an arithmetic expression with + − * / ^ and parentheses. The lab builds its tree (× and ÷ bind tighter than + and −, and ^ binds tightest), reads it in three orders, then evaluates the postfix form one token at a time with a stack.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const presets = ['(3 + 4) * (5 - 2)', '2 + 3 * 4', '(2 + 3) * 4', '10 - 4 - 3', '2 ^ 3 ^ 2', '(8 - 2) / (1 + 2) + 6 * 2'];
          let tree = null, post = [], steps = [], k = 0;
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
          const playBtn = h('button.btn.sm', { onclick: () => play() });
          const player = ctx.ticker({ ms: 750, button: playBtn, tick: () => { k++; draw(); return k < post.length; } });
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

          const stop = () => player.stop();
          function play() {
            if (player.playing) { stop(); return; }
            if (!tree) return;
            if (k >= post.length) k = 0;
            player.start();
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
          load(presets[0]);
        },
      },
      /* ---------------------------------------------------------------- 11 */
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
                <p class="small">Vertices are positions and children are the positions one move later. With <span class="term">minimax</span>, the opponent (MIN) takes the smallest child value and you (MAX) take the largest. Here the left move guarantees 3. The minimax lab lets you fill in a <span class="term">game tree</span> of your own.</p></div>
              <div class="ai">Gradient-boosted trees and random forests are leading models for tabular data. AlphaGo chose moves with Monte Carlo Tree Search over a game tree. Huffman coding sits inside zip and PNG and is used to compress model weights.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 12 */
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
          const restartBtn = h('button.btn.sm', { onclick: () => { k = 0; draw(); } }, 'Reset');
          const backBtn = h('button.btn.sm', { onclick: () => { k = Math.max(0, k - 1); draw(); } }, '◀ Back');
          const stepBtn = h('button.btn.primary.sm', { onclick: () => { k = Math.min(snaps.length - 1, k + 1); draw(); } }, 'Step ▶');
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
            if (k === 0) msg.textContent = `Start: ${counts.size} one-vertex trees, one per symbol, weighted by count. Press Step to merge the two lightest.`;
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
              h('div.tiny.mono.muted', 'ENCODED TEXT (ALTERNATE COLORS = NEXT SYMBOL)'),
              h('div.tr-bits', { html: enc }));
          }
          load(presets[0]);
        },
      },
      /* ---------------------------------------------------------------- 13 */
      {
        id: 'minimax-lab',
        title: 'Lab: minimax on a game tree',
        kind: 'lab',
        html: String.raw`<p class="muted small">Squares are your turns (MAX) and circles are the opponent's (MIN). Leaves hold the value of the final position for you. Work from the bottom up: type the value of every internal node, then check. The root's value is the best outcome you can force, and the move that reaches it is the one to play.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const SHAPE = { 2: [3, 3, 3], 3: [[2, 2], [2, 2]] };
          let depth = 2, tree = null, nodes = null, result = null; // result: Map id -> 'ok' | 'bad', after a check
          const inputs = new Map();
          const fig = h('div.tr-fig');
          const rows = h('div.tr-mm');
          const fb = h('div.feedback', { 'aria-live': 'polite' });
          const depthSeg = h('div.seg', { role: 'group', 'aria-label': 'Tree depth' }, ...[2, 3].map((d) => h('button', { dataset: { d }, 'aria-pressed': String(d === depth), onclick: () => { depth = d; fresh(); } }, `Depth ${d} · ${d === 2 ? 9 : 8} leaves`)));
          const newBtn = h('button.btn.sm', { onclick: () => fresh() }, 'New values');
          const checkBtn = h('button.btn.primary.sm', { onclick: () => check() }, 'Check');
          const solBtn = h('button.btn.sm', { onclick: () => { for (const n of internal()) inputs.get(n.id).value = String(n.value); check(); } }, 'Show solution');
          body.append(h('div.tr-grid', { style: { gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' } },
            h('div.tr-col', h('div.row', depthSeg, newBtn), fig, fb),
            h('div.tr-col', h('div.tiny.mono.muted', 'FILL IN EVERY INTERNAL NODE, DEEPEST FIRST'), rows, h('div.row', checkBtn, solBtn))));
          const internal = () => nodes.filter((n) => !n.leaf).sort((a, b) => b.depth - a.depth || a.id.localeCompare(b.id));
          const parse = (v) => { const t = String(v).trim().replace(/[−–]/g, '-'); return /^-?\d+$/.test(t) ? Number(t) : null; };
          function fresh() {
            tree = randGame(ctx.R, SHAPE[depth]);
            nodes = gameNodes(tree).nodes;
            result = null;
            inputs.clear();
            depthSeg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.d === depth)));
            ctx.rc(rows, ...internal().map((n) => {
              const inp = h('input.inp.mono', { type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': `Value of node ${n.id}`, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } } });
              inputs.set(n.id, inp);
              const of = n.kids.every((k) => k.leaf) ? n.kids.map((k) => k.node).join(', ') : n.kids.map((k) => k.id).join(', ');
              return h('label.tr-mm-row', h('span.mono', { style: { fontWeight: 700 } }, n.id), h('span.small.muted', `${n.max ? 'MAX' : 'MIN'} of ${of}`), inp, h('span.tr-mm-mark', { dataset: { id: n.id } }));
            }));
            fb.className = 'feedback';
            fb.textContent = '';
            draw();
          }
          function check() {
            result = new Map();
            let right = 0, blank = 0, firstWrong = null;
            for (const n of internal()) {
              const v = parse(inputs.get(n.id).value);
              const ok = v === n.value;
              if (v == null) blank++;
              result.set(n.id, ok ? 'ok' : 'bad');
              if (ok) right++; else if (!firstWrong) firstWrong = n;
            }
            const total = internal().length;
            const root = nodes[nodes.length - 1];
            if (right === total) {
              const best = root.kids.find((k) => k.value === root.value);
              const ab = alphaBetaLeaves(tree, true);
              const leaves = nodes.filter((n) => n.leaf).length;
              fb.className = 'feedback good';
              fb.innerHTML = `<b>All ${total} correct.</b> The root is worth ${root.value}, so MAX should play the move to ${best.id}: whatever MIN answers, the result is at least ${root.value}. Alpha-beta pruning, reading the leaves left to right, would settle this after looking at ${ab.leaves} of the ${leaves} leaves.`;
            } else {
              const n = firstWrong;
              const of = n.kids.every((k) => k.leaf) ? `its leaves ${n.kids.map((k) => k.node).join(', ')}` : `the values of ${n.kids.map((k) => k.id).join(' and ')}`;
              fb.className = 'feedback bad';
              fb.innerHTML = `<b>${right} of ${total} correct${blank ? ` (${blank} blank)` : ''}.</b> Look at ${n.id}: it is a ${n.max ? 'MAX' : 'MIN'} node, so ${n.max ? 'you pick the largest' : 'the opponent picks the smallest'} of ${of}. Fix the deepest mistakes first, because every value above them depends on them.`;
            }
            draw();
          }
          function draw() {
            const root = nodes[nodes.length - 1];
            const done = !!result && [...result.values()].every((v) => v === 'ok');
            const bestId = done ? root.kids.find((k) => k.value === root.value).id : null;
            fig.innerHTML = gameSVG(tree, {
              ids: true, best: done, aria: 'Game tree',
              text: (n) => { if (!result) return '?'; const v = parse(inputs.get(n.id).value); return v == null ? '?' : String(v); },
              cls: (n) => (!result ? '' : n.id === bestId ? 'best' : result.get(n.id) || ''),
            });
            rows.querySelectorAll('.tr-mm-mark').forEach((m) => { const r = result && result.get(m.dataset.id); m.textContent = r === 'ok' ? '✓' : r === 'bad' ? '✗' : ''; m.className = 'tr-mm-mark ' + (r || ''); });
          }
          fresh();
        },
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Code: a binary search tree in Python',
        kind: 'code',
        file: 'bst.py',
        html: String.raw`<p class="muted small">Each vertex is a small dictionary with a key and two links. Both functions are recursive: they solve the problem for one vertex and hand the rest to a subtree. Switch to <b>Trace</b> to watch the calls go down the tree and come back up.</p>`,
        fivew: {
          what: 'Builds a binary search tree from seven keys with a recursive <code>insert</code>, then lists the keys with a recursive inorder traversal.',
          why: 'Insert shows the search-tree rule in action (smaller goes left, larger goes right). Inorder shows the payoff: reading left subtree, root, right subtree returns the keys already sorted.',
          who: 'Anyone who implements ordered data: database engineers writing indexes, library authors building sorted maps, and students preparing for technical interviews, where BSTs are a classic topic.',
          where: 'Ordered maps and sets (Java\'s TreeMap, C++\'s std::map), database indexes, schedulers that always need the next event, and k-d trees for nearest-neighbor search in machine learning.',
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
      /* ---------------------------------------------------------------- 15 */
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
      /* ---------------------------------------------------------------- 16 */
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
      /* ---------------------------------------------------------------- worked example 1 */
      {
        title: 'Worked example: building a binary search tree by insertion',
        kind: 'example',
        id: 'ex-bst-insert',
        objective: 'Build a binary search tree by inserting keys one at a time, following the smaller-left, larger-right rule at every node, and read the result with an inorder traversal.',
        problem: String.raw`<p>Insert the keys \(50, 30, 70, 20, 40, 60, 80\), in that order, into an empty binary search tree. Draw the tree after each insertion, then give its inorder traversal.</p>`,
        data: EX_BST_DATA,
        steps: bstStepsFor(EX_BST_DATA),
        answer: EX_BST_INORDER,
        verify(M) {
          const keys = [50, 30, 70, 20, 40, 60, 80];
          const ins = (node, k) => { if (!node) return { k, l: null, r: null }; if (k < node.k) node.l = ins(node.l, k); else node.r = ins(node.r, k); return node; };
          let root = null;
          for (const k of keys) root = ins(root, k);
          const inorder = [];
          (function walk(n) { if (!n) return; walk(n.l); inorder.push(n.k); walk(n.r); })(root);
          const bstOk = (function check(n, lo, hi) { return !n || (n.k > lo && n.k < hi && check(n.l, lo, n.k) && check(n.r, n.k, hi)); })(root, -Infinity, Infinity);
          return bstOk && inorder.join(',') === EX_BST_INORDER.join(',') && M.sortNum(keys).join(',') === inorder.join(',');
        },
        variants: [
          {
            label: 'Variant: sorted keys (degenerate)',
            problem: String.raw`<p>Insert the keys \(10, 20, 30, 40, 50, 60\), in that order — already sorted — into an empty binary search tree. Draw the tree after each insertion, give its inorder traversal, and state its height.</p>`,
            data: VAR_BST_DATA,
            steps: bstStepsFor(VAR_BST_DATA),
            answer: VAR_BST_ANSWER,
            verify(M) {
              const keys = [10, 20, 30, 40, 50, 60];
              const ins = (node, k) => { if (!node) return { k, l: null, r: null }; if (k < node.k) node.l = ins(node.l, k); else node.r = ins(node.r, k); return node; };
              let root = null;
              for (const k of keys) root = ins(root, k);
              const inorder = [];
              (function walk(n) { if (!n) return; walk(n.l); inorder.push(n.k); walk(n.r); })(root);
              const ht = (n) => (n ? 1 + Math.max(ht(n.l), ht(n.r)) : -1);
              const allRight = (function chain(n) { return !n || (!n.l && chain(n.r)); })(root);
              return inorder.join(',') === VAR_BST_ANSWER.join(',') && M.sortNum(keys).join(',') === inorder.join(',') && ht(root) === keys.length - 1 && allRight;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_BST_DATA;
          const placed = D.keys.slice(0, step.inserted);
          const current = step.answer || step.inserted === 0 ? null : D.keys[step.inserted - 1];
          const path = current ? D.path[current] : [];
          const onPath = (a, b) => { const i = path.indexOf(a); return i >= 0 && path[i + 1] === b; };
          let g = '';
          if (step.inserted === 0) {
            const [x, y] = D.pos[D.keys[0]];
            g += `<circle cx="${x}" cy="${y}" r="22" fill="none" stroke="var(--ink-3)" stroke-width="1.6" stroke-dasharray="5 4"/><text x="${x}" y="${y + 46}" text-anchor="middle" font-size="13" fill="var(--ink-3)">empty: the first key inserted becomes the root</text>`;
          }
          for (const key of placed) {
            const p = D.parent[key];
            if (p == null) continue;
            const [x1, y1] = D.pos[p], [x2, y2] = D.pos[key];
            const hot = onPath(p, key);
            g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${hot ? 3.6 : 1.6}"/>`;
          }
          for (const key of placed) {
            const [x, y] = D.pos[key];
            const isNew = key === current;
            if (isNew) g += `<circle cx="${x}" cy="${y}" r="27" fill="none" stroke="var(--kw)" stroke-width="2" stroke-dasharray="4 3"/><text x="${x}" y="${y - 36}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--kw)">new</text>`;
            g += `<circle cx="${x}" cy="${y}" r="20" fill="${isNew ? 'var(--mark)' : 'var(--sheet)'}" stroke="${isNew ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${isNew ? 3 : 1.6}"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="${isNew ? 'var(--mark-ink)' : 'var(--ink)'}">${key}</text>`;
          }
          const svg = `<svg class="tr-svg" viewBox="${D.viewBox}" role="img" aria-label="Binary search tree being built by insertion" style="width:100%;height:auto;display:block">${g}</svg>`;
          const chips = D.keys.map((key, i) => h('span.mono', { style: { display: 'inline-block', fontSize: '0.82rem', fontWeight: i === step.inserted - 1 && !step.answer ? 700 : 400, border: i === step.inserted - 1 && !step.answer ? '2px solid var(--accent)' : '1px solid var(--rule)', borderRadius: '0.3rem', padding: '0.08rem 0.42rem', background: i < step.inserted ? (i === step.inserted - 1 && !step.answer ? 'var(--mark)' : 'var(--accent-2)') : 'var(--sheet)', opacity: i < step.inserted ? 1 : 0.55 } }, String(key)));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: '100%' } },
            h('div.tiny.mono.muted', { style: { textAlign: 'center' } }, step.note),
            h('div', { style: { width: 'min(40rem, 100%)' }, html: svg }),
            h('div.row', { style: { gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' } }, h('span.tiny.mono.muted', 'insert order:'), chips),
            step.answer ? h('div.row', { style: { gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' } }, D.inorder.map((key) => h('span.mono', { style: { display: 'inline-block', fontSize: '0.85rem', fontWeight: 700, border: '1px solid var(--true)', borderRadius: '0.3rem', padding: '0.08rem 0.42rem', background: 'var(--true-bg)' } }, String(key)))) : null,
            step.answer ? h('div.ex-answer', D.height === D.keys.length - 1 && D.keys.length > 1
              ? `Answer: the finished tree is a chain — inorder traversal ${D.inorder.join(', ')} · height ${D.height} · check: the traversal is perfectly sorted, but every key went right, so the tree degenerated to a sorted list, the worst case ✓`
              : 'Answer: the finished tree — inorder traversal 20, 30, 40, 50, 60, 70, 80 · check: the traversal is perfectly sorted, exactly as an inorder walk of a binary search tree must be ✓') : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 2 */
      {
        title: 'Worked example: building a Huffman code',
        kind: 'example',
        id: 'ex-huffman',
        objective: 'Build a Huffman code by repeatedly merging the two lightest trees, then read each codeword off its root-to-leaf path and compute the expected code length.',
        problem: String.raw`<p>Build a Huffman code for the symbols and frequencies \(A{:}45,\ B{:}13,\ C{:}12,\ D{:}16,\ E{:}9,\ F{:}5\) (out of 100). Give each symbol's codeword and the expected code length in bits per symbol.</p>`,
        data: EX_HUFF_DATA,
        steps: huffStepsFor(EX_HUFF_DATA),
        answer: EX_HUFF_ANSWER,
        verify(M) {
          const freq = { A: 45, B: 13, C: 12, D: 16, E: 9, F: 5 };
          let forest = Object.entries(freq).map(([sym, w]) => ({ w, depths: { [sym]: 0 } }));
          let cost = 0;
          while (forest.length > 1) {
            forest.sort((a, b) => a.w - b.w);
            const a = forest.shift(), b = forest.shift();
            cost += a.w + b.w;
            const depths = {};
            for (const src of [a, b]) for (const [sym, d] of Object.entries(src.depths)) depths[sym] = d + 1;
            forest.push({ w: a.w + b.w, depths });
          }
          const derived = forest[0].depths;
          const wpl = Object.entries(freq).reduce((sum, [sym, f]) => sum + f * derived[sym], 0);
          const kraft = Object.values(derived).reduce((sum, len) => sum + 2 ** (-len), 0);
          const same = Object.keys(freq).every((sym) => derived[sym] === EX_HUFF_ANSWER.lengths[sym]);
          return same && cost === 224 && wpl === 224 && EX_HUFF_ANSWER.wpl === 224 && Math.abs(kraft - 1) < 1e-12;
        },
        variants: [
          {
            label: 'Variant: equal frequencies',
            problem: String.raw`<p>Build a Huffman code for four symbols with equal frequencies \(A{:}10,\ B{:}10,\ C{:}10,\ D{:}10\) (out of 40). Give each symbol's codeword and the expected code length in bits per symbol.</p>`,
            data: VAR_HUFF_DATA,
            steps: huffStepsFor(VAR_HUFF_DATA),
            answer: VAR_HUFF_ANSWER,
            verify(M) {
              // independent check: depth-tracking merge simulation, weighted path length and Kraft equality
              const freq = { A: 10, B: 10, C: 10, D: 10 };
              let forest = Object.entries(freq).map(([sym, w]) => ({ w, depths: { [sym]: 0 } }));
              let cost = 0;
              while (forest.length > 1) {
                forest.sort((a, b) => a.w - b.w);
                const a = forest.shift(), b = forest.shift();
                cost += a.w + b.w;
                const depths = {};
                for (const src of [a, b]) for (const [sym, d] of Object.entries(src.depths)) depths[sym] = d + 1;
                forest.push({ w: a.w + b.w, depths });
              }
              const derived = forest[0].depths;
              const wpl = Object.entries(freq).reduce((sum, [sym, f]) => sum + f * derived[sym], 0);
              const kraft = Object.values(derived).reduce((sum, len) => sum + 2 ** (-len), 0);
              const same = Object.keys(freq).every((sym) => derived[sym] === VAR_HUFF_ANSWER.lengths[sym]);
              return same && cost === 80 && wpl === 80 && VAR_HUFF_ANSWER.wpl === 80 && Math.abs(kraft - 1) < 1e-12;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_HUFF_DATA;
          const info = huffInfo(D);
          const byId = info.byId;
          const totalMerges = info.merges.length;
          let g = '';
          if (step.merges === 0) {
            g += `<text x="320" y="34" text-anchor="middle" font-size="13" fill="var(--ink-3)">leaves, sorted by frequency, lightest first — the lightest two merge first</text>`;
            info.sorted.forEach(([sym, f], i) => {
              const x = 320 + (i - (info.sorted.length - 1) / 2) * 100, y = 118;
              g += `<circle cx="${x}" cy="${y}" r="22" fill="var(--sheet)" stroke="var(--ink-3)" stroke-width="1.6"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="600" fill="var(--ink)">${sym}</text><text x="${x}" y="${y + 38}" text-anchor="middle" font-size="12.5" fill="var(--ink-2)">${f} of ${info.total}</text>`;
              if (i < info.sorted.length - 1) g += `<text x="${x + 50}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="14" fill="var(--ink-3)">≤</text>`;
            });
          } else {
            for (const n of D.nodes) {
              if (n.leaf || n.created > step.merges) continue;
              const hot = n.created === step.merges && !step.answer;
              for (const [side, cid] of [['left', n.left], ['right', n.right]]) {
                const c = byId[cid];
                g += `<line x1="${n.x}" y1="${n.y}" x2="${c.x}" y2="${c.y}" stroke="${hot ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${hot ? 3.4 : 1.6}"/>`;
                if (step.merges === totalMerges) g += `<text x="${(n.x + c.x) / 2 + (side === 'left' ? -9 : 9)}" y="${(n.y + c.y) / 2}" text-anchor="middle" dominant-baseline="central" font-size="12.5" font-weight="700" fill="${side === 'left' ? 'var(--fnc)' : 'var(--num)'}">${side === 'left' ? '0' : '1'}</text>`;
              }
            }
            for (const n of D.nodes) {
              if (!n.leaf && n.created > step.merges) continue;
              const isNew = !n.leaf && n.created === step.merges && !step.answer;
              if (isNew) g += `<text x="${n.x}" y="${n.y - n.r - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--kw)">new</text>`;
              g += `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${isNew ? 'var(--mark)' : 'var(--sheet)'}" stroke="${isNew ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${isNew ? 3 : 1.6}"/><text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="central" font-size="13.5" font-weight="600" fill="${isNew ? 'var(--mark-ink)' : 'var(--ink)'}">${n.label}</text>`;
              if (n.leaf) g += `<text x="${n.x}" y="${n.y + n.r + 13}" text-anchor="middle" font-size="12" fill="var(--ink-2)">${n.sub}</text>`;
            }
          }
          const svg = `<svg class="tr-svg" viewBox="0 0 640 ${step.merges === 0 ? 176 : 262}" role="img" aria-label="Huffman trees being merged bottom-up" style="width:100%;height:auto;display:block">${g}</svg>`;
          const forestChips = step.forest.map((w) => h('span.mono', { style: { display: 'inline-block', fontSize: '0.82rem', border: '1px solid var(--rule)', borderRadius: '0.3rem', padding: '0.08rem 0.42rem', background: 'var(--sheet)' } }, String(w)));
          const expected = String(+((info.wpl / info.total).toFixed(4)));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: '100%' } },
            h('div.tiny.mono.muted', { style: { textAlign: 'center' } }, step.note),
            h('div', { style: { width: 'min(40rem, 100%)' }, html: svg }),
            h('div.row', { style: { gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' } }, h('span.tiny.mono.muted', 'forest weights:'), forestChips),
            step.answer ? h('div.row', { style: { gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' } }, D.freqList.map(([sym, f]) => h('span.mono', { style: { display: 'inline-block', fontSize: '0.82rem', border: '1px solid var(--accent)', borderRadius: '0.3rem', padding: '0.1rem 0.45rem', background: 'var(--accent-2)' } }, `${sym} = ${info.codes[sym]} (${info.codes[sym].length} bits)`))) : null,
            step.answer ? h('div.ex-answer', `Answer: expected length ${expected} bits per symbol — weighted path length ${info.wpl} · check: ${info.merges.map((m) => m.w).join(' + ')} = ${info.wpl}, and the code is prefix-free because every symbol sits at a leaf ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 3 */
      {
        title: 'Worked example: searching a binary search tree',
        kind: 'example',
        id: 'ex-bst-search',
        objective: 'Search a binary search tree by following one root-to-leaf comparison path, once for a key that is present and once for a key whose absence is proved by an empty link.',
        problem: String.raw`<p>Search for the key \(40\) in the binary search tree built by inserting \(50, 30, 70, 20, 40, 60, 80\). Follow the comparisons from the root, count them, and state whether the key is found.</p>`,
        data: EX_SEARCH_DATA,
        steps: bstSearchStepsFor(EX_SEARCH_DATA),
        answer: EX_SEARCH_ANSWER,
        verify(M) { return bstSearchVerify(EX_SEARCH_DATA, EX_SEARCH_ANSWER); },
        variants: [
          {
            label: 'Variant: target missing',
            problem: String.raw`<p>Search for the key \(65\) in the same binary search tree (built by inserting \(50, 30, 70, 20, 40, 60, 80\)). Follow the comparisons from the root, count them, state whether the key is found, and say where \(65\) would be inserted.</p>`,
            data: VAR_SEARCH_DATA,
            steps: bstSearchStepsFor(VAR_SEARCH_DATA),
            answer: VAR_SEARCH_ANSWER,
            verify(M) { return bstSearchVerify(VAR_SEARCH_DATA, VAR_SEARCH_ANSWER); },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_SEARCH_DATA;
          const root = bstFrom(D.keys);
          const visited = D.path.slice(0, step.vis);
          let g = '';
          for (const n of orderOf(root, 'level')) for (const c of [n.left, n.right]) {
            if (!c) continue;
            const hot = visited.includes(n.key) && visited.includes(c.key);
            g += `<line x1="${D.pos[n.key][0]}" y1="${D.pos[n.key][1]}" x2="${D.pos[c.key][0]}" y2="${D.pos[c.key][1]}" stroke="${hot ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${hot ? 3.6 : 1.6}"/>`;
          }
          if (step.answer && D.ghost) {
            const last = D.path[D.path.length - 1];
            g += `<line x1="${D.pos[last][0]}" y1="${D.pos[last][1]}" x2="${D.ghost[0]}" y2="${D.ghost[1]}" stroke="var(--false)" stroke-width="2" stroke-dasharray="5 4"/>`;
            g += `<circle cx="${D.ghost[0]}" cy="${D.ghost[1]}" r="20" fill="none" stroke="var(--false)" stroke-width="2" stroke-dasharray="5 4"/><text x="${D.ghost[0]}" y="${D.ghost[1]}" text-anchor="middle" dominant-baseline="central" font-size="13" fill="var(--false)">${D.target}?</text>`;
          }
          for (const n of orderOf(root, 'level')) {
            const [x, y] = D.pos[n.key];
            const isCur = step.vis > 0 && visited[visited.length - 1] === n.key && !step.answer;
            const isFound = step.answer && D.found && n.key === D.target;
            const isMiss = step.answer && !D.found && n.key === D.path[D.path.length - 1];
            const on = visited.includes(n.key);
            g += `<circle cx="${x}" cy="${y}" r="20" fill="${isFound ? 'var(--true-bg)' : isMiss ? 'var(--false-bg)' : isCur ? 'var(--mark)' : 'var(--sheet)'}" stroke="${isFound ? 'var(--true)' : isMiss ? 'var(--false)' : on ? 'var(--accent)' : 'var(--ink-3)'}" stroke-width="${on ? 3 : 1.6}"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="${isCur ? 'var(--mark-ink)' : 'var(--ink)'}">${n.key}</text>`;
          }
          const svg = `<svg class="tr-svg" viewBox="${D.viewBox}" role="img" aria-label="Binary search tree with the search path highlighted" style="width:100%;height:auto;display:block">${g}</svg>`;
          const last = D.path[D.path.length - 1];
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: '100%' } },
            h('div.tiny.mono.muted', { style: { textAlign: 'center' } }, step.note),
            h('div', { style: { width: 'min(40rem, 100%)' }, html: svg }),
            h('div.small.mono', visited.length ? `path so far: ${visited.join(' → ')} · comparisons: ${step.vis}` : 'no comparisons yet'),
            step.answer ? h('div.ex-answer', D.found
              ? `Answer: ${D.target} found after ${D.path.length} comparisons — path ${D.path.join(' → ')} ✓`
              : `Answer: ${D.target} is not in the tree — the search fell off the ${D.target < last ? 'left' : 'right'} of ${last} after ${D.path.length} comparisons, and ${D.target} would be inserted as the ${D.target < last ? 'left' : 'right'} child of ${last} ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 4 */
      {
        title: 'Worked example: three traversals of one tree',
        kind: 'example',
        id: 'ex-tree-traversals',
        objective: 'List one binary tree in preorder, inorder and postorder by applying each visiting rule recursively, and see how the same three rules act on a skewed tree.',
        problem: String.raw`<p>A binary tree has root \(A\); \(A\) has left child \(B\) and right child \(C\); \(B\) has left child \(D\) and right child \(E\); \(E\) has left child \(G\) only; \(C\) has right child \(F\) only; \(F\) has left child \(H\) only. List the nodes in preorder, inorder and postorder.</p>`,
        data: EX_TRAV_DATA,
        steps: travStepsFor(EX_TRAV_DATA),
        answer: EX_TRAV_ANSWER,
        verify(M) { return travVerify(EX_TRAV_DATA, EX_TRAV_ANSWER); },
        variants: [
          {
            label: 'Variant: a skewed chain',
            problem: String.raw`<p>The same eight labels \(A\) to \(H\) form a different binary tree: every node has only a right child, so the tree is the chain \(A \to B \to C \to D \to E \to F \to G \to H\). List the nodes in preorder, inorder and postorder.</p>`,
            data: VAR_TRAV_DATA,
            steps: travStepsFor(VAR_TRAV_DATA),
            answer: VAR_TRAV_ANSWER,
            verify(M) { return travVerify(VAR_TRAV_DATA, VAR_TRAV_ANSWER); },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_TRAV_DATA;
          const phases = ['pre', 'in', 'post'];
          const names = { pre: 'Preorder', in: 'Inorder', post: 'Postorder' };
          const curIdx = step.phase === '' ? -1 : phases.indexOf(step.phase);
          const badge = {};
          if (step.phase) D.orders[step.phase].slice(0, step.shown).forEach((key, i) => { badge[key] = i + 1; });
          const svg = binSVG(D.root, { minW: 380, minH: 240, dx: 52, dy: 56, r: 17, aria: 'Binary tree being traversed', look: (n) => (badge[n.key] ? { cls: step.answer ? 'done' : badge[n.key] === step.shown ? 'on' : 'done', badge: badge[n.key] } : {}) })
            .replace('<svg', '<svg style="width:100%;height:auto;display:block"');
          const ribbon = phases.map((ph, pi) => {
            const full = step.answer || pi < curIdx;
            const seq = full ? D.orders[ph] : pi === curIdx ? D.orders[ph].slice(0, step.shown) : [];
            return h('div.row', { style: { gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' } },
              h('span.tiny.mono.muted', { style: { minWidth: '5.2rem' } }, names[ph].toUpperCase()),
              ...(seq.length ? seq.map((key) => h('span.mono', { style: { display: 'inline-block', fontSize: '0.82rem', fontWeight: 700, border: '1px solid var(--accent)', borderRadius: '0.3rem', padding: '0.08rem 0.42rem', background: 'var(--accent-2)' } }, key)) : [h('span.tiny.muted', 'not started yet')]));
          });
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: '100%' } },
            h('div.tiny.mono.muted', { style: { textAlign: 'center' } }, step.note),
            h('div', { style: { width: 'min(30rem, 100%)' }, html: svg }),
            h('div.stack', { style: { gap: '0.3rem', width: 'min(30rem, 100%)' } }, ...ribbon),
            step.answer ? h('div.ex-answer', `Answer: preorder ${D.orders.pre.join(', ')} · inorder ${D.orders.in.join(', ')} · postorder ${D.orders.post.join(', ')} ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 5 */
      {
        title: 'Worked example: a minimum spanning tree by Kruskal',
        kind: 'example',
        id: 'ex-mst-kruskal',
        objective: 'Run Kruskal\u2019s algorithm on a stated weighted graph, accepting or rejecting each link by the cycle test, until the accepted links form a minimum spanning tree.',
        problem: String.raw`<p>Eight field stations \(A\)–\(H\) can be linked by cable along the routes and costs drawn in the steps — the weighted graph from the Kruskal and Prim lab. Connect every station at minimum total cable cost: run Kruskal's algorithm, link by link, and give the final network and its total cost.</p>`,
        data: EX_MST_DATA,
        steps: EX_MST_STEPS,
        answer: EX_MST_ANSWER,
        verify(M) { return mstVerify(EX_MST_DATA, EX_MST_ANSWER); },
        variants: [
          {
            label: 'Variant: six stations, a tempting triangle',
            problem: String.raw`<p>Six hill stations \(A\)–\(F\) can be linked by cable along the routes and costs drawn in the steps. Connect every station at minimum total cable cost: run Kruskal's algorithm, link by link, and give the final network and its total cost.</p>`,
            data: VAR_MST_DATA,
            steps: VAR_MST_STEPS,
            answer: VAR_MST_ANSWER,
            verify(M) { return mstVerify(VAR_MST_DATA, VAR_MST_ANSWER); },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_MST_DATA;
          const names = Object.keys(D.V);
          let g = '';
          D.E.forEach(([u, v], i) => {
            const cls = step.acc.includes(i) ? 'in' : step.rej.includes(i) ? 'out' : i === step.cur ? 'cur' : step.answer ? 'skip' : '';
            g += `<line class="me ${cls}" x1="${D.V[u][0]}" y1="${D.V[u][1]}" x2="${D.V[v][0]}" y2="${D.V[v][1]}" stroke="var(--ink-3)"/>`;
          });
          D.E.forEach(([u, v, w]) => {
            const mx = (D.V[u][0] + D.V[v][0]) / 2, my = (D.V[u][1] + D.V[v][1]) / 2;
            g += `<rect class="wbg" x="${mx - 13}" y="${my - 11}" width="26" height="22" rx="5" fill="var(--sheet)"/><text class="wt" x="${mx}" y="${my}" fill="var(--ink)">${w}</text>`;
          });
          const big = step.comps.filter((c) => c.length > 1);
          names.forEach((v) => {
            const gi = big.findIndex((c) => c.includes(v));
            g += `<g class="mv ${gi >= 0 ? 'c' + (gi % 4) : ''}"><circle cx="${D.V[v][0]}" cy="${D.V[v][1]}" r="19" fill="var(--sheet)" stroke="var(--ink-2)"/><text x="${D.V[v][0]}" y="${D.V[v][1]}" fill="var(--ink)">${v}</text></g>`;
          });
          const svg = `<svg class="tr-svg" viewBox="${D.viewBox}" role="img" aria-label="Weighted graph for Kruskal's algorithm" style="width:100%;height:auto;display:block">${g}</svg>`;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: '100%' } },
            h('div.tiny.mono.muted', { style: { textAlign: 'center' } }, step.note),
            h('div', { style: { width: 'min(40rem, 100%)' }, html: svg }),
            h('div.small', h('b', `Total so far: ${step.total}`), ` · links accepted: ${step.acc.length} of ${names.length - 1}`),
            h('div.small', h('span.muted', 'Pieces (union-find sets): '), step.comps.map((c) => `{${c.join(', ')}}`).join(' ')),
            step.answer ? h('div.ex-answer', `Answer: minimum spanning tree ${step.acc.map((i) => `${D.E[i][0]}–${D.E[i][1]}`).join(', ')} with total cost ${step.total} ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- 17 */
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
              // Preserve operand boundaries: 11 is one number, not the two operands 1 1.
              const tokens = (s) => String(s).replace(/[×xX]/g, '*').replace(/[−–]/g, '-').replace(/÷/g, '/').match(/\d+|\S/g) || [];
              const expected = tokens(want);
              return {
                prompt: `Write the <b>postfix</b> form of <code>${infix(tree)}</code>. Separate the tokens with spaces; you may type * for × and - for −.`,
                answer: want,
                answerText: want,
                check: (inp) => { const got = tokens(inp); return got.length === expected.length && got.every((t, i) => t === expected[i]); },
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
          {
            label: 'Minimax',
            make(R) {
              const shape = R.pick([[2, 2, 2], [3, 3], [3, 2, 2], [2, 3, 2]]);
              let tree, mins, unique = false;
              for (let tries = 0; tries < 20 && !unique; tries++) { // prefer a single clearly best move
                tree = shape.map((k) => Array.from({ length: k }, () => R.int(-5, 9)));
                mins = tree.map((g) => Math.min(...g));
                unique = mins.filter((m) => m === Math.max(...mins)).length === 1;
              }
              const val = Math.max(...mins);
              const names = tree.length === 2 ? ['Left', 'Right'] : ['Left', 'Middle', 'Right'];
              const bi = mins.indexOf(val);
              const fig = `<div class="tr-mini" style="height:7.5rem;max-width:22rem">${gameSVG(tree, { aria: 'Game tree with MAX to move at the root', text: () => '?' })}</div>`;
              const work = `MIN picks the smallest leaf under each move: ${tree.map((g, i) => `${names[i]}: min(${g.join(', ')}) = ${mins[i]}`).join('; ')}. MAX then takes the largest of ${mins.join(', ')}, which is <b>${val}</b>, by playing the ${names[bi].toLowerCase()} move.`;
              if (!unique || R.chance(0.55)) return { prompt: `MAX moves at the root of this game tree and MIN replies. The leaves show the value for MAX. What is the minimax value of the root?${fig}`, answer: val, hint: 'each circle takes the minimum of its leaves; the root takes the maximum of the circles.', solution: work };
              return { prompt: `MAX moves at the root of this game tree and MIN replies. The leaves show the value for MAX. Which move should MAX choose?${fig}`, options: names, answer: names[bi], solution: work };
            },
          },
          {
            label: 'Isomorphic trees',
            make(R) {
              if (R.chance(0.3)) {
                const n = R.pick([3, 4, 5, 6]);
                const [count, why] = {
                  3: [1, 'With 3 vertices and 2 edges the only shape is a path.'],
                  4: [2, 'The degrees add up to 6. The sequences 2, 2, 1, 1 (a path) and 3, 1, 1, 1 (a star) each give exactly one tree.'],
                  5: [3, 'The degrees add up to 8: 2, 2, 2, 1, 1 (a path), 3, 2, 1, 1, 1 (a vertex of degree 3 with legs 2, 1, 1) and 4, 1, 1, 1, 1 (a star). Each sequence gives one tree.'],
                  6: [6, 'Sort by degree sequence: 2, 2, 2, 2, 1, 1 gives the path; 3, 2, 2, 1, 1, 1 gives <i>two</i> trees (legs 2, 2, 1 or legs 3, 1, 1); 3, 3, 1, 1, 1, 1 gives two adjacent degree-3 vertices; 4, 2, 1, 1, 1, 1 gives a degree-4 vertex with one leg of length 2; 5, 1, 1, 1, 1, 1 gives the star. Total 1 + 2 + 1 + 1 + 1 = 6.'],
                }[n];
                return { prompt: `How many non-isomorphic trees are there with \\(${n}\\) vertices? Count shapes, not labelings.`, answer: count, hint: 'a tree on n vertices has n − 1 edges, so the degrees add up to 2(n − 1); list the possible degree sequences, then the shapes for each.', solution: `${why} Answer: <b>${count}</b>.` };
              }
              const pair = treePair(R, R.pick(['iso', 'iso', 'look', 'look', 'diff']));
              const { A, B } = pair;
              const nameA = (v) => LETTERS[v], nameB = (v) => DIGITS[v];
              const opt = { dx: 34, dy: 34, r: 12, pad: 16, minW: 150, minH: 100 };
              const figs = `<div class="tr-two" style="max-width:24rem;margin-top:0.3rem"><div class="tr-mini" style="height:6.5rem">${treeSVG(A.adj, R.int(0, A.n - 1), { ...opt, label: nameA, aria: 'Tree A' })}</div><div class="tr-mini" style="height:6.5rem">${treeSVG(B.adj, R.int(0, B.n - 1), { ...opt, label: nameB, aria: 'Tree B' })}</div></div>`;
              const iso = pair.kind === 'iso';
              let why;
              if (iso) {
                const m = isoMap(A.adj, B.adj);
                why = `Both are ${SHAPES[A.key].desc}, drawn from different roots. The degree sequences agree (${degSeq(A.adj).join(', ')}), the canonical names agree (${canonical(A.adj).name}), and one correspondence is ${[...m.entries()].map(([a, b]) => `${nameA(a)} ↔ ${nameB(b)}`).join(', ')}.`;
              } else why = whyDifferent(A, B);
              return {
                prompt: `Tree A has the edges ${edgeText(A, LETTERS)}. Tree B has the edges ${edgeText(B, DIGITS)}. Are they isomorphic?${figs}`,
                options: ['Isomorphic', 'Not isomorphic'],
                answer: iso ? 'Isomorphic' : 'Not isomorphic',
                hint: 'compare the degree sequences first; if they match, hang both trees from their centers and compare the pictures or the canonical names.',
                solution: `${why} So the trees are <b>${iso ? 'isomorphic' : 'not isomorphic'}</b>.`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 18 */
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
          { q: 'Two trees both have 6 vertices, 5 edges and degree sequence 3, 2, 2, 1, 1, 1. What can you conclude?', choices: ['They may or may not be isomorphic; matching invariants do not prove it', 'They must be isomorphic', 'They cannot be isomorphic', 'They are isomorphic only if they are drawn with the same root'], answer: 0, explain: 'Invariants can only rule isomorphism out. Two different trees share exactly this degree sequence: a degree-3 vertex with legs of length 2, 2, 1, and one with legs of length 3, 1, 1. To decide, hang both from their centers and compare canonical names, or exhibit a vertex correspondence.' },
          { q: 'MAX moves at the root of a game tree. Its three children are MIN nodes whose leaves are {3, 8}, {6, 7} and {9, 1}. What is the value of the root?', choices: ['9', '3', '8', '6'], answer: 3, explain: 'MIN takes the smallest leaf under each move: 3, 6 and 1. MAX then takes the largest of those, 6, by playing the middle move. The 9 is a trap, because MIN would answer that move with 1.' },
        ],
      },
    ],
  });
})();
