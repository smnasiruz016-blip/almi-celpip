// Single source of truth for every indexable URL in the CELPIP SEO surface.
// Shared by the chunked sitemap AND the /sitemap-index.xml route so the chunk
// count never drifts. Order is stable (statics → index → hubs) so a URL keeps
// the same chunk as the set grows.
//
// NO WALL-CLOCK TIMESTAMPS. lastModified is the exported constant below, and
// /sitemap-index.xml imports THAT SAME CONSTANT rather than keeping its own copy.
// A `new Date()` here makes every sitemap byte-different on every request, which
// re-writes the ISR cache and tells Google every page changed every time. The
// 12 July fix landed in this file and missed its sibling, and the incident
// recurred; one shared constant is why it cannot recur again. Bump it by hand
// when the URL SET or the page content meaningfully changes.
//
// The four origin matrices (countries x programs / clb / provinces / occupations,
// 12,931 URLs) were removed on 24 Aug 2026. They were not thin, they were
// REDUNDANT: origin localizes the framing and never the facts, so 193 variants
// answered one question. What ranks for CELPIP is one exam task, deep.
//
// The hubs (/celpip/<hub>, /celpip/pathway/*, /celpip/province/*,
// /celpip/occupation/*) were removed too (cost fix, Oct 2026, owner ruling
// 17 Oct). They now answer 410 Gone from src/proxy.ts, so no sitemap lists them.
// The /celpip index page stays.

import type { MetadataRoute } from "next";
import { learnUrls } from "@/lib/celpip/learn/articles";
import { CELPIP_INDEX } from "./urls";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";

// Under Google's 50k-per-sitemap cap with room to grow. The current surface
// (265 URLs) is one chunk; growth splits automatically.
export const SITEMAP_CHUNK = 10000;

/** Fixed publication date for every sitemap entry AND the sitemap index. Never
 *  a wall clock — see the header. Bump by hand when the surface changes. */
export const SITEMAP_LAST_MODIFIED = new Date("2026-08-24T00:00:00.000Z");

/** Declared ceiling for the whole surface. The gate fails if the real count
 *  exceeds it, so a matrix cannot be reintroduced by accident.
 *
 *  RAISED DELIBERATELY 24 Aug 2026: 300 -> 400, for the /learn article system.
 *  The surface is 5 statics + 260 hubs + 1 hub page + one URL per article. The
 *  authored set is ~110 articles, so the end state is 265 + 1 + 110 = 376. 400
 *  leaves room for the last few without another raise.
 *
 *  A ceiling raised whenever it fails is not a ceiling. Raise it only when the
 *  SHAPE of the surface changes on purpose, as it does here, and write down the
 *  arithmetic. If this needs raising again without a new page TYPE behind it,
 *  that is a matrix creeping back and the right answer is to look, not to edit
 *  this number. */
export const SITEMAP_URL_CEILING = 400;

type Entry = MetadataRoute.Sitemap[number];

export function buildCelpipSitemapUrls(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [];
  const push = (path: string, priority: number, changeFrequency: Entry["changeFrequency"] = "monthly") =>
    urls.push({ url: `${SITE_URL}${path}`, lastModified: SITEMAP_LAST_MODIFIED, changeFrequency, priority });

  // Public marketing + the SEO index.
  push("", 1, "weekly");
  push(CELPIP_INDEX, 0.9, "weekly");
  push("/pricing", 0.7, "weekly");
  push("/signup", 0.6, "weekly");
  push("/login", 0.5, "weekly");

  // /learn — the hub and every article, from the SAME directory scan that feeds
  // the routes and the hub page. One source of truth, three consumers: add a
  // second one and you have rebuilt the drift this file exists to prevent.
  for (const path of learnUrls()) push(path, path === "/learn" ? 0.9 : 0.8, "weekly");

  return urls;
}

/** Number of sitemap chunks for the current URL set (>=1). */
export function sitemapChunkCount(): number {
  return Math.max(1, Math.ceil(buildCelpipSitemapUrls().length / SITEMAP_CHUNK));
}
