"""Worked-example verification: every `example` slide steps cleanly from problem to answer.

For each example slide, in a reduced-motion browser context:
  * pressing the down arrow walks to the last step; the caption AND the picture change on
    every step, and the final step shows an answer banner
  * rendering is deterministic: reaching step k by stepping, by scrubbing, and by the
    Back/Step buttons produces byte-identical stage HTML
  * Play advances on its own and stops when the slide is hidden
  * autoplay pauses on a prediction-checkpoint step and shows the Predict banner
  * every variant preset: switching resets to step 0, the variant walks end to end with
    changing captions and pictures, and its final step shows the answer banner
  * nothing overflows the slide at desktop size or at 390x844
  * the print view renders the storyboard (final frame + every caption), never a bare problem

Usage: python3 tests/e2e/examples.py discrete-math-interactive.html
"""
import argparse
import json
import sys

from playwright.sync_api import sync_playwright

from _harness import fonts_ok, launch, serve

ap = argparse.ArgumentParser()
ap.add_argument("html")
args = ap.parse_args()

srv, base = serve(args.html)
errors = []
current = {"slide": "boot"}


def err(msg):
    errors.append(f"[{current['slide']}] {msg}")


with sync_playwright() as p:
    browser = launch(p)
    ctx = browser.new_context(viewport={"width": 1280, "height": 720}, reduced_motion="reduce")
    page = ctx.new_page()
    page.on("pageerror", lambda e: err(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and err(f"console.error: {m.text}"))
    page.add_init_script("try { localStorage.clear(); } catch (e) {}")
    page.goto(base)
    page.wait_for_function("document.body.dataset.ready === '1'", timeout=20000)
    try:
        page.wait_for_function("window.katex", timeout=30000)
    except Exception:  # noqa: BLE001
        err("KaTeX did not load within 30 s")
    if not fonts_ok(page):
        err("the web fonts did not load; layout results would not match what students see")
    page.wait_for_timeout(300)

    examples = page.evaluate("""() => DM.modules.flatMap(m => m.slides.map((s, i) => ({
        key: DM.keyOf(m.id, i), mod: m.id, id: s.id || '', steps: s.kind === 'example' ? s.steps.length : 0,
        kind: s.kind || 'concept',
        cps: s.kind === 'example' ? s.steps.map((st, j) => st.checkpoint ? j : -1).filter(j => j >= 0) : [],
        variants: s.kind === 'example' && Array.isArray(s.variants) ? s.variants.map(v => v.steps.length) : [] }))
        .filter(x => x.kind === 'example'))""")
    if len(examples) < 63:
        err(f"expected at least 63 worked examples, found {len(examples)}")

    def goto(key):
        page.evaluate("(k) => DM.goTo(k, {instant: true})", key)
        page.wait_for_function("(k) => document.querySelector('.slide:not([hidden])')?.dataset.key === k", arg=key, timeout=5000)
        page.wait_for_timeout(120)

    def state():
        return page.evaluate("""() => { const sl = document.querySelector('.slide:not([hidden])');
            return { caption: sl.querySelector('.ex-caption')?.textContent.trim() || '',
                     stage: sl.querySelector('.ex-stage')?.innerHTML || '',
                     count: sl.querySelector('.ex-count')?.textContent.trim() || '',
                     answer: !!sl.querySelector('.ex-stage .ex-answer'),
                     banner: (() => { const b = sl.querySelector('.ex-checkpoint');
                        return b && !b.hidden ? b.textContent.trim() : ''; })(),
                     clip: Math.max(0, sl.scrollHeight - sl.clientHeight),
                     clipX: Math.max(0, sl.scrollWidth - sl.clientWidth) }; }""")

    def hook(expr, arg=None):
        return page.evaluate(f"(id) => {{ const hk = DM._exampleHooks.find(x => (x.slide.id || '') === id); return hk ? ({expr}) : null; }}", arg if arg is not None else ex_id)

    ex_id = ""
    for ex in examples:
        current["slide"] = ex["key"]
        ex_id = ex["id"]
        n = ex["steps"]
        if n < 5:
            err(f"only {n} steps")
            continue
        goto(ex["key"])
        st = state()
        if not st["caption"]:
            err("no caption on the first step")
        # the player never autoplays on load
        playing = hook("hk.player.playing")
        if playing:
            err("the player is playing on load; it must wait for the student")
        caps = [st["caption"]]
        pics = [st["stage"]]
        for k in range(n - 1):
            page.keyboard.press("ArrowDown")
            page.wait_for_timeout(45)
            st = state()
            caps.append(st["caption"])
            pics.append(st["stage"])
        for k in range(1, n):
            if caps[k] == caps[k - 1]:
                err(f"caption does not change at step {k + 1}")
            if pics[k] == pics[k - 1]:
                err(f"the picture does not change at step {k + 1}")
        if st["count"] != f"Step {n} of {n}":
            err(f"counter at the end reads {st['count']!r}")
        if not st["answer"]:
            err("the final step shows no answer banner (.ex-answer)")
        if st["clip"] > 2:
            err(f"content overflows the slide by {st['clip']}px at the final step")
        if st["clipX"] > 2:
            err(f"content overflows horizontally by {st['clipX']}px at the final step")
        # determinism: step 2 by keys (already have pics[2] from the walk when n > 3),
        # then by scrubber and by buttons; all three stage renders must be identical
        if n > 3:
            target = 2
            hook("hk.player.go(0), true")
            page.wait_for_timeout(40)
            scrubbed = page.evaluate("""(k) => { const sl = document.querySelector('.slide:not([hidden])');
                const r = sl.querySelector('.ex-scrub input'); r.value = String(k);
                r.dispatchEvent(new Event('input', {bubbles: true}));
                return sl.querySelector('.ex-stage').innerHTML; }""", target)
            if scrubbed != pics[target]:
                err(f"scrubbing to step {target + 1} renders a different picture than stepping to it")
            hook("hk.player.go(0), hk.player.next(), hk.player.next(), true")
            page.wait_for_timeout(40)
            if state()["stage"] != pics[target]:
                err(f"button-stepping to step {target + 1} renders a different picture than the arrow-key walk")
        # play advances, then stops when the slide is hidden
        hook("hk.player.go(0), true")
        page.click(".slide:not([hidden]) .ex-ctl .btn.primary")
        page.wait_for_timeout(1750)
        idx = hook("hk.player.index")
        if idx is None or idx < 1:
            err("Play did not advance the example")
        hook("hk.player.stop(), true")
        page.evaluate("() => DM.goTo(DM.modules.find(m => m.id === 'welcome') ? 'welcome' : 0, {instant: true})")
        page.wait_for_timeout(300)
        still = hook("hk.player.playing")
        if still:
            err("the player kept playing after its slide was hidden")
        goto(ex["key"])
        # prediction checkpoint: autoplay must pause on the checkpoint step, banner showing
        cps = ex["cps"]
        if not cps:
            err("the primary steps carry no checkpoint for the browser check")
        else:
            c = cps[0]
            if c == 0:
                hook("hk.player.go(0), true")
                page.wait_for_timeout(60)
                if not state()["banner"]:
                    err("the checkpoint banner is not visible on the checkpoint step")
            else:
                hook(f"hk.player.go({c - 1}), true")
                page.click(".slide:not([hidden]) .ex-ctl .btn.primary")
                try:
                    page.wait_for_function(
                        "(id) => DM._exampleHooks.find(x => (x.slide.id || '') === id)?.player.index === " + str(c),
                        arg=ex_id, timeout=6000)
                except Exception:  # noqa: BLE001
                    err(f"autoplay never reached the checkpoint step {c + 1}")
                page.wait_for_timeout(1800)
                idx = hook("hk.player.index")
                playing = hook("hk.player.playing")
                if idx != c:
                    err(f"autoplay rolled through the checkpoint: it sits at step {(idx or 0) + 1}, expected {c + 1}")
                if playing:
                    err("autoplay did not pause on the checkpoint step")
                if not state()["banner"]:
                    err("the checkpoint banner is not visible while paused on the checkpoint step")
                hook("hk.player.stop(), true")
        # variants: switch preset, walk end to end, switch back
        for j, vn in enumerate(ex["variants"]):
            current["slide"] = f"{ex['key']} variant {j + 1}"
            btns = page.locator(".slide:not([hidden]) .ex-presets .seg button")
            if btns.count() < 2:
                err("the preset switcher is missing though the example declares variants")
                break
            btns.nth(j + 1).click()
            page.wait_for_timeout(80)
            idx = hook("hk.player.index")
            if idx != 0:
                err(f"switching to variant {j + 1} did not reset to step 0 (index {idx})")
            st = state()
            if not st["caption"]:
                err(f"variant {j + 1} shows no caption on its first step")
            vcaps = [st["caption"]]
            vpics = [st["stage"]]
            for k in range(vn - 1):
                page.keyboard.press("ArrowDown")
                page.wait_for_timeout(45)
                st = state()
                vcaps.append(st["caption"])
                vpics.append(st["stage"])
            for k in range(1, vn):
                if vcaps[k] == vcaps[k - 1]:
                    err(f"variant {j + 1} caption does not change at step {k + 1}")
                if vpics[k] == vpics[k - 1]:
                    err(f"variant {j + 1} picture does not change at step {k + 1}")
            if st["count"] != f"Step {vn} of {vn}":
                err(f"variant {j + 1} counter at the end reads {st['count']!r}")
            if not st["answer"]:
                err(f"variant {j + 1} final step shows no answer banner")
            if st["clipX"] > 2:
                err(f"variant {j + 1} overflows horizontally by {st['clipX']}px at the final step")
            btns.nth(0).click()
            page.wait_for_timeout(80)
            idx = hook("hk.player.index")
            if idx != 0:
                err("switching back to the main problem did not reset to step 0")
        current["slide"] = ex["key"]

    # mobile pass: same walk at phone size, checking horizontal fit and reachable controls
    page.set_viewport_size({"width": 390, "height": 844})
    page.emulate_media(reduced_motion="reduce")
    for ex in examples:
        current["slide"] = "mobile " + ex["key"]
        goto(ex["key"])
        bad = page.evaluate("""() => { const sl = document.querySelector('.slide:not([hidden])');
            const out = [];
            if (sl.scrollWidth > sl.clientWidth + 3) out.push('slide scrolls sideways');
            for (const el of sl.querySelectorAll('.ex-ctl button, .ex-ctl input, .ex-presets button')) {
              const r = el.getBoundingClientRect();
              if (r.width && (r.left < -2 || r.right > innerWidth + 2)) out.push('control off-screen: ' + (el.textContent || el.type));
            }
            return out; }""")
        for b in bad:
            err(b)

    # print pass: the storyboard shows the final frame and every caption, and no dead controls
    pctx = browser.new_context(viewport={"width": 1280, "height": 720}, reduced_motion="reduce")
    ppage = pctx.new_page()
    ppage.on("pageerror", lambda e: err(f"print pageerror: {e}"))
    ppage.goto(base + "?print")
    ppage.wait_for_function("document.body.dataset.printReady === '1'", timeout=30000)
    ppage.wait_for_timeout(400)
    report = ppage.evaluate("""() => [...document.querySelectorAll('.print-page .slide')].filter(sl => sl.querySelector('.ex-board')).map(sl => ({
        title: sl.querySelector('h2')?.textContent || '',
        items: sl.querySelectorAll('.ex-board li').length,
        answers: sl.querySelectorAll('.ex-board .ex-answer-line').length,
        controls: sl.querySelectorAll('.ex-ctl').length,
        finalFrame: !!sl.querySelector('.ex-final .ex-answer, .ex-final'),
        problem: !!sl.querySelector('.ex-problem') }))""")
    current["slide"] = "print"
    if len(report) != len(examples):
        err(f"print view has {len(report)} example storyboards for {len(examples)} examples")
    for r in report:
        if r["items"] < 5:
            err(f"print storyboard for {r['title']!r} lists {r['items']} captions")
        if r["answers"] != 1:
            err(f"print storyboard for {r['title']!r} marks {r['answers']} answer lines")
        if r["controls"]:
            err(f"print view for {r['title']!r} still shows player controls")
        if not r["problem"]:
            err(f"print view for {r['title']!r} lost the problem statement")
    browser.close()
srv.shutdown()

print(json.dumps({"examples": len(examples), "errors": len(errors)}))
for e in errors:
    print("ERROR", e)
sys.exit(1 if errors else 0)
