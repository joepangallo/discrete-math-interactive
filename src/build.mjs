/* Builds the single-file course page from src/.
   Usage: node src/build.mjs [--out file.html] [--only 01,02] [--artifact fragment.html] [--no-index]
   The page is shell.html with styles.css inlined, util.js + core.js in one script, any src/lib/*.js
   helpers next, and then one <script> per module so a mistake in one module cannot stop the others
   from registering. */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { values: opt } = parseArgs({
  options: { out: { type: 'string' }, only: { type: 'string' }, artifact: { type: 'string' }, 'no-index': { type: 'boolean' } },
  strict: true,
});
const out = resolve(opt.out || join(root, 'discrete-math-interactive.html'));
const modFiles = readdirSync(join(here, 'modules')).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
let mods = modFiles;
if (opt.only !== undefined) {
  const want = opt.only.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.padStart(2, '0'));
  if (!want.length) throw new Error('--only needs a comma-separated list of module numbers, e.g. --only 01,02');
  const missing = want.filter((n) => !modFiles.some((f) => f.startsWith(n + '-')));
  if (missing.length) throw new Error(`--only names modules that do not exist: ${missing.join(', ')}`);
  mods = modFiles.filter((f) => f.startsWith('00-') || want.includes(f.slice(0, 2)));
}

// KaTeX is requested by core.js (asynchronously, with its integrity hash) so a slow or blocked CDN
// cannot hold the whole page on "Loading…". The font stylesheet is declared for print only and
// core.js switches it to all media once scripts run, so it never blocks the first paint and the
// page carries no inline event handlers.
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600&family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,600;0,700;1,400&family=STIX+Two+Text:ital,wght@0,500;0,600;1,500&display=swap';
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_HREF}" media="print" data-fonts>
<noscript><link rel="stylesheet" href="${FONTS_HREF}"></noscript>`;

const cssSrc = readFileSync(join(here, 'styles.css'), 'utf8');
const util = readFileSync(join(here, 'util.js'), 'utf8');
const core = readFileSync(join(here, 'core.js'), 'utf8');
const libDir = join(here, 'lib');
const libs = existsSync(libDir) ? readdirSync(libDir).filter((f) => f.endsWith('.js')).sort().map((f) => [f, readFileSync(join(libDir, f), 'utf8')]) : [];

/* The dark theme is written once in styles.css (`:root[data-theme="dark"] {…}`); the build emits the
   same tokens again for devices in dark mode that have not chosen a theme, and checks that the
   dark block names every token the light block defines. */
const darkMatch = /:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/.exec(cssSrc);
if (!darkMatch) throw new Error('styles.css: could not find the :root[data-theme="dark"] token block');
const lightMatch = /^:root \{([\s\S]*?)\n\}/m.exec(cssSrc);
if (!lightMatch) throw new Error('styles.css: could not find the :root light token block');
const tokens = (block) => new Set([...block.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]));
const lightTokens = [...tokens(lightMatch[1])].filter((t) => !/^(font-|radius|rail-w)/.test(t));
const darkTokens = tokens(darkMatch[1]);
const missing = lightTokens.filter((t) => !darkTokens.has(t));
if (missing.length) throw new Error(`styles.css: the dark theme is missing tokens: ${missing.join(', ')}`);
const css = cssSrc.replace(darkMatch[0], `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {${darkMatch[1].replace(/\n/g, '\n  ')}\n  }\n}\n${darkMatch[0]}`);

/* Inline scripts must not contain the sequences that end a <script> element early. Rewriting them
   would silently change raw template strings, so a source that contains one is refused instead. */
const script = (label, js) => {
  const bad = /<\/script|<!--/i.exec(js);
  if (bad) throw new Error(`${label}: contains "${bad[0]}" which cannot appear inside an inline script; write it as "<\\/script" or "<!" + "--"`);
  return `<script>\n/* ===== ${label} ===== */\n${js}\n</script>`;
};

const title = '<title>Discrete Mathematics &amp; Probability</title>';
const description = '<meta name="description" content="An interactive course in discrete mathematics and probability: sets, logic, proofs, relations, algorithms, number theory, counting, recurrences, graphs, trees, networks, Boolean algebra, and probability, with live Python in every lesson.">';
const ICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='3' y='3' width='10' height='10' rx='1' fill='%23136f63'/%3E%3C/svg%3E">`;
const head = [title, description, ICON, FONTS, `<style>\n${css}\n</style>`].join('\n');
const body = [
  '<div id="app"><p style="padding:2rem;font-family:system-ui">Loading the course…</p></div>',
  script('engine', `${util}\n${core}`),
  ...libs.map(([f, js]) => script(`lib/${f}`, js)),
  ...mods.map((f) => script(f, readFileSync(join(here, 'modules', f), 'utf8'))),
  // ?boot=manual leaves starting the page to the caller (the test suite uses it to control event ordering)
  '<script>if (!/[?&]boot=manual(&|$)/.test(location.search)) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => DM.boot()) : DM.boot(); }</script>',
].join('\n');

const shell = readFileSync(join(here, 'shell.html'), 'utf8');
for (const marker of ['<!--HEAD-->', '<!--BODY-->']) if (!shell.includes(marker)) throw new Error(`shell.html is missing ${marker}`);
const full = shell.replace('<!--HEAD-->', () => head).replace('<!--BODY-->', () => body);

/* The build checks its own output before writing it. */
const registered = (full.match(/DM\.module\(/g) || []).length;
if (registered < mods.length) throw new Error(`expected ${mods.length} DM.module( calls in the output, found ${registered}`);
if (/<!--(HEAD|BODY)-->/.test(full)) throw new Error('a template marker survived into the output');
const minBytes = mods.length === modFiles.length ? 1200 * 1024 : 120 * 1024; // the full course is about 1.6 MB; a welcome-only build about 160 KB
if (full.length < minBytes) throw new Error(`output is suspiciously small (${full.length} bytes for ${mods.length} module files)`);
writeFileSync(out, full);
console.log(`wrote ${out} (${(full.length / 1024).toFixed(0)} KB, ${mods.length} module files)`);

/* A tiny index.html next to the full build makes the repository root work as a web root. */
if (!opt['no-index'] && out === resolve(join(root, 'discrete-math-interactive.html'))) {
  const stub = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Discrete Mathematics &amp; Probability</title><meta http-equiv="refresh" content="0; url=discrete-math-interactive.html"><link rel="canonical" href="discrete-math-interactive.html"></head>\n<body><p>Opening the course… <a href="discrete-math-interactive.html">Continue</a></p></body></html>\n`;
  writeFileSync(join(root, 'index.html'), stub);
}

if (opt.artifact) {
  // Hosted viewers wrap the page in their own doctype/head/body, so the fragment starts with title + meta.
  const frag = [title, '<meta name="claude:viewport-fit-sides" content="cover">', description, FONTS, `<style>\n${css}\n</style>`, body].join('\n');
  writeFileSync(resolve(opt.artifact), frag);
  console.log(`wrote ${resolve(opt.artifact)} (${(frag.length / 1024).toFixed(0)} KB)`);
}
