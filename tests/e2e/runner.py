"""Python-runner robustness tests (both engines).

Checks timeout and reporting-failure recovery, truthful trace-limit warnings even when student
code catches the stop signal, late trace results, output caps, the engine retry path, and
keyboard/accessibility behavior.

Usage: python3 tests/e2e/runner.py discrete-math-interactive.html [--query py=brython]
"""
import argparse
import sys

from playwright.sync_api import sync_playwright

from _harness import Checks, goto_slide, launch, serve, slide_key, wait_ready

ap = argparse.ArgumentParser()
ap.add_argument("html")
ap.add_argument("--query", default="")
args = ap.parse_args()
srv, base = serve(args.html)
if args.query:
    base += "?" + args.query
requested = "brython" if "py=brython" in args.query else "none" if "py=none" in args.query else "pyodide"
check = Checks()
ACTIVE = ".slide:not([hidden])"
page_errors = []

with sync_playwright() as p:
    browser = launch(p)
    page = browser.new_page(viewport={"width": 1280, "height": 720}, reduced_motion="reduce")
    page.on("pageerror", lambda e: page_errors.append(f"pageerror: {e}"))
    page.goto(base)
    wait_ready(page)
    code_slide = slide_key(page, "sets", kind="code")
    practice_slide = slide_key(page, "sets", kind="practice")
    goto_slide(page, code_slide)

    def edit_and_run(code, timeout=90000):
        page.click(f"{ACTIVE} .cw-bar [role=tab]:nth-child(2)")
        page.fill(f"{ACTIVE} .editor textarea", code)
        page.click(f"{ACTIVE} .cw-out-head .btn.primary")
        page.wait_for_function(f"() => !document.querySelector('{ACTIVE} .cw-out pre').textContent.startsWith('Running')", timeout=timeout)
        return page.evaluate(f"() => document.querySelector('{ACTIVE} .cw-out pre').textContent")

    out = edit_and_run("print(6 * 7)")
    engine = page.evaluate("DM.py.engine")
    check(engine == requested, f"the requested engine ({requested}) is the one that loaded (got {engine})")
    check(out.strip() == "42", f"[{engine}] simple run prints 42 (got {out.strip()[:60]!r})")

    out = edit_and_run("while True:\n    pass", timeout=40000)
    check("Timeout" in out, f"[{engine}] endless loop is stopped by the timeout")
    check(page.evaluate("document.querySelector('#next') && !document.querySelector('#next').disabled"), f"[{engine}] page stays responsive")

    out = edit_and_run("print('after the loop')")
    check(out.strip() == "after the loop", f"[{engine}] the next run works after a timeout (got {out.strip()[:60]!r})")

    out = edit_and_run("import json\njson.dumps = lambda *a, **k: 'x'\nprint('patched')")
    out2 = edit_and_run("print('still fine')")
    check(out2.strip() == "still fine", f"[{engine}] replacing json.dumps cannot break later runs (got {out2.strip()[:60]!r})")

    # Mutate a dependency of the saved helper functions, so reporting itself raises
    # instead of returning malformed JSON. Both engines must discard that worker.
    out = edit_and_run("import builtins\nbuiltins.str = None\nprint('patched')")
    check("Restarted" in out and page.evaluate("DM.py.worker === null && DM.py.pending.size === 0"),
          f"[{engine}] a reporting exception resets the Python session")
    out = edit_and_run("print('after reporting failure')")
    check(out.strip() == "after reporting failure", f"[{engine}] the next run recovers after a reporting exception")

    out = edit_and_run("for i in range(60000):\n    print('line', i)")
    check("truncated after" in out and len(out) < 260000, f"[{engine}] runaway output is capped (got {len(out)} characters)")

    if engine == "pyodide":
        out = edit_and_run("import json\njson._default_encoder = None\nprint('patched')")
        check("Restarted" in out, "[pyodide] mutating json encoder internals resets the Python session")
        out = edit_and_run("print('after json failure')")
        check(out.strip() == "after json failure", "[pyodide] the next run recovers after a JSON serialization exception")

        trace_program = "try:\n    for i in range(1000):\n        x = i\nexcept {handler}:\n    print('caught')\nprint('done')"
        for handler in ("Exception", "BaseException"):
            code = trace_program.format(handler=handler)
            result = page.evaluate("code => DM.py.trace(code)", code)
            check((result.get("err") or {}).get("type") == "StepLimit" and len(result.get("steps", [])) == 700,
                  f"[pyodide] except {handler} cannot suppress the incomplete-trace warning")
            expected_out = "caught\ndone\n" if handler == "BaseException" else ""
            check(result.get("out") == expected_out, f"[pyodide] trace limit handles except {handler} without inventing output")

        code = trace_program.format(handler="BaseException") + "\nraise ValueError('after the limit')"
        result = page.evaluate("code => DM.py.trace(code)", code)
        check((result.get("err") or {}).get("type") == "StepLimit" and "ValueError" in result["err"]["msg"] and "after the limit" in result["err"]["msg"],
              "[pyodide] incomplete traces retain subsequent program errors")

        page.click(f"{ACTIVE} .cw-bar [role=tab]:nth-child(2)")
        page.fill(f"{ACTIVE} .editor textarea", trace_program.format(handler="BaseException"))
        page.click(f"{ACTIVE} .cw-bar [role=tab]:nth-child(3)")
        page.wait_for_selector(f"{ACTIVE} .trace-ctl", timeout=90000)
        out = page.locator(f"{ACTIVE} .cw-out pre").inner_text()
        check("StepLimit" in out and "incomplete" in out, "[pyodide] trace truncation is visible from the first step")
        page.click(f"{ACTIVE} .trace-ctl button:last-child")
        out = page.locator(f"{ACTIVE} .cw-out pre").inner_text()
        check("Final captured output:" in out and "caught\ndone\n" in out and "StepLimit" in out,
              "[pyodide] End shows output produced after the stop signal was caught")
        check("Last recorded step" in page.locator(f"{ACTIVE} .cw-explain").inner_text(),
              "[pyodide] End identifies the last recorded state of an incomplete trace")

        # the trace controls are updated in place, so the focused control survives a step
        page.focus(f"{ACTIVE} .trace-ctl button[aria-label='Previous step']")
        page.keyboard.press("Enter")
        page.wait_for_timeout(50)
        check(page.evaluate("document.activeElement?.getAttribute('aria-label') === 'Previous step'"), "[pyodide] stepping the trace keeps keyboard focus on the button")
        slider_before = page.evaluate(f"() => document.querySelector('{ACTIVE} .trace-ctl input[type=range]')")
        page.focus(f"{ACTIVE} .trace-ctl input[type=range]")
        page.keyboard.press("ArrowLeft")
        page.wait_for_timeout(50)
        check(page.evaluate(f"() => document.activeElement === document.querySelector('{ACTIVE} .trace-ctl input[type=range]')"), "[pyodide] moving the trace slider keeps focus on the slider")
        del slider_before

        out = edit_and_run("print('after truncated trace')")
        check(out.strip() == "after truncated trace", "[pyodide] normal execution works after a caught trace limit")

        page.click(f"{ACTIVE} .cw-out-head .btn:not(.primary)")  # reset code
        page.click(f"{ACTIVE} .cw-bar [role=tab]:nth-child(3)")
        page.click(f"{ACTIVE} .cw-bar [role=tab]:nth-child(2)")
        page.wait_for_timeout(4000)
        check(page.evaluate(f"() => !!document.querySelector('{ACTIVE} .editor textarea') && !document.querySelector('{ACTIVE} .trace-ctl')"),
              "[pyodide] a late trace result does not replace the editor")

    key_before = page.evaluate(f"() => document.querySelector('{ACTIVE}').dataset.key")
    page.focus(f"{ACTIVE} .cw-bar [role=tab]:nth-child(1)")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(200)
    key_after = page.evaluate(f"() => document.querySelector('{ACTIVE}').dataset.key")
    sel = page.evaluate(f"() => document.querySelector('{ACTIVE} .cw-bar [aria-selected=true]').textContent")
    check(key_before == key_after and sel.startswith("Edit"), "arrow key on a mode tab switches tabs, not slides")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(200)
    check(page.evaluate(f"() => document.activeElement?.textContent === 'Trace' && document.activeElement.tabIndex === 0"), "roving tabindex follows the selected tab")
    page.click(f"{ACTIVE} .cw-bar [role=tab]:nth-child(1)")

    page.focus(f"{ACTIVE} .cw-bar [role=tab]:nth-child(2)")
    page.keyboard.press("Control+k")
    check(page.evaluate("!!document.querySelector('#dlg-palette[open]')"), "Ctrl+K opens search")
    page.keyboard.press("Escape")

    # quiz: shuffled choices, feedback announced, focus kept on the chosen answer
    quiz = slide_key(page, "sets", kind="quiz")
    goto_slide(page, quiz)
    check(page.evaluate(f"""() => {{ const sl = DM.modules.find(m => m.id === 'sets').slides.find(s => s.kind === 'quiz');
        const order = sl._order[0]; const n = sl.questions[0].choices.length;
        return order.length === n && order.slice().sort((a, b) => a - b).every((v, i) => v === i)
          && document.querySelectorAll('{ACTIVE} .qz-choices button').length === n; }}"""), "quiz shows every authored choice exactly once, in a shuffled order")
    page.focus(f"{ACTIVE} .qz-choices button:nth-child(2)")
    page.keyboard.press("Enter")
    page.wait_for_timeout(80)
    check(page.evaluate(f"() => document.activeElement === document.querySelector('{ACTIVE} .qz-choices button:nth-child(2)')"), "answering a quiz question keeps focus on the chosen answer")
    check(page.evaluate(f"() => /Correct|Not quite/.test(document.querySelector('{ACTIVE} [role=status]').textContent)"), "quiz feedback is written to a live region")
    check(page.evaluate(f"() => !!document.querySelector('{ACTIVE} .qz-choices button.right .k') && /[✓✗A-D]/.test(document.querySelector('{ACTIVE} .qz-choices button.right .k').textContent)"), "the right answer is marked with a symbol, not only color")

    # navigation: a rapid double press advances two slides, Back returns one
    start = page.evaluate("() => document.querySelector('.slide:not([hidden])').dataset.key")
    page.keyboard.press("ArrowLeft")
    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(400)
    after = page.evaluate("() => DM.modules.flatMap(m => m.slides.map((s, i) => DM.keyOf(m.id, i)))")
    now = page.evaluate("() => document.querySelector('.slide:not([hidden])').dataset.key")
    check(after.index(now) == after.index(start) - 2, f"two quick arrow presses move two slides ({start} -> {now})")
    page.go_back()
    page.wait_for_timeout(300)
    check(page.evaluate("() => document.querySelector('.slide:not([hidden])').dataset.key") == after[after.index(start) - 1], "browser Back returns to the previous slide")
    check(page.evaluate("() => document.activeElement && document.activeElement.matches('.slide:not([hidden]) h2')"), "keyboard navigation moves focus to the new slide's heading")

    # single-key shortcuts can be switched off; arrows keep working
    page.evaluate("() => localStorage.setItem('dm.hotkeys', 'false')")
    page.keyboard.press("g")
    page.wait_for_timeout(100)
    check(not page.evaluate("!!document.querySelector('#dlg-glossary[open]')"), "the G shortcut is inert when single-key shortcuts are off")
    page.evaluate("() => localStorage.removeItem('dm.hotkeys')")
    page.keyboard.press("g")
    page.wait_for_timeout(100)
    check(page.evaluate("!!document.querySelector('#dlg-glossary[open]')"), "the G shortcut opens the glossary when shortcuts are on")
    page.keyboard.press("Escape")

    page.set_viewport_size({"width": 700, "height": 900})
    page.wait_for_timeout(200)
    check(page.evaluate("document.querySelector('#rail').inert === true"), "closed phone drawer is inert (out of the tab order)")
    page.click("#rail-btn")
    page.wait_for_timeout(250)
    check(page.evaluate("document.querySelector('#rail').inert === false && document.querySelector('#rail-btn').getAttribute('aria-expanded') === 'true'"), "open drawer is reachable and announced")
    page.keyboard.press("Escape")
    page.wait_for_timeout(250)
    check(page.evaluate("document.querySelector('#rail').inert === true"), "Escape closes the drawer")

    # saved progress: current keys survive, older positional keys are translated, unknown keys are dropped
    page.evaluate("() => { localStorage.setItem('dm.visited', JSON.stringify([DM.keyOf('sets', 0), 'logic-3', 'ghost-99', 'sets-200', 42])); localStorage.setItem('dm.last', '{\"x\":1}'); localStorage.setItem('dm.score.sets', 'null'); }")
    page.reload()
    wait_ready(page)
    saved = page.evaluate("() => JSON.parse(localStorage.getItem('dm.visited'))")
    expected_keys = page.evaluate("() => [DM.keyOf('sets', 0), DM.keyOf('logic', 2)]")
    current = page.evaluate("() => new Set(DM.modules.flatMap((m) => m.slides.map((s, i) => DM.keyOf(m.id, i))))")
    check(all(k in saved for k in expected_keys) and "ghost-99" not in saved and "sets-200" not in saved and 42 not in saved,
          f"visited keys are pruned and legacy positional keys translated on startup (saved: {saved})")
    check(page.evaluate("(keys) => keys.every((k) => DM.modules.some((m) => m.slides.some((s, i) => DM.keyOf(m.id, i) === k)))", saved),
          "every saved visited key names a current slide")
    goto_slide(page, practice_slide)
    check(page.evaluate(f"() => !!document.querySelector('{ACTIVE} .pr-score b')"), "odd localStorage values do not break startup or practice")

    # first-release positional links open the lesson they named then, even where slides have moved since
    for legacy, mod, title_re in [("sets-3", "sets", r"power set one bit"), ("trees-5", "trees", r"binary search trees"), ("graphs-10", "graphs", r"dijkstra")]:
        page.goto(base + "#" + legacy)
        wait_ready(page)
        want = slide_key(page, mod, title_re=title_re)
        got = page.evaluate("() => document.querySelector('.slide:not([hidden])').dataset.key")
        check(got == want, f"first-release link #{legacy} opens '{want}' (got {got})")
    legacy_visited = page.evaluate("""() => { localStorage.setItem('dm.visited', JSON.stringify(['trees-5', 'graphs-10'])); return true; }""")
    page.reload()
    wait_ready(page)
    saved = page.evaluate("() => JSON.parse(localStorage.getItem('dm.visited'))")
    check(slide_key(page, "trees", title_re=r"binary search trees") in saved and slide_key(page, "graphs", title_re=r"dijkstra") in saved,
          f"first-release visited keys migrate to the lessons they named (saved: {saved})")

    # the course map marks a module complete only when every current key of it is visited
    page.evaluate("() => localStorage.setItem('dm.visited', JSON.stringify(DM.modules.flatMap((m) => m.slides.map((s, i) => DM.keyOf(m.id, i)))))")
    page.reload()
    wait_ready(page)
    goto_slide(page, slide_key(page, "welcome", title_re=r"map"))
    done = page.evaluate("() => document.querySelectorAll('.slide:not([hidden]) .map svg:first-of-type .node.done').length")
    total = page.evaluate("() => document.querySelectorAll('.slide:not([hidden]) .map svg:first-of-type .node').length")
    check(done == total and total > 0, f"course map shows every module complete when all slides are visited ({done}/{total})")
    page.evaluate("() => localStorage.removeItem('dm.visited')")

    # Hamiltonian lab: toolbar actions keep keyboard focus
    goto_slide(page, slide_key(page, "graphs", title_re=r"hamiltonian cycle", kind="lab"))
    # SVG groups have no click() method; dispatch the event instead
    page.evaluate(f"() => document.querySelector('{ACTIVE} .gv').dispatchEvent(new MouseEvent('click', {{bubbles: true}}))")
    page.evaluate(f"() => document.querySelectorAll('{ACTIVE} .gv')[1].dispatchEvent(new MouseEvent('click', {{bubbles: true}}))")
    page.focus(f"{ACTIVE} [data-act='undo']")
    page.keyboard.press("Enter")
    page.wait_for_timeout(60)
    check(page.evaluate("() => document.activeElement?.dataset.act === 'undo'"), "Hamiltonian lab: Undo keeps focus on Undo")
    page.keyboard.press("Enter")
    page.wait_for_timeout(60)
    check(page.evaluate("() => ['undo', 'restart'].includes(document.activeElement?.dataset.act)"), "Hamiltonian lab: a second Undo keeps focus in the toolbar (Restart once Undo is disabled)")
    page.focus(f"{ACTIVE} [data-act='explain']")
    page.keyboard.press("Enter")
    page.wait_for_timeout(60)
    check(page.evaluate("() => document.activeElement?.dataset.act === 'explain'"), "Hamiltonian lab: toggling Explain keeps focus on the button")

    # the Python engine state machine: a failed restart forgets the engine so the next Run retries from scratch
    if requested == "pyodide":
        goto_slide(page, code_slide)
        out = edit_and_run("print('warm')")
        check(out.strip() == "warm", "[pyodide] engine warm before the restart test")
        restart = page.evaluate("""async () => {
            const original = DM.py._boot;
            DM.py._kill();                                   // simulate a timeout that discarded the worker
            DM.py._boot = () => Promise.reject(new Error('simulated restart failure'));
            let failed = false;
            try { await DM.py.run('print(1)'); } catch (e) { failed = true; }
            const afterFailure = { failed, state: DM.py.state, ensureCleared: DM.py._ensure === null, worker: DM.py.worker === null };
            DM.py._boot = original;
            const res = await DM.py.run('print(2)');
            return { afterFailure, recovered: res.out.trim() === '2', engine: DM.py.engine, state: DM.py.state };
        }""")
        check(restart["afterFailure"]["failed"] and restart["afterFailure"]["state"] == "failed" and restart["afterFailure"]["ensureCleared"],
              f"[pyodide] a failed worker restart reports failure and forgets the engine ({restart['afterFailure']})")
        check(restart["recovered"] and restart["state"] == "ready", f"[pyodide] the next Run re-selects an engine and succeeds ({restart})")

    # with motion enabled, two quick presses during a view transition still land two slides on
    motion = browser.new_context(viewport={"width": 1280, "height": 720}, reduced_motion="no-preference")
    mpage = motion.new_page()
    mpage.on("pageerror", lambda e: page_errors.append(f"pageerror (motion): {e}"))
    mpage.goto(base)
    wait_ready(mpage)
    goto_slide(mpage, slide_key(mpage, "sets", kind="concept", nth=1))
    keys_all = mpage.evaluate("() => DM.modules.flatMap((m) => m.slides.map((s, i) => DM.keyOf(m.id, i)))")
    start = mpage.evaluate("() => document.querySelector('.slide:not([hidden])').dataset.key")
    mpage.keyboard.press("ArrowRight")
    mpage.keyboard.press("ArrowRight")
    try:
        mpage.wait_for_function("(k) => document.querySelector('.slide:not([hidden])')?.dataset.key === k", arg=keys_all[keys_all.index(start) + 2], timeout=5000)
        check(True, "with view transitions on, two quick arrow presses advance two slides")
    except Exception:  # noqa: BLE001
        landed = mpage.evaluate("() => document.querySelector('.slide:not([hidden])').dataset.key")
        check(False, f"with view transitions on, two quick arrow presses advance two slides (landed on {landed})")
    motion.close()

    # The formula renderer failing to download, whether before or after boot, must leave a visible notice.
    # ?boot=manual holds the page before boot so the failure is forced to arrive first.
    if requested == "pyodide":
        for when in ("before boot", "after boot"):
            nk = browser.new_context(viewport={"width": 1280, "height": 720}, reduced_motion="reduce")
            kpage = nk.new_page()
            kpage.on("pageerror", lambda e: page_errors.append(f"pageerror (katex {when}): {e}"))
            sep = "&" if "?" in base else "?"
            if when == "before boot":
                kpage.route("**/katex*/**", lambda route: route.abort())
                kpage.goto(base + sep + "boot=manual")
                kpage.wait_for_function("window.DM && DM.mathState === 'failed'", timeout=15000)
                check(kpage.evaluate("() => !document.querySelector('#notice') && document.body.dataset.ready !== '1'"), "the renderer failure arrived before boot (page still held)")
                kpage.evaluate("() => DM.boot()")
            else:
                kpage.goto(base)
                kpage.wait_for_function("document.body.dataset.ready === '1'")
                kpage.evaluate("() => DM.mathFailed()")
            kpage.wait_for_function("document.body.dataset.ready === '1'")
            shown = kpage.evaluate("() => { const n = document.querySelector('#notice'); return !!n && !n.hidden && /formula renderer/.test(n.textContent); }")
            check(shown, f"a failed formula-renderer download {when} shows the notice")
            nk.close()

    # Offline classroom: with both Python CDNs unreachable, Run must give up within about half a
    # minute, show the expected output, and try again (successfully) once the network is back.
    if requested == "pyodide":
        offline = browser.new_context(viewport={"width": 1280, "height": 720}, reduced_motion="reduce")
        opage = offline.new_page()
        opage.on("pageerror", lambda e: page_errors.append(f"pageerror (offline): {e}"))
        opage.route("**/pyodide*/**", lambda route: route.abort())
        opage.route("**/brython/**", lambda route: route.abort())
        opage.goto(base)
        wait_ready(opage)
        goto_slide(opage, code_slide)
        opage.click(f"{ACTIVE} .cw-out-head .btn.primary")
        import time
        t0 = time.time()
        try:
            opage.wait_for_function("() => DM.py.state === 'failed'", timeout=60000)
            took = time.time() - t0
            check(took < 45, f"offline Python gives up in {took:.0f}s (under 45s)")
        except Exception:  # noqa: BLE001
            check(False, "offline Python gives up within 60s")
        opage.wait_for_timeout(200)
        out = opage.evaluate(f"() => document.querySelector('{ACTIVE} .cw-out pre').textContent")
        check("Expected output" in out, "offline Run shows the expected output instead of hanging")
        check(opage.evaluate("() => DM.py._ensure === null"), "a failed engine load is forgotten so the next Run can retry")
        opage.unroute("**/pyodide*/**")
        opage.unroute("**/brython/**")
        opage.click(f"{ACTIVE} .cw-out-head .btn.primary")
        try:
            opage.wait_for_function("() => DM.py.state === 'ready'", timeout=90000)
            check(True, "Python loads on the next Run once the network is back")
        except Exception:  # noqa: BLE001
            check(False, "Python loads on the next Run once the network is back")
        offline.close()

    browser.close()
srv.shutdown()
sys.exit(check.finish(page_errors))
