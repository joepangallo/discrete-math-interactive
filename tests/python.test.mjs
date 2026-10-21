// Every code walkthrough runs under a local CPython and must print exactly its `expected` output.
// The browser suite (tests/e2e/verify.py --python) confirms the same under Pyodide and Brython;
// this check is the fast, offline one. Run: node --test tests/python.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const modDir = join(root, 'src', 'modules');

/* Prefer the newest interpreter on PATH; the lessons target Python 3.14 but only use features from 3.9+. */
function findPython() {
  for (const cmd of ['python3.14', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3']) {
    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return { cmd, version: (r.stdout || r.stderr).trim() };
  }
  return null;
}
const py = findPython();

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
  return found;
}

test(`a Python 3 interpreter is available (${py ? py.version : 'none found'})`, { skip: py ? false : 'python3 is not on PATH; the browser suite still covers these' }, () => {
  assert.ok(py);
});

if (py) {
  for (const m of loadAll()) {
    for (const sl of m.slides.filter((s) => s.kind === 'code')) {
      test(`${m.id}: "${sl.title.replace(/<[^>]+>/g, '')}" prints its expected output under ${py.version}`, () => {
        const src = sl.lines.map((l) => (Array.isArray(l) ? l[0] : l.code)).join('\n') + '\n';
        const r = spawnSync(py.cmd, ['-I', '-c', src], { encoding: 'utf8', timeout: 20000 });
        assert.equal(r.status, 0, `exit ${r.status}\n${r.stderr}`);
        assert.equal(r.stdout.trim(), String(sl.expected).trim());
      });
    }
  }
}
