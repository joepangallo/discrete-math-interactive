/* Module 13: Probability. Objective 13: understand basic probability theory.
   Sample spaces and events as sets, counting-based probability, the rules, conditional probability,
   independence, Bayes' theorem, random variables, expected value, the binomial distribution,
   the law of large numbers, and the birthday problem. */
(() => {
  const { M } = globalThis.DMUtil; // the same gcd / C / frac helpers the practice generators receive
  const fr = (n, d) => String(M.frac(n, d));
  const pct = (x, dp = 1) => (100 * x).toFixed(dp) + '%';
  const pctS = (x) => String(Number((100 * x).toFixed(2))) + '%';
  const num = (x, dp = 3) => String(Number(x.toFixed(dp)));
  const big = (x) => Number(x).toLocaleString('en-US');
  const bigT = (x) => big(x).replace(/,/g, '{,}');
  // a probability in TeX: plain decimals, or scientific notation when it is tiny
  const sciT = (x, d = 3) => { if (x === 0) return '0'; if (x >= 0.001) return x.toPrecision(d); const [m, e] = x.toExponential(d - 1).split('e'); return `${m} \\times 10^{${+e}}`; };
  const p4 = (x) => (x > 0 && x < 0.00005 ? '< 0.0001' : x.toFixed(4));
  const p4T = (x) => (x > 0 && x < 0.00005 ? `${sciT(x)}` : x.toFixed(4));
  const pmf = (n, p, k) => M.C(n, k) * p ** k * (1 - p) ** (n - k);
  const ways2 = (s) => (s < 2 || s > 12 ? 0 : 6 - Math.abs(s - 7));
  const pairsFor = (s) => { const out = []; for (let a = 1; a <= 6; a++) { const b = s - a; if (b >= 1 && b <= 6) out.push(`(${a},${b})`); } return out; };
  // probability that at least two of n people share a birthday (365 equally likely days)
  const shareProb = (n) => { let q = 1; for (let i = 0; i < n; i++) q *= (365 - i) / 365; return 1 - q; };
  const yoursProb = (n) => 1 - (364 / 365) ** Math.max(0, n - 1);
  // ---- worked example data: the 16 outcome strings of 4 coin flips, built H-first so the tree order is fixed ----
  const EX_BIN_LEAVES = (() => { let cur = ['']; for (let f = 0; f < 4; f++) { const nxt = []; for (const p of cur) { nxt.push(p + 'H'); nxt.push(p + 'T'); } cur = nxt; } return cur; })();
  const EX_BIN_HEADS = (leaf) => leaf.split('').filter((c) => c === 'H').length;

  DM.module({
    id: 'probability',
    num: 13,
    title: 'Probability',
    objectives: [13],
    terms: {
      'experiment': 'Any process with an uncertain result that can be repeated, such as flipping a coin, rolling dice, or showing a model a new e-mail.',
      'outcome': 'One possible result of an experiment, such as "the die shows 4".',
      'sample space': 'The set S of all possible outcomes of an experiment. For one die, S = {1, 2, 3, 4, 5, 6}.',
      'event': 'Any subset of the sample space, such as "the die shows an even number" = {2, 4, 6}. An event happens when the outcome lands inside it.',
      'equally likely': 'Every outcome in the sample space has the same chance. Then P(E) = |E| / |S|, so probability becomes counting.',
      'mutually exclusive': 'Two events that cannot happen together: A ∩ B = ∅. Then P(A ∪ B) = P(A) + P(B).',
      'conditional probability': 'P(A | B) = P(A ∩ B) / P(B), the probability of A once you know B happened. Knowing B shrinks the sample space to B.',
      'independent events': 'Events where knowing one happened does not change the chance of the other: P(A ∩ B) = P(A) · P(B), or equivalently P(A | B) = P(A).',
      "Bayes' theorem": 'P(A | B) = P(B | A) · P(A) / P(B). It turns the probability you know (evidence given the cause) into the one you want (cause given the evidence).',
      'base rate': 'How common a condition is before any test or evidence, such as 1% of people having a disease. Also called the prior probability or prevalence.',
      'sensitivity': 'P(positive test | condition present): the share of real cases a test catches. In machine learning this is called recall.',
      'specificity': 'P(negative test | condition absent): the share of non-cases a test correctly clears. One minus specificity is the false-positive rate.',
      'false positive': 'A positive result for a case that is actually negative, such as a healthy person testing positive or a real e-mail landing in the spam folder.',
      'random variable': 'A rule that assigns a number to every outcome, such as X = the sum of two dice. Its distribution lists P(X = x) for every value x.',
      'expected value': 'E[X] = Σ x · P(X = x), the probability-weighted average of a random variable. It is the long-run average over many repetitions.',
      'linearity of expectation': 'E[X + Y] = E[X] + E[Y] and E[aX + b] = a·E[X] + b. It holds for every pair of random variables, even dependent ones.',
      'variance': 'Var(X) = E[(X − μ)²], the average squared distance from the mean μ. Its square root σ (standard deviation) measures typical spread.',
      'binomial distribution': 'The distribution of the number of successes in n independent trials that each succeed with probability p: P(X = k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ.',
      'law of large numbers': 'As an experiment is repeated more times, the relative frequency of an event gets closer to its probability.',
      'Monte Carlo simulation': 'Estimating a probability by running a random experiment many times on a computer and counting how often the event happens.',
    },
    symbols: [
      ['S', 'sample space', 'S = {H, T}'],
      ['P(E)', 'probability of event E', 'P(heads) = 1/2'],
      ['P(E′)', 'probability that E does not happen', '1 − P(E)'],
      ['P(A | B)', 'probability of A given B', 'P(A ∩ B) / P(B)'],
      ['X', 'random variable', 'X = sum of two dice'],
      ['E[X]', 'expected value (mean)', 'E[one die] = 3.5'],
      ['μ', 'mean of a distribution', 'μ = np'],
      ['Var(X)', 'variance', 'Var(one die) = 35/12'],
      ['σ', 'standard deviation', 'σ = √Var(X)'],
      ['X ~ Bin(n, p)', 'X has the binomial distribution', 'heads in 10 flips ~ Bin(10, 1/2)'],
    ],
    css: `
      .pb-dice .field { font-size: 0.78rem; }
      .pb-dice select { width: 100%; }
      .pb-dice .seg button { padding: 0.22rem 0.55rem; font-size: 0.82rem; }
      .pb-svg { width: 100%; height: auto; display: block; }
      .pb-svg text { font-size: 11px; fill: var(--ink-2); }
      .pb-stat { width: 100%; border-collapse: collapse; font-size: 0.86rem; font-variant-numeric: tabular-nums; }
      .pb-stat td { border-bottom: 1px solid var(--rule); padding: 0.2rem 0.35rem; }
      .pb-stat td:last-child { text-align: right; font-family: var(--font-mono); white-space: nowrap; }
      .pb-chips { display: flex; flex-wrap: wrap; gap: 0.25rem; min-height: 1.5rem; }
      .pb-chips span { font-family: var(--font-mono); font-size: 0.75rem; border: 1px solid var(--rule); border-radius: 0.3rem; padding: 0 0.35rem; background: var(--sheet); }
      .pb-chips span.hit { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 700; text-decoration: underline; }
      .pb-slider { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.1rem 0.6rem; align-items: center; font-size: 0.82rem; color: var(--ink-2); }
      .pb-slider input { grid-column: 1 / -1; }
      .pb-slider b { font-family: var(--font-mono); color: var(--ink); }
      .pb-doors { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.7rem; }
      .pb-door { display: grid; grid-template-rows: auto 1fr auto; justify-items: center; align-items: center; height: 8.6rem; border: 2px solid var(--rule); border-radius: 0.6rem 0.6rem 0.25rem 0.25rem; background: var(--accent-2); color: var(--ink); cursor: pointer; padding: 0.45rem 0.3rem; font: inherit; }
      .pb-door:hover:not(:disabled) { border-color: var(--accent); }
      .pb-door:disabled { cursor: default; }
      .pb-door .pb-door-n { font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink-2); }
      .pb-door .pb-door-prize { font-family: var(--font-display); font-size: 1.9rem; font-weight: 600; color: var(--ink-3); }
      .pb-door .pb-door-tag { font-size: 0.72rem; min-height: 1.1em; color: var(--accent); font-weight: 600; }
      .pb-door.picked { border-color: var(--accent); border-width: 3px; }
      .pb-door.open { background: var(--paper); border-style: dashed; }
      .pb-door.open .pb-door-prize { font-size: 1.35rem; color: var(--ink-2); }
      .pb-door.car { background: var(--true-bg); border-style: solid; border-color: var(--true); }
      .pb-door.car .pb-door-prize { color: var(--true); }
      .pb-door.final { box-shadow: 0 0 0 3px var(--mark); }
      .pb-legend { display: flex; flex-wrap: wrap; gap: 0.3rem 0.9rem; font-size: 0.78rem; color: var(--ink-2); }
      .pb-legend i { display: inline-block; width: 0.75rem; height: 0.75rem; border-radius: 50%; vertical-align: -0.1rem; margin-right: 0.3rem; border: 1.5px solid transparent; }
      .pb-mini { width: 100%; border-collapse: collapse; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
      .pb-mini th, .pb-mini td { border: 1px solid var(--rule); padding: 0.12rem 0.4rem; text-align: center; }
      .pb-mini th { background: var(--paper); color: var(--ink-2); font-weight: 600; }
      .pb-mini td.l, .pb-mini th.l { text-align: left; }
      .pb-dist { border-collapse: collapse; font-size: 0.86rem; margin-top: 0.3rem; }
      .pb-dist td, .pb-dist th { border: 1px solid var(--rule); padding: 0.1rem 0.6rem; text-align: center; }
      .pb-dist th { background: var(--paper); font-weight: 600; color: var(--ink-2); }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Experiments, sample spaces and events',
        kind: 'concept',
        html: String.raw`
          <div class="split" style="align-items:stretch">
            <div class="stack" style="gap:0.5rem">
              <div class="def">An <span class="term">experiment</span> is any process with an uncertain result, such as rolling a die. Each possible result is an <span class="term">outcome</span>. The <span class="term">sample space</span> \(S\) is the set of all outcomes, and an <span class="term">event</span> is any subset of \(S\).</div>
              <div class="thm">When every outcome is <span class="term">equally likely</span>, probability is a ratio of two counts:
                \[P(E) = \frac{|E|}{|S|}\]</div>
              <div class="ex">Roll two dice. \(S = \{1,\dots,6\} \times \{1,\dots,6\}\), the Cartesian product from Module 1, so \(|S| = 36\). The event "sum is 7" holds six pairs, from \((1,6)\) to \((6,1)\), so \(P = 6/36 = 1/6\).</div>
              <p class="small">Events are sets, so Module 1's operations build new events. \(A \cap B\) means both happen. \(A \cup B\) means at least one happens. \(A'\) means \(A\) does not happen.</p>
              <div class="warn">"Equally likely" is an assumption you must check. The sums 2 to 12 are 11 results, yet only \((1,1)\) gives a sum of 2, so \(P(\text{sum} = 2) = 1/36\). Count the 36 equally likely pairs instead of the 11 sums.</div>
            </div>
            <div class="card stack pb-dice" style="gap:0.45rem"></div>
          </div>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const host = body.querySelector('.pb-dice');
          const EV = [
            ['sum is 7', (a, b) => a + b === 7],
            ['doubles', (a, b) => a === b],
            ['at least one 6', (a, b) => a === 6 || b === 6],
            ['sum ≥ 10', (a, b) => a + b >= 10],
            ['first die is even', (a) => a % 2 === 0],
            ['sum is 8', (a, b) => a + b === 8],
          ];
          const OPS = [
            ['A', 'A', (x) => x],
            ['B', 'B', (x, y) => y],
            ['A ∩ B', 'A \\cap B', (x, y) => x && y],
            ['A ∪ B', 'A \\cup B', (x, y) => x || y],
            ['A′', "A'", (x) => !x],
          ];
          let ai = 0, bi = 2, oi = 3;
          const mkSel = (val, on, label) => h('select.inp', { 'aria-label': label, onchange: (e) => on(+e.target.value) }, EV.map(([t], i) => h('option', { value: i, selected: i === val }, t)));
          const selA = mkSel(ai, (v) => { ai = v; draw(); }, 'Event A');
          const selB = mkSel(bi, (v) => { bi = v; draw(); }, 'Event B');
          const seg = h('div.seg', { role: 'group', 'aria-label': 'Which event to highlight' });
          const svg = s('svg', { viewBox: '0 0 300 202', class: 'pb-svg', role: 'img', 'aria-label': 'All 36 outcomes of rolling two dice' });
          const read = h('div.small');
          host.append(
            h('div.tiny.mono.muted', 'TRY IT: EVENTS AS SETS OF OUTCOMES'),
            h('div.row', { style: { gap: '0.5rem', flexWrap: 'nowrap' } },
              h('label.field', { style: { flex: '1' } }, h('span', h('span.swatch', { style: { background: 'var(--accent)', borderRadius: '50%' } }), 'Event A'), selA),
              h('label.field', { style: { flex: '1' } }, h('span', h('span.swatch', { style: { background: 'var(--fnc)', borderRadius: '50%' } }), 'Event B'), selB)),
            seg, svg, read);
          function draw() {
            rc(seg, ...OPS.map(([lab], i) => h('button', { 'aria-pressed': String(i === oi), onclick: () => { oi = i; draw(); } }, lab)));
            const fa = EV[ai][1], fb = EV[bi][1], fo = OPS[oi][2];
            let nA = 0, nB = 0, nAB = 0, nR = 0;
            const kids = [];
            for (let b = 1; b <= 6; b++) kids.push(s('text', { x: 26 + (b - 0.5) * 45, y: 14, 'text-anchor': 'middle', 'font-weight': 600, fill: 'var(--ink-2)', text: String(b) }));
            for (let a = 1; a <= 6; a++) {
              kids.push(s('text', { x: 13, y: 20 + (a - 0.5) * 30 + 4, 'text-anchor': 'middle', 'font-weight': 600, fill: 'var(--ink-2)', text: String(a) }));
              for (let b = 1; b <= 6; b++) {
                const inA = !!fa(a, b), inB = !!fb(a, b), r = !!fo(inA, inB);
                nA += inA; nB += inB; nAB += inA && inB; nR += r;
                const x = 26 + (b - 1) * 45 + 1.5, y = 20 + (a - 1) * 30 + 1.5;
                kids.push(s('rect', { x, y, width: 42, height: 27, rx: 4, fill: r ? 'var(--mark)' : 'var(--sheet)', stroke: r ? 'var(--warn)' : 'var(--rule)', 'stroke-width': 1 }));
                kids.push(s('text', { x: x + 21, y: y + 18, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': r ? 700 : 400, fill: r ? 'var(--mark-ink)' : 'var(--ink-3)', text: `${a},${b}` }));
                if (inA) kids.push(s('circle', { cx: x + 6.5, cy: y + 6.5, r: 3.2, fill: 'var(--accent)' }));
                if (inB) kids.push(s('circle', { cx: x + 35.5, cy: y + 6.5, r: 3.2, fill: 'var(--fnc)' }));
              }
            }
            rc(svg, ...kids);
            const tex = OPS[oi][1];
            let how = 'Cells with the matching corner dot are in the event.';
            if (oi === 3) how = String.raw`Inclusion–exclusion: \(|A \cup B| = ${nA} + ${nB} - ${nAB} = ${nR}\).`;
            else if (oi === 2) how = 'Only cells with both corner dots count.';
            else if (oi === 4) how = String.raw`Cells without a left dot: \(|A'| = 36 - ${nA} = ${nR}\).`;
            read.innerHTML = String.raw`<div>\(|A| = ${nA},\ |B| = ${nB},\ |A \cap B| = ${nAB}\)</div>
              <div class="muted">${how}</div>
              <div style="margin-top:0.15rem"><b>\(P(${tex}) = ${nR}/36${fr(nR, 36) !== `${nR}/36` ? ` = ${fr(nR, 36)}` : ''} \approx ${num(nR / 36)}\)</b></div>`;
            ctx.tex(read);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Counting outcomes and the rules of probability',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p>With equally likely outcomes, every probability question becomes two counting questions. Count the outcomes in the event, count the sample space, and divide. The counting tools of Module 7 do the hard part.</p>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">Situation</th><th>Event count / total</th><th>Probability</th></tr></thead>
                <tbody>
                  <tr><td class="l">One card from a deck is a heart</td><td>\(13 / 52\)</td><td>\(1/4\)</td></tr>
                  <tr><td class="l">A 5-card hand is all hearts</td><td>\(\binom{13}{5} / \binom{52}{5}\)</td><td>\(\approx 0.0005\)</td></tr>
                  <tr><td class="l">One lottery ticket matches 6 of 49</td><td>\(1 / \binom{49}{6}\)</td><td>\(1/13{,}983{,}816\)</td></tr>
                  <tr><td class="l">A random committee of 3 from 6 women and 4 men is all women</td><td>\(\binom{6}{3} / \binom{10}{3}\)</td><td>\(20/120 = 1/6\)</td></tr>
                </tbody>
              </table>
              <div class="ai">A classifier's final layer (softmax) turns raw scores into probabilities over the classes. They obey the rules on the right: each lies between 0 and 1, and together they sum to 1. Language models do the same over their whole vocabulary for the next token, and temperature or top-k sampling reshape that distribution while keeping the total at 1.</div>
            </div>
            <div class="stack">
              <div class="thm">Every probability obeys three axioms. \(0 \le P(E) \le 1\). \(P(S) = 1\). If \(A \cap B = \varnothing\), then \(P(A \cup B) = P(A) + P(B)\).</div>
              <div class="def">Events with \(A \cap B = \varnothing\) are <span class="term">mutually exclusive</span>. They cannot happen together, like rolling a 1 and rolling a 2 with the same die.</div>
              <div class="thm" data-label="Two rules that follow">Complement: \(P(E') = 1 - P(E)\).<br>Union (inclusion–exclusion): \(P(A \cup B) = P(A) + P(B) - P(A \cap B)\).</div>
              <div class="ex">What is the chance of at least one 6 in two rolls? The complement is "no 6 at all", with probability \((5/6)^2 = 25/36\). So the answer is \(1 - 25/36 = 11/36\). Adding \(1/6 + 1/6 = 12/36\) overcounts, because the two events overlap at \((6,6)\).</div>
              <div class="tip">For any "at least one" question, compute the complement "none" and subtract from 1. It is usually one multiplication instead of many cases.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: the law of large numbers',
        kind: 'lab',
        html: String.raw`<p class="muted small">The <span class="term">law of large numbers</span> says that as you repeat an experiment more times, the <i>relative frequency</i> of an event (times it happened ÷ trials) gets closer to its probability. Roll, then watch the line settle onto the dashed target. The horizontal axis is logarithmic, so each grid line means ten times more trials.</p>`,
        render(body, ctx) {
          const { h, s, rc, R } = ctx;
          const dice36 = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((w) => w / 36);
          const EXP = {
            coin: { name: 'Coin', faces: ['H', 'T'], roll: () => (R.random() < 0.5 ? 0 : 1), target: 0, p: 1 / 2, pTxt: '1/2', ymax: 1, event: 'heads', expect: [0.5, 0.5] },
            die: { name: 'One die', faces: ['1', '2', '3', '4', '5', '6'], roll: () => Math.floor(R.random() * 6), target: 5, p: 1 / 6, pTxt: '1/6', ymax: 1, event: 'a six', expect: Array(6).fill(1 / 6) },
            dice: { name: 'Two dice', faces: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], roll: () => Math.floor(R.random() * 6) + Math.floor(R.random() * 6), target: 5, p: 1 / 6, pTxt: '1/6', ymax: 1, event: 'a sum of 7', expect: dice36 },
          };
          const CAP = 100000;
          const hist = new Float64Array(CAP + 1);
          let key = 'die', E = EXP[key], n = 0, hits = 0, counts = [], last = [];
          const W = 560, X0 = 44, X1 = 548, Y0 = 12, Y1 = 196;
          const chart = s('svg', { viewBox: `0 0 ${W} 214`, class: 'pb-svg', role: 'img', 'aria-label': 'Relative frequency against number of trials' });
          const bars = s('svg', { viewBox: `0 0 ${W} 112`, class: 'pb-svg', role: 'img', 'aria-label': 'Histogram of outcomes' });
          const seg = h('div.seg', { role: 'group', 'aria-label': 'Experiment' });
          const autoBtn = h('button.btn.sm', { onclick: () => { if (!auto.playing && n >= CAP) reset(); auto.toggle(); } });
          // every tick adds 5% more trials, so the log-scale line advances at a steady pace until the cap
          const auto = ctx.ticker({ ms: 70, button: autoBtn, tick() { add(Math.max(1, Math.ceil(n * 0.05))); draw(); return n < CAP; }, onChange: (on) => autoBtn.classList.toggle('on', on) });
          const stats = h('table.pb-stat');
          const chips = h('div.pb-chips', { 'aria-label': 'Most recent results' });
          const note = h('p.small');
          const left = h('div.stack', { style: { gap: '0.3rem', minHeight: 0 } },
            h('div.tiny.mono.muted', 'RELATIVE FREQUENCY AFTER EACH TRIAL (TRIALS ON A LOG SCALE)'), chart,
            h('div.tiny.mono.muted', 'HISTOGRAM OF ALL RESULTS (DASHES = EXACT PROBABILITY)'), bars);
          const right = h('div.stack', { style: { gap: '0.45rem' } },
            seg,
            h('div.row', { style: { gap: '0.35rem' } },
              h('button.btn.sm', { onclick: () => { auto.stop(); add(1); draw(); } }, 'Roll ×1'),
              h('button.btn.sm', { onclick: () => { auto.stop(); add(10); draw(); } }, '×10'),
              h('button.btn.sm', { onclick: () => { auto.stop(); add(1000); draw(); } }, '×1,000'),
              autoBtn,
              h('button.btn.sm', { onclick: () => { auto.stop(); reset(); draw(); } }, 'Reset')),
            stats, h('div', h('div.tiny.mono.muted', 'LAST RESULTS (HIGHLIGHTED = THE EVENT)'), chips), note,
            h('div.ai', { html: 'This is how you check a model\'s <b>calibration</b>. When a weather model or a classifier says "70%", the event should happen in about 70% of those cases over many predictions. A well-calibrated model passes exactly the test this lab runs.' }));
          body.append(h('div.split-wide.fill', { style: { minHeight: 0, alignItems: 'start' } }, left, right));

          function reset() { n = 0; hits = 0; counts = E.faces.map(() => 0); last = []; }
          function add(k) {
            const m = Math.min(k, CAP - n);
            for (let i = 0; i < m; i++) {
              const o = E.roll();
              counts[o]++;
              if (o === E.target) hits++;
              n++;
              hist[n] = hits / n;
              if (m - i <= 14) last.push(o);
            }
            if (last.length > 14) last = last.slice(-14);
          }
          const xOf = (m) => X0 + (Math.log10(m) / 5) * (X1 - X0);
          const yOf = (v) => Y1 - (Math.min(v, E.ymax) / E.ymax) * (Y1 - Y0);
          function drawChart() {
            const kids = [s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: 'var(--sheet)', stroke: 'var(--rule)' })];
            // shaded funnel: where about 95% of runs sit after m trials, p ± 2·sqrt(p(1-p)/m)
            const up = [], lo = [];
            for (let t = 0; t <= 5.0001; t += 0.05) {
              const m = 10 ** t, w = 2 * Math.sqrt((E.p * (1 - E.p)) / m);
              up.push(`${xOf(m).toFixed(1)},${yOf(Math.min(E.ymax, E.p + w)).toFixed(1)}`);
              lo.unshift(`${xOf(m).toFixed(1)},${yOf(Math.max(0, E.p - w)).toFixed(1)}`);
            }
            kids.push(s('polygon', { points: up.concat(lo).join(' '), fill: 'var(--accent-2)', stroke: 'none' }));
            ['1', '10', '100', '1,000', '10,000', '100,000'].forEach((lab, i) => {
              const x = X0 + (i / 5) * (X1 - X0);
              kids.push(s('line', { x1: x, y1: Y0, x2: x, y2: Y1, stroke: 'var(--rule)', 'stroke-width': 1 }));
              kids.push(s('text', { x, y: Y1 + 15, 'text-anchor': i === 0 ? 'start' : i === 5 ? 'end' : 'middle', text: lab }));
            });
            [0, E.ymax / 2, E.ymax].forEach((v) => kids.push(s('text', { x: X0 - 5, y: yOf(v) + 4, 'text-anchor': 'end', text: num(v, 2) })));
            kids.push(s('line', { x1: X0, y1: yOf(E.p), x2: X1, y2: yOf(E.p), stroke: 'var(--ink)', 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }));
            kids.push(s('text', { x: X1 - 4, y: yOf(E.p) - 6, 'text-anchor': 'end', fill: 'var(--ink)', 'font-weight': 600, text: `true probability ${E.pTxt} ≈ ${num(E.p)}` }));
            if (n > 0) {
              const pts = [];
              let prev = 0;
              for (let t = 0; t <= Math.log10(n) + 1e-9; t += 0.008) { const i = Math.min(n, Math.round(10 ** t)); if (i !== prev) { pts.push(i); prev = i; } }
              if (prev !== n) pts.push(n);
              kids.push(s('path', { d: pts.map((i, j) => `${j ? 'L' : 'M'}${xOf(i).toFixed(1)} ${yOf(hist[i]).toFixed(1)}`).join(''), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
              kids.push(s('circle', { cx: xOf(n), cy: yOf(hist[n]), r: 4.5, fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': 1.5 }));
            }
            rc(chart, ...kids);
          }
          function drawBars() {
            const k = E.faces.length, slot = (W - 40) / k, bw = Math.min(46, slot * 0.66), top = 14, bottom = 92;
            const freq = counts.map((c) => (n ? c / n : 0));
            const mx = Math.max(...E.expect, ...freq) * 1.15 || 1;
            const kids = [s('line', { x1: 20, y1: bottom, x2: W - 20, y2: bottom, stroke: 'var(--rule)' })];
            E.faces.forEach((f, i) => {
              const cx = 20 + slot * (i + 0.5), hgt = (freq[i] / mx) * (bottom - top), ey = bottom - (E.expect[i] / mx) * (bottom - top);
              kids.push(s('rect', { x: cx - bw / 2, y: bottom - hgt, width: bw, height: Math.max(0, hgt), rx: 2, fill: i === E.target ? 'var(--accent)' : 'var(--fnc)', opacity: i === E.target ? 1 : 0.55 }));
              kids.push(s('line', { x1: cx - bw / 2 - 3, y1: ey, x2: cx + bw / 2 + 3, y2: ey, stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
              kids.push(s('text', { x: cx, y: bottom + 14, 'text-anchor': 'middle', 'font-weight': i === E.target ? 700 : 400, fill: 'var(--ink)', text: f }));
              if (n) kids.push(s('text', { x: cx, y: Math.min(bottom - hgt, ey) - 4, 'text-anchor': 'middle', 'font-size': 10, text: pct(freq[i], 0) }));
            });
            rc(bars, ...kids);
          }
          function draw() {
            rc(seg, ...Object.entries(EXP).map(([k, ex]) => h('button', { 'aria-pressed': String(k === key), onclick: () => { auto.stop(); key = k; E = EXP[k]; reset(); add(100); draw(); } }, `${ex.name}: ${ex.event}`)));
            const f = n ? hits / n : 0, gap = Math.abs(f - E.p), close = n > 0 && gap < 0.01;
            rc(stats,
              h('tr', h('td', 'Trials so far'), h('td', big(n))),
              h('tr', h('td', `Times we saw ${E.event}`), h('td', big(hits))),
              h('tr', h('td', 'Relative frequency'), h('td', n ? `${big(hits)} / ${big(n)} = ${f.toFixed(4)}` : '–')),
              h('tr', h('td', 'True probability'), h('td', `${E.pTxt} = ${E.p.toFixed(4)}`)),
              h('tr', h('td', 'Gap from the truth'), h('td', { style: { color: close ? 'var(--true)' : 'var(--ink)' } }, !n ? '–' : close ? `${gap.toFixed(4)} (under 0.01)` : gap.toFixed(4))));
            rc(chips, ...last.map((o) => h('span', { class: o === E.target ? 'hit' : '' }, E.faces[o])));
            const typ = n ? 2 * Math.sqrt((E.p * (1 - E.p)) / n) : 0;
            note.innerHTML = !n ? 'Press a roll button to start.' : n < 1000
              ? `After only ${big(n)} trials the frequency still swings. Runs like this one usually land within <b>±${typ.toFixed(3)}</b> of the truth, the width of the shaded funnel. Press ×1,000 a few times.`
              : `After ${big(n)} trials the typical gap is about <b>±${typ.toFixed(4)}</b>. The gap shrinks like \\(1/\\sqrt{n}\\), so 100 times more trials buys only 10 times more accuracy. Early streaks never get "corrected". Later trials simply outnumber them.`;
            ctx.tex(note);
            drawChart();
            drawBars();
          }
          reset();
          add(100);
          draw();
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Lab: the birthday problem',
        kind: 'lab',
        html: String.raw`<p class="muted small">How many people must be in a room before two of them probably share a birthday? Most people guess around 180. The complement rule gives the real answer. \(P(\text{no match}) = \frac{365}{365} \cdot \frac{364}{365} \cdots\), one factor per person, because each new person must avoid every birthday already taken. Then \(P(\text{match}) = 1 - P(\text{no match})\).</p>`,
        render(body, ctx) {
          const { h, s, rc, R } = ctx;
          let n = 23, room = [], sim = null;
          const MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          const ML = 'JFMAMJJASOND';
          const X0 = 40, X1 = 508, Y0 = 10, Y1 = 176;
          const curve = s('svg', { viewBox: '0 0 520 206', class: 'pb-svg', role: 'img', 'aria-label': 'Probability of a shared birthday against group size' });
          const cal = s('svg', { viewBox: '0 0 520 150', class: 'pb-svg', role: 'img', 'aria-label': 'Birthdays of one random room on a calendar' });
          const slider = h('input', { type: 'range', min: 2, max: 80, step: 1, value: n, 'aria-label': 'Group size', oninput: (e) => { n = +e.target.value; newRoom(); runSim(); draw(); } });
          const nOut = h('b');
          const stats = h('table.pb-stat');
          const formula = h('div.small');
          const roomMsg = h('div.small');
          const simMsg = h('div.small');
          body.append(h('div.split.fill', { style: { minHeight: 0, alignItems: 'start' } },
            h('div.stack', { style: { gap: '0.3rem' } },
              h('div.legend', h('span', h('span.swatch', { style: { background: 'var(--accent)' } }), 'solid: some pair shares a birthday'), h('span', h('span.swatch', { style: { background: 'var(--fnc)' } }), 'dashed: someone shares YOUR birthday')),
              curve,
              h('div.tiny.mono.muted', 'ONE RANDOM ROOM: EACH ROW IS A MONTH, EACH SQUARE A DAY'), cal),
            h('div.stack', { style: { gap: '0.45rem' } },
              h('label.pb-slider', h('span', 'People in the room'), nOut, slider),
              stats, formula,
              h('div.row', { style: { gap: '0.35rem' } },
                h('button.btn.sm', { onclick: () => { newRoom(); draw(); } }, 'New random room'),
                h('button.btn.sm', { onclick: () => { runSim(); draw(); } }, 'Simulate 2,000 rooms'),
                h('button.btn.sm', { onclick: () => { n = 23; slider.value = 23; newRoom(); runSim(); draw(); } }, 'Back to 23')),
              roomMsg, simMsg,
              h('div.ai', { html: 'The same math predicts collisions in hashing. Feature hashing in machine learning maps millions of words into a fixed number of buckets, and with \\(m\\) buckets a collision becomes likely after only about \\(\\sqrt{m}\\) items. Systems that hash data for deduplication size their hashes with this "birthday bound".' }))));
          function newRoom() { room = Array.from({ length: n }, () => Math.floor(R.random() * 365)); }
          function runSim() {
            let hitsN = 0;
            const seen = new Uint16Array(365);
            for (let r = 0; r < 2000; r++) {
              seen.fill(0);
              for (let i = 0; i < n; i++) { const d = Math.floor(R.random() * 365); if (seen[d]++) { hitsN++; break; } }
            }
            sim = hitsN;
          }
          const xOf = (k) => X0 + ((k - 1) / 79) * (X1 - X0);
          const yOf = (v) => Y1 - v * (Y1 - Y0);
          function draw() {
            nOut.textContent = `n = ${n}`;
            const pS = shareProb(n), pY = yoursProb(n), pairs = M.C(n, 2);
            // curve
            const kids = [s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: 'var(--sheet)', stroke: 'var(--rule)' })];
            [0, 0.25, 0.5, 0.75, 1].forEach((v) => { kids.push(s('line', { x1: X0, y1: yOf(v), x2: X1, y2: yOf(v), stroke: 'var(--rule)', 'stroke-dasharray': v === 0.5 ? '5 4' : null, 'stroke-width': v === 0.5 ? 1.4 : 1 })); kids.push(s('text', { x: X0 - 5, y: yOf(v) + 4, 'text-anchor': 'end', text: `${v * 100}%` })); });
            [1, 10, 20, 23, 30, 40, 50, 60, 70, 80].forEach((k) => kids.push(s('text', { x: xOf(k), y: Y1 + 14, 'text-anchor': 'middle', 'font-weight': k === 23 ? 700 : 400, fill: k === 23 ? 'var(--ink)' : 'var(--ink-2)', text: String(k) })));
            kids.push(s('text', { x: (X0 + X1) / 2, y: 204, 'text-anchor': 'middle', fill: 'var(--ink-3)', text: 'people in the room' }));
            const path = (f) => Array.from({ length: 80 }, (_, i) => `${i ? 'L' : 'M'}${xOf(i + 1).toFixed(1)} ${yOf(f(i + 1)).toFixed(1)}`).join('');
            kids.push(s('path', { d: path(yoursProb), fill: 'none', stroke: 'var(--fnc)', 'stroke-width': 2, 'stroke-dasharray': '7 4' }));
            kids.push(s('path', { d: path(shareProb), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }));
            kids.push(s('line', { x1: xOf(n), y1: Y0, x2: xOf(n), y2: Y1, stroke: 'var(--ink-3)', 'stroke-width': 1 }));
            kids.push(s('circle', { cx: xOf(n), cy: yOf(pS), r: 5, fill: 'var(--accent)', stroke: 'var(--sheet)', 'stroke-width': 1.5 }));
            kids.push(s('circle', { cx: xOf(n), cy: yOf(pY), r: 4, fill: 'var(--fnc)', stroke: 'var(--sheet)', 'stroke-width': 1.5 }));
            const right = n > 62;
            kids.push(s('text', { x: xOf(n) + (right ? -8 : 8), y: Math.max(Y0 + 12, Math.min(yOf(pS) - 6, yOf(pY) - 22)), 'text-anchor': right ? 'end' : 'start', fill: 'var(--ink)', 'font-weight': 700, text: pct(pS) }));
            kids.push(s('text', { x: xOf(n) + (right ? -8 : 8), y: Math.min(Y1 - 4, yOf(pY) + 14), 'text-anchor': right ? 'end' : 'start', fill: 'var(--ink)', text: pct(pY) }));
            rc(curve, ...kids);
            // calendar of one room
            const cnt = new Array(365).fill(0);
            room.forEach((d) => cnt[d]++);
            const ck = [];
            let day = 0;
            MONTHS.forEach((len, m) => {
              ck.push(s('text', { x: 8, y: 9 + m * 12 + 4, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--ink-3)', text: ML[m] }));
              for (let d = 0; d < len; d++, day++) {
                const c = cnt[day];
                ck.push(s('rect', { x: 18 + d * 16, y: 3 + m * 12, width: 14, height: 10, rx: 2, fill: c >= 2 ? 'var(--false)' : c === 1 ? 'var(--accent)' : 'var(--paper)', stroke: c ? 'none' : 'var(--rule)', 'stroke-width': 0.8 }));
                // a shared day also carries its head count, so the match does not depend on color alone
                if (c >= 2) ck.push(s('text', { x: 18 + d * 16 + 7, y: 3 + m * 12 + 8, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: 'var(--sheet)', text: String(c) }));
              }
            });
            rc(cal, ...ck);
            rc(stats,
              h('tr', h('td', { html: 'Pairs of people, \\(\\binom{n}{2}\\)' }), h('td', big(pairs))),
              h('tr', h('td', 'P(nobody shares a birthday)'), h('td', (1 - pS).toFixed(4))),
              h('tr', h('td', h('b', 'P(at least two share)')), h('td', h('b', `${(pS).toFixed(4)} = ${pct(pS)}`))),
              h('tr', h('td', 'P(someone shares YOUR birthday)'), h('td', `${pY.toFixed(4)} = ${pct(pY)}`)));
            ctx.tex(stats);
            const factors = n <= 4 ? Array.from({ length: n }, (_, i) => `\\frac{${365 - i}}{365}`).join('\\cdot') : String.raw`\frac{365}{365}\cdot\frac{364}{365}\cdots\frac{${366 - n}}{365}`;
            formula.innerHTML = String.raw`\(P(\text{no match}) = ${factors} = ${(1 - pS).toFixed(4)}\). ` + (pairs === 1 ? 'Two people form just one pair, so there is only one chance for a match.' : String.raw`The ${big(pairs)} pairs are why the chance grows so fast: each pair is one more chance for a match, and pairs grow like \(n^2/2\).`);
            ctx.tex(formula);
            const dupDays = cnt.map((c, d) => [c, d]).filter(([c]) => c >= 2);
            const nameDay = (d) => { let m = 0; while (d >= MONTHS[m]) { d -= MONTHS[m]; m++; } return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]} ${d + 1}`; };
            roomMsg.innerHTML = dupDays.length
              ? `<b class="bad">This room has a match</b> on ${dupDays.slice(0, 3).map(([c, d]) => `${nameDay(d)} (${c} people)`).join(', ')}${dupDays.length > 3 ? ` and ${dupDays.length - 3} more day${dupDays.length > 4 ? 's' : ''}` : ''}. Shared days are the numbered squares.`
              : '<b>This room has no shared birthday.</b> Press "New random room" a few times and count how often a numbered square appears.';
            simMsg.innerHTML = sim == null ? '' : `<b>Simulation:</b> ${big(sim)} of 2,000 random rooms of ${n} had a match, a relative frequency of <b>${pct(sim / 2000)}</b>. The formula says <b>${pct(pS)}</b>.`;
          }
          newRoom();
          runSim();
          draw();
        },
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Conditional probability and independence',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">The <span class="term">conditional probability</span> of \(A\) given \(B\) is
                \[P(A \mid B) = \frac{P(A \cap B)}{P(B)}, \qquad P(B) \gt 0.\]
                Knowing that \(B\) happened shrinks the sample space to \(B\). Only the part of \(A\) inside \(B\) still counts.</div>
              <div class="ex">Two dice are rolled and you learn the sum is 8. What is the chance of doubles? \(B = \{(2,6),(3,5),(4,4),(5,3),(6,2)\}\) and only \((4,4)\) is doubles, so \(P(\text{doubles} \mid \text{sum } 8) = 1/5\). Without the information, \(P(\text{doubles}) = 6/36 = 1/6\).</div>
              <div class="thm">Multiplication rule: \(P(A \cap B) = P(A) \cdot P(B \mid A)\).<br>Draw two cards without putting the first back. \(P(\text{both aces}) = \frac{4}{52} \cdot \frac{3}{51} = \frac{1}{221}\). The second factor is conditional, because one ace is already gone.</div>
            </div>
            <div class="stack">
              <div class="def">\(A\) and \(B\) are <span class="term" data-term="independent events">independent</span> when \(P(A \cap B) = P(A) \cdot P(B)\), or equivalently \(P(A \mid B) = P(A)\). Learning that \(B\) happened tells you nothing about \(A\). Separate coin flips are independent. Cards drawn without replacement are not.</div>
              <div class="warn">Independent and mutually exclusive are different ideas. Mutually exclusive events with positive probabilities are always <i>dependent</i>: if one happens, the other's probability drops to 0. "First die shows 1" and "first die shows 2" are mutually exclusive. "First die shows 1" and "second die shows 2" are independent.</div>
              <div class="ai">A language model generates text one token at a time using conditional probabilities: \(P(\text{next token} \mid \text{all tokens so far})\). The probability of a whole sentence is the multiplication rule applied again and again: \(P(w_1) \cdot P(w_2 \mid w_1) \cdot P(w_3 \mid w_1, w_2) \cdots\)</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: "Bayes' theorem and the base-rate fallacy",
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="thm"><span class="term">Bayes' theorem</span>
                \[P(A \mid B) = \frac{P(B \mid A)\, P(A)}{P(B)}, \quad P(B) = P(B \mid A)P(A) + P(B \mid A')P(A')\]</div>
              <p class="small">Why it is true: the multiplication rule gives \(P(A \cap B)\) two ways, as \(P(A)P(B \mid A)\) and as \(P(B)P(A \mid B)\). Set them equal and divide by \(P(B)\). The bottom line adds the two ways \(B\) can happen, with \(A\) or without it.</p>
              <div class="ex">A disease affects 1% of people (the <span class="term">base rate</span>). A test catches 90% of sick people (its <span class="term">sensitivity</span>) and clears 90% of healthy people (its <span class="term">specificity</span>). You test positive.
                \[P(D \mid +) = \frac{0.90 \times 0.01}{0.90 \times 0.01 + 0.10 \times 0.99} = \frac{0.009}{0.108} \approx 8.3\%\]</div>
            </div>
            <div class="stack">
              <div class="warn">Most people guess 90%. That mixes up \(P(+ \mid D)\), which is 90%, with \(P(D \mid +)\), which is what the patient wants to know. Ignoring how rare the disease is has a name: the <b>base-rate fallacy</b>.</div>
              <p>Natural frequencies make it obvious. Picture 1,000 people. 10 are sick, and 9 of them test positive. 990 are healthy, and 10% of them, 99 people, also test positive. Each of those 99 is a <span class="term">false positive</span>. Of the 108 positive tests, only 9 belong to sick people: \(9/108 \approx 8.3\%\). The healthy group is so large that its small error rate swamps the true cases. The next lab lets you draw these 1,000 people.</p>
              <div class="ai">Every classifier faces this. A fraud model with 99% sensitivity still raises mostly false alarms when fraud is rare. <b>Precision</b> is \(P(\text{really positive} \mid \text{flagged})\) and <b>recall</b> is \(P(\text{flagged} \mid \text{really positive})\). Bayes' theorem connects them through the base rate, so always ask how common the positive class is.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Lab: Bayes with 1,000 dots',
        kind: 'lab',
        html: String.raw`<p class="muted small">Each dot is one of 1,000 people (or e-mails). Move the sliders and watch the positive results regroup. Everyone who tests positive sits at the top of the grid, so you can count how many of them really have the condition.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const MED = { cond: 'sick', none: 'healthy', pos: 'positive', neg: 'negative', who: 'people', cap: 'People who are sick' };
          const PRESETS = [
            { name: 'Medical test', sick: 10, sens: 90, spec: 90, w: MED },
            { name: 'Rare disease, great test', sick: 1, sens: 99, spec: 99, w: MED },
            { name: 'Common condition', sick: 300, sens: 90, spec: 90, w: MED },
            { name: 'Spam filter', sick: 450, sens: 95, spec: 98, w: { cond: 'spam', none: 'legitimate', pos: 'flagged', neg: 'not flagged', who: 'e-mails', cap: 'E-mails that are spam' } },
          ];
          let st = { ...PRESETS[0] }, cur = 0;
          const svg = s('svg', { viewBox: '0 0 484 304', class: 'pb-svg', role: 'img', 'aria-label': '1,000 dots colored by condition and test result' });
          const dots = [];
          for (let i = 0; i < 1000; i++) { const c = s('circle', { cx: 8 + (i % 40) * 12, cy: 8 + Math.floor(i / 40) * 12, r: 4.4, fill: 'var(--rule)' }); dots.push(c); svg.append(c); }
          const legend = h('div.pb-legend');
          const presetRow = h('div.row', { style: { gap: '0.3rem' } });
          const mk = (min, max, step, on, label) => h('input', { type: 'range', min, max, step, 'aria-label': label, oninput: (e) => { on(+e.target.value); cur = -1; draw(); } });
          const sBase = mk(1, 500, 1, (v) => { st.sick = v; }, 'Base rate');
          const sSens = mk(50, 100, 0.5, (v) => { st.sens = v; }, 'Sensitivity');
          const sSpec = mk(50, 100, 0.5, (v) => { st.spec = v; }, 'Specificity');
          const lBase = h('span'), lSens = h('span'), lSpec = h('span'), vBase = h('b'), vSens = h('b'), vSpec = h('b');
          const table = h('div');
          const result = h('div.small.stack', { style: { gap: '0.3rem' } });
          body.append(h('div.split-wide.fill', { style: { minHeight: 0, alignItems: 'start' } },
            h('div.stack', { style: { gap: '0.4rem' } }, svg, legend),
            h('div.stack', { style: { gap: '0.45rem' } }, presetRow,
              h('label.pb-slider', lBase, vBase, sBase),
              h('label.pb-slider', lSens, vSens, sSens),
              h('label.pb-slider', lSpec, vSpec, sSpec),
              table, result)));
          function syncSliders() { sBase.value = st.sick; sSens.value = st.sens; sSpec.value = st.spec; }
          function draw() {
            const w = st.w;
            rc(presetRow, ...PRESETS.map((p, i) => h('button.btn.sm', { class: i === cur ? 'on' : '', 'aria-pressed': String(i === cur), onclick: () => { cur = i; st = { ...p }; syncSliders(); draw(); } }, p.name)));
            const sick = st.sick, healthy = 1000 - sick;
            const TP = Math.round((sick * st.sens) / 100), FN = sick - TP;
            const FP = Math.round((healthy * (100 - st.spec)) / 100), TN = healthy - FP;
            lBase.textContent = `Base rate: ${w.cond} out of 1,000`;
            vBase.textContent = `${sick} (${pct(sick / 1000, 1)})`;
            lSens.textContent = `Sensitivity: P(${w.pos} | ${w.cond})`;
            vSens.textContent = `${st.sens}%`;
            lSpec.textContent = `Specificity: P(${w.neg} | ${w.none})`;
            vSpec.textContent = `${st.spec}%`;
            const order = [];
            for (let i = 0; i < TP; i++) order.push(0);
            for (let i = 0; i < FP; i++) order.push(1);
            for (let i = 0; i < FN; i++) order.push(2);
            for (let i = 0; i < TN; i++) order.push(3);
            const STY = [
              { fill: 'var(--false)', stroke: 'var(--false)' },
              { fill: 'var(--warn)', stroke: 'var(--warn)' },
              { fill: 'var(--sheet)', stroke: 'var(--false)' },
              { fill: 'var(--rule)', stroke: 'none' },
            ];
            dots.forEach((d, i) => { const k = STY[order[i]]; d.setAttribute('fill', k.fill); d.setAttribute('stroke', k.stroke); d.setAttribute('stroke-width', order[i] === 2 ? 1.6 : 1); });
            rc(legend,
              h('span', h('i', { style: { background: 'var(--false)' } }), `${w.cond}, ${w.pos} (${TP})`),
              h('span', h('i', { style: { background: 'var(--warn)' } }), `${w.none}, ${w.pos}: false positive (${FP})`),
              h('span', h('i', { style: { background: 'var(--sheet)', borderColor: 'var(--false)' } }), `${w.cond}, ${w.neg}: missed (${FN})`),
              h('span', h('i', { style: { background: 'var(--rule)' } }), `${w.none}, ${w.neg} (${TN})`));
            table.innerHTML = `<table class="pb-mini"><thead><tr><th class="l"></th><th>${w.pos}</th><th>${w.neg}</th><th>total</th></tr></thead><tbody>
              <tr><td class="l">${w.cond}</td><td><b>${TP}</b></td><td>${FN}</td><td>${sick}</td></tr>
              <tr><td class="l">${w.none}</td><td><b>${FP}</b></td><td>${TN}</td><td>${healthy}</td></tr>
              <tr><td class="l">total</td><td><b>${TP + FP}</b></td><td>${FN + TN}</td><td>1000</td></tr></tbody></table>`;
            const pBase = sick / 1000, se = st.sens / 100, sp = st.spec / 100;
            const formula = (se * pBase) / (se * pBase + (1 - sp) * (1 - pBase));
            const counted = TP + FP ? TP / (TP + FP) : NaN;
            result.innerHTML = String.raw`<div>Of the ${TP + FP} ${w.who} that are ${w.pos}, ${TP} ${TP === 1 ? 'is' : 'are'} ${w.cond} and ${FP} ${FP === 1 ? 'is' : 'are'} ${w.none}.</div>
              <div><b>By counting:</b> \(P(\text{${w.cond}} \mid \text{${w.pos}}) = \dfrac{${TP}}{${TP} + ${FP}} = ${TP + FP ? pct(counted).replace('%', '\\%') : '\\text{undefined}'}\)</div>
              <div><b>By Bayes:</b> \(\dfrac{${num(se, 3)} \times ${num(pBase, 3)}}{${num(se, 3)} \times ${num(pBase, 3)} + ${num(1 - sp, 3)} \times ${num(1 - pBase, 3)}} = ${pct(formula).replace('%', '\\%')}\)</div>
              <div class="muted">${Math.abs(counted - formula) > 0.0015 && TP + FP ? 'The two differ slightly because counting rounds to whole dots. ' : ''}Precision is ${TP + FP ? pct(counted) : 'undefined'}; recall (sensitivity) is ${st.sens}%. Raise the base rate and watch precision climb with the same test.</div>`;
            ctx.tex(result);
          }
          syncSliders();
          draw();
        },
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: the Monty Hall problem',
        kind: 'lab',
        html: String.raw`<p class="muted small">A game show has three doors: one hides a car, two hide goats. You pick a door. The host, who knows where the car is, always opens a different door with a goat behind it, then offers you a switch. Should you switch? Play a few rounds, then let the simulator play thousands.</p>`,
        render(body, ctx) {
          const { h, s, rc, R } = ctx;
          const rint = (k) => Math.floor(R.random() * k);
          let car, pick, opened, phase, finalDoor, outcome;
          const tally = { stay: { w: 0, n: 0 }, switch: { w: 0, n: 0 } };
          const doors = [0, 1, 2].map((i) => h('button.pb-door', { onclick: () => clickDoor(i), 'aria-label': `Door ${i + 1}` }));
          const msg = h('div.feedback.info', { 'aria-live': 'polite' });
          const stayBtn = h('button.btn', { onclick: () => decide('stay') }, 'Stay with my door');
          const switchBtn = h('button.btn.primary', { onclick: () => decide('switch') }, 'Switch doors');
          const againBtn = h('button.btn', { onclick: () => newGame() }, 'New game');
          const tallyEl = h('table.pb-mini');
          let N = 3, sim = null;
          const nSeg = h('div.seg', { role: 'group', 'aria-label': 'Number of doors in the simulation' });
          const chart = s('svg', { viewBox: '0 0 520 190', class: 'pb-svg', role: 'img', 'aria-label': 'Running win rates for staying and switching' });
          const simMsg = h('div.small');
          const why = h('div.thm.small', { 'data-label': 'Why switching wins' });
          body.append(h('div.split.fill', { style: { minHeight: 0, alignItems: 'start' } },
            h('div.stack', { style: { gap: '0.5rem' } },
              h('div.pb-doors', doors), msg,
              h('div.row', { style: { gap: '0.4rem' } }, stayBtn, switchBtn, againBtn),
              h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.2rem' } }, 'YOUR GAMES'), tallyEl),
              h('div', h('div.tiny.mono.muted', { style: { marginBottom: '0.2rem' } }, 'THE THREE EQUALLY LIKELY STARTS'),
                h('table.pb-mini', { html: '<thead><tr><th class="l">Your first pick hides</th><th>Host opens</th><th>Staying gets</th><th>Switching gets</th></tr></thead><tbody><tr><td class="l">the car (1/3)</td><td>either goat</td><td class="ok">car</td><td>goat</td></tr><tr><td class="l">goat 1 (1/3)</td><td>goat 2</td><td>goat</td><td class="ok">car</td></tr><tr><td class="l">goat 2 (1/3)</td><td>goat 1</td><td>goat</td><td class="ok">car</td></tr></tbody>' }))),
            h('div.stack', { style: { gap: '0.45rem' } },
              h('div.row', { style: { gap: '0.4rem' } }, h('span.small.muted', 'Simulator doors:'), nSeg, h('button.btn.sm.primary', { onclick: () => { runSim(); drawSim(); } }, 'Run 1,000 new rounds')),
              chart, simMsg, why)));

          function newGame() { car = rint(3); pick = null; opened = null; finalDoor = null; outcome = null; phase = 'pick'; drawGame(); }
          function clickDoor(i) {
            if (phase === 'pick') {
              pick = i;
              const goats = [0, 1, 2].filter((d) => d !== pick && d !== car);
              opened = goats[rint(goats.length)];
              phase = 'decide';
              drawGame();
            } else if (phase === 'decide' && i !== opened) decide(i === pick ? 'stay' : 'switch');
          }
          function decide(strat) {
            if (phase !== 'decide') return;
            finalDoor = strat === 'stay' ? pick : 3 - pick - opened;
            const win = finalDoor === car;
            tally[strat].n++;
            if (win) tally[strat].w++;
            outcome = { strat, win };
            phase = 'done';
            drawGame();
          }
          function drawGame() {
            doors.forEach((d, i) => {
              const isOpen = i === opened || phase === 'done';
              d.className = 'pb-door' + (isOpen ? ' open' : '') + (isOpen && i === car ? ' car' : '') + (i === pick ? ' picked' : '') + (i === finalDoor ? ' final' : '');
              d.disabled = phase === 'done' || (phase === 'decide' && i === opened);
              rc(d, h('span.pb-door-n', `Door ${i + 1}`), h('span.pb-door-prize', isOpen ? (i === car ? 'Car' : 'Goat') : '?'),
                h('span.pb-door-tag', i === finalDoor ? 'Final choice' : i === pick ? 'Your pick' : i === opened ? 'Host opened' : ''));
            });
            stayBtn.disabled = switchBtn.disabled = phase !== 'decide';
            againBtn.classList.toggle('primary', phase === 'done');
            if (phase === 'pick') msg.innerHTML = 'Pick a door. Behind one is a car; behind the other two are goats.';
            else if (phase === 'decide') msg.innerHTML = `You picked Door ${pick + 1}. The host opens Door ${opened + 1} and shows a goat. Stay with Door ${pick + 1}, or switch to Door ${3 - pick - opened + 1}?`;
            else msg.innerHTML = `You ${outcome.strat === 'stay' ? 'stayed with' : 'switched to'} Door ${finalDoor + 1} and <b>${outcome.win ? 'won the car' : 'got a goat'}</b>. The car was behind Door ${car + 1}.`;
            msg.className = 'feedback ' + (phase === 'done' ? (outcome.win ? 'good' : 'bad') : 'info');
            const row = (name, t) => `<tr><td class="l">${name}</td><td>${t.n}</td><td>${t.w}</td><td>${t.n ? pct(t.w / t.n, 0) : '–'}</td></tr>`;
            tallyEl.innerHTML = `<thead><tr><th class="l">Strategy</th><th>Played</th><th>Won</th><th>Win rate</th></tr></thead><tbody>${row('Stay', tally.stay)}${row('Switch', tally.switch)}</tbody>`;
          }
          function runSim() {
            const stay = [], sw = [];
            let ws = 0, ww = 0;
            for (let r = 1; r <= 1000; r++) {
              const c = rint(N), p = rint(N);
              // the host opens every other door except one; that one hides the car unless your pick already does
              let other = c;
              if (p === c) { other = rint(N - 1); if (other >= p) other++; }
              if (p === c) ws++;
              if (other === c) ww++;
              stay.push(ws / r);
              sw.push(ww / r);
            }
            sim = { stay, sw, ws, ww };
          }
          function drawSim() {
            rc(nSeg, ...[3, 10, 100].map((k) => h('button', { 'aria-pressed': String(k === N), onclick: () => { N = k; runSim(); drawSim(); } }, String(k))));
            const X0 = 40, X1 = 508, Y0 = 10, Y1 = 162;
            const xOf = (r) => X0 + ((r - 1) / 999) * (X1 - X0), yOf = (v) => Y1 - v * (Y1 - Y0);
            const kids = [s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: 'var(--sheet)', stroke: 'var(--rule)' })];
            [0, 0.5, 1].forEach((v) => kids.push(s('text', { x: X0 - 5, y: yOf(v) + 4, 'text-anchor': 'end', text: `${v * 100}%` })));
            [1, 250, 500, 750, 1000].forEach((r) => kids.push(s('text', { x: xOf(r), y: Y1 + 14, 'text-anchor': r === 1 ? 'start' : r === 1000 ? 'end' : 'middle', text: big(r) })));
            kids.push(s('text', { x: (X0 + X1) / 2, y: 188, 'text-anchor': 'middle', fill: 'var(--ink-3)', text: 'rounds played' }));
            [1 / N, (N - 1) / N].forEach((v) => kids.push(s('line', { x1: X0, y1: yOf(v), x2: X1, y2: yOf(v), stroke: 'var(--ink-3)', 'stroke-dasharray': '5 4' })));
            const path = (arr) => arr.map((v, i) => (i % 2 && i !== 999 ? '' : `${i ? 'L' : 'M'}${xOf(i + 1).toFixed(1)} ${yOf(v).toFixed(1)}`)).join('');
            kids.push(s('path', { d: path(sim.stay), fill: 'none', stroke: 'var(--num)', 'stroke-width': 2 }));
            kids.push(s('path', { d: path(sim.sw), fill: 'none', stroke: 'var(--true)', 'stroke-width': 2 }));
            kids.push(s('text', { x: X1 - 4, y: yOf(sim.sw[999]) + (sim.sw[999] > 0.93 ? 16 : -7), 'text-anchor': 'end', fill: 'var(--true)', 'font-weight': 700, text: `switch ${pct(sim.sw[999])}` }));
            kids.push(s('text', { x: X1 - 4, y: yOf(sim.stay[999]) + (sim.stay[999] < 0.07 ? -7 : 16), 'text-anchor': 'end', fill: 'var(--num)', 'font-weight': 700, text: `stay ${pct(sim.stay[999])}` }));
            rc(chart, ...kids);
            simMsg.innerHTML = `Over 1,000 rounds with ${N} doors, staying won <b>${big(sim.ws)}</b> times and switching won <b>${big(sim.ww)}</b> times. Theory says \\(${fr(1, N)}\\) and \\(${fr(N - 1, N)}\\) (the dashed lines).`;
            ctx.tex(simMsg);
            why.innerHTML = `Your first pick is right with probability \\(${fr(1, N)}\\). The host never reveals the car, so whenever your first pick is wrong (probability \\(${fr(N - 1, N)}\\)), the one other closed door must hide it. Switching wins exactly when your first pick was wrong. The host's choice is evidence, because the host never opens a door at random.`;
            ctx.tex(why);
          }
          newGame();
          runSim();
          drawSim();
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Random variables, expected value and variance',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">random variable</span> \(X\) assigns a number to every outcome. Its distribution lists \(P(X = x)\) for each value. Let \(X\) = the number of heads in 3 coin flips:
                <table class="pb-dist"><tr><th>\(x\)</th><td>0</td><td>1</td><td>2</td><td>3</td></tr><tr><th>\(P(X = x)\)</th><td>1/8</td><td>3/8</td><td>3/8</td><td>1/8</td></tr></table></div>
              <div class="def">The <span class="term">expected value</span> is the probability-weighted average
                \[E[X] = \sum_x x \cdot P(X = x) = 0 \cdot \tfrac18 + 1 \cdot \tfrac38 + 2 \cdot \tfrac38 + 3 \cdot \tfrac18 = 1.5\]
                No single game gives 1.5 heads. It is the long-run average over many repetitions.</div>
              <div class="ex">Pay $1 to roll a die and win $5 if it shows 6. Your net gain is $4 with probability 1/6 and −$1 with probability 5/6. \(E = 4 \cdot \frac16 - 1 \cdot \frac56 = -\frac16\). You lose about 17 cents per game on average, which is how casinos stay in business.</div>
            </div>
            <div class="stack">
              <div class="thm"><span class="term">Linearity of expectation</span>: \(E[X + Y] = E[X] + E[Y]\) and \(E[aX + b] = aE[X] + b\), always, even when \(X\) and \(Y\) are dependent. The expected sum of two dice is \(3.5 + 3.5 = 7\) with no table of 36 outcomes. The expected number of successes in \(n\) trials with chance \(p\) is \(np\).</div>
              <div class="def"><span class="term">Variance</span> measures spread: \(\operatorname{Var}(X) = E[(X - \mu)^2] = E[X^2] - \mu^2\), where \(\mu = E[X]\). The standard deviation is \(\sigma = \sqrt{\operatorname{Var}(X)}\). For the 3 flips, \(E[X^2] = 3\), so \(\operatorname{Var}(X) = 3 - 1.5^2 = 0.75\) and \(\sigma \approx 0.87\).</div>
              <div class="ai">Training a model means minimizing its <i>expected loss</i>, estimated by the average loss over the training data. A reinforcement-learning agent picks the action with the highest expected reward. Variance matters too: two models with the same average accuracy can differ a lot in how much their results swing from run to run.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: the binomial distribution',
        kind: 'lab',
        html: String.raw`<p class="muted small">Repeat a yes/no trial \(n\) times, independently, with success probability \(p\) each time. The number of successes \(X\) follows the <span class="term">binomial distribution</span>, \(X \sim \text{Bin}(n, p)\), with \(P(X = k) = \binom{n}{k} p^k (1-p)^{n-k}\). Drag the sliders, or click a bar to see its calculation.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          let n = 10, p = 0.3, k = 3, cur = -1;
          const PRESETS = [
            ['10 fair coin flips', 10, 0.5, 5],
            ['20 free throws at 70%', 20, 0.7, 14],
            ['40 chips, 5% defective', 40, 0.05, 0],
            ['30 questions, model 80% accurate', 30, 0.8, 24],
          ];
          const svg = s('svg', { viewBox: '0 0 560 262', class: 'pb-svg', role: 'img', 'aria-label': 'Bar chart of the binomial distribution' });
          const presetRow = h('div.row', { style: { gap: '0.3rem' } });
          const nIn = h('input', { type: 'range', min: 1, max: 40, step: 1, value: n, 'aria-label': 'Number of trials n', oninput: (e) => { n = +e.target.value; k = Math.min(k, n); cur = -1; draw(); } });
          const pIn = h('input', { type: 'range', min: 0, max: 100, step: 1, value: p * 100, 'aria-label': 'Success probability p', oninput: (e) => { p = +e.target.value / 100; cur = -1; draw(); } });
          const kIn = h('input', { type: 'range', min: 0, max: n, step: 1, value: k, 'aria-label': 'Number of successes k', oninput: (e) => { k = +e.target.value; draw(); } });
          const nOut = h('b'), pOut = h('b'), kOut = h('b');
          const calc = h('div.small.stack', { style: { gap: '0.3rem' } });
          body.append(h('div.split-wide.fill', { style: { minHeight: 0, alignItems: 'start' } },
            h('div.stack', { style: { gap: '0.4rem' } }, svg,
              h('div.legend', h('span', h('span.swatch', { style: { background: 'var(--accent)' } }), 'selected k'), h('span', h('span.swatch', { style: { background: 'var(--accent-2)', outline: '1px solid var(--rule)' } }), 'within one σ of the mean'), h('span', '- - - mean μ = np'))),
            h('div.stack', { style: { gap: '0.45rem' } }, presetRow,
              h('label.pb-slider', h('span', 'Trials n'), nOut, nIn),
              h('label.pb-slider', h('span', 'Success probability p'), pOut, pIn),
              h('label.pb-slider', h('span', 'Successes k'), kOut, kIn),
              calc,
              h('div.ai', { html: '<b>A/B testing.</b> A model that answers each of 30 test questions correctly with probability 0.8 has a score that follows Bin(30, 0.8). It lands anywhere from 21 to 27 about 89% of the time, by luck alone. A new model is only better if it beats this natural spread.' }))));
          function draw() {
            rc(presetRow, ...PRESETS.map(([name, pn, pp, pk], i) => h('button.btn.sm', { class: i === cur ? 'on' : '', 'aria-pressed': String(i === cur), onclick: () => { cur = i; n = pn; p = pp; k = pk; nIn.value = n; pIn.value = Math.round(p * 100); draw(); } }, name)));
            kIn.max = n; kIn.value = k;
            nOut.textContent = String(n); pOut.textContent = p.toFixed(2); kOut.textContent = String(k);
            const probs = Array.from({ length: n + 1 }, (_, j) => pmf(n, p, j));
            const mu = n * p, sd = Math.sqrt(n * p * (1 - p));
            const X0 = 46, X1 = 552, Y0 = 14, Y1 = 230, bw = (X1 - X0) / (n + 1);
            const ymax = Math.max(0.05, ...probs) * 1.12;
            const xOf = (v) => X0 + (v + 0.5) * bw, yOf = (v) => Y1 - (v / ymax) * (Y1 - Y0);
            const kids = [s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: 'var(--sheet)', stroke: 'var(--rule)' })];
            const bl = Math.max(X0, xOf(mu - sd)), br = Math.min(X1, xOf(mu + sd));
            if (br > bl) kids.push(s('rect', { x: bl, y: Y0, width: br - bl, height: Y1 - Y0, fill: 'var(--accent-2)' }));
            [0, ymax / 2, ymax].forEach((v) => { kids.push(s('text', { x: X0 - 5, y: yOf(v) + 4, 'text-anchor': 'end', text: v.toFixed(2) })); if (v) kids.push(s('line', { x1: X0, y1: yOf(v), x2: X1, y2: yOf(v), stroke: 'var(--rule)', 'stroke-width': 0.8 })); });
            const every = n <= 20 ? 1 : 5;
            probs.forEach((q, j) => {
              const r = s('rect', { x: xOf(j) - bw * 0.38, y: yOf(q), width: bw * 0.76, height: Math.max(0, Y1 - yOf(q)), rx: 1.5, fill: j === k ? 'var(--accent)' : 'var(--fnc)', opacity: j === k ? 1 : 0.5, style: 'cursor:pointer' });
              r.addEventListener('click', () => { k = j; draw(); });
              r.append(s('title', { text: `P(X = ${j}) = ${p4(q)}` }));
              kids.push(r);
              if (j % every === 0 || j === k) kids.push(s('text', { x: xOf(j), y: Y1 + 14, 'text-anchor': 'middle', 'font-weight': j === k ? 700 : 400, fill: j === k ? 'var(--ink)' : 'var(--ink-2)', text: String(j) }));
            });
            kids.push(s('text', { x: X1 - 8, y: Y0 + 16, 'text-anchor': 'end', fill: 'var(--ink)', 'font-weight': 700, 'font-size': 13, text: `P(X = ${k}) = ${p4(probs[k])}` }));
            kids.push(s('line', { x1: xOf(mu), y1: Y0, x2: xOf(mu), y2: Y1, stroke: 'var(--ink)', 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }));
            kids.push(s('text', { x: (X0 + X1) / 2, y: 258, 'text-anchor': 'middle', fill: 'var(--ink-3)', text: 'k = number of successes' }));
            rc(svg, ...kids);
            const le = probs.slice(0, k + 1).reduce((a, b) => a + b, 0), ge = probs.slice(k).reduce((a, b) => a + b, 0);
            calc.innerHTML = String.raw`<div>\(P(X = ${k}) = \binom{${n}}{${k}} (${num(p, 2)})^{${k}} (${num(1 - p, 2)})^{${n - k}}\)<br>\(\phantom{P(X = ${k})} = ${bigT(M.C(n, k))} \times ${sciT(p ** k)} \times ${sciT((1 - p) ** (n - k))} = \mathbf{${p4T(probs[k])}}\)</div>
              <div class="muted">\(\binom{${n}}{${k}} = ${bigT(M.C(n, k))}\) counts the ways to choose which ${k} of the ${n} trials succeed. Each such sequence has probability \(p^{${k}}(1-p)^{${n - k}}\), and the sequences are mutually exclusive, so their probabilities add.</div>
              <div>\(P(X \le ${k}) = ${p4T(le)}\), \(\;P(X \ge ${k}) = ${p4T(ge)}\)</div>
              <div>Mean \(\mu = np = ${num(mu, 2)}\), variance \(np(1-p) = ${num(n * p * (1 - p), 3)}\), \(\sigma = ${sd.toFixed(3)}\)</div>`;
            ctx.tex(calc);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: exact and simulated probability',
        kind: 'code',
        file: 'two_dice.py',
        html: String.raw`<p class="muted small">Two ways to find \(P(\text{sum} = 7)\) for two dice. First count the 36 outcomes exactly, then run a seeded <span class="term">Monte Carlo simulation</span> with more and more rolls and watch it approach the exact answer.</p>`,
        fivew: {
          what: 'Computes P(sum of two dice = 7) exactly by counting outcomes with fractions, then estimates the same probability by simulating 60, 6,000 and 600,000 rolls.',
          why: 'The exact answer checks the simulation, and the simulation checks the counting. Seeing the estimates close in on 1/6 is the law of large numbers in three lines of output.',
          who: 'Data scientists estimating risks that have no neat formula, game designers balancing odds, and engineers testing randomized algorithms.',
          where: 'Monte Carlo methods price financial options, estimate how often a network fails, model particle physics, and evaluate the uncertainty of machine-learning models.',
          when: 'Count exactly when the sample space is small and the outcomes are equally likely. Simulate when the space is too big or messy to count, and keep the seed so the run is repeatable.',
        },
        lines: [
          ['import random', 'Loads Python\'s built-in <code>random</code> module. It produces <i>pseudo-random</i> numbers: a fixed formula generates numbers that look random. Line 10 uses that fact to make every run identical.'],
          ['from fractions import Fraction', '<code>Fraction</code> stores an exact ratio of two integers, such as 1/6, with no rounding. A float can only store 1/6 approximately, as 0.16666666666666666.'],
          ['from operator import add', '<code>add(x, y)</code> is the function version of <code>x + y</code>. Line 14 hands it to <code>map</code>, which lets Python add two long lists in fast built-in code.'],
          ['ways = {}', 'An empty dictionary that will map each possible sum (2 to 12) to the number of ordered pairs that produce it. This is the counting half of \\(P(E) = |E|/|S|\\).'],
          ['for a in range(1, 7):', 'Loops over the first die\'s faces. <code>range(1, 7)</code> produces 1, 2, 3, 4, 5, 6, because the stop value 7 is excluded.'],
          ['    for b in range(1, 7):', 'A nested loop over the second die. Together the two loops visit all 36 pairs of the sample space \\(\\{1,\\dots,6\\} \\times \\{1,\\dots,6\\}\\). In Trace mode you can watch <code>a</code> and <code>b</code> tick through every pair.'],
          ['        ways[a + b] = ways.get(a + b, 0) + 1', '<code>ways.get(a + b, 0)</code> returns the count so far for this sum, or 0 the first time the sum appears. Adding 1 records one more pair. When the loops finish, <code>ways[7]</code> is 6 and <code>ways[2]</code> is 1.'],
          ['exact = Fraction(ways[7], 36)', 'Builds the exact probability \\(|E|/|S| = 6/36\\). <code>Fraction</code> reduces it automatically, so <code>exact</code> holds 1/6.'],
          ['print("exact:", exact, "≈", round(float(exact), 4))', 'Prints the fraction and its decimal value. <code>float(exact)</code> converts 1/6 to a float, and <code>round(..., 4)</code> keeps four decimal places. Output: <code>exact: 1/6 ≈ 0.1667</code>. This is the target the simulation should approach.'],
          ['random.seed(159)', 'Sets the starting point of the random number generator. The same seed always produces the same sequence of rolls, so this program prints identical numbers every time and anyone can reproduce your result. Delete this line and the simulated numbers change on every run.'],
          ['for n in [60, 6000, 600000]:', 'Repeats the whole experiment three times, with 100 times more rolls each time: 60, then 6,000, then 600,000 rolls of the pair of dice.'],
          ['    die1 = random.choices(range(1, 7), k=n)', '<code>random.choices</code> picks <code>k</code> items <i>with replacement</i>, so a face can come up again and again, exactly like a real die. <code>die1</code> is a list of <code>n</code> first-die results.'],
          ['    die2 = random.choices(range(1, 7), k=n)', 'A second, independent list for the second die. Pairing <code>die1[i]</code> with <code>die2[i]</code> gives roll number <code>i</code>.'],
          ['    sevens = list(map(add, die1, die2)).count(7)', '<code>map(add, die1, die2)</code> adds the lists position by position: <code>die1[0] + die2[0]</code>, <code>die1[1] + die2[1]</code>, and so on. <code>list(...)</code> collects the sums, and <code>.count(7)</code> counts how many equal 7.'],
          ['    print(f"{n:>6} rolls: {sevens / n:.4f}")', 'Prints the relative frequency <code>sevens / n</code>. <code>:&gt;6</code> right-aligns <code>n</code> in six characters so the columns line up, and <code>.4f</code> shows four decimals. The estimate moves from 0.2667 at 60 rolls to 0.1707 at 6,000 and 0.1666 at 600,000: the law of large numbers.'],
        ],
        expected: 'exact: 1/6 ≈ 0.1667\n    60 rolls: 0.2667\n  6000 rolls: 0.1707\n600000 rolls: 0.1666\n',
        tryIt: 'Change the seed to <code>7</code> and run twice: the numbers change once, then repeat on the second run. Then count sums of 12 instead of 7, in both the <code>Fraction</code> line and the <code>.count</code> call. A rare event needs far more rolls before its estimate settles.',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Code: a tiny naive Bayes spam filter',
        kind: 'code',
        file: 'naive_bayes.py',
        html: String.raw`<p class="muted small">Bayes' theorem powered the first practical spam filters. This one learns word counts from a few training e-mails, then scores new messages. Switch to <b>Trace</b> to watch the running log score <code>lp</code> change word by word.</p>`,
        fivew: {
          what: 'A naive Bayes classifier. It estimates P(word | spam) and P(word | not spam) from example messages, then uses Bayes\' theorem to compute P(spam | message) for two new messages.',
          why: 'It shows Bayes\' theorem doing real work: the program knows P(words | spam) from data and turns it into the probability you want, P(spam | words). It also shows two numerical tricks every probabilistic model needs, smoothing and logarithms.',
          who: 'E-mail providers, content-moderation teams, and anyone building a quick text classifier. Naive Bayes is still a standard baseline that more complex models must beat.',
          where: 'Spam filters, sentiment analysis, document topic tagging, and medical triage tools. The same "multiply word probabilities" idea sits under classic language models.',
          when: 'Use it when you need a fast, explainable classifier with little training data. It assumes words are independent given the class, which is false, yet it often works surprisingly well.',
        },
        lines: [
          ['from math import log, exp', 'Loads two functions from the <code>math</code> module: <code>log</code>, the natural logarithm, and <code>exp</code>, its inverse (\\(e^x\\)). Importing them by name keeps the later lines short.'],
          ['from collections import Counter', '<code>Counter</code> takes a list and counts how many times each item appears. It also returns 0 for an item it has never seen, which line 11 relies on.'],
          ['spam = Counter("win cash now free cash prize win".split())', 'The words from our spam training e-mails. <code>.split()</code> cuts the text at spaces into 7 words, and <code>Counter</code> tallies them: <code>win</code> 2, <code>cash</code> 2, and <code>now</code>, <code>free</code>, <code>prize</code> 1 each.'],
          ['ham = Counter("lunch at noon meeting now at noon".split())', 'The words from legitimate mail ("ham" is the traditional nickname for non-spam). Also 7 words: <code>at</code> 2, <code>noon</code> 2, and <code>lunch</code>, <code>meeting</code>, <code>now</code> 1 each.'],
          ['V = len(set(spam) | set(ham))', '<code>set(spam)</code> is the distinct spam words, and <code>|</code> takes the union with the ham words (Module 1). The vocabulary has 9 different words, so <code>V</code> is 9. Line 8 needs it for smoothing.'],
          ['', ''],
          ['def log_p(msg, counts, prior):', 'Defines a function that computes \\(\\log\\big(P(\\text{class}) \\cdot \\prod P(\\text{word} \\mid \\text{class})\\big)\\), the top of Bayes\' formula for one class. Treating the words as independent given the class is the "naive" assumption that gives the method its name.'],
          ['    total = sum(counts.values()) + V', 'The class has 7 words, and adding <code>V</code> = 9 gives 16. This is the denominator of the smoothed estimate on line 11, and it makes the 9 word probabilities add up to exactly 1.'],
          ['    lp = log(prior)', 'Starts the running total at \\(\\log P(\\text{class})\\). Logarithms turn a product of many small probabilities into a sum, because \\(\\log(ab) = \\log a + \\log b\\). Sums of logs never underflow to 0.'],
          ['    for word in msg.split():', 'Visits each word of the message to be classified, one at a time.'],
          ['        lp += log((counts[word] + 1) / total)', 'Adds \\(\\log P(\\text{word} \\mid \\text{class})\\). The <b>+1</b> is Laplace smoothing: a word never seen in this class gets probability 1/16 instead of 0, because a single zero would wipe out the whole product. Example: \\(P(\\text{cash} \\mid \\text{spam}) = (2+1)/16\\).'],
          ['    return lp', 'Hands back the finished log score for this class.'],
          ['', ''],
          ['for msg in ["free cash now", "lunch meeting at noon"]:', 'Classifies two new messages that were not in the training data.'],
          ['    gap = log_p(msg, spam, 0.5) - log_p(msg, ham, 0.5)', 'Scores the message under both classes with a prior of 0.5 each (we assume half of all mail is spam) and takes the difference. For "free cash now" the spam product is \\(0.5 \\cdot \\frac{2}{16} \\cdot \\frac{3}{16} \\cdot \\frac{2}{16}\\) and the ham product is \\(0.5 \\cdot \\frac{1}{16} \\cdot \\frac{1}{16} \\cdot \\frac{2}{16}\\), six times smaller.'],
          ['    print(f"{msg!r}: P(spam) = {1 / (1 + exp(-gap)):.3f}")', 'Bayes\' theorem: \\(P(\\text{spam} \\mid \\text{msg}) = \\frac{e^{s}}{e^{s} + e^{h}} = \\frac{1}{1 + e^{-(s - h)}}\\), where \\(s\\) and \\(h\\) are the two log scores and <code>gap</code> is \\(s - h\\). The bottom of the fraction plays the role of \\(P(\\text{msg})\\). Output: 0.857 (that is \\(6/7\\)) and 0.027 (\\(1/37\\)).'],
        ],
        expected: "'free cash now': P(spam) = 0.857\n'lunch meeting at noon': P(spam) = 0.027\n",
        tryIt: 'Classify <code>"free lunch"</code> and predict the result first: one spammy word and one hammy word. Then change the spam prior to <code>0.9</code> and watch every message look more suspicious. That is the base rate at work.',
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: probability in real code',
        kind: 'design',
        html: String.raw`<p class="muted small">Probability bugs rarely crash a program. They quietly produce wrong numbers that look plausible. These habits catch them. Click each principle (or use <kbd>↓</kbd>).</p>`,
        principles: [
          {
            name: 'Seed random generators for reproducible experiments',
            html: '<p>A simulation that gives different numbers every run cannot be debugged, reviewed, or compared fairly with another version. Create a generator with a fixed seed so a run can be repeated exactly. Record the seed with your results, and vary it deliberately when you want to see how much the answer moves.</p><p>Machine-learning papers report seeds for the same reason: model training uses randomness for initial weights and data shuffling.</p>',
            bad: 'import random\nrolls = [random.randint(1, 6) for _ in range(100)]\n# different every run: a bug cannot be replayed',
            good: 'import random\nrng = random.Random(42)          # own seeded generator\nrolls = [rng.randint(1, 6) for _ in range(100)]\n# identical every run, so results can be checked',
          },
          {
            name: 'Use Fraction for exact small probabilities',
            html: '<p>Floats store most fractions approximately, so small errors pile up and equality tests fail. For dice, cards and other small sample spaces, <code>fractions.Fraction</code> keeps answers exact and readable, and an exact result is the best possible test oracle for a simulation.</p>',
            bad: 'p = 0.1 + 0.2\nprint(p)          # 0.30000000000000004\nprint(p == 0.3)   # False',
            good: 'from fractions import Fraction\np = Fraction(1, 6) * 3\nprint(p, p == Fraction(1, 2))   # 1/2 True',
          },
          {
            name: 'Add logarithms instead of multiplying tiny probabilities',
            html: '<p>The smallest positive float is about \\(10^{-308}\\). Multiply 400 word probabilities of 0.001 each and the true answer, \\(10^{-1200}\\), rounds to exactly 0.0. Every class then scores 0 and the comparison is meaningless. Logarithms turn the product into a sum that stays in a safe range, and a larger log still means a larger probability.</p>',
            bad: 'p = 1.0\nfor w in words:          # 400 words\n    p *= prob[w]         # each about 0.001\nprint(p)                 # 0.0  (underflow)',
            good: 'import math\nscore = sum(math.log(prob[w]) for w in words)\n# about -2763: no underflow, still comparable',
          },
          {
            name: 'Never confuse P(A | B) with P(B | A)',
            html: '<p>\\(P(\\text{positive} \\mid \\text{sick})\\) and \\(P(\\text{sick} \\mid \\text{positive})\\) can be 90% and 8%. Code makes this mistake easy when variables have vague names. Put the condition in the name, using "given", so every formula can be read and checked.</p>',
            bad: 'p_test = 0.9          # which way round?\nresult = p_test       # reported as "chance you are sick"',
            good: 'p_pos_given_sick = 0.90     # sensitivity\np_sick = 0.01               # base rate\np_sick_given_pos = bayes(p_pos_given_sick, p_sick, ...)',
          },
          {
            name: 'Check that probabilities add up to 1',
            html: '<p>A distribution over all outcomes must sum to 1, with every value between 0 and 1. Hand-typed tables, rounding, and forgotten cases break this silently. A two-line assertion catches the bug the moment it appears, long before a wrong number reaches a report.</p>',
            bad: 'weather = {"rain": 0.2, "cloud": 0.5, "sun": 0.4}\n# sums to 1.1: every later number is wrong',
            good: 'assert abs(sum(weather.values()) - 1) < 1e-9\nassert all(0 <= p <= 1 for p in weather.values())',
          },
          {
            name: 'Simulate to sanity-check every formula',
            html: '<p>Probability intuition fails often; the birthday problem and Monty Hall fool almost everyone. When you derive a formula, spend five minutes writing a seeded simulation of the same experiment. If the two disagree by more than random noise, one of them has a bug.</p>',
            good: 'rng = random.Random(1)\nrooms = 10_000\nhits = sum(len(set(rng.choices(range(365), k=23))) < 23\n           for _ in range(rooms))\nprint(hits / rooms)    # about 0.507: matches the formula',
          },
          {
            name: 'Account for the base rate when judging a classifier',
            html: '<p>When 1% of transactions are fraud, a model that always answers "legitimate" scores 99% accuracy and catches nothing. Report <b>precision</b> (how many flagged cases are real) and <b>recall</b> (how many real cases get flagged), and state the base rate of the data you tested on. Precision on balanced test data can collapse on real, imbalanced traffic.</p>',
            bad: 'accuracy = correct / total\nprint(f"{accuracy:.0%}")   # 99%, yet useless',
            good: 'precision = tp / (tp + fp)   # flagged cases that are real\nrecall = tp / (tp + fn)      # real cases that get flagged',
          },
          {
            name: 'Choose random.sample or random.choices on purpose',
            html: '<p><code>random.sample</code> draws <i>without</i> replacement: each item at most once, like dealing cards or picking a committee. <code>random.choices</code> draws <i>with</i> replacement: items can repeat, like dice rolls or bootstrapping a dataset. Using the wrong one changes the probabilities and gives subtly wrong results.</p>',
            bad: 'hand = random.choices(deck, k=5)\n# can deal the same card twice',
            good: 'hand = random.sample(deck, k=5)   # 5 different cards\nrolls = random.choices(range(1, 7), k=5)\n# repeats are fine for dice',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: Bayes with 1,000 dots',
        kind: 'example',
        id: 'ex-bayes-dots',
        problem: String.raw`<p>A condition affects 2% of a population. A test catches 95% of the people who have it (its sensitivity) and wrongly flags 5% of the people who do not (its false-positive rate). Out of 1,000 people, your test comes back positive. What is the probability that you actually have the condition? Count it with all 1,000 people drawn as dots.</p>`,
        steps: [
          { phase: 0, note: 'Setup: 1,000 people · 2% have the condition · sensitivity 95% · false-positive rate 5%', caption: 'Counting people first and turning counts into a probability at the end keeps the base rate visible, which is the whole point of this method. All 1,000 dots start neutral, because no group has been marked yet.' },
          { phase: 1, note: 'Have the condition: 20 people · Do not have it: 980 people', caption: 'Mark the people who have the condition: 2% of 1,000 is 20 people. This small group is the base rate, and forgetting how small it is causes the usual far-too-high guess.' },
          { phase: 2, note: 'Sick and test positive: 19 · Sick but missed: 1 · Positive so far: 19', caption: 'Apply the 95% sensitivity to the 20 sick people: 19 test positive and 1 is missed. The dark ring and plus sign mark a positive result, so the test outcome never rests on color alone.' },
          { phase: 3, note: 'Healthy but test positive (false positives): 49 · Total positive: 19 + 49 = 68', caption: 'Now mark the healthy group: 5% sounds small, but 5% of 980 is 49 false positives. That is more than twice the entire group of 20 people who have the condition.' },
          { phase: 4, note: 'Inside the 68 positive results: 19 are true cases and 49 are false positives', caption: 'Dim everyone who tested negative and focus on the 68 positive results only. A positive result puts you inside this group of 68, so the relevant question is now 19 out of 68.' },
          { phase: 5, note: 'Inside the 68 positive results: 19 are true cases and 49 are false positives', answer: true, caption: 'Check by Bayes\' rule with exact fractions: (95/100 × 2/100) / (95/100 × 2/100 + 5/100 × 98/100) = 190/680 = 19/68. The dot count and the formula agree, so a positive result means about a 28% chance.' },
        ],
        answer: '19/68',
        verify(M) {
          const sick = (1000 * 2) / 100;
          const tp = (sick * 95) / 100;
          const healthy = 1000 - sick;
          const fp = (healthy * 5) / 100;
          const f = M.frac(95 * 2, 95 * 2 + 5 * 98);
          return sick === 20 && tp === 19 && healthy === 980 && fp === 49 && tp + fp === 68
            && f.n === 19 && f.d === 68 && String(f) === '19/68' && String(M.frac(tp, tp + fp)) === '19/68';
        },
        draw(stage, ctx, step) {
          const { h, s } = ctx;
          const phase = step.phase;
          const circles = [];
          const pluses = [];
          for (let i = 0; i < 1000; i++) {
            const sick = i < 20;
            const pos = sick ? i < 19 : i >= 20 && i < 69;
            let fill = 'var(--rule)', stroke = 'none', sw = 0, op = 1;
            if (phase >= 1 && sick) fill = 'var(--false)';
            if (phase >= 2 && sick && !pos) { fill = 'var(--sheet)'; stroke = 'var(--false)'; sw = 1.6; }
            if (phase >= 3 && !sick && pos) fill = 'var(--warn)';
            if (phase >= 2 && pos) { stroke = 'var(--ink)'; sw = 1.3; }
            if (phase >= 4 && !pos) op = 0.13;
            const cx = 15 + (i % 40) * 25, cy = 14 + Math.floor(i / 40) * 11.7;
            circles.push(s('circle', { cx, cy, r: 4.8, fill, stroke, 'stroke-width': sw, opacity: op }));
            if (phase >= 2 && pos) pluses.push(s('text', { x: cx, y: cy + 2.4, 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 700, fill: sick ? 'var(--sheet)' : 'var(--ink)', opacity: op, text: '+' }));
          }
          const svg = s('svg', { viewBox: '0 0 1000 300', class: 'pb-svg', role: 'img', 'aria-label': '1,000 dots, one per person, marked by condition and test result', style: 'max-height:13.5rem' }, ...circles, ...pluses);
          const legendKids = [h('span', h('i', { style: { background: 'var(--rule)' } }), phase === 0 ? '1,000 people, no groups marked yet' : 'Healthy, test negative')];
          if (phase >= 1) legendKids.push(h('span', h('i', { style: { background: 'var(--false)' } }), 'Has the condition (20)'));
          if (phase >= 2) legendKids.push(h('span', 'Ring and + : tests positive'), h('span', h('i', { style: { background: 'var(--sheet)', borderColor: 'var(--false)' } }), 'Sick but missed (1)'));
          if (phase >= 3) legendKids.push(h('span', h('i', { style: { background: 'var(--warn)' } }), 'Healthy, tests positive: false positive (49)'));
          if (phase >= 4) legendKids.push(h('span', 'Dimmed: tested negative (932), out of the question now'));
          stage.append(h('div.stack', { style: { gap: '0.35rem', width: '100%' } },
            h('div.pb-legend', legendKids),
            svg,
            h('div.small', { style: { textAlign: 'center', fontWeight: '600' } }, step.note),
            step.answer ? h('div.ex-answer', 'P(sick | positive) = 19/68, about 28% · check: 19 true positives out of 68 positive results (19 + 49 = 68), and Bayes\' rule gives 190/680 = 19/68') : null));
        },
      },
      /* ---------------------------------------------------------------- worked example */
      {
        title: 'Worked example: exactly 2 heads in 4 flips, by tree',
        kind: 'example',
        id: 'ex-binomial-tree',
        problem: String.raw`<p>A fair coin is flipped 4 times. What is the probability of exactly 2 heads? Build the full outcome tree: list every outcome string, collect the ones with exactly 2 heads, and count.</p>`,
        steps: [
          { depth: 1, note: 'After 1 flip: 2 prefixes · after 4 flips there will be 2 × 2 × 2 × 2 = 16 outcome strings', caption: 'Each flip doubles the number of outcomes, so after 4 flips there are 2^4 = 16 equally likely outcome strings. The tree starts at the root and makes its first split into H and T.' },
          { depth: 2, note: 'Level 2: 4 prefixes — HH, HT, TH, TT', caption: 'Level 2 is complete with 4 prefixes: HH, HT, TH, and TT. The tree keeps outcomes that feel similar, HT and TH, separate, and that distinction is exactly what counting needs.' },
          { depth: 3, note: 'Level 3: 8 prefixes, each one flip away from a finished outcome string', caption: 'Level 3 doubles the prefixes again to 8, because each level-2 prefix branches into one ending in H and one ending in T. Nothing has merged, so every prefix still stands for distinct flip sequences.' },
          { depth: 4, note: 'Level 4: all 16 outcome strings, each labeled with its head count', caption: 'Level 4 completes the tree with all 16 outcome strings as leaves, and each leaf is labeled with its head count. The same head count can come from several different leaves, which is why the next step collects them.' },
          { depth: 4, collect: true, note: 'Exactly 2 heads: 6 leaves — HHTT, HTHT, HTTH, THHT, THTH, TTHH', caption: 'Collect the leaves with exactly 2 heads: HHTT, HTHT, HTTH, THHT, THTH, and TTHH. There are C(4, 2) = 6 ways to choose which 2 of the 4 flips are heads, and the tree shows all 6 of them.' },
          { depth: 4, collect: true, note: 'Head-count distribution: 0 heads: 1 · 1 head: 4 · 2 heads: 6 · 3 heads: 4 · 4 heads: 1 · total 16', answer: true, caption: 'Check: the full distribution from the tree is 1, 4, 6, 4, 1 for 0 to 4 heads, which sums to 16 leaves. The formula C(4, 2) / 2^4 = 6/16 = 3/8 agrees with the leaf count exactly.' },
        ],
        answer: '3/8',
        verify(M) {
          const dist = [0, 0, 0, 0, 0];
          let count2 = 0;
          for (let mask = 0; mask < 16; mask++) {
            let ones = 0;
            for (let b = 0; b < 4; b++) if (mask & (1 << b)) ones++;
            dist[ones]++;
            if (ones === 2) count2++;
          }
          const f = M.frac(6, 16);
          return count2 === 6 && dist.join(',') === '1,4,6,4,1' && dist.reduce((a, b) => a + b, 0) === 16
            && M.C(4, 2) === 6 && f.n === 3 && f.d === 8 && String(f) === '3/8' && EX_BIN_LEAVES.length === 16
            && EX_BIN_LEAVES.filter((leaf) => EX_BIN_HEADS(leaf) === 2).length === 6;
        },
        draw(stage, ctx, step) {
          const { h } = ctx;
          const rows = [h('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'flex-start' } },
            h('div.tiny.mono.muted', { style: { minWidth: '3.6rem', paddingTop: '0.25rem' } }, 'Start'),
            h('div.pb-chips', h('span', 'no flips yet')))];
          for (let L = 1; L <= step.depth; L++) {
            const prefs = [...new Set(EX_BIN_LEAVES.map((leaf) => leaf.slice(0, L)))];
            const chips = prefs.map((p) => {
              if (L < 4) return h('span', p);
              const heads = EX_BIN_HEADS(p);
              const label = `${p} · ${heads} head${heads === 1 ? '' : 's'}`;
              if (step.collect && heads === 2) return h('span.hit', `✓ ${label}`);
              if (step.collect) return h('span', { style: { opacity: '0.45' } }, label);
              return h('span', label);
            });
            rows.push(h('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'flex-start' } },
              h('div.tiny.mono.muted', { style: { minWidth: '3.6rem', paddingTop: '0.25rem' } }, `Flip ${L}`),
              h('div.pb-chips', chips)));
          }
          stage.append(h('div.stack', { style: { gap: '0.45rem', width: '100%' } },
            rows,
            h('div.small', { style: { textAlign: 'center', fontWeight: '600' } }, step.note),
            step.answer ? h('div.pb-chips', { style: { justifyContent: 'center' } },
              h('span', '0 heads: 1'), h('span', '1 head: 4'), h('span.hit', '✓ 2 heads: 6'), h('span', '3 heads: 4'), h('span', '4 heads: 1'), h('span', 'total: 16')) : null,
            step.answer ? h('div.ex-answer', 'P(exactly 2 heads) = 6/16 = 3/8 · check: C(4, 2) = 6 favorable leaves out of 2^4 = 16, and the distribution 1, 4, 6, 4, 1 sums to 16') : null));
        },
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: probability',
        kind: 'practice',
        html: String.raw`<p class="muted small">Type probabilities as fractions such as <code>5/36</code> or as decimals. When a problem asks for rounding, a decimal with that many places is accepted.</p>`,
        gens: [
          {
            label: 'Counting outcomes',
            make(R, M) {
              const kind = R.int(0, 4);
              if (kind === 0) {
                const sum = R.int(2, 12), w = ways2(sum);
                return {
                  prompt: String.raw`Two fair dice are rolled. What is the probability that the sum is \(${sum}\)?`,
                  answer: w / 36, tol: 0.001, placeholder: 'a fraction such as 5/36, or a decimal to 3 places',
                  hint: 'list the ordered pairs (first die, second die) with this sum. There are 36 equally likely pairs in all.',
                  solution: String.raw`The 36 ordered pairs are equally likely. The pairs with sum ${sum} are ${pairsFor(sum).join(', ')}, which makes ${w}. So \(P = ${w}/36 = ${fr(w, 36)}\).`,
                };
              }
              if (kind === 1) {
                const t = R.int(8, 12);
                let w = 0; const parts = [];
                for (let x = t; x <= 12; x++) { w += ways2(x); parts.push(`${ways2(x)}`); }
                return {
                  prompt: String.raw`Two fair dice are rolled. What is the probability that the sum is at least \(${t}\)?`,
                  answer: w / 36, tol: 0.001, placeholder: 'a fraction, or a decimal to 3 places',
                  solution: String.raw`The sums ${t} to 12 are mutually exclusive, so add their counts: ${parts.join(' + ')} = ${w} pairs out of 36. \(P = ${w}/36 = ${fr(w, 36)}\).`,
                };
              }
              if (kind === 2) {
                const n = R.int(3, 6), k = R.int(0, n), c = M.C(n, k), tot = 2 ** n;
                return {
                  prompt: String.raw`A fair coin is flipped \(${n}\) times. What is the probability of exactly \(${k}\) heads?`,
                  answer: c / tot, tol: 0.001, placeholder: 'a fraction such as 3/8, or a decimal to 3 places',
                  hint: `there are 2^${n} equally likely sequences of H and T.`,
                  solution: String.raw`There are \(2^{${n}} = ${tot}\) equally likely sequences. A sequence with exactly ${k} heads is fixed by choosing which ${k} of the ${n} flips are heads: \(\binom{${n}}{${k}} = ${c}\) ways. \(P = ${c}/${tot} = ${fr(c, tot)}\).`,
                };
              }
              if (kind === 3) {
                const [what, cnt, why] = R.pick([
                  ['a heart', 13, 'There are 13 hearts.'],
                  ['a face card (jack, queen or king)', 12, 'There are 3 face cards in each of 4 suits.'],
                  ['an ace', 4, 'There is one ace per suit.'],
                  ['a red card', 26, 'Hearts and diamonds are red: 13 + 13.'],
                  ['a red face card', 6, 'Each red suit has 3 face cards: 2 × 3.'],
                  ['a card numbered 2 through 10', 36, 'Each suit has 9 numbered cards: 4 × 9.'],
                  ['the queen of spades', 1, 'Exactly one card is the queen of spades.'],
                ]);
                return {
                  prompt: `One card is drawn from a well-shuffled standard deck of 52 cards. What is the probability that it is ${what}?`,
                  answer: cnt / 52, tol: 0.001, placeholder: 'a fraction, or a decimal to 3 places',
                  solution: String.raw`${why} So \(P = ${cnt}/52 = ${fr(cnt, 52)} \approx ${num(cnt / 52, 3)}\).`,
                };
              }
              const n = R.int(2, 4), num6 = 6 ** n - 5 ** n;
              return {
                prompt: String.raw`A fair die is rolled \(${n}\) times. What is the probability of getting at least one 6?`,
                answer: num6 / 6 ** n, tol: 0.0006, placeholder: 'a fraction, or a decimal to 3 places',
                hint: 'use the complement: what is the chance of no 6 at all?',
                solution: String.raw`Use the complement. Each roll avoids a 6 with probability \(5/6\), and the rolls are independent, so \(P(\text{no 6}) = (5/6)^{${n}} = ${5 ** n}/${6 ** n}\). Then \(P(\text{at least one 6}) = 1 - ${5 ** n}/${6 ** n} = ${num6}/${6 ** n} \approx ${num(num6 / 6 ** n, 4)}\).`,
              };
            },
          },
          {
            label: 'Conditional probability',
            make(R) {
              if (R.chance(0.7)) {
                const a = R.int(12, 48), b = R.int(4, 20), c = R.int(10, 40), d = R.int(6, 30), N = a + b + c + d;
                const table = `<table class="tt" style="margin:0.35rem 0"><thead><tr><th></th><th>Passed</th><th>Failed</th><th>Total</th></tr></thead><tbody>
                  <tr><th class="l">Practiced daily</th><td>${a}</td><td>${b}</td><td>${a + b}</td></tr>
                  <tr><th class="l">Did not practice</th><td>${c}</td><td>${d}</td><td>${c + d}</td></tr>
                  <tr><th class="l">Total</th><td>${a + c}</td><td>${b + d}</td><td>${N}</td></tr></tbody></table>`;
                const [tex, top, bot, how] = R.pick([
                  ['P(\\text{passed} \\mid \\text{practiced})', a, a + b, 'Given "practiced daily", look only at that row'],
                  ['P(\\text{practiced} \\mid \\text{passed})', a, a + c, 'Given "passed", look only at the Passed column'],
                  ['P(\\text{failed} \\mid \\text{did not practice})', d, c + d, 'Given "did not practice", look only at that row'],
                  ['P(\\text{practiced} \\cap \\text{passed})', a, N, 'This is a joint probability with no condition, so the whole table is the sample space'],
                ]);
                return {
                  prompt: String.raw`A survey of ${N} students records whether they practiced daily and whether they passed the final. ${table} One student is chosen at random. Find \(${tex}\).`,
                  answer: top / bot, tol: 0.001, placeholder: 'a fraction, or a decimal to 3 places',
                  hint: 'the condition after the bar tells you which row or column becomes the new sample space.',
                  solution: String.raw`${how}. It has ${bot} students, and ${top} of them fit. \(${tex} = ${top}/${bot}${fr(top, bot) !== `${top}/${bot}` ? ` = ${fr(top, bot)}` : ''} \approx ${num(top / bot, 3)}\).`,
                };
              }
              if (R.chance(0.5)) {
                const sum = R.pick([4, 6, 8, 10]), w = ways2(sum);
                return {
                  prompt: String.raw`Two fair dice are rolled. Given that the sum is \(${sum}\), what is the probability that both dice show the same number?`,
                  answer: 1 / w, tol: 0.001, placeholder: 'a fraction, or a decimal to 3 places',
                  solution: String.raw`The condition shrinks the sample space to the ${w} pairs with sum ${sum}: ${pairsFor(sum).join(', ')}. Exactly one of them, \((${sum / 2},${sum / 2})\), is doubles. So the answer is \(1/${w}\), compared with \(1/6\) without the information.`,
                };
              }
              const d = R.int(1, 6);
              return {
                prompt: String.raw`Two fair dice are rolled. Given that the first die shows \(${d}\), what is the probability that the sum is 7?`,
                answer: 1 / 6, tol: 0.001, placeholder: 'a fraction, or a decimal to 3 places',
                solution: String.raw`Once the first die shows ${d}, the sum is 7 only if the second die shows ${7 - d}, which has probability \(1/6\). This equals the unconditional \(P(\text{sum} = 7) = 6/36 = 1/6\), so "first die is ${d}" and "sum is 7" are independent events.`,
              };
            },
          },
          {
            label: "Bayes' theorem",
            make(R) {
              const base = R.pick([0.005, 0.01, 0.02, 0.05, 0.1, 0.2]);
              const sens = R.pick([0.8, 0.9, 0.95, 0.99]);
              const fpr = R.pick([0.01, 0.02, 0.05, 0.1]);
              const post = (sens * base) / (sens * base + fpr * (1 - base));
              const [setup, A, B] = R.pick([
                [`A disease affects ${pctS(base)} of a population. A test detects ${pctS(sens)} of people who have it, and gives a positive result for ${pctS(fpr)} of people who do not. A randomly chosen person tests positive.`, 'What is the probability that this person has the disease?', 'positive'],
                [`${pctS(base)} of the e-mail arriving at a server is spam. The filter flags ${pctS(sens)} of spam messages, and also flags ${pctS(fpr)} of legitimate messages. A message is flagged.`, 'What is the probability that the message is spam?', 'flagged'],
                [`${pctS(base)} of card transactions are fraudulent. A model flags ${pctS(sens)} of fraudulent transactions and ${pctS(fpr)} of honest ones. A transaction is flagged.`, 'What is the probability that the transaction is fraudulent?', 'flagged'],
              ]);
              const pop = 100000, cases = Math.round(pop * base), tp = Math.round(cases * sens), fp = Math.round((pop - cases) * fpr);
              return {
                prompt: `${setup} ${A} Give a decimal rounded to 3 places.`,
                answer: Math.round(post * 1000) / 1000, tol: 0.0015, placeholder: 'for example 0.083',
                hint: 'P(case | flagged) = P(flagged | case) P(case) / P(flagged), and P(flagged) adds true and false positives.',
                solution: String.raw`\[P = \frac{${sens} \times ${base}}{${sens} \times ${base} + ${fpr} \times ${num(1 - base, 3)}} = \frac{${num(sens * base, 5)}}{${num(sens * base + fpr * (1 - base), 5)}} \approx ${num(post, 3)}\]
                  In natural frequencies, out of ${big(pop)}: ${big(cases)} are real cases and ${big(tp)} of them are ${B}. Of the ${big(pop - cases)} others, ${big(fp)} are also ${B}. So the answer is \(${bigT(tp)} / (${bigT(tp)} + ${bigT(fp)}) \approx ${num(post, 3)}\).`,
              };
            },
          },
          {
            label: 'Expected value and binomial',
            make(R, M) {
              const kind = R.int(0, 3);
              if (kind === 0) {
                const cost = R.int(1, 3), prize = R.pick([4, 5, 6, 8, 10, 12]);
                const [what, m] = R.pick([['a 6', 1], ['a 5 or a 6', 2], ['an even number', 3]]);
                const ev = (prize * m) / 6 - cost;
                return {
                  prompt: `A game costs $${cost} to play. You roll a fair die and receive $${prize} if you roll ${what}. What is your expected net gain per game, in dollars? (Round to 2 decimal places; a loss is negative.)`,
                  answer: Math.round(ev * 100) / 100, tol: 0.006, placeholder: 'for example -0.17',
                  solution: String.raw`You win with probability \(${fr(m, 6)}\). The expected payout is \(${prize} \times ${fr(m, 6)} = ${num((prize * m) / 6, 3)}\) dollars, and you always pay ${cost}. By linearity, \(E[\text{gain}] = ${num((prize * m) / 6, 3)} - ${cost} = ${fr(prize * m - 6 * cost, 6)}${Number.isInteger(ev) ? '' : String.raw` \approx ${num(ev, 2)}`}\). ${ev < 0 ? 'The game favors the house.' : ev > 0 ? 'The game favors the player.' : 'The game is fair.'}`,
                };
              }
              if (kind === 1) {
                const n = R.int(4, 8), p = R.pick([0.5, 0.2, 0.3, 0.6, 0.8, 0.9]), k = R.int(0, n);
                const v = pmf(n, p, k), c = M.C(n, k);
                return {
                  prompt: String.raw`A trial succeeds with probability \(${p}\), independently each time. In \(${n}\) trials, what is \(P(X = ${k})\), the probability of exactly ${k} successes? (Round to 4 decimal places.)`,
                  answer: Math.round(v * 10000) / 10000, tol: 0.0006, placeholder: 'a decimal such as 0.2335',
                  hint: 'P(X = k) = C(n, k) p^k (1 − p)^(n − k).',
                  solution: String.raw`\(X \sim \text{Bin}(${n}, ${p})\), so \(P(X = ${k}) = \binom{${n}}{${k}} (${p})^{${k}} (${num(1 - p, 2)})^{${n - k}} = ${c} \times ${num(p ** k, 6)} \times ${num((1 - p) ** (n - k), 6)} \approx ${v.toFixed(4)}\).`,
                };
              }
              if (kind === 2) {
                const n = R.pick([20, 50, 100, 200, 500]), p = R.pick([0.02, 0.05, 0.1, 0.25]);
                const askVar = R.chance(0.35);
                const val = askVar ? n * p * (1 - p) : n * p;
                return {
                  prompt: `A model labels ${n} images. Each label is wrong with probability ${p}, independently. What is the ${askVar ? '<b>variance</b> of the number of wrong labels' : '<b>expected</b> number of wrong labels'}?`,
                  answer: Math.round(val * 1000) / 1000, tol: 0.001, placeholder: 'a number',
                  solution: askVar
                    ? String.raw`The number of mistakes is \(\text{Bin}(${n}, ${p})\), whose variance is \(np(1-p) = ${n} \times ${p} \times ${num(1 - p, 2)} = ${num(val, 3)}\).`
                    : String.raw`The number of mistakes is \(\text{Bin}(${n}, ${p})\). By linearity of expectation it is a sum of ${n} indicators, each with expectation ${p}, so \(E[X] = np = ${n} \times ${p} = ${num(val, 3)}\).`,
                };
              }
              const xs = M.sortNum(R.sample([0, 1, 2, 3, 4, 5, 10], 3));
              const ps = R.pick([[0.2, 0.5, 0.3], [0.1, 0.6, 0.3], [0.5, 0.25, 0.25], [0.4, 0.4, 0.2], [0.3, 0.3, 0.4]]);
              const ev = xs.reduce((acc, x, i) => acc + x * ps[i], 0);
              return {
                prompt: String.raw`A random variable \(X\) takes the value ${xs[0]} with probability ${ps[0]}, ${xs[1]} with probability ${ps[1]}, and ${xs[2]} with probability ${ps[2]}. Find \(E[X]\).`,
                answer: Math.round(ev * 1000) / 1000, tol: 0.001, placeholder: 'a number',
                solution: String.raw`First check the probabilities add to 1: \(${ps.join(' + ')} = 1\). Then \(E[X] = ${xs.map((x, i) => `${x} \times ${ps[i]}`).join(' + ')} = ${num(ev, 3)}\).`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: probability',
        kind: 'quiz',
        questions: [
          { q: 'Two fair dice are rolled. What is the probability that the sum is 8?', choices: [String.raw`\(1/11\)`, String.raw`\(5/36\)`, String.raw`\(1/6\)`, String.raw`\(8/36\)`], answer: 1, explain: String.raw`Five of the 36 equally likely ordered pairs give 8: \((2,6), (3,5), (4,4), (5,3), (6,2)\). The answer \(1/11\) wrongly treats the 11 possible sums as equally likely.` },
          { q: 'A fair coin is flipped 3 times. What is the probability of at least one head?', choices: [String.raw`\(1/2\)`, String.raw`\(3/4\)`, String.raw`\(7/8\)`, String.raw`\(1/8\)`], answer: 2, explain: String.raw`Use the complement. The only outcome with no heads is TTT, with probability \(1/8\). So \(P(\text{at least one head}) = 1 - 1/8 = 7/8\).` },
          { q: String.raw`\(P(A) = 0.5\), \(P(B) = 0.4\) and \(P(A \cap B) = 0.2\). Which statement is true?`, choices: [String.raw`\(A\) and \(B\) are independent`, String.raw`\(A\) and \(B\) are mutually exclusive`, String.raw`\(P(A \cup B) = 0.9\)`, String.raw`\(P(A \mid B) = 0.2\)`], answer: 0, explain: String.raw`\(P(A)P(B) = 0.5 \times 0.4 = 0.2 = P(A \cap B)\), which is the definition of independence. They are not mutually exclusive since \(P(A \cap B) \neq 0\). Also \(P(A \cup B) = 0.5 + 0.4 - 0.2 = 0.7\) and \(P(A \mid B) = 0.2 / 0.4 = 0.5\).` },
          { q: String.raw`\(A\) and \(B\) are mutually exclusive, and both have positive probability. What can you conclude?`, choices: ['They are always independent', 'They are always dependent', 'They may or may not be independent', String.raw`\(P(A \cap B) = P(A)P(B)\)`], answer: 1, explain: String.raw`\(P(A \cap B) = 0\) but \(P(A)P(B) > 0\), so independence fails. Intuitively, learning that \(A\) happened tells you for certain that \(B\) did not, which is a lot of information.` },
          { q: 'A disease affects 1 in 1,000 people. A test catches 99% of cases but also gives a positive result for 5% of healthy people. You test positive. Roughly how likely is it that you have the disease?', choices: ['99%', '95%', '50%', 'About 2%'], answer: 3, explain: String.raw`Think of 100,000 people: 100 are sick and 99 test positive, while 5% of the 99,900 healthy people, about 4,995, also test positive. \(99 / (99 + 4995) \approx 0.019\). The low base rate means false positives far outnumber true ones.` },
          { q: 'You pay $1 to roll a fair die and receive $3 if it shows 5 or 6. What is your expected net gain per game?', choices: ['−$0.33', '$0', '+$0.33', '+$1.00'], answer: 1, explain: String.raw`You win $2 net with probability \(2/6 = 1/3\) and lose $1 with probability \(2/3\). \(E = 2 \cdot \tfrac13 - 1 \cdot \tfrac23 = 0\). It is a fair game.` },
          { q: 'A model answers each of 40 questions correctly with probability 0.85, independently. What is the expected number of correct answers?', choices: ['34', '40', '85', '6'], answer: 0, explain: String.raw`The number correct is \(\text{Bin}(40, 0.85)\). By linearity of expectation, \(E[X] = np = 40 \times 0.85 = 34\). The answer 6 is the expected number of <i>wrong</i> answers.` },
          { q: 'What is the smallest group size for which the chance that two people share a birthday is above 50%?', choices: ['23', '57', '183', '366'], answer: 0, explain: String.raw`With 23 people, \(P(\text{no match}) = \frac{365}{365} \cdots \frac{343}{365} \approx 0.493\), so a match has probability about 0.507. The surprise comes from the 253 pairs of people, each a chance for a match. 57 people push the chance above 99%.` },
          { q: 'In the Monty Hall game with 3 doors, what is the probability of winning the car if you always switch?', choices: [String.raw`\(1/3\)`, String.raw`\(1/2\)`, String.raw`\(2/3\)`, '1'], answer: 2, explain: String.raw`Switching wins exactly when your first pick was a goat, which happens with probability \(2/3\). The host must avoid the car, so the door the host leaves closed carries all of the \(2/3\) chance that your first pick missed.` },
          { q: 'A fair coin has just landed heads 5 times in a row. Which statement is correct?', choices: ['Tails is now more likely, because the law of large numbers must balance things out', 'Heads is now more likely, because the coin is on a streak', 'The next flip is still heads with probability 1/2', 'The coin must be unfair'], answer: 2, explain: String.raw`Flips are independent, so the coin has no memory. The law of large numbers works by swamping: after thousands more flips, 5 extra heads barely move the proportion. Expecting tails to "catch up" is the gambler's fallacy, and 5 heads in a row happens with probability \(1/32\) even for a fair coin.` },
        ],
      },
    ],
  });
})();
