"""Student-facing arithmetic and recurrence regressions.

Usage: python3 tests/e2e/math_regressions.py /tmp/discrete-math.html
Build first with: node src/build.mjs --out /tmp/discrete-math.html
Requires Python Playwright and either its Chromium or Google Chrome.
"""
import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("html", type=Path)
    args = parser.parse_args()
    checks = 0

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception:  # Chromium may be supplied by an installed Chrome instead.
            browser = p.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(args.html.resolve().as_uri())
        page.wait_for_function("document.body.dataset.ready === '1'")
        page.evaluate("DM.goTo('proofs-6', {instant: true})")
        page.get_by_role("button", name="Your own claim", exact=True).click()
        conjecture = page.locator('section[data-key="proofs-6"]')

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
            assert count in text, (formula, prop, text)
            assert conjecture.locator(".pf-badge").text_content() == verdict, (formula, verdict)
            if verdict == "incomplete check":
                assert "Every tested case holds" not in text, formula
                assert "First counterexample" not in text, formula
            checks += 1

        page.evaluate("DM.goTo('recurrences-7', {instant: true})")
        recurrence = page.locator('section[data-key="recurrences-7"]')
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
            assert first in text and second in text, (values, text)
            assert "Mismatch: check the inputs" not in recurrence.inner_text(), values
            checks += 1

        assert not errors, errors
        browser.close()
    print(f"PASS: {checks} math UI regression cases; no browser errors")


if __name__ == "__main__":
    main()
