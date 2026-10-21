/* Propositional-logic helpers shared by the Logic and Proof Techniques modules, exposed as DM.logic.
   Formulas use the variables p q r s, the constants T F, and the connectives ¬ ∧ ∨ ⊕ → ↔. The lexer
   also accepts the keyboard forms ~ ! & && | || ^ -> => <-> <=>, the words and / or / not / xor /
   implies / iff / true / false, and 1 / 0 for T / F. Parse trees are plain objects:
     { v: 'p' }                 a variable
     { c: true }                a constant
     { op: '¬', a }             negation
     { op: '∧' | '∨' | '⊕' | '→' | '↔', a, b }
   This file is a plain script (no import/export) so the build can inline it after core.js. */
(() => {
  'use strict';
  const VARS = ['p', 'q', 'r', 's'];
  const SYMS = [['<->', '↔'], ['<=>', '↔'], ['↔', '↔'], ['⇔', '↔'], ['->', '→'], ['=>', '→'], ['→', '→'], ['⇒', '→'],
    ['&&', '∧'], ['∧', '∧'], ['&', '∧'], ['||', '∨'], ['∨', '∨'], ['|', '∨'], ['⊕', '⊕'], ['^', '⊕'],
    ['¬', '¬'], ['~', '¬'], ['!', '¬'], ['(', '('], [')', ')'], ['⊤', 'T'], ['⊥', 'F'], ['1', 'T'], ['0', 'F']];
  const WORDS = { and: '∧', or: '∨', not: '¬', xor: '⊕', implies: '→', iff: '↔', true: 'T', false: 'F' };

  /** lex(src) turns a formula string into tokens: variables, T, F, connectives and parentheses. */
  function lex(src) {
    const s = String(src);
    const toks = [];
    let i = 0;
    outer: while (i < s.length) {
      if (/\s/.test(s[i])) { i++; continue; }
      for (const [k, v] of SYMS) if (s.startsWith(k, i)) { toks.push(v); i += k.length; continue outer; }
      const w = /^[A-Za-z]+/.exec(s.slice(i));
      if (!w) throw new Error(`I don't recognize the symbol "${s[i]}". Use ¬ ∧ ∨ ⊕ → ↔, or type ~ & | ^ -> <->.`);
      const word = w[0];
      if (WORDS[word.toLowerCase()]) toks.push(WORDS[word.toLowerCase()]);
      else for (const c of word) {
        if (VARS.includes(c) || c === 'T' || c === 'F') toks.push(c);
        else if (VARS.includes(c.toLowerCase())) toks.push(c.toLowerCase());
        else throw new Error(`"${c}" is not a variable here. Use p, q, r and s (T and F are the constants true and false).`);
      }
      i += word.length;
    }
    return toks;
  }

  // precedence from loosest to tightest: ↔, →, ⊕, ∨, ∧, then ¬. → groups to the right: p → q → r = p → (q → r)
  const BIN = ['↔', '→', '⊕', '∨', '∧'];
  /** parse(src, { empty }) builds the tree for a formula; `empty` replaces the message for a blank input.
      Every error message is written for students, so callers show e.message as is. */
  function parse(src, opts = {}) {
    const t = lex(src);
    let i = 0;
    if (!t.length) throw new Error(opts.empty || 'Type a formula, for example p → q.');
    function level(k) {
      if (k === BIN.length) return unary();
      const op = BIN[k];
      const left = level(k + 1);
      if (t[i] !== op) return left;
      i++;
      if (op === '→') return { op, a: left, b: level(k) };
      let n = { op, a: left, b: level(k + 1) };
      while (t[i] === op) { i++; n = { op, a: n, b: level(k + 1) }; }
      return n;
    }
    function unary() {
      if (t[i] === '¬') { i++; return { op: '¬', a: unary() }; }
      const tok = t[i++];
      if (tok === '(') {
        const n = level(0);
        if (t[i++] !== ')') throw new Error('A "(" is missing its matching ")".');
        return n;
      }
      if (VARS.includes(tok)) return { v: tok };
      if (tok === 'T' || tok === 'F') return { c: tok === 'T' };
      if (tok === undefined) throw new Error('The formula ends too early: every operator needs something on its right.');
      throw new Error(`"${tok}" cannot start a formula here. Expected a variable, ¬ or "(".`);
    }
    const tree = level(0);
    if (i < t.length) throw new Error(t[i] === ')' ? 'There is a ")" without a matching "(".' : `Something is missing before "${t[i]}". Put an operator such as ∧ or → between two parts.`);
    return tree;
  }

  /** ev(tree, env) evaluates a tree under an assignment such as { p: true, q: false }. */
  function ev(n, env) {
    if (n.v) return env[n.v];
    if ('c' in n) return n.c;
    const a = ev(n.a, env);
    if (n.op === '¬') return !a;
    const b = ev(n.b, env);
    if (n.op === '∧') return a && b;
    if (n.op === '∨') return a || b;
    if (n.op === '⊕') return a !== b;
    if (n.op === '→') return !a || b;
    return a === b;
  }

  /** show(tree) prints a formula with Unicode connectives, fully parenthesized except for chains of
      the same ∧ or ∨, so students never have to recall precedence. */
  function show(n, parent) {
    if (n.v) return n.v;
    if ('c' in n) return n.c ? 'T' : 'F';
    if (n.op === '¬') return '¬' + show(n.a, '¬');
    const s = show(n.a, n.op) + ' ' + n.op + ' ' + show(n.b, n.op);
    return !parent || (parent === n.op && (n.op === '∧' || n.op === '∨')) ? s : '(' + s + ')';
  }
  const TEXOP = { '∧': '\\land', '∨': '\\lor', '⊕': '\\oplus', '→': '\\to', '↔': '\\leftrightarrow' };
  /** toTex(tree) prints the same formula as TeX for the math renderer, with the same parentheses. */
  function toTex(n, parent) {
    if (n.v) return n.v;
    if ('c' in n) return n.c ? '\\mathrm{T}' : '\\mathrm{F}';
    if (n.op === '¬') return '\\neg ' + toTex(n.a, '¬');
    const s = toTex(n.a, n.op) + ' ' + TEXOP[n.op] + ' ' + toTex(n.b, n.op);
    return !parent || (parent === n.op && (n.op === '∧' || n.op === '∨')) ? s : '(' + s + ')';
  }

  /** steps(tree) lists the compound sub-formulas from the inside out, each once: the order a person
      evaluates them in, and the columns of a truth table. Variables and constants are left out. */
  function steps(n, out = [], seen = new Set()) {
    if (n.v || 'c' in n) return out;
    steps(n.a, out, seen);
    if (n.b) steps(n.b, out, seen);
    const k = show(n);
    if (!seen.has(k)) { seen.add(k); out.push(n); }
    return out;
  }
  /** collect(tree, set) adds every variable name in the tree to the set and returns it. */
  function collect(n, acc) { if (n.v) acc.add(n.v); if (n.a) collect(n.a, acc); if (n.b) collect(n.b, acc); return acc; }
  /** varsOf(treeA, treeB, …) or varsOf([trees]) gives the variables used, in the fixed order p q r s. */
  const varsOf = (...trees) => { const acc = new Set(); trees.flat().forEach((t) => collect(t, acc)); return VARS.filter((v) => acc.has(v)); };
  /** assignments(vars) lists every row of the truth table in textbook order: all T first, the last
      variable alternating fastest. Each row is an object such as { p: true, q: false }. */
  function assignments(vars) {
    const out = [];
    for (let m = 0; m < 2 ** vars.length; m++) {
      const env = {};
      vars.forEach((v, j) => { env[v] = !((m >> (vars.length - 1 - j)) & 1); });
      out.push(env);
    }
    return out;
  }

  /** L(bool) is the letter T or F; tf(bool) is the same letter as a colored pill; envText lists a row. */
  const L = (b) => (b ? 'T' : 'F');
  const tf = (b) => `<span class="pill ${b ? 't' : 'f'}">${L(b)}</span>`;
  const envText = (vars, e) => vars.map((v) => `${v} = ${L(e[v])}`).join(', ');

  /** firstDifference(f, g) finds the first row where two trees disagree ({ vars, bad }); bad is
      undefined when they are logically equivalent. */
  function firstDifference(f, g) {
    const vars = varsOf(f, g);
    return { vars, bad: assignments(vars).find((e) => ev(f, e) !== ev(g, e)) };
  }
  /** sameMeaning(srcA, srcB) is true when two formula strings are equivalent; unparsable input is false. */
  function sameMeaning(srcA, srcB) {
    try { return !firstDifference(parse(srcA), parse(srcB)).bad; } catch { return false; }
  }
  /** reason(node, env) gives one short sentence for why a compound node has its value in that row. */
  function reason(n, env) {
    const a = ev(n.a, env);
    const b = n.b ? ev(n.b, env) : null;
    const A = show(n.a), B = n.b ? show(n.b) : '';
    if (n.op === '¬') return `${A} is ${L(a)}, and ¬ flips it`;
    if (n.op === '∧') return a && b ? 'both sides are T' : `${!a ? A : B} is F`;
    if (n.op === '∨') return a || b ? `${a ? A : B} is T` : 'both sides are F';
    if (n.op === '⊕') return a !== b ? 'exactly one side is T' : `both sides are ${L(a)}`;
    if (n.op === '→') return a && !b ? 'hypothesis T, conclusion F: the only false case' : !a ? 'the hypothesis is F, so it is vacuously true' : 'the conclusion is T';
    return a === b ? `both sides are ${L(a)}` : 'the two sides differ';
  }

  DM.logic = { VARS, lex, parse, ev, show, toTex, steps, collect, varsOf, assignments, L, tf, envText, firstDifference, sameMeaning, reason };
})();
