/* Module 5: Algorithms. Objective 5: explain the application and analysis of algorithms to solve problems. */
(() => {
  /* Pseudocode blocks: bold keywords, gray comments, nothing else. A slide's html holds a
     pseudoTag() placeholder and its render calls fillPseudo(), so the engine's ctx.esc does the
     escaping when the slide is drawn (there is no ctx while the module file loads). */
  const PSEUDO_KW = /\b(for|to|down|while|if|else|return|and|swap)\b/g;
  const PSEUDO = {
    max: `
Input:  s[1], s[2], ..., s[n]   (n ≥ 1)
Output: the largest value

max(s, n) {
  large = s[1]          // best so far
  for i = 2 to n
    if (s[i] > large)
      large = s[i]      // found a bigger one
  return large
}`,
    linear: `
linear_search(s, n, key) {
  for i = 1 to n
    if (s[i] == key)
      return i
  return 0     // not found
}`,
    binary: `
binary_search(s, n, key) {
  i = 1; j = n
  while (i ≤ j) {
    k = ⌊(i + j)/2⌋  // middle
    if (key == s[k]) return k
    if (key < s[k]) j = k − 1
    else i = k + 1
  }
  return 0
}`,
    text: `
text_search(p, m, t, n) {
  for i = 1 to n − m + 1 {
    j = 1
    while (j ≤ m and t[i+j−1] == p[j])
      j = j + 1
    if (j > m) return i
  }
  return 0
}`,
    insertion: `
insertion_sort(s, n) {
  for i = 2 to n {
    val = s[i]
    j = i − 1
    while (j ≥ 1 and s[j] > val) {
      s[j+1] = s[j]   // shift right
      j = j − 1
    }
    s[j+1] = val
  }
}`,
    selection: `
selection_sort(s, n) {
  for i = 1 to n − 1 {
    small = i
    for j = i + 1 to n
      if (s[j] < s[small])
        small = j
    swap(s[i], s[small])
  }
}`,
    shuffle: `
shuffle(s, n) {
  for i = n down to 2 {
    j = rand(1, i)   // 1 ≤ j ≤ i
    swap(s[i], s[j])
  }
}`,
    nested: `
for i = 1 to n
  for j = 1 to i
    x = x + 1`,
    factorial: `
factorial(n) {
  if (n == 0)    // base case
    return 1
  return n * factorial(n − 1)
}`,
    bsearch: `
bsearch(s, i, j, key) {     // search s[i..j]
  if (i > j) return 0       // base case: empty range
  k = ⌊(i + j)/2⌋
  if (key == s[k]) return k
  if (key < s[k]) return bsearch(s, i, k − 1, key)
  return bsearch(s, k + 1, j, key)
}`,
  };
  const pseudoTag = (key, style) => `<pre class="m5-pseudo" data-pseudo="${key}"${style ? ` style="${style}"` : ''}></pre>`;
  function fillPseudo(body, ctx) {
    for (const pre of body.querySelectorAll('pre[data-pseudo]')) {
      pre.innerHTML = PSEUDO[pre.dataset.pseudo].replace(/^\n/, '').replace(/\n\s*$/, '').split('\n').map((line) => {
        const at = line.indexOf('//');
        const code = at >= 0 ? line.slice(0, at) : line;
        let out = ctx.esc(code).replace(PSEUDO_KW, '<b class="k">$1</b>');
        if (at >= 0) out += `<span class="c">${ctx.esc(line.slice(at))}</span>`;
        return out;
      }).join('\n');
    }
  }
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = (k) => String(k).split('').map((c) => SUP[c] ?? c).join('');
  // scientific notation with real superscripts: 6e10 -> "6×10¹⁰", 1e9 -> "10⁹"
  const sci = (x) => {
    const e = Math.floor(Math.log10(x)), m = Number((x / 10 ** e).toFixed(1));
    return m === 1 ? `10${sup(e)}` : `${m}×10${sup(e)}`;
  };
  const big = (x) => {
    if (!Number.isFinite(x)) return '∞';
    if (Math.abs(x) < 1e15) return Math.round(x).toLocaleString('en-US');
    return sci(x);
  };
  const sig = (x) => Number(x.toPrecision(2)).toLocaleString('en-US');
  function fmtTime(sec) {
    if (sec < 1e-6) return `${sig(sec * 1e9)} ns`;
    if (sec < 1e-3) return `${sig(sec * 1e6)} µs`;
    if (sec < 1) return `${sig(sec * 1e3)} ms`;
    if (sec < 60) return `${sig(sec)} s`;
    if (sec < 3600) return `${sig(sec / 60)} min`;
    if (sec < 86400) return `${sig(sec / 3600)} hours`;
    if (sec < 3.156e7) return `${sig(sec / 86400)} days`;
    const yrs = sec / 3.156e7;
    if (yrs < 1e6) return `${sig(yrs)} years`;
    const uni = yrs / 1.38e10;
    return uni < 1 ? `${big(yrs)} years` : `${big(uni)} × age of universe`;
  }
  const log2floor1 = (n) => Math.floor(Math.log2(n)) + 1;

  // ---- searching, as traces of comparisons ----
  function linTrace(a, t) {
    const st = [];
    for (let i = 0; i < a.length; i++) { st.push({ i, eq: a[i] === t }); if (a[i] === t) break; }
    return st;
  }
  function binTrace(a, t) {
    const st = [];
    let lo = 0, hi = a.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, s = { lo, hi, mid, v: a[mid] };
      if (a[mid] === t) { s.res = 'eq'; st.push(s); break; }
      if (a[mid] < t) { s.res = 'lt'; lo = mid + 1; } else { s.res = 'gt'; hi = mid - 1; }
      s.nlo = lo; s.nhi = hi;
      st.push(s);
    }
    return st;
  }

  // ---- worked-example data, computed once ----
  const EX_BIN_LIST = [3, 7, 12, 19, 25, 31, 42, 56];
  const EX_INS_INPUT = [5, 2, 4, 6, 1, 3];

  /* Binary search steps, computed by simulating the search on a preset's data ({ list, target }).
     Each probe step records the range still in play AFTER that probe's decision, so draw can dim
     exactly the ruled-out cells for either preset. The same generator builds the primary steps
     (target present) and the variant steps (target absent, interval empties). */
  function binStepsFor(D) {
    const a = D.list, t = D.target, n = a.length;
    const steps = [{ probe: 0, lo: 0, hi: n - 1, mid: -1, found: false, confirm: false, empty: false,
      caption: `Setup: the list [${a.join(', ')}] is sorted and the target is ${t}, with lo = 0 and hi = ${n - 1} marking the whole range as still possible. Binary search needs a sorted list and works by ruling out half of what remains with each probe — that halving is where the speed comes from.` }];
    let lo = 0, hi = n - 1, probe = 0, last = null;
    while (lo <= hi) {
      const plo = lo, phi = hi, mid = Math.floor((lo + hi) / 2), v = a[mid];
      probe++;
      let res;
      if (v === t) res = 'eq';
      else if (v < t) { res = 'lt'; lo = mid + 1; } else { res = 'gt'; hi = mid - 1; }
      const step = { probe, lo: res === 'eq' ? plo : lo, hi: res === 'eq' ? phi : hi, mid, found: res === 'eq', confirm: false, empty: res !== 'eq' && lo > hi,
        caption: res === 'eq'
          ? `Probe ${probe}: with lo = ${plo} and hi = ${phi}, mid = (${plo} + ${phi}) // 2 = ${mid} and list[${mid}] = ${v}, which equals the target exactly. The search stops at once, because an equal probe is the success case and no smaller range needs to be checked.`
          : res === 'lt'
            ? `Probe ${probe}: mid = (${plo} + ${phi}) // 2 = ${mid} and list[${mid}] = ${v}, and since ${v} < ${t} the target, if present, is strictly to the right of mid. Cells ${plo} to ${mid} are ruled out — mid itself goes too, because we just compared it and it was too small — so lo becomes ${lo}.`
            : `Probe ${probe}: mid = (${plo} + ${phi}) // 2 = ${mid} and list[${mid}] = ${v}, and since ${v} > ${t} the target, if present, is strictly to the left of mid. Cells ${mid} to ${phi} are ruled out — mid itself goes too, because we just compared it and it was too big — so hi becomes ${hi}.` };
      steps.push(step);
      last = { ...step, plo, phi, res };
      if (res === 'eq') break;
    }
    if (probe >= 2 && last) {
      steps[steps.length - 2].checkpoint = last.res === 'eq'
        ? `Predict: the range has narrowed to lo = ${last.plo} and hi = ${last.phi}, so the next probe checks mid = ${last.mid} — will list[${last.mid}] turn out smaller than ${t}, bigger than ${t}, or exactly ${t}?`
        : `Predict: only one candidate is left, list[${last.mid}] = ${a[last.mid]} — if it is not ${t}, the next update pushes lo past hi. What will that empty interval prove about ${t}?`;
    }
    if (last && last.res === 'eq') {
      steps.push({ probe, lo: last.lo, hi: last.hi, mid: last.mid, found: true, confirm: true, empty: false,
        caption: `Confirm the hit before reporting it: index ${last.mid} lies inside the narrowed range from lo = ${last.lo} to hi = ${last.hi}, and the value stored there is exactly ${t}. Checking the index and the value together guards against reporting a position produced by an arithmetic slip.` });
      steps.push({ probe, lo: last.lo, hi: last.hi, mid: last.mid, found: true, confirm: true, empty: false, answer: true,
        caption: `Answer: ${t} is at index ${last.mid}, found in only ${probe} probes where linear search could need up to ${n}. Check: the list really is sorted and list[${last.mid}] = ${t}, and each probe at most halves the candidates, so the range shrank from ${n} cells all the way down to the single found cell.` });
    } else if (last) {
      steps.push({ probe, lo: last.lo, hi: last.hi, mid: last.mid, found: false, confirm: false, empty: true, answer: true,
        caption: `Answer: ${t} is not in the list. The last probe pushed lo to ${last.lo} while hi stayed ${last.hi}, so lo > hi and the interval is empty — no index is left that could hold ${t}, which proves absence instead of merely failing to spot the value. Binary search needed ${probe} probes to prove it; a linear search would have needed all ${n} comparisons. The result is reported as index −1 (not found).` });
    }
    return steps;
  }
  const EX_BIN_DATA = { list: EX_BIN_LIST, target: 31 };
  const EX_BIN_VAR_DATA = { list: EX_BIN_LIST, target: 28 };

  /* Insertion sort, simulated once per preset: pass states for draw, and per-pass details
     (key, landing index, comparisons, shifts) for the step captions. */
  function insStatesFor(input) {
    const a = input.slice(), states = [a.slice()];
    for (let i = 1; i < a.length; i++) {
      const key = a[i]; let j = i - 1;
      while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
      a[j + 1] = key;
      states.push(a.slice());
    }
    return states;
  }
  function insPassesFor(input) {
    const a = input.slice(), passes = [];
    for (let i = 1; i < a.length; i++) {
      const key = a[i]; let j = i - 1, comps = 0;
      while (j >= 0) { comps++; if (a[j] <= key) break; a[j + 1] = a[j]; j--; }
      a[j + 1] = key;
      passes.push({ i, key, keyPos: j + 1, comps, shifts: i - (j + 1), state: a.slice() });
    }
    return passes;
  }
  function insStepsFor(D) {
    const input = D.input, n = input.length, passes = insPassesFor(input);
    const totalComps = passes.reduce((s, p) => s + p.comps, 0), totalShifts = passes.reduce((s, p) => s + p.shifts, 0);
    const sum = input.reduce((s, x) => s + x, 0), sortedList = passes[passes.length - 1].state;
    const steps = [{ pass: 0, keyPos: -1, sorted: 1, stays: false,
      caption: `Setup: start with [${input.join(', ')}], where the sorted prefix is just [${input[0]}] because a single item is always in order by itself. Insertion sort grows that sorted prefix one key at a time, inserting each new key into its place — like sorting a hand of cards.` }];
    for (const p of passes) {
      steps.push({ pass: p.i, keyPos: p.keyPos, sorted: p.i + 1, stays: p.shifts === 0,
        caption: p.shifts === 0
          ? `Pass ${p.i} takes the key ${p.key} from index ${p.i}: its only comparison is against ${p.state[p.i - 1]}, the last item of the sorted prefix, and ${p.key} is not smaller, so nothing shifts and the key stays at index ${p.i}. The list is unchanged, [${p.state.join(', ')}], but the sorted prefix still grows to [${p.state.slice(0, p.i + 1).join(', ')}].`
          : `Pass ${p.i} takes the key ${p.key} from index ${p.i}: it is compared ${p.comps} time${p.comps === 1 ? '' : 's'} while sliding left past ${p.shifts} larger item${p.shifts === 1 ? '' : 's'}, and it lands at index ${p.keyPos}${p.keyPos === 0 ? ', the very front of the list' : ''}. The list becomes [${p.state.join(', ')}] and the sorted prefix grows to [${p.state.slice(0, p.i + 1).join(', ')}].` });
    }
    const star = passes.reduce((best, p) => (p.shifts > best.shifts ? p : best), passes[0]);
    if (star.shifts > 0 && star.i >= 2) {
      steps[star.i - 1].checkpoint = `Predict: the next key is ${star.key}, smaller than every item already in the sorted prefix — how far left will it slide, and at which index will it finally land?`;
    } else if (passes.length >= 3) {
      steps[2].checkpoint = `Predict: the next key is ${passes[2].key}, larger than everything in the sorted prefix so far — how many comparisons will its pass need, and will any item have to shift?`;
    }
    steps.push({ pass: n - 1, keyPos: -1, sorted: n, stays: false, answer: true,
      caption: `Answer: the sorted list is [${sortedList.join(', ')}], in ascending order at every neighboring pair. Check: it is the same multiset as the input — both lists have ${n} elements and both sum to ${sum}, so nothing was lost, added or duplicated while sorting. The whole sort took ${totalComps} comparisons and ${totalShifts} shifts${totalShifts === 0 ? `, the fewest possible for ${n} items, since each of the ${n - 1} passes still has to compare its key at least once` : ''}.` });
    return steps;
  }
  const EX_INS_STATES = insStatesFor(EX_INS_INPUT);
  const EX_INS_DATA = { input: EX_INS_INPUT, states: EX_INS_STATES };
  const EX_INS_VAR_INPUT = [2, 5, 9, 14, 20, 27];
  const EX_INS_VAR_DATA = { input: EX_INS_VAR_INPUT, states: insStatesFor(EX_INS_VAR_INPUT) };

  /* Loop counting (the nested loop of the counting slide): rowsFor gives the inner-line count
     for each outer value i = 1..n — triangular when the inner loop runs to i, rectangular when
     it runs to n. The same generator narrates both shapes row by row. */
  function loopRowsFor(n, shape) { const r = []; for (let i = 1; i <= n; i++) r.push(shape === 'rect' ? n : i); return r; }
  function loopStepsFor(D) {
    const { n, shape, rows, total } = D;
    const steps = [{ shown: 0, run: 0, caption: `Setup: count how many times the inner line x = x + 1 runs when n = ${n}. The outer loop takes i = 1 to ${n} in turn; for each fixed i the inner loop runs j from 1 to ${shape === 'rect' ? 'n' : 'i'}, so each outer value contributes one row of executions, and the rows accumulate into the total we are after.` }];
    let run = 0;
    rows.forEach((c, idx) => {
      const prev = run; run += c; const i = idx + 1;
      steps.push({ shown: i, run, caption: shape === 'rect'
        ? `Row i = ${i}: the inner loop runs j = 1 to n = ${n}, which is ${c} executions, because the inner bound is n itself and does not shrink or grow with i. Adding ${c} to the running total gives ${prev} + ${c} = ${run}, and the picture gains a full row of ${c} dots.`
        : `Row i = ${i}: the inner loop runs j = 1 to i = ${i}, which is ${c} execution${c === 1 ? '' : 's'}, because both inner bounds are fixed once i is ${i}. Adding ${c} to the running total gives ${prev} + ${c} = ${run}, and the picture gains a row of ${c} dot${c === 1 ? '' : 's'} — one longer than the row before.` });
    });
    if (rows.length >= 3) steps[2].checkpoint = `Predict: the next row is i = 3 — how many times will the inner line run in that row, and what will the running total become once it is added?`;
    steps.push({ shown: rows.length, run: total, answer: true, caption: `Answer: the inner line runs ${total} times in all: ${rows.join(' + ')} = ${total}. Check: the closed form ${shape === 'rect' ? `n · n = ${n} · ${n}` : `n(n + 1)/2 = ${n} · ${n + 1}/2`} = ${total} agrees, and actually running both loops with a counter ends at the same ${total}, so the row-by-row count, the formula and the simulation all match. The count is Theta(n²) either way, because the total grows like a constant times n².` });
    return steps;
  }
  const loopDataFor = (n, shape) => { const rows = loopRowsFor(n, shape); return { n, shape, rows, total: rows.reduce((s, x) => s + x, 0) }; };
  const EX_LOOP_DATA = loopDataFor(5, 'tri');
  const EX_LOOP_VAR_DATA = loopDataFor(5, 'rect');

  /* Growth race: operation counts for the module's growth families at doubling inputs.
     GROW_FAMS holds the formulas; a preset's data names its families by key and stores the
     computed table, so one generator and one draw serve both races. */
  const GROW_FAMS = {
    n: { label: 'n', f: (n) => n, why: 'doubling the input doubles the count' },
    nlogn: { label: 'n log₂ n', f: (n) => n * Math.log2(n), why: 'log₂ n grows by exactly 1 when n doubles, so the factor 2(k+1)/k shrinks toward 2' },
    nsq: { label: 'n²', f: (n) => n * n, why: '(2n)² = 4n², so the count quadruples' },
    exp: { label: '2ⁿ', f: (n) => 2 ** n, why: '2^(2n) = (2ⁿ)², so the count squares and the factor itself explodes' },
  };
  const fmtV = (v) => (v >= 10000 ? v.toLocaleString('en-US') : String(v));
  const fmtR = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0$/, ''));
  function growthStepsFor(D) {
    const steps = [{ shown: 0, caption: `Setup: race the operation counts ${D.fams.map((k) => GROW_FAMS[k].label).join(', ')} as n doubles through ${D.ns.join(', ')}. Each new column recomputes every count at the doubled input, and the doubling factor of each family — how many times bigger its count gets — is what decides the race in the long run.` }];
    D.ns.forEach((n, j) => {
      if (j === 0) {
        steps.push({ shown: 1, caption: `First column, n = ${n}: the counts are ${D.fams.map((k, fi) => `${GROW_FAMS[k].label} = ${fmtV(D.table[fi][0])}`).join(', ')}. At this small size the families sit close together and the lead looks modest, but a race between growth rates is decided by the doubling factors, not by who leads first — so read the columns left to right.` });
        return;
      }
      const parts = D.fams.map((k, fi) => `${GROW_FAMS[k].label}: ${fmtV(D.table[fi][j - 1])} → ${fmtV(D.table[fi][j])} (×${fmtR(D.table[fi][j] / D.table[fi][j - 1])}, because ${GROW_FAMS[k].why})`);
      steps.push({ shown: j + 1, caption: `Doubling to n = ${n}: ${parts.join('; ')}. The family with the stubbornly largest doubling factor pulls further ahead at every doubling, which is exactly why constant factors stop mattering for large n.` });
    });
    const cp = steps[steps.length - 2];
    if (cp && D.predict) cp.checkpoint = D.predict;
    const last = D.ns.length - 1, wi = D.fams.indexOf(D.winnerKey);
    const others = D.fams.filter((_, fi) => fi !== wi).map((k, fi) => `${GROW_FAMS[k].label} = ${fmtV(D.table[D.fams.indexOf(k)][last])}`).join(' and ');
    steps.push({ shown: D.ns.length, answer: true, caption: `Answer: ${GROW_FAMS[D.winnerKey].label} grows fastest of the ${D.fams.length} families. At n = ${D.ns[last]} it already needs ${fmtV(D.table[wi][last])} operations against ${others}, and its doubling factor never shrinks, so the gap only widens from here. A counted total with this shape is Theta(${GROW_FAMS[D.winnerKey].label}): that family is both an upper bound and a lower bound for its growth.` });
    return steps;
  }
  function growthDataFor(ns, fams, predict) {
    const table = fams.map((k) => ns.map((n) => GROW_FAMS[k].f(n)));
    const last = ns.length - 1;
    let wi = 0; fams.forEach((k, fi) => { if (table[fi][last] > table[wi][last]) wi = fi; });
    return { ns, fams, table, winnerKey: fams[wi], ans: GROW_FAMS[fams[wi]].label, predict };
  }
  const EX_GROW_DATA = growthDataFor([4, 8, 16, 32], ['n', 'nlogn', 'nsq'],
    'Predict: n doubles once more, to 32. The n² column has multiplied by 4 on every doubling so far — will it do so again, and will the n log₂ n factor (×2.67 last time) grow or shrink?');
  const EX_GROW_VAR_DATA = growthDataFor([4, 8, 16, 32], ['n', 'nsq', 'exp'],
    'Predict: at n = 32 the exponential column does not double or quadruple — when n doubles, 2ⁿ squares. What will 65,536 become, and how far behind will n² be left?');

  // ---- sorting, as lists of snapshots so the lab can step forward and back ----
  function insEvents(arr) {
    const a = arr.slice(), ev = [];
    let comps = 0, moves = 0;
    const push = (o) => ev.push({ a: a.slice(), comps, moves, ...o });
    push({ sorted: 1, msg: `Start. A list with one item is already sorted, so the sorted part is just a[0] = ${a[0]}.` });
    for (let i = 1; i < a.length; i++) {
      const key = a[i];
      let j = i;
      push({ sorted: i, work: i + 1, key: i, msg: `Pass ${i}: take the key a[${i}] = ${key} and slide it left into the sorted part a[0..${i - 1}].` });
      while (j > 0) {
        comps++;
        if (a[j - 1] <= key) { push({ sorted: i, work: i + 1, key: j, cmp: [j - 1, j], msg: `Compare ${a[j - 1]} with the key ${key}: ${a[j - 1]} ≤ ${key}, so the key stops here.` }); break; }
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        moves++;
        j--;
        push({ sorted: i, work: i + 1, key: j, cmp: [j, j + 1], msg: `Compare ${a[j + 1]} with the key ${key}: ${a[j + 1]} > ${key}, so ${a[j + 1]} shifts one place right.` });
      }
      push({ sorted: i + 1, key: j, msg: `${j === 0 ? `The key ${key} reached the front` : `The key ${key} lands at index ${j}`}. Now a[0..${i}] is sorted.` });
    }
    push({ sorted: a.length, done: true, msg: 'Done. Every pass grew the sorted part by one item.' });
    return ev;
  }
  function selEvents(arr) {
    const a = arr.slice(), n = a.length, ev = [];
    let comps = 0, moves = 0;
    const push = (o) => ev.push({ a: a.slice(), comps, moves, ...o });
    push({ final: 0, msg: 'Start. Nothing is in its final place yet.' });
    for (let i = 0; i < n - 1; i++) {
      let small = i;
      push({ final: i, small, msg: `Pass ${i + 1}: find the smallest item in a[${i}..${n - 1}]. Start with a[${i}] = ${a[i]} as the smallest so far.` });
      for (let j = i + 1; j < n; j++) {
        comps++;
        const prev = small, better = a[j] < a[small];
        if (better) small = j;
        push({ final: i, small, cmp: [prev, j], msg: `Compare a[${j}] = ${a[j]} with the smallest so far, ${a[prev]}: ${better ? `${a[j]} is smaller, so it becomes the new smallest.` : `keep ${a[prev]}.`}` });
      }
      if (small !== i) { [a[i], a[small]] = [a[small], a[i]]; moves++; }
      push({ final: i + 1, swap: [i, small], msg: small !== i ? `Swap a[${i}] and a[${small}]: ${a[i]} is now in its final place.` : `a[${i}] = ${a[i]} is already the smallest, so no swap is needed.` });
    }
    push({ final: n, done: true, msg: 'Done. The last item is automatically in place once the others are.' });
    return ev;
  }

  // ---- functions for the Big-O lab: key = [exponential?, polynomial degree, power of log] ----
  const FS = {
    '3n² + 5n + 2': { f: (n) => 3 * n * n + 5 * n + 2, key: [0, 2, 0], lc: 3, tex: '3n^2 + 5n + 2' },
    '100n + 50': { f: (n) => 100 * n + 50, key: [0, 1, 0], lc: 100, tex: '100n + 50' },
    'n log₂ n': { f: (n) => n * Math.log2(n), key: [0, 1, 1], lc: 1, tex: 'n \\log_2 n' },
    '0.01n³': { f: (n) => 0.01 * n ** 3, key: [0, 3, 0], lc: 0.01, tex: '0.01n^3' },
    '2ⁿ': { f: (n) => 2 ** n, log: (n) => n * Math.LN2, key: [1, 0, 0], lc: 1, tex: '2^n' },
    'log₂ n + 7': { f: (n) => Math.log2(n) + 7, key: [0, 0, 1], lc: 1, tex: '\\log_2 n + 7' },
  };
  const GS = {
    '1': { f: () => 1, key: [0, 0, 0], tex: '1' },
    'log₂ n': { f: (n) => Math.log2(n), key: [0, 0, 1], tex: '\\log_2 n' },
    'n': { f: (n) => n, key: [0, 1, 0], tex: 'n' },
    'n log₂ n': { f: (n) => n * Math.log2(n), key: [0, 1, 1], tex: 'n \\log_2 n' },
    'n²': { f: (n) => n * n, key: [0, 2, 0], tex: 'n^2' },
    'n³': { f: (n) => n ** 3, key: [0, 3, 0], tex: 'n^3' },
    '2ⁿ': { f: (n) => 2 ** n, log: (n) => n * Math.LN2, key: [1, 0, 0], tex: '2^n' },
  };
  const cmpKey = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; };
  const lnOf = (F, n) => (F.log ? F.log(n) : Math.log(Math.max(F.f(n), 1e-300)));

  // ---- growth rates for the one-second lab ----
  const lgFact = (n) => { let s = 0; for (let k = 2; k <= n; k++) s += Math.log10(k); return s; };
  const GROWTH = [
    { name: '1', col: 'var(--ink-3)', l10: () => 0, fit: () => Infinity },
    { name: 'log₂ n', col: 'var(--str)', l10: (n) => Math.log10(Math.max(1, Math.log2(n))), fit: () => Infinity, fitText: (B) => `2^(${B < 1e6 ? big(B) : sci(B)})` },
    { name: 'n', col: 'var(--accent)', l10: (n) => Math.log10(n), fit: (B) => B },
    { name: 'n log₂ n', col: 'var(--fnc)', l10: (n) => Math.log10(Math.max(1, n * Math.log2(n))), fit: (B) => { let lo = 2, hi = B; while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); if (m * Math.log2(m) <= B) lo = m; else hi = m; } return lo; } },
    { name: 'n²', col: 'var(--num)', l10: (n) => 2 * Math.log10(n), fit: (B) => Math.floor(Math.sqrt(B)) },
    { name: '2ⁿ', col: 'var(--kw)', l10: (n) => n * Math.log10(2), fit: (B) => Math.floor(Math.log2(B)) },
    { name: 'n!', col: 'var(--false)', l10: lgFact, fit: (B) => { let n = 1; while (lgFact(n + 1) <= Math.log10(B)) n++; return n; } },
  ];

  DM.module({
    id: 'algorithms',
    num: 5,
    title: 'Algorithms',
    objectives: [5],
    terms: {
      'algorithm': 'A finite sequence of precise instructions that solves a problem: it takes input, produces output, and always stops.',
      'pseudocode': 'A language-neutral way to write an algorithm: precise enough to follow step by step, without the syntax details of any real programming language.',
      'linear search': 'Check the items one at a time from the front until the target appears or the list ends. Works on any list; up to n comparisons.',
      'binary search': 'Search a sorted list by comparing the target with the middle item and discarding the half that cannot contain it. At most ⌊log₂ n⌋ + 1 comparisons.',
      'text search': 'Find where a pattern of m characters occurs in a text of n characters by trying each starting position and comparing character by character.',
      'insertion sort': 'Builds a sorted prefix one item at a time, sliding each new item left past the larger items into its place.',
      'selection sort': 'Repeatedly selects the smallest remaining item and swaps it into the next position of the sorted prefix.',
      'randomized algorithm': 'An algorithm that makes random choices while it runs, so two runs on the same input may differ. Shuffling and random sampling are examples.',
      'input size': 'The number n that measures how big an input is, such as the length of a list. Running time is studied as a function of n.',
      'basic operation': 'The step an analysis counts, usually a comparison, chosen so the total running time is proportional to how often it runs.',
      'worst case': 'The largest number of basic operations over all inputs of size n. It is a guarantee: no input of that size takes longer.',
      'best case': 'The smallest number of basic operations over all inputs of size n. Rarely useful on its own, because lucky inputs are rare.',
      'average case': 'The expected number of basic operations when inputs of size n follow a stated probability distribution, often "all inputs equally likely".',
      'Big-O': 'f(n) = O(g(n)) means f(n) ≤ C·g(n) for some constant C > 0 and every n ≥ n₀: g is an upper bound on how fast f grows.',
      'Big-Omega': 'f(n) = Ω(g(n)) means f(n) ≥ C·g(n) for some constant C > 0 and every n ≥ n₀: g is a lower bound on how fast f grows.',
      'Big-Theta': 'f(n) = Θ(g(n)) means f is both O(g(n)) and Ω(g(n)): f and g grow at the same rate, up to constant factors.',
      'growth rate': 'How fast an operation count grows with n. The common rates, slowest first: 1, log n, n, n log n, n², n³, 2ⁿ, n!.',
      'recursive algorithm': 'An algorithm that solves a problem by calling itself on smaller instances of the same problem until it reaches a base case.',
      'base case': 'The smallest input of a recursive algorithm, solved directly without another recursive call. Every call must move toward it.',
    },
    symbols: [
      ['O(g(n))', 'Big-O: grows no faster than g', '3n + 5 = O(n)'],
      ['Ω(g(n))', 'Big-Omega: grows at least as fast as g', 'n² = Ω(n)'],
      ['Θ(g(n))', 'Big-Theta: grows exactly like g', '3n² + n = Θ(n²)'],
      ['n₀', 'threshold after which a bound must hold', 'for all n ≥ n₀'],
      ['log₂ n', 'how many times n can be halved down to 1', 'log₂ 1024 = 10'],
      ['n log n', 'n times log n, the cost of fast sorting', 'n = 1024: about 10,240'],
      ['n!', 'n factorial: n · (n − 1) ⋯ 2 · 1', '5! = 120'],
      ['⌊(i + j)/2⌋', 'middle index in binary search', '⌊(0 + 9)/2⌋ = 4'],
      ['x = e', 'pseudocode assignment: store the value of e in x', 'large = s[1]'],
    ],
    css: `
      .m5-pseudo { margin: 0; font-family: var(--font-mono); font-size: 0.78rem; line-height: 1.42; background: var(--code-bg); border: 1px solid var(--rule); border-radius: 0.35rem; padding: 0.4rem 0.6rem; white-space: pre; color: var(--ink); overflow: hidden; }
      .m5-pseudo .k { color: var(--kw); font-weight: 600; }
      .m5-pseudo .c { color: var(--cmt); font-style: italic; }
      .m5-lane { display: grid; gap: 0.3rem; }
      .m5-lane-head { display: flex; align-items: baseline; gap: 0.6rem; }
      .m5-lane-head b { font-family: var(--font-display); font-size: 1.05rem; }
      .m5-count { margin-left: auto; font-family: var(--font-mono); font-size: 0.85rem; color: var(--ink-2); }
      .m5-count strong { font-family: var(--font-display); font-size: 1.35rem; color: var(--ink); margin-right: 0.25rem; }
      .m5-cells { display: grid; grid-template-columns: repeat(20, minmax(0, 1fr)); gap: 3px; }
      .m5-cell { border: 1px solid var(--rule); border-radius: 0.3rem; background: var(--sheet); color: var(--ink); font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.15; padding: 0.15rem 0 0.1rem; cursor: pointer; text-align: center; transition: opacity 0.2s, background 0.2s; }
      .m5-cell small { display: block; font-size: 0.6rem; color: var(--ink-3); }
      .m5-cell.out { opacity: 0.28; }
      .m5-cell.cur { background: var(--mark); color: var(--mark-ink); border-color: var(--warn); }
      .m5-cell.found { background: var(--true-bg); color: var(--true); border-color: var(--true); font-weight: 700; }
      .m5-cell.tgt { box-shadow: inset 0 -3px 0 var(--accent); }
      .m5-status { font-size: 0.86rem; min-height: 2.6em; line-height: 1.4; }
      .m5-stat { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem; text-align: center; }
      .m5-stat div { border: 1px solid var(--rule); border-radius: var(--radius); background: var(--sheet); padding: 0.3rem; }
      .m5-stat b { display: block; font-family: var(--font-display); font-size: 1.45rem; line-height: 1.1; }
      .m5-stat span { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
      .m5-growth td, .m5-growth th { padding: 0.18rem 0.4rem; }
      .m5-growth td.over { color: var(--false); font-weight: 600; }
      .m5-ctl { display: flex; flex-wrap: wrap; gap: 0.5rem 0.9rem; align-items: center; }
      .m5-ctl label { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; color: var(--ink-2); }
      .m5-ctl select { font-size: 0.88rem; padding: 0.2rem 0.35rem; }
    `,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'What is an algorithm?',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">An <span class="term">algorithm</span> is a finite sequence of precise instructions for solving a problem. Every algorithm has seven properties:</div>
              <table class="tt" style="width:100%">
                <tbody class="small">
                  <tr><td class="l"><b>Input</b></td><td class="l">It receives data (possibly none).</td></tr>
                  <tr><td class="l"><b>Output</b></td><td class="l">It produces a result.</td></tr>
                  <tr><td class="l"><b>Precision</b></td><td class="l">Every step is stated exactly, with no room for guessing.</td></tr>
                  <tr><td class="l"><b>Determinism</b></td><td class="l">Each step's result depends only on the input and the steps before it.</td></tr>
                  <tr><td class="l"><b>Finiteness</b></td><td class="l">It stops after finitely many steps, on every input.</td></tr>
                  <tr><td class="l"><b>Correctness</b></td><td class="l">The output is right for every valid input.</td></tr>
                  <tr><td class="l"><b>Generality</b></td><td class="l">It works for every input of the problem, not just one example.</td></tr>
                </tbody>
              </table>
              <div class="ai">A language model that samples its next word at temperature above 0 deliberately gives up determinism: the same prompt can produce different answers. At temperature 0 (greedy decoding) it always picks the most likely word, so the output repeats exactly.</div>
            </div>
            <div class="stack">
              <div class="card stack" style="gap:0.4rem">
                <h3>Pseudocode: find the largest value</h3>
                ${pseudoTag('max')}
                <p class="small"><span class="term">Pseudocode</span> conventions: indentation shows which lines belong to a loop or an <code>if</code>; <code>=</code> stores a value; <code>for i = 2 to n</code> counts up by one; <code>return</code> ends the algorithm and hands back the answer. Like the textbook, pseudocode here numbers positions from 1, while Python starts at 0.</p>
              </div>
              <div class="ex">Trace on \(3, 9, 4\): <code>large</code> starts at 3, becomes 9 (because \(9 \gt 3\)), and stays 9 (because \(4 \gt 9\) is false). The output is 9 after \(n - 1 = 2\) comparisons.</div>
            </div>
          </div>`,
        render: fillPseudo,
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Searching: linear, binary and text search',
        kind: 'concept',
        html: String.raw`
          <div class="cols-3">
            <div class="card stack" style="gap:0.4rem">
              <h3><span class="term">Linear search</span></h3>
              ${pseudoTag('linear')}
              <p class="small">Check the items in order. It works on <b>any</b> list. Worst case: \(n\) comparisons, when the key is last or missing.</p>
            </div>
            <div class="card stack" style="gap:0.4rem">
              <h3><span class="term">Binary search</span></h3>
              ${pseudoTag('binary')}
              <p class="small">The list must be <b>sorted</b>. Each comparison discards half of what is left, so at most \(\lfloor \log_2 n \rfloor + 1\) comparisons.</p>
            </div>
            <div class="card stack" style="gap:0.4rem">
              <h3><span class="term">Text search</span></h3>
              ${pseudoTag('text')}
              <p class="small">Slide the pattern \(p\) along the text \(t\). "cad" occurs in "abracadabra" at position 5. Worst case about \((n - m + 1) \cdot m\) character comparisons.</p>
            </div>
          </div>
          <div class="split">
            <div class="warn">Binary search on unsorted data fails <i>silently</i>: it may report "not found" for a key that is there, because it threw away the half that held it. Sort first, or keep the data sorted as you insert.</div>
            <div class="ai">Nearest-neighbor search compares a query embedding with stored vectors. A linear scan computes all \(n\) distances; vector indexes organize the data so most of it can be skipped, the same idea that makes binary search fast.</div>
          </div>`,
        render: fillPseudo,
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Lab: search race',
        kind: 'lab',
        html: String.raw`<p class="muted small">Both searches look for the same target in the same sorted array. Each <b>Step</b> makes one comparison in each lane. Faded cells have been ruled out. Type a target, click any cell to search for its value, or try a value that is not there. Drag the size slider and watch the worst-case counts.</p>`,
        render(body, ctx) {
          const { h, R, M } = ctx;
          const valuesFor = (n) => M.range(0, n - 1).map((i) => 3 * i + 1 + ((7 * i) % 3));
          let n = 20, a = valuesFor(n), target = a[15], lin = [], bin = [], k = 0;
          const nIn = h('input', { type: 'range', min: 5, max: 40, value: n, 'aria-label': 'Array size n', style: { width: '8rem' } });
          const nLbl = h('span.mono.small');
          const tIn = h('input.inp.mono', { value: String(target), inputmode: 'numeric', 'aria-label': 'Target value', style: { width: '4.2rem' } });
          const playBtn = h('button.btn.sm', { onclick: () => player.toggle() }, '▶ Play');
          const player = ctx.ticker({ ms: 650, button: playBtn, tick: () => step() });
          nIn.addEventListener('input', () => { n = +nIn.value; recompute(); });
          tIn.addEventListener('input', () => { const v = parseInt(tIn.value, 10); if (Number.isFinite(v)) { target = v; recompute(); } });
          const lanes = h('div.stack', { style: { gap: '0.7rem' } });
          const worst = h('div.card.small', { style: { padding: '0.55rem 0.8rem' } });
          body.append(
            h('div.row', { style: { gap: '0.55rem' } },
              h('label.row.small', { style: { gap: '0.4rem' } }, h('span.muted', 'size'), nIn, nLbl),
              h('label.row.small', { style: { gap: '0.4rem' } }, h('span.muted', 'target'), tIn),
              h('button.btn.sm', { onclick: () => { target = R.pick(a); tIn.value = target; recompute(); } }, 'Random present'),
              h('button.btn.sm', { onclick: () => { target = R.pick(a) + 1; if (a.includes(target)) target++; tIn.value = target; recompute(); } }, 'Random absent'),
              h('span', { style: { width: '0.5rem' } }),
              h('button.btn.sm.primary', { onclick: () => { stop(); step(); } }, 'Step ▶'), playBtn,
              h('button.btn.sm', { onclick: () => { stop(); k = 0; draw(); } }, 'Reset')),
            lanes, worst);
          function recompute() { stop(); a = valuesFor(n); lin = linTrace(a, target); bin = binTrace(a, target); k = 0; draw(); }
          function step() { if (k < Math.max(lin.length, bin.length)) { k++; draw(); return true; } return false; }
          function stop() { player.stop(); }
          function lane(title, trace, isBin) {
            const kk = Math.min(k, trace.length), done = kk === trace.length, last = trace[kk - 1];
            const found = done && last && (isBin ? last.res === 'eq' : last.eq);
            const cls = (idx) => {
              if (!kk) return '';
              if (!isBin) {
                if (idx === kk - 1) return last.eq ? 'found' : 'cur';
                return idx < kk - 1 || (done && !found) ? 'out' : '';
              }
              if (idx === last.mid) return last.res === 'eq' ? 'found' : 'cur';
              if (last.res === 'eq') return 'out';
              return idx < last.nlo || idx > last.nhi ? 'out' : '';
            };
            const cells = h('div.m5-cells', a.map((v, idx) => h('button', { class: ['m5-cell', cls(idx), v === target ? 'tgt' : ''].join(' '), 'aria-label': `index ${idx}, value ${v}; search for this value`, onclick: () => { target = v; tIn.value = v; recompute(); } }, String(v), h('small', String(idx)))));
            let status;
            if (!kk) status = isBin ? `Ready. The whole array, indices 0 to ${n - 1}, is still in play.` : 'Ready. It will check a[0], a[1], a[2], … in order.';
            else if (!isBin) status = `Comparison ${kk}: a[${last.i}] = ${a[last.i]} ${last.eq ? '=' : '≠'} ${target}. ${last.eq ? '<b>Found it.</b>' : done ? '<b>End of the list: not found.</b>' : 'Move one cell right.'}`;
            else {
              status = `Comparison ${kk}: lo = ${last.lo}, hi = ${last.hi}, mid = ⌊(${last.lo} + ${last.hi})/2⌋ = ${last.mid}, and a[${last.mid}] = ${last.v}. `;
              if (last.res === 'eq') status += '<b>Found it.</b>';
              else if (last.res === 'lt') status += `${last.v} &lt; ${target}, so the target can only be to the right: rule out indices ${last.lo}–${last.mid}.`;
              else status += `${last.v} &gt; ${target}, so the target can only be to the left: rule out indices ${last.mid}–${last.hi}.`;
              if (done && last.res !== 'eq') status += ' <b>Nothing is left, so the target is not in the array.</b>';
            }
            return h('div.m5-lane',
              h('div.m5-lane-head', h('b', title), h('span.small.muted', isBin ? 'needs sorted data, halves the range each time' : 'works on any data, one cell at a time'),
                h('span.m5-count', h('strong', String(kk)), `comparison${kk === 1 ? '' : 's'}${done ? (found ? ' · found' : ' · not found') : ''}`)),
              cells, h('div.m5-status', { html: status }));
          }
          function draw() {
            nIn.value = n;
            nLbl.textContent = `n = ${n}`;
            ctx.rc(lanes, lane('Linear search', lin, false), lane('Binary search', bin, true));
            const rows = [[n, 'this array'], [1000, 'a thousand'], [1e6, 'a million'], [1e9, 'a billion']];
            ctx.rc(worst,
              h('div.row', { style: { gap: '1.2rem', alignItems: 'flex-start', flexWrap: 'nowrap' } },
                h('div', { style: { flex: '1 1 0' } }, h('b', 'Worst case for n items. '),
                  h('span', { html: `Linear search may check every item: <b>${n}</b> comparisons here. Binary search halves the range each time, so it needs at most \\(\\lfloor \\log_2 n \\rfloor + 1 = \\lfloor \\log_2 ${n} \\rfloor + 1 = ${log2floor1(n)}\\). Doubling \\(n\\) adds just one comparison.` })),
                h('table.tt', { style: { flex: 'none' } }, h('thead', h('tr', h('th', 'n'), h('th', 'linear'), h('th', 'binary'))),
                  h('tbody', rows.map(([m, lbl]) => h('tr', h('td.l', `${big(m)} (${lbl})`), h('td', big(m)), h('td', String(log2floor1(m)))))))));
            ctx.tex(worst);
          }
          recompute();
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Code: binary search with a step counter',
        kind: 'code',
        file: 'binary_search.py',
        html: String.raw`<p class="muted small">The pseudocode from the searching slide, in Python, with a counter for the number of middle elements examined. Switch to <b>Trace</b> and watch <code>lo</code>, <code>hi</code> and <code>mid</code> close in on the target.</p>`,
        fivew: {
          what: 'Searches a sorted list by repeatedly probing the middle element and discarding the half that cannot hold the target. It returns the index (or None) together with the number of probes.',
          why: 'Counting probes makes the \\(\\lfloor \\log_2 n \\rfloor + 1\\) bound visible: 11 items never need more than 4 probes, and a million items never need more than 20.',
          who: 'Anyone who looks things up in sorted data: databases searching an index, version-control tools bisecting history to find the commit that introduced a bug, autocomplete in a sorted word list.',
          where: 'Inside <code>bisect</code> in Python\'s standard library, B-tree database indexes, <code>git bisect</code>, and finding a threshold that makes a model\'s accuracy cross a target.',
          when: 'Whenever the data is sorted and you will search it more than once. For a single search of unsorted data, a linear scan is cheaper than sorting first.',
        },
        lines: [
          ['def binary_search(a, target):', 'Defines a function that takes a <b>sorted</b> list <code>a</code> and the value to find. Nothing runs until the function is called on line 15.'],
          ['    lo, hi, steps = 0, len(a) - 1, 0', 'Tuple assignment sets three variables at once. <code>lo</code> and <code>hi</code> are the first and last indices still in play (0 and 10 for 11 items), and <code>steps</code> counts probes. Python indexes from 0, so the last index is <code>len(a) - 1</code>.'],
          ['    while lo <= hi:', 'Keep going while the range \\(lo..hi\\) still contains at least one index. When <code>lo</code> passes <code>hi</code>, the range is empty and the target cannot be in the list. This condition guarantees the loop stops (finiteness).'],
          ['        mid = (lo + hi) // 2', '<code>//</code> is floor division, so this is \\(\\lfloor (lo + hi)/2 \\rfloor\\), the middle index of the current range. On the first pass it is \\(\\lfloor 10/2 \\rfloor = 5\\).'],
          ['        steps += 1', 'One more probe. We count one step per middle element examined, even though the step may ask two questions (equal? smaller?).'],
          ['        if a[mid] == target:', 'The lucky case: the middle element is the target.'],
          ['            return mid, steps', 'Returns a tuple: where the target is and how many probes it took. <code>return</code> ends the function immediately, which also ends the loop.'],
          ['        elif a[mid] < target:', 'The middle element is too small. Because the list is sorted, everything at or left of <code>mid</code> is too small as well.'],
          ['            lo = mid + 1', 'So the search continues to the right of <code>mid</code>. The left half, including <code>mid</code>, is discarded.'],
          ['        else:', 'Otherwise the middle element is too large.'],
          ['            hi = mid - 1', 'Discard <code>mid</code> and everything to its right; keep searching on the left. Either way the range at least halves, which is where the \\(\\log_2 n\\) comes from.'],
          ['    return None, steps', 'Reached only when the range became empty. <code>None</code> is Python\'s "no value", a clearer signal than a fake index such as -1.'],
          ['', ''],
          ['data = [3, 8, 15, 21, 29, 34, 42, 57, 63, 70, 88]', 'Eleven sorted values. The worst case is \\(\\lfloor \\log_2 11 \\rfloor + 1 = 3 + 1 = 4\\) probes.'],
          ['print(binary_search(data, 57))', 'Probes index 5 (34, too small), then 8 (63, too big), then 6 (42, too small), then 7 (57, found). Output: <code>(7, 4)</code>: index 7 after 4 probes, the worst case.'],
          ['print(binary_search(data, 40))', 'A value that is not there. Probes 34, 63 and 42, after which <code>lo = 6</code> and <code>hi = 5</code>, so the loop stops. Output: <code>(None, 3)</code>. Plain linear search would have checked all 11 items before giving up.'],
        ],
        expected: '(7, 4)\n(None, 3)\n',
        tryIt: 'Search for 3 and for 88, the two ends. Then double the list with <code>data = data + [x + 100 for x in data]</code> and check that the worst case grows by only one probe.',
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Sorting, and an algorithm that uses randomness',
        kind: 'concept',
        html: String.raw`
          <div class="cols-3">
            <div class="card stack" style="gap:0.4rem">
              <h3><span class="term">Insertion sort</span></h3>
              ${pseudoTag('insertion')}
              <p class="small">Like sorting a hand of cards: take the next card and slide it left past every larger card. Invariant: \(s[1..i-1]\) is sorted. Very fast on nearly sorted data.</p>
            </div>
            <div class="card stack" style="gap:0.4rem">
              <h3><span class="term">Selection sort</span></h3>
              ${pseudoTag('selection')}
              <p class="small">Find the smallest remaining item and swap it into position \(i\). Invariant: \(s[1..i-1]\) holds the \(i - 1\) smallest items in final order. Always \(n(n-1)/2\) comparisons but at most \(n - 1\) swaps.</p>
            </div>
            <div class="card stack" style="gap:0.4rem">
              <h3>Shuffle (randomized)</h3>
              ${pseudoTag('shuffle')}
              <p class="small">A <span class="term">randomized algorithm</span> makes random choices as it runs. This Fisher–Yates shuffle produces each of the \(n!\) orderings with equal probability. It gives up determinism and keeps correctness.</p>
            </div>
          </div>
          <div class="split">
            <div class="warn">Picking <code>j = rand(1, n)</code> at every step looks equally random but is biased. It has \(n^n\) equally likely runs, and for \(n \ge 3\) the number \(n^n\) is not a multiple of \(n!\), so some orderings must come up more often than others.</div>
            <div class="ai">Training shuffles the examples before every pass (epoch) so a model cannot learn their order. Random weight initialization, dropout and mini-batch sampling are randomized steps too, which is why fixing the random seed makes experiments reproducible.</div>
          </div>`,
        render: fillPseudo,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: sorting step by step',
        kind: 'lab',
        html: String.raw`<p class="muted small">Step through either algorithm (or press <kbd>↓</kbd> / <kbd>↑</kbd>). The shaded band is the part covered by the loop invariant. Compare counts across inputs: insertion sort reacts strongly to the input order, selection sort does not react at all.</p>`,
        render(body, ctx) {
          const { h, s, R, M } = ctx;
          let algo = 'ins', kind = 'random', n = 10, base = [], ev = [], k = 0;
          const segA = h('div.seg'), segK = h('div.seg'), segN = h('div.seg');
          [['ins', 'Insertion sort'], ['sel', 'Selection sort']].forEach(([v, l]) => segA.append(h('button', { dataset: { v }, onclick: () => { algo = v; rebuild(false); } }, l)));
          [['random', 'Random'], ['sorted', 'Sorted'], ['reversed', 'Reversed'], ['nearly', 'Nearly sorted']].forEach(([v, l]) => segK.append(h('button', { dataset: { v }, onclick: () => { kind = v; rebuild(true); } }, l)));
          [6, 8, 10, 12].forEach((v) => segN.append(h('button', { dataset: { v: String(v) }, onclick: () => { n = v; rebuild(true); } }, String(v))));
          const playBtn = h('button.btn.sm', { onclick: () => play() }, '▶ Play');
          const player = ctx.ticker({ ms: 600, button: playBtn, tick: () => move(1) });
          const chart = h('div.figure', { style: { minHeight: 0 } });
          const panel = h('div.stack', { style: { gap: '0.5rem', minHeight: 0 } });
          body.append(
            h('div.m5-ctl', segA, segK, h('label', 'n', segN)),
            h('div.row', { style: { gap: '0.4rem' } },
              h('button.btn.sm', { onclick: () => { stop(); move(-1); } }, '◀ Back'),
              h('button.btn.sm.primary', { onclick: () => { stop(); move(1); } }, 'Step ▶'), playBtn,
              h('button.btn.sm', { onclick: () => { stop(); k = 0; draw(); } }, 'Reset'),
              h('button.btn.sm', { onclick: () => { kind = 'random'; rebuild(true); } }, 'New random input')),
            h('div.split-wide.fill', { style: { minHeight: 0, alignItems: 'stretch' } }, chart, panel));
          function makeInput() {
            const vals = R.sample(M.range(2, 20), n);
            const up = vals.slice().sort((x, y) => x - y);
            if (kind === 'sorted') return up;
            if (kind === 'reversed') return up.reverse();
            if (kind === 'nearly') { const v = up.slice(); [v[1], v[2]] = [v[2], v[1]]; [v[n - 3], v[n - 2]] = [v[n - 2], v[n - 3]]; return v; }
            return vals;
          }
          function rebuild(newInput) { stop(); if (newInput || !base.length) base = makeInput(); ev = algo === 'ins' ? insEvents(base) : selEvents(base); k = 0; draw(); }
          function move(d) { const k2 = Math.max(0, Math.min(ev.length - 1, k + d)); if (k2 === k) return false; k = k2; draw(); return true; }
          function play() { if (player.playing) { stop(); return; } if (k >= ev.length - 1) { k = 0; draw(); } player.start(); }
          function stop() { player.stop(); }
          ctx.keys = (e) => { if (e.key === 'ArrowDown') { stop(); move(1); return true; } if (e.key === 'ArrowUp') { stop(); move(-1); return true; } return false; };
          function draw() {
            [...segA.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === algo)));
            [...segK.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === kind)));
            [...segN.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === n)));
            const e = ev[k], ins = algo === 'ins';
            const W = 560, H = 340, pl = 10, pr = 10, pt = 34, pb = 26;
            const bw = (W - pl - pr) / n, maxV = 20;
            const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Bar chart of the list being sorted' });
            const band = ins ? e.work || e.sorted : e.final;
            if (band > 0) {
              svg.append(s('rect', { x: pl, y: 4, width: band * bw, height: H - pb - 4, rx: 6, fill: ins ? 'var(--accent-2)' : 'var(--true-bg)', stroke: 'none' }));
              svg.append(s('text', { x: pl + 6, y: 20, fill: ins ? 'var(--accent)' : 'var(--true)', 'font-size': 12, 'font-weight': 700, text: ins ? (band === n && !e.work ? 'sorted' : e.work ? 'sorted part + key sliding in' : 'sorted part') : band === n ? 'all in final place' : 'final: the smallest items' }));
            }
            e.a.forEach((v, i) => {
              const x = pl + i * bw + bw * 0.12, w = bw * 0.76, bh = ((H - pt - pb) * v) / maxV, y = H - pb - bh;
              let fill = 'var(--ink-3)';
              if (ins && i < band) fill = 'var(--accent)';
              if (!ins && i < e.final) fill = 'var(--true)';
              if (ins && e.key === i && !e.done) fill = 'var(--kw)';
              if (!ins && e.small === i && !e.done) fill = 'var(--kw)';
              const hot = (e.cmp && e.cmp.includes(i)) || (e.swap && e.swap.includes(i) && e.swap[0] !== e.swap[1]);
              svg.append(s('rect', { x, y, width: w, height: bh, rx: 3, fill, stroke: hot ? 'var(--false)' : 'none', 'stroke-width': hot ? 3 : 0 }));
              svg.append(s('text', { x: x + w / 2, y: y - 5, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 13, 'font-weight': 600, text: String(v) }));
              svg.append(s('text', { x: x + w / 2, y: H - pb + 16, 'text-anchor': 'middle', fill: 'var(--ink-3)', 'font-size': 11, text: String(i) }));
            });
            ctx.rc(chart, svg);
            const N = n, worst = (N * (N - 1)) / 2;
            const legend = h('div.legend',
              h('span', h('span.swatch', { style: { background: ins ? 'var(--accent)' : 'var(--true)' } }), ins ? 'sorted part' : 'final place'),
              h('span', h('span.swatch', { style: { background: 'var(--kw)' } }), ins ? 'key being inserted' : 'smallest so far'),
              h('span', h('span.swatch', { style: { background: 'var(--sheet)', boxShadow: 'inset 0 0 0 2px var(--false)' } }), 'just compared'));
            const inv = ins
              ? 'Before each pass i, the items a[0..i−1] are sorted among themselves. Later items may still slide in between them.'
              : 'Before pass i, a[0..i−1] holds the i smallest items, each in its final place. Those items never move again.';
            const formula = ins
              ? `For n = ${N}, insertion sort needs between <b>n − 1 = ${N - 1}</b> comparisons (already sorted) and <b>n(n−1)/2 = ${worst}</b> (reversed).`
              : `For n = ${N}, selection sort always makes <b>n(n−1)/2 = ${worst}</b> comparisons, whatever the input, and at most <b>n − 1 = ${N - 1}</b> swaps.`;
            ctx.rc(panel,
              h('div.m5-stat', h('div', h('b', String(e.comps)), h('span', 'comparisons')), h('div', h('b', String(e.moves)), h('span', ins ? 'shifts' : 'swaps'))),
              h('div.tiny.mono.muted', `STEP ${k + 1} OF ${ev.length}`),
              h('p', { style: { fontWeight: 600, minHeight: '3em' } }, e.msg),
              legend,
              h('div.box.small', h('span.lbl.muted', 'Loop invariant'), inv),
              h('p.small', { html: formula + (e.done ? ` This input took <b>${e.comps}</b>.` : '') }));
          }
          rebuild(true);
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Counting operations: best, worst and average case',
        kind: 'concept',
        html: String.raw`
          <div class="split-wide">
            <div class="stack">
              <p>Seconds depend on the machine, the language and what else is running. Analysis therefore counts a <span class="term">basic operation</span>, usually a comparison, as a function of the <span class="term">input size</span> \(n\).</p>
              <div class="def">The <span class="term">worst case</span> \(W(n)\) is the most operations over all inputs of size \(n\); the <span class="term">best case</span> \(B(n)\) is the fewest. The <span class="term">average case</span> \(A(n)\) is the expected count when inputs follow a stated probability distribution.</div>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">Algorithm (comparisons)</th><th>best</th><th>worst</th><th>average</th></tr></thead>
                <tbody>
                  <tr><td class="l">linear search</td><td>\(1\)</td><td>\(n\)</td><td>\(\frac{n+1}{2}\) if present</td></tr>
                  <tr><td class="l">binary search</td><td>\(1\)</td><td>\(\lfloor \log_2 n \rfloor + 1\)</td><td>\(\approx \log_2 n\)</td></tr>
                  <tr><td class="l">insertion sort</td><td>\(n - 1\)</td><td>\(\frac{n(n-1)}{2}\)</td><td>\(\approx \frac{n^2}{4}\)</td></tr>
                  <tr><td class="l">selection sort</td><td>\(\frac{n(n-1)}{2}\)</td><td>\(\frac{n(n-1)}{2}\)</td><td>\(\frac{n(n-1)}{2}\)</td></tr>
                </tbody>
              </table>
              <p class="small">Linear search average: if the target is equally likely to be in any of the \(n\) positions, the expected number of comparisons is \(\frac{1 + 2 + \cdots + n}{n} = \frac{n+1}{2}\).</p>
            </div>
            <div class="stack">
              <div class="ex">How often does the inner line run?
                ${pseudoTag('nested', 'margin:0.35rem 0')}
                For each \(i\) the inner loop runs \(i\) times, so the total is \(1 + 2 + \cdots + n = \frac{n(n+1)}{2}\), the arithmetic sum from Module 4.</div>
              <div class="why">The worst case is a promise: no input of size \(n\) takes longer. Deadlines need that promise. The average describes typical behavior, and the best case is rarely useful, since almost any algorithm is fast on a lucky input.</div>
              <div class="ai">A chat service might promise answers within 200 ms for 99% of requests (its "p99 latency"). That is a worst-case style guarantee; a fast average can hide many slow requests.</div>
            </div>
          </div>`,
        render: fillPseudo,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Code: counting comparisons in insertion sort',
        kind: 'code',
        file: 'insertion_sort.py',
        html: String.raw`<p class="muted small">Insertion sort, instrumented to count every comparison between list items. Running it on a sorted, a reversed and a mixed list shows the best, worst and an in-between case for \(n = 4\).</p>`,
        fivew: {
          what: 'Sorts a copy of a list with insertion sort and returns the sorted list together with the number of item comparisons it made.',
          why: 'Instrumenting code (adding counters) turns the analysis table into evidence you can check. You will see exactly \\(n - 1 = 3\\) comparisons for sorted input and \\(n(n-1)/2 = 6\\) for reversed input.',
          who: 'Engineers profiling algorithms, students checking an analysis, and library authors: Python\'s built-in sort (Timsort) uses insertion sort for short runs because it is so fast on small or nearly sorted data.',
          where: 'Hybrid sorting algorithms, sorting a nearly sorted feed (new items arriving in roughly the right order), and any place where counting operations beats timing on a busy machine.',
          when: 'Use insertion sort itself only for small or nearly sorted inputs. For general data use <code>sorted()</code>, which is \\(O(n \\log n)\\).',
        },
        lines: [
          ['def insertion_sort(a):', 'Defines the function. It will return two things: the sorted list and the number of comparisons.'],
          ['    a, comps = list(a), 0', '<code>list(a)</code> makes a copy, so the caller\'s list is not changed (no side effect). <code>comps</code> starts at 0 and counts comparisons between list items.'],
          ['    for i in range(1, len(a)):', 'Pass <code>i</code> inserts item <code>a[i]</code> into the sorted part <code>a[0..i-1]</code>. It starts at 1 because a single item, <code>a[0]</code>, is already sorted. There are \\(n - 1\\) passes.'],
          ['        key, j = a[i], i - 1', '<code>key</code> remembers the item being inserted, because the shifting below will overwrite <code>a[i]</code>. <code>j</code> points at the last item of the sorted part.'],
          ['        while j >= 0:', 'Walk left through the sorted part. <code>j &gt;= 0</code> stops the walk at the front of the list so we never read <code>a[-1]</code>, which in Python would silently mean the <i>last</i> item.'],
          ['            comps += 1', 'Count the comparison the next line is about to make. Putting the counter here, before the test, counts the comparison that stops the loop too.'],
          ['            if a[j] <= key:', 'Is the item on the left small enough? If so, the key belongs right after it. Using <code>&lt;=</code> instead of <code>&lt;</code> keeps equal items in their original order, which makes the sort <b>stable</b>.'],
          ['                break', 'Stop walking left. In the best case (already sorted) this happens on the very first comparison of every pass, giving \\(n - 1\\) comparisons in total.'],
          ['            a[j + 1] = a[j]', 'The item is larger than the key, so shift it one place right. That opens a gap at position <code>j</code>.'],
          ['            j -= 1', 'Move one position further left and compare again. In the worst case (reversed input) the walk goes all the way to the front on every pass.'],
          ['        a[j + 1] = key', 'Drop the key into the gap. Now <code>a[0..i]</code> is sorted, which is the loop invariant for the next pass.'],
          ['    return a, comps', 'Returns a tuple. The caller receives both the result and the measurement.'],
          ['', ''],
          ['for data in ([1, 2, 3, 4], [4, 3, 2, 1], [3, 1, 4, 2]):', 'Loops over three test inputs of size \\(n = 4\\): sorted (best case), reversed (worst case) and mixed.'],
          ['    print(data, "->", insertion_sort(data))', 'Output: <code>[1, 2, 3, 4] -&gt; ([1, 2, 3, 4], 3)</code>, then <code>[4, 3, 2, 1] -&gt; ([1, 2, 3, 4], 6)</code>, then <code>[3, 1, 4, 2] -&gt; ([1, 2, 3, 4], 5)</code>. The counts match \\(n - 1 = 3\\) and \\(n(n-1)/2 = 6\\), and the mixed list falls in between.'],
        ],
        expected: '[1, 2, 3, 4] -> ([1, 2, 3, 4], 3)\n[4, 3, 2, 1] -> ([1, 2, 3, 4], 6)\n[3, 1, 4, 2] -> ([1, 2, 3, 4], 5)\n',
        tryIt: 'Replace the inputs with <code>list(range(100))</code> and <code>list(range(100, 0, -1))</code>. Predict the two counts (99 and 4950) before you run. Doubling to 200 items should roughly quadruple the worst case.',
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Big-O, Big-Omega and Big-Theta',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def"><span class="term">Big-O</span>: \(f(n) = O(g(n))\) if there are constants \(C \gt 0\) and \(n_0\) with \(|f(n)| \le C\,|g(n)|\) for all \(n \ge n_0\). Read it as "\(f\) grows no faster than \(g\)".</div>
              <div class="def"><span class="term">Big-Omega</span>: \(f(n) = \Omega(g(n))\) if \(|f(n)| \ge C\,|g(n)|\) for all \(n \ge n_0\), for some \(C \gt 0\): "\(f\) grows at least as fast as \(g\)".</div>
              <div class="def"><span class="term">Big-Theta</span>: \(f(n) = \Theta(g(n))\) if \(f\) is both \(O(g(n))\) and \(\Omega(g(n))\): "the same growth rate, up to constant factors".</div>
              <div class="ex">\(f(n) = 3n^2 + 5n + 2\). For \(n \ge 1\), \(5n \le 5n^2\) and \(2 \le 2n^2\), so \(f(n) \le 10n^2\): the witnesses \(C = 10\), \(n_0 = 1\) prove \(f = O(n^2)\). Also \(f(n) \ge 3n^2\), so \(f = \Omega(n^2)\), and therefore \(f = \Theta(n^2)\).</div>
            </div>
            <div class="stack">
              <div class="thm">Rules that cover most code:
                <ol class="small" style="margin-top:0.2rem">
                  <li>Constant factors vanish: \(7n = \Theta(n)\).</li>
                  <li>Keep the dominant term: \(n^3 + 100n^2 + 5 = \Theta(n^3)\).</li>
                  <li>Blocks in sequence add, and the larger wins: \(O(f) + O(g) = O(\max(f, g))\).</li>
                  <li>Nesting multiplies: \(n\) iterations of an \(O(g)\) body cost \(O(n \cdot g)\).</li>
                  <li>Log bases differ by a constant factor, so \(\log_2 n = \Theta(\log_{10} n)\).</li>
                </ol></div>
              <p class="big-math" style="font-size:1.1rem">\(1 \prec \log n \prec n \prec n \log n \prec n^2 \prec n^3 \prec 2^n \prec n!\)</p>
              <div class="warn">Big-O is only an upper bound. \(5n = O(n^2)\) is true but says little, like "the trip takes under a year". When you know the exact rate, say \(\Theta\).</div>
              <div class="ai">Attention in a transformer compares every token with every other token: \(\Theta(n^2)\) work for a context of \(n\) tokens. Doubling the context from 4k to 8k tokens roughly quadruples that cost.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Lab: find a Big-O witness',
        kind: 'lab',
        html: String.raw`<p class="muted small">To prove \(f(n) = O(g(n))\) you must produce witnesses \(C\) and \(n_0\) with \(f(n) \le C\,g(n)\) for <i>every</i> \(n \ge n_0\). Choose \(f\) and \(g\), then adjust \(C\) and \(n_0\). Red dots mark values of \(n \ge n_0\) where the inequality fails. The panel also checks far beyond the chart.</p>`,
        render(body, ctx) {
          const { h, s, M } = ctx;
          let fk = '3n² + 5n + 2', gk = 'n²', cs = 49, n0 = 1, N = 30, scale = 'linear';
          const cOf = (v) => Number((0.1 * 2000 ** (v / 100)).toPrecision(2));
          const fSel = h('select.inp', { 'aria-label': 'f(n)', onchange: (e) => { fk = e.target.value; autoScale(); draw(); } }, Object.keys(FS).map((k) => h('option', { value: k, selected: k === fk }, k)));
          const gSel = h('select.inp', { 'aria-label': 'g(n)', onchange: (e) => { gk = e.target.value; autoScale(); draw(); } }, Object.keys(GS).map((k) => h('option', { value: k, selected: k === gk }, k)));
          const cIn = h('input', { type: 'range', min: 0, max: 100, value: cs, 'aria-label': 'Constant C', style: { width: '8rem' } });
          const n0In = h('input', { type: 'range', min: 1, max: 60, value: n0, 'aria-label': 'Threshold n0', style: { width: '8rem' } });
          const cLbl = h('span.mono.small'), n0Lbl = h('span.mono.small');
          cIn.addEventListener('input', () => { cs = +cIn.value; draw(); });
          n0In.addEventListener('input', () => { n0 = +n0In.value; draw(); });
          const segN = h('div.seg'), segS = h('div.seg');
          [20, 30, 60, 100].forEach((v) => segN.append(h('button', { dataset: { v: String(v) }, onclick: () => { N = v; draw(); } }, String(v))));
          [['linear', 'linear'], ['log', 'log']].forEach(([v, l]) => segS.append(h('button', { dataset: { v }, onclick: () => { scale = v; draw(); } }, l)));
          const chart = h('div.figure.fill', { style: { minHeight: 0 } });
          const legend = h('div.legend');
          const panel = h('div.stack', { style: { gap: '0.5rem', minHeight: 0 } });
          body.append(
            h('div.m5-ctl', h('label', 'f(n) =', fSel), h('label', 'g(n) =', gSel), h('label', 'C', cIn, cLbl), h('label', 'n₀', n0In, n0Lbl)),
            h('div.split-wide.fill', { style: { minHeight: 0, alignItems: 'stretch' } }, h('div.stack', { style: { minHeight: 0, gap: '0.3rem' } }, legend, chart,
              h('div.m5-ctl', h('label', 'chart up to n =', segN), h('label', 'y-axis', segS))), panel));
          function autoScale() { scale = fk === '2ⁿ' || gk === '2ⁿ' ? 'log' : 'linear'; }
          const holds = (F, G, C, n) => lnOf(F, n) <= Math.log(C) + lnOf(G, n) + 1e-9;
          function firstFail(F, G, C, from, to) { for (let n = from; n <= to; n++) if (!holds(F, G, C, n)) return n; return null; }
          // smallest C (from the current one up) whose last failure below 5000 leaves room for n0 <= 60
          function findWitness() {
            const F = FS[fk], G = GS[gk];
            if (cmpKey(F.key, G.key) > 0) return null;
            for (let v = cs; v <= 100; v++) {
              const C = cOf(v);
              let last = 0;
              for (let m = 5000; m >= 1; m--) if (!holds(F, G, C, m)) { last = m; break; }
              if (last + 1 <= 60) return { v, m: last + 1 };
            }
            return null;
          }
          function draw() {
            const F = FS[fk], G = GS[gk], C = cOf(cs);
            cIn.value = cs; n0In.value = n0;
            cLbl.textContent = `= ${C}`;
            n0Lbl.textContent = `= ${n0}`;
            [...segN.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === N)));
            [...segS.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === scale)));
            // chart
            const W = 560, H = 330, pl = 58, pr = 12, pt = 14, pb = 28;
            const ns = M.range(1, N);
            const fv = ns.map((n) => F.f(n)), gv = ns.map((n) => C * G.f(n));
            const lg = scale === 'log';
            const floor = 0.1;
            const tv = (v) => (lg ? Math.log10(Math.max(v, floor)) : v);
            const ymax = Math.max(...fv.map(tv), ...gv.map(tv)), ymin = lg ? Math.log10(floor) : 0;
            const X = (n) => pl + ((n - 1) / Math.max(1, N - 1)) * (W - pl - pr);
            const Y = (v) => pt + (H - pt - pb) * (1 - (tv(v) - ymin) / (ymax - ymin || 1));
            const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Chart of f(n) and C times g(n)' });
            if (n0 > 1) {
              const xe = X(Math.min(n0, N + 0.5));
              svg.append(s('rect', { x: pl, y: pt, width: Math.max(0, xe - pl), height: H - pt - pb, fill: 'var(--ink-3)', 'fill-opacity': 0.1, stroke: 'none' }));
              svg.append(s('text', { x: pl + 6, y: pt + 30, fill: 'var(--ink-3)', 'font-size': 11, text: n0 <= N ? 'before n₀: ignored' : 'all before n₀' }));
            }
            const ticks = lg ? M.range(Math.ceil(ymin), Math.floor(ymax)).map((e) => 10 ** e).filter((t, i, arr) => arr.length <= 7 || i % Math.ceil(arr.length / 6) === 0) : [0, ymax / 2, ymax];
            ticks.forEach((t) => {
              svg.append(s('line', { x1: pl, x2: W - pr, y1: Y(t), y2: Y(t), stroke: 'var(--rule)', 'stroke-width': 1, 'stroke-dasharray': '3 4', fill: 'none' }));
              svg.append(s('text', { x: pl - 6, y: Y(t) + 4, 'text-anchor': 'end', fill: 'var(--ink-3)', 'font-size': 11, text: t >= 1e6 || (t > 0 && t < 0.01) ? sci(t) : sig(t) }));
            });
            svg.append(s('line', { x1: pl, x2: W - pr, y1: H - pb, y2: H - pb, stroke: 'var(--ink-3)', 'stroke-width': 1, fill: 'none' }));
            const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${X(ns[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
            svg.append(s('path', { d: path(gv), fill: 'none', stroke: 'var(--fnc)', 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }));
            svg.append(s('path', { d: path(fv), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.8 }));
            if (n0 <= N) svg.append(s('line', { x1: X(n0), x2: X(n0), y1: pt, y2: H - pb, stroke: 'var(--ink-2)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3', fill: 'none' }));
            if (n0 <= N) svg.append(s('text', { x: X(n0) + 4, y: pt + 12, fill: 'var(--ink-2)', 'font-size': 12, 'font-weight': 600, text: 'n₀' }));
            const fails = ns.filter((n) => n >= n0 && !holds(F, G, C, n));
            fails.forEach((n) => svg.append(s('circle', { cx: X(n), cy: Y(F.f(n)), r: 4, fill: 'var(--false)', stroke: 'var(--sheet)', 'stroke-width': 1 })));
            [[1, 'start'], [Math.ceil(N / 2), 'middle'], [N, 'end']].forEach(([n, anchor]) => svg.append(s('text', { x: X(n), y: H - pb + 16, 'text-anchor': anchor, fill: 'var(--ink-3)', 'font-size': 11, text: `n = ${n}` })));
            ctx.rc(chart, svg);
            ctx.rc(legend,
              h('span', h('span.swatch', { style: { background: 'var(--accent)', height: '0.25rem', verticalAlign: '0.2rem' } }), 'f(n)'),
              h('span', h('span.swatch', { style: { background: 'repeating-linear-gradient(90deg, var(--fnc) 0 5px, transparent 5px 8px)', height: '0.25rem', verticalAlign: '0.2rem' } }), `C·g(n) with C = ${C}`),
              h('span', h('span.swatch', { style: { background: 'var(--false)', borderRadius: '50%' } }), 'failure at some n ≥ n₀'));
            // verdicts
            const rel = cmpKey(F.key, G.key);
            const beyond = fails.length ? null : firstFail(F, G, C, Math.max(n0, N + 1), 5000);
            let win;
            if (fails.length) win = `<span class="bad"><b>✗ Fails</b></span> at ${fails.length > 5 ? fails.slice(0, 5).join(', ') + ', …' : fails.join(', ')}. First: \\(f(${fails[0]}) = ${sig(F.f(fails[0]))} \\gt C\\,g(${fails[0]}) = ${sig(C * G.f(fails[0]))}\\). ${fails[fails.length - 1] < N ? 'Move \\(n_0\\) past the last red dot, or raise \\(C\\).' : 'Raise \\(C\\) or change \\(n_0\\).'}`;
            else if (beyond) win = `<span class="ok"><b>✓ Holds on the chart</b></span>, but <span class="bad"><b>fails again at n = ${beyond}</b></span>, just beyond it. A picture of a few values is never a proof.`;
            else win = `<span class="ok"><b>✓ Holds</b></span> for every \\(n\\) from \\(n_0 = ${n0}\\) up to 5000 (checked numerically).`;
            let theory;
            if (rel < 0) theory = '\\(f\\) grows strictly slower than \\(g\\), so \\(f = O(g)\\) but not \\(\\Theta(g)\\): \\(f/g \\to 0\\), and every \\(C \\gt 0\\) works once \\(n\\) is large enough.';
            else if (rel === 0) theory = `\\(f = \\Theta(g)\\): \\(f(n)/g(n)\\) approaches ${F.lc}. Every \\(C\\) above ${F.lc} works from some \\(n_0\\) on; every \\(C\\) below ${F.lc} fails forever.`;
            else theory = '\\(f\\) grows strictly faster than \\(g\\), so \\(f\\) is <b>not</b> \\(O(g)\\): \\(f/g \\to \\infty\\). Raising \\(C\\) only moves the crossing point to the right; \\(f\\) always overtakes \\(C\\,g\\) again.';
            const proven = !fails.length && !beyond && rel <= 0;
            ctx.rc(panel,
              h('div', { html: `\\[f(n) = ${F.tex} \\overset{?}{\\le} C\\,g(n) = ${C} \\cdot ${G.tex}\\]` }),
              h('div.small', h('span.tiny.mono.muted', 'YOUR WITNESS  '), h('span', { html: win })),
              h('div.box.small', h('span.lbl.muted', 'What theory says'), h('div', { html: theory })),
              proven ? h('div.feedback.good', { html: `\\(C = ${C}\\), \\(n_0 = ${n0}\\) is a valid witness pair, so \\(${F.tex} = O(${G.tex})\\).` }) : null,
              h('div.row', { style: { gap: '0.4rem' } },
                h('button.btn.sm', { onclick: () => { const w = findWitness(); if (w) { cs = w.v; n0 = w.m; } else hintEl.innerHTML = 'No witness exists: no constant can make a faster-growing function stay below a slower one.'; draw(); } }, 'Find a witness for me')),
              hintEl);
            hintEl.textContent = hintEl.textContent.startsWith('No witness') && rel > 0 ? hintEl.textContent : '';
            ctx.tex(panel);
          }
          const hintEl = h('p.small.muted');
          draw();
        },
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Lab: growth rates and the one-second budget',
        kind: 'lab',
        html: String.raw`<p class="muted small">Each curve counts the operations an algorithm of that growth rate performs on an input of size \(n\), on a log scale (each grid line is 100,000 times the one below). The table assumes a fast computer doing \(10^9\) simple operations per second. Move \(n\) and change the time budget.</p>`,
        render(body, ctx) {
          const { h, s, M } = ctx;
          let n = 20, budget = 1;
          const BUDGETS = [[1e-3, '1 millisecond'], [1, '1 second'], [60, '1 minute'], [86400, '1 day'], [3.156e7, '1 year']];
          const nIn = h('input', { type: 'range', min: 1, max: 60, value: n, 'aria-label': 'Input size n', style: { width: '12rem' } });
          const nLbl = h('span.mono');
          nIn.addEventListener('input', () => { n = +nIn.value; draw(); });
          const segB = h('div.seg');
          BUDGETS.forEach(([v, l]) => segB.append(h('button', { dataset: { v: String(v) }, onclick: () => { budget = v; draw(); } }, l)));
          const chart = h('div.figure', { style: { minHeight: 0 } });
          const panel = h('div.stack', { style: { gap: '0.5rem', minHeight: 0 } });
          body.append(h('div.m5-ctl', h('label', 'input size', nIn, nLbl), h('label', 'time budget', segB)),
            h('div.split.fill', { style: { minHeight: 0, alignItems: 'stretch', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)' } }, chart, panel));
          function draw() {
            nLbl.textContent = `n = ${n}`;
            [...segB.children].forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === budget)));
            const B = budget * 1e9;
            const W = 480, H = 360, pl = 44, pr = 64, pt = 10, pb = 26, top = 30, NMAX = 60;
            const X = (m) => pl + ((m - 1) / (NMAX - 1)) * (W - pl - pr);
            const Y = (l) => pt + (H - pt - pb) * (1 - Math.min(l, top + 0.4) / top);
            const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Growth of common running times on a log scale' });
            const clipId = 'm5-growth-clip';
            svg.append(s('defs', null, s('clipPath', { id: clipId }, s('rect', { x: pl, y: pt, width: W - pl - pr, height: H - pt - pb }))));
            [0, 5, 10, 15, 20, 25, 30].forEach((e) => {
              svg.append(s('line', { x1: pl, x2: W - pr, y1: Y(e), y2: Y(e), stroke: 'var(--rule)', 'stroke-width': 1, fill: 'none' }));
              svg.append(s('text', { x: pl - 5, y: Y(e) + 4, 'text-anchor': 'end', fill: 'var(--ink-3)', 'font-size': 11, text: e === 0 ? '1' : `10${sup(e)}` }));
            });
            const lb = Math.log10(B);
            svg.append(s('line', { x1: pl, x2: W - pr, y1: Y(lb), y2: Y(lb), stroke: 'var(--false)', 'stroke-width': 1.6, 'stroke-dasharray': '6 4', fill: 'none' }));
            svg.append(s('text', { x: pl + 4, y: Y(lb) - 5, fill: 'var(--false)', 'font-size': 11, 'font-weight': 600, text: `budget: ${BUDGETS.find((b) => b[0] === budget)[1]} of work` }));
            const g = s('g', { 'clip-path': `url(#${clipId})` });
            GROWTH.forEach((G) => {
              const d = M.range(1, NMAX).map((m, i) => `${i ? 'L' : 'M'}${X(m).toFixed(1)},${Y(G.l10(m)).toFixed(1)}`).join(' ');
              g.append(s('path', { d, fill: 'none', stroke: G.col, 'stroke-width': 2.4 }));
            });
            svg.append(g);
            // labels: curves that leave the top are named where they exit; the rest at the right edge,
            // nudged apart so neighboring labels never overlap
            const labels = GROWTH.map((G) => {
              const exit = M.range(1, NMAX).find((m) => G.l10(m) > top);
              return exit === undefined ? { G, x: W - pr + 4, y: Y(G.l10(NMAX)) + 4, edge: true } : { G, x: X(exit) + 4, y: pt + 10, edge: false };
            });
            const edge = labels.filter((l) => l.edge).sort((p, q) => q.y - p.y);
            edge.forEach((l, i) => { if (i) l.y = Math.min(l.y, edge[i - 1].y - 13); });
            labels.forEach((l) => svg.append(s('text', { x: l.x, y: l.y, fill: l.G.col, 'font-size': 12, 'font-weight': 700, text: l.G.name })));
            svg.append(s('line', { x1: X(n), x2: X(n), y1: pt, y2: H - pb, stroke: 'var(--ink-2)', 'stroke-width': 1.4, fill: 'none' }));
            GROWTH.forEach((G) => { const l = G.l10(n); if (l <= top) svg.append(s('circle', { cx: X(n), cy: Y(l), r: 4, fill: G.col, stroke: 'var(--sheet)', 'stroke-width': 1.2 })); });
            [1, 20, 40, 60].forEach((m) => svg.append(s('text', { x: X(m), y: H - pb + 16, 'text-anchor': 'middle', fill: 'var(--ink-3)', 'font-size': 11, text: `n = ${m}` })));
            ctx.rc(chart, svg);
            const rows = GROWTH.map((G) => {
              const ops = 10 ** G.l10(n), sec = ops / 1e9, over = ops > B;
              const fit = G.fit(B);
              const fitTxt = G.name === '1' ? 'any n' : G.fitText ? G.fitText(B) : big(fit);
              return h('tr', h('td', h('span.swatch', { style: { background: G.col } }), h('b', G.name)), h('td.mono', G.name === '1' ? '1' : big(ops)), h('td', { class: over ? 'over' : '' }, fmtTime(sec)), h('td.mono', fitTxt));
            });
            const bl = BUDGETS.find((b) => b[0] === budget)[1];
            ctx.rc(panel,
              h('table.data.m5-growth', h('thead', h('tr', h('th', 'growth'), h('th', `ops at n = ${n}`), h('th', 'time'), h('th', `largest n in ${bl}`))), h('tbody', rows)),
              h('p.small', { html: `Red times exceed the budget. With ${bl} of work, a \\(\\Theta(n^2)\\) algorithm handles about <b>${big(GROWTH[4].fit(B))}</b> items, an \\(\\Theta(n \\log n)\\) one about <b>${big(GROWTH[3].fit(B))}</b>, and an exponential one only <b>${GROWTH[5].fit(B)}</b>.` }),
              h('div.why', { html: 'Doubling \\(n\\) adds one step to \\(\\log n\\), doubles \\(n\\), quadruples \\(n^2\\), and <i>squares</i> \\(2^n\\). A faster computer moves the budget line up a little; a better algorithm changes the curve. That is why analysis beats hardware at scale.' }));
            ctx.tex(panel);
          }
          draw();
        },
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Recursion and loop invariants',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">recursive algorithm</span> solves a problem by calling itself on a smaller input. The <span class="term">base case</span> is small enough to answer directly, and every call must move toward it.</div>
              <div class="row" style="gap:0.6rem;align-items:stretch;flex-wrap:nowrap">
                ${pseudoTag('factorial', 'flex:1 1 0')}
                <p class="small" style="flex:1 1 0">\(4! = 4 \cdot 3!\), \(3! = 3 \cdot 2!\), …, down to \(0! = 1\). Then the answers multiply on the way back up: \(1, 1, 2, 6, 24\).</p>
              </div>
              ${pseudoTag('bsearch')}
              <p class="small">Euclid's algorithm is the classic recursive example: \(\gcd(a, b) = \gcd(b,\ a \bmod b)\), base case \(\gcd(a, 0) = a\). <span class="m5-euclid-link"></span></p>
              <div class="warn">A missing base case, or a call that does not shrink the input, recurses forever. Python stops it after about 1000 nested calls with <code>RecursionError</code>.</div>
            </div>
            <div class="stack">
              <div class="def">A <span class="term">loop invariant</span> is a statement that is true before a loop starts and stays true after every iteration.</div>
              <div class="thm">To prove a loop correct, check three things (the same pattern as induction in Module 3):
                <ol class="small" style="margin-top:0.2rem">
                  <li><b>Initialization:</b> the invariant holds before the first iteration.</li>
                  <li><b>Maintenance:</b> if it holds before an iteration, it holds after it.</li>
                  <li><b>Termination:</b> when the loop stops, invariant plus stopping condition give the answer.</li>
                </ol></div>
              <div class="ex">For <code>max</code>: "after processing \(s[1..i]\), <code>large</code> is the largest of them". It holds at \(i = 1\) since <code>large = s[1]</code>. Each step compares \(s[i+1]\) and keeps the larger. At \(i = n\), <code>large</code> is the largest of all.</div>
              <div class="ai">Decision-tree learning is recursive: split the data on the best question, then build a subtree for each part, stopping at a base case such as "every example has the same label".</div>
            </div>
          </div>`,
        render(body, ctx) {
          fillPseudo(body, ctx);
          // link to Euclid's algorithm in module 6; the key is looked up so a reordering there cannot break it
          const numbers = DM.modules.find((m) => m.id === 'numbers');
          const at = numbers ? numbers.slides.findIndex((sl) => /Euclid/.test(sl.title)) : -1;
          const slot = body.querySelector('.m5-euclid-link');
          if (at < 0) { slot.textContent = 'Module 6 works through it step by step.'; return; }
          const key = `numbers-${numbers.slides[at].id || at + 1}`;
          slot.append(ctx.h('a', { href: '#' + key, onclick: (e) => { e.preventDefault(); ctx.go(key); } }, 'Open Euclid’s algorithm in Module 6 →'));
        },
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Design practice: algorithms in real code',
        kind: 'design',
        html: String.raw`<p class="muted small">Analysis pays off when it shapes everyday coding decisions. Click each principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Choose the algorithm by complexity first',
            html: '<p>A faster inner loop speeds an \\(O(n^2)\\) algorithm up by a constant factor; a better algorithm changes the growth rate. Pick the right complexity class first, then micro-optimize only if measurements say you must.</p><p>Below, <code>items.count(x)</code> scans the whole list for every element, which is \\(n\\) scans of \\(n\\) items. A <code>Counter</code> makes one pass.</p>',
            bad: 'dups = []\nfor x in items:               # n times\n    if items.count(x) > 1:    # n steps each\n        dups.append(x)        # O(n²) total',
            good: 'from collections import Counter\ncounts = Counter(items)       # one pass: O(n)\ndups = [x for x, c in counts.items() if c > 1]',
          },
          {
            name: 'Know your input size',
            html: '<p>An \\(O(n^2)\\) algorithm is perfect for \\(n = 100\\) (\\(10^4\\) steps) and hopeless for \\(n = 10^7\\) (\\(10^{14}\\) steps, about a day). Before choosing, write down the realistic \\(n\\), estimate the operation count, and compare it with roughly \\(10^8\\) to \\(10^9\\) simple steps per second.</p>',
            good: 'n = len(records)            # 2,000,000 rows\n# n**2       = 4e12 steps -> over an hour\n# n*log2(n)  = 4.2e7 steps -> under a second\n# so: sort + one pass, not all pairs',
          },
          {
            name: 'Prefer built-ins: sorted, bisect, min, heapq',
            html: '<p>Python\'s built-ins are tested on millions of programs and run in optimized C. <code>sorted()</code> is \\(O(n \\log n)\\) and stable; <code>bisect</code> is binary search; <code>min</code>/<code>max</code> are one pass; <code>heapq.nsmallest</code> finds the top \\(k\\) without sorting everything. A hand-written bubble sort is slower and one typo away from a bug.</p>',
            bad: 'for i in range(len(a)):           # bubble sort\n    for j in range(len(a) - 1):\n        if a[j] > a[j + 1]:\n            a[j], a[j + 1] = a[j + 1], a[j]',
            good: 'import bisect\na = sorted(data)                    # O(n log n)\ni = bisect.bisect_left(a, target)   # O(log n)\nfound = i < len(a) and a[i] == target',
          },
          {
            name: 'State and test loop invariants',
            html: '<p>Write the invariant as a comment, then check it with <code>assert</code> while testing. When a change breaks the loop, the assertion fails on the exact iteration where the reasoning went wrong, instead of producing a wrong answer much later.</p>',
            good: 'large = s[0]\nfor i in range(1, len(s)):\n    if s[i] > large:\n        large = s[i]\n    # invariant: large is the max of s[0..i]\n    assert large == max(s[:i + 1])',
          },
          {
            name: 'Handle the edge cases',
            html: '<p>Most algorithm bugs live at the edges: the empty list, a single element, duplicates, a target that is absent or sits at either end. Decide what each case should do, make the code say so, and test every one of them.</p>',
            bad: 'def largest(s):\n    large = s[0]          # IndexError on []\n    for x in s: ...',
            good: 'def largest(s):\n    if not s:\n        raise ValueError("largest() of empty list")\n    ...\nfor case in ([], [7], [2, 2], [3, 1, 2]): ...',
          },
          {
            name: 'Avoid accidental O(n²)',
            html: '<p>Some innocent-looking lines hide a full scan: <code>x in some_list</code>, <code>list.remove(x)</code>, <code>list.pop(0)</code>, <code>list.insert(0, x)</code>, and building a string with <code>+=</code> in a loop. Inside a loop of \\(n\\) iterations, each turns the whole loop into \\(O(n^2)\\). Use a set, a <code>deque</code>, or <code>"".join(parts)</code> instead.</p>',
            bad: 'seen = []\nfor x in stream:\n    if x not in seen:       # scans the list\n        seen.append(x)      # loop is O(n²)',
            good: 'seen = set()\nfor x in stream:\n    if x not in seen:       # hash lookup\n        seen.add(x)\ntext = "".join(parts)       # not s += p in a loop',
          },
          {
            name: 'Write the pseudocode first',
            html: '<p>Sketch the algorithm in plain steps before typing Python. Pseudocode makes the loop structure, and therefore the cost, visible at a glance, and it is far cheaper to fix an \\(O(n^2)\\) plan on paper than in a finished program.</p>',
            good: '# closest pair of scores:\n# 1. sort the scores                 O(n log n)\n# 2. scan once, compare neighbors     O(n)\n# 3. return the pair with least gap\n# total: O(n log n), not O(n²) over all pairs',
          },
        ],
      },
      /* ---------------------------------------------------------------- worked example 1 */
      {
        title: 'Worked example: binary search for 31',
        kind: 'example',
        id: 'ex-binary-search',
        problem: String.raw`<p>Use binary search to find 31 in the sorted list \([3, 7, 12, 19, 25, 31, 42, 56]\), showing \(lo\), \(hi\) and \(mid\) at every probe. Indices start at 0, and \(mid = \lfloor (lo + hi)/2 \rfloor\).</p>`,
        objective: 'Trace binary search probe by probe on a sorted list, tracking lo, hi and mid until the target is found, and report the index together with the probe count.',
        data: EX_BIN_DATA,
        steps: binStepsFor(EX_BIN_DATA),
        answer: 5,
        verify(M) {
          const a = [3, 7, 12, 19, 25, 31, 42, 56];
          const sorted = a.every((x, i) => i === 0 || a[i - 1] < x);
          let lo = 0, hi = a.length - 1, probes = 0, found = -1;
          while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            probes++;
            if (a[mid] === 31) { found = mid; break; }
            if (a[mid] < 31) lo = mid + 1; else hi = mid - 1;
          }
          return a.indexOf(31) === 5 && sorted && found === 5 && probes === 2 && a[5] === 31 && EX_BIN_LIST[5] === 31;
        },
        variants: [
          {
            label: 'Variant: target missing',
            problem: String.raw`<p>Use binary search to look for 28 in the same sorted list \([3, 7, 12, 19, 25, 31, 42, 56]\), showing \(lo\), \(hi\) and \(mid\) at every probe. This time the target is not in the list — watch what happens to the interval when a search fails.</p>`,
            data: EX_BIN_VAR_DATA,
            steps: binStepsFor(EX_BIN_VAR_DATA),
            answer: -1,
            verify(M) {
              const a = EX_BIN_LIST;
              let lo = 0, hi = a.length - 1, probes = 0, found = -1;
              while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                probes++;
                if (a[mid] === 28) { found = mid; break; }
                if (a[mid] < 28) lo = mid + 1; else hi = mid - 1;
              }
              return found === -1 && probes === 3 && lo === 5 && hi === 4 && a.indexOf(28) === -1 && !a.some((x) => x === 28);
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_BIN_DATA;
          const a = D.list, t = D.target, n = a.length;
          const v = step.mid >= 0 ? a[step.mid] : null;
          const status = step.probe === 0
            ? `Target ${t} · lo = 0 · hi = ${n - 1} · all ${n} values are still candidates`
            : step.answer && !step.found
              ? `Probe ${step.probe}: list[${step.mid}] = ${v} · lo = ${step.lo} > hi = ${step.hi} · interval empty · not found`
              : step.found
                ? step.confirm && !step.answer
                  ? `Probe ${step.probe}: mid = ${step.mid} · list[${step.mid}] = ${v} = target · found — now confirm it`
                  : `Probe ${step.probe}: lo = ${step.lo} · hi = ${step.hi} · mid = ${step.mid} · list[${step.mid}] = ${v} = target · found`
                : `Probe ${step.probe}: mid = ${step.mid} · list[${step.mid}] = ${v} ${v < t ? '<' : '>'} ${t} · range narrows to lo = ${step.lo}, hi = ${step.hi}`;
          const tagFor = (i) => {
            if (step.found && i === step.mid) return 'mid · found ★';
            if (i === step.mid) return 'mid';
            if (i < step.lo || i > step.hi) return 'ruled out';
            if (i === step.lo) return 'lo';
            if (i === step.hi) return 'hi';
            return ' ';
          };
          const clsFor = (i) => (step.found && i === step.mid ? 'm5-cell found' : i === step.mid && !step.empty ? 'm5-cell cur' : i < step.lo || i > step.hi ? 'm5-cell out' : 'm5-cell');
          const cells = a.map((val, i) => h('div', { class: clsFor(i), style: { flex: '1 1 0', minWidth: '2rem' } },
            String(val), h('small', `index ${i}`), h('small', tagFor(i))));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: 'min(46rem, 100%)' } },
            h('div.small', h('b.mono', status)),
            h('div', { style: { display: 'flex', gap: '0.35rem', width: '100%' } }, ...cells),
            h('p.small.muted', step.probe === 0
              ? 'The labels under the cells name the two ends of the range still in play: lo on the left and hi on the right.'
              : step.empty
                ? 'Every cell is dimmed now: the interval is empty, so no index remains that could possibly hold the target.'
                : step.found
                  ? 'Dimmed cells stay ruled out, and the starred cell is the probe that matched the target.'
                  : 'Dimmed cells are ruled out: no later probe will look at those indices again.'),
            step.confirm && !step.answer ? h('p.small', `Confirm: index ${step.mid} is between lo = ${step.lo} and hi = ${step.hi}, and list[${step.mid}] = ${t} exactly ✓`) : null,
            step.answer ? h('div.ex-answer', step.found
              ? `Answer: ${t} is at index ${step.mid} · check: the list is sorted, list[${step.mid}] = ${t}, and the search took only ${step.probe} probes ✓`
              : `Answer: ${t} is not in the list · check: the interval emptied (lo = ${step.lo} > hi = ${step.hi}) after ${step.probe} probes, so every index was ruled out ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 2 */
      {
        title: 'Worked example: insertion sort, pass by pass',
        kind: 'example',
        id: 'ex-insertion-sort',
        problem: String.raw`<p>Sort \([5, 2, 4, 6, 1, 3]\) with insertion sort, one pass per step, growing a sorted prefix from the left and sliding each new key into its place.</p>`,
        objective: 'Sort a list with insertion sort one pass at a time, growing a sorted prefix from the left and tracking the comparisons and shifts each inserted key costs.',
        data: EX_INS_DATA,
        steps: insStepsFor(EX_INS_DATA),
        answer: [1, 2, 3, 4, 5, 6],
        verify(M) {
          const input = [5, 2, 4, 6, 1, 3];
          const ans = [1, 2, 3, 4, 5, 6];
          const sorted = M.sortNum(input);
          const same = sorted.length === ans.length && sorted.every((x, i) => x === ans[i]);
          const nondec = ans.every((x, i) => i === 0 || ans[i - 1] <= x);
          const sum = (arr) => arr.reduce((t, x) => t + x, 0);
          return same && nondec && sum(ans) === 21 && sum(ans) === sum(input) && EX_INS_STATES[5].every((x, i) => x === ans[i]) && EX_INS_INPUT.every((x, i) => x === input[i]);
        },
        variants: [
          {
            label: 'Variant: already sorted',
            problem: String.raw`<p>Sort \([2, 5, 9, 14, 20, 27]\) with insertion sort, one pass per step. This list is already in ascending order — watch what each pass still has to do, and what it gets to skip.</p>`,
            data: EX_INS_VAR_DATA,
            steps: insStepsFor(EX_INS_VAR_DATA),
            answer: [2, 5, 9, 14, 20, 27],
            verify(M) {
              const input = [2, 5, 9, 14, 20, 27];
              const ans = [2, 5, 9, 14, 20, 27];
              const sorted = M.sortNum(input);
              let comps = 0, shifts = 0;
              const a = input.slice();
              for (let i = 1; i < a.length; i++) {
                const key = a[i]; let j = i - 1;
                while (j >= 0) { comps++; if (a[j] <= key) break; a[j + 1] = a[j]; shifts++; j--; }
                a[j + 1] = key;
              }
              return sorted.every((x, i) => x === ans[i]) && a.every((x, i) => x === ans[i]) && comps === input.length - 1 && shifts === 0;
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_INS_DATA;
          const a = D.states[step.pass];
          const sum = a.reduce((s, x) => s + x, 0);
          const status = step.answer
            ? `All ${a.length - 1} passes done · the sorted prefix covers the whole list`
            : step.pass === 0
              ? `Input [${D.input.join(', ')}] · sorted prefix: [${a[0]}] · ${a.length - 1} passes to go`
              : `Pass ${step.pass} of ${a.length - 1} · key = ${a[step.keyPos]} · sorted prefix: [${a.slice(0, step.sorted).join(', ')}]${step.stays ? ' · the key stays in place' : ''}`;
          const cells = a.map((v, i) => {
            const isKey = i === step.keyPos;
            const inSorted = i < step.sorted;
            const tag = isKey && step.stays ? 'key · stays' : isKey ? 'key' : inSorted ? 'sorted' : 'waiting';
            const style = { flex: '1 1 0', minWidth: '2.4rem', ...(isKey ? { transform: 'translateY(-6px)' } : {}), ...(inSorted && !isKey ? { background: 'var(--accent-2)' } : {}) };
            return h('div', { class: isKey ? 'm5-cell cur' : 'm5-cell', style },
              String(v), h('small', `index ${i}`), h('small', tag));
          });
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.45rem', width: 'min(40rem, 100%)' } },
            h('div.small', h('b.mono', status)),
            h('div', { style: { display: 'flex', gap: '0.35rem', width: '100%', paddingTop: '0.4rem' } }, ...cells),
            h('p.small.muted', step.pass === 0
              ? 'Cells tagged “sorted” form the prefix that is already in order; the raised cell in later steps is the key being inserted.'
              : step.stays
                ? 'Nothing moved this pass — the change is the marker: the key joined the sorted prefix exactly where it already stood.'
                : 'Cells tagged “sorted” form the prefix that is already in order, and the raised cell is the key that was just placed.'),
            step.answer ? h('div.ex-answer', `Answer: [${a.join(', ')}] · check: ${a.length} items summing to ${sum}, exactly like the input, and every neighboring pair is in ascending order ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 3 */
      {
        title: 'Worked example: counting a nested loop exactly',
        kind: 'example',
        id: 'ex-loop-count',
        problem: String.raw`<p>Count exactly how many times the line <code>x = x + 1</code> runs in the nested loop below when \(n = 5\), counting row by row, and check the total against its closed form.</p><pre class="m5-pseudo">for i = 1 to n
  for j = 1 to i
    x = x + 1</pre>`,
        objective: 'Count the exact number of inner-line executions of a triangular nested loop row by row, accumulate the running total, and check it against the closed form n(n + 1)/2.',
        data: EX_LOOP_DATA,
        steps: loopStepsFor(EX_LOOP_DATA),
        answer: EX_LOOP_DATA.total,
        verify(M) {
          let c = 0;
          for (let i = 1; i <= 5; i++) for (let j = 1; j <= i; j++) c++;
          return c === 15 && EX_LOOP_DATA.total === 15 && (5 * 6) / 2 === 15 && EX_LOOP_DATA.rows.join(',') === '1,2,3,4,5';
        },
        variants: [
          {
            label: 'Variant: inner loop runs to n',
            problem: String.raw`<p>Count exactly how many times the line <code>x = x + 1</code> runs in the nested loop below when \(n = 5\). The inner loop now runs to \(n\) instead of to \(i\), so the triangle becomes a rectangle — count row by row and check against the closed form.</p><pre class="m5-pseudo">for i = 1 to n
  for j = 1 to n
    x = x + 1</pre>`,
            data: EX_LOOP_VAR_DATA,
            steps: loopStepsFor(EX_LOOP_VAR_DATA),
            answer: EX_LOOP_VAR_DATA.total,
            verify(M) {
              let c = 0;
              for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++) c++;
              return c === 25 && EX_LOOP_VAR_DATA.total === 25 && 5 * 5 === 25 && EX_LOOP_VAR_DATA.rows.every((r) => r === 5);
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_LOOP_DATA;
          const closed = D.shape === 'rect' ? `n · n = ${D.n} · ${D.n} = ${D.total}` : `n(n + 1)/2 = ${D.n} · ${D.n + 1}/2 = ${D.total}`;
          const dotRows = D.rows.map((c, idx) => h('div', { style: { display: 'flex', gap: '0.22rem', alignItems: 'center' } },
            h('span.mono.small', { style: { width: '3.2rem', textAlign: 'right' } }, `i = ${idx + 1}`),
            ...Array.from({ length: c }, (_, d) => h('span', { style: { width: '1.05rem', height: '1.05rem', borderRadius: '0.25rem', border: '1px solid var(--rule)', background: idx < step.shown ? (step.answer ? 'var(--true)' : 'var(--accent)') : 'var(--sheet)', opacity: idx < step.shown ? 0.85 : 0.35 } })),
            h('span.mono.small', idx < step.shown ? `+${c} → ${D.rows.slice(0, idx + 1).reduce((s, x) => s + x, 0)}` : '?')));
          const tbl = h('table.tt', h('thead', h('tr', h('th', 'i'), h('th', 'inner runs'), h('th', 'running total'))),
            h('tbody', D.rows.map((c, idx) => h('tr', { class: idx === step.shown - 1 && !step.answer ? 'hit' : '' }, h('td', String(idx + 1)), h('td', idx < step.shown ? String(c) : '?'), h('td', idx < step.shown ? String(D.rows.slice(0, idx + 1).reduce((s, x) => s + x, 0)) : '?')))));
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.5rem', width: 'min(40rem, 100%)' } },
            h('div.small', h('b.mono', step.shown === 0 ? `n = ${D.n} · no rows counted yet` : `Rows counted: ${step.shown} of ${D.n} · running total = ${step.run}`)),
            h('div.stack', { style: { gap: '0.28rem' } }, ...dotRows),
            tbl,
            step.answer ? h('p.small', `Closed form check: ${closed} ✓`) : null,
            step.answer ? h('div.ex-answer', `Answer: ${D.total} executions · check: ${D.rows.join(' + ')} = ${D.total} and the closed form ${closed} ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- worked example 4 */
      {
        title: 'Worked example: a growth race at doubling inputs',
        kind: 'example',
        id: 'ex-growth-race',
        problem: String.raw`<p>Three algorithms use \(n\), \(n \log_2 n\) and \(n^2\) operations. Compute the exact counts at \(n = 4, 8, 16, 32\), track each family's doubling factor, and name the family that grows fastest.</p>`,
        objective: 'Compare the growth families n, n log n and n squared by computing exact operation counts at doubling inputs, tracking each doubling factor, and naming the fastest-growing family.',
        data: EX_GROW_DATA,
        steps: growthStepsFor(EX_GROW_DATA),
        answer: EX_GROW_DATA.ans,
        verify(M) {
          const D = EX_GROW_DATA;
          const log2i = (n) => { let k = 0, p = 1; while (p < n) { p *= 2; k++; } return k; };
          const ref = { n: (n) => n, nlogn: (n) => n * log2i(n), nsq: (n) => n * n, exp: (n) => { let r = 1; for (let i = 0; i < n; i++) r *= 2; return r; } };
          const ok = D.fams.every((k, fi) => D.ns.every((n, ni) => D.table[fi][ni] === ref[k](n)));
          const last = D.ns.length - 1, wi = D.fams.indexOf(D.winnerKey);
          return ok && D.table[wi][last] === Math.max(...D.fams.map((_, fi) => D.table[fi][last])) && D.ans === 'n²' && D.table[2][last] === 1024;
        },
        variants: [
          {
            label: 'Variant: 2ⁿ enters the race',
            problem: String.raw`<p>An exponential algorithm joins the race: the families are now \(n\), \(n^2\) and \(2^n\) operations. Compute the exact counts at \(n = 4, 8, 16, 32\), track each doubling factor, and name the family that grows fastest.</p>`,
            data: EX_GROW_VAR_DATA,
            steps: growthStepsFor(EX_GROW_VAR_DATA),
            answer: EX_GROW_VAR_DATA.ans,
            verify(M) {
              const D = EX_GROW_VAR_DATA;
              const ref = { n: (n) => n, nsq: (n) => n * n, exp: (n) => { let r = 1; for (let i = 0; i < n; i++) r *= 2; return r; } };
              const ok = D.fams.every((k, fi) => D.ns.every((n, ni) => D.table[fi][ni] === ref[k](n)));
              const last = D.ns.length - 1, wi = D.fams.indexOf(D.winnerKey);
              return ok && D.table[wi][last] === 4294967296 && D.table[wi][last] > 1000 * D.table[1][last] && D.ans === '2ⁿ' && D.table[2][0] === D.table[1][0];
            },
          },
        ],
        draw(stage, ctx, step, k, preset) {
          const { h } = ctx;
          const D = (preset && preset.data) || EX_GROW_DATA;
          const last = D.ns.length - 1;
          const tbl = h('table.tt', h('thead', h('tr', h('th.l', 'family'), ...D.ns.map((n) => h('th', `n = ${n}`)))),
            h('tbody', D.fams.map((k, fi) => h('tr', { class: step.answer && k === D.winnerKey ? 'hit' : '' },
              h('td.l', h('b', GROW_FAMS[k].label)),
              ...D.ns.map((n, ni) => h('td', { class: ni < step.shown ? '' : 'off', style: ni < step.shown ? null : { color: 'var(--ink-3)' } }, ni < step.shown ? fmtV(D.table[fi][ni]) : '?'))))));
          const ratioLine = step.shown >= 2 && !step.answer
            ? `Latest doubling factors: ${D.fams.map((k, fi) => `${GROW_FAMS[k].label} ×${fmtR(D.table[fi][step.shown - 1] / D.table[fi][step.shown - 2])}`).join(' · ')}`
            : step.shown === 1 ? 'One column in: the doublings from here decide the race.' : step.shown === 0 ? 'No columns yet — press Step to compute the counts at n = ' + D.ns[0] + '.' : '';
          stage.append(h('div.stack', { style: { alignItems: 'center', gap: '0.5rem', width: 'min(42rem, 100%)' } },
            h('div.small', h('b.mono', step.answer ? `Final column: n = ${D.ns[last]} · winner: ${GROW_FAMS[D.winnerKey].label}` : step.shown === 0 ? 'Growth race · no inputs computed yet' : `Inputs computed up to n = ${D.ns[step.shown - 1]}`)),
            tbl,
            ratioLine ? h('p.small', ratioLine) : null,
            step.answer ? h('div.ex-answer', `Answer: ${GROW_FAMS[D.winnerKey].label} grows fastest · check: at n = ${D.ns[last]} it is ${fmtV(D.table[D.fams.indexOf(D.winnerKey)][last])}, ahead of ${D.fams.filter((k) => k !== D.winnerKey).map((k) => `${GROW_FAMS[k].label} = ${fmtV(D.table[D.fams.indexOf(k)][last])}`).join(' and ')}, and its doubling factor never shrinks ✓`) : null));
        },
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'Practice: algorithms and their analysis',
        kind: 'practice',
        html: String.raw`<p class="muted small">Lists are typed in brackets, such as <code>[2, 5, 9]</code>. Indices start at 0, as in Python.</p>`,
        gens: [
          {
            label: 'Searching',
            make(R, M) {
              const kind = R.int(0, 2);
              if (kind === 0) {
                const n = R.pick([R.int(10, 99), R.int(100, 999), R.int(1000, 99999), R.pick([1024, 4096, 1000000, 1000000000])]);
                const c = log2floor1(n);
                return { prompt: `What is the largest number of comparisons binary search can make on a sorted list of \\(n = ${n.toLocaleString('en-US')}\\) items?`, answer: c, hint: 'the formula is ⌊log₂ n⌋ + 1.', solution: `\\(2^{${c - 1}} = ${(2 ** (c - 1)).toLocaleString('en-US')} \\le ${n.toLocaleString('en-US')} \\lt 2^{${c}} = ${(2 ** c).toLocaleString('en-US')}\\), so \\(\\lfloor \\log_2 n \\rfloor = ${c - 1}\\) and the worst case is \\(${c - 1} + 1 = ${c}\\) comparisons. Linear search could need all ${n.toLocaleString('en-US')}.` };
              }
              const len = R.int(7, 12);
              const a = R.sample(M.range(1, 60), len).sort((x, y) => x - y);
              const present = R.chance(0.7);
              let t = present ? R.pick(a) : R.int(1, 61);
              while (!present && a.includes(t)) t = R.int(1, 61);
              if (kind === 1) {
                const tr = linTrace(a, t);
                return { prompt: `Linear search scans \\([${a.join(', ')}]\\) from the left for the target ${t}. How many comparisons does it make?`, answer: tr.length, solution: present ? `${t} is at index ${a.indexOf(t)}, so the search compares a[0], …, a[${a.indexOf(t)}]: <b>${tr.length}</b> comparisons.` : `${t} is not in the list, so every one of the ${len} items is compared: <b>${len}</b> comparisons, the worst case.` };
              }
              const tr = binTrace(a, t);
              return {
                prompt: `Binary search looks for ${t} in \\([${a.join(', ')}]\\) using mid = ⌊(lo + hi)/2⌋ with indices from 0. List the values it compares with ${t}, in order.`,
                answer: tr.map((x) => x.v), format: 'list', placeholder: 'for example [17, 30, 24]',
                solution: tr.map((x) => `lo = ${x.lo}, hi = ${x.hi}, mid = ${x.mid}: compare a[${x.mid}] = ${x.v}${x.res === 'eq' ? ', found.' : x.res === 'lt' ? ` &lt; ${t}, go right.` : ` &gt; ${t}, go left.`}`).join('<br>') + (tr[tr.length - 1].res === 'eq' ? '' : '<br>Now lo &gt; hi, so the target is not present.') + `<br>Answer: [${tr.map((x) => x.v).join(', ')}].`,
              };
            },
          },
          {
            label: 'Counting operations',
            make(R) {
              const n = R.int(5, 14);
              const S = [
                ['for i in range(n):\n    for j in range(n):\n        count += 1', (m) => m * m, (m) => `The inner loop runs ${m} times for each of the ${m} outer iterations: \\(${m} \\cdot ${m} = ${m * m}\\). This is \\(\\Theta(n^2)\\).`],
                ['for i in range(n):\n    for j in range(i):\n        count += 1', (m) => (m * (m - 1)) / 2, (m) => `For \\(i = 0, 1, \\dots, ${m - 1}\\) the inner loop runs \\(i\\) times: \\(0 + 1 + \\cdots + ${m - 1} = \\frac{${m} \\cdot ${m - 1}}{2} = ${(m * (m - 1)) / 2}\\). Still \\(\\Theta(n^2)\\).`],
                ['for i in range(n):\n    for j in range(i, n):\n        count += 1', (m) => (m * (m + 1)) / 2, (m) => `For each \\(i\\) the inner loop runs \\(n - i\\) times: \\(${m} + ${m - 1} + \\cdots + 1 = \\frac{${m} \\cdot ${m + 1}}{2} = ${(m * (m + 1)) / 2}\\).`],
                ['i = 1\nwhile i < n:\n    count += 1\n    i = i * 2', (m) => { let i = 1, c = 0; while (i < m) { c++; i *= 2; } return c; }, (m) => { const vals = []; for (let i = 1; i < m; i *= 2) vals.push(i); return `The loop body runs for \\(i = ${vals.join(', ')}\\), which is ${vals.length} times. Doubling reaches \\(n\\) after about \\(\\log_2 n\\) steps: \\(\\Theta(\\log n)\\).`; }],
                ['for i in range(n):\n    count += 1\nfor j in range(n):\n    for k in range(3):\n        count += 1', (m) => 4 * m, (m) => `Blocks in sequence add: \\(${m} + 3 \\cdot ${m} = ${4 * m}\\). The constant 3 does not change the growth rate: \\(\\Theta(n)\\).`],
              ];
              const [code, f, why] = R.pick(S);
              return {
                prompt: `With \\(n = ${n}\\) and <code>count = 0</code> at the start, what is <code>count</code> after this code runs?<pre class="m5-pseudo" style="margin-top:0.4rem">${code.split('\n').map(DM.hlPy).join('\n')}</pre>`,
                answer: f(n), solution: why(n),
              };
            },
          },
          {
            label: 'Big-O',
            make(R, M) {
              if (R.chance(0.45)) {
                const c = R.int(2, 9), b = R.int(1, 20);
                const items = [
                  [`${c}n^2 + ${b} = O(n^3)`, true, 'Big-O is only an upper bound, and \\(n^3\\) grows faster than \\(n^2\\), so the statement is true (though \\(\\Theta(n^2)\\) says more).'],
                  ['n^2 = O(n \\log n)', false, '\\(n^2 / (n \\log n) = n / \\log n\\) grows without bound, so no constant \\(C\\) can work.'],
                  ['2^n = O(n^{10})', false, 'Every exponential eventually outgrows every polynomial, so no \\(C\\) works for all large \\(n\\).'],
                  ['\\log_2 n = \\Theta(\\log_{10} n)', true, '\\(\\log_2 n = \\log_{10} n / \\log_{10} 2 \\approx 3.32 \\log_{10} n\\): the two differ by a constant factor.'],
                  ['n \\log_2 n = \\Omega(n)', true, 'For \\(n \\ge 2\\), \\(\\log_2 n \\ge 1\\), so \\(n \\log_2 n \\ge n\\): \\(C = 1\\), \\(n_0 = 2\\) works.'],
                  [`${c}n = \\Theta(n^2)`, false, `\\(${c}n\\) grows linearly. \\(\\Theta(n^2)\\) would need \\(${c}n \\ge C n^2\\) for all large \\(n\\), which fails once \\(n \\gt ${c}/C\\).`],
                  ['n! = O(2^n)', false, '\\(n! = 1 \\cdot 2 \\cdots n\\) has more and more factors larger than 2, so \\(n!/2^n \\to \\infty\\).'],
                  [`${b * 10} = O(1)`, true, `A constant is \\(O(1)\\): take \\(C = ${b * 10}\\).`],
                ];
                const [st, truth, why] = R.pick(items);
                return { prompt: `True or false: \\(${st}\\)`, options: ['True', 'False'], answer: truth ? 'True' : 'False', solution: `<b>${truth ? 'True' : 'False'}.</b> ${why}` };
              }
              const CL = [['1', ''], ['log n', '\\log_2 n'], ['n', 'n'], ['n log n', 'n \\log_2 n'], ['n²', 'n^2'], ['n³', 'n^3'], ['2ⁿ', '2^n']];
              const d = R.int(1, 6);
              const lower = R.sample(M.range(0, d - 1), Math.min(d, R.int(1, 2))).sort((x, y) => y - x);
              const term = (i, c) => (i === 0 ? String(c) : `${c === 1 ? '' : c}${CL[i][1]}`);
              const parts = [term(d, R.int(2, 9)), ...lower.map((i) => term(i, i === 0 ? R.int(5, 99) : R.int(2, 60)))];
              const order = R.shuffle(parts);
              const start = Math.max(0, Math.min(d - R.int(1, 2), CL.length - 4));
              const opts = CL.slice(start, start + 4).map((c) => `Θ(${c[0]})`);
              return {
                prompt: `Which is the tightest description of \\(f(n) = ${order.join(' + ')}\\)?`,
                options: opts, answer: `Θ(${CL[d][0]})`,
                solution: `Keep the fastest-growing term and drop its constant. The order is \\(1 \\prec \\log n \\prec n \\prec n \\log n \\prec n^2 \\prec n^3 \\prec 2^n\\), so \\(${parts[0]}\\) dominates and \\(f(n) = \\Theta(${CL[d][1]})\\).`,
              };
            },
          },
          {
            label: 'Sorting passes',
            make(R, M) {
              const a = R.sample(M.range(1, 40), 6);
              const passes = R.int(1, 3);
              const ins = R.chance(0.5);
              const states = [];
              const b = a.slice();
              for (let p = 1; p <= passes; p++) {
                if (ins) { const key = b[p]; let j = p - 1; while (j >= 0 && b[j] > key) { b[j + 1] = b[j]; j--; } b[j + 1] = key; }
                else { const i = p - 1; let sm = i; for (let j = i + 1; j < b.length; j++) if (b[j] < b[sm]) sm = j; [b[i], b[sm]] = [b[sm], b[i]]; }
                states.push(b.slice());
              }
              return {
                prompt: `Apply <b>${ins ? 'insertion' : 'selection'} sort</b> to \\([${a.join(', ')}]\\). What does the list look like after ${passes} pass${passes > 1 ? 'es' : ''} of the outer loop?`,
                answer: b, format: 'list', placeholder: 'for example [3, 8, 1, 9, 4, 6]',
                hint: ins ? 'pass i inserts the item at index i into the sorted part to its left.' : 'pass i swaps the smallest remaining item into index i − 1.',
                solution: `${ins ? 'Each pass takes the next item and slides it left past larger items.' : 'Each pass finds the smallest remaining item and swaps it into the next position.'}<br>${states.map((st, i) => `After pass ${i + 1}: [${st.join(', ')}]`).join('<br>')}`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 15 */
      {
        title: 'Check yourself: algorithms',
        kind: 'quiz',
        questions: [
          { q: 'A recipe says "add salt until it tastes right". Which property of an algorithm does that step violate?', choices: ['Input', 'Precision', 'Generality', 'Output'], answer: 1, explain: '"Until it tastes right" is not stated exactly; two cooks could stop at different points. Precision requires every step to be unambiguous.' },
          { q: 'A loop starts with <code>x = 1</code>, adds 1 to <code>x</code> each time, and stops when <code>x</code> is negative. Which property fails?', choices: ['Determinism', 'Finiteness', 'Generality', 'Input'], answer: 1, explain: '<code>x</code> only grows, so it never becomes negative and the loop never stops. An algorithm must finish after finitely many steps on every input.' },
          { q: 'What is the largest number of comparisons binary search makes on 1,000,000 sorted items?', choices: ['20', '1,000', '500,000', '1,000,000'], answer: 0, explain: String.raw`\(2^{19} = 524{,}288 \le 10^6 \lt 2^{20}\), so \(\lfloor \log_2 10^6 \rfloor + 1 = 19 + 1 = 20\). Each comparison halves the remaining range.` },
          { q: 'What must be true of a list before binary search can be used on it?', choices: ['It has no duplicates', 'It is sorted', 'Its length is a power of 2', 'It contains the target'], answer: 1, explain: 'Binary search throws away half the list based on one comparison, which is only safe when the list is sorted. Duplicates and odd lengths are fine, and an absent target is reported as not found.' },
          { q: 'How many comparisons does insertion sort make on a list of \\(n\\) items that is already sorted?', choices: ['\\(1\\)', '\\(n - 1\\)', '\\(n \\log_2 n\\)', '\\(n(n-1)/2\\)'], answer: 1, explain: 'Each of the \\(n - 1\\) passes compares the new item with its left neighbor once, finds it is not smaller, and stops. That is the best case.' },
          { q: 'Which is the tightest description of \\(3n^2 + 100n + 7\\)?', choices: ['\\(\\Theta(n)\\)', '\\(\\Theta(n^2)\\)', '\\(\\Theta(n^3)\\)', '\\(\\Theta(100n)\\)'], answer: 1, explain: 'Drop the constant factors and keep the dominant term: \\(n^2\\) eventually outgrows \\(100n\\), so the expression is \\(\\Theta(n^2)\\). \\(O(n^3)\\) would also be true, but it is not tight.' },
          { q: 'Which function grows fastest as \\(n\\) becomes large?', choices: ['\\(n^{10}\\)', '\\(2^n\\)', '\\(n!\\)', '\\(n^2 \\log n\\)'], answer: 2, explain: '\\(n! = 1 \\cdot 2 \\cdots n\\) eventually beats \\(2^n\\) (it has more and more factors larger than 2), and every exponential beats every polynomial.' },
          { q: 'How does the running time of this code grow?<pre class="m5-pseudo" style="margin-top:0.35rem">for i in range(n):\n    for j in range(i):\n        total += 1</pre>', choices: ['\\(\\Theta(n)\\)', '\\(\\Theta(n \\log n)\\)', '\\(\\Theta(n^2)\\)', '\\(\\Theta(2^n)\\)'], answer: 2, explain: 'The inner line runs \\(0 + 1 + \\cdots + (n-1) = n(n-1)/2\\) times. Dropping the constant \\(\\tfrac{1}{2}\\) and the lower-order term leaves \\(\\Theta(n^2)\\).' },
          { q: 'Which statement is a loop invariant of selection sort?', choices: ['The list is sorted after every comparison', 'After \\(i\\) passes, the first \\(i\\) positions hold the \\(i\\) smallest items in final order', 'The smallest item is always at the end', 'Every pass makes exactly one comparison'], answer: 1, explain: 'Each pass swaps the smallest remaining item into the next position, so the sorted prefix grows by one and never changes again. When \\(i = n - 1\\), the whole list is sorted.' },
          { q: 'Self-attention costs \\(\\Theta(n^2)\\) in the context length \\(n\\). Roughly how much more attention work does a 16,000-token context need than a 4,000-token one?', choices: ['4 times', '8 times', '16 times', '64 times'], answer: 2, explain: 'The context is 4 times longer, and the cost grows with the square: \\(4^2 = 16\\). That quadratic growth is why long-context models use tricks to avoid comparing every pair of tokens.' },
        ],
      },
    ],
  });
})();
