"""Renders the PDF companion from the built course page.

Every slide becomes one 16:9 page, followed by extra pages that expand what the interactive
version reveals one piece at a time: every code line with its explanation, every quiz answer
with its reasoning, sample practice problems with worked solutions, and all design principles.
A clipped page fails the run, because a PDF nobody re-reads is where clipped content hides.

Usage: python3 tests/e2e/make_pdf.py discrete-math-interactive.html discrete-math-companion.pdf [--allow-clipped]
"""
import argparse
import os
import sys

from playwright.sync_api import sync_playwright

from _harness import fonts_ok, launch, serve

ap = argparse.ArgumentParser()
ap.add_argument("html")
ap.add_argument("pdf")
ap.add_argument("--allow-clipped", action="store_true", help="write the PDF even when a page is clipped")
args = ap.parse_args()
out = os.path.abspath(args.pdf)
srv, base = serve(args.html)

with sync_playwright() as p:
    browser = launch(p)
    page = browser.new_page(viewport={"width": 1280, "height": 720}, color_scheme="light")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(base + "?print=1")
    page.wait_for_function("document.body.dataset.printReady === '1'", timeout=120000)
    page.wait_for_function("window.katex", timeout=60000)
    if not fonts_ok(page):
        errors.append("the web fonts did not load; the PDF would use fallback fonts")
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
    if not clipped or args.allow_clipped:
        page.pdf(path=out, prefer_css_page_size=True, print_background=True)
    browser.close()
srv.shutdown()
status = f"{n} pages" + (f", {len(errors)} page errors: {errors[:3]}" if errors else "") + (f", {len(clipped)} clipped" if clipped else "")
print(("wrote " + out + ": " if not clipped or args.allow_clipped else "not written: ") + status)
sys.exit(1 if errors or (clipped and not args.allow_clipped) else 0)
