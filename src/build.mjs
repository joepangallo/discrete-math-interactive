// Builds the single-file course page from src/.
//   node src/build.mjs                       -> discrete-math-interactive.html (full document)
//   node src/build.mjs --out x.html --only 01,02   -> a smaller build with the welcome module plus 01 and 02
//   node src/build.mjs --artifact x.html     -> also writes a fragment (no doctype/html/head/body) for hosted viewers
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const out = resolve(opt('--out') || join(root, 'discrete-math-interactive.html'));
const only = opt('--only') ? new Set(['00', ...opt('--only').split(',').map((s) => s.trim().padStart(2, '0'))]) : null;
const artifact = opt('--artifact');

const KATEX = '<script src="https://cdn.jsdelivr.net/npm/katex@0.18.11/dist/katex.min.js" integrity="sha384-vaygNa7Kw+54Zb42f7K+4bfhZp4vWSHPJMKwd7nVmlgSvRADUrCRRdCpc1/CJwO+" crossorigin="anonymous"></script>';
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;600&family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,600;0,700;1,400&family=STIX+Two+Text:ital,wght@0,500;0,600;1,500&display=swap">';

const css = readFileSync(join(here, 'styles.css'), 'utf8');
const core = readFileSync(join(here, 'core.js'), 'utf8');
const modFiles = readdirSync(join(here, 'modules')).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const mods = modFiles.filter((f) => !only || only.has(f.slice(0, 2)));
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
const modJs = mods.map((f) => `/* ===== ${f} ===== */\n${readFileSync(join(here, 'modules', f), 'utf8')}`).join('\n\n');

const title = '<title>Discrete Mathematics &amp; Probability</title>';
const description = '<meta name="description" content="An interactive course in discrete mathematics and probability: sets, logic, proofs, relations, algorithms, number theory, counting, recurrences, graphs, trees, networks, Boolean algebra, and probability, with live Python in every lesson.">';
const ICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='3' y='3' width='10' height='10' rx='1' fill='%23136f63'/%3E%3C/svg%3E">`;
const head = [title, description, ICON, FONTS, `<style>\n${css}\n</style>`].join('\n');
const body = [
  '<div id="app"><p style="padding:2rem;font-family:system-ui">Loading the course…</p></div>',
  KATEX,
  `<script>\n${safe(core)}\n</script>`,
  `<script>\n${safe(modJs)}\n</script>`,
  '<script>document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => DM.boot()) : DM.boot();</script>',
].join('\n');

const shell = readFileSync(join(here, 'shell.html'), 'utf8');
const full = shell.replace('<!--HEAD-->', () => head).replace('<!--BODY-->', () => body);
writeFileSync(out, full);
console.log(`wrote ${out} (${(full.length / 1024).toFixed(0)} KB, ${mods.length} module files)`);

if (artifact) {
  // Hosted viewers wrap the page in their own doctype/head/body, so the fragment starts with title + meta.
  const frag = [title, '<meta name="claude:viewport-fit-sides" content="cover">', description, FONTS, `<style>\n${css}\n</style>`, body].join('\n');
  writeFileSync(resolve(artifact), frag);
  console.log(`wrote ${resolve(artifact)} (${(frag.length / 1024).toFixed(0)} KB)`);
}
