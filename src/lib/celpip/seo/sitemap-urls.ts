// Single source of truth for every indexable URL in the CELPIP SEO surface.
// Shared by the chunked sitemap so the chunk count never drifts. Order is stable
// (statics → cluster index → program hubs → program × origin) so a URL keeps the
// same chunk as the set grows.

import type { MetadataRoute } from "next";
import { PROGRAMS } from "./programs";
import { COUNTRIES, originParam } from "./countries";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";

// Well under Google's 50k-per-sitemap cap, with room to grow. The current surface
// (~1.75k URLs) is one chunk; adding programs or origins splits automatically.
export const SITEMAP_CHUNK = 10000;

export function buildCelpipSitemapUrls(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [];

  // Public marketing + the immigration cluster index.
  const statics: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/celpip-for", priority: 0.8 },
    { path: "/pricing", priority: 0.7 },
    { path: "/signup", priority: 0.6 },
    { path: "/login", priority: 0.5 },
  ];
  for (const s of statics) {
    urls.push({
      url: `${SITE_URL}${s.path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: s.priority,
    });
  }

  // One hub per program.
  for (const program of PROGRAMS) {
    urls.push({
      url: `${SITE_URL}/${program.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Program × origin country.
  for (const program of PROGRAMS) {
    for (const country of COUNTRIES) {
      urls.push({
        url: `${SITE_URL}/${program.slug}/${originParam(country)}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return urls;
}
