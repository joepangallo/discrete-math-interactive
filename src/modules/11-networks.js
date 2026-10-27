/* Module 11: Network Flows. Objective 11: use network modeling to maximize data flow.
   Labs: a max-flow stepper with a residual view, a cut explorer, flow-based worker/job matching,
   and image segmentation by minimum cut. */
(() => {
  /* ---------- flow algorithms on a small named network: { s, t, edges: [{ u, v, c }] } ---------- */
  const parseEdges = (spec) => spec.split(/\s+/).map((tok) => { const [uv, c] = tok.split(':'); return { u: uv[0], v: uv[1], c: +c }; });

  // residual steps leaving x: forward steps (room c − f) first, then backward steps (room f), in edge order
  function arcsFrom(edges, flow, x) {
    const out = [];
    edges.forEach((e, i) => { if (e.u === x) out.push({ from: x, to: e.v, e: i, dir: 1, room: e.c - flow[i] }); });
    edges.forEach((e, i) => { if (e.v === x) out.push({ from: x, to: e.u, e: i, dir: -1, room: flow[i] }); });
    return out;
  }
  // an augmenting path as a list of residual steps, or null; 'bfs' = fewest edges, 'dfs' = first path found
  function findPath(net, flow, rule) {
    const { s, t, edges } = net;
    if (rule === 'dfs') {
      const seen = new Set([s]);
      const go = (x) => {
        if (x === t) return [];
        for (const a of arcsFrom(edges, flow, x)) {
          if (a.room > 0 && !seen.has(a.to)) { seen.add(a.to); const rest = go(a.to); if (rest) return [a, ...rest]; }
        }
        return null;
      };
      return go(s);
    }
    const parent = new Map([[s, null]]);
    const queue = [s];
    while (queue.length) {
      const x = queue.shift();
      for (const a of arcsFrom(edges, flow, x)) if (a.room > 0 && !parent.has(a.to)) { parent.set(a.to, a); queue.push(a.to); }
    }
    if (!parent.has(t)) return null;
    const path = [];
    for (let x = t; x !== s; x = parent.get(x).from) path.unshift(parent.get(x));
    return path;
  }
  function reachable(net, flow) {
    const S = new Set([net.s]);
    const queue = [net.s];
    while (queue.length) { const x = queue.shift(); for (const a of arcsFrom(net.edges, flow, x)) if (a.room > 0 && !S.has(a.to)) { S.add(a.to); queue.push(a.to); } }
    return S;
  }
  function runMaxFlow(net, rule = 'bfs') {
    const flow = net.edges.map(() => 0);
    const paths = [];
    let value = 0, p;
    while ((p = findPath(net, flow, rule)) && paths.length < 500) {
      const push = Math.min(...p.map((a) => a.room));
      p.forEach((a) => (flow[a.e] += a.dir * push));
      value += push;
      paths.push({ arcs: p, push });
    }
    return { value, flow, paths, S: reachable(net, flow) };
  }
  const pathText = (arcs) => arcs[0].from + arcs.map((a) => (a.dir > 0 ? ' → ' : ' ⇢ ') + a.to).join('');
  const edgeName = (e) => `${e.u} → ${e.v}`;
  const setText = (xs) => '{' + [...xs].join(', ') + '}';
  const ORDER = 'sabcdet';
  const sortV = (xs) => [...xs].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));

  /* ---------- SVG markup helpers (strings, so they work in concept slides, labs and practice prompts) ---------- */
  const r1 = (x) => Math.round(x * 10) / 10;
  function geom(p, q, ra, rb, off) {
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const x1 = p[0] + ux * ra + nx * off, y1 = p[1] + uy * ra + ny * off, x2 = q[0] - ux * rb + nx * off, y2 = q[1] - uy * rb + ny * off;
    return { x1, y1, x2, y2, ux, uy, nx, ny, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  }
  // augmenting paths use the keyword hue: it stays distinct from the accent in both themes
  const HOT_BG = 'color-mix(in oklch, var(--kw) 16%, var(--sheet))';
  // [stroke, width, dash]
  const EDGE = {
    base: ['var(--ink-3)', 1.8, ''],
    flow: ['var(--accent)', 3, ''],
    sat: ['var(--accent)', 4.6, ''],
    hot: ['var(--kw)', 5, ''],
    hotback: ['var(--kw)', 4, '8 5'],
    back: ['var(--fnc)', 2, '6 4'],
    cut: ['var(--false)', 4.2, ''],
    ignore: ['var(--ink-3)', 1.6, '3 4'],
    faint: ['var(--rule)', 1.6, ''],
  };
  // [fill, border, text]
  const LAB = {
    plain: ['var(--sheet)', 'var(--rule)', 'var(--ink)'],
    sel: ['var(--accent-2)', 'var(--accent)', 'var(--ink)'],
    hot: [HOT_BG, 'var(--kw)', 'var(--ink)'],
    cut: ['var(--false-bg)', 'var(--false)', 'var(--false)'],
    back: ['var(--sheet)', 'var(--fnc)', 'var(--fnc)'],
    dim: ['var(--sheet)', 'var(--rule)', 'var(--ink-3)'],
  };
  const NODE = {
    plain: ['var(--sheet)', 'var(--ink-2)', 'var(--ink)'],
    S: ['var(--accent-2)', 'var(--accent)', 'var(--ink)'],
    hot: [HOT_BG, 'var(--kw)', 'var(--ink)'],
    bad: ['var(--false-bg)', 'var(--false)', 'var(--ink)'],
  };
  function edgeMarkup(p, q, o) {
    const [col, w, dash] = EDGE[o.kind || 'base'];
    const g = geom(p, q, o.r1 ?? 16, o.r2 ?? 16, o.off || 0);
    const head = o.noHead ? 0 : 5 + w * 1.35;
    const bx = g.x2 - g.ux * head, by = g.y2 - g.uy * head;
    let m = `<g${o.data ? ' ' + o.data : ''}>`;
    if (o.data) m += `<line x1="${r1(g.x1)}" y1="${r1(g.y1)}" x2="${r1(g.x2)}" y2="${r1(g.y2)}" stroke="var(--ink)" stroke-opacity="0" stroke-width="16"/>`;
    m += `<line x1="${r1(g.x1)}" y1="${r1(g.y1)}" x2="${r1(bx)}" y2="${r1(by)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="${dash ? 'butt' : 'round'}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
    if (head) {
      const hw = head * 0.55;
      m += `<polygon points="${r1(g.x2)},${r1(g.y2)} ${r1(bx + g.nx * hw)},${r1(by + g.ny * hw)} ${r1(bx - g.nx * hw)},${r1(by - g.ny * hw)}" fill="${col}"/>`;
    }
    if (o.text != null && o.text !== '') {
      const fs = o.fs || 13, lo = o.labOff || 0;
      const lx = g.mx + g.nx * lo + (o.labDx || 0), ly = g.my + g.ny * lo + (o.labDy || 0);
      const plain = String(o.text).replace(/<[^>]+>/g, '');
      const bw = plain.length * fs * 0.6 + 10, bh = fs + 7;
      const [bg, bd, ink] = LAB[o.lab || 'plain'];
      m += `<rect x="${r1(lx - bw / 2)}" y="${r1(ly - bh / 2)}" width="${r1(bw)}" height="${bh}" rx="4" fill="${bg}" stroke="${o.selected ? 'var(--accent)' : bd}" stroke-width="${o.selected ? 2.6 : 1}"/>`;
      m += `<text x="${r1(lx)}" y="${r1(ly + 1)}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" fill="${ink}">${o.text}</text>`;
    }
    return m + '</g>';
  }
  function nodeMarkup(n, p, o = {}) {
    const [fill, stroke, ink] = NODE[o.kind || 'plain'];
    const term = n === 's' || n === 't';
    return `<g${o.data ? ' ' + o.data : ''}><circle cx="${p[0]}" cy="${p[1]}" r="${o.r || 16}" fill="${fill}" stroke="${stroke}" stroke-width="${term ? 2.6 : 1.8}"/>` +
      `<text x="${p[0]}" y="${p[1] + 1}" text-anchor="middle" dominant-baseline="central" font-size="${o.fs || 15}" font-weight="${term ? 700 : 600}" fill="${ink}">${n}</text></g>`;
  }
  // a complete static diagram: { w, h, pos, edges: [{ u, v, text, kind, lab, off, labOff }], nodes: { name: kind }, r, fs, aria }
  function netSvg(o) {
    const r = o.r || 16;
    let m = '';
    for (const e of o.edges) m += edgeMarkup(o.pos[e.u], o.pos[e.v], { r1: r, r2: r, fs: o.fs || 13, ...e });
    for (const [n, p] of Object.entries(o.pos)) m += nodeMarkup(n, p, { r, fs: (o.fs || 13) + 2, kind: (o.nodes || {})[n] });
    if (o.caption) m += `<text x="${o.w / 2}" y="${o.h - 6}" text-anchor="middle" font-size="${(o.fs || 13) - 1}" fill="var(--ink-2)">${o.caption}</text>`;
    return `<svg class="nf-svg" viewBox="0 0 ${o.w} ${o.h}" role="img" aria-label="${o.aria || 'Network diagram'}"${o.style ? ` style="${o.style}"` : ''}>${m}</svg>`;
  }

  /* ---------- static diagrams for the concept slides ---------- */
  const DIAMOND = { s: [36, 100], a: [160, 32], b: [160, 168], t: [284, 100] };
  const FIG_FLOW = netSvg({
    w: 330, h: 205, pos: { s: [36, 100], a: [165, 32], b: [165, 168], t: [294, 100] }, r: 18, fs: 14, aria: 'A flow of value 5 in a four-vertex network',
    edges: [
      { u: 's', v: 'a', text: '3/4', kind: 'flow' }, { u: 's', v: 'b', text: '2/2', kind: 'sat' }, { u: 'a', v: 'b', text: '1/1', kind: 'sat' },
      { u: 'a', v: 't', text: '2/3', kind: 'flow' }, { u: 'b', v: 't', text: '3/5', kind: 'flow' },
    ],
  });
  const FIG_TRAP_FLOW = netSvg({
    w: 320, h: 200, pos: DIAMOND, r: 16, fs: 13, aria: 'Flow after the greedy path s, a, b, t',
    edges: [
      { u: 's', v: 'a', text: '1/1', kind: 'sat' }, { u: 's', v: 'b', text: '0/1' }, { u: 'a', v: 'b', text: '1/1', kind: 'sat' },
      { u: 'a', v: 't', text: '0/1' }, { u: 'b', v: 't', text: '1/1', kind: 'sat' },
    ],
  });
  const FIG_TRAP_RES = netSvg({
    w: 320, h: 200, pos: DIAMOND, r: 16, fs: 13, aria: 'Residual network with the augmenting path s, b, a, t',
    edges: [
      { u: 'a', v: 's', text: '1', kind: 'back', lab: 'back' }, { u: 's', v: 'b', text: '1', kind: 'hot', lab: 'hot' }, { u: 'b', v: 'a', text: '1', kind: 'hotback', lab: 'hot' },
      { u: 'a', v: 't', text: '1', kind: 'hot', lab: 'hot' }, { u: 't', v: 'b', text: '1', kind: 'back', lab: 'back' },
    ],
  });
  const FIG_BIG = netSvg({
    w: 320, h: 200, pos: DIAMOND, r: 16, fs: 13, aria: 'A network where bad path choices take 2000 rounds',
    edges: [
      { u: 's', v: 'a', text: '1000' }, { u: 's', v: 'b', text: '1000' }, { u: 'a', v: 'b', text: '1', kind: 'hot', lab: 'hot' },
      { u: 'a', v: 't', text: '1000' }, { u: 'b', v: 't', text: '1000' },
    ],
  });
  const FIG_MATCH = netSvg({
    w: 340, h: 196, r: 14, fs: 12, aria: 'Matching drawn as a flow network', caption: 'workers A, B, C · jobs 1, 2, 3 · every edge has capacity 1',
    pos: { s: [28, 88], A: [118, 26], B: [118, 88], C: [118, 150], 1: [222, 26], 2: [222, 88], 3: [222, 150], t: [312, 88] },
    edges: [
      ...['A', 'B', 'C'].map((w) => ({ u: 's', v: w, kind: 'flow' })),
      { u: 'A', v: '1', kind: 'sat' }, { u: 'A', v: '2' }, { u: 'B', v: '1' }, { u: 'B', v: '2', kind: 'sat' }, { u: 'C', v: '2' }, { u: 'C', v: '3', kind: 'sat' },
      ...['1', '2', '3'].map((j) => ({ u: j, v: 't', kind: 'flow' })),
    ],
  });

  const FIG_CUT = netSvg({
    w: 540, h: 292, r: 20, fs: 15, aria: 'Maximum flow of value 19 with the minimum cut S = {s, c}',
    pos: { s: [36, 146], a: [182, 38], c: [182, 254], b: [358, 38], d: [358, 254], t: [504, 146] }, nodes: { s: 'S', c: 'S' },
    edges: [
      { u: 's', v: 'a', text: '10/10', kind: 'cut', lab: 'cut' }, { u: 's', v: 'c', text: '9/10', kind: 'flow' }, { u: 'a', v: 'b', text: '4/4', kind: 'sat' },
      { u: 'a', v: 'c', text: '0/2', kind: 'ignore', lab: 'dim' }, { u: 'a', v: 'd', text: '6/8', kind: 'flow' }, { u: 'c', v: 'd', text: '9/9', kind: 'cut', lab: 'cut' },
      { u: 'd', v: 'b', text: '5/6', kind: 'flow' }, { u: 'b', v: 't', text: '9/10', kind: 'flow' }, { u: 'd', v: 't', text: '10/10', kind: 'sat' },
    ],
  });

  /* ---------- worked examples: one shared network, layout, edge list and flow snapshots ---------- */
  const EX_NET_POS = { s: [60, 120], a: [210, 50], b: [210, 190], t: [440, 120] };
  const EX_NET_EDGES = [
    { key: 'sa', u: 's', v: 'a', c: 10 }, { key: 'sb', u: 's', v: 'b', c: 8 }, { key: 'ab', u: 'a', v: 'b', c: 3 },
    { key: 'at', u: 'a', v: 't', c: 6 }, { key: 'bt', u: 'b', v: 't', c: 12 },
  ];
  const EX_NET_FLOWS = [
    { sa: 0, sb: 0, ab: 0, at: 0, bt: 0 },
    { sa: 6, sb: 0, ab: 0, at: 6, bt: 0 },
    { sa: 6, sb: 8, ab: 0, at: 6, bt: 8 },
    { sa: 9, sb: 8, ab: 3, at: 6, bt: 11 },
  ];
  /* ---------- worked-example generators: snapshot steps computed from a preset's edge list ---------- */
  // Run the augmenting-path method on a preset's data ({ edges: [{ key, u, v, c }] }) and keep
  // a flow snapshot after every push, so primary and variant steps come from the same code.
  function flowRun(D, rule) {
    const net = { s: 's', t: 't', edges: D.edges.map((e) => ({ u: e.u, v: e.v, c: e.c })) };
    const flow = net.edges.map(() => 0);
    const snap = () => { const o = {}; D.edges.forEach((e, i) => (o[e.key] = flow[i])); return o; };
    const snaps = [{ flows: snap(), arcs: null, push: 0 }];
    let p;
    while ((p = findPath(net, flow, rule)) && snaps.length < 60) {
      const push = Math.min(...p.map((a) => a.room));
      p.forEach((a) => (flow[a.e] += a.dir * push));
      snaps.push({ flows: snap(), arcs: p, push });
    }
    const value = net.edges.reduce((acc, e, i) => acc + (e.u === 's' ? flow[i] : 0), 0);
    return { net, flow, snaps, value, S: reachable(net, flow) };
  }
  const flowVal = (D, flows) => D.edges.reduce((acc, e) => acc + (e.u === 's' ? flows[e.key] || 0 : 0), 0);
  const cutOf = (D, S) => D.edges.filter((e) => S.has(e.u) && !S.has(e.v));
  const midVerts = (D) => [...new Set(D.edges.flatMap((e) => [e.u, e.v]))].filter((x) => x !== 's' && x !== 't');
  const consOf = (D, flows) => midVerts(D).map((x) => ({
    x,
    inn: D.edges.reduce((a, e) => a + (e.v === x ? flows[e.key] || 0 : 0), 0),
    out: D.edges.reduce((a, e) => a + (e.u === x ? flows[e.key] || 0 : 0), 0),
  }));
  const otherSide = (D, S) => [...new Set(D.edges.flatMap((e) => [e.u, e.v]))].filter((x) => !S.has(x));

  function flowStepsFor(D, rule, checkpoint) {
    const run = flowRun(D, rule);
    const steps = [{
      flows: run.snaps[0].flows, label: 'flow', path: [], cut: [], reachable: [], shade: false, tagReach: false,
      status: 'All flows 0 · labels read flow / capacity · flow value |f| = 0',
      caption: 'Setup: every flow starts at 0, and a flow must respect each capacity and keep flow in equal to flow out at every vertex between s and t. We improve the flow one augmenting path at a time, always looking for spare room in the residual network.',
    }];
    run.snaps.slice(1).forEach((sn, i) => {
      const prev = run.snaps[i].flows;
      const arcs = sn.arcs;
      const tight = arcs.filter((a) => a.room === sn.push)
        .map((a) => (a.dir > 0 ? `${a.from} → ${a.to}` : `the backward step ${a.from} ⇢ ${a.to}`)).join(' and ');
      const backs = arcs.filter((a) => a.dir < 0);
      const newSat = D.edges.filter((e) => sn.flows[e.key] === e.c && e.c > 0 && (prev[e.key] || 0) < e.c)
        .map((e) => `${edgeName(e)} is now saturated at ${e.c}/${e.c}`);
      const val = flowVal(D, sn.flows);
      steps.push({
        flows: sn.flows, label: 'flow', path: arcs.map((a) => D.edges[a.e].key), cut: [], reachable: [], shade: false, tagReach: false,
        status: `Path ${pathText(arcs)} · bottleneck min(${arcs.map((a) => a.room).join(', ')}) = ${sn.push} · push ${sn.push} · |f| = ${val}`,
        caption: `Augment along ${pathText(arcs)}, whose bottleneck is min(${arcs.map((a) => a.room).join(', ')}) = ${sn.push}, set by ${tight}. Pushing ${sn.push} raises the flow value to ${val}${newSat.length ? `, and ${newSat.join(' and ')}` : ''}.${backs.map((a) => ` The dashed step ${a.from} ⇢ ${a.to} runs against edge ${a.to} → ${a.from}: it cancels ${sn.push} unit${sn.push > 1 ? 's' : ''} that edge was carrying, freeing that flow to take a better route.`).join('')}`,
      });
    });
    const S = run.S, cut = cutOf(D, S), cutSum = cut.reduce((a, e) => a + e.c, 0);
    const lastFlows = run.snaps[run.snaps.length - 1].flows;
    steps.push({
      flows: lastFlows, label: 'flow', path: [], cut: [], reachable: sortV(S), shade: true, tagReach: true,
      status: `Residual reachability: ${sortV(S).join(', ')} reachable · the rest are not · no augmenting path remains`,
      caption: `No augmenting path remains: in the residual network s can still reach only ${setText(sortV(S))}, because every forward edge from that set to the rest of the network is saturated, so no route to t survives. The reachable set therefore splits the network into a cut, and counting that cut in the answer step will prove that ${run.value} cannot be beaten.`,
    });
    const cons = consOf(D, lastFlows);
    steps.push({
      flows: lastFlows, label: 'flow', path: [], cut: cut.map((e) => e.key), reachable: sortV(S), shade: true, tagReach: false,
      status: `Maximum flow = ${run.value} · cut (${setText(sortV(S))} | ${setText(sortV(otherSide(D, S)))}) capacity = ${cut.map((e) => e.c).join(' + ')} = ${cutSum}`,
      answer: true,
      banner: `Maximum flow = ${run.value} · check: conservation holds at ${cons.map((c) => `${c.x} (in ${c.inn}, out ${c.out})`).join(' and at ')}, and the cut (${setText(sortV(S))} | ${setText(sortV(otherSide(D, S)))}) has capacity ${cut.map((e) => e.c).join(' + ')} = ${cutSum}`,
      caption: `Answer: the maximum flow is ${run.value}, and conservation checks out at ${cons.map((c) => `${c.x} (in ${c.inn}, out ${c.out})`).join(' and at ')}, with every capacity respected. The cut (${setText(sortV(S))} | ${setText(sortV(otherSide(D, S)))}) has capacity ${cut.map((e) => e.c).join(' + ')} = ${cutSum}, so a flow and a cut with equal values certify each other by the max-flow min-cut theorem and ${run.value} is provably maximal.`,
    });
    if (checkpoint) steps[checkpoint.at].checkpoint = checkpoint.text;
    return steps;
  }

  function cutStepsFor(D, checkpoint) {
    const run = flowRun(D, 'bfs');
    const flows = run.snaps[run.snaps.length - 1].flows;
    const S = run.S, cut = cutOf(D, S), cutSum = cut.reduce((a, e) => a + e.c, 0);
    const rooms = D.edges.map((e) => ({ e, fwd: e.c - (flows[e.key] || 0) }));
    const zero = rooms.filter((r) => r.fwd === 0);
    const mids = midVerts(D);
    const allCuts = [];
    for (let mask = 0; mask < (1 << mids.length); mask++) {
      const SS = new Set(['s', ...mids.filter((_, i) => mask & (1 << i))]);
      allCuts.push(`${setText(sortV(SS))}: ${cutOf(D, SS).reduce((a, e) => a + e.c, 0)}`);
    }
    const steps = [
      {
        flows, label: 'flow', path: [], cut: [], reachable: [], shade: false, tagReach: false,
        status: `Final flow · ${D.edges.map((e) => `${edgeName(e)} ${flows[e.key] || 0}/${e.c}`).join(' · ')} · |f| = ${run.value}`,
        caption: 'Setup: start from a maximum flow of this network, whose value is the total leaving s, and build its residual network to see what can still move. The method is to mark every vertex reachable from s in that residual network, because those vertices will form the source side of the cut.',
      },
      {
        flows, label: 'residual', path: [], cut: [], reachable: [], shade: false, tagReach: false,
        status: 'Residual room · forward = capacity − flow · backward = flow · dashed edges have 0 forward room',
        caption: `Compute the residual room on every edge: forward room is capacity minus flow, and backward room is the flow that could be canceled. The forward rooms are ${rooms.map((r) => `${edgeName(r.e)} ${r.fwd}`).join(', ')}, and the ${zero.length} edge${zero.length === 1 ? '' : 's'} with 0 forward room ${zero.length === 1 ? 'is' : 'are'} drawn dashed because nothing more can pass that way.`,
      },
      {
        flows, label: 'residual', path: [], cut: [], reachable: sortV(S), shade: true, tagReach: true,
        status: `Reachability walk: reachable set = ${setText(sortV(S))}`,
        caption: `Walk the residual network from s, following every step that still has positive room. The walk reaches exactly ${setText(sortV(S))}: every original edge from that set to the other side is saturated (${cut.map((e) => `${edgeName(e)} carries ${flows[e.key] || 0}/${e.c}`).join(', ')}), so no residual step crosses to the other side and the walk stops there.`,
      },
      {
        flows, label: 'flow', path: [], cut: cut.map((e) => e.key), reachable: sortV(S), shade: true, tagReach: false,
        status: `Cut edges: ${cut.map((e) => `${edgeName(e)} (${e.c})`).join(' · ')} · total ${cut.map((e) => e.c).join(' + ')} = ${cutSum}`,
        caption: `The cut edges are the original edges that run from the reachable side ${setText(sortV(S))} to the other side ${setText(sortV(otherSide(D, S)))}: ${cut.map(edgeName).join(', ')}, drawn dashed with an X. Adding only their capacities gives ${cut.map((e) => e.c).join(' + ')} = ${cutSum}, and edges that point back into ${setText(sortV(S))} are never counted.`,
      },
      {
        flows, label: 'flow', path: [], cut: cut.map((e) => e.key), reachable: sortV(S), shade: true, tagReach: false,
        status: `Minimum cut capacity = ${cutSum} · all ${allCuts.length} cuts: ${allCuts.join(' · ')}`,
        answer: true,
        banner: `Minimum cut capacity = ${cutSum} · check: cut (${setText(sortV(S))} | ${setText(sortV(otherSide(D, S)))}) = ${cut.map((e) => e.c).join(' + ')} = ${cutSum}, which equals the maximum flow`,
        caption: `Answer: the minimum cut capacity is ${cutSum}. Checking all ${allCuts.length} cuts gives ${allCuts.join(', ')}, so the smallest is ${cutSum}, and it also equals the maximum flow of ${run.value} — exactly as the max-flow min-cut theorem promises. The edges of this cut are the links that truly limit the network.`,
      },
    ];
    if (checkpoint) steps[checkpoint.at].checkpoint = checkpoint.text;
    return steps;
  }

  /* ---------- Stage D: a flow audit, and an augmenting run that must cancel flow ---------- */
  const AUD_POS = { s: [50, 120], a: [175, 40], b: [175, 200], c: [330, 120], t: [450, 120] };
  const AUD_EDGES = [
    { key: 'sa', u: 's', v: 'a', c: 9, f: 7 }, { key: 'sb', u: 's', v: 'b', c: 5, f: 3 }, { key: 'ab', u: 'a', v: 'b', c: 4, f: 2 },
    { key: 'ac', u: 'a', v: 'c', c: 6, f: 5 }, { key: 'bc', u: 'b', v: 'c', c: 4, f: 4 }, { key: 'bt', u: 'b', v: 't', c: 6, f: 1 },
    { key: 'ct', u: 'c', v: 't', c: 10, f: 9 },
  ];
  const AUD_VAR_EDGES = AUD_EDGES.map((e) => (e.key === 'ct' ? { ...e, f: 8 } : e));
  const REV_POS = { s: [50, 120], a: [175, 40], b: [175, 200], c: [325, 40], d: [325, 200], t: [450, 120] };
  const REV_EDGES = [
    { key: 'sa', u: 's', v: 'a', c: 4 }, { key: 'sb', u: 's', v: 'b', c: 4 }, { key: 'ab', u: 'a', v: 'b', c: 3 },
    { key: 'ac', u: 'a', v: 'c', c: 5 }, { key: 'bc', u: 'b', v: 'c', c: 3 }, { key: 'bd', u: 'b', v: 'd', c: 5 },
    { key: 'cd', u: 'c', v: 'd', c: 2 }, { key: 'ct', u: 'c', v: 't', c: 5 }, { key: 'dt', u: 'd', v: 't', c: 4 },
  ];
  const REV_VAR_EDGES = REV_EDGES.map((e) => (e.key === 'dt' ? { ...e, c: 6 } : e));
  const EX_AUDIT_DATA = { pos: AUD_POS, edges: AUD_EDGES };
  const EX_AUDIT_VAR_DATA = { pos: AUD_POS, edges: AUD_VAR_EDGES };
  const EX_REV_DATA = { pos: REV_POS, edges: REV_EDGES };
  const EX_REV_VAR_DATA = { pos: REV_POS, edges: REV_VAR_EDGES };

  // Audit a stated flow assignment: capacity on every edge, then conservation vertex by vertex.
  // Every number in the captions is summed here from the preset's edge list.
  function auditStepsFor(D) {
    const flows = {}; D.edges.forEach((e) => (flows[e.key] = e.f));
    const cons = consOf(D, flows);
    const over = D.edges.filter((e) => e.f < 0 || e.f > e.c);
    const bad = cons.filter((c) => c.inn !== c.out);
    const valid = !over.length && !bad.length;
    const valS = D.edges.reduce((a, e) => a + (e.u === 's' ? e.f : 0), 0);
    const valT = D.edges.reduce((a, e) => a + (e.v === 't' ? e.f : 0), 0);
    const tight = D.edges.reduce((a, e) => (e.c - e.f < a.c - a.f ? e : a), D.edges[0]);
    const base = { flows, label: 'flow', path: [], cut: [], reachable: [], shade: false, tagReach: false, focus: null, bad: [] };
    const steps = [{
      ...base,
      status: `Assigned flow · ${D.edges.map((e) => `${edgeName(e)} ${e.f}/${e.c}`).join(' · ')} · is it a valid flow, and what is its value?`,
      caption: 'Setup: someone hands us a finished flow assignment, not a maximum-flow computation. Before trusting its value we audit it against the two flow rules from the first slide: capacity on every edge, then conservation at every vertex between s and t, summed independently from the edge list.',
    }, {
      ...base, path: D.edges.map((e) => e.key),
      status: `Capacity audit · ${D.edges.map((e) => `${edgeName(e)} ${e.f} ≤ ${e.c} ${e.f <= e.c ? 'ok' : 'OVER'}`).join(' · ')} · tightest: ${edgeName(tight)} with room ${tight.c - tight.f}`,
      caption: `Capacity audit: compare every flow with its capacity, edge by edge. ${over.length ? `The audit fails here: ${over.map((e) => `${edgeName(e)} carries ${e.f} over a capacity of ${e.c}`).join(', ')}.` : `All ${D.edges.length} edges satisfy 0 ≤ f ≤ c, so rule one holds.`} The tightest edge is ${edgeName(tight)} at ${tight.f}/${tight.c}${tight.f === tight.c ? ', completely saturated, so it is the edge to watch in the vertex checks' : ''}.`,
    }];
    cons.forEach((c) => {
      const inc = D.edges.filter((e) => e.u === c.x || e.v === c.x).map((e) => e.key);
      const inTxt = D.edges.filter((e) => e.v === c.x).map((e) => `${edgeName(e)} ${flows[e.key]}`).join(' + ');
      const outTxt = D.edges.filter((e) => e.u === c.x).map((e) => `${edgeName(e)} ${flows[e.key]}`).join(' + ');
      steps.push({
        ...base, focus: c.x, path: inc, bad: c.inn === c.out ? [] : [c.x],
        status: `Vertex ${c.x} · in: ${inTxt} = ${c.inn} · out: ${outTxt} = ${c.out} · ${c.inn === c.out ? 'conservation holds' : 'CONSERVATION FAILS'}`,
        caption: c.inn === c.out
          ? `Vertex ${c.x}: the inflow is ${inTxt} = ${c.inn} and the outflow is ${outTxt} = ${c.out}. They match, so nothing is created or lost at ${c.x} and conservation holds here${c.x === 'c' ? ` — and this is the tight check of the audit, because the saturated edge ${edgeName(tight)} feeds it` : ''}.`
          : `Vertex ${c.x}: the inflow is ${inTxt} = ${c.inn} but the outflow is only ${outTxt} = ${c.out}. They do not match: ${Math.abs(c.inn - c.out)} unit${Math.abs(c.inn - c.out) > 1 ? 's' : ''} ${c.inn > c.out ? 'vanish' : 'appear'} at ${c.x}, so conservation fails at exactly this vertex and the whole assignment is not a flow, whatever the other checks said.`,
      });
    });
    const last = cons[cons.length - 1];
    steps[steps.length - 2].checkpoint = `Predict: the last vertex to audit is ${last.x}, which receives ${last.inn} units in total from its incoming edges. Will the audit find that ${last.x} sends exactly ${last.inn} units onward — or is this where the assignment breaks?`;
    steps.push({
      ...base, path: D.edges.filter((e) => e.u === 's' || e.v === 't').map((e) => e.key),
      status: `Value from the ends · leaving s: ${valS} · entering t: ${valT} · ${valS === valT ? 'the two ends agree' : 'THE TWO ENDS DISAGREE'}`,
      caption: valid
        ? `Value: add the flow leaving s, ${valS}, and cross-check at the other end, where ${valT} enters t. Conservation at every middle vertex forces the two totals to agree, and they do, so the value of this flow is ${valS} — a statement about this assignment only, not a claim that no larger flow exists.`
        : `Value: the flow leaving s totals ${valS}, but only ${valT} arrives at t. For a genuine flow conservation would force these to be equal; the gap of ${Math.abs(valS - valT)} is the same missing unit the vertex audit caught at ${bad.map((c) => c.x).join(', ')}, now visible from the ends of the network.`,
    }, {
      ...base, path: [], bad: bad.map((c) => c.x), answer: true,
      status: valid ? `Valid flow · value |f| = ${valS}` : `Not a valid flow · conservation fails at ${bad.map((c) => c.x).join(', ')}`,
      banner: valid
        ? `Valid flow, value |f| = ${valS} · check: capacity holds on all ${D.edges.length} edges (${edgeName(tight)} is saturated at ${tight.c}/${tight.c}) and conservation holds at ${cons.map((c) => `${c.x} (${c.inn} in, ${c.out} out)`).join(', ')}`
        : `Not a valid flow · check: capacity holds on every edge, but conservation fails at ${bad.map((c) => `${c.x} (${c.inn} in, ${c.out} out)`).join(', ')} — ${Math.abs(valS - valT)} unit is lost there, so only ${valT} of the ${valS} units leaving s reach t`,
      caption: valid
        ? `Answer: the assignment is a valid flow of value ${valS}. Every capacity is respected and conservation held at ${cons.map((c) => c.x).join(', ')}, checked by direct summation over the edge list. Notice what the audit does not say: ${valS} need not be the maximum, and proving maximality would take a cut of capacity ${valS}, which is a separate argument.`
        : `Answer: the assignment is not a valid flow, and the audit names the exact failure: conservation at ${bad.map((c) => c.x).join(', ')} (${bad.map((c) => `${c.inn} in, ${c.out} out`).join('; ')}). Every other vertex balances and every capacity holds, which is the lesson — a flow can pass almost every check and still not be a flow, so the audit has to visit every vertex.`,
    });
    return steps;
  }
  function auditVerify(D, exp) {
    const inn = {}, out = {};
    for (const e of D.edges) { out[e.u] = (out[e.u] || 0) + e.f; inn[e.v] = (inn[e.v] || 0) + e.f; if (e.f < 0 || e.f > e.c) return false; }
    const bad = [...new Set(D.edges.flatMap((e) => [e.u, e.v]))].filter((x) => x !== 's' && x !== 't' && (inn[x] || 0) !== (out[x] || 0));
    return exp.valid ? bad.length === 0 && out.s === exp.value && inn.t === exp.value : bad.length === 1 && bad[0] === exp.at && out.s !== inn.t;
  }

  // Like flowStepsFor, but for the DFS run of a preset, recording which path edges are used
  // backward and narrating the cancellation: why it is legal and what rerouting it buys.
  function revStepsFor(D, checkpoint) {
    const run = flowRun(D, 'dfs');
    const steps = [{
      flows: run.snaps[0].flows, label: 'flow', path: [], back: [], cut: [], reachable: [], shade: false, tagReach: false, focus: null, bad: [],
      status: 'All flows 0 · depth-first search picks the first augmenting path it finds · watch the middle edges',
      caption: 'Setup: run Ford–Fulkerson with a depth-first search, which grabs the first augmenting path it stumbles on instead of the shortest one. Greedy first choices can block the optimum, and this network is built so that they do: the only escape will be a backward residual step that cancels flow already sent.',
    }];
    run.snaps.slice(1).forEach((sn, i) => {
      const prev = run.snaps[i].flows, arcs = sn.arcs;
      const backs = arcs.filter((a) => a.dir < 0);
      const val = flowVal(D, sn.flows);
      steps.push({
        flows: sn.flows, label: 'flow', path: arcs.map((a) => D.edges[a.e].key), back: backs.map((a) => D.edges[a.e].key), cut: [], reachable: [], shade: false, tagReach: false, focus: null, bad: [],
        status: `Path ${pathText(arcs)} · bottleneck ${sn.push} · |f| = ${val}${backs.length ? ' · THIS PATH CANCELS FLOW' : ''}`,
        caption: `Augment along ${pathText(arcs)} with bottleneck ${sn.push}, raising the flow value to ${val}.${backs.map((a) => { const e = D.edges[a.e]; return ` The step ${a.from} ⇢ ${a.to} is a backward residual step against edge ${edgeName(e)}: its room is exactly the ${prev[e.key]} unit${prev[e.key] > 1 ? 's' : ''} that edge is carrying, and pushing here subtracts ${sn.push} from it, leaving ${sn.flows[e.key]}. That is legal because the residual network only offers room that exists — canceling flow cannot break capacity, and at ${a.from} the inflow and the outflow both drop by ${sn.push}, so conservation survives. What it buys is rerouting: the units that were crossing ${edgeName(e)} are freed to leave ${e.u} another way, and the outgoing room at ${a.from} is handed to the flow arriving on this path instead.`; }).join('')}`,
      });
    });
    const S = run.S, cut = cutOf(D, S), cutSum = cut.reduce((a, e) => a + e.c, 0);
    const lastFlows = run.snaps[run.snaps.length - 1].flows;
    steps.push({
      flows: lastFlows, label: 'flow', path: [], back: [], cut: [], reachable: sortV(S), shade: true, tagReach: true, focus: null, bad: [],
      status: `Residual reachability: only ${sortV(S).join(', ')} reachable · no augmenting path remains · |f| = ${run.value}`,
      caption: `No augmenting path remains: from s every forward residual step is saturated, so the reachable set is just ${setText(sortV(S))}. ${run.snaps.some((sn) => sn.arcs && sn.arcs.some((a) => a.dir < 0)) ? 'A purely forward search would have stranded this flow below the maximum; it was the backward step, canceling an early greedy choice, that let the flow finish the job.' : 'This time every push was a plain forward push: the extra room on the last edge into t meant the greedy choices never painted the search into a corner, so no cancellation was needed.'}`,
    }, {
      flows: lastFlows, label: 'flow', path: [], back: [], cut: cut.map((e) => e.key), reachable: sortV(S), shade: true, tagReach: false, focus: null, bad: [], answer: true,
      status: `Maximum flow = ${run.value} · cut (${setText(sortV(S))} | ${setText(sortV(otherSide(D, S)))}) capacity = ${cutSum}`,
      banner: `Maximum flow = ${run.value} · check: conservation holds at ${consOf(D, lastFlows).map((c) => `${c.x} (in ${c.inn}, out ${c.out})`).join(', ')}, and the cut (${setText(sortV(S))} | ${setText(sortV(otherSide(D, S)))}) has capacity ${cut.map((e) => e.c).join(' + ')} = ${cutSum}`,
      caption: `Answer: the maximum flow is ${run.value}, certified by the cut (${setText(sortV(S))} | ${setText(sortV(otherSide(D, S)))}) of capacity ${cutSum}. ${run.snaps.some((sn) => sn.arcs && sn.arcs.some((a) => a.dir < 0)) ? `The route to it mattered: the final flow carries ${lastFlows.cd} on c → d even though an intermediate flow carried ${Math.max(...run.snaps.map((sn) => sn.flows.cd))} there — the difference is exactly what the backward step canceled and rerouted.` : 'Comparing runs is the lesson: the same greedy search that needed a cancellation on the tighter network finishes cleanly here, because the bottleneck that forced the rerouting is gone.'}`,
    });
    if (checkpoint) steps[checkpoint.at].checkpoint = checkpoint.text;
    return steps;
  }
  function revVerify(D, exp) {
    const mids = midVerts(D);
    let best = Infinity;
    for (let mask = 0; mask < (1 << mids.length); mask++) {
      const S = new Set(['s', ...mids.filter((_, i) => mask & (1 << i))]);
      best = Math.min(best, cutOf(D, S).reduce((a, e) => a + e.c, 0));
    }
    const caps = {}; D.edges.forEach((e) => (caps[e.key] = e.c));
    const okCaps = Object.keys(caps).every((k) => exp.flow[k] >= 0 && exp.flow[k] <= caps[k]);
    const cons = consOf(D, exp.flow);
    return best === exp.value && okCaps && cons.every((c) => c.inn === c.out) && flowVal(D, exp.flow) === exp.value;
  }

  // Kids for the two Stage D examples: like exNetKids, plus a focus ring, a bad-vertex fill,
  // reachable halos, and a dashed overlay arrow for any backward (canceling) path step.
  function exAuditKids(s, o, D) {
    const kids = [];
    const edges = D.edges, pos = D.pos, flows = o.flows || {};
    const path = o.path || [], cut = o.cut || [], reach = o.reachable || [], back = o.back || [], bad = o.bad || [];
    for (const n of reach) kids.push(s('circle', { cx: pos[n][0], cy: pos[n][1], r: 27, fill: 'var(--accent-2)', opacity: 0.5, stroke: 'var(--accent)', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
    for (const e of edges) {
      const f = flows[e.key] || 0;
      const sat = f === e.c && f > 0;
      const isCut = cut.includes(e.key), isPath = path.includes(e.key), isBack = back.includes(e.key);
      let col, w, dash;
      if (isCut) { col = 'var(--false)'; w = 4.2; dash = '7 5'; }
      else if (isBack) [col, w, dash] = EDGE.hotback;
      else if (isPath) [col, w, dash] = EDGE.hot;
      else if (sat) [col, w, dash] = EDGE.sat;
      else if (f > 0) [col, w, dash] = EDGE.flow;
      else[col, w, dash] = EDGE.base;
      const g = geom(pos[e.u], pos[e.v], 20, 20, 0);
      const head = 5 + w * 1.35;
      const bx = g.x2 - g.ux * head, by = g.y2 - g.uy * head, hw = head * 0.55;
      kids.push(s('line', { x1: r1(g.x1), y1: r1(g.y1), x2: r1(bx), y2: r1(by), stroke: col, 'stroke-width': w, fill: 'none', 'stroke-linecap': dash ? 'butt' : 'round', ...(dash ? { 'stroke-dasharray': dash } : {}) }));
      kids.push(s('polygon', { points: `${r1(g.x2)},${r1(g.y2)} ${r1(bx + g.nx * hw)},${r1(by + g.ny * hw)} ${r1(bx - g.nx * hw)},${r1(by - g.ny * hw)}`, fill: col }));
      if (isBack) {
        const gb = geom(pos[e.v], pos[e.u], 24, 24, 9);
        kids.push(s('line', { x1: r1(gb.x1), y1: r1(gb.y1), x2: r1(gb.x2), y2: r1(gb.y2), stroke: 'var(--kw)', 'stroke-width': 3, 'stroke-dasharray': '6 4', fill: 'none' }));
        kids.push(s('polygon', { points: `${r1(gb.x2)},${r1(gb.y2)} ${r1(gb.x2 - gb.ux * 9 + gb.nx * 5)},${r1(gb.y2 - gb.uy * 9 + gb.ny * 5)} ${r1(gb.x2 - gb.ux * 9 - gb.nx * 5)},${r1(gb.y2 - gb.uy * 9 - gb.ny * 5)}`, fill: 'var(--kw)' }));
      }
      const text = `${f}/${e.c}${sat ? ' full' : ''}${isCut ? ' ✕' : ''}${isBack ? ' cancel' : ''}`;
      const fs = 13, bw = text.length * fs * 0.6 + 10, bh = fs + 7;
      const [bg, bd, ink] = LAB[isCut ? 'cut' : isPath || isBack ? 'hot' : 'plain'];
      kids.push(s('rect', { x: r1(g.mx - bw / 2), y: r1(g.my - bh / 2), width: r1(bw), height: bh, rx: 4, fill: bg, stroke: bd, 'stroke-width': isPath || isCut || isBack ? 2 : 1 }));
      kids.push(s('text', { x: r1(g.mx), y: r1(g.my + 1), 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs, fill: ink, text }));
    }
    for (const [n, p] of Object.entries(pos)) {
      if (o.focus === n) kids.push(s('circle', { cx: p[0], cy: p[1], r: 26, fill: 'none', stroke: 'var(--kw)', 'stroke-width': 2.6, 'stroke-dasharray': '5 4' }));
      const [fill, stroke, ink] = NODE[bad.includes(n) ? 'bad' : reach.includes(n) ? 'S' : 'plain'];
      const term = n === 's' || n === 't';
      kids.push(s('circle', { cx: p[0], cy: p[1], r: 20, fill, stroke, 'stroke-width': term ? 2.6 : 1.8 }));
      kids.push(s('text', { x: p[0], y: p[1] + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 16, 'font-weight': term ? 700 : 600, fill: ink, text: n }));
      if (bad.includes(n)) kids.push(s('text', { x: p[0], y: p[1] + 38, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--false)', text: 'in ≠ out' }));
      if (o.tagReach) kids.push(s('text', { x: p[0], y: p[1] + 40, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: reach.includes(n) ? 'var(--accent)' : 'var(--ink-3)', text: reach.includes(n) ? 'reachable' : 'not reached' }));
    }
    return kids;
  }
  const exAuditDraw = (fallback) => function (stage, ctx, step, k, preset) {
    const { h, s } = ctx;
    const D = (preset && preset.data) || fallback;
    const svg = s('svg', { viewBox: '0 0 500 240', class: 'nf-svg', role: 'img', 'aria-label': step.status, style: { width: '470px', maxWidth: '100%', height: 'auto', display: 'block' } }, ...exAuditKids(s, step, D));
    stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem' } },
      h('div.small', h('b.mono', step.status)),
      svg,
      step.answer ? h('div.ex-answer', step.banner) : null));
  };


  /* ---------- worked-example preset data ---------- */
  const EX_MAXFLOW_DATA = { pos: EX_NET_POS, edges: EX_NET_EDGES, rule: 'bfs' };
  const EX_TRAP_DATA = {
    pos: EX_NET_POS, rule: 'dfs',
    edges: [
      { key: 'sa', u: 's', v: 'a', c: 1 }, { key: 'sb', u: 's', v: 'b', c: 1 }, { key: 'ab', u: 'a', v: 'b', c: 1 },
      { key: 'at', u: 'a', v: 't', c: 1 }, { key: 'bt', u: 'b', v: 't', c: 1 },
    ],
  };
  const EX_MINCUT_DATA = { pos: EX_NET_POS, edges: EX_NET_EDGES };
  const EX_MINCUT_VAR_DATA = {
    pos: EX_NET_POS,
    edges: [
      { key: 'sa', u: 's', v: 'a', c: 4 }, { key: 'sb', u: 's', v: 'b', c: 9 }, { key: 'ab', u: 'a', v: 'b', c: 2 },
      { key: 'at', u: 'a', v: 't', c: 7 }, { key: 'bt', u: 'b', v: 't', c: 8 },
    ],
  };

  // SVG elements for one snapshot of a preset's network; o is pure step data:
  // { flows, label: 'flow' | 'residual', path: [edge keys], cut: [edge keys], reachable: [vertices], shade, tagReach }
  // D is the active preset's data ({ pos, edges }); every preset of these examples shares the layout.
  function exNetKids(s, o, D) {
    const kids = [];
    const edges = (D && D.edges) || EX_NET_EDGES;
    const pos = (D && D.pos) || EX_NET_POS;
    const flows = o.flows || {};
    const path = o.path || [], cut = o.cut || [], reach = o.reachable || [];
    if (o.shade) kids.push(s('ellipse', { cx: 135, cy: 85, rx: 128, ry: 60, transform: 'rotate(-25 135 85)', fill: 'var(--accent-2)', opacity: 0.55, stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '8 5' }));
    for (const e of edges) {
      const f = flows[e.key] || 0;
      const sat = f === e.c && f > 0;
      const isCut = cut.includes(e.key), isPath = path.includes(e.key);
      let col, w, dash;
      if (isCut) { col = 'var(--false)'; w = 4.2; dash = '7 5'; }
      else if (isPath) [col, w, dash] = EDGE.hot;
      else if (o.label === 'residual' && e.c - f === 0) [col, w, dash] = EDGE.ignore;
      else if (sat) [col, w, dash] = EDGE.sat;
      else if (f > 0) [col, w, dash] = EDGE.flow;
      else[col, w, dash] = EDGE.base;
      const g = geom(pos[e.u], pos[e.v], 20, 20, 0);
      const head = 5 + w * 1.35;
      const bx = g.x2 - g.ux * head, by = g.y2 - g.uy * head, hw = head * 0.55;
      kids.push(s('line', { x1: r1(g.x1), y1: r1(g.y1), x2: r1(bx), y2: r1(by), stroke: col, 'stroke-width': w, fill: 'none', 'stroke-linecap': dash ? 'butt' : 'round', ...(dash ? { 'stroke-dasharray': dash } : {}) }));
      kids.push(s('polygon', { points: `${r1(g.x2)},${r1(g.y2)} ${r1(bx + g.nx * hw)},${r1(by + g.ny * hw)} ${r1(bx - g.nx * hw)},${r1(by - g.ny * hw)}`, fill: col }));
      const text = o.label === 'residual' ? `fwd ${e.c - f} · back ${f}` : `${f}/${e.c}${sat ? ' full' : ''}${isCut ? ' ✕' : ''}`;
      const fs = 13, bw = text.length * fs * 0.6 + 10, bh = fs + 7;
      const [bg, bd, ink] = LAB[isCut ? 'cut' : isPath ? 'hot' : 'plain'];
      kids.push(s('rect', { x: r1(g.mx - bw / 2), y: r1(g.my - bh / 2), width: r1(bw), height: bh, rx: 4, fill: bg, stroke: bd, 'stroke-width': isPath || isCut ? 2 : 1 }));
      kids.push(s('text', { x: r1(g.mx), y: r1(g.my + 1), 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs, fill: ink, text }));
    }
    for (const [n, p] of Object.entries(pos)) {
      const [fill, stroke, ink] = NODE[reach.includes(n) ? 'S' : 'plain'];
      const term = n === 's' || n === 't';
      kids.push(s('circle', { cx: p[0], cy: p[1], r: 20, fill, stroke, 'stroke-width': term ? 2.6 : 1.8 }));
      kids.push(s('text', { x: p[0], y: p[1] + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 16, 'font-weight': term ? 700 : 600, fill: ink, text: n }));
      if (o.tagReach) kids.push(s('text', { x: p[0], y: p[1] + 40, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: reach.includes(n) ? 'var(--accent)' : 'var(--ink-3)', text: reach.includes(n) ? 'reachable' : 'not reached' }));
    }
    return kids;
  }

  /* ---------- practice helpers: random five-vertex networks on a fixed layout ---------- */
  const TPL = { s: [30, 95], a: [140, 30], b: [140, 160], c: [252, 95], t: [352, 95] };
  function randomNet(R, lo, hi) {
    const pairs = [['s', 'a'], ['s', 'b'], ['a', 'c'], ['b', 'c'], ['c', 't']];
    if (R.chance(0.6)) pairs.splice(2, 0, R.chance(0.5) ? ['a', 'b'] : ['b', 'a']);
    if (R.chance(0.5)) pairs.push(['a', 't']);
    if (R.chance(0.5)) pairs.push(['b', 't']);
    return { s: 's', t: 't', edges: pairs.map(([u, v]) => ({ u, v, c: R.int(lo, hi) })) };
  }
  const practiceSvg = (net, label, nodes, kinds) => netSvg({
    w: 384, h: 190, pos: TPL, r: 15, fs: 13, nodes, aria: 'Network for this problem', style: 'width:100%;max-width:19.5rem;height:auto;display:block;margin:0.3rem 0',
    edges: net.edges.map((e, i) => ({ u: e.u, v: e.v, text: label(e, i), kind: kinds ? kinds(e, i) : 'base' })),
  });
  function allPaths(net) {
    const out = [];
    const go = (x, used, seen) => {
      if (x === net.t) { out.push(used); return; }
      net.edges.forEach((e, i) => { if (e.u === x && !seen.has(e.v)) go(e.v, [...used, i], new Set([...seen, e.v])); });
    };
    go(net.s, [], new Set([net.s]));
    return out;
  }

  /* ---------- a fast Edmonds–Karp on adjacency arrays (used by the segmentation lab: about 100 vertices) ---------- */
  function fastFlow(n) {
    const head = new Int32Array(n).fill(-1), to = [], cap = [], nxt = [];
    return {
      add(u, v, c) { to.push(v); cap.push(c); nxt.push(head[u]); head[u] = to.length - 1; to.push(u); cap.push(0); nxt.push(head[v]); head[v] = to.length - 1; },
      run(s, t) {
        let total = 0;
        const pe = new Int32Array(n);
        for (;;) {
          pe.fill(-1); pe[s] = -2;
          const q = [s];
          for (let qi = 0; qi < q.length && pe[t] === -1; qi++) for (let e = head[q[qi]]; e !== -1; e = nxt[e]) if (cap[e] > 0 && pe[to[e]] === -1) { pe[to[e]] = e; q.push(to[e]); }
          if (pe[t] === -1) return total;
          let b = Infinity;
          for (let v = t; v !== s; v = to[pe[v] ^ 1]) b = Math.min(b, cap[pe[v]]);
          for (let v = t; v !== s; v = to[pe[v] ^ 1]) { cap[pe[v]] -= b; cap[pe[v] ^ 1] += b; }
          total += b;
        }
      },
      reach(s) {
        const seen = new Uint8Array(n); seen[s] = 1;
        const q = [s];
        for (let qi = 0; qi < q.length; qi++) for (let e = head[q[qi]]; e !== -1; e = nxt[e]) if (cap[e] > 0 && !seen[to[e]]) { seen[to[e]] = 1; q.push(to[e]); }
        return seen;
      },
    };
  }

  DM.module({
    id: 'networks',
    num: 11,
    title: 'Network Flows',
    objectives: [11],
    terms: {
      'transport network': 'A directed graph in which every edge has a nonnegative capacity, with one source s (no incoming edges) and one sink t (no outgoing edges).',
      'source': 'The vertex s where everything that flows through a transport network starts.',
      'sink': 'The vertex t where everything that flows through a transport network ends.',
      'capacity': 'The most an edge can carry, written c(u, v). Think of the width of a pipe or the bandwidth of a link.',
      'flow': 'An amount f(u, v) on every edge that never exceeds the edge capacity and is conserved at every vertex other than s and t.',
      'conservation of flow': 'At every vertex except s and t, the total flow in equals the total flow out. Nothing is created or lost along the way.',
      'value of a flow': 'The total amount leaving the source, written |f|. Conservation makes it equal to the total amount entering the sink.',
      'saturated edge': 'An edge whose flow equals its capacity, so it has no room left in the forward direction.',
      'residual network': 'For a given flow, the network of remaining room: c − f forward on each edge, plus f backward (flow that could be canceled).',
      'residual capacity': 'The room on one step of the residual network: c − f on a forward step, f on a backward step.',
      'augmenting path': 'A path from s to t in the residual network where every step has positive residual capacity. Pushing flow along it increases the flow value.',
      'bottleneck': 'The smallest residual capacity on an augmenting path: the amount that can be pushed along it.',
      'Ford–Fulkerson method': 'Start from zero flow and repeatedly push the bottleneck along an augmenting path until none is left. The final flow is maximum.',
      'Edmonds–Karp algorithm': 'Ford–Fulkerson that always uses a shortest augmenting path (fewest edges), found by breadth-first search. It runs in O(|V|·|E|²) time.',
      'cut': 'A split of the vertices into S (containing s) and T (containing t). Its capacity c(S, T) adds up the capacities of edges from S to T only.',
      'minimum cut': 'A cut with the smallest possible capacity. Its edges are the true bottleneck of the network.',
      'max-flow min-cut theorem': 'In every transport network, the value of a maximum flow equals the capacity of a minimum cut.',
      'matching': 'A set of edges in which no two share an endpoint: each worker gets at most one job and each job at most one worker.',
      'maximum matching': 'A matching with as many edges as possible. In a bipartite graph its size equals the maximum flow of the network built by joining s to every worker and every job to t, with every capacity 1.',
      "Hall's condition": 'Every worker can be matched exactly when every set A of workers is qualified, in total, for at least |A| different jobs: |N(A)| ≥ |A|.',
    },
    symbols: [
      ['s, t', 'source and sink of a network', 'all flow starts at s and ends at t'],
      ['c(u, v)', 'capacity of edge u → v', 'c(s, a) = 10'],
      ['f(u, v)', 'flow on edge u → v', '0 ≤ f(u, v) ≤ c(u, v)'],
      ['|f|', 'value of the flow f', '|f| = total leaving s'],
      ['c_f(u, v)', 'residual capacity of a step', 'c − f forward, f backward'],
      ['⇢', 'backward step in an augmenting path', 's → c ⇢ a → t'],
      ['(S, T)', 'a cut with s ∈ S and t ∈ T', 'S = {s, c}'],
      ['c(S, T)', 'capacity of a cut', 'sum of S → T capacities'],
      ['N(A)', 'jobs adjacent to a set A of workers', 'N({Ben, Cy}) = {Label}'],
      ['λ', 'smoothness weight in min-cut segmentation', 'λ = 2'],
    ],
    css: `
      .nf-svg text { pointer-events: none; }
      .nf-svg [data-edge], .nf-svg [data-node], .nf-svg [data-bar] { cursor: pointer; }
      .nf-lab { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 0.9rem; align-items: stretch; }
      .nf-fig { display: flex; flex-direction: column; gap: 0.3rem; min-height: 0; background: var(--sheet); border: 1px solid var(--rule); border-radius: var(--radius); box-shadow: var(--shadow); padding: 0.45rem 0.6rem; }
      .nf-fig > svg { flex: 1 1 0; min-height: 0; width: 100%; display: block; }
      .nf-fig .legend { font-size: 0.74rem; gap: 0.3rem 0.8rem; }
      .nf-panel { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; }
      .nf-ctl { display: grid; grid-template-columns: 5.6rem minmax(0, 1fr); gap: 0.35rem 0.5rem; align-items: center; font-size: 0.8rem; color: var(--ink-2); }
      .nf-ctl .seg button { padding: 0.2rem 0.55rem; font-size: 0.8rem; }
      .nf-big { font-family: var(--font-display); font-size: 1.45rem; line-height: 1.1; }
      .nf-msg { font-size: 0.85rem; line-height: 1.45; }
      .nf-msg.feedback { color: var(--ink); }
      .nf-log { font-family: var(--font-mono); font-size: 0.74rem; color: var(--ink-2); margin: 0; padding-left: 1.6em; }
      .nf-log li + li { margin-top: 0.05rem; }
      .nf-edit { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; font-size: 0.85rem; }
      .nf-edit b.v { font-family: var(--font-mono); min-width: 1.6rem; text-align: center; }
      .nf-kv { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.15rem 0.6rem; font-size: 0.84rem; }
      .nf-kv > :nth-child(odd) { color: var(--ink-3); font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; padding-top: 0.15rem; }
      .nf-mx { border-collapse: collapse; font-size: 0.78rem; }
      .nf-mx th { font-weight: 600; color: var(--ink-2); padding: 0 0.15rem 0.15rem; text-align: center; }
      .nf-mx th.w { text-align: right; padding-right: 0.4rem; }
      .nf-mx td { padding: 0.08rem; }
      .nf-mx button { width: 2.9rem; height: 1.45rem; border: 1px solid var(--rule); border-radius: 0.3rem; background: var(--paper); color: var(--ink); cursor: pointer; font-size: 0.8rem; padding: 0; }
      .nf-mx button[aria-pressed="true"] { background: var(--accent-2); border-color: var(--accent); font-weight: 700; }
      .nf-seg { display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); gap: 0.9rem; align-items: stretch; }
      .nf-grids { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.7rem; }
      .nf-grids svg { width: 100%; height: auto; display: block; touch-action: none; }
      .nf-grids svg [data-p] { cursor: crosshair; }
      .nf-cost td { padding: 0.12rem 0.4rem; }
      .nf-cost td:last-child { text-align: right; font-family: var(--font-mono); }
      .nf-svg [data-edge]:focus, .nf-svg [data-node]:focus, .nf-grids svg [data-p]:focus { outline: none; }
      .nf-svg [data-edge]:focus-visible rect, .nf-grids svg [data-p]:focus-visible rect { stroke: var(--kw); stroke-width: 3; }
      .nf-svg [data-node]:focus-visible circle { stroke: var(--kw); stroke-width: 4; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Transport networks and flows',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">transport network</span> is a directed graph where every edge \((u, v)\) has a nonnegative <span class="term">capacity</span> \(c(u, v)\). One vertex is the <span class="term">source</span> \(s\) (no edges come in) and one is the <span class="term">sink</span> \(t\) (no edges go out). Picture water pipes: the capacity is how much a pipe can carry per second.<div class="eg">Edges \(s \to a\) with capacity 4 and \(a \to t\) with capacity 2 form a network with source \(s\) and sink \(t\).</div></div>
              <div class="def">A <span class="term">flow</span> puts an amount \(f(u, v)\) on every edge and obeys two rules.
                <ol style="margin-top:0.25rem">
                  <li><b>Capacity rule:</b> \(0 \le f(u, v) \le c(u, v)\) on every edge.</li>
                  <li><b><span class="term">Conservation of flow</span>:</b> at every vertex other than \(s\) and \(t\), flow in equals flow out.</li>
                </ol><div class="eg">With capacities 4 on \(s \to a\) and 2 on \(a \to t\), putting 2 on each edge is a flow. Putting 3 on \(s \to a\) is not: 3 units reach \(a\), but at most 2 can leave.</div></div>
              <div class="thm">The <span class="term">value of a flow</span> \(|f|\) is the total leaving \(s\). Because nothing is created or lost at the vertices in between, it also equals the total entering \(t\).</div>
            </div>
            <div class="stack">
              <div class="card" style="padding:0.45rem 0.6rem">
                <div class="tiny mono muted">EDGE LABELS READ FLOW / CAPACITY</div>
                <div class="figure">${FIG_FLOW.replace('<svg ', '<svg style="width:100%;max-height:12.5rem" ')}</div>
              </div>
              <div class="ex">At \(a\): 3 units arrive, and \(1 + 2 = 3\) leave. At \(b\): \(2 + 1 = 3\) arrive and 3 leave. So conservation holds. The value is \(3 + 2 = 5\) leaving \(s\), and \(2 + 3 = 5\) reaches \(t\). The edges \(s \to b\) and \(a \to b\) are full; we call them <span class="term" data-term="saturated edge">saturated</span>.</div>
              <div class="ai">A training pipeline moves data from storage through preprocessing workers to GPUs, and every link has a bandwidth limit. The <i>maximum</i> flow of that network is the highest throughput the pipeline can sustain.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Augmenting paths and the residual network',
        kind: 'concept',
        html: String.raw`
          <div class="split-narrow">
            <div class="stack">
              <p>To grow a flow, look for spare room. The <span class="term">residual network</span> records two kinds of room for every edge \(u \to v\) with flow \(f\) and capacity \(c\):</p>
              <ul>
                <li><b>Forward step</b> \(u \to v\): room \(c - f\), the units that still fit.</li>
                <li><b>Backward step</b> \(v \dashrightarrow u\): room \(f\). Units already sent along \(u \to v\) can be canceled, which has the same effect as sending them back.</li>
              </ul>
              <div class="def">An <span class="term">augmenting path</span> is a path from \(s\) to \(t\) in the residual network where every step has positive <span class="term">residual capacity</span>. Its <span class="term">bottleneck</span> is the smallest room on the path. Pushing the bottleneck along it (add on forward steps, subtract on backward steps) raises \(|f|\) by exactly that amount and keeps both flow rules true.<div class="eg">If \(s \to a\) has room 3 and \(a \to t\) room 1, then \(s \to a \to t\) is augmenting with bottleneck 1.</div></div>
              <div class="why">Without backward steps, an early bad choice is permanent and a greedy algorithm can stall below the maximum. Backward steps let it change its mind.</div>
            </div>
            <div class="ex stack" style="gap:0.4rem">
              <p class="small">Every edge has capacity 1. A careless first path \(s \to a \to b \to t\) fills three edges (left). No forward route is left, yet the maximum flow is 2.</p>
              <div class="cols" style="grid-template-columns:1fr 1fr;gap:0.5rem">
                <div><div class="tiny mono muted">FLOW AFTER THE FIRST PATH</div>${FIG_TRAP_FLOW}</div>
                <div><div class="tiny mono muted">RESIDUAL NETWORK</div>${FIG_TRAP_RES}</div>
              </div>
              <p class="small">The residual network (right) has a backward step \(b \dashrightarrow a\) with room 1, because \(a \to b\) carries 1 unit. So \(s \to b \dashrightarrow a \to t\) is an augmenting path. Pushing 1 unit along it cancels the flow on \(a \to b\). The final flow uses \(s \to a \to t\) and \(s \to b \to t\), value 2.</p>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: maximum flow, one augmenting path at a time',
        kind: 'lab',
        html: String.raw`<p class="muted small">Press <b>Find next path</b> to search the residual network, then <b>Push</b> to send the bottleneck along it. Switch to the residual view to see the room the search uses. Click an edge label to change its capacity. Try the trap network with DFS to watch a backward step cancel flow.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const PRE = {
            six: { label: 'Six vertices', pos: { s: [60, 250], a: [250, 85], c: [250, 415], b: [480, 85], d: [480, 415], t: [670, 250] }, spec: 'sa:10 sc:10 ab:4 ac:2 ad:8 cd:9 db:6 bt:10 dt:10', sel: 3 },
            trap: { label: 'The trap', pos: { s: [80, 250], a: [370, 85], b: [370, 415], t: [660, 250] }, spec: 'sa:1 sb:1 ab:1 at:1 bt:1', sel: 2 },
          };
          let key = 'six', net, flow, rule = 'bfs', view = 'flow', pending = null, log = [], done = null, sel = 3, msg = '';
          const svg = s('svg', { class: 'nf-svg', viewBox: '0 0 730 500', role: 'group', 'aria-label': 'Transport network with flows' });
          const legend = h('div.legend');
          const segBtns = (opts, get, set) => h('div.seg', ...opts.map(([k, label]) => h('button', { 'aria-pressed': String(get() === k), dataset: { k }, onclick: (e) => { set(k); [...e.currentTarget.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k))); } }, label)));
          const netSeg = segBtns([['six', 'Six vertices'], ['trap', 'The trap']], () => key, (k) => load(k));
          const ruleSeg = segBtns([['bfs', 'BFS: fewest edges'], ['dfs', 'DFS: first found']], () => rule, (k) => { rule = k; restart(k === 'bfs' ? 'Breadth-first search: the shortest augmenting path each time (Edmonds–Karp). The run restarted from zero flow.' : 'Depth-first search: the first augmenting path the search stumbles on. The run restarted from zero flow.'); });
          const viewSeg = segBtns([['flow', 'Flow'], ['res', 'Residual']], () => view, (k) => { view = k; draw(); });
          const stepBtn = h('button.btn.primary', { onclick: () => step() }, 'Find next path');
          const runBtn = h('button.btn', { onclick: () => runAll() }, 'Run to end');
          const resetBtn = h('button.btn', { onclick: () => restart('Flow reset to zero on every edge.') }, 'Reset');
          const valueEl = h('div.nf-big');
          const msgEl = h('div.feedback.info.nf-msg', { 'aria-live': 'polite' });
          const editEl = h('div.nf-edit');
          const logEl = h('ol.nf-log');
          body.append(h('div.nf-lab.fill',
            h('div.nf-fig', svg, legend),
            h('div.nf-panel',
              h('div.nf-ctl', h('span', 'Network'), netSeg, h('span', 'Path search'), ruleSeg, h('span', 'View'), viewSeg),
              h('div.row', { style: { gap: '0.4rem' } }, stepBtn, runBtn, resetBtn),
              valueEl, msgEl, editEl,
              h('div', h('div.tiny.mono.muted', 'AUGMENTATIONS SO FAR'), logEl))));
          const pickEdge = (g) => { sel = +g.dataset.edge; draw(); };
          svg.addEventListener('click', (e) => { const g = e.target.closest('[data-edge]'); if (g) pickEdge(g); });
          // every edge label is a focusable button, so Tab reaches it and Enter or Space selects it
          svg.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('[data-edge]'); if (g) { e.preventDefault(); pickEdge(g); } });

          function load(k) { key = k; net = { s: 's', t: 't', edges: parseEdges(PRE[k].spec) }; sel = PRE[k].sel; restart(k === 'six' ? 'Every edge starts empty. Press Find next path.' : 'Every capacity is 1, and the maximum flow is 2. Switch the search to DFS and step through it to see the trap and its escape.'); }
          function restart(note) { flow = net.edges.map(() => 0); pending = null; log = []; done = null; msg = note; draw(); }
          const value = () => net.edges.reduce((acc, e, i) => acc + (e.u === net.s ? flow[i] : 0), 0);
          function find() {
            const p = findPath(net, flow, rule);
            if (p) { pending = p; return; }
            pending = null;
            done = reachable(net, flow);
          }
          function push() {
            const b = Math.min(...pending.map((a) => a.room));
            pending.forEach((a) => (flow[a.e] += a.dir * b));
            log.push({ text: pathText(pending), push: b, total: value() });
            pending = null;
            return b;
          }
          function doneMsg() {
            const S = done;
            const out = net.edges.filter((e) => S.has(e.u) && !S.has(e.v));
            const back = net.edges.filter((e) => !S.has(e.u) && S.has(e.v));
            const sum = out.reduce((a, e) => a + e.c, 0);
            return `No augmenting path is left, so the flow is maximum: <b>|f| = ${value()}</b>. In the residual network, s can still reach S = ${setText(sortV(S))}. ` +
              `The cut edges ${out.map((e) => `${edgeName(e)} (${e.c})`).join(' and ') || '(none)'} are all full and add up to <b>${sum}</b>, the same as the flow.` +
              (back.length ? ` Edge${back.length > 1 ? 's' : ''} ${back.map(edgeName).join(', ')} point${back.length > 1 ? '' : 's'} back into S, carr${back.length > 1 ? 'y' : 'ies'} 0, and do${back.length > 1 ? '' : 'es'} not count.` : '') +
              ' A flow and a cut with equal values prove each other optimal.';
          }
          function step() {
            if (done) return;
            if (pending) {
              const b = push();
              msg = `Pushed ${b} unit${b > 1 ? 's' : ''}: forward steps went up by ${b} and backward steps went down by ${b}, so both flow rules still hold. Flow value is now <b>${value()}</b>.`;
            } else {
              find();
              if (done) msg = doneMsg();
              else {
                const b = Math.min(...pending.map((a) => a.room));
                const tight = pending.filter((a) => a.room === b).map((a) => `${a.from} ${a.dir > 0 ? '→' : '⇢'} ${a.to}`);
                const backs = pending.filter((a) => a.dir < 0);
                msg = `Found <b>${pathText(pending)}</b>. Room on each step: ${pending.map((a) => a.room).join(', ')}. The bottleneck is <b>${b}</b>, set by ${tight.join(' and ')}.` +
                  backs.map((a) => ` The dashed step ${a.from} ⇢ ${a.to} runs against edge ${a.to} → ${a.from}: it cancels units that edge carries so they can take a better route.`).join('');
              }
            }
            draw();
          }
          function runAll() {
            let guard = 0;
            while (!done && guard++ < 400) { if (pending) push(); find(); }
            msg = doneMsg();
            draw();
          }
          function setCap(d) {
            const e = net.edges[sel];
            const c = Math.max(0, Math.min(20, e.c + d));
            if (c === e.c) return;
            e.c = c;
            restart(`Capacity of ${edgeName(e)} is now ${c}. The run restarted from zero flow.`);
          }

          function draw() {
            const P = PRE[key].pos;
            const onPath = new Map();
            if (pending) pending.forEach((a) => onPath.set(a.e, a.dir));
            const focused = svg.contains(document.activeElement);
            const btn = (i, what) => `data-edge="${i}" tabindex="0" role="button" aria-label="${what}${i === sel ? ', selected' : ''}"`;
            let m = '';
            net.edges.forEach((e, i) => {
              const d = onPath.get(i);
              if (view === 'flow') {
                let kind = flow[i] === 0 ? 'base' : flow[i] === e.c ? 'sat' : 'flow', lab = 'plain';
                if (done) { if (done.has(e.u) && !done.has(e.v)) { kind = 'cut'; lab = 'cut'; } else if (!done.has(e.u) && done.has(e.v)) kind = 'ignore'; }
                if (d) { kind = d > 0 ? 'hot' : 'hotback'; lab = 'hot'; }
                m += edgeMarkup(P[e.u], P[e.v], { kind, lab, text: `<tspan font-weight="700">${flow[i]}</tspan>/${e.c}`, r1: 22, r2: 22, fs: 15, data: btn(i, `edge ${edgeName(e)}, flow ${flow[i]} of ${e.c}`), selected: i === sel });
              } else {
                const fwd = e.c - flow[i], bk = flow[i];
                if (fwd > 0 || bk === 0) m += edgeMarkup(P[e.u], P[e.v], { kind: d > 0 ? 'hot' : fwd > 0 ? 'base' : 'faint', lab: d > 0 ? 'hot' : 'plain', text: String(fwd), off: bk > 0 ? 7 : 0, labOff: bk > 0 ? 14 : 0, r1: 22, r2: 22, fs: 15, data: btn(i, `edge ${edgeName(e)}, forward room ${fwd}`), selected: i === sel });
                if (bk > 0) m += edgeMarkup(P[e.v], P[e.u], { kind: d < 0 ? 'hotback' : 'back', lab: d < 0 ? 'hot' : 'back', text: String(bk), off: fwd > 0 ? 7 : 0, labOff: fwd > 0 ? 14 : 0, r1: 22, r2: 22, fs: 15, data: btn(i, `backward step ${e.v} to ${e.u}, room ${bk}`), selected: i === sel });
              }
            });
            for (const [n, p] of Object.entries(P)) m += nodeMarkup(n, p, { r: 22, fs: 17, kind: done ? (done.has(n) ? 'S' : 'plain') : pending && (n === 's' || pending.some((a) => a.to === n)) ? 'hot' : 'plain' });
            svg.innerHTML = m;
            if (focused) svg.querySelector(`[data-edge="${sel}"]`)?.focus({ preventScroll: true });
            const sw = (v, dashed) => h('span.swatch', { style: { background: v, opacity: dashed ? 0.7 : 1 } });
            ctx.rc(legend, ...(view === 'flow'
              ? [h('span', sw('var(--accent)'), 'carries flow (thick = full)'), h('span', sw('var(--kw)'), 'augmenting path (dashed = backward step)'), h('span', sw('var(--false)'), 'minimum cut'), h('span', sw('var(--accent-2)'), 'S side at the end')]
              : [h('span', sw('var(--ink-3)'), 'forward room c − f'), h('span', sw('var(--fnc)', true), 'backward room f (flow you could cancel)'), h('span', sw('var(--kw)'), 'steps on the augmenting path')]));
            ctx.rc(valueEl, '|f| = ', h('b', String(value())), h('span.small.muted', { style: { fontFamily: 'var(--font-body)', marginLeft: '0.6rem' } }, done ? 'maximum' : `after ${log.length} augmentation${log.length === 1 ? '' : 's'}`));
            msgEl.className = 'feedback nf-msg ' + (done ? 'good' : 'info');
            msgEl.innerHTML = msg;
            stepBtn.textContent = done ? 'Finished' : pending ? `Push ${Math.min(...pending.map((a) => a.room))}` : 'Find next path';
            stepBtn.disabled = !!done;
            runBtn.disabled = !!done;
            const e = net.edges[sel];
            ctx.rc(editEl, h('span.muted', 'Edge'), h('b.mono', edgeName(e)), h('span.muted', 'capacity'),
              h('button.btn.sm', { onclick: () => setCap(-1), 'aria-label': 'Decrease capacity' }, '−'), h('b.v', String(e.c)),
              h('button.btn.sm', { onclick: () => setCap(1), 'aria-label': 'Increase capacity' }, '+'),
              h('span.tiny.muted', 'click any edge label to pick it'));
            const shown = log.slice(-5);
            ctx.rc(logEl, log.length ? shown.map((x) => h('li', { value: log.indexOf(x) + 1 }, `${x.text}  +${x.push} → ${x.total}`)) : h('li', { style: { listStyle: 'none', marginLeft: '-1.6em' } }, 'none yet'));
          }
          load('six');
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'The Ford–Fulkerson method and Edmonds–Karp',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def" data-label="The method">The <span class="term">Ford–Fulkerson method</span> finds a maximum flow:
                <ol style="margin-top:0.25rem">
                  <li>Start with flow 0 on every edge.</li>
                  <li>Search the residual network for an augmenting path.</li>
                  <li>If there is none, stop: the flow is maximum.</li>
                  <li>Push the bottleneck along the path (up on forward steps, down on backward steps), then go back to step 2.</li>
                </ol><div class="eg">On \(s \to a \to t\) with capacities 4 and 2, start at 0 and push the bottleneck, 2, along that path. Now \(a \to t\) is full, no augmenting path is left, and the flow of 2 is maximum.</div></div>
              <div class="thm">With integer capacities, every push adds at least 1 to \(|f|\), so the method stops after at most \(|f^*|\) pushes (\(f^*\) a maximum flow). It also finds a maximum flow that is a whole number on every edge.</div>
              <p class="small muted">Johnsonbaugh calls this the <i>maximal flow algorithm</i> and finds paths by labeling vertices. The labeling is one way to search the residual network.</p>
            </div>
            <div class="stack">
              <div class="def">The <span class="term">Edmonds–Karp algorithm</span> adds one rule: always use a <i>shortest</i> augmenting path (fewest edges), found by breadth-first search. It needs at most \(|V| \cdot |E|\) augmentations, so it runs in \(O(|V| \cdot |E|^2)\) time however large the capacities are.<div class="eg">If \(s \to t\) and \(s \to a \to t\) both have room, BFS takes \(s \to t\) first: 1 edge beats 2.</div></div>
              <div class="warn">
                <div class="split" style="grid-template-columns:minmax(0,1fr) 14.5rem;gap:0.6rem;align-items:center">
                  <p class="small">The rule matters. Here a careless search might keep using the middle edge, alternating \(s \to a \to b \to t\) and \(s \to b \dashrightarrow a \to t\). Each round pushes 1 unit, so it takes 2000 rounds. BFS takes the two outer paths and finishes in 2. With irrational capacities, a bad rule can even run forever.</p>
                  ${FIG_BIG}
                </div>
              </div>
              <div class="tip">Use BFS (Edmonds–Karp) unless you have a reason not to. Its running time depends only on the size of the graph, so huge capacity values cannot slow it down.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Cuts and the max-flow min-cut theorem',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">cut</span> \((S, T)\) splits the vertices into two groups with \(s \in S\) and \(t \in T\). Its capacity adds up the edges that go from \(S\) to \(T\):
                \[c(S, T) = \sum_{u \in S,\ v \in T} c(u, v)\]
                Edges that point from \(T\) back to \(S\) do not count.<div class="eg">On \(s \to a \to t\) with capacities 4 and 2, the cut \(S = \{s\}\) has capacity 4, and \(S = \{s, a\}\) has capacity 2.</div></div>
              <div class="thm">For every flow \(f\) and every cut, \(|f| \le c(S, T)\). Every unit that travels from \(s\) to \(t\) has to cross from \(S\) to \(T\) at least once.</div>
              <div class="thm" data-label="Max-flow min-cut theorem">The value of a maximum flow equals the capacity of a <span class="term">minimum cut</span>. This is the <span class="term">max-flow min-cut theorem</span>.</div>
              <div class="why">A minimum cut is a certificate and an explanation in one. It proves no flow can do better, and it names the links that limit throughput. Upgrading a link outside the minimum cut cannot raise the maximum flow.</div>
            </div>
            <div class="stack">
              <p><b>Finding the cut.</b> When Ford–Fulkerson stops, let \(S\) be the vertices \(s\) can still reach in the residual network. Every edge from \(S\) to \(T\) must be full, or its far end would be reachable. Every edge from \(T\) to \(S\) must carry 0, or its backward step would be usable. So \(|f| = c(S, T)\) exactly.</p>
              <div class="ex">
                ${FIG_CUT.replace('<svg ', '<svg style="width:100%;max-height:15.5rem;display:block;margin:0.1rem auto 0.3rem" ')}
                <p class="small">The stepper's network at the end: the flow is 19, and \(s\) can still reach only \(c\). With \(S = \{s, c\}\) (shaded) the cut edges are \(s \to a\) (10) and \(c \to d\) (9), and \(10 + 9 = 19\). Edge \(a \to c\) points from \(T\) into \(S\), so it is left out.</p>
              </div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: hunt for the minimum cut',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click a vertex to move it between \(S\) (shaded) and \(T\). \(s\) always stays in \(S\) and \(t\) in \(T\). Red edges cross from \(S\) to \(T\) and count; dotted edges cross back and do not. The strip shows all 32 possible cuts sorted by capacity: click a bar to load that cut.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const P = { s: [50, 235], a: [210, 85], b: [210, 385], c: [360, 235], d: [510, 85], e: [510, 385], t: [670, 235] };
          const net = { s: 's', t: 't', edges: parseEdges('sa:6 sb:6 ac:5 ad:5 bc:3 be:9 cd:7 ce:2 ed:2 dt:3 et:9') };
          const best = runMaxFlow(net).value;
          const inner = ['a', 'b', 'c', 'd', 'e'];
          const capOf = (S) => net.edges.filter((e) => S.has(e.u) && !S.has(e.v)).reduce((a, e) => a + e.c, 0);
          const cuts = [];
          for (let mask = 0; mask < 32; mask++) { const S = new Set(['s', ...inner.filter((_, i) => mask & (1 << i))]); cuts.push({ S, cap: capOf(S), key: sortV(S).join('') }); }
          cuts.sort((x, y) => x.cap - y.cap || x.key.length - y.key.length || x.key.localeCompare(y.key));
          const maxCap = cuts[cuts.length - 1].cap;
          let S = new Set(['s']);
          const svg = s('svg', { class: 'nf-svg', viewBox: '0 0 720 470', role: 'group', 'aria-label': 'Network: click vertices to choose the cut' });
          const strip = s('svg', { class: 'nf-svg', viewBox: '0 0 330 100', role: 'img', 'aria-label': 'All 32 cuts sorted by capacity', style: 'width:100%;height:auto;display:block' });
          const formula = h('div.nf-big', { style: { fontSize: '1.25rem' } });
          const kv = h('div.nf-kv');
          const fb = h('div.feedback.nf-msg', { 'aria-live': 'polite' });
          body.append(h('div.nf-lab.fill',
            h('div.nf-fig', svg, h('div.legend',
              h('span', h('span.swatch', { style: { background: 'var(--accent-2)', border: '1px solid var(--accent)' } }), 'in S'),
              h('span', h('span.swatch', { style: { background: 'var(--false)' } }), 'S → T: counted'),
              h('span', h('span.swatch', { style: { background: 'var(--ink-3)', opacity: 0.6 } }), 'T → S (dotted): not counted'),
              h('span', 'Edge labels are capacities'))),
            h('div.nf-panel',
              formula, kv, fb,
              h('div.card', { style: { padding: '0.45rem 0.6rem' } }, h('div.tiny.mono.muted', 'ALL 32 CUTS BY CAPACITY · ▲ = YOUR CUT'), strip),
              h('div.row', { style: { gap: '0.4rem' } },
                h('button.btn.sm', { onclick: () => { S = new Set(['s']); draw(); } }, 'S = {s}'),
                h('button.btn.sm', { onclick: () => { S = new Set(['s', ...inner]); draw(); } }, 'Everything except t'),
                h('button.btn.sm', { onclick: () => { S = new Set(cuts[0].S); draw(); } }, 'Show a minimum cut')))));
          const flip = (g) => { const n = g.dataset.node; if (n === 's' || n === 't') return; if (S.has(n)) S.delete(n); else S.add(n); draw(); };
          svg.addEventListener('click', (e) => { const g = e.target.closest('[data-node]'); if (g) flip(g); });
          svg.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('[data-node]'); if (g) { e.preventDefault(); flip(g); } });
          strip.addEventListener('click', (e) => { const g = e.target.closest('[data-bar]'); if (g) { S = new Set(cuts[+g.dataset.bar].S); draw(); } });

          function draw() {
            const focused = svg.contains(document.activeElement) ? document.activeElement.closest('[data-node]')?.dataset.node : null;
            let m = '';
            net.edges.forEach((e, i) => {
              const out = S.has(e.u) && !S.has(e.v), back = !S.has(e.u) && S.has(e.v);
              m += edgeMarkup(P[e.u], P[e.v], { kind: out ? 'cut' : back ? 'ignore' : 'base', lab: out ? 'cut' : back ? 'dim' : 'plain', text: String(e.c), r1: 21, r2: 21, fs: 15, data: `data-edge="${i}"` });
            });
            // inner vertices are toggle buttons for the keyboard; s and t never move
            for (const [n, p] of Object.entries(P)) m += nodeMarkup(n, p, { r: 21, fs: 17, kind: S.has(n) ? 'S' : 'plain', data: n === 's' || n === 't' ? `data-node="${n}"` : `data-node="${n}" tabindex="0" role="button" aria-pressed="${S.has(n)}" aria-label="vertex ${n}, in ${S.has(n) ? 'S' : 'T'}"` });
            m += `<text x="${P.s[0]}" y="${P.s[1] + 40}" text-anchor="middle" font-size="12" fill="var(--ink-3)">always S</text><text x="${P.t[0]}" y="${P.t[1] + 40}" text-anchor="middle" font-size="12" fill="var(--ink-3)">always T</text>`;
            svg.innerHTML = m;
            if (focused) svg.querySelector(`[data-node="${focused}"]`)?.focus({ preventScroll: true });
            const out = net.edges.filter((e) => S.has(e.u) && !S.has(e.v));
            const back = net.edges.filter((e) => !S.has(e.u) && S.has(e.v));
            const cap = capOf(S);
            formula.innerHTML = `c(S, T) = ${out.map((e) => e.c).join(' + ')} = <b>${cap}</b>`;
            const T = sortV(Object.keys(P).filter((n) => !S.has(n)));
            ctx.rc(kv,
              h('span', 'S'), h('span.mono', setText(sortV(S))),
              h('span', 'T'), h('span.mono', setText(T)),
              h('span', 'Counted'), h('span', out.map((e) => `${edgeName(e)} (${e.c})`).join(', ')),
              h('span', 'Ignored'), h('span', back.length ? back.map((e) => `${edgeName(e)} (${e.c})`).join(', ') : 'no edges point from T into S'));
            const rank = cuts.findIndex((c) => c.cap === cap) + 1;
            if (cap === best) {
              fb.className = 'feedback good nf-msg';
              fb.innerHTML = `<b>Minimum cut.</b> Its capacity ${cap} equals the maximum flow (${best}), so each proves the other optimal.${back.length ? ` The ignored edges ${back.map(edgeName).join(' and ')} point backwards across the cut.` : ''} These ${out.length} edges are the real bottleneck of the network.`;
            } else {
              fb.className = 'feedback info nf-msg';
              fb.innerHTML = `Every flow must cross this cut, so no flow can exceed ${cap}. The maximum flow is ${best}, so a cut ${cap - best} smaller exists. This cut ranks ${rank} of 32${cuts.filter((c) => c.cap === cap).length > 1 ? ' (tied)' : ''}.`;
            }
            let b = '';
            cuts.forEach((c, i) => {
              const hgt = 10 + (c.cap / maxCap) * 58, x = 2 + i * 10.2;
              const cur = c.key === sortV(S).join('');
              const fill = cur ? 'var(--fnc)' : c.cap === best ? 'var(--true)' : 'var(--ink-3)';
              b += `<g data-bar="${i}"><rect x="${r1(x)}" y="0" width="9.2" height="72" fill="var(--ink)" fill-opacity="0"/><rect x="${r1(x)}" y="${r1(72 - hgt)}" width="8.4" height="${r1(hgt)}" rx="1.5" fill="${fill}" fill-opacity="${cur || c.cap === best ? 1 : 0.4}"/></g>`;
            });
            const ci = cuts.findIndex((c) => c.key === sortV(S).join(''));
            b += `<text x="${r1(6.2 + ci * 10.2)}" y="84" font-size="10" text-anchor="middle" fill="var(--fnc)">▲</text>`;
            b += `<text x="2" y="98" font-size="11" fill="var(--ink-3)">smallest ${cuts[0].cap} (green)</text><text x="328" y="98" font-size="11" text-anchor="end" fill="var(--ink-3)">largest ${maxCap}</text>`;
            strip.innerHTML = b;
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Matching workers to jobs with flows',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">In a <span class="term">bipartite graph</span> the vertices form two groups, here workers \(W\) and jobs \(J\), and every edge joins a worker to a job they are qualified for. A <span class="term">matching</span> is a set of edges with no shared endpoints: each worker does at most one job and each job gets at most one worker. A <b><span class="term">maximum matching</span></b> has as many edges as possible.<div class="eg">Kim can do jobs 1 and 2, Raj only job 1. {Kim–1} is a matching, but it leaves Raj idle; {Kim–2, Raj–1} is a maximum matching.</div></div>
              <p><b>Matching as a flow.</b> Add a source \(s\) with an edge to every worker, point each qualification edge from worker to job, and add an edge from every job to a sink \(t\). Give every edge capacity 1. An integer maximum flow sends at most one unit through each worker and each job, so its value is the size of a maximum matching.</p>
              <div class="card" style="padding:0.3rem 0.5rem">${FIG_MATCH.replace('<svg ', '<svg style="width:100%;max-height:10.5rem;display:block" ')}</div>
            </div>
            <div class="stack">
              <div class="thm"><span class="term">Hall's condition</span>: every worker can be matched exactly when, for every set \(A\) of workers, \(|N(A)| \ge |A|\). Here \(N(A)\) is the set of jobs that at least one worker in \(A\) is qualified for.</div>
              <div class="ex">Ben and Cy are both qualified only for Label. For \(A = \{\text{Ben}, \text{Cy}\}\), \(N(A) = \{\text{Label}\}\): two workers, one job. No assignment can place both, whatever the rest of the graph looks like.</div>
              <p class="small">An augmenting path in a matching alternates: a new edge, a matched edge to give up, a new edge, and so on. Flipping it re-assigns some workers and places one more. The next lab shows these re-routes.</p>
              <div class="ai">Schedulers assign inference requests to GPU servers, ride-sharing apps pair riders with drivers, and ad systems fill display slots. At scale they solve weighted versions of this same matching problem.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: placing workers with augmenting paths',
        kind: 'lab',
        html: String.raw`<p class="muted small">Workers are placed one at a time, top to bottom. Each step searches (by BFS) for an augmenting path from the next worker; the path may re-route people who already have jobs. Toggle qualifications in the table to break or repair a perfect matching, and watch the Hall check.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const W = ['Ava', 'Ben', 'Cy', 'Dee', 'Eli'];
          const J = ['Label', 'Train', 'Eval', 'Deploy', 'Clean'];
          const PRESETS = [
            ['Everyone fits', { Ava: ['Label', 'Train', 'Clean'], Ben: ['Label'], Cy: ['Train', 'Eval'], Dee: ['Eval', 'Deploy'], Eli: ['Deploy'] }],
            ['Nobody can Clean', { Ava: ['Label', 'Train'], Ben: ['Label'], Cy: ['Train', 'Eval'], Dee: ['Eval', 'Deploy'], Eli: ['Deploy'] }],
            ['Ben and Cy clash', { Ava: ['Label', 'Train'], Ben: ['Label'], Cy: ['Label'], Dee: ['Eval', 'Deploy'], Eli: ['Deploy', 'Clean'] }],
          ];
          let Q, matchJ, matchW, next, pending, left, msg;
          const load = (spec) => { Q = W.map((w) => J.map((j) => spec[w].includes(j))); restart(); };
          function restart() {
            matchJ = J.map(() => null); matchW = W.map(() => null); next = 0; pending = null; left = [];
            msg = `Press <b>Find next path</b> to look for an augmenting path from ${W[0]}.`;
            draw();
          }
          // shortest augmenting path from worker w0: list of [worker, job] pairs to assign; worker i+1 currently holds job i
          function augPath(w0, mJ) {
            const prevJ = new Map(), prevW = new Map([[w0, null]]);
            const queue = [w0];
            while (queue.length) {
              const w = queue.shift();
              for (let j = 0; j < J.length; j++) {
                if (!Q[w][j] || prevJ.has(j)) continue;
                prevJ.set(j, w);
                if (mJ[j] == null) {
                  const path = [];
                  for (let jj = j; ;) { const ww = prevJ.get(jj); path.unshift([ww, jj]); const via = prevW.get(ww); if (via == null) break; jj = via; }
                  return path;
                }
                if (!prevW.has(mJ[j])) { prevW.set(mJ[j], j); queue.push(mJ[j]); }
              }
            }
            return null;
          }
          function solveAll() {
            const mJ = J.map(() => null), mW = W.map(() => null);
            W.forEach((_, w) => { const p = augPath(w, mJ); if (p) p.forEach(([ww, jj]) => { mJ[jj] = ww; mW[ww] = jj; }); });
            return { mJ, mW, size: mW.filter((x) => x != null).length };
          }
          function hallReport() {
            const { mJ, mW, size } = solveAll();
            if (size === W.length) return { ok: true, html: `<b>Hall's condition holds.</b> Every group of \\(k\\) workers is qualified, in total, for at least \\(k\\) jobs, so all ${W.length} can be placed.` };
            const root = mW.findIndex((x) => x == null);
            const Ws = new Set([root]), Js = new Set();
            const queue = [root];
            while (queue.length) { const w = queue.shift(); J.forEach((_, j) => { if (Q[w][j] && !Js.has(j)) { Js.add(j); const o = mJ[j]; if (o != null && !Ws.has(o)) { Ws.add(o); queue.push(o); } } }); }
            const A = [...Ws].sort((x, y) => x - y).map((w) => W[w]), N = [...Js].sort((x, y) => x - y).map((j) => J[j]);
            const tset = (xs) => '\\{' + xs.map((x) => `\\text{${x}}`).join(', ') + '\\}';
            return { ok: false, html: `<b>Hall's condition fails.</b> \\(A = ${tset(A)}\\) is qualified only for \\(N(A) = ${tset(N)}\\): ${A.length} worker${A.length === 1 ? "" : "s"}, ${N.length} job${N.length === 1 ? '' : 's'}. At most ${size} of ${W.length} workers can be placed.` };
          }
          const size = () => matchW.filter((x) => x != null).length;
          const summary = () => ` All workers processed. Maximum matching: <b>${size()}</b> of ${W.length}` + (left.length ? `; ${left.map((w) => W[w]).join(' and ')} ${left.length > 1 ? 'are' : 'is'} left out. The Hall check below explains why.` : '. Everyone is placed: a perfect matching.');
          function step() {
            if (next >= W.length) return;
            const w = next;
            if (pending) {
              pending.forEach(([ww, jj]) => { matchJ[jj] = ww; matchW[ww] = jj; });
              pending = null;
              next++;
              msg = `${W[w]} is placed. Matching size: <b>${size()}</b>.` + (next < W.length ? ` Next: ${W[next]}.` : summary());
            } else {
              const p = augPath(w, matchJ);
              if (!p) {
                left.push(w);
                next++;
                msg = `<b>No augmenting path for ${W[w]}.</b> Every job ${W[w]} qualifies for is held by someone who cannot move to a free job, so ${W[w]} stays unplaced.` + (next < W.length ? ` Next: ${W[next]}.` : summary());
              } else {
                pending = p;
                const words = p.map(([ww, jj], i) => `${W[ww]} takes ${J[jj]}` + (i < p.length - 1 ? ` from ${W[p[i + 1][0]]}` : ', which was free')).join('; ');
                const k = p.length - 1;
                msg = `Augmenting path for ${W[w]}: ${words}. ` + (k ? `Flipping it gives up ${k} matched edge${k > 1 ? 's' : ''} and adds ${k + 1} new ones, so the matching grows from ${size()} to ${size() + 1}.` : 'One new edge and nothing to re-route.');
              }
            }
            draw();
          }
          function runAll() { let g = 0; while (next < W.length && g++ < 20) step(); }

          const svg = s('svg', { class: 'nf-svg', viewBox: '0 0 570 404', role: 'img', 'aria-label': 'Workers, jobs and the current matching' });
          const stepBtn = h('button.btn.primary', { onclick: () => step() }, 'Find next path');
          const msgEl = h('div.feedback.info.nf-msg', { 'aria-live': 'polite', style: { minHeight: '6.2em' } });
          const mx = h('table.nf-mx');
          const hall = h('div.feedback.nf-msg');
          body.append(h('div.nf-lab.fill',
            h('div.nf-fig', svg, h('div.legend',
              h('span', h('span.swatch', { style: { background: 'var(--accent)' } }), 'matched'),
              h('span', h('span.swatch', { style: { background: 'var(--kw)' } }), 'augmenting path: solid = new, dashed = given up'),
              h('span', h('span.swatch', { style: { background: 'var(--false-bg)', border: '1px solid var(--false)' } }), 'left out'))),
            h('div.nf-panel',
              h('div.row', { style: { gap: '0.4rem' } }, stepBtn, h('button.btn', { onclick: () => runAll() }, 'Run to end'), h('button.btn', { onclick: () => restart() }, 'Reset')),
              h('div.row', { style: { gap: '0.3rem' } }, h('span.tiny.muted', 'Presets:'), PRESETS.map(([label, spec]) => h('button.btn.sm', { onclick: () => load(spec) }, label))),
              msgEl,
              h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.15rem' } }, 'QUALIFICATIONS (CLICK TO TOGGLE)'), mx),
              hall)));

          function draw() {
            const X = { s: 34, w: 172, j: 398, t: 540 }, Y = (i) => 44 + i * 79, CY = 202;
            const newE = new Set(), oldE = new Set();
            if (pending) pending.forEach(([w, j], i) => { newE.add(w + ':' + j); if (i < pending.length - 1) oldE.add(pending[i + 1][0] + ':' + j); });
            const line = (x1, y1, x2, y2, kind) => { const [col, wd, dash] = EDGE[kind]; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${wd}" fill="none" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`; };
            let m = '';
            W.forEach((_, w) => { m += line(X.s + 16, CY, X.w - 40, Y(w), matchW[w] != null ? 'flow' : 'faint'); });
            J.forEach((_, j) => { m += line(X.j + 42, Y(j), X.t - 16, CY, matchJ[j] != null ? 'flow' : 'faint'); });
            W.forEach((_, w) => J.forEach((_, j) => {
              if (!Q[w][j]) return;
              const k = w + ':' + j;
              const kind = newE.has(k) ? 'hot' : oldE.has(k) ? 'hotback' : matchW[w] === j ? 'sat' : 'base';
              m += line(X.w + 40, Y(w), X.j - 42, Y(j), kind);
            }));
            const box = (x, y, wd, label, kind) => { const [fill, stroke, ink] = NODE[kind]; return `<rect x="${x - wd / 2}" y="${y - 16}" width="${wd}" height="32" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/><text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="600" fill="${ink}">${label}</text>`; };
            W.forEach((name, w) => { m += box(X.w, Y(w), 80, name, pending && pending[0][0] === w ? 'hot' : left.includes(w) ? 'bad' : matchW[w] != null ? 'S' : 'plain'); });
            J.forEach((name, j) => { m += box(X.j, Y(j), 84, name, pending && pending[pending.length - 1][1] === j ? 'hot' : matchJ[j] != null ? 'S' : 'plain'); });
            m += nodeMarkup('s', [X.s, CY], { r: 16, fs: 15 }) + nodeMarkup('t', [X.t, CY], { r: 16, fs: 15 });
            m += `<text x="${X.w}" y="14" text-anchor="middle" font-size="12" fill="var(--ink-3)">WORKERS</text><text x="${X.j}" y="14" text-anchor="middle" font-size="12" fill="var(--ink-3)">JOBS</text>`;
            m += `<text x="285" y="400" text-anchor="middle" font-size="12" fill="var(--ink-3)">As a flow network every edge has capacity 1. Matching size = flow value = ${size()}</text>`;
            svg.innerHTML = m;
            msgEl.innerHTML = msg;
            msgEl.className = 'feedback nf-msg ' + (next >= W.length ? (size() === W.length ? 'good' : 'bad') : 'info');
            stepBtn.textContent = next >= W.length ? 'Finished' : pending ? 'Apply path' : `Find path for ${W[next]}`;
            stepBtn.disabled = next >= W.length;
            ctx.rc(mx, h('thead', h('tr', h('th'), J.map((j) => h('th', j)))),
              h('tbody', W.map((name, w) => h('tr', h('th.w', name), J.map((jn, j) => h('td', h('button', {
                'aria-pressed': String(Q[w][j]), 'aria-label': `${name} qualified for ${jn}`,
                onclick: () => { Q[w][j] = !Q[w][j]; restart(); },
              }, Q[w][j] ? '✓' : '')))))));
            const rep = hallReport();
            hall.className = 'feedback nf-msg ' + (rep.ok ? 'good' : 'bad');
            hall.innerHTML = rep.html;
            ctx.tex(hall);
          }
          load(PRESETS[0][1]);
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Lab: cutting an image into object and background',
        kind: 'lab',
        html: String.raw`<p class="muted small">Each pixel has a score from 0 to 9 for how much it looks like the object. A network with one vertex per pixel turns "label every pixel" into a minimum cut. Paint on the left grid and move the smoothness slider \(\lambda\): the right grid is the minimum cut, recomputed by max flow every time.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const COLS = 12, ROWS = 8, N = COLS * ROWS, CS = 24;
          const mk = (fn) => { const a = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) a.push(fn(x, y)); return a; };
          const setAll = (a, list) => { for (const [x, y, v] of list) a[y * COLS + x] = v; return a; };
          const PRESETS = [
            ['Noisy blob', () => setAll(mk((x, y) => (((x - 5.5) / 3.7) ** 2 + ((y - 3.5) / 2.6) ** 2 <= 1 ? 7 + ((x + 2 * y) % 3) : (x * 7 + y * 3) % 3)), [[1, 1, 7], [10, 6, 6], [10, 1, 8], [2, 6, 6], [5, 3, 3], [7, 4, 2], [4, 2, 4]])],
            ['Two shapes', () => setAll(mk((x, y) => ((x >= 1 && x <= 4 && y >= 1 && y <= 6) || (x >= 7 && x <= 10 && y >= 2 && y <= 4) ? 8 : (x + y) % 3)), [[2, 3, 3], [8, 3, 4], [6, 6, 7], [11, 0, 6], [5, 1, 6]])],
            ['Low contrast', () => mk((x, y) => { const k = (x * 3 + y * 5) % 8; return ((x - 5.5) / 4) ** 2 + ((y - 3.5) / 2.7) ** 2 <= 1 ? [5, 7, 6, 4, 6, 7, 5, 6][k] : [2, 3, 1, 4, 3, 2, 5, 3][k]; })],
          ];
          let img = PRESETS[0][1](), lam = 2, brush = 9;
          const inSvg = s('svg', { class: 'nf-svg', viewBox: `0 0 ${COLS * CS + 4} ${ROWS * CS + 4}`, role: 'group', 'aria-label': 'Pixel scores: click or drag to paint, or move with the arrow keys and paint with Space' });
          const outSvg = s('svg', { class: 'nf-svg', viewBox: `0 0 ${COLS * CS + 4} ${ROWS * CS + 4}`, role: 'img', 'aria-label': 'Minimum-cut labeling' });
          const lamOut = h('b.mono');
          const slider = h('input', { type: 'range', min: 0, max: 6, step: 1, value: lam, 'aria-label': 'Smoothness lambda', oninput: (e) => { lam = +e.target.value; draw(); } });
          const cost = h('table.nf-cost.small', { style: { width: '100%' } });
          const note = h('p.small');
          const brushSeg = h('div.seg', ...[[9, '9 object'], [5, '5 unsure'], [0, '0 background']].map(([v, label]) => h('button', { 'aria-pressed': String(v === brush), onclick: (e) => { brush = v; [...e.currentTarget.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, label)));
          body.append(h('div.nf-seg.fill',
            h('div.stack', { style: { minHeight: 0 } },
              h('div.nf-grids',
                h('div.card', { style: { padding: '0.4rem 0.5rem' } }, h('div.tiny.mono.muted', 'PIXEL SCORES (PAINT HERE)'), inSvg),
                h('div.card', { style: { padding: '0.4rem 0.5rem' } }, h('div.tiny.mono.muted', 'MINIMUM CUT: SHADED = OBJECT'), outSvg)),
              h('div.legend',
                h('span', h('span.swatch', { style: { background: 'var(--accent)', opacity: 0.6 } }), 'object side (S)'),
                h('span', h('span.swatch', { style: { background: 'var(--false)' } }), 'cut neighbor edge, costs λ'),
                h('span', h('span.swatch', { style: { background: 'var(--ink)', borderRadius: '50%' } }), 'label differs from the pixel\'s own guess (score ≥ 5)')),
              h('div.card.small', { style: { padding: '0.5rem 0.75rem' } },
                h('b', 'How the network is built. '),
                h('span', { html: 'Edge <b>s → pixel</b> has capacity = score: cutting it labels the pixel background and costs its score. Edge <b>pixel → t</b> has capacity 9 − score: cutting it labels the pixel object. Each pair of neighboring pixels gets edges of capacity <b>λ</b> both ways, so splitting neighbors costs λ. Every cut is one labeling and its capacity is that labeling\'s total cost, so the minimum cut is the cheapest labeling.' }))),
            h('div.nf-panel',
              h('div.nf-ctl', h('span', 'Brush'), brushSeg, h('span', 'Image'), h('div.row', { style: { gap: '0.25rem' } }, PRESETS.map(([label, fn]) => h('button.btn.sm', { onclick: () => { img = fn(); draw(); } }, label)))),
              h('label.field', h('span', 'Smoothness ', lamOut), slider),
              h('div.card', { style: { padding: '0.45rem 0.65rem' } }, h('div.tiny.mono.muted', 'COST OF THE MINIMUM CUT'), cost),
              note,
              h('div.ai.small', { html: 'Graph cuts power classic tools such as GrabCut for lifting an object out of a photo, and they were long a standard step in medical-image labeling. Modern pipelines often let a neural network produce the per-pixel scores and then clean them up with a smoothing step like this one.' }))));

          let painting = false, cursor = 0;
          const paintAt = (p) => { if (img[p] !== brush) { img[p] = brush; draw(); } };
          const paint = (e) => { const g = e.target.closest('[data-p]'); if (!g) return; cursor = +g.dataset.p; paintAt(cursor); };
          inSvg.addEventListener('pointerdown', (e) => { painting = true; paint(e); });
          inSvg.addEventListener('pointerover', (e) => { if (painting && e.buttons & 1) paint(e); });
          inSvg.addEventListener('click', paint);
          // a drag ends wherever the pointer is released, so the listener is global, but only while this slide is shown
          const release = () => { painting = false; };
          ctx.onShow(() => window.addEventListener('pointerup', release));
          ctx.onHide(() => window.removeEventListener('pointerup', release));
          // keyboard path: one cell is in the tab order, the arrow keys move it, Space or Enter paints it with the brush
          const focusCell = () => { inSvg.querySelectorAll('[data-p]').forEach((g) => g.setAttribute('tabindex', +g.dataset.p === cursor ? '0' : '-1')); inSvg.querySelector(`[data-p="${cursor}"]`)?.focus({ preventScroll: true }); };
          inSvg.addEventListener('keydown', (e) => {
            const g = e.target.closest('[data-p]');
            if (!g) return;
            const p = +g.dataset.p;
            const moves = { ArrowLeft: p % COLS ? p - 1 : p, ArrowRight: p % COLS < COLS - 1 ? p + 1 : p, ArrowUp: p >= COLS ? p - COLS : p, ArrowDown: p + COLS < N ? p + COLS : p };
            if (e.key in moves) { e.preventDefault(); cursor = moves[e.key]; focusCell(); }
            else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cursor = p; paintAt(p); focusCell(); }
          });

          function solve() {
            const S = N, T = N + 1, g = fastFlow(N + 2);
            for (let p = 0; p < N; p++) { g.add(S, p, img[p]); g.add(p, T, 9 - img[p]); }
            if (lam > 0) for (let p = 0; p < N; p++) {
              if (p % COLS < COLS - 1) { g.add(p, p + 1, lam); g.add(p + 1, p, lam); }
              if (p + COLS < N) { g.add(p, p + COLS, lam); g.add(p + COLS, p, lam); }
            }
            const value = g.run(S, T);
            const side = g.reach(S);
            const obj = img.map((_, p) => !!side[p]);
            let data = 0, bnd = 0;
            for (let p = 0; p < N; p++) {
              data += obj[p] ? 9 - img[p] : img[p];
              if (p % COLS < COLS - 1 && obj[p] !== obj[p + 1]) bnd++;
              if (p + COLS < N && obj[p] !== obj[p + COLS]) bnd++;
            }
            return { value, obj, data, bnd };
          }
          function draw() {
            const r = solve();
            lamOut.textContent = 'λ = ' + lam;
            let a = '', b = '';
            for (let p = 0; p < N; p++) {
              const x = 2 + (p % COLS) * CS, y = 2 + Math.floor(p / COLS) * CS, v = img[p];
              a += `<g data-p="${p}" tabindex="${p === cursor ? 0 : -1}" role="button" aria-label="row ${Math.floor(p / COLS) + 1}, column ${(p % COLS) + 1}, score ${v}"><rect x="${x}" y="${y}" width="${CS}" height="${CS}" fill="var(--ink)" fill-opacity="${r1(0.05 + (0.85 * v) / 9)}" stroke="var(--sheet)" stroke-width="1"/><text x="${x + CS / 2}" y="${y + CS / 2 + 1}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="${v >= 5 ? 'var(--sheet)' : 'var(--ink-2)'}">${v}</text></g>`;
              b += `<rect x="${x}" y="${y}" width="${CS}" height="${CS}" fill="${r.obj[p] ? 'var(--accent)' : 'var(--sheet)'}" fill-opacity="${r.obj[p] ? 0.6 : 1}" stroke="var(--rule)" stroke-width="0.6"/>`;
              if (r.obj[p] !== v >= 5) b += `<circle cx="${x + CS / 2}" cy="${y + CS / 2}" r="3.6" fill="var(--ink)"/>`;
            }
            for (let p = 0; p < N; p++) {
              const x = 2 + (p % COLS) * CS, y = 2 + Math.floor(p / COLS) * CS;
              if (p % COLS < COLS - 1 && r.obj[p] !== r.obj[p + 1]) b += `<line x1="${x + CS}" y1="${y}" x2="${x + CS}" y2="${y + CS}" stroke="var(--false)" stroke-width="2.6" stroke-linecap="round"/>`;
              if (p + COLS < N && r.obj[p] !== r.obj[p + COLS]) b += `<line x1="${x}" y1="${y + CS}" x2="${x + CS}" y2="${y + CS}" stroke="var(--false)" stroke-width="2.6" stroke-linecap="round"/>`;
            }
            const frame = `<rect x="2" y="2" width="${COLS * CS}" height="${ROWS * CS}" fill="none" stroke="var(--rule)" stroke-width="1.2"/>`;
            inSvg.innerHTML = a + frame;
            outSvg.innerHTML = b + frame;
            const changed = r.obj.filter((o, p) => o !== img[p] >= 5).length;
            const nObj = r.obj.filter(Boolean).length;
            ctx.rc(cost,
              h('tr', h('td', 'Data cost: each pixel pays for its label'), h('td', String(r.data))),
              h('tr', h('td', `Cut neighbor pairs: ${r.bnd} × λ (${lam})`), h('td', String(r.bnd * lam))),
              h('tr', { style: { borderTop: '1px solid var(--rule)' } }, h('td', h('b', 'Total = min cut = max flow')), h('td', h('b', String(r.data + r.bnd * lam)))));
            note.innerHTML = lam === 0
              ? `With λ = 0 each pixel decides alone: score 5 or more means object. Noise survives as specks and holes. Raise λ.`
              : nObj === 0 ? `Nothing is labeled object. At λ = ${lam} any boundary costs more than the object's pixels save, so the cheapest cut keeps every pixel on the background side. Lower λ.`
              : `${nObj} pixels are object. Smoothing overruled ${changed} pixel${changed === 1 ? '' : 's'} (dots), because flipping ${changed === 1 ? 'it' : 'them'} saves more boundary cost than it adds in data cost.` + (lam >= 5 ? ' At large λ the boundary is so expensive that small parts of the object vanish too.' : '');
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Code: BFS finds the shortest augmenting path',
        kind: 'code',
        file: 'bfs_path.py',
        html: String.raw`<p class="muted small">This is the search step of Edmonds–Karp. Residual capacities live in a dictionary of dictionaries: <code>res[u][v]</code> is the room on step \(u \to v\). Switch to <b>Trace</b> to watch the queue and the <code>parent</code> map grow.</p>`,
        fivew: {
          what: 'A breadth-first search over the residual network that returns the shortest augmenting path from s to t as a list of vertices, or an empty list when no augmenting path exists.',
          why: 'Choosing the path with the fewest edges is what makes Edmonds–Karp fast: at most \\(|V| \\cdot |E|\\) augmentations, whatever the capacities.',
          who: 'Engineers who plan network bandwidth, schedule jobs, or build matching systems; and anyone writing a max-flow routine, since this search is its inner loop.',
          where: 'Inside every Edmonds–Karp implementation, and inside many other graph algorithms that need shortest paths in an unweighted graph.',
          when: 'Each round of the max-flow loop runs this search once. When it returns an empty path, the flow is maximum and the loop stops.',
        },
        lines: [
          ['from collections import deque', 'Imports <code>deque</code>, a double-ended queue. Removing from its front with <code>popleft()</code> is fast. A plain list would have to shift every remaining element on <code>pop(0)</code>.'],
          ['def bfs_path(res, s, t):', 'Defines the search. <code>res</code> holds residual capacities, <code>s</code> and <code>t</code> name the source and sink. It returns the vertices of a shortest augmenting path, or <code>[]</code> if there is none.'],
          ['    parent, queue = {s: None}, deque([s])', 'Two assignments in one line. <code>parent</code> records, for every vertex found so far, the vertex we came from; <code>s</code> has no parent, so it maps to <code>None</code>. The same dictionary doubles as the set of visited vertices. The queue starts with <code>s</code>.'],
          ['    while queue:', 'Repeat while vertices are waiting to be explored. An empty deque counts as false, so the loop ends when the search runs out of vertices.'],
          ['        u = queue.popleft()', 'Takes the vertex that has waited longest: first in, first out. That order explores all vertices one step from <code>s</code>, then all vertices two steps away, and so on. So the first route found to <code>t</code> has the fewest edges.'],
          ['        for v, room in res[u].items():', 'Visits every step out of <code>u</code> together with its residual capacity. For <code>u = "s"</code> this gives <code>("a", 4)</code> and then <code>("b", 2)</code>, in the order the dictionary stores them.'],
          ['            if room > 0 and v not in parent:', 'Two conditions. The step must have room: a step with room 0 is full and cannot carry more. And <code>v</code> must be new: a vertex that already has a parent was reached earlier by a route at least as short.'],
          ['                parent[v] = u', 'Records that <code>v</code> was reached from <code>u</code>. Following these links backwards from <code>t</code> will trace the path.'],
          ['                queue.append(v)', 'Puts <code>v</code> at the back of the queue to explore later. With this data the queue becomes <code>[a, b]</code> after exploring <code>s</code>, and <code>t</code> is discovered while exploring <code>a</code>.'],
          ['    path = [t] if t in parent else []', 'A conditional expression. If the search reached <code>t</code>, the path starts at <code>t</code>; otherwise it is empty, which tells the max-flow loop that the flow is already maximum.'],
          ['    while path and path[-1] != s:', 'Walks backwards while the list is non-empty and its last vertex, <code>path[-1]</code>, is not yet <code>s</code>.'],
          ['        path.append(parent[path[-1]])', 'Adds the parent of the last vertex. Here the list grows <code>[t]</code>, then <code>[t, a]</code>, then <code>[t, a, s]</code>.'],
          ['    return path[::-1]', 'The slice <code>[::-1]</code> reverses the list, so the path reads from <code>s</code> to <code>t</code>: <code>["s", "a", "t"]</code>.'],
          ['res = {"s": {"a": 4, "b": 2}, "a": {"b": 3, "t": 1},', 'The residual capacities before any flow is sent, so they equal the capacities. <code>res["a"]["t"]</code> is 1. A depth-first search that always takes the first neighbor would wander <code>s → a → b → t</code>.'],
          ['       "b": {"t": 5}, "t": {}}', 'The second line of the same dictionary: Python lets a literal continue inside its braces. <code>t</code> has no outgoing steps, so it maps to an empty dictionary.'],
          ['print(bfs_path(res, "s", "t"))', 'Prints <code>[\'s\', \'a\', \'t\']</code>: two edges, the shortest route, even though its bottleneck is only 1. Edmonds–Karp counts edges, not width, and that rule is what bounds the number of rounds.'],
        ],
        expected: "['s', 'a', 't']\n",
        tryIt: 'Set <code>"t": 0</code> inside <code>res["a"]</code> (the step is full) and predict the new path before you run it. Then set every step out of <code>s</code> to 0 and confirm the result is <code>[]</code>.',
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: pushing flow and canceling it',
        kind: 'code',
        file: 'augment.py',
        html: String.raw`<p class="muted small">This is the push step, run on the trap network from the augmenting-path slide. The second path uses the backward step \(b \dashrightarrow a\). Watch <code>res["a"]["b"]</code> drop to 0 and come back to 1 in <b>Trace</b>.</p>`,
        fivew: {
          what: 'Builds the residual network for a set of capacities, pushes the bottleneck along two augmenting paths, and recovers the final flow on every edge.',
          why: 'It shows the bookkeeping that makes backward steps work: every push lowers the room ahead and raises the room behind, so later paths can cancel earlier flow.',
          who: 'Anyone implementing or debugging a max-flow routine, and students checking that they understand why canceling flow is allowed.',
          where: 'The update loop here is the body of every Ford–Fulkerson style algorithm, including Edmonds–Karp and its variants in libraries.',
          when: 'Once per augmenting path. In a full Edmonds–Karp program the paths come from the BFS on the previous slide instead of a fixed list.',
        },
        lines: [
          ['cap = {"s": {"a": 1, "b": 1}, "a": {"b": 1, "t": 1},', 'The capacities of the trap network as a dictionary of dictionaries: every edge has capacity 1. <code>cap["a"]["b"]</code> is the capacity of edge <code>a → b</code>.'],
          ['       "b": {"t": 1}, "t": {}}', 'The rest of the same dictionary. The sink <code>t</code> has no outgoing edges.'],
          ['res = {u: dict(nbrs) for u, nbrs in cap.items()}', 'A dictionary comprehension that copies each inner dictionary with <code>dict(...)</code>, so changing <code>res</code> later never changes <code>cap</code>. With zero flow, the room on every edge equals its capacity.'],
          ['for u in cap:', 'Loops over every vertex to add the backward entries.'],
          ['    for v in cap[u]:', 'Loops over every edge <code>u → v</code>.'],
          ['        res[v].setdefault(u, 0)', 'Makes sure the backward step <code>v → u</code> exists, with room 0 because nothing can be canceled yet. <code>setdefault</code> only inserts when the key is missing, so a real edge <code>v → u</code> would keep its own capacity.'],
          ['paths = [["s", "a", "b", "t"], ["s", "b", "a", "t"]]', 'Two augmenting paths in the order a careless search might find them. The second one walks <code>b → a</code>, against edge <code>a → b</code>. That step only has room after the first push.'],
          ['for path in paths:', 'The augmenting loop: one round per path.'],
          ['    hops = list(zip(path, path[1:]))', '<code>zip</code> pairs each vertex with the next one: <code>[("s", "a"), ("a", "b"), ("b", "t")]</code> in round 1. <code>list(...)</code> stores the pairs so we can loop over them twice.'],
          ['    push = min(res[u][v] for u, v in hops)', 'The bottleneck: the smallest room on the path. It is 1 in both rounds. In round 2 the room on <code>("b", "a")</code> is 1 only because round 1 sent a unit along <code>a → b</code>.'],
          ['    for u, v in hops:', 'Updates every step of the path.'],
          ['        res[u][v] -= push', 'Less room in the direction we pushed. In round 1, <code>res["a"]["b"]</code> drops from 1 to 0.'],
          ['        res[v][u] += push', 'More room in the opposite direction, because the units just sent could be canceled later. Round 1 sets <code>res["b"]["a"] = 1</code>; round 2 uses it and raises <code>res["a"]["b"]</code> back to 1, which cancels the flow on <code>a → b</code>.'],
          ['    print(" -> ".join(path), "pushes", push)', 'Reports each round, for example <code>s -> a -> b -> t pushes 1</code>.'],
          ['flow = {u + v: res[v][u] for u in cap for v in cap[u]}', 'Reads the flow on each original edge <code>u → v</code> from its backward room <code>res[v][u]</code>, because the room to cancel is exactly the flow sent. (This shortcut works here because no two edges point in opposite directions.) The keys glue the names together, like <code>"ab"</code>.'],
          ['print(flow, "value:", flow["sa"] + flow["sb"])', 'Prints <code>{\'sa\': 1, \'sb\': 1, \'ab\': 0, \'at\': 1, \'bt\': 1} value: 2</code>. Edge <code>a → b</code> ends at 0 because round 2 canceled it, and the value 2 is the total leaving <code>s</code>.'],
        ],
        expected: "s -> a -> b -> t pushes 1\ns -> b -> a -> t pushes 1\n{'sa': 1, 'sb': 1, 'ab': 0, 'at': 1, 'bt': 1} value: 2\n",
        tryIt: 'Swap the order of the two paths and run it. The first path <code>s → b → a → t</code> now fails with bottleneck 0, because nothing has been sent along <code>a → b</code> yet. What does that tell you about backward steps?',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: maximum matching by augmenting paths',
        kind: 'code',
        file: 'matching.py',
        html: String.raw`<p class="muted small">The same augmenting-path idea, specialized to workers and jobs, fits in a short recursive function. In <b>Trace</b>, watch Cy's search re-route Ava from Train to Clean.</p>`,
        fivew: {
          what: 'Finds a maximum matching between workers and the jobs they are qualified for, placing workers one at a time and re-routing earlier workers when needed.',
          why: 'It is max flow with every capacity 1, written directly on the bipartite graph. Each successful search is one augmenting path and grows the matching by exactly one.',
          who: 'Developers of schedulers, course-allocation tools, ride-sharing dispatch, and any system that pairs items from two groups.',
          where: 'Assigning jobs to machines or GPUs, reviewers to papers, students to project slots, and as a building block for weighted assignment algorithms.',
          when: 'Use it for unweighted matchings of modest size. For large graphs, the Hopcroft–Karp algorithm finds many augmenting paths per round and is faster.',
        },
        lines: [
          ['likes = {"Ava": ["Label", "Train", "Clean"],', 'The bipartite graph as an adjacency dictionary: each worker maps to the jobs they are qualified for. The order of each list is the order the jobs are tried.'],
          ['         "Ben": ["Label"], "Cy": ["Train", "Eval"]}', 'The dictionary continues inside its braces. Ben is qualified only for Label; Cy for Train and Eval. Three workers, four jobs.'],
          ['match = {}', 'The current matching, stored as job → worker, so "who holds this job?" is a single lookup. It starts empty.'],
          ['def place(w, seen):', 'A recursive search for an augmenting path that starts at worker <code>w</code>. <code>seen</code> holds the jobs already considered in this search, so the recursion cannot go round in circles. It returns <code>True</code> if <code>w</code> ends up with a job.'],
          ['    for job in likes[w]:', 'Tries the jobs of <code>w</code> in order.'],
          ['        if job not in seen:', 'Skips a job that someone further up the chain is already trying to take. Without this check, two workers could keep handing the same job back and forth forever.'],
          ['            seen.add(job)', 'Marks the job as considered before going deeper.'],
          ['            if job not in match or place(match[job], seen):', 'The heart of the algorithm. The job works for <code>w</code> if it is free, or if its current holder can move to another job (the recursive call). Because <code>or</code> stops at the first true part, the recursion only runs when the job is taken. The chain of calls is the augmenting path: new edge, given-up edge, new edge, and so on.'],
          ['                match[job] = w', 'Gives the job to <code>w</code>. If the recursive call succeeded, the old holder already has another job, so nobody is left without one.'],
          ['                return True', 'Reports success back up the chain of calls.'],
          ['    return False', 'No job worked, so <code>w</code> is not placed by this search and the matching is unchanged.'],
          ['for w in likes:', 'Places the workers one at a time, like the lab. Each successful search grows the matching by exactly one edge.'],
          ['    ok = place(w, set())', 'Starts each worker\'s search with a fresh, empty <code>seen</code> set.'],
          ['    print(w, "placed" if ok else "left out", len(match))', 'Prints the result and the matching size so far. For Ben the output is <code>Ben placed 2</code>: Ben takes Label and Ava moves to Train. For Cy, Ava cannot take Label back from Ben, so she moves on to Clean. Cy re-routes Ava even though Eval is free, because this depth-first search follows list order; the lab\'s BFS would take Eval directly. Both give a maximum matching.'],
          ['print(sorted((w, job) for job, w in match.items()))', 'Flips each pair to (worker, job) and sorts them so the output is predictable: <code>[(\'Ava\', \'Clean\'), (\'Ben\', \'Label\'), (\'Cy\', \'Train\')]</code>.'],
        ],
        expected: "Ava placed 1\nBen placed 2\nCy placed 3\n[('Ava', 'Clean'), ('Ben', 'Label'), ('Cy', 'Train')]\n",
        tryIt: 'Remove <code>"Clean"</code> from Ava\'s list and change Cy\'s list to <code>["Train"]</code>. Who is left out now, and which set of workers breaks Hall\'s condition?',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: network models in real code',
        kind: 'design',
        html: String.raw`<p class="muted small">A max-flow routine is short; modeling the problem correctly and trusting the answer take most of the work. Click each principle (or use <kbd>↓</kbd>).</p>`,
        principles: [
          {
            name: 'Model the problem before writing code',
            html: '<p>Decide what flows (gigabytes per second, workers, trucks), what the vertices and edges are, and which units the capacities use. Problems with several sources or sinks become standard by adding a <b>super-source</b> joined to every real source, and a super-sink in the same way.</p><p>Undirected links become two directed edges, one each way.</p>',
            bad: 'flow = max_flow(links)   # what flows? from where?',
            good: 'for dc, gbps in supply.items():\n    cap["SRC"][dc] = gbps    # super-source\nflow = max_flow(cap, "SRC", "cluster")',
          },
          {
            name: 'Find augmenting paths with BFS (Edmonds–Karp)',
            html: '<p>Any augmenting path gives a correct answer eventually, but a depth-first search can need a number of rounds proportional to the capacities: 2000 rounds for the 1000-capacity diamond. BFS bounds the work by \\(O(|V| \\cdot |E|^2)\\) no matter how large the numbers are.</p>',
            bad: 'path = dfs_path(res, s, t)   # any path: may crawl',
            good: 'path = bfs_path(res, s, t)   # fewest edges:\n                             # O(V * E**2) total',
          },
          {
            name: 'Keep residual capacities in a dict of dicts',
            html: '<p><code>res[u][v]</code> gives the room on a step in one lookup and lists a vertex\'s steps with <code>res[u].items()</code>. Add a backward entry for every edge, but never overwrite a real edge that already runs the other way.</p>',
            bad: 'for u in cap:\n    for v in cap[u]:\n        res[v][u] = 0    # wipes a real v -> u edge',
            good: 'for u in cap:\n    for v in cap[u]:\n        res[v].setdefault(u, 0)   # keeps it',
          },
          {
            name: 'Use integer capacities',
            html: '<p>With whole numbers every push adds at least 1, so the algorithm must stop, and the answer is exact. Floating-point capacities pick up rounding error and can make "is there room?" checks wrong. Scale to a small unit instead: megabits rather than fractions of gigabits.</p>',
            bad: 'cap["a"]["b"] = 0.1 + 0.2    # 0.30000000000000004',
            good: 'cap["a"]["b"] = 300   # Mbit/s, exact',
          },
          {
            name: 'Check the flow rules after every augmentation in tests',
            html: '<p>A small checker catches most bookkeeping bugs (a missed backward update, a wrong sign). Run it after every push in your tests: capacity on every edge, conservation at every vertex except \\(s\\) and \\(t\\).</p>',
            good: 'def check(cap, f, s, t):\n    assert all(0 <= f[u][v] <= c for u in cap\n               for v, c in cap[u].items())\n    for x in cap.keys() - {s, t}:\n        assert inflow(f, x) == outflow(f, x)',
          },
          {
            name: 'Report the minimum cut along with the number',
            html: '<p>"Max throughput is 19" invites the question "why not more?". The minimum cut answers it: these links are full and nothing else matters. Compute it from the final residual network (the vertices still reachable from \\(s\\)) and show it to whoever has to buy the upgrade.</p>',
            bad: 'print("max flow:", value)',
            good: 'S = reachable(res, s)\ncut = [(u, v) for u in S for v in cap[u]\n       if v not in S]\nprint("max flow:", value, "limited by:", cut)',
          },
          {
            name: 'Use a tested library in production',
            html: '<p>Write the algorithm once to understand it, then use a library for real systems. <code>networkx</code> offers <code>maximum_flow</code> and <code>minimum_cut</code> with faster algorithms (preflow-push) and years of testing. For very large graphs, OR-Tools provides optimized max-flow and min-cost-flow solvers.</p>',
            good: 'import networkx as nx\nG = nx.DiGraph()\nG.add_edge("s", "a", capacity=10)\nvalue, flows = nx.maximum_flow(G, "s", "t")\ncut_value, (S, T) = nx.minimum_cut(G, "s", "t")',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example 1 */
      {
        title: 'Worked example: maximum flow by augmenting paths',
        kind: 'example',
        id: 'ex-maxflow',
        problem: String.raw`<p>Find the maximum flow from \(s\) to \(t\) by the Ford–Fulkerson method, one augmenting path at a time, in the network with capacities \(s \to a = 10\), \(s \to b = 8\), \(a \to b = 3\), \(a \to t = 6\) and \(b \to t = 12\).</p>`,
        id: 'ex-maxflow',
        objective: 'Find a maximum flow by repeatedly pushing the bottleneck amount along an augmenting path, then certify the result with a cut of equal capacity.',
        data: EX_MAXFLOW_DATA,
        steps: flowStepsFor(EX_MAXFLOW_DATA, 'bfs', { at: 2, text: 'Predict: s → b is full and a → t is full, and the flow value is 14. Is 14 the maximum, or can more flow still reach t — and if so, along which route?' }),
        answer: 17,
        verify(M) {
          const cap = { s: { a: 10, b: 8 }, a: { b: 3, t: 6 }, b: { t: 12 }, t: {} };
          const res = {};
          for (const u of Object.keys(cap)) { res[u] = res[u] || {}; for (const [v, c] of Object.entries(cap[u])) { res[u][v] = c; res[v] = res[v] || {}; if (!(u in res[v])) res[v][u] = 0; } }
          let total = 0;
          for (;;) {
            const parent = { s: null };
            const queue = ['s'];
            while (queue.length) {
              const u = queue.shift();
              for (const [v, room] of Object.entries(res[u])) if (room > 0 && !(v in parent)) { parent[v] = u; queue.push(v); }
            }
            if (!('t' in parent)) break;
            let push = Infinity;
            for (let v = 't'; v !== 's'; v = parent[v]) push = Math.min(push, res[parent[v]][v]);
            for (let v = 't'; v !== 's'; v = parent[v]) { res[parent[v]][v] -= push; res[v][parent[v]] += push; }
            total += push;
          }
          const f = { sa: 9, sb: 8, ab: 3, at: 6, bt: 11 };
          const caps = { sa: 10, sb: 8, ab: 3, at: 6, bt: 12 };
          const withinCaps = Object.keys(caps).every((k) => f[k] >= 0 && f[k] <= caps[k]);
          const consA = f.sa === f.ab + f.at;
          const consB = f.sb + f.ab === f.bt;
          const value = f.sa + f.sb;
          return total === 17 && withinCaps && consA && consB && value === 17;
        },
        variants: [
          {
            label: 'Variant: the trap — a backward step',
            problem: String.raw`<p>The same four-vertex network shrunk down: every capacity is now 1 — \(s \to a = 1\), \(s \to b = 1\), \(a \to b = 1\), \(a \to t = 1\) and \(b \to t = 1\). A depth-first search finds the path \(s \to a \to b \to t\) first. Find the maximum flow, and watch what the residual network has to do to escape that first choice.</p>`,
            data: EX_TRAP_DATA,
            steps: flowStepsFor(EX_TRAP_DATA, 'dfs', { at: 1, text: 'Predict: the flow value is 1 and the three edges of the first path are all full. Is 1 really the maximum, or can the residual network reopen a route to t?' }),
            answer: 2,
            verify(M) {
              const cap = [['s', 'a', 1], ['s', 'b', 1], ['a', 'b', 1], ['a', 't', 1], ['b', 't', 1]];
              let best = Infinity;
              for (let mask = 0; mask < 4; mask++) {
                const S = new Set(['s', ...['a', 'b'].filter((_, i) => mask & (1 << i))]);
                best = Math.min(best, cap.filter(([u, v]) => S.has(u) && !S.has(v)).reduce((a, e) => a + e[2], 0));
              }
              const f = { sa: 1, sb: 1, ab: 0, at: 1, bt: 1 };
              const caps = { sa: 1, sb: 1, ab: 1, at: 1, bt: 1 };
              const valid = Object.keys(caps).every((k) => f[k] >= 0 && f[k] <= caps[k]) && f.sa === f.ab + f.at && f.sb + f.ab === f.bt;
              return best === 2 && valid && f.sa + f.sb === 2;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h, s } = ctx;
          const D = (preset && preset.data) || EX_MAXFLOW_DATA;
          const svg = s('svg', { viewBox: '0 0 500 240', class: 'nf-svg', role: 'img', 'aria-label': step.status, style: { width: '470px', maxWidth: '100%', height: 'auto', display: 'block' } }, ...exNetKids(s, step, D));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem' } },
            h('div.small', h('b.mono', step.status)),
            svg,
            step.answer ? h('div.ex-answer', step.banner) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 2 */
      {
        title: 'Worked example: a minimum cut from the residual network',
        kind: 'example',
        id: 'ex-mincut',
        problem: String.raw`<p>For the same network — capacities \(s \to a = 10\), \(s \to b = 8\), \(a \to b = 3\), \(a \to t = 6\) and \(b \to t = 12\) — whose maximum flow is 17, from the previous example, find a minimum \(s\)-\(t\) cut by reading the final residual network.</p>`,
        id: 'ex-mincut',
        objective: 'Read a minimum cut off the final residual network: mark the vertices reachable from s, then add the capacities of the edges leaving that set.',
        data: EX_MINCUT_DATA,
        steps: cutStepsFor(EX_MINCUT_DATA, { at: 1, text: 'Predict: following only the residual steps that still have positive room, which vertices will the walk from s reach — and will b be one of them?' }),
        answer: 17,
        verify(M) {
          const cap = [['s', 'a', 10], ['s', 'b', 8], ['a', 'b', 3], ['a', 't', 6], ['b', 't', 12]];
          const mids = ['a', 'b'];
          let count = 0, best = Infinity, bestSet = '';
          for (let mask = 0; mask < 4; mask++) {
            const S = new Set(['s', ...mids.filter((_, i) => mask & (1 << i))]);
            count++;
            const sum = cap.filter(([u, v]) => S.has(u) && !S.has(v)).reduce((acc, e) => acc + e[2], 0);
            if (sum < best) { best = sum; bestSet = [...S].sort().join(','); }
          }
          return count === 4 && best === 17 && bestSet === 'a,s';
        },
        variants: [
          {
            label: 'Variant: the cheap cut sits near s',
            problem: String.raw`<p>A reshaped version of the same network: capacities \(s \to a = 4\), \(s \to b = 9\), \(a \to b = 2\), \(a \to t = 7\) and \(b \to t = 8\), with maximum flow 12. The edges entering \(t\) look like the obvious bottleneck — check first. Find a minimum \(s\)-\(t\) cut by reading the final residual network.</p>`,
            data: EX_MINCUT_VAR_DATA,
            steps: cutStepsFor(EX_MINCUT_VAR_DATA, { at: 1, text: 'Predict: after the maximum flow, s → b still has residual room. Which vertices will the walk from s reach, and will the minimum cut sit next to s or next to t?' }),
            answer: 12,
            verify(M) {
              const cap = [['s', 'a', 4], ['s', 'b', 9], ['a', 'b', 2], ['a', 't', 7], ['b', 't', 8]];
              let count = 0, best = Infinity, bestSet = '';
              for (let mask = 0; mask < 4; mask++) {
                const S = new Set(['s', ...['a', 'b'].filter((_, i) => mask & (1 << i))]);
                count++;
                const sum = cap.filter(([u, v]) => S.has(u) && !S.has(v)).reduce((acc, e) => acc + e[2], 0);
                if (sum < best) { best = sum; bestSet = [...S].sort().join(','); }
              }
              const sinkSide = cap.filter(([u, v]) => v === 't').reduce((a, e) => a + e[2], 0);
              return count === 4 && best === 12 && bestSet === 'b,s' && sinkSide === 15 && best < sinkSide;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h, s } = ctx;
          const D = (preset && preset.data) || EX_MINCUT_DATA;
          const svg = s('svg', { viewBox: '0 0 500 240', class: 'nf-svg', role: 'img', 'aria-label': step.status, style: { width: '470px', maxWidth: '100%', height: 'auto', display: 'block' } }, ...exNetKids(s, step, D));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem' } },
            h('div.small', h('b.mono', step.status)),
            svg,
            step.answer ? h('div.ex-answer', step.banner) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 3 */
      {
        title: 'Worked example: auditing a flow, vertex by vertex',
        kind: 'example',
        id: 'ex-flow-audit',
        problem: String.raw`<p>A network has capacities \(s \to a = 9\), \(s \to b = 5\), \(a \to b = 4\), \(a \to c = 6\), \(b \to c = 4\), \(b \to t = 6\) and \(c \to t = 10\). A teammate claims the assignment \(7, 3, 2, 5, 4, 1, 9\) on those edges (in the same order) is a valid flow. Audit it: check the capacity rule on every edge, then check conservation at \(a\), \(b\) and \(c\) one vertex at a time, and find the flow's value if it is valid.</p>`,
        objective: 'Verify a stated flow assignment by auditing both flow rules directly: capacity on every edge, then inflow against outflow at each intermediate vertex, summed from the edge list.',
        data: EX_AUDIT_DATA,
        steps: auditStepsFor(EX_AUDIT_DATA),
        answer: 10,
        verify(M) { return auditVerify(EX_AUDIT_DATA, { valid: true, value: 10 }); },
        variants: [
          {
            label: 'Variant: one vertex does not balance',
            problem: String.raw`<p>The same network and almost the same assignment — \(7, 3, 2, 5, 4, 1\) on the first six edges as before — but now \(c \to t\) carries \(8\) instead of \(9\). Audit this assignment the same way: capacity on every edge, then conservation at \(a\), \(b\) and \(c\). Is it a valid flow, and if not, exactly where does it break?</p>`,
            data: EX_AUDIT_VAR_DATA,
            steps: auditStepsFor(EX_AUDIT_VAR_DATA),
            answer: 'invalid at c',
            verify(M) { return auditVerify(EX_AUDIT_VAR_DATA, { valid: false, at: 'c' }); },
          },
        ],
        draw: exAuditDraw(EX_AUDIT_DATA),
      },
      /* ---------------------------------------------------------------- worked example 4 */
      {
        title: 'Worked example: the augmenting path that has to cancel flow',
        kind: 'example',
        id: 'ex-reverse-reroute',
        problem: String.raw`<p>Find the maximum flow from \(s\) to \(t\) in the network with capacities \(s \to a = 4\), \(s \to b = 4\), \(a \to b = 3\), \(a \to c = 5\), \(b \to c = 3\), \(b \to d = 5\), \(c \to d = 2\), \(c \to t = 5\) and \(d \to t = 4\), using a depth-first search that always takes the first augmenting path it finds. The greedy early paths block the optimum; watch for the augmenting path that can only exist because the residual network lets it cancel flow on one edge and reroute that flow instead.</p>`,
        objective: 'Run Ford–Fulkerson with depth-first path choices on a network where greedy choices block the optimum, and explain the backward residual step — why canceling flow is legal and what the rerouting buys.',
        data: EX_REV_DATA,
        steps: revStepsFor(EX_REV_DATA, { at: 4, text: 'Predict: the value is 6 and d → t is full, yet c → t still has room and s → b is not full. Is there one more augmenting path — and will it have to cancel flow on some edge to reach t?' }),
        answer: 8,
        verify(M) { return revVerify(EX_REV_DATA, { value: 8, flow: { sa: 4, sb: 4, ab: 3, ac: 1, bc: 3, bd: 4, cd: 0, ct: 4, dt: 4 } }); },
        variants: [
          {
            label: 'Variant: a wider last link, no cancellation needed',
            problem: String.raw`<p>The same network with one capacity changed: \(d \to t\) now has capacity \(6\) instead of \(4\). Run the same depth-first Ford–Fulkerson search. The pinch that forced a cancellation is wider now — find the maximum flow, and check whether any augmenting path still needs a backward step.</p>`,
            data: EX_REV_VAR_DATA,
            steps: revStepsFor(EX_REV_VAR_DATA, { at: 3, text: 'Predict: three pushes have raised the value to 4, and d → t (now capacity 6) still has room. Will finishing the job need a backward step this time, or can a plain forward path do it?' }),
            answer: 8,
            verify(M) { return revVerify(EX_REV_VAR_DATA, { value: 8, flow: { sa: 4, sb: 4, ab: 3, ac: 1, bc: 3, bd: 4, cd: 2, ct: 2, dt: 6 } }); },
          },
        ],
        draw: exAuditDraw(EX_REV_DATA),
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: network flows',
        kind: 'practice',
        html: String.raw`<p class="muted small">Edge labels show capacity, or flow / capacity. Answers are whole numbers unless the problem offers buttons.</p>`,
        gens: [
          {
            label: 'Bottleneck of a path',
            make(R) {
              const inner = R.sample(['a', 'b', 'c', 'd'], R.int(2, 3));
              const vs = ['s', ...inner, 't'];
              const rows = [];
              for (let i = 0; i < vs.length - 1; i++) {
                const back = i > 0 && i < vs.length - 2 && R.chance(0.45);
                const c = R.int(3, 12);
                const f = back ? R.int(1, c) : R.int(0, c - 1);
                rows.push({ from: vs[i], to: vs[i + 1], back, c, f, room: back ? f : c - f });
              }
              const ans = Math.min(...rows.map((r) => r.room));
              const step = (r) => `${r.from} ${r.back ? '⇢' : '→'} ${r.to}`;
              const table = '<table class="tt" style="margin-top:0.4rem"><thead><tr><th>Step</th><th>Uses edge</th><th>Flow / capacity</th><th>Kind</th></tr></thead><tbody>' +
                rows.map((r) => `<tr><td>${step(r)}</td><td>${r.back ? `${r.to} → ${r.from}` : `${r.from} → ${r.to}`}</td><td>${r.f} / ${r.c}</td><td>${r.back ? 'backward' : 'forward'}</td></tr>`).join('') + '</tbody></table>';
              return {
                prompt: `An augmenting path ${vs.join(' – ')} uses these steps in the current flow. How many units can be pushed along it?${table}`,
                answer: ans,
                hint: 'forward room = capacity − flow; backward room = flow (what can be canceled).',
                solution: `Room on each step: ${rows.map((r) => `${step(r)}: ${r.back ? `${r.f} (cancel up to the flow)` : `${r.c} − ${r.f} = ${r.room}`}`).join('; ')}. The bottleneck is the smallest, <b>${ans}</b>, so pushing raises the flow value by ${ans}.`,
              };
            },
          },
          {
            label: 'Valid flow?',
            make(R) {
              const net = randomNet(R, 2, 9);
              const f = net.edges.map(() => 0);
              const paths = allPaths(net);
              for (let k = R.int(2, 3); k > 0; k--) {
                const p = R.pick(paths);
                const room = Math.min(...p.map((i) => net.edges[i].c - f[i]));
                if (room > 0) { const amt = R.int(1, room); p.forEach((i) => (f[i] += amt)); }
              }
              if (R.chance(0.5)) {
                if (R.chance(0.5)) {
                  const p = R.pick(paths);
                  const room = Math.min(...p.map((i) => net.edges[i].c - f[i]));
                  const amt = room + 1;
                  p.forEach((i) => (f[i] += amt));
                } else {
                  const i = R.int(0, net.edges.length - 1);
                  f[i] += f[i] + 1 <= net.edges[i].c ? 1 : -1;
                }
              }
              const over = net.edges.filter((e, i) => f[i] > e.c);
              const cons = ['a', 'b', 'c'].map((x) => ({ x, inn: net.edges.reduce((a, e, i) => a + (e.v === x ? f[i] : 0), 0), out: net.edges.reduce((a, e, i) => a + (e.u === x ? f[i] : 0), 0) }));
              const valid = !over.length && cons.every((c) => c.inn === c.out);
              const val = net.edges.reduce((a, e, i) => a + (e.u === 's' ? f[i] : 0), 0);
              return {
                prompt: `Is this a valid flow? Check both flow rules.${practiceSvg(net, (e, i) => `${f[i]}/${e.c}`, null, (e, i) => (f[i] > 0 ? 'flow' : 'base'))}`,
                options: ['Valid', 'Not valid'],
                answer: valid ? 'Valid' : 'Not valid',
                solution: `<b>Capacity rule:</b> ${over.length ? `fails on ${over.map((e) => `${edgeName(e)} (${f[net.edges.indexOf(e)]} &gt; ${e.c})`).join(', ')}.` : 'every edge has 0 ≤ f ≤ c.'}<br><b>Conservation:</b> ${cons.map((c) => `${c.x}: in ${c.inn}, out ${c.out} ${c.inn === c.out ? '✓' : '✗'}`).join('; ')}.<br>` +
                  (valid ? `Both rules hold, so it is a <b>valid</b> flow, with value ${val} (the total leaving s).` : 'At least one rule fails, so it is <b>not valid</b>.'),
              };
            },
          },
          {
            label: 'Capacity of a cut',
            make(R) {
              const net = randomNet(R, 1, 9);
              const S = new Set(['s', ...['a', 'b', 'c'].filter(() => R.chance(0.5))]);
              const out = net.edges.filter((e) => S.has(e.u) && !S.has(e.v));
              const back = net.edges.filter((e) => !S.has(e.u) && S.has(e.v));
              const ans = out.reduce((a, e) => a + e.c, 0);
              const T = ['s', 'a', 'b', 'c', 't'].filter((x) => !S.has(x));
              return {
                prompt: `The shaded vertices form \\(S = \\{${sortV(S).join(', ')}\\}\\) and the rest form \\(T = \\{${T.join(', ')}\\}\\). Labels are capacities. What is \\(c(S, T)\\)?${practiceSvg(net, (e) => String(e.c), Object.fromEntries([...S].map((x) => [x, 'S'])))}`,
                answer: ans,
                hint: 'add the capacities of edges that start in S and end in T; ignore edges going the other way.',
                solution: `Edges from S to T: ${out.map((e) => `${edgeName(e)} (${e.c})`).join(', ')}. ${out.length > 1 ? `Sum: ${out.map((e) => e.c).join(' + ')} = <b>${ans}</b>.` : `So \\(c(S, T) = ${ans}\\).`}` + (back.length ? ` The edge${back.length > 1 ? 's' : ''} ${back.map(edgeName).join(', ')} point${back.length > 1 ? '' : 's'} from T into S and ${back.length > 1 ? 'are' : 'is'} not counted.` : ''),
              };
            },
          },
          {
            label: 'Maximum flow',
            make(R) {
              const net = randomNet(R, 1, 9);
              const r = runMaxFlow(net);
              const out = net.edges.filter((e) => r.S.has(e.u) && !r.S.has(e.v));
              return {
                prompt: `Labels are capacities. What is the value of a maximum flow from s to t?${practiceSvg(net, (e) => String(e.c))}`,
                answer: r.value,
                hint: 'push flow along augmenting paths until none is left, then confirm with a cut of the same capacity.',
                solution: `Edmonds–Karp (shortest paths first) pushes: ${r.paths.map((p, i) => `${i + 1}) ${pathText(p.arcs)}: ${p.push}`).join('; ')}. Total <b>${r.value}</b>.<br>Certificate: S = ${setText(sortV(r.S))} (what s can still reach). Its cut edges ${out.map((e) => `${edgeName(e)} (${e.c})`).join(', ')} sum to ${out.reduce((a, e) => a + e.c, 0)}, equal to the flow, so no flow can do better.`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: network flows',
        kind: 'quiz',
        questions: [
          { q: 'At an interior vertex \\(b\\), flow arrives on two edges carrying 4 and 3 units. Two edges leave \\(b\\), and one of them carries 5. What must the other carry?', choices: ['2', '7', '12', 'Anything up to its capacity'], answer: 0, explain: 'Conservation: flow in equals flow out at every vertex other than \\(s\\) and \\(t\\). In: \\(4 + 3 = 7\\). Out: \\(5 + x = 7\\), so \\(x = 2\\).' },
          { q: 'Edge \\(a \\to b\\) has capacity 7 and carries 3 units. What does it contribute to the residual network?', choices: ['A step \\(a \\to b\\) with room 3 only', 'A step \\(a \\to b\\) with room 4 and a step \\(b \\dashrightarrow a\\) with room 3', 'A step \\(a \\to b\\) with room 7', 'A step \\(b \\dashrightarrow a\\) with room 4'], answer: 1, explain: 'Forward room is \\(c - f = 7 - 3 = 4\\). Backward room is the flow that could be canceled, \\(f = 3\\).' },
          { q: 'Why does the residual network include backward steps?', choices: ['Because flow networks are really undirected', 'To store each capacity twice for speed', 'So the algorithm can cancel flow it sent earlier and send it along a better route', 'So that flow can leave the sink'], answer: 2, explain: 'A first path may block better ones. A backward step undoes some earlier flow, which lets Ford–Fulkerson reach the true maximum. Without it the trap network gets stuck at 1 instead of 2.' },
          { q: 'In one network you find a flow of value 12 and a cut of capacity 12. What can you conclude?', choices: ['Nothing until the algorithm runs again', 'The flow can still grow by up to 12', 'The network has exactly 12 edges', 'The flow is maximum and the cut is minimum'], answer: 3, explain: 'Every flow is at most every cut. A flow equal to a cut cannot grow, and that cut cannot shrink. Each certifies the other.' },
          { q: 'With \\(S = \\{s, a\\}\\), the edges between the groups are \\(s \\to b\\) (4), \\(a \\to b\\) (3), \\(a \\to t\\) (5) and \\(b \\to a\\) (6). What is \\(c(S, T)\\)?', choices: ['12', '18', '6', '9'], answer: 0, explain: 'Only edges from \\(S\\) to \\(T\\) count: \\(4 + 3 + 5 = 12\\). The edge \\(b \\to a\\) runs from \\(T\\) into \\(S\\), so it is ignored.' },
          { q: 'What does the Edmonds–Karp algorithm add to the Ford–Fulkerson method?', choices: ['Always augment along the path with the largest bottleneck', 'Always augment along a shortest path (fewest edges), found by BFS', 'Use depth-first search because it is faster', 'Skip backward steps to save time'], answer: 1, explain: 'Edmonds–Karp is Ford–Fulkerson with BFS paths. That choice limits the work to \\(O(|V| \\cdot |E|^2)\\) regardless of capacity values. The largest-bottleneck rule is a different, also reasonable, heuristic.' },
          { q: 'All capacities are whole numbers. Which statement is guaranteed?', choices: ['Ford–Fulkerson needs exactly \\(|E|\\) augmentations', 'The maximum flow equals the sum of all capacities', 'Ford–Fulkerson stops, and it finds a maximum flow with a whole number on every edge', 'Every edge ends up saturated'], answer: 2, explain: 'Each push adds at least 1, so the method must stop, and starting from 0 every update adds or subtracts whole numbers. Usually only the edges of a minimum cut end up full.' },
          { q: 'To find a maximum matching between 5 workers and 6 jobs as a flow problem, which capacities do you use?', choices: ['5 on edges out of s and 6 on edges into t', 'The number of jobs each worker is qualified for', 'Unlimited capacity on every edge', '1 on every edge: s → worker, worker → job, job → t'], answer: 3, explain: 'Capacity 1 into each worker and out of each job means each is used at most once, so an integer maximum flow is a maximum matching.' },
          { q: 'Ava, Ben and Cy are each qualified only for jobs in {Label, Train}. What does Hall\'s condition tell you?', choices: ['At most two can be placed, because three workers share only two jobs', 'All three can be placed if the search runs long enough', 'The condition holds because each worker qualifies for at least one job', 'Nothing, because Hall\'s condition only looks at single workers'], answer: 0, explain: 'For \\(A = \\{\\text{Ava}, \\text{Ben}, \\text{Cy}\\}\\), \\(N(A) = \\{\\text{Label}, \\text{Train}\\}\\) and \\(|N(A)| = 2 \\lt 3\\). Hall\'s condition checks every group of workers, including groups of two or three.' },
          { q: 'The minimum cut of a data pipeline consists of links L1 and L2. You can afford one upgrade. Which choice can raise the maximum throughput?', choices: ['Upgrade a link that carries no flow today', 'Upgrade L1 or L2', 'Upgrade the link with the largest capacity', 'No upgrade can change the maximum flow'], answer: 1, explain: 'The maximum flow equals the minimum cut, so only raising a cut edge can raise it. If the network has several minimum cuts, you may need to upgrade an edge in each of them before the throughput moves.' },
        ],
      },
    ],
  });
})();
