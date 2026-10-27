/* Module 9: Graphs. Objective 9: explain the use of graphing.
   Vocabulary, degree and the handshake theorem, paths and connectivity, Euler and Hamiltonian cycles,
   representations, BFS and DFS, Dijkstra's shortest paths, isomorphism and planarity. */
(() => {
  const LET = 'ABCDEFGHIJ';

  /** static SVG drawing of a small graph, returned as a string for slide html and practice prompts */
  function fig(w, h, nodes, edges, opt = {}) {
    const r = opt.r || 12;
    let out = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${opt.aria || 'A small graph'}" style="width:${(w / 15).toFixed(2)}rem;max-width:100%;height:auto;${opt.style || ''}">`;
    if (opt.directed) out += `<defs><marker id="${opt.id}-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)"/></marker></defs>`;
    for (const [i, j, lab, hl] of edges) {
      const [, x1, y1] = nodes[i], [, x2, y2] = nodes[j];
      let ex = x2, ey = y2;
      if (opt.directed) { const d = Math.hypot(x2 - x1, y2 - y1); ex = x2 - ((x2 - x1) / d) * (r + 3); ey = y2 - ((y2 - y1) / d) * (r + 3); }
      out += `<line x1="${x1}" y1="${y1}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${hl ? 'var(--accent)' : 'var(--ink-2)'}" stroke-width="${hl ? 3.2 : 1.8}"${opt.directed ? ` marker-end="url(#${opt.id}-arr)"` : ''}/>`;
      if (lab != null) {
        const lt = opt.lt || 0.5, mx = +(x1 + (x2 - x1) * lt).toFixed(1), my = +(y1 + (y2 - y1) * lt).toFixed(1);
        out += `<circle cx="${mx}" cy="${my}" r="9.5" fill="var(--sheet)" stroke="var(--rule)"/><text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--ink)">${lab}</text>`;
      }
    }
    for (const [lab, x, y] of nodes) out += `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--accent-2)" stroke="var(--accent)" stroke-width="1.6"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="${opt.fs || 12}" font-weight="600" fill="var(--ink)">${lab}</text>`;
    return out + '</svg>';
  }
  const ring = (n, cx, cy, rad, labels, start = -90) => Array.from({ length: n }, (_, k) => {
    const a = ((start + (360 / n) * k) * Math.PI) / 180;
    return [labels[k], +(cx + rad * Math.cos(a)).toFixed(1), +(cy + rad * Math.sin(a)).toFixed(1)];
  });
  const allPairs = (n) => { const e = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) e.push([i, j]); return e; };

  // figures used by the concept slides
  const FIG_K5 = fig(140, 120, ring(5, 70, 62, 46, ['', '', '', '', '']), allPairs(5), { r: 7, aria: 'Complete graph K5' });
  const FIG_K23 = fig(150, 120, [['', 45, 22], ['', 105, 22], ['', 20, 98], ['', 75, 98], ['', 130, 98]], [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4]], { r: 7, aria: 'Complete bipartite graph K2,3' });
  const FIG_DIR = fig(170, 92, [['x', 25, 66], ['y', 85, 20], ['z', 145, 66]], [[0, 1], [1, 2], [2, 0]], { directed: true, id: 'gr-d1', aria: 'Directed graph x to y to z to x' });
  const FIG_W = fig(170, 92, [['x', 25, 66], ['y', 85, 20], ['z', 145, 66]], [[0, 1, 4], [1, 2, 7], [2, 0, 2]], { aria: 'Weighted triangle' });
  const FIG_REP = fig(190, 120, [['a', 30, 30], ['b', 30, 95], ['c', 105, 62], ['d', 170, 62]], [[0, 1], [0, 2], [1, 2], [2, 3]], { aria: 'Graph with edges ab, ac, bc, cd' });
  const PENT = ring(5, 70, 66, 48, ['1', '2', '3', '4', '5']);
  const FIG_C5 = fig(140, 130, PENT, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], { aria: 'Five-cycle drawn as a pentagon', style: 'width:7.4rem' });
  const FIG_STAR = fig(140, 130, ring(5, 70, 66, 48, ['a', 'b', 'c', 'd', 'e']), [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]], { aria: 'Five-cycle drawn as a star', style: 'width:7.4rem' });
  const FIG_K4X = fig(120, 120, [['', 20, 20], ['', 100, 20], ['', 100, 100], ['', 20, 100]], [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]], { r: 7, aria: 'K4 drawn with a crossing', style: 'width:6rem' });
  const FIG_K4P = fig(120, 120, [['', 60, 14], ['', 108, 100], ['', 12, 100], ['', 60, 70]], [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]], { r: 7, aria: 'K4 drawn without crossings', style: 'width:6rem' });

  /* ---------- graph algorithms shared by labs and generators ---------- */
  function componentsOf(ids, nbrs) {
    const seen = new Set(), comps = [];
    for (const v of ids) {
      if (seen.has(v)) continue;
      const comp = [], q = [v];
      seen.add(v);
      while (q.length) { const u = q.shift(); comp.push(u); for (const w of nbrs(u)) if (!seen.has(w)) { seen.add(w); q.push(w); } }
      comps.push(comp);
    }
    return comps;
  }
  /** Hierholzer's algorithm on an undirected multigraph; edges = [[u, v], ...]. Returns [[vertex, edgeIndexUsedToArrive], ...] */
  function eulerTrail(ids, edges, start, order) {
    const adj = new Map(ids.map((v) => [v, []]));
    edges.forEach(([a, b], i) => { adj.get(a).push([b, i]); adj.get(b).push([a, i]); });
    for (const list of adj.values()) list.sort((p, q) => order(q[0]) - order(p[0]) || q[1] - p[1]);
    const used = new Set(), st = [[start, -1]], out = [];
    while (st.length) {
      const [v] = st[st.length - 1];
      const list = adj.get(v);
      while (list.length && used.has(list[list.length - 1][1])) list.pop();
      if (list.length) { const [w, i] = list.pop(); used.add(i); st.push([w, i]); } else out.push(st.pop());
    }
    return out.reverse();
  }
  function dijkstra(names, adj, src) {
    const dist = Object.fromEntries(names.map((v) => [v, Infinity])), prev = {}, order = [];
    dist[src] = 0;
    const done = new Set();
    for (;;) {
      const cand = names.filter((v) => !done.has(v) && dist[v] < Infinity).sort((a, b) => dist[a] - dist[b] || a.localeCompare(b));
      if (!cand.length) break;
      const u = cand[0];
      done.add(u); order.push(u);
      for (const [w, wt] of adj[u]) if (!done.has(w) && dist[u] + wt < dist[w]) { dist[w] = dist[u] + wt; prev[w] = u; }
    }
    return { dist, prev, order };
  }
  const pathTo = (prev, src, t) => { const p = [t]; while (p[0] !== src && prev[p[0]]) p.unshift(prev[p[0]]); return p[0] === src ? p : null; };

  /* ---------- invariants, isomorphism and Hamiltonian cycles on small graphs (vertices 0..n-1) ---------- */
  const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const nbrsOf = (E) => (u) => E.filter(([a, b]) => a === u || b === u).map(([a, b]) => (a === u ? b : a));
  function degrees(n, E) { const d = Array(n).fill(0); for (const [a, b] of E) { d[a]++; d[b]++; } return d; }
  function triangles(n, E) {
    const has = new Set(E.map(([a, b]) => edgeKey(a, b)));
    let t = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (has.has(edgeKey(i, j))) for (let k = j + 1; k < n; k++) if (has.has(edgeKey(i, k)) && has.has(edgeKey(j, k))) t++;
    return t;
  }
  function permutations(n) { const out = []; const rec = (pre, left) => { if (!left.length) { out.push(pre); return; } left.forEach((x, i) => rec([...pre, x], left.filter((_, j) => j !== i))); }; rec([], Array.from({ length: n }, (_, i) => i)); return out; }
  /** a relabeling f (f[i] = image of vertex i) that carries every edge of G onto an edge of H, or null; brute force, fine up to 7 vertices */
  function isomorphism(n, EG, EH) {
    if (EG.length !== EH.length) return null;
    const has = new Set(EH.map(([a, b]) => edgeKey(a, b)));
    const dG = degrees(n, EG), dH = degrees(n, EH);
    for (const f of permutations(n)) {
      if (dG.some((d, i) => d !== dH[f[i]])) continue; // a vertex must map to one of the same degree
      if (EG.every(([a, b]) => has.has(edgeKey(f[a], f[b])))) return f;
    }
    return null;
  }
  /** one Hamiltonian cycle starting at vertex 0, found by backtracking, or null when none exists */
  function hamiltonCycle(n, E) {
    const nb = nbrsOf(E);
    const adj = Array.from({ length: n }, (_, v) => nb(v).sort((a, b) => a - b));
    const path = [0], used = new Set([0]);
    const go = () => {
      const v = path[path.length - 1];
      if (path.length === n) return adj[v].includes(0);
      for (const w of adj[v]) { if (used.has(w)) continue; used.add(w); path.push(w); if (go()) return true; path.pop(); used.delete(w); }
      return false;
    };
    return n >= 3 && go() ? path.slice() : null;
  }
  /** two-coloring by BFS: the color (0 or 1) of every vertex when the graph is bipartite, otherwise null */
  function bipartition(n, E) {
    const nb = nbrsOf(E), col = Array(n).fill(-1);
    for (let st = 0; st < n; st++) {
      if (col[st] >= 0) continue;
      col[st] = 0;
      const q = [st];
      while (q.length) { const u = q.shift(); for (const w of nb(u)) { if (col[w] < 0) { col[w] = 1 - col[u]; q.push(w); } else if (col[w] === col[u]) return null; } }
    }
    return col;
  }

  /* ---------- worked-example data: BFS and Dijkstra, computed by shared generators ---------- */
  /* Each preset (primary and variant) carries its own data object: vertex list, positions,
     edges, source and a prediction checkpoint. The run functions simulate the algorithm on
     that data, and the stepsFor functions narrate the simulation, so a variant's steps are
     computed from its own input by exactly the code that builds the primary steps. */
  function bfsRun(verts, edges, src) {
    const adj = Object.fromEntries(verts.map((v) => [v, []]));
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    verts.forEach((v) => adj[v].sort());
    const dist = { [src]: 0 }, parent = {}, order = [], enqueued = {}, q = [src];
    const snaps = [{ queue: [src], order: [], discovered: [src], parent: {}, current: null }];
    while (q.length) {
      const u = q.shift(); order.push(u); enqueued[u] = [];
      for (const w of adj[u]) if (!(w in dist)) { dist[w] = dist[u] + 1; parent[w] = u; q.push(w); enqueued[u].push(w); }
      snaps.push({ queue: [...q], order: [...order], discovered: Object.keys(dist), parent: { ...parent }, current: u });
    }
    return { snaps, order, dist, parent, enqueued };
  }
  function bfsData(verts, edges, pos, src, checkpoint) {
    const run = bfsRun(verts, edges, src);
    const unreached = verts.filter((v) => !(v in run.dist));
    return {
      verts, edges, pos, src, checkpoint, snaps: run.snaps, order: run.order, dist: run.dist, parent: run.parent, enqueued: run.enqueued, unreached,
      answer: unreached.length ? { order: run.order, dist: run.dist, unreached } : { order: run.order, dist: run.dist },
    };
  }
  function bfsStepsFor(D) {
    const steps = [{ visited: 0, caption: `Start with the graph and the queue holding only ${D.src}, marked as the source at layer 0. Nothing is visited yet, because BFS visits a vertex only when it reaches the front of the queue, and that first-in, first-out order is what processes nearer vertices before farther ones.` }];
    D.order.forEach((u, i) => {
      const kids = D.enqueued[u];
      const snap = D.snaps[i + 1];
      const found = kids.length
        ? `enqueue ${kids.map((w) => `${w} at layer ${D.dist[w]}`).join(' and ')}, discovered now for the first time along a shortest path from ${D.src}`
        : `enqueue nothing new, because every neighbor of ${u} has already been discovered`;
      const tail = snap.queue.length
        ? `The queue now holds ${snap.queue.join(', ')}, and its front is the next vertex to be visited.`
        : 'The queue is now empty, so no discovered vertex is left waiting to be visited.';
      steps.push({ visited: i + 1, caption: `Visit ${u} and ${found}. ${u} is processed at this moment because it reached the front of the queue, and everything enqueued behind it sits at the same layer or one layer farther out. ${tail}` });
    });
    const distList = D.verts.map((v) => `${v} ${v in D.dist ? D.dist[v] : 'unreached'}`).join(', ');
    const reachedEdges = D.edges.filter(([a, b]) => a in D.dist && b in D.dist);
    const maxGap = reachedEdges.length ? Math.max(...reachedEdges.map(([a, b]) => Math.abs(D.dist[a] - D.dist[b]))) : 0;
    const unText = D.unreached.length ? ` ${D.unreached.join(', ')} is never discovered: no edge connects it to the part of the graph containing ${D.src}, so no queue can ever hold it and BFS from ${D.src} ends without reaching it.` : '';
    steps.push({ visited: D.order.length, answer: true, caption: `Answer: the visit order is ${D.order.join(', ')}, with distances ${distList}. Check: every edge between two reached vertices joins layers differing by at most ${maxGap}, which is exactly what a breadth-first layering must satisfy.${unText}` });
    const cp = steps.find((st) => st.visited === D.checkpoint.at);
    if (cp) cp.checkpoint = D.checkpoint.text;
    return steps;
  }
  const EX_BFS_POS = { A: [60, 105], B: [175, 40], C: [175, 170], D: [295, 105], E: [415, 170], F: [415, 40] };
  const EX_BFS_DATA = bfsData(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']],
    EX_BFS_POS, 'A',
    { at: 3, text: 'Predict: D sits at layer 2 and is visited next — which new vertex will D discover, and at what layer will it land?' });
  const EX_BFS_ANSWER = EX_BFS_DATA.answer;
  const VAR_BFS_DATA = bfsData(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E']],
    EX_BFS_POS, 'A',
    { at: 4, text: 'Predict: only E is left in the queue and F has never been discovered — will F appear before the queue empties?' });

  function dijkstraRun(verts, edges, src) {
    const adj = Object.fromEntries(verts.map((v) => [v, []]));
    edges.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
    verts.forEach((v) => adj[v].sort((x, y) => x[0].localeCompare(y[0])));
    const dist = Object.fromEntries(verts.map((v) => [v, v === src ? 0 : Infinity]));
    const prev = {}, settled = [];
    const snaps = [{ dist: { ...dist }, prev: {}, settled: [], improved: [], current: null }];
    for (;;) {
      const cand = verts.filter((v) => !settled.includes(v) && dist[v] < Infinity).sort((a, b) => dist[a] - dist[b] || a.localeCompare(b));
      if (!cand.length) break;
      const u = cand[0]; settled.push(u);
      const improved = [];
      for (const [w, wt] of adj[u]) {
        if (settled.includes(w)) continue;
        if (dist[u] + wt < dist[w]) { improved.push([w, dist[w], dist[u] + wt]); dist[w] = dist[u] + wt; prev[w] = u; }
      }
      snaps.push({ dist: { ...dist }, prev: { ...prev }, settled: [...settled], improved, current: u });
    }
    return { snaps, dist, prev, settled };
  }
  function dijkstraData(verts, edges, pos, src, target, checkpoint) {
    const run = dijkstraRun(verts, edges, src);
    const unreached = verts.filter((v) => run.dist[v] === Infinity);
    const path = run.dist[target] < Infinity ? pathTo(run.prev, src, target) : null;
    const wOf = (a, b) => edges.find(([x, y]) => (x === a && y === b) || (x === b && y === a))[2];
    const pathSum = path ? path.slice(1).reduce((sum, v, i) => sum + wOf(path[i], v), 0) : null;
    return { verts, edges, pos, src, target, checkpoint, snaps: run.snaps, dist: run.dist, prev: run.prev, settled: run.settled, unreached, path, pathSum };
  }
  function dijkstraStepsFor(D) {
    const fmt = (d) => (d === Infinity ? 'infinity' : String(d));
    const steps = [{ settled: 0, caption: `Setup: ${D.src} starts at distance 0 and every other vertex is at infinity, meaning no route to it is known yet. Dijkstra settles the closest unsettled vertex next, because with all weights positive no alternative route could reach that vertex more cheaply.` }];
    D.snaps.slice(1).forEach((snap, i) => {
      const u = snap.current;
      const changes = snap.improved.length
        ? snap.improved.map(([w, o, n]) => (o === Infinity ? `${w} appears at ${n} via ${u}` : `${w} improves from ${o} to ${n} via ${u}`)).join(', and ')
        : 'no tentative label improves, because every neighbor of ' + u + ' is already settled or already carries a label the route through ' + u + ' cannot beat';
      steps.push({ settled: i + 1, caption: `Settle ${u} at ${snap.dist[u]}, the smallest tentative label among the unsettled vertices, and relax its edges: ${changes}. The label of ${u} is final from this moment, since any other route to ${u} would have to leave through an unsettled vertex whose label is already at least ${snap.dist[u]}.` });
    });
    const distList = D.verts.map((v) => `${v} ${fmt(D.dist[v])}`).join(', ');
    const pathText = D.path ? ` The shortest path to ${D.target} is ${D.path.join('-')}, and its edges sum to ${D.pathSum}, matching the distance of ${D.target}.` : '';
    const unText = D.unreached.length ? ` The algorithm stops even though ${D.unreached.join(', ')} was never settled: no unsettled vertex has a finite label, so there is no candidate left to settle, and a vertex with no path from ${D.src} keeps distance infinity.` : '';
    steps.push({ settled: D.settled.length, answer: true, caption: `Answer: the shortest distances from ${D.src} are ${distList}.${pathText} Check: the settled order ${D.settled.join(', ')} has nondecreasing distances, which is exactly the pattern Dijkstra guarantees.${unText}` });
    const cp = steps.find((st) => st.settled === D.checkpoint.at);
    if (cp) cp.checkpoint = D.checkpoint.text;
    return steps;
  }
  const EX_DIJ_POS = { A: [55, 115], B: [185, 40], C: [185, 190], D: [325, 115], E: [465, 190] };
  const EX_DIJ_EDGES = [['A', 'B', 4], ['A', 'C', 2], ['C', 'B', 1], ['B', 'D', 5], ['C', 'D', 8], ['C', 'E', 10], ['D', 'E', 2]];
  const EX_DIJ_DATA = dijkstraData(
    ['A', 'B', 'C', 'D', 'E'], EX_DIJ_EDGES, EX_DIJ_POS, 'A', 'E',
    { at: 1, text: 'Predict: C is settled next at 2 — will relaxing the edge C-B improve the tentative label of B, currently 4?' });
  const EX_DIJ_ANSWER = { A: 0, B: 3, C: 2, D: 8, E: 10 };
  const VAR_DIJ_DATA = dijkstraData(
    ['A', 'B', 'C', 'D', 'E', 'F'], EX_DIJ_EDGES, { ...EX_DIJ_POS, F: [465, 40] }, 'A', 'E',
    { at: 5, text: 'Predict: every reachable vertex is settled but F still sits at infinity — will the algorithm settle F next, or stop?' });
  const VAR_DIJ_ANSWER = { A: 0, B: 3, C: 2, D: 8, E: 10, F: 'unreachable' };

  /* ---------- Stage D worked-example data: representation, DFS, Euler, coloring ---------- */
  const adjListOf = (verts, edges) => { const adj = Object.fromEntries(verts.map((v) => [v, []])); edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); }); verts.forEach((v) => adj[v].sort()); return adj; };

  /* (c) representation, degrees and a path question, all from one edge list */
  function repData(verts, edges, pos, src, tgt, cp) {
    const adj = adjListOf(verts, edges);
    const deg = Object.fromEntries(verts.map((v) => [v, adj[v].length]));
    const par = { [src]: null }, q = [src];
    while (q.length) { const u = q.shift(); for (const w of adj[u]) if (!(w in par)) { par[w] = u; q.push(w); } }
    let path = null;
    if (tgt in par) { path = [tgt]; while (path[0] !== src) path.unshift(par[path[0]]); }
    return { verts, edges, pos, src, tgt, cp, adj, deg, path, comp: Object.keys(par).sort(), answer: { adj, deg, edges: edges.length, path } };
  }
  function repStepsFor(D) {
    const steps = [{ b: 0, ph: 0, caption: `Start with only the picture: ${D.verts.length} vertices and ${D.edges.length} edges, and no written record of the graph yet. A computer cannot store a picture, so the first job is to turn the drawing into an adjacency list without losing or inventing a single edge.` }];
    D.verts.forEach((v, i) => steps.push({ b: i + 1, ph: 0, caption: `Write the row for ${v}: its neighbors are ${D.adj[v].length ? D.adj[v].join(', ') : 'none at all'}, because those are exactly the vertices joined to ${v} by an edge in the picture. Every undirected edge will appear twice in the finished list, once in the row of each endpoint, which is what makes the list a faithful copy of the graph.` }));
    const sum = D.verts.reduce((s, v) => s + D.deg[v], 0);
    steps.push({ b: D.verts.length, ph: 1, caption: `Count the entries in each row to get the degrees: ${D.verts.map((v) => `${v} has degree ${D.deg[v]}`).join(', ')}. A row length is a degree because each entry is one edge end at that vertex. The degrees add to ${sum}, and the handshake check demands exactly twice the edge count: 2 times ${D.edges.length} is ${2 * D.edges.length}, so the count closes with nothing double-counted or missed.` });
    steps.push({ b: D.verts.length, ph: 2, checkpoint: D.cp, caption: `Now use the list for the path question: is there a path from ${D.src} to ${D.tgt}? Work outward from ${D.src} through the rows, marking every vertex you can reach, because a path exists exactly when ${D.tgt} gets marked before the reachable set stops growing.` });
    steps.push({ b: D.verts.length, ph: 3, answer: true, caption: D.path
      ? `Answer: yes, there is a path: ${D.path.join('-')} uses ${D.path.length - 1} edges, and every consecutive pair in it is an edge, since each step follows one entry of the adjacency list. The full reachable set from ${D.src} is {${D.comp.join(', ')}}, which contains ${D.tgt}, and the degrees and the handshake sum from the earlier steps are part of the same answer.`
      : `Answer: no, there is no path from ${D.src} to ${D.tgt}. Working outward from ${D.src} marks exactly {${D.comp.join(', ')}} and then stops, because no edge leaves that set, and ${D.tgt} is never marked. In particular ${D.tgt} has degree ${D.deg[D.tgt]}, so not a single edge touches it and no path could ever arrive there.` });
    return steps;
  }
  const EX_REP_POS = { A: [70, 120], B: [200, 45], C: [200, 195], D: [330, 120], E: [460, 120] };
  const EX_REP_DATA = repData(['A', 'B', 'C', 'D', 'E'], [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E']], EX_REP_POS, 'A', 'E',
    'Predict: is there a path from A to E in this graph, and if there is, how many edges does the shortest one use?');
  const VAR_REP_DATA = repData(['A', 'B', 'C', 'D', 'E'], [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']], EX_REP_POS, 'A', 'E',
    'Predict: E has degree 0 in the audit above — is there a path from A to E, or does the reachable set stop before it?');

  /* (d) DFS with an explicit stack, simulated the way the BFS/DFS lab simulates it */
  function dfsRun(verts, edges, src) {
    const adj = adjListOf(verts, edges);
    const stack = [{ v: src, from: null }], seen = new Set(), order = [], parent = {};
    const snaps = [{ stack: [src], order: [], parent: {}, current: null, pushed: [], skip: false }];
    while (stack.length) {
      const { v, from } = stack.pop();
      if (seen.has(v)) { snaps.push({ stack: stack.map((x) => x.v), order: [...order], parent: { ...parent }, current: v, pushed: [], skip: true }); continue; }
      seen.add(v); order.push(v); if (from) parent[v] = from;
      const pushed = adj[v].filter((w) => !seen.has(w)).reverse();
      pushed.forEach((w) => stack.push({ v: w, from: v }));
      snaps.push({ stack: stack.map((x) => x.v), order: [...order], parent: { ...parent }, current: v, pushed, skip: false });
    }
    return { snaps, order, unvisited: verts.filter((v) => !seen.has(v)) };
  }
  function dfsData(verts, edges, pos, src, cp) {
    const run = dfsRun(verts, edges, src);
    return { verts, edges, pos, src, cp, snaps: run.snaps, order: run.order, unvisited: run.unvisited, answer: run.unvisited.length ? { order: run.order, unvisited: run.unvisited } : { order: run.order } };
  }
  function dfsStepsFor(D) {
    const steps = D.snaps.map((snap, i) => {
      if (i === 0) return { si: 0, n: 0, caption: `Start with ${D.src} alone on the stack and nothing visited. Depth-first search always takes the vertex on top of the stack next, last in, first out, which is the opposite discipline from the BFS queue and is exactly what makes it dive along one branch instead of spreading in layers.` };
      if (snap.skip) return { si: i, n: snap.order.length, caption: `Pop ${snap.current} from the top and find it already visited, so skip it and change nothing. A vertex can be pushed by two different neighbors before it is visited, and this visited check on popping is what keeps those stale entries from restarting the search or looping forever.` };
      const v = snap.current;
      const tail = snap.pushed.length
        ? `Push its unvisited neighbors ${snap.pushed.join(', ')} in that order, which leaves ${snap.pushed[snap.pushed.length - 1]} on top, so the search dives to ${snap.pushed[snap.pushed.length - 1]} next instead of returning to older waiting vertices.`
        : `It has no unvisited neighbors, so nothing is pushed: this is a dead end, and the search backtracks to whatever is waiting underneath in the stack.`;
      return { si: i, n: snap.order.length, caption: `Pop ${v} from the top of the stack and visit it, number ${snap.order.length} in the discovery order. ${tail}` };
    });
    steps.push({ si: D.snaps.length - 1, n: D.order.length, answer: true, caption: `Answer: the discovery order from ${D.src} is ${D.order.join(', ')}, and the stack is empty, so every vertex the search pushed has been accounted for.${D.unvisited.length ? ` But ${D.unvisited.join(', ')} was never visited: no edge joins it to the part of the graph containing ${D.src}, the stack emptied before any such vertex could be pushed, and DFS from one source only ever explores that source's own component.` : ' Every vertex of the graph was reached, because this graph is connected, so a single DFS from any source visits all of it.'}` });
    const cp = steps.find((st) => st.n === D.cp.at && !st.skip);
    if (cp) cp.checkpoint = D.cp.text;
    return steps;
  }
  const EX_DFS_POS = { A: [60, 120], B: [170, 40], C: [170, 200], D: [300, 40], E: [300, 120], F: [430, 200] };
  const EX_DFS_DATA = dfsData(['A', 'B', 'C', 'D', 'E', 'F'], [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['E', 'F']], EX_DFS_POS, 'A',
    { at: 2, text: 'Predict: D sits on top of the stack — when it is popped and visited, will it push any new vertex, or is it a dead end?' });
  const VAR_DFS_DATA = dfsData(['A', 'B', 'C', 'D', 'E', 'F'], [['A', 'B'], ['A', 'C'], ['B', 'D'], ['E', 'F']], EX_DFS_POS, 'A',
    { at: 3, text: 'Predict: D was a dead end and only C is left in the stack — after C is visited, will the search ever reach E and F?' });

  /* (e) Euler audit and trace; the trace itself comes from the module's eulerTrail (Hierholzer) */
  function eulerData(verts, edges, pos, cp) {
    const deg = Object.fromEntries(verts.map((v) => [v, edges.filter(([a, b]) => a === v || b === v).length]));
    const odd = verts.filter((v) => deg[v] % 2 === 1);
    let circuit = null, edgeOrder = [];
    if (odd.length === 0 || odd.length === 2) {
      const start = odd.length ? odd[0] : verts.find((v) => deg[v] > 0);
      const tr = eulerTrail(verts, edges, start, (v) => LET.indexOf(v));
      circuit = tr.map(([v]) => v); edgeOrder = tr.slice(1).map(([, ei]) => ei);
    }
    return { verts, edges, pos, deg, odd, circuit, edgeOrder, cp, answer: odd.length === 0 ? { verdict: 'circuit', circuit, odd } : odd.length === 2 ? { verdict: 'open trail', circuit, odd } : { verdict: 'none', odd } };
  }
  function eulerStepsFor(D) {
    const n = D.verts.length;
    const steps = [{ a: 0, u: 0, caption: `Start with the graph and the question: can one trail use every one of its ${D.edges.length} edges exactly once? Do not guess from the picture. First audit every degree, because Euler's theorem says the parity pattern alone decides whether such a trail can exist at all.` }];
    let oddSoFar = 0;
    D.verts.forEach((v, i) => {
      if (D.deg[v] % 2) oddSoFar++;
      const mine = D.edges.filter(([a, b]) => a === v || b === v).map(([a, b]) => (a === v ? b : a)).sort();
      steps.push({ a: i + 1, u: 0, caption: `Audit ${v}: it is joined to ${mine.join(', ')}, so its degree is ${D.deg[v]}, which is ${D.deg[v] % 2 ? 'odd' : 'even'}, and the running count of odd-degree vertices is now ${oddSoFar}. Parity is what matters because a trail passing through a vertex spends its edges two at a time, one arriving and one leaving, so only a trail's two ends can sit at odd-degree vertices.` });
    });
    if (D.circuit) D.edgeOrder.forEach((ei, k) => steps.push({ a: n, u: k + 1, caption: `Cross edge ${D.circuit[k]}-${D.circuit[k + 1]}, edge ${k + 1} of ${D.edges.length}, and mark it used so it can never be crossed again. The trail so far is ${D.circuit.slice(0, k + 2).join('-')}, and building it by splicing detours (Hierholzer's method) guarantees that no unused edge is ever stranded in a part of the graph the trail has left.` }));
    steps.push({ a: n, u: D.edgeOrder.length, answer: true, caption: D.circuit
      ? `Answer: every degree is even (odd count 0), so an Euler circuit exists, and here it is: ${D.circuit.join('-')}. It crosses each of the ${D.edges.length} edges exactly once and ends where it started, which is exactly what the audit promised. Check the used-edge numbers on the picture: they run from 1 to ${D.edges.length} with no repeat and no gap.`
      : `Answer: the audit ends with ${D.odd.length} odd-degree vertices (${D.odd.join(', ')}), and an Euler trail allows at most two, the start and the finish. So no trail, open or closed, can use every edge exactly once in this graph, no matter where it starts or how cleverly it routes: the parity count has already settled the question.` });
    const cp = steps.find((st) => st.a === n - 1);
    if (cp) cp.checkpoint = D.cp;
    return steps;
  }
  const EX_EUL_DATA = eulerData(['A', 'B', 'C', 'D', 'E'], [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D'], ['D', 'E'], ['E', 'C']], { A: [90, 170], B: [90, 50], C: [240, 110], D: [390, 50], E: [390, 170] },
    'Predict: A, B, C and D are all even so far — will E also be even, and if every degree is even, what kind of Euler trail must exist?');
  const VAR_EUL_DATA = eulerData(['A', 'B', 'C', 'D'], [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['A', 'C'], ['B', 'D']], { A: [140, 40], B: [380, 40], C: [380, 180], D: [140, 180] },
    'Predict: A, B and C are all odd so far — will D be odd too, and what will four odd-degree vertices mean for an Euler trail?');

  /* (f) greedy coloring with explicit conflict checks, in a stated vertex order */
  function colorData(verts, edges, pos, order, cp, why) {
    const adj = adjListOf(verts, edges);
    const colors = {}, assign = [];
    for (const v of order) {
      const usedBy = adj[v].filter((w) => w in colors);
      const ruled = [...new Set(usedBy.map((w) => colors[w]))].sort((a, b) => a - b);
      let c = 1; while (ruled.includes(c)) c++;
      colors[v] = c; assign.push({ v, c, ruled, usedBy });
    }
    return { verts, edges, pos, order, adj, assign, colors, used: Math.max(...Object.values(colors)), cp, why, answer: { colors, used: Math.max(...Object.values(colors)) } };
  }
  function colorStepsFor(D) {
    const steps = [{ n: 0, caption: `Start with every vertex uncolored and the goal of using as few colors as possible, in the order ${D.order.join(', ')}. The rule is greedy: give each vertex the smallest color that none of its already colored neighbors uses, and check the conflicts out loud each time, because a coloring only counts if the two ends of every edge end up different.` }];
    D.assign.forEach((a, i) => steps.push({ n: i + 1, caption: a.usedBy.length
      ? `Color ${a.v}: its colored neighbors are ${a.usedBy.map((w) => `${w} with color ${D.colors[w]}`).join(' and ')}, which rule out color${a.ruled.length > 1 ? 's' : ''} ${a.ruled.join(' and ')} — using any of those would put the same color on both ends of an edge. The smallest color not ruled out is ${a.c}, so ${a.v} takes color ${a.c}.`
      : `Color ${a.v}: none of its neighbors is colored yet, so no color is ruled out and the smallest color, 1, is available. ${a.v} takes color 1, and later neighbors will have to work around this choice.` }));
    steps.push({ n: D.order.length, answer: true, caption: `Answer: the coloring is ${D.order.map((v) => `${v} gets color ${D.colors[v]}`).join(', ')}, using ${D.used} colors, and every edge joins two different colors, so the coloring is proper. Fewer colors cannot work here: ${D.why}` });
    const cp = steps.find((st) => st.n === D.cp.at);
    if (cp) cp.checkpoint = D.cp.text;
    return steps;
  }
  const EX_COL_DATA = colorData(['A', 'B', 'C', 'D', 'E'], [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'], ['A', 'C']], { A: [110, 45], B: [280, 35], C: [350, 140], D: [230, 220], E: [90, 175] }, ['A', 'B', 'C', 'D', 'E'],
    { at: 2, text: 'Predict: C touches A with color 1 and B with color 2 — which color will C have to take?' },
    'A, B and C are pairwise adjacent (a triangle), so they need three different colors all by themselves.');
  const VAR_COL_DATA = colorData(['A', 'B', 'C', 'D'], [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']], { A: [130, 40], B: [390, 40], C: [390, 190], D: [130, 190] }, ['A', 'B', 'C', 'D'],
    { at: 3, text: 'Predict: D touches color 1 on A, color 2 on B and color 3 on C — can a palette of 3 colors finish this graph?' },
    'all four vertices are pairwise adjacent (this is K4, a clique of size 4), so each one needs its own color.');

  DM.module({
    id: 'graphs',
    num: 9,
    title: 'Graphs',
    objectives: [9],
    terms: {
      'graph': 'A set V of vertices together with a set E of edges, where each edge joins two vertices. Written G = (V, E).',
      'vertex': 'A point (node) of a graph. Plural: vertices.',
      'edge': 'A connection between two vertices, its endpoints. An edge is incident on its endpoints.',
      'adjacent': 'Two vertices are adjacent when an edge joins them.',
      'loop': 'An edge whose two endpoints are the same vertex.',
      'parallel edges': 'Two or more edges that join the same pair of vertices.',
      'simple graph': 'A graph with no loops and no parallel edges.',
      'directed graph': 'A graph whose edges have a direction, drawn as arrows. The edge (u, v) goes from u to v and is different from (v, u).',
      'degree': 'The number of edge ends at a vertex, written deg(v) (Johnsonbaugh writes δ(v)). A loop adds 2.',
      'complete graph': 'Kₙ: a simple graph on n vertices with an edge between every pair. It has n(n − 1)/2 edges.',
      'bipartite graph': 'A graph whose vertices split into two groups so that every edge joins a vertex of one group to a vertex of the other.',
      'path': 'A sequence of vertices v₀, v₁, …, vₖ in which each consecutive pair is joined by an edge. Its length is k, the number of edges. A simple path repeats no vertex.',
      'cycle': 'A path of nonzero length that starts and ends at the same vertex and repeats no edge.',
      'connected graph': 'A graph with a path between every pair of vertices. The maximal connected pieces of any graph are its components.',
      'Euler cycle': 'A cycle that uses every edge of the graph exactly once. An Euler path also uses every edge once but may end at a different vertex.',
      'Hamiltonian cycle': 'A cycle that visits every vertex exactly once before returning to the start.',
      'adjacency matrix': 'An n × n table whose entry in row i, column j is the number of edges from vertex i to vertex j.',
      'adjacency list': 'A representation that stores, for each vertex, the list (or set) of its neighbors.',
      'isomorphic': 'Two graphs are isomorphic when a one-to-one correspondence between their vertices preserves adjacency: they are the same graph drawn differently.',
      'planar graph': 'A graph that can be drawn in the plane with no edges crossing.',
      'face': 'One of the regions that a crossing-free drawing of a planar graph cuts the plane into, including the unbounded outer region.',
      'degree sequence': 'The degrees of all the vertices listed in decreasing order, such as 3, 3, 2, 2, 2. Isomorphic graphs have the same degree sequence.',
      'graph invariant': 'A property that isomorphic graphs must share: the numbers of vertices and edges, the degree sequence, the number of triangles or components. One differing invariant proves two graphs are not isomorphic.',
      "Kuratowski's theorem": 'A graph is planar exactly when it contains no subdivision of K₅ or K₃,₃ as a subgraph. Those two graphs are the only obstacles to planarity.',
      "Dirac's theorem": 'If a simple graph has n ≥ 3 vertices and every vertex has degree at least n/2, the graph has a Hamiltonian cycle. The condition is sufficient, not necessary.',
    },
    symbols: [
      ['G = (V, E)', 'graph with vertex set V and edge set E', 'V = {a, b, c}'],
      ['deg(v)', 'degree of v (also δ(v))', 'deg(a) = 3'],
      ['|V|, |E|', 'number of vertices, number of edges', 'Σ deg(v) = 2|E|'],
      ['Kₙ', 'complete graph on n vertices', 'K₄ has 6 edges'],
      ['Kₘ,ₙ', 'complete bipartite graph', 'K₃,₃ has 9 edges'],
      ['(u, v)', 'directed edge from u to v', '(a, b) ≠ (b, a)'],
      ['w(u, v)', 'weight of the edge joining u and v', 'w(A, C) = 2'],
      ['Aᵏ', 'k-th power of the adjacency matrix: counts walks of length k', '(A²)ᵢⱼ'],
      ['V − E + F = 2', "Euler's formula for connected planar graphs", 'cube: 8 − 12 + 6 = 2'],
      ['E ≤ 3V − 6', 'edge bound for a simple planar graph with V ≥ 3', 'K₅: 10 > 9, not planar'],
    ],
    css: `
      .gr-lab { display: grid; gap: 0.9rem; min-height: 0; align-items: stretch; }
      .gr-panel { display: flex; flex-direction: column; gap: 0.45rem; min-height: 0; }
      .gr-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.35rem; text-align: center; }
      .gr-stats div { background: var(--sheet); border: 1px solid var(--rule); border-radius: var(--radius); padding: 0.2rem; }
      .gr-stats b { display: block; font-family: var(--font-display); font-size: 1.15rem; font-variant-numeric: tabular-nums; line-height: 1.2; }
      .gr-stats span { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
      .gr-chips { display: flex; flex-wrap: wrap; gap: 0.25rem; }
      .gr-chips .chip { font-family: var(--font-mono); font-size: 0.74rem; padding: 0.02rem 0.45rem; }
      .gr-chips .chip.odd { background: var(--false-bg); color: var(--false); border-color: var(--false); }
      .gr-chips .chip.on { background: var(--accent-2); border-color: var(--accent); }
      .gr-mat { border-collapse: collapse; font-family: var(--font-mono); font-size: 0.72rem; }
      .gr-mat th, .gr-mat td { width: 1.45rem; height: 1.25rem; text-align: center; border: 1px solid var(--rule); padding: 0; }
      .gr-mat th { background: var(--paper); color: var(--ink-3); font-weight: 600; }
      .gr-mat td.one { background: var(--accent-2); color: var(--ink); font-weight: 700; }
      .gr-mat td.zero { color: var(--ink-3); }
      .gr-mat .sel { outline: 2px solid var(--accent); outline-offset: -2px; }
      .gr-box { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; min-height: 1.9rem; }
      .gr-box .cell { font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; border: 1.5px solid var(--warn); background: var(--warn-bg); color: var(--ink); border-radius: 0.3rem; min-width: 1.7rem; text-align: center; padding: 0.08rem 0.3rem; }
      .gr-box .cell.stale { border-style: dashed; color: var(--ink-3); background: var(--sheet); text-decoration: line-through; }
      .gr-box .end { font-size: 0.7rem; color: var(--ink-3); font-family: var(--font-mono); }
      .gr-order { display: flex; flex-wrap: wrap; gap: 0.2rem; }
      .gr-order span { font-family: var(--font-mono); font-size: 0.78rem; border-radius: 0.3rem; padding: 0.05rem 0.35rem; background: var(--accent-2); color: var(--ink); }
      .gr-order span b { color: var(--accent); margin-right: 0.15rem; font-size: 0.68rem; }
      .gr-svg .gv { cursor: pointer; outline: none; }
      .gr-svg .gv:focus-visible circle.body { stroke-width: 4; }
      .gr-hit { cursor: pointer; outline: none; }
      .gr-hit:focus-visible { stroke: var(--accent); stroke-width: 2; stroke-opacity: 1; }
      .gr-table td, .gr-table th { padding: 0.12rem 0.4rem !important; font-size: 0.8rem; }
      .gr-table tr.fin td { color: var(--ink); }
      .gr-table tr.front td { background: var(--warn-bg); }
      .gr-table tr.cur td { background: var(--mark); color: var(--mark-ink); }
      .gr-rel { margin: 0; padding-left: 1.1rem; font-size: 0.8rem; }
      .gr-rel li + li { margin-top: 0.1rem; }
      .gr-ctl { display: grid; grid-template-columns: 4.2rem minmax(0, 1fr); gap: 0.3rem 0.5rem; align-items: center; font-size: 0.8rem; color: var(--ink-2); }
      .gr-ctl .seg { justify-self: start; }
      .gr-ctl .seg button { padding: 0.15rem 0.5rem; font-size: 0.78rem; }
      .gr-fig { display: flex; gap: 0.6rem; align-items: center; justify-content: center; }
      .gr-fig svg { height: auto; }
      .gr-cap { font-size: 0.72rem; color: var(--ink-3); text-align: center; font-family: var(--font-mono); }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'The vocabulary of graphs',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">graph</span> \(G = (V, E)\) has a set \(V\) of <span class="term" data-term="vertex">vertices</span> (also called nodes) and a set \(E\) of <span class="term" data-term="edge">edges</span>. Each edge joins two vertices, called its endpoints. The edge is <i>incident</i> on its endpoints, and two vertices joined by an edge are <span class="term">adjacent</span>.</div>
              <div class="figure">
                <svg viewBox="0 0 410 205" role="img" aria-label="A graph with a loop, parallel edges and an isolated vertex" style="max-height:12.5rem">
                  <g fill="none" stroke="var(--ink-2)" stroke-width="2">
                    <line x1="50" y1="62" x2="175" y2="40"/>
                    <path d="M175 40 Q251 6 310 72"/><path d="M175 40 Q234 98 310 72"/>
                    <circle cx="334" cy="92" r="18"/>
                    <line x1="50" y1="62" x2="110" y2="160"/><line x1="175" y1="40" x2="110" y2="160"/><line x1="110" y1="160" x2="250" y2="165"/>
                  </g>
                  <g fill="var(--accent-2)" stroke="var(--accent)" stroke-width="1.6">
                    <circle cx="50" cy="62" r="13"/><circle cx="175" cy="40" r="13"/><circle cx="310" cy="72" r="13"/>
                    <circle cx="110" cy="160" r="13"/><circle cx="250" cy="165" r="13"/><circle cx="372" cy="165" r="13"/>
                  </g>
                  <g fill="var(--ink)" font-size="12" font-weight="600" text-anchor="middle">
                    <text x="50" y="66">v1</text><text x="175" y="44">v2</text><text x="310" y="76">v3</text>
                    <text x="110" y="164">v4</text><text x="250" y="169">v5</text><text x="372" y="169">v6</text>
                  </g>
                  <g fill="var(--accent)" font-size="12" font-style="italic">
                    <text x="104" y="40">e1</text>
                    <text x="214" y="14">parallel edges</text>
                    <text x="348" y="132">loop</text>
                    <text x="330" y="199">isolated vertex</text>
                  </g>
                </svg>
              </div>
              <p class="small muted">Edge \(e_1\) is incident on \(v_1\) and \(v_2\), so \(v_1\) and \(v_2\) are adjacent. \(v_6\) touches no edge at all. Where the vertices sit on the page means nothing: only which pairs are joined.</p>
            </div>
            <div class="stack">
              <ul class="small" style="display:grid;gap:0.35rem">
                <li>A <span class="term">loop</span> joins a vertex to itself (at \(v_3\) above).</li>
                <li><span class="term">Parallel edges</span> join the same pair of vertices (\(v_2\) and \(v_3\) above).</li>
                <li>A <span class="term">simple graph</span> has no loops and no parallel edges. Most graphs in this course are simple.</li>
                <li>In a <span class="term">directed graph</span> every edge has a direction, drawn as an arrow. "Follows" on a social network is directed; a two-way road is not.</li>
                <li>In a <b>weighted graph</b> every edge carries a number: a distance, a cost, a travel time.</li>
              </ul>
              <div class="gr-fig">
                <div><div>${FIG_DIR}</div><div class="gr-cap">directed</div></div>
                <div><div>${FIG_W}</div><div class="gr-cap">weighted</div></div>
              </div>
              <div class="ai">A <b>knowledge graph</b> stores facts as directed, labeled edges such as <span class="mono small">Paris —capital of→ France</span>. Search engines and AI assistants follow these edges to answer questions, and graph neural networks learn from the same structure.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Degree, the handshake theorem, and special graphs',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">The <span class="term">degree</span> \(\deg(v)\) of a vertex is the number of edges incident on it, with a loop counted twice because it touches \(v\) at both ends. Johnsonbaugh writes \(\delta(v)\).</div>
              <div class="thm"><b>Handshake theorem.</b> In every graph, \[\sum_{v \in V} \deg(v) = 2|E|.\] Each edge has two ends, and each end adds 1 to the degree of the vertex it touches.</div>
              <div class="thm" data-label="Corollary">Every graph has an <b>even</b> number of vertices of odd degree. An odd number of odd degrees would make the sum odd, but \(2|E|\) is even.</div>
              <div class="ex">Can 7 people each shake hands with exactly 3 of the others? The degrees would add up to \(7 \cdot 3 = 21\), an odd number. No graph has an odd degree sum, so it is impossible, however the people try.</div>
            </div>
            <div class="stack">
              <div class="card">
                <div class="split" style="align-items:center">
                  <div class="center">${FIG_K5}<div class="gr-cap">K5: 10 edges</div></div>
                  <div class="center">${FIG_K23}<div class="gr-cap">K2,3: 6 edges</div></div>
                </div>
                <p class="small" style="margin-top:0.35rem">The <span class="term">complete graph</span> \(K_n\) joins every pair of its \(n\) vertices, so it has \(\binom{n}{2} = \frac{n(n-1)}{2}\) edges.</p>
                <p class="small" style="margin-top:0.3rem">A <span class="term">bipartite graph</span> splits its vertices into two groups \(V_1, V_2\) so that every edge joins \(V_1\) to \(V_2\). In the complete bipartite graph \(K_{m,n}\) each of the \(m\) vertices on one side is joined to all \(n\) on the other: \(m \cdot n\) edges.</p>
              </div>
              <div class="ai">Recommender systems model users and products as a bipartite graph: an edge means "this user bought or rated this product". Suggesting an item means predicting a missing edge, and graph-based models do that by looking at the neighbors of your neighbors.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: graph editor',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click empty space to add a vertex. Click one vertex, then another, to add or remove the edge between them. Drag a vertex to move it. The panel recomputes degrees, the handshake check, the adjacency matrix, the components and the Euler verdict after every change. Red badges mark odd degrees.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const W = 540, H = 380, R = 17;
          const COMP = ['--accent', '--fnc', '--num', '--kw', '--str', '--warn'];
          const PRESETS = {
            'Envelope': { v: [[150, 320], [380, 320], [380, 170], [150, 170], [265, 60]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [3, 4], [0, 2], [1, 3]] },
            'K₅': { v: ring(5, 270, 195, 140, [0, 0, 0, 0, 0]).map(([, x, y]) => [x, y]), e: allPairs(5) },
            'K₃,₃': { v: [[130, 90], [270, 90], [410, 90], [130, 300], [270, 300], [410, 300]], e: [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]] },
            'Cycle C₆': { v: ring(6, 270, 195, 140, [0, 0, 0, 0, 0, 0]).map(([, x, y]) => [x, y]), e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
            'Two pieces': { v: [[110, 100], [230, 90], [170, 210], [340, 160], [450, 110], [450, 290], [330, 310]], e: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 6], [6, 3]] },
            'Star': { v: [[270, 195], ...ring(5, 270, 195, 140, [0, 0, 0, 0, 0]).map(([, x, y]) => [x, y])], e: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]] },
          };
          let V = [], E = [], sel = null, trail = false, msg = '';
          const byId = (id) => V.find((v) => v.id === id);
          const has = (a, b) => E.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
          function load(name) {
            const p = PRESETS[name];
            V = p.v.map(([x, y], i) => ({ id: i, x, y, label: LET[i] }));
            E = p.e.map(([a, b]) => [a, b]);
            sel = null; trail = false; msg = '';
          }
          const svg = s('svg', { class: 'gr-svg', viewBox: `0 0 ${W} ${H}`, role: 'application', 'aria-label': 'Graph editing canvas', style: 'touch-action: none' });
          const toolbar = h('div.row', { style: { gap: '0.3rem' } });
          const panel = h('div.gr-panel');
          body.append(h('div.gr-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' } },
            h('div.stack', { style: { minHeight: 0, gap: '0.4rem' } }, toolbar, h('div.figure', { style: { flex: '1 1 auto', minHeight: 0, alignItems: 'start' } }, svg)),
            panel));

          const pt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
          const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
          let drag = null, bgDown = null;
          svg.addEventListener('pointerdown', (e) => {
            const p = pt(e);
            const g = e.target.closest('[data-v]');
            if (g) { const v = byId(+g.dataset.v); drag = { v, dx: p.x - v.x, dy: p.y - v.y, sx: p.x, sy: p.y, moved: false }; try { svg.setPointerCapture(e.pointerId); } catch { /* synthetic events */ } }
            else bgDown = { x: p.x, y: p.y };
          });
          svg.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const p = pt(e);
            if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) < 4) return;
            drag.moved = true;
            drag.v.x = clamp(p.x - drag.dx, R + 2, W - R - 2);
            drag.v.y = clamp(p.y - drag.dy, R + 2, H - R - 2);
            drawSvg();
          });
          svg.addEventListener('pointerup', (e) => {
            const p = pt(e);
            if (drag) { const d = drag; drag = null; if (!d.moved) clickVertex(d.v); return; }
            if (bgDown && Math.hypot(p.x - bgDown.x, p.y - bgDown.y) < 6) addVertex(p.x, p.y);
            bgDown = null;
          });
          function addVertex(x, y) {
            if (V.length >= 10) { msg = 'This editor holds at most 10 vertices. Delete one first.'; draw(); return; }
            const used = new Set(V.map((v) => v.label));
            const label = [...LET].find((c) => !used.has(c));
            const id = V.length ? Math.max(...V.map((v) => v.id)) + 1 : 0;
            V.push({ id, x: clamp(x, R + 2, W - R - 2), y: clamp(y, R + 2, H - R - 2), label });
            msg = ''; sel = null;
            draw();
          }
          function clickVertex(v) {
            msg = '';
            if (sel === null) sel = v.id;
            else if (sel === v.id) sel = null;
            else {
              const a = sel, b = v.id;
              if (has(a, b)) E = E.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a)));
              else E.push([a, b]);
              sel = null;
            }
            draw();
          }
          function deleteSel() {
            if (sel === null) return;
            V = V.filter((v) => v.id !== sel);
            E = E.filter(([a, b]) => a !== sel && b !== sel);
            sel = null;
            draw();
          }
          function analyze() {
            const ids = V.map((v) => v.id);
            const deg = Object.fromEntries(ids.map((i) => [i, 0]));
            for (const [a, b] of E) { deg[a]++; deg[b]++; }
            const nb = (u) => E.filter(([a, b]) => a === u || b === u).map(([a, b]) => (a === u ? b : a));
            const comps = componentsOf(ids, nb);
            const compOf = {};
            comps.forEach((c, k) => c.forEach((v) => (compOf[v] = k)));
            const odd = ids.filter((i) => deg[i] % 2 === 1);
            const edgeComps = new Set(E.map(([a]) => compOf[a]));
            let verdict, kind, path = null;
            const L = (i) => byId(i).label;
            if (!E.length) { kind = 'info'; verdict = 'There are no edges yet, so there is nothing to trace. Add a few edges.'; }
            else if (edgeComps.size > 1) { kind = 'bad'; verdict = `The edges lie in ${edgeComps.size} different components, and no walk can jump between them. No Euler path or cycle exists.`; }
            else if (odd.length === 0) { kind = 'good'; verdict = 'The edges are connected and every degree is even, so an Euler cycle exists: a closed walk that uses every edge once. It can start at any vertex that has an edge.'; }
            else if (odd.length === 2) { kind = 'good'; verdict = `Exactly two vertices, ${L(odd[0])} and ${L(odd[1])}, have odd degree. An Euler path exists from one to the other, but no Euler cycle.`; }
            else { kind = 'bad'; verdict = `${odd.length} vertices have odd degree (${odd.map(L).join(', ')}). An Euler path allows at most two, so neither an Euler path nor an Euler cycle exists.`; }
            if (kind === 'good') {
              const ord = (id) => LET.indexOf(byId(id).label);
              const start = odd.length ? odd.slice().sort((x, y) => ord(x) - ord(y))[0] : E[0][0];
              path = eulerTrail(ids, E, start, ord);
            }
            return { deg, comps, compOf, odd, verdict, kind, path };
          }
          function drawSvg(A = analyze()) {
            const kids = [s('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 12, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.5 })];
            const order = {};
            if (trail && A.path) A.path.forEach(([, ei], k) => { if (ei >= 0) order[ei] = k; });
            E.forEach(([a, b], i) => {
              const p = byId(a), q = byId(b);
              kids.push(s('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: order[i] ? 'var(--accent)' : 'var(--ink-2)', 'stroke-width': order[i] ? 3.5 : 2.5, 'stroke-linecap': 'round' }));
            });
            E.forEach(([a, b], i) => {
              if (!order[i]) return;
              const p = byId(a), q = byId(b), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
              kids.push(s('circle', { cx: mx, cy: my, r: 10, fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': 2 }), s('text', { x: mx, y: my + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--accent-ink)', text: String(order[i]) }));
            });
            for (const v of V) {
              const col = `var(${COMP[A.compOf[v.id] % COMP.length]})`;
              const d = A.deg[v.id], odd = d % 2 === 1;
              kids.push(s('g', { class: 'gv', 'data-v': v.id, tabindex: 0, role: 'button', 'aria-label': `Vertex ${v.label}, degree ${d}`, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickVertex(v); } } },
                sel === v.id ? s('circle', { cx: v.x, cy: v.y, r: R + 6, fill: 'var(--mark)', stroke: 'var(--ink)', 'stroke-width': 1.5 }) : null,
                s('circle', { class: 'body', cx: v.x, cy: v.y, r: R, fill: 'var(--paper)', stroke: col, 'stroke-width': 3 }),
                s('text', { x: v.x, y: v.y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: v.label }),
                s('circle', { cx: v.x + R * 0.85, cy: v.y - R * 0.85, r: 8.5, fill: odd ? 'var(--false-bg)' : 'var(--true-bg)', stroke: odd ? 'var(--false)' : 'var(--true)', 'stroke-width': 1.2 }),
                s('text', { x: v.x + R * 0.85, y: v.y - R * 0.85 + 3.8, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: odd ? 'var(--false)' : 'var(--true)', text: String(d) })));
            }
            if (!V.length) kids.push(s('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'font-size': 15, fill: 'var(--ink-3)', text: 'Click anywhere to add a vertex' }));
            rc(svg, kids);
          }
          function draw() {
            const A = analyze();
            drawSvg(A);
            rc(toolbar,
              Object.keys(PRESETS).map((name) => h('button.btn.sm', { onclick: () => { load(name); draw(); } }, name)),
              h('button.btn.sm', { onclick: deleteSel, disabled: sel === null }, 'Delete selected'),
              h('button.btn.sm', { onclick: () => { V = []; E = []; sel = null; trail = false; msg = ''; draw(); } }, 'Clear'));
            const L = (i) => byId(i).label;
            const sorted = V.slice().sort((a, b) => a.label.localeCompare(b.label));
            const degSum = sorted.reduce((acc, v) => acc + A.deg[v.id], 0);
            const mat = h('table.gr-mat', h('thead', h('tr', h('th', ''), sorted.map((v) => h('th', { class: sel === v.id ? 'sel' : '' }, v.label)))),
              h('tbody', sorted.map((u) => h('tr', h('th', { class: sel === u.id ? 'sel' : '' }, u.label), sorted.map((v) => { const one = has(u.id, v.id); return h('td', { class: one ? 'one' : 'zero' }, one ? '1' : '0'); })))));
            rc(panel,
              h('div.gr-stats',
                h('div', h('b', String(V.length)), h('span', '|V| vertices')),
                h('div', h('b', String(E.length)), h('span', '|E| edges')),
                h('div', h('b', String(A.comps.length)), h('span', 'components'))),
              msg ? h('div.feedback.info', msg) : null,
              h('div', h('div.tiny.mono.muted', 'DEGREES'), h('div.gr-chips', sorted.length ? sorted.map((v) => h('span.chip', { class: A.deg[v.id] % 2 ? 'odd' : sel === v.id ? 'on' : '' }, `${v.label}: ${A.deg[v.id]}`)) : h('span.small.muted', 'no vertices'))),
              h('div.small', { html: V.length ? `<b>Handshake check:</b> ${sorted.map((v) => A.deg[v.id]).join(' + ')} = ${degSum} = 2 × ${E.length} edges <span class="ok">✓</span><br><span class="muted">Odd-degree vertices: ${A.odd.length ? A.odd.map(L).join(', ') : 'none'} (${A.odd.length}, always an even count)</span>` : '<span class="muted">Add vertices to see the handshake theorem at work.</span>' }),
              V.length ? h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.15rem' } }, 'ADJACENCY MATRIX (1 = EDGE)'), mat) : null,
              h('div.feedback', { class: A.kind }, A.verdict),
              A.path ? h('div.row', { style: { gap: '0.4rem' } },
                h('button.btn.sm', { 'aria-pressed': String(trail), class: trail ? 'on' : '', onclick: () => { trail = !trail; draw(); } }, trail ? 'Hide the Euler trail' : 'Show an Euler trail'),
                trail ? h('span.small.mono', A.path.map(([v]) => L(v)).join(' → ')) : null) : null);
          }
          load('Envelope');
          draw();
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Paths, connectedness, and Euler cycles',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">path</span> of length \(k\) from \(v_0\) to \(v_k\) is a sequence of vertices \(v_0, v_1, \dots, v_k\) in which each consecutive pair is joined by an edge. The length counts edges. A <b>simple path</b> repeats no vertex.</div>
              <div class="def">A <span class="term">cycle</span> is a path of nonzero length that starts and ends at the same vertex and repeats no edge. A <b>simple cycle</b> repeats no vertex either, apart from the shared start and end.</div>
              <div class="def">A graph is <span class="term" data-term="connected graph">connected</span> if every pair of vertices is joined by a path. The largest connected pieces of a graph are its <b>components</b>. The "Two pieces" preset in the editor has two components.</div>
              <div class="ai">Genome assemblers read millions of short, overlapping DNA fragments. They build a graph whose edges are the fragments and rebuild the genome as an Euler path through it, which degree counts make fast to find.</div>
            </div>
            <div class="stack">
              <div class="def">An <span class="term">Euler cycle</span> uses every edge exactly once and returns to its start. An <b>Euler path</b> uses every edge exactly once but may end at a different vertex.</div>
              <div class="thm"><b>Euler's theorem.</b> Let \(G\) be a connected graph.
                <ul style="margin-top:0.25rem">
                  <li>\(G\) has an Euler cycle if and only if every vertex has even degree.</li>
                  <li>\(G\) has an Euler path from \(v\) to \(w \neq v\), but no Euler cycle, if and only if \(v\) and \(w\) are the only vertices of odd degree.</li>
                </ul></div>
              <div class="why"><b>Why degrees decide.</b> Each time a walk passes through a vertex it uses one edge to arrive and another to leave: two edge ends at a time. Only the start and the end of an open walk can be left with an unmatched edge end. So more than two odd vertices make the walk impossible.</div>
              <div class="ex">Königsberg (1736): four land masses joined by seven bridges have degrees 5, 3, 3 and 3. All four are odd, so no walk crosses every bridge exactly once. Euler's argument started graph theory. Try it yourself on the next slide.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Lab: the bridges of Königsberg',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click a land mass to choose where your walk starts, then click bridges to cross them. Each bridge may be crossed once. Orange bridges are the ones you can take from where you stand. When you get stuck, open the explanation, or add an eighth bridge and try again.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const LAND = { N: { name: 'North bank', x: 300, y: 52 }, S: { name: 'South bank', x: 300, y: 330 }, I: { name: 'Island', x: 215, y: 190 }, E: { name: 'East land', x: 520, y: 190 } };
          const BR = [
            { id: 'a', u: 'N', v: 'I', x: 165, y1: 108, y2: 156 }, { id: 'b', u: 'N', v: 'I', x: 265, y1: 108, y2: 156 },
            { id: 'c', u: 'S', v: 'I', x: 165, y1: 224, y2: 272 }, { id: 'd', u: 'S', v: 'I', x: 265, y1: 224, y2: 272 },
            { id: 'e', u: 'I', v: 'E', y: 190, x1: 306, x2: 430 },
            { id: 'f', u: 'N', v: 'E', x: 515, y1: 108, y2: 152 }, { id: 'g', u: 'S', v: 'E', x: 515, y1: 228, y2: 272 },
            { id: 'h', u: 'N', v: 'S', x: 58, y1: 108, y2: 272, extra: true },
          ];
          const mid = (b) => (b.y !== undefined ? [(b.x1 + b.x2) / 2, b.y] : [b.x, (b.y1 + b.y2) / 2]);
          let eight = false, pos = null, used = [], graphView = false, explain = false;
          const bridges = () => BR.filter((b) => eight || !b.extra);
          const other = (b, at) => (b.u === at ? b.v : b.u);
          const avail = () => (pos ? bridges().filter((b) => !used.includes(b.id) && (b.u === pos || b.v === pos)) : []);
          const svg = s('svg', { viewBox: '0 0 600 380', role: 'group', 'aria-label': 'Map of Königsberg with river, land masses and bridges; land masses and bridges are buttons' });
          const side = h('div.gr-panel');
          body.append(h('div.gr-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)' } }, h('div.figure', { style: { minHeight: 0, alignItems: 'start' } }, svg), side));
          function cross(b) {
            if (!pos) return;
            if (used.includes(b.id) || !(b.u === pos || b.v === pos)) return;
            used.push(b.id);
            pos = other(b, pos);
            draw();
          }
          function draw() {
            const av = new Set(avail().map((b) => b.id));
            const map = s('g', { opacity: graphView ? 0.28 : 1 },
              s('rect', { x: 0, y: 0, width: 600, height: 380, fill: 'var(--sheet)' }),
              s('rect', { x: 0, y: 110, width: 600, height: 160, fill: 'var(--fnc)', 'fill-opacity': 0.2 }),
              s('ellipse', { cx: 215, cy: 190, rx: 95, ry: 44, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.5 }),
              s('path', { d: 'M600 148 L472 148 Q428 148 428 190 Q428 232 472 232 L600 232 Z', fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.5 }),
              s('text', { x: 390, y: 258, 'text-anchor': 'middle', 'font-size': 11.5, 'font-style': 'italic', fill: 'var(--fnc)', text: 'river Pregel' }));
            // land hit areas and labels
            const lands = Object.entries(LAND).map(([k, L]) => s('text', { x: L.x, y: L.y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: pos === k ? 'var(--accent)' : 'var(--ink-2)', text: `${L.name} (${k})` }));
            const landHits = [
              ['N', s('rect', { x: 0, y: 0, width: 600, height: 106 })], ['S', s('rect', { x: 0, y: 274, width: 600, height: 106 })],
              ['I', s('ellipse', { cx: 215, cy: 190, rx: 92, ry: 41 })], ['E', s('path', { d: 'M600 151 L472 151 Q431 151 431 190 Q431 229 472 229 L600 229 Z' })],
            ].map(([k, el]) => { el.setAttribute('fill', 'var(--paper)'); el.setAttribute('fill-opacity', '0'); el.setAttribute('class', 'gr-hit'); el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', `Start on the ${LAND[k].name}`); const go = () => { if (!used.length) { pos = k; draw(); } }; el.addEventListener('click', go); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); return el; });
            const brEls = bridges().map((b) => {
              const k = used.indexOf(b.id);
              const vertical = b.y === undefined;
              const fill = k >= 0 ? 'var(--accent)' : av.has(b.id) ? 'var(--warn)' : 'var(--ink-3)';
              const rect = vertical ? { x: b.x - 9, y: b.y1, width: 18, height: b.y2 - b.y1 } : { x: b.x1, y: b.y - 9, width: b.x2 - b.x1, height: 18 };
              const hit = vertical ? { x: b.x - 18, y: b.y1, width: 36, height: b.y2 - b.y1 } : { x: b.x1, y: b.y - 18, width: b.x2 - b.x1, height: 36 };
              const [mx, my] = mid(b);
              const go = () => cross(b);
              return s('g', {},
                s('rect', { ...rect, rx: 3, fill, stroke: 'var(--sheet)', 'stroke-width': 2 }),
                k >= 0 ? s('circle', { cx: mx, cy: my, r: 9, fill: 'var(--accent-ink)', stroke: 'var(--accent)', 'stroke-width': 1.5 }) : null,
                k >= 0 ? s('text', { x: mx, y: my + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--accent)', text: String(k + 1) }) : null,
                s('text', { x: vertical ? b.x + 14 : mx, y: vertical ? my + 4 : b.y - 14, 'text-anchor': vertical ? 'start' : 'middle', 'font-size': 12, 'font-weight': 700, 'font-style': 'italic', fill: 'var(--ink-2)', text: b.id }),
                s('rect', { ...hit, class: 'gr-hit', fill: 'var(--paper)', 'fill-opacity': 0, tabindex: 0, role: 'button', 'aria-label': `Bridge ${b.id} between ${LAND[b.u].name} and ${LAND[b.v].name}`, onclick: go, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } } }));
            });
            const walker = pos ? s('g', {}, s('circle', { cx: LAND[pos].x, cy: LAND[pos].y - 24, r: 10, fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': 2 }), s('text', { x: LAND[pos].x, y: LAND[pos].y - 20, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--accent-ink)', text: '★' })) : null;
            let overlay = null;
            if (graphView) {
              const P = { N: [300, 40], S: [300, 340], I: [215, 190], E: [520, 190] };
              const deg = { N: 0, S: 0, I: 0, E: 0 };
              bridges().forEach((b) => { deg[b.u]++; deg[b.v]++; });
              overlay = s('g', {},
                bridges().map((b) => { const [mx, my] = mid(b); const [x0, y0] = P[b.u], [x2, y2] = P[b.v]; const cx = 2 * mx - (x0 + x2) / 2, cy = 2 * my - (y0 + y2) / 2; return s('path', { d: `M${x0} ${y0} Q${cx} ${cy} ${x2} ${y2}`, fill: 'none', stroke: used.includes(b.id) ? 'var(--accent)' : 'var(--ink)', 'stroke-width': 2.5 }); }),
                Object.entries(P).map(([k, [x, y]]) => s('g', {}, s('circle', { cx: x, cy: y, r: 19, fill: deg[k] % 2 ? 'var(--false-bg)' : 'var(--true-bg)', stroke: deg[k] % 2 ? 'var(--false)' : 'var(--true)', 'stroke-width': 2.5 }), s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: k }), s('text', { x: x + 25, y: y - 14, 'font-size': 12, 'font-weight': 700, fill: deg[k] % 2 ? 'var(--false)' : 'var(--true)', text: `deg ${deg[k]}` }))));
            }
            rc(svg, map, graphView ? s('g', { opacity: 0.28 }, lands) : lands, graphView ? null : landHits, graphView ? null : brEls, graphView ? null : walker, overlay);
            // side panel
            const total = bridges().length;
            const stuck = pos && used.length < total && !avail().length;
            const done = used.length === total;
            let walk = '';
            if (pos) { let at = null; const seq = []; const start = used.length ? (() => { let p = pos; for (let i = used.length - 1; i >= 0; i--) p = other(BR.find((b) => b.id === used[i]), p); return p; })() : pos; at = start; seq.push(at); for (const id of used) { at = other(BR.find((b) => b.id === id), at); seq.push(`–${id}→`, at); } walk = seq.join(' '); }
            const deg = { N: 0, S: 0, I: 0, E: 0 };
            bridges().forEach((b) => { deg[b.u]++; deg[b.v]++; });
            const oddL = Object.keys(deg).filter((k) => deg[k] % 2);
            rc(side,
              h('div.seg', { style: { alignSelf: 'start' } },
                h('button', { 'aria-pressed': String(!eight), onclick: () => { eight = false; pos = null; used = []; draw(); } }, '7 bridges (1736)'),
                h('button', { 'aria-pressed': String(eight), onclick: () => { eight = true; pos = null; used = []; draw(); } }, 'Add bridge h')),
              h('div.row', { style: { gap: '0.3rem' } },
                h('button.btn.sm', { onclick: () => { if (used.length) { const id = used.pop(); pos = other(BR.find((b) => b.id === id), pos); } else pos = null; draw(); }, disabled: !pos }, 'Undo'),
                h('button.btn.sm', { onclick: () => { pos = null; used = []; draw(); } }, 'Restart'),
                h('button.btn.sm', { 'aria-pressed': String(graphView), class: graphView ? 'on' : '', onclick: () => { graphView = !graphView; draw(); } }, graphView ? 'Show the map' : 'Show as a graph'),
                h('button.btn.sm', { 'aria-pressed': String(explain), class: explain ? 'on' : '', onclick: () => { explain = !explain; draw(); } }, explain ? 'Hide explanation' : 'Explain')),
              h('div.card', { style: { padding: '0.5rem 0.7rem' } },
                h('div.tiny.mono.muted', `BRIDGES CROSSED: ${used.length} OF ${total}`),
                h('div.mono.small', { style: { marginTop: '0.2rem', wordBreak: 'break-word' } }, pos ? walk : 'Click a land mass to start.'),
                h('p.tiny.muted', { style: { marginTop: '0.25rem' } }, `Goal: cross all ${total} bridges, each exactly once. You may finish anywhere.`)),
              stuck ? h('div.feedback.bad', `Stuck on the ${LAND[pos].name}: every bridge from here is used, but ${total - used.length} bridge${total - used.length === 1 ? '' : 's'} (${bridges().filter((b) => !used.includes(b.id)).map((b) => b.id).join(', ')}) remain${total - used.length === 1 ? 's' : ''}.`) : null,
              done ? h('div.feedback.good', eight ? `You crossed all ${total} bridges exactly once. With bridge h, only the Island and East land have odd degree, so an Euler path from one to the other exists.` : 'All bridges crossed.') : null,
              explain ? h('div.card.stack', { style: { gap: '0.35rem', padding: '0.5rem 0.7rem' } },
                h('table.tt', { style: { width: '100%' } }, h('thead', h('tr', h('th.l', 'Land mass'), h('th', 'Bridges touching it'), h('th', 'Parity'))),
                  h('tbody', Object.keys(LAND).map((k) => h('tr', h('td.l', `${LAND[k].name} (${k})`), h('td', String(deg[k])), h('td', { class: deg[k] % 2 ? 'bad' : 'ok' }, deg[k] % 2 ? 'odd' : 'even'))))),
                h('p.small', eight
                  ? `With bridge h, ${oddL.length} land masses (${oddL.join(' and ')}) have odd degree. Euler's theorem says an Euler path exists and must start at one of them and end at the other. Start on the ${LAND[oddL[0]].name} and try again.`
                  : 'Every time you walk through a land mass you use two bridges: one in, one out. So every land mass except where you start and where you finish needs an even number of bridges. Here all four have an odd number. At most two can be the start and the finish, so the walk is impossible, however you try.')) : null);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- worked example: Euler audit */
      {
        title: 'Worked example: Euler audit and building a circuit',
        kind: 'example',
        id: 'ex-euler-audit',
        objective: 'Audit the degree parity of every vertex to decide whether an Euler trail exists, then trace a circuit edge by edge, marking each edge used exactly once.',
        problem: '<p>Two triangles share the vertex C: the edges are A-B, B-C, C-A, C-D, D-E and E-C. First audit every degree, then either build an Euler circuit that uses every edge exactly once or explain why none exists.</p>',
        data: EX_EUL_DATA,
        steps: eulerStepsFor(EX_EUL_DATA),
        answer: EX_EUL_DATA.answer,
        verify(M) {
          const E = [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D'], ['D', 'E'], ['E', 'C']];
          const deg = {}; E.forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; });
          const key = (a, b) => [a, b].sort().join('-');
          const c = EX_EUL_DATA.answer.circuit;
          const used = c.slice(1).map((v, i) => key(c[i], v)).sort();
          const want = E.map(([a, b]) => key(a, b)).sort();
          return EX_EUL_DATA.answer.verdict === 'circuit' && Object.values(deg).every((d) => d % 2 === 0)
            && c[0] === c[c.length - 1] && c.length === E.length + 1 && JSON.stringify(used) === JSON.stringify(want);
        },
        variants: [{
          label: 'Variant: four odd vertices',
          problem: '<p>The complete graph K4 has vertices A, B, C, D and all six edges A-B, A-C, A-D, B-C, B-D and C-D. First audit every degree, then either build an Euler trail that uses every edge exactly once or explain why none exists.</p>',
          data: VAR_EUL_DATA,
          steps: eulerStepsFor(VAR_EUL_DATA),
          answer: VAR_EUL_DATA.answer,
          verify(M) {
            const E = [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']];
            const deg = {}; E.forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; });
            const odd = ['A', 'B', 'C', 'D'].filter((v) => deg[v] % 2 === 1);
            return VAR_EUL_DATA.answer.verdict === 'none' && odd.length === 4 && VAR_EUL_DATA.circuit === null
              && JSON.stringify(VAR_EUL_DATA.answer.odd) === JSON.stringify(odd) && E.length === 6;
          },
        }],
        draw(stage, ctx, step, k, preset) {
          const { h, s, rc } = ctx;
          const D = (preset && preset.data) || EX_EUL_DATA;
          const usedEdges = new Set(D.edgeOrder.slice(0, step.u));
          const numOf = new Map(D.edgeOrder.slice(0, step.u).map((ei, i) => [ei, i + 1]));
          const kids = [];
          D.edges.forEach(([a, b], ei) => {
            kids.push(s('line', { x1: D.pos[a][0], y1: D.pos[a][1], x2: D.pos[b][0], y2: D.pos[b][1], stroke: usedEdges.has(ei) ? 'var(--accent)' : 'var(--rule)', 'stroke-width': usedEdges.has(ei) ? 4.5 : 2.2, 'stroke-linecap': 'round' }));
            if (numOf.has(ei)) {
              const mx = (D.pos[a][0] + D.pos[b][0]) / 2, my = (D.pos[a][1] + D.pos[b][1]) / 2;
              kids.push(s('circle', { cx: mx, cy: my, r: 10, fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': 2 }), s('text', { x: mx, y: my + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--accent-ink)', text: String(numOf.get(ei)) }));
            }
          });
          for (const v of D.verts) {
            const [x, y] = D.pos[v];
            const audited = D.verts.indexOf(v) < step.a, oddDeg = D.deg[v] % 2 === 1;
            kids.push(s('g', {},
              s('circle', { cx: x, cy: y, r: 20, fill: audited ? (oddDeg ? 'var(--false-bg)' : 'var(--accent-2)') : 'var(--sheet)', stroke: audited ? (oddDeg ? 'var(--false)' : 'var(--accent)') : 'var(--ink-3)', 'stroke-width': audited ? 3 : 1.5 }),
              s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: v }),
              audited ? s('text', { x, y: y + 38, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 600, fill: oddDeg ? 'var(--false)' : 'var(--ink-2)', text: `deg ${D.deg[v]}${oddDeg ? ' odd' : ' even'}` }) : null));
          }
          const svg = s('svg', { viewBox: '0 0 520 230', role: 'img', 'aria-label': 'Graph for the Euler audit, with audited degrees below the vertices and used edges numbered', style: 'width:min(34rem,100%);height:auto' });
          rc(svg, kids);
          const oddSoFar = D.verts.slice(0, step.a).filter((v) => D.deg[v] % 2 === 1).length;
          const status = h('p.small.mono', { style: { margin: 0, textAlign: 'center' } }, step.u > 0 && D.circuit
            ? `Trail so far: ${D.circuit.slice(0, step.u + 1).join('-')} · ${step.u} of ${D.edges.length} edges used`
            : `Audited ${step.a} of ${D.verts.length} vertices · odd-degree count so far: ${oddSoFar}`);
          const banner = step.answer ? h('div.ex-answer', D.circuit
            ? `Answer: all degrees even · Euler circuit ${D.circuit.join('-')} · check: the numbered edges run 1 to ${D.edges.length} with no repeat, and the trail ends back at ${D.circuit[0]} ✓`
            : `Answer: no Euler trail or circuit · odd-degree vertices: ${D.odd.join(', ')} (${D.odd.length} of them) · check: a trail can have at most 2 odd ends, and ${D.odd.length} is more than 2 ✓`) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.4rem' } }, svg, status, banner));
        },
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Representing a graph in a computer',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="row" style="align-items:center;gap:1rem;flex-wrap:nowrap">
                <div style="flex:none">${FIG_REP}</div>
                <table class="tt" style="font-size:0.85rem">
                  <thead><tr><th>A</th><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead>
                  <tbody><tr><th>a</th><td>0</td><td>1</td><td>1</td><td>0</td></tr><tr><th>b</th><td>1</td><td>0</td><td>1</td><td>0</td></tr><tr><th>c</th><td>1</td><td>1</td><td>0</td><td>1</td></tr><tr><th>d</th><td>0</td><td>0</td><td>1</td><td>0</td></tr></tbody>
                </table>
                <div class="mono small" style="line-height:1.7">a: b, c<br>b: a, c<br>c: a, b, d<br>d: c</div>
              </div>
              <p class="small">The <span class="term">adjacency matrix</span> (middle) has a 1 in row \(i\), column \(j\) when \(v_i\) and \(v_j\) are adjacent. For an undirected graph it is symmetric, and each row sums to that vertex's degree. The <span class="term">adjacency list</span> (right) stores only the neighbors of each vertex.</p>
              <table class="tt" style="width:100%;font-size:0.82rem">
                <thead><tr><th class="l">Task</th><th>Matrix</th><th>List</th></tr></thead>
                <tbody>
                  <tr><td class="l">memory</td><td>\(|V|^2\) entries</td><td>\(|V| + 2|E|\) entries</td></tr>
                  <tr><td class="l">is \(u\) adjacent to \(v\)?</td><td>one lookup</td><td>scan \(u\)'s list</td></tr>
                  <tr><td class="l">list the neighbors of \(u\)</td><td>scan a whole row</td><td>\(\deg(u)\) steps</td></tr>
                  <tr><td class="l">best for</td><td>small or dense graphs</td><td>sparse graphs (most real ones)</td></tr>
                </tbody>
              </table>
              <div class="warn">A social network with 100 million users and about 200 friends each would need \(10^{16}\) matrix cells, almost all zero. Its adjacency list needs about \(2 \times 10^{10}\) entries. Match the representation to the density of the graph.</div>
            </div>
            <div class="stack">
              <div class="thm"><b>Powers of the adjacency matrix count walks.</b> The entry in row \(i\), column \(j\) of \(A^k\) is the number of walks of length \(k\) from \(v_i\) to \(v_j\). (A walk may repeat vertices and edges.)</div>
              <div class="ex">For the graph on the left,
                \[A^2 = \begin{pmatrix} 2 & 1 & 1 & 1 \\ 1 & 2 & 1 & 1 \\ 1 & 1 & 3 & 0 \\ 1 & 1 & 0 & 1 \end{pmatrix}\]
                Row a, column d is 1: the single walk a → c → d. The diagonal holds the degrees, because a walk of length 2 from a vertex back to itself goes out along one edge and straight back.</div>
              <div class="ai">A graph neural network layer updates every node from its neighbors by multiplying the feature table by \(A\). Stacking \(k\) layers mixes in information from \(k\) steps away, exactly the walks that \(A^k\) counts.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- worked example: representation */
      {
        title: 'Worked example: adjacency list, degrees and a path',
        kind: 'example',
        id: 'ex-rep-degrees-path',
        objective: 'Build the adjacency list of a small graph from its picture, read every degree off the list, check the handshake sum, and use the list to settle a path question.',
        problem: '<p>The graph has vertices A, B, C, D, E and edges A-B, A-C, B-C, B-D, C-D and D-E. Build its adjacency list, give the degree of every vertex and check the handshake sum, then decide: is there a path from A to E, and if so, exhibit one?</p>',
        data: EX_REP_DATA,
        steps: repStepsFor(EX_REP_DATA),
        answer: EX_REP_DATA.answer,
        verify(M) {
          // independent check: adjacency matrix row sums for degrees, Warshall closure for reachability
          const V = ['A', 'B', 'C', 'D', 'E'], E = [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E']];
          const ix = Object.fromEntries(V.map((v, i) => [v, i]));
          const A = V.map(() => V.map(() => 0));
          E.forEach(([a, b]) => { A[ix[a]][ix[b]] = 1; A[ix[b]][ix[a]] = 1; });
          const deg = Object.fromEntries(V.map((v, i) => [v, A[i].reduce((s, x) => s + x, 0)]));
          const reach = A.map((row, i) => row.map((x, j) => x === 1 || i === j));
          for (const k2 of V) for (const i of V) for (const j of V) reach[ix[i]][ix[j]] = reach[ix[i]][ix[j]] || (reach[ix[i]][ix[k2]] && reach[ix[k2]][ix[j]]);
          const ans = EX_REP_DATA.answer, p = ans.path;
          const pathOk = p && p[0] === 'A' && p[p.length - 1] === 'E' && p.slice(1).every((v, i) => A[ix[p[i]]][ix[v]] === 1);
          return V.every((v) => deg[v] === ans.deg[v] && JSON.stringify(A[ix[v]].map((x, j) => (x ? V[j] : null)).filter(Boolean)) === JSON.stringify(ans.adj[v]))
            && ans.edges === E.length && reach[ix.A][ix.E] && pathOk;
        },
        variants: [{
          label: 'Variant: an isolated vertex',
          problem: '<p>The graph has vertices A, B, C, D, E and edges A-B, A-C, B-D and C-D, so E touches no edge at all. Build its adjacency list, give the degree of every vertex and check the handshake sum, then decide: is there a path from A to E, and if so, exhibit one?</p>',
          data: VAR_REP_DATA,
          steps: repStepsFor(VAR_REP_DATA),
          answer: VAR_REP_DATA.answer,
          verify(M) {
            const V = ['A', 'B', 'C', 'D', 'E'], E = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']];
            const ix = Object.fromEntries(V.map((v, i) => [v, i]));
            const A = V.map(() => V.map(() => 0));
            E.forEach(([a, b]) => { A[ix[a]][ix[b]] = 1; A[ix[b]][ix[a]] = 1; });
            const deg = Object.fromEntries(V.map((v, i) => [v, A[i].reduce((s, x) => s + x, 0)]));
            const reach = A.map((row, i) => row.map((x, j) => x === 1 || i === j));
            for (const k2 of V) for (const i of V) for (const j of V) reach[ix[i]][ix[j]] = reach[ix[i]][ix[j]] || (reach[ix[i]][ix[k2]] && reach[ix[k2]][ix[j]]);
            const ans = VAR_REP_DATA.answer;
            return V.every((v) => deg[v] === ans.deg[v]) && ans.edges === E.length && ans.path === null && !reach[ix.A][ix.E] && deg.E === 0 && ans.adj.E.length === 0;
          },
        }],
        draw(stage, ctx, step, k, preset) {
          const { h, s, rc } = ctx;
          const D = (preset && preset.data) || EX_REP_DATA;
          const onPath = new Set();
          if (step.ph === 3 && D.path) for (let i = 1; i < D.path.length; i++) onPath.add([D.path[i - 1], D.path[i]].sort().join());
          const inComp = new Set(D.comp);
          const kids = [];
          for (const [a, b] of D.edges) {
            const key = [a, b].sort().join();
            const hot = onPath.has(key) || (step.ph === 3 && !D.path && inComp.has(a) && inComp.has(b));
            kids.push(s('line', { x1: D.pos[a][0], y1: D.pos[a][1], x2: D.pos[b][0], y2: D.pos[b][1], stroke: hot ? 'var(--accent)' : 'var(--rule)', 'stroke-width': hot ? 4.5 : 2.2, 'stroke-linecap': 'round' }));
          }
          for (const v of D.verts) {
            const [x, y] = D.pos[v];
            const marked = step.ph >= 2 && (v === D.src || v === D.tgt);
            const reached = step.ph === 3 && inComp.has(v);
            kids.push(s('g', {},
              marked ? s('circle', { cx: x, cy: y, r: 27, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2 }) : null,
              s('circle', { cx: x, cy: y, r: 20, fill: reached ? 'var(--accent)' : 'var(--sheet)', 'fill-opacity': reached ? 0.3 : 1, stroke: reached ? 'var(--accent)' : 'var(--ink-3)', 'stroke-width': reached ? 3 : 1.5 }),
              s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: v }),
              step.ph >= 1 ? s('text', { x, y: y + 38, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink-2)', text: `deg ${D.deg[v]}` }) : null,
              marked ? s('text', { x, y: y - 31, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--ink)', text: v === D.src ? '▼ from' : '▼ to' }) : null));
          }
          const svg = s('svg', { viewBox: '0 0 520 240', role: 'img', 'aria-label': 'Graph being written as an adjacency list, with degrees shown once counted', style: 'width:min(34rem,100%);height:auto' });
          rc(svg, kids);
          const rows = D.verts.slice(0, step.b).map((v) => h('div.mono.small', `${v}: ${D.adj[v].length ? D.adj[v].join(', ') : '(no neighbors)'}`));
          const list = h('div', { style: { width: '100%' } }, h('div.tiny.mono.muted', 'ADJACENCY LIST'), rows.length ? rows : h('div.small.muted', 'no rows written yet'));
          const degs = step.ph >= 1 ? h('div', { style: { width: '100%' } }, h('div.tiny.mono.muted', 'DEGREES AND HANDSHAKE CHECK'),
            h('div.gr-chips', D.verts.map((v) => h('span.chip', `${v}: ${D.deg[v]}`))),
            h('div.small.mono', `${D.verts.map((v) => D.deg[v]).join(' + ')} = ${D.verts.reduce((sm, v) => sm + D.deg[v], 0)} = 2 x ${D.edges.length} edges`)) : null;
          const banner = step.answer ? h('div.ex-answer', D.path
            ? `Answer: degrees ${D.verts.map((v) => `${v} ${D.deg[v]}`).join(', ')} · sum ${D.verts.reduce((sm, v) => sm + D.deg[v], 0)} = 2 x ${D.edges.length} · path from ${D.src} to ${D.tgt}: ${D.path.join('-')} ✓`
            : `Answer: degrees ${D.verts.map((v) => `${v} ${D.deg[v]}`).join(', ')} · sum ${D.verts.reduce((sm, v) => sm + D.deg[v], 0)} = 2 x ${D.edges.length} · no path from ${D.src} to ${D.tgt}: ${D.tgt} has degree 0 and the reachable set is {${D.comp.join(', ')}} ✓`) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.4rem' } }, svg, list, degs, banner));
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Lab: breadth-first versus depth-first search',
        kind: 'lab',
        html: String.raw`<p class="muted small">Both searches visit every vertex reachable from the start. <b>Breadth-first search</b> (BFS) keeps a queue and spreads out in rings of equal distance. <b>Depth-first search</b> (DFS) keeps a stack and dives as deep as it can before backing up. Click a vertex to start there, then step through and watch the container.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const P = { A: [70, 72], B: [205, 52], C: [340, 72], D: [470, 62], E: [110, 195], F: [255, 185], G: [395, 205], H: [175, 315], I: [335, 315] };
          const ED = [['A', 'B'], ['A', 'E'], ['B', 'C'], ['B', 'F'], ['C', 'D'], ['C', 'G'], ['E', 'F'], ['E', 'H'], ['F', 'G'], ['F', 'I'], ['G', 'D'], ['H', 'I']];
          const NAMES = Object.keys(P);
          const adj = Object.fromEntries(NAMES.map((v) => [v, []]));
          ED.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
          NAMES.forEach((v) => adj[v].sort());
          let mode = 'BFS', start = 'A', steps = [], at = 0;
          function simulate(m, st0) {
            const out = [];
            if (m === 'BFS') {
              const dist = { [st0]: 0 }, parent = {}, order = [], q = [st0];
              out.push({ cur: null, cont: [...q], order: [], dist: { ...dist }, parent: {}, note: `Start: put ${st0} in the queue and mark it discovered at distance 0.` });
              while (q.length) {
                const u = q.shift(); order.push(u);
                const add = adj[u].filter((w) => !(w in dist));
                add.forEach((w) => { dist[w] = dist[u] + 1; parent[w] = u; q.push(w); });
                const seen = adj[u].filter((w) => !add.includes(w));
                out.push({ cur: u, cont: [...q], order: [...order], dist: { ...dist }, parent: { ...parent }, note: `Dequeue ${u} from the front and visit it. ${add.length ? `Its undiscovered neighbors ${add.join(', ')} join the back of the queue at distance ${dist[u] + 1}.` : 'It has no undiscovered neighbors.'}${seen.length ? ` (${seen.join(', ')} already discovered.)` : ''}` });
              }
            } else {
              const stack = [{ v: st0, from: null }], order = [], parent = {}, seen = new Set();
              out.push({ cur: null, cont: [st0], stale: [], order: [], parent: {}, note: `Start: push ${st0} onto the stack.` });
              while (stack.length) {
                const { v, from } = stack.pop();
                if (seen.has(v)) {
                  out.push({ cur: v, skip: true, cont: stack.map((x) => x.v), order: [...order], parent: { ...parent }, note: `Pop ${v} from the top: it is already visited, so skip it. (It was pushed twice, by two different neighbors.)` });
                  continue;
                }
                seen.add(v); order.push(v); if (from) parent[v] = from;
                const push = adj[v].filter((w) => !seen.has(w)).reverse();
                push.forEach((w) => stack.push({ v: w, from: v }));
                out.push({ cur: v, cont: stack.map((x) => x.v), order: [...order], parent: { ...parent }, note: `Pop ${v} from the top and visit it (#${order.length}). ${push.length ? `Push its unvisited neighbors ${push.join(', ')}, so ${push[push.length - 1]} is on top and is explored next.` : 'It has no unvisited neighbors, so the search backs up.'}` });
              }
            }
            return out;
          }
          const svg = s('svg', { class: 'gr-svg', viewBox: '0 0 540 370', role: 'group', 'aria-label': 'Graph being searched; every vertex is a button that restarts the search there' });
          const side = h('div.gr-panel');
          body.append(h('div.gr-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)' } }, h('div.figure', { style: { minHeight: 0, alignItems: 'start' } }, svg), side));
          function reset() { steps = simulate(mode, start); at = 0; }
          const playBtn = h('button.btn.sm.primary', { onclick: () => play() });
          const player = ctx.ticker({ ms: 750, button: playBtn, tick: () => { if (at >= steps.length - 1) return false; at++; draw(); return at < steps.length - 1; } });
          function play() {
            if (player.playing) { player.stop(); draw(); return; }
            if (at >= steps.length - 1) at = 0;
            player.start();
            draw();
          }
          function draw() {
            const st = steps[at];
            const visited = new Set(st.order);
            const inCont = new Set(st.cont.filter((v) => !visited.has(v)));
            const kids = [];
            for (const [a, b] of ED) {
              const tree = st.parent[b] === a || st.parent[a] === b;
              kids.push(s('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: tree ? 'var(--accent)' : 'var(--rule)', 'stroke-width': tree ? 4.5 : 2.2, 'stroke-linecap': 'round' }));
            }
            for (const v of NAMES) {
              const [x, y] = P[v];
              const isV = visited.has(v), isC = inCont.has(v), cur = st.cur === v;
              const go = () => { player.stop(); start = v; reset(); draw(); };
              kids.push(s('g', { class: 'gv', tabindex: 0, role: 'button', 'aria-label': `Start at ${v}`, onclick: go, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } } },
                cur ? s('circle', { cx: x, cy: y, r: 27, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2, 'stroke-dasharray': st.skip ? '4 3' : null }) : null,
                s('circle', { cx: x, cy: y, r: 20, fill: 'var(--paper)', stroke: 'none' }),
                s('circle', { class: 'body', cx: x, cy: y, r: 20, fill: isV ? 'var(--accent)' : isC ? 'var(--warn-bg)' : 'var(--sheet)', 'fill-opacity': isV ? 0.3 : 1, stroke: isV ? 'var(--accent)' : isC ? 'var(--warn)' : 'var(--ink-3)', 'stroke-width': isV || isC ? 3 : 1.5 }),
                s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: v }),
                v === start ? s('text', { x, y: y - 27, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: 'var(--accent)', text: 'START' }) : null,
                mode === 'BFS' && st.dist[v] !== undefined ? s('text', { x: x + 23, y: y + 22, 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink-2)', text: `d=${st.dist[v]}` }) : null,
                mode === 'DFS' && isV ? s('text', { x: x + 23, y: y + 22, 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink-2)', text: `#${st.order.indexOf(v) + 1}` }) : null));
            }
            rc(svg, kids);
            const full = { BFS: simulate('BFS', start).at(-1).order.join(' '), DFS: simulate('DFS', start).at(-1).order.join(' ') };
            const cont = mode === 'BFS'
              ? h('div.gr-box', h('span.end', 'front →'), st.cont.length ? st.cont.map((v) => h('span.cell', v)) : h('span.small.muted', 'empty'), h('span.end', '← back'))
              : h('div.gr-box', h('span.end', 'bottom'), st.cont.length ? st.cont.map((v) => h('span.cell', { class: visited.has(v) ? 'stale' : '' }, v)) : h('span.small.muted', 'empty'), h('span.end', '← top'));
            rc(side,
              h('div.gr-ctl',
                h('span', 'Search'), h('div.seg', ['BFS', 'DFS'].map((m) => h('button', { 'aria-pressed': String(m === mode), onclick: () => { player.stop(); mode = m; reset(); draw(); } }, m === 'BFS' ? 'Breadth-first (queue)' : 'Depth-first (stack)'))),
                h('span', 'Start'), h('div.seg', NAMES.map((v) => h('button', { 'aria-pressed': String(v === start), onclick: () => { player.stop(); start = v; reset(); draw(); } }, v)))),
              h('div.row', { style: { gap: '0.3rem' } },
                h('button.btn.sm', { onclick: () => { player.stop(); at = Math.max(0, at - 1); draw(); } }, '◀ Back'),
                h('button.btn.sm', { onclick: () => { player.stop(); at = Math.min(steps.length - 1, at + 1); draw(); } }, 'Step ▶'),
                playBtn,
                h('button.btn.sm', { onclick: () => { player.stop(); at = 0; draw(); } }, 'Reset'),
                h('span.tiny.muted', `step ${at} of ${steps.length - 1}`)),
              h('div', h('div.tiny.mono.muted', mode === 'BFS' ? 'QUEUE: FIRST IN, FIRST OUT' : 'STACK: LAST IN, FIRST OUT (crossed out = already visited)'), cont),
              h('div', h('div.tiny.mono.muted', 'VISIT ORDER'), h('div.gr-order', st.order.length ? st.order.map((v, i) => h('span', h('b', String(i + 1)), v)) : h('span.small.muted', { style: { background: 'none' } }, 'nothing visited yet'))),
              h('div.feedback.info', { style: { color: 'var(--ink)' } }, st.note),
              h('div.small', { html: `<b>Complete orders from ${start}:</b><br><span class="mono">BFS: ${full.BFS}</span><br><span class="mono">DFS: ${full.DFS}</span>` }),
              h('p.small.muted', mode === 'BFS'
                ? 'BFS reaches vertices in order of distance, so the thick tree edges are shortest paths (fewest edges) from the start. Use it for "fewest hops" questions: degrees of separation, network routing, and solving puzzles in the fewest moves.'
                : 'DFS follows one branch to its end before trying another, so the thick tree edges form long paths. Use it to detect cycles, find connected components, order tasks with dependencies (topological sort), and solve mazes.'));
          }
          reset();
          draw();
        },
      },
      /* ---------------------------------------------------------------- worked example: DFS */
      {
        title: 'Worked example: depth-first search with a stack',
        kind: 'example',
        id: 'ex-dfs-stack',
        objective: 'Run depth-first search with an explicit stack, showing every push and pop, the discovery order, the dead-end backtracks, and what happens to a stale stack entry.',
        problem: '<p>Run depth-first search from A in the graph with edges A-B, A-C, B-D, B-E, C-F and E-F, using a stack: push the source, then repeatedly pop the top vertex, visit it if it is new, and push its unvisited neighbors in reverse alphabetical order so the smallest neighbor lands on top. Give the discovery order.</p>',
        data: EX_DFS_DATA,
        steps: dfsStepsFor(EX_DFS_DATA),
        answer: EX_DFS_DATA.answer,
        verify(M) {
          // independent check: recursive DFS, no stack at all
          const adj = adjListOf(['A', 'B', 'C', 'D', 'E', 'F'], [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['E', 'F']]);
          const order = [], seen = new Set();
          const go = (u) => { seen.add(u); order.push(u); for (const w of adj[u]) if (!seen.has(w)) go(w); };
          go('A');
          return JSON.stringify(order) === JSON.stringify(EX_DFS_DATA.answer.order) && order.length === 6;
        },
        variants: [{
          label: 'Variant: a second component',
          problem: '<p>Run depth-first search from A in the graph with edges A-B, A-C, B-D and E-F, using the same stack discipline as the main example. Give the discovery order, and say which vertices are never visited and why.</p>',
          data: VAR_DFS_DATA,
          steps: dfsStepsFor(VAR_DFS_DATA),
          answer: VAR_DFS_DATA.answer,
          verify(M) {
            const adj = adjListOf(['A', 'B', 'C', 'D', 'E', 'F'], [['A', 'B'], ['A', 'C'], ['B', 'D'], ['E', 'F']]);
            const order = [], seen = new Set();
            const go = (u) => { seen.add(u); order.push(u); for (const w of adj[u]) if (!seen.has(w)) go(w); };
            go('A');
            const un = ['A', 'B', 'C', 'D', 'E', 'F'].filter((v) => !seen.has(v));
            return JSON.stringify(order) === JSON.stringify(VAR_DFS_DATA.answer.order) && JSON.stringify(un) === JSON.stringify(VAR_DFS_DATA.answer.unvisited);
          },
        }],
        draw(stage, ctx, step, k, preset) {
          const { h, s, rc } = ctx;
          const D = (preset && preset.data) || EX_DFS_DATA;
          const snap = D.snaps[step.si];
          const visited = new Set(snap.order);
          const inStack = new Set(snap.stack.filter((v) => !visited.has(v)));
          const kids = [];
          for (const [a, b] of D.edges) {
            const tree = snap.parent[b] === a || snap.parent[a] === b;
            kids.push(s('line', { x1: D.pos[a][0], y1: D.pos[a][1], x2: D.pos[b][0], y2: D.pos[b][1], stroke: tree ? 'var(--accent)' : 'var(--rule)', 'stroke-width': tree ? 4.5 : 2.2, 'stroke-linecap': 'round' }));
          }
          for (const v of D.verts) {
            const [x, y] = D.pos[v];
            const isV = visited.has(v), isS = inStack.has(v), cur = snap.current === v && !step.answer;
            kids.push(s('g', {},
              cur ? s('circle', { cx: x, cy: y, r: 27, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2, 'stroke-dasharray': snap.skip ? '4 3' : null }) : null,
              s('circle', { cx: x, cy: y, r: 20, fill: isV ? 'var(--accent)' : isS ? 'var(--warn-bg)' : 'var(--sheet)', 'fill-opacity': isV ? 0.3 : 1, stroke: isV ? 'var(--accent)' : isS ? 'var(--warn)' : 'var(--ink-3)', 'stroke-width': isV || isS ? 3 : 1.5 }),
              s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: v }),
              isV ? s('text', { x, y: y + 38, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink-2)', text: `#${snap.order.indexOf(v) + 1}` }) : null,
              cur ? s('text', { x, y: y - 31, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--ink)', text: snap.skip ? '▼ stale: skip' : '▼ popped' }) : null));
          }
          const svg = s('svg', { viewBox: '0 0 520 250', role: 'img', 'aria-label': 'Graph for depth-first search, with the stack shown below', style: 'width:min(34rem,100%);height:auto' });
          rc(svg, kids);
          const stackBox = h('div', { style: { width: '100%' } },
            h('div.tiny.mono.muted', 'STACK (LAST IN, FIRST OUT)'),
            h('div.gr-box', h('span.end', 'bottom'), snap.stack.length ? snap.stack.map((v) => h('span.cell', { class: visited.has(v) ? 'stale' : '' }, v)) : h('span.small.muted', 'empty'), h('span.end', '← top')));
          const orderStrip = h('div', { style: { width: '100%' } },
            h('div.tiny.mono.muted', 'DISCOVERY ORDER'),
            h('div.gr-order', snap.order.length ? snap.order.map((v, i) => h('span', h('b', String(i + 1)), v)) : h('span.small.muted', { style: { background: 'none' } }, 'nothing visited yet')));
          const banner = step.answer ? h('div.ex-answer', D.unvisited.length
            ? `Answer: discovery order ${D.order.join(' → ')} · check: the stack emptied, yet ${D.unvisited.join(', ')} was never pushed, because no edge joins it to the component of ${D.src} ✓`
            : `Answer: discovery order ${D.order.join(' → ')} · check: a recursive DFS that always takes the smallest unvisited neighbor first gives the same order, and the last stale entry was skipped, not revisited ✓`) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.4rem' } }, svg, stackBox, orderStrip, banner));
        },
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Code: breadth-first search with a queue',
        kind: 'code',
        file: 'bfs.py',
        html: String.raw`<p class="muted small">The adjacency list is a dictionary of sets, and the queue is a <code>deque</code>. Switch to <b>Trace</b> and watch <code>queue</code> and <code>dist</code> change: the vertices come out of the queue in order of distance.</p>`,
        fivew: {
          what: 'Breadth-first search from vertex A on a 6-vertex graph, computing the distance (number of edges on a shortest path) from A to every reachable vertex.',
          why: 'BFS is the standard way to answer "how few steps does it take?" in an unweighted graph. The queue guarantees that vertices are processed in order of distance, which is exactly why the distances come out right.',
          who: 'Network engineers counting hops, social-network analysts measuring degrees of separation, game developers moving characters across a grid, and web crawlers exploring links level by level.',
          where: 'Shortest routes in unweighted networks, finding connected components, checking whether a graph is bipartite, and the "friends within 2 steps" features of social apps.',
          when: 'Use BFS when every edge counts the same and you need fewest edges. When edges carry different weights, switch to Dijkstra\'s algorithm.',
        },
        lines: [
          ['from collections import deque', "Imports <code>deque</code>, a double-ended queue from the standard library. Adding at the back and removing from the front both take constant time. A plain list would be slow here, because <code>list.pop(0)</code> shifts every remaining element."],
          ['graph = {"A": {"B", "C"}, "B": {"A", "D"},', "Starts the adjacency list: a dictionary that maps each vertex to the <b>set</b> of its neighbors. A is adjacent to B and C. Each undirected edge appears twice, once in each endpoint's set."],
          ['         "C": {"A", "D", "E"}, "D": {"B", "C", "F"},', "Continues the dictionary. Python lets a dictionary run over several lines as long as the braces are still open. C has degree 3 and so does D."],
          ['         "E": {"C", "F"}, "F": {"D", "E"}}', "Closes the dictionary: 6 vertices and 7 edges. Check with the handshake theorem: the set sizes add up to \\(2 + 2 + 3 + 3 + 2 + 2 = 14 = 2 \\cdot 7\\)."],
          ['', ''],
          ['def bfs(graph, start):', "Defines the search. It takes the adjacency list and the start vertex and returns a dictionary of distances. Passing the graph in, rather than reading a global, makes the function reusable on any graph."],
          ['    dist = {start: 0}', "<code>dist</code> maps every discovered vertex to its distance from <code>start</code>. It doubles as the <b>visited set</b>: a vertex is in <code>dist</code> exactly when it has been discovered, so nothing is ever added to the queue twice."],
          ['    queue = deque([start])', "The queue of discovered vertices waiting to be processed, first in, first out. It starts with just the start vertex."],
          ['    while queue:', "Repeats as long as the queue is not empty. An empty deque counts as false, so the loop stops when every reachable vertex has been processed."],
          ['        v = queue.popleft()', "Removes the vertex at the <b>front</b> of the queue, the one that has waited longest. Because vertices enter in order of distance, they also leave in order of distance: first A, then the distance-1 vertices, then distance 2, and so on."],
          ['        for w in sorted(graph[v]):', "Loops over the neighbors of <code>v</code>. <code>sorted</code> fixes the order alphabetically, because the order of a set of strings can change from run to run, and a predictable order makes the output reproducible."],
          ['            if w not in dist:', "Skips neighbors that were already discovered. Without this check the search would go back and forth along edges forever, because every edge leads back to where it came from."],
          ['                dist[w] = dist[v] + 1', "Records that <code>w</code> is one step further from the start than <code>v</code>. The first time BFS reaches a vertex is always along a shortest path, so this value never needs correcting."],
          ['                queue.append(w)', "Adds <code>w</code> to the <b>back</b> of the queue, so it is processed after every vertex that is closer to the start."],
          ['    return dist', "Returns the finished distances once the queue is empty. Vertices that cannot be reached from <code>start</code> would simply be missing from the dictionary."],
          ['print(bfs(graph, "A"))', "Runs the search from A and prints <code>{'A': 0, 'B': 1, 'C': 1, 'D': 2, 'E': 2, 'F': 3}</code>. Dictionaries keep insertion order, so the keys appear in the order BFS discovered them."],
        ],
        expected: "{'A': 0, 'B': 1, 'C': 1, 'D': 2, 'E': 2, 'F': 3}\n",
        tryIt: 'Add a vertex <code>"G": set()</code> with no edges and run again: G never appears, because it cannot be reached. Then change the start to <code>"F"</code> and predict the distances before you run it.',
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Hamiltonian cycles and the traveling salesperson',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">Hamiltonian cycle</span> visits every <i>vertex</i> exactly once and returns to the start. It is named after William Rowan Hamilton, who sold a puzzle in 1857 that asked for such a tour of the corners of a dodecahedron. Try to build one yourself on the next slide.</div>
              <table class="tt" style="width:100%;font-size:0.84rem">
                <thead><tr><th class="l"></th><th>Euler cycle</th><th>Hamiltonian cycle</th></tr></thead>
                <tbody>
                  <tr><td class="l">uses each…</td><td>edge exactly once</td><td>vertex exactly once</td></tr>
                  <tr><td class="l">simple test?</td><td>yes: every degree even</td><td>none known; <span class="term">Dirac's theorem</span> is only a sufficient condition</td></tr>
                  <tr><td class="l">fast algorithm?</td><td>yes, linear time</td><td>none known</td></tr>
                </tbody>
              </table>
              <div class="def">The <b>traveling salesperson problem</b> (TSP): in a weighted complete graph, find a Hamiltonian cycle of smallest total weight. Think of the shortest round trip through every city once.</div>
              <div class="warn">The two cycle problems sound alike, yet one is easy and one is hard. Always ask which question you are really facing before you promise a fast program.</div>
            </div>
            <div class="stack">
              <div class="card">
                <h3>Why brute force fails</h3>
                <p class="small">Fix the starting city. The other \(n - 1\) cities can follow in \((n-1)!\) orders, and each tour is counted twice (once per direction).</p>
                <table class="tt" style="width:100%;margin-top:0.35rem">
                  <thead><tr><th>cities \(n\)</th><th>tours \((n-1)!/2\)</th><th class="l">at a billion tours per second</th></tr></thead>
                  <tbody>
                    <tr><td>5</td><td>12</td><td class="l">instant</td></tr>
                    <tr><td>10</td><td>181,440</td><td class="l">under a millisecond</td></tr>
                    <tr><td>15</td><td>43,589,145,600</td><td class="l">44 seconds</td></tr>
                    <tr><td>20</td><td>\(6.1 \times 10^{16}\)</td><td class="l">about 2 years</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="why">The TSP is <b>NP-hard</b>: nobody knows an algorithm that is fast (polynomial time) on every input, and finding one would settle the P versus NP question. Practical solvers use heuristics such as "nearest unvisited city first" and get very close to the best tour.</div>
              <div class="ai">Delivery companies plan routes every day with TSP heuristics, and researchers train neural networks to build tours. The shortest path between two places is easy by contrast: see the Dijkstra lab.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        id: 'hamilton-lab',
        title: 'Lab: find a Hamiltonian cycle',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click a vertex to start, then click neighbors one at a time to build a cycle that visits every vertex once and returns to the start. Dashed edges lead to the legal next moves. Some of these graphs have no Hamiltonian cycle at all: <b>Explain</b> says why, and the panel checks <span class="term">Dirac's theorem</span>, the one easy guarantee.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const sq = (cx, cy, r) => [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]];
          const ringXY = (k, rad) => ring(k, 270, 190, rad, Array(k).fill('')).map(([, x, y]) => [x, y]);
          const GRAPHS = {
            'Prism': { v: [[270, 40], [60, 330], [480, 330], [270, 150], [175, 275], [365, 275]], e: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]] },
            'Cube': { v: [...sq(270, 185, 150), ...sq(270, 185, 65)], e: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]] },
            'Octahedron': { v: [[270, 30], [50, 335], [490, 335], [270, 270], [205, 180], [335, 180]], e: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [3, 1], [3, 2], [4, 0], [4, 1], [5, 0], [5, 2]] },
            '3 × 3 grid': { v: [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => [150 + c * 120, 65 + r * 120])), e: [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]] },
            'K₂,₃': { v: [[170, 70], [370, 70], [90, 300], [270, 300], [450, 300]], e: [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4]] },
            'Petersen': { v: [...ringXY(5, 160), ...ringXY(5, 70)], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [1, 6], [2, 7], [3, 8], [4, 9], [5, 7], [7, 9], [9, 6], [6, 8], [8, 5]] },
          };
          let name, G, n, adj, info, path = [], closed = false, explain = false, msg = null;
          const L = (i) => LET[i];
          function load(k) {
            name = k; G = GRAPHS[k]; n = G.v.length;
            const nb = nbrsOf(G.e);
            adj = Array.from({ length: n }, (_, v) => nb(v).sort((a, b) => a - b));
            const minDeg = Math.min(...degrees(n, G.e));
            info = { minDeg, dirac: 2 * minDeg >= n, cycle: hamiltonCycle(n, G.e), parts: bipartition(n, G.e) };
            path = []; closed = false; explain = false; msg = null;
          }
          const legalMoves = () => (path.length && !closed ? adj[path[path.length - 1]].filter((w) => !path.includes(w) || (w === path[0] && path.length === n)) : []);
          function clickVertex(v) {
            msg = null;
            const last = path[path.length - 1];
            if (closed) msg = ['info', 'The cycle is complete. Press Restart to look for a different one, or pick another graph.'];
            else if (!path.length) path.push(v);
            else if (v === last) msg = ['info', `You are at ${L(v)}. Click one of its neighbors, or Undo.`];
            else if (!adj[last].includes(v)) msg = ['bad', `${L(last)} and ${L(v)} are not adjacent. A cycle can only follow edges.`];
            else if (v === path[0]) {
              if (path.length === n) { closed = true; msg = ['good', `A Hamiltonian cycle: ${path.map(L).join(' → ')} → ${L(v)}. Every vertex once, and back where you started.`]; }
              else msg = ['bad', `Closing the loop now would leave ${n - path.length} ${n - path.length === 1 ? 'vertex' : 'vertices'} unvisited. Keep going.`];
            } else if (path.includes(v)) msg = ['bad', `${L(v)} is already on the path, and a Hamiltonian cycle visits each vertex only once.`];
            else path.push(v);
            draw();
          }
          function explanation() {
            const { cycle, parts, minDeg, dirac } = info;
            const diracLine = dirac
              ? `Dirac's theorem: every degree is at least ${minDeg}, and ${minDeg} ≥ ${n}/2, so a Hamiltonian cycle is guaranteed before you try a single move.`
              : `Dirac's theorem does not apply: the smallest degree is ${minDeg}, below ${n}/2 = ${n / 2}. The theorem is a sufficient condition, not a necessary one, so this alone decides nothing.`;
            if (cycle) return `${diracLine}${dirac ? '' : ' A cycle exists anyway; press Show a cycle.'}`;
            if (parts) {
              const sideOf = (c) => parts.map((p, i) => (p === c ? L(i) : null)).filter(Boolean);
              const A = sideOf(0), B = sideOf(1);
              if (A.length !== B.length) return `This graph is bipartite: every edge joins side 1 {${A.join(', ')}} to side 2 {${B.join(', ')}}. A cycle alternates between the sides, so a Hamiltonian cycle needs both sides equal. Here they have ${A.length} and ${B.length} vertices, so no such cycle exists. ${diracLine}`;
            }
            return `An exhaustive search over every route from ${L(0)} finds no Hamiltonian cycle.${name === 'Petersen' ? ' The Petersen graph is the classic example: every degree 3, highly symmetric, and still no cycle. It does have a Hamiltonian path, so try to visit all ten vertices without closing the loop.' : ''} ${diracLine}`;
          }
          const svg = s('svg', { class: 'gr-svg', viewBox: '0 0 540 370', role: 'group', 'aria-label': 'Graph; every vertex is a button' });
          const side = h('div.gr-panel');
          body.append(h('div.gr-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)' } }, h('div.figure', { style: { minHeight: 0, alignItems: 'start' } }, svg), side));
          function draw() {
            const last = path[path.length - 1];
            const legal = new Set(legalMoves());
            const onPath = new Set();
            for (let i = 1; i < path.length; i++) onPath.add(edgeKey(path[i - 1], path[i]));
            if (closed) onPath.add(edgeKey(last, path[0]));
            const showParts = explain && info.parts && !info.cycle;
            const kids = [];
            for (const [a, b] of G.e) {
              const used = onPath.has(edgeKey(a, b));
              const next = !closed && path.length > 0 && ((a === last && legal.has(b)) || (b === last && legal.has(a)));
              kids.push(s('line', { x1: G.v[a][0], y1: G.v[a][1], x2: G.v[b][0], y2: G.v[b][1], stroke: used ? 'var(--accent)' : next ? 'var(--warn)' : 'var(--rule)', 'stroke-width': used ? 5 : next ? 3.5 : 2.2, 'stroke-dasharray': next ? '7 4' : null, 'stroke-linecap': 'round' }));
            }
            G.v.forEach(([x, y], v) => {
              const k = path.indexOf(v), isLast = v === last && !closed, can = legal.has(v);
              const part = showParts ? info.parts[v] : null;
              kids.push(s('g', { class: 'gv', tabindex: 0, role: 'button', 'aria-label': `Vertex ${L(v)}${k >= 0 ? `, visited ${k + 1}` : ''}`, onclick: () => clickVertex(v), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickVertex(v); } } },
                isLast ? s('circle', { cx: x, cy: y, r: 28, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2 }) : null,
                s('circle', { cx: x, cy: y, r: 20, fill: 'var(--paper)', stroke: 'none' }),
                s('circle', { class: 'body', cx: x, cy: y, r: 20, fill: k >= 0 ? 'var(--accent)' : can ? 'var(--warn-bg)' : 'var(--sheet)', 'fill-opacity': k >= 0 ? 0.3 : 1, stroke: k >= 0 ? 'var(--accent)' : can ? 'var(--warn)' : 'var(--ink-3)', 'stroke-width': k >= 0 || can ? 3 : 1.5, 'stroke-dasharray': part === 1 ? '4 3' : null }),
                s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: L(v) }),
                k >= 0 ? s('text', { x: x + 23, y: y - 14, 'font-size': 11.5, 'font-weight': 700, fill: 'var(--accent)', text: `#${k + 1}` }) : null,
                part !== null ? s('text', { x: x + 23, y: y + 24, 'font-size': 10.5, 'font-weight': 600, fill: 'var(--ink-2)', text: part ? 'side 2' : 'side 1' }) : null));
            });
            // keyboard users keep their place: the vertex that had focus gets it back after the redraw
            const focusedV = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.gv') : null;
            const focusedIdx = focusedV ? [...svg.querySelectorAll('.gv')].indexOf(focusedV) : -1;
            rc(svg, kids);
            if (focusedIdx >= 0) { const again = svg.querySelectorAll('.gv')[focusedIdx]; if (again) again.focus({ preventScroll: true }); }
            const left = n - path.length;
            const stuck = path.length > 0 && !closed && !legal.size;
            // the toolbar is rebuilt too, so keyboard focus is kept on the same control (Undo falls back to Restart once it is disabled)
            const act = document.activeElement && side.contains(document.activeElement) ? document.activeElement.dataset.act : null;
            rc(side,
              h('div.gr-ctl', h('span', 'Graph'), h('div.seg', Object.keys(GRAPHS).map((k) => h('button', { 'aria-pressed': String(k === name), dataset: { act: 'graph-' + k }, onclick: () => { load(k); draw(); } }, k)))),
              h('div.row', { style: { gap: '0.3rem' } },
                h('button.btn.sm', { dataset: { act: 'undo' }, onclick: () => { if (closed) closed = false; else path.pop(); msg = null; draw(); }, disabled: !path.length }, 'Undo'),
                h('button.btn.sm', { dataset: { act: 'restart' }, onclick: () => { path = []; closed = false; msg = null; draw(); } }, 'Restart'),
                info.cycle ? h('button.btn.sm', { dataset: { act: 'show' }, onclick: () => { path = info.cycle.slice(); closed = true; msg = ['info', `One Hamiltonian cycle: ${path.map(L).join(' → ')} → ${L(path[0])}. Others may exist.`]; draw(); } }, 'Show a cycle') : null,
                h('button.btn.sm', { dataset: { act: 'explain' }, 'aria-pressed': String(explain), class: explain ? 'on' : '', onclick: () => { explain = !explain; draw(); } }, explain ? 'Hide explanation' : 'Explain')),
              h('div.gr-stats',
                h('div', h('b', String(n)), h('span', '|V| vertices')),
                h('div', h('b', String(G.e.length)), h('span', '|E| edges')),
                h('div', h('b', String(info.minDeg)), h('span', 'smallest degree'))),
              h('div.small', { html: `<b>Dirac check:</b> smallest degree ${info.minDeg} ${info.dirac ? '≥' : '<'} n/2 = ${n / 2}, so a Hamiltonian cycle is <b>${info.dirac ? 'guaranteed' : 'not guaranteed'}</b>${info.dirac ? '' : ' (one may still exist)'}.` }),
              h('div', h('div.tiny.mono.muted', `PATH SO FAR: ${path.length} OF ${n} VERTICES${closed ? ' · CYCLE CLOSED' : ''}`), h('div.gr-order', path.length ? path.map((v, i) => h('span', h('b', String(i + 1)), L(v))) : h('span.small.muted', { style: { background: 'none' } }, 'click a vertex to start'))),
              msg ? h('div.feedback', { class: msg[0] }, msg[1])
                : stuck ? h('div.feedback.bad', `Stuck at ${L(last)}: every neighbor is already on the path and ${left} ${left === 1 ? 'vertex remains' : 'vertices remain'}. Undo a few moves, or press Explain.`)
                  : path.length && !closed ? h('div.feedback.info', `At ${L(last)}. Legal next moves: ${[...legal].map(L).join(', ')}.`) : null,
              explain ? h('div.card.small', { style: { padding: '0.5rem 0.7rem' } }, explanation()) : null,
              h('p.tiny.muted', 'Compare with the Euler check: "all degrees even" is a complete, instant test. No such test is known for Hamiltonian cycles, which is why the traveling salesperson problem is hard.'));
            if (act) {
              const again = side.querySelector(`[data-act="${act}"]`);
              const target = again && !again.disabled ? again : side.querySelector('[data-act="restart"]');
              if (target) target.focus({ preventScroll: true });
            }
          }
          load('Cube');
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: "Lab: Dijkstra's shortest paths, step by step",
        kind: 'lab',
        html: String.raw`<p class="muted small"><b>Dijkstra's algorithm</b> finds the shortest distance from a source to every vertex when all weights are non-negative. Each step <b>finalizes</b> the unfinished vertex with the smallest tentative distance, then <b>relaxes</b> its edges: if going through it gives a neighbor a shorter route, that neighbor's distance is lowered. Click any vertex to highlight its current best route.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const P = { A: [52, 190], B: [175, 70], C: [175, 310], D: [315, 190], E: [445, 70], F: [445, 310], G: [552, 190] };
          const WE = [['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'D', 8], ['C', 'F', 10], ['D', 'E', 2], ['D', 'F', 6], ['E', 'G', 4], ['F', 'G', 1]];
          const NAMES = Object.keys(P);
          const adj = Object.fromEntries(NAMES.map((v) => [v, []]));
          WE.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
          NAMES.forEach((v) => adj[v].sort((x, y) => x[0].localeCompare(y[0])));
          let src = 'A', target = 'G', dist, prev, fin, last;
          const fmtD = (d) => (d === Infinity ? '∞' : String(d));
          function reset() { dist = Object.fromEntries(NAMES.map((v) => [v, v === src ? 0 : Infinity])); prev = {}; fin = []; last = null; }
          function step() {
            const cand = NAMES.filter((v) => !fin.includes(v) && dist[v] < Infinity).sort((a, b) => dist[a] - dist[b] || a.localeCompare(b));
            if (!cand.length) return false;
            const u = cand[0];
            fin.push(u);
            const rel = [];
            for (const [w, wt] of adj[u]) {
              if (fin.includes(w)) { rel.push({ w, wt, final: true }); continue; }
              const alt = dist[u] + wt, old = dist[w];
              if (alt < old) { dist[w] = alt; prev[w] = u; rel.push({ w, wt, alt, old, upd: true }); } else rel.push({ w, wt, alt, old, upd: false });
            }
            last = { u, rel };
            return true;
          }
          const svg = s('svg', { class: 'gr-svg', viewBox: '0 0 600 370', role: 'group', 'aria-label': 'Weighted graph for Dijkstra\'s algorithm; every vertex is a button that shows its route' });
          const side = h('div.gr-panel');
          body.append(h('div.gr-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' } }, h('div.figure', { style: { minHeight: 0, alignItems: 'start' } }, svg), side));
          function draw() {
            const done = !NAMES.some((v) => !fin.includes(v) && dist[v] < Infinity);
            const route = target ? pathTo(prev, src, target) : null;
            const onRoute = new Set();
            if (route) for (let i = 1; i < route.length; i++) onRoute.add([route[i - 1], route[i]].sort().join());
            const relaxing = new Set(last ? last.rel.filter((r) => !r.final).map((r) => [last.u, r.w].sort().join()) : []);
            const kids = [];
            for (const [a, b, w] of WE) {
              const k = [a, b].sort().join();
              const tree = prev[b] === a || prev[a] === b;
              if (onRoute.has(k)) kids.push(s('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: 'var(--true)', 'stroke-width': 11, 'stroke-opacity': 0.35, 'stroke-linecap': 'round' }));
              kids.push(s('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: relaxing.has(k) ? 'var(--warn)' : tree ? 'var(--accent)' : 'var(--ink-3)', 'stroke-width': relaxing.has(k) ? 4 : tree ? 4 : 1.8, 'stroke-dasharray': relaxing.has(k) ? '7 4' : null, 'stroke-linecap': 'round' }));
              const mx = (P[a][0] + P[b][0]) / 2, my = (P[a][1] + P[b][1]) / 2;
              kids.push(s('circle', { cx: mx, cy: my, r: 11, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.2 }), s('text', { x: mx, y: my + 4.5, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: 'var(--ink)', text: String(w) }));
            }
            for (const v of NAMES) {
              const [x, y] = P[v];
              const isF = fin.includes(v), front = !isF && dist[v] < Infinity, cur = last && last.u === v;
              const go = () => { target = v; draw(); };
              kids.push(s('g', { class: 'gv', tabindex: 0, role: 'button', 'aria-label': `Show route to ${v}`, onclick: go, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } } },
                cur ? s('circle', { cx: x, cy: y, r: 28, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2 }) : null,
                s('circle', { class: 'body', cx: x, cy: y, r: 21, fill: isF ? 'var(--accent)' : front ? 'var(--warn-bg)' : 'var(--sheet)', stroke: isF ? 'var(--accent)' : front ? 'var(--warn)' : 'var(--ink-3)', 'stroke-width': isF || front ? 3 : 1.5 }),
                s('text', { x, y: y + 5.5, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: isF ? 'var(--accent-ink)' : 'var(--ink)', text: v }),
                s('text', { x, y: y < 120 ? y - 30 : y > 260 ? y + 40 : y - 30, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: isF ? 'var(--accent)' : front ? 'var(--warn)' : 'var(--ink-3)', text: fmtD(dist[v]) })));
            }
            rc(svg, kids);
            const pq = NAMES.filter((v) => !fin.includes(v) && dist[v] < Infinity).sort((a, b) => dist[a] - dist[b] || a.localeCompare(b));
            let narr;
            if (!last) narr = h('p.small', { html: `Start: the source <b>${src}</b> has distance 0 and every other vertex ∞ (no route known yet). Press <b>Step</b>.` });
            else narr = h('div.small', h('p', { html: `Finalize <b>${last.u}</b> at distance ${dist[last.u]}: it is the smallest tentative distance left, and with no negative weights no later route can beat it. Relax its edges:` }),
              h('ul.gr-rel', last.rel.map((r) => h('li', { html: r.final ? `${r.w} is already final: skip.` : r.upd ? `${r.w}: ${dist[last.u]} + ${r.wt} = ${r.alt} &lt; ${fmtD(r.old)}, so <b class="ok">update ${r.w} to ${r.alt}</b> via ${last.u}.` : `${r.w}: ${dist[last.u]} + ${r.wt} = ${r.alt} ≥ ${fmtD(r.old)}, keep ${r.old}.` }))));
            const rt = route && route.length > 1 ? route : null;
            rc(side,
              h('div.gr-ctl', h('span', 'Source'), h('div.seg', NAMES.map((v) => h('button', { 'aria-pressed': String(v === src), onclick: () => { src = v; target = null; reset(); draw(); } }, v)))),
              h('div.row', { style: { gap: '0.3rem' } },
                h('button.btn.sm.primary', { onclick: () => { step(); draw(); }, disabled: done }, 'Step ▶'),
                h('button.btn.sm', { onclick: () => { while (step()); draw(); }, disabled: done }, 'Run to the end'),
                h('button.btn.sm', { onclick: () => { reset(); draw(); } }, 'Reset'),
                h('span.tiny.muted', `${fin.length} of ${NAMES.length} final`)),
              h('div', h('div.tiny.mono.muted', 'PRIORITY QUEUE (SMALLEST FIRST)'), h('div.gr-box', pq.length ? pq.map((v) => h('span.cell', `${v}:${dist[v]}`)) : h('span.small.muted', done ? 'empty: every reachable vertex is final' : 'empty'))),
              h('table.tt.gr-table', { style: { width: '100%' } },
                h('thead', h('tr', h('th', 'vertex'), h('th', 'distance'), h('th', 'via'), h('th.l', 'status'))),
                h('tbody', NAMES.map((v) => h('tr', { class: last && last.u === v ? 'cur' : fin.includes(v) ? 'fin' : dist[v] < Infinity ? 'front' : '' },
                  h('td', h('b', v)), h('td.mono', fmtD(dist[v])), h('td.mono', prev[v] || (v === src ? '–' : '')), h('td.l.small', fin.includes(v) ? 'final' : dist[v] < Infinity ? 'tentative' : 'unseen'))))),
              narr,
              rt ? h('div.feedback', { class: fin.includes(target) ? 'good' : 'info', style: { fontSize: '0.82rem' } },
                `Route to ${target}: ${rt.join(' → ')} = ${rt.slice(1).map((v, i) => WE.find(([a, b]) => (a === rt[i] && b === v) || (b === rt[i] && a === v))[2]).join(' + ')} = ${dist[target]}${fin.includes(target) ? ' (final: this is the shortest)' : ' (tentative: it may still improve)'}`) : null);
          }
          reset();
          draw();
        },
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: "Code: Dijkstra's algorithm with a heap",
        kind: 'code',
        file: 'dijkstra.py',
        html: String.raw`<p class="muted small">The graph is the left half of the lab's graph. A <b>heap</b> (Python's <code>heapq</code>) always hands back the smallest distance first. Trace it and watch two outdated heap entries get skipped.</p>`,
        fivew: {
          what: 'Dijkstra\'s algorithm on a 4-vertex weighted graph, stored as a dictionary of dictionaries, computing the shortest distance from A to every vertex.',
          why: 'Shortest weighted paths are everywhere, and this short program is the real algorithm used in practice: a priority queue plus "lazy deletion" of outdated entries.',
          who: 'Map and navigation developers, network engineers (the OSPF routing protocol runs Dijkstra on every router), game developers planning character movement, and logistics planners.',
          where: 'Turn-by-turn navigation, internet routing, robot motion planning, and as a building block inside A* search, which adds a distance estimate to guide the search toward the goal.',
          when: 'Whenever edge weights are non-negative. With negative weights, use Bellman–Ford instead; with all weights equal, plain BFS is simpler and faster.',
        },
        lines: [
          ['import heapq', "Imports <code>heapq</code>, the standard-library heap. A heap is a list kept in a special order so that the smallest item can always be removed in \\(O(\\log\\ n)\\) time. That is exactly the \"closest unfinished vertex\" question Dijkstra asks at every step."],
          ['def dijkstra(graph, source):', "Defines the algorithm. <code>graph</code> maps each vertex to a dictionary of <code>{neighbor: weight}</code>, and <code>source</code> is where the distances are measured from."],
          ['    dist, heap = {source: 0}, [(0, source)]', "Two variables at once. <code>dist</code> holds the best distance found so far for each vertex (the source is 0 from itself). <code>heap</code> starts with one entry, the pair (distance 0, vertex <code>source</code>). Tuples compare by their first item, so the heap orders entries by distance."],
          ['    while heap:', "Keeps going while there are entries to examine. Each entry is a claim \"this vertex can be reached at this distance\"."],
          ['        d, v = heapq.heappop(heap)', "Removes the entry with the smallest distance and unpacks it into <code>d</code> and <code>v</code>. This is the vertex Dijkstra finalizes: nothing still in the heap is closer, and with non-negative weights no later route can be shorter."],
          ['        if d > dist[v]:', "Checks whether this entry is <b>stale</b>. When a vertex's distance improves, a new entry is pushed and the old one stays in the heap. If the popped distance is larger than the best known, the entry is outdated."],
          ['            continue', "Skips the stale entry and goes back to the top of the loop. Ignoring old entries this way (\"lazy deletion\") is simpler than finding and removing them from the heap."],
          ['        for w, weight in graph[v].items():', "Loops over every neighbor <code>w</code> of <code>v</code> together with the weight of the edge between them. <code>.items()</code> yields the (key, value) pairs of the inner dictionary."],
          ['            if d + weight < dist.get(w, float("inf")):', "The <b>relaxation</b> test: is going through <code>v</code> shorter than the best route to <code>w</code> known so far? <code>dist.get(w, float(\"inf\"))</code> returns infinity for a vertex that has not been reached yet, so any real route beats it."],
          ['                dist[w] = d + weight', "Records the shorter distance for <code>w</code>. In the lab this is an \"update\" line: for example, B drops from 4 to 3 when the route through C is found."],
          ['                heapq.heappush(heap, (dist[w], w))', "Pushes a new entry for <code>w</code> with its improved distance. The heap reorders itself so the smallest entry is still on top, which costs \\(O(\\log\\ n)\\)."],
          ['    return dist', "Returns the dictionary of shortest distances once the heap is empty, meaning every reachable vertex has been finalized."],
          ['roads = {"A": {"B": 4, "C": 2}, "D": {"B": 5, "C": 8},', "The weighted graph as a dictionary of dictionaries, back at the left margin so it is outside the function. From A the road to B costs 4 and the road to C costs 2; from D, roads lead to B (5) and C (8). The order of the keys does not matter to the algorithm."],
          ['         "B": {"A": 4, "C": 1, "D": 5},', "The roads from B. The graph is undirected, so every road is listed at both ends: A lists B with weight 4, and B lists A with weight 4."],
          ['         "C": {"A": 2, "B": 1, "D": 8}}', "The roads from C, which close the dictionary. These four vertices and five edges are the left half of the lab's graph, so you can check the result against the lab."],
          ['print(dijkstra(roads, "A"))', "Runs the algorithm from A and prints <code>{'A': 0, 'B': 3, 'C': 2, 'D': 8}</code>. B is 3, not 4, because A → C → B costs 2 + 1. D is 8 through B, not 10 through C."],
        ],
        expected: "{'A': 0, 'B': 3, 'C': 2, 'D': 8}\n",
        tryIt: 'Change the C–B weight to 5 in both places and predict the new distance to B before you run it. Then add a vertex <code>"E": {}</code> that no road reaches and see how the output reports it.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Isomorphism and planar graphs',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">Graphs \(G_1\) and \(G_2\) are <span class="term">isomorphic</span> if there is a one-to-one, onto function \(f\) from the vertices of \(G_1\) to the vertices of \(G_2\) such that \(u\) and \(v\) are adjacent exactly when \(f(u)\) and \(f(v)\) are. They are the same graph, drawn and labeled differently.</div>
              <div class="gr-fig">
                <div class="center">${FIG_C5}<div class="gr-cap">pentagon</div></div>
                <div class="center" style="font-size:1.4rem;color:var(--ink-3)">≅</div>
                <div class="center">${FIG_STAR}<div class="gr-cap">five-point star</div></div>
              </div>
              <p class="small center">\(f\): 1 → a, 2 → c, 3 → e, 4 → b, 5 → d maps every edge to an edge.</p>
              <div class="tip">To <b>disprove</b> isomorphism, find a <span class="term">graph invariant</span> that differs: vertex or edge count, <span class="term">degree sequence</span>, number of components or triangles. To <b>prove</b> it, exhibit \(f\). Matching invariants alone prove nothing; the next lab asks for both.</div>
              <div class="ai">Whether two molecules share a bond structure is an isomorphism question in AI-driven drug discovery; circuit-board layout is a planarity question, since wires on one layer must not cross.</div>
            </div>
            <div class="stack">
              <div class="def">A graph is <span class="term" data-term="planar graph">planar</span> if it can be drawn with no edges crossing. The drawing cuts the plane into <span class="term" data-term="face">faces</span>, including the unbounded outer face.</div>
              <div class="gr-fig">
                <div class="center">${FIG_K4X}<div class="gr-cap">K4 with a crossing</div></div>
                <div class="center" style="font-size:1.2rem;color:var(--ink-3)">→</div>
                <div class="center">${FIG_K4P}<div class="gr-cap">redrawn: no crossing</div></div>
              </div>
              <div class="thm"><b>Euler's formula.</b> A connected planar graph drawn without crossings has \(V - E + F = 2\) (for \(K_4\): \(4 - 6 + 4 = 2\)). Each face has at least 3 boundary edges and each edge borders at most 2 faces, so \(3F \le 2E\); with Euler's formula this gives \(E \le 3V - 6\) when \(V \ge 3\). \(K_5\) has \(10 \gt 9\) edges: not planar.</div>
              <div class="thm" data-label="Why K3,3 is not planar">The general bound allows \(K_{3,3}\) (\(9 \le 12\)). But \(K_{3,3}\) is bipartite, so it has no triangles, and every face would need at least 4 boundary edges: \(4F \le 2E\), so \(E \le 2V - 4 = 8\). Nine edges are one too many. <span class="term">Kuratowski's theorem</span> says these are the only two obstacles: a graph is planar if and only if no subgraph is a subdivision of \(K_5\) or \(K_{3,3}\) (edges replaced by paths).</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- worked example: coloring */
      {
        title: 'Worked example: coloring a graph, checking conflicts',
        kind: 'example',
        id: 'ex-graph-coloring',
        objective: 'Color a graph greedily in a stated vertex order, ruling colors out from neighbor conflicts at each step, and prove the number of colors used cannot be reduced.',
        problem: '<p>Color the graph with vertices A, B, C, D, E and edges A-B, B-C, C-D, D-E, E-A and A-C, going in the order A, B, C, D, E and giving each vertex the smallest color (numbered 1, 2, 3, ...) that no already colored neighbor uses. Give the final coloring and the number of colors used.</p>',
        data: EX_COL_DATA,
        steps: colorStepsFor(EX_COL_DATA),
        answer: EX_COL_DATA.answer,
        verify(M) {
          // independent check: stated coloring is proper, and exhaustive backtracking finds none with fewer colors
          const E = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'], ['A', 'C']];
          const adj = adjListOf(['A', 'B', 'C', 'D', 'E'], E);
          const col = EX_COL_DATA.answer.colors;
          const proper = E.every(([a, b]) => col[a] !== col[b]);
          const tryK = (k2) => { const c = {}; const go = (i) => { if (i === 5) return true; const v = 'ABCDE'[i]; for (let x = 1; x <= k2; x++) { if (adj[v].every((w) => c[w] !== x)) { c[v] = x; if (go(i + 1)) return true; delete c[v]; } } return false; }; return go(0); };
          return proper && EX_COL_DATA.answer.used === 3 && !tryK(2) && tryK(3);
        },
        variants: [{
          label: 'Variant: K4 needs a fourth color',
          problem: '<p>Color the complete graph K4 on vertices A, B, C, D (all six edges between them), going in the order A, B, C, D and giving each vertex the smallest color that no already colored neighbor uses, with a hoped-for palette of only 3 colors. Give the final coloring, the number of colors used, and say whether the 3-color hope survives.</p>',
          data: VAR_COL_DATA,
          steps: colorStepsFor(VAR_COL_DATA),
          answer: VAR_COL_DATA.answer,
          verify(M) {
            const E = [['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']];
            const adj = adjListOf(['A', 'B', 'C', 'D'], E);
            const col = VAR_COL_DATA.answer.colors;
            const proper = E.every(([a, b]) => col[a] !== col[b]);
            const tryK = (k2) => { const c = {}; const go = (i) => { if (i === 4) return true; const v = 'ABCD'[i]; for (let x = 1; x <= k2; x++) { if (adj[v].every((w) => c[w] !== x)) { c[v] = x; if (go(i + 1)) return true; delete c[v]; } } return false; }; return go(0); };
            const clique = E.length === 6;
            return proper && VAR_COL_DATA.answer.used === 4 && !tryK(3) && tryK(4) && clique;
          },
        }],
        draw(stage, ctx, step, k, preset) {
          const { h, s, rc } = ctx;
          const D = (preset && preset.data) || EX_COL_DATA;
          const PAL = ['var(--accent)', 'var(--fnc)', 'var(--warn)', 'var(--str)'];
          const colored = Object.fromEntries(D.assign.slice(0, step.n).map((a) => [a.v, a.c]));
          const kids = [];
          for (const [a, b] of D.edges) {
            const checked = a in colored && b in colored;
            kids.push(s('line', { x1: D.pos[a][0], y1: D.pos[a][1], x2: D.pos[b][0], y2: D.pos[b][1], stroke: checked ? 'var(--true)' : 'var(--rule)', 'stroke-width': checked ? 3.2 : 2.2, 'stroke-linecap': 'round' }));
          }
          for (const v of D.verts) {
            const [x, y] = D.pos[v];
            const c = colored[v], just = step.n > 0 && !step.answer && D.assign[step.n - 1].v === v;
            kids.push(s('g', {},
              just ? s('circle', { cx: x, cy: y, r: 27, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2 }) : null,
              s('circle', { cx: x, cy: y, r: 20, fill: c ? PAL[c - 1] : 'var(--sheet)', 'fill-opacity': c ? 0.45 : 1, stroke: c ? PAL[c - 1] : 'var(--ink-3)', 'stroke-width': c ? 3 : 1.5 }),
              s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: v }),
              c ? s('text', { x, y: y + 38, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: 'var(--ink-2)', text: `color ${c}` }) : null));
          }
          const svg = s('svg', { viewBox: '0 0 520 260', role: 'img', 'aria-label': 'Graph being colored vertex by vertex; an edge turns green once both ends are colored differently', style: 'width:min(34rem,100%);height:auto' });
          rc(svg, kids);
          const palette = h('div', { style: { width: '100%' } }, h('div.tiny.mono.muted', 'COLORS USED SO FAR'),
            h('div.gr-chips', step.n ? D.assign.slice(0, step.n).map((a) => h('span.chip', `${a.v}: color ${a.c}`)) : h('span.small.muted', 'none yet')));
          const banner = step.answer ? h('div.ex-answer', `Answer: ${D.order.map((v) => `${v} color ${D.colors[v]}`).join(' · ')} · ${D.used} colors used · check: every edge joins different colors, and ${D.why} ✓`) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.4rem' } }, svg, palette, banner));
        },
      },
      /* ---------------------------------------------------------------- 14 */
      {
        id: 'iso-lab',
        title: 'Lab: isomorphic or not?',
        kind: 'lab',
        html: String.raw`<p class="muted small">Two drawings, one question: is \(H\) just \(G\) with its vertices renamed and moved around? Reveal the <span class="term" data-term="graph invariant">invariants</span> one at a time. A single mismatch settles the question with <b>no</b>. When everything matches, only an actual vertex mapping settles it with <b>yes</b>, and the lab can show one.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const xy = (k, cx, cy, rad) => ring(k, cx, cy, rad, Array(k).fill('')).map(([, x, y]) => [x, y]);
          const hex = xy(6, 130, 118, 88), pent = xy(5, 130, 122, 88);
          const C6 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]];
          const rows33 = [[45, 45], [130, 45], [215, 45], [45, 190], [130, 190], [215, 190]];
          const K33 = [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]];
          const house = { v: [[55, 195], [205, 195], [205, 100], [55, 100], [130, 28]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [3, 4]] };
          const PAIRS = [
            { G: { v: hex, e: C6 }, H: { v: hex, e: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 5], [5, 0]] } },
            { G: { v: hex, e: C6 }, H: { v: [[70, 45], [20, 170], [120, 170], [190, 45], [140, 170], [240, 170]], e: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]] } },
            { G: { v: rows33, e: K33 }, H: { v: hex, e: [...C6, [0, 3], [1, 4], [2, 5]] } },
            { G: { v: rows33, e: K33 }, H: { v: [[130, 28], [25, 205], [235, 205], [130, 100], [88, 168], [172, 168]], e: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]] } },
            { G: house, H: { v: pent, e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2]] } },
            { G: house, H: { v: [[130, 118], [35, 45], [35, 190], [225, 45], [225, 190]], e: [[0, 1], [0, 2], [1, 2], [0, 3], [0, 4], [3, 4]] } },
            { G: { v: pent, e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] }, H: house },
          ];
          const NAMES = ['vertices', 'edges', 'degree sequence', 'triangles', 'components'];
          const facts = (P) => {
            const n = P.G.v.length, m = P.H.v.length;
            const seq = (k, E) => degrees(k, E).sort((a, b) => b - a).join(', ');
            const comps = (k, E) => componentsOf(Array.from({ length: k }, (_, i) => i), nbrsOf(E)).length;
            const rows = [[n, m], [P.G.e.length, P.H.e.length], [seq(n, P.G.e), seq(m, P.H.e)], [triangles(n, P.G.e), triangles(m, P.H.e)], [comps(n, P.G.e), comps(m, P.H.e)]];
            return { rows, f: n === m ? isomorphism(n, P.G.e, P.H.e) : null, firstDiff: rows.findIndex(([a, b]) => a !== b) };
          };
          let pi = 0, revealed = 0, decided = null, showMap = false, F = facts(PAIRS[0]);
          const gl = (i) => String(i + 1), hl = (i) => 'abcdef'[i];
          const svg = s('svg', { viewBox: '0 0 560 240', role: 'img', 'aria-label': 'Two graphs, G on the left and H on the right' });
          const side = h('div.gr-panel');
          body.append(h('div.gr-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)' } }, h('div.figure', { style: { minHeight: 0, alignItems: 'start' } }, svg), side));
          /** one framed graph; badge(i) may return a label from G to pin on vertex i of H */
          function panel(graph, dx, title, lab, badge) {
            const kids = [s('rect', { x: dx, y: 4, width: 260, height: 232, rx: 12, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.5 }), s('text', { x: dx + 12, y: 24, 'font-size': 15, 'font-weight': 700, 'font-style': 'italic', fill: 'var(--ink-2)', text: title })];
            for (const [a, b] of graph.e) kids.push(s('line', { x1: dx + graph.v[a][0], y1: 4 + graph.v[a][1], x2: dx + graph.v[b][0], y2: 4 + graph.v[b][1], stroke: 'var(--ink-2)', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
            graph.v.forEach(([x, y], i) => {
              kids.push(s('circle', { cx: dx + x, cy: 4 + y, r: 16, fill: 'var(--accent-2)', stroke: 'var(--accent)', 'stroke-width': 1.8 }), s('text', { x: dx + x, y: 4 + y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: lab(i) }));
              const g = badge ? badge(i) : null;
              if (g != null) kids.push(s('circle', { cx: dx + x + 14, cy: 4 + y - 13, r: 9, fill: 'var(--mark)', stroke: 'var(--ink)', 'stroke-width': 1 }), s('text', { x: dx + x + 14, y: 4 + y - 9.5, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--mark-ink)', text: g }));
            });
            return kids;
          }
          function draw() {
            const P = PAIRS[pi];
            const from = showMap && F.f ? F.f.reduce((acc, j, i) => { acc[j] = gl(i); return acc; }, {}) : null;
            rc(svg, panel(P.G, 10, 'G', gl), panel(P.H, 290, 'H', hl, from ? (j) => from[j] : null));
            const verdict = F.f ? 'Isomorphic' : 'Not isomorphic';
            const d = F.firstDiff;
            const mapText = F.f ? `${F.f.map((j, i) => `${gl(i)} → ${hl(j)}`).join(', ')}. Every edge of G lands on an edge of H: ${P.G.e.map(([a, b]) => `${gl(a)}${gl(b)} → ${hl(F.f[a])}${hl(F.f[b])}`).join(', ')}.` : '';
            let fb = null;
            if (decided) {
              const ok = decided === verdict;
              if (ok && F.f) fb = ['good', `Correct. A mapping proves it: ${mapText}`];
              else if (ok) fb = ['good', `Correct. The decisive invariant is the number of ${NAMES[d]}: G has ${F.rows[d][0]}, H has ${F.rows[d][1]}. Isomorphic graphs agree on every invariant, so one mismatch is enough.`.replace('number of degree sequence', 'degree sequence')];
              else if (F.f) fb = ['bad', `Not quite. Every invariant matches, and this mapping preserves every edge: ${mapText}`];
              else fb = ['bad', `Not quite. Compare the ${NAMES[d]}: G has ${F.rows[d][0]} and H has ${F.rows[d][1]}. Isomorphic graphs can never differ in an invariant.`];
            }
            rc(side,
              h('div.gr-ctl', h('span', 'Pair'), h('div.seg', PAIRS.map((_, i) => h('button', { 'aria-pressed': String(i === pi), onclick: () => { pi = i; F = facts(PAIRS[i]); revealed = 0; decided = null; showMap = false; draw(); } }, String(i + 1))))),
              h('table.tt.gr-table', { style: { width: '100%' } },
                h('thead', h('tr', h('th.l', 'invariant'), h('th', 'G'), h('th', 'H'), h('th', 'same?'))),
                h('tbody', NAMES.map((nm, i) => { const shown = i < revealed; const [a, b] = F.rows[i]; return h('tr', { class: shown && a !== b ? 'cur' : '' }, h('td.l', nm), h('td.mono', shown ? String(a) : '?'), h('td.mono', shown ? String(b) : '?'), h('td', shown ? (a === b ? 'match' : 'differ') : '')); }))),
              h('div.row', { style: { gap: '0.3rem' } },
                h('button.btn.sm.primary', { onclick: () => { revealed = Math.min(NAMES.length, revealed + 1); draw(); }, disabled: revealed >= NAMES.length }, revealed ? 'Reveal next invariant' : 'Reveal the first invariant'),
                h('button.btn.sm', { onclick: () => { revealed = NAMES.length; draw(); }, disabled: revealed >= NAMES.length }, 'Reveal all')),
              h('div.row', { style: { gap: '0.3rem' } },
                h('span.small', 'Your call:'),
                ['Isomorphic', 'Not isomorphic'].map((c) => h('button.btn.sm', { 'aria-pressed': String(decided === c), class: decided === c ? 'on' : '', onclick: () => { decided = c; showMap = !!F.f; draw(); } }, c)),
                F.f && decided ? h('button.btn.sm', { 'aria-pressed': String(showMap), class: showMap ? 'on' : '', onclick: () => { showMap = !showMap; draw(); } }, showMap ? 'Hide the mapping' : 'Show the mapping') : null),
              fb ? h('div.feedback', { class: fb[0] }, fb[1])
                : revealed >= NAMES.length ? h('div.feedback.info', d >= 0 ? 'One invariant differs. What does that tell you?' : 'All five invariants match. That is consistent with isomorphism but proves nothing by itself: decide, then check the mapping.')
                  : h('p.small.muted', 'Reveal invariants until one differs, or until you are ready to decide. Where a vertex sits on the page means nothing; only which pairs are joined.'),
              showMap && F.f ? h('p.tiny.muted', 'The highlighted badges on H name the vertex of G that each vertex came from.') : null);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Design practice: graphs in real software',
        kind: 'design',
        html: String.raw`<p class="muted small">Graph code goes wrong in predictable ways: unclear modeling, the wrong representation, missing visited checks. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Model the domain before you write code',
            html: '<p>Decide on paper what a vertex is, what an edge is, whether edges have a direction, and whether they carry weights. "Ana follows Ben" is directed; "Ana and Ben are friends" is not. Write the decision down next to the data structure, because every algorithm you run later depends on it.</p>',
            bad: 'g = {"ana": ["ben"], "ben": []}\n# follows? friends? which direction?',
            good: '# Directed: an edge u -> v means "u follows v"\nfollows = {"ana": {"ben"}, "ben": set()}',
          },
          {
            name: 'Adjacency lists for sparse graphs, matrices for dense ones',
            html: '<p>Most real graphs are <b>sparse</b>: each vertex has a few neighbors out of millions of vertices. An adjacency matrix spends \\(|V|^2\\) memory on mostly zeros, while an adjacency list spends memory only on edges that exist. Choose a matrix for small or dense graphs, or when you need matrix algebra such as \\(A^k\\).</p>',
            bad: 'n = 100_000_000\nadj = [[0] * n for _ in range(n)]   # 10**16 cells',
            good: 'from collections import defaultdict\nadj = defaultdict(set)              # only real edges\nadj["ana"].add("ben")',
          },
          {
            name: 'Add undirected edges in both directions, in one place',
            html: '<p>An undirected edge must appear in both endpoints\' neighbor sets. Forgetting one half creates a graph that is secretly directed: B can no longer reach A, and degree counts break the handshake theorem. Put the rule in one helper function and always use it.</p>',
            bad: 'adj["A"].add("B")\n# forgot adj["B"].add("A"): B cannot reach A',
            good: 'def add_edge(adj, u, v):\n    adj[u].add(v)\n    adj[v].add(u)      # the edge goes both ways',
          },
          {
            name: 'Always keep a visited set',
            html: '<p>Graphs have cycles, so a traversal without a visited check walks around a cycle forever, or until Python raises <code>RecursionError</code>. Mark each vertex when you first discover it and check the mark before visiting again. A set gives constant-time checks.</p>',
            bad: 'def dfs(v):\n    for w in adj[v]:\n        dfs(w)          # loops forever on a cycle',
            good: 'def dfs(v, seen):\n    seen.add(v)\n    for w in adj[v]:\n        if w not in seen:\n            dfs(w, seen)',
          },
          {
            name: 'Use a priority queue for Dijkstra',
            html: '<p>Finding the closest unfinished vertex by scanning all of them costs \\(O(|V|)\\) per step and \\(O(|V|^2)\\) overall. A heap answers the same question in \\(O(\\log\\ |V|)\\), for \\(O((|V| + |E|)\\ \\log\\ |V|)\\) in total. On a road map with millions of intersections that is the difference between milliseconds and minutes.</p>',
            bad: 'u = min(todo, key=lambda v: dist[v])   # O(V) scan\ntodo.remove(u)',
            good: 'd, u = heapq.heappop(heap)       # O(log V)\nif d > dist[u]:\n    continue                     # stale entry',
          },
          {
            name: 'Never run Dijkstra with negative weights',
            html: '<p>Dijkstra finalizes the closest vertex for good, which is only safe if no later edge can make a route shorter. One negative edge breaks that promise. Example: A→B costs 2, A→C costs 3 and C→B costs −2. Dijkstra finalizes B at 2, but A→C→B costs 1. Check the weights first, and use Bellman–Ford when negatives are possible.</p>',
            good: 'if any(w < 0 for nbrs in graph.values()\n       for w in nbrs.values()):\n    raise ValueError("negative weight: use Bellman-Ford")',
          },
          {
            name: 'Use stable, hashable IDs and keep vertex data separate',
            html: '<p>Vertices should be small immutable values, such as integers or strings, so they can be dictionary keys and set members. Store the facts about each vertex (name, city, profile) in a separate dictionary keyed by the same ID. Renaming a user then changes one record instead of every edge that mentions them.</p>',
            bad: 'adj[{"name": "Ana", "city": "Miami"}] = set()\n# TypeError: unhashable type: \'dict\'',
            good: 'info = {17: {"name": "Ana", "city": "Miami"}}\nadj = {17: {42, 99}}       # structure uses IDs only',
          },
          {
            name: 'Use a tested library in production',
            html: '<p>For real analysis, use an established library such as <code>networkx</code> or a graph database. They provide tested shortest paths, components, centrality, PageRank and isomorphism checks. Write the algorithms yourself to understand them, then rely on a library for code you ship. (This course sticks to the standard library so every example runs anywhere.)</p>',
            good: 'import networkx as nx\nG = nx.Graph()\nG.add_weighted_edges_from([("A", "B", 4), ("A", "C", 2)])\nprint(nx.shortest_path(G, "A", "B", weight="weight"))',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example 1 */
      {
        title: 'Worked example: breadth-first search order and layers',
        kind: 'example',
        id: 'ex-bfs-order',
        objective: 'Run breadth-first search from a source vertex and read off the visit order and the layer (the fewest edges from the source) of every vertex it reaches.',
        problem: '<p>Run breadth-first search from vertex A in the graph with vertices A, B, C, D, E, F and edges A-B, A-C, B-D, C-D, C-E, D-F and E-F, visiting neighbors in alphabetical order. Give the visit order and the distance (layer) of each vertex from A.</p>',
        data: EX_BFS_DATA,
        steps: bfsStepsFor(EX_BFS_DATA),
        answer: EX_BFS_ANSWER,
        verify(M) {
          const edges = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']];
          const verts = ['A', 'B', 'C', 'D', 'E', 'F'];
          const adj = Object.fromEntries(verts.map((v) => [v, []]));
          edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
          verts.forEach((v) => adj[v].sort());
          const dist = { A: 0 }, order = [], q = ['A'];
          while (q.length) { const u = q.shift(); order.push(u); for (const w of adj[u]) if (!(w in dist)) { dist[w] = dist[u] + 1; q.push(w); } }
          const sameOrder = JSON.stringify(order) === JSON.stringify(EX_BFS_ANSWER.order);
          const sameDist = verts.every((v) => dist[v] === EX_BFS_ANSWER.dist[v]);
          const layersOk = edges.every(([a, b]) => Math.abs(EX_BFS_ANSWER.dist[a] - EX_BFS_ANSWER.dist[b]) <= 1);
          return sameOrder && sameDist && layersOk;
        },
        variants: [
          {
            label: 'Variant: disconnected graph',
            problem: '<p>Run breadth-first search from vertex A in the graph with vertices A, B, C, D, E, F and edges A-B, A-C, B-D, C-D and C-E, so F has no edges at all, visiting neighbors in alphabetical order. Give the visit order, the layer of each reached vertex, and say what happens to F.</p>',
            data: VAR_BFS_DATA,
            steps: bfsStepsFor(VAR_BFS_DATA),
            answer: VAR_BFS_DATA.answer,
            verify(M) {
              // independent check: expand the reached set one whole layer at a time, no queue
              const edges = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E']];
              const verts = ['A', 'B', 'C', 'D', 'E', 'F'];
              const dist = { A: 0 }, order = ['A'];
              let frontier = ['A'];
              while (frontier.length) {
                const next = [];
                for (const u of frontier) for (const w of verts) {
                  const joined = edges.some(([a, b]) => (a === u && b === w) || (a === w && b === u));
                  if (joined && !(w in dist)) { dist[w] = dist[u] + 1; next.push(w); }
                }
                next.sort();
                order.push(...next);
                frontier = next;
              }
              const ans = VAR_BFS_DATA.answer;
              const sameOrder = JSON.stringify(order) === JSON.stringify(ans.order);
              const sameDist = Object.keys(dist).every((v) => dist[v] === ans.dist[v]) && Object.keys(ans.dist).length === Object.keys(dist).length;
              const unOk = JSON.stringify(ans.unreached) === JSON.stringify(['F']) && !('F' in dist);
              return sameOrder && sameDist && unOk;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h, s, rc } = ctx;
          const D = (preset && preset.data) || EX_BFS_DATA;
          const snap = D.snaps[step.visited];
          const visited = new Set(snap.order);
          const discovered = new Set(snap.discovered);
          const kids = [];
          for (const [a, b] of D.edges) {
            const tree = snap.parent[b] === a || snap.parent[a] === b;
            kids.push(s('line', { x1: D.pos[a][0], y1: D.pos[a][1], x2: D.pos[b][0], y2: D.pos[b][1], stroke: tree ? 'var(--accent)' : 'var(--rule)', 'stroke-width': tree ? 4.5 : 2.2, 'stroke-linecap': 'round' }));
          }
          for (const v of D.verts) {
            const [x, y] = D.pos[v];
            const isV = visited.has(v), isQ = discovered.has(v) && !isV, cur = snap.current === v && !step.answer;
            kids.push(s('g', {},
              cur || (step.visited === 0 && v === D.src) ? s('circle', { cx: x, cy: y, r: 27, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2 }) : null,
              s('circle', { cx: x, cy: y, r: 20, fill: isV ? 'var(--accent)' : isQ ? 'var(--warn-bg)' : 'var(--sheet)', 'fill-opacity': isV ? 0.3 : 1, stroke: isV ? 'var(--accent)' : isQ ? 'var(--warn)' : 'var(--ink-3)', 'stroke-width': isV || isQ ? 3 : 1.5 }),
              s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: v }),
              isV ? s('text', { x, y: y + 38, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink-2)', text: `layer ${D.dist[v]}` }) : null,
              cur ? s('text', { x, y: y - 31, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--ink)', text: '▼ current' }) : null,
              step.visited === 0 && v === D.src ? s('text', { x, y: y - 31, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--accent)', text: '▼ source' }) : null));
          }
          const svg = s('svg', { viewBox: '0 0 520 235', role: 'img', 'aria-label': 'Graph for breadth-first search from the source, with visited vertices filled and the queue shown below', style: 'width:min(34rem,100%);height:auto' });
          rc(svg, kids);
          const queue = h('div', { style: { width: '100%' } },
            h('div.tiny.mono.muted', 'QUEUE'),
            h('div.gr-box', h('span.end', 'front →'), snap.queue.length ? snap.queue.map((v) => h('span.cell', v)) : h('span.small.muted', 'empty'), h('span.end', '← back')));
          const orderStrip = h('div', { style: { width: '100%' } },
            h('div.tiny.mono.muted', 'VISIT ORDER'),
            h('div.gr-order', snap.order.length ? snap.order.map((v, i) => h('span', h('b', String(i + 1)), v)) : h('span.small.muted', { style: { background: 'none' } }, 'nothing visited yet')));
          const table = step.answer ? h('table.tt',
            h('thead', h('tr', h('th', 'vertex'), D.verts.map((v) => h('th', v)))),
            h('tbody', h('tr', h('td', 'distance'), D.verts.map((v) => h('td', v in D.dist ? String(D.dist[v]) : 'unreached'))))) : null;
          const banner = step.answer ? h('div.ex-answer', D.unreached.length
            ? `Answer: visit order ${D.order.join(' → ')} · distances ${D.verts.map((v) => `${v} ${v in D.dist ? D.dist[v] : 'unreached'}`).join(', ')} · check: ${D.unreached.join(', ')} has no edges, so BFS from ${D.src} can never reach it ✓`
            : `Answer: visit order ${D.order.join(' → ')} · distances ${D.verts.map((v) => `${v} ${D.dist[v]}`).join(', ')} · check: every edge joins layers at most 1 apart (A-B: 0-1, D-F: 2-3), and F = 3 matches the path A-C-E-F ✓`) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.4rem' } }, svg, queue, orderStrip, table, banner));
        },
      },
      /* ---------------------------------------------------------------- worked example 2 */
      {
        title: 'Worked example: Dijkstra shortest distances from A',
        kind: 'example',
        id: 'ex-dijkstra',
        objective: 'Run Dijkstra\'s algorithm one settled vertex at a time, relaxing edges after each settle, to find the shortest distance from the source to every reachable vertex.',
        problem: '<p>Find the shortest distances from A in the weighted graph with edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, C-E 10 and D-E 2. Show the tentative distance of every vertex after each vertex is settled, and give the shortest path to E.</p>',
        data: EX_DIJ_DATA,
        steps: dijkstraStepsFor(EX_DIJ_DATA),
        answer: EX_DIJ_ANSWER,
        verify(M) {
          const edges = [['A', 'B', 4], ['A', 'C', 2], ['C', 'B', 1], ['B', 'D', 5], ['C', 'D', 8], ['C', 'E', 10], ['D', 'E', 2]];
          const verts = ['A', 'B', 'C', 'D', 'E'];
          const dist = Object.fromEntries(verts.map((v) => [v, v === 'A' ? 0 : Infinity]));
          for (let i = 0; i < verts.length - 1; i++) {
            for (const [a, b, w] of edges) {
              if (dist[a] + w < dist[b]) dist[b] = dist[a] + w;
              if (dist[b] + w < dist[a]) dist[a] = dist[b] + w;
            }
          }
          const wOf = (a, b) => edges.find(([x, y]) => (x === a && y === b) || (x === b && y === a))[2];
          const pathSum = wOf('A', 'C') + wOf('C', 'B') + wOf('B', 'D') + wOf('D', 'E');
          return verts.every((v) => dist[v] === EX_DIJ_ANSWER[v]) && pathSum === 10 && pathSum === EX_DIJ_ANSWER.E;
        },
        variants: [
          {
            label: 'Variant: unreachable vertex',
            problem: '<p>Find the shortest distances from A in the weighted graph with edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, C-E 10 and D-E 2, plus one extra vertex F that has no edges at all. Give every distance, the shortest path to E, and the distance of F.</p>',
            data: VAR_DIJ_DATA,
            steps: dijkstraStepsFor(VAR_DIJ_DATA),
            answer: VAR_DIJ_ANSWER,
            verify(M) {
              // independent check: Bellman-Ford relaxation over the variant graph
              const edges = [['A', 'B', 4], ['A', 'C', 2], ['C', 'B', 1], ['B', 'D', 5], ['C', 'D', 8], ['C', 'E', 10], ['D', 'E', 2]];
              const verts = ['A', 'B', 'C', 'D', 'E', 'F'];
              const dist = Object.fromEntries(verts.map((v) => [v, v === 'A' ? 0 : Infinity]));
              for (let i = 0; i < verts.length - 1; i++) {
                for (const [a, b, w] of edges) {
                  if (dist[a] + w < dist[b]) dist[b] = dist[a] + w;
                  if (dist[b] + w < dist[a]) dist[a] = dist[b] + w;
                }
              }
              const finiteOk = ['A', 'B', 'C', 'D', 'E'].every((v) => dist[v] === VAR_DIJ_ANSWER[v]);
              return finiteOk && dist.F === Infinity && VAR_DIJ_ANSWER.F === 'unreachable' && VAR_DIJ_ANSWER.E === 10;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h, s, rc } = ctx;
          const D = (preset && preset.data) || EX_DIJ_DATA;
          const snap = D.snaps[step.settled];
          const settled = new Set(snap.settled);
          const improved = new Map(snap.improved.map(([v, o, n]) => [v, [o, n]]));
          const fmtD = (d) => (d === Infinity ? '∞' : String(d));
          const kids = [];
          for (const [a, b, w] of D.edges) {
            const tree = snap.prev[b] === a || snap.prev[a] === b;
            const mx = (D.pos[a][0] + D.pos[b][0]) / 2, my = (D.pos[a][1] + D.pos[b][1]) / 2;
            kids.push(s('line', { x1: D.pos[a][0], y1: D.pos[a][1], x2: D.pos[b][0], y2: D.pos[b][1], stroke: tree ? 'var(--accent)' : 'var(--ink-3)', 'stroke-width': tree ? 4 : 1.8, 'stroke-linecap': 'round' }));
            kids.push(s('circle', { cx: mx, cy: my, r: 10.5, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.2 }));
            kids.push(s('text', { x: mx, y: my + 4, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: 'var(--ink)', text: String(w) }));
          }
          for (const v of D.verts) {
            const [x, y] = D.pos[v];
            const isF = settled.has(v), front = !isF && snap.dist[v] < Infinity, cur = snap.current === v && !step.answer, imp = improved.has(v);
            kids.push(s('g', {},
              cur ? s('circle', { cx: x, cy: y, r: 27, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.2 }) : null,
              s('circle', { cx: x, cy: y, r: 20, fill: isF ? 'var(--accent)' : front ? 'var(--warn-bg)' : 'var(--sheet)', stroke: isF ? 'var(--accent)' : front ? 'var(--warn)' : 'var(--ink-3)', 'stroke-width': isF || front ? 3 : 1.5 }),
              s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: isF ? 'var(--accent-ink)' : 'var(--ink)', text: v }),
              isF ? s('text', { x: x + 25, y: y - 15, 'font-size': 13, 'font-weight': 700, fill: 'var(--true)', text: '✓' }) : null,
              cur ? s('text', { x, y: y - 31, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: 'var(--ink)', text: '▼ settled now' }) : null,
              s('text', { x, y: y + 38, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, class: imp ? 'ex-improved' : null, fill: imp ? 'var(--warn)' : isF ? 'var(--accent)' : 'var(--ink-2)', text: imp ? `${fmtD(snap.dist[v])} ↓` : fmtD(snap.dist[v]) })));
          }
          const svg = s('svg', { viewBox: '0 0 520 250', role: 'img', 'aria-label': 'Weighted graph for Dijkstra from A, with the current distance under each vertex', style: 'width:min(34rem,100%);height:auto' });
          rc(svg, kids);
          const note = snap.improved.length
            ? h('p.small', { html: `Improved on this step: ${snap.improved.map(([v, o, n]) => `<b>${v}</b> ${fmtD(o)} → ${n}`).join(', ')}` })
            : step.settled > 0 && !step.answer ? h('p.small.muted', 'No label improved on this step.') : null;
          const orderStrip = h('div', { style: { width: '100%' } },
            h('div.tiny.mono.muted', 'SETTLED ORDER'),
            h('div.gr-order', snap.settled.length ? snap.settled.map((v, i) => h('span', h('b', String(i + 1)), `${v}:${snap.dist[v]}`)) : h('span.small.muted', { style: { background: 'none' } }, 'nothing settled yet')));
          const table = step.answer ? h('table.tt',
            h('thead', h('tr', h('th', 'vertex'), D.verts.map((v) => h('th', v)))),
            h('tbody', h('tr', h('td', 'distance'), D.verts.map((v) => h('td', fmtD(D.dist[v])))))) : null;
          const banner = step.answer ? h('div.ex-answer', D.unreached.length
            ? `Answer: distances from ${D.src} — ${D.verts.map((v) => `${v} ${fmtD(D.dist[v])}`).join(', ')} · shortest path to ${D.target}: ${D.path.join('-')} = ${D.pathSum} · check: ${D.unreached.join(', ')} has no edges, so its distance stays at infinity and the algorithm stops without settling it ✓`
            : `Answer: distances from A — A 0, B 3, C 2, D 8, E 10 · shortest path to E: A-C-B-D-E = 2 + 1 + 5 + 2 = 10 · check: D via C would be 2 + 8 = 10 > 8, so the route through B is better ✓`) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.4rem' } }, svg, note, orderStrip, table, banner));
        },
      },
      /* ---------------------------------------------------------------- 16 */
      {
        title: 'Practice: graphs',
        kind: 'practice',
        html: String.raw`<p class="muted small">Answer with a number unless buttons are shown. Every problem is freshly generated, and the worked solution explains each step.</p>`,
        gens: [
          {
            label: 'Degrees and edges',
            make(R, M) {
              const kind = R.int(0, 3);
              if (kind === 1) {
                const n = R.int(4, 12);
                return { prompt: String.raw`How many edges does the complete graph \(K_{${n}}\) have?`, answer: (n * (n - 1)) / 2, hint: 'every pair of vertices is joined by exactly one edge.', solution: String.raw`Each of the \(\binom{${n}}{2}\) pairs of vertices is joined by one edge: \(\frac{${n} \cdot ${n - 1}}{2} = ${(n * (n - 1)) / 2}\). Check with the handshake theorem: each vertex has degree ${n - 1}, and \(${n} \cdot ${n - 1} = ${n * (n - 1)} = 2 \cdot ${(n * (n - 1)) / 2}\).` };
              }
              if (kind === 2) {
                const m = R.int(2, 6), n = R.int(2, 7);
                return { prompt: String.raw`How many edges does the complete bipartite graph \(K_{${m},${n}}\) have?`, answer: m * n, solution: String.raw`Every one of the ${m} vertices on one side is joined to every one of the ${n} vertices on the other side, and there are no edges inside a side: \(${m} \cdot ${n} = ${m * n}\).` };
              }
              // a real random graph gives a degree sequence
              const n = R.int(5, 7);
              let E;
              do { E = allPairs(n).filter(() => R.chance(0.42)); } while (E.length < 3);
              const deg = Array(n).fill(0);
              E.forEach(([a, b]) => { deg[a]++; deg[b]++; });
              const seq = deg.slice().sort((a, b) => b - a);
              const sum = seq.reduce((x, y) => x + y, 0);
              if (kind === 0) {
                return { prompt: `A graph has ${n} vertices with degrees ${seq.join(', ')}. How many edges does it have?`, answer: sum / 2, hint: 'the degrees add up to twice the number of edges.', solution: String.raw`By the handshake theorem, \(\sum \deg(v) = 2|E|\). Here \(${seq.join(' + ')} = ${sum}\), so \(|E| = ${sum} / 2 = ${sum / 2}\).` };
              }
              const bad = R.chance(0.5);
              const shown = seq.slice();
              if (bad) { const i = R.int(0, n - 1); shown[i] = shown[i] === n - 1 ? shown[i] - 1 : shown[i] + 1; shown.sort((a, b) => b - a); }
              const ssum = shown.reduce((x, y) => x + y, 0);
              return {
                prompt: `True or false: no graph at all can have the degree sequence ${shown.join(', ')}.`,
                options: ['True', 'False'], answer: ssum % 2 ? 'True' : 'False',
                solution: ssum % 2
                  ? String.raw`<b>True.</b> The degrees add up to \(${shown.join(' + ')} = ${ssum}\), an odd number. The handshake theorem says the sum is \(2|E|\), which is always even, so no graph has these degrees.`
                  : String.raw`<b>False.</b> The sum \(${shown.join(' + ')} = ${ssum}\) is even, so the handshake theorem does not rule it out, and in fact a graph with these degrees exists (this sequence came from one). An odd sum is the quick test for impossibility.`,
              };
            },
          },
          {
            label: 'Euler paths and cycles',
            make(R) {
              const want = R.pick(['cycle', 'path', 'neither']);
              let n, E, deg, odd;
              for (let tries = 0; tries < 400; tries++) {
                n = R.int(5, 6);
                const set = new Set();
                for (let v = 1; v < n; v++) set.add(`${R.int(0, v - 1)}-${v}`);
                for (const [a, b] of allPairs(n)) if (R.chance(0.3)) set.add(`${a}-${b}`);
                E = [...set].map((k) => k.split('-').map(Number));
                deg = Array(n).fill(0);
                E.forEach(([a, b]) => { deg[a]++; deg[b]++; });
                odd = deg.map((d, i) => (d % 2 ? i : -1)).filter((i) => i >= 0);
                const cat = odd.length === 0 ? 'cycle' : odd.length === 2 ? 'path' : 'neither';
                if (cat === want) break;
              }
              const cat = odd.length === 0 ? 'cycle' : odd.length === 2 ? 'path' : 'neither';
              const labels = LET.slice(0, n).split('');
              const nodes = ring(n, 105, 78, 62, labels);
              const svg = fig(210, 156, nodes, E, { aria: 'Graph for this problem', style: 'max-height:9.5rem;display:block;margin:0.3rem auto' });
              const opts = ['Euler cycle', 'Euler path, but no Euler cycle', 'Neither'];
              const answer = cat === 'cycle' ? opts[0] : cat === 'path' ? opts[1] : opts[2];
              return {
                prompt: `This connected graph has edges ${E.map(([a, b]) => labels[a] + labels[b]).sort().join(', ')}. Which does it have?${svg}`,
                options: opts, answer,
                solution: `Degrees: ${labels.map((l, i) => `${l} = ${deg[i]}`).join(', ')}. ${odd.length === 0 ? 'Every degree is even, so by Euler\'s theorem the graph has an <b>Euler cycle</b>.' : odd.length === 2 ? `Exactly two vertices (${labels[odd[0]]} and ${labels[odd[1]]}) have odd degree, so there is an <b>Euler path</b> from one to the other, but no Euler cycle.` : `${odd.length} vertices have odd degree (${odd.map((i) => labels[i]).join(', ')}). An Euler path allows at most two, so the answer is <b>neither</b>.`}`,
              };
            },
          },
          {
            label: 'Shortest path (Dijkstra)',
            make(R) {
              const pos = { A: [30, 80], B: [115, 22], C: [115, 138], D: [205, 22], E: [205, 138], F: [285, 80] };
              const names = Object.keys(pos);
              const cand = [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'E'], ['B', 'E'], ['C', 'D'], ['D', 'E'], ['D', 'F'], ['E', 'F']];
              const must = [['A', 'B'], ['B', 'D'], ['D', 'F'], ['A', 'C'], ['C', 'E']];
              const chosen = cand.filter((e) => must.some((m) => m[0] === e[0] && m[1] === e[1]) || R.chance(0.55));
              const WE = chosen.map(([a, b]) => [a, b, R.int(1, 9)]);
              const adj = Object.fromEntries(names.map((v) => [v, []]));
              WE.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
              const { dist, prev, order } = dijkstra(names, adj, 'A');
              const route = pathTo(prev, 'A', 'F');
              const idx = Object.fromEntries(names.map((v, i) => [v, i]));
              const svg = fig(315, 160, names.map((v) => [v, ...pos[v]]), WE.map(([a, b, w]) => [idx[a], idx[b], w]), { aria: 'Weighted graph for this problem', lt: 0.4, style: 'max-height:9.5rem;display:block;margin:0.3rem auto' });
              return {
                prompt: `Using Dijkstra's algorithm, find the length of the shortest path from A to F.${svg}`,
                answer: dist.F,
                hint: 'finalize the closest unfinished vertex, then relax its edges; repeat.',
                solution: `Dijkstra finalizes the vertices in this order: ${order.map((v) => `${v} (${dist[v]})`).join(', ')}. The shortest route is ${route.join(' → ')}, with length ${route.slice(1).map((v, i) => WE.find(([a, b]) => (a === route[i] && b === v) || (b === route[i] && a === v))[2]).join(' + ')} = <b>${dist.F}</b>.`,
              };
            },
          },
          {
            label: 'Adjacency matrices',
            make(R) {
              const n = 4, lab = ['a', 'b', 'c', 'd'];
              let A;
              do {
                A = Array.from({ length: n }, () => Array(n).fill(0));
                for (const [i, j] of allPairs(n)) if (R.chance(0.55)) A[i][j] = A[j][i] = 1;
              } while (A.flat().filter(Boolean).length < 6);
              const table = `<table class="tt" style="margin:0.4rem 0"><thead><tr><th></th>${lab.map((l) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${A.map((row, i) => `<tr><th>${lab[i]}</th>${row.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
              const kind = R.int(0, 2);
              const edges = A.flat().filter(Boolean).length / 2;
              if (kind === 0) return { prompt: `This is the adjacency matrix of a simple graph. How many edges does the graph have?${table}`, answer: edges, solution: `Each edge appears twice in the matrix (row u, column v and row v, column u), so count the 1s and halve: ${edges * 2} / 2 = <b>${edges}</b>.` };
              if (kind === 1) { const v = R.int(0, 3), d = A[v].reduce((x, y) => x + y, 0); return { prompt: `This is the adjacency matrix of a simple graph. What is \\(\\deg(${lab[v]})\\)?${table}`, answer: d, solution: `The degree of ${lab[v]} is the sum of row ${lab[v]}: ${A[v].join(' + ')} = <b>${d}</b>.` }; }
              const i = R.int(0, 3), j = R.int(0, 3);
              const terms = A[i].map((x, k) => x * A[k][j]);
              const val = terms.reduce((x, y) => x + y, 0);
              const via = lab.filter((_, k) => terms[k]);
              return { prompt: `This is the adjacency matrix \\(A\\) of a graph. How many walks of length 2 go from ${lab[i]} to ${lab[j]}? (That is the entry \\((A^2)_{${lab[i]}${lab[j]}}\\).)${table}`, answer: val, hint: 'a walk of length 2 goes from the first vertex to some middle vertex, then on to the second.', solution: `Multiply row ${lab[i]} by column ${lab[j]}: ${A[i].map((x, k) => `${x}·${A[k][j]}`).join(' + ')} = <b>${val}</b>. ${val ? `The middle vertex can be ${via.join(' or ')}: ${via.map((m) => `${lab[i]} → ${m} → ${lab[j]}`).join(', ')}.` : 'No vertex is adjacent to both, so there is no such walk.'}` };
            },
          },
          {
            label: 'Isomorphism',
            make(R, M) {
              const HL = 'abcdefg';
              const seqOf = (k, E) => degrees(k, E).sort((a, b) => b - a);
              const relabel = (E, p) => E.map(([a, b]) => [p[a], p[b]]);
              const nonEdges = (k, E) => allPairs(k).filter(([a, b]) => !E.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
              const randomGraph = (k) => { let E; do { E = allPairs(k).filter(() => R.chance(0.45)); } while (E.length < k - 1 || E.length > M.C(k, 2) - 2); return E; };
              /* keeps the number of edges but changes the degree sequence by moving one edge; null if 60 tries fail */
              const moveEdge = (k, E) => {
                for (let t = 0; t < 60; t++) {
                  const drop = R.int(0, E.length - 1), add = R.pick(nonEdges(k, E));
                  const E2 = E.filter((_, i) => i !== drop).concat([add]);
                  if (seqOf(k, E2).join() !== seqOf(k, E).join()) return E2;
                }
                return null;
              };
              if (R.chance(0.55)) {
                // two drawings: a curated same-degree-sequence pair, a relabeled copy, or a moved edge
                const CURATED = [
                  [[[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]]],
                  [[[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]], [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]]],
                ];
                const mode = R.int(0, 2);
                const n = mode === 2 ? 6 : R.int(5, 6);
                let EG, EH;
                if (mode === 2) { const pair = R.shuffle(R.pick(CURATED)); EG = relabel(pair[0], R.shuffle(M.range(0, 5))); EH = relabel(pair[1], R.shuffle(M.range(0, 5))); }
                else { EG = randomGraph(n); const perm = R.shuffle(M.range(0, n - 1)); EH = relabel(mode === 0 ? EG : moveEdge(n, EG) || EG.slice(1), perm); }
                const f = isomorphism(n, EG, EH);
                const comps = (E) => componentsOf(M.range(0, n - 1), nbrsOf(E)).length;
                const rows = [['edges', EG.length, EH.length], ['degree sequence', seqOf(n, EG).join(', '), seqOf(n, EH).join(', ')], ['triangles', triangles(n, EG), triangles(n, EH)], ['components', comps(EG), comps(EH)]];
                const diff = rows.find(([, a, b]) => a !== b);
                const posG = ring(n, 100, 82, 62, M.range(1, n).map(String));
                const posH = (n === 5 ? [[40, 28], [160, 28], [100, 80], [40, 136], [160, 136]] : [[35, 32], [100, 32], [165, 32], [35, 128], [100, 128], [165, 128]]).map(([x, y], i) => [HL[i], x, y]);
                const figs = `<div class="row" style="justify-content:center;gap:1.5rem;margin:0.3rem 0">${fig(200, 160, posG, EG, { aria: 'Graph G', style: 'max-height:8.5rem;display:block' })}${fig(200, 160, posH, EH, { aria: 'Graph H', style: 'max-height:8.5rem;display:block' })}</div>`;
                return {
                  prompt: String.raw`Are these two graphs isomorphic? \(G\) is on the left (vertices 1 to ${n}) and \(H\) on the right (vertices a to ${HL[n - 1]}).${figs}`,
                  options: ['Yes', 'No'], answer: f ? 'Yes' : 'No',
                  hint: 'compare invariants first: edges, degree sequence, triangles, components. Only a mapping proves yes.',
                  solution: f
                    ? `<b>Yes.</b> Both have ${n} vertices, ${EG.length} edges and degree sequence ${rows[1][1]}, which only suggests it. The mapping ${f.map((j, i) => `${i + 1} → ${HL[j]}`).join(', ')} proves it, because it sends every edge of G to an edge of H: ${EG.map(([a, b]) => `${a + 1}${b + 1} → ${HL[f[a]]}${HL[f[b]]}`).join(', ')}.`
                    : `<b>No.</b> ${diff ? `Compare the ${diff[0]}: G has ${diff[1]} and H has ${diff[2]}.` : 'An exhaustive check of every vertex relabeling finds none that preserves adjacency.'} Isomorphic graphs agree on every invariant, so one mismatch is enough.`,
                };
              }
              const n = R.int(5, 7);
              const EG = randomGraph(n), sg = seqOf(n, EG);
              const opts = ['No: they do not even have the same number of edges', 'No: the edge counts agree, but the degree sequences differ', 'Possibly: these invariants match, so only a vertex mapping can decide'];
              const mode = R.int(0, 2);
              let EH, answer;
              if (mode === 0) { EH = relabel(EG, R.shuffle(M.range(0, n - 1))); answer = opts[2]; }
              else if (mode === 1) { EH = R.chance(0.5) && EG.length > n ? EG.slice(1) : [...EG, R.pick(nonEdges(n, EG))]; answer = opts[0]; }
              else { EH = moveEdge(n, EG); if (EH) answer = opts[1]; else { EH = EG.slice(1); answer = opts[0]; } }
              const sh = seqOf(n, EH);
              const sumG = sg.reduce((x, y) => x + y, 0), sumH = sh.reduce((x, y) => x + y, 0);
              return {
                prompt: String.raw`Graph \(G\) has ${n} vertices with degree sequence ${sg.join(', ')}. Graph \(H\) has ${n} vertices with degree sequence ${sh.join(', ')}. Can \(G\) and \(H\) be isomorphic?`,
                options: opts, answer,
                hint: 'the handshake theorem turns a degree sequence into an edge count.',
                solution: `Handshake theorem first: the degrees of G add to ${sumG}, so G has ${sumG / 2} edges; the degrees of H add to ${sumH}, so H has ${sumH / 2}. ` + (answer === opts[0]
                  ? 'Different edge counts, so no isomorphism is possible.'
                  : answer === opts[1]
                    ? `Same edge count. An isomorphism sends each vertex to a vertex of the same degree, so the sorted degree lists would have to agree. They do not (${sg.join(', ')} against ${sh.join(', ')}), so the graphs are not isomorphic.`
                    : 'Same edge count and the same degree sequence. These invariants are consistent with isomorphism but prove nothing: a hexagon and two separate triangles both have degree sequence 2, 2, 2, 2, 2, 2 and are not isomorphic. To prove isomorphism you must exhibit the vertex mapping.'),
              };
            },
          },
          {
            label: 'Planar & Hamiltonian',
            make(R, M) {
              const kind = R.int(0, 2);
              if (kind === 0) {
                const v = R.int(5, 12), e = R.int(v, 3 * v - 6), f = e - v + 2;
                return {
                  prompt: String.raw`A connected planar graph has \(${v}\) vertices and \(${e}\) edges. How many faces does a crossing-free drawing of it have, counting the outer face?`,
                  answer: f,
                  hint: String.raw`Euler's formula: \(V - E + F = 2\).`,
                  solution: String.raw`Euler's formula \(V - E + F = 2\) gives \(${v} - ${e} + F = 2\), so \(F = 2 - ${v} + ${e} = ${f}\). The unbounded outer region counts as one of the faces.`,
                };
              }
              if (kind === 1) {
                const tf = R.chance(0.4);
                const v = R.int(5, 9), e = R.int(v, tf ? Math.floor((v * v) / 4) : M.C(v, 2));
                const bound = tf ? 2 * v - 4 : 3 * v - 6;
                const opts = ['No: it has too many edges to be planar', 'Maybe: the edge bound does not rule it out'];
                const answer = e > bound ? opts[0] : opts[1];
                return {
                  prompt: String.raw`A simple${tf ? ', triangle-free' : ''} graph has \(${v}\) vertices and \(${e}\) edges. Can it be planar?`,
                  options: opts, answer,
                  hint: tf ? String.raw`a planar graph with no triangles has \(E \le 2V - 4\).` : String.raw`a simple planar graph with \(V \ge 3\) has \(E \le 3V - 6\).`,
                  solution: String.raw`In a crossing-free drawing every face has at least ${tf ? 4 : 3} boundary edges${tf ? ' (no triangles)' : ''} and every edge borders at most two faces, so \(${tf ? 4 : 3}F \le 2E\). Combined with Euler's formula that gives \(E \le ${tf ? '2V - 4' : '3V - 6'} = ${bound}\). Here \(E = ${e} ${e > bound ? '\\gt' : '\\le'} ${bound}\), so ${e > bound ? 'the graph cannot be planar.' : `the bound does not rule planarity out. It does not prove it either: ${tf ? 'subdivide one edge of \\(K_{3,3}\\) and you get a triangle-free graph with \\(V = 7\\) and \\(E = 10 = 2 \\cdot 7 - 4\\) that is still not planar' : '\\(K_{3,3}\\) has \\(9 \\le 3 \\cdot 6 - 6 = 12\\) edges and is still not planar'}.`}`,
                };
              }
              const n = R.int(5, 12), d = R.int(2, n - 1), ok = 2 * d >= n;
              return {
                prompt: String.raw`A simple graph has \(${n}\) vertices, and every vertex has degree at least \(${d}\). Does Dirac's theorem guarantee a Hamiltonian cycle?`,
                options: ['Yes', 'No'], answer: ok ? 'Yes' : 'No',
                hint: String.raw`Dirac's condition: every degree at least \(n/2\).`,
                solution: String.raw`Dirac's theorem: if every vertex of a simple graph with \(n \ge 3\) vertices has degree at least \(n/2\), the graph has a Hamiltonian cycle. Here \(n/2 = ${n / 2}\) and every degree is at least \(${d}\), which ${ok ? 'meets' : 'does not meet'} the condition. ${ok ? 'So a Hamiltonian cycle is <b>guaranteed</b>.' : 'So the theorem gives <b>no guarantee</b>. A cycle may still exist (the cube graph has degree 3 with 8 vertices and still has one): the condition is sufficient, not necessary.'}`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 17 */
      {
        title: 'Check yourself: graphs',
        kind: 'quiz',
        questions: [
          { q: 'A graph has five vertices with degrees 3, 3, 2, 2 and 2. How many edges does it have?', choices: ['6', '5', '12', 'It cannot exist'], answer: 0, explain: String.raw`By the handshake theorem the degrees add to \(2|E|\): \(3 + 3 + 2 + 2 + 2 = 12\), so \(|E| = 6\).` },
          { q: 'Is there a graph with five vertices that all have degree 3?', choices: ['Yes, for example the complete graph \\(K_5\\)', 'Yes, but only if loops are allowed', 'No: the degrees would add up to 15, an odd number', 'No: five vertices can have at most 4 edges'], answer: 2, explain: String.raw`The degree sum is always \(2|E|\), which is even. Five vertices of degree 3 add up to 15. (In \(K_5\) every vertex has degree 4, not 3.)` },
          { q: String.raw`How many edges does \(K_6\) have?`, choices: ['6', '12', '30', '15'], answer: 3, explain: String.raw`\(\binom{6}{2} = \frac{6 \cdot 5}{2} = 15\). Each of the 6 vertices has degree 5, and \(6 \cdot 5 = 30 = 2 \cdot 15\).` },
          { q: 'A connected graph has exactly two vertices of odd degree, u and v. What does Euler\'s theorem tell you?', choices: ['It has an Euler cycle', 'It has an Euler path from u to v, but no Euler cycle', 'It has neither an Euler path nor an Euler cycle', 'It has a Hamiltonian cycle'], answer: 1, explain: 'An Euler cycle needs every degree even. With exactly two odd vertices, an Euler path exists and must start at one of them and end at the other. Euler\'s theorem says nothing about Hamiltonian cycles.' },
          { q: 'Why can no walk cross each of the seven bridges of Königsberg exactly once?', choices: ['There are too many bridges', 'The island is not connected to the east land', 'A walk cannot cross water twice', 'All four land masses touch an odd number of bridges'], answer: 3, explain: 'Each pass through a land mass uses two bridges, so only the start and the finish may touch an odd number. In Königsberg all four land masses touch an odd number (5, 3, 3, 3).' },
          { q: 'What is the difference between an Euler cycle and a Hamiltonian cycle?', choices: ['An Euler cycle visits every vertex exactly once; a Hamiltonian cycle uses every edge exactly once', 'An Euler cycle uses every edge exactly once; a Hamiltonian cycle visits every vertex exactly once', 'They are two names for the same thing', 'An Euler cycle exists only in weighted graphs'], answer: 1, explain: String.raw`Euler cycles are about edges and have an instant test (every degree even). Hamiltonian cycles are about vertices and have no known fast test. The two are independent: \(K_4\) has a Hamiltonian cycle but no Euler cycle, because every degree is 3.` },
          { q: 'Why does Dijkstra\'s algorithm fail when some edge weights are negative?', choices: ['A vertex already finalized might later be reachable more cheaply through a negative edge', 'Heaps cannot store negative numbers', 'Negative weights make the graph disconnected', 'It runs forever'], answer: 0, explain: 'Dijkstra never revisits a finalized vertex. That is safe only if adding more edges can never shorten a route. A negative edge discovered later can, so the finalized distance may be wrong. Bellman–Ford handles negative weights.' },
          { q: 'A social network has 100 million users, each with about 200 friends. Which representation fits?', choices: ['An adjacency matrix, for fast lookups', 'An adjacency list', 'A list of all \\(\\binom{n}{2}\\) possible pairs', 'A single string'], answer: 1, explain: String.raw`A matrix would need \(10^{16}\) cells, almost all zero. The list stores only the real friendships, about \(2 \times 10^{10}\) entries. Sparse graphs call for adjacency lists.` },
          { q: 'In an unweighted graph, what does breadth-first search from a vertex s find?', choices: ['A Hamiltonian cycle through s', 'The heaviest path from s', 'The path from s with the fewest edges to every reachable vertex', 'Whether the graph is planar'], answer: 2, explain: 'BFS processes vertices in order of distance from s, so the first time it reaches a vertex it does so along a path with the fewest possible edges.' },
          { q: String.raw`What does the entry in row \(i\), column \(j\) of \(A^2\) count, where \(A\) is the adjacency matrix?`, choices: ['The number of edges at vertex \\(i\\)', 'The length of the shortest path from \\(v_i\\) to \\(v_j\\)', 'Whether \\(v_i\\) and \\(v_j\\) are adjacent', 'The number of walks of length 2 from \\(v_i\\) to \\(v_j\\)'], answer: 3, explain: String.raw`\((A^2)_{ij} = \sum_k A_{ik} A_{kj}\) counts the middle vertices \(k\) adjacent to both \(v_i\) and \(v_j\), that is, the walks \(v_i \to v_k \to v_j\). On the diagonal it gives the degree.` },
          { q: 'A connected planar graph has 10 vertices and 15 edges. How many faces does a crossing-free drawing of it have?', choices: ['7', '5', '23', '27'], answer: 0, explain: String.raw`Euler's formula \(V - E + F = 2\) gives \(10 - 15 + F = 2\), so \(F = 7\), counting the outer face.` },
          { q: String.raw`Why is \(K_{3,3}\) not planar?`, choices: ['It has more than \\(3V - 6 = 12\\) edges', 'Every vertex has odd degree', 'It is bipartite, so it has no triangles, and a planar graph without triangles needs \\(E \\le 2V - 4 = 8\\); it has 9 edges', 'It is not connected'], answer: 2, explain: String.raw`The general bound gives \(9 \le 12\) and does not decide. Without triangles every face has at least 4 boundary edges, so \(4F \le 2E\) and \(E \le 2V - 4 = 8\), one short of the 9 edges of \(K_{3,3}\). Kuratowski's theorem names \(K_5\) and \(K_{3,3}\) as the two basic obstacles to planarity. Odd degrees matter for Euler cycles, not for planarity.` },
        ],
      },
    ],
  });
})();
