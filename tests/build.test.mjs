// The committed page must be exactly what src/ builds, so a source fix can never silently miss students.
// Run: node --test tests/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const modFiles = readdirSync(join(root, 'src', 'modules')).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();

test('src/build.mjs output matches the committed discrete-math-interactive.html', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dm-build-'));
  try {
    const out = join(dir, 'page.html');
    const r = spawnSync(process.execPath, [join(root, 'src', 'build.mjs'), '--out', out, '--no-index'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const fresh = readFileSync(out, 'utf8');
    const committed = readFileSync(join(root, 'discrete-math-interactive.html'), 'utf8');
    assert.ok(fresh === committed, 'discrete-math-interactive.html is stale: run `node src/build.mjs`');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the built page contains every module file exactly once', () => {
  const html = readFileSync(join(root, 'discrete-math-interactive.html'), 'utf8');
  for (const f of modFiles) {
    const marker = `/* ===== ${f} ===== */`;
    assert.equal(html.split(marker).length - 1, 1, `${f} should appear once`);
  }
  assert.equal((html.match(/<script>\n\/\* ===== \d\d-/g) || []).length, modFiles.length, 'one <script> per module');
  assert.match(html, /KATEX_SRI = 'sha384-[A-Za-z0-9+/=]+'/, 'the engine requests KaTeX with its integrity hash');
  assert.doesNotMatch(html, /\son(load|error|click)=/i, 'the page has no inline event handlers');
  assert.match(html, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*" media="print" data-fonts>/, 'fonts are declared non-blocking');
  assert.doesNotMatch(html, /<!--(HEAD|BODY)-->/);
});

test('every inline script in the built page parses as JavaScript and no source needed rewriting', () => {
  const html = readFileSync(join(root, 'discrete-math-interactive.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= modFiles.length + 2, 'engine, one script per module, and the bootstrap');
  for (const [i, body] of scripts.entries()) {
    assert.doesNotMatch(body, /<!--/, `script ${i} contains <!--`);
    new vm.Script(body, { filename: `inline-${i}.js` }); // throws on a syntax error
  }
});

/* The real builder runs against a copy of src/ with one extra module; it must refuse, not rewrite. */
test('the builder refuses a module that contains a script terminator or an HTML comment opener', () => {
  for (const [name, source] of [
    ['raw-template', "DM.module({ id: 'bad', num: 99, slides: [{ title: String.raw`</script>` }] });\n"],
    ['ordinary-string', "DM.module({ id: 'bad', num: 99, slides: [{ title: 'x <!-- y' }] });\n"],
  ]) {
    const dir = mkdtempSync(join(tmpdir(), 'dm-guard-'));
    try {
      cpSync(join(root, 'src'), join(dir, 'src'), { recursive: true });
      writeFileSync(join(dir, 'src', 'modules', '99-bad.js'), source);
      const r = spawnSync(process.execPath, [join(dir, 'src', 'build.mjs'), '--out', join(dir, 'out.html'), '--no-index'], { encoding: 'utf8' });
      assert.notEqual(r.status, 0, `${name}: the build should fail`);
      assert.match(r.stderr, /99-bad\.js: contains "(<\/script|<!--)"/i, `${name}: the error names the module and the sequence`);
      assert.ok(!existsSync(join(dir, 'out.html')), `${name}: nothing is written`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('the dark theme block is emitted twice with identical declarations', () => {
  const html = readFileSync(join(root, 'discrete-math-interactive.html'), 'utf8');
  const auto = /@media \(prefers-color-scheme: dark\) \{\n  :root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\n  \}\n\}/.exec(html);
  const forced = /\n:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/.exec(html);
  assert.ok(auto && forced, 'both dark blocks are present');
  const norm = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  assert.equal(norm(auto[1]), norm(forced[1]));
  assert.ok(norm(auto[1]).includes('--paper:') && norm(auto[1]).includes('--ink:'), 'dark block defines the page tokens');
});

test('a subset build succeeds and keeps the welcome module', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dm-subset-'));
  try {
    const out = join(dir, 'subset.html');
    const r = spawnSync(process.execPath, [join(root, 'src', 'build.mjs'), '--out', out, '--no-index', '--only', '00'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(out, 'utf8');
    assert.match(html, /\/\* ===== 00-welcome\.js ===== \*\//);
    assert.equal((html.match(/<script>\n\/\* ===== \d\d-/g) || []).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('build refuses an unknown flag and a missing module number', () => {
  const bad = spawnSync(process.execPath, [join(root, 'src', 'build.mjs'), '--outt', 'x'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
  const missing = spawnSync(process.execPath, [join(root, 'src', 'build.mjs'), '--only', '99', '--out', join(tmpdir(), 'dm-never.html'), '--no-index'], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /do not exist/);
});
