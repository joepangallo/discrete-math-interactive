// Worked-example checks: every module carries narrated, stepped example problems on the shared
// player, each ending in a machine-checked answer. Run: node --test tests/examples.test.mjs
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
  return { m: found[0], M: sandbox.DMUtil.M };
}

const modules = files.map((file) => ({ file, ...load(file) }));
const examplesOf = (m) => m.slides.filter((s) => s.kind === 'example');
const plain = (html) => String(html ?? '').replace(/<[^>]+>/g, '').replace(/\\[()[\]]/g, '').trim();

test('the engine provides the example kind, the shared player and the size ceiling', () => {
  const core = readFileSync(join(root, 'src', 'core.js'), 'utf8');
  assert.match(core, /DM\.kinds\.example =/, 'core.js registers the example kind');
  assert.match(core, /player\(opts\)/, 'core.js provides ctx.player');
  assert.match(core, /example: 'Worked example'/, 'the kind tag reads "Worked example"');
  const build = readFileSync(join(root, 'src', 'build.mjs'), 'utf8');
  assert.match(build, /maxBytes = 2\.2 \* 1024 \* 1024/, 'build.mjs enforces the 2.2 MB ceiling');
  const htmlPath = join(root, 'discrete-math-interactive.html');
  if (existsSync(htmlPath)) assert.ok(readFileSync(htmlPath).length <= 2.2 * 1024 * 1024, 'the built page is within the ceiling');
});

test('every module meets its worked-example quota', () => {
  for (const { file, m } of modules) {
    const n = examplesOf(m).length;
    if (m.num >= 1 && m.num <= 13) assert.ok(n >= 2, `${file}: modules 1-13 need at least 2 worked examples (has ${n})`);
    if (m.num === 14) assert.ok(n >= 1, `${file}: the capstone needs at least 1 worked example (has ${n})`);
  }
});

for (const { file, m, M } of modules) {
  for (const sl of examplesOf(m)) {
    test(`${file}: worked example "${sl.title}"`, () => {
      assert.ok(sl.id, 'the slide has an id');
      assert.ok(plain(sl.problem).length >= 30, 'a stated problem with specific numbers');
      assert.equal(typeof sl.draw, 'function', 'a draw function renders each step');
      assert.ok(Array.isArray(sl.steps) && sl.steps.length >= 5, `at least 5 steps (has ${sl.steps && sl.steps.length})`);
      sl.steps.forEach((st, i) => {
        assert.ok(st && typeof st === 'object' && !Array.isArray(st), `step ${i + 1} is a snapshot object`);
        for (const v of Object.values(st)) assert.notEqual(typeof v, 'function', `step ${i + 1} is pure data, no functions`);
        assert.equal(typeof st.caption, 'string', `step ${i + 1} has a caption`);
        assert.ok(plain(st.caption).length >= 40, `step ${i + 1} caption says what happens and why (got ${plain(st.caption).length} chars)`);
        if (i > 0) assert.notEqual(st.caption, sl.steps[i - 1].caption, `step ${i + 1} caption differs from the previous step`);
      });
      const last = sl.steps[sl.steps.length - 1];
      assert.equal(last.answer, true, 'the last step is marked as the answer');
      assert.ok(sl.steps.slice(0, -1).every((st) => st.answer !== true), 'only the last step is the answer');
      assert.notEqual(sl.answer, undefined, 'the example states its final answer for the machine check');
      assert.equal(typeof sl.verify, 'function', 'the example carries an independent verification');
      assert.equal(sl.verify(M), true, 'verify(M): the stated answer survives an independent computation');
    });
  }
}

/* Spot checks whose expected values are recomputed here, in the test, from first principles. */
test('pilot answers are right, recomputed from scratch', () => {
  const logic = modules.find(({ m }) => m.id === 'logic');
  const tt = logic.m.slides.find((s) => s.id === 'ex-truth-table');
  assert.ok(tt, 'the logic pilot exists');
  const envs = [];
  for (const p of [true, false]) for (const q of [true, false]) for (const r of [true, false]) envs.push({ p, q, r });
  assert.ok(envs.every((e) => { const pq = !e.p || e.q, qr = !e.q || e.r, pr = !e.p || e.r; return !(pq && qr) || pr; }), 'the syllogism formula is true in all 8 rows');
  assert.equal(tt.answer, 'tautology');
  const numbers = modules.find(({ m }) => m.id === 'numbers');
  const eu = numbers.m.slides.find((s) => s.id === 'ex-euclid-gcd');
  assert.ok(eu, 'the numbers pilot exists');
  assert.equal(eu.answer, numbers.M.gcd(252, 198));
  assert.equal(eu.answer, 18);
});
