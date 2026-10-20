// Content checks for every course module. Run: node --test tests/content.test.mjs
// These enforce the course's promises: every code line is explained, every quiz answer is
// explained, every module meets the slide mix, and nothing student-facing leaks private details.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const modDir = join(here, '..', 'src', 'modules');
const files = readdirSync(modDir).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();

function load(file) {
  const found = [];
  // modules may call these engine helpers while loading; stubs are enough for content checks
  const sandbox = { DM: { module: (m) => found.push(m), hlPy: (x) => x, renderMath: () => {}, modules: [], util: {} }, console };
  vm.runInNewContext(readFileSync(join(modDir, file), 'utf8'), sandbox, { filename: file });
  assert.equal(found.length, 1, `${file} should register exactly one module`);
  return found[0];
}

const FORBIDDEN = [/keiser/i, /COT\s*2104/i, /\bclaude\b/i, /anthropic/i, /rubric/i, /academic integrity/i, /\/Users\//, /lorem ipsum/i];

for (const file of files) {
  const src = readFileSync(join(modDir, file), 'utf8');
  const m = load(file);
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
