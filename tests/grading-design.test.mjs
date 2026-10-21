import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

/* Modules may read the shared helpers (DMUtil, src/lib/*.js) while loading, so the sandbox gets them too. */
function loadModule(file) {
  let module;
  const sandbox = { DM: { module: (value) => { module = value; }, hlPy: (value) => value, renderMath: () => {}, modules: [], util: {}, kinds: {} }, console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../src/util.js', import.meta.url), 'utf8'), sandbox, { filename: 'util.js' });
  const libDir = new URL('../src/lib/', import.meta.url);
  if (existsSync(libDir)) for (const f of readdirSync(libDir).filter((x) => x.endsWith('.js')).sort()) vm.runInContext(readFileSync(new URL(f, libDir), 'utf8'), sandbox, { filename: f });
  vm.runInContext(readFileSync(new URL(`../src/modules/${file}`, import.meta.url), 'utf8'), sandbox, { filename: file });
  return module;
}

const trees = loadModule('10-trees.js');
const expressionGenerator = trees.slides.find((slide) => slide.kind === 'practice').gens.find((gen) => gen.label === 'Expression trees');

function postfixProblem(mixedOperators = false) {
  let operator = 0;
  return expressionGenerator.make({
    int: (lo) => lo,
    pick: (options) => options[mixedOperators ? operator++ % options.length : 0],
    chance: () => false,
  });
}

test('postfix grading rejects merged operands and malformed token sequences', () => {
  const problem = postfixProblem();
  assert.equal(problem.answer, '1 1 1 1 + + +');
  for (const input of ['11 1 1 + + +', '1 11 1 + + +', '1 1 11 + + +', '1111+++', '1 1 1 + + +', '1 1 1 1 + +', '1,1,1,1,+,+,+', '1 1 1 1 + + + junk', '']) {
    assert.equal(problem.check(input), false, input);
  }
});

test('postfix grading accepts whitespace and equivalent operator symbols', () => {
  const problem = postfixProblem(true);
  assert.equal(problem.answer, '1 1 1 1 * - +');
  assert.equal(problem.check(problem.answer), true);
  assert.equal(problem.check('  1\t1\n1  1 * - +  '), true);
  assert.equal(problem.check('1 1 1 1×−+'), true);
  assert.equal(problem.check('1 1 1 1 x – +'), true);
  assert.equal(problem.check('1 1 1 1 X - +'), true);
  assert.equal(problem.check('1 1 1 1 ÷ − +'), false);
});

const design = loadModule('14-design.js');
const orderExample = design.slides.find((slide) => slide.kind === 'design').principles.find((principle) => principle.name === 'Make invalid states unrepresentable').good;

test('the displayed Order example validates statuses and stores immutable, distinct string tags', () => {
  const checks = String.raw`
from dataclasses import FrozenInstanceError

def rejects(action, error):
    try:
        action()
    except error:
        return
    raise AssertionError("invalid operation was accepted")

tags = ["vip", "vip"]
order = Order(Status.PENDING, tags)
assert order.status is Status.PENDING
assert order.tags == frozenset({"vip"})
assert isinstance(order.tags, frozenset)
tags.append("later")
assert order.tags == frozenset({"vip"})
for status in Status:
    assert Order(status, frozenset()).status is status
for status in ["shiped", "PENDING", 1, None]:
    rejects(lambda: Order(status, tags), ValueError)
rejects(lambda: Order(Status.PENDING, [1]), ValueError)
rejects(lambda: setattr(order, "status", "shiped"), FrozenInstanceError)
rejects(lambda: setattr(order, "tags", ["replacement"]), FrozenInstanceError)
rejects(lambda: order.tags.add("new"), AttributeError)
print("Order invariants passed")
`;
  const result = spawnSync('python3', ['-c', `${orderExample}\n${checks}`], { encoding: 'utf8', timeout: 10_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Order invariants passed\n');
});
