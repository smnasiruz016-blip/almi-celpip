// Build-time FORK HYGIENE GATE — the AlmiWorld §7 rule, enforced instead of trusted.
//
// ⚠️ THIS ONE RUNS IN REVERSE. Every other gate in the network bans its ANCESTORS'
// nouns. This repo has no ancestors: almi-celpip is the ROOT of the language-fork
// lineage. What it must be protected from is the opposite direction — its own
// DESCENDANTS flowing back up:
//
//   almi-celpip (you are here)
//     └─ almi-goethe ─┬─ almi-icelandic → almi-danish → almi-norwegian → almi-swedish
//                     ├─ almi-japanese → almi-korean → almi-italian
//                     └─ … 13 language products in total
//
// A backport, a shared component lifted from a descendant, a copy-pasted helper, or a
// find-replace run across several repos at once can all carry a descendant's facts
// UPWARD into the root. That is not hypothetical for this lineage: almi-swiss shipped
// familyStrip("swedish") — an inherited identity key that was VALID, so nothing threw,
// and it silently hid AlmiSwedish from the Swiss site as if it were self. The same
// class of mistake pointed at this repo is what this gate exists to catch.
//
// Because the root has no ancestor to inherit from, there is NO legacy-cookie escape
// here and no expiry to wire: SESSION_COOKIE_NAME is "almi_celpip_session", correct
// since day one, with no legacy names to read. Expiry is N/A by construction, not by
// omission. If a legacy name ever appears, it needs a DATED escape, not an allowlist.
//
// If a future product forks FROM this repo, re-cut in BOTH directions: the new repo
// bans CELPIP nouns as its ancestor, and this list gains the new product's slug.
//
// ⚠️ WHAT IS DELIBERATELY *NOT* BANNED HERE — read before adding:
//
//   1. CELPIP, CLB, Paragon, en-CA — this product's OWN subject matter. The inversion
//      is the whole point: what every descendant gate bans, the root must permit.
//   2. IELTS — a CELPIP product legitimately compares itself to the other test IRCC
//      accepts for English. It belongs to AlmiPrep, but naming it here is honest
//      content, not a leak.
//   3. TEF / TCF / TEFAQ — French tests, but Canadian-immigration ones. This repo
//      already explains in src/lib/celpip/seo/provinces.ts why Quebec is excluded:
//      Quebec selects economic immigrants in French through TEF/TEFAQ, not CELPIP.
//      That is core domain reasoning for a Canadian product. DELF/DALF (France's
//      exams, no Canadian immigration role) ARE banned — the almi-french product owns
//      those. The line is Canadian relevance, not the French language.
//   4. Bare "fide" — almi-swiss's exam is literally called `fide`, but "bona fide" is
//      ordinary English and would fail the gate on innocent copy. A brand that is also
//      a common word cannot be caught by name; almi-swiss is caught by its slug instead.
//   5. Career-product names (AlmiJob, AlmiCV, AlmiStudy, AlmiPathway) — GlobalFooter
//      links to them by design. They are a different lineage, not descendants.
//
// A gate that cries wolf gets switched off, so each carve-out is named with its reason.
//
// PATH NOTE: siblings keep this at scripts/seo/fork-hygiene-gate.mjs. This repo has no
// scripts/seo/ directory (it has no SEO build scripts), so it lives one level up rather
// than inventing an empty "seo" folder for a gate that has nothing to do with SEO.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "scripts", "prisma"];
const SCAN_EXT = /\.(ts|tsx|js|mjs|mts|json|prisma|css|md)$/;

// Files allowed to mention a descendant noun, with the reason. Kept deliberately tiny —
// every entry is a hole in the gate.
const ALLOWLIST = new Map([
  // This gate documents the exact leaks it prevents.
  ["scripts/fork-hygiene-gate.mjs", "documents the banned nouns"],
]);

// ── DESCENDANT PRODUCT SLUGS ─────────────────────────────────────────────────
// The 13 language products forked from this repo, taken from the canonical family list
// in @smnasiruz016-blip/almi-data (22 products, of which celpip itself and the eight
// career / English-test products — jobs, cv, study, prep, pte, toefl, oet, det — are a
// different lineage and are NOT descendants: AlmiPTE forked from AlmiPrep, AlmiOET from
// AlmiDET).
const DESCENDANT_PRODUCTS = [
  "goethe", "icelandic", "danish", "norwegian", "swedish", "swiss",
  "japanese", "korean", "italian", "portuguese", "french", "spanish", "dutch",
];

/** Every form a product slug ships in: almi-x · almi_x · almix · AlmiX.
 *  Hand-listing these was itself a fork bug in this lineage: a list carried "almi-x"
 *  (hyphen) but not "almi_x" (underscore), and an underscore identifier — a session
 *  cookie, a CSS class — sailed through the gate meant to ban it. A grep does not know
 *  that `almi-x` and `almi_x` are the same idea, so enumerate rather than trust.
 *  This also covers the session cookies for free: `almi_danish_session` contains
 *  `almi_danish`. */
function productNameForms(p) {
  return [`almi-${p}`, `almi_${p}`, `almi${p}`, `Almi${p[0].toUpperCase()}${p.slice(1)}`];
}
const slugForms = [];
for (const p of DESCENDANT_PRODUCTS) slugForms.push(...productNameForms(p));
// Deduped case-insensitively: `AlmiKorean` and `almikorean` are the same needle once
// matching ignores case, and leaving both would report every hit twice.
const BANNED_SLUG = [...new Set(slugForms.map((s) => s.toLowerCase()))];

// ── DESCENDANT EXAM / AUTHORITY / LOCALE NOUNS ───────────────────────────────
// A Canadian English product has no reason to name any of these.
const BANNED = [
  // — goethe —
  "Goethe-Institut", "Goethe-Zertifikat", "Goethe Institut", "de-DE",
  // — icelandic —
  "Íslenskupróf", "Útlendingastofnun", "Ríkisborgarapróf", "is-IS",
  // — danish —
  "Prøve i Dansk", "Indfødsretsprøven", "Studieprøven", "da-DK",
  // — norwegian —
  "Norskprøven", "Bergenstesten", "Statsborgerprøven", "nb-NO",
  // — swedish — (bare "fide" excluded, see header; swiss is caught by slug)
  "Swedex", "nl-NL", "sv-SE",
  // — dutch —
  "Inburgering", "Staatsexamen NT2",
  // — japanese / korean — exam + native-script names —
  "日本語能力試験", "日本語", "ja-JP",
  "한국어능력시험", "한국어", "ko-KR",
  // — italian —
  "Cittadinanza", "it-IT",
  // — portuguese / spanish / french (DELF/DALF only — TEF/TCF are Canadian, see header) —
  "Celpe-Bras", "pt-PT", "es-ES", "fr-FR",
];

// Acronyms need word boundaries — they collide with ordinary substrings. Matched
// case-insensitively so a lowercased `topik` cannot walk past a capitalised list.
// ⚠️ CELPIP, CLB and IELTS are DELIBERATELY ABSENT — the first two are this product's
// own subject matter and the third is honest comparison. That inversion is the point of
// re-cutting the list per repo.
const BANNED_WORD = [
  "TOPIK", "JLPT", "TestDaF", "telc",       // korean · japanese · goethe
  "CILS", "CELI", "PLIDA",                  // italian
  "DELE", "SIELE", "CCSE",                  // spanish
  "DELF", "DALF",                           // french (NOT TEF/TCF — see header)
  "CAPLE",                                  // portuguese
  "TISUS", "Sfi",                           // swedish
  "NT2",                                    // dutch
];

// SELF-CHECK. A blanket find-replace of a product name across the repo can also rewrite
// THIS list, making the gate ban "AlmiCELPIP" — this product's own name — and report a
// leak storm of false positives (almi-swiss hit exactly this, 90 of them). A careless
// global replace is the very thing this gate exists to catch, so assert it outright
// rather than relying on someone noticing the count moved the wrong way.
const SELF_NAMES = ["AlmiCELPIP", "almi-celpip", "almi_celpip", "almicelpip", "CELPIP", "CLB"];
for (const n of SELF_NAMES) {
  if ([...BANNED, ...BANNED_SLUG, ...BANNED_WORD].some((b) => b.toLowerCase() === n.toLowerCase())) {
    console.error("");
    console.error(`FORK-HYGIENE GATE IS MISCONFIGURED: the banned list contains "${n}", which is THIS product's own name or subject.`);
    console.error("Every legitimate mention of ourselves would be reported as a descendant leak.");
    console.error("Almost certainly a global find-replace that rewrote the banned list. Fix the list.");
    console.error("");
    process.exit(2);
  }
}

// ── Scanning machinery (the real-entity-gate design: strip comments, scan STRING
//    values, never raw JSON). COMMENTS ARE NOT SCANNED — a comment naming another
//    product is documentation, usually the note explaining WHY something is excluded
//    (this repo's provinces.ts explains the Quebec/TEF carve-out that way).
//    STRING LITERALS ARE SCANNED — they are the copy that ships.

// The stripper tracks string state so a `//` inside "https://…" is not mistaken for a
// comment — the common way a naive stripper eats real copy.
function stripComments(text) {
  let out = "";
  let i = 0;
  let quote = null;
  let inLine = false;
  let inBlock = false;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (inLine) {
      if (c === "\n") { inLine = false; out += c; }
      else out += " ";
      i++; continue;
    }
    if (inBlock) {
      if (c === "*" && n === "/") { inBlock = false; out += "  "; i += 2; continue; }
      out += c === "\n" ? c : " ";
      i++; continue;
    }
    if (quote) {
      if (c === "\\") { out += text.slice(i, i + 2); i += 2; continue; }
      if (c === quote) quote = null;
      out += c; i++; continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    if (c === "/" && n === "/") { inLine = true; out += "  "; i += 2; continue; }
    if (c === "/" && n === "*") { inBlock = true; out += "  "; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

// Prisma comments are `//` and `///` — NOT `#` (a common wrong assumption; the swiss
// original stripped `#` and so scanned prisma's `//` provenance comments as if they were
// shipping copy, flagging every "forked from AlmiCELPIP" note). stripComments handles
// `//` while respecting string literals, so prisma reuses it. CSS block comments are
// `/* */` and are handled by the same stripper.

// JSON is scanned as PARSED STRING VALUES: scanning raw JSON text matches escape
// sequences rather than content (an escaped newline is a backslash and an "n", which
// silently breaks word-boundary matching), and a gate that scans the wrong thing has
// never truly been red.
function jsonStrings(node, out = []) {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) for (const v of node) jsonStrings(v, out);
  else if (node && typeof node === "object") for (const v of Object.values(node)) jsonStrings(v, out);
  return out;
}

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === "node_modules" || e === ".next" || e === ".git") continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.test(e)) out.push(full);
  }
  return out;
}

const violations = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWLIST.has(rel)) continue;
    const raw = readFileSync(file, "utf8");
    let text;
    if (rel.endsWith(".json")) {
      try { text = jsonStrings(JSON.parse(raw)).join("\n"); }
      catch { text = raw; }   // malformed JSON: fall back rather than skip silently
    } else {
      text = stripComments(raw);
    }

    text.split(/\r?\n/).forEach((line, i) => {
      const report = (term) =>
        violations.push(`${rel}:${i + 1}  banned descendant noun "${term}"\n      ${line.trim().slice(0, 120)}`);
      for (const term of BANNED) if (line.includes(term)) report(term);
      for (const term of BANNED_SLUG) if (line.toLowerCase().includes(term)) report(term);
      for (const term of BANNED_WORD) if (new RegExp(`\\b${term}\\b`, "i").test(line)) report(term);
    });
  }
}

if (violations.length) {
  console.error("\n✗ FORK HYGIENE GATE FAILED — descendant content found.\n");
  console.error("  CELPIP must read as CELPIP. This repo is the ROOT of the language-fork");
  console.error("  lineage, so these are leaks flowing BACK UP from a product forked off it.\n");
  for (const v of [...new Set(violations)]) console.error(`  ${v}`);
  console.error(`\n  ${violations.length} violation(s). Fix the FACT, not just the label —`);
  console.error("  the worst leaks are the ones where only the country word was swapped.\n");
  process.exit(1);
}

console.log(`✓ Fork hygiene gate: clean (no descendant nouns across ${SCAN_DIRS.join(", ")}).`);
console.log("  Root repo: no ancestors, no legacy-cookie escape, no expiry to track.");
