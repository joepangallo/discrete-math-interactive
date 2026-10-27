/* Module 3: Proof techniques. Objectives 2 and 3: use logic to read and develop proofs, and examine proof
   techniques in discrete mathematics and computer science. Rules of inference, direct and indirect proof,
   cases, counterexamples, induction, strong induction, and proofs about programs. */
(() => {
  // ---- propositional formulas for the argument checker come from DM.logic (src/lib/logic.js) ----
  const { ev, toTex, varsOf, assignments, L, tf } = DM.logic;
  const parse = (src) => DM.logic.parse(src, { empty: 'Each premise and the conclusion needs a formula.' });
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // ---- number helpers for the conjecture tester and the practice generators ----
  function smallestFactor(n) {
    if (n < 2) return n;
    if (n % 2 === 0) return 2;
    for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return d;
    return n;
  }
  const isPrime = (n) => Number.isInteger(n) && n >= 2 && smallestFactor(n) === n;
  let SIEVE = null;
  function smallPrime(n) {
    if (!SIEVE) {
      SIEVE = new Uint8Array(6101).fill(1);
      SIEVE[0] = SIEVE[1] = 0;
      for (let i = 2; i * i <= 6100; i++) if (SIEVE[i]) for (let j = i * i; j <= 6100; j += i) SIEVE[j] = 0;
    }
    return n >= 0 && n <= 6100 ? SIEVE[n] === 1 : isPrime(n);
  }
  const range = (a, b, step = 1) => { const out = []; for (let x = a; x <= b; x += step) out.push(x); return out; };
  const factorText = (v) => { const f = smallestFactor(v); return f === v ? `${v}, prime` : `${v} = ${f} × ${v / f}`; };

  // Exact rational arithmetic keeps rounding from inventing counterexamples. Bound every
  // intermediate, including powers, so a custom expression cannot stall the lesson.
  const ARITH_BITS = 4096;
  const arithLimit = 1n << BigInt(ARITH_BITS);
  const absInt = (n) => (n < 0n ? -n : n);
  function rational(p, q = 1n) {
    if (q === 0n) throw new Error('division by zero is undefined');
    if (q < 0n) { p = -p; q = -q; }
    if (absInt(p) >= arithLimit || q >= arithLimit) throw new Error('an intermediate exceeds the exact-arithmetic limit');
    let a = absInt(p), b = q;
    while (b) [a, b] = [b, a % b];
    return { p: p / a, q: q / a };
  }
  function arith(op, a, b) {
    if (op === '+') return rational(a.p * b.q + b.p * a.q, a.q * b.q);
    if (op === '-') return rational(a.p * b.q - b.p * a.q, a.q * b.q);
    if (op === '*') return rational(a.p * b.p, a.q * b.q);
    if (op === '/') return rational(a.p * b.q, a.q * b.p);
    if (op === '%') {
      if (b.p === 0n) throw new Error('remainder modulo zero is undefined');
      const quotient = (a.p * b.q) / (a.q * b.p);
      return rational(a.p * b.q - quotient * b.p * a.q, a.q * b.q);
    }
    if (b.q !== 1n) throw new Error('fractional powers cannot be checked exactly here; use a whole-number exponent');
    const e = absInt(b.p);
    const bits = Math.max(absInt(a.p).toString(2).length, a.q.toString(2).length);
    if (e > BigInt(ARITH_BITS) || BigInt(bits) * e > BigInt(ARITH_BITS)) throw new Error('a power exceeds the exact-arithmetic limit');
    return b.p < 0n ? rational(a.q ** e, a.p ** e) : rational(a.p ** e, a.q ** e);
  }
  const arithText = (v) => v.q === 1n ? String(v.p) : `${v.p}/${v.q}`;
  function squareRoot(n) {
    if (n < 2n) return n;
    let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
    let next = (x + n / x) / 2n;
    while (next < x) { x = next; next = (x + n / x) / 2n; }
    return x;
  }

  // arithmetic in n for the "your own claim" box: + − * / % ^, parentheses, and 2n for 2 * n
  function parseArith(src) {
    const s = String(src).replace(/\*\*/g, '^').replace(/×/g, '*').replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3');
    const raw = [];
    const re = /\s*(\d+|n|[-+*/%^()])/y;
    let i = 0;
    while (i < s.length) {
      if (/^\s*$/.test(s.slice(i))) break;
      re.lastIndex = i;
      const m = re.exec(s);
      if (!m) throw new Error(`I don't understand "${s.slice(i).trim()[0]}". Use n, whole numbers, + - * / ^ and parentheses.`);
      raw.push(m[1]);
      i = re.lastIndex;
    }
    const t = [];
    raw.forEach((tok, j) => { const prev = raw[j - 1]; if (j && /^(\d+|n|\))$/.test(prev) && /^(n|\()$/.test(tok)) t.push('*'); t.push(tok); });
    if (!t.length) throw new Error('Type an expression in n, for example n^2 + 1.');
    let k = 0;
    function expr() {
      let f = term();
      while (t[k] === '+' || t[k] === '-') { const op = t[k++]; const a = f, b = term(); f = (n) => arith(op, a(n), b(n)); }
      return f;
    }
    function term() {
      let f = unary();
      while (t[k] === '*' || t[k] === '/' || t[k] === '%') { const op = t[k++]; const a = f, b = unary(); f = (n) => arith(op, a(n), b(n)); }
      return f;
    }
    function unary() { if (t[k] === '-') { k++; const f = unary(); return (n) => { const v = f(n); return { p: -v.p, q: v.q }; }; } return power(); }
    function power() { const b = atom(); if (t[k] === '^') { k++; const e = unary(); return (n) => arith('^', b(n), e(n)); } return b; }
    function atom() {
      const tok = t[k++];
      if (tok === '(') { const f = expr(); if (t[k++] !== ')') throw new Error('A "(" is missing its ")".'); return f; }
      if (tok === 'n') return (n) => rational(BigInt(n));
      if (/^\d+$/.test(tok || '')) return () => {
        if (tok.length > 1234) throw new Error('a number exceeds the exact-arithmetic limit');
        return rational(BigInt(tok));
      };
      throw new Error(tok ? `Unexpected "${tok}".` : 'The expression ends too early.');
    }
    const f = expr();
    if (k < t.length) throw new Error(`Unexpected "${t[k]}" near the end.`);
    return f;
  }

  // ---- rules of inference for the argument lab ----
  const RULES = [
    { name: 'Modus ponens', prem: ['p → q', 'p'], concl: 'q', en: ['If it rains, the match is cancelled.', 'It rains.'], enC: 'The match is cancelled.', note: 'The workhorse of every proof: from "if p then q" and "p", conclude "q".' },
    { name: 'Modus tollens', prem: ['p → q', '¬q'], concl: '¬p', en: ['If it rains, the match is cancelled.', 'The match is not cancelled.'], enC: 'It does not rain.', note: 'Reasoning backwards through the contrapositive: the conclusion failed, so the hypothesis must have failed too.' },
    { name: 'Hypothetical syllogism', prem: ['p → q', 'q → r'], concl: 'p → r', en: ['If the build passes, we deploy.', 'If we deploy, users get the fix.'], enC: 'If the build passes, users get the fix.', note: 'Chaining conditionals. A long proof is a chain of exactly this kind.' },
    { name: 'Disjunctive syllogism', prem: ['p ∨ q', '¬p'], concl: 'q', en: ['The bug is in the parser or in the printer.', 'It is not in the parser.'], enC: 'It is in the printer.', note: 'Eliminating options: of two possibilities, one is ruled out, so the other remains.' },
    { name: 'Addition', prem: ['p'], concl: 'p ∨ q', en: ['7 is prime.'], enC: '7 is prime or 7 is even.', note: 'Weakening: if p is true, then "p or anything" is true.' },
    { name: 'Simplification', prem: ['p ∧ q'], concl: 'p', en: ['n is even and n is positive.'], enC: 'n is even.', note: 'Keeping one part of an "and".' },
    { name: 'Conjunction', prem: ['p', 'q'], concl: 'p ∧ q', en: ['n is even.', 'n is positive.'], enC: 'n is even and n is positive.', note: 'Combining two facts you already have into one.' },
    { name: 'Affirming the consequent', fallacy: true, prem: ['p → q', 'q'], concl: 'p', en: ['If it rains, the ground is wet.', 'The ground is wet.'], enC: 'It rained.', note: 'A fallacy: a sprinkler could have wet the ground. It treats p → q as if it were the converse q → p.' },
    { name: 'Denying the antecedent', fallacy: true, prem: ['p → q', '¬p'], concl: '¬q', en: ['If it rains, the ground is wet.', 'It did not rain.'], enC: 'The ground is not wet.', note: 'A fallacy: the ground can be wet for other reasons. It treats p → q as if it were the inverse ¬p → ¬q.' },
    { name: 'Your own argument', custom: true },
  ];

  // ---- proofs for the proof builder: steps in the correct order, plus one step that does not belong ----
  const JUST = ['Given (hypothesis)', 'Assume the opposite', 'Use the contrapositive', 'Definition', 'Algebra', 'Closure of integers', 'Earlier result', 'Construction', 'Contradiction', 'Conclusion'];
  const PROOFS = [
    {
      label: 'Even + even', method: 'Direct proof', thm: String.raw`If \(m\) and \(n\) are even integers, then \(m + n\) is even.`,
      steps: [
        { t: String.raw`Let \(m\) and \(n\) be even integers.`, j: ['Given (hypothesis)'], why: 'A direct proof starts by assuming the hypothesis.' },
        { t: String.raw`Then \(m = 2a\) and \(n = 2b\) for some integers \(a\) and \(b\).`, j: ['Definition'], why: 'Unpack "even" with its definition: two times an integer.' },
        { t: String.raw`So \(m + n = 2a + 2b = 2(a + b)\).`, j: ['Algebra'], why: 'Substitute, then factor out the 2.' },
        { t: String.raw`\(a + b\) is an integer.`, j: ['Closure of integers'], why: 'A sum of integers is an integer. Without this, 2(a + b) might not fit the definition of even.' },
        { t: String.raw`So \(m + n\) is two times an integer: \(m + n\) is even. ∎`, j: ['Definition', 'Conclusion'], why: 'Pack the definition of even back up to reach the conclusion.' },
        { bad: true, t: String.raw`So \(m + n = 2a + 2b = 2ab\).`, why: 'Wrong algebra: 2a + 2b is not 2ab. With a = b = 1 the left side is 4 and the right side is 2.' },
      ],
    },
    {
      label: 'n² even ⇒ n even', method: 'Proof by contrapositive', thm: String.raw`For every integer \(n\), if \(n^2\) is even, then \(n\) is even.`,
      steps: [
        { t: String.raw`We prove the contrapositive: if \(n\) is odd, then \(n^2\) is odd.`, j: ['Use the contrapositive'], why: '"n² is even" gives nothing useful to work with, but "n is odd" does. The contrapositive is equivalent, so proving it is enough.' },
        { t: String.raw`Suppose \(n\) is odd.`, j: ['Given (hypothesis)'], why: 'Assume the hypothesis of the contrapositive.' },
        { t: String.raw`Then \(n = 2k + 1\) for some integer \(k\).`, j: ['Definition'], why: 'The definition of odd.' },
        { t: String.raw`So \(n^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1\).`, j: ['Algebra'], why: 'Square, then group the terms into the shape 2(something) + 1.' },
        { t: String.raw`\(2k^2 + 2k\) is an integer.`, j: ['Closure of integers'], why: 'Products and sums of integers are integers.' },
        { t: String.raw`So \(n^2\) is odd.`, j: ['Definition'], why: 'It has the form 2(integer) + 1, which is the definition of odd.' },
        { t: String.raw`The contrapositive holds, so the original statement holds. ∎`, j: ['Use the contrapositive', 'Conclusion'], why: 'Because p → q ≡ ¬q → ¬p, proving one proves the other.' },
        { bad: true, t: String.raw`Suppose \(n^2\) is odd.`, why: 'That assumes the opposite of the hypothesis, which leads toward the inverse. The contrapositive starts from the opposite of the conclusion: n is odd.' },
      ],
    },
    {
      label: '√2 is irrational', method: 'Proof by contradiction', thm: String.raw`\(\sqrt{2}\) is irrational.`,
      steps: [
        { t: String.raw`Suppose, for contradiction, that \(\sqrt2\) is rational.`, j: ['Assume the opposite'], why: 'A proof by contradiction begins by assuming the statement is false.' },
        { t: String.raw`Then \(\sqrt2 = a/b\) for integers \(a, b\) with \(b \ne 0\) and no common factor.`, j: ['Definition'], why: 'The definition of rational, with the fraction reduced to lowest terms.' },
        { t: String.raw`Squaring gives \(2 = a^2 / b^2\), so \(a^2 = 2b^2\).`, j: ['Algebra'], why: 'Square both sides and multiply by b².' },
        { t: String.raw`So \(a^2\) is even, and therefore \(a\) is even.`, j: ['Earlier result'], why: 'a² = 2b² is even, and the previous proof showed that n² even implies n even.' },
        { t: String.raw`Write \(a = 2c\). Then \(4c^2 = 2b^2\), so \(b^2 = 2c^2\).`, j: ['Algebra'], why: 'Substitute a = 2c and divide by 2.' },
        { t: String.raw`So \(b^2\) is even, and therefore \(b\) is even.`, j: ['Earlier result'], why: 'The same earlier result, now applied to b.' },
        { t: String.raw`Now \(a\) and \(b\) share the factor 2, which contradicts "no common factor".`, j: ['Contradiction'], why: 'We have reached a statement and its negation at the same time.' },
        { t: String.raw`So the assumption was false: \(\sqrt2\) is irrational. ∎`, j: ['Conclusion'], why: 'An assumption that leads to a contradiction must be false.' },
        { bad: true, t: String.raw`The decimal \(1.41421356\ldots\) never seems to repeat, so \(\sqrt2\) is irrational.`, why: 'Looking at finitely many digits proves nothing: a decimal could start repeating after a billion digits. Evidence is not proof.' },
      ],
    },
    {
      label: 'Infinitely many primes', method: 'Proof by contradiction', thm: 'There are infinitely many prime numbers.',
      steps: [
        { t: String.raw`Suppose, for contradiction, that the primes are a finite list \(p_1, p_2, \ldots, p_k\).`, j: ['Assume the opposite'], why: 'Assume the statement is false: only finitely many primes exist.' },
        { t: String.raw`Let \(N = p_1 p_2 \cdots p_k + 1\).`, j: ['Construction'], why: 'Euclid builds a new number designed to cause trouble.' },
        { t: String.raw`\(N \gt 1\), so \(N\) has some prime factor \(q\).`, j: ['Earlier result'], why: 'Every integer greater than 1 has a prime factor. This module proves it with strong induction.' },
        { t: String.raw`\(q\) must be one of \(p_1, \ldots, p_k\), since that list holds every prime.`, j: ['Assume the opposite', 'Given (hypothesis)'], why: 'This uses the assumption that the list contains every prime.' },
        { t: String.raw`Then \(q\) divides \(p_1 \cdots p_k\) and \(N\), so it divides their difference, 1.`, j: ['Algebra'], why: 'If q divides two numbers, it divides their difference: N − p₁⋯pₖ = 1.' },
        { t: 'No prime divides 1. Contradiction.', j: ['Contradiction'], why: 'A prime is at least 2, so it cannot divide 1.' },
        { t: 'So there are infinitely many primes. ∎', j: ['Conclusion'], why: 'The assumption led to a contradiction, so it is false.' },
        { bad: true, t: String.raw`So \(N\) is prime.`, why: 'N need not be prime: 2 · 3 · 5 · 7 · 11 · 13 + 1 = 30031 = 59 × 509. The proof only needs N to have a prime factor that is missing from the list.' },
      ],
    },
  ];

  // ---- claims for the induction domino lab ----
  const sumTo = (n, f) => { let s = 0; for (let i = 1; i <= n; i++) s += f(i); return s; };
  const CLAIMS = [
    { key: 'Σ i', tex: String.raw`1 + 2 + \cdots + n = \frac{n(n+1)}{2}`, n0: 1, base: true, step: true,
      check: (n) => sumTo(n, (i) => i) === (n * (n + 1)) / 2,
      baseTex: String.raw`n = 1:\ \ 1 = \frac{1 \cdot 2}{2}`, hyp: String.raw`1 + 2 + \cdots + k = \frac{k(k+1)}{2}`,
      lines: [[String.raw`1 + \cdots + k + (k+1)`, 'the left side for n = k + 1'], [String.raw`= \frac{k(k+1)}{2} + (k+1)`, 'inductive hypothesis'], [String.raw`= \frac{k(k+1) + 2(k+1)}{2}`, 'common denominator'], [String.raw`= \frac{(k+1)(k+2)}{2}`, 'factor out k + 1: the formula at n = k + 1']] },
    { key: 'Σ odd', tex: String.raw`1 + 3 + 5 + \cdots + (2n-1) = n^2`, n0: 1, base: true, step: true,
      check: (n) => sumTo(n, (i) => 2 * i - 1) === n * n,
      baseTex: String.raw`n = 1:\ \ 1 = 1^2`, hyp: String.raw`1 + 3 + \cdots + (2k-1) = k^2`,
      lines: [[String.raw`1 + 3 + \cdots + (2k-1) + (2k+1)`, 'the next odd number is 2(k + 1) − 1 = 2k + 1'], [String.raw`= k^2 + 2k + 1`, 'inductive hypothesis'], [String.raw`= (k+1)^2`, 'a perfect square: the formula at n = k + 1']] },
    { key: '2ⁿ ≥ n + 1', tex: String.raw`2^n \ge n + 1`, n0: 0, base: true, step: true,
      check: (n) => 2 ** n >= n + 1,
      baseTex: String.raw`n = 0:\ \ 2^0 = 1 \ge 0 + 1`, hyp: String.raw`2^k \ge k + 1`,
      lines: [[String.raw`2^{k+1} = 2 \cdot 2^k`, 'one more factor of 2'], [String.raw`\ge 2(k+1)`, 'inductive hypothesis'], [String.raw`= (k+2) + k \ge k + 2`, 'because k ≥ 0: the claim at n = k + 1']] },
    { key: 'Σ 2ⁱ', tex: String.raw`1 + 2 + 4 + \cdots + 2^{n-1} = 2^n - 1`, n0: 1, base: true, step: true,
      check: (n) => sumTo(n, (i) => 2 ** (i - 1)) === 2 ** n - 1,
      baseTex: String.raw`n = 1:\ \ 1 = 2^1 - 1`, hyp: String.raw`1 + 2 + \cdots + 2^{k-1} = 2^k - 1`,
      lines: [[String.raw`1 + 2 + \cdots + 2^{k-1} + 2^k`, 'the left side for n = k + 1'], [String.raw`= (2^k - 1) + 2^k`, 'inductive hypothesis'], [String.raw`= 2^{k+1} - 1`, 'two copies of 2ᵏ make 2ᵏ⁺¹. In binary: 111…1 = 2ⁿ − 1']] },
    { key: 'Broken base', tex: String.raw`1 + 2 + \cdots + n = \frac{n(n+1)}{2} + 1`, n0: 1, base: false, step: true,
      check: (n) => sumTo(n, (i) => i) === (n * (n + 1)) / 2 + 1,
      baseTex: String.raw`n = 1:\ \ 1 \ne \frac{1 \cdot 2}{2} + 1 = 2`, hyp: String.raw`1 + \cdots + k = \frac{k(k+1)}{2} + 1`,
      lines: [[String.raw`1 + \cdots + k + (k+1)`, 'the left side for n = k + 1'], [String.raw`= \frac{k(k+1)}{2} + 1 + (k+1)`, 'inductive hypothesis'], [String.raw`= \frac{(k+1)(k+2)}{2} + 1`, 'the same algebra as before: the step is valid!']] },
    { key: 'Broken step', tex: String.raw`n^2 + n + 41 \text{ is prime}`, n0: 1, base: true, step: false,
      check: (n) => isPrime(n * n + n + 41),
      baseTex: String.raw`n = 1:\ \ 1 + 1 + 41 = 43 \text{ is prime}`, hyp: String.raw`k^2 + k + 41 \text{ is prime}`,
      lines: [[String.raw`(k+1)^2 + (k+1) + 41 = (k^2 + k + 41) + 2(k+1)`, 'algebra'], [String.raw`= \text{a prime} + \text{an even number}`, 'inductive hypothesis'], [String.raw`\text{prime + even is \textbf{not} always prime}`, 'no rule of logic finishes the step. The claim fails at n = 40.']] },
  ];

  // ---- the conjecture tester's claims ----
  const CONJ = [
    { name: 'n² + n + 41 is prime', dom: 'n = 1, 2, 3, …', min: 10, max: 100, def: 50, values: (N) => range(1, N),
      test: (n) => { const v = n * n + n + 41; return { ok: isPrime(v), text: `n = ${n}: ${n}² + ${n} + 41 = ${factorText(v)}` }; },
      lesson: 'Euler noticed in 1772 that this polynomial produces primes for n = 0 to 39: forty in a row. Then n = 40 gives 1681 = 41 × 41. Forty confirming cases proved nothing.' },
    { name: '2ⁿ − 1 is prime whenever n is prime', dom: 'prime n = 2, 3, 5, 7, …', min: 7, max: 47, def: 20, values: (N) => range(2, N).filter(isPrime),
      test: (n) => { const v = 2 ** n - 1; return { ok: isPrime(v), text: `n = ${n}: 2^${n} − 1 = ${factorText(v)}` }; },
      lesson: '3, 7, 31 and 127 suggest a pattern, but n = 11 gives 2047 = 23 × 89. The converse is a theorem: if 2ⁿ − 1 is prime, then n is prime. The largest primes known today have this form.' },
    { name: '2ⁿ > n²', dom: 'n = 1, 2, 3, …', min: 6, max: 50, def: 20, values: (N) => range(1, N),
      test: (n) => { const ok = 2 ** n > n * n; return { ok, text: `n = ${n}: 2^${n} = ${2 ** n} ${ok ? '>' : '≤'} ${n * n} = ${n}²` }; },
      lesson: 'True at n = 1, false at n = 2, 3 and 4, then true forever. "For all n ≥ 1" is false, but "for all n ≥ 5" is a theorem: induction proves it with base case n = 5. Where a claim starts matters.' },
    { name: '3 never divides n² + 1', dom: 'n = 1, 2, 3, …', min: 10, max: 300, def: 100, values: (N) => range(1, N),
      test: (n) => { const v = n * n + 1; return { ok: v % 3 !== 0, text: `n = ${n}: ${n}² + 1 = ${v} = 3 × ${Math.floor(v / 3)} + ${v % 3}` }; },
      lesson: 'No counterexample will ever appear, and no amount of checking can tell you that. A proof by cases can: n leaves remainder 0, 1 or 2 when divided by 3, and then n² + 1 leaves remainder 1, 2 or 2. Never 0.' },
    { name: 'Every even n ≥ 4 is a sum of two primes', dom: 'n = 4, 6, 8, …', min: 20, max: 3000, def: 300, values: (N) => range(4, N, 2),
      test: (n) => { for (let p = 2; p <= n / 2; p++) if (smallPrime(p) && smallPrime(n - p)) return { ok: true, text: `n = ${n} = ${p} + ${n - p}` }; return { ok: false, text: `n = ${n}: no two primes add up to it` }; },
      lesson: "Goldbach's conjecture (1742). Computers have checked every even number up to 4 × 10¹⁸ without finding a counterexample, yet nobody has a proof. Until someone finds one, it remains a conjecture." },
    { name: 'Every odd composite n is a prime + 2k²', dom: 'odd composite n = 9, 15, 21, …', min: 100, max: 6000, def: 3000, values: (N) => range(9, N, 2).filter((n) => !smallPrime(n)),
      test: (n) => { for (let k = 1; 2 * k * k < n; k++) if (smallPrime(n - 2 * k * k)) return { ok: true, text: `n = ${n} = ${n - 2 * k * k} + 2 × ${k}²` }; return { ok: false, text: `n = ${n}: no prime p and k ≥ 1 with ${n} = p + 2k²` }; },
      lesson: 'Goldbach suggested this one too. It survived for over a century until 1856, when Moritz Stern and his students found 5777 and 5993. Slide N past 5777 to see it fail.' },
    { name: 'Your own claim', custom: true, dom: 'n = 1, 2, 3, …', min: 5, max: 200, def: 60, values: (N) => range(1, N),
      lesson: 'Make up a pattern and try to break it. A single red square is a disproof; any number of green squares is only evidence.' },
  ];
  const PROPS = {
    'is prime': (v) => {
      if (v.q !== 1n || v.p < 2n) return { ok: false, text: `${arithText(v)}, not prime` };
      if (v.p > 10000000000n) return null;
      const n = Number(v.p);
      return { ok: isPrime(n), text: factorText(n) };
    },
    'is odd': (v) => ({ ok: v.q === 1n && absInt(v.p % 2n) === 1n, text: arithText(v) }),
    'is even': (v) => ({ ok: v.q === 1n && v.p % 2n === 0n, text: arithText(v) }),
    'is a perfect square': (v) => {
      const root = v.q === 1n && v.p >= 0n ? squareRoot(v.p) : null;
      const ok = root !== null && root * root === v.p;
      return { ok, text: ok ? `${v.p} = ${root}²` : arithText(v) };
    },
    'is positive': (v) => ({ ok: v.p > 0n, text: arithText(v) }),
  };

  // ---- practice data ----
  const ARG_TOPICS = [
    { p: 'the build passes', np: 'the build does not pass', q: 'we deploy', nq: 'we do not deploy', r: 'users get the fix' },
    { p: 'it rains', np: 'it does not rain', q: 'the match is cancelled', nq: 'the match is not cancelled', r: 'tickets are refunded' },
    { p: 'the input is valid', np: 'the input is not valid', q: 'the function returns a result', nq: 'the function returns no result', r: 'the report is generated' },
    { p: 'n is divisible by 4', np: 'n is not divisible by 4', q: 'n is even', nq: 'n is odd', r: 'n² is even' },
    { p: 'the model overfits', np: 'the model does not overfit', q: 'validation accuracy drops', nq: 'validation accuracy does not drop', r: 'we add regularization' },
  ];
  const FORMS = [
    ['Modus ponens', (t) => [`If ${t.p}, then ${t.q}.`, `${cap(t.p)}.`], (t) => `${cap(t.q)}.`, 'p → q, p ∴ q', true],
    ['Modus tollens', (t) => [`If ${t.p}, then ${t.q}.`, `${cap(t.nq)}.`], (t) => `${cap(t.np)}.`, 'p → q, ¬q ∴ ¬p', true],
    ['Hypothetical syllogism', (t) => [`If ${t.p}, then ${t.q}.`, `If ${t.q}, then ${t.r}.`], (t) => `If ${t.p}, then ${t.r}.`, 'p → q, q → r ∴ p → r', true],
    ['Disjunctive syllogism', (t) => [`${cap(t.p)} or ${t.q}.`, `${cap(t.np)}.`], (t) => `${cap(t.q)}.`, 'p ∨ q, ¬p ∴ q', true],
    ['Addition', (t) => [`${cap(t.p)}.`], (t) => `${cap(t.p)} or ${t.r}.`, 'p ∴ p ∨ q', true],
    ['Simplification', (t) => [`${cap(t.p)} and ${t.q}.`], (t) => `${cap(t.p)}.`, 'p ∧ q ∴ p', true],
    ['Conjunction', (t) => [`${cap(t.p)}.`, `${cap(t.q)}.`], (t) => `${cap(t.p)} and ${t.q}.`, 'p, q ∴ p ∧ q', true],
    ['Affirming the consequent', (t) => [`If ${t.p}, then ${t.q}.`, `${cap(t.q)}.`], (t) => `${cap(t.p)}.`, 'p → q, q ∴ p', false],
    ['Denying the antecedent', (t) => [`If ${t.p}, then ${t.q}.`, `${cap(t.np)}.`], (t) => `${cap(t.nq)}.`, 'p → q, ¬p ∴ ¬q', false],
  ];
  const SETUPS = [
    { s: 'If n² is odd, then n is odd.', hyp: 'n² is odd', concl: 'n is odd', nhyp: 'n² is even', nconcl: 'n is even' },
    { s: 'If 3n + 2 is odd, then n is odd.', hyp: '3n + 2 is odd', concl: 'n is odd', nhyp: '3n + 2 is even', nconcl: 'n is even' },
    { s: 'If ab is even, then a is even or b is even.', hyp: 'ab is even', concl: 'a is even or b is even', nhyp: 'ab is odd', nconcl: 'a and b are both odd' },
    { s: 'If n is divisible by 6, then n is divisible by 3.', hyp: 'n is divisible by 6', concl: 'n is divisible by 3', nhyp: 'n is not divisible by 6', nconcl: 'n is not divisible by 3' },
    { s: 'If x² is irrational, then x is irrational.', hyp: 'x² is irrational', concl: 'x is irrational', nhyp: 'x² is rational', nconcl: 'x is rational' },
    { s: 'If n² is divisible by 3, then n is divisible by 3.', hyp: 'n² is divisible by 3', concl: 'n is divisible by 3', nhyp: 'n² is not divisible by 3', nconcl: 'n is not divisible by 3' },
  ];
  const SUMS = [
    { term: 'i', f: (i) => i, F: (n) => (n * (n + 1)) / 2, Ftex: String.raw`\frac{n(n+1)}{2}`, ftex: (k) => `${k}` },
    { term: '2i - 1', f: (i) => 2 * i - 1, F: (n) => n * n, Ftex: 'n^2', ftex: (k) => `2 \\cdot ${k} - 1` },
    { term: 'i^2', f: (i) => i * i, F: (n) => (n * (n + 1) * (2 * n + 1)) / 6, Ftex: String.raw`\frac{n(n+1)(2n+1)}{6}`, ftex: (k) => `${k}^2` },
    { term: '2^{i-1}', f: (i) => 2 ** (i - 1), F: (n) => 2 ** n - 1, Ftex: '2^n - 1', ftex: (k) => `2^{${k - 1}}` },
    { term: '3i - 2', f: (i) => 3 * i - 2, F: (n) => (n * (3 * n - 1)) / 2, Ftex: String.raw`\frac{n(3n-1)}{2}`, ftex: (k) => `3 \\cdot ${k} - 2` },
  ];
  const BREAKABLE = [
    { tex: String.raw`n^2 + n + 41 \text{ is prime}`, test: (n) => isPrime(n * n + n + 41), why: (n) => `${n}² + ${n} + 41 = ${factorText(n * n + n + 41)}` },
    { tex: String.raw`n^2 - n + 41 \text{ is prime}`, test: (n) => isPrime(n * n - n + 41), why: (n) => `${n}² − ${n} + 41 = ${factorText(n * n - n + 41)}` },
    { tex: String.raw`n^2 + n + 17 \text{ is prime}`, test: (n) => isPrime(n * n + n + 17), why: (n) => `${n}² + ${n} + 17 = ${factorText(n * n + n + 17)}` },
    { tex: String.raw`n^2 + n + 11 \text{ is prime}`, test: (n) => isPrime(n * n + n + 11), why: (n) => `${n}² + ${n} + 11 = ${factorText(n * n + n + 11)}` },
    { tex: String.raw`2^n + 1 \text{ is prime}`, test: (n) => isPrime(2 ** n + 1), why: (n) => `2^${n} + 1 = ${factorText(2 ** n + 1)}` },
    { tex: String.raw`n! + 1 \text{ is prime}`, test: (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return isPrime(f + 1); }, why: (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return `${n}! + 1 = ${factorText(f + 1)}`; } },
    { tex: String.raw`n^2 + 1 \text{ is prime}`, test: (n) => isPrime(n * n + 1), why: (n) => `${n}² + 1 = ${factorText(n * n + 1)}` },
    { tex: String.raw`2^n \gt n^2`, test: (n) => 2 ** n > n * n, why: (n) => `2^${n} = ${2 ** n} and ${n}² = ${n * n}, so 2^${n} > ${n}² is false` },
    { tex: String.raw`3^n \gt n^3`, test: (n) => 3 ** n > n ** 3, why: (n) => `3^${n} = ${3 ** n} and ${n}³ = ${n ** 3}, so 3^${n} > ${n}³ is false` },
    { tex: String.raw`6n - 1 \text{ or } 6n + 1 \text{ is prime}`, test: (n) => isPrime(6 * n - 1) || isPrime(6 * n + 1), why: (n) => `6n − 1 = ${factorText(6 * n - 1)} and 6n + 1 = ${factorText(6 * n + 1)}` },
  ];

  const INVARIANT_CODE = ['total, k = 0, 0', 'while k < n:', '    k += 1', '    total += k', '# invariant: total == 1 + 2 + ... + k'].map(DM.hlPy).join('\n');
  const RECURSION_CODE = ['def sum_to(n):', '    return 0 if n == 0 else sum_to(n - 1) + n'].map(DM.hlPy).join('\n');

  // ---- worked examples: induction proofs, built by one shared generator ----
  // Each preset is described by a spec: the claim's tex rows plus plain-text pieces the captions
  // are assembled from. indStepsFor(spec) zips the specs into the shared step shape (proof lines
  // revealed so far + dominoes fallen), so the variant's steps are computed from its own spec by
  // exactly the code that builds the primary's.
  function indRowsFor(spec) {
    return [
      { tag: 'The claim', html: String.raw`\(P(n):\ ${spec.claimTex}\) for every integer \(n \ge 1\). Induction needs two things: a <b>base case</b> and an <b>inductive step</b>.` },
      { tag: 'Base case', html: spec.baseHtml },
      { tag: 'Inductive hypothesis', html: String.raw`Assume \(P(k)\) is true for one fixed \(k \ge 1\): \(\;${spec.hypTex}\).` },
      { tag: 'The goal', html: String.raw`Show \(P(k+1)\): \(\;${spec.goalTex}\).` },
      { tag: 'Algebra', html: spec.algebraHtml[0] },
      { tag: '', html: spec.algebraHtml[1] },
      { tag: '', html: spec.algebraHtml[2] },
      { tag: 'Conclusion', html: String.raw`By induction, \(P(n)\) is true for every positive integer \(n\). ∎` },
    ];
  }
  function indStepsFor(spec) {
    const lines = [1, 2, 3, 4, 7, 8], fallen = [0, 1, 2, 2, 3, 6];
    return spec.captions.map((caption, i) => {
      const st = { lines: lines[i], fallen: fallen[i], caption };
      if (i === spec.checkpointAt) st.checkpoint = spec.checkpoint;
      if (i === spec.captions.length - 1) st.answer = true;
      return st;
    });
  }
  function indDataFor(spec) {
    return { rows: indRowsFor(spec), total: 6, answerBanner: spec.answerBanner };
  }
  const EX_IND_SPEC = {
    claimTex: String.raw`1 + 2 + \cdots + n = \dfrac{n(n+1)}{2}`,
    baseHtml: String.raw`\(n = 1\): the left side is \(1\), and the right side is \(\dfrac{1 \cdot 2}{2} = 1\). The two sides agree, so \(P(1)\) is true.`,
    hypTex: String.raw`1 + 2 + \cdots + k = \dfrac{k(k+1)}{2}`,
    goalTex: String.raw`1 + 2 + \cdots + k + (k+1) = \dfrac{(k+1)(k+2)}{2}`,
    algebraHtml: [
      String.raw`\((1 + \cdots + k) + (k+1) = \dfrac{k(k+1)}{2} + (k+1)\) <span class="muted">[by the inductive hypothesis]</span>`,
      String.raw`\(= \)<span class="hl">\((k+1)\)</span>\(\left(\dfrac{k}{2} + 1\right)\) <span class="muted">[factor out \(k+1\)]</span>`,
      String.raw`\(= \dfrac{(k+1)(k+2)}{2}\) — exactly the goal, so \(P(k) \to P(k+1)\).`,
    ],
    captions: [
      'State the claim as P(n) and name the two things induction needs: a base case and an inductive step. In the domino picture from the induction lab, the base case tips the first domino, and the inductive step is why each falling domino knocks over the next one.',
      'The base case checks n = 1 directly: the left side is 1 and the right side is 1 · 2 / 2 = 1, so the two sides agree and P(1) is true. In the picture, the first domino has fallen.',
      'Next, the inductive hypothesis: assume P(k) is true for one fixed k ≥ 1, that is, 1 + ⋯ + k = k(k+1)/2. We do not prove this line; we assume it for a single k — domino k is falling — and use it to push the next domino over.',
      'Before doing any algebra, write out the goal for k + 1: 1 + ⋯ + k + (k+1) = (k+1)(k+2)/2. Writing the target first matters because it gives every manipulation that follows a destination to aim at.',
      'The algebra is the heart of the step: group the sum as (1 + ⋯ + k) + (k+1), replace the bracket with k(k+1)/2 by the inductive hypothesis, then factor out (k+1), highlighted in the middle line, to land exactly on the goal. Domino k has knocked over domino k + 1.',
      'Answer: by induction, 1 + 2 + ⋯ + n = n(n+1)/2 for every positive integer n, and every domino is down. Spot check at n = 5: 1 + 2 + 3 + 4 + 5 = 15 and 5 · 6 / 2 = 15, so the formula agrees with a direct count.',
    ],
    checkpointAt: 3,
    checkpoint: 'Predict: after the bracket is replaced by k(k+1)/2, which factor will appear in both terms and factor out?',
    answerBanner: String.raw`Proved: \(1 + 2 + \cdots + n = \dfrac{n(n+1)}{2}\) for every positive integer \(n\) · check at \(n = 5\): \(1+2+3+4+5 = 15\) and \(\dfrac{5 \cdot 6}{2} = 15\) ✓`,
  };
  const EX_IND_ODD_SPEC = {
    claimTex: String.raw`1 + 3 + 5 + \cdots + (2n-1) = n^2`,
    baseHtml: String.raw`\(n = 1\): the left side is the first odd number, \(1\), and the right side is \(1^2 = 1\). The two sides agree, so \(P(1)\) is true.`,
    hypTex: String.raw`1 + 3 + \cdots + (2k-1) = k^2`,
    goalTex: String.raw`1 + 3 + \cdots + (2k-1) + (2k+1) = (k+1)^2`,
    algebraHtml: [
      String.raw`\((1 + 3 + \cdots + (2k-1)) + (2k+1) = k^2 + (2k+1)\) <span class="muted">[by the inductive hypothesis]</span>`,
      String.raw`\(= \)<span class="hl">\(k^2 + 2k + 1\)</span> <span class="muted">[add the terms: the new odd number contributes exactly \(2k + 1\)]</span>`,
      String.raw`\(= (k+1)^2\) — exactly the goal, because \((k+1)^2\) expands to \(k^2 + 2k + 1\), so \(P(k) \to P(k+1)\).`,
    ],
    captions: [
      'State the new claim as P(n): the sum of the first n odd numbers, 1 + 3 + 5 + ⋯ + (2n − 1), should equal n squared. The same two ingredients are needed as before: a base case to start the chain and an inductive step to extend it.',
      'The base case checks n = 1 directly: the sum of the first one odd number is 1, and the right side is 1 squared, which is also 1, so P(1) is true and the first domino has fallen.',
      'Next, the inductive hypothesis: assume P(k) is true for one fixed k ≥ 1, that is, 1 + 3 + ⋯ + (2k − 1) = k squared. We assume this line for a single k — domino k is falling — and use it to push the next domino over.',
      'Before doing any algebra, write out the goal for k + 1: the sum gains the next odd number, 2(k + 1) − 1 = 2k + 1, and the target value is (k + 1) squared. Writing the target first gives the algebra a destination to aim at.',
      'The algebra is the heart of the step: group the sum as (1 + 3 + ⋯ + (2k − 1)) + (2k + 1), replace the bracket with k squared by the inductive hypothesis, and the total becomes k squared + 2k + 1, which is exactly (k + 1) squared expanded. Domino k has knocked over domino k + 1.',
      'Answer: by induction, 1 + 3 + ⋯ + (2n − 1) = n squared for every positive integer n, and every domino is down. Spot check at n = 4: 1 + 3 + 5 + 7 = 16 and 4 squared = 16, so the formula agrees with a direct count.',
    ],
    checkpointAt: 3,
    checkpoint: 'Predict: adding the next odd number 2k + 1 to k squared — which perfect square does the total land on?',
    answerBanner: String.raw`Proved: \(1 + 3 + 5 + \cdots + (2n-1) = n^2\) for every positive integer \(n\) · check at \(n = 4\): \(1+3+5+7 = 16\) and \(4^2 = 16\) ✓`,
  };
  const EX_IND_DATA = indDataFor(EX_IND_SPEC);
  const EX_IND_ODD_DATA = indDataFor(EX_IND_ODD_SPEC);

  // ---- worked examples: irrationality by contradiction, built by one shared generator ----
  // Both presets run the same argument shape — assume a lowest-terms fraction, square, use a
  // divisibility lemma to push the prime d from a onto b, and contradict lowest terms. The spec
  // carries the prime d and the lemma's proof line, so sqrtStepsFor builds both presets' steps.
  function sqrtRowsFor(spec) {
    const d = spec.prime;
    return [
      { tag: 'The assumption', html: String.raw`Suppose, for contradiction, that \(\sqrt${d} = \dfrac{a}{b}\) for integers \(a, b\) with \(b \ne 0\), in <b>lowest terms</b>: \(a\) and \(b\) share no common factor bigger than \(1\).` },
      { tag: 'Square', html: String.raw`Squaring both sides and clearing the fraction: \(\;a^2 = ${d}b^2\). So \(a^2\) is a <b>multiple of ${d}</b>, because it is ${d} times the integer \(b^2\).` },
      { tag: spec.lemmaTag, html: spec.lemmaHtml },
      { tag: 'Substitute', html: spec.substHtml },
      { tag: 'Contradiction', warn: true, html: String.raw`By the same argument, ${d} divides \(b\) too. So \(a\) and \(b\) share the factor ${d}, which contradicts lowest terms.` },
      { tag: 'Conclusion', html: String.raw`The assumption was false, so no such fraction exists: \(\sqrt${d}\) is <b>irrational</b>. ∎` },
    ];
  }
  function sqrtStepsFor(spec) {
    return spec.captions.map((caption, i) => {
      const st = { lines: i + 1, caption };
      if (i === spec.checkpointAt) st.checkpoint = spec.checkpoint;
      if (i === spec.captions.length - 1) st.answer = true;
      return st;
    });
  }
  function sqrtDataFor(spec) {
    return {
      rows: sqrtRowsFor(spec), clashAt: 5, answerBanner: spec.answerBanner,
      clashHtml: spec.clashA,
      clashHtml2: spec.clashB,
      clashTail: `→ shared factor ${spec.prime}, contradicting lowest terms`,
    };
  }
  const EX_SQRT2_SPEC = {
    prime: 2,
    lemmaTag: 'Parity',
    lemmaHtml: String.raw`An odd number squared is odd: \((2m+1)^2 = 4m^2 + 4m + 1 = 2(2m^2 + 2m) + 1\). Since \(a^2\) is even, \(a\) itself is <b>even</b>.`,
    substHtml: String.raw`Write \(a = 2c\). Then \((2c)^2 = 2b^2\), so \(4c^2 = 2b^2\), and dividing by \(2\): \(\;b^2 = 2c^2\). Now \(b^2\) is even too.`,
    captions: [
      'For contradiction, suppose sqrt(2) = a/b for integers a and b, with the fraction in lowest terms, so a and b share no common factor bigger than 1. Naming the assumption precisely matters, because the contradiction at the end is aimed exactly at the words "lowest terms".',
      'Square both sides and clear the fraction: a squared equals 2 times b squared. That one equation is the engine of the proof, because it says a squared is even — it is 2 times the integer b squared.',
      'So a itself is even. The reason is parity: the square of an odd number is odd, since (2m + 1) squared expands to 4m squared plus 4m plus 1, so an even square cannot come from an odd number.',
      'Since a is even, write a = 2c and substitute: (2c) squared = 2 b squared gives 4 c squared = 2 b squared, and dividing by 2 gives b squared = 2 c squared. The same evenness has now moved from a over to b.',
      'By the same parity argument, b is even too. But then a and b share the factor 2, which directly contradicts the lowest-terms assumption the proof started with — that clash is the point of the whole argument.',
      'Answer: sqrt(2) is irrational — the assumption collapses. The logic is proof by contradiction: a lowest-terms fraction forced both a and b to be even forever, an infinite descent that no lowest-terms fraction can survive, and every step used only lowest terms and basic parity.',
    ],
    clashA: String.raw`\(a\) is <b>even</b>`,
    clashB: String.raw`\(b\) is <b>even</b>`,
    checkpointAt: 1,
    checkpoint: 'Predict: a squared is even — does that force a itself to be even, or could an odd a have an even square?',
    answerBanner: String.raw`Answer: \(\sqrt2\) is irrational — the check: \(a^2 = 2b^2\) forced \(a\) and \(b\) both even, contradicting lowest terms, so no such fraction exists ✓`,
  };
  const EX_SQRT3_SPEC = {
    prime: 3,
    lemmaTag: 'Divisibility',
    lemmaHtml: String.raw`Split \(a\) into cases by its remainder on division by \(3\). If the remainder is \(1\) or \(2\), then \(a^2\) leaves remainder \(1\) (since \(1^2 = 1\) and \(2^2 = 4 = 3 + 1\)), so \(3\) does <b>not</b> divide \(a^2\). But \(3\) does divide \(a^2\) here, so the remainder must be \(0\): \(3\) <b>divides</b> \(a\).`,
    substHtml: String.raw`Write \(a = 3c\). Then \((3c)^2 = 3b^2\), so \(9c^2 = 3b^2\), and dividing by \(3\): \(\;b^2 = 3c^2\). Now \(3\) divides \(b^2\) too.`,
    captions: [
      'For contradiction, suppose sqrt(3) = a/b for integers a and b, with the fraction in lowest terms, so a and b share no common factor bigger than 1. The argument follows the sqrt(2) proof line for line, with the prime 3 in the role that 2 played before.',
      'Square both sides and clear the fraction: a squared equals 3 times b squared. That one equation is the engine of the proof, because it says 3 divides a squared — it is 3 times the integer b squared.',
      'So 3 divides a itself. The reason is a proof by cases on the remainder of a mod 3: remainders 1 and 2 both square to remainder 1, never 0, so a square divisible by 3 can only come from a number divisible by 3.',
      'Since 3 divides a, write a = 3c and substitute: (3c) squared = 3 b squared gives 9 c squared = 3 b squared, and dividing by 3 gives b squared = 3 c squared. The same divisibility has now moved from a over to b.',
      'By the same cases argument, 3 divides b too. But then a and b share the factor 3, which directly contradicts the lowest-terms assumption the proof started with — that clash is the point of the whole argument.',
      'Answer: sqrt(3) is irrational — the assumption collapses. The logic is proof by contradiction: a lowest-terms fraction forced both a and b to be multiples of 3 forever, an infinite descent that no lowest-terms fraction can survive, and every step used only lowest terms and remainders mod 3.',
    ],
    clashA: String.raw`\(a\) is a <b>multiple of 3</b>`,
    clashB: String.raw`\(b\) is a <b>multiple of 3</b>`,
    checkpointAt: 1,
    checkpoint: 'Predict: 3 divides a squared — does that force 3 to divide a itself, or could a number dodge the factor 3 while its square cannot?',
    answerBanner: String.raw`Answer: \(\sqrt3\) is irrational — the check: \(a^2 = 3b^2\) forced \(3\) to divide both \(a\) and \(b\), contradicting lowest terms, so no such fraction exists ✓`,
  };
  const EX_SQRT_DATA = sqrtDataFor(EX_SQRT2_SPEC);
  const EX_SQRT3_DATA = sqrtDataFor(EX_SQRT3_SPEC);

  // ---- worked examples B: direct, contrapositive and strong-induction proofs ----
  // All three share one zipper: a spec carries proof rows (tag + html) and captions, and pStepsFor
  // reveals one row per step. The direct and contrapositive specs are built by generators from
  // their parity case, so each variant's rows, algebra and spot checks are computed from its own
  // case rather than copied from the primary's.
  function pStepsFor(spec) {
    return spec.caps.map((caption, i) => {
      const st = { lines: i + 1, caption };
      if (i === spec.cp) st.checkpoint = spec.cq;
      if (i === spec.caps.length - 1) st.answer = true;
      return st;
    });
  }
  const pDataFor = (spec) => ({ rows: spec.rows, banner: spec.banner });
  function rowDraw(fallback) {
    return (stage, ctx, step, k, preset) => {
      const D = (preset && preset.data) || fallback;
      const { h } = ctx;
      const rows = D.rows.slice(0, step.lines).map((r, i) => h('div',
        { style: { display: 'flex', gap: '0.6rem', width: '100%', padding: '0.28rem 0.55rem', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', background: i === step.lines - 1 ? 'var(--accent-2)' : 'var(--sheet)', fontSize: '0.84rem', lineHeight: 1.4, textAlign: 'left' } },
        h('span.tiny.mono.muted', { style: { flex: '0 0 7.6rem', paddingTop: '0.15rem' } }, r[0].toUpperCase()),
        h('span', { style: { flex: '1 1 auto', minWidth: 0 }, html: r[1] })));
      stage.append(h('div.stack', { style: { gap: '0.4rem', width: '100%', maxWidth: '46rem', alignItems: 'center' } },
        h('div.stack', { style: { gap: '0.25rem', width: '100%' } }, rows),
        step.answer ? h('div.ex-answer', { html: D.banner }) : null));
    };
  }

  // (c) Direct proof: two integers of the same stated parity add to an even integer.
  function dirSpec(odd) {
    const w = odd ? 'odd' : 'even';
    const fm = odd ? '2a + 1' : '2a', fn = odd ? '2b + 1' : '2b';
    const raw = odd ? '2a + 2b + 2' : '2a + 2b', inner = odd ? 'a + b + 1' : 'a + b';
    const [sm, sn] = odd ? [5, 7] : [6, 10];
    return {
      rows: [
        ['The claim', String.raw`For integers \(m\) and \(n\): if both are ${w}, then \(m + n\) is even. A <b>direct proof</b> assumes the hypothesis and reasons forward to the conclusion, justifying each inference.`],
        ['Assume', String.raw`Let \(m\) and \(n\) be ${w} integers. <span class="muted">[Given: the hypothesis of the claim]</span>`],
        ['Definition', String.raw`\(m = ${fm}\) and \(n = ${fn}\) for some integers \(a\) and \(b\). <span class="muted">[Unpack the definition of ${w}]</span>`],
        ['Algebra', String.raw`\(m + n = (${fm}) + (${fn}) = ${raw}\). <span class="muted">[Substitute, then collect like terms]</span>`],
        ['Factor', String.raw`\(m + n = 2(${inner})\). <span class="muted">[Factor out the common factor \(2\)]</span>`],
        ['Conclusion', String.raw`\(${inner}\) is an integer, since sums of integers are integers, so \(m + n\) is \(2\) times an integer: \(m + n\) is <b>even</b>. ∎ <span class="muted">[Pack the definition of even back up]</span>`],
      ],
      caps: [
        `A direct proof starts from the hypothesis and moves forward, one justified inference at a time, until it reaches the conclusion. The claim here is that two ${w} integers always add to an even integer, and nothing about the conclusion may be assumed along the way.`,
        `Assume the hypothesis: m and n are both ${w} integers. A direct proof is allowed to use exactly this and nothing more, so every later line must be earned from this assumption, from a definition, or from algebra.`,
        `Unpack the definition of ${w}: write m = ${fm} and n = ${fn} for some integers a and b. This inference gives the proof something to compute with, because it turns a word, ${w}, into an equation.`,
        `Add the two forms and collect like terms: m + n = ${raw}. The right side still shows the structure of the two ${w} inputs, and the total is now one factoring step away from the shape that the definition of even asks for.`,
        `Factor out the common factor 2 to get m + n = 2(${inner}). This is the key inference of the proof, because it rewrites the sum in exactly the form two times something, which is what the word even means.`,
        `Answer: ${inner} is an integer by closure of the integers under addition, so m + n is two times an integer and is even, which completes the direct proof. Spot check: ${sm} + ${sn} = ${sm + sn}, and ${sm + sn} is two times ${(sm + sn) / 2}, so it is even.`,
      ],
      cp: 2,
      cq: odd
        ? 'Predict: adding (2a + 1) and (2b + 1), what do the two constant terms 1 + 1 contribute to the sum?'
        : 'Predict: adding 2a and 2b, will the sum have any constant term, or will every term carry a factor of 2?',
      banner: String.raw`Proved directly: if \(m\) and \(n\) are ${w}, then \(m + n\) is even · check: ${sm} + ${sn} = ${sm + sn} = 2 \cdot ${(sm + sn) / 2} ✓`,
    };
  }
  function dirVerify(odd) {
    return () => {
      for (let a = -30; a <= 30; a++) for (let b = -30; b <= 30; b++) {
        const m = odd ? 2 * a + 1 : 2 * a, n = odd ? 2 * b + 1 : 2 * b;
        if ((m + n) % 2 !== 0) return false;
        if (m + n !== 2 * (odd ? a + b + 1 : a + b)) return false;
      }
      return true;
    };
  }
  const EX_DIR_SPEC = dirSpec(true), EX_DIR_EVEN_SPEC = dirSpec(false);
  const EX_DIR_DATA = pDataFor(EX_DIR_SPEC), EX_DIR_EVEN_DATA = pDataFor(EX_DIR_EVEN_SPEC);

  // (d) Contrapositive: the parity of n squared forces the parity of n, proved via the flipped claim.
  function contraSpec(evenCase) {
    const hypW = evenCase ? 'even' : 'odd', negW = evenCase ? 'odd' : 'even';
    const form = evenCase ? '2k + 1' : '2k';
    const sqTex = evenCase ? String.raw`(2k + 1)^2 = 4k^2 + 4k + 1` : String.raw`(2k)^2 = 4k^2`;
    const resTex = evenCase ? String.raw`2(2k^2 + 2k) + 1` : String.raw`2(2k^2)`;
    const spotN = evenCase ? 5 : 6, spotSq = spotN * spotN;
    return {
      rows: [
        ['The claim', String.raw`For every integer \(n\): if \(n^2\) is ${hypW}, then \(n\) is ${hypW}. Call the hypothesis \(p\) and the conclusion \(q\), so the claim is \(p \to q\). Proving \(p\) directly is awkward, because a square gives little to work with.`],
        ['Negate both', String.raw`Negate each part: \(\neg q\) says \(n\) is <b>not</b> ${hypW}, that is, \(n\) is ${negW}; and \(\neg p\) says \(n^2\) is <b>not</b> ${hypW}, that is, \(n^2\) is ${negW}. Negating flips even to odd and odd to even.`],
        ['Swap', String.raw`Swap the negated parts to form the <b>contrapositive</b> \(\neg q \to \neg p\): if \(n\) is ${negW}, then \(n^2\) is ${negW}. A conditional and its contrapositive are equivalent, so proving this one proves the claim.`],
        ['Assume', String.raw`Suppose \(n\) is ${negW}, so \(n = ${form}\) for some integer \(k\). <span class="muted">[The definition of ${negW}, applied to the new hypothesis]</span>`],
        ['Algebra', String.raw`\(n^2 = ${sqTex} = ${resTex}\). <span class="muted">[Square, then group the result into the shape that defines ${negW}; the grouped coefficient is an integer by closure]</span>`],
        ['Equivalence', String.raw`So \(n^2\) is ${negW}: the contrapositive \(\neg q \to \neg p\) holds. Because \(p \to q \equiv \neg q \to \neg p\), the original claim holds too: if \(n^2\) is ${hypW}, then \(n\) is ${hypW}. ∎`],
      ],
      caps: [
        `State the claim as p implies q, with p the statement that n squared is ${hypW} and q the statement that n is ${hypW}. A direct attack stalls here, because knowing a square is ${hypW} hands us no equation for n itself to compute with.`,
        `Forming a contrapositive takes two separate moves, and this step does the first one: negate both parts. The negation of the conclusion says n is ${negW}, and the negation of the hypothesis says n squared is ${negW}.`,
        `The second move is to swap the negated parts, giving the contrapositive: if n is ${negW}, then n squared is ${negW}. This new claim is friendlier, because its hypothesis is about n itself, and a conditional is equivalent to its contrapositive.`,
        `Now prove the contrapositive directly: suppose n is ${negW} and write n = ${form} for some integer k, using the definition of ${negW}. Just as in a direct proof, unpacking the definition turns a word into an equation we can compute with.`,
        `Square both sides: n squared works out to the grouped form shown in this row, which has exactly the shape that defines ${negW}, since the grouped coefficient is an integer. So the square of a ${negW} integer is ${negW}, and the contrapositive is proved.`,
        `Answer: because a conditional and its contrapositive are equivalent, proving the contrapositive proves the original claim: whenever n squared is ${hypW}, n itself is ${hypW}. Spot check the contrapositive at n = ${spotN}: n is ${negW} and n squared is ${spotSq}, which is ${negW} too.`,
      ],
      cp: 1,
      cq: `Predict: after both parts are negated, the contrapositive starts by assuming which one — that n is ${negW}, or that n squared is ${negW}?`,
      banner: String.raw`Proved by contrapositive: if \(n^2\) is ${hypW} then \(n\) is ${hypW} · check: \(n = ${spotN}\) is ${negW} and \(n^2 = ${spotSq}\) is ${negW} ✓`,
    };
  }
  function contraVerify(evenCase) {
    return () => {
      for (let n = -60; n <= 60; n++) {
        const sqE = (n * n) % 2 === 0, nE = n % 2 === 0;
        const orig = evenCase ? (!sqE || nE) : (sqE || !nE);
        const contra = evenCase ? (nE || !sqE) : (!nE || sqE);
        if (!orig || !contra) return false;
      }
      for (let k = -60; k <= 60; k++) {
        if (evenCase ? (2 * k + 1) ** 2 !== 2 * (2 * k * k + 2 * k) + 1 : (2 * k) ** 2 !== 2 * (2 * k * k)) return false;
      }
      return true;
    };
  }
  const EX_CON_SPEC = contraSpec(true), EX_CON_ODD_SPEC = contraSpec(false);
  const EX_CON_DATA = pDataFor(EX_CON_SPEC), EX_CON_ODD_DATA = pDataFor(EX_CON_ODD_SPEC);

  // (e) Strong induction: prime factorization (primary) and postage stamps (variant).
  const EX_STR_PRIME_SPEC = {
    rows: [
      ['The claim', String.raw`\(P(n)\): every integer \(n \ge 2\) is a <b>product of primes</b>, where a prime itself counts as a product of one prime. Euclid's proof that there are infinitely many primes uses this claim, so it is worth proving carefully.`],
      ['Base case', String.raw`\(P(2)\): \(2\) is prime, so it is already a product of primes with a single factor. The chain starts here.`],
      ['Strong hypothesis', String.raw`Fix \(k \ge 2\) and assume \(P(2), P(3), \ldots, P(k)\) are <b>all</b> true at once: every integer from \(2\) through \(k\) is a product of primes. Ordinary induction would assume only the single case \(P(k)\).`],
      ['Split k + 1', String.raw`Consider \(k + 1\). If it is prime, \(P(k+1)\) is immediate. Otherwise \(k + 1 = ab\) with \(2 \le a, b \le k\). Example: \(36 = 4 \cdot 9\), and neither factor is \(k = 35\): the factors are earlier cases, but not the single predecessor.`],
      ['Apply it', String.raw`By the strong hypothesis, \(a\) is a product of primes and \(b\) is a product of primes: say \(a = p_1 \cdots p_r\) and \(b = q_1 \cdots q_s\). Neither application was to \(k\) itself, which is exactly the gap ordinary induction cannot cross.`],
      ['Conclusion', String.raw`Multiply the two products: \(k + 1 = ab = p_1 \cdots p_r \, q_1 \cdots q_s\), a product of primes. So \(P(k+1)\) holds, and by strong induction \(P(n)\) holds for every \(n \ge 2\). ∎`],
    ],
    caps: [
      'State the claim P(n): every integer n from 2 on is a product of primes, counting a prime as a product with one factor. This is the canonical strong-induction statement, because the step will split a number into pieces that ordinary induction cannot reach.',
      'The base case is P(2): 2 is prime, so it is a product of primes with a single factor. Every induction needs its chain anchored somewhere, and here the anchor is the smallest integer the claim covers.',
      'The strong hypothesis assumes P(2) through P(k) all at once, for one fixed k: every integer from 2 through k is already known to be a product of primes. Holding all of those cases at once, not just P(k), is what makes this induction strong.',
      'Consider k + 1. If it is prime we are done at once; if it is composite it splits as k + 1 = ab with both factors between 2 and k. The example 36 = 4 times 9 shows the point: the factors are earlier cases scattered below k, and neither one is the predecessor k itself.',
      'Apply the strong hypothesis to each factor separately: a is a product of primes and b is a product of primes. Ordinary induction could not do this step, because its only assumption, P(k), says nothing at all about a or about b.',
      'Answer: multiplying the two prime products gives a prime product for k + 1, so P(k + 1) holds and strong induction proves the claim for every n from 2 on. Spot check: 60 = 2 times 2 times 3 times 5, and those factors multiply back to 60.',
    ],
    cp: 2,
    cq: 'Predict: if k + 1 splits as a times b, will a and b be the predecessor k itself, or smaller cases scattered somewhere below k?',
    banner: String.raw`Proved by strong induction: every integer \(n \ge 2\) is a product of primes · check: \(60 = 2 \cdot 2 \cdot 3 \cdot 5\) and \(2 \cdot 2 \cdot 3 \cdot 5 = 60\) ✓`,
  };
  const EX_STR_POST_SPEC = {
    rows: [
      ['The claim', String.raw`\(P(n)\): every amount of \(n \ge 12\) cents can be paid exactly with \(4\)¢ and \(5\)¢ stamps. Amounts below \(12\) are not claimed: \(11\)¢ cannot be paid at all.`],
      ['Base cases', String.raw`Four base cases, paid by hand: \(12 = 4 + 4 + 4\), \(13 = 4 + 4 + 5\), \(14 = 4 + 5 + 5\) and \(15 = 5 + 5 + 5\). Four are needed because the step below reaches back \(4\) cents.`],
      ['Strong hypothesis', String.raw`Fix \(k \ge 15\) and assume \(P(12), P(13), \ldots, P(k)\) are <b>all</b> true at once: every amount from \(12\) through \(k\) cents can already be paid. Ordinary induction would assume only the single case \(P(k)\).`],
      ['Reach back', String.raw`To pay \(k + 1 \ge 16\) cents, first pay \(k + 1 - 4\) cents and then add one \(4\)¢ stamp. Note \(k + 1 - 4 = k - 3\), which is still at least \(12\), but it is not \(k\): the step needs an earlier case, not the predecessor.`],
      ['Apply it', String.raw`By the strong hypothesis, \(k - 3\) cents can be paid, since \(12 \le k - 3 \le k\). Add one \(4\)¢ stamp to that payment and the total is \(k - 3 + 4 = k + 1\) cents, paid exactly.`],
      ['Conclusion', String.raw`So \(P(k+1)\) holds, and by strong induction every amount of \(12\) cents or more can be paid. Example chain: \(23 \to 19 \to 15\), a base case, so \(23 = 4 + 4 + 5 + 5 + 5\). ∎`],
    ],
    caps: [
      'State the claim P(n): every amount of n cents, from 12 cents on, can be paid exactly using only 4-cent and 5-cent stamps. The threshold matters, because 11 cents cannot be paid at all, so the claim would be false if it started any lower.',
      'Four base cases are checked by hand: 12, 13, 14 and 15 cents, each written out as an explicit mix of stamps. Four bases are needed because the inductive step will reach back 4 cents, so every amount within 4 of the start must be anchored directly.',
      'The strong hypothesis assumes P(12) through P(k) all at once, for one fixed k of at least 15: every amount from 12 through k cents can already be paid. Holding all of those cases, not just P(k), is what makes this induction strong.',
      'To pay k + 1 cents, peel off one 4-cent stamp and pay the remaining k + 1 minus 4, which is k minus 3 cents. That amount is still at least 12, so it is inside the assumed range, but it is not the predecessor k that ordinary induction would offer.',
      'Apply the strong hypothesis to k minus 3 cents: it can be paid, and adding one 4-cent stamp to that payment pays k + 1 cents exactly. The strong hypothesis is doing real work here, because the case used sits three steps below the predecessor.',
      'Answer: the step carries every amount past the four base cases, so strong induction proves that every amount of 12 cents or more can be paid. Spot check: 23 cents reduces 23 to 19 to 15, a base case, giving 23 = 4 + 4 + 5 + 5 + 5.',
    ],
    cp: 2,
    cq: 'Predict: the step pays k + 1 cents by reaching back to which amount — k itself, or k + 1 with one 4-cent stamp removed?',
    banner: String.raw`Proved by strong induction: every amount \(\ge 12\)¢ can be paid with \(4\)¢ and \(5\)¢ stamps · check: \(23 = 4 + 4 + 5 + 5 + 5 = 23\) ✓`,
  };
  function primeVerify() {
    return () => {
      for (let n = 2; n <= 150; n++) {
        let x = n, prod = 1;
        while (x > 1) { const f = smallestFactor(x); if (!isPrime(f)) return false; prod *= f; x /= f; }
        if (prod !== n) return false;
      }
      return true;
    };
  }
  function postVerify() {
    return () => {
      for (let n = 12; n <= 240; n++) {
        let ok = false;
        for (let a = 0; 4 * a <= n && !ok; a++) if ((n - 4 * a) % 5 === 0) ok = true;
        if (!ok) return false;
      }
      return true;
    };
  }
  const EX_STR_DATA = pDataFor(EX_STR_PRIME_SPEC), EX_STR_POST_DATA = pDataFor(EX_STR_POST_SPEC);

  DM.module({
    id: 'proofs',
    num: 3,
    title: 'Proof Techniques',
    objectives: [2, 3],
    terms: {
      'proof': 'A chain of statements, each a hypothesis, an axiom, a definition, an earlier result, or a consequence of earlier statements by a rule of logic, ending with the claim being proved.',
      'axiom': 'A statement accepted without proof as a starting point, such as "the sum of two integers is an integer".',
      'theorem': 'A statement that has been proved. A lemma is a smaller theorem proved to help prove a bigger one.',
      'conjecture': 'A statement believed to be true but not yet proved, such as Goldbach\'s conjecture.',
      'rule of inference': 'A short valid argument form, such as modus ponens, that may be used as one step of a proof.',
      'valid argument': 'An argument whose conclusion is true in every case where all its premises are true. Equivalently, (premises) → conclusion is a tautology.',
      'modus ponens': 'From p → q and p, conclude q.',
      'modus tollens': 'From p → q and ¬q, conclude ¬p.',
      'fallacy': 'An invalid argument form that looks convincing, such as affirming the consequent (p → q, q, so p).',
      'direct proof': 'To prove p → q, assume p and reason step by step to q.',
      'proof by contrapositive': 'To prove p → q, prove the equivalent statement ¬q → ¬p instead.',
      'proof by contradiction': 'Assume the statement is false and derive something impossible; then the statement must be true.',
      'proof by cases': 'Split the situation into cases that together cover every possibility, and prove the statement in each case.',
      'counterexample': 'A single example that makes a universal statement false. One counterexample disproves "for all x, P(x)".',
      'mathematical induction': 'To prove P(n) for all n ≥ n₀: prove the base case P(n₀), and prove P(k) → P(k+1) for every k ≥ n₀.',
      'inductive hypothesis': 'The assumption, made inside the inductive step, that P(k) is true for one arbitrary k.',
      'strong induction': 'A form of induction whose inductive step may assume P(n₀), P(n₀+1), …, P(k) all at once to prove P(k+1).',
      'well-ordering principle': 'Every nonempty set of nonnegative integers has a smallest element. It is equivalent to induction.',
      'loop invariant': 'A statement about a loop\'s variables that is true before the loop starts and stays true after every iteration.',
      'lemma': 'A smaller theorem proved mainly to help prove a bigger one.',
    },
    symbols: [
      ['∴', 'therefore', 'p → q, p ∴ q'],
      ['∎', 'end of proof (QED)', '…so m + n is even. ∎'],
      ['a ∣ b', 'a divides b', '3 ∣ 12'],
      ['n₀', 'the first value in an induction', 'n₀ = 1'],
      ['P(k) → P(k+1)', 'the inductive step', 'from n = k to n = k + 1'],
      ['∑', 'sum of terms', '∑ᵢ₌₁ⁿ i = n(n + 1)/2'],
    ],
    css: `
      .pf-rules { display: flex; flex-direction: column; gap: 0.22rem; min-height: 0; }
      .pf-rules button { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.5rem; align-items: baseline; text-align: left; border: 1px solid var(--rule); background: var(--sheet); border-radius: var(--radius); padding: 0.22rem 0.55rem; cursor: pointer; font-size: 0.84rem; color: var(--ink); }
      .pf-rules button .fm { font-size: 0.82rem; color: var(--ink-2); }
      .pf-rules button.on { border-color: var(--accent); background: var(--accent-2); }
      .pf-rules button.fal .nm { color: var(--false); }
      .pf-arg { display: inline-flex; flex-direction: column; gap: 0.1rem; min-width: 8rem; padding-right: 1rem; }
      .pf-arg hr { width: 100%; border: 0; border-top: 1.5px solid var(--ink); margin: 0.15rem 0; }
      .pf-tt { font-size: 0.86rem; }
      .pf-tt th, .pf-tt td { padding: 0.12rem 0.55rem; }
      .pf-tt.dense th, .pf-tt.dense td { padding: 0.04rem 0.5rem; }
      .pf-tt tr.dim td { opacity: 0.45; }
      .pf-tt tr.crit td { background: var(--true-bg); }
      .pf-tt tr.cex td { background: var(--false-bg); }
      .pf-tt th.c, .pf-tt td.c { border-left: 2px solid var(--ink-3); }
      .pf-badge { display: inline-block; font-family: var(--font-mono); font-size: 0.76rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; border-radius: 0.3rem; padding: 0.1rem 0.5rem; }
      .pf-badge.t { background: var(--true-bg); color: var(--true); }
      .pf-badge.f { background: var(--false-bg); color: var(--false); }
      .pf-badge.n { background: var(--warn-bg); color: var(--warn); }
      .pf-pool { display: flex; flex-direction: column; gap: 0.3rem; min-height: 0; }
      .pf-pool button { text-align: left; border: 1px dashed var(--ink-3); background: var(--sheet); border-radius: var(--radius); padding: 0.28rem 0.55rem; cursor: pointer; font-size: 0.84rem; line-height: 1.35; color: var(--ink); }
      .pf-pool button:hover { border-color: var(--accent); background: var(--accent-2); }
      .pf-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
      .pf-steps li { display: grid; grid-template-columns: 1.3rem minmax(0, 1fr) 8.8rem auto; gap: 0.4rem; align-items: center; margin: 0; border: 1px solid var(--rule); border-radius: var(--radius); background: var(--sheet); padding: 0.22rem 0.4rem; font-size: 0.84rem; line-height: 1.35; }
      .pf-steps li .n { font-family: var(--font-mono); color: var(--ink-3); text-align: right; }
      .pf-steps li select { font-size: 0.76rem; padding: 0.1rem 0.25rem; width: 100%; }
      .pf-steps li.ok { border-color: var(--true); background: var(--true-bg); }
      .pf-steps li.bad { border-color: var(--false); background: var(--false-bg); }
      .pf-steps li .note { grid-column: 2 / -1; font-size: 0.76rem; color: var(--false); }
      .pf-steps li .btn { padding: 0 0.35rem; font-size: 0.74rem; }
      .pf-steps li .tag { font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600; color: var(--false); white-space: nowrap; margin-right: 0.15rem; }
      .pf-dom text { font-family: var(--font-mono); }
      .pf-dom .domino { transform-box: fill-box; transform-origin: 100% 100%; transition: transform 0.28s ease-in; }
      .pf-dom .domino.down { transform: rotate(68deg); }
      .pf-dom .gap { cursor: pointer; outline: none; }
      .pf-dom .gap:focus-visible { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 4 3; }
      .pf-algebra { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.15rem 0.8rem; align-items: baseline; font-size: 0.9rem; }
      .pf-algebra .pf-why { font-size: 0.78rem; color: var(--ink-2); }
      .pf-grid rect { cursor: pointer; }
      .pf-stamps { display: flex; flex-wrap: wrap; gap: 0.25rem; }
      .pf-stamp { display: inline-grid; place-items: center; width: 2rem; height: 2.3rem; border: 2px dashed var(--accent); border-radius: 0.2rem; font-family: var(--font-mono); font-weight: 700; font-size: 0.9rem; background: var(--accent-2); color: var(--ink); }
      .pf-stamp.five { border-color: var(--fnc); }
      .pf-code { margin: 0; padding: 0.45rem 0.7rem; font-size: 0.82rem; line-height: 1.5; background: var(--code-bg); border: 1px solid var(--rule); border-radius: 0.4rem; white-space: pre; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'What a proof is, and how to read one',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">proof</span> is a chain of statements. Each one is a hypothesis, an <span class="term">axiom</span>, a definition, an earlier result, or follows from earlier statements by a rule of logic. The last statement is the claim being proved.<div class="eg">Claim: 10 is even. (1) \(10 = 2 \cdot 5\), by arithmetic. (2) 5 is an integer, so by the definition of even (\(n = 2k\)), 10 is even. ∎</div></div>
              <table class="data small">
                <tbody>
                  <tr><td><b>Axiom</b></td><td>Accepted without proof, such as: the sum and the product of two integers are integers.</td></tr>
                  <tr><td><b>Definition</b></td><td>The exact meaning of a word, such as: an integer \(n\) is even if \(n = 2k\) for some integer \(k\).</td></tr>
                  <tr><td><b><span class="term">Theorem</span></b></td><td>An important statement that has been proved.</td></tr>
                  <tr><td><b><span class="term">Lemma</span></b></td><td>A smaller theorem proved to help prove a bigger one.</td></tr>
                  <tr><td><b><span class="term">Conjecture</span></b></td><td>Believed true, but not yet proved.</td></tr>
                </tbody>
              </table>
              <div class="ai">Proof assistants such as Lean check every step of a proof by machine. AI systems now write Lean proofs, and once Lean accepts one it can be trusted, even though the AI that wrote it sometimes errs.</div>
            </div>
            <div class="stack">
              <div class="card small">
                <h3>Definitions this module uses</h3>
                <ul style="margin:0.2rem 0 0">
                  <li>\(n\) is <b>even</b> if \(n = 2k\), and <b>odd</b> if \(n = 2k + 1\), for some integer \(k\).</li>
                  <li>\(a\) <b>divides</b> \(b\), written \(a \mid b\), if \(b = ak\) for some integer \(k\).</li>
                  <li>An integer \(p \gt 1\) is <b>prime</b> if its only positive divisors are 1 and \(p\).</li>
                  <li>\(r\) is <b>rational</b> if \(r = a/b\) for integers \(a, b\) with \(b \ne 0\).</li>
                </ul>
              </div>
              <div class="tip" data-label="How to read and write a proof"><b>Reading:</b> find the hypothesis and the conclusion, then check that each line follows from earlier ones. <b>Writing:</b> state your assumption ("Suppose…"), turn definitions into algebra, justify every step, signpost ("so", "Case 1"), and end by naming what you proved, marked ∎.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Lab: rules of inference and fallacies',
        kind: 'lab',
        html: String.raw`<div class="def" style="padding:0.4rem 0.8rem">An argument is <span class="term" data-term="valid argument">valid</span> when its conclusion is true in <i>every</i> row where all its premises are true. A <span class="term">rule of inference</span> is a small valid argument you may use as one step of a proof. Pick a rule: rows with every premise true are shaded, and a red row is a counterexample.<div class="eg">"If it is Monday, I have class. It is Monday. So I have class." is valid, and its pattern is the rule called modus ponens.</div></div>`,
        render(body, ctx) {
          const { h } = ctx;
          let ri = 0;
          let customP = 'p ∨ q, p → r, q → r', customC = 'r';
          const list = h('div.pf-rules');
          RULES.forEach((r, i) => {
            const b = h('button', { class: r.fallacy ? 'fal' : '', onclick: () => { ri = i; draw(); } }, h('span.nm', r.name), r.custom ? h('span.fm', 'type it') : h('span.fm', { html: `\\(${r.prem.map((x) => toTex(parse(x))).join(',\\ ')} \\ \\therefore\\ ${toTex(parse(r.concl))}\\)` }));
            ctx.tex(b);
            list.append(b);
          });
          const right = h('div.stack', { style: { gap: '0.5rem', minHeight: 0 } });
          const inP = h('input.inp.mono', { value: customP, 'aria-label': 'Premises separated by commas', spellcheck: 'false', style: { width: '100%' } });
          const inC = h('input.inp.mono', { value: customC, 'aria-label': 'Conclusion', spellcheck: 'false', style: { width: '100%' } });
          inP.addEventListener('input', () => { customP = inP.value; draw(); });
          inC.addEventListener('input', () => { customC = inC.value; draw(); });
          const customBox = h('div.split', { style: { gap: '0.5rem' } }, h('label.field', 'Premises, separated by commas', inP), h('label.field', 'Conclusion', inC));
          body.append(h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.55fr)' } }, list, right));
          function draw() {
            const r = RULES[ri];
            [...list.children].forEach((b, i) => b.classList.toggle('on', i === ri));
            let prem, concl, err = null;
            if (r.custom) {
              try { prem = customP.split(/[,;]/).map((x) => x.trim()).filter(Boolean).map(parse); concl = parse(customC); if (!prem.length) throw new Error('Type at least one premise.'); }
              catch (e) { err = e.message; }
            } else { prem = r.prem.map(parse); concl = parse(r.concl); }
            if (err) { ctx.rc(right, customBox, h('div.feedback.bad', err)); return; }
            const vars = varsOf([...prem, concl]);
            const envs = assignments(vars);
            const crit = envs.filter((e) => prem.every((p) => ev(p, e)));
            const bad = crit.find((e) => !ev(concl, e));
            const arg = h('div.pf-arg', { html: prem.map((p) => `<div>\\(${toTex(p)}\\)</div>`).join('') + `<hr><div>\\(\\therefore\\ ${toTex(concl)}\\)</div>` });
            const example = r.custom ? null : h('div.small', { style: { borderLeft: '2px solid var(--rule)', paddingLeft: '0.8rem' } }, ...r.en.map((x) => h('div', x)), h('div', { style: { borderTop: '1.5px solid var(--ink-3)', marginTop: '0.15rem', paddingTop: '0.1rem' } }, '∴ ' + r.enC));
            const table = h('table.tt.pf-tt', { class: envs.length > 4 ? 'dense' : '' },
              h('thead', h('tr', vars.map((v) => h('th', { html: `\\(${v}\\)` })), prem.map((p, i) => h('th', { html: `P${i + 1}: \\(${toTex(p)}\\)` })), h('th.c', { html: `C: \\(${toTex(concl)}\\)` }))),
              h('tbody', envs.map((e) => {
                const all = prem.every((p) => ev(p, e));
                return h('tr', { class: !all ? 'dim' : ev(concl, e) ? 'crit' : 'cex' }, vars.map((v) => h('td', { html: tf(e[v]) })), prem.map((p) => h('td', { html: tf(ev(p, e)) })), h('td.c', { html: tf(ev(concl, e)) }));
              })));
            const valid = !bad;
            const envTxt = (e) => vars.map((v) => `${v} = ${L(e[v])}`).join(', ');
            const verdict = !crit.length
              ? 'Valid, but only vacuously: no row makes every premise true, because the premises contradict each other. From contradictory premises anything follows, which is why consistent assumptions matter.'
              : valid
                ? `${crit.length} row${crit.length > 1 ? 's make' : ' makes'} every premise true (shaded), and the conclusion is true in ${crit.length > 1 ? 'each of them' : 'it'}. So (${prem.map((_, i) => `P${i + 1}`).join(' ∧ ')}) → C is a tautology.`
                : `In the row ${envTxt(bad)}, every premise is true but the conclusion is false. That single row is a counterexample, so the argument form is invalid.`;
            ctx.rc(right,
              r.custom ? customBox : null,
              r.custom ? null : h('div.row', { style: { alignItems: 'flex-start', gap: '0.8rem', flexWrap: 'nowrap' } }, arg, example),
              h('div.row', { style: { gap: '0.5rem' } }, h('span.pf-badge', { class: valid ? 't' : 'f' }, valid ? 'valid' : 'invalid'), h('b', r.custom ? 'Your argument' : r.name)),
              table,
              h('div.small', verdict),
              r.note ? h('div.small.muted', r.note) : h('div.small.muted', 'The default is proof by cases: from p ∨ q, p → r and q → r, conclude r. Change it, for example drop a premise, and watch validity change.'));
            ctx.tex(right);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Direct proof, contrapositive, and contradiction',
        kind: 'concept',
        html: String.raw`
          <p>Three ways to prove a statement. Each card gives the plan and one complete example.</p>
          <div class="cols-3 stretch">
            <div class="card small stack" style="gap:0.4rem">
              <h3><span class="term">Direct proof</span></h3>
              <p>To prove \(p \to q\): assume \(p\), then reason forward until you reach \(q\).</p>
              <div class="ex"><b>Claim.</b> If \(m\) and \(n\) are odd, then \(m + n\) is even.<br><b>Proof.</b> Write \(m = 2a + 1\) and \(n = 2b + 1\) for integers \(a, b\). Then \(m + n = 2a + 2b + 2 = 2(a + b + 1)\). Since \(a + b + 1\) is an integer, \(m + n\) is even. ∎</div>
            </div>
            <div class="card small stack" style="gap:0.4rem">
              <h3><span class="term">Proof by contrapositive</span></h3>
              <p>To prove \(p \to q\), prove the equivalent \(\neg q \to \neg p\) directly.</p>
              <div class="ex"><b>Claim.</b> If \(n^2\) is even, then \(n\) is even.<br><b>Proof.</b> We show: if \(n\) is odd, then \(n^2\) is odd. Write \(n = 2k + 1\). Then \(n^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1\), which is odd. So the contrapositive holds, and so does the claim. ∎</div>
            </div>
            <div class="card small stack" style="gap:0.4rem">
              <h3><span class="term">Proof by contradiction</span></h3>
              <p>Assume the statement is false and derive something impossible.</p>
              <div class="ex"><b>Claim.</b> \(\sqrt2\) is irrational.<br><b>Proof.</b> Suppose \(\sqrt2 = a/b\) in lowest terms. Then \(a^2 = 2b^2\), so \(a^2\) is even and \(a\) is even: \(a = 2c\). Then \(b^2 = 2c^2\), so \(b\) is even too. Both even contradicts lowest terms. ∎</div>
            </div>
          </div>
          <div class="split">
            <div class="tip" data-label="Which one to try">Start with a direct proof. Switch to the contrapositive when "not \(q\)" gives you more to work with than \(p\) does, as with \(n^2\) even. Reach for contradiction when the claim says something does <i>not</i> exist or is irrational or infinite.</div>
            <div class="ai">Chain-of-thought reasoning in language models is a sequence of proof-like steps. It is only as reliable as its weakest step, so systems that check each step, the way a reader checks a proof, catch errors that a final answer hides.</div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Lab: proof builder',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click steps on the left to add them in order, and give each one a reason. One step does not belong. A good proof states its assumption, justifies every line, and ends by naming what it proved.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          let pi = 0;
          const state = PROOFS.map((_, i) => fresh(i));
          function fresh(i) {
            const P = PROOFS[i];
            const rest = P.steps.map((_, k) => k).filter((k) => k !== 0);
            return { placed: [0], pool: ctx.R.shuffle(rest), just: { 0: P.steps[0].j[0] }, checked: false };
          }
          const tabs = h('div.seg', { role: 'tablist', 'aria-label': 'Choose a proof' });
          PROOFS.forEach((P, i) => tabs.append(h('button', { 'aria-pressed': String(i === 0), onclick: () => { pi = i; draw(); } }, P.label)));
          const thm = h('div.row', { style: { gap: '0.6rem' } });
          const pool = h('div.pf-pool');
          const steps = h('ol.pf-steps');
          const fb = h('div.feedback', { 'aria-live': 'polite' });
          const controls = h('div.row', { style: { gap: '0.4rem' } },
            h('button.btn.primary', { onclick: () => { state[pi].checked = true; draw(); } }, 'Check my proof'),
            h('button.btn', { onclick: () => solve() }, 'Show the full proof'),
            h('button.btn', { onclick: () => { state[pi] = fresh(pi); draw(); } }, 'Start over'));
          body.append(h('div.row', { style: { gap: '0.6rem' } }, tabs), thm,
            h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.6fr)' } },
              h('div.stack', { style: { gap: '0.3rem', minHeight: 0, overflow: 'auto' } }, h('div.tiny.mono.muted', 'STEPS TO PLACE (CLICK TO ADD)'), pool),
              h('div.stack', { style: { gap: '0.3rem', minHeight: 0, overflow: 'auto' } }, h('div.tiny.mono.muted', 'YOUR PROOF'), steps)),
            h('div.row', { style: { gap: '0.6rem', alignItems: 'center' } }, controls, fb));
          function solve() {
            const P = PROOFS[pi];
            const real = P.steps.map((s, k) => (s.bad ? -1 : k)).filter((k) => k >= 0);
            state[pi] = { placed: real, pool: P.steps.map((s, k) => (s.bad ? k : -1)).filter((k) => k >= 0), just: Object.fromEntries(real.map((k) => [k, P.steps[k].j[0]])), checked: true };
            draw();
          }
          function draw() {
            const P = PROOFS[pi];
            const S = state[pi];
            [...tabs.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === pi)));
            ctx.rc(thm, h('span.pf-badge.n', P.method), h('span', { html: `<b>Theorem.</b> ${P.thm}` }));
            ctx.tex(thm);
            ctx.rc(pool, S.pool.length ? S.pool.map((k) => {
              const b = h('button', { html: P.steps[k].t, onclick: () => { S.pool = S.pool.filter((x) => x !== k); S.placed.push(k); S.checked = false; draw(); } });
              ctx.tex(b);
              return b;
            }) : h('p.small.muted', 'Every step is placed.'));
            let realBefore = 0, orderOk = 0, justOk = 0, decoys = 0, noted = false;
            ctx.rc(steps, S.placed.map((k, pos) => {
              const st = P.steps[k];
              const sel = h('select.inp', { 'aria-label': 'Justification', onchange: (e) => { S.just[k] = e.target.value; S.checked = false; draw(); } },
                h('option', { value: '' }, 'Justification…'), JUST.map((j) => h('option', { value: j, selected: S.just[k] === j }, j)));
              const up = h('button.btn', { title: 'Move up', 'aria-label': 'Move step up', disabled: pos === 0, onclick: () => { [S.placed[pos - 1], S.placed[pos]] = [S.placed[pos], S.placed[pos - 1]]; S.checked = false; draw(); } }, '↑');
              const back = h('button.btn', { title: 'Return to the left', 'aria-label': 'Remove step', onclick: () => { S.placed.splice(pos, 1); S.pool.push(k); S.checked = false; draw(); } }, '✕');
              // every faulty row is marked; only the first one explains itself, so the list stays short
              let cls = '', note = null, tag = null;
              if (st.bad) {
                decoys++;
                if (S.checked) { cls = 'bad'; tag = 'remove'; note = `This step does not belong. ${st.why}`; }
              } else {
                const inOrder = k === realBefore;
                const justified = st.j.includes(S.just[k]);
                if (inOrder) orderOk++;
                if (justified) justOk++;
                if (S.checked) {
                  cls = inOrder && justified ? 'ok' : 'bad';
                  if (!inOrder) { tag = 'order'; note = k > realBefore ? 'Too early: it relies on a step that is not in place yet.' : 'This step belongs earlier in the proof.'; }
                  else if (!justified) { tag = 'reason'; note = `${S.just[k] ? 'Not quite the right reason.' : 'Choose a justification.'} ${st.why}`; }
                }
                realBefore++;
              }
              if (note && noted) note = null;
              if (note) noted = true;
              const li = h('li', { class: cls }, h('span.n', String(pos + 1)), h('span', { html: st.t }), sel,
                h('span.row', { style: { gap: '0.15rem', flexWrap: 'nowrap' } }, tag ? h('span.tag', `✗ ${tag}`) : null, up, back), note ? h('div.note', note) : null);
              ctx.tex(li);
              return li;
            }));
            const total = P.steps.filter((s) => !s.bad).length;
            const placedReal = S.placed.filter((k) => !P.steps[k].bad).length;
            if (!S.checked) { fb.className = 'feedback info'; fb.textContent = `${placedReal} of ${total} steps placed. Check whenever you like.`; return; }
            const perfect = placedReal === total && orderOk === total && justOk === total && !decoys;
            fb.className = 'feedback ' + (perfect ? 'good' : 'bad');
            fb.textContent = perfect ? 'Correct: every step is in order and justified. That is a complete proof.'
              : `In order: ${orderOk} of ${placedReal} · reasons right: ${justOk} of ${placedReal}${placedReal < total ? ` · ${total - placedReal} still to place` : ''}${decoys ? ' · one step does not belong' : ''}.${noted ? ' The first problem is explained in red.' : ''}`;
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Cases, existence, and counterexamples',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">In a <span class="term">proof by cases</span>, split the situation into cases that together cover every possibility, and prove the claim in each one. It rests on the law \((p_1 \lor p_2) \to q \equiv (p_1 \to q) \land (p_2 \to q)\).<div class="eg">Claim: \(\max(a, b) \ge a\). Case \(a \ge b\): the max is \(a\) itself. Case \(a \lt b\): the max is \(b\), which exceeds \(a\). Every pair lands in one case.</div></div>
              <div class="ex"><b>Claim.</b> For every integer \(n\), \(n^2 + n\) is even.<br>
                <b>Case 1:</b> \(n\) is even, \(n = 2k\). Then \(n^2 + n = 4k^2 + 2k = 2(2k^2 + k)\), which is even.<br>
                <b>Case 2:</b> \(n\) is odd, \(n = 2k + 1\). Then \(n^2 + n = (2k+1)(2k+2) = 2(2k+1)(k+1)\), which is even.<br>
                Every integer is even or odd, so the cases cover everything. ∎</div>
              <div class="tip">The cases must be exhaustive. Forgetting one, such as \(n = 0\) or negative numbers, is like an <code>if/elif</code> chain with a missing branch.</div>
            </div>
            <div class="stack">
              <div class="def" data-label="Existence and disproof">To prove \(\exists x\ P(x)\), show one witness. To disprove \(\forall x\ P(x)\), one <span class="term">counterexample</span> suffices, because \(\neg\forall x\ P(x) \equiv \exists x\ \neg P(x)\).<div class="eg">"There is a prime above 100" is proved by the witness 101. "Every prime is odd" is disproved by the counterexample 2.</div></div>
              <div class="warn">Examples never prove a universal claim. \(n^2 + n + 41\) is prime for \(n = 0, 1, \dots, 39\), forty cases in a row, and then \(n = 40\) gives \(1681 = 41^2\). The next lab lets you hunt for failures like this one.</div>
              <div class="why">A failing test case is a counterexample to the claim "this function is correct". One is enough to prove there is a bug. A thousand passing tests are still only examples.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: conjecture tester',
        kind: 'lab',
        html: String.raw`<p class="muted small">Pick a claim and slide \(N\) to test it for every \(n\) up to \(N\). Green squares hold, red squares are counterexamples. Click a square to see the arithmetic. Some claims break early, one breaks late, and some never break at all, yet only a proof can tell those last ones apart.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          let ci = 0;
          const Ns = CONJ.map((c) => c.def);
          let pick = null;
          let fsrc = 'n^2 - n + 41', prop = 'is prime';
          const list = h('div.pf-rules');
          CONJ.forEach((c, i) => list.append(h('button', { onclick: () => { ci = i; pick = null; draw(); } }, h('span.nm', c.name))));
          const slider = h('input', { type: 'range', 'aria-label': 'Test up to N' });
          const nLabel = h('div.small');
          slider.addEventListener('input', () => { Ns[ci] = +slider.value; pick = null; draw(); });
          const fIn = h('input.inp.mono', { value: fsrc, 'aria-label': 'f(n)', spellcheck: 'false', style: { width: '100%' } });
          fIn.addEventListener('input', () => { fsrc = fIn.value; pick = null; draw(); });
          const propSel = h('select.inp', { 'aria-label': 'Property', onchange: (e) => { prop = e.target.value; pick = null; draw(); } }, Object.keys(PROPS).map((k) => h('option', { value: k, selected: k === prop }, k)));
          const custom = h('div.row', { style: { gap: '0.35rem', flexWrap: 'nowrap' } }, h('span.mono.small', { style: { whiteSpace: 'nowrap' } }, 'f(n) ='), fIn, propSel);
          const summary = h('div.stack', { style: { gap: '0.3rem' } });
          const figure = h('div.figure', { style: { minHeight: 0 } });
          const detail = h('div.small.mono', { style: { minHeight: '1.5em' } });
          const lesson = h('div.box.small');
          body.append(h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)' } },
            h('div.stack', { style: { gap: '0.45rem', minHeight: 0 } }, list, custom, nLabel, slider, summary),
            h('div.stack', { style: { gap: '0.4rem', minHeight: 0 } }, figure, detail, lesson)));
          function draw() {
            const C = CONJ[ci];
            [...list.children].forEach((b, i) => b.classList.toggle('on', i === ci));
            custom.style.display = C.custom ? '' : 'none';
            Object.assign(slider, { min: C.min, max: C.max, step: 1 });
            slider.value = Ns[ci];
            const N = Ns[ci];
            nLabel.innerHTML = `Domain: ${C.dom} Testing up to <b>N = ${N}</b>.`;
            let test = C.test, err = null;
            if (C.custom) {
              try {
                const f = parseArith(fsrc);
                test = (n) => {
                  try {
                    const v = f(n), r = PROPS[prop](v);
                    return r ? { ok: r.ok, text: `n = ${n}: f(${n}) = ${r.text}` } : { ok: null, text: `n = ${n}: f(${n}) = ${arithText(v)} is too large to test for primality here` };
                  } catch (e) { return { ok: null, text: `n = ${n}: not tested — ${e.message}` }; }
                };
              } catch (e) { err = e.message; }
            }
            if (err) { ctx.rc(summary, h('div.feedback.bad', err)); ctx.rc(figure); detail.textContent = ''; lesson.innerHTML = C.lesson; return; }
            const ns = C.values(N);
            const res = ns.map((n) => ({ n, ...test(n) }));
            const fails = res.filter((r) => r.ok === false);
            const passes = res.filter((r) => r.ok === true).length;
            const skipped = res.length - passes - fails.length;
            // a grid that fits the panel: about twice as wide as tall
            const cols = Math.max(1, Math.ceil(Math.sqrt(res.length * 2.2)));
            const rows = Math.ceil(res.length / cols);
            const W = 560, cell = Math.min(W / cols, 230 / Math.max(rows, 1), 46);
            const gap = cell > 9 ? 2 : cell > 4 ? 1 : 0;
            const svg = s('svg', { viewBox: `0 0 ${cols * cell} ${rows * cell}`, class: 'pf-grid', role: 'img', 'aria-label': `${res.length} tested values, ${fails.length} counterexamples`, style: { width: '100%', maxHeight: '15.5rem' } });
            if (pick === null) pick = fails.length ? fails[0].n : res.length ? res[res.length - 1].n : null;
            res.forEach((r, i) => {
              const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
              const fill = r.ok === true ? 'var(--true)' : r.ok === false ? 'var(--false)' : 'var(--rule)';
              const rect = s('rect', { x: x + gap / 2, y: y + gap / 2, width: cell - gap, height: cell - gap, rx: cell > 12 ? 2 : 0, fill, opacity: r.ok === true ? 0.55 : 1, stroke: r.n === pick ? 'var(--ink)' : 'none', 'stroke-width': r.n === pick ? Math.max(1, cell / 8) : 0, onclick: () => { pick = r.n; draw(); } });
              rect.append(s('title', { text: r.text }));
              svg.append(rect);
              if (cell >= 26) svg.append(s('text', { x: x + cell / 2, y: y + cell / 2 + 4, 'text-anchor': 'middle', 'font-size': Math.min(12, cell / 2.6), fill: 'var(--ink)', 'pointer-events': 'none', text: String(r.n) }));
            });
            ctx.rc(figure, svg);
            const sel = res.find((r) => r.n === pick);
            detail.innerHTML = sel ? `<b class="${sel.ok === true ? 'ok' : sel.ok === false ? 'bad' : 'muted'}">${sel.ok === true ? '✓' : sel.ok === false ? '✗' : '?'}</b> ${ctx.esc(sel.text)}` : '';
            ctx.rc(summary,
              h('div', h('span.pf-badge', { class: fails.length ? 'f' : skipped ? 'n' : 't' }, fails.length ? 'disproved' : skipped ? 'incomplete check' : 'no counterexample yet')),
              h('div.small', { html: `Checked <b>${passes + fails.length}</b> of <b>${res.length}</b> values: <b class="ok">${passes}</b> hold${fails.length ? `, <b class="bad">${fails.length}</b> fail` : ''}${skipped ? `, ${skipped} could not be tested` : ''}.` }),
              h('div.small', { html: fails.length ? `First counterexample: <b class="mono">${ctx.esc(fails[0].text)}</b>. One is enough to make the "for all" claim false.` : skipped ? 'Some cases could not be checked exactly here. They provide no evidence for or against the claim.' : 'Every tested case holds. That is evidence, and only a proof can rule out a failure at the very next value.' }));
            lesson.innerHTML = C.lesson;
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Mathematical induction',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="thm">The principle of <span class="term">mathematical induction</span>. Let \(P(n)\) be a statement about integers \(n \ge n_0\). If
                <ol style="margin:0.25rem 0">
                  <li><b>Base case:</b> \(P(n_0)\) is true, and</li>
                  <li><b>Inductive step:</b> for every \(k \ge n_0\), \(P(k) \to P(k+1)\),</li>
                </ol>
                then \(P(n)\) is true for every \(n \ge n_0\).</div>
              <p>Think of an endless row of dominoes. The base case knocks over the first one. The inductive step guarantees that each falling domino knocks over the next. Together they topple every domino, without anyone checking them one by one.</p>
              <div class="warn">Inside the inductive step you assume \(P(k)\) for one arbitrary \(k\), the <span class="term">inductive hypothesis</span>, and prove \(P(k+1)\). You never assume the statement for all \(n\): that would assume what you are trying to prove.</div>
            </div>
            <div class="stack">
              <div class="ex"><b>Claim.</b> \(1 + 2 + \cdots + n = \dfrac{n(n+1)}{2}\) for every \(n \ge 1\).<br>
                <b>Base case</b> \((n = 1)\): the left side is 1 and the right side is \(\tfrac{1 \cdot 2}{2} = 1\).<br>
                <b>Inductive step:</b> assume \(1 + \cdots + k = \tfrac{k(k+1)}{2}\). Then
                \[1 + \cdots + k + (k+1) = \frac{k(k+1)}{2} + (k+1) = \frac{(k+1)(k+2)}{2},\]
                which is the formula with \(n = k + 1\). ∎</div>
              <div class="tip">Label the parts: "Base case", "Inductive hypothesis", "Inductive step". Then point to the exact line where you use the hypothesis. If you never use it, the step is not really an induction.</div>
              <div class="ai">Training loops are induction in action. If the weights are valid before an update and every update keeps them valid, they stay valid for all epochs. Engineers rely on exactly this argument when they assert invariants inside a training loop.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: induction dominoes',
        kind: 'lab',
        html: String.raw`<p class="muted small">Choose a claim, then push the first domino. A domino falls only if the one before it fell <i>and</i> the inductive step links them. Click a gap between dominoes (or focus it and press Enter) to break a link, or skip the base case, and see why induction needs both parts. The mark above each domino says whether \(P(n)\) is actually true.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const COUNT = 12;
          let ci = 0, skipBase = false, shown = 1;
          let broken = new Set();
          let fallen = new Array(COUNT).fill(false);
          let next = 0;
          let msg = '';
          let refocus = null;
          const tabs = h('div.seg', { role: 'tablist', 'aria-label': 'Choose a claim' });
          CLAIMS.forEach((c, i) => tabs.append(h('button', { 'aria-pressed': String(i === 0), onclick: () => { ci = i; shown = 1; broken = new Set(); skipBase = false; stand(); } }, c.key)));
          const claimEl = h('div', { style: { fontSize: '1.05rem' } });
          const svg = s('svg', { viewBox: '0 0 640 112', class: 'pf-dom', role: 'group', 'aria-label': 'A row of twelve dominoes; the gap between each pair is a button that breaks or repairs that link', style: { width: '100%', height: '6.6rem', flex: 'none' } });
          const pushBtn = h('button.btn.primary', { onclick: () => push() }, 'Push the first domino');
          const standBtn = h('button.btn', { onclick: () => stand() }, 'Stand them up');
          const baseBtn = h('button.btn', { onclick: () => { skipBase = !skipBase; stand(); } });
          const msgEl = h('div.feedback.info', { 'aria-live': 'polite' });
          const baseCard = h('div.card.stack', { style: { gap: '0.25rem', padding: '0.45rem 0.8rem' } });
          const stepCard = h('div.card.stack', { style: { gap: '0.25rem', padding: '0.45rem 0.8rem' } });
          body.append(h('div.row', { style: { gap: '0.8rem' } }, tabs, claimEl), svg,
            h('div.row', { style: { gap: '0.4rem' } }, pushBtn, standBtn, baseBtn, h('span.tiny.muted', 'Click a gap between dominoes to break or repair that link.')),
            msgEl, h('div.split-narrow', { style: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)' } }, baseCard, stepCard));
          // one domino falls per tick; the ticker stops itself at a broken link or at the end of the row
          const player = ctx.ticker({ ms: 150, tick: () => fall() });
          function stand() { player.stop(); fallen.fill(false); msg = ''; draw(); }
          function fall() {
            const C = CLAIMS[ci];
            const i = next;
            fallen[i] = true;
            const link = i + 1 < COUNT && C.step && !broken.has(i);
            if (link) next = i + 1;
            else {
              const n = C.n0 + i;
              if (i === COUNT - 1) msg = `All ${COUNT} fell, and the row never ends: the base case starts the chain and the step passes it on forever. So P(n) holds for every n ≥ ${C.n0}.`;
              else if (!C.step) msg = `Only the first domino fell. P(1) to P(12) all check out (✓), but nothing links P(k) to P(k + 1), so induction proves nothing past n = 1. And indeed P(40) is false.`;
              else msg = `The chain stopped at n = ${n} because you broke the link P(${n}) → P(${n + 1}). The step must hold for every k, or nothing past the break is proved.`;
            }
            draw();
            return link;
          }
          function push() {
            player.stop();
            fallen.fill(false);
            const C = CLAIMS[ci];
            if (skipBase || !C.base) {
              msg = skipBase ? 'Nothing fell. Without a base case there is no first domino to push, however good the inductive step is.'
                : `Nothing fell. The step is valid, but the base case fails: P(${C.n0}) is false. In fact the claim is false for every n (✗ marks), even though each step from k to k + 1 checks out.`;
              draw();
              return;
            }
            next = 0;
            if (fall()) player.start();   // the first domino falls at once; the rest follow every 150 ms
          }
          function flip(i) { if (broken.has(i)) broken.delete(i); else broken.add(i); refocus = i; stand(); }
          function draw() {
            const C = CLAIMS[ci];
            [...tabs.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === ci)));
            claimEl.innerHTML = `\\(P(n):\\ ${C.tex}\\)`;
            ctx.tex(claimEl);
            baseBtn.textContent = skipBase ? 'Restore the base case' : 'Skip the base case';
            baseBtn.classList.toggle('on', skipBase);
            const kids = [s('line', { x1: 10, y1: 90, x2: 630, y2: 90, stroke: 'var(--ink-3)', 'stroke-width': 2 })];
            const gaps = [];
            for (let i = 0; i < COUNT; i++) {
              const x = 26 + i * 50;
              const n = C.n0 + i;
              const truth = C.check(n);
              kids.push(s('text', { x: x + 7, y: 16, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: truth ? 'var(--true)' : 'var(--false)', text: truth ? '✓' : '✗' }));
              kids.push(s('rect', { class: 'domino' + (fallen[i] ? ' down' : ''), x, y: 28, width: 14, height: 62, rx: 2, fill: fallen[i] ? 'var(--accent)' : 'var(--sheet)', stroke: 'var(--accent)', 'stroke-width': 2 }));
              kids.push(s('text', { x: x + 7, y: 107, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)', text: `n=${n}` }));
              if (i < COUNT - 1) {
                const gx = x + 14, bad = broken.has(i) || !C.step;
                kids.push(s('line', { x1: gx + 6, y1: 60, x2: gx + 30, y2: 60, stroke: bad ? 'var(--false)' : 'var(--ink-3)', 'stroke-width': 2, 'stroke-dasharray': bad ? '3 3' : 'none' }));
                if (bad) kids.push(s('text', { x: gx + 18, y: 54, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--false)', text: '✗' }));
                // the gap is a toggle button: pressed means the link is broken
                const gap = s('rect', {
                  class: 'gap', x: gx, y: 24, width: 36, height: 70, fill: 'none', 'pointer-events': 'all',
                  tabindex: 0, role: 'button', 'aria-pressed': String(broken.has(i)), 'aria-label': `Break the link P(${n}) → P(${n + 1})`,
                  onclick: () => flip(i),
                  onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(i); } },
                }, s('title', { text: `link P(${n}) → P(${n + 1})${broken.has(i) ? ' (broken)' : ''}` }));
                gaps[i] = gap;
                kids.push(gap);
              }
            }
            ctx.rc(svg, kids);
            if (refocus !== null) { if (gaps[refocus]) gaps[refocus].focus(); refocus = null; }
            msgEl.textContent = msg || (C.step ? 'Ready. Press "Push the first domino".' : 'Ready. This claim has no valid inductive step: every link is broken.');
            msgEl.className = 'feedback ' + (!msg ? 'info' : fallen.every(Boolean) ? 'good' : 'bad');
            ctx.rc(baseCard,
              h('div.tiny.mono.muted', 'BASE CASE'),
              h('div', { html: `\\(${C.baseTex}\\)` }),
              h('div', h('span.pf-badge', { class: C.base && !skipBase ? 't' : 'f' }, skipBase ? 'skipped' : C.base ? 'holds' : 'fails')),
              h('div.small.muted', C.base ? 'The first domino can fall.' : 'The first domino cannot fall.'));
            ctx.rc(stepCard,
              h('div.row', { style: { justifyContent: 'space-between' } }, h('span.tiny.mono.muted', 'INDUCTIVE STEP'),
                h('span.row', { style: { gap: '0.25rem' } },
                  h('button.btn.sm', { disabled: shown >= C.lines.length, onclick: () => { shown++; draw(); } }, 'Next line'),
                  h('button.btn.sm', { disabled: shown >= C.lines.length, onclick: () => { shown = C.lines.length; draw(); } }, 'Show all'))),
              h('div.small', { html: `Assume \\(${C.hyp}\\).` }),
              h('div.pf-algebra', C.lines.slice(0, shown).map(([t, why]) => [h('span', { html: `\\(${t}\\)` }), h('span.pf-why', why)])),
              shown >= C.lines.length ? h('div', h('span.pf-badge', { class: C.step ? 't' : 'f' }, C.step ? 'step holds' : 'no valid step')) : null);
            ctx.tex(baseCard);
            ctx.tex(stepCard);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Strong induction and well-ordering',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">In <span class="term">strong induction</span>, the inductive step may assume <i>all</i> of \(P(n_0), P(n_0 + 1), \dots, P(k)\) to prove \(P(k+1)\). Use it when \(k + 1\) breaks into smaller pieces that are not simply \(k\).<div class="eg">For \(P(6)\) you may assume \(P(2)\) through \(P(5)\) at once. Since \(6 = 2 \cdot 3\), a step about factors uses \(P(2)\) and \(P(3)\), not just \(P(5)\).</div></div>
              <div class="ex"><b>Claim.</b> Every integer \(n \ge 2\) is a product of primes.<br>
                <b>Base case:</b> 2 is prime.<br>
                <b>Step:</b> take \(k + 1\). If it is prime, we are done. Otherwise \(k + 1 = ab\) with \(2 \le a, b \le k\). By the strong hypothesis, \(a\) and \(b\) are products of primes, so their product \(k + 1\) is too. ∎<br>
                Ordinary induction gives only \(P(k)\): no help with \(a\) and \(b\).</div>
              <div class="def" data-label="Well-ordering principle">The <span class="term">well-ordering principle</span>: every nonempty set of nonnegative integers has a smallest element. It is equivalent to induction and powers "smallest counterexample" proofs: take the smallest failure and find a smaller one, a contradiction.<div class="eg">\(\{9, 4, 15\}\) has smallest element 4. The positive real numbers have none: below any \(x \gt 0\) sits \(x/2\).</div></div>
            </div>
            <div class="card stack pf-postage" style="gap:0.45rem"></div>
          </div>`,
        render(body, ctx) {
          const { h } = ctx;
          const host = body.querySelector('.pf-postage');
          let n = 23;
          const BASES = { 12: [4, 4, 4], 13: [4, 4, 5], 14: [4, 5, 5], 15: [5, 5, 5] };
          const slider = h('input', { type: 'range', min: 1, max: 40, value: n, 'aria-label': 'Amount in cents' });
          const out = h('div.stack', { style: { gap: '0.4rem' } });
          slider.addEventListener('input', () => { n = +slider.value; draw(); });
          host.append(
            h('div.tiny.mono.muted', 'POSTAGE MACHINE'),
            h('div', { html: '<b>Claim:</b> every amount of 12 cents or more can be paid with 4¢ and 5¢ stamps.' }),
            h('div.small', { html: '<b>Base cases:</b> 12 = 4 + 4 + 4, 13 = 4 + 4 + 5, 14 = 4 + 5 + 5, 15 = 5 + 5 + 5.<br><b>Step</b> for \\(k + 1 \\ge 16\\): by the strong hypothesis \\(k + 1 - 4 \\ge 12\\) can be paid, so add one 4¢ stamp. The step reaches back 4, which is why there are four base cases.' }),
            h('label.field', 'Amount (cents)', slider), out);
          ctx.tex(host);
          function draw() {
            const stamps = (arr) => h('div.pf-stamps', arr.map((v) => h('span.pf-stamp', { class: v === 5 ? 'five' : '' }, `${v}¢`)));
            if (n >= 12) {
              const chain = [n];
              while (chain[chain.length - 1] > 15) chain.push(chain[chain.length - 1] - 4);
              const b = chain[chain.length - 1];
              const arr = [...BASES[b], ...new Array(chain.length - 1).fill(4)];
              ctx.rc(out,
                h('div', { html: `<b>${n}¢</b>: ${chain.join(' → ')} <span class="muted">(subtract 4 until a base case is reached)</span>` }),
                stamps(arr),
                h('div.small.muted', `${n} = ${arr.join(' + ')}. The base case ${b} = ${BASES[b].join(' + ')}, plus ${chain.length - 1} extra 4¢ stamp${chain.length === 2 ? '' : 's'}.`));
            } else {
              let found = null;
              for (let a = 0; a * 4 <= n && !found; a++) if ((n - 4 * a) % 5 === 0) found = [...new Array(a).fill(4), ...new Array((n - 4 * a) / 5).fill(5)];
              ctx.rc(out,
                h('div', { html: `<b>${n}¢</b> is below 12, so the claim says nothing about it.` }),
                found && found.length ? stamps(found) : null,
                h('div.small', { html: found && found.length ? `${n} = ${found.join(' + ')} happens to work.` : `<b class="bad">Impossible:</b> no mix of 4s and 5s makes ${n}. That is why the claim starts at 12: 11 is the largest amount that cannot be paid.` }));
            }
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Proofs about programs: loop invariants',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">loop invariant</span> is a statement about a loop's variables that is true before the loop starts and stays true after every iteration. It is induction in disguise, with the iteration count as \(n\).<div class="eg">From <code>c = 0</code>, passes of <code>c += 2</code> give 0, 2, 4, 6. "<code>c</code> is even" holds before the loop and after every pass, so it is an invariant.</div></div>
              <pre class="pf-code">${INVARIANT_CODE}</pre>
              <table class="data small">
                <thead><tr><th>Check</th><th>For this loop</th><th>Induction</th></tr></thead>
                <tbody>
                  <tr><td><b>Initialization</b></td><td>Before the loop, \(k = 0\) and total is 0, the empty sum.</td><td>base case</td></tr>
                  <tr><td><b>Maintenance</b></td><td>If total \(= 1 + \cdots + k\) before a pass, then after <code>k += 1</code> and <code>total += k</code> it equals \(1 + \cdots + k\) for the new \(k\).</td><td>inductive step</td></tr>
                  <tr><td><b>Termination</b></td><td>The loop stops when \(k = n\), so total \(= 1 + \cdots + n\).</td><td>conclusion</td></tr>
                </tbody>
              </table>
            </div>
            <div class="stack">
              <div class="def" data-label="Correctness">An algorithm is correct when every valid input produces the right output. The proof has two parts: <b>partial correctness</b> (if it stops, the answer is right, which the invariant gives) and <b>termination</b> (it does stop). For termination, find a quantity that drops each pass and can never go below 0. Here it is \(n - k\).<div class="eg">For <code>while n &gt; 0: n -= 1</code> on a whole number <code>n</code>: if it stops, <code>n == 0</code> (partial correctness), and it does stop, since <code>n</code> drops by 1 each pass and cannot go below 0.</div></div>
              <div class="ex" data-label="Recursion is induction too"><pre class="pf-code" style="margin:0.15rem 0 0.35rem">${RECURSION_CODE}</pre>The base case of the recursion is the base case of the proof. If <code>sum_to(k)</code> is right, then <code>sum_to(k + 1)</code> adds \(k + 1\) to it and is right as well.</div>
              <div class="ai">Formal verification tools prove properties of trained neural networks, such as "changing any pixel by at most 1% never changes this classification", for every input in a region. Testing samples a handful of inputs; a proof covers all infinitely many.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: hunting for a counterexample',
        kind: 'code',
        file: 'counterexample.py',
        html: String.raw`<p class="muted small">Claim: "if \(p\) is prime, then \(2^p - 1\) is prime." This program tests the claim on prime after prime until it breaks. Switch to <b>Trace</b> to watch the divisor <code>d</code> climb.</p>`,
        fivew: {
          what: 'Tests the conjecture "2ᵖ − 1 is prime whenever p is prime" for p = 2, 3, 5, 7, 11, 13, stopping at the first counterexample and printing its factors.',
          why: 'A computer can check thousands of cases in a moment, which makes it the perfect counterexample hunter. It also shows the limit of checking: the four successes before p = 11 proved nothing.',
          who: 'Mathematicians testing a conjecture before trying to prove it, and developers who run a function on many inputs looking for one that breaks it.',
          where: 'Property-based testing tools, fuzzers that feed random inputs to programs, and the search for large primes (the Great Internet Mersenne Prime Search tests numbers of exactly this form).',
          when: 'Before investing in a proof. If a quick search finds a counterexample, you have saved yourself from trying to prove something false.',
        },
        lines: [
          ['def smallest_factor(m):', 'Defines a function that returns the smallest divisor of <code>m</code> that is at least 2. If that divisor is <code>m</code> itself, then <code>m</code> is prime.'],
          ['    d = 2', 'Starts the candidate divisor at 2, the smallest possible prime factor.'],
          ['    while d * d <= m:', 'Only divisors up to \\(\\sqrt{m}\\) need checking: if \\(m = ab\\) with both factors above \\(\\sqrt m\\), then \\(ab \\gt m\\), which is impossible. Writing <code>d * d &lt;= m</code> avoids square roots and rounding errors. This is a tiny proof built into the loop condition.'],
          ['        if m % d == 0:', '<code>%</code> gives the remainder. A remainder of 0 means <code>d</code> divides <code>m</code>.'],
          ['            return d', 'The first divisor found is the smallest one, because <code>d</code> counts upward. The function stops here.'],
          ['        d += 1', 'Moves on to the next candidate. The value \\(\\sqrt m - d\\) shrinks every pass, so the loop must end: a termination proof in one line.'],
          ['    return m', 'If no divisor up to \\(\\sqrt m\\) exists, <code>m</code> is prime, and its smallest factor is itself.'],
          ['', ''],
          ['for p in [2, 3, 5, 7, 11, 13]:', 'Loops over the first six primes. These are the cases where the hypothesis "p is prime" is true; testing non-prime p would tell us nothing about this claim.'],
          ['    value = 2 ** p - 1', '<code>**</code> is exponentiation, so <code>value</code> is \\(2^p - 1\\): 3, 7, 31, 127, 2047, …'],
          ['    d = smallest_factor(value)', 'Finds the smallest factor of <code>value</code>. For 127 the loop tries <code>d</code> = 2 to 11 and finds nothing, so it returns 127.'],
          ['    if d < value:', 'A factor smaller than <code>value</code> means <code>value</code> is not prime. Here the hypothesis "p is prime" holds and the conclusion "2ᵖ − 1 is prime" fails: a counterexample.'],
          ['        print(f"p = {p}: {value} = {d} x {value // d}")', 'Prints the counterexample with its factorization, <code>p = 11: 2047 = 23 x 89</code>. <code>//</code> is whole-number division. Showing the factors lets anyone check the counterexample by multiplying.'],
          ['        break', 'Stops the loop. One counterexample disproves a "for all" claim, so there is no reason to test p = 13.'],
          ['    print(f"p = {p}: 2^p - 1 = {value} is prime")', 'Reached only when no smaller factor exists, so this case agrees with the claim, as in <code>p = 7: 2^p - 1 = 127 is prime</code>. Each line like this is evidence. It says nothing about the next prime.'],
        ],
        expected: 'p = 2: 2^p - 1 = 3 is prime\np = 3: 2^p - 1 = 7 is prime\np = 5: 2^p - 1 = 31 is prime\np = 7: 2^p - 1 = 127 is prime\np = 11: 2047 = 23 x 89\n',
        tryIt: 'Test Euler\'s claim instead: loop <code>for n in range(1, 50):</code>, set <code>value = n * n + n + 41</code>, and predict where the program stops.',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: an invariant you can run',
        kind: 'code',
        file: 'invariant.py',
        html: String.raw`<p class="muted small">Two ways to compute \(1 + 2 + \cdots + n\). The loop carries its invariant as an <code>assert</code>; the recursive version is correct by induction. Use <b>Trace</b> and watch the invariant hold on every pass.</p>`,
        fivew: {
          what: 'Computes 1 + 2 + … + n with a loop that asserts its invariant on every pass, computes it again recursively, and compares both with the formula n(n + 1)/2.',
          why: 'It makes the proof from the slides visible. The assert is the maintenance step checked live, and the recursive function is an induction proof written as code.',
          who: 'Developers who use assertions to catch broken assumptions early, and anyone writing recursive code who needs to convince themselves it is right.',
          where: 'Defensive checks in production code, invariants in data-structure libraries (a heap stays a heap), and the recursion behind tree and graph algorithms later in this course.',
          when: 'Write the invariant down whenever a loop is not obviously correct. If you cannot state one, you probably do not yet understand the loop.',
        },
        lines: [
          ['def sum_to(n):', 'An iterative function for \\(1 + 2 + \\cdots + n\\). Its precondition is \\(n \\ge 0\\).'],
          ['    total, k = 0, 0', 'Initialization: <code>total</code> is 0 and <code>k</code> is 0. The invariant "total = 1 + ⋯ + k" holds already, because the sum of no numbers is 0. This is the base case.'],
          ['    while k < n:', 'Runs while there are numbers left to add. The quantity <code>n - k</code> drops by 1 each pass and cannot go below 0, which proves the loop terminates.'],
          ['        k += 1', 'Moves to the next number. For a moment the invariant is broken, because <code>total</code> is missing the new <code>k</code>.'],
          ['        total += k', 'Adds the new <code>k</code>, which restores the invariant. This pair of lines is the maintenance step: invariant true before, invariant true after.'],
          ['        assert total == k * (k + 1) // 2', '<code>assert</code> stops the program with an error if the condition is false. Here it checks the invariant, in its closed form \\(k(k+1)/2\\), after every pass. If a bug broke the invariant, the program would fail right here instead of later with a wrong answer.'],
          ['    return total', 'Termination: the loop ended because <code>k == n</code>, and the invariant says <code>total</code> = 1 + ⋯ + n. That is the postcondition.'],
          ['', ''],
          ['def sum_rec(n):', 'The same sum, recursively. Its correctness proof is an induction on <code>n</code>.'],
          ['    if n == 0:', 'The base case of the recursion, which is also the base case of the proof.'],
          ['        return 0', 'The empty sum is 0, which matches \\(0 \\cdot 1 / 2 = 0\\).'],
          ['    return sum_rec(n - 1) + n', 'The inductive step: if <code>sum_rec(n - 1)</code> correctly returns \\(1 + \\cdots + (n-1)\\), then adding <code>n</code> gives \\(1 + \\cdots + n\\). Each call moves closer to the base case, so the recursion ends.'],
          ['', ''],
          ['for n in [0, 1, 4, 10]:', 'Tests the base case 0, the first real case 1, and two larger values. Testing the base case first is a habit worth keeping: edge cases are where bugs hide.'],
          ['    print(n, sum_to(n), sum_rec(n), n * (n + 1) // 2)', 'Prints <code>n</code>, both computed sums and the formula. All three agree on every line, for example <code>10 55 55 55</code>. Agreement on four inputs is a test; the invariant and the induction are the proof.'],
        ],
        expected: '0 0 0 0\n1 1 1 1\n4 10 10 10\n10 55 55 55\n',
        tryIt: 'Introduce a bug: change <code>total += k</code> to <code>total += k + 1</code> and run it. The <code>assert</code> catches the broken invariant on the very first pass.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: reasoning about your code',
        kind: 'design',
        html: String.raw`<p class="muted small">Professional developers rarely write formal proofs, but they use the same ideas every day to make code that is correct by design. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'State preconditions and postconditions',
            html: '<p>A function is a small theorem: its precondition is the hypothesis and its postcondition is the conclusion. Write both in the docstring, so callers know what they must guarantee and what they get back. Check the precondition at the boundary, and fail loudly when it does not hold.</p>',
            bad: 'def average(xs):\n    return sum(xs) / len(xs)\n# crashes on [] with ZeroDivisionError',
            good: 'def average(xs):\n    """Requires: xs is non-empty.\n    Returns: the arithmetic mean of xs."""\n    if not xs:\n        raise ValueError("xs must be non-empty")\n    return sum(xs) / len(xs)',
          },
          {
            name: 'Assert loop invariants while you develop',
            html: '<p>An <code>assert</code> is a proof step that the computer checks for you. Writing the invariant down forces you to know why the loop works, and the assert turns a silent wrong answer into an immediate error at the exact pass where things went wrong.</p>',
            good: 'total, k = 0, 0\nwhile k < n:\n    k += 1\n    total += k\n    assert total == k * (k + 1) // 2',
          },
          {
            name: 'Tests show bugs; proofs show their absence',
            html: '<p>Tests are examples, and examples never prove a universal claim. The version below passes tests for 2, 3, 5 and 7, yet <code>is_prime(1)</code> returns <code>True</code>: <code>all</code> over an empty range is vacuously true. Reasoning about every input, including the edges, finds what the tests missed.</p>',
            bad: 'def is_prime(n):\n    return all(n % d for d in range(2, n))\n# is_prime(1) == True: wrong',
            good: 'def is_prime(n):\n    if n < 2:\n        return False\n    return all(n % d for d in range(2, n))',
          },
          {
            name: 'Test the base cases first',
            html: '<p>The smallest inputs, such as 0, 1 and the empty list, are the base cases of the induction behind your code, and most off-by-one bugs live there. A test suite that checks only "typical" inputs leaves the first domino untested.</p>',
            bad: 'assert sum_to(10) == 55   # only a typical case',
            good: 'assert sum_to(0) == 0      # base case\nassert sum_to(1) == 1\nassert sum_to(10) == 55',
          },
          {
            name: 'Check properties on many random inputs',
            html: '<p>Property-based testing states a law that must hold for every input, then tries hundreds of random ones. It is the conjecture tester applied to your code: it cannot prove the law, but it is very good at finding a counterexample. Print the failing input so you can reproduce it.</p>',
            good: 'import random\nfor _ in range(1000):\n    xs = [random.randint(-9, 9) for _ in range(8)]\n    assert my_sort(xs) == sorted(xs), xs',
          },
          {
            name: 'Prove termination with a shrinking measure',
            html: '<p>Every loop needs a quantity that strictly decreases each pass and cannot go below a floor. In binary search that quantity is <code>hi - lo</code>. Setting <code>lo = mid</code> can leave it unchanged when <code>hi = lo + 1</code>, which is an infinite loop; <code>lo = mid + 1</code> always shrinks it.</p>',
            bad: 'while lo < hi:\n    mid = (lo + hi) // 2\n    if a[mid] < x:\n        lo = mid       # may not shrink\n    else:\n        hi = mid',
            good: 'while lo < hi:\n    mid = (lo + hi) // 2\n    if a[mid] < x:\n        lo = mid + 1   # hi - lo shrinks\n    else:\n        hi = mid',
          },
          {
            name: 'Shrink a failure to the smallest counterexample',
            html: '<p>When a test fails on a big input, look for the smallest input that still fails, just as a well-ordering proof looks at the smallest counterexample. Small failures are easy to trace by hand, and they often reveal that the specification itself was wrong.</p>',
            good: 'def smallest_failure(claim, limit):\n    for n in range(limit):\n        if not claim(n):\n            return n   # minimal counterexample\n    return None',
          },
          {
            name: 'Make the reasoning visible',
            html: '<p>Code that relies on a mathematical fact should say which fact, so a reader can check the argument instead of trusting it. A short comment that names the theorem, plus a clear expression, beats a clever trick nobody can verify.</p>',
            bad: 'total = (n * n + n) >> 1',
            good: '# 1 + 2 + ... + n = n(n + 1) / 2, proved by induction\ntotal = n * (n + 1) // 2',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: the sum formula by induction',
        kind: 'example',
        id: 'ex-induction-sum',
        objective: 'Prove a closed-form sum formula by mathematical induction, checking the base case and then the inductive step.',
        problem: String.raw`<p>Prove by mathematical induction that \(1 + 2 + \cdots + n = \dfrac{n(n+1)}{2}\) for every positive integer \(n\).</p>`,
        data: EX_IND_DATA,
        steps: indStepsFor(EX_IND_SPEC),
        answer: 'n(n+1)/2',
        verify(M) {
          for (let n = 1; n <= 60; n++) {
            let s = 0;
            for (let i = 1; i <= n; i++) s += i;
            if (s !== (n * (n + 1)) / 2) return false;
          }
          for (let k = 1; k <= 60; k++) if ((k * (k + 1)) / 2 + (k + 1) !== ((k + 1) * (k + 2)) / 2) return false;
          return true;
        },
        variants: [
          {
            label: 'Variant: sum of odd numbers',
            problem: String.raw`<p>Prove by mathematical induction that \(1 + 3 + 5 + \cdots + (2n-1) = n^2\) for every positive integer \(n\): the sum of the first \(n\) odd numbers is a perfect square.</p>`,
            data: EX_IND_ODD_DATA,
            steps: indStepsFor(EX_IND_ODD_SPEC),
            answer: 'n^2',
            verify(M) {
              for (let n = 1; n <= 60; n++) {
                let s = 0;
                for (let i = 1; i <= n; i++) s += 2 * i - 1;
                if (s !== n * n) return false;
              }
              for (let k = 1; k <= 60; k++) if (k * k + (2 * k + 1) !== (k + 1) * (k + 1)) return false;
              return true;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const D = (preset && preset.data) || EX_IND_DATA;
          const { h, s } = ctx;
          const doms = [];
          doms.push(s('line', { x1: 8, y1: 48, x2: 352, y2: 48, stroke: 'var(--ink-3)', 'stroke-width': 2 }));
          for (let i = 0; i < D.total; i++) {
            const down = i < step.fallen;
            doms.push(s('rect', { class: 'domino' + (down ? ' down' : ''), x: 26 + i * 54, y: 6, width: 15, height: 42, rx: 2, fill: down ? 'var(--accent)' : 'var(--sheet)', stroke: 'var(--accent)', 'stroke-width': 2 }));
          }
          const strip = s('svg', { viewBox: '0 0 360 56', class: 'pf-dom', role: 'img', 'aria-label': `${step.fallen} of ${D.total} dominoes fallen`, style: { width: '100%', maxWidth: '30rem', height: '3.1rem', flex: 'none' } }, doms);
          const rows = D.rows.slice(0, step.lines).map((r, i) => h('div',
            { style: { display: 'flex', gap: '0.6rem', width: '100%', padding: '0.28rem 0.55rem', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', background: i === step.lines - 1 ? 'var(--accent-2)' : 'var(--sheet)', fontSize: '0.84rem', lineHeight: 1.4, textAlign: 'left' } },
            h('span.tiny.mono.muted', { style: { flex: '0 0 7.6rem', paddingTop: '0.15rem' } }, r.tag.toUpperCase()),
            h('span', { style: { flex: '1 1 auto', minWidth: 0 }, html: r.html })));
          stage.append(h('div.stack', { style: { gap: '0.4rem', width: '100%', maxWidth: '46rem', alignItems: 'center' } },
            strip,
            h('div.stack', { style: { gap: '0.25rem', width: '100%' } }, rows),
            step.answer ? h('div.ex-answer', { html: D.answerBanner }) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: the square root of 2 is irrational',
        kind: 'example',
        id: 'ex-sqrt2-contradiction',
        objective: 'Prove a number is irrational by contradiction, using lowest terms and a parity argument to force a shared factor.',
        problem: String.raw`<p>Prove that \(\sqrt2\) is irrational: there are no integers \(a\) and \(b\) with \(b \ne 0\) and \(\sqrt2 = a/b\).</p>`,
        data: EX_SQRT_DATA,
        steps: sqrtStepsFor(EX_SQRT2_SPEC),
        answer: 'irrational',
        verify(M) {
          let noSolution = true;
          for (let b = 1; b <= 300 && noSolution; b++) for (let a = 1; a <= 450; a++) if (a * a === 2 * b * b) { noSolution = false; break; }
          let parity = true;
          for (let m = 0; m <= 200; m++) {
            if ((2 * m + 1) * (2 * m + 1) % 2 !== 1) parity = false;
            if ((2 * m) * (2 * m) % 2 !== 0) parity = false;
          }
          return noSolution && parity;
        },
        variants: [
          {
            label: 'Variant: sqrt(3) is irrational',
            problem: String.raw`<p>Prove that \(\sqrt3\) is irrational: there are no integers \(a\) and \(b\) with \(b \ne 0\) and \(\sqrt3 = a/b\). Use the same contradiction method, with a cases argument on remainders mod \(3\) in place of parity.</p>`,
            data: EX_SQRT3_DATA,
            steps: sqrtStepsFor(EX_SQRT3_SPEC),
            answer: 'irrational',
            verify(M) {
              let noSolution = true;
              for (let b = 1; b <= 300 && noSolution; b++) for (let a = 1; a <= 520; a++) if (a * a === 3 * b * b) { noSolution = false; break; }
              let cases = true;
              for (let m = 0; m <= 300; m++) {
                const r = ((m % 3) + 3) % 3;
                if (r !== 0 && (m * m) % 3 !== 1) cases = false;
                if (r === 0 && (m * m) % 3 !== 0) cases = false;
              }
              return noSolution && cases;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const D = (preset && preset.data) || EX_SQRT_DATA;
          const { h } = ctx;
          const rows = D.rows.slice(0, step.lines).map((r, i) => h('div',
            { style: { display: 'flex', gap: '0.6rem', width: '100%', padding: '0.28rem 0.55rem', border: '1px solid ' + (r.warn && i === step.lines - 1 ? 'var(--false)' : 'var(--rule)'), borderRadius: 'var(--radius)', background: i === step.lines - 1 ? 'var(--accent-2)' : 'var(--sheet)', fontSize: '0.84rem', lineHeight: 1.4, textAlign: 'left' } },
            h('span.tiny.mono.muted', { style: { flex: '0 0 7.6rem', paddingTop: '0.15rem' } }, r.tag.toUpperCase()),
            h('span', { style: { flex: '1 1 auto', minWidth: 0 }, html: r.html })));
          const clash = step.lines >= D.clashAt ? h('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', width: '100%', background: 'var(--false-bg)', border: '1px solid var(--false)', borderRadius: 'var(--radius)', padding: '0.35rem 0.6rem', fontSize: '0.86rem' } },
            h('span', { html: D.clashHtml }),
            h('span', { html: D.clashHtml2 }),
            h('b', D.clashTail)) : null;
          stage.append(h('div.stack', { style: { gap: '0.4rem', width: '100%', maxWidth: '46rem', alignItems: 'center' } },
            h('div.stack', { style: { gap: '0.25rem', width: '100%' } }, rows),
            clash,
            step.answer ? h('div.ex-answer', { html: D.answerBanner }) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: a direct proof, inference by inference',
        kind: 'example',
        id: 'ex-direct-proof-odd-sum',
        objective: 'Prove a parity claim by direct proof, justifying each inference from the hypothesis to the conclusion.',
        problem: String.raw`<p>Prove by <b>direct proof</b>: if \(m\) and \(n\) are odd integers, then \(m + n\) is even. Justify every inference.</p>`,
        data: EX_DIR_DATA,
        steps: pStepsFor(EX_DIR_SPEC),
        answer: 'm + n is even',
        verify: dirVerify(true),
        variants: [
          {
            label: 'Variant: even + even',
            problem: String.raw`<p>Prove by <b>direct proof</b>: if \(m\) and \(n\) are even integers, then \(m + n\) is even. Justify every inference, using the same method as the primary proof.</p>`,
            data: EX_DIR_EVEN_DATA,
            steps: pStepsFor(EX_DIR_EVEN_SPEC),
            answer: 'm + n is even',
            verify: dirVerify(false),
          },
        ],
        draw: rowDraw(EX_DIR_DATA),
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: a proof by contrapositive',
        kind: 'example',
        id: 'ex-contrapositive-square-even',
        objective: 'Prove a statement by forming its contrapositive (negate both parts, then swap them) and proving that instead.',
        problem: String.raw`<p>Prove by <b>contrapositive</b>: for every integer \(n\), if \(n^2\) is even, then \(n\) is even. Show the contrapositive being formed, then prove it.</p>`,
        data: EX_CON_DATA,
        steps: pStepsFor(EX_CON_SPEC),
        answer: 'n is even',
        verify: contraVerify(true),
        variants: [
          {
            label: 'Variant: odd square, odd root',
            problem: String.raw`<p>Prove by <b>contrapositive</b>: for every integer \(n\), if \(n^2\) is odd, then \(n\) is odd. Show the contrapositive being formed, then prove it with the same method.</p>`,
            data: EX_CON_ODD_DATA,
            steps: pStepsFor(EX_CON_ODD_SPEC),
            answer: 'n is odd',
            verify: contraVerify(false),
          },
        ],
        draw: rowDraw(EX_CON_DATA),
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: strong induction and prime factorization',
        kind: 'example',
        id: 'ex-strong-induction-prime-factorization',
        objective: 'Prove a claim by strong induction, using several earlier cases at once where ordinary induction offers only one.',
        problem: String.raw`<p>Prove by <b>strong induction</b>: every integer \(n \ge 2\) is a product of primes. Show why the single predecessor case that ordinary induction offers is not enough.</p>`,
        data: EX_STR_DATA,
        steps: pStepsFor(EX_STR_PRIME_SPEC),
        answer: 'product of primes',
        verify: primeVerify(),
        variants: [
          {
            label: 'Variant: postage stamps',
            problem: String.raw`<p>Prove by <b>strong induction</b>: every amount of \(12\) cents or more can be paid exactly with \(4\)¢ and \(5\)¢ stamps. The step reaches back \(4\) cents, so check the base cases it needs.</p>`,
            data: EX_STR_POST_DATA,
            steps: pStepsFor(EX_STR_POST_SPEC),
            answer: 'payable with 4-cent and 5-cent stamps',
            verify: postVerify(),
          },
        ],
        draw: rowDraw(EX_STR_DATA),
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: proofs',
        kind: 'practice',
        html: String.raw`<p class="muted small">Name rules of inference, set up proofs, practice the inductive step in both ordinary and strong induction, and hunt for counterexamples. Each problem has a worked solution.</p>`,
        gens: [
          {
            label: 'Name the rule',
            make(R) {
              const t = R.pick(ARG_TOPICS);
              const [name, premF, conclF, form, valid] = R.pick(FORMS);
              const others = R.sample(FORMS.map((f) => f[0]).filter((n) => n !== name), 3);
              return {
                prompt: `Which rule of inference, or which fallacy, does this argument use?<div style="margin:0.4rem 0 0 0.8rem;display:table">${premF(t).map((x) => `<div>${x}</div>`).join('')}<div style="border-top:1.5px solid var(--ink-3);margin-top:0.15rem;padding-top:0.1rem">∴ ${conclF(t)}</div></div>`,
                options: R.shuffle([name, ...others]),
                answer: name,
                solution: `<b>${name}</b>: ${form}. ${valid ? 'It is a valid rule: whenever the premises are true, the conclusion is true.' : `It is a fallacy: the premises can be true while the conclusion is false. ${name === 'Affirming the consequent' ? 'It confuses p → q with its converse.' : 'It confuses p → q with its inverse.'}`}`,
              };
            },
          },
          {
            label: 'Set up a proof',
            make(R) {
              const st = R.pick(SETUPS);
              const method = R.pick(['a direct proof', 'proof by contrapositive', 'proof by contradiction']);
              const both = `${st.hyp} and ${st.nconcl}`;
              const answer = method === 'a direct proof' ? st.hyp : method === 'proof by contrapositive' ? st.nconcl : both;
              const goal = method === 'a direct proof' ? `then derive "${st.concl}"` : method === 'proof by contrapositive' ? `then derive "${st.nhyp}", proving ¬q → ¬p` : 'then derive a contradiction';
              return {
                prompt: `You want to prove <b>"${st.s}"</b> using <b>${method}</b>. What do you assume at the start?`,
                options: R.shuffle([st.hyp, st.nconcl, both, st.nhyp]),
                answer,
                solution: `Assume <b>"${answer}"</b>, ${goal}. ${method === 'a direct proof' ? 'A direct proof starts from the hypothesis.' : method === 'proof by contrapositive' ? 'The contrapositive ¬q → ¬p starts from the negation of the conclusion.' : 'A proof by contradiction assumes the whole statement is false: the hypothesis holds and the conclusion fails.'} Assuming "${st.nhyp}" would be a mistake: it leads toward the inverse, which is not equivalent.`,
              };
            },
          },
          {
            label: 'Inductive step',
            make(R) {
              const S = R.pick(SUMS);
              const K = R.int(4, 12);
              const X = S.F(K);
              const next = S.f(K + 1);
              const Y = X + next;
              return {
                prompt: String.raw`The claim is \(\displaystyle\sum_{i=1}^{n} ${S.term} = ${S.Ftex}\). Suppose you already know it holds for \(n = ${K}\), so the sum up to \(${K}\) is \(${X}\). Using that fact, what is the sum up to \(n = ${K + 1}\)?`,
                answer: Y,
                hint: 'the sum up to k + 1 is the sum up to k plus one more term.',
                solution: String.raw`Add the next term to the known sum: \(${X} + ${S.ftex(K + 1)} = ${X} + ${next} = ${Y}\). The formula at \(n = ${K + 1}\) also gives \(${Y}\), so it survives the step from \(${K}\) to \(${K + 1}\). The inductive step does this algebra once for a general \(k\), which covers every step at the same time.`,
              };
            },
          },
          {
            label: 'Strong induction',
            make(R, M) {
              const kind = R.int(0, 3);
              if (kind <= 1) {
                // stamps worth a¢ and b¢ with gcd 1: every amount from (a − 1)(b − 1) on can be paid, the step
                // adds one a¢ stamp, so it reaches back a cents and needs a consecutive base cases
                const [a, b] = R.pick([[3, 5], [3, 7], [3, 8], [4, 5], [4, 7], [5, 6], [5, 7], [5, 8]]);
                const N = (a - 1) * (b - 1);
                const pay = (n) => { for (let j = 0; j * b <= n; j++) if ((n - j * b) % a === 0) return [...new Array((n - j * b) / a).fill(a), ...new Array(j).fill(b)]; return [n]; };
                const bases = M.range(N, N + a - 1).map((n) => `${n} = ${pay(n).join(' + ')}`).join(', ');
                const setup = String.raw`Stamps come in ${a}¢ and ${b}¢. Claim: every amount of ${N}¢ or more can be paid exactly. The strong-induction step pays \(k + 1\) cents by paying \(k + 1 - ${a}\) cents and adding one ${a}¢ stamp.`;
                if (kind === 0) {
                  const k1 = N + a + R.int(0, 3 * a);
                  return {
                    prompt: String.raw`${setup} Which earlier amount does the step for \(k + 1 = ${k1}\) rely on?`,
                    answer: k1 - a,
                    hint: `the step removes one ${a}¢ stamp from the amount it is building.`,
                    solution: String.raw`The step uses \(P(${k1} - ${a}) = P(${k1 - a})\): once ${k1 - a}¢ can be paid, one more ${a}¢ stamp pays ${k1}¢. Strong induction may assume every case from ${N} up to \(k\), so reaching back ${a} is allowed because \(${k1 - a} \ge ${N}\). Base cases: ${bases}.`,
                  };
                }
                return {
                  prompt: String.raw`${setup} How many base cases must be checked by hand before the step can take over?`,
                  answer: a,
                  hint: 'the step reaches back a fixed distance; every amount within that distance of the start must be checked directly.',
                  solution: String.raw`The step reaches back ${a} cents, so it can only be used once \(k + 1 - ${a} \ge ${N}\), that is, from \(k + 1 = ${N + a}\) on. The amounts ${N} through ${N + a - 1}, which is ${a} of them, must be paid by hand: ${bases}. Every larger amount then follows by adding ${a}¢ stamps.`,
                };
              }
              if (kind === 2) {
                // the product-of-primes proof: k + 1 = ab splits into two earlier cases, neither of them k
                const m = R.pick(M.range(12, 99).filter((n) => !M.isPrime(n)));
                let a = 2;
                while (m % a) a++;
                const b = m / a;
                const nums = (inp) => String(inp).replace(/[{}()[\]]/g, ' ').split(/[,\s]+/).filter(Boolean).map(Number);
                return {
                  prompt: String.raw`In the strong-induction proof that every integer \(n \ge 2\) is a product of primes, the step for \(k + 1 = ${m}\) writes it as a product of two smaller integers and applies the hypothesis to both. Which earlier cases does the step use? Give the two factors as a set, such as <code>{4, 6}</code>.`,
                  answer: a === b ? [a] : [a, b],
                  format: 'set',
                  check: (inp) => { const xs = nums(inp); const [x, y] = xs.length === 1 ? [xs[0], xs[0]] : xs; return xs.length >= 1 && xs.length <= 2 && [x, y].every((v) => Number.isInteger(v) && v >= 2 && v < m) && x * y === m; },
                  hint: `find any two integers, both at least 2, whose product is ${m}.`,
                  solution: String.raw`\(${m} = ${a} \times ${b}\), so the step uses \(P(${a})\) and \(P(${b})\)${a === b ? ' (the same earlier case twice)' : ''}. Ordinary induction would only offer \(P(${m - 1})\), which says nothing about ${a} or ${b}; strong induction may assume every case from 2 up to \(k = ${m - 1}\). Any other factorization of ${m} into two factors works just as well.`,
                };
              }
              // a recurrence that reaches back more than one step needs that many base cases
              const RECS = [
                { tex: 'a_n = a_{n-1} + a_{n-2}', lags: [1, 2] }, { tex: 'a_n = a_{n-1} + 2a_{n-2}', lags: [1, 2] },
                { tex: 'a_n = a_{n-2} + a_{n-3}', lags: [2, 3] }, { tex: 'a_n = 2a_{n-1} - a_{n-3}', lags: [1, 3] }, { tex: 'a_n = a_{n-1} + a_{n-2} + a_{n-3}', lags: [1, 2, 3] },
              ];
              const rec = R.pick(RECS);
              const depth = Math.max(...rec.lags);
              const given = depth === 2 ? 'a_0, a_1' : 'a_0, a_1, a_2';
              if (R.chance(0.5)) {
                const k1 = depth + R.int(2, 12);
                const used = rec.lags.map((l) => k1 - l);
                const rhs = rec.tex.split('=')[1].trim().replace(/n-(\d)/g, (_, d) => String(k1 - d));
                return {
                  prompt: String.raw`A sequence is defined by \(${rec.tex}\) for \(n \ge ${depth}\), with \(${given}\) given. To prove a property of \(a_n\) for every \(n\) by strong induction, which earlier cases does the step for \(n = ${k1}\) rely on? Answer as a set of indices.`,
                  answer: used,
                  format: 'set',
                  hint: `read the subscripts on the right-hand side with n = ${k1}.`,
                  solution: String.raw`With \(n = ${k1}\) the recurrence reads \(a_{${k1}} = ${rhs}\), so the step uses ${used.map((u) => String.raw`\(P(${u})\)`).join(' and ')}. Ordinary induction offers only \(P(${k1 - 1})\); strong induction lets the step reach back to every case already proved.`,
                };
              }
              return {
                prompt: String.raw`A sequence is defined by \(${rec.tex}\) for \(n \ge ${depth}\). A proof by strong induction that every \(a_n\) has some property follows the recurrence in its step. How many base cases must be checked directly?`,
                answer: depth,
                hint: 'the step can only be used once every index it reaches back to has already been proved.',
                solution: String.raw`The step for \(n\) uses \(${rec.lags.map((l) => `a_{n-${l}}`).join(', ')}\), reaching back ${depth}. For \(n = ${depth}\) that reaches \(a_0\); for any smaller \(n\) it would reach a negative index. So \(${given}\), that is ${depth} base cases, must be checked by hand, exactly the values the definition had to supply.`,
              };
            },
          },
          {
            label: 'Find the counterexample',
            make(R) {
              const B = R.pick(BREAKABLE);
              let n = 1;
              while (n < 200 && B.test(n)) n++;
              const ok = range(1, n - 1);
              return {
                prompt: String.raw`Claim: for every positive integer \(n\), \(${B.tex}\). Find the <b>smallest</b> positive integer \(n\) for which the claim fails.`,
                answer: n,
                hint: 'try n = 1, 2, 3, … in order and check each one.',
                solution: `${ok.length ? `The claim holds for n = ${ok.length > 6 ? `1, 2, …, ${n - 1}` : ok.join(', ')}. ` : ''}At n = ${n}: ${B.why(n)}. One counterexample disproves the claim, however many cases came before it.`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: proofs',
        kind: 'quiz',
        questions: [
          { q: String.raw`From "If the server is down, an alert is sent" and "No alert was sent", you conclude "The server is not down". Which rule is this?`, choices: ['Modus ponens', 'Disjunctive syllogism', 'Affirming the consequent', 'Modus tollens'], answer: 3, explain: String.raw`The form is \(p \to q\), \(\neg q\), therefore \(\neg p\): modus tollens. It is valid because a conditional is equivalent to its contrapositive \(\neg q \to \neg p\).` },
          { q: '"If it rained, the street is wet. The street is wet. Therefore it rained." What is wrong with this argument?', choices: ['It affirms the consequent', 'Nothing, it is modus ponens', 'It denies the antecedent', 'Its premises contradict each other'], answer: 0, explain: String.raw`The form \(p \to q\), \(q\), therefore \(p\) is the fallacy of affirming the consequent. A street cleaner could have wet the street: premises true, conclusion false.` },
          { q: String.raw`To prove "if \(n^2\) is odd, then \(n\) is odd" by contrapositive, what do you assume?`, choices: [String.raw`\(n^2\) is odd`, String.raw`\(n\) is even`, String.raw`\(n^2\) is even`, String.raw`\(n^2\) is odd and \(n\) is even`], answer: 1, explain: String.raw`The contrapositive is "if \(n\) is even, then \(n^2\) is even", so you assume \(n\) is even and derive that \(n^2\) is even. Assuming that \(n^2\) is odd and \(n\) is even is how a proof by contradiction would start.` },
          { q: String.raw`A proof that \(\sqrt2\) is irrational begins "Suppose \(\sqrt2 = a/b\) in lowest terms." What kind of proof is it?`, choices: ['Direct proof', 'Proof by cases', 'Proof by contradiction', 'Mathematical induction'], answer: 2, explain: 'It assumes the opposite of the claim (that √2 is rational) and derives that a and b are both even, which contradicts "lowest terms". The assumption must be false.' },
          { q: String.raw`\(n^2 + n + 41\) is prime for \(n = 0, 1, \dots, 39\). What can you conclude about all \(n \ge 0\)?`, choices: ['It is prime for all n, by the pattern', 'It is prime for all n, by induction', 'Nothing yet; and in fact n = 40 gives 41²', 'It is never prime after 39'], answer: 2, explain: 'Examples never prove a universal claim. n = 40 gives 1681 = 41 × 41, a counterexample. (It is also not "never prime" afterward: n = 42 gives 1847, which is prime.)' },
          { q: 'In a proof by induction, what does the inductive step establish?', choices: ['P(n₀) is true', 'P(k) is true for every k', 'P(k + 1) → P(k) for every k', 'P(k) → P(k + 1) for every k ≥ n₀'], answer: 3, explain: 'The inductive step proves the implication P(k) → P(k + 1) for an arbitrary k. Combined with the base case P(n₀), it topples every domino. Assuming P(k) for every k would be circular.' },
          { q: 'How does strong induction differ from ordinary induction?', choices: ['It needs no base case', 'Its inductive step may assume P(n₀), …, P(k) all together', 'It works only for prime numbers', 'It proves P(k + 1) → P(k)'], answer: 1, explain: 'Strong induction lets you use any earlier case. That is what the prime-factorization proof needs, because k + 1 = ab splits into factors a and b that are smaller than k but not equal to k.' },
          { q: 'Using only 4¢ and 5¢ stamps, what is the largest amount that cannot be paid?', choices: ['7¢', '11¢', '12¢', '15¢'], answer: 1, explain: '11 cannot be written with 4s and 5s, while 12, 13, 14 and 15 can. From those four base cases, strong induction (add a 4¢ stamp to n − 4) covers every amount from 12 up.' },
          { q: 'In a loop-invariant proof, which check plays the role of the base case?', choices: ['Termination', 'Maintenance', 'Initialization', 'The loop condition'], answer: 2, explain: 'Initialization shows the invariant holds before the first iteration, like P(n₀). Maintenance is the inductive step, and termination combines the invariant with the exit condition to get the final result.' },
          { q: String.raw`In Euclid's proof, \(N = p_1 p_2 \cdots p_k + 1\). Must \(N\) itself be prime?`, choices: ['No: 2·3·5·7·11·13 + 1 = 30031 = 59 × 509', 'Yes, always', 'Only when k is even', 'Only when k is odd'], answer: 0, explain: 'The proof only needs N to have some prime factor, and that factor cannot be on the list. N itself can be composite, as 30031 = 59 × 509 shows. Believing that N must be prime is a common misreading of the proof.' },
        ],
      },
    ],
  });
})();
