/* Module 0: Welcome. The opening hero, how the lab works, the course map, and objective coverage. */

/* ---- worked-example generators for this module: both examples exist to teach the example player
   itself (Step, Play, prediction checkpoints, the preset switcher, the checked answer banner) on
   small pieces of real course math. Steps are computed from a preset data object, so each primary
   problem and its variant share one generator. ---- */
function wmPrime(n) { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }
function wmFactor(n) { for (let d = 2; d * d <= n; d++) if (n % d === 0) return d; return null; }
const wmSet = (arr) => (arr.length ? '{' + arr.join(', ') + '}' : '∅');
const wmList = (arr) => (arr.length <= 2 ? arr.join(' and ') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);

/* (a) Sort a tray of numbers into even/odd and prime/composite, one number per step. */
const WM_CLASS_MAIN = { nums: [6, 7, 10, 13, 14, 21] };
const WM_CLASS_VARIANT = { nums: [8, 5, 12, 1, 2, 27] };
function wmClassOf(n) { return { parity: n % 2 === 0 ? 'even' : 'odd', kind: n === 1 ? 'neither' : wmPrime(n) ? 'prime' : 'composite' }; }
function wmClassAnswer(D) {
  const by = (f) => D.nums.filter(f).sort((a, b) => a - b);
  return { evens: by((n) => n % 2 === 0), odds: by((n) => n % 2 === 1), primes: by((n) => wmPrime(n)), composites: by((n) => n > 1 && !wmPrime(n)), neither: by((n) => n === 1) };
}
function wmClassStepsFor(D) {
  const steps = [{ done: 0, status: `The tray holds ${D.nums.join(', ')} — nothing sorted yet`, caption: 'Meet the worked-example player on a tiny problem: sort every number in the tray twice, once into the even or odd box and once into the prime or composite box. Press Step ▶ below the picture to place the first number; every step changes the picture and explains what changed and why.' }];
  D.nums.forEach((n, i) => {
    const c = wmClassOf(n), d = wmFactor(n);
    const why = c.kind === 'prime' ? `no whole number from 2 up to ${Math.floor(Math.sqrt(n))} divides it, so it has exactly two divisors, 1 and itself`
      : c.kind === 'composite' ? `it has a divisor besides 1 and itself, since ${n} = ${d} × ${n / d}`
      : 'it is neither prime nor composite, because a prime must have exactly two divisors and 1 has only one, itself';
    const coach = i === 1 ? ' Tip: the ▶ Play button advances the steps on its own, and it always pauses at a prediction checkpoint so you can think before the reveal.' : i === 3 ? ' Tip: ↺ Restart and the scrubber under the picture let you replay any step — nothing here can be broken, so experiment freely.' : '';
    const st = { done: i + 1, status: `${n} sorted: ${c.parity} and ${c.kind} · ${i + 1} of ${D.nums.length} numbers placed`, caption: `${n} lands in the ${c.parity} box because ${n % 2 === 0 ? `${n} = 2 × ${n / 2} with nothing left over` : `dividing ${n} by 2 leaves a remainder of 1`}, and in the ${c.kind} box because ${why}. One number always sits in two boxes at once, because parity and primality are two independent questions about it.${coach}` };
    if (i === D.nums.length - 2) st.checkpoint = `Predict: the last number in the tray, ${D.nums[D.nums.length - 1]}, is odd — will it land in the prime box or the composite box?`;
    steps.push(st);
  });
  const A = wmClassAnswer(D);
  steps.push({ done: D.nums.length, answer: true, status: 'Every number sorted — the checked answer', caption: `Answer: the evens are ${wmSet(A.evens)} and the odds are ${wmSet(A.odds)}; the primes are ${wmSet(A.primes)} and the composites are ${wmSet(A.composites)}${A.neither.length ? `, while ${wmList(A.neither)} sits in the neither box` : ''}. The green banner is the checked answer, recomputed independently of the steps; the Problem switcher above the picture reruns the same method on a new tray with two troublemakers in it.` });
  return steps;
}

/* (b) Shortest route on a tiny weighted map, settling one place at a time (a first taste of Module 9). */
const WM_GRAPH_NODES = ['Gate', 'Fountain', 'Library', 'Cafe', 'Lab', 'Dorm'];
const WM_GRAPH_POS = { Gate: [60, 150], Fountain: [175, 55], Library: [175, 245], Cafe: [300, 150], Lab: [425, 55], Dorm: [425, 245] };
const WM_ROUTE_MAIN = { start: 'Gate', goal: 'Dorm', cpAt: 'Library', cpText: 'Predict: Cafe is 6 minutes away via Fountain, but Library (settled at 4) plus the 1-minute Library–Cafe road gives a different total — which one wins when Cafe is settled next?',
  edges: [['Gate', 'Fountain', 2], ['Gate', 'Library', 5], ['Fountain', 'Library', 2], ['Fountain', 'Cafe', 4], ['Library', 'Cafe', 1], ['Library', 'Lab', 3], ['Cafe', 'Lab', 2], ['Cafe', 'Dorm', 5], ['Lab', 'Dorm', 2]] };
const WM_ROUTE_VARIANT = { start: 'Gate', goal: 'Dorm', cpAt: 'Cafe', cpText: 'Predict: Dorm already shows 13 minutes via Cafe, and the direct Gate–Dorm road costs 14 — when Lab settles next, will Dorm drop below both of those?',
  edges: [['Gate', 'Fountain', 3], ['Gate', 'Library', 3], ['Gate', 'Dorm', 14], ['Fountain', 'Cafe', 6], ['Fountain', 'Lab', 5], ['Library', 'Cafe', 2], ['Library', 'Lab', 4], ['Cafe', 'Lab', 1], ['Cafe', 'Dorm', 8], ['Lab', 'Dorm', 4]] };
function wmRouteRun(D) {
  const dist = {}, prev = {}, settled = [], events = [];
  for (const n of WM_GRAPH_NODES) dist[n] = Infinity;
  dist[D.start] = 0;
  while (settled.length < WM_GRAPH_NODES.length) {
    let cur = null;
    for (const n of WM_GRAPH_NODES) if (!settled.includes(n) && (cur === null || dist[n] < dist[cur])) cur = n;
    settled.push(cur);
    const improved = [];
    for (const e of D.edges) {
      const to = e[0] === cur ? e[1] : e[1] === cur ? e[0] : null;
      if (to && !settled.includes(to) && dist[cur] + e[2] < dist[to]) { dist[to] = dist[cur] + e[2]; prev[to] = cur; improved.push([to, dist[to]]); }
    }
    events.push({ cur, settled: settled.slice(), dist: { ...dist }, improved });
  }
  const route = [];
  for (let n = D.goal; n; n = prev[n]) route.unshift(n);
  return { events, route, total: dist[D.goal] };
}
function wmRouteStepsFor(D) {
  const { events, route, total } = wmRouteRun(D);
  const snap = (dist) => { const o = {}; for (const n of WM_GRAPH_NODES) o[n] = dist[n] === Infinity ? null : dist[n]; return o; };
  const d0 = {}; for (const n of WM_GRAPH_NODES) d0[n] = n === D.start ? 0 : null;
  const steps = [{ set: [], cur: null, dist: d0, status: 'The campus map: every road labeled with its walking minutes', caption: `Find the fastest walking route from ${D.start} to ${D.goal} on this little map, where every road is labeled with its minutes. The method: repeatedly settle the closest place that is not settled yet — its distance can never improve later, because every road costs a positive number of minutes. Press Step ▶ to settle ${D.start} first.` }];
  for (const ev of events) {
    const goal = ev.cur === D.goal;
    const st = { set: ev.settled, cur: ev.cur, dist: snap(ev.dist),
      status: goal ? `Route found: ${route.join(' → ')} = ${total} minutes` : `Settled so far: ${ev.settled.join(' → ')} · ${ev.cur} locked at ${ev.dist[ev.cur]} min`,
      caption: goal ? `Answer: ${D.goal} settles at ${total} minutes, and following the "came from" links back to ${D.start} gives the route ${route.join(' → ')}, totaling ${total} minutes. The green banner is the checked answer — it was verified by trying every possible route, not just the settled one. The Problem switcher above the picture reruns the same method on a second map.`
        : `Settle ${ev.cur} at ${ev.dist[ev.cur]} minutes: among the places not yet settled it holds the smallest tentative distance, so that distance is final and can never be beaten later. ${ev.improved.length ? `From ${ev.cur}, the roads out update the neighbors they improve: ${ev.improved.map(([t, v]) => `${t} drops to ${v}`).join('; ')}.` : `From ${ev.cur}, no road improves any neighbor's tentative distance, so nothing else changes this step.`}` };
    if (ev.cur === D.cpAt) st.checkpoint = D.cpText;
    if (goal) { st.route = route; st.answer = true; }
    steps.push(st);
  }
  return steps;
}

DM.module({
  id: 'welcome',
  num: 0,
  title: 'Welcome',
  objectives: [],
  terms: {
    'discrete': 'Made of separate, countable pieces (like whole numbers or bits) rather than a smooth continuum (like the real number line).',
    'bit': 'A binary digit: a single 0 or 1. Eight bits make a byte.',
  },
  symbols: [],
  css: `
    .map svg.wm-wide .node text { font-size: 14px; }
    .map svg.wm-wide .node .k { font-size: 11px; }
    .map svg.wm-tall .node text { font-size: 12px; }
    .map svg.wm-tall .node .k { font-size: 9.5px; }
    .map svg.wm-tall { display: none; }
    @media (max-width: 760px) { .map svg.wm-wide { display: none; } .map svg.wm-tall { display: block; } }
  `,
  slides: [
    {
      title: 'Computers count. They never measure.',
      kind: 'concept',
      html: String.raw`
        <div class="split-wide fill" style="align-items:center">
          <div class="stack" style="gap:0.9rem">
            <p class="lead" style="font-size:1.25rem">Every value inside a computer is stored as a finite pattern of <span class="term">bit</span>s. That makes computing a <span class="term">discrete</span> world: things you can list, count, and reason about one step at a time.</p>
            <p>This course gives you the mathematics of that world. Sets describe collections of data. Logic describes conditions in your code. Proofs show that an algorithm is correct. Counting and probability tell you how many possibilities exist and how likely each one is. Graphs and trees model networks, file systems, and the decision structure inside many AI models.</p>
            <p class="muted">Try it on the right: flip the eight bits of one byte. That single byte is already a number, a set, a logical statement, and a counting problem.</p>
          </div>
          <div class="card stack" id="byte-card" style="gap:0.7rem"></div>
        </div>`,
      render(body, ctx) {
        const { h } = ctx;
        const card = body.querySelector('#byte-card');
        const bits = [0, 0, 1, 0, 1, 1, 0, 1];
        const row = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.35rem' } });
        const read = h('div.stack', { style: { gap: '0.45rem' } });
        card.append(h('div.tiny.mono.muted', 'ONE BYTE · CLICK A BIT TO FLIP IT'), row, read);
        const draw = () => {
          row.replaceChildren(...bits.map((b, i) => {
            const pos = 7 - i;
            return h('button.btn', {
              style: { flexDirection: 'column', padding: '0.35rem 0', fontFamily: 'var(--font-mono)', fontSize: '1.3rem', gap: '0', background: b ? 'var(--accent)' : 'var(--sheet)', color: b ? 'var(--accent-ink)' : 'var(--ink)' },
              'aria-label': `bit ${pos} is ${b}; click to flip`,
              onclick: () => { bits[i] ^= 1; draw(); },
            }, String(b), h('span', { style: { fontSize: '0.62rem', opacity: 0.75 } }, `2^${pos}`));
          }));
          const n = bits.reduce((acc, b) => acc * 2 + b, 0);
          const on = bits.map((b, i) => (b ? 7 - i : null)).filter((x) => x !== null).sort((a, b) => a - b);
          const k = on.length;
          const ways = ctx.M.C(8, k);
          const items = [
            ['Number', `Read as base 2, the byte is the integer \\(${n}\\) (hex ${n.toString(16).toUpperCase().padStart(2, '0')}). Module 6 studies integers.`],
            ['Set', `The positions that are 1 form the set \\(S = ${on.length ? '\\{' + on.join(', ') + '\\}' : '\\varnothing'}\\), with \\(|S| = ${k}\\). Module 1 studies sets.`],
            ['Logic', `The statement "the number is even" is <b class="${n % 2 ? 'bad' : 'ok'}">${n % 2 ? 'false' : 'true'}</b>, because bit 0 is ${bits[7]}. Module 2 studies logic.`],
            ['Counting', `There are \\(2^8 = 256\\) possible bytes, and \\(\\binom{8}{${k}} = ${ways}\\) of them have exactly ${k} ones. Module 7 studies counting.`],
            ['Probability', `A random byte has exactly ${k} ones with probability \\(${ways}/256 \\approx ${(ways / 256).toFixed(3)}\\). Module 13 studies probability.`],
          ];
          read.replaceChildren(...items.map(([lbl, txt]) => {
            const d = h('div', { style: { display: 'grid', gridTemplateColumns: '6.2rem 1fr', gap: '0.5rem', alignItems: 'baseline', fontSize: '0.9rem' } }, h('span.tiny.mono', { style: { color: 'var(--accent)', fontWeight: 600 } }, lbl.toUpperCase()), h('span', { html: txt }));
            ctx.tex(d);
            return d;
          }));
        };
        draw();
      },
    },
    {
      title: 'How this lab works',
      kind: 'concept',
      html: String.raw`
        <p class="lead">Each module follows the same path from idea to skill. Move with the <kbd>→</kbd> and <kbd>←</kbd> keys or the buttons at the bottom. The dots at the top right show where you are inside a module.</p>
        <div class="cols-3">
          <div class="card"><span class="kind-tag">Concept</span><p class="small" style="margin-top:0.45rem">A definition, the notation, a worked example, and where the idea shows up in computing and AI. Dotted words are glossary terms: hover or focus them for a definition.</p></div>
          <div class="card"><span class="kind-tag lab">Interactive lab</span><p class="small" style="margin-top:0.45rem">A hands-on model of the idea. Change the inputs and watch the mathematics respond. Every lab reacts immediately; nothing needs a server.</p></div>
          <div class="card"><span class="kind-tag">Code walkthrough</span><p class="small" style="margin-top:0.45rem">A short Python program where <b>every line</b> has its own explanation. Read it line by line, edit and run it, or trace it one step at a time while you watch the variables change.</p></div>
          <div class="card"><span class="kind-tag design">Design practice</span><p class="small" style="margin-top:0.45rem">Habits that professionals follow when they turn the mathematics into software, each shown as a side-by-side comparison of code to avoid and code to write.</p></div>
          <div class="card"><span class="kind-tag">Practice</span><p class="small" style="margin-top:0.45rem">Endless generated problems with instant checking and a worked solution for each one. A new problem appears every time you ask.</p></div>
          <div class="card"><span class="kind-tag">Check yourself</span><p class="small" style="margin-top:0.45rem">A short quiz. Every answer, right or wrong, comes with an explanation of the reasoning behind it.</p></div>
        </div>
        <div class="split">
          <div class="why">The Python in this course is real Python 3, compiled to WebAssembly and running inside your browser tab. The first run downloads it once; after that, runs are instant. Nothing you type leaves your computer.</div>
          <div class="box small"><span class="lbl muted">Handy keys</span><kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> search everything · <kbd>N</kbd> notation · <kbd>G</kbd> glossary · <kbd>T</kbd> theme · <kbd>?</kbd> all shortcuts. Your progress rings in the module list are saved in this browser only.</div>
        </div>`,
    },
    {
      title: 'Worked example: sort the tray (meet the player)',
      kind: 'example',
      id: 'ex-sort-into-sets',
      objective: 'Learn the worked-example player controls (Step, Play, prediction checkpoints and the preset switcher) while sorting numbers into even/odd and prime/composite sets.',
      problem: String.raw`<p>Sort each number in the tray \(\{6, 7, 10, 13, 14, 21\}\) twice: once by parity, into the evens and the odds, and once by kind, into the primes and the composites. As you work, learn the player: <b>Step ▶</b> advances one step, <b>▶ Play</b> advances on its own but pauses at prediction checkpoints, and the <b>Problem</b> switcher reruns the same method on new numbers.</p>`,
      steps: wmClassStepsFor(WM_CLASS_MAIN),
      data: WM_CLASS_MAIN,
      answer: wmClassAnswer(WM_CLASS_MAIN),
      verify(M) {
        const nums = [6, 7, 10, 13, 14, 21];
        const by = (f) => nums.filter(f).sort((a, b) => a - b);
        const want = { evens: [6, 10, 14], odds: [7, 13, 21], primes: [7, 13], composites: [6, 10, 14, 21], neither: [] };
        const got = { evens: by((n) => n % 2 === 0), odds: by((n) => n % 2 === 1), primes: by((n) => M.isPrime(n)), composites: by((n) => n > 1 && !M.isPrime(n)), neither: by((n) => n === 1) };
        return Object.keys(want).every((k) => got[k].length === want[k].length && got[k].every((x, i) => x === want[k][i]));
      },
      variants: [
        {
          label: 'Variant: a tray with troublemakers',
          problem: String.raw`<p>Sort each number in the tray \(\{8, 5, 12, 1, 2, 27\}\) twice: once by parity, into the evens and the odds, and once by kind, into the primes and the composites. This tray hides two troublemakers: \(1\), which is neither prime nor composite, and \(2\), the only even prime.</p>`,
          steps: wmClassStepsFor(WM_CLASS_VARIANT),
          data: WM_CLASS_VARIANT,
          answer: wmClassAnswer(WM_CLASS_VARIANT),
          verify(M) {
            const nums = [8, 5, 12, 1, 2, 27];
            const by = (f) => nums.filter(f).sort((a, b) => a - b);
            const want = { evens: [2, 8, 12], odds: [1, 5, 27], primes: [2, 5], composites: [8, 12, 27], neither: [1] };
            const got = { evens: by((n) => n % 2 === 0), odds: by((n) => n % 2 === 1), primes: by((n) => M.isPrime(n)), composites: by((n) => n > 1 && !M.isPrime(n)), neither: by((n) => n === 1) };
            return Object.keys(want).every((k) => got[k].length === want[k].length && got[k].every((x, i) => x === want[k][i]));
          },
        },
      ],
      draw(stage, ctx, step, k, preset) {
        const { h } = ctx;
        const D = (preset && preset.data) || WM_CLASS_MAIN;
        const placed = D.nums.slice(0, step.done);
        const cur = step.done > 0 && !step.answer ? D.nums[step.done - 1] : null;
        const chip = (n, hot) => h('span.chip', { style: hot ? { background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 700 } : {} }, String(n));
        const box = (title, test) => {
          const got = placed.filter(test);
          return h('div.card', { style: { padding: '0.5rem 0.6rem', flex: '1 1 7.5rem' } },
            h('div.tiny.mono.muted', title),
            h('div.row', { style: { gap: '0.3rem', marginTop: '0.3rem', minHeight: '1.6rem' } }, got.length ? got.map((n) => chip(n, n === cur)) : h('span.small.muted', 'empty so far')));
        };
        const tray = D.nums.slice(step.done);
        const A = wmClassAnswer(D);
        stage.append(h('div.stack', { style: { gap: '0.45rem' } },
          h('div.small', h('b.mono', step.status)),
          h('div.row', { style: { gap: '0.3rem', alignItems: 'center' } }, h('span.tiny.mono.muted', 'STILL IN THE TRAY:'), tray.length ? tray.map((n) => chip(n, false)) : h('span.small.muted', 'none — the tray is empty')),
          h('div.row', { style: { gap: '0.5rem', alignItems: 'stretch' } }, box('EVEN', (n) => n % 2 === 0), box('ODD', (n) => n % 2 === 1)),
          h('div.row', { style: { gap: '0.5rem', alignItems: 'stretch' } }, box('PRIME', (n) => wmPrime(n)), box('COMPOSITE', (n) => n > 1 && !wmPrime(n)), box('NEITHER', (n) => n === 1)),
          step.answer ? h('div.ex-answer', `Evens ${wmSet(A.evens)} · Odds ${wmSet(A.odds)} · Primes ${wmSet(A.primes)} · Composites ${wmSet(A.composites)}${A.neither.length ? ` · Neither ${wmSet(A.neither)}` : ''}`) : null));
      },
    },
    {
      title: 'Worked example: the shortest route across campus',
      kind: 'example',
      id: 'ex-shortest-route',
      objective: 'Learn prediction checkpoints and answer-checking on the player while finding the shortest route through a small weighted graph, settling one vertex at a time.',
      problem: String.raw`<p>On the campus map, every road is labeled with its walking time in minutes: Gate–Fountain \(2\), Gate–Library \(5\), Fountain–Library \(2\), Fountain–Cafe \(4\), Library–Cafe \(1\), Library–Lab \(3\), Cafe–Lab \(2\), Cafe–Dorm \(5\) and Lab–Dorm \(2\). Find the fastest route from the Gate to the Dorm. Predict before each reveal: autoplay pauses at the checkpoint, and the final banner is the checked answer.</p>`,
      steps: wmRouteStepsFor(WM_ROUTE_MAIN),
      data: WM_ROUTE_MAIN,
      answer: { route: ['Gate', 'Fountain', 'Library', 'Cafe', 'Lab', 'Dorm'], minutes: 9 },
      verify(M) {
        const E = WM_ROUTE_MAIN.edges;
        const cost = (r) => r.slice(1).reduce((sum, n, i) => sum + E.find((x) => (x[0] === r[i] && x[1] === n) || (x[1] === r[i] && x[0] === n))[2], 0);
        let best = Infinity;
        const dfs = (n, seen, acc) => { if (n === 'Dorm') { best = Math.min(best, acc); return; } for (const e of E) { const to = e[0] === n ? e[1] : e[1] === n ? e[0] : null; if (to && !seen.has(to)) { seen.add(to); dfs(to, seen, acc + e[2]); seen.delete(to); } } };
        dfs('Gate', new Set(['Gate']), 0);
        return best === 9 && cost(['Gate', 'Fountain', 'Library', 'Cafe', 'Lab', 'Dorm']) === 9;
      },
      variants: [
        {
          label: 'Variant: the tempting direct road',
          problem: String.raw`<p>Same campus, different road times: Gate–Fountain \(3\), Gate–Library \(3\), Fountain–Cafe \(6\), Fountain–Lab \(5\), Library–Cafe \(2\), Library–Lab \(4\), Cafe–Lab \(1\), Cafe–Dorm \(8\) and Lab–Dorm \(4\) — plus a direct Gate–Dorm road that takes \(14\) minutes. Find the fastest route from the Gate to the Dorm, and see whether the direct road ever wins.</p>`,
          steps: wmRouteStepsFor(WM_ROUTE_VARIANT),
          data: WM_ROUTE_VARIANT,
          answer: { route: ['Gate', 'Library', 'Cafe', 'Lab', 'Dorm'], minutes: 10 },
          verify(M) {
            const E = WM_ROUTE_VARIANT.edges;
            const cost = (r) => r.slice(1).reduce((sum, n, i) => sum + E.find((x) => (x[0] === r[i] && x[1] === n) || (x[1] === r[i] && x[0] === n))[2], 0);
            let best = Infinity;
            const dfs = (n, seen, acc) => { if (n === 'Dorm') { best = Math.min(best, acc); return; } for (const e of E) { const to = e[0] === n ? e[1] : e[1] === n ? e[0] : null; if (to && !seen.has(to)) { seen.add(to); dfs(to, seen, acc + e[2]); seen.delete(to); } } };
            dfs('Gate', new Set(['Gate']), 0);
            return best === 10 && cost(['Gate', 'Library', 'Cafe', 'Lab', 'Dorm']) === 10;
          },
        },
      ],
      draw(stage, ctx, step, k, preset) {
        const { h, s } = ctx;
        const D = (preset && preset.data) || WM_ROUTE_MAIN;
        const onRoute = (a, b) => !!(step.route && step.route.some((n, i) => i < step.route.length - 1 && ((step.route[i] === a && step.route[i + 1] === b) || (step.route[i] === b && step.route[i + 1] === a))));
        const kids = [];
        for (const [a, b, w] of D.edges) {
          const [x1, y1] = WM_GRAPH_POS[a], [x2, y2] = WM_GRAPH_POS[b];
          kids.push(s('line', { x1, y1, x2, y2, stroke: onRoute(a, b) ? 'var(--accent)' : 'var(--rule)', 'stroke-width': onRoute(a, b) ? 5 : 1.5 }));
          kids.push(s('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 5, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: 'var(--ink-3)', text: String(w) }));
        }
        for (const n of WM_GRAPH_NODES) {
          const [x, y] = WM_GRAPH_POS[n];
          const settled = step.set.includes(n);
          kids.push(s('circle', { cx: x, cy: y, r: 16, fill: settled ? 'var(--accent)' : 'var(--sheet)', stroke: step.cur === n ? 'var(--ink)' : 'var(--ink-3)', 'stroke-width': step.cur === n ? 3 : 1.5 }));
          kids.push(s('text', { x, y: y - 24, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': settled ? 700 : 400, fill: 'var(--ink)', text: step.dist[n] === null ? '∞' : `${step.dist[n]} min` }));
          kids.push(s('text', { x, y: y + 32, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: 'var(--ink)', text: n + (n === D.start ? ' (start)' : n === D.goal ? ' (goal)' : '') }));
        }
        const svg = s('svg', { viewBox: '0 0 485 300', role: 'img', 'aria-label': 'Campus map graph with roads labeled in minutes; settled places fill in as the route is found', style: { width: '440px', maxWidth: '100%', height: 'auto', display: 'block' } }, ...kids);
        stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem' } },
          h('div.small', h('b.mono', step.status)),
          svg,
          step.answer ? h('div.ex-answer', `Shortest route: ${step.route.join(' → ')} — ${step.dist[D.goal]} minutes in all, and no other route ties or beats it`) : null));
      },
    },
    {
      title: 'Course map: how the ideas build on each other',
      kind: 'lab',
      html: String.raw`<p class="muted small">This map is itself a <b>directed graph</b> (Module 9). An arrow from one module to another means the first supplies ideas the second uses. Hover or focus a module to light up its prerequisites; click it, or press Enter, to jump there. A green outline means you have opened every slide in that module.</p>`,
      render(body, ctx) {
        const { h, s } = ctx;
        // [level in the prerequisite order, vertical slot within that level]
        const layout = {
          sets: [0, 1.5], logic: [1, 0.4], relations: [1, 1.6], counting: [1, 2.8],
          proofs: [2, 0], boolean: [2, 0.95], graphs: [2, 1.95], probability: [2, 3],
          algorithms: [3, 0.55], trees: [3, 1.75], networks: [3, 2.7],
          numbers: [4, 0.35], recurrences: [4, 1.45], design: [5, 1.5],
        };
        const edges = [['sets', 'logic'], ['sets', 'relations'], ['sets', 'counting'], ['logic', 'proofs'], ['logic', 'boolean'], ['relations', 'graphs'], ['counting', 'probability'],
          ['proofs', 'algorithms'], ['relations', 'algorithms'], ['graphs', 'trees'], ['graphs', 'networks'], ['algorithms', 'numbers'], ['proofs', 'numbers'], ['algorithms', 'recurrences'], ['counting', 'recurrences'],
          ['numbers', 'design'], ['recurrences', 'design'], ['trees', 'design'], ['networks', 'design'], ['boolean', 'design'], ['probability', 'design']];
        // short labels that fit the boxes; the full title is in the tooltip and the accessible name
        const SHORT = {
          wide: { relations: 'Relations', numbers: 'Number Theory', counting: 'Counting', boolean: 'Boolean Algebra', recurrences: 'Recurrences', proofs: 'Proof Techniques', networks: 'Network Flows' },
          tall: { relations: 'Relations', numbers: 'Numbers', counting: 'Counting', boolean: 'Boolean', recurrences: 'Recurrences', proofs: 'Proofs', networks: 'Networks' },
        };
        const mods = Object.fromEntries(DM.modules.map((m) => [m.id, m]));
        const ids = Object.keys(layout).filter((id) => mods[id]);
        const levels = Math.max(...ids.map((id) => layout[id][0])) + 1;
        const svgs = [];
        /* The same graph is drawn twice: levels run left to right on a wide screen and top to bottom on
           a phone, where the 1140-unit-wide picture would shrink every label to a few pixels. The module
           CSS shows whichever one fits the viewport. */
        function build(tall) {
          const W = tall ? 400 : 1140, H = tall ? 600 : 400;
          const pos = {}, size = {};
          if (tall) {
            const bh = 46, gap = 8, margin = 8;
            for (let lv = 0; lv < levels; lv++) {
              const row = ids.filter((id) => layout[id][0] === lv).sort((a, b) => layout[a][1] - layout[b][1]);
              const n = row.length;
              const bw = Math.min(124, Math.floor((W - 2 * margin - gap * (n - 1)) / n));
              const x0 = (W - (n * bw + (n - 1) * gap)) / 2;   // the row is centered
              row.forEach((id, i) => { pos[id] = [x0 + i * (bw + gap), 12 + lv * ((H - bh - 24) / Math.max(1, levels - 1))]; size[id] = [bw, bh]; });
            }
          } else {
            const bw = 150, bh = 50;
            // Math.max(1, …): a build with a single level (welcome plus one module) must not divide by zero
            for (const id of ids) { pos[id] = [12 + layout[id][0] * ((W - bw - 24) / Math.max(1, levels - 1)), 16 + layout[id][1] * ((H - bh - 32) / 3)]; size[id] = [bw, bh]; }
          }
          const marker = tall ? 'wm-arr-tall' : 'wm-arr-wide';
          const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: tall ? 'wm-tall' : 'wm-wide', role: 'group', 'aria-label': 'Course map: every module, with an arrow from each prerequisite to the module that uses it' });
          svg.append(s('defs', {}, s('marker', { id: marker, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--ink-3)' }))));
          const edgeEls = [];
          for (const [a, b] of edges) {
            if (!mods[a] || !mods[b]) continue;
            const [x1, y1] = pos[a], [x2, y2] = pos[b], [w1, h1] = size[a], [w2, h2] = size[b];
            let d;
            if (tall) { const sx = x1 + w1 / 2, sy = y1 + h1, ex = x2 + w2 / 2, ey = y2, my = (sy + ey) / 2; d = `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey - 6}`; }
            else { const sx = x1 + w1, sy = y1 + h1 / 2, ex = x2, ey = y2 + h2 / 2, mx = (sx + ex) / 2; d = `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex - 6},${ey}`; }
            const p = s('path', { class: 'edge' + (b === 'design' ? ' cap' : ''), d, 'marker-end': `url(#${marker})` });
            p.dataset.to = b; p.dataset.from = a;
            edgeEls.push(p);
            svg.append(p);
          }
          for (const id of ids) {
            const m = mods[id];
            const [x, y] = pos[id], [bw, bh] = size[id];
            const label = SHORT[tall ? 'tall' : 'wide'][id] || m.title;
            const g = s('g', { class: 'node', tabindex: 0, role: 'link', 'aria-label': `Module ${m.num}: ${m.title}` },
              s('title', { text: `Module ${m.num}: ${m.title}` }),
              s('rect', { x, y, width: bw, height: bh, rx: 8 }),
              s('text', { class: 'k', x: x + 8, y: y + (tall ? 16 : 18), text: m.num >= 14 ? 'CAPSTONE' : `MODULE ${m.num}` }),
              s('text', { x: x + 8, y: y + (tall ? 35 : 38), text: label }));
            g.dataset.id = id;
            const lite = (on) => edgeEls.forEach((e) => e.classList.toggle('lit', on && e.dataset.to === id));
            g.addEventListener('pointerenter', () => lite(true));
            g.addEventListener('pointerleave', () => lite(false));
            g.addEventListener('focus', () => lite(true));
            g.addEventListener('blur', () => lite(false));
            g.addEventListener('click', () => ctx.go(id));
            g.addEventListener('keydown', (e) => { if (e.key === 'Enter') ctx.go(id); });
            svg.append(g);
          }
          svgs.push(svg);
          return svg;
        }
        body.append(h('div.figure.fill.map', build(false), build(true)));
        const mark = () => {
          const v = new Set(ctx.store.get('visited', []));
          for (const svg of svgs) {
            svg.querySelectorAll('.node').forEach((g) => {
              const m = mods[g.dataset.id];
              g.classList.toggle('done', m.slides.every((sl, j) => v.has(DM.keyOf(m.id, j))));
            });
          }
        };
        mark();
        ctx.onShow(mark);
      },
    },
    {
      title: 'What you will be able to do',
      kind: 'concept',
      html: String.raw`<p class="muted small">These are the thirteen course objectives. Each row links to the module that teaches it, and the Design Studio at the end ties all of them together in realistic software decisions.</p><div id="obj-table" class="fill" style="overflow:auto"></div>`,
      render(body, ctx) {
        const { h } = ctx;
        const objectives = [
          'Apply set terminology and notation.',
          'Use logic to read and develop proofs.',
          'Examine proof techniques in discrete mathematics and computer science.',
          'Describe the use of functions, sequences and relations in computer science and engineering.',
          'Explain the application and analysis of algorithms to solve problems.',
          'Analyze the relationship between integers and number theory.',
          'Use counting techniques to solve the binomial theorem.',
          'Apply recurrence relations to analyze algorithms.',
          'Explain the use of graphing.',
          'Describe the use of trees as a data structure in computer science.',
          'Use network modeling to maximize data flow.',
          'Examine the relationship of Boolean algebra and logic circuits.',
          'Understand basic probability theory.',
        ];
        const tbody = h('tbody');
        objectives.forEach((text, i) => {
          const n = i + 1;
          const where = DM.modules.filter((m) => (m.objectives || []).includes(n) && m.num > 0);
          tbody.append(h('tr',
            h('td.mono', { style: { color: 'var(--accent)', fontWeight: 600, width: '2.5rem' } }, String(n)),
            h('td', text),
            h('td', { style: { whiteSpace: 'nowrap' } }, where.length ? where.map((m) => h('button.btn.sm', { style: { margin: '0 0.25rem 0.15rem 0' }, onclick: () => ctx.go(m.id) }, m.num >= 14 ? m.title : `Module ${m.num}: ${m.title}`)) : h('span.muted.small', 'coming soon'))));
        });
        body.querySelector('#obj-table').append(h('table.data', h('thead', h('tr', h('th', '#'), h('th', 'Objective'), h('th', 'Where you learn it'))), tbody));
      },
    },
  ],
});
