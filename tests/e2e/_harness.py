"""Shared plumbing for the browser tests: a quiet local server, a browser that falls back to an
installed Chrome when Playwright's own Chromium is missing, and slide lookup by title so the
scripts survive slides being inserted or reordered.

Import from the other scripts in this directory:  from _harness import serve, launch, slide_key
"""
import functools
import http.server
import os
import re
import sys
import threading


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve(html_path):
    """Serves the directory holding html_path on a loopback port; returns (server, url)."""
    root, name = os.path.split(os.path.abspath(html_path))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_Quiet, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/{name}"


def launch(playwright, **kwargs):
    """Playwright's bundled Chromium, or the installed Google Chrome when that is unavailable."""
    try:
        return playwright.chromium.launch(**kwargs)
    except Exception as e:  # noqa: BLE001
        print(f"note: Playwright's Chromium is unavailable ({str(e).splitlines()[0][:80]}); using the installed Chrome. "
              "Run `python3 -m playwright install chromium` for a pinned browser.", file=sys.stderr)
        return playwright.chromium.launch(channel="chrome", **kwargs)


FONT_FACES = ['1em "Atkinson Hyperlegible Next"', '1em "Atkinson Hyperlegible Mono"', '1em "STIX Two Text"']

# document.fonts.status === 'loaded' only says loading has finished; a blocked font host also ends
# "loaded" with fallback fonts in place, so the intended faces are requested and checked explicitly.
FONTS_OK_JS = """async (faces) => {
    const sets = await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => [])));
    await document.fonts.ready;
    return sets.every((s) => s.length > 0) && faces.every((f) => document.fonts.check(f));
}"""


def fonts_ok(page):
    return page.evaluate(FONTS_OK_JS, FONT_FACES)


def wait_ready(page, timeout=30000):
    """Waits for the course to boot and for the math renderer and the real web fonts to arrive."""
    page.wait_for_function("document.body.dataset.ready === '1'", timeout=timeout)
    page.wait_for_function("window.katex", timeout=timeout)
    if not fonts_ok(page):
        raise SystemExit("the web fonts did not load; layout results would not match what students see")


def slide_key(page, module, title_re=None, kind=None, nth=0):
    """The hash key of a slide found by module id plus a title pattern and/or kind.

    Keys come from slide ids or title slugs (see slideKey in core.js), so tests look slides up this
    way instead of hard-coding "sets-7"."""
    key = page.evaluate(
        """([mod, pat, kind, nth]) => {
            const m = DM.modules.find((x) => x.id === mod);
            if (!m) return null;
            const re = pat ? new RegExp(pat, 'i') : null;
            const hits = m.slides.map((s, i) => ({ s, i })).filter(({ s }) =>
              (!re || re.test(s.title.replace(/<[^>]+>/g, ''))) && (!kind || (s.kind || 'concept') === kind));
            const hit = hits[nth];
            return hit ? DM.keyOf(mod, hit.i) : null;
        }""",
        [module, title_re, kind, nth],
    )
    if not key:
        raise SystemExit(f"no slide in module '{module}' matches title {title_re!r} kind {kind!r}")
    return key


def goto_slide(page, key):
    page.evaluate("(k) => DM.goTo(k, {instant: true})", key)
    page.wait_for_function("(k) => document.querySelector('.slide:not([hidden])')?.dataset.key === k", arg=key, timeout=5000)


class Checks:
    """Collects PASS/FAIL lines without relying on `assert`, which `python3 -O` would strip."""

    def __init__(self):
        self.failures = []
        self.count = 0

    def __call__(self, cond, msg):
        self.count += 1
        print(("PASS " if cond else "FAIL ") + msg)
        if not cond:
            self.failures.append(msg)
        return cond

    def finish(self, extra_failures=()):
        failures = list(self.failures) + list(extra_failures)
        print(f"{self.count} check(s), {len(failures)} failure(s)")
        for f in failures:
            print("FAIL", f)
        return 1 if failures else 0


def title_matches(title, pattern):
    return re.search(pattern, re.sub(r"<[^>]+>", "", title), re.I) is not None
