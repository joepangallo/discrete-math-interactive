// Worked-example checks: every module carries narrated, stepped example problems on the shared
// player, each ending in a machine-checked answer, with a prediction checkpoint and a computed
// alternate/boundary-case variant (SPEC section 2 + SPEC2 section 2). The coverage manifest
// written by the build must agree with what the sources declare.
// Run: node --test tests/examples.test.mjs
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

/* Per-module worked-example floors (SPEC2 section 1). Ratcheted stage by stage as the new
   examples land; the final values are the Codex floors: 00:2, 01:4, 02:4, 03:5, 04:4, 05:4,
   06:4, 07:5, 08:4, 09:6, 10:5, 11:4, 12:4, 13:5, 14:3 = 63. */
const FLOORS = { 0: 2, 1: 4, 2: 4, 3: 5, 4: 4, 5: 4, 6: 4, 7: 5, 8: 4, 9: 6, 10: 5, 11: 4, 12: 4, 13: 5, 14: 3 };
const MAX_BYTES = 2515104;

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
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/* The step-sequence contract shared by a primary example and each of its variants. */
function checkSteps(steps, label) {
  assert.ok(Array.isArray(steps) && steps.length >= 5, `${label}: at least 5 steps (has ${steps && steps.length})`);
  steps.forEach((st, i) => {
    assert.ok(st && typeof st === 'object' && !Array.isArray(st), `${label}: step ${i + 1} is a snapshot object`);
    for (const v of Object.values(st)) assert.notEqual(typeof v, 'function', `${label}: step ${i + 1} is pure data, no functions`);
    assert.equal(typeof st.caption, 'string', `${label}: step ${i + 1} has a caption`);
    assert.ok(plain(st.caption).length >= 40, `${label}: step ${i + 1} caption says what happens and why (got ${plain(st.caption).length} chars)`);
    if (i > 0) assert.notEqual(st.caption, steps[i - 1].caption, `${label}: step ${i + 1} caption differs from the previous step`);
  });
  const last = steps[steps.length - 1];
  assert.equal(last.answer, true, `${label}: the last step is marked as the answer`);
  assert.ok(steps.slice(0, -1).every((st) => st.answer !== true), `${label}: only the last step is the answer`);
  const cps = steps.map((st, i) => [st, i]).filter(([st]) => typeof st.checkpoint === 'string');
  assert.ok(cps.length >= 1, `${label}: at least one prediction checkpoint step`);
  for (const [st, i] of cps) {
    assert.ok(plain(st.checkpoint).length >= 15, `${label}: checkpoint ${i + 1} asks a real question (got "${plain(st.checkpoint)}")`);
    assert.ok(i < steps.length - 1, `${label}: checkpoint ${i + 1} is not the final step, so stepping forward reveals the outcome`);
  }
}

test('the engine provides the example kind, the shared player, checkpoints, presets and the size ceiling', () => {
  const core = readFileSync(join(root, 'src', 'core.js'), 'utf8');
  assert.match(core, /DM\.kinds\.example =/, 'core.js registers the example kind');
  assert.match(core, /player\(opts\)/, 'core.js provides ctx.player');
  assert.match(core, /example: 'Worked example'/, 'the kind tag reads "Worked example"');
  assert.match(core, /ex-checkpoint/, 'the player renders a checkpoint banner');
  assert.match(core, /steps\[i\]\.checkpoint/, 'autoplay pauses on a checkpoint step');
  assert.match(core, /ex-presets/, 'the example kind renders a preset switcher');
  assert.match(core, /sl\.variants/, 'the example kind reads slide variants as presets');
  const build = readFileSync(join(root, 'src', 'build.mjs'), 'utf8');
  assert.match(build, /maxBytes = 2515104/, 'build.mjs enforces the 2,515,104-byte ceiling (1.5x the original baseline)');
  const htmlPath = join(root, 'discrete-math-interactive.html');
  if (existsSync(htmlPath)) assert.ok(readFileSync(htmlPath).length <= MAX_BYTES, 'the built page is within the ceiling');
});

test('every module meets its worked-example floor, with unique example ids course-wide', () => {
  const ids = new Map();
  for (const { file, m } of modules) {
    const ex = examplesOf(m);
    const floor = FLOORS[m.num] ?? 0;
    assert.ok(ex.length >= floor, `${file}: module ${m.num} needs at least ${floor} worked examples (has ${ex.length})`);
    for (const sl of ex) {
      assert.ok(sl.id, `${file}: every worked example has an id`);
      assert.ok(!ids.has(sl.id), `duplicate example id "${sl.id}" in ${file} and ${ids.get(sl.id)}`);
      ids.set(sl.id, file);
    }
  }
});

for (const { file, m, M } of modules) {
  for (const sl of examplesOf(m)) {
    test(`${file}: worked example "${sl.title}"`, () => {
      assert.ok(sl.id, 'the slide has an id');
      assert.ok(plain(sl.problem).length >= 30, 'a stated problem with specific numbers');
      assert.ok(plain(sl.objective).length >= 25, 'a stated objective for the coverage manifest');
      assert.equal(typeof sl.draw, 'function', 'a draw function renders each step');
      checkSteps(sl.steps, 'primary');
      assert.notEqual(sl.answer, undefined, 'the example states its final answer for the machine check');
      assert.equal(typeof sl.verify, 'function', 'the example carries an independent verification');
      assert.equal(sl.verify(M), true, 'verify(M): the stated answer survives an independent computation');
      /* Variants: an alternate or boundary case whose steps are computed, not copied. */
      assert.ok(Array.isArray(sl.variants) && sl.variants.length >= 1, 'the example ships at least one alternate/boundary-case variant');
      sl.variants.forEach((v, vi) => {
        const label = `variant ${vi + 1} ("${v.label}")`;
        assert.ok(typeof v.label === 'string' && v.label.trim().length >= 3, `${label}: the preset switcher label is stated`);
        checkSteps(v.steps, label);
        assert.notEqual(v.answer, undefined, `${label}: states its final answer`);
        assert.equal(typeof v.verify, 'function', `${label}: carries an independent verification`);
        assert.equal(v.verify(M), true, `${label}: verify(M) recomputes the variant answer independently`);
        assert.notEqual(JSON.stringify(v.steps), JSON.stringify(sl.steps), `${label}: steps are computed from the variant input, not a copy of the primary steps`);
      });
    });
  }
}

test('the coverage manifest agrees with the sources', () => {
  const path = join(root, 'examples-manifest.json');
  assert.ok(existsSync(path), 'examples-manifest.json exists (run `node src/build.mjs`)');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const expected = [];
  for (const { m } of [...modules].sort((a, b) => a.m.num - b.m.num)) {
    for (const sl of examplesOf(m)) {
      expected.push({
        id: sl.id, module: m.id, num: m.num, title: strip(sl.title), objective: strip(sl.objective),
        steps: sl.steps.length, checkpoints: sl.steps.filter((st) => st.checkpoint).length, answer: sl.answer,
        variants: (Array.isArray(sl.variants) ? sl.variants : []).map((v) => ({
          label: v.label, steps: v.steps.length, checkpoints: v.steps.filter((st) => st.checkpoint).length, answer: v.answer,
        })),
      });
    }
  }
  assert.equal(manifest.maxBytes, MAX_BYTES, 'the manifest records the size ceiling');
  assert.equal(manifest.total, expected.length, 'the manifest total matches the sources');
  assert.deepEqual(JSON.parse(JSON.stringify(manifest.examples)), JSON.parse(JSON.stringify(expected)),
    'every manifest entry (id, module, objective, steps, checkpoints, variants) matches the sources');
});

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
