"""Student-facing arithmetic and recurrence regressions.

Usage: python3 tests/e2e/math_regressions.py discrete-math-interactive.html
Requires Python Playwright and either its Chromium or Google Chrome.
"""
import argparse
import sys

from playwright.sync_api import sync_playwright

from _harness import Checks, goto_slide, launch, serve, slide_key, wait_ready


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("html")
    args = parser.parse_args()
    check = Checks()
    srv, base = serve(args.html)

    with sync_playwright() as p:
        browser = launch(p)
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(base)
        wait_ready(page)
        conjecture_key = slide_key(page, "proofs", title_re=r"conjecture tester")
        goto_slide(page, conjecture_key)
        page.get_by_role("button", name="Your own claim", exact=True).click()
        conjecture = page.locator(f'section[data-key="{conjecture_key}"]')

        # The first three cases used to fabricate counterexamples through lost integer bits.
        # The fractional cases also distinguish exact arithmetic from a final-result guard.
        cases = [
            ("2^n + 1", "is odd", "60 hold", "no counterexample yet"),
            ("(2^n + 1) - 2^n", "is odd", "60 hold", "no counterexample yet"),
            ("9007199254740993 - 9007199254740992", "is odd", "60 hold", "no counterexample yet"),
            ("1/10 + 2/10 - 3/10", "is positive", "60 fail", "disproved"),
            ("1/3 + 1/3 + 1/3", "is odd", "60 hold", "no counterexample yet"),
            ("n/2", "is even", "15 hold, 45 fail", "disproved"),
            ("-n", "is positive", "60 fail", "disproved"),
            ("(2^n)^2", "is a perfect square", "60 hold", "no counterexample yet"),
            ("(2^n)^2 - 1", "is a perfect square", "60 fail", "disproved"),
            ("(1/2) % (1/3)", "is positive", "60 hold", "no counterexample yet"),
            ("2^-n", "is positive", "60 hold", "no counterexample yet"),
            ("41", "is prime", "60 hold", "no counterexample yet"),
            ("(2^5000 + 1) - 2^5000", "is odd", "60 could not be tested", "incomplete check"),
            ("1/(n-n)", "is positive", "60 could not be tested", "incomplete check"),
            ("n^(1/2)", "is a perfect square", "60 could not be tested", "incomplete check"),
        ]
        for formula, prop, count, verdict in cases:
            page.get_by_role("textbox", name="f(n)", exact=True).fill(formula)
            page.get_by_role("combobox", name="Property", exact=True).select_option(prop)
            text = conjecture.inner_text()
            badge = conjecture.locator(".pf-badge").text_content()
            ok = count in text and badge == verdict
            if verdict == "incomplete check":
                ok = ok and "Every tested case holds" not in text and "First counterexample" not in text
            check(ok, f"conjecture {formula!r} {prop}: expected '{count}' / {verdict} (got badge {badge!r})")

        recurrence_key = slide_key(page, "recurrences", title_re=r"characteristic-equation solver")
        goto_slide(page, recurrence_key)
        recurrence = page.locator(f'section[data-key="{recurrence_key}"]')
        # Cover cancellation, zero solutions, repeated unit roots, negative roots,
        # opposite real roots, and complex roots without assuming periodicity.
        cases = [
            ((5, -6, 1, 2), "dominant active root is 2", "ratio approaches 2"),
            ((5, -6, 0.3, 0.6), "dominant active root is 2", "ratio approaches 2"),
            ((3.3, -2.42, 3, 3.3), "dominant active root is 1.1", "ratio approaches 1.1"),
            ((0.2, -0.01, 1, 0.2), "one repeated root", "nonzero n · rⁿ term"),
            ((0.2, -0.01, 0.3, 0.03), "one repeated root", "dominant active root is 0.1"),
            ((5, -6, 0.3, 0.6000000000000001), "dominant active root is 3", "ratio approaches 3"),
            ((5, -6, 0, 1e-12), "dominant active root is 3", "ratio approaches 3"),
            ((5, -6, 1e-20, 2e-20), "dominant active root is 2", "ratio approaches 2"),
            ((0.2, -0.010000000000000002, 1, 0.2), "pair of complex numbers", "oscillations shrink toward 0"),
            ((0.2, -0.009999999999999998, 1, 0.2), "two different real roots", "terms shrink toward 0"),
            ((2e-160, -1e-320, 1, 2e-160), "one repeated root", "exponential decay outweighs"),
            ((2.0000000000000003e-160, -1e-320, 1, 2e-160), "two different real roots", "terms shrink toward 0"),
            ((1.9999999999999997e-160, -1e-320, 1, 2e-160), "pair of complex numbers", "oscillations shrink toward 0"),
            ((5, -6, 0, 0), "every term is 0", "ratio of consecutive terms is undefined"),
            ((2, -1, 0, 1), "magnitude grows linearly", "ratio approaches 1"),
            ((-2, -1, 0, -1), "magnitude grows linearly", "signs eventually alternate"),
            ((2, -1, 3, 3), "approach a nonzero constant", "ratio approaches 1"),
            ((1, -0.25, 1, 1), "exponential decay outweighs", "ratio approaches 0.5"),
            ((-5, -6, 1, -2), "dominant active root is −2", "signs eventually alternate"),
            ((0, 4, 1, 0), "equal magnitudes and opposite signs", "ratios need not converge"),
            ((0, 1, 1, 0), "sequence is bounded", "odd-index terms have another"),
            ((1, -1, 1, 1), "stay bounded and oscillate", "need not repeat periodically"),
            ((1, -4, 1, 1), "oscillation envelope grows", "ratios need not converge"),
            ((0.5, -0.25, 1, 1), "oscillations shrink toward 0", "ratios need not converge"),
            ((0, -0.0000000000001, 1, 1), "oscillations shrink toward 0", "ratios need not converge"),
        ]
        for values, first, second in cases:
            for key, value in zip(("c1", "c2", "a0", "a1"), values):
                page.locator(f"#rc-ce-{key}").fill(str(value))
            text = recurrence.locator(".rc-steps").inner_text()
            check(first in text and second in text and "Mismatch: check the inputs" not in recurrence.inner_text(),
                  f"recurrence {values}: expected '{first}' and '{second}'")

        browser.close()
    srv.shutdown()
    return check.finish([f"pageerror: {e}" for e in errors])


if __name__ == "__main__":
    sys.exit(main())
