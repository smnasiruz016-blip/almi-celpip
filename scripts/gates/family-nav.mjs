// RR-398 · the AlmiWorld family header and footer gate. Pure node, so CI can run it. RED when: the kit's Home is not
// https://almiworld.com/; the root layout does not render the AlmiWorld bar (with its Home button) and footer on every page; or any
// customer-facing file links to eBooks or an old WordPress address. Run: node scripts/gates/family-nav.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";

const ROOT = process.cwd();
const fails = [];
const ok = (c, n) => { if (!c) fails.push(n); console.log(`  [${c ? "PASS" : "FAIL"}] ${n}`); };
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const KIT = "src/lib/almiworld-family.ts", BAR = "src/components/almiworld/AlmiWorldBar.tsx", FOOT = "src/components/almiworld/AlmiWorldFooter.tsx";
ok([KIT, BAR, FOOT].every((p) => existsSync(join(ROOT, p))), "the AlmiWorld kit is in place (data, bar, footer)");
if (fails.length) { console.log("\nFAMILY NAV GATE FAIL"); process.exit(1); }
const kit = read(KIT);
ok(/"home": "https:\/\/almiworld\.com\/"/.test(kit), "Home goes to https://almiworld.com/");
ok(/className="awb-home" href=\{F\.home\}>Home<\/a>/.test(read(BAR)), "the bar shows a clear Home button");

/* the root layout renders the bar and the footer: directly, or through a component it imports (one level, by @/ or relative path) */
const layoutPath = ["src/app/layout.tsx", "src/app/layout.jsx", "src/app/[locale]/layout.tsx"].find((p) => existsSync(join(ROOT, p)));
ok(Boolean(layoutPath), "a root layout exists");
const resolve = (from, spec) => {
  const base = spec.startsWith("@/") ? join(ROOT, "src", spec.slice(2)) : spec.startsWith(".") ? join(ROOT, dirname(from), spec) : null;
  if (!base) return null;
  for (const ext of ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx"]) if (existsSync(base + ext) && statSync(base + ext).isFile()) return relative(ROOT, base + ext);
  return null;
};
const renders = (tag) => {
  if (!layoutPath) return false;
  const l = read(layoutPath);
  if (new RegExp(`<${tag}\\b`).test(l)) return true;
  for (const m of l.matchAll(/import\s+\{([^}]+)\}\s+from\s+"([^"]+)"/g)) {
    const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop());
    const file = resolve(layoutPath, m[2]); if (!file) continue;
    const src = read(file);
    if (new RegExp(`<${tag}\\b`).test(src) && names.some((n) => new RegExp(`<${n}\\b`).test(l))) return true;
  }
  return false;
};
ok(renders("AlmiWorldBar"), "every page renders the AlmiWorld bar (logo + Home + family menus)");
ok(renders("AlmiWorldFooter"), "every page renders the AlmiWorld footer");

/* customer-facing code and copy (not exam material, not datasets such as university directories) */
const SKIP = /node_modules|\.next|[\\/](seed|seeds|fixtures|generated|__tests__|data)[\\/]|[\\/]content[\\/](reading|listening|writing|speaking|exam|bank|items|questions|passages|scripts)[\\/]|\.test\./i;
const walk = (d) => !existsSync(d) ? [] : readdirSync(d).flatMap((n) => { const f = join(d, n); if (SKIP.test(f)) return []; const s = statSync(f); return s.isDirectory() ? walk(f) : /\.(tsx?|jsx?|mjs|json|md|mdx|html|txt)$/.test(n) ? [f] : []; });
/* a LINK to eBooks or to an old WordPress address, or a menu label "Ebooks": code comments are not links and are skipped */
const OLD_URL = /almiworld\.com\/(?:ebooks|e-books|shop|product\/|product-category|cart|checkout|my-account|blog-2|wp-admin|wp-login|category\/(?!blog\/))|almiworld\.com\/?\?(?:page_id|p)=\d/i;
const OLD_LABEL = /(?:label|title|name)\s*:\s*["'`]e-?books?["'`]|>\s*e-?books?\s*</i;
const isComment = (l) => /^\s*(\/\/|\*|\/\*|\{\s*\/\*)/.test(l);
const bad = [];
for (const f of ["src", "public"].flatMap((d) => walk(join(ROOT, d)))) {
  const p = relative(ROOT, f).split(sep).join("/");
  readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => { if (!isComment(l) && (OLD_URL.test(l) || OLD_LABEL.test(l))) bad.push(`${p}:${i + 1}: ${l.trim().slice(0, 140)}`); });
}
ok(bad.length === 0, `no eBooks link and no old WordPress address anywhere (${bad.length} found)`);
for (const b of bad.slice(0, 20)) console.log(`      ${b}`);
console.log(fails.length ? `\nFAMILY NAV GATE FAIL (${fails.length})` : "\nFAMILY NAV GATE PASS");
process.exitCode = fails.length ? 1 : 0;
