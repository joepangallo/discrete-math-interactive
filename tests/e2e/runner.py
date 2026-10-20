"""Python-runner robustness tests (both engines).

Checks that an endless loop is stopped and the next run still works, that a program which
breaks json.dumps cannot wedge the page, that a trace finishing after the student switched to
Edit mode does not overwrite the editor, and that arrow keys on a mode tab switch tabs, not slides.

Usage: python3 tests/e2e/runner.py discrete-math-interactive.html [--query py=brython]
"""
import argparse
import functools
import http.server
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("html")
ap.add_argument("--query", default="")
args = ap.parse_args()
root, name = os.path.split(os.path.abspath(args.html))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_address[1]}/{name}" + (f"?{args.query}" if args.query else "")
failures = []
ACTIVE = ".slide:not([hidden])"


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        failures.append(msg)


with sync_playwright() as p:
    try:
        browser = p.chromium.launch()
    except Exception:  # noqa: BLE001
        browser = p.chromium.launch(channel="chrome")
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.on("pageerror", lambda e: failures.append(f"pageerror: {e}"))
    page.goto(base + "#sets-7")
    page.wait_for_function("document.body.dataset.ready === '1'")

    def edit_and_run(code, timeout=90000):
        page.click(f"{ACTIVE} .cw-bar [role=tab]:nth-child(2)")
        page.fill(f"{ACTIVE} .editor textarea", code)
        page.click(f"{ACTIVE} .cw-out-head .btn.primary")
        page.wait_for_function(f"() => !document.querySelector('{ACTIVE} .cw-out pre').textContent.startsWith('Running')", timeout=timeout)
        return page.evaluate(f"() => document.querySelector('{ACTIVE} .cw-out pre').textContent")

    out = edit_and_run("print(6 * 7)")
    engine = page.evaluate("DM.py.engine")
    check(out.strip() == "42", f"[{engine}] simple run prints 42 (got {out.strip()[:60]!r})")

    out = edit_and_run("while True:\n    pass", timeout=40000)
    check("Timeout" in out, f"[{engine}] endless loop is stopped by the timeout")
    check(page.evaluate("document.querySelector('#next') && !document.querySelector('#next').disabled"), f"[{engine}] page stays responsive")

    out = edit_and_run("print('after the loop')")
    check(out.strip() == "after the loop", f"[{engine}] the next run works after a timeout (got {out.strip()[:60]!r})")

    out = edit_and_run("import json\njson.dumps = lambda *a, **k: 'x'\nprint('patched')")
    out2 = edit_and_run("print('still fine')")
    check(out2.strip() == "still fine", f"[{engine}] replacing json.dumps cannot break later runs (got {out2.strip()[:60]!r})")

    if engine == "pyodide":
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

    page.focus(f"{ACTIVE} .cw-bar [role=tab]:nth-child(2)")
    page.keyboard.press("Control+k")
    check(page.evaluate("!!document.querySelector('#dlg-palette[open]')"), "Ctrl+K opens search")
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

    page.evaluate("() => { localStorage.setItem('dm.visited', '\"{}\"'); localStorage.setItem('dm.last', '{\"x\":1}'); localStorage.setItem('dm.score.sets', 'null'); }")
    page.reload()
    page.wait_for_function("document.body.dataset.ready === '1'", timeout=15000)
    page.evaluate("(k) => { location.hash = k; }", "sets-11")
    page.wait_for_timeout(300)
    check(page.evaluate(f"() => !!document.querySelector('{ACTIVE} .pr-score b')"), "odd localStorage values do not break startup or practice")
    browser.close()
srv.shutdown()
print(f"{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
