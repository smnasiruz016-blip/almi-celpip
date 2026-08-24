// ONE DIRECTORY, ONE SOURCE OF TRUTH, THREE CONSUMERS.
//
//   content/learn/*.md  ->  the routes      (generateStaticParams)
//                       ->  the /learn hub  (derived, never hand-maintained)
//                       ->  the sitemap     (via buildCelpipSitemapUrls)
//
// WHY THE HUB IS DERIVED AND NOT A LIST
// AlmiOET's register pages were orphaned because /register returned 404: Google
// had no path to any of them and none were ever indexed. A hand-maintained hub
// fails the same way one article at a time — someone adds page 73 and forgets the
// hub line. Deriving the hub from the directory makes orphaning IMPOSSIBLE rather
// than remembered, and "remembered" is exactly what failed there.
//
// WHY STRUCTURE IS FRONTMATTER AND NOT PROSE
// title, description, CTA, related links and sources are IDENTICAL in shape on
// every article. Identical things can be typed, and typed things can be gated:
// a build can assert all ~110 articles declare a CTA and fail when page 73
// forgets one. The same CTA written as a line of prose is unreachable by any
// check, and by page 60 it will have drifted into six shapes. Body prose is
// markdown because prose is not identical in shape and must not be forced to be.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const LEARN_BASE = "/learn";
export const CONTENT_DIR = join(process.cwd(), "content", "learn");

/** A slug is the filename. It is also the URL, so it is constrained. */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const linkSchema = z.object({
  label: z.string().min(1),
  /** Another article's slug. Optional: an article may point at one not yet
   *  written, which is normal while a 110-page set is being authored. The
   *  template renders the label either way and links only when it resolves. */
  slug: z.string().regex(slugPattern).optional(),
});

const sourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export const frontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  /** Hub grouping, e.g. "Writing". */
  section: z.string().min(1),
  /** Position within the section on the hub. */
  order: z.number().int().nonnegative(),
  cta: z.object({
    label: z.string().min(1),
    /** Must resolve to a real route — verify:content checks it. */
    href: z.string().startsWith("/"),
    note: z.string().optional(),
  }),
  related: z.array(linkSchema).default([]),
  sources: z.array(sourceSchema).default([]),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export type Article = Frontmatter & {
  slug: string;
  /** Markdown body, frontmatter stripped. */
  body: string;
  /** Derived, never declared — a declared word count drifts from its prose. */
  wordCount: number;
  /** Path relative to the site root. */
  path: string;
};

function parseOne(file: string): Article {
  const slug = file.replace(/\.md$/, "");
  if (!slugPattern.test(slug)) {
    throw new Error(`content/learn/${file}: filename is not a valid slug`);
  }
  const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
  const { data, content } = matter(raw);
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    // Loud and specific: a build must not ship an article with missing structure.
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`content/learn/${file}: invalid frontmatter — ${issues}`);
  }
  const body = content.trim();
  return {
    ...parsed.data,
    slug,
    body,
    wordCount: body.split(/\s+/).filter(Boolean).length,
    path: `${LEARN_BASE}/${slug}`,
  };
}

let cache: Article[] | null = null;

/** The order CELPIP itself uses, with the orientation material first.
 *
 *  THIS IS A PREFERENCE, NOT AN ALLOWLIST. A section that is not listed here
 *  still appears on the hub: it sorts after every listed section, alphabetically
 *  among the other unlisted ones. Dropping an unlisted section would let a typo
 *  in one `section:` line silently delete a page from the hub, which is exactly
 *  the orphaning this whole system exists to prevent -- AlmiOET lost 144,266
 *  pages to a door that did not open. A page must never disappear because it
 *  was filed under a name nobody had thought of yet. */
export const SECTION_ORDER: readonly string[] = [
  "About the test",
  "Listening",
  "Reading",
  "Writing",
  "Speaking",
];

/** Listed sections rank by position; unlisted ones all share the rank just past
 *  the end, so they land after the list and tie -- the tie then falls through to
 *  an alphabetical compare, which is what orders them among themselves. */
function sectionRank(section: string): number {
  const i = SECTION_ORDER.indexOf(section);
  return i === -1 ? SECTION_ORDER.length : i;
}

export function compareSections(a: string, b: string): number {
  const ra = sectionRank(a);
  const rb = sectionRank(b);
  return ra === rb ? a.localeCompare(b) : ra - rb;
}

/** Every article, sorted for the hub: section (SECTION_ORDER), then order, then slug. */
export function getAllArticles(): Article[] {
  if (cache) return cache;
  if (!existsSync(CONTENT_DIR)) return (cache = []);
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md")).sort();
  const all = files.map(parseOne);
  all.sort((a, b) =>
    a.section === b.section
      ? a.order === b.order
        ? a.slug.localeCompare(b.slug)
        : a.order - b.order
      : compareSections(a.section, b.section),
  );
  return (cache = all);
}

export function getArticle(slug: string): Article | null {
  return getAllArticles().find((a) => a.slug === slug) ?? null;
}

/** Articles grouped by section, in hub order. */
export function getSections(): { section: string; articles: Article[] }[] {
  const out: { section: string; articles: Article[] }[] = [];
  for (const a of getAllArticles()) {
    const last = out[out.length - 1];
    if (last && last.section === a.section) last.articles.push(a);
    else out.push({ section: a.section, articles: [a] });
  }
  return out;
}

/** Every /learn URL — the hub itself plus one per article. The sitemap builder
 *  calls THIS, so the directory scan is the only source of these URLs. */
export function learnUrls(): string[] {
  return [LEARN_BASE, ...getAllArticles().map((a) => a.path)];
}
