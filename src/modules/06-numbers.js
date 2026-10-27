/* Module 6: Integers and number theory. Objective 6: analyze the relationship between integers
   and number theory. Divisibility, primes, gcd and Euclid's algorithm, modular arithmetic,
   number bases, fast powers, RSA, and everyday uses of mod (hashing, check digits, random numbers). */
(() => {
  // ---- integer helpers shared by the labs and the practice generators ----
  const { gcd, mod } = DMUtil.M; // the engine's gcd and always-non-negative mod, the same ones practice generators receive as M
  const powmod = (b, e, n) => { let r = 1 % n; b = mod(b, n); while (e > 0) { if (e % 2 === 1) r = (r * b) % n; b = (b * b) % n; e = Math.floor(e / 2); } return r; };
  // extended Euclid: returns [g, s, t] with g = s*a + t*b
  const egcd = (a, b) => { let [r0, r1, s0, s1, t0, t1] = [a, b, 1, 0, 0, 1]; while (r1) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; [t0, t1] = [t1, t0 - q * t1]; } return [r0, s0, t0]; };
  const inverse = (a, n) => { const [g, s] = egcd(mod(a, n), n); return g === 1 ? mod(s, n) : null; };
  const euclidRows = (a, b) => { const rows = []; while (b !== 0) { const q = Math.floor(a / b), r = a - q * b; rows.push({ a, b, q, r }); [a, b] = [b, r]; } return { rows, g: a }; };
  const EX_GCD = euclidRows(252, 198); // the worked example below, computed once: 4 division rows, gcd 18

  const neg = (x) => String(x).replace('-', '−'); // typographic minus for plain text
  const par = (x) => (x < 0 ? `(${x})` : String(x)); // parenthesize negatives inside TeX
  const DIG = '0123456789ABCDEF';
  const toBase = (n, b) => { if (n === 0) return '0'; let s = ''; while (n > 0) { s = DIG[n % b] + s; n = Math.floor(n / b); } return s; };
  const SUB = (n) => String(n).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c]);
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
  const PCOL = { 2: 'var(--accent)', 3: 'var(--fnc)', 5: 'var(--num)', 7: 'var(--kw)', 11: 'var(--str)', 13: 'var(--warn)' };
  const STEPCOL = ['var(--accent)', 'var(--fnc)', 'var(--num)', 'var(--kw)', 'var(--str)', 'var(--warn)', 'var(--false)'];
  const parseIntSafe = (v) => { const t = String(v).trim().replace(/[−–]/g, '-'); return /^-?\d+$/.test(t) ? parseInt(t, 10) : NaN; };
/* Euclid steps, computed from a preset's data ({ a, b, rows, g }) by the euclidRows generator
     above. The same builder narrates the primary pair (252, 198) and the variant pair (84, 210),
     whose first number is smaller than the second, so its first division has quotient 0 and the
     pair simply swaps — the boundary case the captions call out when q is 0. */
  function euclidStepsFor(D) {
    const { rows, g } = D;
    const steps = [{ shown: 0, caption: `The plan: replace the pair (a, b) by (b, the remainder when a is divided by b). The gcd survives every replacement, because any common divisor of a and b also divides that remainder — and the numbers shrink each time, so the process must stop. Here the starting pair is (${D.a}, ${D.b}).` }];
    rows.forEach((r, i) => {
      const caption = r.r === 0
        ? `${r.a} = ${r.q} · ${r.b} + 0. This time ${r.b} fits exactly and nothing is left over. A remainder of 0 is the stop signal: dividing further is impossible, and the last nonzero remainder is the answer.`
        : r.q === 0
          ? `${r.a} = 0 · ${r.b} + ${r.a}. No copy of ${r.b} fits into ${r.a} at all, because the first number is smaller than the second, so the quotient is 0 and the remainder is ${r.a} itself. The pair simply swaps: gcd(${r.a}, ${r.b}) = gcd(${r.b}, ${r.a}), and the algorithm carries on with the numbers in the usual order.`
          : `${r.a} = ${r.q} · ${r.b} + ${r.r}. ${r.q === 1 ? 'One copy' : `${r.q} copies`} of ${r.b} fit${r.q === 1 ? 's' : ''} into ${r.a} and ${r.r} is left over, so gcd(${r.a}, ${r.b}) = gcd(${r.b}, ${r.r}): the same question about smaller numbers. Each step keeps only the remainder, which is why the algorithm is fast.`;
      steps.push({ shown: i + 1, caption });
    });
    if (rows.length >= 2) {
      steps[1].checkpoint = `Predict: the next division divides ${rows[1].a} by ${rows[1].b} — how many whole copies of ${rows[1].b} fit into ${rows[1].a}, and what remainder will be left over?`;
    }
    steps.push({ shown: rows.length, answer: true, caption: `Answer: gcd(${D.a}, ${D.b}) = ${g}. Check: ${D.a} = ${g} · ${D.a / g} and ${D.b} = ${g} · ${D.b / g}, so ${g} divides both numbers — and ${D.a / g} and ${D.b / g} share no factor bigger than 1, so no number larger than ${g} can divide both. That confirms ${g} is the greatest common divisor.` });
    return steps;
  }
  const EX_GCD_DATA = { a: 252, b: 198, rows: EX_GCD.rows, g: EX_GCD.g };
  const EX_GCD_VAR = (() => { const r = euclidRows(84, 210); return { a: 84, b: 210, rows: r.rows, g: r.g }; })();

  /* Linear-combination formatting for the inverse example: fmtLin(3, 26, -11, 7) is "3 · 26 − 11 · 7",
     with a coefficient of 1 or −1 leaving just the number itself. */
  const fmtTerm = (c, x) => (Math.abs(c) === 1 ? `${x}` : `${Math.abs(c)} · ${x}`);
  const fmtLin = (c1, x1, c2, x2) => `${c1 < 0 ? '−' : ''}${fmtTerm(c1, x1)} ${c2 < 0 ? '−' : '+'} ${fmtTerm(c2, x2)}`;

  /* Symbolic back-substitution for the case gcd(a, n) = 1. Walks the remainder chain
     R[0] = n, R[1] = a, R[2], … down to the gcd, starting from the division that produced it
     and substituting one remainder at a time, exactly as a student would by hand. Returns the
     display-line parts (with the substituted piece flagged for highlighting) and, per back step,
     the facts the step captions are built from. */
  function backSub(a, n) {
    const { rows } = euclidRows(n, a);
    const R = [n, a], Q = [];
    for (const r of rows) { Q.push(r.q); R.push(r.r); }
    let m = R.length - 1;
    while (R[m] === 0) m--;
    const g = R[m];
    const d0 = m - 2; // the division R[d0] = Q[d0] · R[d0 + 1] + g that produced the gcd
    let x = R[d0], y = R[d0 + 1], cx = 1, cy = -Q[d0], xi = d0, yi = d0 + 1;
    const infos = [{ sub: null, parts: [[`${g} = ${fmtLin(cx, x, cy, y)}`, false]], result: fmtLin(cx, x, cy, y) }];
    while (xi > 0 || yi > 1) {
      // substitute whichever atom sits later in the remainder chain (the smaller remainder)
      if (yi > xi) {
        const i = yi, S = fmtLin(1, R[i - 2], -Q[i - 2], R[i - 1]);
        const ncx = cx - cy * Q[i - 2];
        const prefix = `${g} = ${cx < 0 ? '−' : ''}${fmtTerm(cx, x)} ${cy < 0 ? '−' : '+'} ${Math.abs(cy) === 1 ? '' : `${Math.abs(cy)}`}`;
        const raw = `${cx < 0 ? '−' : ''}${fmtTerm(cx, x)} ${cy < 0 ? '−' : '+'} ${Math.abs(cy) === 1 ? '' : `${Math.abs(cy)}`}(${S})`;
        const result = fmtLin(ncx, x, cy, R[i - 2]);
        infos.push({ sub: { atom: y, expr: S, from: [R[i - 2], Q[i - 2], R[i - 1]] }, parts: [[prefix, false], [`(${S})`, true], [` = ${result}`, false]], raw, result, atomsAfter: [x, R[i - 2]] });
        y = R[i - 2]; yi = i - 2; cx = ncx;
      } else {
        const i = xi, S = fmtLin(1, R[i - 2], -Q[i - 2], R[i - 1]);
        const ncy = cy - cx * Q[i - 2];
        const prefix = `${g} = ${cx < 0 ? '−' : ''}${Math.abs(cx) === 1 ? '' : Math.abs(cx)}`;
        const raw = `${cx < 0 ? '−' : ''}${Math.abs(cx) === 1 ? '' : Math.abs(cx)}(${S}) ${cy < 0 ? '−' : '+'} ${fmtTerm(cy, y)}`;
        const result = fmtLin(cx, R[i - 2], ncy, y);
        infos.push({ sub: { atom: x, expr: S, from: [R[i - 2], Q[i - 2], R[i - 1]] }, parts: [[prefix, false], [`(${S})`, true], [` ${cy < 0 ? '−' : '+'} ${fmtTerm(cy, y)} = ${result}`, false]], raw, result, atomsAfter: [R[i - 2], y] });
        x = R[i - 2]; xi = i - 2; cy = ncy;
      }
    }
    return { R, Q, g, infos, coeffs: [cx, cy] }; // final combination: g = coeffs[0] · n + coeffs[1] · a
  }

  /* Display lines for the inverse example, computed from the preset's (a, n). Invertible presets
     get forward lines plus the back-substitution lines; a non-invertible preset gets its forward
     lines plus the gcd combination and the reason no combination can reach 1. */
  function invLinesFor(a, n) {
    const [g] = egcd(a, n);
    const { rows } = euclidRows(n, a);
    if (g === 1) {
      const fwd = rows.filter((r) => r.r > 0).map((r) => ({ tag: 'Forward', parts: [[`${r.a} = ${r.q} · ${r.b} + ${r.r}`, false]] }));
      const back = backSub(a, n).infos.map((inf) => ({ tag: 'Back', parts: inf.parts }));
      const [cn, ca] = backSub(a, n).coeffs;
      return [...fwd, ...back, { tag: 'Read off', parts: [[`${neg(ca)} · ${a} ≡ 1 (mod ${n}), and ${neg(ca)} + ${n} = ${mod(ca, n)}`, false]] }];
    }
    return [
      ...rows.map((r) => ({ tag: 'Forward', parts: [[`${r.a} = ${r.q} · ${r.b} + ${r.r}`, false]] })),
      { tag: 'GCD', parts: [[`${rows[0].r} = ${fmtLin(1, n, -rows[0].q, a)}`, false]] },
      { tag: 'Why', parts: [[`every combination s · ${n} + t · ${a} is a multiple of ${g}, so none can equal 1`, false]] },
    ];
  }

  /* Steps for the inverse example, computed from the preset's data ({ a, n }): the invertible
     branch follows Euclid forward, back-substitutes to a Bézout combination and reads off the
     inverse; the non-invertible branch follows Euclid to a gcd bigger than 1 and shows the
     algorithm itself detecting that no inverse exists. */
  function invStepsFor(D) {
    const a = D.a, n = D.n;
    const [g, sA, tN] = egcd(a, n); // g = sA · a + tN · n
    const { rows } = euclidRows(n, a);
    if (g === 1) {
      const inv = mod(sA, n);
      const fwdRows = rows.filter((r) => r.r > 0);
      const bs = backSub(a, n);
      const steps = [
        { lines: 0, phase: 'setup', caption: `Setup: an inverse of ${a} modulo ${n} is a number x with ${a}x ≡ 1 (mod ${n}), and it can exist only because gcd(${a}, ${n}) = 1. The plan is to run Euclid forward to remainder 1, then work backward to write 1 as a combination of ${n} and ${a}.` },
        { lines: fwdRows.length, phase: 'forward', caption: `Forward pass: ${fwdRows.map((r) => `${r.a} = ${r.q} · ${r.b} + ${r.r}`).join(', then ')}, so the ${fwdRows.length} division lines are now on the page. We run Euclid only until remainder 1 appears, because 1 is exactly the number the backward pass has to express.` },
      ];
      bs.infos.forEach((inf, j) => {
        const lines = fwdRows.length + j + 1;
        if (!inf.sub) {
          steps.push({ lines, phase: 'back', caption: `Back-substitution starts by rearranging the last division, ${fwdRows[fwdRows.length - 1].a} = ${fwdRows[fwdRows.length - 1].q} · ${fwdRows[fwdRows.length - 1].b} + 1, into 1 = ${inf.result}. Every backward step replaces a remainder by the expression the forward pass gave for it, so the value stays equal to 1 throughout.` });
        } else {
          const lastSub = j === bs.infos.length - 1;
          steps.push({ lines, phase: 'back', caption: `Replace the remainder ${inf.sub.atom} by ${inf.sub.expr}, rearranging ${inf.sub.from[0]} = ${inf.sub.from[1]} · ${inf.sub.from[2]} + ${inf.sub.atom}, giving 1 = ${inf.raw} = ${inf.result} after the terms are collected. The highlighted piece is the substitution itself, and now only the remainders ${inf.atomsAfter[0]} and ${inf.atomsAfter[1]} remain in the expression${lastSub ? ` — the original numbers ${n} and ${a} themselves` : ''}.` });
        }
      });
      const finalBackIdx = steps.length - 1;
      const fin = bs.infos[bs.infos.length - 1];
      steps[finalBackIdx - 1].checkpoint = `Predict: one substitution is left, replacing ${fin.sub.atom} by ${fin.sub.expr} — will the coefficient of ${a} in the final combination turn out positive or negative?`;
      const totalLines = fwdRows.length + bs.infos.length + 1;
      steps.push({ lines: totalLines, phase: 'read', caption: `Read off the inverse: modulo ${n} the term ${tN} · ${n} is 0, so ${neg(sA)} · ${a} ≡ 1 (mod ${n}) and the coefficient of ${a} is the inverse, still in negative form. Adding ${n} turns ${neg(sA)} into the standard residue ${inv}, because residues are named by a number from 0 to ${n - 1}.` });
      steps.push({ lines: totalLines, phase: 'answer', answer: true, caption: `Answer: ${a}⁻¹ ≡ ${inv} (mod ${n}). Check: ${a} · ${inv} = ${a * inv} = ${Math.floor((a * inv) / n)} · ${n} + 1, so ${a * inv} ≡ 1 (mod ${n}) and the inverse works, with no smaller positive candidate left to test because an inverse modulo n is unique when it exists.` });
      return steps;
    }
    const residues = [...new Set(rows.length ? Array.from({ length: n }, (_, x) => mod(a * x, n)) : [])].sort((p, q) => p - q);
    const steps = [{ lines: 0, phase: 'setup', caption: `Setup: an inverse of ${a} modulo ${n} would be a number x with ${a}x ≡ 1 (mod ${n}), and one exists only when gcd(${a}, ${n}) = 1. This time that condition is exactly what is in doubt, so the plan is to run Euclid forward first and let the gcd itself decide whether an inverse can exist at all.` }];
    rows.forEach((r, i) => {
      const caption = r.r === 0
        ? `${r.a} = ${r.q} · ${r.b} + 0. This time ${r.b} fits exactly, so the remainder is 0 and the algorithm stops: the last nonzero remainder is the gcd, gcd(${a}, ${n}) = ${g}, which is not 1. The invertibility test has failed — no back-substitution can fix that, because the backward pass can only ever produce combinations of ${n} and ${a}.`
        : `${r.a} = ${r.q} · ${r.b} + ${r.r}. ${r.q === 1 ? 'One copy' : `${r.q} copies`} of ${r.b} fit${r.q === 1 ? 's' : ''} into ${r.a}, leaving ${r.r}, so gcd(${r.a}, ${r.b}) = gcd(${r.b}, ${r.r}). The remainder ${r.r} is already bigger than 1, which is a warning sign: an inverse needs the chain to reach remainder 1 exactly.`;
      const st = { lines: i + 1, phase: 'forward', caption };
      if (i === 0 && rows.length >= 2) st.checkpoint = `Predict: the next division divides ${rows[1].a} by ${rows[1].b} — will it leave remainder 1, which would keep an inverse possible, or remainder 0 with gcd ${rows[1].b}, which would rule an inverse out?`;
      steps.push(st);
    });
    steps.push({ lines: rows.length + 1, phase: 'back', caption: `Why ${g} blocks everything: rearranging the first division gives ${rows[0].r} = ${fmtLin(1, n, -rows[0].q, a)}, an explicit combination of ${n} and ${a} that equals the gcd ${g}. Every combination s · ${n} + t · ${a} is a multiple of ${g}, since each term is, so Bézout combinations can produce ${g} but never 1 — and producing 1 is exactly what an inverse would require.` });
    steps.push({ lines: rows.length + 2, phase: 'read', caption: `Brute-force confirmation: the values ${a}x mod ${n} for x from 0 to ${n - 1} are exactly {${residues.join(', ')}}, every one a multiple of ${g}. The value 1 never appears, so the equation ${a}x ≡ 1 (mod ${n}) has no solution at all: it is not merely hard to solve, it is impossible.` });
    steps.push({ lines: rows.length + 2, phase: 'answer', answer: true, caption: `Answer: ${a} has no inverse modulo ${n}. Check: gcd(${a}, ${n}) = ${g} ≠ 1, and the exhaustive residue check confirms that no x satisfies ${a}x ≡ 1 (mod ${n}) — ${a}x is always a multiple of ${g} while 1 is not, so ${a}x − 1 can never be a multiple of ${n}.` });
    return steps;
  }
  const EX_INV_DATA = { a: 7, n: 26, header: '7x ≡ 1 (mod 26)', emptyText: 'Forward work will appear here: divide 26 by 7, then keep dividing remainders until 1 appears.', readNote: 'Modulo 26, the term 3 · 26 counts as 0, so only −11 · 7 remains.', answerBanner: '7⁻¹ ≡ 15 (mod 26) · check: 7 · 15 = 105 = 4 · 26 + 1, so 105 ≡ 1 (mod 26)', lines: invLinesFor(7, 26) };
  const EX_INV_VAR_DATA = { a: 4, n: 26, header: '4x ≡ 1 (mod 26)', emptyText: 'Forward work will appear here: divide 26 by 4, then keep dividing remainders until the gcd shows itself.', readNote: 'Combinations of 26 and 4 are always multiples of their gcd 2, so none of them can ever equal 1.', answerBanner: '4 has no inverse modulo 26 · check: gcd(4, 26) = 2 ≠ 1, and 4x mod 26 is always even, never 1', lines: invLinesFor(4, 26) };

  /* Repeated squaring: the chain of powers b^(2^j) mod m, the bits of e that select from it,
     and the running product of the selected powers, computed once per preset. One generator
     narrates both presets: a mixed bit pattern, and a power-of-two exponent whose binary
     form has a single 1-bit, so only one square survives into the product. */
  function powChainFor(b, e, m) {
    const bits = e.toString(2).split('').reverse().map(Number);
    const powers = []; let x = mod(b, m);
    bits.forEach(() => { powers.push(x); x = (x * x) % m; });
    const used = bits.map((bit, j) => (bit ? j : -1)).filter((j) => j >= 0);
    const prodSteps = []; let prod = 1 % m;
    for (const j of used) { prod = (prod * powers[j]) % m; prodSteps.push(prod); }
    return { b, e, m, bits, powers, used, prodSteps, ans: prod };
  }
  function powStepsFor(D) {
    const { b, e, m, bits, powers, used, ans } = D;
    const bin = e.toString(2);
    const steps = [{ shown: 0, phase: 'setup', caption: `Setup: compute ${b}^${e} mod ${m} without ever forming the enormous number ${b}^${e} itself. Write the exponent in binary, ${e} = (${bin})₂ = ${used.map((j) => 2 ** j).reverse().join(' + ')}, square the base repeatedly to get the powers ${b}^1, ${b}^2, ${b}^4, … mod ${m}, and multiply in only the powers that match the 1-bits.` }];
    powers.forEach((p, j) => {
      steps.push({ shown: j + 1, phase: 'square', caption: j === 0
        ? `First power: ${b}^1 mod ${m} = ${p}, just the base reduced mod ${m}. This value anchors the whole chain, because every later power is the square of the one before it, reduced at once, so no entry in the table ever reaches ${m}².`
        : `Square the previous power: ${b}^${2 ** j} = (${b}^${2 ** (j - 1)})² ≡ ${powers[j - 1]}² = ${powers[j - 1] * powers[j - 1]} ≡ ${p} (mod ${m}). Reducing right after squaring is what keeps the method fast: the arithmetic stays tiny no matter how large the exponent grows.` });
    });
    const skipped = bits.map((bit, j) => (bit ? -1 : j)).filter((j) => j >= 0);
    steps.push({ shown: powers.length, phase: 'select', caption: `Read the bits of ${e} = (${bin})₂ from the right: the 1-bits sit at positions ${used.join(', ')}, so the powers that belong in the answer are ${used.map((j) => `${b}^${2 ** j} ≡ ${powers[j]}`).join(', ')}${skipped.length ? `, while the power${skipped.length === 1 ? '' : 's'} at bit position${skipped.length === 1 ? '' : 's'} ${skipped.join(', ')} (bit 0) are skipped` : ''}. Only ${used.length} of the ${bits.length} squares survive into the product.`,
      checkpoint: `Predict: multiply just the kept powers ${used.map((j) => powers[j]).join(' · ')} together, reducing mod ${m} after each multiplication — what single residue from 0 to ${m - 1} will be left at the end?` });
    const chain = []; let run = 1 % m;
    used.forEach((j, t) => { const before = run; run = D.prodSteps[t]; chain.push(t === 0 || before === 1 ? `1 · ${powers[j]} = ${run}` : `${before} · ${powers[j]} = ${before * powers[j]} ≡ ${run}`); });
    steps.push({ shown: powers.length, phase: 'multiply', caption: `Multiply the kept powers in, reducing after each step: ${chain.join(', then ')}. Reducing at every step gives the same final residue as reducing once at the end — the multiplication rule for congruences guarantees it — but the intermediate numbers stay below ${m} · ${m} the whole way.` });
    steps.push({ shown: powers.length, phase: 'answer', answer: true, caption: `Answer: ${b}^${e} ≡ ${ans} (mod ${m}). Check: multiplying ${b} by itself ${e} times, reducing mod ${m} after every single multiplication, also ends at ${ans} — repeated squaring reached the same residue with just ${bits.length - 1} squarings and ${Math.max(0, used.length - 1)} extra multiplication${used.length === 2 ? '' : 's'} instead of ${e - 1} multiplications.` });
    return steps;
  }
  const EX_POW_DATA = powChainFor(5, 11, 13);
  const EX_POW_VAR_DATA = powChainFor(3, 16, 7);

  /* The sieve as data: one pass per prime p with p² ≤ N, each recording the numbers it newly
     crosses out (multiples from p² up, the same rule the sieve lab uses), plus the survivors. */
  function sieveDataFor(N) {
    const crossed = new Array(N + 1).fill(0); const passes = [];
    for (let p = 2; p * p <= N; p++) {
      if (crossed[p]) continue;
      const newly = [];
      for (let x = p * p; x <= N; x += p) if (!crossed[x]) { crossed[x] = p; newly.push(x); }
      passes.push({ p, crossed: newly });
    }
    const primes = []; for (let x = 2; x <= N; x++) if (!crossed[x]) primes.push(x);
    return { N, passes, primes };
  }
  function sieveStepsFor(D) {
    const { N, passes, primes } = D;
    const steps = [{ shown: 0, phase: 'setup', caption: `Setup: find every prime up to ${N} with the sieve, which needs no division at all. Every number from 2 to ${N} starts out standing; each pass takes the smallest number still standing — which must be prime — and crosses out its multiples, and whatever is left standing at the end is exactly the list of primes.` }];
    let crossedCount = 0;
    passes.forEach((ps, j) => {
      crossedCount += ps.crossed.length;
      const standing = N - 1 - crossedCount;
      const list = ps.crossed.length > 6 ? `${ps.crossed.slice(0, 5).join(', ')}, … (${ps.crossed.length} in all)` : ps.crossed.join(', ');
      steps.push({ shown: j + 1, phase: 'pass', caption: `Pass p = ${ps.p}: ${ps.p} is the smallest number still standing, so it is prime, because a smaller prime factor would already have crossed it out. Cross out its multiples starting at ${ps.p}² = ${ps.p * ps.p}, since every smaller multiple of ${ps.p} is either ${ps.p} itself or has a smaller prime factor and fell earlier: this pass newly crosses ${list}. Now ${standing} numbers are still standing.` });
    });
    if (passes.length >= 2) steps[1].checkpoint = `Predict: the next pass takes p = ${passes[1].p}, the smallest number still standing, and starts crossing at ${passes[1].p}² = ${passes[1].p * passes[1].p} — will that starting number still be standing when the pass begins, and will it fall in this pass?`;
    const nextP = primes[passes.length];
    steps.push({ shown: passes.length, phase: 'collect', caption: `Stop: the next candidate would be ${nextP}, and ${nextP}² = ${nextP * nextP} > ${N}, so every composite up to ${N} already lost a prime factor at or below √${N} ≈ ${Math.sqrt(N).toFixed(1)} in an earlier pass. Everything still standing is therefore prime: ${primes.join(', ')}.` });
    steps.push({ shown: passes.length, phase: 'answer', answer: true, caption: `Answer: the primes up to ${N} are ${primes.join(', ')} — ${primes.length} primes in all. Check: trial division, a different method, tests each number from 2 to ${N} against divisors up to its own square root and finds exactly these ${primes.length} primes, and every composite in the range was crossed by its smallest prime factor during the passes.` });
    return steps;
  }
  const EX_SIEVE_DATA = sieveDataFor(30);
  const EX_SIEVE_VAR_DATA = sieveDataFor(50);
  const sieveCheck = (D, M) => {
    const want = []; for (let x = 2; x <= D.N; x++) if (M.isPrime(x)) want.push(x);
    const crossedAll = D.passes.flatMap((ps) => ps.crossed);
    return JSON.stringify(want) === JSON.stringify(D.primes)
      && crossedAll.length + D.primes.length === D.N - 1
      && new Set(crossedAll).size === crossedAll.length
      && D.passes.every((ps) => ps.crossed.every((x) => x % ps.p === 0 && x >= ps.p * ps.p && !M.isPrime(x)));
  };


  DM.module({
    id: 'numbers',
    num: 6,
    title: 'Integers & Number Theory',
    objectives: [5, 6],
    terms: {
      'divides': 'a | b ("a divides b") means b = a·k for some integer k. Then a is a divisor (factor) of b, and b is a multiple of a.',
      'division algorithm': 'For any integer a and any integer d > 0 there is exactly one pair of integers q, r with a = d·q + r and 0 ≤ r < d.',
      'quotient': 'The q in a = d·q + r: how many whole copies of d fit into a, rounding down. In Python, a // d.',
      'remainder': 'The r in a = d·q + r, always with 0 ≤ r < d. Written a mod d; in Python, a % d.',
      'prime': 'An integer p > 1 whose only positive divisors are 1 and p, such as 2, 3, 5, 7, 11.',
      'composite': 'An integer n > 1 that is not prime, so n = a·b with 1 < a, b < n. For example 91 = 7·13.',
      'greatest common divisor': 'gcd(a, b): the largest integer that divides both a and b. gcd(12, 18) = 6.',
      'least common multiple': 'lcm(a, b): the smallest positive integer that both a and b divide. lcm(4, 6) = 12.',
      'relatively prime': 'Two integers are relatively prime (coprime) when their gcd is 1, such as 8 and 15.',
      'extended Euclidean algorithm': 'Euclid\'s algorithm run with bookkeeping so that it also returns integers s, t with gcd(a, b) = s·a + t·b (Bézout\'s identity).',
      'congruent': 'a ≡ b (mod n) means n divides a − b, so a and b leave the same remainder when divided by n.',
      'modulus': 'The n in "mod n": the number at which arithmetic wraps around, like 12 on a clock.',
      'modular inverse': 'A number x with a·x ≡ 1 (mod n), written a⁻¹. It exists exactly when gcd(a, n) = 1.',
      'base': 'The number b whose powers give the place values of a numeral: in base 2 the places are 1, 2, 4, 8, …; in base 16 they are 1, 16, 256, …',
      'RSA': 'A public-key cryptosystem: the public key is (n, e) with n = p·q, the private key is d = e⁻¹ mod (p − 1)(q − 1). Encrypt with c = mᵉ mod n, decrypt with m = cᵈ mod n.',
      'public-key cryptography': 'Encryption with two keys: a public key that anyone may use to encrypt, and a private key, kept secret, that decrypts.',
      'Luhn algorithm': 'The check-digit rule used on payment cards: double every second digit from the right, subtract 9 from results above 9, and require the total to be a multiple of 10.',
      'linear congruential generator': 'A simple pseudo-random generator: x₍ₖ₊₁₎ = (a·xₖ + c) mod m, started from a seed x₀.',
    },
    symbols: [
      ['a | b', 'a divides b', '3 | 12'],
      ['a ∤ b', 'a does not divide b', '5 ∤ 12'],
      ['a mod n', 'remainder after dividing a by n', '17 mod 5 = 2'],
      ['⌊x⌋', 'floor: round down to an integer', '⌊−4.6⌋ = −5'],
      ['√n', 'square root: the trial-division limit', '√97 ≈ 9.8'],
      ['gcd(a, b)', 'greatest common divisor', 'gcd(12, 18) = 6'],
      ['lcm(a, b)', 'least common multiple', 'lcm(4, 6) = 12'],
      ['≡ (mod n)', 'congruent modulo n', '38 ≡ 2 (mod 12)'],
      ['a⁻¹', 'modular inverse', '3⁻¹ ≡ 5 (mod 7)'],
      ['(…)₂ (…)₁₆', 'numeral in base 2, base 16', '(1011)₂ = 11'],
      ['φ(n)', 'for RSA, (p − 1)(q − 1)', 'φ(3233) = 3120'],
    ],
    css: `
      .nt-numline svg, .nt-conv-wrap { width: 100%; }
      .nt-svgbox { position: relative; min-height: 0; }
      .nt-svgbox > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      .nt-sieve { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 1rem; min-height: 0; }
      .nt-side { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; overflow: hidden; }
      .nt-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; text-align: center; }
      .nt-stats div { background: var(--sheet); border: 1px solid var(--rule); border-radius: var(--radius); padding: 0.3rem 0.2rem; }
      .nt-stats b { display: block; font-family: var(--font-display); font-size: 1.25rem; font-variant-numeric: tabular-nums; }
      .nt-stats span { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
      .nt-chips { display: flex; flex-wrap: wrap; gap: 0.2rem; }
      .nt-chips span { font-family: var(--font-mono); font-size: 0.74rem; border-radius: 0.25rem; padding: 0 0.3rem; border: 1px solid var(--rule); }
      .nt-chips span.old { color: var(--ink-3); text-decoration: line-through; border-style: dashed; }
      .nt-ladder { border-collapse: collapse; font-family: var(--font-mono); font-size: 0.78rem; font-variant-numeric: tabular-nums; }
      .nt-ladder td, .nt-ladder th { border: 1px solid var(--rule); padding: 0.1rem 0.32rem; text-align: center; }
      .nt-ladder th { background: var(--paper); color: var(--ink-2); font-weight: 600; text-align: left; white-space: nowrap; }
      .nt-ladder td.dig { color: var(--accent); font-weight: 700; }
      .nt-ladder td.on { background: var(--mark); color: var(--mark-ink); font-weight: 700; }
      .nt-ladder td.off { color: var(--ink-3); }
      .nt-euclid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 1rem; min-height: 0; }
      .nt-rows { list-style: none; padding: 0; margin: 0; font-family: var(--font-mono); font-size: 0.9rem; }
      .nt-rows li { display: grid; grid-template-columns: 1.6rem minmax(0, 1fr); gap: 0.3rem; padding: 0.18rem 0.45rem; border-radius: 0.35rem; border-left: 3px solid transparent; cursor: pointer; margin: 0; }
      .nt-rows li + li { margin-top: 0.1rem; }
      .nt-rows li.on { background: var(--mark); color: var(--mark-ink); }
      .nt-rows li.future { color: var(--ink-3); opacity: 0.55; }
      .nt-rows .k { color: var(--ink-3); font-size: 0.75rem; padding-top: 0.12rem; }
      .nt-bez td, .nt-bez th { padding: 0.12rem 0.4rem; font-size: 0.82rem; }
      .nt-bez tr.g td { background: var(--mark); color: var(--mark-ink); font-weight: 700; }
      .nt-clock { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 1rem; min-height: 0; }
      .nt-mt { font-size: 0.72rem; }
      .nt-mt th, .nt-mt td { padding: 0.04rem 0.22rem; min-width: 1.45rem; }
      .nt-mt td { cursor: pointer; }
      .nt-mt td.one { background: var(--true-bg); color: var(--true); font-weight: 700; }
      .nt-mt tr.sel td, .nt-mt tr.sel th { background: var(--mark); color: var(--mark-ink); }
      .nt-mt tr.sel td.one { background: var(--true); color: var(--sheet); }
      .nt-mt td.colsel { box-shadow: inset 0 0 0 2px var(--accent); }
      .nt-mt td.inv { color: var(--true); font-weight: 600; cursor: default; }
      .nt-mt td.noinv { color: var(--ink-3); cursor: default; }
      .nt-ctl { display: grid; grid-template-columns: 4.6rem minmax(0, 1fr) 2.2rem; gap: 0.25rem 0.5rem; align-items: center; font-size: 0.86rem; }
      .nt-ctl output { font-family: var(--font-mono); font-weight: 700; text-align: right; }
      .nt-rsa { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 0.9rem; min-height: 0; }
      .nt-rsa .card { padding: 0.5rem 0.75rem; }
      .nt-rsa h4 { font-family: var(--font-mono); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.02em; color: var(--accent); margin: 0 0 0.25rem; }
      table.data.nt-ct th { text-transform: none; letter-spacing: 0.02em; font-size: 0.78rem; }
      .nt-rsa select.inp { padding: 0.15rem 0.35rem; }
      .nt-ct td, .nt-ct th { padding: 0.1rem 0.45rem; font-size: 0.82rem; }
      .nt-ct tbody tr { cursor: pointer; }
      .nt-ct tr.sel td { background: var(--mark); color: var(--mark-ink); }
      .nt-luhn-row { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 0.12rem; font-family: var(--font-mono); font-size: 0.8rem; text-align: center; }
      .nt-luhn-row span { border: 1px solid var(--rule); border-radius: 0.2rem; padding: 0.02rem 0; }
      .nt-luhn-row span.dbl { background: var(--accent-2); border-color: var(--accent); font-weight: 700; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Divisibility and the division algorithm',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">For integers \(a \neq 0\) and \(b\), \(a\) <span class="term">divides</span> \(b\), written \(a \mid b\), when \(b = a k\) for some integer \(k\). Then \(a\) is a <b>divisor</b> (or factor) of \(b\), and \(b\) is a <b>multiple</b> of \(a\). So \(3 \mid 12\) because \(12 = 3 \cdot 4\), while \(5 \nmid 12\).</div>
              <div class="thm">The <span class="term">division algorithm</span>. For any integer \(a\) and any integer \(d \gt 0\) there is exactly one pair of integers \(q\), the <span class="term">quotient</span>, and \(r\), the <span class="term">remainder</span>, with
                \[a = d\,q + r, \qquad 0 \le r \lt d.\]
                We write \(q = \lfloor a/d \rfloor\) and \(r = a \bmod d\).</div>
              <p class="small">Three facts follow straight from the definition, and Euclid's algorithm later relies on them. If \(a \mid b\) and \(a \mid c\), then \(a \mid (b \pm c)\). If \(a \mid b\), then \(a \mid bc\). If \(a \mid b\) and \(b \mid c\), then \(a \mid c\).</p>
              <div class="ai">Splitting \(N = 1000\) training examples into batches of \(d = 64\) gives \(q = 15\) full batches and \(r = 40\) examples left over. Data loaders compute exactly this with <code>N // 64</code> and <code>N % 64</code>, then decide whether to keep or drop the short last batch.</div>
            </div>
            <div class="stack">
              <div class="card nt-numline stack" style="gap:0.4rem"></div>
              <div class="warn">The remainder is never negative. For \(a = -23\) and \(d = 5\) the answer is \(q = -5,\ r = 2\), because \(-23 = 5 \cdot (-5) + 2\). Python agrees: <code>-23 // 5</code> is <code>-5</code> and <code>-23 % 5</code> is <code>2</code>. C, Java and JavaScript round the quotient toward zero instead, so in those languages <code>-23 % 5</code> is <code>-3</code>.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const card = body.querySelector('.nt-numline');
          let a = -23, d = 5;
          const aOut = h('output.mono', { style: { fontWeight: 700, minWidth: '2.4rem', textAlign: 'right' } });
          const aIn = h('input', { type: 'range', min: -30, max: 30, step: 1, value: a, 'aria-label': 'Value of a' });
          const dSeg = h('div.seg', { 'aria-label': 'Divisor d' });
          const svg = s('svg', { viewBox: '0 0 520 112', role: 'img', 'aria-label': 'Number line: a sits between the multiples d·q and d·(q+1)' });
          const eq = h('div.small');
          card.append(
            h('div.tiny.mono.muted', 'NUMBER-LINE MODEL · DRAG a, PICK d'),
            h('div.row', { style: { gap: '0.5rem', flexWrap: 'nowrap' } }, h('span.small', 'a ='), aOut, h('div', { style: { flex: '1 1 auto' } }, aIn)),
            h('div.row', { style: { gap: '0.5rem' } }, h('span.small', 'd ='), dSeg),
            svg, eq);
          aIn.addEventListener('input', () => { a = +aIn.value; draw(); });
          function draw() {
            aOut.textContent = neg(a);
            ctx.rc(dSeg, ...[2, 3, 4, 5, 6, 7, 8, 9].map((k) => h('button', { 'aria-pressed': String(k === d), onclick: () => { d = k; draw(); } }, String(k))));
            const q = Math.floor(a / d), r = a - d * q;
            // zoom to five blocks of length d around a, so r is always easy to see
            const lo = d * (q - 2), hi = d * (q + 3);
            const X = (v) => 20 + ((v - lo) * 480) / (hi - lo);
            const kids = [];
            kids.push(s('rect', { x: X(d * q), y: 41, width: X(d * (q + 1)) - X(d * q), height: 22, rx: 3, fill: 'var(--accent-2)', stroke: 'none' }));
            kids.push(s('line', { x1: X(lo), y1: 52, x2: X(hi), y2: 52, stroke: 'var(--ink-3)', 'stroke-width': 1.5 }));
            for (let v = lo; v <= hi; v++) {
              const isMul = mod(v, d) === 0;
              kids.push(s('line', { x1: X(v), y1: isMul ? 44 : 48, x2: X(v), y2: isMul ? 60 : 56, stroke: isMul ? 'var(--ink-2)' : 'var(--ink-3)', 'stroke-width': isMul ? 1.6 : 0.8 }));
              if (isMul) kids.push(s('text', { x: X(v), y: 79, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--ink-2)', text: neg(v) }));
            }
            if (r > 0) kids.push(s('line', { x1: X(d * q), y1: 52, x2: X(a), y2: 52, stroke: 'var(--accent)', 'stroke-width': 5, 'stroke-linecap': 'round' }));
            kids.push(s('text', { x: (X(d * q) + X(a)) / 2, y: 36, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--accent)', text: `r = ${r}` }));
            kids.push(s('circle', { cx: X(a), cy: 52, r: 5.5, fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': 1.5 }));
            kids.push(s('text', { x: X(a), y: 16, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: 'var(--ink)', text: `a = ${neg(a)}` }));
            kids.push(s('path', { d: `M${X(d * q)} 86 L${X(d * q)} 64`, stroke: 'var(--fnc)', 'stroke-width': 1.2, fill: 'none', 'stroke-dasharray': '2 2' }));
            kids.push(s('text', { x: X(d * q), y: 100, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: 'var(--fnc)', text: `d·q = ${d}·${par(q)} = ${neg(d * q)}` }));
            ctx.rc(svg, ...kids);
            eq.innerHTML = String.raw`\(${a} = ${d} \cdot ${par(q)} + ${r}\), so \(q = \lfloor ${a}/${d} \rfloor = ${q}\) and \(r = ${r}\). The point \(a\) always sits in the shaded block from \(d\,q\) up to \(d\,(q+1)\); \(r\) is how far it lies past the left end.` +
              (a < 0 && r > 0 ? String.raw` <span class="muted">Rounding toward zero would give \(q = ${q + 1}\) and a negative remainder \(${r - d}\), which the theorem forbids.</span>` : '');
            ctx.tex(eq);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Primes and unique factorization',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">An integer \(p \gt 1\) is <span class="term">prime</span> when its only positive divisors are \(1\) and \(p\). An integer \(n \gt 1\) that is not prime is <span class="term">composite</span>: it factors as \(n = ab\) with \(1 \lt a, b \lt n\). The number 1 is neither prime nor composite.</div>
              <div class="thm">If \(n\) is composite, then \(n\) has a prime divisor \(p \le \sqrt{n}\).</div>
              <p>Here is why. Write \(n = ab\) with \(a \le b\). Then \(a \cdot a \le a \cdot b = n\), so \(a \le \sqrt n\), and any prime factor of \(a\) is at most \(a\). So <b>trial division</b> tests only the primes up to \(\sqrt n\). For \(n = 97\), \(\sqrt{97} \approx 9.8\), and none of 2, 3, 5, 7 divides 97, so 97 is prime. For \(n = 91\), the test finds \(7 \mid 91\), since \(91 = 7 \cdot 13\).</p>
              <div class="tip">Stopping at \(\sqrt n\) is a huge saving. For a 12-digit number it means about a million trial divisions instead of a trillion.</div>
            </div>
            <div class="stack">
              <div class="thm" data-label="Fundamental Theorem of Arithmetic">Every integer \(n \gt 1\) is a product of primes in exactly one way, apart from the order of the factors.
                \[360 = 2 \cdot 180 = 2 \cdot 2 \cdot 90 = \cdots = 2^3 \cdot 3^2 \cdot 5\]
                Whichever factor you split off first, you end with the same primes.</div>
              <div class="thm" data-label="Theorem (Euclid)">There are infinitely many primes.</div>
              <p class="small">This is the proof by contradiction from Module 3. Suppose \(p_1, \dots, p_k\) were all the primes, and let \(N = p_1 p_2 \cdots p_k + 1\). Dividing \(N\) by any \(p_i\) leaves remainder 1, so no \(p_i\) divides \(N\). Yet \(N \gt 1\) has a prime factor, and that prime is missing from the list. Contradiction.</p>
              <div class="ai">The encryption that protects every call to a hosted AI model rests on a gap between two problems. Multiplying two 300-digit primes takes a computer microseconds. No known method recovers the two primes from their product in any reasonable time.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: the Sieve of Eratosthenes',
        kind: 'lab',
        html: String.raw`<p class="muted small">The sieve finds every prime up to \(N\) without a single division. Each pass takes the smallest number that is still standing (it must be prime) and crosses out its multiples. <b>Step</b> runs one pass; <b>Play</b> shows each number fall. Colors show which prime removed each number.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          let N = 100, events = [], pos = 0;
          const svg = s('svg', { role: 'img', 'aria-label': 'Numbers from 1 to N; crossed-out numbers are composite, green numbers are prime' });
          const info = h('div.nt-side');
          const sizeSeg = h('div.seg', { 'aria-label': 'Largest number N' });
          const playBtn = h('button.btn.sm', { onclick: () => toggle() }, '▶ Play');
          // one event per tick up to N = 100, two per tick for N = 200, so a full run takes about ten seconds either way
          const player = ctx.ticker({ ms: 80, button: playBtn, tick: () => { if (pos >= events.length) return false; pos = Math.min(events.length, pos + (N > 100 ? 2 : 1)); draw(); return pos < events.length; } });
          body.append(
            h('div.row', { style: { gap: '0.4rem' } }, h('span.small.muted', 'Numbers up to N ='), sizeSeg, h('span', { style: { flex: 1 } }),
              h('button.btn.sm', { onclick: () => { stop(); pos = prevBoundary(); draw(); } }, '◀ Back'),
              h('button.btn.sm.primary', { onclick: () => { stop(); pos = nextBoundary(); draw(); } }, 'Step ▶'),
              playBtn,
              h('button.btn.sm', { onclick: () => { stop(); pos = events.length; draw(); } }, 'Finish'),
              h('button.btn.sm', { onclick: () => { stop(); pos = 0; draw(); } }, 'Reset')),
            h('div.fill.nt-sieve', h('div.nt-svgbox', svg), info));

          function build() {
            events = [];
            const crossed = new Array(N + 1).fill(0);
            for (let p = 2; p * p <= N; p++) {
              if (crossed[p]) continue;
              events.push({ t: 'pick', p });
              for (let m = p * p; m <= N; m += p) { events.push({ t: 'cross', p, m, already: crossed[m] }); if (!crossed[m]) crossed[m] = p; }
            }
            events.push({ t: 'done' });
          }
          const bounds = () => [...events.map((e, i) => (i > 0 && (e.t === 'pick' || e.t === 'done') ? i : -1)).filter((i) => i > 0), events.length];
          const nextBoundary = () => bounds().find((b) => b > pos) ?? events.length;
          const prevBoundary = () => [0, ...bounds()].filter((b) => b < pos).pop() ?? 0;
          function stateAt(k) {
            const crossed = new Array(N + 1).fill(0), primes = new Set();
            let cur = null, last = null, passStart = -1;
            for (let i = 0; i < k; i++) {
              const ev = events[i];
              if (ev.t === 'pick') { primes.add(ev.p); cur = ev.p; last = null; passStart = i; }
              else if (ev.t === 'cross') { if (!crossed[ev.m]) crossed[ev.m] = ev.p; last = ev; }
              else { cur = null; last = null; for (let x = 2; x <= N; x++) if (!crossed[x]) primes.add(x); }
            }
            return { crossed, primes, cur, last, passStart };
          }
          function stop() { player.stop(); }
          function toggle() {
            if (player.playing) { stop(); return; }
            if (pos >= events.length) { pos = 0; draw(); }
            player.start();
          }

          function draw() {
            ctx.rc(sizeSeg, ...[30, 60, 100, 200].map((k) => h('button', { 'aria-pressed': String(k === N), onclick: () => { stop(); N = k; build(); pos = nextBoundary(); draw(); } }, String(k))));
            const cols = N <= 100 ? 10 : 20, rows = Math.ceil(N / cols), cs = 40;
            svg.setAttribute('viewBox', `0 0 ${cols * cs} ${rows * cs}`);
            const st = stateAt(pos);
            const cells = [];
            for (let v = 1; v <= N; v++) {
              const x = ((v - 1) % cols) * cs, y = Math.floor((v - 1) / cols) * cs;
              const by = st.crossed[v];
              let fill = 'var(--sheet)', fo = 1, stroke = 'var(--rule)', sw = 1, tf = 'var(--ink)', fw = 400, slash = null;
              if (v === 1) { fill = 'none'; tf = 'var(--ink-3)'; }
              else if (by) {
                fill = PCOL[by]; fo = 0.16; tf = 'var(--ink-3)';
                slash = s('line', { x1: x + 9, y1: y + cs - 9, x2: x + cs - 9, y2: y + 9, stroke: PCOL[by], 'stroke-width': 2.2, 'stroke-linecap': 'round' });
              } else if (st.primes.has(v)) { fill = 'var(--true-bg)'; stroke = 'var(--true)'; sw = 1.6; tf = 'var(--true)'; fw = 700; }
              if (st.cur === v) { stroke = PCOL[v] || 'var(--accent)'; sw = 3.4; }
              if (st.last && st.last.m === v) { stroke = 'var(--ink)'; sw = 2.6; }
              cells.push(s('g', null,
                s('rect', { x: x + 2.5, y: y + 2.5, width: cs - 5, height: cs - 5, rx: 6, fill, 'fill-opacity': fo, stroke, 'stroke-width': sw, 'stroke-dasharray': v === 1 ? '3 3' : null }),
                slash,
                s('text', { x: x + cs / 2, y: y + cs / 2 + 5.5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': fw, fill: tf, text: String(v) })));
            }
            ctx.rc(svg, ...cells);
            drawInfo(st);
          }

          function drawInfo(st) {
            const picks = events.filter((e) => e.t === 'pick');
            const finished = pos >= events.length;
            const crossedCount = st.crossed.filter(Boolean).length;
            let undecided = 0;
            for (let x = 2; x <= N; x++) if (!st.crossed[x] && !st.primes.has(x)) undecided++;
            const kids = [];
            const p = st.cur;
            if (finished) {
              kids.push(h('h3', `Finished: ${st.primes.size} primes up to ${N}`));
              kids.push(ctx.rich('p.small', String.raw`Only ${picks.length} passes were needed, one for each prime up to \(\sqrt{${N}} \approx ${Math.sqrt(N).toFixed(1)}\). Every number still standing is prime: a composite number would have a prime factor below \(\sqrt{${N}}\) and would have been crossed out.`));
              kids.push(ctx.rich('p.small', String.raw`The prime number theorem predicts about \(N / \ln N \approx ${(N / Math.log(N)).toFixed(1)}\) primes up to \(N\). Primes thin out slowly as numbers grow, but they never stop.`));
            } else if (p) {
              const passNo = picks.findIndex((e) => e.p === p) + 1;
              kids.push(h('h3', `Pass ${passNo} of ${picks.length}: p = ${p}`));
              kids.push(ctx.rich('p.small', p === 2
                ? String.raw`2 is the first number still standing, so it is prime. Every larger even number has 2 as a factor, so cross out \(4, 6, 8, \dots\) up to ${N}.`
                : String.raw`${p} is the smallest number still standing. A smaller prime factor would already have crossed it out, so ${p} is prime. Multiples below \(${p}^2 = ${p * p}\), such as ${2 * p} and ${3 * p}, have a smaller factor and fell earlier, so crossing starts at ${p * p}.`));
              const mine = events.slice(st.passStart + 1, pos).filter((e) => e.t === 'cross');
              const show = mine.slice(0, 28);
              kids.push(h('div', h('div.tiny.mono.muted', `CROSSED IN THIS PASS (${mine.filter((e) => !e.already).length} NEW, ${mine.filter((e) => e.already).length} ALREADY GONE)`),
                h('div.nt-chips', { style: { marginTop: '0.2rem' } }, show.map((e) => h('span', { class: e.already ? 'old' : '', style: e.already ? null : { borderColor: PCOL[p], color: 'var(--ink)' } }, String(e.m))), mine.length > show.length ? h('span', { style: { border: 0 } }, '…') : null)));
            } else {
              kids.push(h('h3', 'Ready to sieve'));
              kids.push(h('p.small', 'Every number from 2 to N starts out undecided. Each pass takes the smallest undecided number, marks it prime, and crosses out its multiples. Press Step.'));
            }
            kids.push(h('div.nt-stats', h('div', h('b', String(st.primes.size)), h('span', 'Primes found')), h('div', h('b', String(crossedCount)), h('span', 'Crossed out')), h('div', h('b', String(undecided)), h('span', 'Undecided'))));
            if (!finished) {
              const c = (() => { for (let x = (p || 1) + 1; x <= N; x++) if (!st.crossed[x] && !st.primes.has(x)) return x; return null; })();
              const passDone = events[pos]?.t !== 'cross';
              if (passDone && c) {
                kids.push(ctx.rich('div.feedback.info', c * c > N
                  ? String.raw`Next candidate: ${c}. Since \(${c}^2 = ${c * c} \gt ${N}\), every composite up to ${N} already lost a smaller prime factor. Press <b>Step</b>: all ${undecided} numbers still standing are prime.`
                  : String.raw`Next candidate: ${c}, the smallest number still standing. Press <b>Step</b> to run its pass.`));
              }
            }
            const used = picks.map((e) => e.p);
            kids.push(h('div.legend', { style: { marginTop: 'auto' } }, used.map((q) => h('span', h('span.swatch', { style: { background: PCOL[q] } }), `multiples of ${q}`)), h('span', h('span.swatch', { style: { background: 'var(--true-bg)', outline: '1.5px solid var(--true)' } }), 'prime')));
            ctx.rc(info, ...kids);
          }
          build();
          pos = nextBoundary();
          draw();
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'GCD, LCM, and Euclid\'s algorithm',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">The <span class="term">greatest common divisor</span> \(\gcd(a, b)\) is the largest integer dividing both \(a\) and \(b\) (not both 0). The <span class="term">least common multiple</span> \(\operatorname{lcm}(a, b)\) is the smallest positive integer that both divide. If \(\gcd(a, b) = 1\), then \(a\) and \(b\) are <span class="term">relatively prime</span>.</div>
              <div class="ex">From the factorizations \(360 = 2^3 \cdot 3^2 \cdot 5\) and \(84 = 2^2 \cdot 3 \cdot 7\): the gcd takes the <i>smaller</i> power of each prime, and the lcm takes the <i>larger</i>.
                \[\gcd = 2^2 \cdot 3 = 12, \qquad \operatorname{lcm} = 2^3 \cdot 3^2 \cdot 5 \cdot 7 = 2520\]</div>
              <div class="thm">For positive \(a, b\): \(\gcd(a,b) \cdot \operatorname{lcm}(a,b) = a \cdot b\). Check: \(12 \cdot 2520 = 30240 = 360 \cdot 84\).</div>
              <div class="thm" data-label="Bézout's identity">There are integers \(s, t\) with \(\gcd(a, b) = s\,a + t\,b\). Running Euclid's steps backwards finds them; that is the <span class="term">extended Euclidean algorithm</span>.</div>
            </div>
            <div class="stack">
              <div class="thm" data-label="Euclid's algorithm">\(\gcd(a, b) = \gcd(b,\ a \bmod b)\), and \(\gcd(a, 0) = a\).</div>
              <p class="small">Why it works: write \(a = qb + r\). Any \(d\) that divides \(a\) and \(b\) also divides \(r = a - qb\). Any \(d\) that divides \(b\) and \(r\) also divides \(a = qb + r\). Both pairs have exactly the same common divisors, so they have the same greatest one.</p>
              <div class="ex">\(\gcd(252, 198)\), dividing until the remainder is 0:
                \[\begin{aligned} 252 &= 1 \cdot 198 + 54 \\ 198 &= 3 \cdot 54 + 36 \\ 54 &= 1 \cdot 36 + \mathbf{18} \\ 36 &= 2 \cdot 18 + 0 \end{aligned}\]
                The last nonzero remainder is 18. Backwards: \(18 = 54 - 36 = 4 \cdot 54 - 198 = 4 \cdot 252 - 5 \cdot 198\).</div>
              <div class="why">Euclid's algorithm is fast. Every two steps at least halve the remainder, so the number of steps grows with the number of <i>digits</i>. Lamé's theorem caps it at five steps per decimal digit of the smaller number: at most 1,500 steps for two 300-digit numbers. Testing every possible divisor would take longer than the age of the universe.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Lab: Euclid\'s algorithm, step by step',
        kind: 'lab',
        html: String.raw`<p class="muted small">Each division step cuts the largest possible squares from an \(a \times b\) rectangle, and the leftover strip is the next, smaller problem. The final square size tiles the whole rectangle exactly: that is the gcd. Switch to the <b>Bézout table</b> to see every remainder written as \(s\,a + t\,b\).</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          let A = 1071, B = 462, cur = 0, view = 'steps', data = null;
          const aIn = h('input.inp.mono', { value: String(A), inputmode: 'numeric', 'aria-label': 'a', style: { width: '5.5rem' } });
          const bIn = h('input.inp.mono', { value: String(B), inputmode: 'numeric', 'aria-label': 'b', style: { width: '5.5rem' } });
          const msg = h('div.feedback');
          const viewSeg = h('div.seg', { 'aria-label': 'Left panel' });
          const left = h('div.nt-side', { style: { overflow: 'auto' } });
          const svg = s('svg', { role: 'img', 'aria-label': 'Rectangle tiled by squares, one color per division step', style: 'width:100%;height:auto;max-height:19rem;display:block' });
          const legend = h('div.legend');
          const note = h('div.small');
          const presets = [[1071, 462], [252, 198], [89, 55], [120, 84], [17, 5], [462, 1071]];
          const onIn = () => { A = parseIntSafe(aIn.value); B = parseIntSafe(bIn.value); compute(true); draw(); };
          aIn.addEventListener('input', onIn);
          bIn.addEventListener('input', onIn);
          body.append(
            h('div.row', { style: { gap: '0.45rem' } },
              h('label.row', { style: { gap: '0.3rem' } }, h('b.mono', 'a ='), aIn), h('label.row', { style: { gap: '0.3rem' } }, h('b.mono', 'b ='), bIn),
              h('span.tiny.muted', 'Try:'), ...presets.map(([x, y]) => h('button.btn.sm', { onclick: () => { aIn.value = x; bIn.value = y; onIn(); } }, `${x}, ${y}`)),
              h('span', { style: { flex: 1 } }),
              h('button.btn.sm', { onclick: () => { cur = Math.max(0, cur - 1); draw(); } }, '◀ Back'),
              h('button.btn.sm.primary', { onclick: () => { if (data && data.rows.length) cur = Math.min(data.rows.length - 1, cur + 1); draw(); } }, 'Step ▶'),
              h('button.btn.sm', { onclick: () => { cur = 0; draw(); } }, 'Reset')),
            msg,
            h('div.fill.nt-euclid', h('div.nt-side', viewSeg, left), h('div.nt-side', h('div.tiny.mono.muted', 'THE a × b RECTANGLE, CUT INTO SQUARES'), svg, legend, note)));

          function compute(reset) {
            data = null;
            if (!Number.isInteger(A) || !Number.isInteger(B) || A < 0 || B < 0) { msg.className = 'feedback bad'; msg.textContent = 'Type two whole numbers, 0 or larger.'; return; }
            if (A > 99999 || B > 99999) { msg.className = 'feedback bad'; msg.textContent = 'Keep both numbers at most 99999 so the picture stays readable.'; return; }
            if (A === 0 && B === 0) { msg.className = 'feedback bad'; msg.textContent = 'gcd(0, 0) is undefined: every integer divides 0, so there is no greatest common divisor.'; return; }
            if (A === 0 || B === 0) { msg.className = 'feedback info'; msg.textContent = `gcd(${A}, ${B}) = ${A || B}, because every number divides 0. Pick two positive numbers to see the algorithm work.`; return; }
            msg.className = 'feedback'; msg.textContent = '';
            const { rows, g } = euclidRows(A, B);
            // Bézout table: each row keeps r = s*A + t*B
            const tab = [{ r: A, s: 1, t: 0 }, { r: B, s: 0, t: 1 }];
            for (const row of rows) { const x = tab[tab.length - 2], y = tab[tab.length - 1]; y.q = row.q; tab.push({ r: x.r - row.q * y.r, s: x.s - row.q * y.s, t: x.t - row.q * y.t }); }
            // squares: row i cuts q_i squares of side b_i from the current rectangle
            const sq = [];
            let x = 0, y = 0, w = A, hh = B;
            rows.forEach((row, i) => {
              if (row.q === 0) return;
              const side = row.b, horiz = w >= hh;
              if (row.q > 40) sq.push({ x, y, w: horiz ? row.q * side : side, h: horiz ? side : row.q * side, i, label: `${row.q} squares` });
              else for (let k = 0; k < row.q; k++) sq.push({ x: horiz ? x + k * side : x, y: horiz ? y : y + k * side, w: side, h: side, i });
              if (horiz) { x += row.q * side; w -= row.q * side; } else { y += row.q * side; hh -= row.q * side; }
            });
            data = { rows, g, tab, sq };
            if (reset) cur = rows.length - 1;
          }

          function draw() {
            ctx.rc(viewSeg, ...[['steps', 'Division steps'], ['bez', 'Bézout table']].map(([k, t]) => h('button', { 'aria-pressed': String(k === view), onclick: () => { view = k; draw(); } }, t)));
            if (!data) { ctx.rc(left); ctx.rc(svg); ctx.rc(legend); ctx.rc(note); return; }
            const { rows, g, tab, sq } = data;
            cur = Math.min(cur, rows.length - 1);
            if (view === 'steps') {
              ctx.rc(left,
                h('ol.nt-rows', rows.map((r, i) => h('li', { class: i === cur ? 'on' : i > cur ? 'future' : '', style: { borderLeftColor: STEPCOL[i % STEPCOL.length] }, onclick: () => { cur = i; draw(); } },
                  h('span.k', String(i + 1)), h('span', `${r.a} = ${r.q} · ${r.b} + ${r.r}`)))),
                cur === rows.length - 1
                  ? ctx.rich('div.feedback.good', String.raw`The remainder reached 0, so \(\gcd(${A}, ${B}) = ${g}\), the last nonzero remainder. ${rows.length} division step${rows.length === 1 ? '' : 's'}; Lamé's bound for a ${String(Math.min(A, B)).length}-digit number allows at most ${5 * String(Math.min(A, B)).length}.`)
                  : ctx.rich('p.small.muted', String.raw`So far: \(\gcd(${A}, ${B}) = \gcd(${rows[cur].b}, ${rows[cur].r})\). Press Step to divide again.`));
            } else {
              const last = tab.length - 2; // row holding the gcd
              ctx.rc(left,
                h('table.tt.nt-bez', h('thead', h('tr', h('th', 'r'), h('th', 'q'), h('th', 's'), h('th', 't'), h('th.l', 'r = s·a + t·b'))),
                  h('tbody', tab.slice(0, -1).map((r, i) => h('tr', { class: i === last ? 'g' : '' }, h('td', String(r.r)), h('td', r.q == null ? '' : String(r.q)), h('td', neg(r.s)), h('td', neg(r.t)),
                    h('td.l.mono', `${r.r} = ${neg(r.s)}·${A} ${r.t < 0 ? '−' : '+'} ${Math.abs(r.t)}·${B}`))))),
                ctx.rich('p.small', String.raw`The first two rows are free: \(a = 1 \cdot a + 0 \cdot b\) and \(b = 0 \cdot a + 1 \cdot b\). Each new row is the row two above minus \(q\) times the row above, the same recipe that produces the remainders. The highlighted row gives Bézout's identity \(${g} = ${par(tab[last].s)} \cdot ${A} + ${par(tab[last].t)} \cdot ${B}\).` +
                  (g === 1 ? String.raw` Since the gcd is 1, \(${mod(tab[last].s, B)}\) is the inverse of ${A} modulo ${B}.` : '')));
            }
            // tiling
            const sc = Math.min(470 / A, 280 / B);
            const W = A * sc, H = B * sc, pad = 10;
            svg.setAttribute('viewBox', `0 0 ${W + 2 * pad} ${Math.max(H + 2 * pad, 24)}`);
            const kids = [s('rect', { x: pad, y: pad, width: W, height: H, fill: 'var(--sheet)', stroke: 'var(--ink-3)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' })];
            for (const q of sq) {
              if (q.i > cur) continue;
              const col = STEPCOL[q.i % STEPCOL.length];
              kids.push(s('rect', { x: pad + q.x * sc, y: pad + q.y * sc, width: q.w * sc, height: q.h * sc, fill: col, 'fill-opacity': q.i === cur ? 0.42 : 0.2, stroke: col, 'stroke-width': 1.4 }));
              const side = Math.min(q.w, q.h) * sc;
              if (q.label || side >= 26) {
                const fs = Math.max(9, Math.min(20, side * 0.3));
                kids.push(s('text', { x: pad + (q.x + q.w / 2) * sc, y: pad + (q.y + q.h / 2) * sc + fs * 0.35, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 600, fill: 'var(--ink)', text: q.label || String(q.w) }));
              }
            }
            ctx.rc(svg, ...kids);
            ctx.rc(legend, rows.map((row, i) => (row.q === 0 || i > cur ? null : h('span', h('span.swatch', { style: { background: STEPCOL[i % STEPCOL.length], opacity: 0.6 } }), `${row.q} × (${row.b} × ${row.b})`))),
              cur === rows.length - 1 ? h('b', { style: { color: 'var(--ink)' } }, `smallest square: ${g} × ${g} = gcd`) : null);
            const r = rows[cur];
            note.innerHTML = r.q === 0
              ? String.raw`Step ${cur + 1}: \(${r.a} \lt ${r.b}\), so the quotient is 0 and the pair just swaps: \(\gcd(${r.a}, ${r.b}) = \gcd(${r.b}, ${r.a})\).`
              : r.r !== 0
                ? String.raw`Step ${cur + 1}: cut ${r.q} square${r.q > 1 ? 's' : ''} of side ${r.b} from the \(${r.a} \times ${r.b}\) rectangle. A \(${r.r} \times ${r.b}\) strip is left, so \(\gcd(${r.a}, ${r.b}) = \gcd(${r.b}, ${r.r})\).`
                : String.raw`Step ${cur + 1}: ${r.q} square${r.q > 1 ? 's' : ''} of side ${r.b} fill the \(${r.a} \times ${r.b}\) rectangle exactly. Every earlier square is tiled by \(${r.b} \times ${r.b}\) squares too, so \(${r.b}\) divides both numbers: \(\gcd = ${g}\).`;
            ctx.tex(note);
          }
          compute(true);
          draw();
        },
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Code: Euclid\'s algorithm and Bézout coefficients',
        kind: 'code',
        file: 'euclid.py',
        html: String.raw`<p class="muted small">A loop finds the gcd, and a recursive version also returns the Bézout coefficients. <b>Trace</b> shows the recursive calls stacking up.</p>`,
        fivew: {
          what: 'Computes gcd(1071, 462) with Euclid\'s loop, then finds integers s and t with gcd = s·1071 + t·462, and finally the lcm.',
          why: 'Euclid\'s algorithm is the fastest practical way to get a gcd, and the extended version is how modular inverses are computed, which RSA needs for its private key.',
          who: 'Library authors writing math.gcd, cryptography engineers generating keys, and anyone simplifying fractions or scheduling repeating events (the lcm tells you when two cycles line up again).',
          where: 'Python\'s math.gcd and pow(a, -1, n), fraction arithmetic, RSA key generation, and solving congruences such as 17x ≡ 1 (mod 3120).',
          when: 'Any time you need a gcd, an lcm or an inverse modulo n. It runs in a number of steps proportional to the number of digits, so it handles huge numbers easily.',
        },
        lines: [
          ['def gcd(a, b):', String.raw`Defines a function that implements Euclid's algorithm with a loop. Nothing runs yet; Python stores the recipe until line 12 calls it.`],
          ['    while b != 0:', String.raw`The loop keeps going while there is a nonzero number to divide by. When <code>b</code> reaches 0, <code>a</code> holds the answer, because \(\gcd(a, 0) = a\).`],
          ['        a, b = b, a % b', String.raw`The heart of the algorithm: replace the pair \((a, b)\) by \((b,\ a \bmod b)\), which has the same gcd. Python evaluates the whole right side first, so both new values come from the old pair. For our numbers: \((1071, 462) \to (462, 147) \to (147, 21) \to (21, 0)\).`],
          ['    return a', String.raw`The loop has ended, so <code>b</code> is 0 and <code>a</code> is the gcd. For 1071 and 462 this returns 21 after three trips around the loop.`],
          ['', ''],
          ['def extended_gcd(a, b):', String.raw`A second function that returns three numbers \((g, s, t)\) with \(g = \gcd(a, b) = s \cdot a + t \cdot b\). It is <b>recursive</b>: it calls itself on the smaller pair \((b,\ a \bmod b)\), following the same recurrence as the loop.`],
          ['    if b == 0:', String.raw`The base case, where the recursion stops. Without it the function would call itself forever.`],
          ['        return a, 1, 0', String.raw`When \(b = 0\) the gcd is \(a\), and \(a = 1 \cdot a + 0 \cdot 0\), so \(s = 1\) and \(t = 0\). Python packs the three values into a tuple.`],
          ['    g, s, t = extended_gcd(b, a % b)', String.raw`Solves the smaller problem first and unpacks its answer. Afterwards \(g = s \cdot b + t \cdot (a \bmod b)\). The calls go \((1071, 462) \to (462, 147) \to (147, 21) \to (21, 0)\); Trace shows each one nested deeper.`],
          ['    return g, t, s - (a // b) * t', String.raw`Turns the smaller answer into one for \((a, b)\). Since \(a \bmod b = a - (a /\!/ b) \cdot b\), substituting gives \(g = t \cdot a + (s - (a /\!/ b)\, t) \cdot b\). So the new coefficients are <code>t</code> and <code>s - (a // b) * t</code>. This is the hand back-substitution, done automatically.`],
          ['', ''],
          ['print(gcd(1071, 462))', String.raw`Calls the loop version. Output: <code>21</code>. You can confirm with factorizations: \(1071 = 3^2 \cdot 7 \cdot 17\) and \(462 = 2 \cdot 3 \cdot 7 \cdot 11\) share \(3 \cdot 7 = 21\).`],
          ['g, s, t = extended_gcd(1071, 462)', String.raw`Calls the extended version and unpacks the returned tuple into three names: <code>g = 21</code>, <code>s = -3</code>, <code>t = 7</code>.`],
          ['print(g, s, t)', String.raw`Output: <code>21 -3 7</code>, meaning \(21 = (-3) \cdot 1071 + 7 \cdot 462\). The coefficients are not unique: \(s = 19,\ t = -44\) works too, because adding \(462/21 = 22\) to \(s\) and subtracting \(1071/21 = 51\) from \(t\) keeps the sum the same.`],
          ['print(s * 1071 + t * 462 == g)', String.raw`Checks the identity: \(-3213 + 3234 = 21\), so this prints <code>True</code>. Checking an answer by plugging it back in is a habit worth building into tests.`],
          ['print(1071 * 462 // g)', String.raw`The lcm, from \(\gcd \cdot \operatorname{lcm} = a \cdot b\): \(494802 /\!/ 21 = 23562\). Integer division <code>//</code> keeps the result an exact integer instead of a float.`],
        ],
        expected: '21\n21 -3 7\nTrue\n23562\n',
        tryIt: 'Replace 1071 and 462 with 17 and 3120 (the RSA numbers on a later slide). Since the gcd is 1, <code>s % 3120</code> is the inverse of 17 modulo 3120. Predict it, then check with <code>pow(17, -1, 3120)</code>.',
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Modular arithmetic and inverses',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">\(a\) is <span class="term">congruent</span> to \(b\) modulo \(n\), written \(a \equiv b \pmod{n}\), when \(n \mid (a - b)\). Equivalently, \(a\) and \(b\) leave the same remainder: \(a \bmod n = b \bmod n\). The number \(n\) is the <span class="term">modulus</span>.</div>
              <div class="ex">\(38 \equiv 14 \equiv 2 \pmod{12}\), because 12 divides \(38 - 14 = 24\) and \(38 - 2 = 36\). A clock works this way: 38 hours after midnight it shows 2. Likewise, 100 days after a Wednesday is a Friday, since \(100 \bmod 7 = 2\).</div>
              <div class="thm">If \(a \equiv c\) and \(b \equiv d \pmod n\), then \(a + b \equiv c + d\), \(a - b \equiv c - d\) and \(ab \equiv cd \pmod n\). So you may reduce at every step: \((123 \cdot 456) \bmod 10 = (3 \cdot 6) \bmod 10 = 8\).</div>
              <div class="warn">Division does not carry over. \(2 \cdot 3 \equiv 2 \cdot 8 \pmod{10}\), yet \(3 \not\equiv 8 \pmod{10}\). You may cancel a factor only when it has an inverse.</div>
            </div>
            <div class="stack">
              <div class="def">An <span class="term" data-term="modular inverse">inverse</span> of \(a\) modulo \(n\) is a number \(x\) with \(a x \equiv 1 \pmod n\). We write it \(a^{-1}\).</div>
              <div class="thm">\(a\) has an inverse modulo \(n\) exactly when \(\gcd(a, n) = 1\). Bézout supplies it: if \(s a + t n = 1\), then \(s a \equiv 1 \pmod n\), so \(a^{-1} \equiv s\).</div>
              <div class="ex">\(3^{-1} \equiv 5 \pmod 7\), since \(3 \cdot 5 = 15 = 2 \cdot 7 + 1\). To solve \(3x \equiv 4 \pmod 7\), multiply both sides by 5: \(x \equiv 20 \equiv 6\). On the other hand, 4 has no inverse mod 6: \(\gcd(4, 6) = 2\), and \(4x \bmod 6\) is always 0, 2 or 4. In Python, <code>pow(3, -1, 7)</code> returns 5.</div>
              <div class="ai">Time features are modular: hour 23 and hour 0 are one hour apart. Models encode hour \(h\) as the point \(\big(\cos \tfrac{2\pi h}{24}, \sin \tfrac{2\pi h}{24}\big)\) on a circle, so the step from 23 to 0 looks like any other one-hour step.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: the modular clock',
        kind: 'lab',
        html: String.raw`<p class="muted small">Pick a modulus \(n\), two numbers and an operation. The hand walks around the clock one step at a time, so \(a + b\), \(a - b\) and \(a \times b\) (as \(b\) hops of size \(a\)) all wrap around at \(n\). The table is \(a \cdot x \bmod n\) for every pair; green cells hold a 1, so their row has an inverse. Click any cell to try it.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          let n = 12, a = 9, b = 7, op = '+';
          let shown = 0, queue = [], raf = null, hop = null, hopMs = 160;
          const C = 140, RIM = 116;
          const sliders = {};
          const mkSlider = (key, min, max, label) => {
            const out = h('output');
            const inp = h('input', { type: 'range', min, max, step: 1, value: { n, a, b }[key], 'aria-label': label });
            inp.addEventListener('input', () => { if (key === 'n') n = +inp.value; else if (key === 'a') a = +inp.value; else b = +inp.value; update(true); });
            sliders[key] = { inp, out };
            return [h('span', label), inp, out];
          };
          const opSeg = h('div.seg', { 'aria-label': 'Operation' });
          const svg = s('svg', { viewBox: '0 0 280 280', role: 'img', 'aria-label': 'Clock face with n positions and a moving hand' });
          const face = s('g'), trail = s('g');
          const hand = s('g');
          hand.append(s('line', { x1: 0, y1: 0, x2: 0, y2: -(RIM - 40), stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round' }), s('circle', { r: 6, fill: 'var(--accent)' }));
          svg.append(face, trail, s('g', { transform: `translate(${C} ${C})` }, hand));
          const eq = h('div.small');
          const tableBox = h('div', { style: { overflow: 'hidden' } });
          const rowNote = h('div.small');
          body.append(h('div.fill.nt-clock',
            h('div.nt-side',
              h('div.nt-ctl', ...mkSlider('n', 2, 16, 'modulus n'), ...mkSlider('a', 0, 40, 'a'), ...mkSlider('b', 0, 40, 'b')),
              h('div.row', h('span.small.muted', 'Operation'), opSeg),
              h('div.nt-svgbox', { style: { flex: '1 1 auto', minHeight: '9rem' } }, svg),
              eq),
            h('div.nt-side', h('div.tiny.mono.muted', 'MULTIPLICATION TABLE MOD n: ROW a, COLUMN x, CELL a·x mod n'), tableBox, rowNote)));

          const ang = (k) => (k * 360) / n;
          const pt = (k, rad) => { const t = ((ang(k) - 90) * Math.PI) / 180; return [C + rad * Math.cos(t), C + rad * Math.sin(t)]; };
          function frame(t) {
            if (!hop) {
              if (!queue.length) { raf = null; return; }
              const to = queue.shift();
              hop = { from: shown, to: to.deg, start: t, k: to.k };
            }
            const f = Math.min(1, (t - hop.start) / hopMs);
            shown = hop.from + (hop.to - hop.from) * (1 - (1 - f) * (1 - f));
            hand.setAttribute('transform', `rotate(${shown})`);
            if (f >= 1) { litTrail(hop.k); hop = null; }
            raf = requestAnimationFrame(frame);
          }
          function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = null; hop = null; }
          ctx.onHide(() => { stopAnim(); if (queue.length) { const last = queue[queue.length - 1]; shown = last.deg; queue = []; hand.setAttribute('transform', `rotate(${shown})`); litTrail(Infinity); } });
          let trailDots = [];
          function litTrail(k) { trailDots.forEach((d) => { if (d.k <= k) d.el.setAttribute('opacity', d.final ? 1 : 0.55); }); }

          function update(animate) {
            for (const [k, v] of Object.entries({ n, a, b })) sliders[k].out.textContent = String(v);
            ctx.rc(opSeg, ...[['+', 'a + b'], ['−', 'a − b'], ['×', 'a × b']].map(([k, t]) => h('button', { 'aria-pressed': String(k === op), onclick: () => { op = k; update(true); } }, t)));
            const raw = op === '+' ? a + b : op === '−' ? a - b : a * b;
            const res = mod(raw, n);
            // positions visited: + and − walk one step at a time; × hops a steps, b times, starting from 0
            const startK = op === '×' ? 0 : a;
            const stepK = op === '+' ? 1 : op === '−' ? -1 : a;
            const hops = Math.min(b, 48);
            // face
            const fk = [s('circle', { cx: C, cy: C, r: RIM, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 2 })];
            for (let k = 0; k < n; k++) {
              const [x1, y1] = pt(k, RIM - 6), [x2, y2] = pt(k, RIM + 0), [tx, ty] = pt(k, RIM - 22);
              fk.push(s('line', { x1, y1, x2, y2, stroke: 'var(--ink-3)', 'stroke-width': 1.5 }));
              fk.push(s('text', { x: tx, y: ty + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': k === res ? 700 : 400, fill: k === res ? 'var(--accent)' : 'var(--ink)', text: String(k) }));
            }
            ctx.rc(face, ...fk);
            trailDots = [];
            const tk = [];
            const sp = mod(startK, n);
            const [sx, sy] = pt(sp, RIM);
            tk.push(s('circle', { cx: sx, cy: sy, r: 8, fill: 'none', stroke: 'var(--fnc)', 'stroke-width': 2.5 }));
            for (let i = 1; i <= hops; i++) {
              const kpos = mod(startK + i * stepK, n);
              const [x, y] = pt(kpos, RIM);
              const fin = i === hops;
              const el = s('circle', { cx: x, cy: y, r: fin ? 7 : 4, fill: fin ? 'var(--accent)' : 'var(--fnc)', opacity: animate && !ctx.print ? 0 : fin ? 1 : 0.55 });
              trailDots.push({ k: i, el, final: fin });
              tk.push(el);
            }
            ctx.rc(trail, ...tk);
            // hand animation along the visited positions
            stopAnim();
            queue = [];
            let delta = mod(ang(sp) - shown, 360);
            if (delta > 180) delta -= 360;
            const startDeg = shown + delta;
            if (!animate || ctx.print) { shown = startDeg + hops * stepK * (360 / n); hand.setAttribute('transform', `rotate(${shown})`); }
            else {
              hopMs = hops > 16 ? 70 : 150;
              queue.push({ deg: startDeg, k: 0 });
              for (let i = 1; i <= hops; i++) queue.push({ deg: startDeg + i * stepK * (360 / n), k: i });
              raf = requestAnimationFrame(frame);
            }
            const q = Math.floor(raw / n);
            const sym = op === '×' ? '\\times' : op === '+' ? '+' : '-';
            eq.innerHTML = String.raw`\(${a} ${sym} ${b} = ${raw} = ${par(q)} \cdot ${n} + ${res}\), so \(${a} ${sym} ${b} \equiv ${res} \pmod{${n}}\).` +
              String.raw` <span class="muted">Reducing first gives the same answer: \(${mod(a, n)} ${sym} ${mod(b, n)} = ${op === '×' ? mod(a, n) * mod(b, n) : op === '+' ? mod(a, n) + mod(b, n) : mod(a, n) - mod(b, n)} \equiv ${res}\).</span>` +
              (op === '×' ? String.raw` <span class="muted">The hand starts at 0 and makes ${b} hops of ${a}.</span>` : '') +
              (b > 48 ? ' <span class="muted">(Only the first 48 steps are drawn.)</span>' : '');
            ctx.tex(eq);
            drawTable();
          }

          function drawTable() {
            const ra = mod(a, n), cb = mod(b, n);
            const thead = h('thead', h('tr', h('th', '·'), ...Array.from({ length: n }, (_, x) => h('th', String(x))), h('th', 'a⁻¹')));
            const tbody = h('tbody', Array.from({ length: n }, (_, r) => {
              const inv = inverse(r, n);
              return h('tr', { class: r === ra ? 'sel' : '' }, h('th', String(r)),
                ...Array.from({ length: n }, (_, x) => {
                  const v = (r * x) % n;
                  return h('td', { class: [v === 1 ? 'one' : '', op === '×' && x === cb && r === ra ? 'colsel' : ''].join(' '), title: `${r} · ${x} = ${r * x} ≡ ${v} (mod ${n})`, onclick: () => { a = r; b = x; op = '×'; sliders.a.inp.value = a; sliders.b.inp.value = b; update(true); } }, String(v));
                }),
                h('td', { class: inv == null ? 'noinv' : 'inv' }, inv == null ? '—' : String(inv)));
            }));
            ctx.rc(tableBox, h('table.tt.nt-mt', thead, tbody));
            const g = gcd(ra, n);
            const units = Array.from({ length: n }, (_, r) => r).filter((r) => gcd(r, n) === 1);
            const rowVals = [...new Set(Array.from({ length: n }, (_, x) => (ra * x) % n))].sort((x, y) => x - y);
            rowNote.innerHTML = (g === 1
              ? String.raw`Row ${ra}: \(\gcd(${ra}, ${n}) = 1\), so the row is a reshuffle of every number 0 to ${n - 1} and contains a 1. That gives \(${ra}^{-1} \equiv ${inverse(ra, n)} \pmod{${n}}\).`
              : String.raw`Row ${ra}: \(\gcd(${ra}, ${n}) = ${g}\). Every entry is a multiple of ${g} (only ${rowVals.join(', ')} appear), so 1 never shows up and ${ra} has no inverse mod ${n}.`) +
              String.raw` <span class="muted">Rows with an inverse: ${units.join(', ')}, which is ${units.length} of ${n}.${PRIMES.includes(n) ? ` Because ${n} is prime, every nonzero row has one.` : ''}</span>`;
            ctx.tex(rowNote);
          }
          update(false);
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Number bases and fast powers',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">In <span class="term">base</span> \(b \ge 2\) the digits \(d_k \dots d_1 d_0\), each with \(0 \le d_i \lt b\), stand for \(n = d_k b^k + \cdots + d_1 b + d_0\). So \((1011)_2 = 8 + 2 + 1 = 11\) and \((2F)_{16} = 2 \cdot 16 + 15 = 47\), with A to F standing for 10 to 15.</div>
              <p class="small"><b>Decimal to base \(b\):</b> divide by \(b\) again and again, which is the division algorithm on repeat. The remainders are the digits, last one first. Try it:</p>
              <div class="card nt-conv stack" style="gap:0.4rem;padding:0.55rem 0.75rem"></div>
              <p class="small"><b>Binary to hex or octal:</b> group the bits in fours (hex) or threes (octal) from the right. \((1001\,1100)_2 = (9C)_{16}\), because \(16 = 2^4\).</p>
            </div>
            <div class="stack">
              <div class="thm" data-label="Fast modular exponentiation">To find \(a^e \bmod n\), square repeatedly to get \(a, a^2, a^4, a^8, \dots\), reducing mod \(n\) each time. Then multiply together the powers that match the 1-bits of \(e\) in binary. That takes about \(2 \log_2 e\) multiplications instead of \(e - 1\).</div>
              <div class="ex">\(3^{13} \bmod 7\), with \(13 = (1101)_2 = 8 + 4 + 1\):
                <table class="tt" style="margin:0.4rem 0;width:100%">
                  <thead><tr><th class="l">power</th><th>\(3^1\)</th><th>\(3^2\)</th><th>\(3^4\)</th><th>\(3^8\)</th></tr></thead>
                  <tbody>
                    <tr><td class="l">mod 7</td><td>3</td><td>\(9 \equiv 2\)</td><td>\(2^2 = 4\)</td><td>\(4^2 = 16 \equiv 2\)</td></tr>
                    <tr><td class="l">bit of 13</td><td>1</td><td>0</td><td>1</td><td>1</td></tr>
                  </tbody>
                </table>
                \(3^{13} = 3^8 \cdot 3^4 \cdot 3^1 \equiv 2 \cdot 4 \cdot 3 = 24 \equiv 3 \pmod 7\).</div>
              <div class="tip">Python's <code>pow(a, e, n)</code> uses this method. Writing <code>a ** e % n</code> builds the full power first. For 2048-bit RSA numbers that power would have more digits than there are atoms in the universe.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const { h } = ctx;
          const card = body.querySelector('.nt-conv');
          let base = 2;
          const nIn = h('input.inp.mono', { value: '156', inputmode: 'numeric', 'aria-label': 'Decimal number to convert (0 to 999)', style: { width: '4.6rem' } });
          const seg = h('div.seg', { 'aria-label': 'Target base' });
          const out = h('div.stack', { style: { gap: '0.3rem' } });
          nIn.addEventListener('input', draw);
          card.append(h('div.row', { style: { gap: '0.45rem' } }, h('span.small', 'Convert'), nIn, h('span.small', 'to base'), seg), out);
          function draw() {
            ctx.rc(seg, ...[2, 3, 8, 16].map((k) => h('button', { 'aria-pressed': String(k === base), onclick: () => { base = k; draw(); } }, String(k))));
            const n = parseIntSafe(nIn.value);
            if (!Number.isInteger(n) || n < 0 || n > 999) { ctx.rc(out, h('div.feedback.bad', 'Type a whole number from 0 to 999.')); return; }
            const cols = [];
            let x = n;
            do { cols.push([x, x % base]); x = Math.floor(x / base); } while (x > 0);
            const digits = toBase(n, base);
            const terms = digits.split('').map((c, i) => [DIG.indexOf(c), digits.length - 1 - i]).filter(([d]) => d > 0);
            ctx.rc(out,
              h('table.nt-ladder', h('tbody',
                h('tr', h('th', `n ÷ ${base}`), ...cols.map(([v]) => h('td', String(v)))),
                h('tr', h('th', 'remainder'), ...cols.map(([, r]) => h('td.dig', DIG[r]))))),
              ctx.rich('div.small', String.raw`Reading the remainders right to left: \(${n} = (${digits})_{${base}}\). Check: \(${terms.length ? terms.map(([d, p]) => (p === 0 ? `${d}` : `${d} \\cdot ${base}^{${p}}`)).join(' + ') : '0'} = ${n}\).`));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: toy RSA, every step explained',
        kind: 'lab',
        html: String.raw`<p class="muted small"><span class="term">RSA</span> is a <span class="term">public-key cryptography</span> system: anyone can encrypt with the public key \((n, e)\), and only the holder of the private key \(d\) can decrypt. Change the primes, the exponent or the message. Click a row of the table to see that letter encrypted by repeated squaring.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const PR = PRIMES.filter((x) => x >= 3);
          let p = 61, q = 53, e = 17, text = 'HELLO', sel = 0;
          const mkSel = (val, set, label) => {
            const el = h('select.inp.mono', { 'aria-label': label });
            PR.forEach((x) => el.append(h('option', { value: String(x), selected: x === val ? true : null }, String(x))));
            el.addEventListener('change', () => { set(+el.value); draw(); });
            return el;
          };
          const pSel = mkSel(p, (v) => { p = v; }, 'prime p'), qSel = mkSel(q, (v) => { q = v; }, 'prime q');
          const eIn = h('input.inp.mono', { value: String(e), inputmode: 'numeric', 'aria-label': 'public exponent e', style: { width: '4.5rem' } });
          const mIn = h('input.inp.mono', { value: text, 'aria-label': 'message: up to 6 letters, or a number', style: { width: '8rem' } });
          eIn.addEventListener('input', () => { e = parseIntSafe(eIn.value); draw(); });
          mIn.addEventListener('input', () => { text = mIn.value; sel = 0; draw(); });
          const step1 = h('div'), step2 = h('div'), step3 = h('div'), keys = h('div');
          const msgBox = h('div.stack', { style: { gap: '0.35rem' } });
          const detail = h('div');
          body.append(h('div.fill.nt-rsa',
            h('div.nt-side',
              h('div.card', h('h4', '1 · Choose two different primes'), h('div.row', { style: { gap: '0.4rem' } }, h('span.mono', 'p ='), pSel, h('span.mono', 'q ='), qSel), step1),
              h('div.card', h('h4', '2 · Choose the public exponent e'), h('div.row', { style: { gap: '0.4rem' } }, h('span.mono', 'e ='), eIn), step2),
              h('div.card', h('h4', '3 · Compute the private key d'), step3),
              keys),
            h('div.nt-side',
              h('div.card', h('h4', '4 · Encrypt with c = mᵉ mod n, decrypt with m = cᵈ mod n'), h('div.row', { style: { gap: '0.4rem' } }, h('span.small', 'Message'), mIn, h('span.tiny.muted', 'A = 1, B = 2, …, Z = 26')), msgBox),
              detail)));

          function draw() {
            const n = p * q, phi = (p - 1) * (q - 1);
            if (p === q) {
              step1.innerHTML = '<div class="feedback bad">p and q must be different primes. With p = q the modulus is p², the formula φ(n) = (p − 1)(q − 1) is wrong, and n is trivial to factor.</div>';
              ctx.rc(step2); ctx.rc(step3); ctx.rc(keys); ctx.rc(msgBox); ctx.rc(detail);
              return;
            }
            step1.innerHTML = String.raw`<p class="small">\(n = p\,q = ${p} \cdot ${q} = ${n}\) is public. \(\varphi(n) = (p-1)(q-1) = ${p - 1} \cdot ${q - 1} = ${phi}\) stays secret: computing it requires knowing \(p\) and \(q\).</p>`;
            ctx.tex(step1);
            const sugg = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47].filter((c) => c < phi && gcd(c, phi) === 1).slice(0, 6);
            let eOk = false;
            if (!Number.isInteger(e)) step2.innerHTML = '<div class="feedback bad">Type a whole number for e.</div>';
            else if (e <= 1 || e >= phi) step2.innerHTML = String.raw`<div class="feedback bad">e must satisfy \(1 \lt e \lt \varphi(n) = ${phi}\).</div>`;
            else if (e > 999) step2.innerHTML = '<div class="feedback bad">Keep e below 1000 in this toy lab so the squaring table fits.</div>';
            else if (gcd(e, phi) !== 1) step2.innerHTML = String.raw`<div class="feedback bad">\(\gcd(${e}, ${phi}) = ${gcd(e, phi)}\), so \(e\) has no inverse modulo \(\varphi(n)\) and no private key exists. Pick another \(e\).</div>`;
            else { eOk = true; step2.innerHTML = String.raw`<div class="feedback good">\(\gcd(${e}, ${phi}) = 1\), so \(e\) is valid: it has an inverse modulo ${phi}.</div>`; }
            ctx.tex(step2);
            if (!eOk && sugg.length) step2.append(h('div.row', { style: { gap: '0.25rem', marginTop: '0.3rem' } }, h('span.tiny.muted', 'Valid choices:'), sugg.map((c) => h('button.btn.sm', { onclick: () => { e = c; eIn.value = c; draw(); } }, String(c)))));
            if (!eOk) { step3.innerHTML = '<p class="small muted">Waiting for a valid e.</p>'; ctx.rc(keys); ctx.rc(msgBox); ctx.rc(detail); return; }
            const d = inverse(e, phi);
            const k = (e * d - 1) / phi;
            step3.innerHTML = String.raw`<p class="small">\(d = e^{-1} \bmod \varphi(n) = ${d}\), found with the extended Euclidean algorithm. Check: \(${e} \cdot ${d} = ${e * d} = ${k} \cdot ${phi} + 1\).</p>`;
            ctx.tex(step3);
            keys.innerHTML = String.raw`<div class="why" data-label="Why decryption works">\(e d = 1 + ${k}\,\varphi(n)\). Euler's theorem says \(m^{\varphi(n)} \equiv 1 \pmod n\) when \(\gcd(m, n) = 1\), so \(c^d \equiv m^{ed} = m \cdot \big(m^{\varphi(n)}\big)^{${k}} \equiv m\). Public key \((${n}, ${e})\); private key \(${d}\).</div>`;
            ctx.tex(keys);
            // message: letters A-Z (1-26), or a single number below n
            const raw = String(text).trim();
            let items = [];
            let warn = '';
            if (/^\d+$/.test(raw)) {
              const m = parseInt(raw, 10);
              if (m >= n) warn = `The number must be smaller than n = ${n}; otherwise it is changed by the reduction mod n.`;
              else items = [{ label: String(m), m }];
            } else {
              const letters = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
              if (n <= 26) warn = `n = ${n} is not larger than 26, so the letters A to Z cannot all be told apart. Choose bigger primes, or type a number below ${n}.`;
              else if (!letters) warn = 'Type up to 6 letters, or a number.';
              else items = letters.split('').map((ch) => ({ label: ch, m: ch.charCodeAt(0) - 64 }));
            }
            if (warn) { ctx.rc(msgBox, h('div.feedback.bad', warn)); ctx.rc(detail); return; }
            sel = Math.min(sel, items.length - 1);
            const rows = items.map((it) => { const c = powmod(it.m, e, n); return { ...it, c, back: powmod(c, d, n) }; });
            const seen = {};
            rows.forEach((r) => { seen[r.c] = (seen[r.c] || 0) + 1; });
            const repeats = Object.values(seen).some((x) => x > 1);
            ctx.rc(msgBox,
              h('table.data.nt-ct', h('thead', h('tr', h('th', 'plain'), h('th', 'm'), h('th', 'c = mᵉ mod n'), h('th', 'cᵈ mod n'), h('th', 'back'))),
                h('tbody', rows.map((r, i) => h('tr', { class: i === sel ? 'sel' : '', onclick: () => { sel = i; draw(); } }, h('td.mono', r.label), h('td.mono', String(r.m)), h('td.mono', h('b', String(r.c))), h('td.mono', String(r.back)), h('td.mono', /^\d+$/.test(r.label) ? String(r.back) : String.fromCharCode(64 + r.back)))))),
              repeats ? h('p.tiny', { style: { color: 'var(--false)' } }, 'Equal letters give equal ciphertexts. Textbook RSA is deterministic, so an eavesdropper can count letter frequencies. Real systems add random padding (OAEP) and use a 2048-bit n.') : h('p.tiny.muted', 'Real systems use a 2048-bit n and add random padding (OAEP) before encrypting, so equal messages never give equal ciphertexts.'));
            // repeated squaring for the selected row
            const r = rows[sel];
            const bits = e.toString(2).split('').reverse();
            const pw = [];
            let x = r.m % n;
            bits.forEach(() => { pw.push(x); x = (x * x) % n; });
            const used = bits.map((bt, j) => (bt === '1' ? j : -1)).filter((j) => j >= 0);
            ctx.rc(detail, h('div.card.stack', { style: { gap: '0.3rem' } },
              h('h4', `Encrypting ${r.label}: ${r.m}^${e} mod ${n} by repeated squaring`),
              ctx.rich('div.tiny.muted', String.raw`\(e = ${e} = (${e.toString(2)})_2\). Square, reduce mod ${n}, and keep the columns whose bit is 1.`),
              h('table.nt-ladder', h('tbody',
                h('tr', h('th', `power of ${r.m}`), ...bits.map((_, j) => h('td', String(2 ** j)))),
                h('tr', h('th', 'value mod n'), ...pw.map((v, j) => h('td', { class: bits[j] === '1' ? 'on' : 'off' }, String(v)))),
                h('tr', h('th', 'bit of e'), ...bits.map((bt) => h('td', { class: bt === '1' ? 'dig' : 'off' }, bt))))),
              ctx.rich('div.small', String.raw`\(c \equiv ${used.map((j) => pw[j]).join(' \\cdot ')} \equiv ${r.c} \pmod{${n}}\). That took ${bits.length - 1} squaring${bits.length === 2 ? '' : 's'} and ${Math.max(0, used.length - 1)} extra multiplication${used.length === 2 ? '' : 's'}, instead of ${e - 1} multiplications.`)));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: fast powers and a toy RSA',
        kind: 'code',
        file: 'toy_rsa.py',
        html: String.raw`<p class="muted small">Fast modular exponentiation written from scratch, then used to generate an RSA key, encrypt a number and decrypt it again. <b>Trace</b> shows <code>exp</code> losing one binary digit per loop.</p>`,
        fivew: {
          what: 'Implements repeated squaring as power_mod, builds the classic RSA key p = 61, q = 53, e = 17, and encrypts and decrypts the message 65.',
          why: 'Every RSA operation is a modular power with a huge exponent. Without repeated squaring, even a toy example would need thousands of multiplications, and real keys would be impossible.',
          who: 'Cryptography and security engineers, and anyone who wants to understand what HTTPS, SSH keys and code signing do under the hood.',
          where: 'TLS certificates on every website, SSH logins, signed software updates, and the key exchange that protects calls to cloud AI services.',
          when: 'Use this to learn. In production, call a vetted cryptography library: textbook RSA without padding is insecure, as the design slide explains.',
        },
        lines: [
          ['def power_mod(base, exp, n):', String.raw`Defines fast modular exponentiation (repeated squaring) from scratch, so you can see what Python's built-in <code>pow(base, exp, n)</code> does inside. It returns \(\text{base}^{\text{exp}} \bmod n\).`],
          ['    result = 1', String.raw`The running product starts at 1, the "empty product". Each 1-bit of <code>exp</code> will multiply one power of the base into it.`],
          ['    base = base % n', String.raw`Reduces the base first. The multiplication rule for congruences allows it, and it keeps every number below \(n\).`],
          ['    while exp > 0:', String.raw`Processes <code>exp</code> one binary digit at a time, lowest bit first. The loop runs about \(\log_2(\text{exp})\) times: 5 times for 17, which is \((10001)_2\), and 12 times for 2753.`],
          ['        if exp % 2 == 1:', String.raw`<code>exp % 2</code> is the lowest bit of <code>exp</code>. When it is 1, the current power of the base belongs in the answer.`],
          ['            result = result * base % n', String.raw`Multiplies that power into the result and reduces mod \(n\) at once, so <code>result</code> never grows past \(n^2\). Python's <code>*</code> and <code>%</code> have equal precedence and run left to right, so this means <code>(result * base) % n</code>.`],
          ['        base = base * base % n', String.raw`Squares the base: it goes \(a \to a^2 \to a^4 \to a^8 \to \cdots\), always reduced mod \(n\). Squaring is what turns \(e - 1\) multiplications into about \(2\log_2 e\).`],
          ['        exp = exp // 2', String.raw`Drops the lowest bit of <code>exp</code> by integer division: \(17 \to 8 \to 4 \to 2 \to 1 \to 0\). When it reaches 0, every bit has been used and the loop ends.`],
          ['    return result', String.raw`Returns \(\text{base}^{\text{exp}} \bmod n\), the product of the powers whose bit was 1.`],
          ['', ''],
          ['p, q, e = 61, 53, 17', String.raw`Key generation, steps 1 and 2: two primes and a public exponent with \(\gcd(e, (p-1)(q-1)) = 1\). Real keys use random primes with hundreds of digits each.`],
          ['n, phi = p * q, (p - 1) * (q - 1)', String.raw`\(n = 3233\) is published as part of the public key. \(\varphi = 60 \cdot 52 = 3120\) stays secret, because computing it requires knowing \(p\) and \(q\).`],
          ['d = pow(e, -1, phi)', String.raw`The private key: the inverse of \(e\) modulo \(\varphi\). The three-argument <code>pow</code> with exponent \(-1\) runs the extended Euclidean algorithm (Python 3.8 or later). \(d = 2753\), and \(17 \cdot 2753 = 46801 = 15 \cdot 3120 + 1\).`],
          ['c = power_mod(65, e, n)', String.raw`Encrypts the message \(m = 65\) (the letter A in ASCII) with the public key: \(c = 65^{17} \bmod 3233 = 2790\). Anyone who knows \((n, e)\) can do this.`],
          ['print("public key:", (n, e), "private key:", d)', String.raw`Output: <code>public key: (3233, 17) private key: 2753</code>. Python prints the tuple with its parentheses.`],
          ['print("cipher:", c, "decrypted:", power_mod(c, d, n))', String.raw`Decrypts with the private key: \(2790^{2753} \bmod 3233 = 65\), the original message. Output: <code>cipher: 2790 decrypted: 65</code>. It works because \(e d \equiv 1 \pmod{\varphi(n)}\).`],
        ],
        expected: 'public key: (3233, 17) private key: 2753\ncipher: 2790 decrypted: 65\n',
        tryIt: 'Encrypt 66 instead of 65 and check that decryption returns 66. Then compare <code>power_mod(c, d, n)</code> with the built-in <code>pow(c, d, n)</code>: they always agree.',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Mod at work: hashing, check digits, random numbers',
        kind: 'concept',
        html: String.raw`
          <div class="cols-3">
            <div class="card stack" style="gap:0.45rem">
              <h3>Hashing</h3>
              <p class="small">A <span class="term">hash function</span> sends each key to one of \(m\) buckets. The simplest is \(h(k) = k \bmod m\). With \(m = 11\), the IDs 25, 36 and 47 all land in bucket 3. That is a <b>collision</b>, and it happens because they differ by multiples of 11.</p>
              <p class="small">Real keys often share a pattern. Below, every key is a multiple of 10. A prime \(m\) shares no factor with the pattern, so the keys spread out. Python's <code>dict</code> and <code>set</code> are hash tables.</p>
              <div class="nt-hash stack" style="gap:0.25rem"></div>
            </div>
            <div class="card stack" style="gap:0.45rem">
              <h3>Check digits</h3>
              <p class="small">The <span class="term">Luhn algorithm</span> guards card numbers. Starting from the right, double every second digit, subtract 9 from any result above 9, and add everything up. A valid number has a sum \(\equiv 0 \pmod{10}\). It catches every single mistyped digit.</p>
              <div class="nt-luhn stack" style="gap:0.3rem"></div>
            </div>
            <div class="card stack" style="gap:0.45rem">
              <h3>Pseudo-random numbers</h3>
              <p class="small">A <span class="term">linear congruential generator</span> repeats \(x_{k+1} = (a x_k + c) \bmod m\). With \(a = 5\), \(c = 3\), \(m = 16\) and seed \(x_0 = 7\) it produces 7, 6, 1, 8, 11, 10, 5, 12, 15, 14, … The numbers look random, yet the seed fixes all of them, and they repeat after at most \(m\) steps.</p>
              <div class="nt-lcg stack" style="gap:0.3rem"></div>
              <p class="small">That makes them ideal for repeatable experiments and useless for passwords or keys.</p>
            </div>
          </div>
          <div class="ai">The <b>hashing trick</b> in machine learning sends every word to column \(h(\text{word}) \bmod 2^{20}\) of a fixed-size feature vector, so the model needs no vocabulary list. A fixed seed (<code>random.seed(42)</code>) makes a training run repeatable. A checksum such as SHA-256 confirms that downloaded model weights arrived unchanged.</div>`,
        render(body, ctx) {
          const { h, s } = ctx;
          // hashing: keys 10, 20, ..., 120 into m buckets
          const hb = body.querySelector('.nt-hash');
          let m = 10;
          const hSeg = h('div.seg', { 'aria-label': 'Number of buckets m' });
          const hSvg = s('svg', { viewBox: '0 0 300 74', role: 'img', 'aria-label': 'How many keys land in each bucket', style: 'width:100%;height:auto;display:block' });
          const hCap = h('div.tiny');
          hb.append(h('div.row', { style: { gap: '0.35rem' } }, h('span.tiny.muted', 'keys 10, 20, …, 120, m ='), hSeg), hSvg, hCap);
          function drawHash() {
            ctx.rc(hSeg, ...[10, 12, 15, 11, 13].map((k) => h('button', { 'aria-pressed': String(k === m), style: { padding: '0.1rem 0.45rem' }, onclick: () => { m = k; drawHash(); } }, String(k))));
            const counts = new Array(m).fill(0);
            for (let k = 10; k <= 120; k += 10) counts[k % m]++;
            const bw = 290 / m, unit = Math.min(8, 40 / Math.max(...counts)), base = 58;
            const kids = [];
            counts.forEach((c, i) => {
              const x = 5 + i * bw;
              kids.push(s('rect', { x: x + 1, y: base - c * unit, width: bw - 2, height: c * unit, rx: 2, fill: c > 1 ? 'var(--false)' : 'var(--accent)', 'fill-opacity': c ? 0.75 : 0 }));
              kids.push(s('line', { x1: x + 1, y1: base + 0.5, x2: x + bw - 1, y2: base + 0.5, stroke: 'var(--rule)', 'stroke-width': 1 }));
              kids.push(s('text', { x: x + bw / 2, y: base + 12, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--ink-3)', text: String(i) }));
              if (c > 1) kids.push(s('text', { x: x + bw / 2, y: base - c * unit - 3, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: 'var(--false)', text: String(c) }));
            });
            ctx.rc(hSvg, ...kids);
            const used = counts.filter(Boolean).length, g = gcd(10, m);
            hCap.innerHTML = g === 1 ? `gcd(10, ${m}) = 1: the 12 keys use ${used} of the ${m} buckets.` : `gcd(10, ${m}) = ${g}: the keys use only ${used} of the ${m} buckets, so ${12 - used} keys collide.`;
          }
          drawHash();
          // LCG: show the sequence until it repeats
          const lb = body.querySelector('.nt-lcg');
          let lp = 0, seed = 7;
          const LPAR = [{ a: 5, c: 3, m: 16 }, { a: 3, c: 0, m: 16 }];
          const lSeg = h('div.seg', { 'aria-label': 'Generator parameters' });
          const seedIn = h('input.inp.mono', { value: '7', inputmode: 'numeric', 'aria-label': 'seed', style: { width: '3rem', padding: '0.1rem 0.3rem' } });
          const lOut = h('div');
          seedIn.addEventListener('input', drawLcg);
          lb.append(h('div.row', { style: { gap: '0.35rem' } }, lSeg, h('span.tiny.muted', 'seed'), seedIn), lOut);
          function drawLcg() {
            ctx.rc(lSeg, ...LPAR.map((P, i) => h('button', { 'aria-pressed': String(i === lp), style: { padding: '0.1rem 0.4rem', fontSize: '0.74rem' }, onclick: () => { lp = i; drawLcg(); } }, `a=${P.a} c=${P.c} m=${P.m}`)));
            const P = LPAR[lp];
            const sv = parseIntSafe(seedIn.value);
            seed = Number.isInteger(sv) && sv >= 0 ? sv % P.m : 0;
            const seen = new Map(), seq = [];
            let x = seed;
            while (!seen.has(x)) { seen.set(x, seq.length); seq.push(x); x = (P.a * x + P.c) % P.m; }
            const start = seen.get(x), period = seq.length - start;
            ctx.rc(lOut,
              h('div.nt-chips', seq.map((v, i) => h('span', { style: i >= start ? { borderColor: 'var(--accent)' } : null }, String(v))), h('span', { style: { border: 0, color: 'var(--accent)' } }, `→ ${x} again`)),
              h('div.tiny', { style: { marginTop: '0.2rem', color: period === P.m ? 'var(--true)' : 'var(--false)' } }, period === P.m ? `Period ${period}: every value 0 to ${P.m - 1} appears before the cycle repeats.` : `Period only ${period} of a possible ${P.m}: poor parameters repeat quickly.`));
          }
          drawLcg();
          const box = body.querySelector('.nt-luhn');
          const inp = h('input.inp.mono', { value: '79927398713', 'aria-label': 'Digits to check with the Luhn algorithm', style: { width: '100%' } });
          const out = h('div.stack', { style: { gap: '0.25rem' } });
          inp.addEventListener('input', draw);
          box.append(inp, out);
          function draw() {
            const ds = String(inp.value).replace(/\D/g, '').slice(0, 16).split('').map(Number);
            if (ds.length < 2) { ctx.rc(out, h('div.tiny.muted', 'Type at least two digits.')); return; }
            const contrib = ds.map((d, i) => { const fromRight = ds.length - 1 - i; if (fromRight % 2 === 1) { const x = 2 * d; return { v: x > 9 ? x - 9 : x, dbl: true }; } return { v: d, dbl: false }; });
            const sum = contrib.reduce((t, c) => t + c.v, 0);
            const ok = sum % 10 === 0;
            ctx.rc(out,
              h('div.nt-luhn-row', ds.map((d, i) => h('span', { class: contrib[i].dbl ? 'dbl' : '' }, String(d)))),
              h('div.nt-luhn-row', contrib.map((c) => h('span', { class: c.dbl ? 'dbl' : '' }, String(c.v)))),
              h('div', { class: 'feedback ' + (ok ? 'good' : 'bad'), style: { padding: '0.25rem 0.5rem', fontSize: '0.8rem' } }, `Sum ${sum}: ${ok ? 'a multiple of 10, so the number passes.' : `${sum} mod 10 = ${sum % 10}, so the number fails.`} Change one digit to see it flip.`));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: integers in real software',
        kind: 'design',
        html: String.raw`<p class="muted small">Number theory turns up in money handling, indexing, hashing and security. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Use integers for money, counts and IDs',
            html: '<p>Floats store binary fractions, and most decimal amounts such as 0.10 have no exact binary form. Sums drift: <code>0.1 + 0.2</code> is <code>0.30000000000000004</code>. Store money as a whole number of cents and format it only for display.</p><p>Identifiers such as card numbers are better kept as strings of digits. They can start with 0, and nobody does arithmetic on them.</p>',
            bad: 'price = 0.10\ntotal = price * 3          # 0.30000000000000004\nif total == 0.30:\n    ship()                 # never runs',
            good: 'price_cents = 10\ntotal_cents = price_cents * 3   # exactly 30\nprint(f"${total_cents // 100}.{total_cents % 100:02d}")',
          },
          {
            name: 'Know how % treats negative numbers',
            html: '<p>Python\'s <code>%</code> returns a result with the sign of the divisor, which matches the division algorithm: <code>-7 % 3 == 2</code> and <code>-7 // 3 == -3</code>. C, C++, Java, JavaScript and Go round toward zero, so there <code>-7 % 3</code> is <code>-1</code>.</p><p>When you port code, or compute a circular index such as "one slot before slot 0", force the result into the range 0 to n − 1.</p>',
            bad: { label: '✗ Avoid this (in C, Java or JavaScript)', code: 'prev = (i - 1) % n     # -1 when i == 0\nvalue = buffer[prev]   # crash or wrong slot' },
            good: { label: '✓ Do this (safe in every language)', code: 'prev = ((i - 1) % n + n) % n   # always 0..n-1\n# in Python, (i - 1) % n is already 0..n-1' },
          },
          {
            name: 'Use pow(a, e, m) for modular powers',
            html: '<p><code>a ** e % m</code> computes the entire power and reduces only at the end. For a 2048-bit exponent no computer could store that power. The three-argument <code>pow</code> uses repeated squaring and reduces after every multiplication, so it finishes in microseconds. <code>pow(a, -1, m)</code> (Python 3.8 or later) returns a modular inverse.</p>',
            bad: 'x = 7 ** 1_000_000 % 13   # builds an 845,099-digit number',
            good: 'x = pow(7, 1_000_000, 13)  # repeated squaring, instant\ninv = pow(3, -1, 7)        # 5, the inverse of 3 mod 7',
          },
          {
            name: 'Never roll your own cryptography',
            html: '<p>Textbook RSA, the version in this module, is insecure in practice. It is deterministic, so equal messages give equal ciphertexts, and an attacker can transform a ciphertext without decrypting it. Production systems use vetted libraries with random padding (RSA-OAEP), constant-time arithmetic and keys of at least 2048 bits.</p><p>For tokens and passwords use the <code>secrets</code> module. The <code>random</code> module is predictable by design.</p>',
            bad: 'c = pow(m, e, n)                  # textbook RSA\ntoken = random.randint(0, 10**8)  # guessable',
            good: 'import secrets\ntoken = secrets.token_urlsafe(32)  # unguessable\n# encryption: a vetted library with OAEP padding',
          },
          {
            name: 'Validate inputs before the math',
            html: '<p>Some inputs have no answer. \\(\\gcd(0, 0)\\) is undefined because every integer divides 0. A modulus must be positive. An inverse exists only when \\(\\gcd(a, n) = 1\\). Check these cases and raise an error that names the problem, instead of returning a wrong value or failing deep inside a loop.</p>',
            bad: 'def inverse(a, n):\n    for x in range(n):\n        if a * x % n == 1:\n            return x\n    # falls off the end: returns None silently',
            good: 'def inverse(a, n):\n    if n <= 0:\n        raise ValueError("modulus must be positive")\n    if math.gcd(a, n) != 1:\n        raise ValueError(f"{a} has no inverse mod {n}")\n    return pow(a, -1, n)',
          },
          {
            name: 'Watch for overflow outside plain Python',
            html: '<p>Python integers grow as large as memory allows. NumPy arrays, C, Java and GPU code use fixed-width integers that silently wrap around: a 32-bit signed integer holds at most 2,147,483,647. Products overflow first, so reduce modulo \\(m\\) before multiplying, and choose a 64-bit type when values can grow.</p>',
            bad: 'a = np.int32(50_000)\nprint(a * a)      # -1794967296: wrapped around',
            good: 'a = np.int64(50_000)\nprint(a * a)                   # 2500000000\nprod = (x % m) * (y % m) % m   # stays below m*m',
          },
          {
            name: 'Size hash tables with a prime',
            html: '<p>With <code>key % m</code>, keys that share a factor with \\(m\\) crowd into a few buckets. If every key is a multiple of 8 and \\(m = 1024\\), only 128 of the 1,024 buckets are ever used. A prime \\(m\\) shares no factor with such patterns, so the keys spread over all the buckets.</p>',
            bad: 'buckets = 1024\nslot = key % buckets   # multiples of 8 use 1/8 of slots',
            good: 'buckets = 1021         # a prime close to 1024\nslot = key % buckets   # patterns spread out evenly',
          },
          {
            name: 'Seed random generators for repeatable experiments',
            html: '<p>Pseudo-random generators are deterministic: the same seed always gives the same sequence, just like the generator on the previous slide. Seed them in experiments so a training run, a data split or a bug can be reproduced exactly, and record the seed next to the results.</p>',
            good: 'import random\nrandom.seed(42)\nsplit = random.sample(range(1000), 200)  # same every run',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: Euclid’s algorithm for gcd(252, 198)',
        kind: 'example',
        id: 'ex-euclid-gcd',
        problem: String.raw`<p>Use Euclid's algorithm to find \(\gcd(252, 198)\), showing every division.</p>`,
        objective: 'Use Euclid’s algorithm to find the gcd of two integers by repeated division, and justify the answer by dividing both original numbers by the result.',
        data: EX_GCD_DATA,
        steps: euclidStepsFor(EX_GCD_DATA),
        answer: 18,
        verify(M) { return M.gcd(252, 198) === 18 && EX_GCD.g === 18 && 252 % 18 === 0 && 198 % 18 === 0 && M.gcd(14, 11) === 1; },
        variants: [
          {
            label: 'Variant: first number smaller',
            problem: String.raw`<p>Use Euclid's algorithm to find \(\gcd(84, 210)\), showing every division. Here the first number is smaller than the second — watch what the first division does with that.</p>`,
            data: EX_GCD_VAR,
            steps: euclidStepsFor(EX_GCD_VAR),
            answer: 42,
            verify(M) { return M.gcd(84, 210) === 42 && EX_GCD_VAR.g === 42 && EX_GCD_VAR.rows[0].q === 0 && 84 % 42 === 0 && 210 % 42 === 0 && M.gcd(2, 5) === 1; },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_GCD_DATA;
          const rows = D.rows.slice(0, step.shown).map((r, i) => h('tr', { class: i === step.shown - 1 && !step.answer ? 'hit' : '' },
            h('td', String(r.a)), h('td', String(r.q)), h('td', String(r.b)), h('td', String(r.r)),
            h('td.l.mono', `${r.a} = ${r.q} · ${r.b} + ${r.r}`)));
          const pair = step.shown === 0 ? `gcd(${D.a}, ${D.b}) = ?` : step.answer ? `gcd(${D.a}, ${D.b}) = ${D.g}` : `gcd(${D.rows[step.shown - 1].b}, ${D.rows[step.shown - 1].r})`;
          stage.append(h('div.stack', { style: { alignItems: 'center' } },
            h('div.big-math.mono', pair),
            rows.length ? h('table.tt', h('thead', h('tr', h('th', 'a'), h('th', 'q'), h('th', 'b'), h('th', 'r'), h('th.l', 'division'))), h('tbody', rows)) : h('p.small.muted', 'No divisions yet — press Step to divide.'),
            step.answer ? h('div.ex-answer', `gcd(${D.a}, ${D.b}) = ${D.g} · check: ${D.g} · ${D.a / D.g} = ${D.a} and ${D.g} · ${D.b / D.g} = ${D.b}, with gcd(${D.a / D.g}, ${D.b / D.g}) = 1`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 2 */
      {
        title: 'Worked example: the inverse of 7 modulo 26',
        kind: 'example',
        id: 'ex-mod-inverse',
        problem: String.raw`<p>Find the modular inverse of \(7\) modulo \(26\) — the number \(x\) with \(7x \equiv 1 \pmod{26}\) — by running Euclid's algorithm forward and then back-substituting.</p>`,
        objective: 'Find a modular inverse by running Euclid’s algorithm forward and back-substituting to a Bézout combination, and recognize the gcd test that decides whether an inverse exists at all.',
        data: EX_INV_DATA,
        steps: invStepsFor(EX_INV_DATA),
        answer: 15,
        verify(M) {
          const [g, s, t] = egcd(7, 26);
          const fwd = euclidRows(26, 7);
          let count = 0, found = null;
          for (let x = 1; x < 26; x++) if (M.mod(7 * x, 26) === 1) { count++; found = x; }
          return M.mod(7 * 15, 26) === 1 && inverse(7, 26) === 15 && g === 1 && s * 7 + t * 26 === g && M.mod(s, 26) === 15 && fwd.g === 1 && fwd.rows.length === 4 && count === 1 && found === 15;
        },
        variants: [
          {
            label: 'Variant: no inverse exists',
            problem: String.raw`<p>Try to find the modular inverse of \(4\) modulo \(26\) — a number \(x\) with \(4x \equiv 1 \pmod{26}\) — by running Euclid's algorithm forward first, and let the gcd decide whether the search can succeed.</p>`,
            data: EX_INV_VAR_DATA,
            steps: invStepsFor(EX_INV_VAR_DATA),
            answer: 'no inverse',
            verify(M) {
              let count = 0;
              for (let x = 0; x < 26; x++) if (M.mod(4 * x, 26) === 1) count++;
              return M.gcd(4, 26) === 2 && inverse(4, 26) === null && count === 0;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_INV_DATA;
          const all = D.lines;
          const shown = all.slice(0, step.lines);
          const lineEls = shown.map((ln, i) => {
            const isNew = i === shown.length - 1 && !step.answer;
            return h('div.mono', { style: { fontSize: '0.9rem', lineHeight: 1.35, padding: '0.14rem 0.5rem', borderRadius: '0.35rem', ...(isNew ? { background: 'var(--accent-2)', fontWeight: 700 } : {}) } },
              h('span.tiny.muted', { style: { marginRight: '0.55rem' } }, ln.tag),
              ...ln.parts.map(([txt, hl]) => (hl ? h('span.hl', txt) : txt)));
          });
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem', maxWidth: '46rem', width: '100%' } },
            h('div.big-math.mono', D.header),
            step.lines === 0
              ? h('div.small.muted', { style: { border: '1px dashed var(--rule)', borderRadius: 'var(--radius)', padding: '0.5rem 0.8rem', textAlign: 'center' } }, D.emptyText)
              : h('div.stack', { style: { gap: '0.12rem', alignItems: 'stretch' } }, ...lineEls),
            step.phase === 'read' || step.answer ? h('div.small', D.readNote) : null,
            step.answer ? h('div.ex-answer', D.answerBanner) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 3 */
      {
        title: 'Worked example: 5^11 mod 13 by repeated squaring',
        kind: 'example',
        id: 'ex-fast-power',
        problem: String.raw`<p>Compute \(5^{11} \bmod 13\) by repeated squaring: expand \(11\) in binary, build the squaring chain \(5^1, 5^2, 5^4, 5^8 \bmod 13\), and multiply in only the powers the 1-bits select.</p>`,
        objective: 'Compute a modular power by repeated squaring: expand the exponent in binary, square the base step by step while reducing mod m, and multiply in only the powers selected by the 1-bits.',
        data: EX_POW_DATA,
        steps: powStepsFor(EX_POW_DATA),
        answer: EX_POW_DATA.ans,
        verify(M) {
          const D = EX_POW_DATA;
          let r = 1 % D.m; for (let i = 0; i < D.e; i++) r = (r * D.b) % D.m;
          const chainOk = D.powers.every((p, j) => { let q = 1 % D.m; for (let t = 0; t < 2 ** j; t++) q = (q * D.b) % D.m; return q === p; });
          return r === D.ans && D.ans === 8 && powmod(D.b, D.e, D.m) === D.ans && chainOk && M.mod(5 * 8, 13) === 1;
        },
        variants: [
          {
            label: 'Variant: exponent is a power of two',
            problem: String.raw`<p>Compute \(3^{16} \bmod 7\) by repeated squaring. The exponent \(16\) is itself a power of two, so its binary form has a single 1-bit — watch what that does to the squaring chain and to the final product.</p>`,
            data: EX_POW_VAR_DATA,
            steps: powStepsFor(EX_POW_VAR_DATA),
            answer: EX_POW_VAR_DATA.ans,
            verify(M) {
              const D = EX_POW_VAR_DATA;
              let r = 1 % D.m; for (let i = 0; i < D.e; i++) r = (r * D.b) % D.m;
              const chainOk = D.powers.every((p, j) => { let q = 1 % D.m; for (let t = 0; t < 2 ** j; t++) q = (q * D.b) % D.m; return q === p; });
              return r === D.ans && D.ans === 4 && powmod(D.b, D.e, D.m) === D.ans && chainOk && D.used.length === 1 && D.bits.join('') === '00001';
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_POW_DATA;
          const revealBits = step.phase === 'select' || step.phase === 'multiply' || !!step.answer;
          const status = step.phase === 'setup' ? `Goal: ${D.b}^${D.e} mod ${D.m} · exponent ${D.e} = (${D.e.toString(2)})₂ · no powers computed yet`
            : step.phase === 'square' ? `Squaring chain: ${step.shown} of ${D.bits.length} powers computed`
              : step.phase === 'select' ? `Bits read: the 1-bits keep ${D.used.map((j) => `${D.b}^${2 ** j}`).join(', ')}`
                : step.phase === 'multiply' ? `Kept powers multiplied in: running product = ${D.ans}`
                  : `Done: ${D.b}^${D.e} ≡ ${D.ans} (mod ${D.m})`;
          const tbl = h('table.nt-ladder', h('tbody',
            h('tr', h('th', `power of ${D.b}`), ...D.bits.map((_, j) => h('td', String(2 ** j)))),
            h('tr', h('th', `value mod ${D.m}`), ...D.powers.map((p, j) => h('td', { class: j < step.shown ? (revealBits ? (D.bits[j] ? 'on' : 'off') : '') : 'off' }, j < step.shown ? String(p) : '?'))),
            h('tr', h('th', `bit of ${D.e}`), ...D.bits.map((bit, j) => h('td', { class: revealBits ? (bit ? 'dig' : 'off') : 'off' }, revealBits ? String(bit) : '?')))));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: 'min(38rem, 100%)' } },
            h('div.big-math.mono', `${D.b}^${D.e} mod ${D.m}`),
            h('div.small', h('b.mono', status)),
            tbl,
            step.phase === 'multiply' || step.answer ? h('p.small', `Product of the kept powers: ${D.used.map((j) => D.powers[j]).join(' · ')} ≡ ${D.ans} (mod ${D.m})`) : null,
            step.answer ? h('div.ex-answer', `${D.b}^${D.e} ≡ ${D.ans} (mod ${D.m}) · check: multiplying ${D.b} by itself ${D.e} times, reducing mod ${D.m} each time, also ends at ${D.ans} ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 4 */
      {
        title: 'Worked example: the sieve up to 30',
        kind: 'example',
        id: 'ex-sieve-primes',
        problem: String.raw`<p>Use the sieve of Eratosthenes to find every prime up to \(30\): start with all numbers standing, then for each prime in turn cross out its multiples, and list the primes that remain standing.</p>`,
        objective: 'Find all primes up to a stated bound with the sieve of Eratosthenes, crossing out multiples prime by prime starting at each prime squared, and check the surviving list by independent trial division.',
        data: EX_SIEVE_DATA,
        steps: sieveStepsFor(EX_SIEVE_DATA),
        answer: EX_SIEVE_DATA.primes,
        verify(M) { return sieveCheck(EX_SIEVE_DATA, M) && EX_SIEVE_DATA.primes.length === 10; },
        variants: [
          {
            label: 'Variant: sieve up to 50',
            problem: String.raw`<p>Use the sieve of Eratosthenes to find every prime up to \(50\). The larger bound admits one more pass than the sieve up to \(30\) needed, because \(7^2 = 49\) now falls inside the range — run the passes and list the primes that remain standing.</p>`,
            data: EX_SIEVE_VAR_DATA,
            steps: sieveStepsFor(EX_SIEVE_VAR_DATA),
            answer: EX_SIEVE_VAR_DATA.primes,
            verify(M) { return sieveCheck(EX_SIEVE_VAR_DATA, M) && EX_SIEVE_VAR_DATA.primes.length === 15 && EX_SIEVE_VAR_DATA.passes.length === 4 && EX_SIEVE_VAR_DATA.passes[3].crossed.join(',') === '49'; },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_SIEVE_DATA;
          const crossedBy = new Map();
          D.passes.slice(0, step.shown).forEach((ps) => ps.crossed.forEach((x) => crossedBy.set(x, ps.p)));
          const picked = new Set(D.passes.slice(0, step.shown).map((ps) => ps.p));
          const primeSet = new Set(D.primes);
          const done = step.phase === 'collect' || !!step.answer;
          const curP = step.phase === 'pass' ? D.passes[step.shown - 1].p : null;
          const cells = [];
          for (let v = 1; v <= D.N; v++) {
            const base = { minWidth: '2rem', textAlign: 'center', padding: '0.18rem 0.1rem', border: '1px solid var(--rule)', borderRadius: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', background: 'var(--sheet)', color: 'var(--ink)' };
            if (v === 1) Object.assign(base, { color: 'var(--ink-3)', borderStyle: 'dashed' });
            else if (crossedBy.has(v)) Object.assign(base, { color: 'var(--ink-3)', textDecoration: 'line-through', borderColor: PCOL[crossedBy.get(v)] || 'var(--rule)', background: 'var(--paper)' });
            else if (done && primeSet.has(v)) Object.assign(base, { background: 'var(--true-bg)', borderColor: 'var(--true)', color: 'var(--true)', fontWeight: 700 });
            else if (picked.has(v)) Object.assign(base, { background: 'var(--true-bg)', borderColor: 'var(--true)', fontWeight: 700 });
            if (v === curP) base.boxShadow = '0 0 0 2px var(--ink)';
            cells.push(h('div', { style: base }, String(v)));
          }
          const standing = D.N - 1 - crossedBy.size;
          const status = step.phase === 'setup' ? `Numbers 1 to ${D.N} · nothing crossed out yet · ${D.N - 1} numbers standing`
            : step.phase === 'pass' ? `Pass p = ${curP} · crossed out so far: ${crossedBy.size} · still standing: ${standing}`
              : step.phase === 'collect' ? `All ${D.passes.length} passes done · ${D.primes.length} numbers still standing, all prime`
                : `Primes up to ${D.N}: ${D.primes.length} found`;
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: 'min(42rem, 100%)' } },
            h('div.small', h('b.mono', status)),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center' } }, ...cells),
            h('p.small.muted', step.phase === 'setup' ? 'The number 1 is neither prime nor composite, so it never joins the passes; every other number starts out standing.'
              : done ? 'Green cells are the primes: every composite was crossed by its smallest prime factor.'
                : 'Struck-through cells are crossed out, tinted by the prime whose pass removed them; green cells are primes already picked.'),
            step.answer ? h('div.ex-answer', `Primes up to ${D.N}: ${D.primes.join(', ')} · check: trial division of every number up to its square root finds the same ${D.primes.length} primes ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: integers and number theory',
        kind: 'practice',
        html: String.raw`<p class="muted small">Numbers can be typed plainly (<code>-8</code>). Base answers accept upper or lower case, with or without a <code>0x</code> or <code>0b</code> prefix.</p>`,
        gens: [
          {
            label: 'Division algorithm',
            make(R) {
              const d = R.int(2, 12);
              let a = R.int(-99, 99);
              if (a === 0 || a % d === 0) a = a <= 0 ? -d * R.int(2, 8) - R.int(1, d - 1) : d * R.int(2, 8) + R.int(1, d - 1);
              const q = Math.floor(a / d), r = a - d * q;
              const toward0 = a < 0 && r > 0;
              return {
                prompt: String.raw`Apply the division algorithm to \(a = ${a}\) and \(d = ${d}\). Find the integers \(q\) and \(r\) with \(a = d\,q + r\) and \(0 \le r \lt ${d}\). Type them as <code>q, r</code>.`,
                answer: [q, r],
                answerText: `${q}, ${r}`,
                placeholder: 'q, r',
                check: (inp) => { const m = String(inp).replace(/[−–]/g, '-').match(/-?\d+/g); return !!m && m.length === 2 && +m[0] === q && +m[1] === r; },
                hint: a < 0 ? 'for negative a, q rounds down (toward minus infinity), so that r stays non-negative.' : String.raw`\(q = \lfloor a/d \rfloor\).`,
                solution: String.raw`\(${a} / ${d} \approx ${(a / d).toFixed(2)}\), so \(q = \lfloor ${a}/${d} \rfloor = ${q}\). Then \(r = a - d\,q = ${a} - ${d} \cdot ${par(q)} = ${r}\). Check: \(${d} \cdot ${par(q)} + ${r} = ${a}\) and \(0 \le ${r} \lt ${d}\). Answer: <b>${q}, ${r}</b>. Python agrees: <code>divmod(${a}, ${d})</code> is <code>(${q}, ${r})</code>.` +
                  (toward0 ? String.raw` Rounding toward zero would give \(q = ${q + 1}\) and \(r = ${r - d}\), a negative remainder, which the theorem does not allow.` : ''),
              };
            },
          },
          {
            label: 'GCD and LCM',
            make(R, M) {
              const g = R.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 14, 15]);
              let x = R.int(2, 25), y = R.int(2, 25);
              for (let tries = 0; (M.gcd(x, y) !== 1 || x === y) && tries < 50; tries++) { x = R.int(2, 25); y = R.int(2, 25); }
              if (M.gcd(x, y) !== 1 || x === y) { x = 13; y = 8; }
              const a = g * Math.max(x, y), b = g * Math.min(x, y);
              const { rows } = euclidRows(a, b);
              const steps = rows.map((r) => `\\(${r.a} = ${r.q} \\cdot ${r.b} + ${r.r}\\)`).join('<br>');
              const askL = R.chance(0.4);
              const lcm = (a * b) / g;
              return {
                prompt: askL ? String.raw`Find \(\operatorname{lcm}(${a}, ${b})\).` : String.raw`Use Euclid's algorithm to find \(\gcd(${a}, ${b})\).`,
                answer: askL ? lcm : g,
                hint: askL ? String.raw`find the gcd first, then use \(\gcd \cdot \operatorname{lcm} = a\,b\).` : 'divide, keep the remainder, repeat until the remainder is 0.',
                solution: `Euclid's steps:<br>${steps}<br>The last nonzero remainder is \\(\\gcd(${a}, ${b}) = ${g}\\).` + (askL ? String.raw` Then \(\operatorname{lcm} = \dfrac{${a} \cdot ${b}}{${g}} = \dfrac{${a * b}}{${g}} = ${lcm}\).` : ''),
              };
            },
          },
          {
            label: 'Modular arithmetic',
            make(R) {
              const kind = R.int(0, 2);
              if (kind === 0) {
                const n = R.pick([7, 9, 10, 11, 12, 13, 15, 17, 19, 20, 21, 26]);
                let a = R.int(2, n - 1);
                while (gcd(a, n) !== 1) a = R.int(2, n - 1);
                const inv = inverse(a, n);
                const list = [];
                for (let x = 1; x <= inv; x++) list.push(`${a}\\cdot${x} \\equiv ${(a * x) % n}`);
                return {
                  prompt: String.raw`Find the inverse of \(${a}\) modulo \(${n}\): the number \(x\) with \(0 \le x \lt ${n}\) and \(${a}x \equiv 1 \pmod{${n}}\).`,
                  answer: inv,
                  answerText: String(inv),
                  // the prompt asks for the representative in 0 … n−1, so inv + n or inv − n is not accepted
                  check: (inp) => { const v = parseIntSafe(inp); return Number.isInteger(v) && v >= 0 && v < n && mod(a * v, n) === 1; },
                  hint: String.raw`\(\gcd(${a}, ${n}) = 1\), so an inverse exists. Try multiples of ${a} until one leaves remainder 1, and give the answer between 0 and ${n - 1}.`,
                  solution: String.raw`Work through the multiples of ${a} modulo ${n}: \(${list.join(',\\ ')}\). So \(${a}^{-1} \equiv ${inv} \pmod{${n}}\). Check: \(${a} \cdot ${inv} = ${a * inv} = ${Math.floor((a * inv) / n)} \cdot ${n} + 1\). Every number congruent to ${inv} works too (${inv + n}, ${inv - n}, …), but the question asks for the one in the range \(0 \le x \lt ${n}\). The extended Euclidean algorithm finds the same answer without the search.`,
                };
              }
              if (kind === 1) {
                const a = R.int(2, 9), e = R.int(5, 40), n = R.pick([5, 7, 11, 13, 17, 19, 23]);
                const ans = powmod(a, e, n);
                const bits = e.toString(2).split('').reverse();
                const pw = []; let x = a % n;
                bits.forEach(() => { pw.push(x); x = (x * x) % n; });
                const used = bits.map((b, j) => (b === '1' ? j : -1)).filter((j) => j >= 0);
                return {
                  prompt: String.raw`Compute \(${a}^{${e}} \bmod ${n}\).`,
                  answer: ans,
                  hint: String.raw`write ${e} in binary and use repeated squaring.`,
                  solution: String.raw`\(${e} = (${e.toString(2)})_2 = ${used.map((j) => 2 ** j).reverse().join(' + ')}\). Squaring and reducing mod ${n}: ${pw.map((v, j) => `\\(${a}^{${2 ** j}} \\equiv ${v}\\)`).join(', ')}. Multiply the powers whose bit is 1: \(${used.map((j) => pw[j]).join(' \\cdot ')} \equiv ${ans} \pmod{${n}}\).`,
                };
              }
              const x = R.int(100, 999), y = R.int(100, 999), c = R.int(10, 99), n = R.pick([7, 9, 10, 11, 12]);
              const ans = mod(x * y + c, n);
              return {
                prompt: String.raw`Compute \((${x} \cdot ${y} + ${c}) \bmod ${n}\) without a calculator.`,
                answer: ans,
                hint: 'reduce each number mod n first; the congruence rules allow it.',
                solution: String.raw`Reduce first: \(${x} \equiv ${x % n}\), \(${y} \equiv ${y % n}\), \(${c} \equiv ${c % n} \pmod{${n}}\). Then \(${x % n} \cdot ${y % n} + ${c % n} = ${(x % n) * (y % n) + (c % n)} \equiv ${ans}\). (The full value \(${x * y + c}\) leaves the same remainder.)`,
              };
            },
          },
          {
            label: 'Number bases',
            make(R) {
              const kinds = [
                () => { const n = R.int(10, 255); return { from: 10, to: 2, n }; },
                () => { const n = R.int(16, 4095); return { from: 10, to: 16, n }; },
                () => { const n = R.int(8, 511); return { from: 10, to: 8, n }; },
                () => { const n = R.int(5, 255); return { from: 2, to: 10, n }; },
                () => { const n = R.int(16, 4095); return { from: 16, to: 10, n }; },
                () => { const n = R.int(16, 255); return { from: 2, to: 16, n }; },
              ];
              const { from, to, n } = R.pick(kinds)();
              const src = toBase(n, from), ans = toBase(n, to);
              const norm = (t) => String(t).toLowerCase().replace(/[\s_]/g, '').replace(/[₀-₉]+$/, '').replace(/^0[bxo]/, '').replace(/^0+(?=.)/, '');
              let solution;
              if (from === 10) {
                const cols = []; let x = n;
                do { cols.push(`\\(${x} = ${to} \\cdot ${Math.floor(x / to)} + ${x % to}\\)`); x = Math.floor(x / to); } while (x > 0);
                solution = `Divide by ${to} repeatedly:<br>${cols.join('<br>')}<br>` + String.raw`Reading the remainders from the last to the first gives \((${ans})_{${to}}\)${to === 16 ? ' (10 to 15 are written A to F)' : ''}.`;
              } else if (to === 10) {
                const terms = src.split('').map((c, i) => [DIG.indexOf(c), src.length - 1 - i]).filter(([d]) => d > 0);
                solution = String.raw`Expand by place value: \(${terms.map(([d, p]) => (p === 0 ? `${d}` : `${d} \\cdot ${from}^{${p}}`)).join(' + ')} = ${terms.map(([d, p]) => d * from ** p).join(' + ')} = ${n}\).`;
              } else {
                const pad = src.padStart(Math.ceil(src.length / 4) * 4, '0');
                const groups = pad.match(/.{4}/g);
                solution = String.raw`Group the bits in fours from the right: ${groups.map((g) => `<code>${g}</code>`).join(' ')}. Each group is one hex digit: ${groups.map((g) => `${g} → ${DIG[parseInt(g, 2)]}`).join(', ')}. So the answer is \((${ans})_{16}\).`;
              }
              return {
                prompt: String.raw`Convert \((${src})_{${from}}\) to base ${to}.`,
                answer: ans,
                answerText: ans,
                check: (inp) => norm(inp) === norm(ans),
                hint: from === 10 ? `divide by ${to} again and again and collect the remainders.` : to === 10 ? 'multiply each digit by its place value and add.' : 'one hex digit stands for exactly four bits.',
                solution,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: integers and number theory',
        kind: 'quiz',
        questions: [
          { q: String.raw`The division algorithm with \(a = -17\) and \(d = 5\) gives which \(q\) and \(r\)?`, choices: [String.raw`\(q = -3,\ r = -2\)`, String.raw`\(q = -4,\ r = 3\)`, String.raw`\(q = -3,\ r = 2\)`, String.raw`\(q = 3,\ r = -2\)`], answer: 1, explain: String.raw`\(-17 = 5 \cdot (-4) + 3\) with \(0 \le 3 \lt 5\). The pair \(q = -3,\ r = -2\) is what C or Java produce by rounding toward zero, but a remainder may not be negative. Python's <code>divmod(-17, 5)</code> returns <code>(-4, 3)</code>.` },
          { q: 'To decide whether 221 is prime by trial division, what is the largest prime you must try?', choices: ['7', '13', '17', '110'], answer: 1, explain: String.raw`\(\sqrt{221} \approx 14.9\), so only primes up to 14 need testing, and the largest is 13. It succeeds: \(221 = 13 \cdot 17\).` },
          { q: String.raw`\(\gcd(a, b) = 6\) and \(a \cdot b = 432\). What is \(\operatorname{lcm}(a, b)\)?`, choices: ['72', '36', '2592', '12'], answer: 0, explain: String.raw`\(\gcd \cdot \operatorname{lcm} = a\,b\), so \(\operatorname{lcm} = 432 / 6 = 72\). For example \(a = 18\), \(b = 24\).` },
          { q: String.raw`One step of Euclid's algorithm replaces \(\gcd(91, 35)\) with which pair?`, choices: [String.raw`\(\gcd(35, 21)\)`, String.raw`\(\gcd(35, 56)\)`, String.raw`\(\gcd(91, 21)\)`, String.raw`\(\gcd(56, 35)\)`], answer: 0, explain: String.raw`\(91 = 2 \cdot 35 + 21\), so \(\gcd(91, 35) = \gcd(35, 21)\). Continuing: \(\gcd(21, 14) = \gcd(14, 7) = \gcd(7, 0) = 7\).` },
          { q: 'Which number has an inverse modulo 12?', choices: ['4', '6', '7', '10'], answer: 2, explain: String.raw`An inverse exists exactly when \(\gcd(a, 12) = 1\). Only 7 qualifies, and \(7 \cdot 7 = 49 = 4 \cdot 12 + 1\), so 7 is its own inverse. The others share the factor 2 with 12.` },
          { q: String.raw`What is \((97 \cdot 46 + 13) \bmod 9\)?`, choices: ['2', '4', '7', '0'], answer: 0, explain: String.raw`Reduce first: \(97 \equiv 7\), \(46 \equiv 1\) and \(13 \equiv 4 \pmod 9\). Then \(7 \cdot 1 + 4 = 11 \equiv 2\). The full value 4475 leaves the same remainder.` },
          { q: String.raw`What is \((2F)_{16}\) in decimal?`, choices: ['47', '32', '215', '42'], answer: 0, explain: String.raw`F stands for 15, so \(2 \cdot 16 + 15 = 47\). In binary that is \(0010\,1111\), one hex digit per four bits.` },
          { q: String.raw`How many multiplications does repeated squaring need to compute \(a^{64} \bmod n\)?`, choices: ['63', '32', '6', '8'], answer: 2, explain: String.raw`\(64 = 2^6\), so six squarings do it: \(a \to a^2 \to a^4 \to a^8 \to a^{16} \to a^{32} \to a^{64}\). Multiplying \(a\) by itself 63 times is the slow way.` },
          { q: String.raw`A toy RSA key uses \(p = 5\), \(q = 11\) and \(e = 3\). What is the private key \(d\)?`, choices: ['7', '13', '27', '37'], answer: 2, explain: String.raw`\(\varphi(n) = 4 \cdot 10 = 40\), and \(d\) must satisfy \(3d \equiv 1 \pmod{40}\). \(3 \cdot 27 = 81 = 2 \cdot 40 + 1\), so \(d = 27\).` },
          { q: String.raw`Every key is a multiple of 10. Which table size spreads them best with \(h(k) = k \bmod m\)?`, choices: ['100', '1000', '97', '50'], answer: 2, explain: String.raw`With \(m = 100\) the keys land only in buckets 0, 10, 20, …, 90: ten of the hundred. The prime 97 shares no factor with 10, so the keys spread over every bucket.` },
        ],
      },
    ],
  });
})();
