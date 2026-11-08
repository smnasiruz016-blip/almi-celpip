// RR-400 HEALTH GATE: two Lighthouse failures that were live on the home and pricing pages, held shut.
//
// Run: npm run gate:health   (also the first step of `build`, so it blocks)
//
// 1. FAVICON. With no icon the browser asks for /favicon.ico, gets a 404, and the console error costs
//    best practices 4 points on every page. The icon is the product's own header mark (src/app/icon.svg),
//    which Next.js links from every page.
// 2. TEXT CONTRAST. Coral (#FF7A6B / #ff6b5b) and teal (#0d9488) are fills. As text on cream, white or
//    peach they measured 2.3-3.7:1, and WCAG AA needs 4.5:1. Text in the coral or teal family uses
//    --color-almi-coral-text / --color-almi-teal-text, which must measure at least 4.5:1 on every light
//    background token, and no plain text-almi-coral / text-almi-coral-deep / text-almi-teal class may
//    come back (hover: states are not text at rest, and aria-hidden decorative marks are not text: both allowed).
// 3. FAMILY LOGO CSP. If next.config sets an img-src that names https://almiworld.com, it must also name
//    https://www.almiworld.com: the logo URL redirects there and CSP checks the redirect target.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fails = [];

// 1. favicon
const icons = ["src/app/icon.svg", "src/app/icon.png", "src/app/favicon.ico", "public/favicon.ico", "app/icon.svg", "app/favicon.ico"];
if (!icons.some((p) => existsSync(join(root, p)))) fails.push(`no favicon: none of ${icons.join(", ")} exists`);

// 2. contrast
const css = readFileSync(join(root, "src", "app", "globals.css"), "utf8");
const tok = new Map();
for (const m of css.matchAll(/--color-(almi-[a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) tok.set(m[1], m[2].toLowerCase());
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const backgrounds = ["almi-bg", "almi-bg-peach", "almi-paper"].filter((b) => tok.has(b));
backgrounds.push("#ffffff");
for (const t of ["almi-coral-text", "almi-teal-text"]) {
  if (!tok.has(t)) { fails.push(`--color-${t} is missing from globals.css`); continue; }
  for (const b of backgrounds) {
    const bg = b.startsWith("#") ? b : tok.get(b);
    const r = ratio(tok.get(t), bg);
    if (r < 4.5) fails.push(`--color-${t} ${tok.get(t)} on ${b} ${bg} is ${r.toFixed(2)}:1, under 4.5:1`);
  }
}
const banned = /(^|[^:a-z-])text-almi-(coral-deep|coral|teal)(?![-a-z0-9/])/;
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(n)) {
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        // aria-hidden marks (a ✓ or a ★ the screen reader skips) are decoration, not text, and keep the fill colour.
        if (banned.test(line) && !/aria-hidden/.test(line)) fails.push(`${relative(root, p)}:${i + 1} paints text with a fill token (${line.match(banned)[0].trim()}); use text-almi-coral-text or text-almi-teal-text`);
      });
    }
  }
};
walk(join(root, "src"));

// 3. CSP img-src for the family logo
for (const f of ["next.config.ts", "next.config.mjs", "next.config.js"]) {
  if (!existsSync(join(root, f))) continue;
  const src = readFileSync(join(root, f), "utf8");
  const img = src.match(/img-src[^"`\n]*/); // the directive holds 'self' in single quotes, so stop only at " ` or end of line
  if (img && /https:\/\/almiworld\.com/.test(img[0]) && !/https:\/\/www\.almiworld\.com/.test(img[0])) {
    fails.push(`${f}: img-src allows https://almiworld.com but not https://www.almiworld.com, where the family logo redirects`);
  }
}

if (fails.length) {
  console.error(`RR-400 health gate: RED (${fails.length})\n  ` + fails.join("\n  "));
  process.exit(1);
}
console.log(`RR-400 health gate: GREEN (favicon present; coral-text and teal-text at least 4.5:1 on ${backgrounds.length} backgrounds; no fill token paints text; family logo CSP ok)`);
