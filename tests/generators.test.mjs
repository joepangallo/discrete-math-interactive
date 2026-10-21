// Every practice generator is run against the real answer checker for hundreds of seeds, offline.
// Run: node --test tests/generators.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const modDir = join(root, 'src', 'modules');
const SEEDS = (() => {
  const raw = process.env.GEN_SEEDS;
  if (raw === undefined) return 300;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1 || n > 100000) throw new Error(`GEN_SEEDS must be an integer from 1 to 100000 (got ${JSON.stringify(raw)})`);
  return n;
})();

function loadAll() {
  const found = [];
  const sandbox = { DM: { module: (m) => found.push(m), hlPy: (x) => x, renderMath: () => {}, modules: [], util: {}, kinds: {} }, console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(root, 'src', 'util.js'), 'utf8'), sandbox, { filename: 'util.js' });
  const libDir = join(root, 'src', 'lib');
  if (existsSync(libDir)) for (const f of readdirSync(libDir).filter((x) => x.endsWith('.js')).sort()) vm.runInContext(readFileSync(join(libDir, f), 'utf8'), sandbox, { filename: f });
  for (const f of readdirSync(modDir).filter((x) => /^\d\d-.*\.js$/.test(x)).sort()) vm.runInContext(readFileSync(join(modDir, f), 'utf8'), sandbox, { filename: f });
  return { modules: found, util: sandbox.DMUtil };
}

const { modules, util } = loadAll();
const { R, M, checkAnswer } = util;
const fmt = (a) => (Array.isArray(a) ? '{' + a.join(', ') + '}' : String(a));

for (const m of modules) {
  for (const sl of m.slides.filter((s) => s.kind === 'practice')) {
    for (const g of sl.gens) {
      test(`${m.id}: "${g.label}" generator is self-consistent over ${SEEDS} seeds`, () => {
        for (let seed = 1; seed <= SEEDS; seed++) {
          R.seed(seed * 7919 + m.num);
          let p;
          try { p = g.make(R, M); } catch (e) { assert.fail(`seed ${seed}: make() threw ${e.stack || e}`); }
          assert.ok(p && typeof p.prompt === 'string' && p.prompt.trim(), `seed ${seed}: no prompt`);
          assert.ok(typeof p.solution === 'string' && p.solution.trim(), `seed ${seed}: no worked solution`);
          assert.ok(p.answer !== undefined || typeof p.check === 'function', `seed ${seed}: no answer or check`);
          if (typeof p.answer === 'number') assert.ok(Number.isFinite(p.answer), `seed ${seed}: answer is not finite`);
          if (p.options) {
            assert.ok(Array.isArray(p.options) && p.options.length >= 2, `seed ${seed}: options need at least two entries`);
            assert.ok(p.options.map(String).includes(String(p.answer)), `seed ${seed}: answer ${p.answer} is not among the options`);
            assert.equal(new Set(p.options.map(String)).size, p.options.length, `seed ${seed}: duplicate options`);
          }
          const own = p.answerText ?? fmt(p.answer);
          assert.ok(checkAnswer(p, own), `seed ${seed}: own answer "${own}" rejected for prompt: ${p.prompt.replace(/<[^>]+>/g, '').slice(0, 140)}`);
          assert.equal(checkAnswer(p, 'zzz-wrong'), false, `seed ${seed}: a nonsense answer was accepted`);
          if (typeof p.answer === 'number' && !p.check) {
            // the typographic minus and thousands separators that solutions print must be accepted
            const typed = own.replace(/-/g, '−');
            assert.ok(checkAnswer(p, typed), `seed ${seed}: "${typed}" with a typographic minus rejected`);
          }
        }
      });
    }
  }
}
