// Single source of truth for every indexable URL in the CELPIP SEO surface.
// Shared by the chunked sitemap AND the /sitemap-index.xml route so the chunk
// count never drifts. Order is stable (statics → index → hubs → matrices) so a
// URL keeps the same chunk as the set grows.

import type { MetadataRoute } from "next";
import { PROGRAMS } from "./programs";
import { COUNTRIES } from "./countries";
import { CLB_TARGETS } from "./clb-targets";
import { PROVINCES } from "./provinces";
import { OCCUPATIONS } from "./occupations";
import {
  CELPIP_INDEX,
  originHubUrl,
  originPathwayUrl,
  clbHubUrl,
  clbOriginUrl,
  pathwayHubUrl,
  provinceHubUrl,
  provinceOriginUrl,
  occupationHubUrl,
  occupationOriginUrl,
} from "./urls";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";

// Under Google's 50k-per-sitemap cap with room to grow. The current surface
// (~13.5k URLs) is two chunks; adding occupations/origins splits automatically.
export const SITEMAP_CHUNK = 10000;

type Entry = MetadataRoute.Sitemap[number];

export function buildCelpipSitemapUrls(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [];
  const push = (path: string, priority: number, changeFrequency: Entry["changeFrequency"] = "monthly") =>
    urls.push({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority });

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

  // Matrices.
  for (const c of COUNTRIES) for (const p of PROGRAMS) push(originPathwayUrl(c, p), 0.6);
  for (const t of CLB_TARGETS) for (const c of COUNTRIES) push(clbOriginUrl(t, c), 0.6);
  for (const pr of PROVINCES) for (const c of COUNTRIES) push(provinceOriginUrl(pr, c), 0.5);
  for (const o of OCCUPATIONS) for (const c of COUNTRIES) push(occupationOriginUrl(o, c), 0.5);

  return urls;
}

/** Number of sitemap chunks for the current URL set (>=1). */
export function sitemapChunkCount(): number {
  return Math.max(1, Math.ceil(buildCelpipSitemapUrls().length / SITEMAP_CHUNK));
}
