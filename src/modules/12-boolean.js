/* Module 12: Boolean algebra and circuits. Objective 12: examine the relationship of Boolean
   algebra and logic circuits. Gates, combinatorial circuits, the algebra behind them, normal forms,
   minimization with Karnaugh maps, functional completeness, adders, and the perceptron link to AI. */
(() => {
  const range = (n) => [...Array(n).keys()];
  const bitsOf = (m, n) => range(n).map((i) => (m >> (n - 1 - i)) & 1);
  const popcount = (v) => { let c = 0; while (v) { c += v & 1; v >>>= 1; } return c; };
  const listJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const COLORS = ['var(--accent)', 'var(--false)', 'var(--fnc)', 'var(--num)', 'var(--kw)', 'var(--str)', 'var(--warn)', 'var(--true)'];

  const GATE_FN = {
    AND: (v) => (v.every((b) => b) ? 1 : 0),
    OR: (v) => (v.some((b) => b) ? 1 : 0),
    NOT: (v) => (v[0] ? 0 : 1),
    NAND: (v) => (v.every((b) => b) ? 0 : 1),
    NOR: (v) => (v.some((b) => b) ? 0 : 1),
    XOR: (v) => v.reduce((a, b) => a ^ b, 0),
  };

  /* ---------------- drawing gates and wires ---------------- */
  // x = left edge of the gate body, cy = vertical center; pins are where input wires attach
  function gateGeom(type, x, cy, nIn) {
    const isNot = type === 'NOT';
    const H = isNot ? 28 : nIn <= 2 ? 44 : Math.max(60, nIn * 15 + 15);
    const W = isNot ? 30 : 52 + Math.max(0, H - 60) * 0.25;
    const y0 = cy - H / 2;
    const bubble = isNot || type === 'NAND' || type === 'NOR';
    const pins = range(nIn).map((i) => [x, +(y0 + (H * (i + 1)) / (nIn + 1)).toFixed(2)]);
    return { W, H, y0, bubble, pins, out: [x + W + (bubble ? 8 : 0), cy] };
  }
  function drawGate(s, type, x, cy, nIn, label) {
    const G = gateGeom(type, x, cy, nIn);
    const { W, H, y0 } = G;
    const g = s('g');
    const body = { fill: 'var(--sheet)', stroke: 'var(--ink)', 'stroke-width': 1.8, 'stroke-linejoin': 'round' };
    const fam = type === 'NAND' ? 'AND' : type === 'NOR' ? 'OR' : type;
    if (fam === 'NOT') g.append(s('path', { d: `M${x} ${y0}L${x + W} ${cy}L${x} ${y0 + H}Z`, ...body }));
    else if (fam === 'AND') g.append(s('path', { d: `M${x} ${y0}H${x + W / 2}A${W / 2} ${H / 2} 0 0 1 ${x + W / 2} ${y0 + H}H${x}Z`, ...body }));
    else {
      g.append(s('path', { d: `M${x} ${y0}Q${x + W * 0.55} ${y0} ${x + W} ${cy}Q${x + W * 0.55} ${y0 + H} ${x} ${y0 + H}Q${x + W * 0.28} ${cy} ${x} ${y0}Z`, ...body }));
      if (fam === 'XOR') g.append(s('path', { d: `M${x - 7} ${y0}Q${x - 7 + W * 0.28} ${cy} ${x - 7} ${y0 + H}`, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.8 }));
    }
    if (G.bubble) g.append(s('circle', { cx: x + W + 4, cy, r: 4, ...body }));
    if (label) g.append(s('text', { x: x + (fam === 'AND' ? W * 0.42 : W * 0.5), y: cy + 3.5, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 600, fill: 'var(--ink-3)', text: label }));
    return { g, ...G };
  }
  // lit wires carry 1, gray wires carry 0, dashed wires have not settled yet
  const wireAttrs = (v) => (v == null
    ? { fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4', opacity: 0.7 }
    : { fill: 'none', stroke: v ? 'var(--true)' : 'var(--ink-3)', 'stroke-width': v ? 3.2 : 1.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  const dotFill = (v) => (v ? 'var(--true)' : 'var(--ink-3)');
  function lamp(s, cx, cy, v, r = 12) {
    const g = s('g');
    if (v == null) {
      g.append(s('circle', { cx, cy, r, fill: 'var(--paper)', stroke: 'var(--ink-3)', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }));
      g.append(s('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--ink-3)', text: '?' }));
      return g;
    }
    g.append(s('circle', { cx, cy, r, fill: v ? 'var(--true)' : 'var(--sheet)', stroke: v ? 'var(--true)' : 'var(--ink-3)', 'stroke-width': 2 }));
    g.append(s('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: v ? 'var(--sheet)' : 'var(--ink-2)', text: String(v) }));
    return g;
  }
  function badge(s, cx, cy, v) {
    return s('g', null,
      s('circle', { cx, cy, r: 7.5, fill: 'var(--sheet)', stroke: v ? 'var(--true)' : 'var(--ink-3)', 'stroke-width': 1.5 }),
      s('text', { x: cx, y: cy + 3.6, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: v ? 'var(--true)' : 'var(--ink-2)', text: String(v) }));
  }
  // a clickable input switch: label on top, current bit below
  function toggle(s, cx, y, label, v, fn, id) {
    const g = s('g', {
      class: 'bl-switch', tabindex: 0, role: 'button', 'data-in': id || label, 'aria-label': `Input ${label} is ${v}. Press to flip it.`,
      onclick: () => fn(false),
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(true); } },
    });
    g.append(s('rect', { x: cx - 16, y, width: 32, height: 36, rx: 7, fill: v ? 'var(--true-bg)' : 'var(--sheet)', stroke: v ? 'var(--true)' : 'var(--ink-3)', 'stroke-width': 2 }));
    g.append(s('text', { x: cx, y: y + 13, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, fill: 'var(--ink-2)', text: label }));
    g.append(s('text', { x: cx, y: y + 31, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: v ? 'var(--true)' : 'var(--ink)', text: String(v) }));
    return g;
  }
  const refocus = (root, id) => { const el = root.querySelector(`[data-in="${id}"]`); if (el) el.focus(); };

  /* ---------------- gate-level circuits: data, evaluation, drawing ---------------- */
  function evalCircuit(spec, inp) {
    const v = { ...inp };
    for (const g of spec.gates) v[g.id] = GATE_FN[g.type](g.in.map((k) => v[k]));
    return v;
  }
  function drawCircuit(ctx, spec, inp, onToggle) {
    const { s } = ctx;
    const v = evalCircuit(spec, inp);
    const svg = s('svg', { viewBox: `0 0 ${spec.W} ${spec.H}`, role: 'img', 'aria-label': `${spec.name} circuit diagram` });
    const wires = s('g'), bodies = s('g'), top = s('g');
    svg.append(wires, bodies, top);
    const geo = {}, isIn = {}, trunks = {};
    spec.inputs.forEach((p) => (isIn[p.id] = p));
    spec.gates.forEach((g) => (geo[g.id] = gateGeom(g.type, g.x, g.cy, g.in.length)));
    for (const p of spec.inputs) wires.append(s('line', { x1: p.x, y1: spec.rail[0], x2: p.x, y2: spec.rail[1], ...wireAttrs(v[p.id]) }));
    for (const g of spec.gates) {
      g.in.forEach((k, i) => {
        const [px, py] = geo[g.id].pins[i];
        if (isIn[k]) {
          wires.append(s('line', { x1: isIn[k].x, y1: py, x2: px + 10, y2: py, ...wireAttrs(v[k]) }));
          top.append(s('circle', { cx: isIn[k].x, cy: py, r: 3.4, fill: dotFill(v[k]) }));
        } else {
          const [ox, oy] = geo[k].out;
          const mid = g.mids && g.mids[i] != null ? g.mids[i] : Math.round((ox + px) / 2);
          wires.append(s('path', { d: `M${ox} ${oy}H${mid}V${py}H${px + 10}`, ...wireAttrs(v[k]) }));
          (trunks[k] ||= []).push({ mid, py, oy });
        }
      });
    }
    // a dot marks every point where one signal splits into two wires
    for (const [k, list] of Object.entries(trunks)) {
      if (list.length < 2) continue;
      const byMid = {};
      list.forEach((w) => (byMid[w.mid] ||= []).push(w));
      const mids = Object.keys(byMid).map(Number);
      for (const m of mids) {
        const ys = [byMid[m][0].oy, ...byMid[m].map((w) => w.py)];
        const lo = Math.min(...ys), hi = Math.max(...ys);
        for (const y of new Set(ys)) if (y > lo && y < hi) top.append(s('circle', { cx: m, cy: y, r: 3.4, fill: dotFill(v[k]) }));
        if (m < Math.max(...mids)) top.append(s('circle', { cx: m, cy: byMid[m][0].oy, r: 3.4, fill: dotFill(v[k]) }));
      }
    }
    for (const o of spec.outputs) {
      const [ox, oy] = geo[o.from].out;
      wires.append(s('line', { x1: ox, y1: oy, x2: spec.outX - 12, y2: oy, ...wireAttrs(v[o.from]) }));
      top.append(lamp(s, spec.outX, oy, v[o.from]));
      top.append(s('text', { x: spec.outX + 18, y: oy + 5, 'font-size': 14, 'font-weight': 700, fill: 'var(--ink)', text: o.label }));
    }
    for (const g of spec.gates) {
      const G = drawGate(s, g.type, g.x, g.cy, g.in.length, g.type === 'NOT' ? null : g.type);
      bodies.append(G.g);
      const [ox, oy] = G.out;
      if (g.name) top.append(s('text', { x: ox + 4, y: oy - 13, 'font-size': 13, 'font-style': 'italic', 'font-weight': 600, fill: 'var(--ink-2)', text: g.name }));
      if (g.ann) top.append(s('text', { x: ox + 4, y: oy - 13, 'font-size': 14, 'font-weight': 700, fill: 'var(--accent)', text: g.ann }));
      top.append(badge(s, ox + 10, oy, v[g.id]));
    }
    for (const p of spec.inputs) top.append(toggle(s, p.x, 4, p.label, inp[p.id], (kb) => onToggle(p.id, kb), p.id));
    return svg;
  }

  // the worked example of slide 2: f = xy + z'
  const C2 = {
    name: 'Example', W: 530, H: 330, rail: [40, 318], outX: 480,
    inputs: [{ id: 'x', label: 'x', x: 50 }, { id: 'y', label: 'y', x: 90 }, { id: 'z', label: 'z', x: 130 }],
    gates: [
      { id: 'XY', type: 'AND', x: 210, cy: 110, in: ['x', 'y'], ann: 'xy' },
      { id: 'NZ', type: 'NOT', x: 210, cy: 250, in: ['z'], ann: 'z′' },
      { id: 'F', type: 'OR', x: 340, cy: 180, in: ['XY', 'NZ'], mids: [298, 298], ann: 'xy + z′' },
    ],
    outputs: [{ from: 'F', label: 'f' }],
  };

  const CIRCUITS = {
    half: {
      name: 'Half adder', W: 640, H: 340, rail: [40, 300], outX: 540,
      inputs: [{ id: 'A', label: 'A', x: 70 }, { id: 'B', label: 'B', x: 110 }],
      gates: [
        { id: 'S', type: 'XOR', x: 270, cy: 120, in: ['A', 'B'] },
        { id: 'C', type: 'AND', x: 270, cy: 232, in: ['A', 'B'] },
      ],
      outputs: [{ from: 'S', label: 'S' }, { from: 'C', label: 'C' }],
      start: { A: 1, B: 1 },
      desc: 'Adds two bits. In binary 1 + 1 = 10, so the answer needs two output bits, the sum bit S and the carry bit C that moves to the next column.',
      eqs: [String.raw`S = A \oplus B`, String.raw`C = AB`],
      note: 'A half adder has no carry input, so on its own it can only add the rightmost column of two numbers. Two of them and an OR gate make a full adder.',
    },
    full: {
      name: 'Full adder', W: 640, H: 340, rail: [40, 330], outX: 560,
      inputs: [{ id: 'A', label: 'A', x: 50 }, { id: 'B', label: 'B', x: 90 }, { id: 'Cin', label: 'Cin', x: 130 }],
      gates: [
        { id: 'P', type: 'XOR', x: 200, cy: 96, in: ['A', 'B'], name: 'P' },
        { id: 'S', type: 'XOR', x: 350, cy: 140, in: ['P', 'Cin'], mids: [300, null] },
        { id: 'Q', type: 'AND', x: 350, cy: 228, in: ['P', 'Cin'], mids: [300, null] },
        { id: 'G', type: 'AND', x: 200, cy: 306, in: ['A', 'B'], name: 'G' },
        { id: 'Cout', type: 'OR', x: 470, cy: 268, in: ['Q', 'G'], mids: [435, 435] },
      ],
      outputs: [{ from: 'S', label: 'S' }, { from: 'Cout', label: 'Cout' }],
      start: { A: 1, B: 0, Cin: 1 },
      desc: 'Adds three bits, A, B and the carry Cin from the column to the right. It is two half adders plus an OR gate that merges their carries.',
      eqs: [String.raw`S = A \oplus B \oplus C_{in}`, String.raw`C_{out} = AB + C_{in}(A \oplus B)`],
      note: 'The signal P = A ⊕ B is called propagate and G = AB is called generate. Fast carry-lookahead adders are built from exactly these two signals.',
    },
    maj: {
      name: 'Majority vote', W: 640, H: 340, rail: [40, 330], outX: 560,
      inputs: [{ id: 'A', label: 'A', x: 50 }, { id: 'B', label: 'B', x: 90 }, { id: 'C', label: 'C', x: 130 }],
      gates: [
        { id: 'AB', type: 'AND', x: 220, cy: 96, in: ['A', 'B'] },
        { id: 'AC', type: 'AND', x: 220, cy: 196, in: ['A', 'C'] },
        { id: 'BC', type: 'AND', x: 220, cy: 296, in: ['B', 'C'] },
        { id: 'M', type: 'OR', x: 410, cy: 196, in: ['AB', 'AC', 'BC'], mids: [345, null, 345] },
      ],
      outputs: [{ from: 'M', label: 'M' }],
      start: { A: 1, B: 0, C: 1 },
      desc: 'Outputs 1 when at least two of the three inputs are 1. Safety-critical systems such as flight computers run three copies of a calculation and let a majority circuit outvote one faulty copy.',
      eqs: [String.raw`M = AB + AC + BC`],
      note: 'Compare this truth table with the Cout column of the full adder. They are the same function, so the carry of a full adder is a majority vote of its three inputs.',
    },
    mux: {
      name: '2-to-1 multiplexer', W: 640, H: 340, rail: [40, 300], outX: 560,
      inputs: [{ id: 'S', label: 'S', x: 50 }, { id: 'D0', label: 'D0', x: 90 }, { id: 'D1', label: 'D1', x: 130 }],
      gates: [
        { id: 'NS', type: 'NOT', x: 170, cy: 100, in: ['S'], name: 'S′' },
        { id: 'A0', type: 'AND', x: 270, cy: 136, in: ['NS', 'D0'], mids: [238, null] },
        { id: 'A1', type: 'AND', x: 270, cy: 246, in: ['S', 'D1'] },
        { id: 'Y', type: 'OR', x: 430, cy: 191, in: ['A0', 'A1'], mids: [380, 380] },
      ],
      outputs: [{ from: 'Y', label: 'Y' }],
      start: { S: 0, D0: 1, D1: 0 },
      desc: 'A multiplexer is a switch built from gates. The select bit S chooses which data input reaches the output Y. With S = 0 the output copies D0, and with S = 1 it copies D1.',
      eqs: [String.raw`Y = S'D_0 + SD_1`],
      note: 'Processors use multiplexers everywhere to route data, for example to choose which register feeds the adder. A 64-to-1 multiplexer needs 6 select bits, since 2⁶ = 64.',
    },
  };

  // a horizontal (compact) truth table for one gate, with the current column highlighted
  function miniGate(ctx, type, vals, flip) {
    const { s } = ctx;
    const n = vals.length;
    const svg = s('svg', { viewBox: '0 0 172 70', role: 'img', 'aria-label': `${type} gate with inputs ${vals.join(', ')}` });
    const G = gateGeom(type, 74, 35, n);
    const ys = n === 1 ? [35] : [20, 50];
    const out = GATE_FN[type](vals);
    vals.forEach((v, i) => {
      svg.append(s('path', { d: `M30 ${ys[i]}H52V${G.pins[i][1]}H${G.pins[i][0] + 10}`, ...wireAttrs(v) }));
    });
    svg.append(s('line', { x1: G.out[0], y1: 35, x2: 146, y2: 35, ...wireAttrs(out) }));
    svg.append(drawGate(s, type, 74, 35, n, null).g);
    vals.forEach((v, i) => {
      const name = 'xy'[i];
      const g = s('g', { class: 'bl-switch', tabindex: 0, role: 'button', 'aria-label': `Input ${name} is ${v}. Press to flip it.`, onclick: () => flip(i), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(i); } } });
      g.append(s('circle', { cx: 22, cy: ys[i], r: 10, fill: v ? 'var(--true-bg)' : 'var(--sheet)', stroke: v ? 'var(--true)' : 'var(--ink-3)', 'stroke-width': 2 }));
      g.append(s('text', { x: 22, y: ys[i] + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: v ? 'var(--true)' : 'var(--ink)', text: String(v) }));
      g.append(s('text', { x: 6, y: ys[i] + 5, 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', fill: 'var(--ink-2)', text: name }));
      svg.append(g);
    });
    svg.append(lamp(s, 158, 35, out, 11));
    return svg;
  }

  /* ---------------- minimization (exact, for up to 4 variables) ---------------- */
  // A cube (mask, val) fixes the variables whose bits are 1 in mask to the bits in val.
  function minimize(n, ones, dcs = []) {
    const N = 1 << n;
    const ok = new Array(N).fill(false);
    ones.forEach((m) => (ok[m] = true));
    dcs.forEach((m) => (ok[m] = true));
    if (!ones.length) return { terms: [], primes: [], essential: new Set(), coverers: {} };
    const imp = new Set();
    const list = [];
    for (let mask = 0; mask < N; mask++) {
      for (let v = mask; ; v = (v - 1) & mask) {
        let good = true;
        for (let m = 0; m < N && good; m++) if ((m & mask) === v && !ok[m]) good = false;
        if (good) { imp.add(mask * N + v); list.push([mask, v]); }
        if (v === 0) break;
      }
    }
    const primes = list
      .filter(([mask, v]) => !range(n).some((b) => (mask & (1 << b)) && imp.has((mask & ~(1 << b)) * N + (v & ~(1 << b)))))
      .map(([mask, val]) => ({ mask, val, lits: popcount(mask), cells: range(N).filter((m) => (m & mask) === val), covers: ones.filter((m) => (m & mask) === val) }))
      .filter((p) => p.covers.length);
    const coverers = {};
    ones.forEach((m) => (coverers[m] = primes.filter((p) => p.covers.includes(m))));
    let best = null;
    (function rec(unc, chosen, lits) {
      if (!unc.length) {
        if (!best || chosen.length < best.list.length || (chosen.length === best.list.length && lits < best.lits)) best = { list: chosen.slice(), lits };
        return;
      }
      if (best && chosen.length >= best.list.length) return;
      let pick = unc[0];
      for (const u of unc) if (coverers[u].length < coverers[pick].length) pick = u;
      for (const p of coverers[pick]) {
        chosen.push(p);
        rec(unc.filter((u) => !p.covers.includes(u)), chosen, lits + p.lits);
        chosen.pop();
      }
    })(ones.slice(), [], 0);
    const essential = new Set(primes.filter((p) => p.covers.some((m) => coverers[m].length === 1)));
    const terms = best.list.slice().sort((a, b) => a.cells[0] - b.cells[0] || b.cells.length - a.cells.length);
    return { terms, primes, essential, coverers };
  }
  // plain text ("x'y") with ASCII primes, or TeX-ready; complement written as a prime
  function termStr(t, names) {
    const n = names.length;
    if (!t.mask) return '1';
    let out = '';
    for (let i = 0; i < n; i++) { const bit = 1 << (n - 1 - i); if (t.mask & bit) out += names[i] + (t.val & bit ? '' : "'"); }
    return out;
  }
  const sopStr = (terms, names) => (terms.length ? terms.map((t) => termStr(t, names)).join(' + ') : '0');
  const minterm = (m, n) => ({ mask: (1 << n) - 1, val: m });
  function maxtermTex(m, names) {
    const n = names.length;
    return '(' + names.map((v, i) => v + ((m >> (n - 1 - i)) & 1 ? "'" : '')).join(' + ') + ')';
  }
  function sopCost(terms, n) {
    if (!terms.length || (terms.length === 1 && !terms[0].mask)) return { not: 0, and: 0, or: 0, gates: 0, inputs: 0 };
    const neg = new Set();
    let and = 0, inputs = 0;
    for (const t of terms) {
      for (let i = 0; i < n; i++) { const bit = 1 << (n - 1 - i); if ((t.mask & bit) && !(t.val & bit)) neg.add(i); }
      if (t.lits >= 2) { and++; inputs += t.lits; }
    }
    const or = terms.length >= 2 ? 1 : 0;
    if (or) inputs += terms.length;
    inputs += neg.size;
    return { not: neg.size, and, or, gates: neg.size + and + or, inputs };
  }
  const withLits = (t) => ({ ...t, lits: t.lits ?? popcount(t.mask) });

  // two-level AND-OR circuit for a sum of products, with the wires lit for one input row
  function drawSOP(ctx, terms, names, inp) {
    const { s } = ctx;
    const n = names.length;
    const T = terms.length;
    const negUsed = range(n).map((i) => terms.some((t) => { const bit = 1 << (n - 1 - i); return (t.mask & bit) && !(t.val & bit); }));
    const rails = [];
    let x = 22;
    for (let i = 0; i < n; i++) {
      rails.push({ i, neg: false, x });
      if (negUsed[i]) rails.push({ i, neg: true, x: x + 24 });
      x += negUsed[i] ? 62 : 38;
    }
    const railAt = (i, neg) => rails.find((r) => r.i === i && r.neg === neg);
    const maxL = Math.max(1, ...terms.map((t) => popcount(t.mask)));
    const gap = maxL >= 3 ? 66 : 52;
    const topY = 70;
    const andX = x + 34;
    const H = Math.max(190, topY + Math.max(T, 1) * gap + 6);
    const orX = andX + 128;
    const W = orX + 150;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Two-level AND-OR circuit' });
    const wires = s('g'), bodies = s('g'), top = s('g');
    svg.append(wires, bodies, top);
    const val = (i, neg) => (neg ? 1 - inp[i] : inp[i]);
    for (const r of rails) {
      const v = val(r.i, r.neg);
      if (!r.neg) {
        top.append(s('text', { x: r.x, y: 14, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, 'font-style': 'italic', fill: 'var(--ink)', text: names[r.i] }));
        top.append(s('text', { x: r.x, y: 30, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: v ? 'var(--true)' : 'var(--ink-3)', text: String(v) }));
        wires.append(s('line', { x1: r.x, y1: 36, x2: r.x, y2: H - 4, ...wireAttrs(v) }));
      } else {
        const p = railAt(r.i, false);
        wires.append(s('path', { d: `M${p.x} 42H${r.x}V48`, ...wireAttrs(1 - v) }));
        top.append(s('circle', { cx: p.x, cy: 42, r: 3, fill: dotFill(1 - v) }));
        bodies.append(s('path', { d: `M${r.x - 7} 48H${r.x + 7}L${r.x} 60Z`, fill: 'var(--sheet)', stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }));
        bodies.append(s('circle', { cx: r.x, cy: 63.5, r: 3.2, fill: 'var(--sheet)', stroke: 'var(--ink)', 'stroke-width': 1.5 }));
        top.append(s('text', { x: r.x + 9, y: 58, 'font-size': 11, 'font-style': 'italic', fill: 'var(--ink-2)', text: names[r.i] + '′' }));
        wires.append(s('line', { x1: r.x, y1: 67, x2: r.x, y2: H - 4, ...wireAttrs(v) }));
      }
    }
    const outY = topY + (Math.max(T, 1) * gap) / 2 - 4;
    const lampX = orX + 98;
    if (!T || (T === 1 && !terms[0].mask)) {
      const c = T ? 1 : 0;
      wires.append(s('line', { x1: andX, y1: outY, x2: lampX - 12, y2: outY, ...wireAttrs(c) }));
      top.append(s('text', { x: andX + 4, y: outY - 10, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink-2)', text: `constant ${c}` }));
      top.append(lamp(s, lampX, outY, c));
      top.append(s('text', { x: lampX + 18, y: outY + 5, 'font-size': 14, 'font-weight': 700, fill: 'var(--ink)', text: 'f' }));
      return svg;
    }
    const outs = [];
    terms.forEach((t, k) => {
      const cy = topY + gap / 2 + k * gap - 4;
      const lits = range(n).filter((i) => t.mask & (1 << (n - 1 - i))).map((i) => ({ i, neg: !(t.val & (1 << (n - 1 - i))) }));
      const tv = lits.every((l) => val(l.i, l.neg)) ? 1 : 0;
      if (lits.length === 1) {
        const r = railAt(lits[0].i, lits[0].neg);
        top.append(s('circle', { cx: r.x, cy, r: 3.4, fill: dotFill(tv) }));
        outs.push({ x: r.x, y: cy, v: tv });
        return;
      }
      const G = drawGate(s, 'AND', andX, cy, lits.length, null);
      bodies.append(G.g);
      lits.forEach((l, j) => {
        const r = railAt(l.i, l.neg);
        const lv = val(l.i, l.neg);
        wires.append(s('line', { x1: r.x, y1: G.pins[j][1], x2: andX + 10, y2: G.pins[j][1], ...wireAttrs(lv) }));
        top.append(s('circle', { cx: r.x, cy: G.pins[j][1], r: 3.2, fill: dotFill(lv) }));
      });
      top.append(s('text', { x: G.out[0] + 6, y: cy - 9, 'font-size': 11, 'font-style': 'italic', fill: 'var(--ink-2)', text: termStr(t, names).replace(/'/g, '′') }));
      outs.push({ x: G.out[0], y: cy, v: tv });
    });
    const fv = outs.some((o) => o.v) ? 1 : 0;
    if (T === 1) {
      wires.append(s('path', { d: `M${outs[0].x} ${outs[0].y}H${lampX - 12}`, ...wireAttrs(fv) }));
      top.append(lamp(s, lampX, outs[0].y, fv));
      top.append(s('text', { x: lampX + 18, y: outs[0].y + 5, 'font-size': 14, 'font-weight': 700, fill: 'var(--ink)', text: 'f' }));
      return svg;
    }
    const OR = drawGate(s, 'OR', orX, outY, T, null);
    bodies.append(OR.g);
    outs.forEach((o, k) => {
      const mid = orX - 12 - 8 * Math.min(k, T - 1 - k);
      wires.append(s('path', { d: `M${o.x} ${o.y}H${mid}V${OR.pins[k][1]}H${orX + 10}`, ...wireAttrs(o.v) }));
    });
    wires.append(s('line', { x1: OR.out[0], y1: outY, x2: lampX - 12, y2: outY, ...wireAttrs(fv) }));
    top.append(lamp(s, lampX, outY, fv));
    top.append(s('text', { x: lampX + 18, y: outY + 5, 'font-size': 14, 'font-weight': 700, fill: 'var(--ink)', text: 'f' }));
    return svg;
  }

  // parse a student's sum of products such as "xy + x'z" into terms; null when unreadable
  function parseSOP(str, names) {
    const t = String(str).toLowerCase().replace(/[’′‘`´]/g, "'").replace(/[\s·*∙.]/g, '');
    if (!t) return null;
    if (t === '0') return [];
    if (t === '1') return [{ mask: 0, val: 0 }];
    const n = names.length;
    const terms = [];
    for (const part of t.split(/\+|∨|\|/)) {
      if (!part) return null;
      let mask = 0, val = 0, i = 0, conflict = false;
      while (i < part.length) {
        let neg = false;
        while (part[i] === '~' || part[i] === '!' || part[i] === '¬') { neg = !neg; i++; }
        const k = names.indexOf(part[i]);
        if (k < 0) return null;
        i++;
        while (part[i] === "'") { neg = !neg; i++; }
        const bit = 1 << (n - 1 - k);
        const want = neg ? 0 : bit;
        if (mask & bit && (val & bit) !== want) conflict = true;
        mask |= bit;
        val = (val & ~bit) | want;
      }
      terms.push({ mask, val, conflict, lits: popcount(mask) });
    }
    return terms;
  }
  const sopValue = (terms, m) => (terms.some((t) => !t.conflict && (m & t.mask) === t.val) ? 1 : 0);

  /* ---------------- K-map geometry ---------------- */
  const GRAY = [0, 1, 3, 2];
  function kmapRuns(idx, N) {
    const sorted = idx.slice().sort((a, b) => a - b);
    const runs = [];
    for (const i of sorted) { const last = runs[runs.length - 1]; if (last && last[1] === i - 1) last[1] = i; else runs.push([i, i]); }
    return runs;
  }

  /* ---------------- worked examples ---------------- */
  // ex-kmap: f(a, b, c) = Σm(0, 2, 4, 5, 6); rows are a, columns are bc in Gray order
  const EX_KMAP_ONES = [0, 2, 4, 5, 6];
  const EX_KMAP_QUAD = [0, 2, 4, 6];
  const EX_KMAP_PAIR = [4, 5];
  const EX_KMAP_CELL = (r, c) => (r << 2) | GRAY[c]; // minterm index 4a + 2b + c for row a = r, column bc = GRAY[c]

  // ex-adder-eval: 1011 + 0110, one entry per bit position, bit 0 (rightmost) first
  const EX_ADD_COLS = [
    { i: 0, a: 1, b: 0, cin: 0, sum: 1, cout: 0 },
    { i: 1, a: 1, b: 1, cin: 0, sum: 0, cout: 1 },
    { i: 2, a: 0, b: 1, cin: 1, sum: 0, cout: 1 },
    { i: 3, a: 1, b: 0, cin: 1, sum: 0, cout: 1 },
  ];

  /* ---------- worked-example generators: steps computed from each preset's data ---------- */
  // K-map preset data: the minterm list plus the groups the module's own minimizer finds for it.
  function kmapData(ones) {
    const terms = minimize(3, ones).terms.map(withLits);
    return { names: ['a', 'b', 'c'], ones: ones.slice(), terms, groups: terms.map((t) => ({ cells: t.cells.slice(), mask: t.mask, val: t.val })) };
  }
  const sizeWord = (n) => ({ 1: 'single cell', 2: 'pair', 4: 'quad', 8: 'group of 8' })[n] || `group of ${n}`;
  const groupFixed = (g) => {
    const fixed = [], free = [];
    for (let i = 0; i < 3; i++) { const bit = 1 << (2 - i); if (g.mask & bit) fixed.push({ name: ['a', 'b', 'c'][i], val: (g.val & bit) ? 1 : 0 }); else free.push(['a', 'b', 'c'][i]); }
    return { fixed, free };
  };
  function kmapStepsFor(D, checkpointText) {
    const sop = sopStr(D.terms, D.names), sopP = sop.replace(/'/g, '′');
    const lits = D.terms.reduce((a, t) => a + t.lits, 0);
    const steps = [
      { groups: 0, plotted: false, caption: 'The map has one row for each value of a and one column for each value of bc, listed in Gray order 00, 01, 11, 10. Gray order matters because neighboring cells then differ in exactly one variable, even across the wrap-around edges, and that is what lets neighboring 1s merge into bigger groups.' },
      { groups: 0, plotted: true, caption: `Now transfer the truth table into the map: a 1 goes in each of the ${D.ones.length} minterm cells ${listJoin(D.ones.map((m) => 'm' + m))}, and a 0 goes everywhere else. Nothing about the function changes here; only its layout changes, from a list of rows into a picture where patterns become visible.` },
    ];
    D.groups.forEach((g, gi) => {
      const { fixed, free } = groupFixed(g);
      const wraps = g.cells.some((m) => (m & 3) === GRAY[0]) && g.cells.some((m) => (m & 3) === GRAY[3]);
      steps.push({
        groups: gi + 1, plotted: true,
        caption: `Circle the ${sizeWord(g.cells.length)} ${listJoin(g.cells.map((m) => 'm' + m))}, shown with the ${gi === 0 ? 'dashed' : 'solid'} outline.${gi > 0 ? ' Cells may repeat from an earlier group, because overlap is allowed.' : ''} In every cell of the group ${fixed.map((f) => `${f.name} = ${f.val}`).join(' and ')} while ${listJoin(free)} change${free.length === 1 ? 's' : ''}, so ${listJoin(free)} drop${free.length === 1 ? 's' : ''} out and the group gives the term ${termStr(g, D.names).replace(/'/g, '′')}.${wraps ? ' The group wraps around the left and right edges of the map, which is allowed because those edges are neighbors in Gray order.' : ''}`,
      });
    });
    steps.push({
      groups: D.groups.length, plotted: true, expr: true,
      caption: `Read the ${D.groups.length === 1 ? 'group' : `${D.groups.length} groups`} off as a sum of products: f = ${sopP}. Every 1 on the map is covered and each group is as large as it can possibly be, which is exactly what minimal means here: ${D.terms.length} term${D.terms.length === 1 ? '' : 's'} and ${lits} literal${lits === 1 ? '' : 's'} instead of ${D.ones.length} full minterms.`,
    });
    steps.push({
      groups: D.groups.length, plotted: true, expr: true, check: true, answer: true,
      banner: `Answer: f = ${sopP} — check: ${sopP} is 1 exactly on {${D.ones.join(', ')}}, matching the given minterms`,
      caption: `Answer: f = ${sopP}. The check is in the strip below the map: evaluating ${sopP} on all eight inputs gives 1 exactly on rows ${listJoin(D.ones.map((m) => m.toString(2).padStart(3, '0')))}, which is precisely the minterm list {${D.ones.join(', ')}} we started with.`,
    });
    if (checkpointText) steps[1].checkpoint = checkpointText;
    return steps;
  }
  const EX_KMAP_DATA = kmapData(EX_KMAP_ONES);
  const EX_KMAP_VAR_DATA = kmapData([1, 3, 5, 7]);

  // Adder preset data: the two addends and the per-column table the bit-wise generator produces.
  function adderCols(A, B) {
    const cols = [];
    let carry = 0;
    for (let i = 0; i < 4; i++) {
      const a = (parseInt(A, 2) >> i) & 1, b = (parseInt(B, 2) >> i) & 1;
      const t = a + b + carry;
      cols.push({ i, a, b, cin: carry, sum: t & 1, cout: t >> 1 });
      carry = t >> 1;
    }
    return cols;
  }
  function adderStepsFor(D, checkpointText) {
    const steps = [{ bits: 0, caption: `Line the two numbers up in columns, ${D.A} over ${D.B}, with an empty carry row above them. A ripple-carry adder is just a chain of full adders, and each column must wait for the carry from its right neighbor, so the work has to go from right to left, starting at bit 0.` }];
    D.cols.forEach((c) => {
      const ones = c.a + c.b + c.cin;
      steps.push({
        bits: c.i + 1,
        caption: `Bit ${c.i}: the full adder receives a${c.i} = ${c.a}, b${c.i} = ${c.b} and the ${c.i === 0 ? 'starting carry c0 = 0' : `carry c${c.i} = ${c.cin} passed from bit ${c.i - 1}`}, a total of ${['no', 'one', 'two', 'three'][ones]} 1${ones === 1 ? '' : 's'}. The sum bit is the parity of the three inputs, so s${c.i} = ${c.sum}, and the carry-out is 1 only when at least two inputs are 1, so c${c.i + 1} = ${c.cout}${c.cout ? ', which ripples into the next column to the left' : ''}.`,
      });
    });
    const low = D.cols.map((c) => c.sum).reverse().join('');
    steps.push({
      bits: 5,
      caption: D.cols[3].cout
        ? `The leftover carry c4 = 1 becomes a fifth sum bit, s4 = 1, sitting to the left of s3. The full result now reads 1${low}, and dropping that final carry would have lost the most valuable bit of the answer.`
        : `No carry leaves bit 3, so the answer fits in the four drawn columns: ${low}. The carry row above bit 3 stays 0, and nothing is lost by stopping there.`,
    });
    const dec = parseInt(D.answer, 2);
    steps.push({
      bits: 5, answer: true,
      banner: `Answer: ${D.A} + ${D.B} = ${D.answer} (${dec}) — check: ${parseInt(D.A, 2)} + ${parseInt(D.B, 2)} = ${dec}, and each sum bit was the parity of its three inputs`,
      caption: `Answer: ${D.A} + ${D.B} = ${D.answer}, which is ${dec} in decimal. The check agrees two ways: ${parseInt(D.A, 2)} plus ${parseInt(D.B, 2)} is ${dec}, and every sum bit above was the parity of its three inputs while every carry was their majority, recomputed column by column.`,
    });
    if (checkpointText) steps[4].checkpoint = checkpointText;
    return steps;
  }
  const EX_ADD_DATA = { A: '1011', B: '0110', cols: EX_ADD_COLS, answer: '10001' };
  const EX_ADD_VAR_DATA = { A: '1111', B: '0001', cols: adderCols('1111', '0001'), answer: '10000' };

  // Truth-table preset data: the list of rows where f is 1 and the full minterm of each such row.
  function ttData(ones) {
    return { names: ['x', 'y', 'z'], ones: ones.slice(), terms: ones.map((m) => withLits(minterm(m, 3))) };
  }
  const EX_TT = ttData([2, 3, 5, 7]);
  const EX_TT_VAR = ttData([6]); // boundary case: a single 1-row, so the canonical form has one term
  const bits3 = (m) => m.toString(2).padStart(3, '0');
  const prime = (t, names) => termStr(t, names).replace(/'/g, '′');
  function ttStepsFor(D, cpText) {
    const sopP = D.terms.map((t) => prime(t, D.names)).join(' + ');
    const k = D.ones.length;
    const steps = [{ shown: 0, phase: 0, caption: `The table defines the function completely: f is 1 on the ${k === 1 ? 'single row' : `${k} rows`} ${D.ones.map(bits3).join(', ')} and 0 on the other ${8 - k}. The sum-of-minterms recipe turns each 1-row into one product term; the 0-rows contribute nothing, because a term that fires on a 0-row would corrupt the output there.` }];
    D.ones.forEach((m, j) => {
      const [x, y, z] = bitsOf(m, 3);
      steps.push({ shown: j + 1, phase: 0, caption: `${j === 0 ? 'The first 1-row is' : 'The next 1-row is'} ${bits3(m)}: x = ${x}, y = ${y}, z = ${z} with f = 1, so this row contributes a minterm. Write the plain variable where the bit is 1 and the complement where the bit is 0, giving ${prime(D.terms[j], D.names)}. That product is 1 on this row alone and 0 on every other row, which is why one term per 1-row can rebuild the whole function.` });
    });
    steps[steps.length - 1].checkpoint = cpText;
    steps.push({ shown: k, phase: 1, caption: `Join the ${k} minterm${k === 1 ? '' : 's'} with + signs, which is Boolean OR: f = ${sopP}. This is the canonical sum of minterms: ${k} term${k === 1 ? '' : 's'} and ${3 * k} literals, one full three-literal product per 1-row. It is correct by construction, even though a Karnaugh map might shrink it later; the canonical form is the guaranteed starting point.` });
    const oneRow = D.ones[0], zeroRow = range(8).find((m) => !D.ones.includes(m));
    steps.push({ shown: k, phase: 2, caption: `Spot-check two rows before trusting the expression. On row ${bits3(oneRow)} the minterm ${prime(D.terms[0], D.names)} has every literal true, so the sum is 1, matching the table. On row ${bits3(zeroRow)} every minterm contains at least one false literal, so each product is 0 and the sum is 0, matching the table again.` });
    steps.push({ shown: k, phase: 2, answer: true, banner: `Answer: f = ${sopP} = Σm(${D.ones.join(', ')}) — check: the sum is 1 exactly on rows ${D.ones.join(', ')}`, caption: `Answer: f = ${sopP}, that is, Σm(${D.ones.join(', ')}). The strip below the table evaluates the sum on all eight input rows and reproduces the table's f column exactly, so the expression and the table define the same function.` });
    return steps;
  }

  // Simplification preset data: a chain of expressions, each reached from the previous one by the
  // named law, with a short note saying what that law does to this particular expression.
  function simpData(chain, fin) {
    return { names: ['x', 'y', 'z'], chain, fin };
  }
  const EX_SIMP = simpData([
    ["xy + xy′ + x′z", '', ''],
    ["x(y + y′) + x′z", 'distributive', 'the first two terms share the factor x, so factor it out'],
    ["x · 1 + x′z", 'complement', 'y + y′ is 1 no matter what y is, so the parentheses collapse to 1'],
    ["x + x′z", 'identity', 'x · 1 is just x, since multiplying by 1 changes nothing'],
    ["(x + x′)(x + z)", 'distributive', 'the other distributive law, x + yz = (x + y)(x + z), turns the sum into a product of sums'],
    ["1 · (x + z)", 'complement', 'x + x′ is 1 no matter what x is, so the first factor collapses to 1'],
    ["x + z", 'identity', '1 times anything is that thing, so the leading 1 disappears'],
  ], 'x + z');
  const EX_SIMP_VAR = simpData([
    ["xy + xy + x′z′ + z′", '', ''],
    ["xy + x′z′ + z′", 'idempotent', 'xy + xy is the same term written twice, and one copy already does all of its work'],
    ["xy + z′", 'absorption', 'z′ absorbs x′z′: every row that makes x′z′ true already makes z′ true, so the longer term adds no new 1-rows'],
  ], "xy + z′");
  const countLits = (e) => (e.match(/[xyz]/g) || []).length;
  function simpStepsFor(D, cpText, cpShown) {
    const orig = D.chain[0][0], fin = D.fin;
    const steps = [{ shown: 0, caption: `The goal is the smallest expression equivalent to f = ${orig}. The method is patience: apply exactly one named law at a time, so every equality in the chain is justified and the final form is provably the same function, not just a plausible guess that happens to fit a few rows.` }];
    D.chain.slice(1).forEach(([expr, law, note], i) => {
      const st = { shown: i + 1, caption: `Apply the ${law} law: ${note}. The expression becomes ${expr}. Nothing else changes in this step, which is what makes the whole chain checkable line by line, and each step either shrinks the expression or reshapes it so a later law can shrink it.` };
      if (i + 1 === cpShown) st.checkpoint = cpText;
      steps.push(st);
    });
    steps.push({ shown: D.chain.length - 1, check: true, caption: `Before calling it minimal, check equivalence the blunt way: the strip below evaluates the original ${orig} and the final ${fin} on all eight input rows. The two expressions are the same function exactly when no row separates them, so all eight rows must agree.` });
    steps.push({ shown: D.chain.length - 1, check: true, answer: true, banner: `Answer: f = ${fin} — check: original and simplified agree on all 8 rows, ${countLits(orig)} literals down to ${countLits(fin)}`, caption: `Answer: f = ${fin}, down from ${countLits(orig)} literals to ${countLits(fin)}. No law shrinks it further, and both remaining terms are needed: deleting either one changes the value on at least one row of the check strip, so this is the minimal form.` });
    return steps;
  }

  DM.module({
    id: 'boolean',
    num: 12,
    title: 'Boolean Algebra & Circuits',
    objectives: [12],
    terms: {
      'logic gate': 'A small circuit that reads one or more input bits and outputs one bit according to a fixed rule, such as AND, OR or NOT.',
      'combinatorial circuit': 'A network of gates with no feedback loops. Its output depends only on its current inputs, so a truth table describes it completely.',
      'Boolean algebra': 'A set with two operations (+ and ·), a complement (′) and two elements 0 and 1 that obey the commutative, associative, distributive, identity and complement laws.',
      'duality': 'The principle that swapping + with · and 0 with 1 in any Boolean law produces another valid law.',
      'Boolean function': 'A rule that assigns an output bit to every combination of n input bits. There are 2ⁿ input rows and 2^(2ⁿ) different functions of n variables.',
      'literal': 'A variable or its complement, such as x or x′.',
      'minterm': 'A product that contains every variable exactly once, plain or complemented, such as x′yz. It equals 1 on exactly one row of the truth table.',
      'maxterm': 'A sum that contains every variable exactly once, such as x + y′ + z. It equals 0 on exactly one row of the truth table.',
      'disjunctive normal form': 'A function written as a sum (OR) of minterms, one for each row where the function is 1. Also called the sum-of-minterms form.',
      'conjunctive normal form': 'A function written as a product (AND) of maxterms, one for each row where the function is 0.',
      'Karnaugh map': 'A truth table arranged as a grid in Gray-code order, so that neighboring cells differ in one variable and groups of 1s can be read off as simplified product terms.',
      'prime implicant': 'A product term that covers only 1s (or don\'t-cares) of a function and cannot be enlarged. On a Karnaugh map it is a group that cannot grow any bigger.',
      'functionally complete': 'A set of gates that can build every Boolean function. {AND, OR, NOT}, {NAND} and {NOR} are functionally complete.',
      'half adder': 'A circuit that adds two bits and outputs a sum bit S = x ⊕ y and a carry bit C = xy.',
      'full adder': 'A circuit that adds three bits (two number bits and an incoming carry) and outputs a sum bit and a carry bit.',
      'ripple-carry adder': 'An n-bit adder built from n full adders in a chain, where each carry output feeds the next adder\'s carry input.',
      'multiplexer': 'A circuit that uses select bits to choose which of several data inputs reaches its single output.',
      'propagation delay': 'The time a gate needs to update its output after an input changes. Delays add up along the longest path through a circuit.',
      'perceptron': 'The simplest artificial neuron. It outputs 1 when the weighted sum of its inputs plus a bias is greater than 0, and 0 otherwise.',
      'linearly separable': 'A labeling of points is linearly separable when one straight line (or flat plane) can put every 1 on one side and every 0 on the other.',
    },
    symbols: [
      ['x · y, xy', 'AND (Boolean product)', '1 · 0 = 0'],
      ['x + y', 'OR (Boolean sum)', '1 + 1 = 1'],
      ['x′', 'NOT (complement)', '0′ = 1'],
      ['x ⊕ y', 'XOR (exclusive or)', '1 ⊕ 1 = 0'],
      ['x ↑ y', 'NAND', 'x ↑ y = (xy)′'],
      ['x ↓ y', 'NOR', 'x ↓ y = (x + y)′'],
      ['mᵢ', 'minterm for row i', 'm₃ = x′yz'],
      ['Σm(…)', 'sum of the listed minterms', 'Σm(3, 5, 6, 7)'],
      ['ΠM(…)', 'product of the listed maxterms', 'ΠM(0, 1, 2, 4)'],
    ],
    css: `
      .bl-gatecard { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.5rem 0.7rem; }
      .bl-gh { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
      .bl-gh b { font-size: 1.02rem; letter-spacing: 0.04em; }
      .bl-gatecard .bl-say { font-size: 0.8rem; color: var(--ink-2); line-height: 1.35; min-height: 2.2em; }
      .bl-grow { display: flex; align-items: center; gap: 0.5rem; }
      .bl-mini { flex: 0 0 8.6rem; }
      .bl-mini svg { width: 100%; height: auto; display: block; }
      table.tt.bl-htt { font-size: 0.78rem; }
      table.tt.bl-htt td, table.tt.bl-htt th { padding: 0.06rem 0.42rem; }
      table.tt.bl-htt td { cursor: pointer; }
      table.tt.bl-htt td.on { background: var(--mark); color: var(--mark-ink); }
      table.tt.bl-htt tr:last-child td { font-weight: 700; }
      .bl-switch { cursor: pointer; outline: none; }
      .bl-switch:focus-visible rect, .bl-switch:focus-visible circle { stroke: var(--accent); stroke-width: 3.5; }
      .bl-fig { min-height: 0; }
      .bl-fig svg { width: 100%; height: 100%; }
      .bl-side { min-height: 0; overflow: auto; gap: 0.4rem; }
      .bl-eq { text-align: center; font-size: 1.08rem; line-height: 1.7; }
      table.tt.bl-click tbody tr { cursor: pointer; }
      table.tt.bl-click tbody tr:hover td { background: var(--accent-2); }
      table.tt.bl-click tbody tr.hit:hover td { background: var(--mark); }
      table.tt.bl-sm { font-size: 0.8rem; }
      table.tt.bl-sm td, table.tt.bl-sm th { padding: 0.12rem 0.45rem; }
      .bl-fbtn { border: 1px solid var(--rule); background: var(--paper); border-radius: 0.3rem; font-family: var(--font-mono); font-weight: 700; width: 2rem; cursor: pointer; padding: 0.02rem 0; color: var(--ink-3); }
      .bl-fbtn.one { background: var(--true-bg); color: var(--true); border-color: var(--true); }
      .bl-fbtn:hover { border-color: var(--accent); }
      .bl-exprs > div { display: grid; grid-template-columns: 8.2rem minmax(0, 1fr); gap: 0.5rem; align-items: baseline; padding: 0.18rem 0; border-bottom: 1px dashed var(--rule); }
      .bl-exprs > div:last-child { border-bottom: 0; }
      .bl-exprs .k { font-family: var(--font-mono); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
      .bl-exprs .v { line-height: 1.6; }
      .bl-bar { height: 0.55rem; border-radius: 1rem; background: var(--accent); }
      .bl-bar.b { background: var(--ink-3); }
      .bl-cost { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.25rem 0.5rem; align-items: center; font-size: 0.8rem; }
      .bl-kcell { cursor: pointer; outline: none; }
      .bl-kcell:hover rect.c { fill: var(--accent-2); }
      .bl-kcell:focus-visible rect.c { stroke: var(--accent); stroke-width: 3; }
      .bl-glist { display: flex; flex-direction: column; gap: 0.35rem; min-height: 0; overflow: auto; }
      .bl-gi { border-left: 4px solid var(--rule); padding: 0.2rem 0.55rem; background: var(--paper); border-radius: 0 0.35rem 0.35rem 0; font-size: 0.8rem; line-height: 1.4; }
      .bl-slot { display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem; }
      .bl-slot select { font-family: var(--font-mono); }
      .bl-slot .n { font-family: var(--font-mono); font-size: 0.74rem; color: var(--ink-3); width: 3.6rem; }
      .bl-slider { display: grid; grid-template-columns: 2.2rem minmax(0, 1fr) 2.8rem; gap: 0.5rem; align-items: center; font-size: 0.9rem; }
      .bl-slider output { font-family: var(--font-mono); text-align: right; }
      .bl-3col td, .bl-3col th { font-size: 0.82rem; padding: 0.18rem 0.45rem; }
      .bl-ax td, .bl-ax th { font-size: 0.82rem; padding: 0.16rem 0.45rem; }
      table.tt.bl-pk td, table.tt.bl-pk th { font-size: 0.8rem; padding: 0.08rem 0.5rem; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Logic gates: the building blocks',
        kind: 'concept',
        html: String.raw`
          <div class="def">A <span class="term">logic gate</span> is a tiny circuit that reads one or two input bits and produces one output bit. A bit is 0 (low voltage, false) or 1 (high voltage, true). Each gate below shows its symbol, its algebra and its truth table. Click a column of a table or an input circle to try the gate.</div>
          <div class="cols-3 bl-gates"></div>
          <div class="split" style="align-items:stretch">
            <div class="box"><span class="lbl">Reading the symbols</span>A small circle on an output, called a bubble, means "then flip the result". So NAND is AND followed by NOT. Engineers usually write \(x \cdot y\) as \(xy\), the way algebra writes \(3x\), and they write the complement of \(x\) as \(x'\) or \(\bar{x}\).</div>
            <div class="ai">A GPU contains tens of billions of transistors wired into gates like these. Every multiplication inside a neural network becomes streams of bits flowing through AND, OR and XOR gates in adder circuits, which you will build later in this module.</div>
          </div>`,
        render(body, ctx) {
          const { h, rc } = ctx;
          const grid = body.querySelector('.bl-gates');
          const GATES = [
            { t: 'AND', tex: String.raw`x \cdot y`, say: String.raw`1 only when both inputs are 1. Logic writes \(x \wedge y\).` },
            { t: 'OR', tex: 'x + y', say: String.raw`1 when at least one input is 1. Logic writes \(x \vee y\).` },
            { t: 'NOT', tex: "x'", say: String.raw`Flips the bit. Also called an inverter. Logic writes \(\neg x\).` },
            { t: 'NAND', tex: "(xy)'", say: String.raw`AND, then NOT. 0 only when both inputs are 1. Also written \(x \uparrow y\).` },
            { t: 'NOR', tex: "(x + y)'", say: String.raw`OR, then NOT. 1 only when both inputs are 0. Also written \(x \downarrow y\).` },
            { t: 'XOR', tex: String.raw`x \oplus y`, say: 'Exclusive or. 1 when the two inputs are different.' },
          ];
          for (const G of GATES) {
            const n = G.t === 'NOT' ? 1 : 2;
            let vals = n === 1 ? [1] : [1, 0];
            const pic = h('div.bl-mini');
            const tbl = h('table.tt.bl-htt');
            grid.append(h('div.card.bl-gatecard',
              h('div.bl-gh', h('b.mono', G.t), ctx.rich('span', String.raw`\(${G.tex}\)`)),
              ctx.rich('div.bl-say', G.say),
              h('div.bl-grow', pic, tbl)));
            const draw = () => {
              rc(pic, miniGate(ctx, G.t, vals, (i) => { vals[i] ^= 1; draw(); }));
              const cols = range(2 ** n).map((m) => bitsOf(m, n));
              const curM = vals.reduce((a, b) => a * 2 + b, 0);
              const cell = (m, txt) => h('td', { class: m === curM ? 'on' : '', onclick: () => { vals = bitsOf(m, n); draw(); } }, String(txt));
              const rows = [];
              for (let i = 0; i < n; i++) rows.push(h('tr', h('th', 'xy'[i]), cols.map((c, m) => cell(m, c[i]))));
              rows.push(h('tr', h('th', 'out'), cols.map((c, m) => cell(m, GATE_FN[G.t](c)))));
              rc(tbl, h('tbody', rows));
            };
            draw();
          }
        },
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Combinatorial circuits: from wires to expressions',
        kind: 'concept',
        html: String.raw`
          <div class="split fill" style="align-items:stretch; min-height:0">
            <div class="stack" style="min-height:0">
              <div class="def">A <span class="term">combinatorial circuit</span> is a network of gates with no loops, so signals flow one way, from inputs to outputs. Its output depends only on the inputs right now, so it has no memory, and a truth table describes it completely.</div>
              <div class="figure bl-fig bl-c2-fig" style="flex:1"></div>
              <p class="tiny muted">Click a switch or a table row. A dot joins wires. Wires that cross without a dot are not connected.</p>
            </div>
            <div class="stack">
              <div class="bl-c2-tt"></div>
              <div class="ex"><b>Circuit to expression.</b> Work left to right and label each gate's output. The AND gate gives \(xy\), the NOT gate gives \(z'\), and the OR gate joins them into \(f = xy + z'\). The table fills in the same way, one column per gate.<br><b>Expression to circuit.</b> Draw one gate per operator, innermost first. \(x(y + z)\) is an OR gate for \(y + z\) feeding an AND gate with \(x\).</div>
              <div class="thm">Two circuits are <b>equivalent</b> when their truth tables match. \(x(y + z)\) uses 2 gates and \(xy + xz\) uses 3, yet they are equivalent by the distributive law. Boolean algebra finds the cheaper circuit.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const { h, rc } = ctx;
          const fig = body.querySelector('.bl-c2-fig');
          const ttBox = body.querySelector('.bl-c2-tt');
          const inp = { x: 1, y: 0, z: 1 };
          const draw = () => {
            rc(fig, drawCircuit(ctx, C2, inp, (k, kb) => { inp[k] ^= 1; draw(); if (kb) refocus(fig, k); }));
            const cur = inp.x * 4 + inp.y * 2 + inp.z;
            const rows = range(8).map((m) => {
              const [x, y, z] = bitsOf(m, 3);
              const xy = x & y, nz = 1 - z, f = xy | nz;
              return h('tr', { class: m === cur ? 'hit' : '', onclick: () => { [inp.x, inp.y, inp.z] = [x, y, z]; draw(); } },
                h('td', String(x)), h('td', String(y)), h('td', String(z)), h('td', String(xy)), h('td', String(nz)), h('td', h('b', String(f))));
            });
            rc(ttBox, h('table.tt.bl-click.bl-sm', { style: { width: '100%' } },
              h('thead', h('tr', ['x', 'y', 'z', 'xy', 'z′', 'f = xy + z′'].map((t) => h('th', t)))), h('tbody', rows)));
          };
          draw();
        },
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: a circuit simulator, from half adder to 4-bit adder',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click the switches at the top of the input wires. Lit green wires carry 1 and thin gray wires carry 0; the small circle after each gate shows its output. A dot joins wires, and wires that cross without a dot are not connected. Click a row of the truth table to load those inputs.</p>`,
        render(body, ctx) {
          const { h, rc } = ctx;
          let key = 'full';
          const inputs = {};
          Object.entries(CIRCUITS).forEach(([k, c]) => (inputs[k] = { ...c.start }));
          const adder = { a: [1, 0, 1, 1], b: [0, 1, 1, 0], stage: null };
          // the carry ripple advances one column per tick; pausing keeps the current stage, stop() settles the adder
          let ready = false;
          const ripple = ctx.ticker({ ms: 700, tick: () => { adder.stage++; if (adder.stage > 3) { adder.stage = null; return false; } draw(); return true; }, onChange: () => { if (ready) draw(); } });
          const stop = () => { adder.stage = null; ripple.stop(); };
          ctx.onHide(() => { if (adder.stage != null) stop(); });
          const seg = h('div.seg', { role: 'group', 'aria-label': 'Choose a circuit' });
          const fig = h('div.figure.bl-fig', { style: { flex: '1 1 auto' } });
          const note = h('div.box.small');
          const side = h('div.card.stack.bl-side');
          body.append(h('div.row', h('span.small.muted', 'Circuit:'), seg),
            h('div.split-wide.fill', { style: { alignItems: 'stretch', minHeight: 0, gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)' } },
              h('div.stack', { style: { minHeight: 0 } }, fig, note), side));
          const NAMES = { half: 'Half adder', full: 'Full adder', maj: 'Majority vote', mux: 'Multiplexer', add4: '4-bit adder' };
          function drawGateLevel() {
            const spec = CIRCUITS[key];
            const inp = inputs[key];
            rc(fig, drawCircuit(ctx, spec, inp, (k, kb) => { inp[k] ^= 1; draw(); if (kb) refocus(fig, k); }));
            const ids = spec.inputs.map((p) => p.id);
            const n = ids.length;
            const cur = ids.reduce((a, k) => a * 2 + inp[k], 0);
            const v = evalCircuit(spec, inp);
            const rows = range(2 ** n).map((m) => {
              const bits = bitsOf(m, n);
              const row = {};
              ids.forEach((k, i) => (row[k] = bits[i]));
              const rv = evalCircuit(spec, row);
              return h('tr', { class: m === cur ? 'hit' : '', onclick: () => { ids.forEach((k, i) => (inp[k] = bits[i])); draw(); } },
                bits.map((b) => h('td', String(b))), spec.outputs.map((o, j) => h('td', { style: j === 0 ? { borderLeft: '2px solid var(--ink-3)' } : null }, h('b', String(rv[o.from])))));
            });
            rc(side,
              h('h3', { style: { marginBottom: 0 } }, spec.name),
              h('p.small', spec.desc),
              ctx.rich('div.bl-eq', spec.eqs.map((e) => `\\(${e}\\)`).join('<br>')),
              h('div.small', 'Right now: ', spec.inputs.map((p) => `${p.label} = ${inp[p.id]}`).join(', '), ' gives ', h('b', spec.outputs.map((o) => `${o.label} = ${v[o.from]}`).join(', ')), '.'),
              h('table.tt.bl-click.bl-sm', { style: { width: '100%' } },
                h('thead', h('tr', spec.inputs.map((p) => h('th', p.label)), spec.outputs.map((o, j) => h('th', { style: j === 0 ? { borderLeft: '2px solid var(--ink-3)' } : null }, o.label)))),
                h('tbody', rows)));
            ctx.tex(side);
            note.innerHTML = `<span class="lbl">Look closer</span>${spec.note}`;
          }
          function drawAdder() {
            const { s } = ctx;
            const { a, b } = adder;
            const c = [0], sm = [];
            for (let i = 0; i < 4; i++) { const t = a[3 - i] + b[3 - i] + c[i]; sm[i] = t & 1; c[i + 1] = t >> 1; }
            const done = (i) => adder.stage == null || i < adder.stage;
            const cKnown = (i) => i === 0 || done(i - 1);
            const svg = s('svg', { viewBox: '0 0 640 320', role: 'img', 'aria-label': 'A 4-bit ripple-carry adder made of four full adders' });
            const wires = s('g'), top = s('g');
            svg.append(wires, top);
            const bx = (i) => 490 - i * 140, BY = 116, BW = 100, BH = 96, CY = BY + 48;
            top.append(s('text', { x: 10, y: 30, 'font-size': 15, 'font-weight': 700, fill: 'var(--accent)', text: 'A' }));
            top.append(s('text', { x: 10, y: 74, 'font-size': 15, 'font-weight': 700, fill: 'var(--fnc)', text: 'B' }));
            const flip = (arr, j) => (kb) => { stop(); adder[arr][j] ^= 1; draw(); if (kb) refocus(fig, `${arr}${3 - j}`); };
            for (let i = 0; i < 4; i++) {
              const x = bx(i);
              wires.append(s('line', { x1: x + 30, y1: 42, x2: x + 30, y2: BY, ...wireAttrs(a[3 - i]) }));
              wires.append(s('line', { x1: x + 70, y1: 86, x2: x + 70, y2: BY, ...wireAttrs(b[3 - i]) }));
              top.append(toggle(s, x + 30, 6, `a${i}`, a[3 - i], flip('a', 3 - i), `a${i}`));
              top.append(toggle(s, x + 70, 50, `b${i}`, b[3 - i], flip('b', 3 - i), `b${i}`));
              const active = adder.stage === i;
              top.append(s('rect', { x, y: BY, width: BW, height: BH, rx: 10, fill: done(i) ? 'var(--sheet)' : 'var(--paper)', stroke: active ? 'var(--warn)' : 'var(--ink)', 'stroke-width': active ? 3.2 : 1.8 }));
              top.append(s('text', { x: x + 8, y: BY + 16, 'font-size': 10.5, 'font-weight': 700, fill: 'var(--ink-3)', text: 'FULL ADDER' }));
              top.append(s('text', { x: x + 50, y: BY + 48, 'text-anchor': 'middle', 'font-size': 15, 'font-family': 'var(--font-mono)', fill: 'var(--ink)', text: `${a[3 - i]}+${b[3 - i]}+${cKnown(i) ? c[i] : '?'}` }));
              top.append(s('text', { x: x + 50, y: BY + 74, 'text-anchor': 'middle', 'font-size': done(i) ? 15 : 12, 'font-family': 'var(--font-mono)', 'font-weight': 700, fill: done(i) ? 'var(--ink)' : 'var(--ink-3)', text: done(i) ? `= ${c[i + 1]}${sm[i]}` : (active ? 'adding…' : 'waiting') }));
              wires.append(s('line', { x1: x + 50, y1: BY + BH, x2: x + 50, y2: 252, ...wireAttrs(done(i) ? sm[i] : null) }));
              top.append(lamp(s, x + 50, 265, done(i) ? sm[i] : null, 13));
              top.append(s('text', { x: x + 50, y: 300, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)', text: `s${i}` }));
              wires.append(s('line', { x1: x - (i === 3 ? 30 : 40), y1: CY, x2: x, y2: CY, ...wireAttrs(done(i) ? c[i + 1] : null) }));
              if (i < 3) top.append(s('text', { x: x - 20, y: CY - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', fill: 'var(--ink-2)', text: `c${i + 1}` }));
            }
            wires.append(s('line', { x1: 590, y1: CY, x2: 616, y2: CY, ...wireAttrs(0) }));
            top.append(s('text', { x: 612, y: CY - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', fill: 'var(--ink-2)', text: 'c0' }));
            top.append(s('text', { x: 626, y: CY + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--ink-2)', text: '0' }));
            top.append(lamp(s, 26, CY, done(3) ? c[4] : null, 13));
            top.append(s('text', { x: 26, y: CY - 20, 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', fill: 'var(--ink-2)', text: 'c4' }));
            rc(fig, svg);
            const A = a.join(''), B = b.join(''), S = String(c[4]) + sm.slice().reverse().join('');
            const settled = adder.stage == null;
            const watch = h('button.btn.primary.sm', { 'aria-pressed': String(ripple.playing), onclick: () => {
              if (ripple.playing) { ripple.stop(); return; }
              if (adder.stage == null) adder.stage = 0;
              ripple.start();
            } }, ripple.playing ? '❚❚ Pause' : '▶ Watch the carry ripple');
            const rnd = h('button.btn.sm', { onclick: () => { stop(); adder.a = range(4).map(() => ctx.R.int(0, 1)); adder.b = range(4).map(() => ctx.R.int(0, 1)); draw(); } }, 'Random numbers');
            rc(side,
              h('h3', '4-bit ripple-carry adder'),
              h('p.small', 'Four full adders in a chain add two 4-bit numbers column by column, exactly the way you add by hand. Each carry-out feeds the carry-in of the next column to the left.'),
              h('div.big-math.mono', `${A} + ${B} = ${settled ? S : '…'}`),
              h('p.small', { html: settled ? `In decimal: <b>${parseInt(A, 2)} + ${parseInt(B, 2)} = ${parseInt(S, 2)}</b>. The circuit agrees with ordinary addition.` : `Stage ${adder.stage + 1} of 4. Column ${adder.stage} is adding. Each full adder must wait for the carry from its right neighbor.` }),
              h('ol.small', { style: { margin: 0 } }, range(4).map((i) => h('li', { style: { opacity: done(i) ? 1 : 0.45 } }, `Column ${i}: ${a[3 - i]} + ${b[3 - i]} + carry ${cKnown(i) ? c[i] : '?'}`, done(i) ? ` = ${c[i + 1]}${sm[i]}₂, so s${i} = ${sm[i]} and c${i + 1} = ${c[i + 1]}` : ''))),
              h('div.row', watch, rnd));
            note.innerHTML = '<span class="lbl">Propagation delay</span>The carry has to pass through every column in turn, so a 64-bit ripple-carry adder waits through 64 stages. Real processors use <b>carry-lookahead</b> adders that compute all the carries at once from the P and G signals of each column.';
          }
          function draw() {
            rc(seg, ...Object.keys(NAMES).map((k) => h('button', { 'aria-pressed': String(k === key), onclick: () => { stop(); key = k; draw(); } }, NAMES[k])));
            if (key === 'add4') drawAdder(); else drawGateLevel();
          }
          draw();
          ready = true;
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Boolean algebra: one algebra, three languages',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">Boolean algebra</span> is a set \(B\) with operations \(+\) and \(\cdot\), a complement operation \(x'\), and two different elements \(0\) and \(1\) that obey these laws for all \(x, y, z \in B\).</div>
              <table class="tt bl-ax" style="width:100%">
                <thead><tr><th class="l">Law</th><th>Sum form</th><th>Product form</th></tr></thead>
                <tbody>
                  <tr><td class="l">Commutative</td><td>\(x + y = y + x\)</td><td>\(xy = yx\)</td></tr>
                  <tr><td class="l">Associative</td><td>\((x + y) + z = x + (y + z)\)</td><td>\((xy)z = x(yz)\)</td></tr>
                  <tr><td class="l">Distributive</td><td>\(x + yz = (x + y)(x + z)\)</td><td>\(x(y + z) = xy + xz\)</td></tr>
                  <tr><td class="l">Identity</td><td>\(x + 0 = x\)</td><td>\(x \cdot 1 = x\)</td></tr>
                  <tr><td class="l">Complement</td><td>\(x + x' = 1\)</td><td>\(xx' = 0\)</td></tr>
                </tbody>
              </table>
              <p class="small">Every other law follows from these five pairs, including idempotent \(x + x = x\), bound \(x + 1 = 1\), absorption \(x + xy = x\), involution \(x'' = x\), and De Morgan \((x + y)' = x'y'\).</p>
              <div class="thm"><b>Duality.</b> Swap \(+ \leftrightarrow \cdot\) and \(0 \leftrightarrow 1\) in any law and you get another law. The dual of \(x + 0 = x\) is \(x \cdot 1 = x\), and the dual of \(x + xy = x\) is \(x(x + y) = x\).</div>
            </div>
            <div class="stack">
              <table class="tt bl-3col" style="width:100%">
                <thead><tr><th class="l"></th><th>Sets (Module 1)</th><th>Logic (Module 2)</th><th>Circuits</th></tr></thead>
                <tbody>
                  <tr><td class="l">Objects</td><td>subsets of \(U\)</td><td>statements</td><td>bits</td></tr>
                  <tr><td class="l">"or"</td><td>\(A \cup B\)</td><td>\(p \vee q\)</td><td>\(x + y\), OR gate</td></tr>
                  <tr><td class="l">"and"</td><td>\(A \cap B\)</td><td>\(p \wedge q\)</td><td>\(xy\), AND gate</td></tr>
                  <tr><td class="l">"not"</td><td>\(A'\)</td><td>\(\neg p\)</td><td>\(x'\), NOT gate</td></tr>
                  <tr><td class="l">Zero</td><td>\(\varnothing\)</td><td>F</td><td>0</td></tr>
                  <tr><td class="l">One</td><td>\(U\)</td><td>T</td><td>1</td></tr>
                  <tr><td class="l">De Morgan</td><td>\((A \cup B)' = A' \cap B'\)</td><td>\(\neg(p \vee q) \equiv \neg p \wedge \neg q\)</td><td>\((x + y)' = x'y'\)</td></tr>
                </tbody>
              </table>
              <div class="why">Prove a law once in Boolean algebra and it holds for sets, for logic and for circuits at the same time. One difference from school algebra needs care. Here \(1 + 1 = 1\), because \(+\) means OR.</div>
              <div class="ai">A transformer's causal mask is a grid of bits. Position \(i\) may look at position \(j\) only when \(j \le i\). Combining it with a padding mask is an elementwise AND of two bit grids.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Boolean functions and normal forms',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">Boolean function</span> of \(n\) variables gives an output bit for each of the \(2^n\) input rows. A <span class="term">literal</span> is a variable or its complement, like \(x\) or \(x'\). A <span class="term">minterm</span> is a product with every variable once, such as \(x'yz\). It equals 1 on exactly one row.</div>
              <div class="thm">Every Boolean function equals the sum of the minterms of the rows where it is 1. That sum is its <span class="term">disjunctive normal form</span> (DNF), also called a sum of minterms.</div>
              <div class="ex">Read the DNF straight off the table. For each row with \(f = 1\), write \(x\) where the bit is 1 and \(x'\) where it is 0, then add the products. Row \(011\) gives \(x'yz\), the minterm \(m_3\).</div>
              <div class="why">This proves that AND, OR and NOT can build <i>every</i> Boolean function, since any truth table turns into a DNF. With \(n\) variables there are \(2^{2^n}\) functions: 16 for two variables and 256 for three.</div>
            </div>
            <div class="stack">
              <table class="tt bl-sm" style="width:100%">
                <thead><tr><th>row</th><th>x</th><th>y</th><th>z</th><th>f (majority)</th><th class="l">term</th></tr></thead>
                <tbody>
                  <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td class="l muted">maxterm \(x + y + z\)</td></tr>
                  <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td><td class="l muted">maxterm \(x + y + z'\)</td></tr>
                  <tr><td>2</td><td>0</td><td>1</td><td>0</td><td>0</td><td class="l muted">maxterm \(x + y' + z\)</td></tr>
                  <tr class="hit"><td>3</td><td>0</td><td>1</td><td>1</td><td><b>1</b></td><td class="l">minterm \(x'yz\)</td></tr>
                  <tr><td>4</td><td>1</td><td>0</td><td>0</td><td>0</td><td class="l muted">maxterm \(x' + y + z\)</td></tr>
                  <tr class="hit"><td>5</td><td>1</td><td>0</td><td>1</td><td><b>1</b></td><td class="l">minterm \(xy'z\)</td></tr>
                  <tr class="hit"><td>6</td><td>1</td><td>1</td><td>0</td><td><b>1</b></td><td class="l">minterm \(xyz'\)</td></tr>
                  <tr class="hit"><td>7</td><td>1</td><td>1</td><td>1</td><td><b>1</b></td><td class="l">minterm \(xyz\)</td></tr>
                </tbody>
              </table>
              <p class="center">\(f = x'yz + xy'z + xyz' + xyz = \Sigma m(3, 5, 6, 7)\)</p>
              <div class="box"><span class="lbl">Conjunctive normal form, briefly</span>The <span class="term">conjunctive normal form</span> (CNF) works from the 0-rows instead. Each 0-row gives a <span class="term">maxterm</span>, a sum that is 0 on that row only. Multiplying them gives \(f = (x + y + z)(x + y + z')(x + y' + z)(x' + y + z)\).</div>
              <div class="warn">The rules are opposite. In a minterm a 0 bit becomes \(x'\). In a maxterm a 0 bit becomes plain \(x\).</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: from truth table to circuit',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click the <b>f</b> buttons to set the output of each row. The page reads the DNF straight off the table, finds a minimal sum of products, counts the gates, and draws the circuit. Click anywhere else on a row to feed that input into the circuit.</p>`,
        render(body, ctx) {
          const { h, rc } = ctx;
          const names = ['x', 'y', 'z'];
          const PRE = [
            ['Majority', [0, 0, 0, 1, 0, 1, 1, 1]],
            ['xy + z′', [1, 0, 1, 0, 1, 0, 1, 1]],
            ['Multiplexer', [0, 0, 1, 1, 0, 1, 0, 1]],
            ['Parity (XOR)', [0, 1, 1, 0, 1, 0, 0, 1]],
          ];
          let f = PRE[0][1].slice();
          let sel = 7;
          let view = 'min';
          const presets = h('div.row', { style: { gap: '0.3rem' } });
          const tableBox = h('div');
          const costBox = h('div.card.stack', { style: { gap: '0.35rem', padding: '0.55rem 0.75rem' } });
          const exprs = h('div.card.bl-exprs', { style: { padding: '0.4rem 0.75rem' } });
          const viewSeg = h('div.seg');
          const fig = h('div.figure.bl-fig', { style: { flex: '1 1 auto' } });
          body.append(presets, h('div.split-narrow.fill', { style: { alignItems: 'stretch', minHeight: 0, gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.6fr)' } },
            h('div.stack', { style: { minHeight: 0 } }, tableBox, costBox),
            h('div.stack', { style: { minHeight: 0 } }, exprs, h('div.row', h('span.small.muted', 'Draw the circuit for:'), viewSeg), fig)));
          const texTerms = (terms) => (terms.length ? terms.map((t) => `\\(${termStr(t, names)}\\)`).join(' + ') : '\\(0\\)');
          function draw() {
            rc(presets, h('span.small.muted', 'Start from:'), ...PRE.map(([nm, bits]) => h('button.btn.sm', { class: f.join('') === bits.join('') ? 'on' : '', onclick: () => { f = bits.slice(); draw(); } }, nm)),
              h('button.btn.sm', { onclick: () => { f = range(8).map(() => ctx.R.int(0, 1)); draw(); } }, 'Random'),
              h('button.btn.sm', { onclick: () => { f = new Array(8).fill(0); draw(); } }, 'All 0'));
            const ones = range(8).filter((m) => f[m]);
            const zeros = range(8).filter((m) => !f[m]);
            const res = minimize(3, ones);
            const minTerms = res.terms;
            const dnfTerms = ones.map((m) => withLits(minterm(m, 3)));
            rc(tableBox, h('table.tt.bl-click.bl-sm', { style: { width: '100%' } },
              h('thead', h('tr', h('th', 'm'), h('th', 'x'), h('th', 'y'), h('th', 'z'), h('th', 'f'), h('th.l', 'minterm'))),
              h('tbody', range(8).map((m) => {
                const b = bitsOf(m, 3);
                return h('tr', { class: m === sel ? 'hit' : '', onclick: () => { sel = m; draw(); } },
                  h('td.muted', String(m)), b.map((x) => h('td', String(x))),
                  h('td', h('button.bl-fbtn', { class: f[m] ? 'one' : '', 'aria-label': `Row ${m}: f is ${f[m]}. Press to flip.`, onclick: (e) => { e.stopPropagation(); f[m] ^= 1; draw(); } }, String(f[m]))),
                  h('td.l.mono', { style: { opacity: f[m] ? 1 : 0.3 } }, termStr(minterm(m, 3), names).replace(/'/g, '′')));
              }))));
            const c0 = sopCost(dnfTerms, 3), c1 = sopCost(minTerms, 3);
            const mx = Math.max(1, c0.inputs);
            const costRow = (label, c, cls) => [h('span.small', label), h('div', h('div.bl-bar' + cls, { style: { width: `${(100 * c.inputs) / mx}%`, minWidth: c.inputs ? '0.4rem' : '0' } })), h('span.small.mono', `${c.gates} gates`)];
            rc(costBox, h('div.tiny.mono.muted', 'COST: GATES AND GATE INPUTS'),
              h('div.bl-cost', ...costRow('DNF', c0, '.b'), ...costRow('Minimal', c1, '')),
              h('p.tiny.muted', `The DNF needs ${c0.and} AND, ${c0.or} OR and ${c0.not} NOT gates with ${c0.inputs} gate inputs in all. The minimal form needs ${c1.and} AND, ${c1.or} OR and ${c1.not} NOT with ${c1.inputs} inputs.`));
            rc(exprs,
              h('div', h('span.k', 'Minterm list'), ctx.rich('span.v', ones.length ? `\\(f = \\Sigma m(${ones.join(', ')})\\)` : '\\(f = 0\\) (no 1-rows)')),
              h('div', h('span.k', 'DNF (from table)'), ctx.rich('span.v', texTerms(dnfTerms))),
              h('div', h('span.k', 'Minimal SOP'), ctx.rich('span.v', `<b>${texTerms(minTerms)}</b>`)),
              h('div', h('span.k', 'CNF (from 0-rows)'), ctx.rich('span.v.small', zeros.length ? zeros.map((m) => `\\(${maxtermTex(m, names)}\\)`).join('') : '\\(f = 1\\) (no 0-rows)')));
            rc(viewSeg, ...[['min', 'Minimal form'], ['dnf', 'DNF']].map(([k, label]) => h('button', { 'aria-pressed': String(view === k), onclick: () => { view = k; draw(); } }, label)));
            rc(fig, drawSOP(ctx, view === 'min' ? minTerms : dnfTerms, names, bitsOf(sel, 3)));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Minimizing circuits: algebra and Karnaugh maps',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="why">Every gate costs chip area and money, every level of gates adds delay, and every switching gate burns power. A smaller equivalent circuit is cheaper, faster and cooler.</div>
              <div class="ex">Simplify the majority function \(x'yz + xy'z + xyz' + xyz\). Since \(xyz + xyz = xyz\) (idempotent law), we may reuse \(xyz\) three times.
                <table class="tt bl-sm" style="width:100%; margin-top:0.35rem">
                  <tbody>
                    <tr><td class="l">\(= (x'yz + xyz) + (xy'z + xyz) + (xyz' + xyz)\)</td><td class="l">idempotent</td></tr>
                    <tr><td class="l">\(= yz(x' + x) + xz(y' + y) + xy(z' + z)\)</td><td class="l">distributive</td></tr>
                    <tr><td class="l">\(= yz \cdot 1 + xz \cdot 1 + xy \cdot 1\)</td><td class="l">complement</td></tr>
                    <tr><td class="l">\(= xy + xz + yz\)</td><td class="l">identity</td></tr>
                  </tbody>
                </table>
                From 8 gates (4 three-input ANDs, 3 NOTs, an OR) down to 4.</div>
              <div class="ai">Quantized neural networks store weights in 8, 4 or even 1 bit so that inference needs fewer, simpler gates. A 1-bit network replaces multiplication with XNOR gates and bit counting.</div>
            </div>
            <div class="stack">
              <div class="def">A <span class="term">Karnaugh map</span> is a truth table folded into a grid. Rows and columns follow Gray-code order 00, 01, 11, 10, so neighboring cells differ in exactly one variable. Two neighboring 1s merge because \(Ax + Ax' = A\).</div>
              <div class="thm"><b>Grouping rules.</b>
                <ol style="margin:0.2rem 0 0">
                  <li>Groups are rectangles of 1, 2, 4, 8 or 16 cells.</li>
                  <li>A group holds only 1s (and don't-care cells, marked X).</li>
                  <li>Make every group as large as possible.</li>
                  <li>Use as few groups as possible. Overlaps are fine.</li>
                  <li>Edges wrap around, so the left column touches the right one and the top row touches the bottom.</li>
                  <li>Each group is one product term. Keep the variables that stay constant across the group and drop the ones that change.</li>
                </ol>
              </div>
              <p class="small">A group of \(2^k\) cells drops \(k\) variables. In a 4-variable map a group of 4 gives a 2-literal term and a group of 8 gives a single literal. A group that cannot grow any larger is a <span class="term">prime implicant</span>.</p>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: Karnaugh maps',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click a cell to cycle it through 0, 1 and X (a don't-care, meaning a row whose output you are free to choose). The page finds the fewest and largest groups, draws them, and explains each one. Groups that run off one edge continue on the opposite edge.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const PRE = [
            { name: 'Textbook classic', n: 4, ones: [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], dc: [] },
            { name: 'Corners and center', n: 4, ones: [0, 2, 5, 7, 8, 10, 13, 15], dc: [] },
            { name: 'Odd digits with don\'t-cares', n: 4, ones: [1, 3, 5, 7, 9], dc: [10, 11, 12, 13, 14, 15] },
            { name: 'Majority', n: 3, ones: [3, 5, 6, 7], dc: [] },
            { name: 'Parity', n: 3, ones: [1, 2, 4, 7], dc: [] },
          ];
          let n = 4, cells = [], preName = '';
          const load = (p) => { n = p.n; preName = p.name; cells = new Array(1 << n).fill(0); p.ones.forEach((m) => (cells[m] = 1)); p.dc.forEach((m) => (cells[m] = 2)); draw(); };
          const segN = h('div.seg', { role: 'group', 'aria-label': 'Number of variables' });
          const preRow = h('div.row', { style: { gap: '0.3rem' } });
          const fig = h('div.figure.bl-fig');
          const out = h('div.card.stack', { style: { minHeight: 0, gap: '0.4rem' } });
          body.append(h('div.row', h('span.small.muted', 'Variables:'), segN, h('span.small.muted', { style: { marginLeft: '0.5rem' } }, 'Examples:'), preRow),
            h('div.split.fill', { style: { alignItems: 'stretch', minHeight: 0, gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' } }, fig, out));
          function draw() {
            const names = n === 4 ? ['w', 'x', 'y', 'z'] : ['x', 'y', 'z'];
            rc(segN, ...[3, 4].map((k) => h('button', { 'aria-pressed': String(k === n), onclick: () => { if (k !== n) load(PRE.find((p) => p.n === k)); } }, `${k}`)));
            rc(preRow, ...PRE.filter((p) => p.n === n).map((p) => h('button.btn.sm', { class: p.name === preName ? 'on' : '', onclick: () => load(p) }, p.name)),
              h('button.btn.sm', { onclick: () => { preName = ''; cells.fill(0); draw(); } }, 'Clear'));
            const ones = [], dcs = [];
            cells.forEach((c, m) => { if (c === 1) ones.push(m); else if (c === 2) dcs.push(m); });
            const res = minimize(n, ones, dcs);
            // ---- the map ----
            const S = 62, ox = 84, oy = 62;
            const R = n === 4 ? 4 : 2;
            const rowBits = (r) => (n === 4 ? GRAY[r] : r);
            const cellM = (r, c) => (rowBits(r) << 2) | GRAY[c];
            const W = ox + 4 * S + 16, H = oy + R * S + 14;
            const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${n}-variable Karnaugh map` });
            const rowVars = n === 4 ? 'wx' : 'x';
            svg.append(s('line', { x1: ox - 50, y1: oy - 44, x2: ox, y2: oy, stroke: 'var(--ink-3)', 'stroke-width': 1.2 }));
            svg.append(s('text', { x: ox - 46, y: oy - 4, 'font-size': 14, 'font-style': 'italic', 'font-weight': 700, fill: 'var(--ink)', text: rowVars }));
            svg.append(s('text', { x: ox - 18, y: oy - 34, 'font-size': 14, 'font-style': 'italic', 'font-weight': 700, fill: 'var(--ink)', text: 'yz' }));
            GRAY.forEach((g, c) => svg.append(s('text', { x: ox + c * S + S / 2, y: oy - 10, 'text-anchor': 'middle', 'font-size': 13, 'font-family': 'var(--font-mono)', fill: 'var(--ink-2)', text: g.toString(2).padStart(2, '0') })));
            range(R).forEach((r) => svg.append(s('text', { x: ox - 10, y: oy + r * S + S / 2 + 5, 'text-anchor': 'end', 'font-size': 13, 'font-family': 'var(--font-mono)', fill: 'var(--ink-2)', text: n === 4 ? GRAY[r].toString(2).padStart(2, '0') : String(r) })));
            const mlabels = s('g', { 'pointer-events': 'none' });
            for (let r = 0; r < R; r++) {
              for (let c = 0; c < 4; c++) {
                const m = cellM(r, c);
                const v = cells[m];
                const g = s('g', { class: 'bl-kcell', tabindex: 0, role: 'button', 'data-m': m, 'aria-label': `Cell m${m} is ${v === 2 ? "don't care" : v}. Press to change.`,
                  onclick: () => { cells[m] = (cells[m] + 1) % 3; preName = ''; draw(); },
                  onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cells[m] = (cells[m] + 1) % 3; preName = ''; draw(); const el = fig.querySelector(`[data-m="${m}"]`); if (el) el.focus(); } } });
                g.append(s('rect', { class: 'c', x: ox + c * S, y: oy + r * S, width: S, height: S, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.2 }));
                mlabels.append(s('text', { x: ox + c * S + 5, y: oy + r * S + 13, 'font-size': 9.5, fill: 'var(--ink-3)', text: `m${m}` }));
                g.append(s('text', { x: ox + c * S + S / 2, y: oy + r * S + S / 2 + 8, 'text-anchor': 'middle', 'font-size': v === 1 ? 23 : 19, 'font-weight': v === 1 ? 700 : 400, fill: v === 1 ? 'var(--ink)' : v === 2 ? 'var(--warn)' : 'var(--ink-3)', text: v === 2 ? 'X' : String(v) }));
                svg.append(g);
              }
            }
            svg.append(s('rect', { x: ox, y: oy, width: 4 * S, height: R * S, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.6 }));
            const clipId = 'bl-kclip';
            svg.append(s('defs', null, s('clipPath', { id: clipId }, s('rect', { x: ox - 1, y: oy - 1, width: 4 * S + 2, height: R * S + 2 }))));
            const groups = s('g', { 'clip-path': `url(#${clipId})`, 'pointer-events': 'none' });
            svg.append(groups);
            res.terms.forEach((t, gi) => {
              const col = COLORS[gi % COLORS.length];
              const rowsIn = range(R).filter((r) => range(4).some((c) => t.cells.includes(cellM(r, c))));
              const colsIn = range(4).filter((c) => range(R).some((r) => t.cells.includes(cellM(r, c))));
              const rRuns = kmapRuns(rowsIn, R), cRuns = kmapRuns(colsIn, 4);
              const wrapR = rRuns.length === 2, wrapC = cRuns.length === 2;
              const overlaps = res.terms.slice(0, gi).filter((u) => u.cells.some((m) => t.cells.includes(m))).length;
              const inset = 5 + 4 * Math.min(overlaps, 3);
              for (const [r0, r1] of rRuns) {
                for (const [c0, c1] of cRuns) {
                  let x0 = ox + c0 * S + inset, x1 = ox + (c1 + 1) * S - inset;
                  let y0 = oy + r0 * S + inset, y1 = oy + (r1 + 1) * S - inset;
                  if (wrapC && c0 === 0) x0 -= 26;
                  if (wrapC && c1 === 3) x1 += 26;
                  if (wrapR && r0 === 0) y0 -= 26;
                  if (wrapR && r1 === R - 1) y1 += 26;
                  groups.append(s('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 14, fill: col, 'fill-opacity': 0.1, stroke: col, 'stroke-width': 2.6 }));
                }
              }
            });
            svg.append(mlabels);
            rc(fig, svg);
            // ---- the explanation ----
            const colored = (t, gi) => `<span style="color:${COLORS[gi % COLORS.length]}">\\(${termStr(t, names)}\\)</span>`;
            const expr = res.terms.length ? res.terms.map(colored).join(' + ') : '\\(0\\)';
            const lits = res.terms.reduce((a, t) => a + t.lits, 0);
            const items = res.terms.map((t, gi) => {
              const fixed = [], free = [];
              names.forEach((v, i) => { const bit = 1 << (n - 1 - i); if (t.mask & bit) fixed.push(`${v} = ${t.val & bit ? 1 : 0}`); else free.push(v); });
              let why;
              if (!t.mask) why = 'The group covers the whole map, so f = 1.';
              else if (!free.length) why = 'A single cell cannot merge with any neighbor, so it keeps every variable.';
              else why = `${listJoin(free)} change${free.length === 1 ? 's' : ''} inside the group, so ${free.length === 1 ? 'it drops' : 'they drop'} out. ${listJoin(fixed)} ${fixed.length === 1 ? 'holds' : 'hold'} in every cell, which gives \\(${termStr(t, names)}\\).`;
              const only = t.covers.find((m) => res.coverers[m].length === 1);
              const need = res.essential.has(t) ? `Essential, because it is the only possible group that covers m${only}.` : `Chosen to cover m${t.covers.find((m) => !res.terms.some((u) => u !== t && res.essential.has(u) && u.covers.includes(m))) ?? t.covers[0]} with the fewest groups.`;
              return ctx.rich('div.bl-gi', `<b>${colored(t, gi)}</b> <span class="muted">· cells ${t.cells.map((m) => 'm' + m).join(', ')} (${t.cells.length})</span><br>${why} <span class="muted">${need}</span>`);
            });
            items.forEach((el, gi) => (el.style.borderLeftColor = COLORS[gi % COLORS.length]));
            rc(out,
              h('div.tiny.mono.muted', 'MINIMAL SUM OF PRODUCTS'),
              ctx.rich('div', `<div class="big-math" style="text-align:left">\\(f =\\) ${expr}</div>`),
              h('p.small.muted', ones.length
                ? `Writing out all ${ones.length} minterm${ones.length === 1 ? '' : 's'} costs ${ones.length} term${ones.length === 1 ? '' : 's'} and ${ones.length * n} literals. The map needs ${res.terms.length} term${res.terms.length === 1 ? '' : 's'} and ${lits} literal${lits === 1 ? '' : 's'}.${dcs.length ? ` The ${dcs.length} X cells are treated as 1 only where that makes a group bigger.` : ''}`
                : 'There are no 1s, so f = 0 and no gates are needed. Click some cells.'),
              res.terms.length ? h('div.tiny.mono.muted', 'EACH GROUP AND WHY') : null,
              h('div.bl-glist', items));
          }
          load(PRE[0]);
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Lab: NAND is all you need',
        kind: 'lab',
        html: String.raw`<p class="muted small">Build each target using only NAND gates. Pick the two inputs of every gate from its menus; the last gate is the output. The truth table checks your circuit on every input, and you can click the inputs in the drawing to watch signals flow.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const T = [
            { key: 'not', label: 'NOT x', tex: "x'", ins: ['x'], n: 1, f: (x) => 1 - x, sol: [['x', 'x']],
              hint: 'Try feeding the same signal into both inputs of one NAND.',
              why: String.raw`\(x \uparrow x = (x \cdot x)' = x'\) because \(xx = x\). Tying one input to 1 also works, since \(x \uparrow 1 = (x \cdot 1)' = x'\).` },
            { key: 'and', label: 'x AND y', tex: 'xy', ins: ['x', 'y'], n: 2, f: (x, y) => x & y, sol: [['x', 'y'], ['g1', 'g1']],
              hint: 'NAND is AND followed by NOT. Can a second NAND undo that NOT?',
              why: String.raw`Gate 1 gives \((xy)'\). A NAND with both inputs tied together is a NOT, so gate 2 gives \(((xy)')' = xy\) by the involution law.` },
            { key: 'or', label: 'x OR y', tex: 'x + y', ins: ['x', 'y'], n: 3, f: (x, y) => x | y, sol: [['x', 'x'], ['y', 'y'], ['g1', 'g2']],
              hint: String.raw`De Morgan says \(x + y = (x'y')'\). Make \(x'\) and \(y'\) first.`,
              why: String.raw`Gates 1 and 2 make \(x'\) and \(y'\). Gate 3 gives \((x'y')' = x'' + y'' = x + y\) by De Morgan's law.` },
            { key: 'nor', label: 'x NOR y', tex: "(x + y)'", ins: ['x', 'y'], n: 4, f: (x, y) => 1 - (x | y), sol: [['x', 'x'], ['y', 'y'], ['g1', 'g2'], ['g3', 'g3']],
              hint: 'Build OR first, then flip it with one more NAND.',
              why: String.raw`Three NANDs make \(x + y\), exactly as in the OR puzzle, and a fourth NAND used as a NOT flips it to \((x + y)'\).` },
            { key: 'xor', label: 'x XOR y', tex: String.raw`x \oplus y`, ins: ['x', 'y'], n: 4, f: (x, y) => x ^ y, sol: [['x', 'y'], ['x', 'g1'], ['y', 'g1'], ['g2', 'g3']],
              hint: 'Start with gate 1 = x NAND y. Then NAND gate 1 with x, and separately with y.',
              why: String.raw`Gate 2 simplifies to \((x(xy)')' = (xy')'\) and gate 3 to \((x'y)'\). Gate 4 then gives \(xy' + x'y\) by De Morgan, which is exactly \(x \oplus y\).` },
          ];
          const slots = {};
          T.forEach((t) => (slots[t.key] = range(t.n).map(() => [t.ins[0], t.ins[t.ins.length - 1]])));
          slots.and = [['x', 'y'], ['g1', 'y']];
          let cur = 'and';
          const inp = { x: 1, y: 1, 1: 1 };
          const seg = h('div.seg', { role: 'group', 'aria-label': 'Target function' });
          const editor = h('div.stack', { style: { gap: '0.35rem' } });
          const fb = h('div.feedback', { 'aria-live': 'polite' });
          const fig = h('div.figure.bl-fig', { style: { flex: '1 1 auto', minHeight: '8rem' } });
          const tt = h('div');
          body.append(h('div.row', h('span.small.muted', 'Target:'), seg),
            h('div.split.fill', { style: { alignItems: 'stretch', minHeight: 0, gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)' } },
              h('div.stack', { style: { minHeight: 0 } },
                ctx.rich('div.thm', String.raw`A set of gates is <span class="term">functionally complete</span> when it can build every Boolean function. \(\{\text{AND}, \text{OR}, \text{NOT}\}\) is complete because every function has a DNF. So if NAND can make NOT, AND and OR, NAND alone is complete. NOR alone is complete too. \(\{\text{AND}, \text{OR}\}\) is not complete, because with every input 0 any AND-OR circuit outputs 0, so it can never build NOT.`),
                editor, fb),
              h('div.stack', { style: { minHeight: 0 } }, fig, tt)));
          const evalNand = (sl, vals) => { const v = { ...vals, 1: 1 }; sl.forEach(([a, b], k) => (v['g' + (k + 1)] = 1 - (v[a] & v[b]))); return v; };
          function drawNand(t, sl) {
            const v = evalNand(sl, inp);
            const depth = { x: 0, y: 0, 1: 0 };
            sl.forEach(([a, b], k) => (depth['g' + (k + 1)] = 1 + Math.max(depth[a], depth[b])));
            const maxD = Math.max(...sl.map((_, k) => depth['g' + (k + 1)]));
            const W = 120 + maxD * 118 + 70, Hh = 250;
            const svg = s('svg', { viewBox: `0 0 ${W} ${Hh}`, role: 'img', 'aria-label': `NAND circuit for ${t.label}` });
            const wires = s('g'), bodies = s('g'), top = s('g');
            svg.append(wires, bodies, top);
            const used = new Set(['g' + sl.length]);
            for (let k = sl.length; k >= 1; k--) if (used.has('g' + k)) sl[k - 1].forEach((src) => used.add(src));
            const src = {};
            const ins = t.ins.length === 1 ? [['x', 125]] : [['x', 78], ['y', 172]];
            ins.forEach(([nm, y]) => (src[nm] = [46, y]));
            const hasOne = sl.some((pair) => pair.includes('1'));
            if (hasOne) src['1'] = [46, 230];
            const cols = {};
            sl.forEach((_, k) => (cols[depth['g' + (k + 1)]] ||= []).push(k));
            const geo = {};
            Object.entries(cols).forEach(([d, ks]) => ks.forEach((k, j) => {
              const cy = Math.round(30 + ((Hh - 60) * (j + 0.5)) / ks.length);
              geo[k] = gateGeom('NAND', 110 + (d - 1) * 118, cy, 2);
              src['g' + (k + 1)] = geo[k].out;
            }));
            const into = {}, trunks = {};
            sl.forEach(([a, b], k) => {
              const d = depth['g' + (k + 1)];
              [a, b].forEach((nm, i) => {
                const [sx, sy] = src[nm];
                const [px, py] = geo[k].pins[i];
                const j = (into[d] = (into[d] || 0) + 1) - 1;
                const mid = px - 14 - 7 * j;
                wires.append(s('path', { d: `M${sx} ${sy}H${mid}V${py}H${px + 10}`, ...wireAttrs(v[nm]), opacity: used.has('g' + (k + 1)) ? 1 : 0.35 }));
                (trunks[nm] ||= { sy, list: [] }).list.push({ mid, py });
              });
            });
            // a dot wherever one signal branches off a shared wire
            for (const [nm, tr] of Object.entries(trunks)) {
              if (tr.list.length < 2) continue;
              const maxMid = Math.max(...tr.list.map((w) => w.mid));
              const byMid = {};
              tr.list.forEach((w) => (byMid[w.mid] ||= []).push(w.py));
              for (const [m, pys] of Object.entries(byMid)) {
                const ys = [tr.sy, ...pys];
                const lo = Math.min(...ys), hi = Math.max(...ys);
                for (const y of new Set(ys)) if (y > lo && y < hi) top.append(s('circle', { cx: +m, cy: y, r: 3.4, fill: dotFill(v[nm]) }));
                if (+m < maxMid) top.append(s('circle', { cx: +m, cy: tr.sy, r: 3.4, fill: dotFill(v[nm]) }));
              }
            }
            sl.forEach((_, k) => {
              const G = drawGate(s, 'NAND', geo[k].pins[0][0], (geo[k].pins[0][1] + geo[k].pins[1][1]) / 2, 2, 'NAND');
              if (!used.has('g' + (k + 1))) G.g.setAttribute('opacity', 0.4);
              bodies.append(G.g);
              top.append(s('text', { x: G.out[0] - 30, y: G.y0 - 5, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--ink-2)', text: `gate ${k + 1}` }));
              top.append(badge(s, G.out[0] + 10, G.out[1], v['g' + (k + 1)]));
            });
            ins.forEach(([nm, y]) => top.append(toggle(s, 26, y - 18, nm, inp[nm], (kb) => { inp[nm] ^= 1; draw(); if (kb) refocus(fig, nm); }, nm)));
            if (hasOne) top.append(s('text', { x: 26, y: 235, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--true)', text: '1' }));
            const last = geo[sl.length - 1].out;
            wires.append(s('line', { x1: last[0], y1: last[1], x2: W - 44, y2: last[1], ...wireAttrs(v['g' + sl.length]) }));
            top.append(lamp(s, W - 32, last[1], v['g' + sl.length]));
            top.append(s('text', { x: W - 32, y: last[1] + 30, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)', text: 'f' }));
            return svg;
          }
          function draw() {
            const t = T.find((x) => x.key === cur);
            const sl = slots[cur];
            rc(seg, ...T.map((x) => h('button', { 'aria-pressed': String(x.key === cur), onclick: () => { cur = x.key; draw(); } }, x.label)));
            const options = (k) => [...t.ins, '1', ...range(k).map((j) => 'g' + (j + 1))];
            const label = (o) => (o === '1' ? 'constant 1' : o[0] === 'g' ? 'gate ' + o.slice(1) : o);
            rc(editor, ctx.rich('div.small', String.raw`Target: \(f = ${t.tex}\) with ${t.n} NAND gate${t.n === 1 ? '' : 's'}.`),
              ...sl.map((pair, k) => h('div.bl-slot', h('span.n', `gate ${k + 1}`), ...[0, 1].flatMap((i) => {
                const sel = h('select.inp', { 'aria-label': `Gate ${k + 1} input ${i + 1}`, onchange: (e) => { pair[i] = e.target.value; draw(); } },
                  options(k).map((o) => h('option', { value: o, selected: o === pair[i] ? true : null }, label(o))));
                return i === 0 ? [sel, h('b.mono', '↑')] : [sel];
              }))),
              h('div.row', h('button.btn.sm', { onclick: () => { slots[cur] = t.sol.map((p) => p.slice()); draw(); } }, 'Show a solution'),
                h('button.btn.sm', { onclick: () => { slots[cur] = range(t.n).map(() => [t.ins[0], t.ins[t.ins.length - 1]]); draw(); } }, 'Reset')));
            const rows = range(2 ** t.ins.length).map((m) => {
              const b = bitsOf(m, t.ins.length);
              const vals = {};
              t.ins.forEach((nm, i) => (vals[nm] = b[i]));
              const v = evalNand(sl, vals);
              const got = v['g' + sl.length], want = t.f(...b);
              return { b, v, got, want };
            });
            const okCount = rows.filter((r) => r.got === r.want).length;
            rc(tt, h('table.tt.bl-sm', { style: { width: '100%' } },
              h('thead', h('tr', t.ins.map((nm) => h('th', nm)), sl.map((_, k) => h('th', `g${k + 1}`)), h('th', 'your f'), h('th', 'target'), h('th', ''))),
              h('tbody', rows.map((r) => h('tr', r.b.map((x) => h('td', String(x))), sl.map((_, k) => h('td.muted', String(r.v['g' + (k + 1)]))), h('td', h('b', String(r.got))), h('td', String(r.want)),
                h('td', { class: r.got === r.want ? 'ok' : 'bad' }, r.got === r.want ? '✓' : '✗'))))));
            const solved = okCount === rows.length;
            fb.className = 'feedback ' + (solved ? 'good' : 'bad');
            fb.innerHTML = solved ? `<b>Solved.</b> ${t.why}` : `<b>${okCount} of ${rows.length} rows match.</b> Hint: ${t.hint}`;
            fb.style.color = 'var(--ink)';
            ctx.tex(fb);
            ctx.tex(editor);
            rc(fig, drawNand(t, sl));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: a perceptron is a logic gate',
        kind: 'lab',
        html: String.raw`<p class="muted small">A <span class="term">perceptron</span>, the simplest artificial neuron, outputs 1 when \(w_1x_1 + w_2x_2 + b \gt 0\) and 0 otherwise. Its dividing line \(w_1x_1 + w_2x_2 + b = 0\) splits the plane. Drag the weights and the bias until the perceptron acts like the chosen gate.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const TG = { AND: (a, b) => a & b, OR: (a, b) => a | b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), XOR: (a, b) => a ^ b };
          let target = 'AND';
          const w = { w1: 1, w2: 1, b: -0.5 };
          let search = null;
          const PTS = [[0, 0], [0, 1], [1, 0], [1, 1]];
          const fig = h('div.figure.bl-fig');
          const seg = h('div.seg', { role: 'group', 'aria-label': 'Target gate' });
          const sliders = h('div.stack', { style: { gap: '0.25rem' } });
          const tbl = h('div');
          const fb = h('div.feedback', { 'aria-live': 'polite' });
          const extra = h('div');
          const outs = {};
          for (const [k, label] of [['w1', 'w₁'], ['w2', 'w₂'], ['b', 'b']]) {
            outs[k] = h('output');
            const r = h('input', { type: 'range', min: -2, max: 2, step: 0.1, value: w[k], 'aria-label': `Weight ${label}`, oninput: (e) => { w[k] = Math.round(+e.target.value * 10) / 10; search = null; draw(); } });
            outs[k].range = r;
            sliders.append(h('label.bl-slider', h('span.mono', label), r, outs[k]));
          }
          const searchBtn = h('button.btn.sm', { onclick: () => {
            const vals = range(9).map((i) => -2 + i * 0.5);
            let hits = 0, ex = null;
            for (const a of vals) for (const b of vals) for (const c of vals) {
              if (PTS.every(([x1, x2]) => (a * x1 + b * x2 + c > 0 ? 1 : 0) === TG[target](x1, x2))) { hits++; ex ||= [a, b, c]; }
            }
            search = { hits, ex, target };
            draw();
          } }, 'Try all 729 weight settings');
          body.append(h('div.split.fill', { style: { alignItems: 'stretch', minHeight: 0, gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)' } },
            h('div.stack', { style: { minHeight: 0 } }, fig, h('div.legend', h('span', h('span.swatch', { style: { background: 'var(--true)', borderRadius: '50%' } }), 'target 1'),
              h('span', h('span.swatch', { style: { background: 'var(--sheet)', border: '2px solid var(--false)', borderRadius: '50%' } }), 'target 0'),
              h('span', h('span.swatch', { style: { background: 'var(--true-bg)' } }), 'perceptron says 1'))),
            h('div.stack', { style: { minHeight: 0, gap: '0.45rem' } }, h('div.row', h('span.small.muted', 'Target gate:'), seg), sliders, tbl, fb, h('div.row', searchBtn), extra)));
          function plot() {
            const sx = (x) => 30 + (x + 0.5) * 130, sy = (y) => 290 - (y + 0.5) * 130;
            const svg = s('svg', { viewBox: '0 0 320 320', role: 'img', 'aria-label': 'Decision line of the perceptron' });
            const f = (p) => w.w1 * p[0] + w.w2 * p[1] + w.b;
            const box = [[-0.5, -0.5], [1.5, -0.5], [1.5, 1.5], [-0.5, 1.5]];
            const poly = [], cross = [];
            box.forEach((P, i) => {
              const Q = box[(i + 1) % 4];
              const fp = f(P), fq = f(Q);
              if (fp > 0) poly.push(P);
              if ((fp > 0) !== (fq > 0) && fp !== fq) { const t = fp / (fp - fq); const X = [P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]; poly.push(X); cross.push(X); }
            });
            svg.append(s('rect', { x: 30, y: 30, width: 260, height: 260, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.2 }));
            if (poly.length > 2) svg.append(s('polygon', { points: poly.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' '), fill: 'var(--true-bg)', stroke: 'none' }));
            for (const g of [0, 1]) {
              svg.append(s('line', { x1: sx(g), y1: 30, x2: sx(g), y2: 290, stroke: 'var(--rule)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
              svg.append(s('line', { x1: 30, y1: sy(g), x2: 290, y2: sy(g), stroke: 'var(--rule)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
              svg.append(s('text', { x: sx(g), y: 306, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)', text: String(g) }));
              svg.append(s('text', { x: 20, y: sy(g) + 4, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)', text: String(g) }));
            }
            svg.append(s('text', { x: 296, y: 306, 'text-anchor': 'end', 'font-size': 12, 'font-style': 'italic', fill: 'var(--ink-2)', text: 'x₁' }));
            svg.append(s('text', { x: 36, y: 24, 'font-size': 12, 'font-style': 'italic', fill: 'var(--ink-2)', text: 'x₂' }));
            if (cross.length === 2) svg.append(s('line', { x1: sx(cross[0][0]), y1: sy(cross[0][1]), x2: sx(cross[1][0]), y2: sy(cross[1][1]), stroke: 'var(--accent)', 'stroke-width': 2.6 }));
            for (const [x1, x2] of PTS) {
              const want = TG[target](x1, x2);
              const got = Math.round(f([x1, x2]) * 1000) / 1000 > 0 ? 1 : 0;
              if (got !== want) svg.append(s('circle', { cx: sx(x1), cy: sy(x2), r: 19, fill: 'none', stroke: 'var(--false)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
              svg.append(s('circle', { cx: sx(x1), cy: sy(x2), r: 12, fill: want ? 'var(--true)' : 'var(--sheet)', stroke: want ? 'var(--true)' : 'var(--false)', 'stroke-width': 3 }));
              svg.append(s('text', { x: sx(x1), y: sy(x2) + 4.5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: want ? 'var(--sheet)' : 'var(--false)', text: String(want) }));
            }
            return svg;
          }
          function draw() {
            rc(seg, ...Object.keys(TG).map((k) => h('button', { 'aria-pressed': String(k === target), onclick: () => { target = k; search = null; draw(); } }, k)));
            for (const k of ['w1', 'w2', 'b']) { outs[k].textContent = w[k].toFixed(1); outs[k].range.value = w[k]; }
            rc(fig, plot());
            let right = 0;
            const rows = PTS.map(([x1, x2]) => {
              const sum = Math.round((w.w1 * x1 + w.w2 * x2 + w.b) * 1000) / 1000;
              const got = sum > 0 ? 1 : 0, want = TG[target](x1, x2);
              if (got === want) right++;
              return h('tr', h('td', String(x1)), h('td', String(x2)), h('td.mono', sum.toFixed(1)), h('td', h('b', String(got))), h('td', String(want)), h('td', { class: got === want ? 'ok' : 'bad' }, got === want ? '✓' : '✗'));
            });
            rc(tbl, h('table.tt.bl-sm', { style: { width: '100%' } },
              h('thead', h('tr', h('th', 'x₁'), h('th', 'x₂'), h('th', 'w₁x₁ + w₂x₂ + b'), h('th', 'output'), h('th', target), h('th', ''))), h('tbody', rows)));
            fb.style.color = 'var(--ink)';
            if (right === 4) { fb.className = 'feedback good'; fb.innerHTML = `<b>All 4 rows match.</b> This perceptron computes ${target}, with every 1 on the shaded side of the line.`; }
            else if (target === 'XOR') { fb.className = 'feedback bad'; fb.innerHTML = `<b>${right} of 4 rows match.</b> Keep trying, then press the search button. No straight line puts (0,1) and (1,0) on one side and (0,0) and (1,1) on the other.`; }
            else { fb.className = 'feedback bad'; fb.innerHTML = `<b>${right} of 4 rows match.</b> Points circled in red are on the wrong side. Moving the bias b slides the line without turning it.`; }
            const res = search && search.target === target ? search : null;
            const sres = res ? h('span.small', { html: res.hits ? `<b>${res.hits}</b> of 729 settings compute ${target}, for example w₁ = ${res.ex[0]}, w₂ = ${res.ex[1]}, b = ${res.ex[2]}.` : `<b>0</b> of 729 settings compute XOR. XOR is not <span class="term">linearly separable</span>.` }) : null;
            searchBtn.parentElement && rc(searchBtn.parentElement, searchBtn, sres);
            if (target === 'XOR') {
              rc(extra, ctx.rich('div.ai', String.raw`One neuron cannot compute XOR. This limit, made famous in 1969, slowed neural-network research for years. Two layers fix it. Hidden neuron \(h_1\) computes OR, \(h_2\) computes NAND, and the output neuron computes \(h_1\) AND \(h_2\), which equals \(x_1 \oplus x_2\). That is why deep networks have hidden layers.`));
            } else {
              rc(extra, ctx.rich('div.ai', String.raw`AND, OR, NAND and NOR are <span class="term">linearly separable</span>, so one neuron can compute each of them. Binary neural networks go the other way and restrict weights to \(\pm 1\), so a neuron becomes an XNOR gate plus a bit counter, which is cheap enough for phones and tiny chips.`));
            }
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: every input, every output',
        kind: 'code',
        file: 'truth_table_dnf.py',
        html: String.raw`<p class="muted small">This program evaluates the circuit \(f = xy + z'\) from slide 2 on all 8 inputs, prints its truth table, and builds the DNF from the 1-rows. Switch to <b>Trace</b> to watch the minterms collect.</p>`,
        fivew: {
          what: 'Runs a Boolean function on every combination of inputs, prints the truth table, and writes the disjunctive normal form by turning each 1-row into a minterm.',
          why: 'A circuit with n inputs has only 2ⁿ input rows, so a program can check all of them. This is the same recipe you follow by hand, written so a computer can repeat it without mistakes.',
          who: 'Hardware engineers verifying a design, test engineers writing exhaustive tests, and anyone generating a truth table for documentation.',
          where: 'Logic-synthesis tools, circuit simulators, unit tests for bit-manipulation code, and SAT solvers that reason about Boolean formulas.',
          when: 'Whenever the number of inputs is small enough to enumerate. Up to about 20 inputs (about a million rows) runs in seconds.',
        },
        lines: [
          ['from itertools import product', 'Imports <code>product</code> from Python\'s standard <code>itertools</code> module. <code>product</code> builds every combination of choices, which is exactly the list of rows of a truth table.'],
          ['def f(x, y, z):', 'Defines the circuit as a Python function of three bits. Each argument will be the integer 0 or 1. Nothing runs until the loop on line 7 calls it.'],
          ['    return (x & y) | (z ^ 1)', '<code>&amp;</code> is bitwise AND, <code>|</code> is bitwise OR, and <code>z ^ 1</code> flips one bit (0 becomes 1, 1 becomes 0), which is NOT for a single bit. So this line is \\(xy + z\'\\). We avoid <code>~z</code> because in Python <code>~1</code> is −2, not 0.'],
          ['', ''],
          ['minterms = []', 'An empty list that will collect one minterm string for each row where the output is 1.'],
          ['print("x y z | f")', 'Prints the header of the truth table so the columns are labeled.'],
          ['for x, y, z in product([0, 1], repeat=3):', '<code>product([0, 1], repeat=3)</code> yields the 8 tuples (0,0,0), (0,0,1), …, (1,1,1) in binary counting order, the same order as the rows of a truth table. Each tuple is unpacked into <code>x</code>, <code>y</code> and <code>z</code>.'],
          ['    out = f(x, y, z)', 'Runs the circuit on this row and stores the output bit. On the first row (0,0,0), <code>out</code> is 1 because \\(z\' = 1\\).'],
          ['    print(x, y, z, "|", out)', 'Prints one row of the truth table. <code>print</code> separates its arguments with spaces, so the output looks like <code>0 0 0 | 1</code>.'],
          ['    if out == 1:', 'Only the rows where the function is 1 contribute a minterm to the DNF. Rows with output 0 are skipped.'],
          ['        term = ""', 'Starts an empty string for this row\'s minterm. It will grow one literal at a time.'],
          ['        for name, bit in zip("xyz", (x, y, z)):', '<code>zip</code> pairs each variable name with its bit, giving ("x", x), ("y", y) and ("z", z). Looping over a string gives its characters one at a time.'],
          ['            term += name if bit else name + "\'"', 'This conditional expression adds the plain variable for a 1 bit and the variable with a prime (its complement) for a 0 bit. For row (0,1,0) the term becomes <code>x\'yz\'</code>.'],
          ['        minterms.append(term)', 'Adds the finished minterm to the list. Five rows have output 1, so the list ends with five minterms.'],
          ['print("DNF:", " + ".join(minterms))', '<code>" + ".join(...)</code> glues the minterms together with plus signs between them. The result is the DNF, five 3-literal terms, much longer than the original \\(xy + z\'\\). That gap is why we minimize.'],
        ],
        expected: "x y z | f\n0 0 0 | 1\n0 0 1 | 0\n0 1 0 | 1\n0 1 1 | 0\n1 0 0 | 1\n1 0 1 | 0\n1 1 0 | 1\n1 1 1 | 1\nDNF: x'y'z' + x'yz' + xy'z' + xyz' + xyz\n",
        tryIt: 'Change the <code>return</code> line to the majority function <code>(x &amp; y) | (x &amp; z) | (y &amp; z)</code> and check that the DNF matches the one on the normal-forms slide. Then try <code>x ^ y ^ z</code>.',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: a ripple-carry adder in Python',
        kind: 'code',
        file: 'ripple_carry.py',
        html: String.raw`<p class="muted small">A <span class="term">full adder</span> written with bitwise gates, chained into a <span class="term">ripple-carry adder</span>, and checked against Python's own addition. In <b>Trace</b> mode, watch <code>carry</code> ripple from column to column.</p>`,
        fivew: {
          what: 'Builds a full adder from XOR, AND and OR, chains four of them into a 4-bit adder, and checks three sums against ordinary integer addition.',
          why: 'It shows that addition, the most basic thing a computer does, is nothing more than gates wired together, and it models the hardware column by column.',
          who: 'Computer architects, hardware-verification engineers who model circuits before building them, and students of how processors work.',
          where: 'Every arithmetic unit in every CPU and GPU. Simulators like this one are used to test circuit designs before they are manufactured.',
          when: 'When you want to understand or test a hardware design in software. In normal programs you just write a + b, and the hardware does exactly this for you.',
        },
        lines: [
          ['def full_adder(a, b, cin):', 'Defines a full adder. It takes two number bits <code>a</code> and <code>b</code> and the carry <code>cin</code> coming from the column to the right.'],
          ['    s = a ^ b ^ cin', 'The sum bit is the XOR of all three inputs, which is 1 when an odd number of inputs are 1. For 1 + 1 + 0 this gives 0.'],
          ['    cout = (a & b) | (cin & (a ^ b))', 'The carry-out is 1 when both number bits are 1 (\\(ab\\), called generate), or when exactly one is 1 and a carry arrives (\\(c_{in}(a \\oplus b)\\), called propagate). This is the full-adder circuit from the simulator lab.'],
          ['    return s, cout', 'Returns both output bits as a tuple. Together they form the 2-bit answer: 1 + 1 + 1 = 3 = 11 in binary returns <code>(1, 1)</code>.'],
          ['', ''],
          ['def ripple_add(x, y):', 'Adds two equal-length bit strings, such as "1011" and "0110", the way the hardware does, with one full adder per column.'],
          ['    carry, out = 0, ""', 'The first column has no incoming carry, so <code>carry</code> starts at 0 (like the c0 = 0 wire in the lab). <code>out</code> collects the sum bits.'],
          ['    for a, b in zip(reversed(x), reversed(y)):', '<code>reversed</code> walks each string from the right, because addition starts in the rightmost (least significant) column. <code>zip</code> pairs the two bits of each column.'],
          ['        s, carry = full_adder(int(a), int(b), carry)', '<code>int(a)</code> turns the character "1" into the number 1. The old carry goes in, and the new carry comes out and replaces it. This line is the ripple, because each column waits for the previous carry.'],
          ['        out = str(s) + out', 'Puts the new sum bit in front of the bits found so far, since we are moving right to left.'],
          ['    return str(carry) + out', 'After the last column, the final carry becomes the extra leftmost bit. Adding two 4-bit numbers can need 5 bits.'],
          ['', ''],
          ['for m, n in [(11, 6), (15, 1), (9, 3)]:', 'Three test cases, written in decimal so you can check them in your head. (15, 1) is interesting because the carry ripples through every column.'],
          ['    x, y = f"{m:04b}", f"{n:04b}"', 'The format code <code>04b</code> writes a number in binary (<code>b</code>), padded to 4 digits with leading zeros (<code>04</code>). So 6 becomes "0110".'],
          ['    total = ripple_add(x, y)', 'Runs the simulated circuit. For 11 + 6 the result is the 5-bit string "10001".'],
          ['    print(x, "+", y, "=", total, int(total, 2) == m + n)', '<code>int(total, 2)</code> reads the bit string as a base-2 number. Comparing it with <code>m + n</code> checks the circuit against Python\'s own addition, so every line should end in <code>True</code>.'],
        ],
        expected: '1011 + 0110 = 10001 True\n1111 + 0001 = 10000 True\n1001 + 0011 = 01100 True\n',
        tryIt: 'Add the pair <code>(13, 13)</code> and predict the 5-bit answer before you run it. Then break the carry by changing <code>|</code> to <code>&amp;</code> on line 3 and watch the checks fail.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: building reliable logic',
        kind: 'design',
        html: String.raw`<p class="muted small">Hardware engineers and programmers who manipulate bits follow the same habits. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Minimize the logic before you build it',
            html: '<p>The DNF read off a truth table is correct but wasteful. Run it through a Karnaugh map or the algebra laws first. Fewer gates mean less chip area, a shorter path for signals (so a faster clock) and less power. In code, a simpler expression is also easier to read and test.</p><p>Logic-synthesis tools do this automatically for millions of gates, using the same laws you learned here.</p>',
            bad: '# read straight off the table: 3 terms, 9 literals\nf = (x&y&z) | (x&y&(1-z)) | (x&(1-y)&z)',
            good: '# same truth table after a K-map\nf = (x & y) | (x & z)\n# distributive law: f = x & (y | z)',
          },
          {
            name: 'Test every input combination',
            html: '<p>A circuit with \\(n\\) inputs has only \\(2^n\\) input rows. For \\(n\\) up to about 20 a program can check all of them in seconds, and such an exhaustive test proves the circuit correct. Spot checks with two or three hand-picked inputs miss the one row where the bug lives.</p>',
            bad: 'assert full_adder(1, 1, 0) == (0, 1)\nassert full_adder(0, 0, 0) == (0, 0)\n# 6 rows never tested',
            good: 'from itertools import product\nfor a, b, c in product([0, 1], repeat=3):\n    s, cout = full_adder(a, b, c)\n    assert 2 * cout + s == a + b + c',
          },
          {
            name: 'Build big circuits from small verified blocks',
            html: '<p>Verify a half adder, build a full adder from two of them, then chain full adders into an \\(n\\)-bit adder. Each block is small enough to test exhaustively, and the big circuit inherits that confidence. Real chips are designed as a hierarchy of blocks in exactly this way.</p>',
            good: 'def half_adder(a, b):\n    return a ^ b, a & b\ndef full_adder(a, b, c):\n    s1, c1 = half_adder(a, b)\n    s, c2 = half_adder(s1, c)\n    return s, c1 | c2',
          },
          {
            name: 'Convert to NAND or NOR with De Morgan',
            html: '<p>Factories prefer one gate type, and a CMOS NAND gate needs only 4 transistors. Any AND-OR circuit becomes a NAND-NAND circuit by double negation: \\(xy + zw = ((xy)\'(zw)\')\'\\). Same function, one kind of gate.</p>',
            good: 'def nand(a, b):\n    return 1 - (a & b)\n# AND-OR form:  f = x·y + z·w\nf = nand(nand(x, y), nand(z, w))  # NAND-NAND',
          },
          {
            name: 'Name signals for what they mean',
            html: '<p>A wire called <code>t2</code> tells a reviewer nothing. A wire called <code>carry_in</code> tells them where it comes from and what it does. Hardware description languages and Python code both benefit from names that match the circuit diagram.</p>',
            bad: 't1 = a ^ b\nt2 = t1 ^ c\nt3 = (a & b) | (c & t1)',
            good: 'propagate = a ^ b\nsum_bit = propagate ^ carry_in\ncarry_out = (a & b) | (carry_in & propagate)',
          },
          {
            name: 'Mind the propagation delay',
            html: '<p>Every gate takes a little time to settle, and delays add up along the longest path (the <b>critical path</b>). In a ripple-carry adder the carry crosses every column, so an \\(n\\)-bit adder needs about \\(2n\\) gate delays. Carry-lookahead adders compute every carry directly from the propagate and generate signals, trading more gates for much less delay.</p>',
            bad: '# ripple: c2 must wait for c1 to settle\nc1 = g0 | (p0 & c0)\nc2 = g1 | (p1 & c1)',
            good: '# lookahead: every carry from P, G at once\nc1 = g0 | (p0 & c0)\nc2 = g1 | (p1 & g0) | (p1 & p0 & c0)',
          },
          {
            name: 'Use bitwise operators correctly in code',
            html: '<p>For bits stored as integers, <code>&amp;</code>, <code>|</code> and <code>^</code> work bit by bit. Two traps catch everyone. First, <code>~1</code> is −2 in Python, so flip one bit with <code>bit ^ 1</code> or <code>1 - bit</code>. Second, <code>&amp;</code> and <code>|</code> bind tighter than comparisons, so always put comparisons in parentheses. The same rule applies to filters in NumPy and pandas.</p>',
            bad: 'flipped = ~bit            # ~1 == -2\nboth = a > 0 & b > 0      # means a > (0 & b) > 0',
            good: 'flipped = bit ^ 1         # 1 -> 0, 0 -> 1\nboth = (a > 0) & (b > 0)',
          },
        ],
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Worked example: minimizing with a Karnaugh map',
        kind: 'example',
        id: 'ex-kmap',
        problem: String.raw`<p>A function \(f(a, b, c)\) is 1 exactly for the minterms \(m_0, m_2, m_4, m_5, m_6\) — that is, \((a, b, c)\) is one of \(000, 010, 100, 101, 110\). Use a Karnaugh map to find a minimal sum of products for \(f\).</p>`,
        objective: 'Use a Karnaugh map to merge neighboring 1s into the largest possible groups and read off a minimal sum of products.',
        data: EX_KMAP_DATA,
        steps: kmapStepsFor(EX_KMAP_DATA, 'Predict: the five 1s are placed. What is the largest group you can circle first, and which single literal will that group give?'),
        answer: "c′ + ab′",
        verify() {
          const fromSet = (m) => (EX_KMAP_ONES.includes(m) ? 1 : 0);
          const fromExpr = (m) => { const a = m >> 2, b = (m >> 1) & 1, c = m & 1; return (!c || (a && !b)) ? 1 : 0; };
          const allRows = range(8).every((m) => fromSet(m) === fromExpr(m));
          const quadOk = EX_KMAP_QUAD.every((m) => (m & 1) === 0 && EX_KMAP_ONES.includes(m));
          const pairOk = EX_KMAP_PAIR.every((m) => (m >> 2) === 1 && ((m >> 1) & 1) === 0 && EX_KMAP_ONES.includes(m));
          return allRows && quadOk && pairOk;
        },
        variants: [
          {
            label: 'Variant: one group of 4',
            problem: String.raw`<p>A different function \(g(a, b, c)\) is 1 exactly for the minterms \(m_1, m_3, m_5, m_7\) — that is, \((a, b, c)\) is one of \(001, 011, 101, 111\). Use a Karnaugh map to find a minimal sum of products for \(g\).</p>`,
            data: EX_KMAP_VAR_DATA,
            steps: kmapStepsFor(EX_KMAP_VAR_DATA, 'Predict: the four 1s all sit where c = 1. Will the minimal form need one term or several, and which variables will survive in it?'),
            answer: 'c',
            verify() {
              const ones = [1, 3, 5, 7];
              const rowsOk = range(8).every((m) => ((m & 1) === 1) === ones.includes(m));
              const cubeCells = range(8).filter((m) => (m & 1) === 1);
              return rowsOk && cubeCells.join(',') === '1,3,5,7' && ones.length === 4;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_KMAP_DATA;
          const inGroup = (gi, m) => step.groups > gi && !!D.groups[gi] && D.groups[gi].cells.includes(m);
          const cell = (r, c) => {
            const m = EX_KMAP_CELL(r, c);
            const v = D.ones.includes(m) ? 1 : 0;
            const st = {};
            if (inGroup(0, m)) { st.border = '3px dashed var(--accent)'; st.background = 'var(--accent-2)'; }
            if (inGroup(1, m)) { st.border = '3px solid var(--true)'; st.background = 'var(--true-bg)'; if (inGroup(0, m)) st.boxShadow = 'inset 0 0 0 3px var(--accent)'; }
            const cls = [inGroup(0, m) ? 'grp1' : '', inGroup(1, m) ? 'grp2' : ''].join(' ').trim();
            return h('td', { class: cls, style: st },
              h('div', { style: { fontSize: '0.62rem', color: 'var(--ink-3)' } }, `m${m}`),
              h('div', { style: { fontSize: '1.1rem', fontWeight: step.plotted && v ? 700 : 400 } }, step.plotted ? String(v) : '·'));
          };
          const table = h('table.tt',
            h('thead', h('tr', h('th', 'a \\ bc'), GRAY.map((g) => h('th', g.toString(2).padStart(2, '0'))))),
            h('tbody', [0, 1].map((r) => h('tr', h('th', String(r)), GRAY.map((_, c) => cell(r, c))))));
          const sop = sopStr(D.terms, D.names);
          const checkStrip = step.check ? h('table.tt.bl-sm',
            h('thead', h('tr', h('th.l', 'abc'), range(8).map((m) => h('th', m.toString(2).padStart(3, '0'))))),
            h('tbody',
              h('tr', h('th.l', 'f (minterms)'), range(8).map((m) => h('td', String(D.ones.includes(m) ? 1 : 0)))),
              h('tr', h('th.l', sop.replace(/'/g, '′')), range(8).map((m) => h('td', String(sopValue(D.terms, m))))))) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center' } },
            table,
            h('p.small.mono', `f(a, b, c) = Σm(${D.ones.join(', ')})`),
            ...D.groups.map((g, gi) => (step.groups > gi ? h('p.small', `${gi === 0 ? 'Dashed' : 'Solid'} outline (grp${gi + 1}): the ${sizeWord(g.cells.length)} ${listJoin(g.cells.map((m) => 'm' + m))} — ${groupFixed(g).fixed.map((f) => `${f.name} = ${f.val}`).join(' and ')} in every cell, giving ${termStr(g, D.names).replace(/'/g, '′')}.`) : null)),
            step.expr ? h('div.big-math', { html: String.raw`\(f = ${sop}\)` }) : null,
            checkStrip,
            step.answer ? h('div.ex-answer', step.banner) : null));
        },
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Worked example: evaluating a ripple-carry adder',
        kind: 'example',
        id: 'ex-adder-eval',
        problem: String.raw`<p>The ripple-carry adder of this module adds \(1011_2\) (eleven) and \(0110_2\) (six). Evaluate it bit by bit from the least significant bit, tracking every carry, the way the circuit does.</p>`,
        objective: 'Evaluate a ripple-carry adder one column at a time from the least significant bit, tracking every carry, until the full sum including the final carry-out is known.',
        data: EX_ADD_DATA,
        steps: adderStepsFor(EX_ADD_DATA, 'Predict: bit 3 sends out one more carry, but the drawn adder has no fifth column. Where does that last carry end up in the final answer?'),
        answer: '10001',
        verify() {
          const sumOk = (0b1011 + 0b0110) === 17 && parseInt('10001', 2) === 17;
          let carry = 0, bits = '';
          for (let i = 0; i < 4; i++) {
            const a = (0b1011 >> i) & 1, b = (0b0110 >> i) & 1;
            bits = String(a ^ b ^ carry) + bits;
            carry = (a + b + carry) >= 2 ? 1 : 0;
          }
          bits = String(carry) + bits;
          const chainOk = EX_ADD_COLS.every((c, i) => c.cin === (i === 0 ? 0 : EX_ADD_COLS[i - 1].cout));
          const colsOk = EX_ADD_COLS.every((c, i) => {
            const a = (0b1011 >> i) & 1, b = (0b0110 >> i) & 1;
            return c.a === a && c.b === b && c.sum === (a ^ b ^ c.cin) && c.cout === ((a + b + c.cin) >= 2 ? 1 : 0);
          });
          return sumOk && bits === '10001' && chainOk && colsOk;
        },
        variants: [
          {
            label: 'Variant: a carry in every column',
            problem: String.raw`<p>The same ripple-carry adder now adds \(1111_2\) (fifteen) and \(0001_2\) (one). Evaluate it bit by bit from the least significant bit, tracking every carry, the way the circuit does.</p>`,
            data: EX_ADD_VAR_DATA,
            steps: adderStepsFor(EX_ADD_VAR_DATA, 'Predict: adding 1 to 1111 has already carried through bits 0, 1 and 2. Will bit 3 carry out too, and what single pattern will the sum bits show?'),
            answer: '10000',
            verify() {
              let carry = 0, bits = '';
              for (let i = 0; i < 4; i++) {
                const a = (0b1111 >> i) & 1, b = (0b0001 >> i) & 1;
                bits = String(a ^ b ^ carry) + bits;
                carry = (a + b + carry) >= 2 ? 1 : 0;
              }
              bits = String(carry) + bits;
              const chainOk = EX_ADD_VAR_DATA.cols.every((c, i) => c.cin === (i === 0 ? 0 : EX_ADD_VAR_DATA.cols[i - 1].cout) && c.cout === 1);
              return (0b1111 + 0b0001) === 16 && parseInt('10000', 2) === 16 && bits === '10000' && chainOk;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_ADD_DATA;
          const cols = D.cols;
          const POS = [4, 3, 2, 1, 0]; // display order, most significant column first
          const active = step.bits >= 1 && step.bits <= 4 ? step.bits - 1 : step.bits === 5 ? 4 : -1;
          const cur = (i) => (i === active ? 'cur' : '');
          const carryIn = (i) => (i === 4 ? cols[3].cout : cols[i].cin);
          const carryShown = (i) => (i === 4 ? step.bits >= 5 : i <= step.bits);
          const row = (label, fn) => h('tr', h('th.l', label), POS.map((i) => h('td', { class: cur(i) }, fn(i))));
          const table = h('table.tt',
            h('thead', h('tr', h('th', ''), POS.map((i) => h('th', { class: cur(i) }, `bit ${i}`)))),
            h('tbody',
              row('carry in', (i) => (carryShown(i) ? String(carryIn(i)) : '·')),
              row(`a = ${D.A}`, (i) => (i === 4 ? '—' : String(cols[i].a))),
              row(`b = ${D.B}`, (i) => (i === 4 ? '—' : String(cols[i].b))),
              row('sum', (i) => (i === 4 ? (step.bits >= 5 ? String(cols[3].cout) : '·') : i < step.bits ? String(cols[i].sum) : '·'))));
          const col = step.bits >= 1 && step.bits <= 4 ? cols[step.bits - 1] : null;
          stage.append(h('div.stack', { style: { alignItems: 'center' } },
            table,
            step.bits === 0 ? h('p.small', 'Columns are numbered from bit 0 at the right. c0 = 0: no carry enters the first column.') : null,
            col ? h('p.small.mono', `bit ${col.i}: ${col.a} + ${col.b} + ${col.cin} = ${col.cout}${col.sum} in binary — write s${col.i} = ${col.sum}, carry c${col.i + 1} = ${col.cout} to the next column`) : null,
            step.bits === 5 && !step.answer ? h('p.small.mono', `c4 = ${cols[3].cout} becomes s4 = ${cols[3].cout}: the result is ${D.answer}`) : null,
            step.answer ? h('p.small', `Check: ${D.A} is ${parseInt(D.A, 2)} and ${D.B} is ${parseInt(D.B, 2)}, and ${parseInt(D.A, 2)} + ${parseInt(D.B, 2)} = ${parseInt(D.answer, 2)}, which is ${D.answer} in binary.`) : null,
            step.answer ? h('div.ex-answer', step.banner) : null));
        },
      },
      /* ---------------------------------------------------------------- 17 */
      {
        title: 'Worked example: from a truth table to a sum of minterms',
        kind: 'example',
        id: 'ex-truth-table-sop',
        problem: String.raw`<p>A function \(f(x, y, z)\) is given by its truth table: \(f\) is 1 exactly on the input rows \(010\), \(011\), \(101\) and \(111\), and 0 on the other four rows. Write the canonical sum of minterms for \(f\), reading one minterm off each 1-row.</p>`,
        objective: 'Turn a truth table into the canonical sum of minterms by writing one full product term for each row where the function is 1.',
        data: EX_TT,
        steps: ttStepsFor(EX_TT, 'Predict: every 1-row now has its minterm written beside it. When the minterms are joined with + signs, how many terms and how many literals will the canonical form have?'),
        answer: "x′yz′ + x′yz + xy′z + xyz",
        verify() {
          const ones = [2, 3, 5, 7];
          const fromTerms = range(8).every((m) => sopValue(EX_TT.terms, m) === (ones.includes(m) ? 1 : 0));
          const parsed = parseSOP("x'yz' + x'yz + xy'z + xyz", ['x', 'y', 'z']);
          const fromParse = !!parsed && range(8).every((m) => sopValue(parsed, m) === (ones.includes(m) ? 1 : 0));
          const eachFiresOnce = EX_TT.terms.every((t) => range(8).filter((m) => sopValue([t], m) === 1).length === 1);
          return fromTerms && fromParse && eachFiresOnce && EX_TT.terms.length === 4;
        },
        variants: [
          {
            label: 'Variant: a single 1-row',
            problem: String.raw`<p>A different function \(g(x, y, z)\) is 1 only on the single input row \(110\) and 0 on the other seven rows. Write the canonical sum of minterms for \(g\), reading one minterm off each 1-row.</p>`,
            data: EX_TT_VAR,
            steps: ttStepsFor(EX_TT_VAR, 'Predict: this function has just one 1-row and its minterm is written. How many terms will its canonical sum of minterms have, and can a canonical form for a nonzero function ever have fewer?'),
            answer: "xyz′",
            verify() {
              const fromTerms = range(8).every((m) => sopValue(EX_TT_VAR.terms, m) === (m === 6 ? 1 : 0));
              const parsed = parseSOP("xyz'", ['x', 'y', 'z']);
              const fromParse = !!parsed && range(8).every((m) => sopValue(parsed, m) === (m === 6 ? 1 : 0));
              return fromTerms && fromParse && EX_TT_VAR.terms.length === 1;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_TT;
          const table = h('table.tt.bl-sm',
            h('thead', h('tr', h('th', 'x'), h('th', 'y'), h('th', 'z'), h('th', 'f'), h('th.l', 'minterm'))),
            h('tbody', range(8).map((m) => {
              const j = D.ones.indexOf(m);
              const shown = j >= 0 && j < step.shown;
              return h('tr', { class: shown ? 'hit' : '' },
                bitsOf(m, 3).map((b) => h('td', String(b))),
                h('td', h('b', String(j >= 0 ? 1 : 0))),
                h('td.l.mono', j >= 0 ? (shown ? prime(D.terms[j], D.names) : '·') : '—'));
            })));
          const strip = step.phase >= 2 ? h('table.tt.bl-sm',
            h('thead', h('tr', h('th.l', 'xyz'), range(8).map((m) => h('th', bits3(m))))),
            h('tbody',
              h('tr', h('th.l', 'f (from the table)'), range(8).map((m) => h('td', String(D.ones.includes(m) ? 1 : 0)))),
              h('tr', h('th.l', 'the sum of minterms'), range(8).map((m) => h('td', String(sopValue(D.terms, m))))))) : null;
          stage.append(h('div.stack', { style: { alignItems: 'center' } },
            table,
            step.shown > 0 ? h('p.small.mono', `minterms so far: ${D.terms.slice(0, step.shown).map((t) => prime(t, D.names)).join(', ')}`) : null,
            step.phase >= 1 ? h('div.big-math', `f = ${D.terms.map((t) => prime(t, D.names)).join(' + ')}`) : null,
            strip,
            step.answer ? h('div.ex-answer', step.banner) : null));
        },
      },
      /* ---------------------------------------------------------------- 18 */
      {
        title: 'Worked example: simplifying an expression law by law',
        kind: 'example',
        id: 'ex-simplify-laws',
        problem: String.raw`<p>Simplify \(f = xy + xy' + x'z\) as far as the laws of Boolean algebra allow. Name the law used at every step, and confirm at the end that the simplified expression agrees with the original on every input row.</p>`,
        objective: 'Simplify a Boolean expression by applying one named algebra law at a time until no law can shrink it further, then confirm the equivalence on every truth-table row.',
        data: EX_SIMP,
        steps: simpStepsFor(EX_SIMP, 'Predict: the expression is now 1 · (x + z). A single law removes the leading 1 — which law is it, and what final two-literal expression remains?', 5),
        answer: 'x + z',
        verify() {
          const names = ['x', 'y', 'z'];
          const orig = parseSOP("xy + xy' + x'z", names), fin = parseSOP('x + z', names);
          if (!orig || !fin) return false;
          const agree = range(8).every((m) => sopValue(orig, m) === sopValue(fin, m));
          const direct = range(8).every((m) => sopValue(fin, m) === (((m >> 2) & 1) | (m & 1)));
          return agree && direct && EX_SIMP.chain.length === 7 && EX_SIMP.chain[6][0] === 'x + z';
        },
        variants: [
          {
            label: 'Variant: idempotent first',
            problem: String.raw`<p>Simplify \(f = xy + xy + x'z' + z'\) as far as the laws of Boolean algebra allow. Name the law used at every step, and confirm at the end that the simplified expression agrees with the original on every input row.</p>`,
            data: EX_SIMP_VAR,
            steps: simpStepsFor(EX_SIMP_VAR, 'Predict: in xy + x′z′ + z′ one term is redundant, because a shorter term already covers every row it covers. Which term disappears next, and which law removes it?', 1),
            answer: "xy + z′",
            verify() {
              const names = ['x', 'y', 'z'];
              const orig = parseSOP("xy + xy + x'z' + z'", names), fin = parseSOP("xy + z'", names);
              if (!orig || !fin) return false;
              const agree = range(8).every((m) => sopValue(orig, m) === sopValue(fin, m));
              const direct = range(8).every((m) => { const x = (m >> 2) & 1, y = (m >> 1) & 1, z = m & 1; return sopValue(fin, m) === ((x & y) | (1 - z)); });
              return agree && direct && EX_SIMP_VAR.chain.length === 3 && EX_SIMP_VAR.chain[2][0] === "xy + z′";
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_SIMP;
          const ladder = h('div.stack', { style: { gap: '0.3rem', minWidth: 'min(26rem, 100%)' } },
            D.chain.slice(0, step.shown + 1).map(([expr, law], i) => h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 7.5rem', gap: '0.6rem', alignItems: 'baseline', padding: '0.22rem 0.5rem', borderRadius: '0.3rem', background: i === step.shown ? 'var(--accent-2)' : 'var(--sheet)', border: '1px solid var(--rule)' } },
              h('span.mono', { style: { fontSize: '1.02rem', fontWeight: i === step.shown ? 700 : 400 } }, (i === 0 ? 'f = ' : '= ') + expr),
              h('span.small.muted', i === 0 ? 'start' : `${law} law`))));
          let strip = null;
          if (step.check) {
            const orig = parseSOP(D.chain[0][0].replace(/′/g, "'"), D.names), fin = parseSOP(D.fin.replace(/′/g, "'"), D.names);
            strip = h('table.tt.bl-sm',
              h('thead', h('tr', h('th.l', 'xyz'), range(8).map((m) => h('th', bits3(m))))),
              h('tbody',
                h('tr', h('th.l', 'original'), range(8).map((m) => h('td', String(sopValue(orig, m))))),
                h('tr', h('th.l', D.fin), range(8).map((m) => h('td', String(sopValue(fin, m)))))));
          }
          stage.append(h('div.stack', { style: { alignItems: 'center' } },
            ladder,
            strip,
            step.answer ? h('div.ex-answer', step.banner) : null));
        },
      },
      /* ---------------------------------------------------------------- 16 */
      {
        title: 'Practice: Boolean algebra and circuits',
        kind: 'practice',
        html: String.raw`<p class="muted small">Type expressions with <code>'</code> for NOT and <code>+</code> for OR, and write AND by putting letters side by side, for example <code>xy + x'z</code>. Any equally small correct answer is accepted.</p>`,
        gens: [
          {
            label: 'Evaluate a circuit',
            make(R) {
              const T = [
                { tex: "(x + y)z'", parts: [['x + y', (x, y) => x | y], ["z'", (x, y, z) => 1 - z], ["(x + y)z'", (x, y, z) => (x | y) & (1 - z)]] },
                { tex: "x'y + yz", parts: [["x'", (x) => 1 - x], ["x'y", (x, y) => (1 - x) & y], ['yz', (x, y, z) => y & z], ["x'y + yz", (x, y, z) => ((1 - x) & y) | (y & z)]] },
                { tex: "(xy)' + z", parts: [['xy', (x, y) => x & y], ["(xy)'", (x, y) => 1 - (x & y)], ["(xy)' + z", (x, y, z) => (1 - (x & y)) | z]] },
                { tex: String.raw`x \oplus yz`, parts: [['yz', (x, y, z) => y & z], [String.raw`x \oplus yz`, (x, y, z) => x ^ (y & z)]] },
                { tex: "(x + y')(y + z)", parts: [["y'", (x, y) => 1 - y], ["x + y'", (x, y) => x | (1 - y)], ['y + z', (x, y, z) => y | z], ["(x + y')(y + z)", (x, y, z) => (x | (1 - y)) & (y | z)]] },
                { tex: "((x + y)' + z)'", parts: [['x + y', (x, y) => x | y], ["(x + y)'", (x, y) => 1 - (x | y)], ["(x + y)' + z", (x, y, z) => (1 - (x | y)) | z], ["((x + y)' + z)'", (x, y, z) => 1 - ((1 - (x | y)) | z)]] },
                { tex: "xy' + x'z", parts: [["y'", (x, y) => 1 - y], ["xy'", (x, y) => x & (1 - y)], ["x'z", (x, y, z) => (1 - x) & z], ["xy' + x'z", (x, y, z) => (x & (1 - y)) | ((1 - x) & z)]] },
              ];
              const t = R.pick(T);
              const x = R.int(0, 1), y = R.int(0, 1), z = R.int(0, 1);
              const ans = t.parts[t.parts.length - 1][1](x, y, z);
              return {
                prompt: String.raw`A circuit computes \(f = ${t.tex}\). What does it output when \(x = ${x}\), \(y = ${y}\) and \(z = ${z}\)?`,
                options: ['0', '1'],
                answer: String(ans),
                hint: 'work from the innermost part outwards, one gate at a time.',
                solution: String.raw`Evaluate one gate at a time, innermost first. ${t.parts.map(([tx, fn]) => String.raw`\(${tx} = ${fn(x, y, z)}\)`).join(', then ')}. So \(f = ${ans}\).`,
              };
            },
          },
          {
            label: 'Minterms from a truth table',
            make(R) {
              const ones = R.sample(range(8), R.int(2, 5)).sort((a, b) => a - b);
              const names = ['x', 'y', 'z'];
              const row = (lab, fn) => `<tr><th>${lab}</th>${range(8).map((m) => `<td>${fn(m)}</td>`).join('')}</tr>`;
              const table = `<table class="tt" style="margin-top:0.4rem">${row('x', (m) => m >> 2)}${row('y', (m) => (m >> 1) & 1)}${row('z', (m) => m & 1)}${row('f', (m) => `<b>${ones.includes(m) ? 1 : 0}</b>`)}</table>`;
              return {
                prompt: `Which minterm numbers make up the DNF of this function? Type them as a set, like {1, 4}.${table}`,
                answer: ones,
                format: 'set',
                hint: 'read each column with f = 1 as a binary number xyz.',
                solution: String.raw`The 1-columns are ${ones.map((m) => `\\(${m.toString(2).padStart(3, '0')}_2 = ${m}\\)`).join(', ')}. So \(f = \Sigma m(${ones.join(', ')}) = ${ones.map((m) => termStr(minterm(m, 3), names)).join(' + ')}\).`,
              };
            },
          },
          {
            label: 'Minimal sum of products',
            make(R) {
              const n = R.chance(0.35) ? 4 : 3;
              const names = n === 4 ? ['w', 'x', 'y', 'z'] : ['x', 'y', 'z'];
              const N = 1 << n;
              let ones;
              do { ones = R.sample(range(N), n === 4 ? R.int(4, 9) : R.int(2, 6)).sort((a, b) => a - b); } while (minimize(n, ones).terms.length === ones.length && R.chance(0.7));
              const res = minimize(n, ones);
              const lits = res.terms.reduce((a, t) => a + t.lits, 0);
              const ans = sopStr(res.terms, names);
              const R4 = n === 4 ? [0, 1, 3, 2] : [0, 1];
              const kmap = `<table class="tt bl-pk" style="margin-top:0.35rem"><tr><th>${n === 4 ? 'wx \\ yz' : 'x \\ yz'}</th>${GRAY.map((g) => `<th>${g.toString(2).padStart(2, '0')}</th>`).join('')}</tr>${R4.map((r) => `<tr><th>${n === 4 ? r.toString(2).padStart(2, '0') : r}</th>${GRAY.map((g) => { const m = (r << 2) | g; return `<td>${ones.includes(m) ? '<b>1</b>' : '<span class="muted">0</span>'}</td>`; }).join('')}</tr>`).join('')}</table>`;
              return {
                prompt: String.raw`Find a minimal sum of products for \(f(${names.join(', ')}) = \Sigma m(${ones.join(', ')})\). Type it like <code>xy + x'z</code>.${kmap}`,
                answer: ans,
                answerText: ans,
                check: (input) => {
                  const terms = parseSOP(input, names);
                  if (!terms) return false;
                  for (let m = 0; m < N; m++) if (sopValue(terms, m) !== (ones.includes(m) ? 1 : 0)) return false;
                  const used = terms.filter((t) => !t.conflict);
                  const tl = used.reduce((a, t) => a + t.lits, 0);
                  return used.length <= res.terms.length && tl <= lits;
                },
                hint: 'circle the largest power-of-2 rectangles of 1s; edges wrap around.',
                solution: `Circle the largest groups on the Gray-code map. Each group keeps only the variables that stay constant inside it. ${res.terms.map((t) => `{${t.cells.map((m) => 'm' + m).join(', ')}} gives \\(${termStr(t, names)}\\)`).join('; ')}${res.terms.some((t) => t.cells.length === 1) ? ' (a lone cell has no neighboring 1, so it keeps every variable)' : ''}. Minimal answer: \\(f = ${ans}\\), with ${res.terms.length} term${res.terms.length === 1 ? '' : 's'} and ${lits} literal${lits === 1 ? '' : 's'}.`,
              };
            },
          },
          {
            label: 'Adders',
            make(R) {
              if (R.chance(0.45)) {
                const a = R.int(0, 1), b = R.int(0, 1), c = R.int(0, 1);
                const t = a + b + c;
                return {
                  prompt: String.raw`A full adder receives \(a = ${a}\), \(b = ${b}\) and carry-in \(c_{in} = ${c}\). What are the sum bit \(S\) and the carry-out \(C_{out}\)? Type them as <code>S, Cout</code>, for example <code>1, 0</code>.`,
                  answer: [t & 1, t >> 1],
                  format: 'list',
                  hint: 'add the three bits as ordinary numbers, then write the total in binary.',
                  solution: String.raw`\(${a} + ${b} + ${c} = ${t}\), which is \(${(t >> 1)}${t & 1}_2\) in binary. So \(S = ${t & 1}\) (the XOR of the three bits) and \(C_{out} = ${t >> 1}\) (the majority of the three bits).`,
                };
              }
              const m = R.int(1, 15), n = R.int(1, 15);
              const A = m.toString(2).padStart(4, '0'), B = n.toString(2).padStart(4, '0'), S = (m + n).toString(2).padStart(5, '0');
              let carry = 0;
              const cols = range(4).map((i) => {
                const a = +A[3 - i], b = +B[3 - i];
                const t = a + b + carry;
                const line = `Column ${i}: ${a} + ${b} + ${carry} = ${t >> 1}${t & 1}₂, write ${t & 1}, carry ${t >> 1}`;
                carry = t >> 1;
                return line;
              });
              return {
                prompt: String.raw`A 4-bit ripple-carry adder adds \(A = ${A}_2\) and \(B = ${B}_2\). What 5-bit output \(c_4s_3s_2s_1s_0\) does it produce?`,
                answer: S,
                accept: [String(parseInt(S, 10))],
                format: 'text',
                hint: 'add right to left, carrying exactly as in decimal addition.',
                solution: `Work right to left. ${cols.join('; ')}. The final carry is the leftmost bit, so the output is <b>${S}</b>. Check in decimal: ${m} + ${n} = ${m + n} = ${S}₂.`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: Boolean algebra and circuits',
        kind: 'quiz',
        questions: [
          { q: String.raw`A NAND gate receives \(x = 1\) and \(y = 1\). What does it output?`, choices: ['1', '0', 'It depends on its previous output', '2'], answer: 1, explain: String.raw`NAND is AND followed by NOT. \(1 \cdot 1 = 1\), and flipping gives 0. NAND outputs 0 only in this one case. A combinatorial gate has no memory, so its previous output never matters.` },
          { q: 'Inputs x and y enter an OR gate. Its output and z enter an AND gate. What does the circuit compute?', choices: [String.raw`\(x + yz\)`, String.raw`\(xyz\)`, String.raw`\((x + y)z\)`, String.raw`\(x + y + z\)`], answer: 2, explain: String.raw`Label the gates left to right. The OR gate gives \(x + y\), and the AND gate multiplies that by \(z\). The parentheses matter, since \(x + yz\) would be a different circuit (an AND feeding an OR).` },
          { q: String.raw`What is the dual of the law \(x + x'y = x + y\)?`, choices: [String.raw`\(x(x' + y) = xy\)`, String.raw`\(x'(x + y') = x'y'\)`, String.raw`\(x + xy = x\)`, String.raw`\(xx' = 0\)`], answer: 0, explain: String.raw`To form a dual, swap \(+\) with \(\cdot\) and 0 with 1, and leave complements alone. \(x + x'y\) becomes \(x \cdot (x' + y)\) and \(x + y\) becomes \(xy\). Duality guarantees the new law is also true.` },
          { q: 'In the correspondence between sets, logic and circuits, which three belong together?', choices: [String.raw`\(A \cap B\), \(p \vee q\), OR gate`, String.raw`\(A \cup B\), \(p \wedge q\), AND gate`, String.raw`\(A \cup B\), \(p \vee q\), OR gate`, String.raw`\(A'\), \(p \wedge q\), NOT gate`], answer: 2, explain: String.raw`Union, "or" and the OR gate are the same operation in three languages. The result includes anything that is in either input. Intersection, "and" and the AND gate form the other pair.` },
          { q: 'A function of x, y, z is 1 exactly on rows 011 and 110. What is its DNF?', choices: [String.raw`\(xy'z' + x'y'z\)`, String.raw`\(x'yz + xyz'\)`, String.raw`\((x + y' + z')(x' + y' + z)\)`, String.raw`\(xy + yz\)`], answer: 1, explain: String.raw`Each 1-row becomes a minterm, where a 1 bit gives the plain variable and a 0 bit gives its complement. 011 gives \(x'yz\) and 110 gives \(xyz'\). Add them.` },
          { q: 'In a 4-variable Karnaugh map, a group of 4 neighboring 1-cells produces a product term with how many literals?', choices: ['1', '2', '3', '4'], answer: 1, explain: String.raw`A group of \(2^k\) cells lets \(k\) variables change, and those drop out. \(4 = 2^2\), so 2 of the 4 variables drop and 2 literals remain.` },
          { q: 'Which set of gates is functionally complete on its own?', choices: ['{AND, OR}', '{XOR}', '{OR}', '{NAND}'], answer: 3, explain: String.raw`NAND can build NOT (\(x \uparrow x\)), AND and OR, so it can build any DNF. {AND, OR} cannot make NOT, because with every input 0 its output is always 0. Circuits of XOR gates only ever compute parity, so they cannot make AND.` },
          { q: 'What does a full adder output for a = 1, b = 1 and carry-in 1?', choices: ['S = 0, Cout = 1', 'S = 1, Cout = 0', 'S = 1, Cout = 1', 'S = 0, Cout = 0'], answer: 2, explain: String.raw`\(1 + 1 + 1 = 3\), which is \(11_2\). The low bit is the sum \(S = 1\) and the high bit is the carry \(C_{out} = 1\).` },
          { q: 'Why can a single perceptron compute AND but not XOR?', choices: ['XOR needs more than two inputs', 'A perceptron cannot output 0', 'XOR is not a Boolean function', "XOR's 1s and 0s cannot be separated by one straight line"], answer: 3, explain: 'A perceptron draws one straight line and outputs 1 on one side. For XOR, the 1s sit at (0,1) and (1,0) and the 0s at (0,0) and (1,1), diagonally opposite, so no line works. Adding a hidden layer fixes this.' },
          { q: 'A 64-bit ripple-carry adder is much slower than a 4-bit one mainly because…', choices: ['the carry must pass through all 64 full adders, one after another', 'it has more input wires to read', '64-bit numbers need a different kind of gate', 'binary addition is harder for big numbers'], answer: 0, explain: 'Each full adder must wait for the carry from its right neighbor, so the delay grows with the number of bits. Carry-lookahead adders remove this chain by computing all the carries at once.' },
        ],
      },
    ],
  });
})();
