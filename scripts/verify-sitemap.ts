// THE SITEMAP / ISR GATE.
//
//   npx tsx scripts/verify-sitemap.ts
//   npx tsx scripts/verify-sitemap.ts --self-test
//
// Offline. No database, no network, no key.
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
// scripts/ had fork-hygiene, audio, free-window, listening-speakers and
// spend-gate — and nothing at all watching the sitemap, though the ISR incident
// is the most expensive thing that has happened to this surface. That absence is
// why it drifted back. Three things go wrong here, and each has already happened:
//
//   A  A WALL-CLOCK TIMESTAMP. `new Date()` in the sitemap makes every byte
//      different on every request: the ISR cache is rewritten and Google is told
//      every page changed every time. The 12 July fix landed in sitemap-urls.ts
//      and MISSED /sitemap-index.xml, and the incident recurred. So this check
//      reads BOTH files, and would have failed on the half-fixed tree.
//
//   B  AN UNBOUNDED URL COUNT. The surface reached 13,196 URLs, 12,931 of them
//      one question answered 193 ways. A declared ceiling turns "we grew a
//      matrix again" from a discovery into a build failure.
//
//   C  A SITEMAP URL THAT NOTHING SERVES. sitemap == servable. A URL in the
//      sitemap with no route behind it is a 404 handed to Google on purpose;
//      a route with no sitemap entry is a page nobody will find. Both directions
//      are checked, because the builders and the routes are edited separately.
//
// Check C resolves each sitemap path against the App Router tree on disk rather
// than against a list of expected shapes: a list would agree with itself.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildCelpipSitemapUrls,
  SITEMAP_URL_CEILING,
  SITEMAP_LAST_MODIFIED,
} from "../src/lib/celpip/seo/sitemap-urls";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const SELF_TEST = process.argv.includes("--self-test");
const ROOT = resolve(__dirname, "..");
const APP = join(ROOT, "src", "app");

/** Strip comments so a `new Date()` described in prose is not a finding. */
function strip(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every file that feeds the sitemap path. Both siblings, always. */
const SITEMAP_SOURCES = [
  "src/lib/celpip/seo/sitemap-urls.ts",
  "src/app/sitemap.ts",
  "src/app/sitemap-index.xml/route.ts",
  "src/app/robots.ts",
];

// A wall clock is `new Date()` with no argument, or Date.now().
const WALL_CLOCK = /new\s+Date\s*\(\s*\)|Date\s*\.\s*now\s*\(\s*\)/;

console.log("CONTROLS");
check("detector FIRES on new Date()", WALL_CLOCK.test(strip("const now = new Date();")));
check("detector FIRES on Date.now()", WALL_CLOCK.test(strip("const t = Date.now();")));
check("detector is SILENT on a fixed literal",
  !WALL_CLOCK.test(strip('const d = new Date("2026-08-24T00:00:00.000Z");')));
check("detector is SILENT on new Date() inside a comment",
  !WALL_CLOCK.test(strip("// a `new Date()` here would rewrite the ISR cache\nconst d = FIXED;")));

// ── A. NO WALL-CLOCK TIMESTAMP ANYWHERE IN THE SITEMAP PATH ─────────────────
console.log("\nA. NO WALL-CLOCK TIMESTAMP IN THE SITEMAP PATH");
let scanned = 0;
for (const rel of SITEMAP_SOURCES) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) { check(`${rel} exists`, false, "missing — did a route move?"); continue; }
  scanned++;
  const src = strip(readFileSync(abs, "utf8"));
  check(`${rel} has no wall clock`, !WALL_CLOCK.test(src),
    (src.match(WALL_CLOCK) ?? [""])[0]);
}
check("both siblings were actually scanned", scanned === SITEMAP_SOURCES.length,
  `${scanned}/${SITEMAP_SOURCES.length}`);

// The emitted value must be the shared constant, not merely constant-looking.
const urls = buildCelpipSitemapUrls();
const stamps = new Set(urls.map((u) => String(u.lastModified)));
check("every entry carries ONE identical lastModified", stamps.size === 1, `${stamps.size} distinct`);
check("that value is the exported SITEMAP_LAST_MODIFIED constant",
  stamps.has(String(SITEMAP_LAST_MODIFIED)));

// ── B. THE DECLARED CEILING ─────────────────────────────────────────────────
console.log("\nB. URL COUNT UNDER ITS DECLARED CEILING");
const ceiling = SELF_TEST ? 10 : SITEMAP_URL_CEILING;
check(`the sitemap is non-empty — a zero would be a broken builder`, urls.length > 0, `${urls.length}`);
check(`${urls.length} URLs <= ceiling ${ceiling}`, urls.length <= ceiling,
  `${urls.length} > ${ceiling} — a matrix was reintroduced, or raise the ceiling deliberately`);

// ── C. SITEMAP == SERVABLE ──────────────────────────────────────────────────
console.log("\nC. EVERY SITEMAP URL IS SERVED BY A REAL ROUTE");

/** Walk the App Router tree and collect every page route as a segment list. */
function collectRoutes(dir: string, segs: string[] = [], out: string[][] = []): string[][] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (!statSync(abs).isDirectory()) {
      if (name === "page.tsx" || name === "page.ts") out.push([...segs]);
      continue;
    }
    if (name.startsWith("_") || name === "api") continue;
    // Route groups (app) contribute no URL segment.
    const next = name.startsWith("(") && name.endsWith(")") ? segs : [...segs, name];
    collectRoutes(abs, next, out);
  }
  return out;
}
const routes = collectRoutes(APP);

/** Does a concrete path match this route's segment pattern? */
function matches(route: string[], parts: string[]): boolean {
  const cat = route.findIndex((s) => s.startsWith("[..."));
  if (cat >= 0) return parts.length >= cat;
  if (route.length !== parts.length) return false;
  return route.every((seg, i) => (seg.startsWith("[") && seg.endsWith("]")) || seg === parts[i]);
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";
const unservable: string[] = [];
for (const u of urls) {
  const path = u.url.replace(SITE_URL, "");
  const parts = path.split("/").filter(Boolean);
  if (!routes.some((r) => matches(r, parts))) unservable.push(path || "/");
}
check(`routes were found to check against — ${routes.length}`, routes.length > 0);
check(`every sitemap URL resolves to a route (${urls.length} checked)`, unservable.length === 0,
  unservable.slice(0, 6).join(", ") + (unservable.length > 6 ? ` … +${unservable.length - 6}` : ""));

// The other direction: a dynamic SEO route with nothing in the sitemap is a page
// nobody can find. Static-only routes (login, pricing…) are out of scope here.
const seoRoutes = routes.filter((r) => r[0] === "celpip");
const covered = seoRoutes.filter((r) =>
  urls.some((u) => matches(r, u.url.replace(SITE_URL, "").split("/").filter(Boolean))));
check(`every /celpip route has at least one sitemap URL (${seoRoutes.length} routes)`,
  covered.length === seoRoutes.length,
  seoRoutes.filter((r) => !covered.includes(r)).map((r) => "/" + r.join("/")).join(", "));

// ── verdict ─────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed`);
if (SELF_TEST) {
  console.log(fail > 0
    ? "SELF-TEST OK — with the ceiling lowered to 10 the count check went RED as it must."
    : "SELF-TEST BROKEN — the ceiling was lowered to 10 and nothing failed.");
  process.exit(fail > 0 ? 0 : 1);
}
process.exit(fail === 0 ? 0 : 1);
