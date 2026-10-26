"""End-to-end verification for the interactive course page.

Opens the built HTML in headless Chromium, visits every slide, and fails on:
  * JavaScript errors or console errors
  * slides whose content overflows one viewport (clipped content)
  * lab controls that throw when clicked
  * practice generators whose own answer is rejected by the checker
  * quiz questions that do not give feedback
  * (with --python) code walkthroughs whose real Python output differs from `expected`

Usage:
  python3 tests/e2e/verify.py discrete-math-interactive.html [--modules sets,logic] [--python]
         [--trace] [--shots DIR] [--viewport 1280x720] [--mobile]
"""
import argparse
import json
import os
import sys

from playwright.sync_api import sync_playwright

from _harness import fonts_ok, launch, serve, slide_key

ap = argparse.ArgumentParser()
ap.add_argument("html")
ap.add_argument("--modules", default="")
ap.add_argument("--python", action="store_true", help="run every code walkthrough with real Python and compare output")
ap.add_argument("--trace", action="store_true", help="also exercise Trace mode on code slides")
ap.add_argument("--shots", default="", help="directory for one screenshot per slide")
ap.add_argument("--viewport", default="1280x720")
ap.add_argument("--mobile", action="store_true", help="also check every slide and its controls at phone width")
ap.add_argument("--mobile-only", action="store_true", help="run only generator checks and the complete mobile layout checks")
ap.add_argument("--dark", action="store_true")
ap.add_argument("--query", default="", help="extra query string, e.g. py=brython")
args = ap.parse_args()

srv, base = serve(args.html)
if args.query:
    base += "?" + args.query

errors, warnings = [], []
current = {"slide": "boot"}


def err(msg):
    errors.append(f"[{current['slide']}] {msg}")


def warn(msg):
    warnings.append(f"[{current['slide']}] {msg}")


IGNORED_CONSOLE = ("[DM] Pyodide unavailable", "Failed to load resource: net::ERR_INTERNET_DISCONNECTED")

with sync_playwright() as p:
    w, h = (int(x) for x in args.viewport.split("x"))
    browser = launch(p)
    # reduced motion keeps the view transition out of the layout measurements
    ctx = browser.new_context(viewport={"width": w, "height": h}, color_scheme="dark" if args.dark else "light", reduced_motion="reduce")
    page = ctx.new_page()
    page.on("pageerror", lambda e: err(f"pageerror: {e}"))
    page.on("console", lambda m: (m.type == "error" and not any(s in m.text for s in IGNORED_CONSOLE)) and err(f"console.error: {m.text}"))
    page.add_init_script("try { localStorage.clear(); } catch (e) {}")
    page.goto(base)
    page.wait_for_function("document.body.dataset.ready === '1'", timeout=20000)
    # measurements need the real fonts and the math renderer, which both arrive asynchronously
    try:
        page.wait_for_function("window.katex", timeout=30000)
    except Exception:  # noqa: BLE001
        err("KaTeX did not load within 30 s; formulas would be measured as plain text")
    if not fonts_ok(page):
        err("the web fonts did not load; layout results would not match what students see")
    page.wait_for_timeout(300)

    # a slide's key is its id or title slug (see slideKey in core.js); DM.keyOf is the one source of truth
    slides = page.evaluate("""() => DM.modules.flatMap(m => m.slides.map((s, i) => ({
        key: DM.keyOf(m.id, i), mod: m.id, idx: i, kind: s.kind || 'concept', title: s.title.replace(/<[^>]+>/g, ''),
        expected: s.expected ?? null, nlines: s.lines ? s.lines.length : 0 })))""")
    wanted = set(x for x in args.modules.split(",") if x)
    if wanted:
        slides = [s for s in slides if s["mod"] in wanted]
    if args.shots:
        os.makedirs(args.shots, exist_ok=True)

    # practice generators must accept their own answers
    gen_report = page.evaluate("""(wanted) => {
        const bad = [];
        const fmt = (a) => Array.isArray(a) ? '{' + a.join(', ') + '}' : String(a);
        for (const m of DM.modules) {
          if (wanted.length && !wanted.includes(m.id)) continue;
          m.slides.forEach((s, si) => {
            if (s.kind !== 'practice') return;
            s.gens.forEach((g) => {
              for (let k = 0; k < 40; k++) {
                let p;
                try { p = g.make(DM.util.R, DM.util.M); } catch (e) { bad.push(`${m.id}-${si+1} ${g.label}: make() threw ${e.message}`); return; }
                if (!p || !p.prompt) { bad.push(`${m.id}-${si+1} ${g.label}: no prompt`); return; }
                if (p.answer === undefined && !p.check) { bad.push(`${m.id}-${si+1} ${g.label}: no answer`); return; }
                if (p.options && !p.options.map(String).includes(String(p.answer))) { bad.push(`${m.id}-${si+1} ${g.label}: answer ${p.answer} not among options`); return; }
                const ans = p.answerText ?? fmt(p.answer);
                let ok;
                try { ok = DM.checkAnswer(p, ans); } catch (e) { bad.push(`${m.id}-${si+1} ${g.label}: checker threw ${e.message}`); return; }
                if (!ok) { bad.push(`${m.id}-${si+1} ${g.label}: own answer "${ans}" rejected for prompt: ${p.prompt.slice(0, 120)}`); return; }
                if (!p.solution) { bad.push(`${m.id}-${si+1} ${g.label}: missing worked solution`); return; }
              }
            });
          });
        }
        return bad;
    }""", list(wanted))
    for b in gen_report:
        current["slide"] = "generators"
        err(b)

    for s in ([] if args.mobile_only else slides):
        current["slide"] = s["key"]
        page.evaluate("(k) => { location.hash = k; }", s["key"])
        page.wait_for_function("(k) => document.querySelector('.slide:not([hidden])')?.dataset.key === k", arg=s["key"], timeout=5000)
        page.wait_for_timeout(260)

        def overflow_check(label):
            r = page.evaluate("""() => {
                const sl = document.querySelector('.slide:not([hidden])');
                const out = { clip: Math.max(0, sl.scrollHeight - sl.clientHeight), clipX: Math.max(0, sl.scrollWidth - sl.clientWidth), inner: [] };
                for (const el of sl.querySelectorAll('*')) {
                  const cs = getComputedStyle(el);
                  if (el.matches('.cw-out pre')) continue;  // program output may legitimately be longer than its panel
                  if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 3 && el.clientHeight > 0)
                    out.inner.push((el.className || el.tagName) + ' +' + (el.scrollHeight - el.clientHeight) + 'px');
                }
                for (const v of sl.querySelectorAll('.cw-view'))
                  if (v.scrollWidth > v.clientWidth + 3) out.inner.push('cw-view horizontal +' + (v.scrollWidth - v.clientWidth) + 'px (a code line is too long)');
                return out;
            }""")
            if r["clip"] > 2:
                err(f"{label}: content overflows the slide by {r['clip']}px (clipped)")
            if r["clipX"] > 2:
                err(f"{label}: content overflows horizontally by {r['clipX']}px")
            for i in r["inner"]:
                warn(f"{label}: internal scroll {i}")

        overflow_check("initial")
        if args.shots:
            page.screenshot(path=os.path.join(args.shots, f"{s['key']}.png"))

        kind = s["kind"]
        if kind == "lab" or kind == "concept":
            n = page.evaluate("() => document.querySelectorAll('.slide:not([hidden]) .slide-body button').length")
            for i in range(min(n, 60)):
                try:
                    page.evaluate("(i) => { const b = document.querySelectorAll('.slide:not([hidden]) .slide-body button')[i]; if (b && !b.disabled && b.offsetParent) b.click(); }", i)
                except Exception as e:  # noqa: BLE001
                    err(f"click #{i} failed: {e}")
                page.wait_for_timeout(25)
            page.evaluate("""() => {
                for (const el of document.querySelectorAll('.slide:not([hidden]) .slide-body input')) {
                  if (el.type === 'range') { el.value = el.max || 100; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); el.value = el.min || 0; el.dispatchEvent(new Event('input', {bubbles: true})); }
                  else if (el.type === 'checkbox' || el.type === 'radio') { el.click(); }
                  else if (el.type === 'text' || el.type === 'number' || !el.type) { const v = el.value; el.value = v + ' '; el.dispatchEvent(new Event('input', {bubbles: true})); el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
                }
                for (const el of document.querySelectorAll('.slide:not([hidden]) .slide-body select')) {
                  for (const o of el.options) { el.value = o.value; el.dispatchEvent(new Event('change', {bubbles: true})); el.dispatchEvent(new Event('input', {bubbles: true})); }
                }
            }""")
            page.wait_for_timeout(120)
            overflow_check("after interaction")
            # clickable non-button targets (SVG vertices, cells, cards) are found by their pointer cursor
            npt = page.evaluate("""() => {
                const sl = document.querySelector('.slide:not([hidden]) .slide-body');
                window.__dmTargets = [...sl.querySelectorAll('*')].filter(el => !el.closest('button, a, input, select, textarea, label')
                  && getComputedStyle(el).cursor === 'pointer' && !(el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer'));
                return window.__dmTargets.length; }""")
            for i in range(min(npt, 40)):
                page.evaluate("""(i) => { const el = window.__dmTargets[i]; if (el && el.isConnected) {
                    el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); el.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}));
                    el.dispatchEvent(new MouseEvent('click', {bubbles: true})); } }""", i)
                page.wait_for_timeout(20)
                if page.evaluate("() => document.querySelector('.slide:not([hidden])')?.dataset.key") != s["key"]:
                    # the target was a navigation link (e.g. the course map); come back and continue
                    page.evaluate("(k) => { location.hash = k; }", s["key"])
                    page.wait_for_function("(k) => document.querySelector('.slide:not([hidden])')?.dataset.key === k", arg=s["key"], timeout=5000)
            if npt:
                page.wait_for_timeout(150)
                overflow_check("after clicking pointer targets")
        elif kind == "code":
            # every line must have an explanation (blank lines get an automatic one)
            missing = page.evaluate("""([id, idx]) => { const m = DM.modules.find(x => x.id === id); const sl = m.slides[idx];
                return sl.lines.map((l, i) => [i + 1, Array.isArray(l) ? l[0] : l.code, Array.isArray(l) ? l[1] : l.ex]).filter(([i, c, e]) => c.trim() !== '' && !(e && e.trim())).map(x => x[0]); }""", [s["mod"], s["idx"]])
            if missing:
                err(f"code lines without explanation: {missing}")
            # step through every line in read mode
            for _ in range(s["nlines"]):
                page.keyboard.press("ArrowDown")
            page.wait_for_timeout(60)
            if args.python:
                page.click(".slide:not([hidden]) .cw-out-head .btn.primary")
                try:
                    page.wait_for_function("() => { const t = document.querySelector('.slide:not([hidden]) .cw-out pre').textContent; return t && !t.startsWith('Running') && !t.startsWith('Press Run'); }", timeout=90000)
                except Exception:  # noqa: BLE001
                    err("Run produced no output within 90s")
                got = page.evaluate("() => document.querySelector('.slide:not([hidden]) .cw-out pre').textContent")
                exp = s["expected"]
                if exp is None:
                    err("code slide has no `expected` output")
                elif got.strip() != exp.strip():
                    err("python output differs from expected:\n--- expected\n" + exp + "\n--- got\n" + got)
            if args.trace:
                page.click(".slide:not([hidden]) .cw-bar [role=tab]:nth-child(3)")
                try:
                    page.wait_for_function("() => /Step \\d+ of/.test(document.querySelector('.slide:not([hidden]) .cw-explain').textContent) || /needs/.test(document.querySelector('.slide:not([hidden]) .cw-explain').textContent)", timeout=90000)
                    for _ in range(5):
                        page.keyboard.press("ArrowDown")
                    page.click(".slide:not([hidden]) .trace-ctl button:last-child")
                except Exception as e:  # noqa: BLE001
                    err(f"trace did not start: {e}")
                overflow_check("trace")
                page.click(".slide:not([hidden]) .cw-bar [role=tab]:nth-child(2)")
                page.wait_for_timeout(100)
                overflow_check("edit")
                page.click(".slide:not([hidden]) .cw-bar [role=tab]:nth-child(1)")
        elif kind == "example":
            nsteps = page.evaluate("() => { const c = document.querySelector('.slide:not([hidden]) .ex-count'); return c ? parseInt(c.textContent.split(' of ')[1], 10) : 0; }")
            if not nsteps:
                err("worked example shows no step counter")
            for _ in range(max(0, nsteps - 1)):
                page.keyboard.press("ArrowDown")
                page.wait_for_timeout(35)
            overflow_check("final step")
            if not page.evaluate("() => !!document.querySelector('.slide:not([hidden]) .ex-stage .ex-answer')"):
                err("the final step shows no answer banner")
            page.evaluate("() => document.querySelector('.slide:not([hidden]) .ex-ctl button[aria-label=\"Back to the first step\"]')?.click()")
            page.wait_for_timeout(60)
            overflow_check("back at first step")
        elif kind == "design":
            n = page.evaluate("() => document.querySelectorAll('.slide:not([hidden]) .dp-list button').length")
            for i in range(n):
                page.evaluate("(i) => document.querySelectorAll('.slide:not([hidden]) .dp-list button')[i].click()", i)
                page.wait_for_timeout(40)
                overflow_check(f"principle {i + 1}")
        elif kind == "practice":
            ntypes = page.evaluate("() => document.querySelectorAll('.slide:not([hidden]) .pr-types button').length")
            for i in range(ntypes):
                for _ in range(4):
                    page.evaluate("(i) => document.querySelectorAll('.slide:not([hidden]) .pr-types button')[i].click()", i)
                    page.wait_for_timeout(30)
                    overflow_check(f"practice type {i + 1}")
                # wrong answer path
                page.evaluate("""() => { const s = document.querySelector('.slide:not([hidden])');
                    const inp = s.querySelector('.pr-answer input'); const row = s.querySelector('.pr-answer');
                    if (!row.hidden) { inp.value = 'zzz-wrong'; s.querySelector('.pr-answer .btn').click(); }
                    else { s.querySelector('.choice-row button').click(); } }""")
                page.wait_for_timeout(40)
                fb = page.evaluate("() => document.querySelector('.slide:not([hidden]) .feedback').textContent")
                if not fb:
                    err(f"practice type {i + 1}: no feedback after checking")
                overflow_check(f"practice type {i + 1} with solution open")
        elif kind == "quiz":
            nq = page.evaluate("() => document.querySelectorAll('.slide:not([hidden]) .qz-dots button').length")
            for i in range(nq):
                page.evaluate("(i) => document.querySelectorAll('.slide:not([hidden]) .qz-dots button')[i].click()", i)
                page.evaluate("() => document.querySelector('.slide:not([hidden]) .qz-choices button').click()")
                page.wait_for_timeout(40)
                if not page.evaluate("() => !!document.querySelector('.slide:not([hidden]) .qz-card .feedback')"):
                    err(f"quiz question {i + 1}: no feedback")
                overflow_check(f"quiz question {i + 1} answered")

    if args.mobile or args.mobile_only:
        current["slide"] = "mobile"
        page.set_viewport_size({"width": 390, "height": 844})
        page.emulate_media(reduced_motion="reduce")
        page.evaluate("document.fonts.ready")

        def mobile_check(label):
            issues = page.evaluate("""() => {
                const sl = document.querySelector('.slide:not([hidden])');
                const problems = [];
                for (const el of [document.documentElement, document.querySelector('.stage'), sl]) {
                  const over = el.scrollWidth - el.clientWidth;
                  if (over > 3) problems.push(`${el.className || el.tagName}: horizontal overflow +${over}px`);
                }
                // A wide table/code panel may scroll locally. Offscreen controls
                // must have such a scroll container, not an ancestor that clips them.
                for (const el of sl.querySelectorAll('button, input, select, textarea, [role=button], [role=link]')) {
                  const r = el.getBoundingClientRect();
                  if (!r.width || !r.height || (r.left >= -2 && r.right <= innerWidth + 2)) continue;
                  let scrollable = false;
                  for (let p = el.parentElement; p && p !== sl; p = p.parentElement) {
                    if (/^(auto|scroll)$/.test(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth + 3) {
                      const pr = p.getBoundingClientRect();
                      scrollable = pr.left >= -2 && pr.right <= innerWidth + 2;
                      break;
                    }
                  }
                  if (!scrollable) problems.push(`unreachable control: ${(el.getAttribute('aria-label') || el.textContent || el.tagName).slice(0, 80)}`);
                }
                return [...new Set(problems)];
            }""")
            for issue in issues:
                err(f"{label}: {issue}")

        for s in slides:
            current["slide"] = "mobile " + s["key"]
            page.evaluate("(k) => DM.goTo(k, {instant: true})", s["key"])
            page.wait_for_timeout(30)
            mobile_check("initial")
            selector = {"practice": ".pr-types button", "design": ".dp-list button", "quiz": ".qz-dots button"}.get(s["kind"])
            if selector:
                n = page.locator(".slide:not([hidden]) " + selector).count()
                for i in range(n):
                    page.evaluate("([selector, i]) => document.querySelector('.slide:not([hidden])').querySelectorAll(selector)[i].click()", [selector, i])
                    if s["kind"] == "practice":
                        page.evaluate("document.querySelector('.slide:not([hidden]) .pr-solution').hidden = false")
                    elif s["kind"] == "quiz":
                        page.evaluate("document.querySelector('.slide:not([hidden]) .qz-choices button').click()")
                    mobile_check(f"{s['kind']} item {i + 1}")

        # Regression: the rightmost qualifications used to be clipped by the stage.
        if any(s["mod"] == "networks" for s in slides):
            workers = slide_key(page, "networks", title_re=r"placing workers")
            current["slide"] = "mobile " + workers
            page.evaluate("(k) => DM.goTo(k, {instant: true})", workers)
            for job in ("Deploy", "Clean"):
                button = page.get_by_role("button", name=f"Ava qualified for {job}", exact=True)
                before = button.get_attribute("aria-pressed")
                button.click(timeout=5000)
                if button.get_attribute("aria-pressed") == before:
                    err(f"qualification control for {job} did not toggle")

    browser.close()
srv.shutdown()

print(json.dumps({"slides": len(slides), "errors": len(errors), "warnings": len(warnings)}))
for e in errors:
    print("ERROR", e)
for w_ in warnings:
    print("WARN ", w_)
sys.exit(1 if errors else 0)
