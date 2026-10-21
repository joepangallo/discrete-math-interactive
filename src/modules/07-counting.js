/* Module 7: Counting and the Binomial Theorem. Objective 7: use counting techniques to solve the
   binomial theorem. Product and sum rules, inclusion-exclusion, permutations and combinations,
   repetition (multisets, stars and bars), Pascal's triangle, the Binomial Theorem, pigeonhole. */
(() => {
  // ---- counting helpers shared by the labs and the practice generators ----
  const { fact, C, P, gcd } = globalThis.DMUtil.M; // the same helpers the practice generators receive as M
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const fmt = (x) => Number(x).toLocaleString('en-US');
  const tfmt = (x) => fmt(x).replace(/,/g, '{,}'); // thousands separators inside TeX
  const parseIntSafe = (v) => { const t = String(v).trim().replace(/[−–]/g, '-'); return /^-?\d+$/.test(t) ? parseInt(t, 10) : NaN; };
  const COLS = ['var(--accent)', 'var(--fnc)', 'var(--num)', 'var(--kw)', 'var(--str)', 'var(--warn)'];
  const SUP = (n) => String(n).replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);

  // ---- enumerators in lexicographic order (index arrays over 0..n-1) ----
  function product(n, r) { const out = []; const rec = (pre) => { if (pre.length === r) { out.push(pre); return; } for (let i = 0; i < n; i++) rec([...pre, i]); }; rec([]); return out; }
  function perms(n, r) { const out = []; const rec = (pre) => { if (pre.length === r) { out.push(pre); return; } for (let i = 0; i < n; i++) if (!pre.includes(i)) rec([...pre, i]); }; rec([]); return out; }
  function combos(n, r) { const out = []; const rec = (pre, start) => { if (pre.length === r) { out.push(pre); return; } for (let i = start; i < n; i++) rec([...pre, i], i + 1); }; rec([], 0); return out; }
  function multisets(n, r) { const out = []; const rec = (pre, start) => { if (pre.length === r) { out.push(pre); return; } for (let i = start; i < n; i++) rec([...pre, i], i); }; rec([], 0); return out; }

  // a small static Pascal triangle for the concept slide (rows 0..6)
  const miniTri = Array.from({ length: 7 }, (_, n) => `<div class="ct-trirow"><span class="ct-rl">${n}</span>${Array.from({ length: n + 1 }, (_, k) => `<span>${C(n, k)}</span>`).join('')}</div>`).join('');

  DM.module({
    id: 'counting',
    num: 7,
    title: 'Counting & the Binomial Theorem',
    objectives: [7],
    terms: {
      'product rule': 'If a task is a sequence of steps and step i can be done in nᵢ ways whatever happened before, the whole task can be done in n₁·n₂·…·nₖ ways.',
      'sum rule': 'If a choice comes from one of several groups that do not overlap, the number of possible choices is the sum of the group sizes.',
      'inclusion–exclusion': 'Counting a union of overlapping sets: add the sizes of the sets, subtract the sizes of the pairwise overlaps, add back the triple overlap, and so on.',
      'factorial': 'n! = n·(n − 1)·…·2·1, the number of orders of n distinct objects. By convention 0! = 1.',
      'r-permutation': 'An ordered arrangement of r of n distinct objects. There are P(n, r) = n!/(n − r)! of them.',
      'r-combination': 'An unordered selection of r of n distinct objects. There are C(n, r) = n!/(r!(n − r)!) of them.',
      'binomial coefficient': 'C(n, k), also written (n choose k): the number of ways to choose k objects from n. It is the coefficient of aⁿ⁻ᵏbᵏ in (a + b)ⁿ.',
      'multiset': 'A collection in which items may repeat but order does not matter, such as the letters of MISSISSIPPI or a box of donuts.',
      'stars and bars': 'A way to count combinations with repetition: r items from n types correspond to arrangements of r stars and n − 1 bars, so there are C(n + r − 1, r).',
      'Pascal\'s triangle': 'The binomial coefficients arranged in rows: row n lists C(n, 0), C(n, 1), …, C(n, n). Each inner entry is the sum of the two above it.',
      'Pascal\'s identity': 'C(n + 1, k) = C(n, k − 1) + C(n, k), for 1 ≤ k ≤ n.',
      'binomial theorem': '(a + b)ⁿ = Σ C(n, k)·aⁿ⁻ᵏ·bᵏ, summed over k = 0, 1, …, n.',
      'combinatorial argument': 'A proof that counts the same collection in two different ways, so the two counts must be equal. Also called a combinatorial proof.',
      'pigeonhole principle': 'If n items go into k boxes and n > k, some box holds at least two items. More generally, some box holds at least ⌈n/k⌉ items.',
      'lexicographic order': 'Dictionary order: AB before AC before BA. itertools produces permutations and combinations in this order.',
      'combinatorial explosion': 'The rapid growth of the number of possibilities as a problem grows, such as n! orderings or 2ⁿ subsets. It makes exhaustive search impossible beyond small sizes.',
    },
    symbols: [
      ['n!', 'n factorial', '4! = 24'],
      ['P(n, r)', 'r-permutations of n objects', 'P(5, 2) = 20'],
      ['C(n, r)', 'r-combinations, "n choose r"', 'C(5, 2) = 10'],
      ['(n k)', 'binomial coefficient, same as C(n, k)', '(4 2) = 6'],
      ['Σ', 'sum over a range', 'Σ C(n, k) = 2ⁿ'],
      ['⌈x⌉', 'ceiling: round up to an integer', '⌈13/12⌉ = 2'],
      ['|A ∪ B ∪ C|', 'size of a union (inclusion–exclusion)', '50 + 33 + 20 − … = 74'],
    ],
    css: `
      .ct-side { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; overflow: hidden; }
      .ct-ctl { display: grid; grid-template-columns: 4.4rem minmax(0, 1fr) 2.4rem; gap: 0.25rem 0.5rem; align-items: center; font-size: 0.86rem; }
      .ct-ctl output { font-family: var(--font-mono); font-weight: 700; text-align: right; }
      .ct-trirow { display: flex; justify-content: center; gap: 0.3rem; position: relative; font-family: var(--font-mono); font-size: 0.86rem; }
      .ct-trirow + .ct-trirow { margin-top: 0.15rem; }
      .ct-trirow span { min-width: 1.9rem; text-align: center; border: 1px solid var(--rule); border-radius: 0.3rem; background: var(--sheet); padding: 0 0.15rem; }
      .ct-trirow .ct-rl { position: absolute; left: 0; border: 0; background: none; color: var(--ink-3); font-size: 0.72rem; min-width: 0; }
      .ct-ie td, .ct-ie th { padding: 0.08rem 0.45rem; font-size: 0.82rem; }
      .ct-ie tr.tot td { font-weight: 700; border-top: 2px solid var(--ink-3); }
      .ct-arr { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr); gap: 1rem; min-height: 0; }
      .ct-cases { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr); gap: 0.3rem; font-size: 0.9rem; }
      .ct-cases > div { border: 1px solid var(--rule); border-radius: var(--radius); padding: 0.3rem 0.45rem; background: var(--sheet); text-align: center; }
      .ct-cases > div.hd { border: 0; background: none; color: var(--ink-3); font-family: var(--font-mono); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; }
      .ct-cases > div.on { border-color: var(--accent); background: var(--accent-2); font-weight: 600; box-shadow: inset 0 0 0 1px var(--accent); }
      .ct-list { display: flex; flex-wrap: wrap; gap: 0.25rem; align-content: flex-start; min-height: 0; overflow: hidden; }
      .ct-list .it { font-family: var(--font-mono); font-size: 0.92rem; border: 1px solid var(--rule); border-radius: 0.3rem; padding: 0.1rem 0.45rem; background: var(--sheet); line-height: 1.35; }
      .ct-list .it small { display: block; font-size: 0.72rem; color: var(--ink-3); letter-spacing: 0.04em; }
      .ct-list .it b { color: var(--accent); }
      .ct-pas { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 1rem; min-height: 0; }
      .ct-svgbox { position: relative; min-height: 0; }
      .ct-svgbox > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      .ct-terms span.tm { display: inline-block; margin: 0 0.15rem 0.1rem 0; padding: 0 0.15rem; border-radius: 0.25rem; cursor: pointer; }
      .ct-terms span.tm.on { background: var(--mark); color: var(--mark-ink); }
      .ct-bin { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 1rem; min-height: 0; }
      .ct-bt td, .ct-bt th { padding: 0.06rem 0.4rem; font-size: 0.8rem; }
      .ct-bt tr.hit td { background: var(--mark); color: var(--mark-ink); font-weight: 700; }
      .ct-bt tbody tr { cursor: pointer; }
      .ct-ph { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 1rem; min-height: 0; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'The product rule and the sum rule',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def" data-label="Product rule">If a task is a sequence of steps, step 1 can be done in \(n_1\) ways, step 2 in \(n_2\) ways, and so on, and each count does not depend on the earlier choices, then the whole task can be done in \(n_1 \cdot n_2 \cdots n_k\) ways. This is the <span class="term">product rule</span>.</div>
              <div class="ex">A license plate has 3 letters followed by 4 digits: \(26^3 \cdot 10^4 = 175{,}760{,}000\) plates. If the letters may not repeat, the letter choices shrink step by step: \(26 \cdot 25 \cdot 24 \cdot 10^4 = 156{,}000{,}000\).</div>
              <div class="def" data-label="Sum rule">If a choice comes from one of several groups that do not overlap, with \(n_1, n_2, \dots\) options, then there are \(n_1 + n_2 + \cdots\) choices in all. This is the <span class="term">sum rule</span>.</div>
              <div class="ex">Bit strings of length at most 3: split them by length (the groups cannot overlap), then count each length with the product rule: \(2 + 4 + 8 = 14\).</div>
            </div>
            <div class="stack">
              <div class="card ct-tree stack" style="gap:0.35rem"></div>
              <div class="ai"><span class="term">Combinatorial explosion</span>: a game with about 30 legal moves per turn has \(30^{10} \approx 5.9 \times 10^{14}\) ten-move sequences. A hyperparameter grid of 5 learning rates, 4 batch sizes and 6 depths already needs 120 training runs. AI search and planning methods exist because the product rule makes trying everything hopeless.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const box = body.querySelector('.ct-tree');
          const STAGES = [
            { name: 'Shirt', opts: ['red', 'blue', 'green', 'white'], noun: ' shirt' },
            { name: 'Pants', opts: ['jeans', 'khaki', 'gray', 'black'], noun: ' pants' },
            { name: 'Shoes', opts: ['sneakers', 'boots', 'loafers', 'sandals'], noun: '' },
          ];
          let counts = [2, 3, 2], pick = [1, 1, 0];
          const ctl = h('div.stack', { style: { gap: '0.25rem' } });
          const svg = s('svg', { viewBox: '0 0 480 196', role: 'img', 'aria-label': 'Tree of choices: each level is one step, each leaf one outfit', style: 'width:100%;height:auto;display:block' });
          const out = h('div.small');
          box.append(h('div.tiny.mono.muted', 'TREE OF CHOICES · SET THE OPTIONS PER STEP, CLICK A LEAF'), ctl, svg, out);
          function draw() {
            ctx.rc(ctl, ...STAGES.map((st, d) => h('div.row', { style: { gap: '0.4rem' } }, h('span.small', { style: { width: '3.4rem' } }, st.name),
              h('div.seg', { 'aria-label': `${st.name} options` }, ...[1, 2, 3, 4].map((k) => h('button', { 'aria-pressed': String(k === counts[d]), style: { padding: '0.12rem 0.55rem' }, onclick: () => { counts[d] = k; pick = pick.map((p, i) => Math.min(p, counts[i] - 1)); draw(); } }, String(k)))),
              h('span.tiny.muted', st.opts.slice(0, counts[d]).join(', ')))));
            const leaves = counts.reduce((x, y) => x * y, 1);
            const span = (d) => counts.slice(d).reduce((x, y) => x * y, 1);
            const ys = [14, 70, 126, 178];
            const X = (path) => { let start = 0; path.forEach((p, i) => { start += p * span(i + 1); }); const w = span(path.length); return 20 + ((start + w / 2) * 440) / leaves; };
            const onPath = (path) => path.every((p, i) => p === pick[i]);
            const kids = [];
            const walk = (path) => {
              const d = path.length;
              if (d === 3) return;
              for (let o = 0; o < counts[d]; o++) {
                const child = [...path, o];
                const hot = onPath(child);
                kids.push(s('line', { x1: X(path), y1: ys[d], x2: X(child), y2: ys[d + 1], stroke: hot ? 'var(--accent)' : 'var(--ink-3)', 'stroke-width': hot ? 2.6 : 1, opacity: hot ? 1 : 0.6 }));
                walk(child);
              }
            };
            walk([]);
            const nodes = (path) => {
              const d = path.length;
              const hot = d === 0 || onPath(path);
              if (d === 3) {
                kids.push(s('circle', { cx: X(path), cy: ys[3], r: leaves > 32 ? 3 : 5, fill: hot ? 'var(--accent)' : 'var(--sheet)', stroke: hot ? 'var(--accent)' : 'var(--ink-2)', 'stroke-width': 1.4, style: 'cursor:pointer', onclick: () => { pick = path; draw(); } }));
                return;
              }
              kids.push(s('circle', { cx: X(path), cy: ys[d], r: 5, fill: hot ? 'var(--accent)' : 'var(--sheet)', stroke: 'var(--ink-2)', 'stroke-width': 1.2 }));
              if (d > 0 && 440 / (leaves / span(d)) > 34) kids.push(s('text', { x: X(path) + 8, y: ys[d] + 4, 'font-size': 10, fill: hot ? 'var(--accent)' : 'var(--ink-2)', 'font-weight': hot ? 700 : 400, text: STAGES[d - 1].opts[path[d - 1]] }));
              for (let o = 0; o < counts[d]; o++) nodes([...path, o]);
            };
            nodes([]);
            kids.push(s('text', { x: 470, y: ys[3] + 15, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--ink-3)', text: `${leaves} leaves` }));
            ctx.rc(svg, ...kids);
            const prods = counts.map((_, d) => counts.slice(0, d + 1).reduce((x, y) => x * y, 1));
            out.innerHTML = `Each step multiplies the branches: ${counts[0]} → ${prods[0]} × ${counts[1]} = ${prods[1]} → ${prods[1]} × ${counts[2]} = <b>${prods[2]} outfits</b>. ` +
              `<span class="muted">Highlighted leaf: ${STAGES.map((st, i) => `${st.opts[pick[i]]}${st.opts[pick[i]] === 'jeans' ? '' : st.noun}`).join(', ')}. Every leaf is one complete path of choices.</span>`;
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Inclusion–exclusion: counting overlapping groups',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="thm" data-label="Inclusion–exclusion">Two sets: \(|A \cup B| = |A| + |B| - |A \cap B|\). Three sets:
                \[|A \cup B \cup C| = |A| + |B| + |C|\]
                \[- \,|A \cap B| - |A \cap C| - |B \cap C| + |A \cap B \cap C|\]</div>
              <p class="small">Why the signs alternate: follow one element and count how often the formula counts it. Every element of the union ends up counted exactly once.</p>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">An element that lies in</th><th>singles</th><th>pairs</th><th>triple</th><th>total</th></tr></thead>
                <tbody>
                  <tr><td class="l">exactly 1 set</td><td>+1</td><td>0</td><td>0</td><td><b>1</b></td></tr>
                  <tr><td class="l">exactly 2 sets</td><td>+2</td><td>−1</td><td>0</td><td><b>1</b></td></tr>
                  <tr><td class="l">all 3 sets</td><td>+3</td><td>−3</td><td>+1</td><td><b>1</b></td></tr>
                </tbody>
              </table>
              <div class="warn">The sum rule needs groups that do not overlap. When they do overlap, adding the sizes counts shared elements more than once. <span class="term">Inclusion–exclusion</span> is the correction.</div>
            </div>
            <div class="stack">
              <div class="ex">Bit strings of length 8 that start with 1 or end with 00: start with 1 gives \(2^7 = 128\), end with 00 gives \(2^6 = 64\), and both gives \(2^5 = 32\). So \(128 + 64 - 32 = 160\).</div>
              <div class="card ct-ie stack" style="gap:0.35rem"></div>
            </div>
          </div>`,
        render(body, ctx) {
          const { h } = ctx;
          const box = body.querySelector('.ct-ie');
          const vals = { N: 100, a: 2, b: 3, c: 5 };
          const ins = {};
          const row = h('div.row', { style: { gap: '0.35rem' } }, h('span.small', 'Integers 1 to'));
          for (const k of ['N', 'a', 'b', 'c']) {
            ins[k] = h('input.inp.mono', { value: String(vals[k]), inputmode: 'numeric', 'aria-label': k === 'N' ? 'N' : `divisor ${k}`, style: { width: k === 'N' ? '4.2rem' : '2.8rem', padding: '0.15rem 0.35rem' } });
            ins[k].addEventListener('input', draw);
            if (k === 'a') row.append(h('span.small', 'divisible by'));
            if (k === 'b' || k === 'c') row.append(h('span.small', 'or'));
            row.append(ins[k]);
          }
          const out = h('div');
          box.append(h('div.tiny.mono.muted', 'CALCULATOR · HOW MANY INTEGERS ARE DIVISIBLE BY a, b OR c?'), row, out);
          function draw() {
            for (const k of Object.keys(vals)) vals[k] = parseIntSafe(ins[k].value);
            const { N, a, b, c } = vals;
            if (![N, a, b, c].every(Number.isInteger) || N < 1 || N > 100000 || [a, b, c].some((x) => x < 1 || x > 1000)) { ctx.rc(out, h('div.feedback.bad', 'Use N from 1 to 100000 and divisors from 1 to 1000.')); return; }
            const f = (d) => Math.floor(N / d);
            const terms = [
              ['+', `|A|`, `⌊${N}/${a}⌋`, f(a)], ['+', `|B|`, `⌊${N}/${b}⌋`, f(b)], ['+', `|C|`, `⌊${N}/${c}⌋`, f(c)],
              ['−', `|A ∩ B|`, `⌊${N}/lcm(${a}, ${b})⌋ = ⌊${N}/${lcm(a, b)}⌋`, f(lcm(a, b))],
              ['−', `|A ∩ C|`, `⌊${N}/lcm(${a}, ${c})⌋ = ⌊${N}/${lcm(a, c)}⌋`, f(lcm(a, c))],
              ['−', `|B ∩ C|`, `⌊${N}/lcm(${b}, ${c})⌋ = ⌊${N}/${lcm(b, c)}⌋`, f(lcm(b, c))],
              ['+', `|A ∩ B ∩ C|`, `⌊${N}/${lcm(lcm(a, b), c)}⌋`, f(lcm(lcm(a, b), c))],
            ];
            const total = terms.reduce((t, [sg, , , v]) => (sg === '+' ? t + v : t - v), 0);
            let brute = 0;
            for (let x = 1; x <= N; x++) if (x % a === 0 || x % b === 0 || x % c === 0) brute++;
            ctx.rc(out,
              h('table.tt.ct-ie', { style: { width: '100%' } },
                h('tbody', terms.map(([sg, name, how, v]) => h('tr', h('td', sg), h('td.l.mono', name), h('td.l.mono', { style: { fontSize: '0.74rem' } }, how), h('td', fmt(v)))),
                  h('tr.tot', h('td', '='), h('td.l.mono', '|A ∪ B ∪ C|'), h('td.l', ''), h('td', fmt(total))))),
              h('div.small', { style: { marginTop: '0.3rem' } }, `Brute-force check, testing all ${fmt(N)} numbers: ${fmt(brute)} ${brute === total ? '✓' : '✗'}. Numbers divisible by none of them: ${fmt(N - total)}. A number is divisible by both a and b exactly when lcm(a, b) divides it (Module 6).`));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Permutations and combinations',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">An <span class="term">r-permutation</span> of \(n\) distinct objects is an <i>ordered</i> arrangement of \(r\) of them. There are \(n\) choices for the first position, \(n - 1\) for the second, and so on, so by the product rule
                \[P(n, r) = n(n-1)\cdots(n-r+1) = \frac{n!}{(n-r)!}.\]
                Here \(n! = n(n-1)\cdots 2 \cdot 1\) is \(n\) <span class="term">factorial</span>, and \(0! = 1\).</div>
              <div class="ex">Gold, silver and bronze among 8 runners: \(P(8, 3) = 8 \cdot 7 \cdot 6 = 336\). Every order of 5 books on a shelf: \(5! = 120\).</div>
              <div class="def">An <span class="term">r-combination</span> is an <i>unordered</i> selection of \(r\) of the \(n\) objects. Their number is the <span class="term">binomial coefficient</span>
                \[C(n, r) = \binom{n}{r} = \frac{n!}{r!\,(n-r)!}.\]</div>
              <div class="ai">Picking 10 of 100 input features for a model gives \(C(100, 10) \approx 1.7 \times 10^{13}\) feature subsets, far too many to test one by one.</div>
            </div>
            <div class="stack">
              <div class="thm" data-label="The divide-by-r! idea">Each unordered group of \(r\) objects appears \(r!\) times in the list of ordered arrangements, once for each of its orders. So \(C(n, r) = P(n, r) / r!\).
                <table class="tt" style="width:100%;margin-top:0.35rem">
                  <thead><tr><th class="l">choose 2 of {A, B, C}</th><th>ordered: \(P(3,2) = 6\)</th><th>unordered: \(6 / 2! = 3\)</th></tr></thead>
                  <tbody><tr><td class="l">group 1</td><td>AB, BA</td><td>{A, B}</td></tr><tr><td class="l">group 2</td><td>AC, CA</td><td>{A, C}</td></tr><tr><td class="l">group 3</td><td>BC, CB</td><td>{B, C}</td></tr></tbody>
                </table></div>
              <div class="ex">A 3-person committee from 8 people: \(C(8, 3) = 336 / 3! = 56\). A president, treasurer and secretary from 8 people: 336, because the roles make order matter.</div>
              <div class="tip">Ask one question first: would swapping two chosen items give a different outcome? If yes, order matters, so count permutations. If no, count combinations. Also \(C(n, r) = C(n, n - r)\): choosing who is in is the same as choosing who is out.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Lab: four ways to choose',
        kind: 'lab',
        html: String.raw`<p class="muted small">Draw \(r\) letters from the first \(n\) letters of the alphabet. The two switches give the four basic counting models. Every arrangement is listed in <span class="term">lexicographic order</span> (the order Python's <code>itertools</code> uses), next to the formula that counts them.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          let n = 5, r = 3, order = false, rep = false;
          const LET = 'ABCDEF';
          const nSeg = h('div.seg', { 'aria-label': 'n letters' }), rSeg = h('div.seg', { 'aria-label': 'r picks' });
          const oBtn = h('button.btn.sm', { onclick: () => { order = !order; draw(); } });
          const pBtn = h('button.btn.sm', { onclick: () => { rep = !rep; draw(); } });
          const cases = h('div.ct-cases');
          const expl = h('div.small');
          const gen = h('div.box.small', { style: { marginTop: 'auto' } });
          const head = h('div.small');
          const list = h('div.ct-list.fill');
          body.append(
            h('div.row', { style: { gap: '0.5rem' } }, h('span.small', 'n ='), nSeg, h('span.small', 'r ='), rSeg, h('span', { style: { width: '0.6rem' } }), oBtn, pBtn),
            h('div.fill.ct-arr', h('div.ct-side', cases, expl, gen), h('div.ct-side', head, list)));
          const label = (ix) => ix.map((i) => LET[i]).join('');
          function draw() {
            ctx.rc(nSeg, ...[2, 3, 4, 5, 6].map((k) => h('button', { 'aria-pressed': String(k === n), onclick: () => { n = k; draw(); } }, String(k))));
            ctx.rc(rSeg, ...[1, 2, 3, 4].map((k) => h('button', { 'aria-pressed': String(k === r), onclick: () => { r = k; draw(); } }, String(k))));
            oBtn.textContent = `Order matters: ${order ? 'yes' : 'no'}`; oBtn.classList.toggle('on', order); oBtn.setAttribute('aria-pressed', String(order));
            pBtn.textContent = `Repetition allowed: ${rep ? 'yes' : 'no'}`; pBtn.classList.toggle('on', rep); pBtn.setAttribute('aria-pressed', String(rep));
            const F = {
              on: { tex: String.raw`P(n,r) = \dfrac{n!}{(n-r)!}`, val: P(n, r), sub: r > n ? String.raw`P(${n},${r}) = 0` : String.raw`P(${n},${r}) = ${Array.from({ length: r }, (_, i) => n - i).join(' \\cdot ')} = ${P(n, r)}` },
              oy: { tex: String.raw`n^r`, val: n ** r, sub: String.raw`${n}^{${r}} = ${n ** r}` },
              nn: { tex: String.raw`C(n,r) = \dfrac{n!}{r!\,(n-r)!}`, val: C(n, r), sub: String.raw`C(${n},${r}) = \frac{P(${n},${r})}{${r}!} = \frac{${P(n, r)}}{${fact(r)}} = ${C(n, r)}` },
              ny: { tex: String.raw`C(n+r-1,\,r)`, val: C(n + r - 1, r), sub: String.raw`C(${n + r - 1},${r}) = ${C(n + r - 1, r)}` },
            };
            const k2 = order ? (rep ? 'oy' : 'on') : (rep ? 'ny' : 'nn');
            const cell = (k, title) => h('div', { class: k === k2 ? 'on' : '' }, h('div.tiny.muted', title), ctx.rich('div', `\\(${F[k].tex}\\)`));
            ctx.rc(cases,
              h('div.hd', ''), h('div.hd', 'no repetition'), h('div.hd', 'repetition'),
              h('div.hd', 'order matters'), cell('on', 'permutations'), cell('oy', 'strings'),
              h('div.hd', 'order does not'), cell('nn', 'combinations'), cell('ny', 'multisets'));
            const why = {
              on: `Fill ${r} slots in order: ${n} choices for the first, ${n - 1} for the second, and so on. The product rule multiplies them.`,
              oy: `Each of the ${r} slots can hold any of the ${n} letters, independently of the others, so the product rule gives ${n} multiplied by itself ${r} times.`,
              nn: `Each group of ${r} letters appears ${fact(r)} times among the ordered lists, once per order (shown faded after each group when r ≤ 3). Dividing by ${r}! leaves one entry per group.`,
              ny: `A multiset is fixed by how many copies of each letter it has. Write it as ${r} stars split by ${n - 1} bars, one gap per letter (shown under each item). Choosing which ${r} of the ${n + r - 1} symbols are stars gives the count.`,
            }[k2];
            const impossible = !rep && r > n;
            expl.innerHTML = String.raw`<p>\(${F[k2].sub}\)</p><p class="muted" style="margin-top:0.35rem">${impossible ? `Without repetition you cannot pick ${r} different letters from only ${n}, so the count is 0.` : why}</p>`;
            ctx.tex(expl);
            // the listing
            let items;
            if (order) items = rep ? product(n, r) : perms(n, r);
            else items = rep ? multisets(n, r) : combos(n, r);
            const rule = {
              on: 'Find the rightmost position whose letter can be swapped for a larger unused letter. Use the smallest such letter there, then fill the positions to its right with the smallest unused letters, in order.',
              oy: 'Count like an odometer in base n: advance the last position; when it passes the last letter, reset it to A and carry one position to the left.',
              nn: 'Find the rightmost letter that can still increase (it is not yet as large as its position allows). Increase it by one, and make every letter to its right the next letters in order.',
              ny: 'Find the rightmost letter that is not yet the last letter. Increase it by one and copy the new letter into every position to its right.',
            }[k2];
            gen.innerHTML = '';
            if (!impossible) {
              const firsts = items.slice(0, 5).map(label);
              gen.append(h('div.tiny.mono.muted', 'HOW A PROGRAM GENERATES THIS LIST'), h('p', { style: { margin: '0.2rem 0' } }, rule), h('div.mono', { style: { color: 'var(--accent)' } }, firsts.join(' → ') + ' → …'));
            }
            const grouped = !order && !rep && r <= 3 && r > 1;
            const twoLine = !order;
            const cap = grouped ? 24 : twoLine ? 56 : 150;
            const shown = items.slice(0, cap);
            head.innerHTML = `<b>${fmt(items.length)}</b> ${order ? (rep ? 'strings' : 'ordered arrangements') : rep ? 'multisets' : 'groups'} of ${r} from {${LET.slice(0, n).split('').join(', ')}}${items.length > cap ? `, first ${cap} shown` : ''}.`;
            ctx.rc(list, ...shown.map((ix) => {
              if (grouped) return h('span.it', h('b', `{${ix.map((i) => LET[i]).join(',')}}`), h('small', perms(r, r).map((pp) => pp.map((j) => LET[ix[j]]).join('')).join(' ')));
              if (!order && rep) {
                const cnt = Array.from({ length: n }, (_, i) => ix.filter((x) => x === i).length);
                return h('span.it', label(ix), h('small', cnt.map((c) => '★'.repeat(c)).join('|') || ' '));
              }
              if (!order) return h('span.it', `{${ix.map((i) => LET[i]).join(',')}}`);
              return h('span.it', label(ix));
            }), items.length > cap ? h('span.it', { style: { border: 0, background: 'none' } }, `… and ${fmt(items.length - cap)} more`) : null,
            impossible ? h('div.feedback.info', 'Nothing to list: there are not enough different letters.') : null);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Repetition: multisets and stars and bars',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="thm" data-label="Arrangements with repeated letters">If \(n\) objects include \(n_1\) identical copies of one kind, \(n_2\) of another, …, \(n_k\) of the last kind, the number of different arrangements is
                \[\frac{n!}{n_1!\, n_2! \cdots n_k!}.\]</div>
              <div class="ex">MISSISSIPPI has 11 letters: one M, four I, four S and two P.
                \[\frac{11!}{1!\,4!\,4!\,2!} = 34{,}650\]
                Why: tag the copies \(I_1, I_2, \dots\) so all 11 letters differ, which gives \(11!\) arrangements. Erasing the tags merges every \(4! \cdot 4! \cdot 2!\) of them into one word. Choosing positions gives the same count: \(C(11,1)\,C(10,4)\,C(6,4)\,C(2,2) = 11 \cdot 210 \cdot 15 \cdot 1\).</div>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">choose r from n</th><th>no repetition</th><th>repetition allowed</th></tr></thead>
                <tbody><tr><td class="l">order matters</td><td>\(P(n,r)\)</td><td>\(n^r\)</td></tr><tr><td class="l">order does not matter</td><td>\(C(n,r)\)</td><td>\(C(n+r-1,\ r)\)</td></tr></tbody>
              </table>
            </div>
            <div class="stack">
              <div class="thm" data-label="Combinations with repetition">Choosing \(r\) items from \(n\) types, where types may repeat and order does not matter, can be done in \(C(n + r - 1,\ r)\) ways. Each choice is a <span class="term">multiset</span>.</div>
              <div class="ex">Buy 5 donuts from 3 flavors: glazed, chocolate, jelly. Write each order as 5 stars and 2 bars: \(\star\star \mid \star \mid \star\star\) means 2 glazed, 1 chocolate and 2 jelly. Every order is one arrangement of 7 symbols, so there are \(C(7, 2) = 21\) orders. This <span class="term">stars and bars</span> count also gives the number of solutions of \(x_1 + x_2 + x_3 = 5\) in non-negative integers.</div>
              <div class="ai">A language model with a vocabulary of \(V = 50{,}000\) tokens allows \(V^3 = 1.25 \times 10^{14}\) three-token sequences (order matters, repeats allowed). No text collection contains more than a tiny fraction of them, so models must generalize instead of storing a count for every n-gram.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Code: counting formulas, checked by brute force',
        kind: 'code',
        file: 'counting.py',
        html: String.raw`<p class="muted small">The formulas from scratch, Python's built-ins, and a brute-force count with <code>itertools</code>: three independent answers that must agree.</p>`,
        fivew: {
          what: 'Computes P(5, 3) and C(5, 3) three ways each, shows the first combinations in lexicographic order, and counts the arrangements of MISSISSIPPI and the donut orders.',
          why: 'Checking a formula against direct enumeration on small inputs is the fastest way to catch a wrong model, such as counting ordered lists when the problem wants unordered groups.',
          who: 'Data scientists sizing a search space, test engineers generating every combination of options, and anyone estimating how long a brute-force job will take.',
          where: 'Hyperparameter searches, combinatorial test suites, probability calculations (Module 13), and feature-selection experiments.',
          when: 'Use math.perm and math.comb whenever you need a count. Use itertools only when you need the actual arrangements, and only for small sizes.',
        },
        lines: [
          ['from math import comb, factorial, perm', String.raw`Imports three functions from the standard <code>math</code> module: <code>comb(n, r)</code> for \(C(n,r)\), <code>perm(n, r)</code> for \(P(n,r)\) (both Python 3.8 or later), and <code>factorial(n)</code> for \(n!\). All three return exact integers.`],
          ['from itertools import combinations, permutations', String.raw`Imports two generators from <code>itertools</code>. They do not count anything; they produce the actual arrangements one at a time, in lexicographic order.`],
          ['', ''],
          ['def P(n, r):', String.raw`Defines our own permutation count from the formula, so we can compare it with the built-in version.`],
          ['    return factorial(n) // factorial(n - r)', String.raw`The formula \(P(n,r) = n!/(n-r)!\). The <code>//</code> operator is integer division, so the result stays an exact integer. For \(P(5,3)\): \(120 /\!/ 2 = 60\).`],
          ['', ''],
          ['ordered = list(permutations("ABCDE", 3))', String.raw`Builds every ordered arrangement of 3 of the 5 letters: <code>('A', 'B', 'C')</code>, <code>('A', 'B', 'D')</code>, and so on. <code>list(...)</code> collects everything the generator produces. That is fine for 60 items; design principle 4 explains why you would not do it for millions.`],
          ['groups = list(combinations("ABCDE", 3))', String.raw`Builds every unordered group of 3. Each group appears once, with its letters in sorted order, so <code>('B', 'A', 'C')</code> never shows up.`],
          ['print(P(5, 3), perm(5, 3), len(ordered))', String.raw`Three independent answers to "how many ordered arrangements of 3 of the 5 letters?": our formula, the built-in, and a brute-force count of the list. Output: <code>60 60 60</code>.`],
          ['print(P(5, 3) // factorial(3), comb(5, 3), len(groups))', String.raw`The same check for unordered groups. The first value is the divide-by-\(r!\) idea written out: \(C(5,3) = P(5,3)/3! = 60 /\!/ 6 = 10\), because every group appears \(3!\) times among the ordered arrangements. The division is always exact, so <code>//</code> loses nothing. Output: <code>10 10 10</code>.`],
          ['print(groups[:4])', String.raw`The slice <code>[:4]</code> shows the first four groups: ABC, ABD, ABE, ACD. That is lexicographic (dictionary) order. To get the next group, a program increases the rightmost letter that can still increase and resets the letters after it, the method the lab on slide 4 describes.`],
          ['word = factorial(11) // (factorial(4) ** 2 * factorial(2))', String.raw`Arrangements of a multiset: \(11!/(4!\,4!\,2!)\). <code>factorial(4) ** 2</code> covers the four I's and the four S's; the single M contributes \(1! = 1\). The result, 34650, is stored in <code>word</code>.`],
          ['print("MISSISSIPPI:", word, "donuts:", comb(5 + 3 - 1, 5))', String.raw`Prints the MISSISSIPPI count and the stars-and-bars count for 5 donuts from 3 flavors, \(C(5 + 3 - 1, 5) = C(7, 5) = 21\), which equals \(C(7, 2)\) by symmetry. Output: <code>MISSISSIPPI: 34650 donuts: 21</code>.`],
        ],
        expected: "60 60 60\n10 10 10\n[('A', 'B', 'C'), ('A', 'B', 'D'), ('A', 'B', 'E'), ('A', 'C', 'D')]\nMISSISSIPPI: 34650 donuts: 21\n",
        tryIt: 'Count the arrangements of BANANA (one B, three A, two N) with the same pattern, and check the answer by brute force with <code>len(set(permutations("BANANA")))</code>.',
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Pascal\'s triangle and Pascal\'s identity',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p>Arrange the binomial coefficients in rows: row \(n\) lists \(\binom{n}{0}, \binom{n}{1}, \dots, \binom{n}{n}\). The result is <span class="term">Pascal's triangle</span>. Row numbers are on the left.</p>
              <div class="card" style="padding:0.6rem 0.8rem">${miniTri}</div>
              <div class="thm" data-label="Pascal's identity">\(\displaystyle\binom{n+1}{k} = \binom{n}{k-1} + \binom{n}{k}\) for \(1 \le k \le n\). Each inner entry is the sum of the two entries above it: \(10 = 4 + 6\) in row 5.</div>
            </div>
            <div class="stack">
              <div class="ex" data-label="A combinatorial argument">A club has \(n + 1\) members, one of them named Ada. How many \(k\)-person committees are there? Directly, \(\binom{n+1}{k}\). Now split the committees by Ada. Committees that include Ada choose \(k - 1\) more people from the other \(n\): \(\binom{n}{k-1}\). Committees without Ada choose all \(k\) from the other \(n\): \(\binom{n}{k}\). The sum rule says the two counts agree, which proves the identity without any algebra. This style of proof is a <span class="term">combinatorial argument</span>.</div>
              <div class="thm">\(\displaystyle\sum_{k=0}^{n} \binom{n}{k} = 2^n\). Count the subsets of an \(n\)-element set two ways: grouped by size, or by an in/out decision for each element. Row 5: \(1 + 5 + 10 + 10 + 5 + 1 = 32\).</div>
              <div class="thm">Symmetry: \(\binom{n}{k} = \binom{n}{n-k}\). Choosing who is in is the same as choosing who is out, which is why every row reads the same in both directions.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: Pascal\'s triangle explorer',
        kind: 'lab',
        html: String.raw`<p class="muted small">Click any entry to see its two parents (Pascal's identity) and its row expanded as \((a + b)^n\). Color by remainder to reveal hidden structure: odd entries form the Sierpinski triangle.</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          let R = 12, sel = [6, 2], modBy = 0;
          const rowSeg = h('div.seg', { 'aria-label': 'Number of rows' }), modSeg = h('div.seg', { 'aria-label': 'Color by remainder' });
          const svg = s('svg', { role: 'img', 'aria-label': "Pascal's triangle; click an entry" });
          const info = h('div.ct-side');
          body.append(
            h('div.row', { style: { gap: '0.5rem' } }, h('span.small', 'Rows'), rowSeg, h('span', { style: { width: '0.6rem' } }), h('span.small', 'Color'), modSeg),
            h('div.fill.ct-pas', h('div.ct-svgbox', svg), info));
          function draw() {
            ctx.rc(rowSeg, ...[8, 12, 16, 32].map((k) => h('button', { 'aria-pressed': String(k === R), onclick: () => { R = k; if (sel[0] >= R) sel = [R - 1, Math.min(sel[1], R - 1)]; draw(); } }, String(k))));
            ctx.rc(modSeg, ...[[0, 'plain'], [2, 'odd / even'], [3, 'mod 3'], [5, 'mod 5']].map(([k, t]) => h('button', { 'aria-pressed': String(k === modBy), onclick: () => { modBy = k; draw(); } }, t)));
            const dx = 40, dy = 34, W = R * dx + 10, H = R * dy + 6;
            svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
            const showNum = R <= 16;
            const [sn, sk] = sel;
            const isParent = (n, k) => n === sn - 1 && (k === sk - 1 || k === sk);
            const kids = [];
            for (let n = 0; n < R; n++) {
              for (let k = 0; k <= n; k++) {
                const v = C(n, k);
                const x = W / 2 + (k - n / 2) * dx, y = 4 + n * dy;
                const res = modBy ? v % modBy : 0;
                let fill = 'var(--sheet)', fo = 1, stroke = 'var(--rule)', sw = 1;
                if (modBy && res) { fill = COLS[(res - 1) % COLS.length]; fo = 0.55; }
                if (isParent(n, k)) { stroke = 'var(--accent)'; sw = 3; if (!modBy) fill = 'var(--accent-2)'; }
                if (n === sn && k === sk) { fill = modBy ? fill : 'var(--mark)'; stroke = 'var(--ink)'; sw = 3; fo = modBy ? fo : 1; }
                const g = s('g', { style: 'cursor:pointer', onclick: () => { sel = [n, k]; draw(); } },
                  s('rect', { x: x - dx / 2 + 2, y, width: dx - 4, height: dy - 5, rx: 7, fill, 'fill-opacity': fo, stroke, 'stroke-width': sw }),
                  showNum ? s('text', { x, y: y + dy / 2 + 2, 'text-anchor': 'middle', 'font-size': v >= 1000 ? 10.5 : 13, 'font-weight': n === sn && k === sk ? 700 : 400, fill: 'var(--ink)', text: String(v) }) : null);
                g.append(s('title', { text: `C(${n}, ${k}) = ${v}` }));
                kids.push(g);
              }
            }
            ctx.rc(svg, ...kids);
            drawInfo();
          }
          function drawInfo() {
            const [n, k] = sel, v = C(n, k);
            const kidsI = [h('div', h('div.tiny.mono.muted', `ROW ${n}, POSITION ${k}`), ctx.rich('div.big-math', String.raw`\(\binom{${n}}{${k}} = ${tfmt(v)}\)`))];
            kidsI.push(ctx.rich('p.small', k === 0 || k === n
              ? String.raw`Edge entries are always 1: there is exactly one way to choose nothing, and one way to choose everything.`
              : String.raw`Pascal's identity: \(\binom{${n}}{${k}} = \binom{${n - 1}}{${k - 1}} + \binom{${n - 1}}{${k}} = ${tfmt(C(n - 1, k - 1))} + ${tfmt(C(n - 1, k))}\). The two parents are outlined.`));
            if (n <= 12) kidsI.push(ctx.rich('p.small', String.raw`From the formula: \(\dfrac{${n}!}{${k}!\,${n - k}!} = \dfrac{${tfmt(fact(n))}}{${tfmt(fact(k))} \cdot ${tfmt(fact(n - k))}} = ${tfmt(v)}\).`));
            kidsI.push(h('p.small', `Meaning: ${fmt(v)} ways to choose ${k} of ${n} items. It is also the number of paths from the top to this entry that step down-left or down-right: each path makes ${n} steps, and you choose which ${k} of them go right.`));
            if (n <= 9) {
              const terms = Array.from({ length: n + 1 }, (_, j) => {
                const c = C(n, j), pa = n - j, pb = j;
                const tex = `${c === 1 && (pa || pb) ? '' : c}${pa ? (pa === 1 ? 'a' : `a^{${pa}}`) : ''}${pb ? (pb === 1 ? 'b' : `b^{${pb}}`) : ''}`;
                const sp = h('span.tm', { class: j === k ? 'on' : '', title: `C(${n}, ${j}) a^${pa} b^${pb}`, onclick: () => { sel = [n, j]; draw(); } });
                sp.innerHTML = `\\(${j ? '+\\,' : ''}${tex}\\)`;
                return sp;
              });
              const box = h('div.ct-terms.small', h('span', { html: `\\((a+b)^{${n}} = \\)` }), ...terms);
              ctx.tex(box);
              kidsI.push(h('div', h('div.tiny.mono.muted', 'THIS ROW AS A BINOMIAL EXPANSION (CLICK A TERM)'), box));
            }
            kidsI.push(ctx.rich('p.small.muted', String.raw`Row ${n} adds up to \(2^{${n}} = ${tfmt(2 ** n)}\).`));
            if (modBy) kidsI.push(h('div.feedback.info', modBy === 2
              ? 'Odd entries are colored. The pattern is the Sierpinski triangle: C(n, k) is odd exactly when every 1-bit of k is also a 1-bit of n (Lucas\' theorem). Try 32 rows.'
              : `Colors show the remainder mod ${modBy}; blank entries are multiples of ${modBy}. Row ${modBy} is all multiples of ${modBy} except its two ends, because ${modBy} is prime.`));
            ctx.rc(info, ...kidsI);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'The Binomial Theorem',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="thm" data-label="The Binomial Theorem">For any numbers \(a, b\) and any integer \(n \ge 0\),
                \[(a+b)^n = \sum_{k=0}^{n} \binom{n}{k} a^{n-k} b^k.\]</div>
              <p>Why it holds: \((a+b)^n\) is the product of \(n\) factors \((a+b)(a+b)\cdots(a+b)\). Multiplying out means picking \(a\) or \(b\) from each factor and multiplying the picks. A term \(a^{n-k}b^k\) comes from picking \(b\) in exactly \(k\) of the \(n\) factors, and there are \(\binom{n}{k}\) ways to choose which factors those are.</p>
              <div class="ex">For \(n = 3\) the 8 pick sequences are aaa, aab, aba, baa, abb, bab, bba, bbb. Grouping them by the number of b's gives
                \[(a+b)^3 = a^3 + 3a^2b + 3ab^2 + b^3,\]
                and the coefficients 1, 3, 3, 1 are row 3 of Pascal's triangle.</div>
            </div>
            <div class="stack">
              <div class="ex" data-label="Worked example: one coefficient">Find the coefficient of \(x^3\) in \((2x - 3)^6\). Take \(a = 2x\) and \(b = -3\). The general term is \(\binom{6}{k}(2x)^{6-k}(-3)^k\). For \(x^3\) we need \(6 - k = 3\), so \(k = 3\):
                \[\binom{6}{3}\, 2^3\, (-3)^3 = 20 \cdot 8 \cdot (-27) = -4320.\]</div>
              <div class="thm">Plugging in numbers gives identities. With \(a = b = 1\): \(\sum_k \binom{n}{k} = 2^n\). With \(a = 1,\ b = -1\): \(\sum_k (-1)^k \binom{n}{k} = 0\) for \(n \ge 1\), so every nonempty set has as many even-sized subsets as odd-sized ones.</div>
              <div class="ai">With \(a = 1 - p\) and \(b = p\), each term \(\binom{n}{k} p^k (1-p)^{n-k}\) is the probability of exactly \(k\) successes in \(n\) independent tries (Module 13). That is how you find the chance that a majority vote of 5 independent classifiers, each right 80% of the time, is right: about 94%.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: binomial expansion calculator',
        kind: 'lab',
        html: String.raw`<p class="muted small">Set \(a\), \(b\) and \(n\) to expand \((ax + by)^n\), or switch off \(y\) for \((ax + b)^n\). Pick a power of \(x\) to watch its coefficient computed from the general term. Click a row of the table to pick it.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          let a = 2, b = -3, n = 6, j = 3, useY = false;
          const sl = {};
          const mk = (key, min, max, label) => {
            const out = h('output');
            const inp = h('input', { type: 'range', min, max, step: 1, value: { a, b, n, j }[key], 'aria-label': label });
            inp.addEventListener('input', () => { const v = +inp.value; if (key === 'a') a = v; else if (key === 'b') b = v; else if (key === 'n') { n = v; j = Math.min(j, n); } else j = v; draw(); });
            sl[key] = { inp, out };
            return [h('span', label), inp, out];
          };
          const yBtn = h('button.btn.sm', { onclick: () => { useY = !useY; draw(); } });
          const title = h('div.big-math', { style: { textAlign: 'left', fontSize: '1.2rem' } });
          const steps = h('div.small.stack', { style: { gap: '0.3rem' } });
          const expansion = h('div.small');
          const table = h('div');
          const check = h('div.small.muted');
          const note = h('div.small');
          body.append(h('div.fill.ct-bin',
            h('div.ct-side', title, h('div.ct-ctl', ...mk('a', -5, 5, 'a'), ...mk('b', -5, 5, 'b'), ...mk('n', 0, 10, 'n'), ...mk('j', 0, 10, 'power of x')), h('div.row', yBtn), h('div.card', { style: { padding: '0.5rem 0.75rem' } }, steps), note),
            h('div.ct-side', h('div', h('div.tiny.mono.muted', 'FULL EXPANSION'), expansion), table, check)));
          const xp = (p) => (p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`);
          const yp = (p) => (!useY || p === 0 ? '' : p === 1 ? 'y' : `y^{${p}}`);
          const par = (v) => (v < 0 ? `(${v})` : String(v));
          function draw() {
            sl.j.inp.max = n;
            for (const [k, v] of Object.entries({ a, b, n, j })) { sl[k].out.textContent = String(v); if (+sl[k].inp.value !== v) sl[k].inp.value = v; }
            yBtn.textContent = useY ? 'Second term: b·y (click for a constant b)' : 'Second term: constant b (click to add y)';
            yBtn.classList.toggle('on', useY);
            const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
            const by = useY ? (Math.abs(b) === 1 ? 'y' : `${Math.abs(b)}y`) : String(Math.abs(b));
            title.innerHTML = `\\((${ax} ${b < 0 ? '-' : '+'} ${by})^{${n}}\\)`;
            ctx.tex(title);
            const rows = Array.from({ length: n + 1 }, (_, k) => { const c = C(n, k), pa = a ** (n - k), pb = b ** k; return { k, c, pa, pb, coef: c * pa * pb, px: n - k, py: k }; });
            // full expansion as separate inline formulas so it can wrap between terms
            const nz = rows.filter((r) => r.coef !== 0);
            const termTex = (r, first) => {
              const mono = xp(r.px) + yp(r.py);
              const abs = Math.abs(r.coef);
              const num = abs === 1 && mono ? '' : tfmt(abs);
              const sign = r.coef < 0 ? (first ? '-' : '-\\,') : first ? '' : '+\\,';
              return `\\(${sign}${num}${mono}\\)`;
            };
            expansion.innerHTML = nz.length ? nz.map((r, i) => `<span style="white-space:nowrap">${termTex(r, i === 0)}</span>`).join(' ') : '\\(0\\)';
            ctx.tex(expansion);
            const k = n - j;
            ctx.rc(table, h('table.tt.ct-bt', { style: { width: '100%' } },
              h('thead', h('tr', h('th', 'k'), h('th', 'C(n,k)'), h('th', `a^(n−k)`), h('th', 'b^k'), h('th', 'coefficient'), h('th', 'term'))),
              h('tbody', rows.map((r) => {
                const tr = h('tr', { class: r.k === k ? 'hit' : '', onclick: () => { j = n - r.k; draw(); } }, h('td', String(r.k)), h('td', fmt(r.c)), h('td', fmt(r.pa)), h('td', fmt(r.pb)), h('td', fmt(r.coef)));
                const td = h('td', { html: `\\(${xp(r.px) + yp(r.py) || '1'}\\)` });
                ctx.tex(td);
                tr.append(td);
                return tr;
              }))));
            const r = rows[k];
            const target = useY ? `x^{${j}}y^{${n - j}}` : `x^{${j}}`;
            steps.innerHTML = String.raw`<div class="tiny mono muted">COEFFICIENT OF \(${target}\), STEP BY STEP</div>` +
              String.raw`<div>1. General term: \(T_k = \binom{${n}}{k}(${a}x)^{${n}-k}(${b}${useY ? 'y' : ''})^{k}\).</div>` +
              String.raw`<div>2. The power of \(x\) is \(${n} - k\). Set \(${n} - k = ${j}\), so \(k = ${k}\).</div>` +
              String.raw`<div>3. Substitute: \(\binom{${n}}{${k}} \cdot ${par(a)}^{${n - k}} \cdot ${par(b)}^{${k}} = ${tfmt(r.c)} \cdot ${par(r.pa)} \cdot ${par(r.pb)}\).</div>` +
              String.raw`<div>4. Coefficient: <b>\(${tfmt(r.coef)}\)</b>.</div>`;
            ctx.tex(steps);
            note.innerHTML = `The C(n,k) column is row ${n} of Pascal's triangle: ${rows.map((x) => x.c).join(', ')}. ` +
              (b < 0 && n > 0 ? `Because b is negative, b^k is negative for odd k, so the signs alternate. ` : '') +
              `<span class="muted">Every term is one way of choosing x from n − k factors and the other part from the remaining k.</span>`;
            const sum = rows.reduce((t, x) => t + x.coef, 0);
            check.innerHTML = String.raw`Check: setting \(x = ${useY ? 'y = ' : ''}1\) adds up all the coefficients, \(${tfmt(sum)}\), which must equal \((${a} ${b < 0 ? '-' : '+'} ${Math.abs(b)})^{${n}} = ${tfmt((a + b) ** n)}\). ${sum === (a + b) ** n ? '✓' : ''}`;
            ctx.tex(check);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Code: building Pascal\'s triangle row by row',
        kind: 'code',
        file: 'pascal.py',
        html: String.raw`<p class="muted small">Each new row comes from Pascal's identity applied to the row above. Use <b>Trace</b> to watch <code>rows</code> grow one row per loop.</p>`,
        fivew: {
          what: 'Builds rows 0 to n of Pascal\'s triangle with additions only, prints the first five rows as a triangle, expands (a + b)⁴, and finds a coefficient of (2x − 3)⁶.',
          why: 'Building the triangle uses only addition and computes every entry exactly once. That is dynamic programming: store the answers to smaller problems and reuse them.',
          who: 'Anyone who needs many binomial coefficients at once, such as probability tables, polynomial expansion in a computer algebra system, or counting paths on a grid.',
          where: 'Probability libraries computing binomial distributions, image filters (Gaussian blur kernels approximate a Pascal row), and grid-path counting in robotics and games.',
          when: 'Use the triangle when you need a whole row or many entries. For a single coefficient, math.comb(n, k) is simpler and just as exact.',
        },
        lines: [
          ['def pascal(n):', String.raw`Defines a function that returns rows 0 through \(n\) of Pascal's triangle as a list of lists.`],
          ['    rows = [[1]]', String.raw`Starts with row 0, which is just \([1]\) because \(\binom{0}{0} = 1\). Every later row is built from the one before it.`],
          ['    for i in range(1, n + 1):', String.raw`Builds rows 1, 2, …, \(n\) in order. <code>range(1, n + 1)</code> stops before \(n + 1\), so the last row built is row \(n\).`],
          ['        up = rows[-1]', String.raw`<code>rows[-1]</code> is the last row built so far, the row <i>up</i> above the one we are about to make. For \(i = 5\) it is <code>[1, 4, 6, 4, 1]</code>.`],
          ['        mid = [up[k - 1] + up[k] for k in range(1, i)]', String.raw`Pascal's identity in one line: inner entry \(k\) is the sum of entries \(k - 1\) and \(k\) of the row above. For row 5: \(1+4,\ 4+6,\ 6+4,\ 4+1\), giving <code>[5, 10, 10, 5]</code>. Row \(i\) has \(i - 1\) inner entries.`],
          ['        rows.append([1] + mid + [1])', String.raw`Puts a 1 on each end (the edges are always \(\binom{i}{0} = \binom{i}{i} = 1\)) and adds the finished row to the list.`],
          ['    return rows', String.raw`Returns the whole triangle. Each entry was computed once, with a single addition. Storing smaller answers to reuse them is called dynamic programming.`],
          ['', ''],
          ['for row in pascal(4):', String.raw`Builds rows 0 to 4 and loops over them to print each one.`],
          ['    print(" ".join(map(str, row)).center(13).rstrip())', String.raw`<code>map(str, row)</code> turns the numbers into text, <code>" ".join</code> glues them with spaces, <code>.center(13)</code> pads both sides so the rows line up as a triangle, and <code>.rstrip()</code> drops the padding on the right. The first line printed is <code>      1</code>.`],
          ['', ''],
          ['terms = [f"{c}·a^{4-k}·b^{k}" for k, c in enumerate(row)]', String.raw`After a loop ends, its variable keeps its last value, so <code>row</code> is still row 4, <code>[1, 4, 6, 4, 1]</code>: the coefficients of \((a + b)^4\). <code>enumerate</code> pairs each coefficient <code>c</code> with its position <code>k</code>, and the f-string writes the term \(\binom{4}{k} a^{4-k} b^k\) as text, such as <code>6·a^2·b^2</code>. This is the Binomial Theorem as code.`],
          ['print(" + ".join(terms))', String.raw`Joins the five terms with plus signs. Output: <code>1·a^4·b^0 + 4·a^3·b^1 + 6·a^2·b^2 + 4·a^1·b^3 + 1·a^0·b^4</code>, which is \(a^4 + 4a^3b + 6a^2b^2 + 4ab^3 + b^4\).`],
          ['print("x^3 coefficient:", pascal(6)[6][3] * 2**3 * (-3)**3)', String.raw`The worked example from the Binomial Theorem slide, the coefficient of \(x^3\) in \((2x - 3)^6\): \(\binom{6}{3} \cdot 2^3 \cdot (-3)^3\). <code>pascal(6)[6][3]</code> is 20, so the product is \(20 \cdot 8 \cdot (-27) = -4320\). The parentheses in <code>(-3)**3</code> matter: <code>-3**3</code> means \(-(3^3)\). Output: <code>x^3 coefficient: -4320</code>.`],
        ],
        expected: '      1\n     1 1\n    1 2 1\n   1 3 3 1\n  1 4 6 4 1\n1·a^4·b^0 + 4·a^3·b^1 + 6·a^2·b^2 + 4·a^1·b^3 + 1·a^0·b^4\nx^3 coefficient: -4320\n',
        tryIt: 'Print <code>pascal(10)[10]</code> and check that it sums to \\(2^{10} = 1024\\). Then change the last line to find the coefficient of \\(x^2\\) in \\((2x - 3)^6\\) (you need <code>[6][4]</code>, \\(2^2\\) and \\((-3)^4\\)).',
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Lab: the pigeonhole principle',
        kind: 'lab',
        html: String.raw`<div class="split"><div class="def">The <span class="term">pigeonhole principle</span>. If \(n\) items go into \(k\) boxes and \(n \gt k\), then some box holds at least two items.</div><div class="thm" data-label="Generalized pigeonhole principle">If \(n\) items go into \(k\) boxes, some box holds at least \(\lceil n/k \rceil\) items. If every box held fewer, the total would be below \(k \cdot n/k = n\).</div></div>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const SCEN = [
            { name: 'Birth months', n: 13, k: 12, labels: 'JFMAMJJASOND'.split(''), item: 'people' },
            { name: 'Sock colors', n: 4, k: 3, labels: ['black', 'white', 'gray'], item: 'socks' },
            { name: 'Remainders mod 5', n: 6, k: 5, labels: ['0', '1', '2', '3', '4'], item: 'integers' },
            { name: 'Custom', n: 25, k: 7, labels: null, item: 'items' },
          ];
          let sc = 0, n = 13, k = 12, mode = 'random', boxes = [];
          const scSeg = h('div.seg', { 'aria-label': 'Scenario' });
          const sl = {};
          const mk = (key, min, max, label) => {
            const out = h('output');
            const inp = h('input', { type: 'range', min, max, step: 1, value: key === 'n' ? n : k, 'aria-label': label });
            inp.addEventListener('input', () => { if (key === 'n') n = +inp.value; else k = +inp.value; sc = 3; drop(); });
            sl[key] = { inp, out };
            return [h('span', label), inp, out];
          };
          const svg = s('svg', { viewBox: '0 0 520 230', role: 'img', 'aria-label': 'Boxes with the items dropped into them', style: 'width:100%;height:auto;max-height:100%;display:block' });
          const info = h('div.ct-side');
          body.append(
            h('div.row', { style: { gap: '0.45rem' } }, scSeg, h('span', { style: { flex: 1 } }),
              h('button.btn.sm.primary', { onclick: () => { mode = 'random'; drop(); } }, 'Drop randomly ↻'),
              h('button.btn.sm', { onclick: () => { mode = 'even'; drop(); } }, 'Spread as evenly as possible')),
            h('div.fill.ct-ph', h('div.ct-side', h('div.ct-ctl', ...mk('n', 1, 60, 'items n'), ...mk('k', 1, 20, 'boxes k')), svg), info));
          function drop() {
            boxes = new Array(k).fill(0);
            if (mode === 'even') for (let i = 0; i < n; i++) boxes[i % k]++;
            else for (let i = 0; i < n; i++) boxes[ctx.R.int(0, k - 1)]++;
            draw();
          }
          function draw() {
            ctx.rc(scSeg, ...SCEN.map((x, i) => h('button', { 'aria-pressed': String(i === sc), onclick: () => { sc = i; if (i < 3) { n = x.n; k = x.k; } drop(); } }, x.name)));
            for (const [key, v] of Object.entries({ n, k })) { sl[key].out.textContent = String(v); sl[key].inp.value = v; }
            const S = SCEN[sc];
            const labels = S.labels && S.labels.length === k ? S.labels : null;
            const need = Math.ceil(n / k), most = Math.max(...boxes);
            const colW = 500 / k;
            let rad = Math.min(9, colW / 2 - 3);
            const fits = (rr) => { const per = Math.max(1, Math.floor((colW - 6) / (2 * rr + 2))); return Math.ceil(most / per) * (2 * rr + 2) <= 168; };
            while (rad > 2 && !fits(rad)) rad -= 0.5;
            const per = Math.max(1, Math.floor((colW - 6) / (2 * rad + 2)));
            const kids = [];
            boxes.forEach((c, i) => {
              const x0 = 10 + i * colW, full = c === most && c >= need;
              kids.push(s('rect', { x: x0 + 2, y: 22, width: colW - 4, height: 178, rx: 6, fill: full ? 'var(--mark)' : 'var(--sheet)', 'fill-opacity': full ? 0.55 : 1, stroke: full ? 'var(--accent)' : 'var(--rule)', 'stroke-width': full ? 2.4 : 1.2 }));
              for (let t = 0; t < c; t++) {
                const row = Math.floor(t / per), col = t % per;
                const usedW = Math.min(c, per) * (2 * rad + 2);
                const cx = x0 + colW / 2 - usedW / 2 + rad + 1 + col * (2 * rad + 2);
                kids.push(s('circle', { cx, cy: 196 - rad - row * (2 * rad + 2), r: rad, fill: full ? 'var(--accent)' : 'var(--fnc)', 'fill-opacity': 0.8 }));
              }
              kids.push(s('text', { x: x0 + colW / 2, y: 15, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': full ? 700 : 400, fill: full ? 'var(--accent)' : 'var(--ink-2)', text: String(c) }));
              kids.push(s('text', { x: x0 + colW / 2, y: 216, 'text-anchor': 'middle', 'font-size': labels && labels[0].length > 2 ? 10 : 11, fill: 'var(--ink-3)', text: labels ? labels[i] : String(i + 1) }));
            });
            ctx.rc(svg, ...kids);
            const apps = [
              ['Birth months', '13 people always include two with the same birth month: 13 items, 12 boxes.'],
              ['Socks', 'With 3 colors in a drawer, 4 socks always include a matching pair.'],
              ['Remainders', 'Any 6 integers include two with the same remainder mod 5, so their difference is a multiple of 5.'],
              ['Compression', 'No lossless compressor shrinks every file: there are \\(2^n\\) files of \\(n\\) bits but only \\(2^n - 1\\) shorter bit strings.'],
              ['Hashing', 'A hash table with more keys than buckets must have a collision, however clever the hash function.'],
            ];
            ctx.rc(info,
              ctx.rich('div.big-math', String.raw`\(\lceil ${n}/${k} \rceil = ${need}\)`),
              ctx.rich('p.small', String.raw`With ${n} ${S.item} in ${k} boxes, some box must hold at least <b>${need}</b>. ${mode === 'even' ? `This is the most even spread possible, and its fullest box holds exactly ${most}: the bound cannot be improved.` : `This random drop put <b>${most}</b> in the fullest box${most > need ? `, more than the guaranteed ${need}` : ''}. Press <b>Spread as evenly as possible</b> to see the best case still reach ${need}.`}`),
              n <= k ? h('p.small.muted', `With ${n} ≤ ${k} every item can have a box of its own, so no repeat is guaranteed.`) : null,
              h('div', h('div.tiny.mono.muted', 'WHERE THE PRINCIPLE IS USED'), h('ul.small', { style: { marginTop: '0.2rem' } }, apps.map(([t, d]) => { const li = h('li', h('b', t + ': '), h('span', { html: d })); ctx.tex(li); return li; }))));
          }
          drop();
        },
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: counting before computing',
        kind: 'design',
        html: String.raw`<p class="muted small">Counting is the cheapest analysis you can run on a problem. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Count before you brute-force',
            html: '<p>Before looping over every possibility, compute how many there are. Ordering 20 cities gives \\(20! \\approx 2.4 \\times 10^{18}\\) routes; at a billion routes per second that takes 77 years. A one-line count tells you to choose a smarter algorithm before you waste a day of computing.</p>',
            bad: 'for route in permutations(cities):    # 20 cities\n    best = min(best, length(route))    # 77 years',
            good: 'from math import factorial\nprint(f"{factorial(len(cities)):.2e} routes")\n# 2.43e+18: use a heuristic or dynamic programming',
          },
          {
            name: 'Decide order and repetition first',
            html: '<p>Most counting bugs come from the wrong model, not from bad arithmetic. Before you write a formula, answer two questions: does order matter, and may items repeat? The answers pick the formula. Writing the decision in a comment lets a reviewer check it.</p>',
            good: '# order?  repeat?  formula       Python\n# yes     no       n!/(n-r)!     perm(n, r)\n# yes     yes      n**r          n ** r\n# no      no       C(n, r)       comb(n, r)\n# no      yes      C(n+r-1, r)   comb(n + r - 1, r)',
          },
          {
            name: 'Use math.comb, not factorial division',
            html: '<p><code>factorial(n) / (factorial(k) * factorial(n - k))</code> uses true division and returns a float. A float keeps only about 16 significant digits, so large counts come out wrong, and the huge factorials waste time. <code>math.comb</code> returns the exact integer quickly.</p>',
            bad: 'from math import factorial as f\nc = f(100) / (f(50) * f(50))   # 1.008913445455642e+29',
            good: 'from math import comb\nc = comb(100, 50)   # exact: 100891344545564193334812497256',
          },
          {
            name: 'Generate lazily with itertools',
            html: '<p><code>itertools.combinations</code> and <code>permutations</code> produce one item at a time. Wrapping them in <code>list()</code> builds everything in memory at once: all pairs of a million users is about \\(5 \\times 10^{11}\\) tuples. Loop over the generator directly and stop as soon as you have what you need.</p>',
            bad: 'pairs = list(combinations(users, 2))  # 5e11 tuples\nfor a, b in pairs:\n    check(a, b)',
            good: 'for a, b in combinations(users, 2):   # one at a time\n    if similar(a, b):\n        report(a, b)',
          },
          {
            name: 'Avoid double counting with a canonical form',
            html: '<p>Unordered things need one standard way to be written down, or each gets counted several times. A pair found by a double loop appears twice, as \\((a, b)\\) and \\((b, a)\\). Loop over <code>combinations</code> (or require <code>i &lt; j</code>), and store unordered groups as sorted tuples, so each has exactly one representation.</p>',
            bad: 'count = 0\nfor a in people:\n    for b in people:\n        if a != b and friends(a, b):\n            count += 1     # every pair counted twice',
            good: 'for a, b in combinations(people, 2):   # each pair once\n    ...\nseen.add(tuple(sorted(hand)))   # one key per hand',
          },
          {
            name: 'Check formulas against brute force on small cases',
            html: '<p>Before trusting a formula for \\(n = 1000\\), compare it with direct enumeration for \\(n = 1, 2, 3, 4\\). If they disagree, the formula or the model is wrong. This catches off-by-one mistakes such as \\(C(n + r, r)\\) in place of \\(C(n + r - 1, r)\\).</p>',
            good: 'from itertools import combinations_with_replacement as cwr\nfor n in range(1, 6):\n    for r in range(5):\n        assert comb(n + r - 1, r) == len(list(cwr(range(n), r)))',
          },
          {
            name: 'Memoize repeated binomials',
            html: '<p>A recursion written straight from Pascal\'s identity recomputes the same entries again and again: \\(C(30, 15)\\) takes over 300 million calls. Caching each answer (memoization) or building the triangle row by row computes every entry once.</p>',
            bad: 'def C(n, k):\n    if k in (0, n):\n        return 1\n    return C(n - 1, k - 1) + C(n - 1, k)   # exponential',
            good: 'from functools import cache\n@cache\ndef C(n, k):\n    if k in (0, n):\n        return 1\n    return C(n - 1, k - 1) + C(n - 1, k)   # each once',
          },
          {
            name: 'Size secrets with the product rule',
            html: '<p>A password space holds \\(\\text{alphabet}^{\\text{length}}\\) strings, so length beats complexity. Eight characters from all 94 printable symbols give \\(94^8 \\approx 6.1 \\times 10^{15}\\). Five random words from a 7,776-word list give \\(7776^5 \\approx 2.8 \\times 10^{19}\\), over 4,000 times more, and they are easier to remember. Every pick must be truly random.</p>',
            good: 'print(f"{94 ** 8:.1e}")     # 6.1e+15: 8 random symbols\nprint(f"{7776 ** 5:.1e}")   # 2.8e+19: 5 random words\n# pick with secrets.choice, never with random',
          },
        ],
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: counting and the Binomial Theorem',
        kind: 'practice',
        html: String.raw`<p class="muted small">Every answer is a whole number. Large numbers can be typed with or without commas.</p>`,
        gens: [
          {
            label: 'Counting rules',
            make(R) {
              const kind = R.int(0, 3);
              if (kind === 0) {
                const l = R.int(2, 3), d = R.int(2, 4), norep = R.chance(0.5);
                const ans = (norep ? P(26, l) : 26 ** l) * 10 ** d;
                return {
                  prompt: `A code is ${l} letters (A to Z) followed by ${d} digits (0 to 9)${norep ? ', and the letters must all be different' : ''}. How many codes are possible?`,
                  answer: ans,
                  hint: 'one factor per position (product rule).',
                  solution: String.raw`Product rule, one factor per position: \(${norep ? Array.from({ length: l }, (_, i) => 26 - i).join(' \\cdot ') : `26^{${l}}`} \cdot 10^{${d}} = ${tfmt(ans)}\).${norep ? ' Each letter has one fewer choice than the one before, because repeats are not allowed.' : ''}`,
                };
              }
              if (kind === 1) {
                const st = R.int(3, 6), mn = R.int(3, 8), combo = R.int(2, 6);
                return {
                  prompt: `A menu offers either a two-course meal (one of ${st} starters, then one of ${mn} mains) or one of ${combo} single-dish specials. How many different orders are possible?`,
                  answer: st * mn + combo,
                  hint: 'the two kinds of order do not overlap (sum rule); count each kind first.',
                  solution: String.raw`Two-course meals: \(${st} \cdot ${mn} = ${st * mn}\) by the product rule. Specials: ${combo}. The groups do not overlap, so the sum rule gives \(${st * mn} + ${combo} = ${st * mn + combo}\).`,
                };
              }
              if (kind === 2) {
                const N = R.pick([50, 60, 100, 120, 200, 500]);
                let a = R.pick([2, 3, 4, 5, 6, 7]), b = R.pick([3, 4, 5, 6, 7, 9, 10]);
                if (a === b) b = a + 1;
                const L = lcm(a, b), ans = Math.floor(N / a) + Math.floor(N / b) - Math.floor(N / L);
                return {
                  prompt: `How many integers from 1 to ${N} are divisible by ${a} or by ${b}?`,
                  answer: ans,
                  hint: 'inclusion–exclusion; the overlap is the multiples of lcm(a, b).',
                  solution: String.raw`\(\lfloor ${N}/${a} \rfloor + \lfloor ${N}/${b} \rfloor - \lfloor ${N}/${L} \rfloor = ${Math.floor(N / a)} + ${Math.floor(N / b)} - ${Math.floor(N / L)} = ${ans}\). The overlap is the multiples of \(\operatorname{lcm}(${a}, ${b}) = ${L}\), which were counted twice.`,
                };
              }
              const t = R.int(2, 6), k = R.pick([12, 7, 5, 4, 10]);
              const what = { 12: 'birth month', 7: 'day of the week', 5: 'final grade (A to F without E)', 4: 'suit (in a deck of cards)', 10: 'last digit of their phone number' }[k];
              const ans = k * (t - 1) + 1;
              return {
                prompt: `What is the smallest number of people that guarantees at least ${t} of them share the same ${what} (${k} possibilities)?`,
                answer: ans,
                hint: `with ${k} boxes, how many people fit with at most ${t - 1} in every box?`,
                solution: String.raw`Up to \(${k} \cdot ${t - 1} = ${k * (t - 1)}\) people can be spread with at most ${t - 1} per box. One more person forces some box to reach ${t}: \(${ans}\). Check with the generalized principle: \(\lceil ${ans}/${k} \rceil = ${t}\).`,
              };
            },
          },
          {
            label: 'Permutations & combinations',
            make(R) {
              const kind = R.int(0, 4);
              if (kind === 0) {
                const n = R.int(6, 15), r = R.int(2, 4);
                const roles = ['president', 'vice president', 'treasurer', 'secretary'].slice(0, r);
                return { prompt: `A club of ${n} members elects a ${roles.join(', ')}. Nobody holds two offices. In how many ways can the offices be filled?`, answer: P(n, r), hint: 'the roles are different, so order matters.', solution: String.raw`The offices are different, so order matters: \(P(${n}, ${r}) = ${Array.from({ length: r }, (_, i) => n - i).join(' \\cdot ')} = ${tfmt(P(n, r))}\).` };
              }
              if (kind === 1) {
                const n = R.int(6, 15), r = R.int(2, 5);
                return { prompt: `In how many ways can a committee of ${r} be chosen from ${n} people?`, answer: C(n, r), hint: 'committee members have no roles, so order does not matter.', solution: String.raw`Order does not matter: \(C(${n}, ${r}) = \dfrac{P(${n}, ${r})}{${r}!} = \dfrac{${tfmt(P(n, r))}}{${fact(r)}} = ${tfmt(C(n, r))}\).` };
              }
              if (kind === 2) {
                const n = R.int(4, 8);
                return { prompt: `In how many different orders can ${n} different books stand on a shelf?`, answer: fact(n), hint: 'all of them are arranged, so this is n!.', solution: String.raw`Every book is placed, so this is \(P(${n}, ${n}) = ${n}! = ${tfmt(fact(n))}\).` };
              }
              if (kind === 3) {
                const n = R.int(5, 10), r = 3;
                return { prompt: `${n} runners race. How many different gold-silver-bronze results are possible?`, answer: P(n, r), hint: 'the medals are different, so order matters.', solution: String.raw`\(P(${n}, 3) = ${n} \cdot ${n - 1} \cdot ${n - 2} = ${P(n, 3)}\).` };
              }
              const w = R.int(4, 8), m = R.int(4, 8), r = R.int(3, 5), x = R.int(1, r - 1);
              const ans = C(w, x) * C(m, r - x);
              return {
                prompt: `A team of ${r} is chosen from ${w} women and ${m} men. How many teams have exactly ${x} wom${x === 1 ? 'an' : 'en'}?`,
                answer: ans,
                hint: 'choose the women and the men separately, then use the product rule.',
                solution: String.raw`Choose the women, then the men: \(C(${w}, ${x}) \cdot C(${m}, ${r - x}) = ${C(w, x)} \cdot ${C(m, r - x)} = ${tfmt(ans)}\).`,
              };
            },
          },
          {
            label: 'Repetition',
            make(R) {
              const kind = R.int(0, 2);
              if (kind === 0) {
                const word = R.pick(['BANANA', 'LETTER', 'PEPPER', 'ASSESS', 'COMMITTEE', 'TENNESSEE', 'STATISTICS', 'BOOKKEEPER', 'MAMMAL', 'SUCCESS']);
                const cnt = {};
                for (const ch of word) cnt[ch] = (cnt[ch] || 0) + 1;
                const reps = Object.entries(cnt).filter(([, c]) => c > 1);
                const den = reps.reduce((t, [, c]) => t * fact(c), 1);
                const ans = fact(word.length) / den;
                return {
                  prompt: `How many different arrangements of the letters of ${word} are there?`,
                  answer: ans,
                  hint: 'divide n! by the factorial of each repeat count.',
                  solution: String.raw`${word} has ${word.length} letters with repeats ${reps.map(([ch, c]) => `${ch} ×${c}`).join(', ')}. Arrangements: \(\dfrac{${word.length}!}{${reps.map(([, c]) => `${c}!`).join('\\,')}} = \dfrac{${tfmt(fact(word.length))}}{${tfmt(den)}} = ${tfmt(ans)}\).`,
                };
              }
              if (kind === 1) {
                const n = R.int(3, 6), r = R.int(4, 10);
                return {
                  prompt: `A shop sells ${n} kinds of bagels. How many ways are there to buy ${r} bagels (order does not matter, kinds may repeat)?`,
                  answer: C(n + r - 1, r),
                  hint: 'stars and bars: r stars and n − 1 bars.',
                  solution: String.raw`Stars and bars: ${r} stars (bagels) and ${n - 1} bars (dividers between kinds), so choose the bar positions among \(${n + r - 1}\) symbols: \(C(${n + r - 1}, ${n - 1}) = ${tfmt(C(n + r - 1, r))}\).`,
                };
              }
              const k = R.int(2, 5), total = R.int(4, 12);
              return {
                prompt: String.raw`How many solutions does \(${Array.from({ length: k }, (_, i) => `x_{${i + 1}}`).join(' + ')} = ${total}\) have in non-negative integers?`,
                answer: C(total + k - 1, k - 1),
                hint: 'each solution is an arrangement of stars (units) and bars (dividers between variables).',
                solution: String.raw`Write ${total} as stars split by ${k - 1} bars into ${k} groups (a group may be empty). The count is \(C(${total} + ${k} - 1,\ ${k} - 1) = C(${total + k - 1}, ${k - 1}) = ${tfmt(C(total + k - 1, k - 1))}\).`,
              };
            },
          },
          {
            label: 'Binomial theorem',
            make(R) {
              const kind = R.int(0, 2);
              if (kind === 0) {
                const a = R.pick([1, 2, 3, -1, -2]), b = R.pick([1, 2, 3, -1, -2, -3]), n = R.int(3, 7), j = R.int(1, n - 1);
                const k = n - j, ans = C(n, k) * a ** j * b ** k;
                const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
                const par = (v) => (v < 0 ? `(${v})` : String(v));
                return {
                  prompt: String.raw`Find the coefficient of \(x^{${j}}\) in \((${ax} ${b < 0 ? '-' : '+'} ${Math.abs(b)})^{${n}}\).`,
                  answer: ans,
                  hint: String.raw`the general term is \(\binom{${n}}{k}(${ax})^{${n}-k}(${b})^k\); match the power of \(x\).`,
                  solution: String.raw`General term: \(\binom{${n}}{k}(${ax})^{${n}-k}(${b})^k\). The power of \(x\) is \(${n} - k = ${j}\), so \(k = ${k}\). Coefficient: \(\binom{${n}}{${k}} \cdot ${par(a)}^{${j}} \cdot ${par(b)}^{${k}} = ${C(n, k)} \cdot ${par(a ** j)} \cdot ${par(b ** k)} = ${tfmt(ans)}\).`,
                };
              }
              if (kind === 1) {
                const n = R.int(4, 10), j = R.int(1, n - 1);
                return {
                  prompt: String.raw`What is the coefficient of \(x^{${j}}y^{${n - j}}\) in \((x + y)^{${n}}\)?`,
                  answer: C(n, j),
                  hint: 'choose which factors contribute an x.',
                  solution: String.raw`Choose the ${j} factors (out of ${n}) that contribute \(x\); the rest contribute \(y\). That is \(\binom{${n}}{${j}} = ${C(n, j)}\), entry ${j} of row ${n} in Pascal's triangle.`,
                };
              }
              const a = R.int(1, 3), b = R.pick([1, 2, -1, -2, -3]), n = R.int(3, 8);
              const s = (a + b) ** n;
              return {
                prompt: String.raw`What is the sum of all the coefficients of \((${a === 1 ? '' : a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)})^{${n}}\) after it is fully expanded?`,
                answer: s,
                hint: 'substitute x = 1.',
                solution: String.raw`Setting \(x = 1\) turns every term into its coefficient, so the sum is \((${a} ${b < 0 ? '-' : '+'} ${Math.abs(b)})^{${n}} = ${a + b < 0 ? `(${a + b})` : a + b}^{${n}} = ${tfmt(s)}\).`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: counting',
        kind: 'quiz',
        questions: [
          { q: 'How many 4-digit PINs are possible if each digit is 0 to 9 and digits may repeat?', choices: ['10,000', '5,040', '210', '40'], answer: 0, explain: String.raw`Four positions with 10 choices each: \(10^4 = 10{,}000\) by the product rule. 5,040 would be the count without repeats, \(P(10, 4)\).` },
          { q: 'In how many ways can 8 runners take gold, silver and bronze?', choices: ['56', '336', '512', '24'], answer: 1, explain: String.raw`Order matters and nobody wins twice: \(P(8, 3) = 8 \cdot 7 \cdot 6 = 336\). 56 is \(C(8, 3)\), which ignores who got which medal.` },
          { q: 'How many 5-card hands can be dealt from a 52-card deck?', choices: ['2,598,960', '311,875,200', '380,204,032', '260'], answer: 0, explain: String.raw`A hand is unordered: \(C(52, 5) = 311{,}875{,}200 / 5! = 2{,}598{,}960\). The count 311,875,200 is \(P(52, 5)\), which treats the same five cards dealt in a different order as a different hand; 380,204,032 is \(52^5\), which allows the same card to be dealt twice.` },
          { q: 'How many different arrangements do the letters of BANANA have?', choices: ['720', '60', '120', '36'], answer: 1, explain: String.raw`Six letters with A three times and N twice: \(6!/(3!\,2!) = 720/12 = 60\).` },
          { q: 'In how many ways can you buy 6 donuts from 4 flavors (order does not matter, flavors may repeat)?', choices: ['84', '4,096', '15', '360'], answer: 0, explain: String.raw`Stars and bars: 6 stars and 3 bars, so \(C(9, 3) = 84\). 4,096 is \(4^6\), which counts ordered sequences.` },
          { q: String.raw`Which binomial coefficient equals \(\binom{9}{3} + \binom{9}{4}\)?`, choices: [String.raw`\(\binom{10}{4}\)`, String.raw`\(\binom{9}{7}\)`, String.raw`\(\binom{18}{7}\)`, String.raw`\(\binom{10}{7}\)`], answer: 0, explain: String.raw`Pascal's identity with \(n = 9\), \(k = 4\): \(\binom{9}{3} + \binom{9}{4} = \binom{10}{4} = 84 + 126 = 210\).` },
          { q: String.raw`What is the coefficient of \(x^2 y^3\) in \((x + 2y)^5\)?`, choices: ['10', '80', '40', '32'], answer: 1, explain: String.raw`The term with \(y^3\) is \(\binom{5}{3} x^2 (2y)^3 = 10 \cdot 8\, x^2y^3 = 80x^2y^3\). Forgetting the \(2^3\) gives 10.` },
          { q: 'How many integers from 1 to 60 are divisible by 2 or by 3?', choices: ['50', '40', '10', '30'], answer: 1, explain: String.raw`Inclusion–exclusion: \(30 + 20 - 10 = 40\), where the 10 multiples of 6 were counted in both groups.` },
          { q: 'What is the smallest group that guarantees 3 people share a birth month?', choices: ['25', '24', '36', '13'], answer: 0, explain: String.raw`24 people can be spread 2 per month. The 25th forces a third into some month: \(\lceil 25/12 \rceil = 3\).` },
          { q: 'Which Python expression counts the 5-card hands exactly and efficiently?', choices: ['<code>factorial(52) / (factorial(5) * factorial(47))</code>', '<code>math.comb(52, 5)</code>', '<code>len(list(combinations(range(52), 5)))</code>', '<code>52 ** 5 / 120</code>'], answer: 1, explain: String.raw`<code>math.comb</code> returns the exact integer directly. The first uses float division, the third builds 2.6 million tuples in memory just to count them, and the last uses the wrong model.` },
        ],
      },
    ],
  });
})();
