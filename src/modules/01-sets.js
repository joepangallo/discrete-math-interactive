/* Module 1: Sets. Objective 1: apply set terminology and notation.
   This module is the reference pattern for every other module: concepts, labs, code walkthroughs,
   design practice, endless practice, and a quiz. */
(() => {
  // ---- set expression parser shared by the Venn lab: A B C U, ∪ ∩ − Δ, postfix ′ for complement ----
  function tokenize(src) {
    const map = { '∪': '|', '|': '|', '+': '|', '∩': '&', '&': '&', '*': '&', '−': '-', '-': '-', '\\': '-', 'Δ': '^', '^': '^', '′': "'", "'": "'", 'ᶜ': "'" };
    const toks = [];
    for (const ch of src.replace(/\s+/g, '')) {
      if (/[ABCU]/i.test(ch)) toks.push(ch.toUpperCase());
      else if (ch === '(' || ch === ')') toks.push(ch);
      else if (map[ch]) toks.push(map[ch]);
      else throw new Error(`I don't recognize the symbol "${ch}". Use A, B, C, U, ∪, ∩, −, Δ, ′ and parentheses.`);
    }
    return toks;
  }
  // precedence: ′ (postfix) binds tightest, then ∩, then ∪ − Δ (left to right)
  function parse(src) {
    const t = tokenize(src);
    let i = 0;
    const peek = () => t[i];
    function atom() {
      let node;
      const tok = t[i++];
      if (tok === '(') { node = union(); if (t[i++] !== ')') throw new Error('A "(" is missing its matching ")".'); }
      else if (/^[ABCU]$/.test(tok || '')) node = { v: tok };
      else throw new Error(tok ? `Unexpected "${tok}".` : 'The expression ends too early.');
      while (peek() === "'") { i++; node = { op: "'", a: node }; }
      return node;
    }
    function inter() { let n = atom(); while (peek() === '&') { i++; n = { op: '&', a: n, b: atom() }; } return n; }
    function union() { let n = inter(); while (peek() === '|' || peek() === '-' || peek() === '^') { const op = t[i++]; n = { op, a: n, b: inter() }; } return n; }
    if (!t.length) throw new Error('Type an expression, for example A ∪ B.');
    const tree = union();
    if (i < t.length) throw new Error(`Unexpected "${t[i]}" near the end.`);
    return tree;
  }
  // evaluate for one element, given its membership in A, B, C
  function holds(node, mem) {
    if (node.v) return node.v === 'U' ? true : mem[node.v];
    const a = holds(node.a, mem);
    if (node.op === "'") return !a;
    const b = holds(node.b, mem);
    return node.op === '|' ? a || b : node.op === '&' ? a && b : node.op === '-' ? a && !b : a !== b;
  }
  const SYM = { '|': ' ∪ ', '&': ' ∩ ', '-': ' − ', '^': ' Δ ' };
  function show(node, top = true) {
    if (node.v) return node.v;
    if (node.op === "'") return (node.a.v ? node.a.v : '(' + show(node.a, false) + ')') + '′';
    const s = show(node.a, false) + SYM[node.op] + show(node.b, false);
    return top ? s : '(' + s + ')';
  }
  // list the sub-expressions from the inside out, so students see the order of evaluation
  function steps(node, out = []) {
    if (node.v) return out;
    steps(node.a, out);
    if (node.b) steps(node.b, out);
    out.push(node);
    return out;
  }
  const parseRoster = (txt) => [...new Set(String(txt).split(/[,\s]+/).map((x) => x.trim()).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort((a, b) => a - b);
  const fmt = (arr) => (arr.length ? '{' + arr.join(', ') + '}' : '∅');
  const fmtList = (arr) => (arr.length <= 2 ? arr.join(' and ') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);

  /* ---- worked-example generators: each example's steps are computed from a preset data object,
     so the primary problem and its variant share one generator and differ only in their input ---- */
  // Venn shading: shade A, then a first compound of A and B, then C′, then combine the two shadings.
  const VENN_SETS = { U: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], A: [1, 2, 3, 4, 5], B: [4, 5, 6, 7], C: [2, 5, 8] };
  const EX_VENN_MAIN = { ...VENN_SETS, firstOp: 'union', combineOp: 'intersection', firstName: 'A ∪ B', exprName: '(A ∪ B) ∩ C′',
    answerBanner: '(A ∪ B) ∩ C′ = {1, 3, 4, 6, 7} — check: every listed element is in A or in B, and none of them is in C' };
  const EX_VENN_VARIANT = { ...VENN_SETS, firstOp: 'intersection', combineOp: 'union', firstName: 'A ∩ B', exprName: '(A ∩ B) ∪ C′',
    answerBanner: '(A ∩ B) ∪ C′ = {1, 3, 4, 5, 6, 7, 9, 10} — check: every listed element is outside C or in both A and B at once; 5 is in C but is saved by the overlap' };
  function vennParts(D) {
    const first = D.U.filter((x) => (D.firstOp === 'union' ? (D.A.includes(x) || D.B.includes(x)) : (D.A.includes(x) && D.B.includes(x))));
    const comp = D.U.filter((x) => !D.C.includes(x));
    const fin = D.U.filter((x) => (D.combineOp === 'intersection' ? (first.includes(x) && comp.includes(x)) : (first.includes(x) || comp.includes(x))));
    return { first, comp, fin };
  }
  function vennStepsFor(D) {
    const { first, comp, fin } = vennParts(D);
    const union = D.firstOp === 'union', inter = D.combineOp === 'intersection';
    const regionName = { '100': 'A only', '010': 'B only', '001': 'C only', '110': 'A ∩ B outside C', '101': 'A ∩ C outside B', '011': 'B ∩ C outside A', '111': 'A ∩ B inside C', '000': 'outside every circle' };
    const groups = [];
    for (const x of fin) {
      const key = (D.A.includes(x) ? '1' : '0') + (D.B.includes(x) ? '1' : '0') + (D.C.includes(x) ? '1' : '0');
      const g = groups[groups.length - 1];
      if (g && g.key === key) g.els.push(x); else groups.push({ key, els: [x] });
    }
    const groupText = fmtList(groups.map((g) => `${fmtList(g.els)} from ${regionName[g.key]}`));
    const inFirstInC = first.filter((x) => D.C.includes(x));
    const savedByFirst = inFirstInC.filter((x) => fin.includes(x));
    const outsideAll = comp.filter((x) => !D.A.includes(x) && !D.B.includes(x));
    return [
      { phase: 0, status: 'Regions placed · nothing shaded yet', caption: `Plan first: place every element of U in its region, then work inside-out — shade A, ${union ? 'grow' : 'shrink'} the shading to ${D.firstName}, switch to the complement of C, and ${inter ? 'keep only what both shadings share' : 'keep anything that either shading covers'}. Nothing is shaded yet, so this first picture is the map for every later step.` },
      { phase: 1, status: `Shaded: A = ${fmt(D.A)}`, caption: `Shade all of circle A, because the first sub-expression is just A = ${fmt(D.A)}. Every region inside circle A is now shaded, including the parts that also lie inside B or inside C.` },
      union
        ? { phase: 2, status: `Shaded: A ∪ B = ${fmt(first)}`, caption: `Extend the shading to all of circle B as well, because a union keeps anything that is in either set: A ∪ B = ${fmt(first)}. The shaded area is now the whole of both circles, with the overlap shaded once, not twice.` }
        : { phase: 2, status: `Shaded: A ∩ B = ${fmt(first)}`, caption: `Shrink the shading to the overlap of the two circles, because an intersection keeps only what is in both sets at once: A ∩ B = ${fmt(first)}. The parts of A alone and of B alone go blank again, and only the lens where the circles overlap stays shaded.` },
      { phase: 3, status: `Shaded: C′ = ${fmt(comp)} (everything outside C)`, checkpoint: inter ? `Predict: when the two shadings are intersected next, which members of ${D.firstName} drop out — the ones inside C, or the ones outside it?` : `Predict: when the two shadings are unioned next, will ${fmtList(savedByFirst)} — inside C, but also inside ${D.firstName} — end up in the final set?`, caption: `Start over with a different shading: everything outside circle C, because the complement C′ = ${fmt(comp)} holds all of U except ${fmtList(D.C)}. Even the corners of the universe, outside every circle, are shaded this time.` },
      inter
        ? { phase: 4, status: `Kept: in ${D.firstName} and outside C = ${fmt(fin)}`, caption: `Intersect the two shadings: keep only the regions that were shaded in both senses, meaning in ${D.firstName} and also outside C. The elements ${fmtList(inFirstInC)} drop out because they lie inside C, and ${fmtList(comp.filter((x) => !first.includes(x)))} drop out because they were never in ${D.firstName}.` }
        : { phase: 4, status: `Kept: in ${D.firstName} or outside C = ${fmt(fin)}`, caption: `Union the two shadings: keep every region that was shaded in either sense, meaning in ${D.firstName} or outside C. The element ${fmtList(savedByFirst)} stays through the intersection even though it lies inside C, and ${fmtList(outsideAll)} join through the complement even though they lie in neither A nor B.` },
      { phase: 4, answer: true, status: `Final regions outlined in bold: ${fmt(fin)}`, caption: inter
        ? `Answer: ${D.exprName} = ${fmt(fin)}, read region by region — ${groupText}. Check each one: it is in A or in B and it is not in C, while the only other members of ${D.firstName}, namely ${fmtList(first.filter((x) => !fin.includes(x)))}, fail because they lie in C.`
        : `Answer: ${D.exprName} = ${fmt(fin)}, read region by region — ${groupText}. Check each one: it is outside C, or it lies in both A and B at once. The only members of U left out are ${fmtList(D.U.filter((x) => !fin.includes(x)))}, and each of them lies in C without being in ${D.firstName}, so neither shading ever covers it.` },
    ];
  }
  // De Morgan by membership table: the two presets are the two laws, on the same sets.
  const EX_DM_MAIN = { U: [1, 2, 3, 4, 5, 6], A: [1, 2, 3], B: [3, 4], form: 'union',
    bannerTail: '5 and 6 are exactly the elements in neither A nor B' };
  const EX_DM_VARIANT = { U: [1, 2, 3, 4, 5, 6], A: [1, 2, 3], B: [3, 4], form: 'intersection',
    bannerTail: 'every element except 3 lies outside at least one of A and B' };
  function dmCols(D) {
    const inA = (x) => D.A.includes(x), inB = (x) => D.B.includes(x);
    const opF = D.form === 'union' ? (x) => inA(x) || inB(x) : (x) => inA(x) && inB(x);
    const rhsF = D.form === 'union' ? (x) => !inA(x) && !inB(x) : (x) => !inA(x) || !inB(x);
    return [
      { head: 'in A', f: inA },
      { head: 'in B', f: inB },
      { head: D.form === 'union' ? 'in A ∪ B' : 'in A ∩ B', f: opF },
      { head: D.form === 'union' ? 'in (A ∪ B)′' : 'in (A ∩ B)′', f: (x) => !opF(x) },
      { head: 'in A′', f: (x) => !inA(x) },
      { head: 'in B′', f: (x) => !inB(x) },
      { head: D.form === 'union' ? 'in A′ ∩ B′' : 'in A′ ∪ B′', f: rhsF },
    ];
  }
  function dmStepsFor(D) {
    const COLS = dmCols(D);
    const setOf = (f) => D.U.filter(f);
    const opSet = setOf(COLS[2].f), lhsSet = setOf(COLS[3].f), aC = setOf(COLS[4].f), bC = setOf(COLS[5].f), rhsSet = setOf(COLS[6].f);
    const opName = COLS[2].head.replace('in ', ''), lhsName = COLS[3].head.replace('in ', ''), rhsName = COLS[6].head.replace('in ', '');
    const pattern = D.U.map((x) => (COLS[3].f(x) ? 'T' : 'F')).join(', ');
    const union = D.form === 'union';
    return [
      { cols: 2, fresh: [0, 1], compare: false, status: 'Columns so far: x, in A, in B', caption: `Start with the raw facts only: one row for each element of U = ${fmt(D.U)}, with a T where the element belongs to A = ${fmt(D.A)} or to B = ${fmt(D.B)}. Every later column is computed from these two columns, row by row.` },
      union
        ? { cols: 3, fresh: [2], compare: false, status: `New column: in ${opName} = ${fmt(opSet)}`, caption: `Add the union column: an element is in A ∪ B when its row has a T in the A column, in the B column, or in both. Only ${fmtList(setOf((x) => !COLS[2].f(x)))} get an F here, because they are the elements that belong to neither set.` }
        : { cols: 3, fresh: [2], compare: false, status: `New column: in ${opName} = ${fmt(opSet)}`, caption: `Add the intersection column: an element is in A ∩ B only when its row has a T in both the A column and the B column. Only ${fmtList(opSet)} gets a T here, because it is the single element that belongs to both sets at once.` },
      { cols: 4, fresh: [3], compare: false, status: `New column: in ${lhsName} = ${fmt(lhsSet)}`, caption: `Flip the ${union ? 'union' : 'intersection'} column to get ${lhsName}: every T becomes F and every F becomes T, because a complement keeps exactly the elements the original set missed. This column is T only for ${fmtList(lhsSet)}, so the left-hand side of the law is ${fmt(lhsSet)}.` },
      { cols: 6, fresh: [4, 5], compare: false, status: `New columns: in A′ = ${fmt(aC)} and in B′ = ${fmt(bC)}`, caption: `Now build the right-hand side in pieces: A′ flips the A column and B′ flips the B column, each one keeping the elements outside that single set. These two columns are the ingredients for the ${union ? 'intersection' : 'union'} that finishes the right-hand side.` },
      { cols: 7, fresh: [6], compare: false, checkpoint: `Predict: will this last column match the ${lhsName} column in every one of the ${D.U.length} rows, or will a single row disagree?`, status: `New column: in ${rhsName} = ${fmt(rhsSet)}`, caption: union
        ? `Intersect the last two columns: ${rhsName} is T only where a row has a T in both A′ and B′, because an intersection demands both conditions at once. That happens only for ${fmtList(rhsSet)}, the elements that are outside A and also outside B.`
        : `Union the last two columns: ${rhsName} is T wherever a row has a T in A′, in B′, or in both, because a union needs only one of its conditions to hold. That happens for ${fmtList(rhsSet)} — every element except ${fmtList(opSet)}, the only element that lies in both A and B.` },
      { cols: 7, fresh: [], compare: true, answer: true, status: `Compare: the ${lhsName} column and the ${rhsName} column — identical`, caption: `Answer: the ${lhsName} column and the ${rhsName} column are identical in all ${D.U.length} rows — ${pattern} — so the two sets are equal and ${lhsName} = ${rhsName} = ${fmt(lhsSet)}. The check is the row-by-row match itself, and it fits the picture: ${union ? `${fmtList(lhsSet)} are exactly the elements in neither A nor B` : `every element except ${fmtList(opSet)} fails to be in both A and B at once`}.` },
    ];
  }

  // Cartesian product: fill the A × B grid one ordered pair at a time, sweeping row by row.
  const EX_CART_MAIN = { A: ['S', 'M', 'L'], B: ['red', 'blue'] };
  const EX_CART_VARIANT = { A: ['one-size'], B: ['red', 'blue', 'black'] };
  function cartPairs(D) { const out = []; for (const a of D.A) for (const b of D.B) out.push(`(${a}, ${b})`); return out; }
  function cartStepsFor(D) {
    const pairs = cartPairs(D);
    const total = pairs.length;
    const steps = [{ filled: 0, status: `The empty grid: ${D.A.length} row${D.A.length === 1 ? '' : 's'} for A by ${D.B.length} columns for B`, caption: `Set up the grid for A × B with A = ${fmt(D.A)} down the side and B = ${fmt(D.B)} across the top. Each cell will hold exactly one ordered pair (a, b), so filling the grid cell by cell, row by row, builds the whole product with nothing missed and nothing repeated.` }];
    pairs.forEach((p, i) => {
      const a = D.A[Math.floor(i / D.B.length)], b = D.B[i % D.B.length];
      const st = { filled: i + 1, status: `Placed ${p} · ${i + 1} of ${total} pairs`, caption: `Fill the cell in row ${a}, column ${b} with the ordered pair ${p}: the first coordinate must come from A and the second from B, in that order. ${i + 1 === total ? 'That was the last empty cell of the grid, so the sweep is finished and every combination now appears exactly once.' : `The grid now holds ${i + 1} of the ${total} pairs, and the sweep moves ${i % D.B.length === D.B.length - 1 ? 'down to the next row, because this row has one cell per element of B' : 'one cell to the right, staying in the same row'}.`}` };
      if (i === total - 2) st.checkpoint = 'Predict: which ordered pair fills the very last cell of the grid, and how many pairs will A × B contain in all?';
      steps.push(st);
    });
    steps.push({ filled: total, answer: true, status: `Complete: |A × B| = ${D.A.length} · ${D.B.length} = ${total}`, caption: `Answer: A × B = ${fmt(pairs)}, which is ${total} pairs, because each of the ${D.A.length} row${D.A.length === 1 ? '' : 's'} contributes ${D.B.length} pairs — the count is ${D.A.length} · ${D.B.length} = ${total}, the product rule. Swapping the factors would give B × A, whose pairs are reversed, a different set unless the two sets happen to be equal.` });
    return steps;
  }
  // Power set: decide include/exclude one element at a time; the subset list doubles at each element.
  const EX_PS_MAIN = { els: ['a', 'b', 'c'] };
  const EX_PS_VARIANT = { els: ['p', 'q'] };
  function psSubsets(els, k) {
    let subs = [[]];
    for (let i = 0; i < k; i++) subs = subs.concat(subs.map((s) => s.concat(els[i])));
    return subs;
  }
  const psShow = (s) => (s.length ? '{' + s.join(', ') + '}' : '∅');
  function psStepsFor(D) {
    const n = D.els.length, total = 2 ** n;
    const steps = [
      { decided: -1, status: `The plan: one include-or-exclude decision per element of S = ${fmt(D.els)}`, caption: `Build 𝒫(S) by deciding, for each element of S = ${fmt(D.els)} in turn, whether it goes into the subset or stays out. Every finished sequence of decisions is one subset, and because each decision has exactly 2 outcomes, the count should double at every element until it reaches 2^${n} = ${total}.` },
      { decided: 0, status: 'Before any decision: exactly 1 subset, ∅', caption: 'Start before any element is decided: there is exactly one partial subset, the empty set ∅, because with no decisions made there is only one way things can stand. This single subset is the seed that every later doubling grows from, so the count starts at 1, not at 0.' },
    ];
    D.els.forEach((x, i) => {
      const before = 2 ** i, after = 2 ** (i + 1);
      const prevLast = psSubsets(D.els, i).slice(-1)[0];
      const st = { decided: i + 1, status: `Decided ${x}: ${before} → ${after} subsets`, caption: `Decide ${x}: every existing subset appears twice in the new list, once leaving ${x} out and once with ${x} added, so the list doubles from ${before} to ${after} subsets. The last new subset is ${psShow(prevLast.concat(x))}, formed by adding ${x} to ${psShow(prevLast)}, the largest subset built so far.` };
      if (i === n - 2) st.checkpoint = `Predict: deciding the last element, ${D.els[n - 1]}, doubles the list once more — how many subsets will there be in all, and which subset ends up largest?`;
      steps.push(st);
    });
    steps.push({ decided: n, answer: true, status: `Complete: |𝒫(S)| = 2^${n} = ${total}`, caption: `Answer: 𝒫(S) = ${fmt(psSubsets(D.els, n).map(psShow))}, which is ${total} subsets — the doubling lands exactly on 2^${n} = ${total}, as promised. The full set ${psShow(D.els)} itself appears as the very last subset, the one where every decision said "in", and ∅ is there too, from the sequence where every decision said "out".` });
    return steps;
  }

  DM.module({
    id: 'sets',
    num: 1,
    title: 'Sets',
    objectives: [1],
    terms: {
      'set': 'An unordered collection of distinct objects. Order does not matter and repeats are ignored, so {1, 2} and {2, 1, 1} are the same set.',
      'element': 'One of the objects inside a set. We write x ∈ A to say "x is an element of A".',
      'roster notation': 'Describing a set by listing its elements between braces, such as {2, 4, 6}.',
      'set-builder notation': 'Describing a set by a rule its elements satisfy, such as {x ∈ ℤ | x > 0}, read "the set of integers x such that x is greater than 0".',
      'cardinality': 'The number of elements in a finite set, written |A|.',
      'empty set': 'The set with no elements, written ∅ or {}. Its cardinality is 0, and it is a subset of every set.',
      'subset': 'A ⊆ B means every element of A is also an element of B.',
      'proper subset': 'A ⊂ B means A ⊆ B and A ≠ B: B has at least one element that A lacks.',
      'power set': 'The set of all subsets of A, written 𝒫(A). If |A| = n then |𝒫(A)| = 2ⁿ.',
      'universal set': 'The set U of everything under discussion in a problem. Complements are always taken relative to U.',
      'complement': "A′ (also written Aᶜ or Ā) is everything in the universal set U that is not in A: A′ = U − A.",
      'union': 'A ∪ B contains every element that is in A, in B, or in both. It matches the logical "or".',
      'intersection': 'A ∩ B contains the elements that are in both A and B. It matches the logical "and".',
      'set difference': 'A − B (also written A \\ B) contains the elements of A that are not in B.',
      'symmetric difference': 'A Δ B contains the elements in exactly one of A or B. It matches the logical "exclusive or".',
      'disjoint': 'Two sets are disjoint when they share no elements, that is, A ∩ B = ∅.',
      'ordered pair': 'A pair (a, b) where order matters: (1, 2) ≠ (2, 1).',
      'cartesian product': 'A × B is the set of all ordered pairs (a, b) with a ∈ A and b ∈ B. |A × B| = |A| · |B|.',
      'jaccard similarity': 'For two sets, |A ∩ B| ÷ |A ∪ B|: the share of all distinct items that the two sets have in common. 1 means identical, 0 means disjoint.',
    },
    symbols: [
      ['∈', 'is an element of', '3 ∈ {1, 2, 3}'],
      ['∉', 'is not an element of', '7 ∉ {1, 2, 3}'],
      ['{ | }', 'set-builder: "such that"', '{x | x > 0}'],
      ['|A|', 'cardinality (size)', '|{a, b}| = 2'],
      ['∅', 'empty set', '|∅| = 0'],
      ['⊆', 'subset of', '{1} ⊆ {1, 2}'],
      ['⊂', 'proper subset of', '{1} ⊂ {1, 2}'],
      ['𝒫(A)', 'power set', '𝒫({a}) = {∅, {a}}'],
      ['U', 'universal set', 'U = {1, …, 10}'],
      ['∪', 'union', 'A ∪ B'],
      ['∩', 'intersection', 'A ∩ B'],
      ['−', 'set difference', 'A − B'],
      ['Δ', 'symmetric difference', 'A Δ B'],
      ['A′', 'complement', 'U − A'],
      ['×', 'Cartesian product', 'A × B'],
      ['ℕ ℤ ℚ ℝ', 'naturals, integers, rationals, reals', '−3 ∈ ℤ, −3 ∉ ℕ'],
    ],
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'What is a set?',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">set</span> is an unordered collection of distinct objects, called its <span class="term">element</span>s. We write \(x \in A\) for "\(x\) is an element of \(A\)" and \(x \notin A\) for "it is not".<div class="eg">\(A = \{2, 4, 6\}\) has three elements, so \(4 \in A\) and \(5 \notin A\).</div></div>
              <p>There are two standard ways to describe a set:</p>
              <ul>
                <li><b><span class="term">Roster notation</span></b> lists the elements: \(V = \{a, e, i, o, u\}\).</li>
                <li><b><span class="term">Set-builder notation</span></b> gives a rule: \(E = \{x \in \mathbb{Z} \mid 0 \le x \le 10,\ x \text{ even}\}\). Read the bar as "such that".</li>
              </ul>
              <p>Two facts surprise beginners. <b>Order does not matter</b>: \(\{1,2,3\} = \{3,1,2\}\). <b>Repeats do not count</b>: \(\{1,1,2\} = \{1,2\}\).</p>
              <div class="ai">A language model's vocabulary is a set of tokens: each token appears once, and the model only asks "is this token in the vocabulary?" A spam filter's list of blocked senders is also a set.</div>
            </div>
            <div class="stack">
              <div class="card">
                <h3>Size, emptiness, and the famous number sets</h3>
                <p class="small">The <span class="term">cardinality</span> \(|A|\) counts the elements of a finite set: \(|\{a, e, i, o, u\}| = 5\). The <span class="term">empty set</span> \(\varnothing = \{\}\) has \(|\varnothing| = 0\).</p>
                <table class="tt" style="margin-top:0.5rem;width:100%">
                  <thead><tr><th>Symbol</th><th class="l">Name</th><th class="l">Elements</th></tr></thead>
                  <tbody>
                    <tr><td>\(\mathbb{N}\)</td><td class="l">natural numbers</td><td class="l">0, 1, 2, 3, … (this course includes 0)</td></tr>
                    <tr><td>\(\mathbb{Z}\)</td><td class="l">integers</td><td class="l">…, −2, −1, 0, 1, 2, …</td></tr>
                    <tr><td>\(\mathbb{Q}\)</td><td class="l">rational numbers</td><td class="l">fractions \(p/q\) with \(q \neq 0\)</td></tr>
                    <tr><td>\(\mathbb{R}\)</td><td class="l">real numbers</td><td class="l">every point on the number line</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="ex">Is \(\{\varnothing\}\) empty? No. It is a set with <i>one</i> element, and that element happens to be the empty set. So \(|\{\varnothing\}| = 1\) while \(|\varnothing| = 0\). Think of an empty box inside a box: the outer box is not empty.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Subsets, equality, and the power set',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">\(A \subseteq B\) (a <span class="term">subset</span>) means every element of \(A\) is also in \(B\). \(A \subset B\) (a <span class="term">proper subset</span>) adds that \(B\) has something extra.<div class="eg">\(\{a, b\} \subset \{a, b, c\}\): both are in, and \(c\) is extra. \(\{a, d\} \not\subseteq \{a, b, c\}\) because \(d\) is missing.</div></div>
              <div class="thm">Two sets are equal exactly when each is a subset of the other:
                \[A = B \iff (A \subseteq B \text{ and } B \subseteq A)\]
                This is how you <i>prove</i> two sets are equal: show every element of the left is in the right, then the reverse.</div>
              <div class="ex">Let \(A = \{1, 2\}\) and \(B = \{1, 2, 3\}\). Then \(A \subseteq B\) and \(A \subset B\), but \(B \not\subseteq A\) because \(3 \notin A\). Also \(\varnothing \subseteq A\): the empty set has no element that could fail the test.</div>
              <div class="warn">\(\in\) and \(\subseteq\) are different questions. \(1 \in \{1, 2\}\) is true, but \(1 \subseteq \{1, 2\}\) is meaningless because 1 is a number, not a set. The correct subset statement is \(\{1\} \subseteq \{1, 2\}\).</div>
            </div>
            <div class="stack">
              <div class="def">The <span class="term">power set</span> \(\mathcal{P}(A)\) is the set of <i>all</i> subsets of \(A\), including \(\varnothing\) and \(A\) itself.<div class="eg">\(\mathcal{P}(\{7\}) = \{\varnothing, \{7\}\}\): take nothing, or take the 7.</div></div>
              <p class="big-math">\(\mathcal{P}(\{a,b\}) = \{\varnothing, \{a\}, \{b\}, \{a,b\}\}\)</p>
              <div class="thm">If \(|A| = n\), then \(|\mathcal{P}(A)| = 2^n\).</div>
              <p>Why \(2^n\)? Building a subset means making one yes/no decision per element: "is \(a\) in? is \(b\) in? …". That is \(n\) independent two-way choices, so \(2 \cdot 2 \cdots 2 = 2^n\) subsets. Each subset matches one \(n\)-bit binary string, where bit \(i\) says whether element \(i\) is in. The next slide lets you see this happen.</p>
              <div class="ai">Feature selection in machine learning asks which subset of \(n\) input features gives the best model. There are \(2^n\) candidate subsets, so with 40 features there are over a trillion. Exhaustive search becomes impossible, and that is why greedy and randomized search methods exist.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: build a power set one bit at a time',
        kind: 'lab',
        html: String.raw`<p class="muted small">Choose how many elements \(A\) has. Every subset is listed, grouped by size. Hover or tap a subset to see the binary string that encodes it: a 1 in position \(i\) means element \(i\) is included.</p>`,
        render(body, ctx) {
          const { h } = ctx;
          const names = ['a', 'b', 'c', 'd', 'e'];
          let n = 3;
          const info = h('div.card.stack', { style: { gap: '0.45rem' } });
          const grid = h('div.stack', { style: { gap: '0.5rem', overflow: 'auto', minHeight: 0 } });
          const ctl = h('div.row');
          body.append(h('div.split-narrow.fill', { style: { alignItems: 'stretch', minHeight: 0 } }, h('div.stack', ctl, info), grid));
          const focus = h('div.big-math', { style: { minHeight: '2.2em' } });
          function draw() {
            ctl.replaceChildren(
              h('span.small.muted', 'Elements in A:'),
              h('div.seg', ...[1, 2, 3, 4, 5].map((k) => h('button', { 'aria-pressed': String(k === n), onclick: () => { n = k; draw(); } }, String(k)))));
            const els = names.slice(0, n);
            const total = 2 ** n;
            info.replaceChildren(
              h('div', { html: String.raw`\(A = \{${els.join(', ')}\}\), so \(|A| = ${n}\)` }),
              h('div', { html: String.raw`\(|\mathcal{P}(A)| = 2^{${n}} = ${total}\)` }),
              h('hr.soft'),
              h('div.tiny.mono.muted', 'SUBSET UNDER YOUR POINTER'),
              focus,
              h('p.small.muted', { html: String.raw`Notice the row sizes: they are \(\binom{n}{k}\), the number of ways to choose \(k\) of \(n\) elements. For \(n = ${n}\) they read ${Array.from({ length: n + 1 }, (_, k) => ctx.M.C(n, k)).join(', ')}, which add up to \(${total}\). Module 7 explains why.` }));
            ctx.tex(info);
            focus.textContent = 'Point at a subset →';
            const rows = [];
            for (let k = 0; k <= n; k++) {
              const chips = [];
              for (let mask = 0; mask < total; mask++) {
                const bitsOn = [...Array(n).keys()].filter((i) => mask & (1 << i));
                if (bitsOn.length !== k) continue;
                const label = bitsOn.length ? '{' + bitsOn.map((i) => els[i]).join(',') + '}' : '∅';
                const bin = [...Array(n).keys()].map((i) => (mask & (1 << i) ? 1 : 0)).join('');
                const chip = h('button.chip', { style: { cursor: 'pointer', fontFamily: 'var(--font-mono)' }, 'aria-label': `subset ${label}, bits ${bin}` }, label);
                const on = () => {
                  focus.innerHTML = '';
                  focus.append(h('span', label), h('span.muted', { style: { margin: '0 0.6rem' } }, '↔'), h('span.mono', { style: { color: 'var(--accent)', letterSpacing: '0.2em' } }, bin));
                  focus.append(h('div.tiny.muted', `bit order: ${els.join(' ')}`));
                };
                chip.addEventListener('pointerenter', on);
                chip.addEventListener('focus', on);
                chip.addEventListener('click', on);
                chips.push(chip);
              }
              rows.push(h('div', h('div.tiny.mono.muted', `SIZE ${k} · ${chips.length} SUBSET${chips.length === 1 ? '' : 'S'}`), h('div.row', { style: { gap: '0.3rem', marginTop: '0.2rem' } }, chips)));
            }
            grid.replaceChildren(...rows);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Worked example: building a power set by doubling',
        kind: 'example',
        id: 'ex-power-set',
        objective: 'Build a power set by the include/exclude decision process, watching the subset count double at each element until it reaches 2^n.',
        problem: String.raw`<p>List the power set \(\mathcal{P}(S)\) for \(S = \{a, b, c\}\), building it one include-or-exclude decision at a time: first decide \(a\), then \(b\), then \(c\). Count the subsets at each stage.</p>`,
        steps: psStepsFor(EX_PS_MAIN),
        data: EX_PS_MAIN,
        answer: ['∅', '{a}', '{b}', '{a, b}', '{c}', '{a, c}', '{b, c}', '{a, b, c}'],
        verify(M) {
          const els = ['a', 'b', 'c'];
          const got = [];
          for (let mask = 0; mask < 2 ** els.length; mask++) { const s = els.filter((_, i) => mask & (1 << i)); got.push(s.length ? '{' + s.join(', ') + '}' : '∅'); }
          const want = ['∅', '{a}', '{b}', '{a, b}', '{c}', '{a, c}', '{b, c}', '{a, b, c}'];
          return got.length === 2 ** els.length && got.every((s, i) => s === want[i]);
        },
        variants: [
          {
            label: 'Variant: the two-element case',
            problem: String.raw`<p>List the power set \(\mathcal{P}(S)\) for the smaller set \(S = \{p, q\}\), building it one include-or-exclude decision at a time: first decide \(p\), then \(q\). This minimal case is the base of the doubling pattern — if it works here, each extra element just doubles it again.</p>`,
            steps: psStepsFor(EX_PS_VARIANT),
            data: EX_PS_VARIANT,
            answer: ['∅', '{p}', '{q}', '{p, q}'],
            verify(M) {
              const els = ['p', 'q'];
              const got = [];
              for (let mask = 0; mask < 2 ** els.length; mask++) { const s = els.filter((_, i) => mask & (1 << i)); got.push(s.length ? '{' + s.join(', ') + '}' : '∅'); }
              const want = ['∅', '{p}', '{q}', '{p, q}'];
              return got.length === 2 ** els.length && got.every((s, i) => s === want[i]);
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_PS_MAIN;
          const subs = step.decided < 0 ? [] : psSubsets(D.els, step.decided);
          const freshFrom = step.decided > 0 ? 2 ** (step.decided - 1) : Infinity;
          const trail = D.els.map((_, i) => 2 ** (i + 1));
          stage.append(h('div.stack', { style: { gap: '0.45rem' } },
            h('div.small', h('b.mono', step.status)),
            h('div.row', { style: { gap: '0.3rem' } }, subs.length ? subs.map((s, i) => h('span.chip', { style: i >= freshFrom ? { background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 700 } : {} }, psShow(s))) : h('span.small.muted', 'No subsets yet — the decisions have not started.')),
            h('div.small.muted', step.decided < 0 ? `Subset count after each decision will run: 1 → ${trail.join(' → ')}` : `Subsets after ${step.decided} of ${D.els.length} decisions: ${[1, ...trail.slice(0, step.decided)].join(' → ')} — each decision doubled the count.`),
            step.answer ? h('div.ex-answer', `𝒫(S) = ${fmt(subs.map(psShow))} — |𝒫(S)| = 2^${D.els.length} = ${subs.length} subsets`) : null));
        },
      },
      {
        title: 'Lab: Venn diagram calculator',
        kind: 'lab',
        html: String.raw`<p class="muted small">The universal set is \(U = \{1, \dots, 12\}\). Edit \(A\), \(B\), \(C\), then type any expression or pick a preset. The shaded regions and the result update as you type. Operators: <code>∪</code> <code>∩</code> <code>−</code> <code>Δ</code> and a trailing <code>′</code> for complement (you can also type <code>|</code> <code>&amp;</code> <code>-</code> <code>^</code> <code>'</code>).</p>`,
        render(body, ctx) {
          const { h, s } = ctx;
          const sets = { A: [1, 2, 3, 4, 5, 6], B: [4, 5, 6, 7, 8], C: [2, 5, 8, 9, 10] };
          const U = [...Array(12).keys()].map((i) => i + 1);
          const presets = ['A ∪ B', 'A ∩ B', 'A − B', 'A Δ B', "A′", "(A ∪ B)′", "A′ ∩ B′", 'A ∩ (B ∪ C)', '(A ∩ B) ∪ (A ∩ C)', 'A ∩ B ∩ C'];
          let expr = 'A ∩ (B ∪ C)';
          const inputs = {};
          const exprIn = h('input.inp.mono', { id: 'venn-expr', value: expr, 'aria-label': 'Set expression', style: { width: '100%', fontSize: '1.05rem' } });
          const msg = h('div.feedback');
          const result = h('div.stack', { style: { gap: '0.3rem' } });
          const order = h('ol.small', { style: { margin: 0 } });
          const left = h('div.stack', { style: { gap: '0.5rem', minHeight: 0, overflow: 'auto' } });
          for (const k of ['A', 'B', 'C']) {
            inputs[k] = h('input.inp.mono', { id: `venn-${k}`, value: sets[k].join(', '), 'aria-label': `Elements of ${k}`, style: { width: '100%' } });
            inputs[k].addEventListener('input', () => { sets[k] = parseRoster(inputs[k].value); draw(); });
            left.append(h('label.field', { style: { gridTemplateColumns: '1.4rem 1fr', alignItems: 'center', display: 'grid', gap: '0.4rem' } }, h('b', { style: { color: `var(--${k === 'A' ? 'accent' : k === 'B' ? 'fnc' : 'num'})`, fontSize: '1rem' } }, k), inputs[k]));
          }
          exprIn.addEventListener('input', () => { expr = exprIn.value; draw(); });
          left.append(
            h('label.field', 'Expression', exprIn),
            h('div.row', { style: { gap: '0.3rem' } }, ['∪', '∩', '−', 'Δ', '′', '(', ')'].map((op) => h('button.btn.sm.mono', { onclick: () => { const p = exprIn.selectionStart ?? exprIn.value.length; exprIn.setRangeText(op, p, exprIn.selectionEnd ?? p, 'end'); exprIn.focus(); expr = exprIn.value; draw(); } }, op))),
            h('div.row', { style: { gap: '0.3rem' } }, presets.map((p) => h('button.btn.sm', { onclick: () => { exprIn.value = expr = p; draw(); } }, p))),
            msg, result, h('div', h('div.tiny.mono.muted', 'ORDER OF EVALUATION (INSIDE OUT)'), order));

          // geometry for a three-circle Venn diagram
          const W = 520, H = 400, r = 112;
          const cA = [205, 155], cB = [315, 155], cC = [260, 250];
          const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Venn diagram of A, B and C inside U' });
          const defs = s('defs');
          const circ = { A: cA, B: cB, C: cC };
          for (const k of ['A', 'B', 'C']) {
            defs.append(s('clipPath', { id: `vclip-${k}` }, s('circle', { cx: circ[k][0], cy: circ[k][1], r })));
            defs.append(s('mask', { id: `vmask-${k}` }, s('rect', { x: 0, y: 0, width: W, height: H, fill: 'white' }), s('circle', { cx: circ[k][0], cy: circ[k][1], r, fill: 'black' })));
          }
          svg.append(defs);
          svg.append(s('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 14, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.5 }));
          svg.append(s('text', { x: 24, y: 34, fill: 'var(--ink-3)', 'font-size': 16, 'font-weight': 600, text: 'U' }));
          // one shape per region: (inA, inB, inC) for all 8 combinations
          const regionEls = [];
          for (let m = 0; m < 8; m++) {
            const mem = { A: !!(m & 1), B: !!(m & 2), C: !!(m & 4) };
            let node = s('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 14, class: 'vregion', fill: 'var(--accent)', opacity: 0 });
            for (const k of ['A', 'B', 'C']) node = s('g', mem[k] ? { 'clip-path': `url(#vclip-${k})` } : { mask: `url(#vmask-${k})` }, node);
            regionEls.push({ mem, el: node.querySelector('.vregion') });
            svg.append(node);
          }
          for (const k of ['A', 'B', 'C']) {
            svg.append(s('circle', { cx: circ[k][0], cy: circ[k][1], r, fill: 'none', stroke: `var(--${k === 'A' ? 'accent' : k === 'B' ? 'fnc' : 'num'})`, 'stroke-width': 2.2 }));
          }
          svg.append(s('text', { x: 110, y: 70, 'font-size': 20, 'font-weight': 700, fill: 'var(--accent)', text: 'A' }));
          svg.append(s('text', { x: 398, y: 70, 'font-size': 20, 'font-weight': 700, fill: 'var(--fnc)', text: 'B' }));
          svg.append(s('text', { x: 254, y: 388, 'font-size': 20, 'font-weight': 700, fill: 'var(--num)', text: 'C' }));
          const centers = { 0: [460, 360], 1: [150, 130], 2: [370, 130], 3: [260, 110], 4: [260, 315], 5: [195, 230], 6: [325, 230], 7: [260, 190] };
          const labels = s('g');
          svg.append(labels);
          body.append(h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch' } }, left, h('div.figure', { style: { minHeight: 0 } }, svg)));

          function draw() {
            let tree;
            try { tree = parse(expr); msg.textContent = ''; msg.className = 'feedback'; }
            catch (e) { msg.className = 'feedback bad'; msg.textContent = e.message; tree = null; }
            regionEls.forEach(({ mem, el }) => el.setAttribute('opacity', tree && holds(tree, mem) ? 0.28 : 0));
            labels.replaceChildren();
            const byRegion = {};
            for (const x of U) {
              const m = (sets.A.includes(x) ? 1 : 0) | (sets.B.includes(x) ? 2 : 0) | (sets.C.includes(x) ? 4 : 0);
              (byRegion[m] ||= []).push(x);
            }
            for (const [m, xs] of Object.entries(byRegion)) {
              const [cx, cy] = centers[m];
              const cols = Math.min(xs.length, m == 0 ? 6 : 3);
              xs.forEach((x, i) => {
                const mem = { A: sets.A.includes(x), B: sets.B.includes(x), C: sets.C.includes(x) };
                const inRes = tree && holds(tree, mem);
                const dx = ((i % cols) - (cols - 1) / 2) * 24, dy = Math.floor(i / cols) * 22;
                labels.append(s('text', { x: cx + dx, y: cy + dy, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': inRes ? 700 : 400, fill: inRes ? 'var(--ink)' : 'var(--ink-3)', text: String(x) }));
              });
            }
            if (!tree) { result.replaceChildren(); order.replaceChildren(); return; }
            const res = U.filter((x) => holds(tree, { A: sets.A.includes(x), B: sets.B.includes(x), C: sets.C.includes(x) }));
            result.replaceChildren(
              h('div', h('span.mono', show(tree)), ' = ', h('b.mono', fmt(res))),
              h('div.small.muted', `Cardinality: |result| = ${res.length}. Shaded regions are exactly where the expression is true.`));
            order.replaceChildren(...steps(tree).map((n) => {
              const v = U.filter((x) => holds(n, { A: sets.A.includes(x), B: sets.B.includes(x), C: sets.C.includes(x) }));
              return h('li', h('span.mono', show(n)), ' = ', h('span.mono', fmt(v)));
            }));
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'The laws of set algebra',
        kind: 'concept',
        html: String.raw`
          <div class="split-wide">
            <div class="stack">
              <p>Set operations obey algebraic laws, just like \(+\) and \(\times\) do for numbers. Each law below holds for <i>every</i> choice of sets. Check any of them in the Venn lab: type both sides and confirm the shading is identical.</p>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">Law</th><th>Union form</th><th>Intersection form</th></tr></thead>
                <tbody>
                  <tr><td class="l">Commutative</td><td>\(A \cup B = B \cup A\)</td><td>\(A \cap B = B \cap A\)</td></tr>
                  <tr><td class="l">Associative</td><td>\((A \cup B) \cup C = A \cup (B \cup C)\)</td><td>\((A \cap B) \cap C = A \cap (B \cap C)\)</td></tr>
                  <tr><td class="l">Distributive</td><td>\(A \cup (B \cap C) = (A \cup B) \cap (A \cup C)\)</td><td>\(A \cap (B \cup C) = (A \cap B) \cup (A \cap C)\)</td></tr>
                  <tr><td class="l">De Morgan</td><td>\((A \cup B)' = A' \cap B'\)</td><td>\((A \cap B)' = A' \cup B'\)</td></tr>
                  <tr><td class="l">Identity</td><td>\(A \cup \varnothing = A\)</td><td>\(A \cap U = A\)</td></tr>
                  <tr><td class="l">Complement</td><td>\(A \cup A' = U\)</td><td>\(A \cap A' = \varnothing\)</td></tr>
                  <tr><td class="l">Idempotent</td><td>\(A \cup A = A\)</td><td>\(A \cap A = A\)</td></tr>
                  <tr><td class="l">Absorption</td><td>\(A \cup (A \cap B) = A\)</td><td>\(A \cap (A \cup B) = A\)</td></tr>
                </tbody>
              </table>
              <p class="small muted">Notice the pattern: swap \(\cup \leftrightarrow \cap\) and \(\varnothing \leftrightarrow U\) in any law and you get another law. This is called <b>duality</b>. The same laws reappear for logic (Module 2) and for circuits (Module 12), because all three are the same algebra in different clothes.</p>
            </div>
            <div class="stack">
              <div class="thm">Inclusion–exclusion for two sets:
                \[|A \cup B| = |A| + |B| - |A \cap B|\]</div>
              <p>Adding \(|A|\) and \(|B|\) counts every shared element twice, once in each set, so subtract the overlap once.</p>
              <div class="ex">A survey of 40 students: 25 take Python, 18 take Java, 9 take both. How many take at least one? \(25 + 18 - 9 = 34\). How many take neither? \(40 - 34 = 6\).</div>
              <div class="tip">When you need the size of an "or" condition, count each piece and subtract the overlap. Forgetting the overlap is the classic double-counting bug in database reports: a customer who bought two products gets counted twice.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: ordered pairs and the Cartesian product',
        kind: 'lab',
        html: String.raw`<div class="def">An <span class="term">ordered pair</span> \((a, b)\) remembers order, so \((1, 2) \neq (2, 1)\). The <span class="term">Cartesian product</span> is \(A \times B = \{(a, b) \mid a \in A,\ b \in B\}\), and \(|A \times B| = |A| \cdot |B|\).<div class="eg">\(\{1, 2\} \times \{x, y\} = \{(1, x), (1, y), (2, x), (2, y)\}\), which is \(2 \cdot 2 = 4\) pairs.</div></div>`,
        render(body, ctx) {
          const { h } = ctx;
          let A = ['S', 'M', 'L'];
          let B = ['red', 'blue', 'black', 'white'];
          let flip = false;
          const aIn = h('input.inp.mono', { id: 'cart-a', value: A.join(', '), 'aria-label': 'Elements of A' });
          const bIn = h('input.inp.mono', { id: 'cart-b', value: B.join(', '), 'aria-label': 'Elements of B' });
          const flipBtn = h('button.btn', { 'aria-pressed': 'false', onclick: () => { flip = !flip; flipBtn.setAttribute('aria-pressed', String(flip)); flipBtn.classList.toggle('on', flip); draw(); } }, 'Show B × A instead');
          const grid = h('div', { style: { overflow: 'auto', minHeight: 0 } });
          const side = h('div.stack');
          const split = (v) => [...new Set(v.split(',').map((x) => x.trim()).filter(Boolean))].slice(0, 7);
          aIn.addEventListener('input', () => { A = split(aIn.value); draw(); });
          bIn.addEventListener('input', () => { B = split(bIn.value); draw(); });
          body.append(h('div.split-narrow.fill', { style: { minHeight: 0, alignItems: 'stretch' } },
            h('div.stack', h('label.field', 'A (for example, shirt sizes)', aIn), h('label.field', 'B (for example, colors)', bIn), flipBtn, side), grid));
          function draw() {
            const X = flip ? B : A, Y = flip ? A : B;
            const nx = flip ? 'B' : 'A', ny = flip ? 'A' : 'B';
            const table = h('table.tt', h('thead', h('tr', h('th', `${nx} \\ ${ny}`), ...Y.map((y) => h('th', y)))),
              h('tbody', ...X.map((x) => h('tr', h('th', x), ...Y.map((y) => h('td.mono', { style: { fontSize: '0.8rem' } }, `(${x}, ${y})`))))));
            grid.replaceChildren(table);
            side.replaceChildren(
              h('div.big-math', { html: String.raw`\(|${nx} \times ${ny}| = ${X.length} \cdot ${Y.length} = ${X.length * Y.length}\)` }),
              h('p.small', { html: `Each row picks one element of ${nx}; each column picks one of ${ny}. Every cell is one ordered pair, so the grid has rows × columns cells. This is the <b>product rule</b> of counting (Module 7).` }),
              h('p.small.muted', { html: flip ? 'Compare with A × B: same number of pairs, but each pair is reversed, so the two sets are different (unless A = B or one of them is empty).' : 'Press the button to swap the order and see that A × B ≠ B × A.' }),
              h('div.ai', { html: 'A grid search for hyperparameters tries every pair in <i>learning rates</i> × <i>batch sizes</i>. With 5 rates and 4 sizes that is 20 training runs, and each extra parameter multiplies the cost again.' }));
            ctx.tex(side);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Worked example: building A × B on a grid',
        kind: 'example',
        id: 'ex-cartesian-product',
        objective: 'Build a Cartesian product A × B cell by cell on a grid and count the ordered pairs with the product rule |A × B| = |A| · |B|.',
        problem: String.raw`<p>A shirt comes in sizes \(A = \{S, M, L\}\) and colors \(B = \{\text{red}, \text{blue}\}\). Build the Cartesian product \(A \times B\) — every (size, color) ordered pair — by filling the grid one cell at a time, row by row, and state how many pairs there are.</p>`,
        steps: cartStepsFor(EX_CART_MAIN),
        data: EX_CART_MAIN,
        answer: ['(S, red)', '(S, blue)', '(M, red)', '(M, blue)', '(L, red)', '(L, blue)'],
        verify(M) {
          const A = ['S', 'M', 'L'], B = ['red', 'blue'];
          const got = [];
          for (const a of A) for (const b of B) got.push(`(${a}, ${b})`);
          const want = ['(S, red)', '(S, blue)', '(M, red)', '(M, blue)', '(L, red)', '(L, blue)'];
          return got.length === A.length * B.length && got.every((p, i) => p === want[i]);
        },
        variants: [
          {
            label: 'Variant: a one-element set',
            problem: String.raw`<p>A hat comes in a single size, \(A = \{\text{one-size}\}\), and three colors, \(B = \{\text{red}, \text{blue}, \text{black}\}\). Build the Cartesian product \(A \times B\) by filling the grid one cell at a time, and state how many pairs there are. With \(|A| = 1\) the grid has just one row — the boundary case of the product rule.</p>`,
            steps: cartStepsFor(EX_CART_VARIANT),
            data: EX_CART_VARIANT,
            answer: ['(one-size, red)', '(one-size, blue)', '(one-size, black)'],
            verify(M) {
              const A = ['one-size'], B = ['red', 'blue', 'black'];
              const got = [];
              for (const a of A) for (const b of B) got.push(`(${a}, ${b})`);
              const want = ['(one-size, red)', '(one-size, blue)', '(one-size, black)'];
              return got.length === A.length * B.length && got.every((p, i) => p === want[i]);
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_CART_MAIN;
          const pairs = cartPairs(D);
          const cell = (i) => (i < step.filled ? h('td.mono', { style: { fontSize: '0.82rem', ...(i === step.filled - 1 && !step.answer ? { background: 'var(--accent)', color: 'var(--accent-ink)', fontWeight: 700 } : {}) } }, pairs[i]) : h('td.muted', '·'));
          const table = h('table.tt',
            h('thead', h('tr', h('th', 'A \\ B'), D.B.map((b) => h('th', b)))),
            h('tbody', D.A.map((a, r) => h('tr', h('th', a), D.B.map((_, c) => cell(r * D.B.length + c))))));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem' } },
            h('div.small', h('b.mono', step.status)),
            table,
            h('div.small.muted', `Pairs placed: ${step.filled} of ${pairs.length} — one row of ${D.B.length} pairs for each element of A.`),
            step.answer ? h('div.ex-answer', `A × B = ${fmt(pairs)} — |A × B| = ${D.A.length} · ${D.B.length} = ${pairs.length}`) : null));
        },
      },
      {
        title: 'Code: set operations in Python',
        kind: 'code',
        file: 'set_operations.py',
        html: String.raw`<p class="muted small">Python has a built-in <code>set</code> type whose operators mirror the mathematical symbols. Click any line (or use <kbd>↓</kbd>) to read its explanation.</p>`,
        fivew: {
          what: 'A tour of every basic set operation (union, intersection, difference, symmetric difference, complement, membership, subset and size) on two small sets of integers.',
          why: 'Seeing each symbol next to its Python operator connects the notation on paper to code you will write. Python sets behave exactly like mathematical sets: no order, no duplicates.',
          who: 'Anyone who stores collections of items: data analysts removing duplicate records, back-end developers checking permissions, and AI engineers comparing vocabularies.',
          where: 'Sets appear wherever "is this item in the collection?" matters: allow lists, tags, visited pages in a web crawler, and the unique tokens in a dataset.',
          when: 'Reach for a set whenever order does not matter and each item should appear at most once, or when you need fast membership checks.',
        },
        lines: [
          ['A = {1, 2, 3, 4}', 'Creates a set named <code>A</code> using braces, which is roster notation written in Python. The variable <code>A</code> now refers to a set object holding four integers. This mirrors \\(A = \\{1, 2, 3, 4\\}\\) on paper.'],
          ['B = {3, 4, 5}', 'Creates a second set, <code>B</code>. It shares the elements 3 and 4 with <code>A</code>, which makes the intersection and difference results below interesting.'],
          ['U = set(range(1, 8))', '<code>range(1, 8)</code> produces 1, 2, …, 7 (the stop value 8 is excluded). <code>set(...)</code> turns that sequence into a set. This is our universal set \\(U\\). We define it explicitly because a complement only makes sense relative to some universe.'],
          ['print("A ∪ B =", A | B)', 'The <code>|</code> operator is union: every element in <code>A</code>, in <code>B</code>, or in both. <code>print</code> shows the label text and then the result, separated by a space. Output: <code>{1, 2, 3, 4, 5}</code>. Note that 3 and 4 appear once, not twice.'],
          ['print("A ∩ B =", A & B)', 'The <code>&amp;</code> operator is intersection: only elements found in <i>both</i> sets. The symbol was chosen because intersection matches the logical "and". Output: <code>{3, 4}</code>.'],
          ['print("A − B =", A - B)', 'The <code>-</code> operator is set difference: elements of <code>A</code> that are not in <code>B</code>. Order matters here, because <code>B - A</code> would give <code>{5}</code> instead. Output: <code>{1, 2}</code>.'],
          ['print("A Δ B =", A ^ B)', 'The <code>^</code> operator is symmetric difference: elements in exactly one of the two sets. It equals \\((A - B) \\cup (B - A)\\) and matches the logical "exclusive or". Output: <code>{1, 2, 5}</code>.'],
          ['print("A′    =", U - A)', 'Python has no complement operator because a set does not know its universe. We compute \\(A\\prime = U - A\\) ourselves. Output: <code>{5, 6, 7}</code>. If you forgot to define <code>U</code>, there would be no correct answer, which is the point of design principle 3 later.'],
          ['print(3 in A, 9 in A)', 'The <code>in</code> keyword tests membership, the Python spelling of \\(\\in\\). It returns a Boolean. <code>3 in A</code> is <code>True</code> and <code>9 in A</code> is <code>False</code>. For sets this check is fast no matter how large the set is, because sets are stored as hash tables.'],
          ['print({1, 2} <= A, len(A))', '<code>&lt;=</code> between sets means "is a subset of" (\\(\\subseteq\\)); <code>&lt;</code> would mean proper subset. <code>{1, 2} &lt;= A</code> is <code>True</code>. <code>len(A)</code> is the cardinality \\(|A| = 4\\).'],
          ['evens = {x for x in U if x % 2 == 0}', 'A <b>set comprehension</b>, which is Python\'s version of set-builder notation: \\(\\{x \\in U \\mid x \\bmod 2 = 0\\}\\). Read it left to right: "the set of <code>x</code>, for each <code>x</code> in <code>U</code>, if <code>x</code> is even". <code>%</code> gives the remainder, so <code>x % 2 == 0</code> means even.'],
          ['print("evens =", evens)', 'Prints the comprehension\'s result, <code>{2, 4, 6}</code>. Small integer sets usually print in ascending order, but that is an implementation detail. A set has no order, so never write code that depends on the order in which a set prints.'],
        ],
        expected: 'A ∪ B = {1, 2, 3, 4, 5}\nA ∩ B = {3, 4}\nA − B = {1, 2}\nA Δ B = {1, 2, 5}\nA′    = {5, 6, 7}\nTrue False\nTrue 4\nevens = {2, 4, 6}\n',
        tryIt: 'Change <code>B</code> to <code>{3, 4, 5, 1}</code> and predict the new union and difference before you press Run. Then change the comprehension to keep the multiples of 3.',
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Code: Jaccard similarity, sets in AI',
        kind: 'code',
        file: 'jaccard.py',
        html: String.raw`<p class="muted small">Search engines and recommendation systems use set overlap to decide how similar two documents are. The <span class="term">Jaccard similarity</span> is \(J(A,B) = \dfrac{|A \cap B|}{|A \cup B|}\).</p>`,
        fivew: {
          what: 'Measures how similar two short documents are by comparing their sets of distinct words.',
          why: 'Turning text into sets ignores word order and repetition, which leaves a simple, explainable similarity score between 0 (nothing shared) and 1 (identical vocabulary).',
          who: 'Search engineers detecting near-duplicate web pages, data scientists de-duplicating datasets before training a model, and recommender systems comparing what two users liked.',
          where: 'Near-duplicate detection (MinHash builds on Jaccard), plagiarism checkers, comparing the tag sets of two products, and evaluating image-segmentation models (where it is called "intersection over union").',
          when: 'Use it when presence matters more than frequency. When word counts matter, cosine similarity on count vectors is the usual alternative.',
        },
        lines: [
          ['doc1 = "the cat sat on the mat"', 'A string holding the first document. In a real system this text would come from a file or a web page.'],
          ['doc2 = "the dog sat on the log"', 'The second document. Two words changed: <i>dog</i> replaces <i>cat</i> and <i>log</i> replaces <i>mat</i>, so the two word sets differ in four words in total.'],
          ['words1 = set(doc1.split())', '<code>doc1.split()</code> cuts the string at spaces into a list of words: <code>["the", "cat", "sat", "on", "the", "mat"]</code>. <code>set(...)</code> keeps each word once, so the repeated "the" collapses. <code>words1</code> has 5 elements.'],
          ['words2 = set(doc2.split())', 'Same conversion for the second document: <code>{"the", "dog", "sat", "on", "log"}</code>, also 5 elements.'],
          ['shared = words1 & words2', 'Intersection: the words both documents use, \\(A \\cap B = \\{\\text{on, sat, the}\\}\\). This is the numerator of the Jaccard formula.'],
          ['together = words1 | words2', 'Union: every distinct word used anywhere, \\(A \\cup B\\), with 7 elements. This is the denominator. By inclusion–exclusion, \\(5 + 5 - 3 = 7\\).'],
          ['similarity = len(shared) / len(together)', '<code>len</code> gives each cardinality, and <code>/</code> performs true division, so the result is the float \\(3/7 \\approx 0.4286\\). If both documents were empty, this would divide by zero, so production code must guard that case.'],
          ['print("shared words:", sorted(shared))', '<code>sorted</code> turns the set into an alphabetical list. We sort before printing because the order in which a set of strings prints can change between runs, and sorted output is predictable and easy to test.'],
          ['print("distinct words in total:", len(together))', 'Prints \\(|A \\cup B| = 7\\), so you can check the denominator by hand.'],
          ['print(f"Jaccard similarity = {similarity:.2f}")', 'An <b>f-string</b>: the <code>f</code> before the quote lets <code>{...}</code> insert a value. <code>:.2f</code> formats the float with two decimal places, so the output reads <code>0.43</code>.'],
        ],
        expected: "shared words: ['on', 'sat', 'the']\ndistinct words in total: 7\nJaccard similarity = 0.43\n",
        tryIt: 'Make <code>doc2</code> identical to <code>doc1</code> and confirm the similarity becomes 1.00. Then make the two documents share no words at all.',
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Code: generating a power set with bit masks',
        kind: 'code',
        file: 'power_set.py',
        html: String.raw`<p class="muted small">This program turns the "one bit per element" idea from the power-set lab into an algorithm. Switch to <b>Trace</b> to watch <code>mask</code> count from 0 to 7 while the subsets appear.</p>`,
        fivew: {
          what: 'Builds every subset of a list by counting from 0 to \\(2^n - 1\\) and reading each number\'s binary digits as include/exclude decisions.',
          why: 'It shows concretely why \\(|\\mathcal{P}(A)| = 2^n\\): there are exactly \\(2^n\\) binary strings of length \\(n\\), and each one is a different subset.',
          who: 'Programmers writing exhaustive search, such as trying every combination of features, every set of items for a knapsack, or every truth assignment in a logic solver.',
          where: 'Brute-force optimizers, test generators that try every combination of options, and the subset dynamic-programming used for routing problems.',
          when: 'Only for small \\(n\\). At \\(n = 30\\) there are over a billion subsets, so exhaustive enumeration stops being practical very quickly.',
        },
        lines: [
          ['def power_set(items):', 'Defines a function named <code>power_set</code> that takes one argument, <code>items</code>. Nothing runs yet; Python only remembers the recipe until the function is called on line 11.'],
          ['    items = list(items)', 'Converts the input to a list so the elements have fixed positions 0, 1, 2, …. Bit \\(i\\) of the mask will refer to <code>items[i]</code>. This also lets the function accept a set, a tuple, or a string.'],
          ['    n = len(items)', 'Stores the number of elements, \\(n\\). We need it twice: to know how many masks exist and how many bits to inspect.'],
          ['    result = []', 'An empty list that will collect each subset as it is built. A list is fine here because subsets come out in a predictable order.'],
          ['    for mask in range(2 ** n):', '<code>2 ** n</code> is \\(2^n\\). The loop visits every integer from 0 to \\(2^n - 1\\). In binary those integers are exactly every \\(n\\)-bit string, from 000 to 111 when \\(n = 3\\).'],
          ['        subset = [items[i] for i in range(n)', 'A list comprehension that will look at every position <code>i</code> from 0 to \\(n - 1\\) and decide whether <code>items[i]</code> belongs in this subset. The decision rule is on the next line; Python reads the two lines as one statement because the square bracket is still open.'],
          ['                  if mask & (1 << i)]', '<code>1 &lt;&lt; i</code> is a number with only bit \\(i\\) set (1, 2, 4, …). <code>mask &amp; (1 &lt;&lt; i)</code> is nonzero exactly when bit \\(i\\) of <code>mask</code> is 1. So the comprehension keeps <code>items[i]</code> when its bit is on. For mask 5 (binary 101) it keeps items 0 and 2.'],
          ['        result.append(subset)', 'Adds the finished subset to the result list. After the loop, <code>result</code> holds all \\(2^n\\) subsets.'],
          ['    return result', 'Sends the list of subsets back to whoever called the function and ends the function.'],
          ['', ''],
          ['subsets = power_set(["a", "b", "c"])', 'Calls the function with three elements, so it should produce \\(2^3 = 8\\) subsets. The returned list is stored in <code>subsets</code>.'],
          ['print(len(subsets), "subsets in total")', 'Checks the count against the formula. The output is <code>8 subsets in total</code>.'],
          ['for sub in sorted(subsets, key=len):', 'Loops over the subsets ordered by size. <code>key=len</code> tells <code>sorted</code> to compare subsets by their length, so ∅ comes first and the full set comes last. Ties keep their original mask order.'],
          ['    print("{" + ", ".join(sub) + "}")', '<code>", ".join(sub)</code> glues the elements together with commas. The braces are added as text so each line looks like set notation, for example <code>{a, c}</code>. The empty subset prints as <code>{}</code>.'],
        ],
        expected: '8 subsets in total\n{}\n{a}\n{b}\n{c}\n{a, b}\n{a, c}\n{b, c}\n{a, b, c}\n',
        tryIt: 'Add a fourth element <code>"d"</code> and predict how many lines will print. Then print <code>bin(mask)</code> inside the loop to see the binary strings directly.',
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Design practice: working with sets in real code',
        kind: 'design',
        html: String.raw`<p class="muted small">Choosing the right collection type is a design decision with real consequences for speed and correctness. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Use a set when the question is "is it in there?"',
            html: '<p>Checking <code>x in some_list</code> scans the list from the front, so it takes time proportional to the list length: \\(O(n)\\). Checking <code>x in some_set</code> jumps straight to the right spot using a hash, which takes about the same time no matter how big the set is: \\(O(1)\\) on average.</p><p>With 100,000 blocked words and a million messages, that difference is the gap between seconds and hours.</p>',
            bad: 'blocked = ["spam", "scam", "free-money"]  # list\nfor msg in messages:\n    if msg.sender in blocked:   # scans every time\n        reject(msg)',
            good: 'blocked = {"spam", "scam", "free-money"}  # set\nfor msg in messages:\n    if msg.sender in blocked:   # one hash lookup\n        reject(msg)',
          },
          {
            name: 'Mirror set-builder notation with a comprehension',
            html: '<p>When a set is defined by a rule, \\(\\{x \\in U \\mid P(x)\\}\\), write it as a set comprehension. The code then reads like the specification, which makes it easier to review and harder to get wrong.</p>',
            bad: 'evens = set()\nfor x in U:\n    if x % 2 == 0:\n        evens.add(x)',
            good: 'evens = {x for x in U if x % 2 == 0}\n# reads: { x in U | x is even }',
          },
          {
            name: 'Name the universal set explicitly',
            html: '<p>A complement \\(A\\prime\\) is meaningless until you say what the universe is. "Users who did not log in today" depends on whether \\(U\\) is all users, active users, or users in one region. Store \\(U\\) in a named variable and compute <code>U - A</code>, so every reader knows which universe you meant.</p>',
            bad: 'inactive = all_ids - logged_in   # which "all"?\n# every report may define all_ids differently',
            good: 'ACTIVE_USERS = load_active_user_ids()   # U, defined once\ninactive = ACTIVE_USERS - logged_in     # A\' = U - A',
          },
          {
            name: 'Use frozenset for sets of sets and dictionary keys',
            html: '<p>A normal <code>set</code> can change, so Python refuses to hash it, and that means it cannot be an element of another set or a dictionary key. A <code>frozenset</code> is an immutable set and can be used in both places. That is what you need to represent a power set or to cache results by a set of inputs.</p>',
            bad: 'family = {{1, 2}, {3}}\n# TypeError: unhashable type: \'set\'',
            good: 'family = {frozenset({1, 2}), frozenset({3})}\ncache[frozenset(features)] = score',
          },
          {
            name: 'Never change a set while looping over it',
            html: '<p>Adding or removing elements during iteration raises <code>RuntimeError: Set changed size during iteration</code>, or silently skips elements in other languages. Build a new set instead, or loop over a copy.</p>',
            bad: 'for x in items:\n    if x < 0:\n        items.remove(x)   # RuntimeError',
            good: 'items = {x for x in items if x >= 0}\n# or: for x in set(items): ...',
          },
          {
            name: 'Know what a set throws away: order and duplicates',
            html: '<p>Converting a list to a set loses its order and every repeated value. That is perfect for "which distinct words appear?" and wrong for "how often does each word appear?" (use <code>collections.Counter</code>, a multiset) or "in what order did events happen?" (keep a list). Before converting, ask which information later steps need.</p>',
            bad: 'words = set(text.split())\nmost_common = max(words)  # frequency is gone!',
            good: 'from collections import Counter\ncounts = Counter(text.split())   # keeps how many\nmost_common = counts.most_common(1)',
          },
          {
            name: 'Use bit masks for small, fixed universes',
            html: '<p>When the universe has at most a few dozen known elements (days of the week, file permissions, feature flags), represent a subset as an integer where bit \\(i\\) means "element \\(i\\) is present". Union is <code>|</code>, intersection is <code>&amp;</code>, and the whole set fits in one machine word, so operations are extremely fast. Unix file permissions (<code>rwx</code>) work exactly this way.</p>',
            good: 'READ, WRITE, EXEC = 1, 2, 4      # bits 0, 1, 2\nperms = READ | WRITE              # the set {read, write}\ncan_write = bool(perms & WRITE)   # membership test',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked examples */
      {
        title: 'Worked example: shading (A ∪ B) ∩ C′ on a Venn diagram',
        kind: 'example',
        id: 'ex-venn-shading',
        objective: 'Compute a compound set expression one sub-expression at a time, tracking each partial result as a shading on a Venn diagram.',
        problem: String.raw`<p>With universe \(U = \{1, 2, \dots, 10\}\), \(A = \{1, 2, 3, 4, 5\}\), \(B = \{4, 5, 6, 7\}\) and \(C = \{2, 5, 8\}\), compute \((A \cup B) \cap C'\), building the answer one sub-expression at a time on a Venn diagram.</p>`,
        steps: vennStepsFor(EX_VENN_MAIN),
        data: EX_VENN_MAIN,
        answer: [1, 3, 4, 6, 7],
        verify(M) {
          const U = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], A = [1, 2, 3, 4, 5], B = [4, 5, 6, 7], C = [2, 5, 8];
          const got = U.filter((x) => (A.includes(x) || B.includes(x)) && !C.includes(x));
          const want = [1, 3, 4, 6, 7];
          return got.length === want.length && got.every((x, i) => x === want[i]);
        },
        variants: [
          {
            label: 'Variant: (A ∩ B) ∪ C′',
            problem: String.raw`<p>With the same universe \(U = \{1, 2, \dots, 10\}\), \(A = \{1, 2, 3, 4, 5\}\), \(B = \{4, 5, 6, 7\}\) and \(C = \{2, 5, 8\}\), compute \((A \cap B) \cup C'\), building the answer one sub-expression at a time on a Venn diagram. Both operations are swapped compared with the main problem, so watch which shading shrinks and which combination grows.</p>`,
            steps: vennStepsFor(EX_VENN_VARIANT),
            data: EX_VENN_VARIANT,
            answer: [1, 3, 4, 5, 6, 7, 9, 10],
            verify(M) {
              const U = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], A = [1, 2, 3, 4, 5], B = [4, 5, 6, 7], C = [2, 5, 8];
              const got = U.filter((x) => (A.includes(x) && B.includes(x)) || !C.includes(x));
              const want = [1, 3, 4, 5, 6, 7, 9, 10];
              return got.length === want.length && got.every((x, i) => x === want[i]);
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h, s } = ctx;
          const D = (preset && preset.data) || EX_VENN_MAIN;
          const CTRS = { A: [195, 92], B: [325, 92], C: [260, 150] };
          const RAD = 80;
          const POS = { '100': [138, 87], '010': [382, 87], '001': [260, 210], '110': [260, 62], '101': [193, 160], '011': [327, 160], '111': [260, 120], '000': [448, 244] };
          const REGIONS = Object.entries(POS).map(([key, pos]) => {
            const [a, b, c] = key.split('').map(Number);
            const els = D.U.filter((x) => (D.A.includes(x) ? 1 : 0) === a && (D.B.includes(x) ? 1 : 0) === b && (D.C.includes(x) ? 1 : 0) === c);
            return { a, b, c, pos, label: els.join(', ') };
          });
          const firstShade = (r) => (D.firstOp === 'union' ? (r.a === 1 || r.b === 1) : (r.a === 1 && r.b === 1));
          const shaded = (r) => step.phase === 1 ? r.a === 1
            : step.phase === 2 ? firstShade(r)
            : step.phase === 3 ? r.c === 0
            : step.phase >= 4 ? (D.combineOp === 'intersection' ? (firstShade(r) && r.c === 0) : (firstShade(r) || r.c === 0)) : false;
          const circ = (key, attrs) => s('circle', { cx: CTRS[key][0], cy: CTRS[key][1], r: RAD, ...attrs });
          const kids = [];
          kids.push(s('defs',
            s('mask', { id: 'exv-nc' }, s('rect', { x: 0, y: 0, width: 520, height: 270, fill: 'white' }), circ('C', { fill: 'black' })),
            s('mask', { id: 'exv-nlens' }, s('rect', { x: 0, y: 0, width: 520, height: 270, fill: 'white' }), s('g', { 'clip-path': 'url(#exv-b)' }, circ('A', { fill: 'black' }))),
            s('clipPath', { id: 'exv-ab' }, circ('A', {}), circ('B', {})),
            s('clipPath', { id: 'exv-a' }, circ('A', {})),
            s('clipPath', { id: 'exv-b' }, circ('B', {})),
            s('clipPath', { id: 'exv-c' }, circ('C', {}))));
          kids.push(s('rect', { x: 8, y: 8, width: 504, height: 254, rx: 14, fill: 'var(--sheet)', stroke: 'var(--rule)', 'stroke-width': 1.5 }));
          kids.push(s('text', { x: 24, y: 34, 'font-size': 16, 'font-weight': 600, fill: 'var(--ink-3)', text: 'U' }));
          if (step.phase === 1) kids.push(circ('A', { fill: 'var(--accent)', opacity: 0.38, stroke: 'none' }));
          else if (step.phase === 2 && D.firstOp === 'union') kids.push(circ('A', { fill: 'var(--accent)', opacity: 0.34, stroke: 'none' }), circ('B', { fill: 'var(--accent)', opacity: 0.34, stroke: 'none' }));
          else if (step.phase === 2) kids.push(s('g', { 'clip-path': 'url(#exv-a)' }, circ('B', { fill: 'var(--accent)', opacity: 0.42, stroke: 'none' })));
          else if (step.phase === 3) kids.push(s('g', { mask: 'url(#exv-nc)' }, s('rect', { x: 8, y: 8, width: 504, height: 254, rx: 14, fill: 'var(--num)', opacity: 0.3 })));
          else if (step.phase >= 4 && D.combineOp === 'intersection') kids.push(s('g', { mask: 'url(#exv-nc)' }, circ('A', { fill: 'var(--accent)', opacity: 0.42, stroke: 'none' }), circ('B', { fill: 'var(--accent)', opacity: 0.42, stroke: 'none' })));
          else if (step.phase >= 4) kids.push(
            s('g', { mask: 'url(#exv-nc)' }, s('rect', { x: 8, y: 8, width: 504, height: 254, rx: 14, fill: 'var(--accent)', opacity: 0.34 })),
            s('g', { 'clip-path': 'url(#exv-a)' }, s('g', { 'clip-path': 'url(#exv-b)' }, s('g', { 'clip-path': 'url(#exv-c)' }, s('rect', { x: 8, y: 8, width: 504, height: 254, fill: 'var(--accent)', opacity: 0.34 })))));
          for (const key of ['A', 'B', 'C']) kids.push(circ(key, { fill: 'none', stroke: key === 'A' ? 'var(--accent)' : key === 'B' ? 'var(--fnc)' : 'var(--num)', 'stroke-width': 2.2 }));
          if (step.answer && D.combineOp === 'intersection') {
            kids.push(s('g', { mask: 'url(#exv-nc)' }, circ('A', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4.5 }), circ('B', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4.5 })));
            kids.push(s('g', { 'clip-path': 'url(#exv-ab)' }, circ('C', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4.5 })));
          } else if (step.answer) {
            kids.push(s('rect', { x: 8, y: 8, width: 504, height: 254, rx: 14, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4.5 }));
            kids.push(s('g', { mask: 'url(#exv-nlens)' }, circ('C', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4.5 })));
            kids.push(s('g', { 'clip-path': 'url(#exv-b)' }, circ('A', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4.5 })));
            kids.push(s('g', { 'clip-path': 'url(#exv-a)' }, circ('B', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4.5 })));
          }
          kids.push(s('text', { x: 100, y: 36, 'font-size': 19, 'font-weight': 700, fill: 'var(--accent)', text: 'A' }));
          kids.push(s('text', { x: 408, y: 36, 'font-size': 19, 'font-weight': 700, fill: 'var(--fnc)', text: 'B' }));
          kids.push(s('text', { x: 253, y: 257, 'font-size': 19, 'font-weight': 700, fill: 'var(--num)', text: 'C' }));
          for (const r of REGIONS) {
            if (!r.label) continue;
            kids.push(s('text', { x: r.pos[0], y: r.pos[1], 'text-anchor': 'middle', 'font-size': 15, 'font-weight': shaded(r) ? 700 : 400, fill: shaded(r) ? 'var(--ink)' : 'var(--ink-3)', text: r.label }));
          }
          const svg = s('svg', { viewBox: '0 0 520 270', role: 'img', 'aria-label': 'Three-circle Venn diagram of A, B and C inside U, shaded step by step', style: { width: '440px', maxWidth: '100%', height: 'auto', display: 'block' } }, ...kids);
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem' } },
            h('div.small', h('b.mono', step.status)),
            svg,
            step.answer ? h('div.ex-answer', D.answerBanner) : null));
        },
      },
      {
        title: 'Worked example: De Morgan’s law by a membership table',
        kind: 'example',
        id: 'ex-demorgan-membership',
        objective: 'Prove a De Morgan law for concrete sets by building a membership table and showing that the two sides agree in every row.',
        problem: String.raw`<p>Prove De Morgan's law \((A \cup B)' = A' \cap B'\) for \(A = \{1, 2, 3\}\) and \(B = \{3, 4\}\) in the universe \(U = \{1, 2, 3, 4, 5, 6\}\), by building a membership table with one row per element of \(U\).</p>`,
        steps: dmStepsFor(EX_DM_MAIN),
        data: EX_DM_MAIN,
        answer: [5, 6],
        verify(M) {
          const U = [1, 2, 3, 4, 5, 6], A = [1, 2, 3], B = [3, 4];
          const lhs = U.filter((x) => !(A.includes(x) || B.includes(x)));
          const rhs = U.filter((x) => !A.includes(x) && !B.includes(x));
          const want = [5, 6];
          const eq = (p, q) => p.length === q.length && p.every((x, i) => x === q[i]);
          return eq(lhs, rhs) && eq(lhs, want);
        },
        variants: [
          {
            label: 'Variant: the other De Morgan law',
            problem: String.raw`<p>Prove the other De Morgan law, \((A \cap B)' = A' \cup B'\), for the same sets \(A = \{1, 2, 3\}\) and \(B = \{3, 4\}\) in the universe \(U = \{1, 2, 3, 4, 5, 6\}\), by building a membership table with one row per element of \(U\). This time the complement starts from an intersection, so the right-hand side must finish with a union instead.</p>`,
            steps: dmStepsFor(EX_DM_VARIANT),
            data: EX_DM_VARIANT,
            answer: [1, 2, 4, 5, 6],
            verify(M) {
              const U = [1, 2, 3, 4, 5, 6], A = [1, 2, 3], B = [3, 4];
              const lhs = U.filter((x) => !(A.includes(x) && B.includes(x)));
              const rhs = U.filter((x) => !A.includes(x) || !B.includes(x));
              const want = [1, 2, 4, 5, 6];
              const eq = (p, q) => p.length === q.length && p.every((x, i) => x === q[i]);
              return eq(lhs, rhs) && eq(lhs, want);
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_DM_MAIN;
          const COLS = dmCols(D);
          const lhsSet = D.U.filter(COLS[3].f);
          const cellCls = (ci) => (step.fresh.includes(ci) || (step.compare && (ci === 3 || ci === 6)) ? 'cur' : '');
          const table = h('table.tt', { style: { fontSize: '0.85rem' } },
            h('thead', h('tr', h('th', 'x'), COLS.map((c, ci) => h('th', { class: ci < step.cols ? cellCls(ci) : 'muted' }, c.head)))),
            h('tbody', D.U.map((x) => h('tr', { class: step.compare && COLS[3].f(x) ? 'hit' : '' },
              h('td', String(x)),
              COLS.map((c, ci) => (ci < step.cols ? h('td', { class: cellCls(ci) }, c.f(x) ? 'T' : 'F') : h('td.muted', '·')))))));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.3rem' } },
            h('div.small', h('b.mono', step.status)),
            table,
            step.answer ? h('div.ex-answer', `${COLS[3].head.replace('in ', '')} = ${COLS[6].head.replace('in ', '')} = ${fmt(lhsSet)} — check: the two highlighted columns match in all ${D.U.length} rows, and ${D.bannerTail}`) : null));
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Practice: sets',
        kind: 'practice',
        html: String.raw`<p class="muted small">Type sets with braces, such as <code>{1, 4, 9}</code>. Order and spacing do not matter. Type <code>{}</code> or <code>∅</code> for the empty set.</p>`,
        gens: [
          {
            label: 'Set operations',
            make(R, M) {
              const A = M.sortNum(R.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], R.int(3, 6)));
              const B = M.sortNum(R.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], R.int(3, 6)));
              const ops = [
                ['\\cup', (x) => A.includes(x) || B.includes(x), 'in A, in B, or in both'],
                ['\\cap', (x) => A.includes(x) && B.includes(x), 'in both A and B'],
                ['-', (x) => A.includes(x) && !B.includes(x), 'in A but not in B'],
                ['\\Delta', (x) => A.includes(x) !== B.includes(x), 'in exactly one of A or B'],
              ];
              const [sym, fn, words] = R.pick(ops);
              const ans = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(fn);
              return {
                prompt: String.raw`Let \(A = \{${A.join(', ')}\}\) and \(B = \{${B.join(', ')}\}\). Find \(A ${sym} B\).`,
                answer: ans,
                format: 'set',
                hint: `keep each element that is ${words}.`,
                solution: String.raw`Go through the candidates one at a time and keep each element that is ${words}. Result: \(A ${sym} B = ${ans.length ? '\\{' + ans.join(', ') + '\\}' : '\\varnothing'}\).`,
              };
            },
          },
          {
            label: 'Complements',
            make(R, M) {
              const A = M.sortNum(R.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], R.int(2, 6)));
              const B = M.sortNum(R.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], R.int(2, 6)));
              const U = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
              const kind = R.int(0, 2);
              let tex, ans, how;
              if (kind === 0) { tex = "A'"; ans = U.filter((x) => !A.includes(x)); how = 'everything in U that is not in A'; }
              else if (kind === 1) { tex = "(A \\cup B)'"; ans = U.filter((x) => !A.includes(x) && !B.includes(x)); how = "everything in neither set. By De Morgan this equals A′ ∩ B′"; }
              else { tex = "(A \\cap B)'"; ans = U.filter((x) => !(A.includes(x) && B.includes(x))); how = "everything not in both. By De Morgan this equals A′ ∪ B′"; }
              return {
                prompt: String.raw`The universal set is \(U = \{1, 2, \dots, 10\}\). With \(A = \{${A.join(', ')}\}\) and \(B = \{${B.join(', ')}\}\), find \(${tex}\).`,
                answer: ans, format: 'set',
                solution: String.raw`\(${tex}\) is ${how}: \(${ans.length ? '\\{' + ans.join(', ') + '\\}' : '\\varnothing'}\).`,
              };
            },
          },
          {
            label: 'Counting elements',
            make(R, M) {
              const kind = R.int(0, 2);
              if (kind === 0) {
                const n = R.int(2, 8);
                return { prompt: String.raw`A set \(A\) has \(${n}\) elements. How many elements does its power set \(\mathcal{P}(A)\) have?`, answer: 2 ** n, solution: String.raw`Each of the ${n} elements is either in or out of a subset, so there are \(2^{${n}} = ${2 ** n}\) subsets.` };
              }
              if (kind === 1) {
                const a = R.int(2, 9), b = R.int(2, 9);
                return { prompt: String.raw`\(|A| = ${a}\) and \(|B| = ${b}\). What is \(|A \times B|\)?`, answer: a * b, solution: String.raw`Each of the ${a} choices of the first coordinate pairs with each of the ${b} choices of the second: \(${a} \cdot ${b} = ${a * b}\).` };
              }
              const both = R.int(1, 8), a = both + R.int(1, 15), b = both + R.int(1, 15);
              return { prompt: String.raw`In a class, ${a} students know Python, ${b} know SQL, and ${both} know both. How many know at least one of the two?`, answer: a + b - both, solution: String.raw`Inclusion–exclusion: \(|P \cup S| = |P| + |S| - |P \cap S| = ${a} + ${b} - ${both} = ${a + b - both}\).` };
            },
          },
          {
            label: 'True or false',
            make(R, M) {
              const A = M.sortNum(R.sample([1, 2, 3, 4, 5, 6], R.int(2, 4)));
              const x = R.int(1, 6);
              const sub = M.sortNum(R.sample([1, 2, 3, 4, 5, 6], 2));
              const items = [
                [String.raw`${x} \in \{${A.join(', ')}\}`, A.includes(x), A.includes(x) ? `${x} is listed in the set.` : `${x} is not listed in the set.`],
                [String.raw`\{${sub.join(', ')}\} \subseteq \{${A.join(', ')}\}`, sub.every((y) => A.includes(y)), sub.every((y) => A.includes(y)) ? 'Every element of the left set appears on the right.' : `${sub.find((y) => !A.includes(y))} is on the left but not on the right.`],
                [String.raw`\varnothing \subseteq \{${A.join(', ')}\}`, true, 'The empty set is a subset of every set: it has no element that could fail to be in the other set.'],
                [String.raw`\{${A.join(', ')}\} \subset \{${A.join(', ')}\}`, false, 'A set is a subset of itself, but never a proper subset of itself.'],
                [String.raw`|\{${A.concat(A[0]).join(', ')}\}| = ${A.length + 1}`, false, `Repeated elements count once, so the cardinality is ${A.length}.`],
                [String.raw`\{${A.join(', ')}\} = \{${A.slice().reverse().join(', ')}\}`, true, 'Order does not matter in a set, so listing the elements backwards gives the same set.'],
              ];
              const [stmt, truth, why] = R.pick(items);
              return { prompt: String.raw`True or false: \(${stmt}\)`, options: ['True', 'False'], answer: truth ? 'True' : 'False', solution: `<b>${truth ? 'True' : 'False'}.</b> ${why}` };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Check yourself: sets',
        kind: 'quiz',
        questions: [
          { q: String.raw`Which statement is true for \(A = \{1, \{2, 3\}\}\)?`, choices: [String.raw`\(2 \in A\)`, String.raw`\(\{2, 3\} \in A\)`, String.raw`\(|A| = 3\)`, String.raw`\(\{2,3\} \subseteq A\)`], answer: 1, explain: String.raw`\(A\) has exactly two elements: the number 1 and the set \(\{2, 3\}\). So \(\{2,3\} \in A\) and \(|A| = 2\). The number 2 is not itself an element of \(A\); it sits inside an element.` },
          { q: String.raw`How many subsets does \(\{a, b, c, d\}\) have?`, choices: ['4', '8', '16', '24'], answer: 2, explain: String.raw`Each of the 4 elements is independently in or out of a subset, so there are \(2^4 = 16\) subsets, counting \(\varnothing\) and the whole set.` },
          { q: String.raw`With \(U = \{1,\dots,6\}\), \(A = \{1,2,3\}\) and \(B = \{3,4\}\), what is \((A \cup B)'\)?`, choices: [String.raw`\(\{5, 6\}\)`, String.raw`\(\{3\}\)`, String.raw`\(\{1,2,4,5,6\}\)`, String.raw`\(\varnothing\)`], answer: 0, explain: String.raw`\(A \cup B = \{1,2,3,4\}\), and its complement in \(U\) is \(\{5,6\}\). By De Morgan's law you get the same answer from \(A' \cap B' = \{4,5,6\} \cap \{1,2,5,6\}\).` },
          { q: 'Which Python expression computes the symmetric difference of sets <code>a</code> and <code>b</code>?', choices: ['<code>a | b</code>', '<code>a &amp; b</code>', '<code>a - b</code>', '<code>a ^ b</code>'], answer: 3, explain: '<code>^</code> keeps elements in exactly one of the two sets, matching \\(A \\,\\Delta\\, B\\). <code>|</code> is union, <code>&amp;</code> is intersection, and <code>-</code> is difference.' },
          { q: String.raw`If \(|A| = 3\) and \(|B| = 5\), what is \(|A \times B|\)?`, choices: ['8', '15', '35', '243'], answer: 1, explain: String.raw`The product rule: every one of the 3 first coordinates pairs with each of the 5 second coordinates, giving \(3 \cdot 5 = 15\) ordered pairs.` },
          { q: '30 people like tea, 20 like coffee, and 8 like both. How many like at least one?', choices: ['50', '42', '38', '58'], answer: 1, explain: String.raw`Inclusion–exclusion: \(30 + 20 - 8 = 42\). Simply adding 30 and 20 counts the 8 tea-and-coffee drinkers twice.` },
          { q: 'You must check millions of incoming e-mail addresses against a block list of 50,000 addresses. Which design is best?', choices: ['Store the block list in a Python list and use <code>in</code>', 'Store the block list in a Python set and use <code>in</code>', 'Sort the incoming addresses first', 'Convert every address to a frozenset'], answer: 1, explain: 'Set membership is a hash lookup that takes about the same time whatever the set size, while list membership scans up to all 50,000 entries for every message.' },
          { q: String.raw`Which pair of sets is disjoint?`, choices: [String.raw`\(\{1,2\}\) and \(\{2,3\}\)`, String.raw`\(\{a\}\) and \(\{a, b\}\)`, String.raw`\(\{1, 3, 5\}\) and \(\{2, 4\}\)`, String.raw`\(\{x, y\}\) and \(\{y, x\}\)`], answer: 2, explain: String.raw`Disjoint means \(A \cap B = \varnothing\). The odd numbers and the even numbers share nothing. The other pairs share 2, \(a\), and both \(x\) and \(y\) (\(\{x, y\}\) and \(\{y, x\}\) are the same set written two ways).` },
        ],
      },
    ],
  });
})();
