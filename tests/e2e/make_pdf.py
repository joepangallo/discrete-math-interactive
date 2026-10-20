"""Renders the PDF companion from the built course page.

Every slide becomes one 16:9 page, followed by extra pages that expand what the interactive
version reveals one piece at a time: every code line with its explanation, every quiz answer
with its reasoning, sample practice problems with worked solutions, and all design principles.

Usage: python3 tests/e2e/make_pdf.py discrete-math-interactive.html discrete-math-companion.pdf
"""
import functools
import http.server
import os
import sys
import threading

from playwright.sync_api import sync_playwright

src, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
root, name = os.path.split(src)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()

with sync_playwright() as p:
    try:
        browser = p.chromium.launch()
    except Exception:  # noqa: BLE001
        browser = p.chromium.launch(channel="chrome")
    page = browser.new_page(viewport={"width": 1280, "height": 720}, color_scheme="light")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{srv.server_address[1]}/{name}?print=1")
    page.wait_for_function("document.body.dataset.printReady === '1'", timeout=60000)
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(1500)
    n = page.evaluate("document.querySelectorAll('.print-page').length")
    clipped = page.evaluate("""() => [...document.querySelectorAll('.print-page')].map((pg, i) => {
        const sl = pg.querySelector('.slide'); const over = sl.scrollHeight - sl.clientHeight;
        const flow = pg.querySelector('.print-flow'); const overX = flow ? flow.scrollWidth - flow.clientWidth : 0;
        if (overX > 4) return `page ${i + 1} (${pg.querySelector('h2')?.textContent.slice(0, 70)}): columns overflow +${overX}px`;
        return over > 4 ? `page ${i + 1} (${pg.querySelector('h2')?.textContent.slice(0, 70)}): +${over}px` : null; }).filter(Boolean)""")
    for c in clipped:
        print("CLIPPED", c)
    page.emulate_media(media="print")
    page.pdf(path=out, prefer_css_page_size=True, print_background=True)
    browser.close()
srv.shutdown()
print(f"wrote {out}: {n} pages" + (f", {len(errors)} page errors: {errors[:3]}" if errors else ""))
sys.exit(1 if errors else 0)
