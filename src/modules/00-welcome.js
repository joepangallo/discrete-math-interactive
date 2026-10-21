/* Module 0: Welcome. The opening hero, how the lab works, the course map, and objective coverage. */
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
