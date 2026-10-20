/* Module 14: Design Studio, the capstone. Objectives 1-13 come together as one way of designing
   software and AI systems: model, specify, analyze, count, verify, measure. Every slide links back to
   the module that teaches the idea it uses; a link appears only when that module is in the build. */
(() => {
  /* ---------- cross-links to the topic modules ---------- */
  const MODS = {
    sets: [1, 'Sets'],
    logic: [2, 'Logic'],
    proofs: [3, 'Proof Techniques'],
    relations: [4, 'Functions, Sequences & Relations'],
    algorithms: [5, 'Algorithms'],
    numbers: [6, 'Integers & Number Theory'],
    counting: [7, 'Counting & the Binomial Theorem'],
    recurrences: [8, 'Recurrence Relations'],
    graphs: [9, 'Graphs'],
    trees: [10, 'Trees'],
    networks: [11, 'Network Flows'],
    boolean: [12, 'Boolean Algebra & Circuits'],
    probability: [13, 'Probability'],
  };
  function modLink(ctx, id) {
    const m = DM.modules.find((x) => x.id === id);
    const label = `Module ${MODS[id][0]} · ${m ? m.title : MODS[id][1]}`;
    if (!m) return ctx.h('span.ds-mod.off', label);
    return ctx.h('a.ds-mod', { href: '#' + id, onclick: (e) => { e.preventDefault(); ctx.go(id); } }, label);
  }
  const modLinks = (ctx, ids) => ctx.h('span.ds-mods', ids.map((id) => modLink(ctx, id)));
  const labelled = (ctx, sel, html, label) => { const el = ctx.rich(sel, html); el.dataset.label = label; return el; };

  /* ---------- number formatting that survives astronomically large values ---------- */
  const SUPS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (n) => String(n).replace(/[-0-9]/g, (c) => SUPS[c]);
  const commas = (x) => Math.round(x).toLocaleString('en-US');
  /** a number given by its base-10 logarithm: 950, 23,000, 2.3 × 10⁸, or "301,029,996 digits" when even the exponent is huge */
  function fmtLog(L) {
    if (!Number.isFinite(L)) return '∞';
    if (L < 6) return commas(10 ** L);
    if (L >= 1e6) return `${commas(Math.floor(L) + 1)} digits`;
    let e = Math.floor(L), m = 10 ** (L - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return `${m.toFixed(1)} × 10${sup(e)}`;
  }
  /** a small positive number given by its base-10 logarithm: 9.4 × 10⁻²⁰ */
  function fmtLogSmall(L) {
    let e = Math.floor(L), m = 10 ** (L - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return `${m.toFixed(1)} × 10${sup(e)}`;
  }
  const nice = (x) => (x < 10 ? String(Math.round(x * 10) / 10) : commas(x));
  const unit = (x, one, many) => { const t = nice(x); return `${t} ${t === '1' ? one : many}`; };
  const AGE_OF_UNIVERSE_S = 4.35e17;
  /** a duration given by the base-10 logarithm of its length in seconds */
  function fmtTime(Ls) {
    if (Ls > Math.log10(AGE_OF_UNIVERSE_S)) return '> age of universe';
    const s = 10 ** Ls;
    if (s < 1e-6) return unit(s * 1e9, 'ns', 'ns');
    if (s < 1e-3) return unit(s * 1e6, 'µs', 'µs');
    if (s < 1) return unit(s * 1e3, 'ms', 'ms');
    if (s < 60) return unit(s, 'second', 'seconds');
    if (s < 3600) return unit(s / 60, 'minute', 'minutes');
    if (s < 86400) return unit(s / 3600, 'hour', 'hours');
    if (s < 3.156e7) return unit(s / 86400, 'day', 'days');
    const y = s / 3.156e7;
    if (y < 1e6) return unit(y, 'year', 'years');
    if (y < 1e9) return `${nice(y / 1e6)} million years`;
    return `${nice(y / 1e9)} billion years`;
  }

  /* ---------- slide 1: the design loop, run on one problem ---------- */
  const LOOP = [
    {
      name: 'Understand the question', short: 'Understand',
      q: 'What exactly goes in, what must come out, and which cases are tricky?',
      do: 'Name the universe of possible inputs, the outputs, and the edge cases. Work two or three small examples by hand before you design anything.',
      ex: 'Input: a stream of e-mail addresses. Output: accept or reject each one. Tricky case: are <code>Ana@x.com</code> and <code>ana@x.com</code> the same person? Decision: compare lower-cased addresses, so the universe is the set of normalized addresses.',
      mods: ['sets', 'relations'],
    },
    {
      name: 'Choose a discrete structure', short: 'Model',
      q: 'Which mathematical object is this problem, really?',
      do: 'Match the question to a structure: a set for membership, a function for lookups, a graph for connections, a tree for hierarchy, a flow network for capacity, a probability model for risk.',
      ex: 'The only question is "have we seen this address before?" Order and repeats do not matter, so the accepted addresses form a <b>set</b>.',
      mods: ['sets', 'relations', 'graphs', 'trees', 'networks'],
    },
    {
      name: 'Specify with logic', short: 'Specify',
      q: 'What must be true before, during and after the code runs?',
      do: 'Write the <span class="term">specification</span> as logical statements: a precondition, a postcondition and the invariants. They become docstrings, asserts and test cases.',
      ex: 'Invariant: <code>accepted</code> never holds two equal addresses. Postcondition: an address is accepted exactly when it was not already in <code>accepted</code>.',
      mods: ['logic', 'proofs'],
    },
    {
      name: 'Choose and analyze the algorithm', short: 'Analyze',
      q: 'How does the cost grow with the input size \\(n\\)?',
      do: 'Find the growth rate of each candidate with Big-O, or with a recurrence if it is recursive, and compare them before writing code.',
      ex: 'Scanning a list of earlier sign-ups costs \\(O(n)\\) per sign-up and \\(O(n^2)\\) in total: about \\(5 \\times 10^{11}\\) comparisons for a million users. A hash set stores each address at position <code>hash(x) % m</code>, so a lookup costs \\(O(1)\\) on average and the whole job about \\(10^6\\) steps.',
      mods: ['algorithms', 'recurrences', 'numbers'],
    },
    {
      name: 'Count and estimate', short: 'Estimate',
      q: 'How big is the search space, and how likely is the bad case?',
      do: 'Use counting to size the problem and probability to size the risk, before you build anything.',
      ex: 'Storing a 32-bit hash instead of the full address saves memory, but the birthday bound predicts a collision after about 77,000 users, and a collision would reject a real person. Store the full address, or use 64 or more bits.',
      mods: ['counting', 'probability'],
    },
    {
      name: 'Verify', short: 'Verify',
      q: 'How do you know it is right for every input?',
      do: 'Prove the key invariant, often by induction, and test the code against a slow, obviously correct version on many random small inputs.',
      ex: 'Induction: the set has no duplicates after 0 sign-ups, and each step adds an address only if it is absent. Testing: compare against a nested-loop version on 1,000 random lists.',
      mods: ['proofs', 'boolean'],
    },
    {
      name: 'Measure', short: 'Measure',
      q: 'Does reality match the estimate?',
      do: 'Time the code on realistic data, report averages with their spread, and fix random seeds so others can reproduce your numbers. A big surprise means the model was wrong: go around the loop again.',
      ex: 'Suppose one million simulated sign-ups take 0.4 seconds. The estimate said about \\(10^6\\) steps, well under a second, so the model holds. An hour would send you back to step 2.',
      mods: ['probability', 'algorithms'],
    },
  ];

  /* ---------- slide 2: scenarios for "pick the structure" ---------- */
  const STRUCT = {
    set: { name: 'Set', art: 'A set', cue: 'membership; no order, no repeats', fits: 'the only question is membership, with no order and no repeats' },
    list: { name: 'List (sequence)', art: 'A list', cue: 'order matters, repeats allowed', fits: 'order matters and the same value may appear more than once' },
    dict: { name: 'Dict (function)', art: 'A dict', cue: 'each key maps to one value', fits: 'each key maps to exactly one value' },
    relation: { name: 'Relation table', art: 'A relation table', cue: 'many-to-many pairs', fits: 'items on two sides link many-to-many, stored as pairs' },
    graph: { name: 'Graph', art: 'A graph', cue: 'objects plus connections', fits: 'connections between objects matter: paths, neighbors, dependencies' },
    tree: { name: 'Tree', art: 'A tree', cue: 'hierarchy, one parent each', fits: 'every item has exactly one parent under a single root' },
    flow: { name: 'Flow network', art: 'A flow network', cue: 'capacities, max throughput', fits: 'edges have capacities and the goal is to move as much as possible' },
    logic: { name: 'Boolean logic', art: 'Boolean logic', cue: 'true/false rules, circuits', fits: 'the answer is a combination of true/false conditions' },
    prob: { name: 'Probability model', art: 'A probability model', cue: 'chance, risk, uncertainty', fits: 'the outcome is uncertain and you need to say how likely it is' },
  };
  const ORDER = ['set', 'list', 'dict', 'relation', 'graph', 'tree', 'flow', 'logic', 'prob'];
  const ASK = [
    ['Only "is it in there?"', 'set'], ['Order or repeats matter?', 'list'], ['One value per key?', 'dict'],
    ['Many-to-many pairs?', 'relation'], ['Paths, neighbors, dependencies?', 'graph'], ['One parent each, one root?', 'tree'],
    ['Capacities to maximize?', 'flow'], ['True/false conditions?', 'logic'], ['Uncertainty to quantify?', 'prob'],
  ];
  const SCENARIOS = [
    { t: 'Reject a new sign-up if that e-mail address has registered before.', best: 'set', mod: 'sets',
      why: 'The only question is membership: "is this address already in?" Order and repeats are irrelevant, and a hash set answers membership in constant average time, so a million sign-ups cost about a million steps instead of half a trillion comparisons.',
      alt: { dict: 'A dict also works when you need extra data per address, such as the sign-up date. For a pure yes/no membership test, a set states the intent more clearly.' } },
    { t: 'Route packages between 40 warehouses along roads with known driving times.', best: 'graph', mod: 'graphs',
      why: 'Warehouses are vertices, roads are weighted edges, and "fastest route" is a shortest-path problem that Dijkstra\'s algorithm solves in \\(O(E \\log\\,V)\\) time.',
      alt: { flow: 'A flow network adds capacities and asks how much can move at once. Here each package needs the fastest path, which is a shortest-path question on a weighted graph.' } },
    { t: 'Store a company org chart: every employee has exactly one manager, except the CEO.', best: 'tree', mod: 'trees',
      why: 'One parent per node and a single root is the definition of a rooted tree. "Who reports to whom, directly or indirectly?" becomes a subtree walk, and the chain of command is the path to the root.',
      alt: { graph: 'A tree is a graph, so this is not wrong. Calling it a tree adds guarantees (one parent, no cycles) that your code can rely on and check.', dict: 'A dict from employee to manager is a fine way to store the tree. Recognizing the model as a tree is what gives you the algorithms.' } },
    { t: 'Count how many different 5-person teams can be picked from 20 applicants.', best: 'set', mod: 'counting',
      why: 'A team is a 5-element subset: order does not matter and nobody appears twice. Counting subsets of size 5 gives \\(\\binom{20}{5} = 15{,}504\\) teams.',
      alt: { list: 'A sequence counts ordered line-ups: \\(20 \\cdot 19 \\cdot 18 \\cdot 17 \\cdot 16 = 1{,}860{,}480\\), which counts every team \\(5! = 120\\) times.', prob: 'Probability could come next, for example the chance that a random team includes a given person. The count underneath treats a team as a set.' } },
    { t: 'Look up a user\'s profile from their user ID on every page load.', best: 'dict', mod: 'relations',
      why: 'Each ID maps to exactly one profile, which is the definition of a function. A Python dict implements that function with constant average lookup time.',
      alt: { set: 'A set can say whether an ID exists, but it cannot hand back the profile attached to it.', relation: 'A relation table allows one ID to link to many profiles. Here each ID has exactly one, so the stronger model, a function, fits better.' } },
    { t: 'Accept a promo code only if it is valid AND unexpired AND not already used by this customer.', best: 'logic', mod: 'logic',
      why: 'This is the compound proposition \\(v \\land \\lnot e \\land \\lnot u\\). Writing it as logic lets you simplify it, list the 8 rows of its truth table as test cases, and spot a missing case before customers do.',
      alt: { set: 'The "already used" part is a set-membership test. The decision combines three true/false facts, which is propositional logic.' } },
    { t: 'Model which courses are prerequisites of which, then suggest an order to take them.', best: 'graph', mod: 'graphs',
      why: 'Courses are vertices and "A must come before B" is a directed edge. The graph must have no cycles (it is a DAG), and a topological sort produces a valid order.',
      alt: { relation: 'Prerequisites are a relation on courses. Drawing that relation as a directed graph gives you cycle detection and topological sort, the algorithms this question needs.', tree: 'A course can have several prerequisites, so a node can have many parents. That breaks the tree rule, so the general model is a directed acyclic graph.' } },
    { t: 'Push as much video traffic as possible from a data center to a city through links with fixed bandwidth.', best: 'flow', mod: 'networks',
      why: 'Links have capacities and the goal is the largest total rate from a source to a sink: a maximum-flow problem. The max-flow min-cut theorem also names the links that form the bottleneck.',
      alt: { graph: 'The network is a graph, but the question is about capacities and total throughput, which needs the extra structure of a flow network.' } },
    { t: 'Estimate the chance that two of 100,000 users get the same random 32-bit ID.', best: 'prob', mod: 'probability',
      why: 'This is the birthday problem. With \\(N = 2^{32}\\) possible IDs and \\(k = 100{,}000\\) users, \\(P \\approx 1 - e^{-k^2/2N} \\approx 69\\%\\). A collision is more likely than not, so 32 bits is too few.',
      alt: { set: 'Storing issued IDs in a set detects a collision after it happens. Predicting how likely one is beforehand is a probability question.' } },
    { t: 'Keep the last 50 chat messages in the order they arrived; the same text can appear twice.', best: 'list', mod: 'relations',
      why: 'Order matters and repeats are allowed, so this is a sequence. A Python list, or a fixed-length deque that appends on the right and drops from the left, keeps exactly the last 50.',
      alt: { set: 'A set would merge two identical messages and forget the order, and both matter here.' } },
    { t: 'Record which students are enrolled in which courses: a student takes many courses and a course has many students.', best: 'relation', mod: 'relations',
      why: 'Enrollment is a many-to-many relation, a subset of Students × Courses. In a database it becomes a table of (student, course) pairs. A dict from student to one course could not hold several courses per student.',
      alt: { dict: 'A dict from each student to a set of courses can store this relation. The model is still a relation; the dict of sets is one way to implement it.', graph: 'A bipartite graph with students on one side and courses on the other draws the same relation. A table of pairs is the usual way to store and query it.' } },
    { t: 'Autocomplete: show every stored word that starts with the letters typed so far.', best: 'tree', mod: 'trees',
      why: 'A trie (prefix tree) stores words letter by letter along root-to-leaf paths. All words with a given prefix sit in one subtree, so finding them costs time proportional to the prefix length, not to the number of stored words.',
      alt: { set: 'A set answers "is this exact word stored?" but not "which words start with these letters?" without scanning everything.', list: 'A sorted list with binary search can also find the range of words with a prefix in \\(O(\\log\\,n)\\) time. The trie is the classic structure built for prefixes.' } },
    { t: 'Design the part of a chip that adds two 4-bit numbers.', best: 'logic', mod: 'boolean',
      why: 'Each output bit is a Boolean function of the input bits. A full adder computes sum \\(= a \\oplus b \\oplus c\\) and carry \\(= ab + c(a \\oplus b)\\); four of them chained together add two 4-bit numbers.',
      alt: {} },
    { t: 'Suggest "people you may know": friends of your friends who are not yet your friends.', best: 'graph', mod: 'graphs',
      why: 'People are vertices and friendships are edges. Friends of friends are the vertices at distance exactly 2, found by a breadth-first search two levels deep.',
      alt: { relation: '"Is friends with" is a symmetric relation. Storing it as a graph with adjacency sets turns "distance 2" into a quick two-step walk.' } },
    { t: 'Store a year of daily temperatures to compute a 7-day moving average.', best: 'list', mod: 'relations',
      why: 'The data is a sequence indexed by day: order matters and the same value can repeat. A moving average slides a window over 7 consecutive positions.',
      alt: { dict: 'A dict from date to temperature also works. Because the days are consecutive, a list indexed by day number is simpler and keeps the order built in.' } },
    { t: 'A spam filter reports "spam with 92% confidence". Decide whether to block the message.', best: 'prob', mod: 'probability',
      why: 'The 92% is a probability. Bayes\' theorem connects it to how common spam is, and the blocking threshold should weigh the cost of losing real mail against the cost of letting spam through.',
      alt: { logic: 'The final rule ("block if p > 0.9 and the sender is not on the allow list") is logic. Choosing the threshold, and knowing what 92% means, is probability.' } },
    { t: 'Count how often each word appears in a large document.', best: 'dict', mod: 'relations',
      why: 'Each distinct word maps to one count: a function from words to positive integers. A dict (or <code>collections.Counter</code>) updates a count in constant average time per word.',
      alt: { set: 'A set keeps each word once but throws away how often it appeared, which is the information you need.', list: 'Scanning a list of (word, count) pairs for every word makes the job \\(O(n^2)\\). A dict finds the right count directly.' } },
    { t: 'Assign 30 workers to 30 jobs so each worker gets one job they are qualified for.', best: 'flow', mod: 'networks',
      why: 'This is bipartite matching. Connect a source to every worker and every job to a sink, all with capacity 1, plus a worker-to-job edge for each qualification. A maximum flow of 30 means everyone gets a job.',
      alt: { graph: 'The qualifications form a bipartite graph. Turning it into a flow network is the standard trick that lets a max-flow algorithm find the matching.', relation: '"Is qualified for" is a relation. Finding a one-to-one assignment inside it is a matching problem, solved with network flow.' } },
    { t: 'Evaluate an arithmetic expression such as (3 + 4) × (5 − 2) typed by a user.', best: 'tree', mod: 'trees',
      why: 'A parser builds an expression tree: operators are internal nodes and numbers are leaves. A post-order traversal evaluates the children before their parent and gives 7 × 3 = 21.',
      alt: { list: 'The input arrives as a sequence of characters. Parsing turns that sequence into a tree, the structure that captures precedence and parentheses.' } },
    { t: 'Run an A/B test: did the new page layout really raise the click rate from 4.0% to 4.6%, or was it luck?', best: 'prob', mod: 'probability',
      why: 'Clicks are random events, so the question is whether the difference is larger than chance alone would produce. A probability model of the click counts gives a confidence interval for the improvement.',
      alt: {} },
    { t: 'Run build steps in an order that respects "step A must finish before step B".', best: 'graph', mod: 'graphs',
      why: 'The dependencies form a directed acyclic graph. A topological sort gives a valid order, and finding a cycle means the build can never succeed, so cycle detection doubles as error checking.',
      alt: { list: 'The answer is a list of steps in order. The model that produces it is the dependency graph.', tree: 'A step can depend on several others, so a node can have many parents, which a tree does not allow.' } },
    { t: 'Check that a simplified access rule gives the same answer as the original in every case.', best: 'logic', mod: 'boolean',
      why: 'Two Boolean expressions are equivalent exactly when their truth tables agree on every row. With 4 inputs that is only 16 rows, so you can check them all, or prove the equivalence with the laws of Boolean algebra.',
      alt: {} },
    { t: 'Store which actors appeared in which films, to answer "which films include both of these actors?"', best: 'relation', mod: 'relations',
      why: 'Cast membership is a many-to-many relation between actors and films, stored as a table of (actor, film) pairs. The query becomes the intersection of two actors\' sets of films.',
      alt: { set: 'Each actor\'s films form a set, and the answer is an intersection. The whole collection of facts is a relation between two sets.', graph: 'A bipartite actor-film graph draws the same relation. A table of pairs is how databases store it.' } },
  ];

  /* ---------- slide 6: growth rates as base-10 logarithms of step counts ---------- */
  function log10Fact(n) {
    if (n < 2) return 0;
    if (n <= 1000) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log10(i); return s; }
    return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n)) / Math.LN10; // Stirling
  }
  const lg = (n) => Math.max(1, Math.log2(n)); // count at least one step
  const GROWTH = [
    { name: 'O(1)', ex: 'hash lookup', L: () => 0 },
    { name: 'O(log n)', ex: 'binary search', L: (n) => Math.log10(lg(n)) },
    { name: 'O(n)', ex: 'one pass', L: (n) => Math.log10(n) },
    { name: 'O(n log n)', ex: 'sorting', L: (n) => Math.log10(n) + Math.log10(lg(n)) },
    { name: 'O(n²)', ex: 'all pairs', L: (n) => 2 * Math.log10(n) },
    { name: 'O(n³)', ex: 'all triples', L: (n) => 3 * Math.log10(n) },
    { name: 'O(2ⁿ)', ex: 'all subsets', L: (n) => n * Math.log10(2) },
    { name: 'O(n!)', ex: 'all orderings', L: (n) => log10Fact(n) },
  ];
  /** largest n whose step count fits in 10^LB steps (Infinity when it exceeds 10^18) */
  function largestN(g, LB) {
    if (g.L(1) > LB) return 0;
    let lo = 1, hi = 2;
    while (g.L(hi) <= LB) { lo = hi; hi *= 2; if (hi > 1e18) return Infinity; }
    while (hi - lo > 1 && hi - lo > lo * 1e-6) { const mid = Math.floor((lo + hi) / 2); if (g.L(mid) <= LB) lo = mid; else hi = mid; }
    return lo;
  }
  const BUDGETS = [['0.1 s', 0.1], ['1 s', 1], ['1 min', 60], ['1 hour', 3600], ['1 day', 86400]];
  const SPEEDS = [['Python · 10⁷ steps/s', 7], ['Compiled · 10⁹ steps/s', 9]];
  const BUD_PRESETS = [
    { label: '10-million-row dataset', n: 1e7, note: 'Ten million rows. One pass (n) and sorting (n log n) fit within a minute even in Python. Comparing every pair of rows (n², 10¹⁴ steps) would take about 116 days, so professionals find duplicates by hashing or sorting instead of pairwise comparison.' },
    { label: '60-item feature set', n: 60, note: 'Sixty candidate features. Trying every subset (2⁶⁰ ≈ 1.2 × 10¹⁸) is hopeless: about 36 years even in compiled code. Greedy forward selection needs at most about n²/2 = 1,800 model fits, and regularization selects features during a single training run.' },
    { label: '25-city route', n: 25, note: 'Twenty-five cities. Every ordering (25! ≈ 1.6 × 10²⁵) is hopeless on any machine. Dynamic programming (Held-Karp) needs about n² · 2ⁿ ≈ 2 × 10¹⁰ steps, around 20 seconds compiled, and heuristics such as 2-opt get within a few percent of the best route in milliseconds.' },
    { label: '1 billion sorted keys', n: 1e9, note: 'One billion sorted keys. Binary search needs about 30 probes (log₂ 10⁹ ≈ 30). A linear scan needs 10⁹ steps, about 100 seconds in Python. This gap is why databases keep their keys in search trees (Module 10).' },
    { label: '3,000-node road network', n: 3000, note: 'A 3,000-node network. All-pairs shortest paths with Floyd-Warshall costs n³ = 2.7 × 10¹⁰ steps: about 45 minutes in Python, 27 seconds compiled. If you only need routes from a few sources, running Dijkstra from each one is far cheaper (Module 9).' },
  ];

  /* ---------- slide 8: ID schemes for the collision calculator ---------- */
  const ALPHA = [['digits 0-9', 10], ['hex 0-9 a-f', 16], ['letters a-z', 26], ['a-z and 0-9', 36], ['base62 a-z A-Z 0-9', 62], ['base64', 64], ['365 birthdays', 365]];
  const COL_PRESETS = [
    { label: '32-bit hash, 100,000 users', mode: 'bits', bits: 32, k: 1e5, note: 'A 32-bit hash of each e-mail address used as the user key. The birthday bound makes a collision more likely than not, so two real people would end up sharing a key.' },
    { label: '6-digit order numbers, 5,000 orders', mode: 'alpha', a: 0, len: 6, k: 5000, note: 'Random 6-digit order numbers. Only a million values exist, so a collision is practically certain after a few thousand orders. Use a counter, or a much longer random ID.' },
    { label: 'Short links: 7 base62 chars, 10 million', mode: 'alpha', a: 4, len: 7, k: 1e7, note: 'A link shortener with 7-character codes. Collisions are certain at this scale, so the service checks each new code against its database and retries on a clash.' },
    { label: 'Video IDs: 11 base64 chars, 1 billion', mode: 'alpha', a: 5, len: 11, k: 1e9, note: 'Eleven base64 characters carry 66 bits. After a billion IDs a collision is unlikely, yet possible, so a uniqueness check on insert is still cheap insurance.' },
    { label: 'UUID v4 (122 random bits), 1 billion', mode: 'bits', bits: 122, k: 1e9, note: 'Version 4 UUIDs carry 122 random bits. At a billion IDs the collision chance is about 10⁻¹⁹, far below the chance of a hardware fault, so systems treat them as unique.' },
    { label: 'Birthdays: 23 people, 365 days', mode: 'alpha', a: 6, len: 1, k: 23, note: 'The classic birthday problem. With only 23 people, two share a birthday with probability just over 50%: 23 people form 253 pairs, and each pair is a chance to match.' },
  ];
  const SHORT_K = ['1', '10', '100', '1k', '10k', '100k', '1M', '10M', '100M', '1B', '10B', '100B', '1T'];

  /* ---------- slide 11: stages of an AI system ---------- */
  const PIPE = [
    { name: 'Data', short: 'sets, partitions', tags: ['sets', 'partitions', 'functions (labels)', 'equivalence (duplicates)'], mods: ['sets', 'relations', 'probability'],
      what: 'Training examples form a set: duplicates are removed, because a repeated example is learned twice. The data is split into training and test sets that must be <b>disjoint</b>, and labels are a function from examples to classes. Finding near-duplicates means choosing an equivalence relation: which records count as the same?',
      ex: 'Require \\(|\\text{train} \\cap \\text{test}| = 0\\). If a near-copy of a test question sits in the training set, the test score overstates real performance. This mistake is called data leakage.',
      check: 'Before training, normalize the text, intersect the training and test sets, and assert that the intersection is empty.' },
    { name: 'Tokenization', short: 'vocabulary, sequences', tags: ['vocabulary set', 'sequences', 'counting pairs', 'prefix tree'], mods: ['sets', 'relations', 'counting', 'trees'],
      what: '<span class="term">Tokenization</span> turns text into a sequence of token IDs from a finite vocabulary \\(V\\), often 50,000 to 200,000 tokens. Byte-pair encoding builds \\(V\\) by repeatedly counting adjacent pairs and merging the most frequent pair into a new token. A prefix tree finds the longest matching token quickly.',
      ex: '"unbelievable" → ["un", "believ", "able"] → [403, 8812, 540]. These IDs are made up; every tokenizer has its own vocabulary.',
      check: 'Encoding and then decoding must give back the original text. Test that <code>decode(encode(s)) == s</code> on thousands of random strings, accented letters included.' },
    { name: 'Embeddings', short: 'functions, lookup', tags: ['function V → ℝᵈ', 'lookup table', 'nearest-neighbor graph'], mods: ['relations', 'graphs'],
      what: 'An <span class="term">embedding</span> is a function \\(E: V \\to \\mathbb{R}^d\\), stored as a table with one row per token; the token ID selects the row. Searching millions of embeddings for the closest ones uses graph indexes: each vector links to a few near neighbors, and a search hops along edges toward the query.',
      ex: 'With \\(|V| = 50{,}000\\) tokens and \\(d = 768\\) numbers per token, the table holds \\(50{,}000 \\times 768 = 38.4\\) million numbers.',
      check: 'Every token ID must lie in \\(\\{0, 1, \\dots, |V| - 1\\}\\). That precondition is cheap to assert and catches a tokenizer paired with the wrong model.' },
    { name: 'Model', short: 'DAG, masks, recurrences', tags: ['directed acyclic graph', 'topological order', 'Boolean masks', 'recurrences'], mods: ['graphs', 'boolean', 'recurrences', 'algorithms'],
      what: 'A neural network is a <span class="term">computation graph</span>: a directed acyclic graph whose nodes are operations. Running the model visits the nodes in topological order, and training (backpropagation) walks the same graph backwards. Causal attention applies a Boolean mask so position \\(i\\) only uses positions \\(j \\le i\\).',
      ex: 'For 4 tokens the mask allows the pairs with \\(j \\le i\\): a lower-triangular pattern with \\(4 + 3 + 2 + 1 = 10\\) allowed pairs out of 16. A recurrent network is literally a recurrence relation, \\(h_t = f(h_{t-1}, x_t)\\).',
      check: 'Assert the shape of every tensor at module boundaries. A shape mismatch that silently broadcasts is one of the most common bugs in model code.' },
    { name: 'Output probabilities', short: 'distributions, search trees', tags: ['probability distribution', 'sampling', 'search tree (beam search)'], mods: ['probability', 'trees', 'recurrences'],
      what: 'The model outputs a probability distribution over \\(V\\): every token gets a value between 0 and 1, and the values sum to 1. Generation samples a token, appends it and repeats, a recurrence on the text so far. Beam search explores a tree of partial outputs and keeps the best \\(k\\) branches at each depth.',
      ex: 'After "The capital of France is", a model might give "Paris" 0.92, "a" 0.03 and "the" 0.02, spreading the last 0.03 over thousands of other tokens. With a fixed seed, sampling produces the same text every time.',
      check: 'Check that the probabilities sum to 1 within rounding error, and fix the random seed whenever an output must be reproducible.' },
    { name: 'Evaluation & decision', short: 'set sizes, rules, intervals', tags: ['ratios of set sizes', 'logic rules', 'confidence intervals'], mods: ['sets', 'logic', 'probability', 'counting'],
      what: 'Precision and recall are ratios of set sizes, for example \\(\\text{precision} = |TP| / (|TP| + |FP|)\\), where \\(TP\\) is the set of true positives. The rule that acts on the output is logic, such as "block if \\(p \\gt 0.9\\) AND the sender is not on the allow list". A finite test set gives only an estimate, so report its uncertainty too.',
      ex: '86 correct answers out of 100 test cases give accuracy 0.86, with a 95% confidence interval of roughly 0.79 to 0.93. A rival model that scores 0.88 on the same 100 cases is not clearly better.',
      check: 'Decide how large the test set must be before comparing models, and report an interval with every score.' },
  ];

  /* ---------- slide 14: the objectives as skills ---------- */
  const SKILLS = [
    ['sets', 'Describe any collection precisely with set notation, and reach for a set in code when membership is the question.'],
    ['logic', 'Turn requirements into propositions, check them with truth tables, and follow the logic of a proof.'],
    ['proofs', 'Prove claims directly, by contradiction or by induction, and state the loop invariant that makes code correct.'],
    ['relations', 'Model data as functions, sequences and relations, and tell a one-to-one mapping from a many-to-many one.'],
    ['algorithms', 'Write algorithms precisely and compare them by growth rate before writing any code.'],
    ['numbers', 'Use divisibility, gcd and modular arithmetic, the number theory underneath hashing and cryptography.'],
    ['counting', 'Size a search space with the product rule, permutations, combinations and the binomial theorem.'],
    ['recurrences', 'Set up and solve recurrence relations to find the running time of recursive algorithms.'],
    ['graphs', 'Model networks as graphs and choose the right traversal or shortest-path algorithm.'],
    ['trees', 'Use trees for hierarchies, search and parsing, and explain why balanced trees stay fast.'],
    ['networks', 'Model capacities as a flow network, then find the maximum flow and the cut that limits it.'],
    ['boolean', 'Simplify Boolean expressions and connect them to the logic gates that compute them.'],
    ['probability', 'Quantify uncertainty: probabilities, expected values, collision risks and reproducible experiments.'],
  ];

  DM.module({
    id: 'design',
    num: 14,
    title: 'Design Studio',
    objectives: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    terms: {
      'mathematical model': 'A simplified mathematical description of a problem (a set, function, graph, tree, flow network, logical formula or probability model) that keeps only the details the decision depends on.',
      'specification': 'A precise statement of what code must do, separate from how it does it. Preconditions, postconditions and invariants are its parts.',
      'precondition': 'A condition that must be true before a function runs. The caller is responsible for it.',
      'postcondition': 'A condition the function guarantees when it returns, provided the precondition held when it started.',
      'invariant': 'A statement that stays true throughout a computation, for example at the start of every pass through a loop, or for every object of a class.',
      'loop invariant': 'A statement that is true before a loop starts and stays true after every pass. Together with the exit condition it proves what the loop computed.',
      'Hoare triple': 'The notation {P} S {Q}: if P is true before statement S runs, and S finishes, then Q is true afterwards.',
      'contract': 'The precondition and postcondition of a function taken together: an agreement between the function and every caller.',
      'growth rate': 'How fast the running time of an algorithm grows as the input size n grows, described with Big-O notation.',
      'complexity budget': 'The number of basic steps you can afford: the speed of the machine (steps per second) times the time available.',
      'search space': 'The set of all candidate solutions an algorithm might have to examine. Counting tells you its size.',
      'collision': 'Two different items that receive the same ID or hash value.',
      'birthday bound': 'Among k values drawn at random from N possibilities, P(collision) ≈ 1 − e^(−k(k−1)/2N); a collision becomes likely once k ≈ 1.18√N.',
      'test oracle': 'A slow but obviously correct reference implementation, used to check the answers of a fast one.',
      'property-based testing': 'Testing that a stated property holds on many automatically generated inputs, instead of on a few hand-picked examples.',
      'pure function': 'A function whose output depends only on its inputs and that changes nothing outside itself. It behaves like a mathematical function.',
      'seed': 'The starting value of a pseudo-random number generator. The same seed reproduces the same sequence of "random" numbers.',
      'tokenization': 'Splitting text into a sequence of tokens drawn from a fixed, finite vocabulary, each identified by an integer ID.',
      'embedding': 'A function that maps each token (or other discrete item) to a vector of numbers, stored as a lookup table.',
      'computation graph': 'A directed acyclic graph whose nodes are operations and whose edges carry values. Neural networks run forward along it and train backwards along it.',
    },
    symbols: [
      ['{P} S {Q}', 'Hoare triple: if P holds before S, Q holds after', '{x ≥ 0} y = x + 1 {y ≥ 1}'],
      ['≈', 'approximately equal to', '2¹⁰ ≈ 10³'],
      ['1.18√N', 'birthday bound: 50% collision point', 'N = 365 gives 23'],
      ['2ᵇ', 'number of IDs with b random bits', '2³² ≈ 4.3 × 10⁹'],
    ],
    css: `
      .ds-mods { display: inline-flex; flex-wrap: wrap; gap: 0.3rem; vertical-align: middle; }
      .ds-mod { display: inline-flex; align-items: center; font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.3; padding: 0.08rem 0.5rem; border: 1px solid var(--accent); border-radius: 2rem; color: var(--accent); background: var(--sheet); text-decoration: none; white-space: nowrap; }
      a.ds-mod:hover, a.ds-mod:focus-visible { background: var(--accent-2); }
      .ds-mod.off { border-color: var(--rule); color: var(--ink-2); }
      .ds-grow { flex: 1 1 auto; }
      .ds-ol { margin: 0; padding-left: 1.4em; }
      .ds-code { margin: 0; padding: 0.45rem 0.7rem; background: var(--paper); border: 1px solid var(--rule); border-radius: 0.35rem; font-size: 0.8rem; line-height: 1.5; white-space: pre; overflow-x: auto; }
      .ds-pre { margin: 0.45rem 0 0; padding: 0.4rem 0.7rem; background: var(--paper); border: 1px solid var(--rule); border-radius: 0.35rem; font-size: 0.86rem; line-height: 1.5; white-space: pre; overflow-x: auto; }

      .ds-loop { display: grid; grid-template-columns: 30rem minmax(0, 1fr); gap: 1.2rem; align-items: center; min-height: 0; }
      .ds-ring { position: relative; width: 30rem; height: 19rem; }
      .ds-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      .ds-node { position: absolute; transform: translate(-50%, -50%); width: 8.6rem; display: grid; grid-template-columns: 1.5rem minmax(0, 1fr); align-items: center; gap: 0.35rem; padding: 0.28rem 0.6rem 0.28rem 0.3rem; border: 1px solid var(--rule); border-radius: 2rem; background: var(--sheet); color: var(--ink); font-size: 0.88rem; text-align: left; cursor: pointer; box-shadow: var(--shadow); }
      .ds-node .k { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: var(--accent-2); color: var(--accent); font-family: var(--font-mono); font-size: 0.75rem; font-weight: 600; }
      .ds-node:hover { border-color: var(--accent); }
      .ds-node.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
      .ds-node.on .k { background: var(--accent-ink); color: var(--accent); }
      .ds-ctr { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 12rem; text-align: center; display: grid; gap: 0.2rem; }
      .ds-step { display: flex; flex-direction: column; gap: 0.5rem; }
      .ds-step h3 { font-size: 1.3rem; margin: 0; }
      .ds-q { font-family: var(--font-display); font-style: italic; font-size: 1.1rem; }

      .ds-pick { display: grid; grid-template-columns: minmax(0, 1fr) 18.5rem; gap: 1rem; align-items: start; }
      .ds-card { display: flex; flex-direction: column; gap: 0.55rem; }
      .ds-scn { font-family: var(--font-display); font-size: 1.24rem; line-height: 1.4; min-height: 2.8em; }
      .ds-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
      .ds-choices button { display: flex; flex-direction: column; align-items: flex-start; gap: 0.05rem; text-align: left; padding: 0.3rem 0.6rem; border: 1px solid var(--rule); border-radius: var(--radius); background: var(--paper); color: var(--ink); cursor: pointer; line-height: 1.25; }
      .ds-choices button b { font-size: 0.9rem; }
      .ds-choices button span { font-size: 0.72rem; color: var(--ink-2); }
      .ds-choices button:hover:not(:disabled) { border-color: var(--accent); }
      .ds-choices button:disabled { cursor: default; }
      .ds-choices button.right { border-color: var(--true); background: var(--true-bg); }
      .ds-choices button.wrong { border-color: var(--false); background: var(--false-bg); }
      .ds-choices button.close { border-color: var(--warn); background: var(--warn-bg); }
      .ds-choices button:disabled:not(.right):not(.wrong):not(.close) { opacity: 0.5; }
      .ds-fb { color: var(--ink) !important; display: flex; flex-direction: column; gap: 0.35rem; }
      .ds-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; text-align: center; }
      .ds-tiles div { background: var(--sheet); border: 1px solid var(--rule); border-radius: var(--radius); padding: 0.3rem 0.2rem; }
      .ds-tiles b { display: block; font-family: var(--font-display); font-size: 1.35rem; font-variant-numeric: tabular-nums; }
      .ds-tiles span { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); }
      .ds-deck { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.22rem; margin-top: 0.25rem; }
      .ds-deck i { display: block; aspect-ratio: 1; border-radius: 0.2rem; border: 1px solid var(--rule); background: var(--sheet); }
      .ds-deck i.right { background: var(--true); border-color: var(--true); }
      .ds-deck i.close { background: var(--warn); border-color: var(--warn); }
      .ds-deck i.wrong { background: var(--false); border-color: var(--false); }
      .ds-deck i.cur { outline: 2px solid var(--accent); outline-offset: 1px; }
      .ds-ask { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
      .ds-ask td { padding: 0.1rem 0.3rem; border-bottom: 1px solid var(--rule); vertical-align: top; }
      .ds-ask td:last-child { font-weight: 600; white-space: nowrap; color: var(--accent); text-align: right; }

      .ds-bud-ctl { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.45rem 0.9rem; align-items: center; }
      .ds-n { font-family: var(--font-display); font-size: 1.35rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .ds-bt { width: 100%; border-collapse: collapse; font-size: 0.84rem; background: var(--sheet); }
      .ds-bt th { font-family: var(--font-mono); font-size: 0.66rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); text-align: left; padding: 0.24rem 0.45rem; border-bottom: 1px solid var(--rule); white-space: nowrap; }
      .ds-bt td { padding: 0.2rem 0.45rem; border-bottom: 1px solid var(--rule); vertical-align: middle; white-space: nowrap; }
      .ds-bt td.num { font-family: var(--font-mono); font-size: 0.8rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .ds-bt td.bar { width: 99%; min-width: 7rem; }
      .ds-track { position: relative; height: 0.7rem; border-radius: 0.35rem; background: var(--paper); border: 1px solid var(--rule); }
      .ds-bar { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 0.35rem; min-width: 3px; }
      .ds-bar.fit { background: var(--true); }
      .ds-bar.over { background: var(--warn); }
      .ds-bar.no { background: var(--false); }
      .ds-bline { position: absolute; top: -0.3rem; bottom: -0.3rem; width: 2px; margin-left: -1px; background: var(--ink); }
      .ds-pill { display: inline-block; font-size: 0.72rem; font-weight: 600; border-radius: 0.3rem; padding: 0.02rem 0.4rem; white-space: nowrap; border: 1px solid transparent; }
      .ds-pill.fit { color: var(--true); background: var(--true-bg); }
      .ds-pill.over { color: var(--ink); background: var(--warn-bg); border-color: var(--warn); }
      .ds-pill.no { color: var(--false); background: var(--false-bg); }

      .ds-col { display: grid; grid-template-columns: 20rem minmax(0, 1fr); gap: 1rem; align-items: stretch; min-height: 0; }
      .ds-col-ctl { display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; }
      .ds-col-ctl .btn.sm { justify-content: flex-start; white-space: normal; text-align: left; }
      .ds-col-out { display: flex; flex-direction: column; gap: 0.45rem; min-height: 0; }
      .ds-big { font-family: var(--font-display); font-size: 2.1rem; line-height: 1.05; font-variant-numeric: tabular-nums; }
      .ds-kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.12rem 0.9rem; font-size: 0.82rem; }
      .ds-kv span:nth-child(odd) { color: var(--ink-2); }
      .ds-kv span:nth-child(even) { font-family: var(--font-mono); font-size: 0.8rem; }
      .ds-chart { flex: 1 1 auto; min-height: 7rem; }
      .ds-chart svg { width: 100%; height: 100%; }

      .ds-pipe { display: flex; align-items: stretch; gap: 0.25rem; }
      .ds-pipe .arr { align-self: center; color: var(--ink-3); font-size: 1.1rem; flex: none; }
      .ds-stage { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 0.12rem; align-items: flex-start; text-align: left; padding: 0.45rem 0.55rem; border: 1px solid var(--rule); border-radius: var(--radius); background: var(--sheet); color: var(--ink); cursor: pointer; box-shadow: var(--shadow); }
      .ds-stage .k { font-family: var(--font-mono); font-size: 0.66rem; letter-spacing: 0.06em; color: var(--ink-3); }
      .ds-stage b { font-size: 0.92rem; line-height: 1.2; }
      .ds-stage .t { font-size: 0.72rem; color: var(--ink-2); line-height: 1.25; }
      .ds-stage:hover { border-color: var(--accent); }
      .ds-stage.on { border-color: var(--accent); background: var(--accent-2); }
      .ds-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }

      .ds-skills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(7, auto); grid-auto-flow: column; gap: 0.5rem 1.6rem; }
      .ds-skill { display: grid; grid-template-columns: 1.8rem minmax(0, 1fr); gap: 0.55rem; align-items: start; font-size: 0.88rem; line-height: 1.4; }
      .ds-skill .n { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--accent-2); color: var(--accent); font-family: var(--font-mono); font-weight: 600; font-size: 0.8rem; }
      .ds-skill .ds-mod { margin-left: 0.3rem; font-size: 0.68rem; }

      @media (max-width: 760px) {
        .ds-loop, .ds-pick, .ds-col, .ds-skills { grid-template-columns: minmax(0, 1fr); }
        .ds-skills { grid-auto-flow: row; grid-template-rows: none; }
        .ds-ring { width: 100%; height: auto; display: flex; flex-direction: column; gap: 0.3rem; }
        .ds-ring svg, .ds-ctr { display: none; }
        .ds-node { position: static; transform: none; width: 100%; }
        .ds-pipe { flex-direction: column; }
        .ds-pipe .arr { transform: rotate(90deg); }
        .ds-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .ds-bud-ctl { grid-template-columns: minmax(0, 1fr); }
        .ds-bt td.bar, .ds-bt th.bar { display: none; }
      }`,
    slides: [
      /* ---------------------------------------------------------------- 1 */
      {
        title: 'Design starts with a model',
        kind: 'concept',
        html: String.raw`
          <p class="lead">Professionals rarely start by typing code. First they decide which <span class="term">mathematical model</span> fits the problem, because that choice fixes the algorithms, guarantees and costs available to them. The loop below runs one realistic problem through all seven steps. Click a step, or use <kbd>↓</kbd> and <kbd>↑</kbd>.</p>
          <div class="ds-loop fill"><div class="ds-ring"></div><div class="card ds-step"></div></div>
          <div class="why">A wrong model is the most expensive mistake in software, because everything built on top of it inherits the error. The loop costs minutes on paper and saves days of rewriting. The rest of this studio practices each step on its own.</div>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          const ring = body.querySelector('.ds-ring');
          const card = body.querySelector('.ds-step');
          const W = 300, H = 190, cx = 150, cy = 95, rx = 108, ry = 76, n = LOOP.length;
          const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
          svg.append(s('ellipse', { cx, cy, rx, ry, fill: 'none', stroke: 'var(--rule)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
          for (let k = 0; k < n; k++) {
            // an arrowhead halfway between consecutive steps, pointing clockwise along the ellipse
            const t = ((k + 0.5) * 2 * Math.PI) / n;
            const x = cx + rx * Math.sin(t), y = cy - ry * Math.cos(t);
            const ang = (Math.atan2(ry * Math.sin(t), rx * Math.cos(t)) * 180) / Math.PI;
            svg.append(s('path', { d: 'M -5 -4.5 L 5 0 L -5 4.5 z', fill: k === n - 1 ? 'var(--warn)' : 'var(--accent)', transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})` }));
          }
          ring.append(svg, h('div.ds-ctr', h('div.tiny.mono.muted', 'THE DESIGN LOOP'), h('div.small.muted', 'Measuring sends you back to step 1 whenever reality disagrees with the model.')));
          let cur = 0;
          const nodes = LOOP.map((st, k) => {
            const t = (k * 2 * Math.PI) / n;
            const b = h('button.ds-node', {
              style: { left: `${((cx + rx * Math.sin(t)) / W) * 100}%`, top: `${((cy - ry * Math.cos(t)) / H) * 100}%` },
              'aria-label': `Step ${k + 1}: ${st.name}`, onclick: () => show(k),
            }, h('span.k', String(k + 1)), h('span', st.short));
            ring.append(b);
            return b;
          });
          function show(k) {
            cur = k;
            nodes.forEach((b, j) => { b.classList.toggle('on', j === k); b.setAttribute('aria-pressed', String(j === k)); });
            const st = LOOP[k];
            rc(card,
              h('div.row', h('span.tiny.mono.muted', `STEP ${k + 1} OF ${n}`), h('span.ds-grow'),
                h('button.btn.sm', { onclick: () => show((cur + n - 1) % n), 'aria-label': 'Previous step' }, '← Previous'),
                h('button.btn.sm', { onclick: () => show((cur + 1) % n), 'aria-label': 'Next step' }, 'Next →')),
              h('h3', st.name),
              ctx.rich('p.ds-q', 'Ask: ' + st.q),
              ctx.rich('p', st.do),
              labelled(ctx, 'div.ex.small', st.ex, 'Running example: reject duplicate sign-ups'),
              h('div.row', { style: { gap: '0.4rem' } }, h('span.tiny.mono.muted', 'LEARN IT IN'), modLinks(ctx, st.mods)));
          }
          show(0);
          ctx.keys = (e) => {
            if (e.key === 'ArrowDown') { show((cur + 1) % n); return true; }
            if (e.key === 'ArrowUp') { show((cur + n - 1) % n); return true; }
            return false;
          };
        },
      },
      /* ---------------------------------------------------------------- 2 */
      {
        title: 'Lab: pick the structure',
        kind: 'lab',
        html: String.raw`<p class="muted small">Naming the structure is the first design decision. Read each scenario and pick the model a professional would reach for. Some scenarios have a close second choice, and the feedback explains the difference. The deck is shuffled every time.</p>`,
        render(body, ctx) {
          const { h, rc, R } = ctx;
          let deck = [], i = 0, picks = [];
          const card = h('div.card.ds-card');
          const tiles = h('div.ds-tiles');
          const deckEl = h('div.ds-deck');
          const ask = h('table.ds-ask', h('tbody', ASK.map(([q, id]) => h('tr', h('td', q), h('td', STRUCT[id].name)))));
          body.append(h('div.ds-pick.fill',
            card,
            h('div.stack', tiles,
              h('div', h('div.tiny.mono.muted', 'YOUR DECK'), deckEl),
              h('div.card', { style: { padding: '0.5rem 0.7rem' } }, h('div.tiny.mono.muted', { style: { marginBottom: '0.2rem' } }, 'QUESTIONS THAT PICK THE STRUCTURE'), ask),
              h('button.btn.sm', { onclick: () => start() }, 'Shuffle and restart'))));
          const grade = (j) => {
            const p = picks[j];
            if (p == null) return '';
            return p === deck[j].best ? 'right' : deck[j].alt && deck[j].alt[p] ? 'close' : 'wrong';
          };
          const tile = (v, label) => h('div', h('b', String(v)), h('span', label));
          function start() { deck = R.shuffle(SCENARIOS); i = 0; picks = []; draw(); }
          function draw() {
            const answered = picks.filter((p) => p != null).length;
            const right = deck.filter((sc, j) => picks[j] === sc.best).length;
            let streak = 0;
            for (let j = answered - 1; j >= 0 && grade(j) === 'right'; j--) streak++;
            rc(tiles, tile(right, 'Correct'), tile(answered, 'Answered'), tile(streak, 'Streak'));
            rc(deckEl, deck.map((_, j) => h('i', { class: [grade(j), j === i ? 'cur' : ''].join(' ').trim() || null, title: `Scenario ${j + 1}` })));
            if (i >= deck.length) {
              const missed = {};
              deck.forEach((sc, j) => { if (picks[j] !== sc.best) missed[sc.best] = (missed[sc.best] || 0) + 1; });
              const list = Object.entries(missed).sort((a, b) => b[1] - a[1]);
              rc(card,
                h('div.tiny.mono.muted', 'DECK COMPLETE'),
                h('p.ds-scn', { style: { minHeight: 0 } }, `You matched ${right} of ${deck.length} scenarios with the best model.`),
                list.length
                  ? ctx.rich('p', 'Structures to review: ' + list.map(([id, c]) => `<b>${STRUCT[id].name}</b> (${c} missed)`).join(', ') + '. The questions on the right are the quickest way to spot each one.')
                  : h('p', 'A perfect deck. You can recognize every structure from a plain-language description, which is the skill the rest of design builds on.'),
                h('div.row', h('button.btn.primary', { onclick: () => start() }, 'Shuffle and play again')));
              return;
            }
            const sc = deck[i], picked = picks[i], g = grade(i);
            const choices = h('div.ds-choices', ORDER.map((id) => {
              const b = h('button', { disabled: picked != null, onclick: () => { picks[i] = id; draw(); } }, h('b', STRUCT[id].name), h('span', STRUCT[id].cue));
              if (picked != null) {
                if (id === sc.best) b.classList.add('right');
                else if (id === picked) b.classList.add(g);
              }
              return b;
            }));
            let fb;
            if (picked == null) fb = h('p.small.muted', 'Pick one. You will see the reasoning a professional would give and the module that teaches it.');
            else {
              const best = STRUCT[sc.best];
              let html;
              if (g === 'right') html = `<b>Correct: ${best.name}.</b> ${sc.why}`;
              else if (g === 'close') html = `<b>Close.</b> ${sc.alt[picked]} <b>Best fit: ${best.name}.</b> ${sc.why}`;
              else html = `<b>Not the best fit.</b> ${STRUCT[picked].art} suits problems where ${STRUCT[picked].fits}. <b>Best fit: ${best.name}.</b> ${sc.why}`;
              fb = h('div.feedback.ds-fb.' + (g === 'right' ? 'good' : g === 'close' ? 'info' : 'bad'),
                ctx.rich('div', html),
                h('div.row', { style: { gap: '0.4rem' } }, h('span.tiny.mono.muted', 'LEARN IT IN'), modLink(ctx, sc.mod)));
            }
            rc(card,
              h('div.row', h('span.tiny.mono.muted', `SCENARIO ${i + 1} OF ${deck.length}`), h('span.ds-grow'),
                h('button.btn.primary.sm', { disabled: picked == null, onclick: () => { i++; draw(); } }, i === deck.length - 1 ? 'See your score →' : 'Next scenario →')),
              ctx.rich('p.ds-scn', sc.t),
              h('div.tiny.mono.muted', 'WHICH STRUCTURE MODELS THIS BEST?'),
              choices, fb);
          }
          start();
        },
      },
      /* ---------------------------------------------------------------- 3 */
      {
        title: 'Specify with logic, verify with proof',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <div class="def">A <span class="term">precondition</span> must be true <i>before</i> a function runs (the caller's promise). A <span class="term">postcondition</span> is guaranteed <i>after</i> it returns (the function's promise). An <span class="term">invariant</span> stays true throughout, for example at the start of every loop pass. Together they form the function's <span class="term">contract</span>.</div>
              <div class="thm">A <span class="term">Hoare triple</span> \(\{P\}\ S\ \{Q\}\) says: if \(P\) is true before statement \(S\) runs, and \(S\) finishes, then \(Q\) is true afterwards. Triples chain like links: if \(S_1\) takes \(P\) to \(Q\) and \(S_2\) takes \(Q\) to \(R\), then running them in order takes \(P\) to \(R\), so you can reason about a long program one statement at a time. A loop invariant is a condition the loop body takes back to itself.
                \[\{x \ge 0\}\quad y = x + 1\quad \{y \ge 1\}\]</div>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l"></th><th class="l">Testing</th><th class="l">Proving</th></tr></thead>
                <tbody>
                  <tr><td class="l">Covers</td><td class="l">the inputs you tried</td><td class="l">every input</td></tr>
                  <tr><td class="l">Answers</td><td class="l">"Did it work here?"</td><td class="l">"Can it ever fail?"</td></tr>
                  <tr><td class="l">Cost</td><td class="l">cheap and automatic</td><td class="l">careful thought</td></tr>
                  <tr><td class="l">Use it for</td><td class="l">everything, all the time</td><td class="l">the core: loops and invariants</td></tr>
                </tbody>
              </table>
            </div>
            <div class="stack">
              <div class="card stack" style="gap:0.45rem">
                <h3 style="margin:0">A contract in Python</h3>
                <div class="ds-contract"></div>
                <p class="small">Type hints give the types, the docstring states the contract in words, and each <code>assert</code> checks it while the program runs. For <code>n = 10**30 - 1</code> the float square root rounds up, and the postcondition catches a bug that hand-picked tests would miss.</p>
              </div>
              <div class="warn">Python skips every <code>assert</code> when run as <code>python -O</code>. Use asserts for programmer mistakes such as a broken invariant. Check input from users and files with <code>if</code> and <code>raise ValueError</code>, because that check must always run.</div>
              <div class="ai">Model code often fails silently: a wrong tensor shape broadcasts instead of crashing. Contracts such as "the batch has shape (32, 512)", "the probabilities sum to 1" and "no value is NaN" turn silent errors into loud ones.</div>
            </div>
          </div>`,
        render(body, ctx) {
          const code = [
            'def isqrt(n: int) -> int:',
            '    """Pre: n >= 0. Post: r*r <= n < (r+1)**2."""',
            '    assert n >= 0, "pre"',
            '    r = int(n ** 0.5)        # fast, but floats round',
            '    assert r * r <= n < (r + 1) ** 2, "post"',
            '    return r',
          ];
          body.querySelector('.ds-contract').append(ctx.h('pre.ds-code', { html: code.map(ctx.hlPy).join('\n') }));
        },
      },
      /* ---------------------------------------------------------------- 4 */
      {
        title: 'Code: binary search with its contract checked',
        kind: 'code',
        file: 'binary_search_contract.py',
        html: String.raw`<p class="muted small">The contract from the previous slide, applied to a classic. Each <code>assert</code> is a logical statement the code promises to keep. Switch to <b>Trace</b> and watch <code>lo</code> and <code>hi</code> close in while the invariant holds on every pass.</p>`,
        fivew: {
          what: 'Binary search on a sorted list, with its contract written as executable asserts: a precondition (the list is sorted), a loop invariant (x is never outside the window from lo to hi), and a postcondition (when the function returns −1, x really is absent).',
          why: 'Binary search is famous for subtle bugs. The version in Java\'s standard library carried an overflow bug for about nine years. Writing the invariant down turns "I think it works" into an argument you can check line by line, and the asserts report a violation the moment it happens.',
          who: 'Library authors, database engineers, and anyone writing a loop whose correctness is not obvious. In code review, "what is the invariant?" is the standard question for this kind of loop.',
          where: 'Searching sorted arrays, database indexes, <code>git bisect</code> (a binary search over commits to find the one that introduced a bug), and finding thresholds such as the largest learning rate that still trains.',
          when: 'Use asserts like these while developing and testing. Each one here costs \\(O(n)\\) or more while the search costs \\(O(\\log\\,n)\\), so production code keeps only the cheap ones or runs with <code>python -O</code>.',
        },
        lines: [
          ['def binary_search(a: list[int], x: int) -> int:', String.raw`Defines <code>binary_search</code>. The <b>type hints</b> say <code>a</code> is a list of integers, <code>x</code> is an integer, and the result is an integer (an index, or −1). Python does not enforce hints when the program runs, but editors and checkers such as mypy read them and flag mistakes beforehand. They are the cheapest part of a contract.`],
          ['    assert a == sorted(a), "precondition: a is sorted"', String.raw`The <span class="term">precondition</span> as code: binary search only works on a sorted list, \(a_0 \le a_1 \le \dots \le a_{n-1}\). <code>sorted(a)</code> builds a sorted copy; if it differs from <code>a</code>, <code>assert</code> stops the program with <code>AssertionError: precondition: a is sorted</code>. This check costs \(O(n\,\log\,n)\), far more than the search itself, so it is scaffolding for development and testing.`],
          ['    lo, hi = 0, len(a) - 1', String.raw`Tuple assignment sets both ends of the search window at once. The window \(a[lo..hi]\) starts as the whole list: <code>lo = 0</code> and <code>hi = 9</code> for ten items. Nothing has been excluded yet, so the invariant on line 5 is trivially true.`],
          ['    while lo <= hi:', String.raw`Keep going while the window contains at least one index. When <code>lo &gt; hi</code> the window is empty and the loop stops. Each pass halves the window, so \(n\) items need at most \(\lfloor \log_2\,n \rfloor + 1\) passes: 4 for ten items, 30 for a billion.`],
          ['        assert x not in a[:lo] + a[hi + 1:], "invariant"', String.raw`The <span class="term">loop invariant</span>. <code>a[:lo]</code> is the part left of the window, <code>a[hi + 1:]</code> the part right of it, and <code>+</code> joins the two slices. The assert says <code>x</code> is in neither: if <code>x</code> is in the list at all, it lies inside \(a[lo..hi]\). Showing that it stays true is an induction (Module 3): true at the start, and every pass keeps it true.`],
          ['        mid = (lo + hi) // 2', String.raw`The middle of the window, using <code>//</code> (floor division). First pass: <code>(0 + 9) // 2 = 4</code>. Python integers never overflow, so <code>lo + hi</code> is safe. In Java or C the sum can overflow for huge arrays, which is why those languages write <code>lo + (hi - lo) / 2</code>.`],
          ['        if a[mid] == x:', String.raw`Compare the middle element with the target. Searching for 23, the probes are <code>a[4] = 16</code>, then <code>a[7] = 56</code>, then <code>a[5] = 23</code>.`],
          ['            return mid', String.raw`Found it. The postcondition for this branch, <code>a[mid] == x</code>, holds because the line above just tested it. For 23 the function returns index 5.`],
          ['        if a[mid] < x:', String.raw`The middle value is too small. Because the list is sorted, every element at or left of <code>mid</code> is at most <code>a[mid]</code>, which is less than <code>x</code>, so none of them can equal <code>x</code>.`],
          ['            lo = mid + 1', String.raw`Discard the left half, including <code>mid</code>. The invariant survives because we removed only positions that cannot hold <code>x</code>. The <code>+ 1</code> matters: with <code>lo = mid</code> the window can stop shrinking, and the loop never ends.`],
          ['        else:', String.raw`Otherwise <code>a[mid] &gt; x</code>: the middle value is too big.`],
          ['            hi = mid - 1', String.raw`Discard the right half, including <code>mid</code>, by the mirror-image argument: everything at or right of <code>mid</code> is at least <code>a[mid]</code>, which is greater than <code>x</code>.`],
          ['    assert x not in a, "postcondition: x is absent"', String.raw`The <span class="term">postcondition</span> for "not found". We reach this line only when <code>lo &gt; hi</code>. The invariant says <code>x</code> is not left of <code>lo</code> and not right of <code>hi</code>; with <code>lo &gt; hi</code>, those two regions cover the whole list, so <code>x</code> is absent. This is the standard way to prove a loop correct: the invariant plus the exit condition imply the postcondition.`],
          ['    return -1', String.raw`Signals "not found" with −1. Careful: in Python <code>a[-1]</code> is the <i>last</i> element, so a caller who forgets to check for −1 silently gets a wrong answer. Many Python APIs raise an exception instead; <code>list.index</code> raises <code>ValueError</code>.`],
          ['data = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]', String.raw`A sorted list of ten integers, so the precondition holds. Swap 12 and 16 in Edit mode to watch the precondition assert fire.`],
          ['print(binary_search(data, 23), binary_search(data, 7))', String.raw`Two searches. 23 is found at index 5 after three probes (<code>mid</code> = 4, 7, 5). 7 is absent: the probes are 4, 1 and 2, then <code>lo = 2 &gt; hi = 1</code> ends the loop and the postcondition assert confirms it. Output: <code>5 -1</code>.`],
        ],
        expected: '5 -1\n',
        tryIt: 'Break it on purpose. Change <code>hi = mid - 1</code> to <code>hi = mid - 2</code> and search for <code>12</code> instead of 23: the invariant assert fires on the very pass that skipped the answer. Then restore it, change <code>lo = mid + 1</code> to <code>lo = mid</code>, and run again: the loop never ends, and the page stops it after 10 seconds.',
      },
      /* ---------------------------------------------------------------- 5 */
      {
        title: 'Complexity budgets',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p class="lead">A <span class="term">complexity budget</span> turns Big-O into a yes-or-no question: can this algorithm finish in the time I have?</p>
              <div class="thm">Steps you can afford = steps per second × seconds available. Rough speeds: pure Python manages about \(10^7\) simple steps per second, and compiled code (C, Rust, NumPy) about \(10^9\).</div>
              <ol class="ds-ol">
                <li>Write down the input size \(n\).</li>
                <li>Write down the <span class="term">growth rate</span> \(f(n)\) of each candidate algorithm.</li>
                <li>Compute \(f(n)\) and compare it with the budget.</li>
                <li>If \(f(n)\) exceeds the budget by more than about 1000×, no faster computer will rescue it. Change the algorithm.</li>
              </ol>
              <p class="big-math">\(1 \lt \log\,n \lt n \lt n\,\log\,n \lt n^2 \lt n^3 \lt 2^n \lt n!\)</p>
              <div class="tip">Doubling hardware speed lets an \(O(n)\) algorithm handle \(2n\) items in the same time. It lets an \(O(2^n)\) algorithm handle just \(n + 1\). Better algorithms beat better hardware.</div>
            </div>
            <div class="stack">
              <div class="ex" data-label="10-million-row dataset">\(n = 10^7\). Sorting costs \(n\,\log_2\,n \approx 2.3 \times 10^8\) steps: about 23 seconds in Python. Comparing every pair of rows costs \(n^2 = 10^{14}\) steps: about 116 days.</div>
              <div class="ex" data-label="60-item feature set">Trying every subset of 60 features costs \(2^{60} \approx 1.2 \times 10^{18}\) steps: about 36 years, even in compiled code.</div>
              <div class="ex" data-label="25-city route">Trying every ordering of 25 cities costs \(25! \approx 1.6 \times 10^{25}\) steps: about 490 million years at \(10^9\) steps per second.</div>
              <div class="ai">Transformer attention compares every token with every other token, so its cost grows like \(n^2\) in the context length. Doubling the context from 64,000 to 128,000 tokens quadruples that work, which is why long contexts are expensive and why researchers look for near-linear alternatives.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 6 */
      {
        title: 'Lab: will it finish in time?',
        kind: 'lab',
        html: String.raw`<p class="muted small">Choose an input size, a time budget and a machine, or pick a real scenario. Each row estimates the time an algorithm with that growth rate needs. The bars use a logarithmic time scale from 1 ns to \(10^{18}\) s, and the vertical line marks your budget.</p>`,
        render(body, ctx) {
          const { h, rc } = ctx;
          let n = 1e7, bi = 2, si = 0, pi = 0;
          const nOut = h('span.ds-n');
          const range = h('input', { type: 'range', min: 0, max: 90, step: 1, 'aria-label': 'Input size n, on a logarithmic scale' });
          const num = h('input.inp.mono', { type: 'text', inputmode: 'numeric', 'aria-label': 'Input size n', style: { width: '8.5rem' } });
          range.addEventListener('input', () => { n = Math.max(1, Math.round(10 ** (+range.value / 10))); pi = -1; draw(true); });
          num.addEventListener('input', () => {
            const v = Number(num.value.replace(/[,\s_]/g, ''));
            if (Number.isFinite(v) && v >= 1 && v <= 1e15) { n = Math.floor(v); pi = -1; draw(false); }
          });
          const budSeg = h('div.seg', { role: 'group', 'aria-label': 'Time budget' });
          const spdSeg = h('div.seg', { role: 'group', 'aria-label': 'Machine speed' });
          const presetRow = h('div.row', { style: { gap: '0.3rem' } });
          const summary = h('div');
          const noteText = h('div');
          const tbody = h('tbody');
          const note = h('div.feedback.info', { style: { color: 'var(--ink)', display: 'grid', gap: '0.25rem' } }, summary, noteText);
          BUDGETS.forEach(([lbl], j) => budSeg.append(h('button', { onclick: () => { bi = j; draw(true); } }, lbl)));
          SPEEDS.forEach(([lbl], j) => spdSeg.append(h('button', { onclick: () => { si = j; draw(true); } }, lbl)));
          BUD_PRESETS.forEach((p, j) => presetRow.append(h('button.btn.sm', { onclick: () => { n = p.n; pi = j; draw(true); } }, p.label)));
          body.append(
            h('div.ds-bud-ctl',
              h('span.small.muted', 'Input size'), h('div.row', { style: { flexWrap: 'nowrap' } }, nOut, range), num,
              h('span.small.muted', 'Budget'), h('div.row', budSeg, spdSeg), h('span'),
              h('span.small.muted', 'Scenario'), presetRow, h('span')),
            h('div.card', { style: { padding: '0.4rem 0.6rem' } },
              h('table.ds-bt', h('thead', h('tr', h('th', 'Growth'), h('th', 'Typical job'), h('th', 'Steps f(n)'), h('th', 'Time needed'), h('th.bar', 'Time vs budget (log scale)'), h('th', 'Verdict'), h('th', 'Largest n in budget'))), tbody)),
            note);
          function draw(syncText) {
            const speedLog = SPEEDS[si][1], budget = BUDGETS[bi][1];
            const LB = speedLog + Math.log10(budget);
            nOut.textContent = `n = ${commas(n)}`;
            range.value = String(Math.round(10 * Math.log10(n)));
            if (syncText) num.value = String(n);
            budSeg.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === bi)));
            spdSeg.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === si)));
            presetRow.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === pi));
            const scale = (Ls) => Math.min(100, Math.max(0, ((Ls + 9) / 27) * 100));
            const groups = { fit: [], over: [], no: [] };
            rc(tbody, GROWTH.map((g) => {
              const L = g.L(n), Ls = L - speedLog, r = L - LB;
              const cls = r <= 1e-9 ? 'fit' : r <= 3 ? 'over' : 'no';
              groups[cls].push(g.name);
              const big = largestN(g, LB);
              const bigTxt = big === Infinity ? (g.name === 'O(1)' ? 'any n' : 'any realistic n') : big >= 1e6 ? fmtLog(Math.log10(big)) : commas(big);
              return h('tr',
                h('td', h('b', g.name)),
                h('td.small.muted', g.ex),
                h('td.num', fmtLog(L)),
                h('td.num', fmtTime(Ls)),
                h('td.bar', h('div.ds-track', h('div.ds-bar.' + cls, { style: { width: scale(Ls) + '%' } }), h('div.ds-bline', { style: { left: scale(Math.log10(budget)) + '%' } }))),
                h('td', h('span.ds-pill.' + cls, cls === 'fit' ? 'fits' : cls === 'over' ? 'over budget' : 'hopeless')),
                h('td.num', bigTxt));
            }));
            summary.innerHTML = `Budget: \\(10^{${speedLog}}\\) steps per second × ${BUDGETS[bi][0]} = <b>${fmtLog(LB)} steps</b>. ` +
              `<span class="ok">Fits: ${groups.fit.join(', ') || 'none'}.</span> ` +
              (groups.over.length ? `<span>Over by less than 1000×: ${groups.over.join(', ')}.</span> ` : '') +
              (groups.no.length ? `<span class="bad">Hopeless: ${groups.no.join(', ')}.</span>` : '');
            ctx.tex(summary);
            noteText.textContent = pi >= 0 ? BUD_PRESETS[pi].note
              : 'Custom input size. Green rows fit the budget. Amber rows miss it by less than 1000×, so a faster machine, parallel workers or a smaller n might rescue them. Red rows miss by more than that and need a better algorithm.';
          }
          draw(true);
        },
      },
      /* ---------------------------------------------------------------- 7 */
      {
        title: 'Count before you build',
        kind: 'concept',
        html: String.raw`
          <div class="split">
            <div class="stack">
              <p class="lead">Two numbers decide whether a design survives real data: the size of the search space and the chance of a collision. You can compute both before writing any code.</p>
              <div class="def">The <span class="term">search space</span> is the set of all candidates an algorithm might examine. Counting gives its size: \(k\) independent choices with \(m\) options each give \(m^k\) candidates, the orderings of \(n\) items number \(n!\), and the subsets number \(2^n\).</div>
              <div class="ex">An 8-character password over 62 symbols (a-z, A-Z, 0-9) has \(62^8 \approx 2.2 \times 10^{14}\) possibilities. A GPU rig testing \(10^{10}\) per second tries them all in about 6 hours. At 12 characters there are \(62^{12} \approx 3.2 \times 10^{21}\): about 10,000 years.</div>
              <div class="warn">"One in a million per pair" is not rare overall. Ten thousand items form \(\binom{10000}{2} \approx 5 \times 10^7\) pairs, so expect about 50 matching pairs.</div>
            </div>
            <div class="stack">
              <div class="thm">The <span class="term">birthday bound</span>. Draw \(k\) values uniformly at random from \(N\) possibilities. Then
                \[P(\text{at least one collision}) \approx 1 - e^{-k(k-1)/2N}\]
                and a <span class="term">collision</span> becomes more likely than not once \(k \approx 1.18\sqrt{N}\).</div>
              <p class="small">The square root appears because collisions happen between <i>pairs</i>. \(k\) items form about \(k^2/2\) pairs and each pair matches with probability \(1/N\), so trouble starts as \(k^2/2\) approaches \(N\).</p>
              <table class="tt" style="width:100%">
                <thead><tr><th class="l">ID scheme</th><th>Values \(N\)</th><th>50% collision at</th></tr></thead>
                <tbody>
                  <tr><td class="l">birthdays</td><td>365</td><td>23 people</td></tr>
                  <tr><td class="l">random 6-digit code</td><td>\(10^6\)</td><td>about 1,200</td></tr>
                  <tr><td class="l">random 32-bit ID</td><td>\(2^{32} \approx 4.3 \times 10^9\)</td><td>about 77,000</td></tr>
                  <tr><td class="l">UUID v4 (122 bits)</td><td>\(2^{122} \approx 5.3 \times 10^{36}\)</td><td>about \(2.7 \times 10^{18}\)</td></tr>
                </tbody>
              </table>
              <div class="ai">Feature hashing sends each word to column <code>hash(word) % 2**20</code>, so a model needs no stored vocabulary. With 100,000 distinct words the birthday bound predicts about 4,800 colliding pairs: tolerable for a spam filter, unacceptable for user IDs.</div>
            </div>
          </div>`,
      },
      /* ---------------------------------------------------------------- 8 */
      {
        title: 'Lab: ID collision calculator',
        kind: 'lab',
        html: String.raw`<p class="muted small">How many random IDs can you issue before two match? Describe the IDs by their bits of randomness or by alphabet and length, choose how many you will create, and read the risk. The presets show why UUIDs are safe and 6-digit codes are not.</p>`,
        render(body, ctx) {
          const { h, s, rc } = ctx;
          let mode = 'bits', bits = 32, a = 0, len = 6, k = 1e5, pi = 0;
          const modeSeg = h('div.seg', { role: 'group', 'aria-label': 'Describe the IDs by' },
            h('button', { onclick: () => { mode = 'bits'; pi = -1; draw(true); } }, 'Random bits'),
            h('button', { onclick: () => { mode = 'alpha'; pi = -1; draw(true); } }, 'Alphabet × length'));
          const bitsLbl = h('span'), lenLbl = h('span'), kLbl = h('span');
          const bitsIn = h('input', { type: 'range', min: 8, max: 128, step: 1, 'aria-label': 'Bits of randomness' });
          const alphaSel = h('select.inp', { 'aria-label': 'Alphabet' }, ALPHA.map(([lbl, size], j) => h('option', { value: j }, `${lbl} (${size} symbols)`)));
          const lenIn = h('input', { type: 'range', min: 1, max: 24, step: 1, 'aria-label': 'ID length in characters' });
          const kIn = h('input', { type: 'range', min: 0, max: 120, step: 1, 'aria-label': 'Number of items, on a logarithmic scale' });
          const kNum = h('input.inp.mono', { type: 'text', inputmode: 'numeric', 'aria-label': 'Number of items', style: { width: '100%' } });
          bitsIn.addEventListener('input', () => { bits = +bitsIn.value; pi = -1; draw(true); });
          alphaSel.addEventListener('change', () => { a = +alphaSel.value; pi = -1; draw(true); });
          lenIn.addEventListener('input', () => { len = +lenIn.value; pi = -1; draw(true); });
          kIn.addEventListener('input', () => { k = Math.max(1, Math.round(10 ** (+kIn.value / 10))); pi = -1; draw(true); });
          kNum.addEventListener('input', () => {
            const v = Number(kNum.value.replace(/[,\s_]/g, ''));
            if (Number.isFinite(v) && v >= 1 && v <= 1e15) { k = Math.floor(v); pi = -1; draw(false); }
          });
          const bitsGroup = h('label.field', bitsLbl, bitsIn);
          const alphaGroup = h('div.stack', { style: { gap: '0.35rem' } }, h('label.field', 'Alphabet', alphaSel), h('label.field', lenLbl, lenIn));
          const presets = h('div.stack', { style: { gap: '0.25rem' } }, COL_PRESETS.map((p, j) => h('button.btn.sm', {
            onclick: () => { mode = p.mode; if (p.mode === 'bits') bits = p.bits; else { a = p.a; len = p.len; } k = p.k; pi = j; draw(true); },
          }, p.label)));
          const big = h('div.ds-big');
          const sub = h('div.small.muted');
          const kv = h('div.ds-kv');
          const verdict = h('div.feedback');
          const note = h('p.small');
          const chart = h('div.ds-chart.figure');
          body.append(h('div.ds-col.fill',
            h('div.ds-col-ctl', h('label.field', 'Describe the IDs by', modeSeg), bitsGroup, alphaGroup, h('label.field', kLbl, kIn, kNum), h('div.tiny.mono.muted', 'PRESETS'), presets),
            h('div.card.ds-col-out', h('div', big, sub), kv, verdict, note, chart)));

          function draw(syncText) {
            const log2N = mode === 'bits' ? bits : len * Math.log2(ALPHA[a][1]);
            const N = 2 ** log2N, log10N = log2N * Math.log10(2);
            modeSeg.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String((j === 0) === (mode === 'bits'))));
            bitsGroup.hidden = mode !== 'bits';
            alphaGroup.hidden = mode === 'bits';
            bitsIn.value = String(bits);
            lenIn.value = String(len);
            alphaSel.value = String(a);
            kIn.value = String(Math.round(10 * Math.log10(k)));
            if (syncText) kNum.value = String(k);
            bitsLbl.textContent = `Bits of randomness: ${bits}`;
            lenLbl.textContent = `Length: ${len} character${len === 1 ? '' : 's'}`;
            kLbl.textContent = `Items created: k = ${commas(k)}`;
            presets.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === pi));

            // probability of at least one collision: exact product when cheap, birthday approximation otherwise
            const pairsLog = k > 1 ? Math.log10(k) + Math.log10(k - 1) - Math.log10(2) : -Infinity;
            const xLog = pairsLog - log10N; // log10 of the expected number of colliding pairs
            let P, PLog, method;
            if (k > N) { P = 1; PLog = 0; method = 'certain (pigeonhole principle)'; }
            else if (N <= 1e15 && k <= 2e5) {
              let sum = 0;
              for (let i = 1; i < k; i++) sum += Math.log1p(-i / N);
              P = -Math.expm1(sum); PLog = Math.log10(P); method = 'exact product of (1 − i/N)';
            } else if (xLog < -12) { PLog = xLog; P = 10 ** xLog; method = 'birthday bound, P ≈ k(k−1)/2N'; }
            else { P = -Math.expm1(-(10 ** xLog)); PLog = Math.log10(P); method = 'birthday bound, 1 − e^(−k(k−1)/2N)'; }
            if (k < 2) { P = 0; PLog = -Infinity; method = 'one item cannot collide'; }

            let pTxt;
            if (P === 0) pTxt = '0%';
            else if (P === 1 && k > N) pTxt = '100%';
            else if (P > 0.99999) pTxt = '> 99.999%';
            else if (P >= 0.001) pTxt = (P * 100).toFixed(P >= 0.1 ? 1 : 2) + '%';
            else pTxt = fmtLogSmall(PLog);
            big.textContent = pTxt;
            sub.textContent = P === 0 ? 'chance of at least one collision' : P < 0.5 ? `chance of at least one collision, about 1 in ${fmtLog(-PLog)}` : 'chance of at least one collision';

            const k50 = 1.1774 * Math.sqrt(N), k1m = Math.sqrt(2 * N * 1e-6);
            const nTxt = mode === 'bits' ? `2${sup(bits)} ≈ ${fmtLog(log10N)}` : `${ALPHA[a][1]}${sup(len)} ≈ ${fmtLog(log10N)} (${log2N.toFixed(1)} bits)`;
            const expTxt = !Number.isFinite(xLog) ? '0' : xLog < -3 ? fmtLogSmall(xLog) : (10 ** xLog).toPrecision(3);
            const kTxt = (v) => (v < 1e6 ? commas(v) : fmtLog(Math.log10(v)));
            rc(kv,
              h('span', 'Possible IDs N'), h('span', nTxt),
              h('span', 'Pairs of items'), h('span', k > 1 ? `C(k, 2) = ${pairsLog < 6 ? commas(10 ** pairsLog) : fmtLog(pairsLog)}` : 'none'),
              h('span', 'Expected colliding pairs'), h('span', expTxt),
              h('span', '50% risk at'), h('span', k50 < 2 ? 'k = 2 (already above it)' : `k ≈ ${kTxt(k50)}`),
              h('span', '1-in-a-million risk at'), h('span', k1m < 2 ? 'k = 2 (already above it)' : `k ≈ ${kTxt(k1m)}`),
              h('span', 'Method'), h('span', method));

            let vCls, vTxt;
            if (k > N && k >= 2) { vCls = 'bad'; vTxt = `Guaranteed: ${commas(k)} items but only ${fmtLog(log10N)} possible IDs, so by the pigeonhole principle two items must share one.`; }
            else if (P >= 0.5) { vCls = 'bad'; vTxt = 'A collision is more likely than not. Use more bits, or check every new ID for duplicates and retry.'; }
            else if (P >= 1e-3) { vCls = 'bad'; vTxt = 'Collisions are a real risk at this scale. Check new IDs for duplicates and retry, or use more bits.'; }
            else if (P >= 1e-9) { vCls = 'info'; vTxt = 'Unlikely at this scale. Over the life of a system it could still happen, so keep a uniqueness check as a backstop.'; }
            else { vCls = 'good'; vTxt = 'Negligible. You can treat these IDs as unique; a database uniqueness constraint still costs little and catches bugs.'; }
            verdict.className = 'feedback ' + vCls;
            verdict.style.color = 'var(--ink)';
            verdict.textContent = vTxt;
            note.textContent = pi >= 0 ? COL_PRESETS[pi].note : 'Custom scheme. Move k across the dashed line on the chart: the risk climbs from negligible to near-certain within a factor of about 100 in k.';
            drawChart(N, k, P, k50);
          }

          function drawChart(N, kNow, PNow, k50) {
            const W = 520, H = 190, L = 44, Rr = 14, T = 12, B = 30;
            const xmax = Math.max(2, Math.ceil(Math.max(Math.log10(Math.max(kNow, 1)), Math.log10(Math.max(k50, 1))) + 1));
            const X = (lk) => L + (lk / xmax) * (W - L - Rr);
            const Y = (p) => T + (1 - p) * (H - T - B);
            const prob = (kk) => (kk > N ? 1 : Math.max(0, -Math.expm1((-kk * (kk - 1)) / (2 * N))));
            const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Collision probability as the number of items grows' });
            for (const p of [0, 0.5, 1]) {
              svg.append(s('line', { x1: L, x2: W - Rr, y1: Y(p), y2: Y(p), stroke: 'var(--rule)', 'stroke-width': 1 }));
              svg.append(s('text', { x: L - 6, y: Y(p) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--ink-3)', text: `${p * 100}%` }));
            }
            const step = xmax <= 12 ? 1 : Math.ceil(xmax / 10);
            for (let d = 0; d <= xmax; d += step) {
              svg.append(s('line', { x1: X(d), x2: X(d), y1: H - B, y2: H - B + 4, stroke: 'var(--ink-3)', 'stroke-width': 1 }));
              svg.append(s('text', { x: X(d), y: H - B + 15, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink-3)', text: xmax <= 12 ? SHORT_K[d] : '10' + sup(d) }));
            }
            svg.append(s('text', { x: W - Rr, y: H - 2, 'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--ink-3)', text: 'items k (log scale)' }));
            let d = '';
            for (let i = 0; i <= 180; i++) { const lk = (i / 180) * xmax; d += (i ? 'L' : 'M') + X(lk).toFixed(1) + ',' + Y(prob(10 ** lk)).toFixed(1); }
            svg.append(s('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }));
            if (k50 >= 1) {
              const x50 = X(Math.log10(k50));
              svg.append(s('line', { x1: x50, x2: x50, y1: T, y2: H - B, stroke: 'var(--ink-3)', 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
              svg.append(s('text', { x: x50 + (x50 > W * 0.7 ? -5 : 5), y: T + 10, 'text-anchor': x50 > W * 0.7 ? 'end' : 'start', 'font-size': 10.5, fill: 'var(--ink-2)', text: '50% point' }));
            }
            const xk = X(Math.log10(Math.max(kNow, 1))), yk = Y(Math.min(1, Math.max(0, PNow)));
            svg.append(s('line', { x1: xk, x2: xk, y1: yk, y2: H - B, stroke: 'var(--false)', 'stroke-width': 1.5 }));
            svg.append(s('circle', { cx: xk, cy: yk, r: 5.5, fill: 'var(--false)', stroke: 'var(--sheet)', 'stroke-width': 2 }));
            rc(chart, svg);
          }
          draw(true);
        },
      },
      /* ---------------------------------------------------------------- 9 */
      {
        title: 'Code: test a fast algorithm against an oracle',
        kind: 'code',
        file: 'oracle_check.py',
        html: String.raw`<p class="muted small">A <span class="term">test oracle</span> is a slow implementation you trust because its code is the definition. <span class="term">Property-based testing</span> runs the fast and slow versions on hundreds of random inputs and requires them to agree. A fixed <span class="term">seed</span> makes every run test the same inputs.</p>`,
        fivew: {
          what: 'Generates 500 random pairs of integers, computes the gcd of each pair twice (with Euclid\'s fast algorithm and with a brute-force search) and requires the answers to agree.',
          why: 'Hand-picked tests cover the cases you thought of, and bugs live in the cases you did not. Random inputs explore the space for you, and a brute-force oracle is easy to trust because its code is just the definition of gcd.',
          who: 'Library and compiler developers, and anyone optimizing code: after making something fast, check that it still matches the slow version. The Python library hypothesis automates this and shrinks any failure to the smallest counterexample.',
          where: 'Testing sorting and search routines, parsers (parse then print should give back the input), numeric code, and machine-learning preprocessing (tokenize then decode should return the original text).',
          when: 'Whenever a fast implementation replaces a simple one, or whenever a property ("the output is sorted", "decode(encode(s)) == s") is easier to state than a list of expected outputs.',
        },
        lines: [
          ['import random', String.raw`Loads Python's standard module for pseudo-random numbers. Property-based checking at this scale needs nothing else; the third-party library hypothesis does the same job at industrial scale.`],
          ['', ''],
          ['def gcd_fast(a, b):', String.raw`The fast implementation we want to trust: Euclid's algorithm (Module 6). It needs only \(O(\log\,\min(a, b))\) passes, so it handles 100-digit numbers instantly.`],
          ['    while b:', String.raw`Repeat while <code>b</code> is not zero; a nonzero integer counts as true. The loop relies on the fact \(\gcd(a, 0) = a\).`],
          ['        a, b = b, a % b', String.raw`The key identity \(\gcd(a, b) = \gcd(b,\ a \bmod b)\). Python evaluates the whole right side first, so both variables update together. For the first random pair, (82, 15), the pairs go (15, 7), (7, 1), (1, 0).`],
          ['    return a', String.raw`When <code>b</code> reaches 0, <code>a</code> holds the gcd. For (82, 15) that is 1.`],
          ['', ''],
          ['def gcd_oracle(a, b):', String.raw`The <span class="term">test oracle</span>: slow, but correct by definition. Its two lines do exactly what the words "greatest common divisor" say, which is why it is easy to trust.`],
          ['    divs = [d for d in range(1, a + 1) if a % d == 0]', String.raw`Lists every divisor of <code>a</code> by trying each candidate from 1 to <code>a</code>: <code>a % d == 0</code> means <code>d</code> divides <code>a</code> evenly. For <code>a = 82</code> the list is <code>[1, 2, 41, 82]</code>. This is \(O(a)\) work, hopeless for 20-digit numbers and fine up to 100.`],
          ['    return max(d for d in divs if b % d == 0)', String.raw`Keeps the divisors of <code>a</code> that also divide <code>b</code> (the common divisors) and returns the greatest. The code reads exactly like the definition, "the greatest common divisor", which is the whole reason to trust it. For (82, 15) only 1 divides both, so the oracle also says 1.`],
          ['', ''],
          ['random.seed(42)', String.raw`Fixes the starting point of the generator, so every run tests the same 500 pairs, on your machine and on anyone else's. If a check fails, rerunning reproduces the failure exactly, and that is what makes it debuggable.`],
          ['for trial in range(1, 501):', String.raw`500 trials, numbered 1 to 500. Hundreds of random cases cover far more of the input space than a handful picked by hand.`],
          ['    a, b = random.randint(1, 100), random.randint(1, 100)', String.raw`Draws a random pair between 1 and 100, both ends included. The first pair is (82, 15). Small inputs keep the oracle fast, and they are where the edge cases live: 1, equal numbers, one number dividing the other.`],
          ['    assert gcd_fast(a, b) == gcd_oracle(a, b), (a, b)', String.raw`The property under test: both implementations agree. If they ever differ, <code>assert</code> raises <code>AssertionError</code> with the pair as its message, so the failing input is printed for you to debug.`],
          ['print("all", trial, "pairs agree; last pair:", (a, b))', String.raw`Runs only if all 500 checks passed, because a failed assert would have stopped the program. It also shows the final pair, (30, 47), so you can check one case by hand: 47 is prime and does not divide 30, so both versions said 1. Output: <code>all 500 pairs agree; last pair: (30, 47)</code>.`],
        ],
        expected: 'all 500 pairs agree; last pair: (30, 47)\n',
        tryIt: 'Plant a bug: change <code>while b:</code> to <code>while b &gt; 1:</code> and run. The assert fails and prints the first counterexample pair. Then restore the line and count the pairs whose gcd is 1: roughly 60% of random pairs are coprime, close to the famous limit \\(6/\\pi^2 \\approx 0.608\\).',
      },
      /* ---------------------------------------------------------------- 10 */
      {
        title: 'Design practice: eight habits for every project',
        kind: 'design',
        html: String.raw`<p class="muted small">Every module had its own design slide. These eight habits cut across all of them, and each one is a piece of discrete mathematics turned into a working rule. Click a principle (or use <kbd>↓</kbd>) to compare code to avoid with code to write.</p>`,
        principles: [
          {
            name: 'Model before you code',
            html: '<p>Name the mathematical structure before writing loops. Once you say "this is a directed graph", decades of algorithms become available: breadth-first search for reachability, topological sort for ordering, Dijkstra for shortest paths. Code written straight from raw rows usually reinvents a slower, buggier version of one of them.</p><p>Ask two questions: what are the objects, and what are the relationships between them? (Modules 1, 4, 9, 10 and 11.)</p>',
            bad: '# who can reach whom? nested scans over raw rows\nfor a, b in rows:\n    for c, d in rows:\n        if b == c:\n            pairs.add((a, d))   # only 2 hops, O(n^2)',
            good: 'graph = defaultdict(set)      # model: directed graph\nfor src, dst in rows:\n    graph[src].add(dst)\nreach = bfs(graph, start)     # every hop, O(V + E)',
          },
          {
            name: 'Make invalid states unrepresentable',
            html: '<p>Type hints do not validate inputs. <code>__post_init__</code> checks them; <code>object.__setattr__</code> finishes initialization. Frozen fields and a <code>frozenset</code> prevent later edits.</p>',
            bad: 'order = {"status": "shiped", "tags": ["vip", "vip"]}',
            good: 'from dataclasses import dataclass\nfrom enum import Enum\nStatus = Enum("Status", "PENDING SHIPPED DELIVERED")\n@dataclass(frozen=True)\nclass Order:\n    status: Status\n    tags: frozenset[str]\n    def __post_init__(self):\n        if not isinstance(self.status, Status):\n            raise ValueError("invalid status")\n        tags = frozenset(self.tags)\n        if not all(isinstance(t, str) for t in tags):\n            raise ValueError("tags must be strings")\n        object.__setattr__(self, "tags", tags)',
          },
          {
            name: 'Write pure functions',
            html: '<p>A <span class="term">pure function</span> is a mathematical function (Module 4): its output depends only on its inputs, and it changes nothing else. Pure functions are easy to test (no setup), safe to cache (same input, same output), safe to run in parallel, and easy to reason about, because you can replace a call by its value.</p><p>Push side effects such as printing, files and databases to the edges of the program.</p>',
            bad: 'seen = set()\ndef is_new(email):            # answer depends on history\n    new = email not in seen\n    seen.add(email)           # hidden side effect\n    return new',
            good: 'def accept(seen: frozenset, email: str):\n    # pure: returns the decision and the new state\n    return email not in seen, seen | {email}',
          },
          {
            name: 'State invariants and check them',
            html: '<p>An invariant is a fact your code promises to keep true. Write it down, then make the code check it: in the constructor of a class, at the top of a loop during development, or in a test.</p><p>Use <code>assert</code> for programmer mistakes, since <code>python -O</code> switches asserts off. Raise an exception for bad input from users or files, because that check must always run.</p>',
            bad: 'class Probability:\n    def __init__(self, p):\n        self.p = p        # "should be between 0 and 1"',
            good: '@dataclass(frozen=True)\nclass Probability:\n    p: float\n    def __post_init__(self):    # invariant: 0 <= p <= 1\n        if not 0 <= self.p <= 1:\n            raise ValueError(f"not a probability: {self.p}")',
          },
          {
            name: 'Choose the algorithm by its growth rate',
            html: '<p>For large inputs the growth rate dominates everything else: language, hardware, clever micro-optimizations. Before choosing an approach, write down \\(n\\) and the Big-O of each candidate and compare them with your budget, as in the complexity-budget lab (Modules 5 and 8).</p><p>Often the fix is a better data structure: a set instead of a list turns an \\(O(n \\cdot m)\\) loop into \\(O(n + m)\\).</p>',
            bad: 'common = [x for x in a if x in b]    # b is a list\n# n = m = 100,000: 10^10 steps, about 17 minutes',
            good: 'b_set = set(b)                         # O(m), once\ncommon = [x for x in a if x in b_set]  # O(n)\n# 2 x 10^5 steps: a few hundredths of a second',
          },
          {
            name: 'Estimate before you enumerate',
            html: '<p>Brute force is the right first idea and the wrong final one, unless the search space is small. Count it first with the product rule, permutations or \\(2^n\\) (Module 7), divide by the speed of your machine, and enumerate only if the answer is seconds.</p><p>Otherwise use dynamic programming, pruning, or a heuristic whose quality you can measure.</p>',
            bad: 'best = min(permutations(cities), key=length)\n# 20 cities: 2.4 x 10^18 orders. It never finishes.',
            good: 'space = math.factorial(len(cities))\nif space <= 10**8:                   # about 10 s\n    best = min(permutations(cities), key=length)\nelse:\n    best = two_opt(greedy_route(cities))  # heuristic',
          },
          {
            name: 'Test against a brute-force oracle',
            html: '<p>A slow implementation that follows the definition is easy to trust. Run it side by side with your fast one on hundreds of random small inputs and assert that they agree, as in the oracle walkthrough. This is <span class="term">property-based testing</span>.</p><p>Small inputs keep the oracle fast, and they are exactly where edge cases live: empty lists, one element, duplicates, zeros.</p>',
            bad: 'assert fast_sort([3, 1, 2]) == [1, 2, 3]\n# one hand-picked case; empty lists never tried',
            good: 'for _ in range(1000):\n    n = random.randint(0, 8)\n    xs = [random.randint(0, 5) for _ in range(n)]\n    assert fast_sort(xs) == sorted(xs), xs',
          },
          {
            name: 'Make randomness reproducible and quantify uncertainty',
            html: '<p>Random choices (data splits, sampling, initial weights) make results vary from run to run. Seed a local generator so anyone can reproduce a run exactly. Then repeat with several samples or seeds and report the mean and the spread, instead of one lucky number (Module 13).</p><p>A difference smaller than the spread is not evidence that one model is better.</p>',
            bad: 'acc = evaluate(model, random.sample(data, 100))\nprint("accuracy:", acc)      # 0.83? 0.79? cannot rerun',
            good: 'rng = random.Random(2026)           # seeded and local\naccs = [evaluate(model, rng.sample(data, 100))\n        for _ in range(20)]\nm, s = statistics.mean(accs), statistics.stdev(accs)\nprint(f"accuracy {m:.3f} ± {s:.3f} over 20 samples")',
          },
        ],
      },
      /* ---------------------------------------------------------------- 11 */
      {
        title: 'Discrete math inside an AI system',
        kind: 'concept',
        html: String.raw`<p class="lead" style="font-size:1.04rem">Every stage of a modern AI system runs on structures from this course. Click a stage (or use <kbd>↓</kbd> and <kbd>↑</kbd>) to see which ones, a concrete example, and the design check a careful engineer runs at that point.</p>`,
        render(body, ctx) {
          const { h, rc } = ctx;
          let cur = 0;
          const pipe = h('div.ds-pipe', { role: 'tablist', 'aria-label': 'Stages of an AI system' });
          const detail = h('div.fill', { style: { minHeight: 0 } });
          const btns = PIPE.map((st, i) => h('button.ds-stage', { role: 'tab', onclick: () => show(i) },
            h('span.k', `STAGE ${i + 1}`), h('b', st.name), h('span.t', st.short)));
          btns.forEach((b, i) => { if (i) pipe.append(h('span.arr', { 'aria-hidden': 'true' }, '→')); pipe.append(b); });
          body.append(pipe, detail, ctx.rich('div.why', 'When an AI system misbehaves, the cause is often a discrete mistake: test data leaked into training (sets), a tokenizer paired with the wrong vocabulary (functions), a mask built from the wrong relation (Boolean logic), or a run nobody can reproduce (probability). The mathematics of this course is how you find and prevent them.'));
          function show(i) {
            cur = i;
            btns.forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); });
            const st = PIPE[i];
            rc(detail, h('div.split', { style: { alignItems: 'start' } },
              h('div.stack', h('h3', { style: { fontSize: '1.25rem' } }, `${i + 1}. ${st.name}`), ctx.rich('p', st.what), labelled(ctx, 'div.ex', st.ex, 'Concrete example')),
              h('div.stack',
                h('div.card.stack', { style: { gap: '0.45rem' } },
                  h('div.tiny.mono.muted', 'DISCRETE STRUCTURES AT WORK'), h('div.ds-chips', st.tags.map((t) => h('span.chip', t))),
                  h('div.tiny.mono.muted', 'LEARN THEM IN'), modLinks(ctx, st.mods)),
                labelled(ctx, 'div.tip', st.check, 'Design check'))));
          }
          show(0);
          ctx.keys = (e) => {
            if (e.key === 'ArrowDown') { show((cur + 1) % PIPE.length); return true; }
            if (e.key === 'ArrowUp') { show((cur + PIPE.length - 1) % PIPE.length); return true; }
            return false;
          };
        },
      },
      /* ---------------------------------------------------------------- 12 */
      {
        title: 'Practice: cumulative review',
        kind: 'practice',
        html: String.raw`<p class="muted small">A mixed review of the whole course. Each problem type draws on several modules, and every worked solution names the module to revisit. Probabilities can be typed as fractions such as 5/36.</p>`,
        gens: [
          {
            label: 'Sets and logic',
            make(R, M) {
              const tex = (arr) => (arr.length ? '\\{' + arr.join(', ') + '\\}' : '\\varnothing');
              if (R.chance(0.5)) {
                const U = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                const A = M.sortNum(R.sample(U, R.int(3, 5)));
                const B = M.sortNum(R.sample(U, R.int(3, 5)));
                const ops = [
                  ['\\cup', (x) => A.includes(x) || B.includes(x), 'in A, in B, or in both'],
                  ['\\cap', (x) => A.includes(x) && B.includes(x), 'in both A and B'],
                  ['-', (x) => A.includes(x) && !B.includes(x), 'in A but not in B'],
                  ['\\Delta', (x) => A.includes(x) !== B.includes(x), 'in exactly one of the two sets'],
                ];
                const [sym, fn, words] = R.pick(ops);
                const ans = U.filter(fn);
                return {
                  prompt: String.raw`<b>Sets.</b> Let \(A = ${tex(A)}\) and \(B = ${tex(B)}\). Find \(A ${sym} B\).`,
                  answer: ans, format: 'set', placeholder: 'for example {1, 2, 3}',
                  solution: String.raw`Keep every element that is ${words}: \(A ${sym} B = ${tex(ans)}\). Revisit Module 1 (Sets) if this felt shaky.`,
                };
              }
              const facts = [['12 is divisible by 3', true], ['15 is even', false], ['2 is prime', true], ['9 is prime', false], ['7 is greater than 4', true], ['5 + 5 = 11', false], ['the empty set has no elements', true], ['every integer is positive', false]];
              const [[ps, pv], [qs, qv]] = R.sample(facts, 2);
              const T = (v) => (v ? 'true' : 'false');
              const forms = [
                ['p \\to q', !pv || qv, String.raw`A conditional \(p \to q\) is false only when \(p\) is true and \(q\) is false.`],
                ['q \\to p', !qv || pv, String.raw`The converse \(q \to p\) is false only when \(q\) is true and \(p\) is false.`],
                ['p \\land q', pv && qv, String.raw`\(p \land q\) is true only when both parts are true.`],
                ['p \\lor q', pv || qv, String.raw`\(p \lor q\) is true when at least one part is true.`],
                ['p \\leftrightarrow q', pv === qv, String.raw`\(p \leftrightarrow q\) is true exactly when both parts have the same truth value.`],
                ['\\lnot p \\to q', pv || qv, String.raw`First negate: \(\lnot p\) is ${T(!pv)}. A conditional is false only when its hypothesis is true and its conclusion is false.`],
              ];
              const [f, v, rule] = R.pick(forms);
              return {
                prompt: String.raw`<b>Logic.</b> Let \(p\) be "${ps}" and \(q\) be "${qs}". Is \(${f}\) true or false?`,
                options: ['True', 'False'], answer: v ? 'True' : 'False',
                solution: String.raw`\(p\) is ${T(pv)} and \(q\) is ${T(qv)}. ${rule} So \(${f}\) is <b>${T(v)}</b>. Module 2 (Logic) covers every connective.`,
              };
            },
          },
          {
            label: 'Counting and probability',
            make(R, M) {
              const kind = R.int(0, 5);
              const fracTex = (num, den) => { const f = M.frac(num, den); return f.d === den ? `${num}/${den}` : `${num}/${den} = ${f.n}/${f.d}`; };
              if (kind === 0) {
                const n = R.int(6, 15), k = R.int(2, 5);
                return {
                  prompt: `<b>Counting.</b> In how many ways can you choose a ${k}-person team from ${n} candidates? Order does not matter.`,
                  answer: M.C(n, k),
                  solution: String.raw`A team is a ${k}-element subset, so count combinations: \(\binom{${n}}{${k}} = \dfrac{${n}!}{${k}!\,${n - k}!} = ${M.C(n, k)}\). (Module 7)`,
                };
              }
              if (kind === 1) {
                const n = R.int(5, 10), k = R.int(2, 4);
                const factors = Array.from({ length: k }, (_, j) => n - j).join(' \\cdot ');
                return {
                  prompt: `<b>Counting.</b> ${n} runners finish a race with no ties. In how many ways can the first ${k} places be filled?`,
                  answer: M.P(n, k),
                  solution: String.raw`Order matters, so count arrangements: ${n} choices for first place, ${n - 1} for second, and so on. \(P(${n}, ${k}) = ${factors} = ${M.P(n, k)}\). (Module 7)`,
                };
              }
              if (kind === 2) {
                const n = R.int(4, 10), k = R.int(1, n - 1);
                return {
                  prompt: String.raw`<b>Binomial theorem.</b> What is the coefficient of \(x^{${k}}\) in the expansion of \((1 + x)^{${n}}\)?`,
                  answer: M.C(n, k),
                  solution: String.raw`By the binomial theorem, \((1 + x)^{${n}} = \sum_{j=0}^{${n}} \binom{${n}}{j} x^j\), so the coefficient of \(x^{${k}}\) is \(\binom{${n}}{${k}} = ${M.C(n, k)}\). It counts the ways to pick \(x\) from ${k} of the ${n} factors. (Module 7)`,
                };
              }
              if (kind === 3) {
                const sum = R.int(2, 12), ways = 6 - Math.abs(sum - 7);
                const pairs = [];
                for (let d1 = 1; d1 <= 6; d1++) { const d2 = sum - d1; if (d2 >= 1 && d2 <= 6) pairs.push(`(${d1}, ${d2})`); }
                return {
                  prompt: `<b>Probability.</b> Two fair six-sided dice are rolled. What is the probability that the total is ${sum}?`,
                  answer: ways / 36, tol: 0.001, placeholder: 'a fraction such as 5/36',
                  solution: String.raw`All 36 ordered outcomes are equally likely. The total is ${sum} for ${ways} of them: ${pairs.join(', ')}. So the probability is \(${fracTex(ways, 36)} \approx ${(ways / 36).toFixed(3)}\). (Module 13)`,
                };
              }
              if (kind === 4) {
                const n = R.int(3, 6), k = R.int(0, n), c = M.C(n, k), tot = 2 ** n;
                return {
                  prompt: `<b>Probability.</b> A fair coin is flipped ${n} times. What is the probability of exactly ${k} head${k === 1 ? '' : 's'}?`,
                  answer: c / tot, tol: 0.001, placeholder: 'a fraction such as 3/8',
                  solution: String.raw`All \(2^{${n}} = ${tot}\) sequences are equally likely, and \(\binom{${n}}{${k}} = ${c}\) of them have exactly ${k} head${k === 1 ? '' : 's'} (choose which flips land heads). So the probability is \(${fracTex(c, tot)} \approx ${(c / tot).toFixed(3)}\). (Modules 7 and 13)`,
                };
              }
              const n = R.int(2, 6), tot = 2 ** n;
              return {
                prompt: `<b>Probability.</b> A fair coin is flipped ${n} times. What is the probability of at least one head?`,
                answer: 1 - 1 / tot, tol: 0.001, placeholder: 'a fraction such as 7/8',
                solution: String.raw`Use the complement. The only sequence with no heads is all tails, with probability \(1/2^{${n}} = 1/${tot}\). So \(P(\text{at least one head}) = 1 - 1/${tot} = ${tot - 1}/${tot} \approx ${(1 - 1 / tot).toFixed(3)}\). (Module 13)`,
              };
            },
          },
          {
            label: 'Integers: gcd and mod',
            make(R, M) {
              const kind = R.int(0, 3);
              if (kind === 0) {
                const g = R.int(2, 12);
                const x = R.int(2, 15);
                let y = R.int(2, 15);
                if (y === x) y += 1;
                let a = g * x, b = g * y;
                if (a < b) [a, b] = [b, a];
                const steps = [];
                for (let p = a, q = b; q; [p, q] = [q, p % q]) steps.push(String.raw`\(${p} = ${Math.floor(p / q)} \cdot ${q} + ${p % q}\)`);
                return {
                  prompt: String.raw`<b>Number theory.</b> Find \(\gcd(${a}, ${b})\).`,
                  answer: M.gcd(a, b),
                  solution: String.raw`Euclid's algorithm replaces \((a, b)\) by \((b,\ a \bmod b)\) until the remainder is 0: ${steps.join('; ')}. The last nonzero remainder is the gcd, \(${M.gcd(a, b)}\). (Module 6)`,
                };
              }
              if (kind === 1) {
                const n = R.int(3, 12);
                let a = R.int(-60, 99);
                if (a === 0) a = -17;
                const r = M.mod(a, n), q = Math.floor(a / n);
                return {
                  prompt: String.raw`<b>Number theory.</b> Compute \(${a} \bmod ${n}\), the remainder in \(\{0, 1, \dots, ${n - 1}\}\). This is what Python's <code>${a} % ${n}</code> returns.`,
                  answer: r,
                  solution: String.raw`Write \(${a} = (${q}) \cdot ${n} + ${r}\) with \(0 \le ${r} \lt ${n}\).${a < 0 ? ` For a negative number the quotient rounds down, to \(${q}\), so the remainder stays non-negative.` : ''} So \(${a} \bmod ${n} = ${r}\). (Module 6)`,
                };
              }
              if (kind === 2) {
                const n = R.int(5, 13), a = R.int(12, 99), b = R.int(12, 99);
                const ra = a % n, rb = b % n, ans = (a * b) % n;
                return {
                  prompt: String.raw`<b>Number theory.</b> Compute \((${a} \cdot ${b}) \bmod ${n}\). Try reducing before you multiply.`,
                  answer: ans,
                  solution: String.raw`Reduce first: \(${a} \bmod ${n} = ${ra}\) and \(${b} \bmod ${n} = ${rb}\). Then \(${ra} \cdot ${rb} = ${ra * rb}\), and \(${ra * rb} \bmod ${n} = ${ans}\). Reducing at every step keeps numbers small, which is how hash functions and cryptography handle huge values. (Module 6)`,
                };
              }
              const base = R.int(2, 9), e = R.int(3, 6), n = R.int(5, 13);
              const pw = [];
              let v = 1;
              for (let i = 1; i <= e; i++) { v = (v * base) % n; pw.push(String.raw`\(${base}^{${i}} \equiv ${v}\)`); }
              return {
                prompt: String.raw`<b>Number theory.</b> Compute \(${base}^{${e}} \bmod ${n}\).`,
                answer: v,
                solution: String.raw`Work modulo ${n}: multiply by ${base} and reduce after every step. ${pw.join(', ')}. So \(${base}^{${e}} \bmod ${n} = ${v}\). (Module 6)`,
              };
            },
          },
          {
            label: 'Algorithms and growth',
            make(R, M) {
              const kind = R.int(0, 3);
              if (kind === 0) {
                const n = R.pick([10, 50, 100, 500, 1000, 4096, 10000, 65536, 1000000]);
                let probes = 0;
                for (let m = n; m > 0; m = Math.floor(m / 2)) probes++;
                return {
                  prompt: `<b>Algorithms.</b> Binary search runs on a sorted list of ${n.toLocaleString('en-US')} items. In the worst case, how many middle elements does it compare with the target?`,
                  answer: probes,
                  solution: String.raw`Each comparison at least halves the window, so the worst case is \(\lfloor \log_2\,n \rfloor + 1\) comparisons. Here \(\lfloor \log_2\,${n} \rfloor + 1 = ${probes - 1} + 1 = ${probes}\). A linear scan could need all ${n.toLocaleString('en-US')}. (Modules 5 and 8)`,
                };
              }
              if (kind === 1) {
                const variants = [
                  { code: ['count = 0', 'for i in range(n):', '    for j in range(n):', '        count += 1'], f: (n) => n * n,
                    why: (n, v) => String.raw`The inner loop runs \(n\) times for each of the \(n\) values of <code>i</code>: \(${n} \cdot ${n} = ${v}\). This is the product rule, and it is why the code is \(O(n^2)\).` },
                  { code: ['count = 0', 'for i in range(n):', '    for j in range(i + 1, n):', '        count += 1'], f: (n) => (n * (n - 1)) / 2,
                    why: (n, v) => String.raw`Each pair \(i \lt j\) is counted exactly once, so <code>count</code> is the number of 2-element subsets: \(\binom{${n}}{2} = ${n} \cdot ${n - 1} / 2 = ${v}\). Still \(O(n^2)\), with half the constant.` },
                  { code: ['count = 0', 'for i in range(n):', '    for j in range(i):', '        for k in range(j):', '            count += 1'], f: (n) => M.C(n, 3),
                    why: (n, v) => String.raw`Each triple \(k \lt j \lt i\) is counted exactly once, so <code>count</code> is \(\binom{${n}}{3} = ${v}\). Three nested loops give \(O(n^3)\).` },
                  { code: ['count = 0', 'i = 1', 'while i < n:', '    i = i * 2', '    count += 1'], f: (n) => { let c = 0; for (let i = 1; i < n; i *= 2) c++; return c; },
                    why: (n, v) => String.raw`<code>i</code> doubles on every pass (1, 2, 4, …) until it reaches at least ${n}, so <code>count</code> is \(\lceil \log_2\,${n} \rceil = ${v}\). Doubling and halving loops are \(O(\log\,n)\).` },
                ];
                const vi = R.int(0, 3), v = variants[vi];
                const n = vi === 3 ? R.pick([10, 20, 50, 64, 100, 128, 1000]) : R.int(4, 12);
                const ans = v.f(n);
                return {
                  prompt: `<b>Algorithms.</b> With <code>n = ${n}</code>, what is the value of <code>count</code> after this code runs?<pre class="ds-pre">${v.code.map(DM.hlPy).join('\n')}</pre>`,
                  answer: ans,
                  solution: v.why(n, ans) + ' (Modules 5 and 7)',
                };
              }
              if (kind === 2) {
                const pairs = [
                  ['n log n', 'n²', 1, 'n² = n · n, and n grows faster than log n, so n² wins.'],
                  ['2ⁿ', 'n¹⁰', 0, 'Every exponential eventually beats every polynomial. At n = 100, 2¹⁰⁰ ≈ 1.3 × 10³⁰ while 100¹⁰ = 10²⁰.'],
                  ['n!', '2ⁿ', 0, 'n! multiplies by n at each step while 2ⁿ multiplies by 2, so n! pulls ahead from n = 4 on (4! = 24 > 2⁴ = 16).'],
                  ['log n', '√n', 1, 'Every positive power of n eventually beats log n. At n = 10⁶, √n = 1000 while log₂ n ≈ 20.'],
                  ['n² + 1000n', '5n²', 2, 'Big-O ignores constant factors and lower-order terms, so both are Θ(n²).'],
                  ['log₂ n', 'log₁₀ n', 2, 'Logarithms in different bases differ by a constant factor: log₂ n ≈ 3.32 · log₁₀ n. Same growth rate.'],
                  ['n³', '3ⁿ', 1, 'Exponential beats polynomial. At n = 20, 3²⁰ ≈ 3.5 × 10⁹ while 20³ = 8,000.'],
                  ['100n', 'n log n', 1, 'n log₂ n eventually wins, but only once log₂ n > 100, that is n > 2¹⁰⁰. Big-O ignores constants; real budgets cannot.'],
                  ['2ⁿ', '2ⁿ⁺¹', 2, '2ⁿ⁺¹ = 2 · 2ⁿ differs by a constant factor, so the growth rate is the same.'],
                  ['n√n', 'n log n', 0, 'Divide both by n: √n eventually beats log n, so n√n grows faster.'],
                ];
                let [fa, fb, idx, why] = R.pick(pairs);
                if (R.chance(0.5)) { [fa, fb] = [fb, fa]; if (idx < 2) idx = 1 - idx; }
                const options = [fa, fb, 'Same growth rate'];
                return {
                  prompt: `<b>Growth rates.</b> As \\(n\\) grows without bound, which function grows faster: <b class="mono">${fa}</b> or <b class="mono">${fb}</b>?`,
                  options, answer: options[idx],
                  solution: `<b>${options[idx]}.</b> ${why} (Module 5)`,
                };
              }
              const p = R.pick([1, 2, 3]), f = R.pick([2, 3, 4, 10]), t = R.pick([1, 2, 3, 5]), n0 = R.pick([1000, 2000, 5000, 10000]);
              const ans = t * f ** p;
              return {
                prompt: `<b>Estimation.</b> An ${['', 'O(n)', 'O(n²)', 'O(n³)'][p]} algorithm takes ${t} second${t > 1 ? 's' : ''} on ${n0.toLocaleString('en-US')} items. About how many seconds will it take on ${(n0 * f).toLocaleString('en-US')} items?`,
                answer: ans,
                solution: String.raw`Multiplying \(n\) by ${f} multiplies \(${['', 'n', 'n^2', 'n^3'][p]}\) by \(${f}^{${p}} = ${f ** p}\), so the time is about \(${t} \times ${f ** p} = ${ans}\) seconds. Scaling a small measurement by the growth rate is the complexity-budget habit. (Module 5)`,
              };
            },
          },
        ],
      },
      /* ---------------------------------------------------------------- 13 */
      {
        title: 'Check yourself: design judgment',
        kind: 'quiz',
        questions: [
          { q: 'A checkout service must answer "has this coupon code been redeemed?" for 20 million codes, thousands of times per second. Which model and data structure fit best?',
            choices: ['A list of redeemed codes, searched with <code>in</code>', 'A set of redeemed codes (a hash set)', 'A tree of codes ordered by redemption date', 'A flow network from codes to customers'], answer: 1,
            explain: 'Only membership matters, so the model is a set. A hash set answers <code>in</code> in constant average time, while searching a 20-million-item list can take 20 million comparisons per request.' },
          { q: 'A planner tries every ordering of 15 delivery stops, checking about \\(10^7\\) orderings per second in Python. Roughly how long does it run?',
            choices: ['About 0.1 seconds', 'About a day and a half', 'About 40 years', 'Longer than the age of the universe'], answer: 1,
            explain: '\\(15! \\approx 1.3 \\times 10^{12}\\) orderings divided by \\(10^7\\) per second is about \\(1.3 \\times 10^5\\) seconds, or 36 hours. Estimating first warns you that 16 stops would take over three weeks and 20 stops thousands of years, so use dynamic programming or a heuristic.' },
          { q: 'Your function passes 10,000 randomly generated tests. Which statement is correct?',
            choices: ['The function is now proven correct', 'It is very likely correct on inputs like the ones tested, but only a proof covers every input', 'Tests are pointless once you have a proof', 'Five hand-picked tests would have been better'], answer: 1,
            explain: 'Testing samples the input space and a proof covers all of it. Professionals use both: proofs or carefully stated invariants for the core logic, and many automated tests, because proofs can contain mistakes too and tests catch them cheaply.' },
          { q: 'Which statement about a loop invariant is correct?',
            choices: ['It is true only after the loop ends', 'It is true before the first pass and stays true after every pass, so it still holds when the loop exits', 'It is a variable whose value never changes', 'It only needs to hold on the last pass'], answer: 1,
            explain: 'An invariant is proved like an induction: it holds at the start (base case) and every pass preserves it (inductive step). Combined with the exit condition it gives the postcondition. In binary search, "if x is in the list, it lies between lo and hi" plus "lo > hi" proves that x is absent.' },
          { q: 'A system assigns random 32-bit IDs. About how many IDs can it issue before a collision becomes more likely than not?',
            choices: ['About 77,000', 'About 2 billion', 'About 4.3 billion', 'None can collide until all 4.3 billion are used'], answer: 0,
            explain: 'The birthday bound puts the 50% point at \\(k \\approx 1.18\\sqrt{N} = 1.18 \\times 2^{16} \\approx 77{,}000\\). The number of pairs grows like \\(k^2/2\\), so collisions arrive long before the space fills up. The last choice confuses "guaranteed" (the pigeonhole principle) with "likely".' },
          { q: 'Why do careful experiments call <code>random.seed(...)</code>, or create <code>random.Random(seed)</code>, before generating random data?',
            choices: ['It makes the numbers more random', 'It makes the run reproducible: the same seed produces the same sequence, so others can rerun and check the result', 'It makes the generator faster', 'It guarantees the results are statistically significant'], answer: 1,
            explain: 'A pseudo-random generator is a deterministic recurrence started from the seed (Module 8), so the same seed reproduces the same run, bugs included. Significance is a separate question: for that, repeat with several seeds and report the spread.' },
          { q: 'You must suggest an order for taking courses so that every prerequisite comes first. Which model and algorithm fit?',
            choices: ['A tree and an in-order traversal', 'A directed acyclic graph and a topological sort', 'A set and a union', 'A probability model and random sampling'], answer: 1,
            explain: '"A before B" is a directed edge. The prerequisite graph must have no cycles, and a topological sort lists the vertices so every edge points forward. A tree does not fit because a course can have several prerequisites.' },
          { q: 'An order\'s status must be one of PENDING, SHIPPED or DELIVERED. Which design rejects an invalid status when the order is created?',
            choices: ['A string field plus a comment listing the legal values', 'An <code>Enum</code> with those three members, checked by the constructor', 'A string field that a script checks once a month', 'An integer field that accepts any number'], answer: 1,
            explain: 'The Enum defines the legal statuses, and the constructor checks that the supplied value is one of its members. A raw string such as "SHIPED" is rejected immediately. Python type hints alone do not run this check; the explicit validation enforces it.' },
          { q: 'An \\(O(n^2)\\) report takes 3 seconds on 10,000 rows. Estimate the time for 100,000 rows.',
            choices: ['30 seconds', '300 seconds', '3,000 seconds', '30,000 seconds'], answer: 1,
            explain: 'Ten times the rows means \\(10^2 = 100\\) times the work for an \\(n^2\\) algorithm: \\(3 \\times 100 = 300\\) seconds, five minutes. A job that scaled like \\(n\\,\\log\\,n\\) would grow by a factor of about 12.5 instead, to roughly 40 seconds.' },
          { q: 'In a language model, what stops position 5 from using the token at position 8 during training?',
            choices: ['A random seed', 'A Boolean mask that lets position \\(i\\) use position \\(j\\) only when \\(j \\le i\\)', 'Sorting the tokens alphabetically', 'A spanning tree of the tokens'], answer: 1,
            explain: 'Causal attention applies a lower-triangular Boolean mask built from the order relation \\(j \\le i\\) (Modules 4 and 12), so each position only uses earlier positions. Without it the model could peek at the very token it is learning to predict.' },
        ],
      },
      /* ---------------------------------------------------------------- 14 */
      {
        title: 'What you can do now',
        kind: 'concept',
        html: String.raw`
          <p class="lead">Thirteen objectives add up to one way of working. Each line below is a skill you can now use on a real project, linked to the module where you built it.</p>
          <div class="ds-skills"></div>
          <div class="why" data-label="Take this with you">When you meet an unfamiliar problem, walk the design loop: understand the question, choose the structure, specify it with logic, analyze the algorithm, count before you build, verify, and measure. <span class="ds-back"></span></div>`,
        render(body, ctx) {
          const { h } = ctx;
          body.querySelector('.ds-skills').append(...SKILLS.map(([id, text]) => h('div.ds-skill',
            h('span.n', String(MODS[id][0])), h('span', text, ' ', modLink(ctx, id)))));
          body.querySelector('.ds-back').replaceWith(h('a.ds-mod', { href: '#design-1', onclick: (e) => { e.preventDefault(); ctx.go('design-1'); } }, 'Back to the design loop'));
        },
      },
    ],
  });
})();
