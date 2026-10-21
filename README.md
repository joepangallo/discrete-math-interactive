# Discrete Mathematics & Probability, interactive course

A one-file interactive course: `discrete-math-interactive.html`. Fifteen modules, one slide per screen, arrow-key navigation, interactive labs, Python walkthroughs that run real Python in the browser with every line explained, generated practice with worked solutions, and quizzes with explained answers. `discrete-math-companion.pdf` is the printable companion (one page per slide plus the expanded explanations).

Open the HTML file directly or serve the repository root; `index.html` forwards to the course.

## What it needs

- A current browser: Chrome or Edge 111+, Firefox 113+, Safari 16+. Older browsers show an unstyled page because the color system uses `oklch()`.
- Internet access on first use: the math renderer (KaTeX, 300 KB) and the fonts load from CDNs, and the first program run downloads Python (Pyodide, about 10 MB, cached afterwards). Offline, formulas appear as plain notation, Run shows the expected output instead of executing, and a notice says so. Step-by-step Trace mode needs Pyodide; hosts that block WebAssembly downloads fall back to Brython, where Run works and Trace does not.
- Progress (visited slides, quiz and practice scores, theme) is stored in the browser only.

## Working on the course

```
npm run build        # src/ -> discrete-math-interactive.html (+ index.html)
npm test             # content rules, generator fuzz, Python output check, build parity
npm run e2e:quick    # browser layout + generator + math regression checks (needs Playwright)
npm run e2e          # every slide with live Python and Trace mode (slow, needs network)
npm run e2e:runner   # Python runner robustness on both engines
npm run pdf          # regenerate the PDF companion
```

Requirements: Node 20.11+ (`.nvmrc` says 22), Python 3.10+ with `pip install -r requirements.txt` and `python3 -m playwright install chromium` for the browser suites. `tests/python.test.mjs` runs every walkthrough under your local `python3`.

### Layout

- `src/shell.html`, `src/styles.css`: page skeleton and all styling (design tokens at the top; the dark block is written once and duplicated by the build for system dark mode).
- `src/util.js`: pure helpers shared with the tests (seeded random `R`, number helpers `M`, the answer checker).
- `src/core.js`: the engine: slide kinds, navigation, Python workers, search, glossary, print mode.
- `src/lib/*.js`: helpers shared by several modules (each is a plain script that attaches to `DM`).
- `src/modules/NN-id.js`: one module per course objective (00 welcome, 01 sets … 13 probability, 14 design capstone). A module calls `DM.module({ id, num, title, objectives, terms, symbols, css, slides })`.
- `tests/*.test.mjs`: Node tests. `tests/e2e/*.py`: Playwright scripts (`verify.py` visits every slide; `runner.py` stresses the Python runner; `math_regressions.py` checks two calculator labs; `make_pdf.py` renders the PDF).

### Writing a slide

Slide kinds: `concept` (html), `lab` (`render(body, ctx)`), `code` (`lines: [[code, explanation]]`, `expected`, `fivew`), `design` (`principles`), `practice` (`gens: [{ label, make(R, M) }]`), `quiz` (`questions: [{ q, choices, answer, explain }]`). The content tests enforce the course's promises: every non-blank code line has an explanation, every quiz answer is explained and no position is favored, every generator accepts its own answer across hundreds of seeds, timers stop when a slide is hidden, and nothing student-facing names the school, a course code, or a tool vendor. Quiz choices are shuffled at run time; mark a question `fixed: true` when its choices refer to each other. A slide's key in the URL and in saved progress is its `id` if it has one, otherwise a slug of its title (`#sets-lab-venn-diagram-calculator`), so inserting or reordering slides does not move bookmarks; links in the older positional form (`#sets-7`) still open that position. Renaming a slide changes its key unless you give it an `id` first.

`ctx` gives a slide `h`/`s` element builders, `rich` (HTML with math), `R`, `M`, `store`, `onShow`/`onHide`, `ticker` (a play/pause interval that stops itself when the slide is hidden), `keys` (arrow-key hook) and `go` (navigate).

## Credits

Math rendering by [KaTeX](https://katex.org) (MIT). In-browser Python by [Pyodide](https://pyodide.org) (MPL-2.0) with [Brython](https://brython.info) (BSD-3-Clause) as a fallback. Fonts: STIX Two Text (SIL OFL) and Atkinson Hyperlegible Next and Mono (SIL OFL) from Google Fonts. Course text and figures follow Johnsonbaugh's *Discrete Mathematics* for topic order.

## License

No license has been chosen yet; all rights reserved until one is added.
