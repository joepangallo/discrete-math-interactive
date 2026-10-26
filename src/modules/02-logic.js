/* Module 2: Logic. Objective 2: use logic to read and develop proofs.
   Propositions and connectives, the conditional, equivalence laws, predicates and quantifiers, and the
   same ideas written as Boolean expressions in code. */
(() => {
  // ---- propositional formulas: the parser, evaluator and printers live in DM.logic (src/lib/logic.js) ----
  const { parse, ev, show, toTex, steps, varsOf, assignments, L, tf, envText, firstDifference, sameMeaning, reason } = DM.logic;
  // a static truth table for the concept slides: cols = [[texHeader, env => bool], ...]
  function ttHtml(vars, cols, hit) {
    const head = vars.map((v) => `<th>\\(${v}\\)</th>`).concat(cols.map(([t]) => `<th>\\(${t}\\)</th>`)).join('');
    const rows = assignments(vars).map((e) => `<tr${hit && hit(e) ? ' class="hit"' : ''}>${vars.map((v) => `<td>${tf(e[v])}</td>`).join('')}${cols.map(([, f]) => `<td>${tf(f(e))}</td>`).join('')}</tr>`).join('');
    return `<table class="tt lg-static"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  const TT_BASIC = ttHtml(['p', 'q'], [['\\neg p', (e) => !e.p], ['p \\land q', (e) => e.p && e.q], ['p \\lor q', (e) => e.p || e.q], ['p \\oplus q', (e) => e.p !== e.q]]);
  const TT_COND = ttHtml(['p', 'q'], [['p \\to q', (e) => !e.p || e.q]], (e) => e.p && !e.q);

  // ---- the quantifier playground's world: shapes with a color and a size ----
  const HUES = { red: 'var(--false)', blue: 'var(--fnc)', green: 'var(--true)' };
  const is = {
    Circle: (o) => o.shape === 'circle', Square: (o) => o.shape === 'square', Triangle: (o) => o.shape === 'triangle',
    Red: (o) => o.color === 'red', Large: (o) => o.size === 'large',
  };
  const START_WORLD = [
    ['circle', 'red', 'large'], ['circle', 'red', 'small'], ['square', 'blue', 'small'], ['circle', 'blue', 'large'],
    ['triangle', 'green', 'small'], ['square', 'red', 'large'], ['square', 'green', 'small'], ['triangle', 'blue', 'large'],
  ].map(([shape, color, size]) => ({ shape, color, size }));
  const STATEMENTS = [
    { tex: String.raw`\forall x\  \text{Circle}(x)`, en: 'Every object is a circle.', q: '∀', f: is.Circle,
      neg: String.raw`\exists x\  \neg\text{Circle}(x)`, negEn: 'Some object is not a circle.',
      note: 'A ∀ statement needs every object to pass. One object that fails is a counterexample, and one is enough.' },
    { tex: String.raw`\exists x\  \text{Red}(x)`, en: 'Some object is red.', q: '∃', f: is.Red,
      neg: String.raw`\forall x\  \neg\text{Red}(x)`, negEn: 'No object is red.',
      note: 'An ∃ statement needs just one witness. To make it false you would have to recolor every red object.' },
    { tex: String.raw`\forall x\  (\text{Circle}(x) \to \text{Red}(x))`, en: 'Every circle is red.', q: '∀', f: (x) => !is.Circle(x) || is.Red(x),
      neg: String.raw`\exists x\  (\text{Circle}(x) \land \neg\text{Red}(x))`, negEn: 'Some circle is not red.',
      note: 'Squares and triangles pass automatically: for them Circle(x) is false, so the conditional is vacuously true. Only a circle that is not red can break this statement.' },
    { tex: String.raw`\forall x\  (\text{Circle}(x) \land \text{Red}(x))`, en: 'Every object is a red circle.', q: '∀', f: (x) => is.Circle(x) && is.Red(x),
      neg: String.raw`\exists x\  (\neg\text{Circle}(x) \lor \neg\text{Red}(x))`, negEn: 'Some object is not a circle or not red.',
      note: 'This is the classic mistranslation of "every circle is red". With ∧ inside ∀, every square and every triangle becomes a counterexample.' },
    { tex: String.raw`\exists x\  (\text{Triangle}(x) \land \text{Large}(x))`, en: 'Some triangle is large.', q: '∃', f: (x) => is.Triangle(x) && is.Large(x),
      neg: String.raw`\forall x\  (\text{Triangle}(x) \to \neg\text{Large}(x))`, negEn: 'Every triangle is small.',
      note: '"Some A is B" uses ∧ inside ∃: the witness must be a triangle and also large.' },
    { tex: String.raw`\exists x\  (\text{Triangle}(x) \to \text{Large}(x))`, en: 'Some object is large if it is a triangle.', q: '∃', f: (x) => !is.Triangle(x) || is.Large(x),
      neg: String.raw`\forall x\  (\text{Triangle}(x) \land \neg\text{Large}(x))`, negEn: 'Every object is a small triangle.',
      note: 'The trap with → inside ∃: any object that is not a triangle is a witness, because the conditional is vacuously true for it. The statement says almost nothing.' },
    { tex: String.raw`\forall x\  \exists y\  (x \ne y \land \text{SameColor}(x, y))`, en: 'Every object shares its color with some other object.', q: '∀∃', iv: 'y', f: (x, y) => x !== y && x.color === y.color,
      neg: String.raw`\exists x\  \forall y\  (x = y \lor \neg\text{SameColor}(x, y))`, negEn: 'Some object has a color that no other object has.',
      note: 'Read nested quantifiers left to right. For each x you may pick a different y, so each object only needs a partner of its own.' },
    { tex: String.raw`\forall x\  \exists y\  (\text{Square}(y) \land \text{SameColor}(x, y))`, en: 'Every object has a square of its color.', q: '∀∃', iv: 'y', f: (x, y) => is.Square(y) && x.color === y.color,
      neg: String.raw`\exists x\  \forall y\  (\neg\text{Square}(y) \lor \neg\text{SameColor}(x, y))`, negEn: 'Some object has no square of its color.',
      note: 'Here y may depend on x: a red object points to a red square and a blue object to a blue square. The next statement swaps the two quantifiers.' },
    { tex: String.raw`\exists y\  \forall x\  (\text{Square}(y) \land \text{SameColor}(x, y))`, en: 'One square has the color of every object.', q: '∃∀', iv: 'x', f: (y, x) => is.Square(y) && x.color === y.color,
      neg: String.raw`\forall y\  \exists x\  (\neg\text{Square}(y) \lor \neg\text{SameColor}(x, y))`, negEn: 'Every candidate y is not a square or differs in color from some x.',
      note: 'Same words, quantifiers swapped. Now one y must work for every x at once, which can only happen when every object has the same color.' },
  ];
  // per object: does the inner part hold, and which partner object explains it
  function evaluate(st, D) {
    const res = [], info = [];
    D.forEach((o) => {
      if (st.q.length === 1) { res.push(st.f(o)); info.push(''); return; }
      if (st.q[1] === '∃') {
        const j = D.findIndex((y) => st.f(o, y));
        res.push(j >= 0); info.push(j >= 0 ? `${st.iv} = #${j + 1}` : `no ${st.iv} works`);
      } else {
        const j = D.findIndex((x) => !st.f(o, x));
        res.push(j < 0); info.push(j < 0 ? `every ${st.iv} works` : `fails at ${st.iv} = #${j + 1}`);
      }
    });
    return { res, info, truth: st.q[0] === '∀' ? res.every(Boolean) : res.some(Boolean) };
  }

  // ---- practice data ----
  const TOPICS = [
    { p: 'it is raining', np: 'it is not raining', q: 'the game is cancelled', nq: 'the game is not cancelled' },
    { p: 'the password is correct', np: 'the password is wrong', q: 'access is granted', nq: 'access is denied' },
    { p: 'the model is retrained', np: 'the model is not retrained', q: 'accuracy improves', nq: 'accuracy does not improve' },
    { p: 'the server is down', np: 'the server is up', q: 'an alert is sent', nq: 'no alert is sent' },
    { p: 'the battery is low', np: 'the battery is not low', q: 'the phone dims the screen', nq: 'the phone does not dim the screen' },
    { p: 'you practice daily', np: 'you do not practice daily', q: 'your typing speed improves', nq: 'your typing speed does not improve' },
  ];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const PAIRS = [
    ['¬(p ∧ q)', '¬p ∨ ¬q', "De Morgan's law: \"not both\" means \"at least one is false\"."],
    ['¬(p ∨ q)', '¬p ∧ ¬q', "De Morgan's law: \"not either\" means \"neither\"."],
    ['¬(p ∧ q)', '¬p ∧ ¬q', 'A misuse of De Morgan: when ¬ moves inside, ∧ must flip to ∨.'],
    ['¬(p ∨ q)', '¬p ∨ ¬q', 'A misuse of De Morgan: when ¬ moves inside, ∨ must flip to ∧.'],
    ['p → q', '¬p ∨ q', 'The implication law.'],
    ['p → q', '¬q → ¬p', 'The contrapositive law.'],
    ['p → q', 'q → p', 'This is the converse, which is not equivalent to the original.'],
    ['p → q', '¬p → ¬q', 'This is the inverse, which is not equivalent to the original.'],
    ['¬(p → q)', 'p ∧ ¬q', 'Negating a conditional: the promise is broken exactly when p happens and q does not.'],
    ['¬(p → q)', '¬p → ¬q', 'A common mistake: the negation of a conditional is not another conditional.'],
    ['p ↔ q', '(p → q) ∧ (q → p)', 'The biconditional law: "if and only if" is two conditionals.'],
    ['p ∧ (q ∨ r)', '(p ∧ q) ∨ (p ∧ r)', 'The distributive law.'],
    ['p ∨ (q ∧ r)', '(p ∨ q) ∧ r', 'Misplaced parentheses: the correct distributive law gives (p ∨ q) ∧ (p ∨ r).'],
    ['(p ∧ q) → r', 'p → (q → r)', 'The exportation law: nested ifs equal one if with "and".'],
    ['(p → q) → r', 'p → (q → r)', '→ is not associative, so the parentheses matter.'],
    ['p ∨ (p ∧ q)', 'p', 'The absorption law.'],
    ['p ⊕ q', '¬(p ↔ q)', 'Exclusive or means "the two values differ".'],
    ['(p ∨ q) → r', '(p → r) ∧ (q → r)', 'Proving something from "p or q" means proving it from each case.'],
    ['(p ∧ q) → r', '(p → r) ∧ (q → r)', 'Not equivalent: needing both p and q is weaker than needing only one.'],
  ];
  function rename(n, map) {
    if (n.v) return { v: map[n.v] || n.v };
    if ('c' in n) return n;
    return n.b ? { op: n.op, a: rename(n.a, map), b: rename(n.b, map) } : { op: n.op, a: rename(n.a, map) };
  }
  function literal(R) { const v = { v: R.pick(['p', 'q', 'r']) }; return R.chance(0.3) ? { op: '¬', a: v } : v; }
  function randomFormula(R) {
    const op = () => R.pick(['∧', '∨', '→', '→', '↔', '⊕']);
    const side = () => {
      if (R.chance(0.45)) return literal(R);
      const n = { op: op(), a: literal(R), b: literal(R) };
      return R.chance(0.25) ? { op: '¬', a: n } : n;
    };
    for (let tries = 0; tries < 30; tries++) {
      const f = { op: op(), a: side(), b: side() };
      const bad = steps(f).some((n) => n.b && show(n.a).replace('¬', '') === show(n.b).replace('¬', ''));
      if (!bad && varsOf(f).length >= 2 && steps(f).length >= 3) return f;
    }
    return parse('(p → q) ∧ ¬r');
  }

  // ---- worked example: the truth table for [(p -> q) and (q -> r)] -> (p -> r), built column by column ----
  const EX_TT_VARS = ['p', 'q', 'r'];
  const EX_TT_ENVS = assignments(EX_TT_VARS);
  const EX_TT_COLS = [
    { tex: String.raw`p \to q`, f: (e) => !e.p || e.q },
    { tex: String.raw`q \to r`, f: (e) => !e.q || e.r },
    { tex: String.raw`(p \to q) \land (q \to r)`, f: (e) => (!e.p || e.q) && (!e.q || e.r) },
    { tex: String.raw`\big[(p \to q) \land (q \to r)\big] \to (p \to r)`, f: (e) => { const pq = !e.p || e.q, qr = !e.q || e.r, pr = !e.p || e.r; return !(pq && qr) || pr; } },
  ];
  // rows where the hypothesis of the whole formula holds: the only rows that could make it false
  const EX_TT_DANGER = EX_TT_ENVS.map((e, i) => (EX_TT_COLS[2].f(e) ? i : -1)).filter((i) => i >= 0);

  // ---- worked example: rewriting the negated conditional ¬(p -> q) as p ∧ ¬q, one named law per line ----
  const EX_NC_VARS = ['p', 'q'];
  const EX_NC_ALL = assignments(EX_NC_VARS);
  // the revealing row (p = T, q = F) comes first, then the remaining rows in textbook order,
  // so both formula columns read T, F, F, F from top to bottom
  const EX_NC_ENVS = [EX_NC_ALL[1], EX_NC_ALL[0], EX_NC_ALL[2], EX_NC_ALL[3]];
  const EX_NC_COLS = [
    { tex: String.raw`\neg(p \to q)`, f: (e) => !(!e.p || e.q) },
    { tex: String.raw`p \land \neg q`, f: (e) => e.p && !e.q },
  ];
  const EX_NC_LINES = [
    { tex: String.raw`\neg(p \to q)`, law: 'starting formula' },
    { tex: String.raw`\neg(\neg p \lor q)`, law: String.raw`implication law: \(p \to q \equiv \neg p \lor q\)` },
    { tex: String.raw`\neg\neg p \land \neg q`, law: String.raw`De Morgan's law: \(\neg(X \lor Y) \equiv \neg X \land \neg Y\)` },
    { tex: String.raw`p \land \neg q`, law: String.raw`double negation: \(\neg\neg p \equiv p\)` },
  ];

  DM.module({
    id: 'logic',
    num: 2,
    title: 'Logic',
    objectives: [2],
    terms: {
      'proposition': 'A sentence that is either true or false, but not both. "7 is prime" is a proposition; "Close the door" is not.',
      'truth table': 'A table that lists every combination of truth values for the variables and the resulting value of a formula. With n variables it has 2ⁿ rows.',
      'negation': '¬p, read "not p". It is true exactly when p is false.',
      'conjunction': 'p ∧ q, read "p and q". It is true only when both p and q are true.',
      'disjunction': 'p ∨ q, read "p or q". It is true when at least one of p, q is true (inclusive or).',
      'exclusive or': 'p ⊕ q, true when exactly one of p and q is true. It means "p or q, but not both".',
      'conditional': 'p → q, read "if p then q". p is the hypothesis and q the conclusion. It is false only when p is true and q is false.',
      'vacuously true': 'A conditional whose hypothesis is false is true no matter what its conclusion says, because its promise is never tested.',
      'converse': 'The converse of p → q is q → p. It is not equivalent to the original.',
      'inverse': 'The inverse of p → q is ¬p → ¬q. It is equivalent to the converse, not to the original.',
      'contrapositive': 'The contrapositive of p → q is ¬q → ¬p. It is logically equivalent to the original conditional.',
      'biconditional': 'p ↔ q, read "p if and only if q". It is true when p and q have the same truth value.',
      'tautology': 'A formula that is true in every row of its truth table, such as p ∨ ¬p.',
      'contradiction': 'A formula that is false in every row of its truth table, such as p ∧ ¬p.',
      'logically equivalent': 'Two formulas are logically equivalent, written P ≡ Q, when they have the same truth value in every row. Equivalently, P ↔ Q is a tautology.',
      'predicate': 'A statement with a variable, such as P(x): "x > 3". It becomes a proposition once a value from the domain is chosen for x.',
      'domain of discourse': 'The set of values a quantified variable ranges over. The truth of ∀x P(x) can change when the domain changes.',
      'universal quantifier': '∀x P(x), read "for all x, P(x)". True when P(x) holds for every x in the domain. One counterexample makes it false.',
      'existential quantifier': '∃x P(x), read "there exists an x such that P(x)". True when at least one x in the domain (a witness) makes P(x) true.',
      'short-circuit evaluation': 'Evaluating and/or from left to right and stopping as soon as the result is known. In a and b, b is skipped when a is false.',
    },
    symbols: [
      ['¬', 'not (negation)', '¬p'],
      ['∧', 'and (conjunction)', 'p ∧ q'],
      ['∨', 'or, inclusive (disjunction)', 'p ∨ q'],
      ['⊕', 'exclusive or', 'p ⊕ q'],
      ['→', 'if … then (conditional)', 'p → q'],
      ['↔', 'if and only if (biconditional)', 'p ↔ q'],
      ['≡', 'is logically equivalent to', 'p → q ≡ ¬p ∨ q'],
      ['T  F', 'the truth values true and false', 'T ∧ F = F'],
      ['P(x)', 'predicate applied to x', 'P(x): x > 3'],
      ['∀', 'for all (universal quantifier)', '∀x P(x)'],
      ['∃', 'there exists (existential quantifier)', '∃x P(x)'],
    ],
    css: `
      .lg-static { font-size: 0.86rem; }
      .lg-static th, .lg-static td { padding: 0.14rem 0.55rem; }
      .lg-tt { font-size: 0.8rem; border-collapse: collapse; }
      .lg-tt th, .lg-tt td { padding: 0.1rem 0.45rem; }
      .lg-tt th { white-space: normal; min-width: 2rem; }
      .lg-tt .pill { font-size: 0.74rem; padding: 0 0.3rem; }
      .lg-tt.big { font-size: 0.95rem; }
      .lg-tt.big th, .lg-tt.big td { padding: 0.2rem 0.7rem; }
      .lg-tt.big .pill { font-size: 0.84rem; }
      .lg-tt.dense th, .lg-tt.dense td { padding: 0.03rem 0.4rem; }
      .lg-tt th.fin, .lg-tt td.fin { background: var(--accent-2); }
      .lg-tt th.vr { background: var(--sheet); color: var(--accent); }
      .lg-tt tbody tr { cursor: pointer; }
      .lg-tt tbody tr:hover td { background: var(--paper); }
      .lg-tt tr.sel td { box-shadow: inset 0 2px 0 var(--accent), inset 0 -2px 0 var(--accent); }
      .lg-tt tr.diff td { background: var(--false-bg); }
      .lg-tt tr.diff td.flag { color: var(--false); font-weight: 700; }
      .lg-tt td.flag { color: var(--true); }
      .lg-tablewrap { overflow: auto; min-height: 0; display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-start; }
      .lg-why ul { list-style: none; padding: 0; margin: 0.25rem 0 0; }
      .lg-why li { font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.45; }
      .lg-why li b { font-family: var(--font-body); }
      .lg-badge { display: inline-block; font-family: var(--font-mono); font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; border-radius: 0.3rem; padding: 0.1rem 0.5rem; }
      .lg-badge.t { background: var(--true-bg); color: var(--true); }
      .lg-badge.f { background: var(--false-bg); color: var(--false); }
      .lg-badge.n { background: var(--warn-bg); color: var(--warn); }
      .lg-presets { display: flex; flex-wrap: wrap; gap: 0.25rem; }
      .lg-presets .btn { font-family: var(--font-mono); font-size: 0.74rem; padding: 0.1rem 0.4rem; }
      .lg-promise { display: flex; flex-direction: column; gap: 0.5rem; }
      .lg-cases { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
      .lg-case { border: 1px solid var(--rule); border-radius: var(--radius); background: var(--paper); padding: 0.45rem 0.6rem; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.86rem; }
      .lg-case.right { border-color: var(--true); }
      .lg-case.wrong { border-color: var(--false); }
      .lg-case .res { font-size: 0.8rem; color: var(--ink-2); }
      .lg-stmts { display: flex; flex-direction: column; gap: 0.25rem; min-height: 0; }
      .lg-stmts button { text-align: left; border: 1px solid var(--rule); background: var(--sheet); border-radius: var(--radius); padding: 0.2rem 0.55rem; cursor: pointer; font-size: 0.88rem; color: var(--ink); }
      .lg-stmts button.on { border-color: var(--accent); background: var(--accent-2); }
      .lg-tiles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.4rem; }
      .lg-tile { display: flex; flex-direction: column; align-items: center; gap: 0; border: 1.5px solid var(--rule); border-radius: var(--radius); background: var(--sheet); padding: 0.2rem 0.15rem 0.25rem; cursor: pointer; font-size: 0.7rem; color: var(--ink-2); line-height: 1.25; }
      .lg-tile svg { width: 2.6rem; height: 2.6rem; }
      .lg-tile .id { font-family: var(--font-mono); font-weight: 600; color: var(--ink); }
      .lg-tile.wit { border-color: var(--true); background: var(--true-bg); }
      .lg-tile.cex { border-color: var(--false); background: var(--false-bg); }
      .lg-tile.sel { box-shadow: 0 0 0 3px var(--accent); }
      .lg-tile.add { justify-content: center; border-style: dashed; font-size: 0.8rem; color: var(--accent); }
      .lg-edit { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--ink-2); }
      .lg-edit .seg button { padding: 0.12rem 0.5rem; font-size: 0.78rem; }
      .lg-code td { white-space: nowrap; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Propositions and the basic connectives',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">proposition</span> is a sentence that is either true or false (T or F), but not both. We name propositions with letters such as \(p\), \(q\) and \(r\).</div>
              <div class="split" style="gap:0.6rem">
                <div class="box small"><span class="lbl ok">Propositions</span>"7 is prime." (T)<br>"\(2 + 2 = 5\)." (F)<br>"Every even number above 2 is a sum of two primes." (Nobody knows which, yet it is one of the two.)</div>
                <div class="box small"><span class="lbl bad">Not propositions</span>"Close the door." (a command)<br>"Is it raining?" (a question)<br>"\(x + 1 = 3\)." (true or false only once \(x\) is chosen)</div>
              </div>
              <p>To translate English, name the simple parts first. With \(p\): "it is raining" and \(q\): "I take an umbrella":</p>
              <table class="data small">
                <tbody>
                  <tr><td>It is raining and I take an umbrella.</td><td>\(p \land q\)</td></tr>
                  <tr><td>It is raining, but I take no umbrella.</td><td>\(p \land \neg q\)</td></tr>
                  <tr><td>Either it is raining or I take an umbrella, not both.</td><td>\(p \oplus q\)</td></tr>
                </tbody>
              </table>
            </div>
            <div class="stack">
              ${TT_BASIC}
              <p class="small">\(\neg\) is <span class="term">negation</span>, \(\land\) <span class="term">conjunction</span>, \(\lor\) <span class="term">disjunction</span> and \(\oplus\) <span class="term">exclusive or</span>. One row per combination of values makes a <span class="term">truth table</span>.</p>
              <div class="warn">Logic's "or" is inclusive: \(p \lor q\) is true when both parts are true. English often means the exclusive kind ("soup or salad?"). And "but" is just "and" with a contrast.</div>
              <div class="ai">Rule-based expert systems store knowledge as rules such as IF fever ∧ cough ∧ ¬vaccinated THEN test. They fire every rule whose condition is T.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'The conditional: when is a promise broken?',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">The <span class="term">conditional</span> \(p \to q\) reads "if \(p\), then \(q\)". \(p\) is the <b>hypothesis</b> (or antecedent) and \(q\) is the <b>conclusion</b> (or consequent). It is false in exactly one case: \(p\) true and \(q\) false.</div>
              <div class="row" style="align-items:flex-start;gap:1rem;flex-wrap:nowrap">
                ${TT_COND}
                <p class="small">Think of \(p \to q\) as a promise. The highlighted row is the only way to break it. When the hypothesis is false, nothing was promised, so the conditional counts as true. We say it is <span class="term">vacuously true</span>.</p>
              </div>
              <div class="ex">"If \(2 + 2 = 5\), then the moon is made of cheese" is true, because its hypothesis is false. "If 7 is prime, then \(2 + 2 = 4\)" is also true, even though the two parts have nothing to do with each other. Logic looks only at truth values; it never asks whether the parts are related.</div>
              <div class="why">Every <code>if</code> in a program, every requirement in a specification ("if the input is valid, the output is sorted") and every step of a proof is a conditional. A test whose input never makes the hypothesis true can never catch a broken promise.</div>
            </div>
            <div class="card lg-promise"></div>
          </div>`,
        render(body, ctx) {
          const { h } = ctx;
          const host = body.querySelector('.lg-promise');
          const cases = [
            { p: true, q: true, txt: 'You finish on time. I buy you lunch.', why: 'Both parts happened, so the promise was kept.' },
            { p: true, q: false, txt: 'You finish on time. I do not buy you lunch.', why: 'The only way to break it: the hypothesis happened and the conclusion did not.' },
            { p: false, q: true, txt: 'You finish late. I buy you lunch anyway.', why: 'I promised nothing about a late report, so a kind lunch breaks nothing.' },
            { p: false, q: false, txt: 'You finish late. I do not buy you lunch.', why: 'The hypothesis is false, so the promise was never tested: vacuously true.' },
          ];
          const picks = cases.map(() => null);
          const grid = h('div.lg-cases');
          const score = h('div.small');
          host.append(
            h('div.tiny.mono.muted', 'PROMISE CHECKER'),
            h('div', { html: '<b>"If you finish the report by Friday, then I will buy you lunch."</b>' }),
            h('div.small.muted', { html: 'Here \\(p\\) is "you finish by Friday" and \\(q\\) is "I buy you lunch". For each scenario, decide whether the promise was kept or broken.' }),
            grid, score,
            h('button.btn.sm', { style: { alignSelf: 'flex-start' }, onclick: () => { picks.fill(null); draw(); } }, 'Try again'));
          ctx.tex(host);
          function draw() {
            ctx.rc(grid, ...cases.map((c, i) => {
              const truth = !c.p || c.q;
              const pick = picks[i];
              const done = pick !== null;
              const ok = done && pick === truth;
              const btn = (val, label) => h('button.btn.sm', { disabled: done, class: done && pick === val ? 'on' : '', onclick: () => { picks[i] = val; draw(); } }, label);
              const card = h('div.lg-case', { class: done ? (ok ? 'right' : 'wrong') : '' },
                h('div.tiny.mono.muted', `p = ${L(c.p)}, q = ${L(c.q)}`),
                h('div', c.txt),
                h('div.row', { style: { gap: '0.3rem' } }, btn(true, 'Kept'), btn(false, 'Broken')),
                done ? h('div.res', { html: `<b class="${ok ? 'ok' : 'bad'}">${ok ? 'Right.' : 'Not quite.'}</b> \\(p \\to q\\) is ${tf(truth)}. ${c.why}` }) : null);
              ctx.tex(card);
              return card;
            }));
            const n = picks.filter((x) => x !== null).length;
            const right = picks.filter((x, i) => x !== null && x === (!cases[i].p || cases[i].q)).length;
            score.innerHTML = n ? `<b>${right}</b> of <b>${n}</b> judged correctly.${n === 4 && right < 4 ? ' Most people miss the last two: a false hypothesis never breaks a promise.' : ''}` : '<span class="muted">Your score appears here.</span>';
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Only if, necessary, sufficient, and the contrapositive',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p>All of these English forms mean \(p \to q\). Find the hypothesis first: "if" introduces it, and "only if" introduces the conclusion.</p>
              <table class="data small">
                <tbody>
                  <tr><td>if \(p\), then \(q\) &nbsp;·&nbsp; \(p\) implies \(q\)</td><td rowspan="4" style="vertical-align:middle;font-size:1.05rem">\(p \to q\)</td></tr>
                  <tr><td>\(q\) if \(p\) &nbsp;·&nbsp; \(q\) whenever \(p\)</td></tr>
                  <tr><td>\(p\) only if \(q\)</td></tr>
                  <tr><td>\(p\) is sufficient for \(q\) &nbsp;·&nbsp; \(q\) is necessary for \(p\)</td></tr>
                </tbody>
              </table>
              <div class="warn">"You pass only if you submit the project" is pass \(\to\) submit. Submitting is necessary, not sufficient: you can submit and still fail.</div>
              <div class="def">The <span class="term">biconditional</span> \(p \leftrightarrow q\) ("\(p\) if and only if \(q\)") is true when \(p\) and \(q\) have the same truth value. It equals \((p \to q) \land (q \to p)\): each is necessary and sufficient for the other.</div>
            </div>
            <div class="stack">
              <table class="data small">
                <thead><tr><th>Name</th><th>Form</th><th>Example</th></tr></thead>
                <tbody>
                  <tr><td><span class="term">Conditional</span></td><td>\(p \to q\)</td><td>If it is a dog, then it is a mammal. <b class="ok">T</b></td></tr>
                  <tr><td><span class="term">Converse</span></td><td>\(q \to p\)</td><td>If it is a mammal, then it is a dog. <b class="bad">F</b> (a cat)</td></tr>
                  <tr><td><span class="term">Inverse</span></td><td>\(\neg p \to \neg q\)</td><td>If it is not a dog, then it is not a mammal. <b class="bad">F</b> (a cat)</td></tr>
                  <tr><td><span class="term">Contrapositive</span></td><td>\(\neg q \to \neg p\)</td><td>If it is not a mammal, then it is not a dog. <b class="ok">T</b></td></tr>
                </tbody>
              </table>
              <div class="thm">\(p \to q \equiv \neg q \to \neg p\). A conditional and its contrapositive always share a truth value. The converse and the inverse are equivalent to each other, but neither is equivalent to the original.</div>
              <div class="tip">Confusing a rule with its converse is a classic reasoning bug. "Every admin can delete posts" does not mean "everyone who can delete posts is an admin". When you check a permission, check the direction the rule actually states.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Lab: truth-table generator',
        kind: 'lab',
        html: String.raw`<p class="muted small">Type any formula in \(p, q, r, s\) or pick a preset. Each sub-formula gets its own column, so you can watch the value build from the inside out. Click a row to see why it comes out that way. Keyboard forms work too: <code>~</code> <code>&amp;</code> <code>|</code> <code>^</code> <code>-&gt;</code> <code>&lt;-&gt;</code>.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const presets = ['p → q', '¬p ∨ q', 'p ∨ ¬p', 'p ∧ ¬p', 'p ⊕ q', '¬(p ∧ q)', '(p → q) ∧ (q → r)', '(p → q) ∧ (q → r) → (p → r)', '(p → q) ∧ q → p', '(p ∨ q) ∧ ¬p → q', 'p ∧ q → r ∨ s'];
          let expr = '(p → q) ∧ (q → r)';
          let all = true;
          let sel = null;
          const input = h('input.inp.mono', { value: expr, 'aria-label': 'Formula', spellcheck: 'false', autocomplete: 'off', style: { width: '100%', fontSize: '1.05rem' } });
          const msg = h('div.feedback');
          const verdict = h('div.stack', { style: { gap: '0.3rem' } });
          const why = h('div.lg-why.small');
          const wrap = h('div.lg-tablewrap');
          const toggle = h('button.btn.sm', { onclick: () => { all = !all; toggle.textContent = all ? 'Hide sub-formula columns' : 'Show sub-formula columns'; draw(); } }, 'Hide sub-formula columns');
          const insert = (sym) => {
            const a = input.selectionStart ?? input.value.length;
            input.setRangeText(sym, a, input.selectionEnd ?? a, 'end');
            input.focus();
            expr = input.value; sel = null; draw();
          };
          input.addEventListener('input', () => { expr = input.value; sel = null; draw(); });
          const keys = h('div.row', { style: { gap: '0.25rem' } }, ['¬', '∧', '∨', '⊕', '→', '↔', '(', ')', 'p', 'q', 'r', 's'].map((k) => h('button.btn.sm.mono', { 'aria-label': `insert ${k}`, onclick: () => insert('∧∨⊕→↔'.includes(k) ? ` ${k} ` : k) }, k)));
          const left = h('div.stack', { style: { gap: '0.5rem', minHeight: 0 } },
            h('label.field', 'Formula', input), keys,
            h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.2rem' } }, 'PRESETS'), h('div.lg-presets', presets.map((p) => h('button.btn', { onclick: () => { input.value = expr = p; sel = null; draw(); } }, p)))),
            h('div', toggle), msg, verdict, why);
          body.append(h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch' } }, left, wrap));
          function draw() {
            let tree;
            try { tree = parse(expr); msg.className = 'feedback'; msg.textContent = ''; }
            catch (e) { msg.className = 'feedback bad'; msg.textContent = e.message; ctx.rc(verdict); ctx.rc(why); ctx.rc(wrap); return; }
            const vars = varsOf(tree);
            const envs = assignments(vars);
            let cols = all ? steps(tree) : [tree];
            if (!cols.length) cols = [tree];
            const fin = envs.map((e) => ev(tree, e));
            const nT = fin.filter(Boolean).length;
            if (sel === null || sel >= envs.length) sel = Math.max(0, nT === envs.length ? 0 : fin.indexOf(false));
            const table = h('table.tt.lg-tt', { class: envs.length <= 8 ? 'big' : envs.length > 8 ? 'dense' : '' },
              h('thead', h('tr', vars.map((v) => h('th.vr', { html: `\\(${v}\\)` })), cols.map((n, j) => h('th', { class: j === cols.length - 1 ? 'fin' : '', html: `\\(${toTex(n)}\\)` })))),
              h('tbody', envs.map((e, i) => h('tr', { class: i === sel ? 'sel' : '', title: 'Explain this row', onclick: () => { sel = i; draw(); } },
                vars.map((v) => h('td', { html: tf(e[v]) })),
                cols.map((n, j) => h('td', { class: j === cols.length - 1 ? 'fin' : '', html: tf(ev(n, e)) }))))));
            ctx.rc(wrap, table, h('div.tiny.muted', `${envs.length} rows = \\(2^{${vars.length}}\\), one for each way to assign T or F to ${vars.join(', ') || 'no variables'}. The shaded column is the whole formula.`));
            ctx.tex(wrap);
            const kind = nT === envs.length ? 'tautology' : nT === 0 ? 'contradiction' : 'contingency';
            const text = {
              tautology: `True in all ${envs.length} rows, so it is a <span class="term">tautology</span>. Its truth never depends on the variables. The laws of logic and the valid rules of inference are tautologies.`,
              contradiction: `False in all ${envs.length} rows, so it is a <span class="term">contradiction</span>. No assignment makes it true: it is unsatisfiable.`,
              contingency: `True in ${nT} of ${envs.length} rows, so it is a <b>contingency</b>: its value depends on the variables. The rows where it is T are its satisfying assignments.`,
            }[kind];
            ctx.rc(verdict,
              h('div', h('span.lg-badge', { class: kind === 'tautology' ? 't' : kind === 'contradiction' ? 'f' : 'n' }, kind), ' ', h('span.mono.small', show(tree))),
              h('div.small', { html: text }));
            const e = envs[sel];
            ctx.rc(why,
              h('div.tiny.mono.muted', `ROW ${sel + 1}: ${envText(vars, e).toUpperCase()}`),
              h('ul', steps(tree).map((n) => h('li', `${show(n)} = ${L(ev(n, e))}`, h('span.muted', `  (${reason(n, e)})`)))),
              steps(tree).length ? null : h('p.muted', 'A single variable or constant: its column is simply its own value.'));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Equivalence, tautologies, and the laws of logic',
        kind: 'concept',
        html: String.raw`
          <div class="split-wide">
            <div class="stack">
              <div class="def">A <span class="term">tautology</span> is true in every row, a <span class="term">contradiction</span> is false in every row, and anything else is a contingency. Two formulas are <span class="term">logically equivalent</span>, written \(P \equiv Q\), when they agree in every row. That is the same as saying \(P \leftrightarrow Q\) is a tautology.</div>
              <table class="tt" style="width:100%;font-size:0.84rem">
                <thead><tr><th class="l">Law</th><th>Equivalence</th></tr></thead>
                <tbody>
                  <tr><td class="l">Double negation</td><td>\(\neg\neg p \equiv p\)</td></tr>
                  <tr><td class="l">De Morgan</td><td>\(\neg(p \land q) \equiv \neg p \lor \neg q \qquad \neg(p \lor q) \equiv \neg p \land \neg q\)</td></tr>
                  <tr><td class="l">Distributive</td><td>\(p \land (q \lor r) \equiv (p \land q) \lor (p \land r)\)</td></tr>
                  <tr><td class="l">Implication</td><td>\(p \to q \equiv \neg p \lor q\)</td></tr>
                  <tr><td class="l">Negated conditional</td><td>\(\neg(p \to q) \equiv p \land \neg q\)</td></tr>
                  <tr><td class="l">Contrapositive</td><td>\(p \to q \equiv \neg q \to \neg p\)</td></tr>
                  <tr><td class="l">Biconditional</td><td>\(p \leftrightarrow q \equiv (p \to q) \land (q \to p)\)</td></tr>
                  <tr><td class="l">Complement, identity</td><td>\(p \lor \neg p \equiv \mathrm{T} \quad p \land \neg p \equiv \mathrm{F} \quad p \land \mathrm{T} \equiv p\)</td></tr>
                  <tr><td class="l">Absorption</td><td>\(p \lor (p \land q) \equiv p \qquad p \land (p \lor q) \equiv p\)</td></tr>
                </tbody>
              </table>
              <p class="small muted">∧ and ∨ are also commutative and associative. These are the set laws of Module 1 in new clothes: ∩ becomes ∧, ∪ becomes ∨, and complement becomes ¬.</p>
            </div>
            <div class="stack">
              <div class="ex">Simplify \(\neg(p \lor \neg q) \lor (\neg p \land \neg q)\), one law per line:
                <table class="data small" style="margin-top:0.3rem">
                  <tbody>
                    <tr><td>\(\equiv (\neg p \land \neg\neg q) \lor (\neg p \land \neg q)\)</td><td>De Morgan</td></tr>
                    <tr><td>\(\equiv (\neg p \land q) \lor (\neg p \land \neg q)\)</td><td>double negation</td></tr>
                    <tr><td>\(\equiv \neg p \land (q \lor \neg q)\)</td><td>distributive</td></tr>
                    <tr><td>\(\equiv \neg p \land \mathrm{T}\)</td><td>complement</td></tr>
                    <tr><td>\(\equiv \neg p\)</td><td>identity</td></tr>
                  </tbody>
                </table></div>
              <div class="ai">SAT solvers take a huge formula and search for an assignment that makes it true. Planners, chip verifiers and schedulers encode their rules as formulas with millions of variables, and simplification laws like these keep the search fast.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: equivalence checker',
        kind: 'lab',
        html: String.raw`<p class="muted small">Two formulas are equivalent exactly when their columns match in every row. Type two formulas or pick a pair. Rows where they disagree turn red, and a single red row is enough to prove they are <i>not</i> equivalent.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const pairs = [
            ['De Morgan (∧)', '¬(p ∧ q)', '¬p ∨ ¬q'], ['De Morgan (∨)', '¬(p ∨ q)', '¬p ∧ ¬q'], ['Wrong De Morgan', '¬(p ∧ q)', '¬p ∧ ¬q'],
            ['Implication', 'p → q', '¬p ∨ q'], ['Contrapositive', 'p → q', '¬q → ¬p'], ['Converse', 'p → q', 'q → p'],
            ['Inverse vs converse', '¬p → ¬q', 'q → p'], ['Negated conditional', '¬(p → q)', 'p ∧ ¬q'], ['Biconditional', 'p ↔ q', '(p → q) ∧ (q → p)'],
            ['Distributive', 'p ∧ (q ∨ r)', '(p ∧ q) ∨ (p ∧ r)'], ['Exportation', '(p ∧ q) → r', 'p → (q → r)'], ['→ is not associative', '(p → q) → r', 'p → (q → r)'],
            ['Absorption', 'p ∨ (p ∧ q)', 'p'], ['Exclusive or', 'p ⊕ q', '(p ∨ q) ∧ ¬(p ∧ q)'],
          ];
          const notes = {
            'De Morgan (∧)': '"Not both" means "at least one is false". Moving ¬ inside flips ∧ to ∨.',
            'De Morgan (∨)': '"Not either one" means "neither": ¬ moves inside and ∨ flips to ∧.',
            'Wrong De Morgan': 'The most common algebra mistake in logic: ¬ does not simply distribute. Look at the red rows: "not both" is true when only one part is false.',
            'Implication': 'The implication law rewrites → using only ¬ and ∨. Programmers use it to write p → q as "not p or q".',
            'Contrapositive': 'Swapping and negating both parts keeps the meaning. This is why proof by contrapositive (Module 3) works.',
            'Converse': 'Swapping without negating changes the meaning. Two rows are red, p = T, q = F and p = F, q = T: each rule forbids one of them and allows the other.',
            'Inverse vs converse': 'The inverse and the converse are contrapositives of each other, so they are equivalent, even though neither matches the original conditional.',
            'Negated conditional': 'A conditional fails only when the hypothesis holds and the conclusion fails, so its negation is p ∧ ¬q, not another conditional.',
            'Biconditional': '"If and only if" is literally two conditionals joined by "and".',
            'Distributive': '∧ distributes over ∨, just as ∩ distributes over ∪ for sets.',
            'Exportation': 'Nested ifs, "if p then (if q then r)", equal one if with "and". Programmers use this to flatten nested conditions.',
            '→ is not associative': 'Unlike ∧ and ∨, the arrow is not associative, so you cannot drop the parentheses.',
            'Absorption': 'q makes no difference: whenever p ∧ q is true, p is already true.',
            'Exclusive or': '"One or the other but not both" written with inclusive or.',
          };
          let A = pairs[0][1], B = pairs[0][2], name = pairs[0][0];
          let lastFocus = null;
          const inA = h('input.inp.mono', { value: A, 'aria-label': 'First formula', spellcheck: 'false', autocomplete: 'off', style: { width: '100%' } });
          const inB = h('input.inp.mono', { value: B, 'aria-label': 'Second formula', spellcheck: 'false', autocomplete: 'off', style: { width: '100%' } });
          inA.addEventListener('focus', () => { lastFocus = inA; });
          inB.addEventListener('focus', () => { lastFocus = inB; });
          inA.addEventListener('input', () => { A = inA.value; name = null; draw(); });
          inB.addEventListener('input', () => { B = inB.value; name = null; draw(); });
          const insert = (sym) => {
            const el = lastFocus || inB;
            const a = el.selectionStart ?? el.value.length;
            el.setRangeText(sym, a, el.selectionEnd ?? a, 'end');
            el.focus();
            A = inA.value; B = inB.value; name = null; draw();
          };
          const keys = h('div.row', { style: { gap: '0.25rem' } }, ['¬', '∧', '∨', '⊕', '→', '↔', '(', ')'].map((k) => h('button.btn.sm.mono', { 'aria-label': `insert ${k}`, onclick: () => insert('∧∨⊕→↔'.includes(k) ? ` ${k} ` : k) }, k)));
          const msg = h('div.feedback');
          const verdict = h('div.stack', { style: { gap: '0.35rem' } });
          const wrap = h('div.lg-tablewrap');
          let working = true;
          const workBtn = h('button.btn.sm', { onclick: () => { working = !working; workBtn.textContent = working ? 'Hide working columns' : 'Show working columns'; draw(); } }, 'Hide working columns');
          const left = h('div.stack', { style: { gap: '0.45rem', minHeight: 0 } },
            h('label.field', 'Formula A', inA), h('label.field', 'Formula B', inB), keys,
            h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.2rem' } }, 'PAIRS TO TRY'), h('div.lg-presets', pairs.map(([n, a, b]) => h('button.btn', { style: { fontFamily: 'var(--font-body)' }, onclick: () => { inA.value = A = a; inB.value = B = b; name = n; draw(); } }, n)))),
            h('div', workBtn), msg);
          body.append(h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch' } }, left, h('div.stack', { style: { minHeight: 0, gap: '0.5rem' } }, verdict, wrap)));
          function draw() {
            let fa, fb;
            try { fa = parse(A); } catch (e) { msg.className = 'feedback bad'; msg.textContent = 'Formula A: ' + e.message; ctx.rc(verdict); ctx.rc(wrap); return; }
            try { fb = parse(B); } catch (e) { msg.className = 'feedback bad'; msg.textContent = 'Formula B: ' + e.message; ctx.rc(verdict); ctx.rc(wrap); return; }
            msg.className = 'feedback'; msg.textContent = '';
            const vars = varsOf(fa, fb);
            const envs = assignments(vars);
            const diffs = envs.filter((e) => ev(fa, e) !== ev(fb, e));
            const eq = diffs.length === 0;
            // columns: optional working sub-formulas of A, then A, then those of B, then B, then A ↔ B
            const cols = [];
            for (const [tag, f] of [['A', fa], ['B', fb]]) {
              if (working) steps(f).slice(0, -1).forEach((n) => cols.push({ n, head: `\\(${toTex(n)}\\)` }));
              cols.push({ n: f, head: `${tag}: \\(${toTex(f)}\\)`, cls: 'fin' });
            }
            const table = h('table.tt.lg-tt', { class: envs.length <= 8 && cols.length <= 7 ? 'big' : envs.length > 8 ? 'dense' : '' },
              h('thead', h('tr', vars.map((v) => h('th.vr', { html: `\\(${v}\\)` })), cols.map((c) => h('th', { class: c.cls || '', html: c.head })), h('th', { html: 'A \\(\\leftrightarrow\\) B' }))),
              h('tbody', envs.map((e) => {
                const same = ev(fa, e) === ev(fb, e);
                return h('tr', { class: same ? '' : 'diff' }, vars.map((v) => h('td', { html: tf(e[v]) })), cols.map((c) => h('td', { class: c.cls || '', html: tf(ev(c.n, e)) })), h('td.flag', { html: tf(same) + (same ? '' : ' differ') }));
              })));
            ctx.rc(wrap, table, h('div.tiny.muted', { html: 'The last column is A \\(\\leftrightarrow\\) B. The formulas are equivalent exactly when that column is all T, that is, when A \\(\\leftrightarrow\\) B is a tautology.' }));
            ctx.tex(wrap);
            const first = diffs[0];
            ctx.rc(verdict,
              h('div', h('span.lg-badge', { class: eq ? 't' : 'f' }, eq ? 'equivalent  ≡' : 'not equivalent  ≢'), name ? h('span.small.muted', { style: { marginLeft: '0.5rem' } }, name) : null),
              h('div.small', { html: eq
                ? `All ${envs.length} rows agree, so A ≡ B. You may replace one with the other anywhere: in a proof, in a circuit, or in an <code>if</code> condition.`
                : `${diffs.length} of ${envs.length} rows disagree. The first is <b class="mono">${envText(vars, first)}</b>: A is ${tf(ev(fa, first))} but B is ${tf(ev(fb, first))}. One such row is a counterexample to "A ≡ B".` }),
              name && notes[name] ? h('div.small.muted', notes[name]) : null);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Predicates and quantifiers',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">predicate</span> \(P(x)\) is a statement with a variable. It becomes a proposition once \(x\) takes a value from the <span class="term">domain of discourse</span> \(D\). With \(P(x)\): "\(x \gt 3\)", \(P(5)\) is true and \(P(1)\) is false.</div>
              <div class="def" data-label="Quantifiers">The <span class="term">universal quantifier</span> \(\forall x\  P(x)\) ("for all \(x\)") is true when \(P(x)\) holds for <i>every</i> \(x\) in \(D\). The <span class="term">existential quantifier</span> \(\exists x\  P(x)\) ("there exists \(x\)") is true when <i>at least one</i> \(x\), a witness, makes \(P(x)\) true.</div>
              <div class="ex">The domain matters. \(\forall x\  (x^2 \ge x)\) is true over the integers \(\mathbb{Z}\), but false over the reals \(\mathbb{R}\): \(x = \tfrac12\) gives \(\tfrac14 \lt \tfrac12\).</div>
              <div class="warn">"Every circle is red" is \(\forall x\  (\text{Circle}(x) \to \text{Red}(x))\). With \(\land\) instead it would say every object is a red circle. "Some circle is red" uses \(\land\): \(\exists x\  (\text{Circle}(x) \land \text{Red}(x))\).</div>
            </div>
            <div class="stack">
              <div class="thm">Negating a quantifier flips it and pushes \(\neg\) inside:
                \[\neg \forall x\  P(x) \equiv \exists x\  \neg P(x) \qquad \neg \exists x\  P(x) \equiv \forall x\  \neg P(x)\]
                "Not everyone passed" means "someone failed".</div>
              <p><b>Order matters</b> when quantifiers are nested. Over the integers, \(\forall x\  \exists y\  (y \gt x)\) is true: each \(x\) has a bigger \(y\), such as \(x + 1\). But \(\exists y\  \forall x\  (y \gt x)\) is false, because no single \(y\) beats every integer. In \(\forall x\  \exists y\), \(y\) may depend on \(x\); in \(\exists y\  \forall x\), one \(y\) must work for all \(x\).</p>
              <div class="ai">Knowledge graphs and safety rules are written in this language: \(\forall x\  (\text{Medication}(x) \to \exists y\  \text{Dosage}(x, y))\). A rule engine searches the facts for a counterexample, which is exactly how it flags a missing dosage.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: quantifier playground',
        kind: 'lab',
        html: String.raw`<p class="muted small">The domain is the row of objects. Pick a statement: witnesses glow green and counterexamples glow red. Click an object to change its shape, color or size, add or remove objects, and watch the truth value respond. Try emptying the domain completely.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          let D = START_WORLD.map((o) => ({ ...o }));
          let si = 2;
          let pick = 3;
          const list = h('div.lg-stmts');
          const head = h('div.card.stack', { style: { gap: '0.3rem', padding: '0.55rem 0.8rem' } });
          const tiles = h('div.lg-tiles');
          const edit = h('div.lg-edit');
          const negBox = h('div.box.small', { style: { padding: '0.4rem 0.7rem' } });
          STATEMENTS.forEach((st, i) => {
            const b = h('button', { html: `\\(${st.tex}\\)`, title: st.en, onclick: () => { si = i; draw(); } });
            ctx.tex(b);
            list.append(b);
          });
          body.append(h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.6fr)' } },
            h('div.stack', { style: { gap: '0.3rem', minHeight: 0 } }, h('div.tiny.mono.muted', 'STATEMENTS'), list),
            h('div.stack', { style: { gap: '0.45rem', minHeight: 0 } }, head, tiles, edit, negBox)));
          function shape(o) {
            const r = o.size === 'large' ? 21 : 12;
            const fill = HUES[o.color];
            let el;
            if (o.shape === 'circle') el = s('circle', { cx: 30, cy: 30, r, fill });
            else if (o.shape === 'square') el = s('rect', { x: 30 - r, y: 30 - r, width: 2 * r, height: 2 * r, rx: 2, fill });
            else el = s('polygon', { points: `30,${30 - r * 1.15} ${30 + r * 1.15},${30 + r * 0.85} ${30 - r * 1.15},${30 + r * 0.85}`, fill });
            return s('svg', { viewBox: '0 0 60 60', 'aria-hidden': 'true' }, el);
          }
          const desc = (i) => `#${i + 1} (${D[i].size} ${D[i].color} ${D[i].shape})`;
          function explain(st, r) {
            if (!D.length) return st.q[0] === '∀' ? 'True, vacuously: the domain is empty, so nothing can be a counterexample.' : 'False: the domain is empty, so there is no witness.';
            if (st.q[0] === '∀') {
              const bad = r.res.findIndex((b) => !b);
              if (bad < 0) return `True: all ${D.length} objects pass, so there is no counterexample.`;
              const n = r.res.filter((b) => !b).length;
              return `False: ${desc(bad)} is a counterexample${n > 1 ? ` (one of ${n})` : ''}${st.q.length > 1 ? `, because ${r.info[bad]}` : ''}. One counterexample is enough to make a ∀ statement false.`;
            }
            const good = r.res.findIndex(Boolean);
            if (good < 0) return `False: none of the ${D.length} objects is a witness${st.q.length > 1 ? '; under each object you can see the x that breaks it' : ''}.`;
            return `True: ${desc(good)} is a witness${st.q.length > 1 ? ` (${r.info[good]})` : ''}. One witness is enough for an ∃ statement.`;
          }
          function draw() {
            const st = STATEMENTS[si];
            const r = evaluate(st, D);
            [...list.children].forEach((b, i) => b.classList.toggle('on', i === si));
            ctx.rc(head,
              h('div.row', { style: { justifyContent: 'space-between', gap: '0.5rem' } },
                h('span', { html: `\\(${st.tex}\\)` }),
                h('span.lg-badge', { class: r.truth ? 't' : 'f' }, r.truth ? 'true' : 'false')),
              h('div.small', { html: `<i>"${st.en}"</i> ${explain(st, r)}` }),
              h('div.tiny.muted', st.note));
            ctx.tex(head);
            const outerAll = st.q[0] === '∀';
            const tileEls = D.map((o, i) => {
              const ok = r.res[i];
              const cls = [outerAll && !ok ? 'cex' : '', !outerAll && ok ? 'wit' : '', i === pick ? 'sel' : ''].join(' ');
              return h('button.lg-tile', { class: cls, 'aria-label': `object ${desc(i)}; ${ok ? 'passes' : 'fails'}`, onclick: () => { pick = i; draw(); } },
                shape(o), h('span.id', `#${i + 1} ${ok ? '✓' : '✗'}`), st.q.length > 1 ? h('span', r.info[i]) : null);
            });
            if (D.length < 10) tileEls.push(h('button.lg-tile.add', { onclick: () => { D.push({ shape: 'circle', color: 'green', size: 'small' }); pick = D.length - 1; draw(); } }, '+ add object'));
            ctx.rc(tiles, tileEls);
            const o = D[pick];
            const seg = (key, vals) => h('div.seg', vals.map((v) => h('button', { 'aria-pressed': String(o[key] === v), onclick: () => { o[key] = v; draw(); } }, v)));
            ctx.rc(edit, o
              ? [h('b.mono', { style: { color: 'var(--ink)' } }, `#${pick + 1}`), seg('shape', ['circle', 'square', 'triangle']), seg('color', ['red', 'blue', 'green']), seg('size', ['small', 'large']),
                h('button.btn.sm', { onclick: () => { D.splice(pick, 1); pick = Math.min(pick, D.length - 1); draw(); } }, 'Remove')]
              : [h('span', 'The domain is empty.')],
              h('button.btn.sm', { onclick: () => { D = START_WORLD.map((x) => ({ ...x })); pick = 3; draw(); } }, 'Reset'));
            negBox.innerHTML = `<b>Negation:</b> \\(${st.neg}\\), "${st.negEn}" It is ${tf(!r.truth)}: a statement and its negation always have opposite values.`;
            ctx.tex(negBox);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Logic inside your code',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p>Every <code>if</code> condition is a proposition about the program's state. Python spells the connectives as words:</p>
              <table class="data lg-code">
                <thead><tr><th>Logic</th><th>Python</th><th>Note</th></tr></thead>
                <tbody>
                  <tr><td>\(\neg p\)</td><td><code>not p</code></td><td></td></tr>
                  <tr><td>\(p \land q\)</td><td><code>p and q</code></td><td>skips <code>q</code> if <code>p</code> is false</td></tr>
                  <tr><td>\(p \lor q\)</td><td><code>p or q</code></td><td>skips <code>q</code> if <code>p</code> is true</td></tr>
                  <tr><td>\(p \oplus q\)</td><td><code>p != q</code></td><td>for two Booleans</td></tr>
                  <tr><td>\(p \to q\)</td><td><code>not p or q</code></td><td>there is no arrow operator</td></tr>
                  <tr><td>\(p \leftrightarrow q\)</td><td><code>p == q</code></td><td>for two Booleans</td></tr>
                  <tr><td>\(\forall x\  P(x)\)</td><td><code>all(P(x) for x in xs)</code></td><td><code>all([])</code> is <code>True</code></td></tr>
                  <tr><td>\(\exists x\  P(x)\)</td><td><code>any(P(x) for x in xs)</code></td><td><code>any([])</code> is <code>False</code></td></tr>
                </tbody>
              </table>
            </div>
            <div class="stack">
              <div class="def"><span class="term">Short-circuit evaluation</span>: Python evaluates <code>and</code> and <code>or</code> from left to right and stops as soon as the answer is known. In <code>a and b</code>, if <code>a</code> is false, <code>b</code> never runs.</div>
              <div class="ex">Guard first, then use: <code>if user is not None and user.is_admin:</code> never touches <code>user.is_admin</code> when there is no user. Swap the two sides and a missing user crashes the program.</div>
              <div class="ex" data-label="Refactoring with De Morgan"><code>if not (is_weekend or is_holiday):</code> tests the same thing as <code>if not is_weekend and not is_holiday:</code>, and the second version reads as "a normal working day".</div>
              <div class="ai">Data filtering in pandas and NumPy uses Boolean masks such as <code>df[(df.age &gt; 30) &amp; ~df.churned]</code>. There <code>&amp;</code>, <code>|</code> and <code>~</code> work row by row, and the parentheses are required because <code>&amp;</code> binds tighter than <code>&gt;</code>.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Code: a truth-table generator',
        kind: 'code',
        file: 'truth_table.py',
        html: String.raw`<p class="muted small">Python can build any truth table by trying every assignment. Switch to <b>Trace</b> to watch <code>p</code>, <code>q</code> and <code>r</code> run through all eight rows.</p>`,
        fivew: {
          what: 'Prints the full truth table of \\(((p \\to q) \\land (q \\to r)) \\to (p \\to r)\\) and then reports whether it is a tautology and whether it is satisfiable.',
          why: 'Checking every row by hand is slow and error-prone. A program that enumerates all \\(2^n\\) assignments settles any question about a formula with a few variables in an instant.',
          who: 'Hardware engineers checking a circuit against its specification, students verifying a law before using it, and developers testing every combination of feature flags.',
          where: 'Logic simplifiers, test generators that try every combination of options, and the brute-force baseline that real SAT solvers are compared against.',
          when: 'For a handful of variables. Each extra variable doubles the rows, so 30 variables already means over a billion rows.',
        },
        lines: [
          ['from itertools import product', 'Imports <code>product</code> from the standard library module <code>itertools</code>. <code>product</code> builds the Cartesian product from Module 1: every combination of values. The rows of a truth table are exactly \\(\\{T, F\\} \\times \\{T, F\\} \\times \\{T, F\\}\\).'],
          ['', ''],
          ['def implies(a, b):', 'Python has <code>not</code>, <code>and</code> and <code>or</code> but no arrow, so we define \\(a \\to b\\) ourselves as a function with two Boolean inputs.'],
          ['    return (not a) or b', 'The implication law, \\(a \\to b \\equiv \\neg a \\lor b\\). When <code>a</code> is <code>False</code> the result is <code>True</code> whatever <code>b</code> is: vacuous truth. The only <code>False</code> result comes from <code>a = True, b = False</code>.'],
          ['', ''],
          ['def formula(p, q, r):', 'The formula under test gets its own function, so testing a different formula means changing only its body. It takes the three variables as inputs.'],
          ['    chain = implies(p, q) and implies(q, r)', 'The left part, \\((p \\to q) \\land (q \\to r)\\): "\\(p\\) leads to \\(q\\) and \\(q\\) leads to \\(r\\)". Naming it <code>chain</code> keeps the next line short enough to read.'],
          ['    return implies(chain, implies(p, r))', 'The whole formula, \\(((p \\to q) \\land (q \\to r)) \\to (p \\to r)\\): if the chain holds, then \\(p\\) leads to \\(r\\). This is the rule of inference called hypothetical syllogism, which Module 3 uses in proofs.'],
          ['', ''],
          ['col = []', 'An empty list, <code>col</code> (short for column), that will collect the formula\'s value in each row, so we can classify the whole column after the loop. At the end it holds 8 Booleans.'],
          ['for p, q, r in product([True, False], repeat=3):', '<code>product([True, False], repeat=3)</code> yields the 8 triples <code>(True, True, True)</code>, <code>(True, True, False)</code>, …, <code>(False, False, False)</code>, in textbook order with T first. Each triple is unpacked into <code>p</code>, <code>q</code> and <code>r</code>.'],
          ['    col.append(formula(p, q, r))', 'Evaluates the formula for this row and stores the result at the end of <code>col</code>. Python calls <code>formula</code>, which calls <code>implies</code> four times in most rows but only three times in the two rows where \\(p \\to q\\) is false: there the short-circuit <code>and</code> inside <code>chain</code> never calls <code>implies(q, r)</code>.'],
          ['    print(int(p), int(q), int(r), "|", int(col[-1]))', '<code>col[-1]</code> is the last item in the list: the value just added. <code>int(True)</code> is 1 and <code>int(False)</code> is 0, so each row prints as digits, such as <code>1 0 1 | 1</code>. Computer scientists often write truth tables with 1 for T and 0 for F; Module 12 does the same for circuits.'],
          ['print("tautology?", all(col), "satisfiable?", any(col))', '<code>all(col)</code> asks "is it T in every row?", the definition of a tautology and the quantifier \\(\\forall\\). <code>any(col)</code> asks "is it T in some row?", which means satisfiable, the quantifier \\(\\exists\\). Output: <code>tautology? True satisfiable? True</code>.'],
        ],
        expected: '1 1 1 | 1\n1 1 0 | 1\n1 0 1 | 1\n1 0 0 | 1\n0 1 1 | 1\n0 1 0 | 1\n0 0 1 | 1\n0 0 0 | 1\ntautology? True satisfiable? True\n',
        tryIt: 'Replace the body of <code>formula</code> with <code>return implies(p, q) and q</code> and predict which rows end in 1 before you run it. Then try <code>return p and not p</code>.',
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: checking equivalence by brute force',
        kind: 'code',
        file: 'equivalence.py',
        html: String.raw`<p class="muted small">Two formulas are equivalent when no row tells them apart. This program searches the rows for a disagreement, which is also how you find a counterexample by machine.</p>`,
        fivew: {
          what: 'Compares \\(p \\to q\\) with its converse, its contrapositive and \\(\\neg p \\lor q\\), reporting either "equivalent" or the first row where they differ.',
          why: 'It turns the definition of logical equivalence ("same value in every row") directly into code, and it shows that one disagreeing row is all it takes to refute an equivalence.',
          who: 'Developers refactoring a tangled condition who want proof that the new version behaves exactly like the old one, and compiler writers checking that an optimization keeps meaning.',
          where: 'Refactoring tools, logic tutors, and equivalence checkers in chip design, which compare a circuit before and after optimization.',
          when: 'Whenever you rewrite a Boolean condition and want certainty rather than a hunch. For a few variables, checking every row is instant and leaves no room for doubt.',
        },
        lines: [
          ['from itertools import product', 'Imports <code>product</code>, which generates every combination of truth values: the rows of the truth table.'],
          ['', ''],
          ['def implies(a, b):', 'Defines the arrow, because Python has no \\(\\to\\) operator.'],
          ['    return (not a) or b', 'The implication law, \\(a \\to b \\equiv \\neg a \\lor b\\). This is false only when <code>a</code> is true and <code>b</code> is false.'],
          ['', ''],
          ['def equivalent(f, g):', 'Takes two functions, <code>f</code> and <code>g</code>, each standing for a formula in <code>p</code> and <code>q</code>. In Python, functions are values, so they can be passed as arguments like numbers.'],
          ['    for p, q in product([True, False], repeat=2):', 'Visits the four rows (T, T), (T, F), (F, T), (F, F). Checking every row is what makes the answer certain rather than a guess based on a few examples.'],
          ['        if f(p, q) != g(p, q):', 'Evaluates both formulas on this row. <code>!=</code> between Booleans is exclusive or: true exactly when the two formulas disagree.'],
          ['            return f"NO, they differ at p={p}, q={q}"', 'A disagreement is a counterexample to "f ≡ g", so the function stops immediately and reports the row. There is no need to check the remaining rows: one counterexample settles it.'],
          ['    return "yes, all 4 rows agree"', 'This line runs only if the loop finished without finding a difference. Agreement in every row is the definition of logical equivalence.'],
          ['', ''],
          ['others = {"q → p": lambda p, q: implies(q, p),', 'A dictionary from a label to a formula. A <code>lambda</code> is a one-line nameless function: <code>lambda p, q: implies(q, p)</code> is the converse \\(q \\to p\\). The dictionary continues on the next two lines.'],
          ['          "¬q → ¬p": lambda p, q: implies(not q, not p),', 'The contrapositive \\(\\neg q \\to \\neg p\\): swap the parts and negate both. The theory says it should match the original.'],
          ['          "¬p ∨ q": lambda p, q: (not p) or q}', 'The implication law written out directly, \\(\\neg p \\lor q\\). The closing brace ends the dictionary.'],
          ['for name, g in others.items():', 'Loops over the label and formula pairs in the order they were written. <code>items()</code> gives each pair as a tuple, unpacked into <code>name</code> and <code>g</code>.'],
          ['    print(f"p → q  vs  {name}:", equivalent(implies, g))', 'Compares the original conditional (the <code>implies</code> function itself) with each candidate and prints the verdict. Output starts <code>p → q  vs  q → p: NO, they differ at p=True, q=False</code>: the converse fails on the row where the original is false.'],
        ],
        expected: 'p → q  vs  q → p: NO, they differ at p=True, q=False\np → q  vs  ¬q → ¬p: yes, all 4 rows agree\np → q  vs  ¬p ∨ q: yes, all 4 rows agree\n',
        tryIt: 'Add the inverse, <code>"¬p → ¬q": lambda p, q: implies(not p, not q)</code>, to the dictionary and predict its verdict. Then test De Morgan by comparing <code>lambda p, q: not (p and q)</code> with <code>lambda p, q: not p or not q</code>.',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: quantifiers with all() and any()',
        kind: 'code',
        file: 'quantifiers.py',
        html: String.raw`<p class="muted small"><code>all</code> is \(\forall\) and <code>any</code> is \(\exists\). The noisy <code>passed</code> function prints each time it is called, so you can see short-circuit evaluation stop the search early.</p>`,
        fivew: {
          what: 'Evaluates \\(\\forall\\) and \\(\\exists\\) statements over a list of students, shows that <code>all</code> and <code>any</code> stop as soon as the answer is known, tests the empty domain, and shows that swapping nested quantifiers changes the answer.',
          why: 'Quantifiers are the heart of specifications ("every request gets a response") and data checks ("some value is missing"). Python\'s <code>all</code> and <code>any</code> are those quantifiers, early exit included.',
          who: 'Anyone validating data: back-end developers checking that every field is present, data scientists checking that any row has a missing label, and test writers asserting a property for every case.',
          where: 'Input validation, data-quality checks before training a model, permission checks ("any role grants access"), and assertions in tests.',
          when: 'Whenever a loop exists only to compute one yes/no answer about a collection. Replace the loop and its flag variable with <code>all</code> or <code>any</code>.',
        },
        lines: [
          ['def passed(name, score):', 'Defines the predicate \\(\\text{Passed}(x)\\). Its first line prints a message so we can see exactly which students get checked.'],
          ['    print("  checking", name)', 'A deliberate side effect: every call announces itself. Real predicates should not print; this one does so that short-circuiting becomes visible.'],
          ['    return score >= 60', 'The actual test. It returns <code>True</code> when the score is at least 60, so <code>Passed</code> is true for Ana (91) and Cai (77) and false for Ben (58).'],
          ['', ''],
          ['scores = [("Ana", 91), ("Ben", 58), ("Cai", 77)]', 'The domain of discourse: a list of three (name, score) pairs. Every quantifier below ranges over this list.'],
          ['everyone = all(passed(n, s) for n, s in scores)', '\\(\\forall x\\ \\text{Passed}(x)\\). The generator calls <code>passed</code> one student at a time. Ana passes, Ben fails, and <code>all</code> stops right there, because one counterexample already makes the answer <code>False</code>. Cai is never checked, so this line prints only two "checking" messages.'],
          ['someone = any(passed(n, s) for n, s in scores)', '\\(\\exists x\\ \\text{Passed}(x)\\). Ana passes on the very first call, so <code>any</code> has its witness and stops immediately. This line prints a single "checking Ana".'],
          ['print("∀ passed:", everyone, "| ∃ passed:", someone)', 'Prints both answers: <code>∀ passed: False | ∃ passed: True</code>. Look above it in the output: three "checking" lines in total (Ana, Ben, then Ana again), not six. That is short-circuit evaluation at work.'],
          ['print("empty domain:", all([]), any([]))', 'Quantifiers over an empty domain. <code>all([])</code> is <code>True</code> because there is no counterexample (vacuous truth). <code>any([])</code> is <code>False</code> because there is no witness. Output: <code>empty domain: True False</code>.'],
          ['', ''],
          ['D = [1, 2, 3]', 'A new, tiny domain for nested quantifiers.'],
          ['forall_exists = all(any(x + y == 4 for y in D) for x in D)', '\\(\\forall x\\ \\exists y\\ (x + y = 4)\\). Read it from the outside in: <code>all</code> runs over each <code>x</code>, and for each one the inner <code>any</code> searches for a partner <code>y</code>. Here 1 pairs with 3, 2 with 2, and 3 with 1. Each <code>x</code> gets its own <code>y</code>, so the result is <code>True</code>.'],
          ['exists_forall = any(all(x + y == 4 for x in D) for y in D)', 'The quantifiers swapped: \\(\\exists y\\ \\forall x\\ (x + y = 4)\\). Now <code>any</code> tries one <code>y</code> at a time, and <code>all</code> asks whether that single <code>y</code> works for every <code>x</code> at once. No <code>y</code> does, so the result is <code>False</code>.'],
          ['print("∀x ∃y:", forall_exists, "| ∃y ∀x:", exists_forall)', 'Prints <code>∀x ∃y: True | ∃y ∀x: False</code>. Same symbols, different order, different meaning.'],
        ],
        expected: '  checking Ana\n  checking Ben\n  checking Ana\n∀ passed: False | ∃ passed: True\nempty domain: True False\n∀x ∃y: True | ∃y ∀x: False\n',
        tryIt: 'Move Ben to the end of the list and predict how many "checking" lines appear now. Then change <code>D</code> to <code>[1, 2, 3, 4]</code> and predict both nested answers.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: writing conditions people can trust',
        kind: 'design',
        html: String.raw`<p class="muted small">Every condition in a program is a small piece of logic, and the laws of this module are tools for making it clearer and safer. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Name Booleans as yes/no questions',
            html: '<p>A Boolean variable holds a proposition, so name it like one: <code>is_paid</code>, <code>has_access</code>, <code>can_retry</code>. Then <code>if is_paid:</code> reads as a sentence. A name like <code>flag</code> or <code>status</code> forces every reader to look up whether <code>True</code> means success or failure.</p>',
            bad: 'flag = check(order)\nif flag:\n    ship(order)',
            good: 'is_paid = payment_cleared(order)\nif is_paid:\n    ship(order)',
          },
          {
            name: 'Never compare a Boolean to True or False',
            html: '<p><code>is_valid == True</code> is the proposition \\(p \\leftrightarrow \\mathrm{T}\\), which is equivalent to \\(p\\) itself, so the comparison only adds noise. It can also mislead: a value such as <code>2</code> or a non-empty list counts as true in an <code>if</code>, yet <code>2 == True</code> and <code>[1] == True</code> are both <code>False</code>, so the comparison and the plain <code>if</code> disagree. To test for "no value", use <code>is None</code>.</p>',
            bad: 'if is_valid == True:\n    save()\nif done == False:\n    retry()',
            good: 'if is_valid:\n    save()\nif not done:\n    retry()',
          },
          {
            name: 'Push negations inward with De Morgan',
            html: '<p>A <code>not</code> in front of a long parenthesised condition makes the reader evaluate everything and then flip it. De Morgan\'s laws, \\(\\neg(p \\land q) \\equiv \\neg p \\lor \\neg q\\) and \\(\\neg(p \\lor q) \\equiv \\neg p \\land \\neg q\\), move the <code>not</code> onto each part, where comparisons simply flip: <code>&gt;=</code> becomes <code>&lt;</code>.</p>',
            bad: 'if not (age >= 18 and has_id):\n    refuse_entry()',
            good: 'if age < 18 or not has_id:\n    refuse_entry()',
          },
          {
            name: 'Avoid double negatives',
            html: '<p>Names such as <code>not_found</code> or <code>is_not_empty</code> lead to conditions like <code>if not is_not_empty(cart)</code>, which is \\(\\neg\\neg p\\). It equals \\(p\\), but every reader has to stop and work that out. Name the positive case and let a single <code>not</code> appear only where you mean it.</p>',
            bad: 'if not is_not_empty(cart):\n    show_empty_message()',
            good: 'if is_empty(cart):\n    show_empty_message()',
          },
          {
            name: 'Flatten nested ifs with guard clauses',
            html: '<p>Nested <code>if</code>s express \\(p \\to (q \\to r)\\). The exportation law says this equals \\((p \\land q) \\to r\\), and De Morgan turns the failing case into \\(\\neg p \\lor \\neg q\\). Handle that case first and return early: the main work then sits at the left margin instead of several levels deep.</p>',
            bad: 'def publish(post):\n    if post is not None:\n        if post.approved:\n            send(post)',
            good: 'def publish(post):\n    if post is None or not post.approved:\n        return\n    send(post)',
          },
          {
            name: 'Say ∀ and ∃ with all() and any()',
            html: '<p>A loop with a flag variable is a hand-written quantifier. <code>all(...)</code> is \\(\\forall\\) and <code>any(...)</code> is \\(\\exists\\). They are shorter, they cannot get the flag logic wrong, and they stop at the first counterexample or witness. Remember that <code>all([])</code> is <code>True</code>: if an empty input should fail, check for it explicitly.</p>',
            bad: 'ok = True\nfor score in scores:\n    if score < 0:\n        ok = False',
            good: 'ok = all(score >= 0 for score in scores)',
          },
          {
            name: 'Order conditions for short-circuit safety',
            html: '<p>Because <code>and</code> stops at the first false part, put the protective test first: check that something exists before you use it. And never hide work with side effects (saving, logging, counting) inside a condition, because short-circuiting may silently skip it.</p>',
            bad: 'if items[0] > 0 and items:   # crashes on []\n    use(items)\nif is_valid(x) or log_error(x):  # may skip log\n    accept(x)',
            good: 'if items and items[0] > 0:\n    use(items)\nif not is_valid(x):\n    log_error(x)',
          },
          {
            name: 'Make branches exhaustive and exclusive',
            html: '<p>An <code>if/elif/else</code> chain is a truth table in disguise: every possible input should land in exactly one branch. Order the tests so each one may assume the earlier ones failed, and finish with an <code>else</code> that handles, or loudly rejects, whatever is left. A missing case leaves a variable unset, and that is where bugs hide.</p>',
            bad: 'if weight > 20:\n    rate = "freight"\nelif weight > 2:\n    rate = "parcel"\n# weight <= 2: rate is never set',
            good: 'if weight > 20:\n    rate = "freight"\nelif weight > 2:\n    rate = "parcel"\nelse:\n    rate = "letter"',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: a truth table, column by column',
        kind: 'example',
        id: 'ex-truth-table',
        problem: String.raw`<p>Build the truth table for \(\big[(p \to q) \land (q \to r)\big] \to (p \to r)\) and classify it: tautology, contradiction, or contingency?</p>`,
        steps: [
          { cols: 0, caption: 'Start with the inputs. Three variables have 2 × 2 × 2 = 8 combinations of T and F, so the table needs 8 rows. Writing every combination first matters: one missing row could hide the single case that breaks the formula.' },
          { cols: 1, caption: 'Work inside-out, smallest piece first: p → q. A conditional is false in exactly one situation — hypothesis true, conclusion false — so this column is F exactly in the rows with p = T and q = F, and T everywhere else.' },
          { cols: 2, caption: 'The next piece is q → r, the same rule with the roles shifted: F only where q = T and r = F. Building one column at a time means every entry can be checked against a single rule.' },
          { cols: 3, caption: 'Combine the two finished columns with ∧. A conjunction is true only where both of its pieces are true. This column is also the hypothesis of the whole formula, so it marks the rows that could possibly make the formula false.' },
          { cols: 4, caption: 'Finish with the whole formula: hypothesis → (p → r). It fails only in a row where the hypothesis is true and p → r is false. Read down the new column: there is no F in it.' },
          { cols: 4, check: true, caption: 'Check the dangerous rows — the highlighted ones, where the hypothesis is true. In each of them the conclusion p → r is true as well, which is exactly why the implication survived. The other rows pass automatically, because a conditional with a false hypothesis is true.' },
          { cols: 4, check: true, answer: true, caption: 'Answer: the formula is a tautology — true in all 8 rows. This pattern is the hypothetical syllogism: if p → q and q → r both hold, then p → r must hold. The check in the previous step is the proof: every row that could have broken it was examined.' },
        ],
        answer: 'tautology',
        verify() {
          const direct = EX_TT_ENVS.every((e) => { const pq = !e.p || e.q, qr = !e.q || e.r, pr = !e.p || e.r; return !(pq && qr) || pr; });
          const tree = parse('((p -> q) & (q -> r)) -> (p -> r)');
          return direct && EX_TT_ENVS.every((e) => ev(tree, e));
        },
        draw(stage, ctx, step) {
          const { h } = ctx;
          const shown = step.cols;
          const head = EX_TT_VARS.map((v) => h('th', { html: `\\(${v}\\)` }))
            .concat(EX_TT_COLS.map((c, ci) => h('th', { html: `\\(${c.tex}\\)`, class: ci < shown ? (ci === shown - 1 && !step.check ? 'cur' : '') : 'muted' })));
          const rows = EX_TT_ENVS.map((e, ri) => h('tr', { class: step.check && EX_TT_DANGER.includes(ri) ? 'hit' : '' },
            EX_TT_VARS.map((v) => h('td', tf(e[v]))),
            EX_TT_COLS.map((c, ci) => (ci < shown ? h('td', { class: ci === shown - 1 && !step.check ? 'cur' : '' }, tf(c.f(e))) : h('td.muted', '·')))));
          const table = h('table.tt', h('thead', h('tr', head)), h('tbody', rows));
          stage.append(h('div.stack', { style: { alignItems: 'center' } },
            table,
            step.answer ? h('div.ex-answer', 'Answer: a tautology — T in all 8 rows') : null,
            step.check && !step.answer ? h('p.small', { style: { textAlign: 'center' } }, 'Highlighted rows: the hypothesis is true, so these are the rows that had to be checked.') : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 2 */
      {
        title: 'Worked example: rewriting a negated conditional',
        kind: 'example',
        id: 'ex-negated-conditional',
        problem: String.raw`<p>Rewrite \(\neg(p \to q)\) as a formula with no \(\to\) and no outer \(\neg\), naming the law used at each step, and prove that the result is equivalent to the original formula.</p>`,
        steps: [
          { lines: 1, table: 0, caption: 'Start with ¬(p → q) and the plan: turn the conditional into a disjunction first, because the implication law is the only law that removes a →. Each later law then has the shape it needs to apply.' },
          { lines: 2, table: 0, caption: 'Apply the implication law, p → q ≡ ¬p ∨ q, inside the outer negation, so the formula becomes ¬(¬p ∨ q). The arrow is gone, but the outer ¬ still covers the whole disjunction, so one more law is needed to move it inside.' },
          { lines: 3, table: 0, caption: 'Apply De Morgan\'s law, ¬(X ∨ Y) ≡ ¬X ∧ ¬Y: the ∨ flips to ∧ and each part is negated, giving ¬¬p ∧ ¬q. Pushing ¬ inside is what turns "not a conditional" into a positive claim about p and q.' },
          { lines: 4, table: 0, caption: 'Apply double negation, ¬¬p ≡ p, to clean up the first part, and the formula becomes p ∧ ¬q. The rewrite is done — no → and no outer ¬ remain — but a chain of rewrites still has to be checked against the original.' },
          { lines: 4, table: 1, caption: 'Check the one revealing row, p = T and q = F: the original gives ¬(T → F) = ¬F = T, and the rewrite gives T ∧ ¬F = T ∧ T = T. This row matters most because it is the only row where either formula is true, so agreement here carries the proof.' },
          { lines: 4, table: 2, answer: true, caption: 'Answer: ¬(p → q) ≡ p ∧ ¬q, because the two columns agree in all 4 rows, reading T, F, F, F. In words, the only way to break the promise p → q is for p to be true and q false, and the table is the check that nothing else breaks it.' },
        ],
        answer: 'p ∧ ¬q',
        verify(M) {
          const byLaw = sameMeaning('~(p -> q)', 'p & ~q');
          const original = parse('~(p -> q)');
          const rewritten = parse('p & ~q');
          const envs = assignments(['p', 'q']);
          const byTrees = envs.every((e) => ev(original, e) === ev(rewritten, e));
          const byHand = envs.every((e) => (!(!e.p || e.q)) === (e.p && !e.q));
          return byLaw && byTrees && byHand;
        },
        draw(stage, ctx, step) {
          const { h } = ctx;
          const lineEls = EX_NC_LINES.slice(0, step.lines).map((ln, i) => {
            const isNew = i === step.lines - 1;
            return h('div', { class: isNew ? '' : 'muted', style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.2rem 1rem' } },
              h('span', { html: `\\(${ln.tex}\\)`, style: { fontSize: step.table ? '1.02rem' : isNew ? '1.2rem' : '1.05rem', fontWeight: isNew ? '600' : '400' } }),
              h('span.small.muted', { html: ln.law }));
          });
          let table = null;
          if (step.table) {
            const head = EX_NC_VARS.map((v) => h('th', { html: `\\(${v}\\)` }))
              .concat(EX_NC_COLS.map((c) => h('th', { html: `\\(${c.tex}\\)`, class: step.table === 1 ? 'cur' : '' })));
            const rows = EX_NC_ENVS.map((e, ri) => {
              const revealing = ri === 0;
              const shown = step.table === 2 || revealing;
              return h('tr', { class: step.table === 1 && revealing ? 'hit' : '' },
                EX_NC_VARS.map((v) => h('td', tf(e[v]))),
                EX_NC_COLS.map((c) => (shown ? h('td', { class: step.table === 1 && revealing ? 'cur' : '' }, tf(c.f(e))) : h('td.muted', '·'))));
            });
            table = h('table.tt', h('thead', h('tr', head)), h('tbody', rows));
          }
          stage.append(h('div.stack', { style: { alignItems: 'stretch', gap: '0.4rem', width: 'min(38rem, 100%)' } },
            ...lineEls,
            step.lines === 1 ? h('p.small.muted', 'Laws we will use: the implication law, the De Morgan law, and double negation — in that order, because each law creates the shape the next one needs.') : null,
            table ? h('div', { style: { display: 'flex', justifyContent: 'center' } }, table) : null,
            step.table === 1 ? h('div.small', { html: String.raw`Revealing row: \(p = \mathrm{T}\) and \(q = \mathrm{F}\) give \(\neg(\mathrm{T} \to \mathrm{F}) = \neg\mathrm{F} = \mathrm{T}\) and \(\mathrm{T} \land \neg\mathrm{F} = \mathrm{T} \land \mathrm{T} = \mathrm{T}\). The other rows are still unchecked.` }) : null,
            step.answer ? h('div.ex-answer', 'Answer: ¬(p → q) ≡ p ∧ ¬q · check: both columns agree in all 4 rows — T, F, F, F') : null));
        },
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: logic',
        kind: 'practice',
        html: String.raw`<p class="muted small">Type formulas with <code>~</code> for ¬, <code>&amp;</code> for ∧, <code>|</code> for ∨, <code>^</code> for ⊕, <code>-&gt;</code> for → and <code>&lt;-&gt;</code> for ↔ (the symbols themselves work too). Any formula equivalent to the answer is accepted.</p>`,
        gens: [
          {
            label: 'Evaluate a formula',
            make(R) {
              const f = randomFormula(R);
              const env = { p: R.chance(0.5), q: R.chance(0.5), r: R.chance(0.5) };
              const vars = varsOf(f);
              const val = ev(f, env);
              const work = steps(f).map((n) => String.raw`<li>\(${toTex(n)}\) is <b>${L(ev(n, env))}</b>: ${reason(n, env)}.</li>`).join('');
              return {
                prompt: String.raw`Let ${vars.map((v) => String.raw`\(${v}\) be ${env[v] ? 'true' : 'false'}`).join(', ')}. What is the truth value of \[${toTex(f)}\]`,
                options: ['True', 'False'],
                answer: val ? 'True' : 'False',
                hint: 'evaluate the innermost parts first, then work outward.',
                solution: `<p>Work from the inside out:</p><ol style="margin:0.3rem 0">${work}</ol><p>So the formula is <b>${val ? 'true' : 'false'}</b>.</p>`,
              };
            },
          },
          {
            label: 'English to symbols',
            make(R) {
              const t = R.pick(TOPICS);
              const forms = [
                [`If ${t.p}, then ${t.q}.`, 'p → q', '"If … then …" is the standard conditional: \\(p\\) is the hypothesis and \\(q\\) the conclusion.'],
                [`${cap(t.q)} if ${t.p}.`, 'p → q', '"\\(q\\) if \\(p\\)" puts the hypothesis after the word "if", even though it comes second in the sentence.'],
                [`${cap(t.p)} only if ${t.q}.`, 'p → q', '"Only if" introduces the conclusion: \\(p\\) can happen only when \\(q\\) happens, so \\(p \\to q\\).'],
                [`${cap(t.q)} whenever ${t.p}.`, 'p → q', '"\\(q\\) whenever \\(p\\)" means every time \\(p\\) holds, \\(q\\) holds: \\(p \\to q\\).'],
                [`${cap(t.p)}, but ${t.nq}.`, 'p ∧ ¬q', '"But" is logical "and" with a contrast, and the second part is the negation of \\(q\\).'],
                [`Either ${t.p} or ${t.q}, but not both.`, 'p ⊕ q', '"Or …, but not both" is exclusive or. You could also write \\((p \\lor q) \\land \\neg(p \\land q)\\).'],
                [`${cap(t.p)} if and only if ${t.q}.`, 'p ↔ q', '"If and only if" is the biconditional: both directions of the conditional.'],
                [`It is not the case that either ${t.p} or ${t.q}.`, '¬(p ∨ q)', 'This negates the whole disjunction. By De Morgan it equals \\(\\neg p \\land \\neg q\\): neither one happens.'],
                [`If ${t.nq}, then ${t.np}.`, '¬q → ¬p', 'Both parts are negations. This is the contrapositive of \\(p \\to q\\), so \\(p \\to q\\) is also accepted.'],
              ];
              const asks = [
                ['contrapositive', '¬q → ¬p', 'The contrapositive swaps the two parts and negates both: \\(\\neg q \\to \\neg p\\). It is equivalent to the original.'],
                ['converse', 'q → p', 'The converse swaps the two parts without negating: \\(q \\to p\\). It is not equivalent to the original.'],
                ['negation', 'p ∧ ¬q', 'A conditional is false exactly when the hypothesis holds and the conclusion fails, so its negation is \\(p \\land \\neg q\\) (equivalently \\(\\neg(p \\to q)\\)).'],
              ];
              const intro = String.raw`Let \(p\) stand for "${t.p}" and \(q\) for "${t.q}".`;
              let prompt, ans, why;
              if (R.chance(0.7)) { const [en, a, w] = R.pick(forms); prompt = `${intro} Write in symbols:<br><b>"${en}"</b>`; ans = a; why = w; }
              else { const [what, a, w] = R.pick(asks); prompt = `${intro} Write the <b>${what}</b> of <b>"If ${t.p}, then ${t.q}."</b> in symbols.`; ans = a; why = w; }
              const ascii = ans.replace(/¬/g, '~').replace(/∧/g, '&').replace(/∨/g, '|').replace(/⊕/g, '^').replace(/↔/g, '<->').replace(/→/g, '->');
              return {
                prompt, answer: ans, answerText: ans, format: 'text',
                check: (inp) => sameMeaning(inp, ans),
                placeholder: 'for example  p -> q  or  ~p & q',
                solution: String.raw`<b>\(${toTex(parse(ans))}\)</b>, typed <code>${ascii.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>. ${why}`,
              };
            },
          },
          {
            label: 'Equivalent or not?',
            make(R) {
              const [a, b, note] = R.pick(PAIRS);
              const map = R.chance(0.5) ? { p: 'q', q: 'p' } : {};
              let fa = rename(parse(a), map), fb = rename(parse(b), map);
              if (R.chance(0.5)) [fa, fb] = [fb, fa];
              const { vars, bad } = firstDifference(fa, fb);
              const eq = !bad;
              return {
                prompt: String.raw`Are these two formulas logically equivalent? \[${toTex(fa)} \qquad\text{and}\qquad ${toTex(fb)}\]`,
                options: ['Equivalent', 'Not equivalent'],
                answer: eq ? 'Equivalent' : 'Not equivalent',
                hint: 'look for one row of the truth table where they disagree.',
                solution: eq
                  ? `<b>Equivalent.</b> They agree in all ${2 ** vars.length} rows of the truth table. ${note}`
                  : `<b>Not equivalent.</b> Try the row ${envText(vars, bad)}: the first formula is ${tf(ev(fa, bad))} and the second is ${tf(ev(fb, bad))}. One disagreeing row is enough. ${note}`,
              };
            },
          },
          {
            label: 'Quantifiers over a domain',
            make(R, M) {
              let D = M.sortNum(R.sample([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], R.int(4, 5)));
              const kind = R.int(0, 6);
              let tex, truth, why;
              if (kind === 0) {
                const a = R.pick(D) - R.int(0, 1);
                const bad = D.find((x) => !(x > a));
                tex = String.raw`\forall x\  (x \gt ${a})`; truth = bad === undefined;
                why = truth ? `Every element is greater than ${a}; even the smallest, ${D[0]}, is.` : `${bad} is a counterexample, because ${bad} &gt; ${a} is false.`;
              } else if (kind === 1) {
                const a = R.int(0, 6);
                const w = D.find((x) => x % 2 === 0 && x > a);
                tex = String.raw`\exists x\  (x \text{ is even} \land x \gt ${a})`; truth = w !== undefined;
                why = truth ? `${w} is a witness: it is even and greater than ${a}.` : `No element is both even and greater than ${a}, so there is no witness.`;
              } else if (kind === 2) {
                const a = R.int(-3, 4);
                const bad = D.find((x) => x % 2 === 0 && !(x > a));
                const evens = D.filter((x) => x % 2 === 0);
                tex = String.raw`\forall x\  (x \text{ is even} \to x \gt ${a})`; truth = bad === undefined;
                why = truth ? `${evens.length ? `The even elements (${evens.join(', ')}) are all greater than ${a}.` : 'There are no even elements.'} Odd elements make the conditional vacuously true.` : `${bad} is even but not greater than ${a}, so it is a counterexample.`;
              } else if (kind === 3) {
                if (R.chance(0.5)) { const k = R.sample([1, 2, 3, 4, 5], 2); D = M.sortNum([...k, ...k.map((x) => -x), ...(R.chance(0.5) ? [0] : [])]); }
                const bad = D.find((x) => !D.includes(-x));
                tex = String.raw`\forall x\  \exists y\  (x + y = 0)`; truth = bad === undefined;
                why = truth ? 'Each x has the partner y = −x in the domain, and y is allowed to depend on x.' : `For x = ${bad}, the only y that works is ${-bad}, which is not in the domain. So ${bad} is a counterexample.`;
              } else if (kind === 4) {
                const strict = R.chance(0.5);
                const max = D[D.length - 1];
                tex = String.raw`\exists y\  \forall x\  (x ${strict ? '\\lt' : '\\le'} y)`; truth = !strict;
                why = strict ? 'Whatever y you choose, the choice x = y fails, because y &lt; y is false. So no y works for every x.' : `y = ${max}, the largest element, is a witness: every element is at most ${max}.`;
              } else if (kind === 5) {
                const max = D[D.length - 1];
                tex = String.raw`\forall x\  \exists y\  (y \gt x)`; truth = false;
                why = `x = ${max}, the largest element, is a counterexample: nothing in the domain is bigger. Over all the integers this statement would be true, so the domain matters.`;
              } else {
                const a = R.pick([0, 1, 4, 9, 16, 25, 2, 8]);
                const w = D.find((x) => x * x === a);
                tex = String.raw`\exists x\  (x^2 = ${a})`; truth = w !== undefined;
                why = truth ? `${w} is a witness, because ${w}² = ${a}.` : `No element squares to ${a}, so there is no witness.`;
              }
              return {
                prompt: String.raw`The domain is \(D = \{${D.map((x) => (x < 0 ? `{${x}}` : x)).join(', ')}\}\). Is this statement true or false? \[${tex}\]`,
                options: ['True', 'False'],
                answer: truth ? 'True' : 'False',
                hint: 'a ∀ statement needs a counterexample to be false; an ∃ statement needs a witness to be true.',
                solution: `<b>${truth ? 'True' : 'False'}.</b> ${why}`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: logic',
        kind: 'quiz',
        questions: [
          { q: 'Which sentence is a proposition?', choices: ['"Close the window."', '"Is 17 prime?"', '"17 is a prime number."', String.raw`"\(x + 2 = 5\)."`], answer: 2, explain: String.raw`A proposition must be true or false. "17 is a prime number" is true. A command and a question have no truth value, and \(x + 2 = 5\) becomes true or false only once \(x\) is chosen, which makes it a predicate.` },
          { q: String.raw`When is \(p \to q\) false?`, choices: [String.raw`When \(p\) is false and \(q\) is true`, String.raw`When \(p\) is true and \(q\) is false`, 'When both are false', String.raw`Whenever \(q\) is false`], answer: 1, explain: String.raw`A conditional is a promise that breaks only when the hypothesis happens and the conclusion does not. When \(p\) is false the conditional is vacuously true, whatever \(q\) is.` },
          { q: String.raw`Let \(p\): "you can board" and \(q\): "you have a ticket". Which formula means "You can board only if you have a ticket"?`, choices: [String.raw`\(q \to p\)`, String.raw`\(p \to q\)`, String.raw`\(p \land q\)`, String.raw`\(p \leftrightarrow q\)`], answer: 1, explain: String.raw`"Only if" introduces the conclusion: boarding requires a ticket, so boarding \(\to\) ticket. A ticket is necessary but not sufficient (you could still miss the flight), so \(q \to p\) says something different.` },
          { q: 'What is the contrapositive of "If a number is divisible by 4, then it is even"?', choices: ['If a number is even, then it is divisible by 4.', 'If a number is not divisible by 4, then it is not even.', 'If a number is not even, then it is not divisible by 4.', 'A number is divisible by 4 and not even.'], answer: 2, explain: String.raw`The contrapositive swaps and negates: \(\neg q \to \neg p\). It is equivalent to the original, so it is true as well. "If a number is even, then it is divisible by 4" is the converse (false: 6 is even but not divisible by 4) and "If a number is not divisible by 4, then it is not even" is the inverse (also false).` },
          { q: String.raw`Which formula is logically equivalent to \(\neg(p \land q)\)?`, choices: [String.raw`\(\neg p \land \neg q\)`, String.raw`\(\neg p \lor \neg q\)`, String.raw`\(p \lor q\)`, String.raw`\(\neg p \to \neg q\)`], answer: 1, explain: String.raw`De Morgan: "not both" means "at least one is false". \(\neg p \land \neg q\) says both are false, which is stronger. In the row \(p\) = T, \(q\) = F, \(\neg(p \land q)\) is T but \(\neg p \land \neg q\) is F.` },
          { q: String.raw`The formula \((p \land (p \to q)) \to q\) is true in all four rows of its truth table. It is therefore a…`, choices: ['contradiction', 'contingency', 'tautology', 'predicate'], answer: 2, explain: 'A tautology is true for every assignment of truth values. This one is modus ponens, the most used rule of inference in proofs (Module 3).' },
          { q: String.raw`What is the negation of \(\forall x\  (x^2 \gt 0)\)?`, choices: [String.raw`\(\forall x\  (x^2 \lt 0)\)`, String.raw`\(\exists x\  (x^2 \le 0)\)`, String.raw`\(\exists x\  (x^2 \gt 0)\)`, String.raw`\(\forall x\  (x^2 \le 0)\)`], answer: 1, explain: String.raw`\(\neg \forall x\  P(x) \equiv \exists x\  \neg P(x)\): flip the quantifier and negate the inside. The negation of \(x^2 \gt 0\) is \(x^2 \le 0\), not \(x^2 \lt 0\). Over the integers the negation is true, with witness \(x = 0\).` },
          { q: 'Over the integers, which statement is true?', choices: [String.raw`\(\exists y\  \forall x\  (y \gt x)\)`, String.raw`\(\forall x\  \exists y\  (y \gt x)\)`, 'Both of them', 'Neither of them'], answer: 1, fixed: true, explain: String.raw`In \(\forall x\  \exists y\), the choice of \(y\) may depend on \(x\): take \(y = x + 1\). In \(\exists y\  \forall x\), one \(y\) would have to beat every integer, including itself, which is impossible. Swapping different quantifiers changes the meaning.` },
          { q: 'Why is <code>if user is not None and user.age &gt;= 18:</code> safe when <code>user</code> is <code>None</code>?', choices: ['Python converts <code>None</code> to 0', 'Short-circuit evaluation: once the left side is <code>False</code>, the right side never runs', '<code>and</code> evaluates its right side first', 'It is not safe: it raises an error'], answer: 1, explain: '<code>and</code> stops at the first false operand. With no user, <code>user is not None</code> is <code>False</code>, so <code>user.age</code> is never evaluated. Reverse the two tests and the code crashes with an <code>AttributeError</code>.' },
          { q: 'What does <code>all([])</code> return in Python?', choices: ['<code>True</code>', '<code>False</code>', '<code>None</code>', 'It raises an error'], answer: 0, explain: String.raw`<code>all</code> is \(\forall\). Over an empty domain there is no counterexample, so the statement is vacuously true. <code>any([])</code> is <code>False</code> because there is no witness. Code that must reject empty input has to check for it separately.` },
        ],
      },
    ],
  });
})();
