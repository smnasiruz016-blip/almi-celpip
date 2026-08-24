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

import type { MetadataRoute } from "next";
import { PROGRAMS } from "./programs";
import { COUNTRIES } from "./countries";
import { CLB_TARGETS } from "./clb-targets";
import { PROVINCES } from "./provinces";
import { OCCUPATIONS } from "./occupations";
import {
  CELPIP_INDEX,
  originHubUrl,
  clbHubUrl,
  pathwayHubUrl,
  provinceHubUrl,
  occupationHubUrl,
} from "./urls";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";

// Under Google's 50k-per-sitemap cap with room to grow. The current surface
// (265 URLs) is one chunk; growth splits automatically.
export const SITEMAP_CHUNK = 10000;

/** Fixed publication date for every sitemap entry AND the sitemap index. Never
 *  a wall clock — see the header. Bump by hand when the surface changes. */
export const SITEMAP_LAST_MODIFIED = new Date("2026-08-24T00:00:00.000Z");

/** Declared ceiling for the whole surface. The gate fails if the real count
 *  exceeds it, so a matrix cannot be reintroduced by accident. */
export const SITEMAP_URL_CEILING = 300;

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

  // Hubs.
  for (const p of PROGRAMS) push(pathwayHubUrl(p), 0.8, "weekly");
  for (const t of CLB_TARGETS) push(clbHubUrl(t), 0.8, "weekly");
  for (const pr of PROVINCES) push(provinceHubUrl(pr), 0.8, "weekly");
  for (const o of OCCUPATIONS) push(occupationHubUrl(o), 0.7, "weekly");
  for (const c of COUNTRIES) push(originHubUrl(c), 0.7, "weekly");

  return urls;
}

/** Number of sitemap chunks for the current URL set (>=1). */
export function sitemapChunkCount(): number {
  return Math.max(1, Math.ceil(buildCelpipSitemapUrls().length / SITEMAP_CHUNK));
}
