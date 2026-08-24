// THE /learn CONTENT GATE.
//
//   npx tsx scripts/verify-content.ts
//   npx tsx scripts/verify-content.ts --self-test
//
// Offline. No database, no network, no key.
//
// ── WHY ──────────────────────────────────────────────────────────────────────
// Structure lives in frontmatter precisely SO THAT it can be checked. A CTA
// written as a line of prose is unreachable by any gate, and by page 60 it has
// drifted into six shapes. Typed frontmatter turns that into a build failure the
// day page 73 forgets its CTA, instead of a discovery months later.
//
// The orphan checks are the AlmiOET lesson made mechanical. /register returned
// 404 there, so Google had no path to any register page and none were ever
// indexed — 144,266 pages behind a door that did not open. Here the hub is
// derived from the directory, but "derived" is a claim about code, so it is
// checked: every article must be reachable from a hub that itself is servable
// and in the sitemap.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import {
  getAllArticles,
  getSections,
  learnUrls,
  frontmatterSchema,
  CONTENT_DIR,
  LEARN_BASE,
} from "../src/lib/celpip/learn/articles";
import { buildCelpipSitemapUrls } from "../src/lib/celpip/seo/sitemap-urls";
import { CELPIP_TASKS } from "../src/lib/celpip/registry";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const SELF_TEST = process.argv.includes("--self-test");
const ROOT = resolve(__dirname, "..");
const APP = join(ROOT, "src", "app");

// ── route tree, same technique as verify-sitemap ─────────────────────────────
function collectRoutes(dir: string, segs: string[] = [], out: string[][] = []): string[][] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (!statSync(abs).isDirectory()) {
      if (name === "page.tsx" || name === "page.ts") out.push([...segs]);
      continue;
    }
    if (name.startsWith("_") || name === "api") continue;
    const next = name.startsWith("(") && name.endsWith(")") ? segs : [...segs, name];
    collectRoutes(abs, next, out);
  }
  return out;
}
const routes = collectRoutes(APP);

/** Does a CONCRETE path match a route's segment pattern? Shape only. */
function shapeMatches(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  return routes.some((r) =>
    r.length === parts.length &&
    r.every((seg, i) => (seg.startsWith("[") && seg.endsWith("]")) || seg === parts[i]));
}

// SHAPE IS NOT ENOUGH, and a sabotage proved it: /practice/[task] is dynamic, so
// a CTA typo'd to /practice/writing-emial matched the route pattern and passed —
// while 404ing at runtime, because dynamicParams is false and no such task
// exists. A check that only asks "is there a route shaped like this" cannot see
// a wrong PARAM. So every dynamic segment a CTA can point at is enumerated.
const CONCRETE = new Set<string>([
  ...Object.values(CELPIP_TASKS).filter((t) => t.live).map((t) => `/practice/${t.slug}`),
]);

/** Servable for real: a static route, an enumerated dynamic URL, or a sitemap URL. */
function servable(path: string, sitemap?: Set<string>): boolean {
  if (CONCRETE.has(path)) return true;
  if (sitemap?.has(path)) return true;
  const parts = path.split("/").filter(Boolean);
  // A path whose route has NO dynamic segment is safe on shape alone.
  const staticHit = routes.some((r) =>
    r.length === parts.length && r.every((seg, i) => seg === parts[i]));
  return staticHit;
}

console.log("CONTROLS");
check("the route scan found routes at all", routes.length > 0, `${routes.length}`);
check("a known-real route is servable", servable("/pricing"));
check("an invented route is NOT servable", !servable("/definitely-not-a-route-xyz"));
check("a real practice task IS servable", servable("/practice/writing-email"));
check("a TYPO'd practice task is NOT servable (shape alone would pass it)",
  !servable("/practice/writing-emial"));
check("shape-only matching WOULD have passed the typo — proving the stricter check earns its place",
  shapeMatches("/practice/writing-emial"));
check("frontmatter schema REJECTS a missing cta",
  !frontmatterSchema.safeParse({ title: "t", description: "d", section: "s", order: 1 }).success);

// The loader THROWS on invalid frontmatter, which is right for the build but
// would stack-trace out of this gate before it names anything. Catch it so the
// offending file is reported as a normal FAIL line.
let articles: ReturnType<typeof getAllArticles> = [];
let loadError: string | null = null;
try { articles = getAllArticles(); }
catch (e) { loadError = e instanceof Error ? e.message : String(e); }

// ── A. EVERY ARTICLE'S FRONTMATTER IS COMPLETE ──────────────────────────────
console.log("\nA. FRONTMATTER COMPLETE AND TYPED");
const files = existsSync(CONTENT_DIR)
  ? readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md")).sort()
  : [];
check(`there are articles to check — ${files.length}`, files.length > 0,
  "a zero here is a broken loader, not a clean surface");
check("every .md file parsed into an article", articles.length === files.length,
  `${articles.length} parsed / ${files.length} files`);
for (const f of files) {
  const { data } = matter(readFileSync(join(CONTENT_DIR, f), "utf8"));
  const r = frontmatterSchema.safeParse(data);
  check(`${f} declares complete frontmatter`, r.success,
    r.success ? "" : r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "));
}

// ── B. TITLES AND DESCRIPTIONS ARE UNIQUE ───────────────────────────────────
console.log("\nB. UNIQUE TITLE AND DESCRIPTION ACROSS ALL ARTICLES");
function dupes(values: string[]): string[] {
  const seen = new Set<string>(), bad = new Set<string>();
  for (const v of values) { if (seen.has(v)) bad.add(v); seen.add(v); }
  return [...bad];
}
const titleDupes = dupes(articles.map((a) => (SELF_TEST ? "SAME TITLE" : a.title)));
const descDupes = dupes(articles.map((a) => a.description));
const slugDupes = dupes(articles.map((a) => a.slug));
check("no two articles share a title", titleDupes.length === 0, titleDupes.join(" | "));
check("no two articles share a description", descDupes.length === 0, descDupes.join(" | "));
check("no two articles share a slug", slugDupes.length === 0, slugDupes.join(" | "));

// ── C. EVERY CTA POINTS SOMEWHERE REAL ──────────────────────────────────────
console.log("\nC. EVERY CTA HREF RESOLVES TO A REAL ROUTE");
const sitemapPathSet = new Set(
  buildCelpipSitemapUrls().map((u) => u.url.replace(/^https?:\/\/[^/]+/, "") || "/"),
);
for (const a of articles) {
  check(`${a.slug}: cta -> ${a.cta.href}`, servable(a.cta.href, sitemapPathSet),
    "no route serves it (or the dynamic param is not a real value)");
}

// ── D. NOTHING IS ORPHANED ──────────────────────────────────────────────────
console.log("\nD. NOTHING IS ORPHANED (the AlmiOET lesson)");
check(`the hub ${LEARN_BASE} is itself servable`, servable(LEARN_BASE),
  "if the hub 404s, every article behind it is invisible — this is exactly how AlmiOET lost 144,266 pages");
const hubListed = new Set(getSections().flatMap((s) => s.articles.map((x) => x.slug)));
for (const a of articles) {
  check(`${a.slug} appears on the hub`, hubListed.has(a.slug));
}
const sitemapPaths = sitemapPathSet;
check(`the hub ${LEARN_BASE} is in the sitemap`, sitemapPaths.has(LEARN_BASE));
for (const a of articles) {
  check(`${a.slug} is in the sitemap`, sitemapPaths.has(a.path), a.path);
}
check("learnUrls() and the article set agree",
  learnUrls().length === articles.length + 1,
  `${learnUrls().length} urls vs ${articles.length} articles + 1 hub`);

// ── E. RELATED LINKS ────────────────────────────────────────────────────────
// A related entry may name an article not yet written — normal while a 110-page
// set is authored. But a slug that is PRESENT must resolve, or it is a typo that
// silently renders as plain text forever.
console.log("\nE. RELATED SLUGS, WHERE DECLARED, RESOLVE");
const known = new Set(articles.map((a) => a.slug));
let dangling = 0, unlinked = 0;
for (const a of articles) {
  for (const r of a.related) {
    if (r.slug && !known.has(r.slug)) { dangling++; console.log(`     dangling: ${a.slug} -> ${r.slug}`); }
    if (!r.slug) unlinked++;
  }
}
check("no related entry names a slug that does not exist", dangling === 0, `${dangling} dangling`);
console.log(`     (${unlinked} related entries have no slug yet — expected while the set is being written)`);

// ── verdict ─────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed`);
if (SELF_TEST) {
  console.log(fail > 0
    ? "SELF-TEST OK — with every title forced identical the uniqueness check went RED as it must."
    : "SELF-TEST BROKEN — titles were forced identical and nothing failed.");
  process.exit(fail > 0 ? 0 : 1);
}
process.exit(fail === 0 ? 0 : 1);
