// Content checks for every course module. Run: node --test tests/content.test.mjs
// These enforce the course's promises: every code line is explained, every quiz answer is
// explained, every module meets the slide mix, and nothing student-facing leaks private details.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const modDir = join(root, 'src', 'modules');
const files = readdirSync(modDir).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();

/* Shared helpers (src/lib/*.js) and the pure utilities load into the same sandbox the modules see. */
function sandboxFor(found) {
  const sandbox = { DM: { module: (m) => found.push(m), hlPy: (x) => x, renderMath: () => {}, modules: [], util: {}, kinds: {} }, console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(root, 'src', 'util.js'), 'utf8'), sandbox, { filename: 'util.js' });
  const libDir = join(root, 'src', 'lib');
  if (existsSync(libDir)) for (const f of readdirSync(libDir).filter((x) => x.endsWith('.js')).sort()) vm.runInContext(readFileSync(join(libDir, f), 'utf8'), sandbox, { filename: f });
  return sandbox;
}
function load(file) {
  const found = [];
  const sandbox = sandboxFor(found);
  vm.runInContext(readFileSync(join(modDir, file), 'utf8'), sandbox, { filename: file });
  assert.equal(found.length, 1, `${file} should register exactly one module`);
  return found[0];
}

const FORBIDDEN = [/keiser/i, /COT\s*2104/i, /\bclaude\b/i, /anthropic/i, /\bopenai\b/i, /\bchatgpt\b/i, /\bgpt-?\d/i, /\bcopilot\b/i, /\bgemini\b/i, /\bcodex\b/i, /rubric/i, /academic integrity/i, /\/Users\//, /\/private\/tmp/, /lorem ipsum/i, /\bTODO\b/, /\bFIXME\b/];
/* The course is written in American English; these are the British spellings that crept in. */
const BRITISH = [/\bcolou?rs?\b/i, /\b(recognis|practis|regularis|optimis|organis|summaris|visualis|minimis|maximis|normalis|initialis|emphasis|generalis|formalis|categoris|memoris|randomis|prioritis|specialis|neutralis|realis|utilis|apologis|analys)(e|es|ed|ing|ation|ations)\b/i, /\bneighbou?rs?\b/i, /\bcentres?\b/i, /\bgrey\b/i, /\bbehaviours?\b/i, /\bfavourite/i, /\bmodelling\b/i, /\blabelled\b/i, /\bhonou?r/i, /\bfulfil\b/i, /\bprogrammes?\b/i, /\bcatalogue/i, /\bdefence\b/i, /\blicence\b/i, /\btravelled\b/i, /\bmaths\b/i, /\bwhilst\b/i];
// "color", "neighbor" and friends match the first alternatives above; keep only the British forms.
const isBritish = (word) => /colour|recognis|practis|regularis|optimis|organis|summaris|visualis|minimis|maximis|normalis|initialis|emphasis(e|ed|ing)|generalis|formalis|categoris|memoris|randomis|prioritis|specialis|neutralis|realis|utilis|apologis|analys(e|ed|ing|es)\b|neighbour|centre|grey|behaviour|favourite|modelling|labelled|honour|fulfil\b|programme|catalogue|defence|licence|travelled|maths|whilst/i.test(word);
function britishWords(text) {
  const hits = new Set();
  for (const re of BRITISH) for (const m of text.matchAll(new RegExp(re.source, 'gi'))) if (isBritish(m[0])) hits.add(m[0]);
  return [...hits];
}
/* Explanations that name an answer by its letter or position break once the choices are shuffled. */
const POSITIONAL = /\b(choice|option|answer)\s+[A-D]\b|\b(first|second|third|fourth|last)\s+(choice|option|answer)\b|\b[A-D]\s+(is|are)\s+(the\s+)?(converse|inverse|contrapositive|correct|right|wrong)\b/i;
const POSITIONAL_CHOICE = /^(both|neither)\b|^(all|none) of\b|\b(of the above|of these|of them)\b/i;

const modules = files.map((file) => ({ file, m: load(file) }));

/* Each <div class="def"> block in a module source, matched to its own closing tag (examples nest a div inside). */
function defBlocks(src) {
  const out = [];
  for (let at = src.indexOf('<div class="def"'); at !== -1; at = src.indexOf('<div class="def"', at + 1)) {
    const tag = /<\/?div\b/g;
    tag.lastIndex = at;
    let depth = 0, m;
    while ((m = tag.exec(src))) {
      depth += m[0] === '<div' ? 1 : -1;
      if (depth === 0) break;
    }
    assert.ok(m, `unclosed definition box near: ${src.slice(at, at + 80)}`);
    out.push(src.slice(at, src.indexOf('>', m.index) + 1));
  }
  return out;
}
const EXAMPLE = /<div class="eg">([\s\S]*?)<\/div>\s*<\/div>$/;

test('module ids are unique and numbers are contiguous from 0', () => {
  const ids = modules.map(({ m }) => m.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate module ids: ${ids.join(', ')}`);
  assert.deepEqual(modules.map(({ m }) => m.num), modules.map((_, i) => i));
});

test('modules 1-13 together cover course objectives 1-13 and name only real ones', () => {
  const all = new Set();
  for (const { file, m } of modules) {
    const obj = m.objectives || [];
    assert.ok(obj.every((o) => Number.isInteger(o) && o >= 1 && o <= 13), `${file}: objectives must be integers 1-13 (got ${JSON.stringify(obj)})`);
    if (m.num >= 1 && m.num <= 13) obj.forEach((o) => all.add(o));
  }
  assert.deepEqual([...all].sort((a, b) => a - b), Array.from({ length: 13 }, (_, i) => i + 1));
});

test('slide keys (ids or title slugs) are unique within every module', () => {
  const sandbox = sandboxFor([]);
  const { slugKey } = sandbox.DMUtil;
  for (const { file, m } of modules) {
    const keys = Array.from(m.slides, (sl, i) => sl.id || slugKey(sl.title, i + 1)); // Array.from: module arrays come from the vm realm
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.equal(dupes.length, 0, `${file}: two slides would share the key(s) ${dupes.join(', ')}; give one an id or a different title`);
    for (const sl of m.slides) if (sl.id) assert.match(sl.id, /^[a-z][a-z0-9-]*$/, `${file}: slide id "${sl.id}" should be a lowercase slug`);
    for (const k of keys) assert.doesNotMatch(k, /^\d+$/, `${file}: a slide title produced no usable slug`);
  }
});

test('glossary terms are defined once and symbols have a shape', () => {
  const seen = new Map();
  for (const { m } of modules) {
    for (const term of Object.keys(m.terms || {})) {
      const k = term.toLowerCase();
      if (seen.has(k)) assert.fail(`term "${term}" is defined in both ${seen.get(k)} and ${m.id}; the engine keeps only the first`);
      seen.set(k, m.id);
    }
    for (const sym of m.symbols || []) assert.ok(Array.isArray(sym) && typeof sym[0] === 'string' && typeof sym[1] === 'string', `${m.id}: symbol entries are [symbol, name, example?]`);
  }
});

test('engine, styles, shell and build sources keep the student-facing hygiene rules', () => {
  for (const f of ['src/core.js', 'src/util.js', 'src/styles.css', 'src/shell.html']) {
    const text = readFileSync(join(root, f), 'utf8');
    for (const re of FORBIDDEN) assert.doesNotMatch(text, re, `${f}: forbidden text ${re}`);
    assert.deepEqual(britishWords(text), [], `${f}: use American spelling`);
  }
  const built = join(root, 'discrete-math-interactive.html');
  if (existsSync(built)) {
    const html = readFileSync(built, 'utf8');
    for (const re of FORBIDDEN) assert.doesNotMatch(html, re, `built page: forbidden text ${re}`);
  }
});

for (const { file, m } of modules) {
  const src = readFileSync(join(modDir, file), 'utf8');
  const kinds = (k) => m.slides.filter((s) => (s.kind || 'concept') === k);

  test(`${file}: module metadata`, () => {
    assert.match(m.id, /^[a-z]+$/);
    assert.equal(m.num, Number(file.slice(0, 2)));
    assert.ok(m.title && m.title.length < 40, 'short title');
    assert.ok(Array.isArray(m.slides) && m.slides.length > 0);
    for (const s of m.slides) assert.ok(s.title, 'every slide has a title');
  });

  test(`${file}: student-facing hygiene`, () => {
    for (const re of FORBIDDEN) assert.doesNotMatch(src, re, `forbidden text ${re}`);
    assert.doesNotMatch(src, /Math\.random/, 'use the seeded R helper, not Math.random');
    assert.doesNotMatch(src, /\$\$(?!\{)[^$]+\$\$(?!\{)/, 'use \\[ \\] for display math, not $$');
    assert.deepEqual(britishWords(src), [], 'use American spelling');
  });

  /* A definition is never left abstract: its box ends with one small concrete instance. */
  test(`${file}: every definition box ends with a short example`, () => {
    for (const block of defBlocks(src)) {
      const name = block.replace(/<[^>]+>/g, '').slice(0, 70);
      const eg = block.match(EXAMPLE);
      assert.ok(eg, `definition "${name}…" needs a <div class="eg"> as its last child`);
      const text = eg[1].replace(/<[^>]+>/g, '').trim();
      assert.ok(text.length >= 15, `definition "${name}…": the example is empty`);
      assert.ok(text.length <= 320, `definition "${name}…": keep the example to one or two short sentences (${text.length} chars)`);
    }
  });

  test(`${file}: timers and global listeners are cleaned up when the slide is hidden`, () => {
    for (const sl of m.slides) {
      if (typeof sl.render !== 'function') continue;
      const body = sl.render.toString();
      if (/setInterval\(|requestAnimationFrame\(|setTimeout\(/.test(body)) assert.match(body, /onHide|ctx\.ticker|\.ticker\(/, `${sl.title}: starts a timer without ctx.onHide or ctx.ticker`);
      if (/(window|document)\.addEventListener\(/.test(body)) assert.match(body, /removeEventListener|onHide/, `${sl.title}: adds a window/document listener without removing it`);
    }
  });

  if (m.num >= 1 && m.num <= 14) {
    test(`${file}: slide mix`, () => {
      assert.ok(m.slides.length >= 10, `at least 10 slides (has ${m.slides.length})`);
      assert.ok(kinds('lab').length >= 2, 'at least 2 labs');
      assert.ok(kinds('code').length >= 2, 'at least 2 code walkthroughs');
      assert.ok(kinds('design').length >= 1, 'a design practice slide');
      assert.equal(kinds('practice').length, 1, 'one practice slide');
      assert.equal(kinds('quiz').length, 1, 'one quiz');
      assert.ok(Object.keys(m.terms || {}).length >= 8, 'at least 8 glossary terms');
      assert.ok(m.objectives && m.objectives.length >= 1, 'maps to a course objective');
    });
  }

  test(`${file}: every code line is explained`, () => {
    for (const s of kinds('code')) {
      assert.ok(s.file && s.file.endsWith('.py'), `${s.title}: file name`);
      assert.equal(typeof s.expected, 'string', `${s.title}: expected output`);
      assert.ok(s.lines.length <= 18, `${s.title}: at most 18 lines so it fits one viewport`);
      assert.ok(s.fivew && s.fivew.what && s.fivew.why, `${s.title}: fivew what/why`);
      s.lines.forEach((l, i) => {
        const [code, ex] = Array.isArray(l) ? l : [l.code, l.ex];
        assert.equal(typeof code, 'string');
        if (code.trim()) assert.ok(ex && ex.replace(/<[^>]+>/g, '').trim().length >= 25, `${s.title}: line ${i + 1} needs a real explanation`);
        assert.doesNotMatch(code, /\binput\(/, 'no input() in browser Python');
      });
    }
  });

  test(`${file}: quiz answers are valid and explained`, () => {
    for (const s of kinds('quiz')) {
      assert.ok(s.questions.length >= (m.num === 0 ? 1 : 6));
      for (const q of s.questions) {
        assert.ok(q.q && q.choices.length >= 2);
        assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `answer index in range: ${q.q}`);
        assert.ok(q.explain && q.explain.length >= 30, `explanation for: ${q.q}`);
        assert.equal(new Set(q.choices).size, q.choices.length, `duplicate choices in: ${q.q}`);
        // choices are shuffled at run time unless the question is marked fixed
        if (!q.fixed) {
          assert.doesNotMatch(q.explain, POSITIONAL, `explanation refers to an answer by position; quote the content instead, or mark the question fixed: ${q.q}`);
          for (const c of q.choices) assert.doesNotMatch(c.replace(/<[^>]+>/g, ''), POSITIONAL_CHOICE, `positional choice "${c}" needs fixed: true on: ${q.q}`);
        }
      }
      // the right answer should not favour one position in the authored order either
      if (s.questions.length >= 8) {
        const counts = s.questions.reduce((acc, q) => { acc[q.answer] = (acc[q.answer] || 0) + 1; return acc; }, {});
        assert.ok(Math.max(...Object.values(counts)) <= Math.ceil(s.questions.length * 0.6), `one answer position holds ${Math.max(...Object.values(counts))} of ${s.questions.length} answers`);
      }
    }
  });

  test(`${file}: design principles are complete`, () => {
    for (const s of kinds('design')) {
      assert.ok(s.principles.length >= 5, 'at least 5 principles');
      for (const p of s.principles) assert.ok(p.name && p.html && p.html.length > 60, `principle "${p.name}" needs an explanation`);
    }
  });

  test(`${file}: practice generators exist`, () => {
    for (const s of kinds('practice')) {
      assert.ok(s.gens.length >= 3, 'at least 3 generators');
      for (const g of s.gens) assert.equal(typeof g.make, 'function');
    }
  });
}
