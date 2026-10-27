/* Module 8: Recurrence relations. Objective 8: apply recurrence relations to analyze algorithms.
   Recurrences as rules plus initial conditions, solving by iteration and induction, the characteristic
   equation, recurrences that come from algorithms, recursion trees, the master theorem, and memoization. */
(() => {
  // ---- small helpers shared by the labs and practice generators ----
  const near = (x, y) => Math.abs(x - y) <= 1e-7 * Math.max(1, Math.abs(x), Math.abs(y));
  const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;
  /** plain-text number: integers exact, others to 4 decimals, huge values in exponent form */
  function fmt(x) {
    if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '?';
    if (Math.abs(x) >= 1e9 || (x !== 0 && Math.abs(x) < 1e-4)) return x.toExponential(3).replace('-', '−');
    if (isInt(x)) return (Math.round(x) || 0).toLocaleString('en-US').replace('-', '−');
    return String(+x.toFixed(4) || 0).replace('-', '−');
  }
  /** TeX number: same rules, ASCII minus */
  function tn(x) {
    if (Math.abs(x) >= 1e9 || (x !== 0 && Math.abs(x) < 1e-4)) { const [m, e] = x.toExponential(3).split('e'); return `${m} \\times 10^{${+e}}`; }
    if (isInt(x)) return String(Math.round(x) || 0);
    return String(+x.toFixed(4) || 0);
  }
  /** signed linear combination in TeX: combo([[2,'a_{n-1}'],[-1,'a_{n-2}']]) -> "2a_{n-1} - a_{n-2}" */
  function combo(terms) {
    let out = '';
    for (const [c, v] of terms) {
      if (c === 0) continue;
      const abs = Math.abs(c);
      const coef = v && abs === 1 ? '' : String(abs);
      out += (c < 0 ? (out ? ' - ' : '-') : (out ? ' + ' : '')) + coef + (v || '');
    }
    return out || '0';
  }
  const par = (x) => (x < 0 ? `(${x})` : String(x));
  const fibs = [0, 1];
  while (fibs.length < 60) fibs.push(fibs[fibs.length - 1] + fibs[fibs.length - 2]);
  const pow2s = (x) => ({ 0: '1', 0.5: '√n', 1: 'n', 1.5: 'n√n', 2: 'n²', 3: 'n³', 4: 'n⁴' })[x];

  // ---- worked-example generators (phase 2): each primary and its variant share one step builder ----
  const HANOI_WORD = { 2: 'two', 3: 'three', 4: 'four' };
  // The data for one Tower of Hanoi example: the optimal moves for n disks as [disk, from peg, to peg]
  // with pegs A = 0, B = 1, C = 2, and the state (peg contents, bottom disk first) after each move.
  function hanoiData(n) {
    const moves = [];
    const gen = (k, from, to, via) => { if (k === 0) return; gen(k - 1, from, via, to); moves.push([k, from, to]); gen(k - 1, via, to, from); };
    gen(n, 0, 2, 1);
    const pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
    const states = [pegs.map((pg) => [...pg])];
    for (const [, from, to] of moves) { pegs[to].push(pegs[from].pop()); states.push(pegs.map((pg) => [...pg])); }
    return { n, moves, states };
  }
  function stepsForHanoi(D) {
    const NAME = ['A', 'B', 'C'];
    const total = D.moves.length, mid = (total + 1) / 2;
    const steps = [{ mv: 0, caption: `All ${HANOI_WORD[D.n]} disks start on peg A, largest at the bottom, and the goal is the same tower on peg C. To free the largest disk, the ${HANOI_WORD[D.n - 1]} smaller disks above it must first become one tower on the spare peg B.` }];
    D.moves.forEach(([disk, from, to], idx) => {
      const i = idx + 1;
      const top = D.states[idx][to][D.states[idx][to].length - 1];
      const landing = top === undefined ? `peg ${NAME[to]} is empty, so it can land there` : `it lands on the larger disk ${top}, so the move is legal`;
      const role = disk === D.n ? `This is the largest disk's one move, the +1 between the two smaller towers in the recurrence T(n) = 2T(n−1) + 1` : i < mid ? `It belongs to the first smaller tower, gathering the ${D.n - 1} smaller disks on one peg so the largest disk can move` : `It belongs to the second smaller tower, rebuilding the ${D.n - 1} smaller disks on top of the largest disk`;
      const st = { mv: i, caption: `Move ${i}: disk ${disk} goes from ${NAME[from]} to ${NAME[to]}, because it is the top disk on peg ${NAME[from]} and ${landing}. ${role}.` };
      if (i === mid - 1) st.checkpoint = `Predict: the ${D.n - 1} smaller disks are about to sit stacked on a single peg — which disk will finally be free to move next, and to which peg will it go?`;
      steps.push(st);
    });
    steps.push({ mv: total, answer: true, caption: `Answer: the tower takes ${total} moves, checked by the recurrence T(${D.n}) = 2·T(${D.n - 1}) + 1 = 2·${(total - 1) / 2} + 1 = ${total}, which is also 2^${D.n} − 1. Every disk ended in size order on peg C, and no disk ever rested on a smaller one during the sequence.` });
    return steps;
  }
  const EX_HANOI = hanoiData(3);
  const EX_HANOI_VAR = hanoiData(4); // variant: 4 disks, 15 moves; the draw stays readable at this size
  const EX_HANOI_MOVES = EX_HANOI.moves; // the 7 optimal moves for 3 disks
  const EX_HANOI_STATES = EX_HANOI.states; // the 8 states of that solution

  // The data for one iteration example: a(n) = c·a(n-1) + k from a0, terms a0..a4, and the shifted
  // column mult·a(n) + add, which the recurrence multiplies by exactly c at every step.
  function recData(c, k, a0, mult, add) {
    const terms = [a0];
    for (let i = 1; i <= 4; i++) terms.push(c * terms[i - 1] + k);
    return { c, k, a0, mult, add, terms };
  }
  const tcolPlain = (D) => (D.mult === 1 ? `a(n) + ${D.add}` : `${D.mult}a(n) + ${D.add}`);
  const tcolTex = (D) => (D.mult === 1 ? `a_n + ${D.add}` : `${D.mult}a_n + ${D.add}`);
  const expPlain = (e) => (/\+/.test(e) ? `(${e})` : e);
  // Both examples below have mult·a0 + add = 1, so the shifted column is exactly c^n and the closed form is (c^n − add) / mult.
  const closedPlainAt = (D, e) => (D.mult === 1 ? `${D.c}^${expPlain(e)} − ${D.add}` : `(${D.c}^${expPlain(e)} − ${D.add})/${D.mult}`);
  const closedTexAt = (D, e) => (D.mult === 1 ? `${D.c}^{${e}} - ${D.add}` : `\\frac{${D.c}^{${e}} - ${D.add}}{${D.mult}}`);
  function stepsForRec(D) {
    const t = D.terms, tv = t.map((x) => D.mult * x + D.add);
    const tail = D.c === 2 && D.k === 1 && D.a0 === 0
      ? `This is the same count as the Hanoi moves with a shift of index, since the three-disk tower takes T(3) = ${t[3]} = a3 moves.`
      : `It also predicts the next term without iterating: a5 = ${closedPlainAt(D, '5')} = ${D.c * t[4] + D.k}, and the rule confirms that value, since ${D.c}·${t[4]} + ${D.k} = ${D.c * t[4] + D.k}.`;
    return [
      { rows: 0, phase: 0, caption: `Setup: the starting value is a0 = ${D.a0} and every later term follows a(n) = ${D.c}·a(n−1) + ${D.k}, so iteration means just applying the rule repeatedly. The extra ${tcolPlain(D)} column is there because the shifted values turn out to follow a much cleaner pattern than the terms themselves.` },
      { rows: 3, phase: 0, caption: `Two terms appear: a1 = ${D.c}·${t[0]} + ${D.k} = ${t[1]} and a2 = ${D.c}·${t[1]} + ${D.k} = ${t[2]}, filling the table down from the starting value. Each term needs only the previous one, which is what makes iteration cheap.` },
      { rows: 5, phase: 0, caption: `Two more terms appear: a3 = ${D.c}·${t[2]} + ${D.k} = ${t[3]} and a4 = ${D.c}·${t[3]} + ${D.k} = ${t[4]}, completing the first five terms. The ${tcolPlain(D)} column now reads ${tv.join(', ')} — pure powers of ${D.c}.`, checkpoint: `Predict: the ${tcolPlain(D)} column reads ${tv.join(', ')} — what closed form for a(n) do those pure powers of ${D.c} suggest?` },
      { rows: 5, phase: 1, caption: `The pattern suggests the guess ${tcolPlain(D)} = ${D.c}^n, so a(n) = ${closedPlainAt(D, 'n')} for every n. A pattern in five terms is a conjecture, not a proof, and induction is the right tool because the claim covers all n while the recurrence links each n to the one before.` },
      { rows: 5, phase: 2, caption: `Induction checks the guess: the base case a0 = ${closedPlainAt(D, '0')} = ${D.a0} matches the starting value outright. If a(k) = ${closedPlainAt(D, 'k')} holds for some k, then a(k+1) = ${D.c}(${closedPlainAt(D, 'k')}) + ${D.k} = ${closedPlainAt(D, 'k+1')} after simplifying, so the formula reproduces itself through the recurrence.` },
      { rows: 5, phase: 2, answer: true, caption: `Answer: a(n) = ${closedPlainAt(D, 'n')}, and the spot check a4 = ${closedPlainAt(D, '4')} = ${t[4]} matches the iterated table exactly. ${tail}` },
    ];
  }
  const EX_REC = recData(2, 1, 0, 1, 1); // a(n) = 2a(n-1) + 1 with a0 = 0: 0, 1, 3, 7, 15, and a(n) + 1 is a power of 2
  const EX_REC_VAR = recData(3, 1, 0, 2, 1); // variant: a(n) = 3a(n-1) + 1 with a0 = 0: 0, 1, 4, 13, 40, and 2a(n) + 1 is a power of 3
  const EX_REC_TERMS = EX_REC.terms; // first terms of the primary recurrence, iterated once here

  // Recursion-tree preset data: T(n) = aT(n/2) + n with T(1) = 1. Each level lists its call count,
  // the size of each call, the work per call and the level total; seq holds T(1), T(2), T(4), T(8)
  // computed by iterating the recurrence itself, for the answer step's independent check.
  function treeData(a, n) {
    const levels = [];
    for (let size = n, cnt = 1, i = 0; ; size /= 2, cnt *= a, i++) {
      levels.push({ i, cnt, size, per: size, tot: cnt * size });
      if (size === 1) break;
    }
    const seq = [1];
    for (let size = 2; size <= n; size *= 2) seq.push(a * seq[seq.length - 1] + size);
    return { a, n, levels, seq, total: levels.reduce((s, L) => s + L.tot, 0) };
  }
  const EX_TREE = treeData(2, 8); // merge sort shape: every level totals 8, total 32
  const EX_TREE_VAR = treeData(3, 8); // Karatsuba shape: level totals 8, 12, 18, 27, total 65
  function stepsForTree(D, cpText) {
    const L = D.levels, leaf = L[L.length - 1], s = D.seq;
    const trend = D.a === 2 ? 'The call count doubled while the size halved, so this level costs exactly what level 0 cost' : `The call count tripled while the size only halved, so this level costs ${D.a}/2 times the level above it`;
    return [
      { shown: 0, caption: `Setup: solve T(n) = ${D.a}T(n/2) + n with T(1) = 1 at n = ${D.n} by drawing the recursion tree. Each node is one call, labeled with the work that call does outside its recursive calls; the plan is to total every level separately and then add the levels.` },
      { shown: 1, caption: `Level 0 is the root: a single call on size ${D.n}. It does ${D.n} units of its own work and hands the rest to ${D.a} calls on size ${D.n / 2}, so the level total is 1 × ${D.n} = ${D.n} before any child is even drawn.`, checkpoint: cpText },
      { shown: 2, caption: `Level 1 has ${L[1].cnt} calls, each on size ${L[1].size} doing ${L[1].per} units of work, so its total is ${L[1].cnt} × ${L[1].per} = ${L[1].tot}. ${trend}.` },
      { shown: 3, caption: `Level 2 has ${L[2].cnt} calls, each on size ${L[2].size} doing ${L[2].per} units of work, for a total of ${L[2].cnt} × ${L[2].per} = ${L[2].tot}. The pattern per level is now visible: multiply the call count by ${D.a}, halve the size, and the level total follows from those two numbers alone.` },
      { shown: 4, caption: `Level 3 is the bottom: the size has halved down to 1, so these ${leaf.cnt} calls are base cases with T(1) = 1 each, and the leaf total is ${leaf.cnt} × 1 = ${leaf.tot}. The tree has log2 ${D.n} + 1 = ${L.length} levels in all: one level per halving, plus the root level.` },
      { shown: 4, sum: true, caption: `Add the level totals: ${L.map((x) => x.tot).join(' + ')} = ${D.total}. ${D.a === 2 ? `Every level costs the same n = ${D.n} and there are log2 ${D.n} + 1 = ${L.length} levels, which is exactly why the closed form for this shape is n(log2 n + 1).` : `The totals grow by a factor of ${D.a}/2 per level, a geometric series, and adding the ${L.length} of them directly gives the total.`}` },
      { shown: 4, sum: true, answer: true, caption: `Answer: T(${D.n}) = ${D.total}. The independent check skips the tree and iterates the recurrence itself: T(2) = ${D.a}·T(1) + 2 = ${s[1]}, T(4) = ${D.a}·${s[1]} + 4 = ${s[2]}, and T(${D.n}) = ${D.a}·${s[2]} + ${D.n} = ${s[3]}, matching the level sum exactly.` },
    ];
  }

  // Characteristic-equation preset data: a(n) = c1 a(n-1) + c2 a(n-2) with a0, a1. The solver finds
  // the roots (distinct or repeated), the constants b and d, the iterated terms and the closed-form
  // values, all in exact integer arithmetic for the chosen examples.
  function charData(c1, c2, a0, a1) {
    const terms = [a0, a1];
    for (let i = 2; i <= 5; i++) terms.push(c1 * terms[i - 1] + c2 * terms[i - 2]);
    const disc = c1 * c1 + 4 * c2;
    if (disc === 0) {
      const r = c1 / 2, b = a0, d = a1 / r - b;
      return { c1, c2, a0, a1, kind: 'repeated', r, b, d, terms, closed: terms.map((_, n) => (b + d * n) * r ** n) };
    }
    const sq = Math.sqrt(disc), r1 = (c1 - sq) / 2, r2 = (c1 + sq) / 2;
    const b = (a1 - a0 * r2) / (r1 - r2), d = a0 - b;
    return { c1, c2, a0, a1, kind: 'distinct', r1, r2, b, d, terms, closed: terms.map((_, n) => b * r1 ** n + d * r2 ** n) };
  }
  const EX_CHAR = charData(5, -6, 7, 16); // roots 2 and 3, a(n) = 5·2^n + 2·3^n (the solver lab's own preset)
  const EX_CHAR_VAR = charData(4, -4, 1, 4); // repeated root 2, a(n) = (1 + n)·2^n (the concept slide's own case)
  /** signed plain-text combination: pcombo([[5,'a(n-1)'],[-6,'a(n-2)']]) -> "5a(n-1) − 6a(n-2)" */
  function pcombo(terms) {
    let out = '';
    for (const [c, v] of terms) {
      if (c === 0) continue;
      const abs = Math.abs(c);
      const coef = v && abs === 1 ? '' : String(abs);
      out += (c < 0 ? (out ? ' − ' : '−') : (out ? ' + ' : '')) + coef + (v || '');
    }
    return out || '0';
  }
  const charRecPlain = (D) => pcombo([[D.c1, 'a(n−1)'], [D.c2, 'a(n−2)']]);
  const charEqPlain = (D) => `r^2 ${-D.c1 < 0 ? '−' : '+'} ${Math.abs(D.c1)}r ${-D.c2 < 0 ? '−' : '+'} ${Math.abs(D.c2)} = 0`;
  const charEqTex = (D) => String.raw`r^2 ${-D.c1 < 0 ? '-' : '+'} ${Math.abs(D.c1)}r ${-D.c2 < 0 ? '-' : '+'} ${Math.abs(D.c2)} = 0`;
  const facPlain = (r) => `(r ${r < 0 ? '+' : '−'} ${Math.abs(r)})`;
  const facTex = (r) => `(r ${r < 0 ? '+' : '-'} ${Math.abs(r)})`;
  const charClosedPlain = (D) => (D.kind === 'repeated' ? `(${pcombo([[D.b, ''], [D.d, 'n']])})·${D.r}^n` : pcombo([[D.b, `·${D.r1}^n`], [D.d, `·${D.r2}^n`]]));
  const charClosedTex = (D) => (D.kind === 'repeated' ? `(${combo([[D.b, ''], [D.d, 'n']])}) \\cdot ${D.r}^n` : combo([[D.b, ` \\cdot ${D.r1}^n`], [D.d, ` \\cdot ${D.r2}^n`]]));
  const charGeneralTex = (D) => (D.kind === 'repeated' ? String.raw`a_n = (b + dn) \cdot ${D.r}^n` : String.raw`a_n = b \cdot ${D.r1}^n + d \cdot ${D.r2}^n`);
  function stepsForChar(D, cpText) {
    const rep = D.kind === 'repeated';
    return [
      { phase: 0, caption: `Setup: a(n) = ${charRecPlain(D)} with a(0) = ${D.a0} and a(1) = ${D.a1} is linear, homogeneous and order 2, so the characteristic-equation method applies. The plan: guess a solution of the form a(n) = r^n, find which r work, then let the two initial conditions fix the two constants.` },
      { phase: 1, caption: `Substituting the guess a(n) = r^n into the recurrence and dividing by r^(n−2) leaves the characteristic equation ${charEqPlain(D)}. Its roots are exactly the values of r for which r^n solves the recurrence, so factoring this quadratic is the whole next job.`, checkpoint: cpText },
      { phase: 2, caption: rep ? `It factors as ${facPlain(D.r)}^2 = 0, so r = ${D.r} is a repeated root: the same root twice. A repeated root contributes two independent solutions, ${D.r}^n and n·${D.r}^n, and the extra factor of n in the second one is exactly what keeps the two solutions from collapsing into one.` : `It factors as ${facPlain(D.r1)}${facPlain(D.r2)} = 0, so the roots are r = ${D.r1} and r = ${D.r2}, two different real numbers. Each root contributes one exponential solution, ${D.r1}^n and ${D.r2}^n, and any combination of them also solves the recurrence.` },
      { phase: 3, caption: rep ? `The general solution for a repeated root is a(n) = b·${D.r}^n + d·n·${D.r}^n, which factors as (b + dn)·${D.r}^n with the constants still unknown. Every choice of b and d satisfies the recurrence; the initial conditions pick out the one sequence we actually want.` : `The general solution combines the two root solutions with unknown constants: a(n) = b·${D.r1}^n + d·${D.r2}^n. Every choice of b and d satisfies the recurrence; the initial conditions pick out the one sequence we actually want.` },
      { phase: 4, caption: rep ? `Use a(0) = ${D.a0} first: at n = 0 the formula gives (b + d·0)·${D.r}^0 = b, so b = ${D.b} immediately. For a repeated root the first initial condition hands us one constant outright, leaving only d to find.` : `Use a(0) = ${D.a0} first: at n = 0 the formula gives b·${D.r1}^0 + d·${D.r2}^0 = b + d = ${D.a0}. That is one equation in two unknowns, so it narrows the possibilities to a line rather than fixing the constants; the second initial condition is still needed.` },
      { phase: 5, caption: rep ? `Now a(1) = ${D.a1}: the formula gives (b + d)·${D.r} = ${D.a1}, so b + d = ${D.a1 / D.r}, and with b = ${D.b} that leaves d = ${D.d}. Both constants are fixed, so the closed form is completely determined.` : `Now a(1) = ${D.a1} gives ${D.r1}b + ${D.r2}d = ${D.a1}. Subtracting ${D.r1} times the first equation removes b: (${D.r2} − ${D.r1})d = ${D.a1} − ${D.r1}·${D.a0} = ${D.a1 - D.r1 * D.a0}, so d = ${D.d}, and then b = ${D.a0} − ${D.d} = ${D.b}. Both constants are fixed.` },
      { phase: 6, answer: true, caption: `Answer: a(n) = ${charClosedPlain(D)}. Check it against plain iteration of the recurrence, which gives ${D.terms.join(', ')}, while the closed form gives ${D.closed.join(', ')}: identical on every term shown, including a(4) = ${D.terms[4]}, which was never used to fit the constants.` },
    ];
  }

  // Compare the entered decimal values exactly before using floating-point roots.
  // An epsilon would erase deliberately small nonzero contributions as well as noise.
  function decimalIntegers(values) {
    const parts = values.map((v) => {
      const [mantissa, exponent = '0'] = String(v).split('e');
      const places = (mantissa.split('.')[1] || '').length - Number(exponent);
      return { value: BigInt(mantissa.replace('.', '')), places };
    });
    const places = Math.max(0, ...parts.map((p) => p.places));
    return { scale: 10n ** BigInt(places), places, values: parts.map((p) => p.value * 10n ** BigInt(places - p.places)) };
  }
  function integerRatio(p, q) {
    if (p === 0n) return 0;
    const sign = (p < 0n) !== (q < 0n) ? -1 : 1;
    const a = String(p < 0n ? -p : p), b = String(q < 0n ? -q : q);
    const mantissa = sign * Number(`${a[0]}.${a.slice(1, 16)}`) / Number(`${b[0]}.${b.slice(1, 16)}`);
    return Number(`${mantissa}e${a.length - b.length}`);
  }
  function decimalSqrt(p, places) {
    const digits = String(p), leading = digits.slice(0, 16);
    let mantissa = Number(leading) / 10 ** (leading.length - 1);
    let exponent = digits.length - 1 - places;
    if (exponent % 2 !== 0) { mantissa *= 10; exponent--; }
    return Number(`${Math.sqrt(mantissa)}e${exponent / 2}`);
  }

  // Growth belongs to the solved sequence: a root with coefficient zero contributes
  // nothing, and a repeated root can contribute an extra factor of n.
  function growthText(S) {
    const contributes = S.active || [S.b !== 0, S.d !== 0];
    if (!contributes.some(Boolean)) return 'Both constants are 0, so every term is 0. The ratio of consecutive terms is undefined.';
    if (S.kind === 'complex') {
      const rho = S.rho;
      const trend = rho < 1 ? 'The oscillations shrink toward 0.' : rho > 1 ? `The oscillation envelope grows like ${fmt(rho)}ⁿ; individual terms can still be small or zero.` : 'The terms stay bounded and oscillate; they need not repeat periodically.';
      return `${trend} Both complex roots have the same magnitude, so consecutive-term ratios need not converge.`;
    }
    if (S.kind === 'repeated' && contributes[1]) {
      const r = S.roots[0][0], rho = Math.abs(r);
      const trend = rho < 1 ? 'The terms still shrink toward 0: exponential decay outweighs the factor n.' : rho > 1 ? `Their magnitude grows on the scale n · ${fmt(rho)}ⁿ.` : 'Their magnitude grows linearly, even though the root has magnitude 1.';
      return `The repeated root contributes a nonzero n · rⁿ term. ${trend}${r < 0 ? ' The signs eventually alternate.' : ''} The ratio approaches ${fmt(r)}.`;
    }
    const active = S.roots.map(([r], i) => ({ r, present: contributes[i] })).filter((x) => x.present).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    const r = active[0].r, rho = Math.abs(r);
    const inactive = S.roots.length > active.length ? 'A root with coefficient 0 contributes nothing to this sequence. ' : '';
    if (active.length === 2 && Math.abs(active[1].r) === rho) {
      const trend = rho < 1 ? 'Both terms shrink toward 0.' : rho > 1 ? `The terms have an envelope proportional to ${fmt(rho)}ⁿ; cancellation can make one parity of terms zero.` : 'The sequence is bounded: even-index terms have one value and odd-index terms have another.';
      return `${trend} The active roots have equal magnitudes and opposite signs, so consecutive-term ratios need not converge.`;
    }
    const trend = rho < 1 ? 'The terms shrink toward 0.' : rho > 1 ? `Their magnitude eventually grows by a factor approaching ${fmt(rho)} per step.` : r > 0 ? 'The terms approach a nonzero constant.' : 'The terms approach an alternating pair of nonzero values.';
    return `${inactive}The dominant active root is ${fmt(r)}. ${trend}${r < 0 && rho !== 1 ? ' The signs eventually alternate.' : ''} The ratio approaches ${fmt(r)}.`;
  }

  DM.module({
    id: 'recurrences',
    num: 8,
    title: 'Recurrence Relations',
    objectives: [8],
    terms: {
      'recurrence relation': 'A rule that defines each term of a sequence from earlier terms, such as aₙ = 2aₙ₋₁ + 1. Together with initial conditions it pins down exactly one sequence.',
      'initial condition': 'A starting term given outright, such as a₀ = 1. A rule that looks back k steps needs k initial conditions.',
      'closed form': 'A formula that computes aₙ directly from n, without computing the earlier terms first, such as Hₙ = 2ⁿ − 1.',
      'iteration': 'Solving a recurrence by substituting the rule into itself again and again until a pattern appears. Also called unrolling.',
      'linear homogeneous recurrence': 'A recurrence aₙ = c₁aₙ₋₁ + … + cₖaₙ₋ₖ with constant coefficients and no extra term added.',
      'order': 'How many steps back a recurrence looks. aₙ = aₙ₋₁ + aₙ₋₂ has order 2.',
      'characteristic equation': 'For aₙ = c₁aₙ₋₁ + c₂aₙ₋₂ it is r² − c₁r − c₂ = 0. Its roots give the closed form.',
      'repeated root': 'A root that appears twice in the characteristic equation, as 2 does in (r − 2)² = 0. The closed form is then aₙ = b·rⁿ + d·n·rⁿ.',
      "Binet's formula": 'The closed form of the Fibonacci numbers: Fₙ = (φⁿ − ψⁿ)/√5, where φ = (1 + √5)/2 and ψ = (1 − √5)/2.',
      'golden ratio': 'φ = (1 + √5)/2 ≈ 1.618, the larger root of r² = r + 1. Consecutive Fibonacci numbers have a ratio that approaches φ.',
      'divide and conquer': 'Solving a problem by splitting it into smaller copies of itself, solving those recursively, and combining their answers.',
      'recursion tree': 'A drawing with one node per recursive call, labeled with the work that call does. Summing level by level solves the recurrence.',
      'master theorem': 'A shortcut that solves T(n) = a·T(n/b) + Θ(nᵈ) by comparing d with log_b a.',
      'memoization': 'Storing the result of each function call the first time it is computed, so a repeated call returns the stored answer instead of recomputing it.',
      'dynamic programming': 'Solving a problem by solving each of its overlapping subproblems once, usually by filling a table from the smallest subproblems up.',
      'overlapping subproblems': 'When a recursion asks for the same smaller answer many times, as naive Fibonacci asks for fib(2) again and again.',
    },
    symbols: [
      ['aₙ', 'the n-th term of a sequence', 'a₀ = 1, aₙ = 2aₙ₋₁'],
      ['Hₙ', 'Tower of Hanoi moves for n disks', 'H₃ = 7'],
      ['Fₙ', 'the n-th Fibonacci number', 'F₀ = 0, F₁ = 1, F₆ = 8'],
      ['φ', 'golden ratio (1 + √5)/2', 'φ ≈ 1.618'],
      ['ψ', 'the other Fibonacci root (1 − √5)/2', 'ψ ≈ −0.618'],
      ['T(n)', 'steps an algorithm takes on input size n', 'T(n) = 2T(n/2) + n'],
      ['log_b a', 'the power of b that gives a', 'log₂ 8 = 3'],
    ],
    css: `
      .rc-lab { display: grid; gap: 0.9rem; min-height: 0; align-items: stretch; }
      .rc-panel { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; }
      .rc-ctl { display: grid; grid-template-columns: 4.6rem minmax(0, 1fr); gap: 0.35rem 0.5rem; align-items: center; font-size: 0.82rem; color: var(--ink-2); }
      .rc-ctl .seg, .rc-ctl4 .seg { justify-self: start; }
      .rc-ctl .seg button, .rc-ctl4 .seg button { padding: 0.18rem 0.55rem; font-size: 0.8rem; }
      .rc-ctl4 { display: grid; grid-template-columns: auto auto auto minmax(0, 1fr); gap: 0.35rem 0.55rem; align-items: center; font-size: 0.82rem; color: var(--ink-2); }
      .rc-unroll { border-collapse: collapse; margin: 0 auto; }
      .rc-unroll td { padding: 0.1rem 0.3rem; white-space: nowrap; }
      .rc-unroll td:first-child { text-align: right; }
      .rc-unroll td:last-child { font-size: 0.74rem; padding-left: 0.8rem; }
      .rc-label { paint-order: stroke; stroke: var(--paper); stroke-width: 3.5px; stroke-linejoin: round; }
      .rc-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem; text-align: center; }
      .rc-stats div { background: var(--sheet); border: 1px solid var(--rule); border-radius: var(--radius); padding: 0.3rem 0.2rem; }
      .rc-stats b { display: block; font-family: var(--font-display); font-size: 1.25rem; font-variant-numeric: tabular-nums; }
      .rc-stats span { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
      .rc-frame { display: grid; grid-template-columns: 7.2rem repeat(3, minmax(0, 1fr)); gap: 0.25rem; align-items: center; font-size: 0.74rem; }
      .rc-frame .call { font-family: var(--font-mono); font-size: 0.74rem; white-space: nowrap; }
      .rc-ph { border: 1px solid var(--rule); border-radius: 0.3rem; padding: 0.05rem 0.25rem; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink-3); background: var(--sheet); }
      .rc-ph.done { color: var(--true); background: var(--true-bg); border-color: transparent; }
      .rc-ph.now { color: var(--mark-ink); background: var(--mark); border-color: var(--accent); font-weight: 600; }
      .rc-peg { cursor: pointer; outline: none; }
      .rc-peg:focus-visible rect { stroke: var(--accent); stroke-width: 2; stroke-opacity: 1; }
      .rc-steps { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.86rem; min-width: 0; }
      .rc-steps .lbl { font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }
      .rc-steps math { font-size: 1em; }
      .rc-table { width: 100%; font-size: 0.8rem; }
      .rc-table td, .rc-table th { padding: 0.14rem 0.35rem !important; }
      .rc-bars { display: grid; grid-template-columns: 3.4rem minmax(0, 1fr) 2.6rem; gap: 0.15rem 0.4rem; align-items: center; font-size: 0.74rem; font-family: var(--font-mono); }
      .rc-bars .bar { height: 0.7rem; border-radius: 0.2rem; background: var(--rule); position: relative; overflow: hidden; }
      .rc-bars .bar i { position: absolute; inset: 0 auto 0 0; border-radius: 0.2rem; }
      .rc-memo { display: flex; flex-wrap: wrap; gap: 0.2rem; }
      .rc-memo span { font-family: var(--font-mono); font-size: 0.72rem; border: 1px solid var(--rule); border-radius: 0.25rem; padding: 0.05rem 0.3rem; background: var(--sheet); color: var(--ink-3); }
      .rc-memo span.on { background: var(--true-bg); color: var(--true); border-color: var(--true); }
      .rc-mini { font-size: 0.8rem; }
      .rc-mini td, .rc-mini th { padding: 0.1rem 0.4rem !important; }
      .rc-mini td.on { background: var(--mark); color: var(--mark-ink); font-weight: 700; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'What is a recurrence relation?',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">recurrence relation</span> for a <span class="term">sequence</span> \(a_0, a_1, a_2, \dots\) is a rule that gives each term \(a_n\) in terms of earlier terms. The <span class="term" data-term="initial condition">initial conditions</span> state the first term or terms outright. A rule plus enough initial conditions defines exactly one sequence.<div class="eg">The rule \(a_n = a_{n-1} + 3\) with initial condition \(a_0 = 2\) gives the sequence \(2, 5, 8, 11, \dots\)</div></div>
              <div class="ex">You deposit $1000 at 5% interest per year. Let \(A_n\) be the balance after \(n\) years. Each year adds 5% of the previous balance:
                \[A_n = 1.05\,A_{n-1} \quad (n \ge 1), \qquad A_0 = 1000.\]
                The rule says how to take one step. The initial condition says where to start.</div>
              <div class="warn">A rule alone is not enough. \(a_n = 2a_{n-1}\) fits \(1, 2, 4, 8, \dots\) and also \(3, 6, 12, 24, \dots\). Only the initial condition \(a_0\) tells you which sequence you mean.</div>
            </div>
            <div class="stack">
              <div class="card">
                <h3>Following the rule one year at a time</h3>
                <table class="tt" style="width:100%">
                  <thead><tr><th>\(n\)</th><th>\(A_n\)</th><th class="l">computed as</th></tr></thead>
                  <tbody>
                    <tr><td>0</td><td>1000.00</td><td class="l">initial condition</td></tr>
                    <tr><td>1</td><td>1050.00</td><td class="l">\(1.05 \times 1000.00\)</td></tr>
                    <tr><td>2</td><td>1102.50</td><td class="l">\(1.05 \times 1050.00\)</td></tr>
                    <tr><td>3</td><td>1157.63</td><td class="l">\(1.05 \times 1102.50\)</td></tr>
                    <tr><td>4</td><td>1215.51</td><td class="l">\(1.05 \times 1157.63\)</td></tr>
                  </tbody>
                </table>
                <p class="small muted" style="margin-top:0.4rem">Reaching \(A_{30}\) this way takes 30 steps. A <span class="term">closed form</span>, \(A_n = 1000 \cdot 1.05^n\), jumps straight to any year. Finding closed forms is a main goal of this module.</p>
              </div>
              <div class="why">Every recursive program hides a recurrence. Count the work a recursive function does on an input of size \(n\) and you get a rule in terms of smaller inputs. Solving that rule tells you how fast the program runs.</div>
              <div class="ai">A recurrent neural network reads text one token at a time and updates its hidden state with \(h_t = f(h_{t-1}, x_t)\): the new state depends on the previous state and the current input \(x_t\). That is a recurrence relation, and the starting state \(h_0\) is its initial condition.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Three classic recurrences',
        kind: 'concept',
        html: String.raw`
          <div class="cols-3">
            <div class="card stack" style="gap:0.4rem">
              <h3>Tower of Hanoi</h3>
              <p class="small">Move a stack of \(n\) disks from peg A to peg C, one disk at a time, never placing a larger disk on a smaller one. To move \(n\) disks: move the top \(n-1\) to the spare peg, move the largest disk, then move the \(n-1\) disks back on top of it.</p>
              <p class="big-math" style="font-size:1.1rem">\(H_n = 2H_{n-1} + 1,\ H_1 = 1\)</p>
              <p class="small muted">Terms: 1, 3, 7, 15, 31, 63, … The two copies of \(H_{n-1}\) are the two smaller towers; the \(+1\) is the largest disk.</p>
            </div>
            <div class="card stack" style="gap:0.4rem">
              <h3>Fibonacci numbers</h3>
              <p class="small">Each term is the sum of the two before it. The rule looks back two steps, so it needs two initial conditions to get started.</p>
              <p class="big-math" style="font-size:1.1rem">\(F_n = F_{n-1} + F_{n-2}\)</p>
              <p class="small center">\(F_0 = 0,\ F_1 = 1\)</p>
              <p class="small muted">Terms: 0, 1, 1, 2, 3, 5, 8, 13, 21, … They model branching growth and appear again and again when we analyze recursive algorithms.</p>
            </div>
            <div class="card stack" style="gap:0.4rem">
              <h3>Bit strings with no "11"</h3>
              <p class="small">Let \(S_n\) count the length-\(n\) bit strings with no two 1s in a row. Split them by their <b>last bit</b>:</p>
              <ul class="small">
                <li>ends in 0: any good string of length \(n-1\), then 0. That is \(S_{n-1}\) strings.</li>
                <li>ends in 1: the bit before must be 0, so a good string of length \(n-2\), then 01. That is \(S_{n-2}\) strings.</li>
              </ul>
              <p class="big-math" style="font-size:1.1rem">\(S_n = S_{n-1} + S_{n-2}\)</p>
              <p class="small muted">\(S_1 = 2\) (0, 1) and \(S_2 = 3\) (00, 01, 10). Then 5, 8, 13, …: the Fibonacci numbers again, \(S_n = F_{n+2}\).</p>
            </div>
          </div>
          <div class="split">
            <div class="ex">Check \(S_3\) by listing every good string of length 3: 000, 001, 010, 100, 101. The three ending in 0 (000, 010, 100) are the good strings of length 2 with a 0 added. The two ending in 1 (001, 101) are the good strings of length 1 with 01 added. So \(S_3 = S_2 + S_1 = 3 + 2 = 5\).</div>
            <div class="tip">To find a recurrence, ask how a problem of size \(n\) breaks into smaller problems of the same kind. Then count each case separately and add the counts. Splitting by the first or the last choice works for a great many counting problems.</div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: the Tower of Hanoi',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click a peg to lift its top disk, then click another peg to drop it. A disk may land only on an empty peg or on a larger disk. Press <b>Step</b> or <b>Play</b> to watch the recursive solution: the panel lists every call that is running and which of its three phases it is in.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const COLORS = ['--accent', '--fnc', '--num', '--kw', '--str', '--warn', '--false'];
          const NAME = ['A', 'B', 'C'];
          const PX = [110, 300, 490], BASE = 318, W = 600, H = 366;
          const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', sup = (x) => String(x).split('').map((c) => SUP[c]).join('');
          const SPEED = { Slow: 900, Normal: 420, Fast: 140 };
          let n = 4, pegs = [], moves = 0, held = null, plan = [], step = 0, onPlan = true, speed = 'Normal', last = null;

          function genPlan(k, from, to, via, stack, out) {
            if (k === 0) return;
            const fr = { k, from, to, via, phase: 1 };
            stack.push(fr);
            genPlan(k - 1, from, via, to, stack, out);
            fr.phase = 2;
            out.push({ disk: k, from, to, stack: stack.map((f) => ({ ...f })) });
            fr.phase = 3;
            genPlan(k - 1, via, to, from, stack, out);
            stack.pop();
          }
          const minMoves = () => 2 ** n - 1;
          const diskW = (k) => (n === 1 ? 120 : 44 + ((k - 1) * (176 - 44)) / (n - 1));

          // static scene: base, pegs, labels, and one hit area per peg
          const disksG = s('g');
          const hiG = s('g');
          const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'Three pegs with disks; each peg is a button' },
            s('rect', { x: 14, y: BASE, width: W - 28, height: 12, rx: 4, fill: 'var(--ink-3)' }),
            hiG,
            ...PX.map((x) => s('rect', { x: x - 4, y: 84, width: 8, height: BASE - 84, rx: 3, fill: 'var(--ink-3)' })),
            ...PX.map((x, p) => s('text', { x, y: BASE + 32, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: 'var(--ink-2)', text: 'Peg ' + NAME[p] })),
            disksG,
            ...PX.map((x, p) => s('g', { class: 'rc-peg', tabindex: 0, role: 'button', 'aria-label': `Peg ${NAME[p]}`, onclick: () => clickPeg(p), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickPeg(p); } } },
              s('rect', { x: x - 94, y: 8, width: 188, height: H - 12, rx: 10, fill: 'var(--paper)', 'fill-opacity': 0, stroke: 'none', 'stroke-opacity': 0 }))));

          const msg = h('div.feedback', { 'aria-live': 'polite' });
          const stats = h('div.rc-stats');
          const stackBox = h('div.stack', { style: { gap: '0.25rem' } });
          const mini = h('div');
          const nSeg = h('div.seg');
          const spSeg = h('div.seg');
          const solveBtn = h('button.btn.primary.sm', { onclick: () => solve() });
          const stepBtn = h('button.btn.sm', { onclick: () => stepOnce() }, 'Step ▶');
          const resetBtn = h('button.btn.sm', { onclick: () => { player.stop(); reset(); draw(); } }, 'Reset');
          // the ticker owns the play/pause label; ms is read on every start, so a speed change just restarts it
          const playOpts = { ms: SPEED[speed], button: solveBtn, tick: () => { if (step >= plan.length) return false; const mv = plan[step++]; apply(mv.from, mv.to); checkWin(); draw(); return step < plan.length; } };
          const player = ctx.ticker(playOpts);
          const panel = h('div.rc-panel',
            h('div.rc-ctl', h('span', 'Disks'), nSeg, h('span', 'Speed'), spSeg),
            h('div.row', { style: { gap: '0.35rem' } }, stepBtn, solveBtn, resetBtn),
            stats, msg,
            h('div.card.stack', { style: { gap: '0.35rem', padding: '0.55rem 0.7rem' } }, h('div.tiny.mono.muted', 'CALLS RUNNING RIGHT NOW (OUTERMOST FIRST)'), stackBox),
            mini);
          body.append(h('div.rc-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' } }, h('div.figure', { style: { minHeight: 0, alignItems: 'start' } }, svg), panel));

          function reset() {
            pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
            moves = 0; held = null; step = 0; onPlan = true; last = null;
            plan = []; genPlan(n, 0, 2, 1, [], plan);
            msg.textContent = ''; msg.className = 'feedback';
          }
          function apply(from, to) {
            const disk = pegs[from].pop();
            pegs[to].push(disk);
            moves++;
            last = { disk, from, to };
          }
          function clickPeg(p) {
            player.stop();
            if (held === null) {
              if (!pegs[p].length) { say('info', `Peg ${NAME[p]} is empty. Pick a peg that has a disk on top.`); return; }
              held = p; say('', '');
            } else if (held === p) {
              held = null;
            } else {
              const top = pegs[held][pegs[held].length - 1];
              const under = pegs[p][pegs[p].length - 1];
              if (under !== undefined && under < top) {
                say('bad', `Disk ${top} cannot go on top of the smaller disk ${under}.`);
                held = null;
              } else {
                if (onPlan && !(plan[step] && plan[step].from === held && plan[step].to === p)) onPlan = false;
                if (onPlan) step++;
                apply(held, p);
                held = null;
                say('', '');
              }
            }
            checkWin();
            draw();
          }
          function say(kind, text) { msg.className = 'feedback' + (kind ? ' ' + kind : ''); msg.textContent = text; }
          function checkWin() {
            if (pegs[2].length !== n) return;
            player.stop();
            say('good', moves === minMoves() ? `Solved in ${moves} moves, the minimum possible: 2${sup(n)} − 1 = ${minMoves()}.` : `Solved in ${moves} moves. The minimum is ${minMoves()}. Try to match it.`);
          }
          function stepOnce() {
            player.stop();
            if (!onPlan || held !== null) { reset(); }
            if (step >= plan.length) { reset(); }
            const mv = plan[step++];
            apply(mv.from, mv.to);
            checkWin();
            draw();
          }
          function solve() {
            if (player.playing) { player.stop(); draw(); return; }
            if (!onPlan || held !== null || step >= plan.length) reset();
            playOpts.ms = SPEED[speed];
            player.start();
            draw();
          }

          function draw() {
            rc(nSeg, [1, 2, 3, 4, 5, 6, 7].map((k) => h('button', { 'aria-pressed': String(k === n), onclick: () => { player.stop(); n = k; reset(); draw(); } }, String(k))));
            rc(spSeg, Object.keys(SPEED).map((k) => h('button', { 'aria-pressed': String(k === speed), onclick: () => { speed = k; if (player.playing) { player.stop(); solve(); } else draw(); } }, k)));
            // disks
            const dh = Math.min(32, 218 / n);
            rc(hiG, held !== null ? s('rect', { x: PX[held] - 94, y: 8, width: 188, height: BASE - 8, rx: 10, fill: 'var(--accent-2)' }) : null);
            const kids = [];
            pegs.forEach((stack, p) => stack.forEach((disk, i) => {
              const lifted = held === p && i === stack.length - 1;
              const w = diskW(disk);
              const y = lifted ? 36 : BASE - (i + 1) * dh;
              const isLast = last && last.disk === disk && !lifted;
              kids.push(s('rect', { x: PX[p] - w / 2, y, width: w, height: dh - 2, rx: Math.min(8, dh / 2), fill: `var(${COLORS[(disk - 1) % COLORS.length]})`, stroke: isLast ? 'var(--ink)' : 'none', 'stroke-width': 2.5 }));
              if (dh >= 15) kids.push(s('text', { x: PX[p], y: y + dh / 2 + 3.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--accent-ink)', text: String(disk) }));
            }));
            rc(disksG, kids);
            // counters
            rc(stats,
              h('div', h('b', String(moves)), h('span', 'Moves made')),
              h('div', h('b', String(minMoves())), h('span', `Minimum: 2${sup(n)} − 1`)));
            // recursion stack
            const cur = onPlan && step > 0 ? plan[step - 1] : null;
            if (!onPlan) {
              rc(stackBox, h('p.small.muted', 'You are playing by hand. Press Step or Play to start over from the beginning and follow the recursive plan.'));
            } else if (!cur) {
              rc(stackBox, h('p.small.muted', { html: `Nothing is running yet. The first call will be <code>hanoi(${n}, A→C)</code>: move ${n} disk${n === 1 ? '' : 's'} from A to C using B as the spare.` }));
            } else if (step === plan.length) {
              rc(stackBox, h('p.small', { html: `Every call has returned. Disk ${n} moved once, disk ${n - 1 || 1} moved ${n > 1 ? 2 : 1} times, …, and disk 1 moved ${2 ** (n - 1)} times: \\(1 + 2 + \\dots + 2^{${n - 1}} = 2^{${n}} - 1 = ${minMoves()}\\).` }));
              ctx.tex(stackBox);
            } else {
              rc(stackBox, cur.stack.map((f) => {
                const sp = NAME[f.via], fr = NAME[f.from], to = NAME[f.to];
                const ph = [
                  f.k > 1 ? `① top ${f.k - 1}: ${fr}→${sp}` : '① nothing',
                  `② disk ${f.k}: ${fr}→${to}`,
                  f.k > 1 ? `③ top ${f.k - 1}: ${sp}→${to}` : '③ nothing',
                ];
                return h('div.rc-frame', h('span.call', `hanoi(${f.k}, ${fr}→${to})`), ph.map((t, j) => h('span.rc-ph', { class: f.phase === j + 1 ? 'now' : f.phase > j + 1 ? 'done' : '', title: t }, t)));
              }));
            }
            // recurrence table with the current n highlighted
            const H = [0, 1]; for (let k = 2; k <= 7; k++) H.push(2 * H[k - 1] + 1);
            rc(mini, h('table.tt.rc-mini', { style: { width: '100%' } },
              h('tbody',
                h('tr', h('th', 'n'), [1, 2, 3, 4, 5, 6, 7].map((k) => h('td', { class: k === n ? 'on' : '' }, String(k)))),
                h('tr', h('th', { html: 'H<sub>n</sub>' }), [1, 2, 3, 4, 5, 6, 7].map((k) => h('td', { class: k === n ? 'on' : '' }, String(H[k])))))),
            h('p.tiny.muted', { style: { marginTop: '0.25rem' } }, 'Each value is twice the one before, plus 1: Hₙ = 2Hₙ₋₁ + 1.'));
          }
          reset();
          draw();
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Code: a recursive Tower of Hanoi solver',
        kind: 'code',
        file: 'hanoi.py',
        html: String.raw`<p class="muted small">The program below is the recurrence \(H_n = 2H_{n-1} + 1\) written as code. Switch to <b>Trace</b> to watch the calls nest four levels deep (down to <code>n = 0</code>) and unwind again.</p>`,
        fivew: {
          what: 'A recursive solver for the Tower of Hanoi that records every move in a list, prints the moves, and checks that 3 disks need exactly \\(2^3 - 1 = 7\\) moves.',
          why: 'The code has the same shape as the recurrence: two recursive calls on \\(n - 1\\) disks and one move. You can read the number of moves, and so the running time, straight off the program.',
          who: 'Anyone writing divide-and-conquer code: sorting, searching, processing nested folders or JSON, or planning a task whose steps need sub-steps done first.',
          where: 'The same recursive pattern drives backup rotation schedules (one is named after this puzzle), recursive file-system tools, and planners that break a goal into subgoals.',
          when: 'Use recursion when a problem contains smaller copies of itself. Count the calls before running it on large inputs: 64 disks would need about \\(1.8 \\times 10^{19}\\) moves.',
        },
        lines: [
          ['def hanoi(n, source, target, spare, moves):', "Defines the recursive solver. It moves <code>n</code> disks from the peg named <code>source</code> to the peg named <code>target</code>, using <code>spare</code> as the helper peg, and records each move in the list <code>moves</code>. Nothing runs until the function is called on line 9."],
          ['    if n == 0:', "The <span class=\"term\">base case</span>: zero disks need zero moves. Every recursive function needs an input it can answer without calling itself, or the calls would never stop. Each call works on one disk fewer, so this case is always reached."],
          ['        return', "Leaves the function at once. A bare <code>return</code> hands back <code>None</code>. That is fine here because the useful result is the list of moves, not a return value."],
          ['    hanoi(n - 1, source, spare, target, moves)', "Phase 1: move the top \\(n - 1\\) disks out of the way, from <code>source</code> onto <code>spare</code>. Notice the roles swap: the old spare becomes the target and the old target becomes the helper. This one call makes \\(H_{n-1}\\) moves."],
          ['    moves.append((n, source, target))', "Phase 2: disk <code>n</code>, the largest one here, now sits alone on <code>source</code> and <code>target</code> is empty, so it moves directly. The move is recorded as a tuple (disk, from, to). This single move is the \\(+1\\) in \\(H_n = 2H_{n-1} + 1\\)."],
          ['    hanoi(n - 1, spare, target, source, moves)', "Phase 3: move the \\(n - 1\\) disks from <code>spare</code> onto the largest disk at <code>target</code>, now using <code>source</code> as the helper. That is another \\(H_{n-1}\\) moves. Phases 1 and 3 together explain the \\(2H_{n-1}\\)."],
          ['', ''],
          ['moves = []', "Creates an empty list to collect the moves. It is created once, outside the function, and the same list is passed down to every call, so every level of the recursion appends to one shared record."],
          ['hanoi(3, "A", "C", "B", moves)', "Solves the 3-disk puzzle: move everything from A to C with B as the spare. This single call triggers 15 calls in total: 7 that move a disk and 8 with <code>n = 0</code> that return at once. In Trace mode the call depth on the right shows how deeply they nest."],
          ['for step, (disk, src, dst) in enumerate(moves, start=1):', "Loops over the recorded moves. <code>enumerate(..., start=1)</code> numbers them 1, 2, 3, …, and the pattern <code>(disk, src, dst)</code> unpacks each tuple into three variables in one step."],
          ['    print(f"{step}: disk {disk} {src} -> {dst}")', "Prints one move per line, for example <code>1: disk 1 A -> C</code>. The <code>f</code> before the quote makes it an f-string, so each <code>{...}</code> is replaced by the variable's value. Notice that disk 1 moves on every odd-numbered step."],
          ['print(len(moves), "moves; 2**3 - 1 =", 2**3 - 1)', "Checks the count against the closed form and prints <code>7 moves; 2**3 - 1 = 7</code>. <code>len(moves)</code> counts the recorded moves, and <code>**</code> is Python's power operator. Comparing a closed form with real output on small cases is a cheap and powerful test."],
        ],
        expected: '1: disk 1 A -> C\n2: disk 2 A -> B\n3: disk 1 C -> B\n4: disk 3 A -> C\n5: disk 1 B -> A\n6: disk 2 B -> C\n7: disk 1 A -> C\n7 moves; 2**3 - 1 = 7\n',
        tryIt: 'Change the 3 to 4 (in both places on the last line too) and predict the number of moves before you run it. Then add <code>print(n, source, target)</code> as the first line of the function body to see every call, including the ones with <code>n = 0</code>.',
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Solving by iteration, then proving it by induction',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p><b>Step 1: iterate.</b> <span class="term">Iteration</span> substitutes the rule into itself until a pattern appears. For the Tower of Hanoi:</p>
              <div class="box">
                <table class="rc-unroll">
                  <tr><td>\(H_n\)</td><td>\(= 2H_{n-1} + 1\)</td><td class="muted">the rule</td></tr>
                  <tr><td></td><td>\(= 2(2H_{n-2} + 1) + 1 = 2^2 H_{n-2} + 2 + 1\)</td><td class="muted">rule for \(H_{n-1}\)</td></tr>
                  <tr><td></td><td>\(= 2^3 H_{n-3} + 2^2 + 2 + 1\)</td><td class="muted">rule for \(H_{n-2}\)</td></tr>
                  <tr><td></td><td>\(\quad\vdots\)</td><td></td></tr>
                  <tr><td></td><td>\(= 2^{n-1} H_1 + 2^{n-2} + \dots + 2 + 1\)</td><td class="muted">after \(n-1\) steps</td></tr>
                  <tr><td></td><td>\(= 2^{n-1} + 2^{n-2} + \dots + 2 + 1 = 2^n - 1\)</td><td class="muted">\(H_1 = 1\)</td></tr>
                </table>
              </div>
              <p class="small">The last step is a geometric sum: \(1 + 2 + 4 + \dots + 2^{n-1} = 2^n - 1\). In binary it is \(n\) ones in a row, which is one less than a 1 followed by \(n\) zeros.</p>
              <div class="ex">The same trick solves compound interest: \(A_n = 1.05A_{n-1} = 1.05^2 A_{n-2} = \dots = 1.05^n A_0\). After 10 years, \(A_{10} = 1000 \cdot 1.05^{10} \approx 1628.89\).</div>
            </div>
            <div class="stack">
              <p><b>Step 2: prove the guess by induction.</b> Iteration suggests a formula but does not prove it, because the \(\vdots\) hides infinitely many steps. Induction closes that gap.</p>
              <div class="thm">Claim: \(H_n = 2^n - 1\) for every \(n \ge 1\).<br>
                <b>Base case.</b> \(H_1 = 1 = 2^1 - 1\).<br>
                <b>Inductive step.</b> Assume \(H_k = 2^k - 1\) for some \(k \ge 1\). Then
                \[H_{k+1} = 2H_k + 1 = 2(2^k - 1) + 1 = 2^{k+1} - 1.\]
                So the formula holds for \(k + 1\), and by induction for every \(n \ge 1\).</div>
              <div class="tip">Test a guess on small cases before proving it: \(H_1, \dots, H_4 = 1, 3, 7, 15\), and \(2^n - 1\) gives the same values. A guess that fails at \(n = 3\) saves you from trying to prove something false.</div>
              <div class="why">At one move per second, 64 disks take \(2^{64} - 1\) seconds, about 585 billion years. The closed form answers that question instantly. Running the recursion never would.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Linear homogeneous recurrences of order 2',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">linear homogeneous recurrence</span> of <span class="term">order</span> 2 with constant coefficients has the form
                \[a_n = c_1 a_{n-1} + c_2 a_{n-2}, \qquad c_2 \neq 0.\]
                <i>Linear</i>: earlier terms are only multiplied by constants. <i>Homogeneous</i>: no extra term such as \(+1\). <i>Order 2</i>: it looks back two steps.<div class="eg">\(a_n = 2a_{n-1} + 3a_{n-2}\) fits, with \(c_1 = 2\) and \(c_2 = 3\). \(a_n = a_{n-1} + a_{n-2} + 1\) does not, because of the \(+1\).</div></div>
              <p><b>The key idea.</b> Guess a solution of the form \(a_n = r^n\). Substituting gives \(r^n = c_1 r^{n-1} + c_2 r^{n-2}\). Dividing by \(r^{n-2}\) leaves the <span class="term">characteristic equation</span></p>
              <p class="big-math">\(r^2 - c_1 r - c_2 = 0.\)</p>
              <p class="small">Each root \(r\) gives a solution \(r^n\), and any sum of multiples of solutions is again a solution.</p>
              <div class="thm"><b>Distinct roots</b> \(r_1 \neq r_2\): \(\;a_n = b\,r_1^n + d\,r_2^n\).<br><b><span class="term">Repeated root</span></b> \(r\): \(\;a_n = b\,r^n + d\,n\,r^n\).<br>Find the constants \(b\) and \(d\) from the two initial conditions.</div>
            </div>
            <div class="stack">
              <div class="ex"><b>Fibonacci.</b> \(r^2 - r - 1 = 0\) has roots \(\varphi = \frac{1+\sqrt5}{2} \approx 1.618\) and \(\psi = \frac{1-\sqrt5}{2} \approx -0.618\). The conditions \(F_0 = 0\) and \(F_1 = 1\) give \(b = \frac{1}{\sqrt5}\) and \(d = -\frac{1}{\sqrt5}\), so
                \[F_n = \frac{\varphi^n - \psi^n}{\sqrt5}.\]
                This is <span class="term">Binet's formula</span>. Because \(|\psi| \lt 1\), the \(\psi^n\) term fades away and \(F_n\) is the integer nearest to \(\varphi^n/\sqrt5\). Fibonacci numbers grow by a factor of about 1.618, the <span class="term">golden ratio</span>, at every step.</div>
              <div class="ex"><b>Repeated root.</b> \(a_n = 4a_{n-1} - 4a_{n-2}\) with \(a_0 = 1\), \(a_1 = 4\). Here \(r^2 - 4r + 4 = (r-2)^2 = 0\), so 2 is a root twice and \(a_n = b\,2^n + d\,n\,2^n\). Then \(a_0 = b = 1\), and \(a_1 = 2b + 2d = 4\) gives \(d = 1\). So \(a_n = (n + 1)\,2^n\). Check: \(a_2 = 4 \cdot 4 - 4 \cdot 1 = 12 = 3 \cdot 2^2\).</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Lab: characteristic-equation solver',
        kind: 'lab',
        html: String.raw`<p class="muted small">Enter the coefficients and initial conditions of \(a_n = c_1 a_{n-1} + c_2 a_{n-2}\), or pick a preset. The lab solves the characteristic equation, finds the constants, and checks the closed form against the recurrence term by term. A root outside the dashed unit circle contributes exponential growth only when its term has a nonzero coefficient.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const presets = [
            ['Fibonacci', 1, 1, 0, 1], ['Lucas numbers', 1, 1, 2, 1], ['No "11" strings', 1, 1, 1, 2],
            ['Roots 2 and 3', 5, -6, 7, 16], ['Roots 3 and −2', 1, 6, 1, 8], ['Repeated root', 4, -4, 1, 4], ['Complex roots', 1, -1, 1, 1],
          ];
          const v = { c1: 1, c2: 1, a0: 0, a1: 1 };
          const inputs = {};
          const fields = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.4rem' } });
          for (const [k, label] of [['c1', 'c₁ (multiplies aₙ₋₁)'], ['c2', 'c₂ (multiplies aₙ₋₂)'], ['a0', 'a₀ (first term)'], ['a1', 'a₁ (second term)']]) {
            inputs[k] = h('input.inp.mono', { id: `rc-ce-${k}`, value: String(v[k]), inputmode: 'decimal', 'aria-label': label, oninput: () => draw() });
            fields.append(h('label.field', label, inputs[k]));
          }
          const presetRow = h('div.row', { style: { gap: '0.3rem' } }, presets.map(([name, c1, c2, a0, a1]) => h('button.btn.sm', { onclick: () => { Object.assign(v, { c1, c2, a0, a1 }); for (const k in inputs) inputs[k].value = String(v[k]); draw(); } }, name)));
          const msg = h('div.feedback');
          const plot = s('svg', { viewBox: '0 0 220 200', role: 'img', 'aria-label': 'Roots of the characteristic equation in the complex plane' });
          const steps = h('div.rc-steps');
          const table = h('div');
          body.append(h('div.rc-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.2fr) minmax(0, 1fr)' } },
            h('div.rc-panel', fields, presetRow, msg, h('div.figure', { style: { minHeight: 0, flex: '1 1 auto' } }, plot)),
            h('div.card', { style: { minHeight: 0, padding: '0.6rem 0.8rem', display: 'flex' } }, steps),
            h('div.rc-panel', table)));

          const num = (t) => { const x = Number(String(t).trim().replace('−', '-')); return String(t).trim() === '' ? NaN : x; };
          const base = (r) => (r < 0 || !isInt(r) ? `(${tn(r)})` : tn(r));
          function solve(c1, c2, a0, a1) {
            const exact = decimalIntegers([c1, c2, a0, a1]);
            const [C1, C2, A0, A1] = exact.values, scale = exact.scale;
            const discriminant = C1 * C1 + 4n * C2 * scale;
            const D = Number(`${discriminant}e-${2 * exact.places}`);
            const digits = String(discriminant < 0n ? -discriminant : discriminant);
            const Dtex = D === 0 && discriminant !== 0n ? `${discriminant < 0n ? '-' : ''}${digits[0]}.${digits.slice(1, 5)} \\times 10^{${digits.length - 1 - 2 * exact.places}}` : tn(D);
            if (discriminant === 0n) {
              const numerator = 2n * A1 * scale - A0 * C1;
              const r = c1 / 2, b = a0, d = integerRatio(numerator, C1 * scale);
              return { kind: 'repeated', D, Dtex, roots: [[r, 0]], b, d, active: [A0 !== 0n, numerator !== 0n], f: (n) => (b + d * n) * r ** n,
                rootsTex: String.raw`r = \frac{c_1}{2} = ${tn(r)}\ \text{(twice)}`,
                consTex: String.raw`n=0:\ b = ${tn(a0)} \qquad n=1:\ ${tn(r)}b + ${tn(r)}d = ${tn(a1)}`,
                solTex: String.raw`b = ${tn(b)},\quad d = ${tn(d)}`,
                formTex: String.raw`a_n = \left(${tn(b)} ${d < 0 ? '-' : '+'} ${tn(Math.abs(d))}n\right) \cdot ${base(r)}^n` };
            }
            if (discriminant > 0n) {
              const sq = decimalSqrt(discriminant, 2 * exact.places);
              let r1 = (c1 + sq) / 2, r2 = (c1 - sq) / 2;
              if (c1 >= 0 && Math.abs(c1 - sq) < Math.max(c1, sq) / 2) r2 = -c2 / r1;
              else if (c1 < 0 && Math.abs(c1 + sq) < Math.max(-c1, sq) / 2) r1 = -c2 / r2;
              let b = (a1 - a0 * r2) / sq, d = (a0 * r1 - a1) / sq, active = [true, true];
              if (A0 === 0n && A1 === 0n) { b = 0; d = 0; active = [false, false]; }
              else if (A0 !== 0n && A1 * A1 * scale - C1 * A0 * A1 - C2 * A0 * A0 === 0n) {
                const onlyRoot = integerRatio(A1, A0);
                if ((2n * A1 * scale - C1 * A0) * A0 > 0n) { r1 = onlyRoot; b = a0; d = 0; active = [true, false]; }
                else { r2 = onlyRoot; b = 0; d = a0; active = [false, true]; }
              }
              const fib = c1 === 1 && c2 === 1 && a0 === 0 && a1 === 1;
              return { kind: 'distinct', D, Dtex, roots: [[r1, 0], [r2, 0]], b, d, active, f: (n) => b * r1 ** n + d * r2 ** n,
                rootsTex: String.raw`r_1 = \tfrac{c_1 + \sqrt{\Delta}}{2} = ${tn(r1)},\quad r_2 = \tfrac{c_1 - \sqrt{\Delta}}{2} = ${tn(r2)}`,
                consTex: String.raw`b + d = ${tn(a0)}, \qquad ${tn(r1)}\,b ${r2 < 0 ? '-' : '+'} ${tn(Math.abs(r2))}\,d = ${tn(a1)}`,
                solTex: String.raw`b = ${tn(b)},\quad d = ${tn(d)}`,
                formTex: String.raw`a_n = ${tn(b)} \cdot ${base(r1)}^n ${d < 0 ? '-' : '+'} ${tn(Math.abs(d))} \cdot ${base(r2)}^n` + (fib ? String.raw`\;=\; \tfrac{\varphi^n - \psi^n}{\sqrt5}` : '') };
            }
            const real = c1 / 2, imaginary = decimalSqrt(-discriminant, 2 * exact.places) / 2;
            const rho = decimalSqrt(-C2, exact.places), th = Math.atan2(imaginary, real);
            const al = a0, be = integerRatio(2n * A1 * scale - A0 * C1, 2n * scale * scale) / imaginary;
            const rho1 = near(rho, 1);
            const cf = (x) => (near(x, 1) ? '' : near(x, -1) ? '-' : tn(x) + '\\ ');
            let thTex = tn(th);
            for (let q = 1; q <= 12; q++) { const p = (th / Math.PI) * q; if (isInt(p) && Math.round(p) > 0) { thTex += String.raw` = \tfrac{${Math.round(p) === 1 ? '' : Math.round(p)}\pi}{${q}}`.replace(/\\tfrac\{(\d*)\\pi\}\{1\}/, '$1\\pi'); break; } }
            return { kind: 'complex', D, Dtex, rho, roots: [[real, imaginary], [real, -imaginary]], b: al, d: be,
              f: (n) => rho ** n * (al * Math.cos(n * th) + be * Math.sin(n * th)),
              rootsTex: String.raw`r = ${rho1 ? '' : tn(rho)}(\cos\theta \pm i\ \sin\theta),\quad \theta \approx ${thTex}`,
              consTex: String.raw`a_n = ${rho1 ? '' : tn(rho) + '^n'}(\alpha\ \cos(n\theta) + \beta\ \sin(n\theta))`,
              solTex: String.raw`\alpha = a_0 = ${tn(al)},\quad \beta = ${tn(be)}`,
              formTex: String.raw`a_n = ${rho1 ? '' : tn(rho) + '^n'}\left(${cf(al)}\cos(n\theta) ${be < 0 ? '-' : '+'} ${cf(Math.abs(be))}\sin(n\theta)\right)` };
          }
          function drawPlot(roots) {
            const R = Math.max(1.25, ...roots.map(([x, y]) => Math.hypot(x, y))) * 1.18;
            const cx = 110, cy = 100, sc = 82 / R;
            const kids = [
              s('line', { x1: 8, y1: cy, x2: 212, y2: cy, stroke: 'var(--rule)', 'stroke-width': 1.2 }),
              s('line', { x1: cx, y1: 10, x2: cx, y2: 190, stroke: 'var(--rule)', 'stroke-width': 1.2 }),
              s('circle', { cx, cy, r: sc, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
              s('text', { x: 212, y: cy + 15, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--ink-3)', text: 'real' }),
              s('text', { x: cx + 5, y: 20, 'font-size': 10, fill: 'var(--ink-3)', text: 'imaginary' }),
              s('text', { x: cx + sc + 2, y: cy + 13, 'font-size': 10, fill: 'var(--ink-3)', text: '1' }),
            ];
            roots.forEach(([x, y], i) => {
              const px = cx + x * sc, py = cy - y * sc;
              kids.push(s('circle', { cx: px, cy: py, r: roots.length === 1 ? 7 : 5.5, fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': 1.5 }));
              kids.push(s('text', { class: 'rc-label', x: px, y: py + (y > 0 || (y === 0 && i === 0) ? -11 : 20), 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink)', text: y === 0 ? fmt(x) : `${fmt(x)} ${y > 0 ? '+' : '−'} ${fmt(Math.abs(y))}i` }));
            });
            rc(plot, kids);
          }
          function draw() {
            for (const k in inputs) v[k] = num(inputs[k].value);
            const bad = Object.entries(v).find(([, x]) => !Number.isFinite(x) || Math.abs(x) > 1000);
            if (bad) { msg.className = 'feedback bad'; msg.textContent = 'Each box needs a number between −1000 and 1000.'; rc(steps); rc(table); rc(plot); return; }
            if (v.c2 === 0) { msg.className = 'feedback info'; msg.textContent = 'With c₂ = 0 the rule only looks back one step, so it is not order 2. Pick any c₂ other than 0.'; rc(steps); rc(table); rc(plot); return; }
            msg.textContent = ''; msg.className = 'feedback';
            const { c1, c2, a0, a1 } = v;
            const S = solve(c1, c2, a0, a1);
            drawPlot(S.roots);
            const kindText = S.kind === 'distinct' ? 'positive, so there are two different real roots' : S.kind === 'repeated' ? 'zero, so there is one repeated root' : 'negative, so the roots are a pair of complex numbers';
            const growth = growthText(S);
            steps.innerHTML = String.raw`
              <div><div class="lbl">1 · Recurrence</div>\(a_n = ${combo([[c1, 'a_{n-1}'], [c2, 'a_{n-2}']])},\ a_0 = ${tn(a0)},\ a_1 = ${tn(a1)}\)</div>
              <div><div class="lbl">2 · Characteristic equation</div>\(r^2 ${c1 === 0 ? '' : (c1 > 0 ? '- ' : '+ ') + (Math.abs(c1) === 1 ? '' : tn(Math.abs(c1))) + 'r'} ${c2 > 0 ? '-' : '+'} ${tn(Math.abs(c2))} = 0\)</div>
              <div><div class="lbl">3 · Discriminant</div>\(\Delta = c_1^2 + 4c_2 = ${S.Dtex}\): ${kindText}.</div>
              <div><div class="lbl">4 · Roots</div>\(${S.rootsTex}\)</div>
              <div><div class="lbl">5 · Constants from \(a_0, a_1\)</div>\(${S.consTex}\)<br>\(${S.solTex}\)</div>
              <div><div class="lbl">6 · Closed form</div>\(${S.formTex}\)</div>
              <p class="small muted">${growth}</p>
              <p class="small" style="margin-top:auto"><b>Try this.</b> Change only \(a_0\) or \(a_1\). The roots stay put, but a constant can become zero. Initial conditions determine which root terms appear and can change the sequence's growth.</p>`;
            ctx.tex(steps);
            const it = [a0, a1];
            for (let n = 2; n <= 10; n++) it.push(c1 * it[n - 1] + c2 * it[n - 2]);
            const allOk = it.every((x, n) => near(x, S.f(n)));
            rc(table,
              h('table.tt.rc-table', h('thead', h('tr', h('th', 'n'), h('th', 'from rule'), h('th', 'closed form'), h('th', 'ratio'))),
                h('tbody', it.map((x, n) => h('tr', h('td', String(n)), h('td.mono', fmt(x)), h('td.mono', { class: near(x, S.f(n)) ? 'ok' : 'bad' }, fmt(S.f(n))), h('td.mono.muted', n > 0 && it[n - 1] !== 0 ? fmt(x / it[n - 1]) : '–'))))),
              h('div.feedback', { class: allOk ? 'good' : 'bad', style: { fontSize: '0.8rem' } }, allOk ? 'The closed form matches the rule on every row (up to rounding).' : 'Mismatch: check the inputs.'),
              h('p.tiny.muted', 'The ratio column divides each term by the one before it; a zero denominator has no ratio. A unique dominant root with a nonzero contribution controls the limiting ratio.'));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Recurrences hiding inside algorithms',
        kind: 'concept',
        html: String.raw`
          <p>To analyze a recursive algorithm, let \(T(n)\) be the number of basic steps on an input of size \(n\). Write down what <i>one</i> call does: the calls it makes, plus its own extra work. That sentence is the recurrence.</p>
          <table class="tt" style="width:100%">
            <thead><tr><th class="l">Algorithm</th><th class="l">One call on size \(n\) does…</th><th>Recurrence</th><th>Solution</th></tr></thead>
            <tbody>
              <tr><td class="l">Recursive binary search</td><td class="l">1 comparison, then searches one half</td><td>\(T(n) = T(n/2) + 1\)</td><td>\(\Theta(\log\ n)\)</td></tr>
              <tr><td class="l">Merge sort</td><td class="l">sorts both halves, then merges them with up to \(n\) comparisons</td><td>\(T(n) = 2T(n/2) + n\)</td><td>\(\Theta(n\ \log\ n)\)</td></tr>
              <tr><td class="l">Tower of Hanoi</td><td class="l">two \((n-1)\)-disk solves plus 1 move</td><td>\(H_n = 2H_{n-1} + 1\)</td><td>\(2^n - 1\)</td></tr>
              <tr><td class="l">Naive recursive Fibonacci</td><td class="l">calls itself on \(n-1\) and on \(n-2\)</td><td>\(C_n = C_{n-1} + C_{n-2} + 1\)</td><td>\(2F_{n+1} - 1 = \Theta(\varphi^n)\)</td></tr>
            </tbody>
          </table>
          <div class="split">
            <div class="ex">Unroll binary search with \(T(1) = 1\): \(T(n) = T(n/2) + 1 = T(n/4) + 2 = \dots = T(n/2^k) + k\). The halving stops when \(n/2^k = 1\), that is \(k = \log_2\ n\), so \(T(n) = \log_2\ n + 1\). A sorted list of a million items needs only about 20 comparisons.</div>
            <div class="warn">Look at <i>how</i> the size shrinks. \(T(n) = T(n-1) + 1\) removes one item per call: \(n\) steps. \(T(n) = T(n/2) + 1\) halves the problem: \(\log_2\ n\) steps. Two calls on \(n - 1\), as in Hanoi, double the work at every level: \(2^n\). Small changes to a recurrence change the speed enormously.</div>
          </div>
          <div class="ai">Training-data pipelines sort, deduplicate and shard billions of examples with <span class="term">divide and conquer</span>: split the data, process the pieces in parallel, merge the results. The recurrence \(T(n) = 2T(n/2) + n\) is why that costs about \(n\ \log\ n\) work instead of \(n^2\).</div>`,
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Recursion trees and the master theorem',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p>A <span class="term">recursion tree</span> draws every call as a node labeled with the work it does outside its recursive calls. Add up each level, then add the levels. For merge sort, \(T(n) = 2T(n/2) + n\):</p>
              <div class="figure">
                <svg viewBox="0 0 470 196" role="img" aria-label="Recursion tree for merge sort: every level costs n">
                  <g stroke="var(--ink-3)" stroke-width="1.3" fill="none">
                    <path d="M170 34 L95 64 M200 34 L275 64 M80 92 L45 122 M110 92 L140 122 M260 92 L225 122 M290 92 L320 122"/>
                  </g>
                  <g fill="var(--accent-2)" stroke="var(--accent)" stroke-width="1.5">
                    <rect x="150" y="8" width="70" height="26" rx="6"/>
                    <rect x="62" y="64" width="66" height="28" rx="6"/><rect x="242" y="64" width="66" height="28" rx="6"/>
                    <rect x="22" y="122" width="48" height="26" rx="6"/><rect x="116" y="122" width="48" height="26" rx="6"/>
                    <rect x="202" y="122" width="48" height="26" rx="6"/><rect x="296" y="122" width="48" height="26" rx="6"/>
                  </g>
                  <g fill="var(--ink)" font-size="14" text-anchor="middle">
                    <text x="185" y="26">n</text><text x="95" y="83">n/2</text><text x="275" y="83">n/2</text>
                    <text x="46" y="140">n/4</text><text x="140" y="140">n/4</text><text x="226" y="140">n/4</text><text x="320" y="140">n/4</text>
                    <text x="185" y="172">⋮</text>
                    <text x="185" y="190" font-size="12" fill="var(--ink-2)">1 1 1 1 1 1 1 … 1</text>
                  </g>
                  <g fill="var(--accent)" font-size="13" font-weight="600">
                    <text x="378" y="26">= n</text><text x="378" y="83">2 · n/2 = n</text><text x="378" y="140">4 · n/4 = n</text><text x="378" y="190">n · 1 = n</text>
                  </g>
                </svg>
              </div>
              <p class="small">Every level costs \(n\). Halving reaches size 1 after \(\log_2\ n\) steps, so there are \(\log_2\ n + 1\) levels and \(T(n) = n(\log_2\ n + 1) = \Theta(n\ \log\ n)\).</p>
              <table class="tt" style="width:100%">
                <thead><tr><th>Recurrence</th><th>\(a, b, d\)</th><th>\(\log_b\ a\)</th><th>Result</th></tr></thead>
                <tbody>
                  <tr><td>\(T(n/2) + 1\)</td><td>1, 2, 0</td><td>0</td><td>\(\Theta(\log\ n)\)</td></tr>
                  <tr><td>\(2T(n/2) + n\)</td><td>2, 2, 1</td><td>1</td><td>\(\Theta(n\ \log\ n)\)</td></tr>
                  <tr><td>\(3T(n/2) + n\)</td><td>3, 2, 1</td><td>1.585</td><td>\(\Theta(n^{1.585})\)</td></tr>
                  <tr><td>\(2T(n/2) + n^2\)</td><td>2, 2, 2</td><td>1</td><td>\(\Theta(n^2)\)</td></tr>
                </tbody>
              </table>
            </div>
            <div class="stack">
              <div class="thm">The <span class="term">master theorem</span> (simple form). If \(T(n) = a\,T(n/b) + \Theta(n^d)\) with \(a \ge 1\), \(b \gt 1\) and \(d \ge 0\), then
                \[T(n) = \begin{cases} \Theta(n^d) & \text{if } d \gt \log_b\ a \\ \Theta(n^d\ \log\ n) & \text{if } d = \log_b\ a \\ \Theta(n^{\log_b\ a}) & \text{if } d \lt \log_b\ a \end{cases}\]</div>
              <p class="small"><b>Why it works.</b> Level \(k\) of the tree has \(a^k\) calls, each on size \(n/b^k\), so the level costs \(n^d (a/b^d)^k\). Everything depends on the ratio \(a/b^d\):</p>
              <ul class="small">
                <li>below 1: each level is cheaper than the one above, so the root's \(n^d\) dominates;</li>
                <li>exactly 1: every level costs \(n^d\), and the \(\log\ n\) levels multiply it;</li>
                <li>above 1: each level is costlier, so the \(n^{\log_b\ a}\) leaves at the bottom dominate.</li>
              </ul>
              <div class="warn">The theorem needs subproblems that shrink by a constant <i>factor</i> \(b\). It does not apply to Hanoi or Fibonacci, where the size drops by subtraction. Use iteration or the characteristic equation for those.</div>
              <div class="tip">Before you ship a recursive function, write its recurrence in a comment and solve it. Thirty seconds with the master theorem can reveal a hidden \(n^2\).</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: recursion-tree explorer',
        kind: 'lab',
        html: String.raw`<p class="muted small">For \(T(n) = a\,T(n/b) + n^d\), choose \(a\) (calls per call), \(b\) (how much smaller each call is) and \(d\) (each call on size \(m\) does \(m^d\) work). Each bar is one level of the tree, and its length is that level's <b>total</b> work. Watch where the work piles up: at the top, evenly, or at the bottom.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          let a = 2, b = 2, d = 1, k = 4;
          const presets = [['Binary search', 1, 2, 0], ['Merge sort', 2, 2, 1], ['Karatsuba', 3, 2, 1], ['Strassen', 7, 2, 2], ['2T(n/2) + n²', 2, 2, 2]];
          const svg = s('svg', { viewBox: '0 0 600 360', role: 'img', 'aria-label': 'Recursion tree, one bar per level' });
          const ctl = h('div.rc-ctl4');
          const presetRow = h('div.row', { style: { gap: '0.3rem' } });
          const info = h('div.stack', { style: { gap: '0.4rem' } });
          body.append(h('div.rc-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)' } },
            h('div.figure', { style: { minHeight: 0, alignItems: 'start' } }, svg),
            h('div.rc-panel', ctl, presetRow, info)));
          const big = (x) => (x >= 1e7 ? x.toExponential(2).replace('e+', '×10^') : Math.round(x).toLocaleString('en-US'));
          const seg = (vals, cur, set) => h('div.seg', vals.map((x) => h('button', { 'aria-pressed': String(x === cur), onclick: () => { set(x); draw(); } }, String(x))));
          function draw() {
            rc(ctl,
              h('span', 'a'), seg([1, 2, 3, 4, 7, 8], a, (x) => (a = x)),
              h('span', 'b'), seg([2, 3, 4], b, (x) => (b = x)),
              h('span', 'd'), seg([0, 1, 2, 3], d, (x) => (d = x)),
              h('span', 'levels'), seg([2, 3, 4, 5], k, (x) => (k = x)));
            rc(presetRow, presets.map(([name, A, B, D]) => h('button.btn.sm', { class: a === A && b === B && d === D ? 'on' : '', onclick: () => { a = A; b = B; d = D; draw(); } }, name)));
            const n = b ** k;
            const lv = [];
            for (let i = 0; i <= k; i++) { const cnt = a ** i, size = b ** (k - i), per = size ** d; lv.push({ i, cnt, size, per, tot: cnt * per }); }
            const maxT = Math.max(...lv.map((x) => x.tot));
            const total = lv.reduce((acc, x) => acc + x.tot, 0);
            // tree drawing: bars centered on x = 300, width proportional to the level total
            const top = 18, rowH = Math.min(58, 320 / (k + 1)), barH = Math.min(26, rowH * 0.5), maxW = 400, cx = 290;
            const kids = [];
            const boxes = lv.map((L) => {
              const w = Math.max(4, (L.tot / maxT) * maxW);
              const y = top + L.i * rowH;
              const show = L.cnt <= 32 && w / L.cnt >= 4;
              const list = [];
              if (show) { const gap = L.cnt > 1 ? Math.min(6, (w / L.cnt) * 0.25) : 0; const bw = (w - gap * (L.cnt - 1)) / L.cnt; for (let j = 0; j < L.cnt; j++) list.push({ x: cx - w / 2 + j * (bw + gap), w: bw, y }); }
              return { L, w, y, show, list };
            });
            boxes.forEach((B, idx) => {
              const next = boxes[idx + 1];
              if (next && B.show && next.show) B.list.forEach((p, j) => { for (let c = 0; c < a; c++) { const q = next.list[j * a + c]; if (q) kids.push(s('line', { x1: p.x + p.w / 2, y1: p.y + barH, x2: q.x + q.w / 2, y2: q.y, stroke: 'var(--ink-3)', 'stroke-width': 0.8, opacity: 0.7 })); } });
            });
            boxes.forEach((B) => {
              const share = B.L.tot / maxT;
              const op = 0.18 + 0.72 * share;
              if (B.show) B.list.forEach((p) => kids.push(s('rect', { x: p.x, y: p.y, width: Math.max(1, p.w), height: barH, rx: Math.min(4, p.w / 2), fill: 'var(--accent)', 'fill-opacity': op, stroke: 'var(--accent)', 'stroke-width': 1 })));
              else kids.push(s('rect', { x: cx - B.w / 2, y: B.y, width: B.w, height: barH, rx: 4, fill: 'var(--accent)', 'fill-opacity': op, stroke: 'var(--accent)', 'stroke-width': 1 }));
              const tfill = op > 0.5 ? 'var(--accent-ink)' : 'var(--ink)';
              if (B.show && B.list.length && B.list[0].w >= 26) B.list.forEach((p) => kids.push(s('text', { x: p.x + p.w / 2, y: p.y + barH / 2 + 4, 'text-anchor': 'middle', 'font-size': 10.5, fill: tfill, text: String(B.L.size) })));
              kids.push(s('text', { x: 8, y: B.y + barH / 2 + 4, 'font-size': 11, fill: 'var(--ink-3)', 'font-family': 'var(--font-mono)', text: `L${B.L.i}` }));
              kids.push(s('text', { x: 592, y: B.y + barH / 2 + 4, 'text-anchor': 'end', 'font-size': 11.5, 'font-weight': share > 0.999 ? 700 : 400, fill: share > 0.999 ? 'var(--accent)' : 'var(--ink-2)', text: big(B.L.tot) }));
              if (!B.show) kids.push(s('text', { x: B.w > 150 ? cx : cx + B.w / 2 + 6, y: B.y + barH / 2 + 4, 'text-anchor': B.w > 150 ? 'middle' : 'start', 'font-size': 10.5, fill: B.w > 150 ? tfill : 'var(--ink-2)', text: `${big(B.L.cnt)} calls of size ${B.L.size}` }));
            });
            kids.push(s('text', { x: 592, y: 12, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--ink-3)', 'font-family': 'var(--font-mono)', text: 'LEVEL TOTAL' }));
            rc(svg, kids);
            svg.setAttribute('viewBox', `0 0 600 ${Math.ceil(top + (k + 1) * rowH + 4)}`);
            // analysis
            const L = Math.log(a) / Math.log(b);
            const bd = b ** d;
            const kase = a < bd ? 'root' : a === bd ? 'even' : 'leaf';
            const ratio = a / bd;
            const workTex = d === 0 ? '1' : d === 1 ? 'n' : `n^{${d}}`;
            const Lt = isInt(L) ? String(Math.round(L)) : L.toFixed(3);
            const result = kase === 'root' ? (d === 1 ? 'n' : `n^{${d}}`) : kase === 'even' ? (d === 0 ? '\\log\\ n' : d === 1 ? 'n\\ \\log\\ n' : `n^{${d}}\\ \\log\\ n`) : (isInt(L) ? (Math.round(L) === 1 ? 'n' : `n^{${Math.round(L)}}`) : `n^{${L.toFixed(3)}}`);
            const why = {
              root: `The ratio \\(a/b^d = ${+ratio.toFixed(3)}\\) is below 1, so every level does less work than the level above it. The levels form a shrinking geometric series and the root's \\(n^{${d}}\\) work dominates.`,
              even: `The ratio \\(a/b^d = 1\\), so every level does exactly the same work, \\(${workTex}\\). There are \\(\\log_${b}\\ n + 1 = ${k + 1}\\) levels, which contributes the \\(\\log\\ n\\) factor.`,
              leaf: `The ratio \\(a/b^d = ${+ratio.toFixed(3)}\\) is above 1, so each level does more work than the one above it. The bottom level has \\(a^{\\log_b\\ n} = n^{\\log_b\\ a}\\) leaves, and they dominate.`,
            }[kase];
            rc(info,
              h('div.big-math', { style: { fontSize: '1.1rem', textAlign: 'left' }, html: String.raw`\(T(n) = ${a === 1 ? '' : a}T(n/${b}) + ${workTex}\), \(n = ${b}^{${k}} = ${n}\)` }),
              h('table.tt.rc-table', h('thead', h('tr', h('th', 'level'), h('th', 'calls'), h('th', 'size'), h('th', 'work each'), h('th', 'level total'))),
                h('tbody', lv.map((x) => h('tr', h('td', String(x.i)), h('td.mono', big(x.cnt)), h('td.mono', String(x.size)), h('td.mono', big(x.per)), h('td.mono', { style: { fontWeight: x.tot === maxT ? 700 : 400 } }, big(x.tot))))),
                h('tfoot', h('tr', h('th', { colspan: 4, class: 'l' }, 'sum of all levels'), h('th.mono', big(total))))),
              h('div.feedback.info', { html: String.raw`\(\log_{${b}}\ ${a} = ${Lt} ${kase === 'root' ? '\\lt' : kase === 'even' ? '=' : '\\gt'} d = ${d}\), so <b>${kase === 'root' ? 'the root dominates' : kase === 'even' ? 'all levels are equal' : 'the leaves dominate'}</b>: \(T(n) = \Theta(${result})\).` }),
              h('p.small', { html: why }));
            ctx.tex(info);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Lab: Fibonacci call tree and memoization',
        kind: 'lab',
        html: String.raw`<p class="muted small"><span class="term">Memoization</span> stores each answer the first time it is computed and returns the stored copy on every later call. Step through naive recursion and count how often each call repeats (the <span class="term">overlapping subproblems</span>), then switch to the memoized version. Nodes with the same number are the same question asked again.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const PAL = ['--ink-3', '--true', '--num', '--fnc', '--kw', '--str', '--warn', '--accent', '--false'];
          let n = 6, memo = false, at = 0, tree = null;
          function build() {
            const nodes = [], events = [], done = new Set();
            let leaf = 0;
            (function rec(k, depth, parent) {
              const node = { k, depth, parent, kids: [], hit: false };
              nodes.push(node);
              node.callAt = events.length; events.push({ t: 'call', node });
              if (memo && done.has(k)) { node.hit = true; node.x = leaf++; node.val = fibs[k]; }
              else if (k >= 2) {
                const l = rec(k - 1, depth + 1, node), r = rec(k - 2, depth + 1, node);
                node.kids = [l, r]; node.x = (l.x + r.x) / 2; node.val = l.val + r.val;
              } else { node.x = leaf++; node.val = k; }
              if (!node.hit) done.add(k);
              node.retAt = events.length; events.push({ t: 'ret', node });
              return node;
            })(n, 0, null);
            tree = { nodes, events, leaves: leaf, depth: Math.max(...nodes.map((x) => x.depth)) };
            at = 0;
          }
          const svg = s('svg', { viewBox: '0 0 620 380', role: 'img', 'aria-label': 'Call tree of the recursive Fibonacci function' });
          const say = h('div.small', { style: { minHeight: '2.6em' }, 'aria-live': 'polite' });
          const modeSeg = h('div.seg');
          const nSeg = h('div.seg');
          const playBtn = h('button.btn.sm.primary', { onclick: () => play() });
          const playOpts = { ms: 320, button: playBtn, tick: () => { if (at >= tree.events.length) return false; at++; draw(); return at < tree.events.length; } };
          const player = ctx.ticker(playOpts);
          const counts = h('div.rc-stats');
          const bars = h('div.rc-bars');
          const memoRow = h('div.rc-memo');
          const note = h('p.tiny.muted');
          body.append(h('div.rc-lab.fill', { style: { gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)' } },
            h('div.stack', { style: { minHeight: 0, gap: '0.3rem' } }, h('div.figure', { style: { minHeight: 0, flex: '1 1 auto' } }, svg), say),
            h('div.rc-panel',
              h('div.rc-ctl', h('span', 'Version'), modeSeg, h('span', 'n'), nSeg),
              h('div.row', { style: { gap: '0.3rem' } },
                h('button.btn.sm', { onclick: () => { player.stop(); at = Math.max(0, at - 1); draw(); } }, '◀ Back'),
                h('button.btn.sm', { onclick: () => { player.stop(); at = Math.min(tree.events.length, at + 1); draw(); } }, 'Step ▶'),
                playBtn,
                h('button.btn.sm', { onclick: () => { player.stop(); at = tree.events.length; draw(); } }, 'Show all'),
                h('button.btn.sm', { onclick: () => { player.stop(); at = 0; draw(); } }, 'Reset')),
              counts,
              h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.2rem' } }, 'HOW OFTEN EACH CALL HAS RUN SO FAR'), bars),
              h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.2rem' } }, 'MEMO TABLE'), memoRow),
              note)));
          function play() {
            if (player.playing) { player.stop(); return; }
            if (at >= tree.events.length) at = 0;
            playOpts.ms = n >= 7 ? 160 : 320; // bigger trees have more events, so they play faster
            player.start();
            draw();
          }
          function draw() {
            rc(modeSeg, [['Naive', false], ['Memoized', true]].map(([lbl, m]) => h('button', { 'aria-pressed': String(m === memo), onclick: () => { player.stop(); memo = m; build(); draw(); } }, lbl)));
            rc(nSeg, [2, 3, 4, 5, 6, 7, 8].map((k) => h('button', { 'aria-pressed': String(k === n), onclick: () => { player.stop(); n = k; build(); draw(); } }, String(k))));
            const { nodes, events, leaves, depth } = tree;
            const W = 620, H = 380, padX = 14, top = 22, bottom = 24;
            const sp = (W - 2 * padX) / leaves;
            const r = Math.max(8, Math.min(17, sp * 0.4));
            const rowH = depth ? (H - top - bottom) / depth : 0;
            const X = (nd) => padX + (nd.x + 0.5) * sp, Y = (nd) => top + nd.depth * rowH;
            const cur = at > 0 ? events[at - 1] : null;
            const kids = [];
            for (const nd of nodes) if (nd.parent) {
              const seen = nd.callAt < at;
              kids.push(s('line', { x1: X(nd.parent), y1: Y(nd.parent), x2: X(nd), y2: Y(nd), stroke: seen ? 'var(--ink-2)' : 'var(--rule)', 'stroke-width': seen ? 1.4 : 1, 'stroke-dasharray': seen ? null : '3 3' }));
            }
            for (const nd of nodes) {
              const called = nd.callAt < at, returned = nd.retAt < at;
              const col = `var(${PAL[nd.k % PAL.length]})`;
              const isCur = cur && cur.node === nd;
              if (isCur) kids.push(s('circle', { cx: X(nd), cy: Y(nd), r: r + 4.5, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 }));
              kids.push(s('circle', { cx: X(nd), cy: Y(nd), r: nd.hit ? r * 0.85 : r, fill: 'var(--paper)', stroke: 'none' }));
              kids.push(s('circle', { cx: X(nd), cy: Y(nd), r: nd.hit ? r * 0.85 : r, fill: called ? col : 'var(--sheet)', 'fill-opacity': called ? (returned ? 0.22 : 0.5) : 1, stroke: called ? col : 'var(--rule)', 'stroke-width': called ? (returned ? 2 : 3) : 1.2, 'stroke-dasharray': nd.hit ? '3 2' : null }));
              kids.push(s('text', { x: X(nd), y: Y(nd) + Math.min(5, r * 0.35), 'text-anchor': 'middle', 'font-size': Math.max(9, Math.min(14, r * 0.9)), 'font-weight': 700, fill: called ? 'var(--ink)' : 'var(--ink-3)', opacity: called ? 1 : 0.55, text: String(nd.k) }));
              if (returned && r >= 11 && nd.k >= 2 && !nd.hit) kids.push(s('text', { x: X(nd) + r + 3, y: Y(nd) - r + 4, 'font-size': 10, fill: 'var(--ink-2)', text: '=' + nd.val }));
            }
            kids.push(s('text', { x: padX, y: 12, 'font-size': 10.5, fill: 'var(--ink-3)', 'font-family': 'var(--font-mono)', text: `node k = the call fib(k)${memo ? ' · dashed = answered from the memo table' : ''}` }));
            rc(svg, kids);
            // narration
            if (!cur) say.innerHTML = `Press <b>Step</b> or <b>Play</b>. The first call is <code>fib(${n})</code>.`;
            else {
              const nd = cur.node, who = nd.parent ? ` (asked by fib(${nd.parent.k}))` : '';
              if (cur.t === 'call') say.innerHTML = nd.hit ? `<code>fib(${nd.k})</code>${who} is already in the memo table: return ${nd.val} at once, no recursion.` : `Call <code>fib(${nd.k})</code>${who}. ${nd.k < 2 ? 'This is a base case.' : `It must first compute fib(${nd.k - 1}) and fib(${nd.k - 2}).`}`;
              else say.innerHTML = nd.hit ? `<code>fib(${nd.k})</code> returns the stored value ${nd.val}.` : `<code>fib(${nd.k})</code> returns ${nd.val}${nd.k >= 2 ? ` = ${nd.kids[0].val} + ${nd.kids[1].val}` : ''}${memo ? ', and the answer is saved in the memo table' : ''}.`;
            }
            // counters and bars
            const calledSoFar = nodes.filter((x) => x.callAt < at);
            const total = nodes.length;
            rc(counts,
              h('div', h('b', `${calledSoFar.length}`), h('span', `calls so far (of ${total})`)),
              h('div', h('b', memo ? `${calledSoFar.filter((x) => x.hit).length}` : `${2 * fibs[n + 1] - 1}`), h('span', memo ? 'answered from memo' : `naive total = 2F${n + 1} − 1`)));
            const per = Array(n + 1).fill(0), full = Array(n + 1).fill(0);
            for (const x of nodes) { full[x.k]++; if (x.callAt < at) per[x.k]++; }
            const mx = Math.max(...full);
            rc(bars, Array.from({ length: n + 1 }, (_, i) => n - i).map((k) => [
              h('span', `fib(${k})`),
              h('span.bar', h('i', { style: { width: `${(per[k] / mx) * 100}%`, background: `var(${PAL[k % PAL.length]})` } })),
              h('span', { style: { textAlign: 'right' } }, `${per[k]}/${full[k]}`)]));
            const known = new Set(nodes.filter((x) => x.retAt < at && !x.hit).map((x) => x.k));
            rc(memoRow, memo ? Array.from({ length: n + 1 }, (_, k) => h('span', { class: known.has(k) ? 'on' : '' }, known.has(k) ? `f${k}=${fibs[k]}` : `f${k}=?`)) : h('span', 'none: the naive version forgets every answer'));
            note.innerHTML = memo
              ? `With memoization each fib(k) is computed once: ${n + 1} computations plus ${Math.max(0, n - 2)} cache hits, ${total} calls in all, growing linearly with n. <span class="term">Dynamic programming</span> goes one step further: fill the table from f0 upward with a loop and no recursion at all.`
              : `The counts in the bars are Fibonacci numbers: fib(1) runs F${n} = ${fibs[n]} times. The total ${total} = 2F${n + 1} − 1 roughly multiplies by 1.618 each time n grows by 1, the golden ratio from Binet's formula.`;
          }
          build();
          draw();
        },
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: naive versus memoized Fibonacci',
        kind: 'code',
        file: 'fib_memo.py',
        html: String.raw`<p class="muted small">Both functions compute the same numbers. One counts its calls, the other caches its answers. Run it, then compare the call counts with the lab on the previous slide.</p>`,
        fivew: {
          what: 'Computes \\(F_8 = 21\\) twice: once with plain recursion while counting every call, and once with Python\'s built-in memoization decorator <code>lru_cache</code>, which reports how many calls it answered from memory.',
          why: 'It makes the cost of overlapping subproblems visible as a number, 67 calls against 15, and shows that a one-line decorator fixes it. The gap grows exponentially with \\(n\\).',
          who: 'Anyone writing recursive code over choices: route planners, parsers, game AIs, spell checkers (edit distance), and bioinformatics tools that align DNA sequences.',
          where: 'Memoization and dynamic programming run inside speech recognizers (the Viterbi algorithm), sequence aligners, and reinforcement learning, where the Bellman equation \\(V(s) = \\max_a [r(s,a) + \\gamma V(s\')]\\) defines values recursively.',
          when: 'Whenever a recursion asks for the same subproblem more than once and the arguments are hashable. If the recursion can get deep, switch to a bottom-up loop.',
        },
        lines: [
          ['from functools import lru_cache', "Imports <code>lru_cache</code> from the standard-library module <code>functools</code>. It is a <b>decorator</b> that adds memoization to a function. LRU stands for \"least recently used\", the rule it follows if a size limit forces it to forget old entries."],
          ['calls = 0', "A counter for the naive version, starting at zero. Counting calls turns the recurrence \\(C_n = C_{n-1} + C_{n-2} + 1\\) into a number you can see."],
          ['def fib(n):', "The naive recursive Fibonacci function, written exactly like the mathematical definition. It is clear and correct, and very slow for large <code>n</code>."],
          ['    global calls', "Tells Python that <code>calls</code> inside this function means the variable defined at the top of the file. Without this line, <code>calls += 1</code> would try to update a local variable that does not exist yet and fail with an <code>UnboundLocalError</code>."],
          ['    calls += 1', "Counts this call. Every call adds one, including the calls that stop at a base case."],
          ['    if n < 2:', "The base cases \\(F_0 = 0\\) and \\(F_1 = 1\\). The test <code>n &lt; 2</code> covers both at once and guarantees the recursion stops."],
          ['        return n', "Returns 0 when <code>n</code> is 0 and 1 when <code>n</code> is 1, which are exactly the initial conditions."],
          ['    return fib(n - 1) + fib(n - 2)', "The recurrence \\(F_n = F_{n-1} + F_{n-2}\\). The problem is that <code>fib(n - 1)</code> will itself compute <code>fib(n - 2)</code> again, so the same subproblems are solved over and over. The number of calls grows by a factor of about 1.618 every time <code>n</code> grows by 1."],
          ['', ''],
          ['@lru_cache(maxsize=None)', "Decorates the function defined on the next line. <code>maxsize=None</code> means the cache never forgets anything. From now on, a call with an argument seen before returns the stored result immediately, without running the body."],
          ['def fib_memo(n):', "The same function under a new name, so the two versions can be compared side by side. Apart from the counter, its body is identical to <code>fib</code>: the decorator on the line above is the only real change."],
          ['    if n < 2:', "The same base-case test as before, covering \\(F_0\\) and \\(F_1\\)."],
          ['        return n', "Returns 0 or 1 for the base cases. With the cache in place, each base case runs at most once."],
          ['    return fib_memo(n - 1) + fib_memo(n - 2)', "The same recurrence. The difference is invisible in the code: when <code>fib_memo(n - 2)</code> runs after <code>fib_memo(n - 1)</code> has finished, its answer is already stored, so the call returns at once. Each value from 0 to <code>n</code> is computed only once: \\(n + 1\\) real computations instead of exponentially many."],
          ['print("fib(8) =", fib(8), "using", calls, "calls")', "Runs the naive version and prints <code>fib(8) = 21 using 67 calls</code>. 67 matches the formula \\(2F_9 - 1 = 2 \\cdot 34 - 1\\). Python evaluates the arguments left to right, so <code>calls</code> is read after <code>fib(8)</code> has finished."],
          ['print("memo:", fib_memo(8), fib_memo.cache_info())', "Runs the memoized version and prints its cache statistics. <code>misses=9</code> are the real computations, one for each of \\(n = 0, \\dots, 8\\). <code>hits=6</code> are calls answered from the cache. That is 15 calls instead of 67, and for \\(n = 30\\) it is 59 calls instead of 2,692,537."],
        ],
        expected: 'fib(8) = 21 using 67 calls\nmemo: 21 CacheInfo(hits=6, misses=9, maxsize=None, currsize=9)\n',
        tryIt: 'Change both 8s to 25 and run again: the naive version needs 242,785 calls, the memoized one 49. Then try 30 and notice how long the naive version takes while the memoized one stays instant.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: recursion you can trust',
        kind: 'design',
        html: String.raw`<p class="muted small">Recurrences are how professionals reason about recursive code before it runs. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Write the base case first',
            html: '<p>A recursive function without a reachable <span class="term">base case</span> never stops: Python gives up after about 1000 nested calls with a <code>RecursionError</code>. Write the base case before the recursive line and test it on its own. It is the initial condition of the recurrence, written in code.</p>',
            bad: 'def total(xs):\n    return xs[0] + total(xs[1:])\n# no base case: crashes when xs runs out',
            good: 'def total(xs):\n    if not xs:          # base case first\n        return 0\n    return xs[0] + total(xs[1:])',
          },
          {
            name: 'Make every call move toward a base case',
            html: '<p>Each recursive call must work on a strictly smaller input, and the shrinking must land exactly on a base case. A step of 2 can jump straight past a base case of 0 when the input is odd. Ask two questions: what gets smaller on every call, and can it skip over the base case?</p>',
            bad: 'def countdown(n):\n    if n == 0:\n        return\n    countdown(n - 2)   # n = 5 skips past 0',
            good: 'def countdown(n):\n    if n <= 0:          # catches every value\n        return\n    countdown(n - 2)',
          },
          {
            name: 'Memoize overlapping subproblems',
            html: '<p>When the call tree asks the same question many times, cache the answers. <code>@lru_cache</code> turns naive Fibonacci from \\(\\Theta(\\varphi^n)\\) calls into \\(\\Theta(n)\\). The arguments must be hashable (numbers, strings, tuples), because the cache is a dictionary keyed by them.</p>',
            bad: 'def fib(n):\n    if n < 2: return n\n    return fib(n - 1) + fib(n - 2)\n# fib(40): about 331 million calls',
            good: 'from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n < 2: return n\n    return fib(n - 1) + fib(n - 2)',
          },
          {
            name: 'Prefer bottom-up dynamic programming for predictable memory',
            html: '<p>Top-down memoization still nests calls as deep as \\(n\\) and stores every answer. Bottom-up <span class="term">dynamic programming</span> computes the subproblems in order from smallest to largest with a loop, so there is no call stack to overflow, and you can keep only what the next step needs. Fibonacci needs just the last two values: constant memory.</p>',
            good: 'def fib(n):\n    a, b = 0, 1             # F(0), F(1)\n    for _ in range(n):\n        a, b = b, a + b     # slide the window\n    return a',
          },
          {
            name: 'Convert deep recursion into iteration',
            html: '<p>Python limits recursion depth (1000 by default) because every call uses memory on the call stack. A recursion that goes one level deeper per item crashes on a list of 100,000 items. Rewrite it as a loop, or keep your own stack in a list. Raising the limit with <code>sys.setrecursionlimit</code> only moves the crash further away.</p>',
            bad: 'def length(node):\n    if node is None: return 0\n    return 1 + length(node.next)\n# RecursionError on long linked lists',
            good: 'def length(node):\n    count = 0\n    while node is not None:\n        count, node = count + 1, node.next\n    return count',
          },
          {
            name: 'Derive the recurrence before you ship',
            html: '<p>Write the recurrence for each recursive function and solve it. Hidden costs show up immediately. Binary search that slices the list copies half of it on every call: \\(T(n) = T(n/2) + n\\), which is \\(\\Theta(n)\\) and no faster than a plain scan. Passing indices instead keeps \\(T(n) = T(n/2) + 1 = \\Theta(\\log\\ n)\\).</p>',
            bad: 'def has(xs, x):           # T(n) = T(n/2) + n\n    if not xs: return False\n    m = len(xs) // 2\n    if xs[m] == x: return True\n    half = xs[:m] if x < xs[m] else xs[m+1:]\n    return has(half, x)       # slicing copies',
            good: 'def has(xs, x, lo, hi):   # T(n) = T(n/2) + 1\n    if lo >= hi: return False\n    m = (lo + hi) // 2\n    if xs[m] == x: return True\n    if x < xs[m]: return has(xs, x, lo, m)\n    return has(xs, x, m + 1, hi)',
          },
          {
            name: 'Test the closed form against the recurrence',
            html: '<p>A closed form derived by hand can hide a slip: an exponent off by one, a wrong constant. Compute the first twenty terms straight from the recurrence and compare them with the formula. It takes three lines and catches most algebra mistakes before they reach a report or a capacity estimate.</p>',
            good: 'def hanoi_moves(n):          # straight from the rule\n    return 1 if n == 1 else 2 * hanoi_moves(n - 1) + 1\n\nfor n in range(1, 20):\n    assert hanoi_moves(n) == 2**n - 1, n',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example 1 */
      {
        title: 'Worked example: Tower of Hanoi in 7 moves',
        kind: 'example',
        id: 'ex-hanoi-moves',
        problem: String.raw`<p>The Tower of Hanoi starts with 3 disks on peg A, largest at the bottom, and no disk may ever rest on a smaller one. List and picture every move of the fastest solution that transfers the whole tower to peg C, and count the moves.</p>`,
        objective: 'Learn how the recursive Tower of Hanoi strategy builds an optimal move sequence one subproblem at a time, and why n disks always take exactly 2^n − 1 moves.',
        data: EX_HANOI,
        steps: stepsForHanoi(EX_HANOI),
        answer: 7,
        verify(M) {
          const moves = [];
          function gen(n, from, to, via) {
            if (n === 0) return;
            gen(n - 1, from, via, to);
            moves.push([n, from, to]);
            gen(n - 1, via, to, from);
          }
          gen(3, 0, 2, 1);
          const pegs = [[3, 2, 1], [], []];
          let legal = moves.length === 7;
          for (const [disk, from, to] of moves) {
            const top = pegs[to][pegs[to].length - 1];
            if (pegs[from][pegs[from].length - 1] !== disk || (top !== undefined && top < disk)) legal = false;
            pegs[to].push(pegs[from].pop());
          }
          let T = 0;
          for (let n = 1; n <= 3; n++) T = 2 * T + 1;
          return legal && pegs[2].join(',') === '3,2,1' && pegs[0].length === 0 && pegs[1].length === 0 && 2 ** 3 - 1 === 7 && T === 7;
        },
        variants: [{
          label: 'Variant: 4 disks',
          problem: String.raw`<p>The Tower of Hanoi starts with 4 disks on peg A, largest at the bottom, and no disk may ever rest on a smaller one. List and picture every move of the fastest solution that transfers the whole tower to peg C, and count the moves.</p>`,
          steps: stepsForHanoi(EX_HANOI_VAR),
          answer: 15,
          verify(M) {
            const moves = [];
            function gen(n, from, to, via) {
              if (n === 0) return;
              gen(n - 1, from, via, to);
              moves.push([n, from, to]);
              gen(n - 1, via, to, from);
            }
            gen(4, 0, 2, 1);
            const pegs = [[4, 3, 2, 1], [], []];
            let legal = moves.length === 15;
            for (const [disk, from, to] of moves) {
              const top = pegs[to][pegs[to].length - 1];
              if (pegs[from][pegs[from].length - 1] !== disk || (top !== undefined && top < disk)) legal = false;
              pegs[to].push(pegs[from].pop());
            }
            let T = 0;
            for (let n = 1; n <= 4; n++) T = 2 * T + 1;
            return legal && pegs[2].join(',') === '4,3,2,1' && pegs[0].length === 0 && pegs[1].length === 0 && 2 ** 4 - 1 === 15 && T === 15 && EX_HANOI_VAR.moves.length === 15;
          },
          data: EX_HANOI_VAR,
        }],
        draw(stage, ctx, step, k, preset) {
          const { h, s } = ctx;
          const D = (preset && preset.data) || EX_HANOI;
          const NAME = ['A', 'B', 'C'];
          const PX = [110, 320, 530], BASE = 210, DH = 28;
          const COLOR = ['--num', '--fnc', '--accent', '--kw', '--str', '--warn', '--false'];
          const state = D.states[step.mv];
          const lastMove = step.mv > 0 ? D.moves[step.mv - 1] : null;
          const movedDisk = lastMove ? lastMove[0] : 0;
          const kids = [
            s('rect', { x: 20, y: BASE, width: 600, height: 10, rx: 4, fill: 'var(--ink-3)' }),
            ...PX.map((x) => s('rect', { x: x - 3, y: 62, width: 6, height: BASE - 62, rx: 3, fill: 'var(--ink-3)' })),
            ...PX.map((x, p) => s('text', { x, y: BASE + 30, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: 'var(--ink-2)', text: 'Peg ' + NAME[p] })),
          ];
          state.forEach((stack, p) => stack.forEach((disk, i) => {
            const w = 40 + disk * 38;
            const y = BASE - (i + 1) * DH;
            const isMoved = disk === movedDisk;
            kids.push(s('rect', { x: PX[p] - w / 2, y, width: w, height: DH - 3, rx: 8, fill: `var(${COLOR[disk - 1]})`, stroke: isMoved ? 'var(--ink)' : 'none', 'stroke-width': isMoved ? 3.5 : 0 }));
            kids.push(s('text', { x: PX[p], y: y + DH / 2 + 1, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': isMoved ? 800 : 700, fill: 'var(--accent-ink)', text: String(disk) }));
          }));
          if (lastMove) kids.push(s('text', { x: PX[lastMove[2]], y: 40, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)', text: `disk ${movedDisk} just moved here` }));
          const svg = s('svg', { viewBox: '0 0 640 248', role: 'img', 'aria-label': `Three pegs A, B and C with ${D.n} disks`, style: 'width:min(40rem,100%);height:auto' }, ...kids);
          const soFar = step.mv === 0 ? 'Moves so far: none yet' : 'Moves so far: ' + D.moves.slice(0, step.mv).map(([d, f, t], i) => `${i + 1}. disk ${d} ${NAME[f]}→${NAME[t]}`).join(' · ');
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.35rem' } },
            svg,
            h('p.small', { style: { margin: 0, textAlign: 'center' } }, step.mv === 0 ? `Start: after move 0 of ${D.moves.length} — the tower sits on peg A and the goal is peg C` : `After move ${step.mv} of ${D.moves.length}: disk ${movedDisk} moved ${NAME[lastMove[1]]} → ${NAME[lastMove[2]]}`),
            h('p.small.mono.muted', { style: { margin: 0, textAlign: 'center' } }, soFar),
            step.answer ? h('div.ex-answer', `Answer: ${D.moves.length} moves = 2^${D.n} − 1 · check: T(${D.n}) = 2·T(${D.n - 1}) + 1 = ${D.moves.length}, and the tower stands in size order on peg C`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 2 */
      {
        title: 'Worked example: iterating a recurrence to a closed form',
        kind: 'example',
        id: 'ex-recurrence-iteration',
        problem: String.raw`<p>A sequence starts with \(a_0 = 0\) and follows \(a_n = 2a_{n-1} + 1\) for \(n \ge 1\). Compute the first terms by iteration, guess a closed form for \(a_n\), and prove the guess by induction.</p>`,
        objective: 'Learn to solve a first-order recurrence by iterating it, spotting the pattern in a shifted column of terms, and proving the guessed closed form by induction.',
        data: EX_REC,
        steps: stepsForRec(EX_REC),
        answer: '2^n − 1',
        verify(M) {
          const terms = [0];
          for (let n = 1; n <= 20; n++) terms.push(2 * terms[n - 1] + 1);
          const matchesClosedForm = terms.every((x, n) => x === 2 ** n - 1);
          const firstFive = [0, 1, 3, 7, 15].every((x, n) => terms[n] === x);
          return matchesClosedForm && firstFive;
        },
        variants: [{
          label: 'Variant: 3a(n-1) + 1',
          problem: String.raw`<p>A sequence starts with \(a_0 = 0\) and follows \(a_n = 3a_{n-1} + 1\) for \(n \ge 1\). Compute the first terms by iteration, guess a closed form for \(a_n\), and prove the guess by induction.</p>`,
          steps: stepsForRec(EX_REC_VAR),
          answer: '(3^n − 1)/2',
          verify(M) {
            const terms = [0];
            for (let n = 1; n <= 20; n++) terms.push(3 * terms[n - 1] + 1);
            const matchesClosedForm = terms.every((x, n) => x === (3 ** n - 1) / 2);
            const firstFive = [0, 1, 4, 13, 40].every((x, n) => terms[n] === x);
            const shiftedArePowers = terms.slice(0, 5).every((x, n) => 2 * x + 1 === 3 ** n);
            return matchesClosedForm && firstFive && shiftedArePowers && EX_REC_VAR.terms.join(',') === '0,1,4,13,40';
          },
          data: EX_REC_VAR,
        }],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_REC;
          const rows = D.terms.slice(0, step.rows).map((x, n) => h('tr', { class: n === step.rows - 1 && step.phase === 0 ? 'hit' : '' },
            h('td', String(n)), h('td', String(x)), h('td', String(D.mult * x + D.add))));
          const table = h('table.tt', { style: { width: 'min(22rem, 100%)' } },
            h('thead', h('tr', h('th', { html: '\\(n\\)' }), h('th', { html: '\\(a_n\\)' }), h('th', { html: `\\(${tcolTex(D)}\\)` }))),
            h('tbody', rows.length ? rows : h('tr', h('td.muted', '·'), h('td.muted', '·'), h('td.muted', '·'))));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.4rem' } },
            h('div.big-math', { html: String.raw`\(a_0 = ${D.a0}, \qquad a_n = ${D.c}a_{n-1} + ${D.k}\)`, style: { fontSize: '1.05rem' } }),
            table,
            step.rows === 0 ? h('p.small.muted', { style: { margin: 0 } }, 'No terms computed yet — the table fills in as the rule is applied.') : null,
            step.phase >= 1 ? h('div.big-math', { html: String.raw`Guess: \(${tcolTex(D)} = ${D.c}^n\), so \(a_n = ${closedTexAt(D, 'n')}\)`, style: { fontSize: '1.05rem' } }) : null,
            step.phase >= 2 ? h('div.stack', { style: { gap: '0.15rem', alignItems: 'center', fontSize: '0.92rem' } },
              h('div', { html: String.raw`Base case: \(a_0 = ${closedTexAt(D, '0')} = ${D.a0}\) ✓` }),
              h('div', { html: String.raw`Assume \(a_k = ${closedTexAt(D, 'k')}\) for some \(k \ge 0\).` }),
              h('div', { html: String.raw`Then \(a_{k+1} = ${D.c}a_k + ${D.k} = ${D.c}(${closedTexAt(D, 'k')}) + ${D.k} = ${closedTexAt(D, 'k+1')}\).` })) : null,
            step.answer ? h('div.ex-answer', `Answer: a(n) = ${closedPlainAt(D, 'n')} · check: a4 = ${closedPlainAt(D, '4')} = ${D.terms[4]} matches the table${D.c === 2 && D.k === 1 ? `, and T(3) = ${D.terms[3]} = a3` : ''}`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 3 */
      {
        title: 'Worked example: a recursion tree with level costs',
        kind: 'example',
        id: 'ex-recursion-tree',
        problem: String.raw`<p>Merge sort on 8 items satisfies \(T(n) = 2T(n/2) + n\) with \(T(1) = 1\): two half-size sorts plus \(n\) units of merging work. Expand the recursion tree at \(n = 8\), compute the work on each level and the leaf total, and add the levels to find \(T(8)\).</p>`,
        objective: 'Expand a recursion tree level by level, compute the work per level and the leaf total, and add the level totals to solve a divide-and-conquer recurrence.',
        data: EX_TREE,
        steps: stepsForTree(EX_TREE, 'Predict: level 0 is one call doing 8 units of work. Level 1 will have twice as many calls, each doing half as much — what will the level 1 total be?'),
        answer: 32,
        verify(M) {
          const T = (n) => (n === 1 ? 1 : 2 * T(n / 2) + n);
          let sum = 0;
          for (let i = 0, cnt = 1, size = 8; ; cnt *= 2, size /= 2, i++) { sum += cnt * size; if (size === 1) break; }
          return T(8) === 32 && sum === 32 && EX_TREE.levels.map((L) => L.tot).join(',') === '8,8,8,8' && EX_TREE.seq.join(',') === '1,4,12,32';
        },
        variants: [{
          label: 'Variant: branching factor 3',
          problem: String.raw`<p>Karatsuba multiplication on 8-digit numbers satisfies \(T(n) = 3T(n/2) + n\) with \(T(1) = 1\): three half-size multiplications plus linear combining work. Expand the recursion tree at \(n = 8\), compute the work on each level and the leaf total, and add the levels to find \(T(8)\).</p>`,
          steps: stepsForTree(EX_TREE_VAR, 'Predict: level 1 will have 3 calls of size 4 instead of 2. Will its total be bigger or smaller than the 8 units of level 0, and by what factor?'),
          answer: 65,
          verify(M) {
            const T = (n) => (n === 1 ? 1 : 3 * T(n / 2) + n);
            let sum = 0;
            for (let cnt = 1, size = 8; ; cnt *= 3, size /= 2) { sum += cnt * size; if (size === 1) break; }
            return T(8) === 65 && sum === 65 && EX_TREE_VAR.levels.map((L) => L.tot).join(',') === '8,12,18,27' && EX_TREE_VAR.seq.join(',') === '1,5,19,65';
          },
          data: EX_TREE_VAR,
        }],
        draw(stage, ctx, step, k, preset) {
          const { h, s } = ctx;
          const D = (preset && preset.data) || EX_TREE;
          const posFor = (L) => {
            if (L.cnt > 9) return [{ x: 96, w: 408 }];
            const bw = Math.min(54, 396 / L.cnt - 8), gap = 8, totW = L.cnt * bw + (L.cnt - 1) * gap, x0 = 300 - totW / 2;
            return Array.from({ length: L.cnt }, (_, j) => ({ x: x0 + j * (bw + gap), w: bw }));
          };
          const kids = [s('text', { x: 300, y: 14, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: 'var(--ink-2)', text: `T(n) = ${D.a}T(n/2) + n at n = ${D.n} — one box per call, labeled with its size` })];
          D.levels.forEach((L, i) => {
            if (i >= step.shown) return;
            const y = 26 + i * 54, pos = posFor(L);
            const nxt = D.levels[i + 1];
            if (nxt && i + 1 < step.shown && nxt.cnt <= 9) {
              const np = posFor(nxt);
              pos.forEach((p, j) => { for (let c = 0; c < D.a; c++) { const q = np[j * D.a + c]; if (q) kids.push(s('line', { x1: p.x + p.w / 2, y1: y + 26, x2: q.x + q.w / 2, y2: y + 54, stroke: 'var(--ink-3)', 'stroke-width': 0.9, opacity: 0.7 })); } });
            }
            kids.push(s('text', { x: 8, y: y + 17, 'font-size': 11.5, fill: 'var(--ink-3)', 'font-family': 'var(--font-mono)', text: `L${i}` }));
            pos.forEach((p) => {
              kids.push(s('rect', { x: p.x, y, width: p.w, height: 26, rx: 5, fill: 'var(--accent)', 'fill-opacity': 0.25 + 0.1 * i, stroke: 'var(--accent)', 'stroke-width': 1.2 }));
              kids.push(s('text', { x: p.x + p.w / 2, y: y + 17, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 600, fill: 'var(--ink)', text: L.cnt > 9 ? `${L.cnt} calls, each of size ${L.size}` : String(L.size) }));
            });
            kids.push(s('text', { x: 520, y: y + 17, 'font-size': 12.5, 'font-weight': 700, fill: 'var(--accent)', text: `= ${L.tot}` }));
          });
          if (step.shown === 0) kids.push(s('text', { x: 300, y: 120, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--ink-3)', text: 'Nothing expanded yet — the root call comes first.' }));
          const svg = s('svg', { viewBox: '0 0 640 248', role: 'img', 'aria-label': `Recursion tree for T(n) = ${D.a}T(n/2) + n`, style: 'width:min(40rem,100%);height:auto' }, ...kids);
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.35rem' } },
            svg,
            step.sum ? h('p.small.mono', { style: { margin: 0 } }, `Level totals: ${D.levels.map((L) => L.tot).join(' + ')} = ${D.total}`) : null,
            step.answer ? h('div.ex-answer', `Answer: T(${D.n}) = ${D.total} · check: iterating the recurrence gives T(2) = ${D.seq[1]}, T(4) = ${D.seq[2]}, T(${D.n}) = ${D.seq[3]}, the same total`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 4 */
      {
        title: 'Worked example: characteristic roots with initial conditions',
        kind: 'example',
        id: 'ex-characteristic-roots',
        problem: String.raw`<p>Solve \(a_n = 5a_{n-1} - 6a_{n-2}\) with \(a_0 = 7\) and \(a_1 = 16\) by the characteristic-equation method: form the equation, factor it, write the general solution, and use the initial conditions to fix the constants.</p>`,
        objective: 'Solve a two-term linear recurrence by forming and factoring its characteristic equation, applying the initial conditions to fix the constants, and checking the closed form against iterated terms.',
        data: EX_CHAR,
        steps: stepsForChar(EX_CHAR, 'Predict: the characteristic equation is r^2 − 5r + 6 = 0. What are its roots, and will they be two different numbers or one number repeated?'),
        answer: '5·2^n + 2·3^n',
        verify(M) {
          const t = [7, 16];
          for (let n = 2; n <= 20; n++) t.push(5 * t[n - 1] - 6 * t[n - 2]);
          return t.every((x, n) => x === 5 * 2 ** n + 2 * 3 ** n) && EX_CHAR.terms.join(',') === '7,16,38,94,242,646' && EX_CHAR.closed.join(',') === EX_CHAR.terms.join(',');
        },
        variants: [{
          label: 'Variant: a repeated root',
          problem: String.raw`<p>Solve \(a_n = 4a_{n-1} - 4a_{n-2}\) with \(a_0 = 1\) and \(a_1 = 4\) by the characteristic-equation method, and check the closed form against the iterated terms.</p>`,
          steps: stepsForChar(EX_CHAR_VAR, 'Predict: the characteristic equation is r^2 − 4r + 4 = 0. Does it factor into two different factors or the same factor twice, and why does that change the shape of the general solution?'),
          answer: '(1 + n)·2^n',
          verify(M) {
            const t = [1, 4];
            for (let n = 2; n <= 20; n++) t.push(4 * t[n - 1] - 4 * t[n - 2]);
            return t.every((x, n) => x === (1 + n) * 2 ** n) && EX_CHAR_VAR.terms.join(',') === '1,4,12,32,80,192' && EX_CHAR_VAR.closed.join(',') === EX_CHAR_VAR.terms.join(',');
          },
          data: EX_CHAR_VAR,
        }],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_CHAR;
          const rep = D.kind === 'repeated';
          const line = (html) => h('div.big-math', { html, style: { fontSize: '1.02rem' } });
          const eq0 = rep ? String.raw`\(n = 0:\quad b = ${D.a0}\)` : String.raw`\(n = 0:\quad b + d = ${D.a0}\)`;
          const eq1 = rep ? String.raw`\(n = 1:\quad (b + d) \cdot ${D.r} = ${D.a1}, \quad\text{so}\quad b = ${D.b},\ d = ${D.d}\)` : String.raw`\(n = 1:\quad ${D.r1}b + ${D.r2}d = ${D.a1}, \quad\text{so}\quad b = ${D.b},\ d = ${D.d}\)`;
          const table = h('table.tt', { style: { width: 'min(24rem, 100%)' } },
            h('thead', h('tr', h('th', { html: '\\(n\\)' }), [0, 1, 2, 3, 4].map((n) => h('th', String(n))))),
            h('tbody',
              h('tr', h('th.l', 'from the rule'), D.terms.slice(0, 5).map((x) => h('td', String(x)))),
              h('tr', h('th.l', 'closed form'), D.closed.slice(0, 5).map((x) => h('td', String(x))))));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.35rem' } },
            line(String.raw`\(a_n = ${combo([[D.c1, 'a_{n-1}'], [D.c2, 'a_{n-2}']])}, \qquad a_0 = ${D.a0}, \quad a_1 = ${D.a1}\)`),
            step.phase >= 1 ? line(String.raw`Characteristic equation: \(${charEqTex(D)}\)`) : null,
            step.phase >= 2 ? line(rep ? String.raw`Factored: \(${facTex(D.r)}^2 = 0\), so \(r = ${D.r}\) twice` : String.raw`Factored: \(${facTex(D.r1)}${facTex(D.r2)} = 0\), so \(r = ${D.r1}\) and \(r = ${D.r2}\)`) : null,
            step.phase >= 3 ? line(String.raw`General solution: \(${charGeneralTex(D)}\)`) : null,
            step.phase >= 4 ? line(eq0) : null,
            step.phase >= 5 ? line(eq1) : null,
            step.phase >= 6 ? table : null,
            step.answer ? h('div.ex-answer', `Answer: a(n) = ${charClosedPlain(D)} · check: the closed form matches the iterated terms ${D.terms.slice(0, 5).join(', ')}`) : null));
        },
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: recurrence relations',
        kind: 'practice',
        html: String.raw`<p class="muted small">Numbers are typed plainly. For two answers, separate them with a comma, as in <code>3, -2</code>. Sets of roots can be typed like <code>{2, 3}</code>.</p>`,
        gens: [
          {
            label: 'Compute terms',
            make(R) {
              if (R.chance(0.4)) {
                const c = R.int(2, 3), k = R.pick([-2, -1, 1, 2, 3, 5]), a0 = R.int(1, 5), m = R.int(3, 5);
                const seq = [a0];
                for (let i = 1; i <= m; i++) seq.push(c * seq[i - 1] + k);
                const rule = combo([[c, 'a_{n-1}'], [k, '']]);
                return {
                  prompt: String.raw`Let \(a_n = ${rule}\) for \(n \ge 1\), with \(a_0 = ${a0}\). Find \(a_{${m}}\).`,
                  answer: seq[m],
                  hint: 'apply the rule one step at a time, starting from the initial condition.',
                  solution: String.raw`Apply the rule repeatedly:<br>` + seq.slice(1).map((x, i) => String.raw`\(a_{${i + 1}} = ${c} \cdot ${par(seq[i])} ${k < 0 ? '-' : '+'} ${Math.abs(k)} = ${x}\)`).join('<br>') + String.raw`<br>So \(a_{${m}} = ${seq[m]}\).`,
                };
              }
              const c1 = R.pick([1, 2, 3]), c2 = R.pick([1, 2, -1]), a0 = R.int(0, 3), a1 = R.int(1, 4), m = R.int(4, 6);
              const seq = [a0, a1];
              for (let i = 2; i <= m; i++) seq.push(c1 * seq[i - 1] + c2 * seq[i - 2]);
              return {
                prompt: String.raw`Let \(a_n = ${combo([[c1, 'a_{n-1}'], [c2, 'a_{n-2}']])}\) for \(n \ge 2\), with \(a_0 = ${a0}\) and \(a_1 = ${a1}\). Find \(a_{${m}}\).`,
                answer: seq[m],
                hint: 'each new term uses the two terms just before it.',
                solution: String.raw`The rule looks back two steps, so start from \(a_0\) and \(a_1\):<br>` + seq.slice(2).map((x, i) => String.raw`\(a_{${i + 2}} = ${c1 === 1 ? '' : c1 + ' \\cdot '}${par(seq[i + 1])} ${c2 < 0 ? '-' : '+'} ${Math.abs(c2) === 1 ? '' : Math.abs(c2) + ' \\cdot '}${par(seq[i])} = ${x}\)`).join('<br>') + String.raw`<br>So \(a_{${m}} = ${seq[m]}\).`,
              };
            },
          },
          {
            label: 'Characteristic equation',
            make(R) {
              const kind = R.int(0, 2);
              if (kind === 1) {
                const r = R.pick([-3, -2, 2, 3, 4]);
                const c1 = 2 * r, c2 = -r * r;
                return {
                  prompt: String.raw`Find every root of the characteristic equation of \(a_n = ${combo([[c1, 'a_{n-1}'], [c2, 'a_{n-2}']])}\). Type the roots as a set, for example {2, 3}.`,
                  answer: [r], format: 'set',
                  hint: String.raw`the characteristic equation of \(a_n = c_1 a_{n-1} + c_2 a_{n-2}\) is \(r^2 - c_1 r - c_2 = 0\).`,
                  solution: String.raw`The characteristic equation is \(r^2 ${combo([[-c1, 'r'], [-c2, '']]).replace(/^(?!-)/, '+ ').replace(/^-/, '- ')} = 0\), which factors as \((r ${r < 0 ? '+' : '-'} ${Math.abs(r)})^2 = 0\). So \(${r}\) is a <b>repeated root</b>, and the general solution is \(a_n = b \cdot ${par(r)}^n + d \cdot n \cdot ${par(r)}^n\).`,
                };
              }
              let r1 = R.pick([-3, -2, -1, 1, 2, 3, 4, 5]), r2 = R.pick([-3, -2, -1, 1, 2, 3, 4, 5]);
              while (r2 === r1) r2 = R.pick([-3, -2, -1, 1, 2, 3, 4, 5]);
              if (r1 < r2) [r1, r2] = [r2, r1];
              const c1 = r1 + r2, c2 = -r1 * r2;
              const eq = String.raw`r^2 ${combo([[-c1, 'r'], [-c2, '']]).replace(/^(?!-)/, '+ ').replace(/^-/, '- ')} = 0`;
              const fac = String.raw`(r ${r1 < 0 ? '+' : '-'} ${Math.abs(r1)})(r ${r2 < 0 ? '+' : '-'} ${Math.abs(r2)}) = 0`;
              const rec = combo([[c1, 'a_{n-1}'], [c2, 'a_{n-2}']]);
              if (kind === 0) {
                return {
                  prompt: String.raw`Find both roots of the characteristic equation of \(a_n = ${rec}\). Type them as a set, for example {2, 3}.`,
                  answer: [r1, r2], format: 'set',
                  hint: String.raw`the characteristic equation of \(a_n = c_1 a_{n-1} + c_2 a_{n-2}\) is \(r^2 - c_1 r - c_2 = 0\).`,
                  solution: String.raw`Move every term to one side: \(${eq}\). Two numbers that add to \(${c1}\) and multiply to \(${-c2}\) are \(${r1}\) and \(${r2}\), so it factors as \(${fac}\). The roots are \(${r1}\) and \(${r2}\), and the general solution is \(a_n = b \cdot ${par(r1)}^n + d \cdot ${par(r2)}^n\).`,
                };
              }
              let b = R.pick([-3, -2, -1, 1, 2, 3, 4]), d = R.pick([-3, -2, -1, 1, 2, 3, 4]);
              const a0 = b + d, a1 = b * r1 + d * r2;
              return {
                prompt: String.raw`The recurrence \(a_n = ${rec}\) with \(a_0 = ${a0}\) and \(a_1 = ${a1}\) has characteristic roots \(r_1 = ${r1}\) and \(r_2 = ${r2}\), so \(a_n = b \cdot ${par(r1)}^n + d \cdot ${par(r2)}^n\). Find \(b\) and \(d\), typed as <code>b, d</code>.`,
                answer: [b, d], format: 'list', placeholder: 'b, d',
                hint: String.raw`substitute \(n = 0\) and \(n = 1\) to get two equations.`,
                solution: String.raw`\(n = 0\): \(b + d = ${a0}\).<br>\(n = 1\): \(${r1}b ${r2 < 0 ? '-' : '+'} ${Math.abs(r2)}d = ${a1}\).<br>Multiply the first equation by \(${r1}\) and subtract it from the second: \((${r2} - ${par(r1)})\,d = ${a1} - ${par(r1)} \cdot ${par(a0)}\), so \(${r2 - r1}d = ${a1 - r1 * a0}\) and \(d = ${d}\). Then \(b = ${a0} - ${par(d)} = ${b}\).<br>Answer: <b>${b}, ${d}</b>, that is \(a_n = ${b} \cdot ${par(r1)}^n ${d < 0 ? '-' : '+'} ${Math.abs(d)} \cdot ${par(r2)}^n\). Check \(n = 2\) against the rule if you like.`,
              };
            },
          },
          {
            label: 'Master theorem',
            make(R) {
              const combos = [[1, 2], [1, 3], [2, 4], [2, 2], [3, 3], [4, 4], [8, 4], [4, 2], [9, 3], [16, 4], [8, 2], [27, 3]];
              const [a, b] = R.pick(combos);
              const L = Math.round((Math.log(a) / Math.log(b)) * 2) / 2;
              const d = R.pick([0, 1, 1, 2, 2, 3]);
              const A = `Θ(${pow2s(d)})`, B = d === 0 ? 'Θ(log n)' : `Θ(${pow2s(d)} log n)`, C = `Θ(${pow2s(L)})`;
              const kase = d > L ? 'root' : d === L ? 'even' : 'leaf';
              const answer = kase === 'root' ? A : kase === 'even' ? B : C;
              // when d = log_b a the first and third forms coincide, so add a distractor
              const opts = [...new Set([A, B, C])];
              if (opts.length < 3) opts.push(`Θ(${pow2s(Math.min(4, d + 1))})`);
              const work = d === 0 ? '1' : d === 1 ? 'n' : `n^{${d}}`;
              const Ltex = L === 0.5 ? '\\tfrac12' : L === 1.5 ? '\\tfrac32' : String(L);
              return {
                prompt: String.raw`Use the master theorem to find the growth rate of \(T(n) = ${a === 1 ? '' : a}\,T(n/${b}) + ${work}\).`,
                options: R.shuffle(opts), answer,
                solution: String.raw`Here \(a = ${a}\), \(b = ${b}\), \(d = ${d}\). Compute \(\log_{${b}}\ ${a} = ${Ltex}\), because \(${b}^{${Ltex}} = ${a}\). ` +
                  (kase === 'root' ? String.raw`Since \(d = ${d} \gt ${Ltex}\), the ratio \(a/b^d = ${a}/${b ** d}\) is below 1: each level costs less than the one above, so the root dominates and \(T(n) = ${answer}\).`
                    : kase === 'even' ? String.raw`Since \(d = ${d} = \log_{${b}}\ ${a}\), the ratio \(a/b^d = 1\): every level costs the same \(${work}\), and there are about \(\log\ n\) levels, so \(T(n) = ${answer}\).`
                      : String.raw`Since \(d = ${d} \lt ${Ltex}\), the ratio \(a/b^d = ${a}/${b ** d}\) is above 1: the levels get costlier going down, so the \(n^{\log_b\ a}\) leaves dominate and \(T(n) = ${answer}\).`),
              };
            },
          },
          {
            label: 'Recurrences from algorithms',
            make(R) {
              const kind = R.int(0, 4);
              if (kind === 0) {
                const n = R.int(3, 12);
                return { prompt: String.raw`What is the minimum number of moves needed to solve the Tower of Hanoi with \(${n}\) disks?`, answer: 2 ** n - 1, hint: String.raw`\(H_n = 2H_{n-1} + 1\), \(H_1 = 1\).`, solution: String.raw`The recurrence \(H_n = 2H_{n-1} + 1\) with \(H_1 = 1\) has the closed form \(H_n = 2^n - 1\) (iterate, then prove by induction). So \(H_{${n}} = 2^{${n}} - 1 = ${2 ** n - 1}\).` };
              }
              if (kind === 1) {
                const k = R.int(3, 10), n = 2 ** k;
                return { prompt: String.raw`Recursive binary search makes \(T(n) = T(n/2) + 1\) comparisons in the worst case, with \(T(1) = 1\). Find \(T(${n})\).`, answer: k + 1, solution: String.raw`Unrolling gives \(T(n) = T(n/2^j) + j\). With \(n = ${n} = 2^{${k}}\), after \(j = ${k}\) halvings the size is 1, so \(T(${n}) = T(1) + ${k} = ${k + 1}\). In general \(T(n) = \log_2\ n + 1\).` };
              }
              if (kind === 2) {
                const k = R.int(2, 6), n = 2 ** k;
                return { prompt: String.raw`Merge sort's comparisons satisfy \(T(n) = 2T(n/2) + n\) with \(T(1) = 0\). Find \(T(${n})\).`, answer: n * k, hint: 'every level of the recursion tree costs n.', solution: String.raw`The recursion tree has \(\log_2\ ${n} = ${k}\) levels above the leaves, and each of those levels costs \(n = ${n}\); the leaves cost \(T(1) = 0\). So \(T(${n}) = ${n} \cdot ${k} = ${n * k}\). Step by step: ${Array.from({ length: k }, (_, i) => String.raw`\(T(${2 ** (i + 1)}) = 2 \cdot ${2 ** i * i} + ${2 ** (i + 1)} = ${2 ** (i + 1) * (i + 1)}\)`).join(', ')}.` };
              }
              if (kind === 3) {
                const n = R.int(3, 12);
                return { prompt: String.raw`How many bit strings of length \(${n}\) contain no two consecutive 1s?`, answer: fibs[n + 2], hint: String.raw`\(S_n = S_{n-1} + S_{n-2}\), \(S_1 = 2\), \(S_2 = 3\).`, solution: String.raw`Split by the last bit to get \(S_n = S_{n-1} + S_{n-2}\) with \(S_1 = 2\) and \(S_2 = 3\). The terms are ${Array.from({ length: n }, (_, i) => fibs[i + 3]).join(', ')}, so \(S_{${n}} = ${fibs[n + 2]}\) (this is \(F_{${n + 2}}\)).` };
              }
              const n = R.int(3, 12);
              return { prompt: String.raw`The naive recursive <code>fib(n)</code> makes \(C_n = C_{n-1} + C_{n-2} + 1\) calls, with \(C_0 = C_1 = 1\). How many calls does <code>fib(${n})</code> make?`, answer: 2 * fibs[n + 1] - 1, hint: String.raw`compute \(C_2, C_3, \dots\) in order, or use \(C_n = 2F_{n+1} - 1\).`, solution: String.raw`Building up: ${Array.from({ length: n + 1 }, (_, i) => String.raw`\(C_{${i}} = ${2 * fibs[i + 1] - 1}\)`).join(', ')}. The closed form \(C_n = 2F_{n+1} - 1\) agrees: \(2 \cdot ${fibs[n + 1]} - 1 = ${2 * fibs[n + 1] - 1}\).` };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: recurrence relations',
        kind: 'quiz',
        questions: [
          { q: String.raw`Which recurrence and initial condition produce the sequence \(3, 7, 15, 31, \dots\)?`, choices: [String.raw`\(a_n = 2a_{n-1} + 1,\ a_0 = 3\)`, String.raw`\(a_n = 2a_{n-1},\ a_0 = 3\)`, String.raw`\(a_n = a_{n-1} + 4,\ a_0 = 3\)`, String.raw`\(a_n = 2a_{n-1} + 1,\ a_0 = 1\)`], answer: 0, explain: String.raw`Check each step: \(2 \cdot 3 + 1 = 7\), \(2 \cdot 7 + 1 = 15\), \(2 \cdot 15 + 1 = 31\). The same rule with \(a_0 = 1\) gives \(1, 3, 7, 15\): the rule alone does not fix the sequence.` },
          { q: 'What is the minimum number of moves for the Tower of Hanoi with 6 disks?', choices: ['12', '32', '63', '64'], answer: 2, explain: String.raw`\(H_n = 2^n - 1\), so \(H_6 = 64 - 1 = 63\). Each extra disk roughly doubles the work: two copies of the smaller tower plus one move.` },
          { q: String.raw`What is the general solution of \(a_n = 5a_{n-1} - 6a_{n-2}\)?`, choices: [String.raw`\(a_n = b \cdot 2^n + d \cdot 3^n\)`, String.raw`\(a_n = b \cdot 5^n + d \cdot 6^n\)`, String.raw`\(a_n = (b + dn) \cdot 2^n\)`, String.raw`\(a_n = b \cdot (-2)^n + d \cdot (-3)^n\)`], answer: 0, explain: String.raw`The characteristic equation is \(r^2 - 5r + 6 = 0\), which factors as \((r - 2)(r - 3) = 0\). Two distinct roots, 2 and 3, give \(b \cdot 2^n + d \cdot 3^n\).` },
          { q: String.raw`The characteristic equation of \(a_n = 6a_{n-1} - 9a_{n-2}\) is \((r - 3)^2 = 0\). Which form does the solution take?`, choices: [String.raw`\(a_n = b \cdot 3^n\)`, String.raw`\(a_n = b \cdot 3^n + d \cdot n \cdot 3^n\)`, String.raw`\(a_n = b \cdot 3^n + d \cdot (-3)^n\)`, String.raw`\(a_n = b \cdot 9^n\)`], answer: 1, explain: String.raw`A repeated root \(r\) contributes both \(r^n\) and \(n\,r^n\). With only \(b \cdot 3^n\) you could not match two arbitrary initial conditions.` },
          { q: String.raw`Recursive binary search satisfies \(T(n) = T(n/2) + 1\). How does \(T(n)\) grow?`, choices: [String.raw`\(\Theta(1)\)`, String.raw`\(\Theta(\log\ n)\)`, String.raw`\(\Theta(n)\)`, String.raw`\(\Theta(n\ \log\ n)\)`], answer: 1, explain: String.raw`Each call does constant work and halves the problem, so there are about \(\log_2\ n\) calls before the size reaches 1. By the master theorem, \(a = 1\), \(b = 2\), \(d = 0 = \log_2\ 1\): the balanced case, \(\Theta(n^0\ \log\ n)\).` },
          { q: String.raw`By the master theorem, what is \(T(n) = 4T(n/2) + n\)?`, choices: [String.raw`\(\Theta(n)\)`, String.raw`\(\Theta(n\ \log\ n)\)`, String.raw`\(\Theta(n^2)\)`, String.raw`\(\Theta(4^n)\)`], answer: 2, explain: String.raw`\(\log_2\ 4 = 2 \gt d = 1\), so the leaves dominate: \(\Theta(n^{\log_2\ 4}) = \Theta(n^2)\). Each level costs twice the one above it.` },
          { q: 'Which recurrence describes merge sort?', choices: [String.raw`\(T(n) = T(n/2) + 1\)`, String.raw`\(T(n) = T(n-1) + n\)`, String.raw`\(T(n) = 2T(n/2) + n\)`, String.raw`\(T(n) = 2T(n-1) + 1\)`], answer: 2, explain: String.raw`Merge sort sorts two halves (\(2T(n/2)\)) and then merges them with up to \(n\) comparisons (\(+\,n\)). Every level of its recursion tree costs \(n\), so it runs in \(\Theta(n\ \log\ n)\).` },
          { q: 'Why is the naive recursive Fibonacci function so slow?', choices: ['Python\'s addition is slow for large numbers', 'It solves the same subproblems over and over, so the number of calls grows exponentially', 'It has no base case', 'Recursion is always slower than loops by a constant factor'], answer: 1, explain: String.raw`<code>fib(n)</code> recomputes <code>fib(n-2)</code> inside <code>fib(n-1)</code>, and so on down the tree: \(2F_{n+1} - 1\) calls in total. Memoization computes each value once, which makes the work linear in \(n\).` },
          { q: 'How many bit strings of length 5 have no two consecutive 1s?', choices: ['8', '13', '16', '21'], answer: 1, explain: String.raw`\(S_n = S_{n-1} + S_{n-2}\) with \(S_1 = 2\), \(S_2 = 3\) gives \(S_3 = 5\), \(S_4 = 8\), \(S_5 = 13\).` },
          { q: String.raw`Iterating \(H_n = 2H_{n-1} + 1\) suggests \(H_n = 2^n - 1\). What turns that guess into a proof?`, choices: ['Checking it for \\(n = 1, 2, 3\\)', 'A proof by mathematical induction', 'Running the recursive program for large \\(n\\)', 'Nothing more is needed: the iteration is already a proof'], answer: 1, explain: String.raw`Small cases and experiments build confidence but cover only finitely many \(n\). Induction proves the base case and shows that truth for \(k\) forces truth for \(k + 1\), which covers every \(n\).` },
        ],
      },
    ],
  });
})();
