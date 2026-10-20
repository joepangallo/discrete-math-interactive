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
import functools
import http.server
import json
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("html")
ap.add_argument("--modules", default="")
ap.add_argument("--python", action="store_true", help="run every code walkthrough with real Python and compare output")
ap.add_argument("--trace", action="store_true", help="also exercise Trace mode on code slides")
ap.add_argument("--shots", default="", help="directory for one screenshot per slide")
ap.add_argument("--viewport", default="1280x720")
ap.add_argument("--mobile", action="store_true", help="also check phone width for horizontal overflow")
ap.add_argument("--dark", action="store_true")
ap.add_argument("--query", default="", help="extra query string, e.g. py=brython")
args = ap.parse_args()

path = os.path.abspath(args.html)
root, name = os.path.split(path)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_address[1]}/{name}"
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
    try:
        browser = p.chromium.launch()
    except Exception:  # noqa: BLE001  (bundled browser missing: use installed Chrome)
        browser = p.chromium.launch(channel="chrome")
    ctx = browser.new_context(viewport={"width": w, "height": h}, color_scheme="dark" if args.dark else "light")
    page = ctx.new_page()
    page.on("pageerror", lambda e: err(f"pageerror: {e}"))
    page.on("console", lambda m: (m.type == "error" and not any(s in m.text for s in IGNORED_CONSOLE)) and err(f"console.error: {m.text}"))
    page.add_init_script("try { localStorage.clear(); } catch (e) {}")
    page.goto(base)
    page.wait_for_function("document.body.dataset.ready === '1'", timeout=20000)
    page.wait_for_timeout(400)

    slides = page.evaluate("""() => DM.modules.flatMap(m => m.slides.map((s, i) => ({
        key: m.id + '-' + (i + 1), mod: m.id, kind: s.kind || 'concept', title: s.title.replace(/<[^>]+>/g, ''),
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

    for s in slides:
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
            missing = page.evaluate("""(k) => { const [id, n] = k.split(/-(?=\\d+$)/); const m = DM.modules.find(x => x.id === id); const sl = m.slides[+n-1];
                return sl.lines.map((l, i) => [i + 1, Array.isArray(l) ? l[0] : l.code, Array.isArray(l) ? l[1] : l.ex]).filter(([i, c, e]) => c.trim() !== '' && !(e && e.trim())).map(x => x[0]); }""", s["key"])
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

    if args.mobile:
        current["slide"] = "mobile"
        page.set_viewport_size({"width": 390, "height": 844})
        for s in slides[:: max(1, len(slides) // 25)]:
            current["slide"] = "mobile " + s["key"]
            page.evaluate("(k) => { location.hash = k; }", s["key"])
            page.wait_for_timeout(200)
            wide = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
            if wide > 1:
                err(f"page scrolls horizontally by {wide}px at phone width")

    browser.close()
srv.shutdown()

print(json.dumps({"slides": len(slides), "errors": len(errors), "warnings": len(warnings)}))
for e in errors:
    print("ERROR", e)
for w_ in warnings:
    print("WARN ", w_)
sys.exit(1 if errors else 0)
