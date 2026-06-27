// Chunked sitemap for the CELPIP SEO landing system. Mirrors the proven
// AlmiPrep/AlmiOET generateSitemaps() pattern: enumerate every indexable URL once
// (shared builder), slice into chunks under Google's 50k cap. Next 16 may hand
// `id` over as a Promise — coerce defensively (see SITEMAP_CHUNKING_FUTURE note in
// almijob-v2; this bit AlmiJob across four PRs). The chunk URLs are listed by the
// manual /sitemap-index.xml route, since Next 16 does not auto-emit an index.

import type { MetadataRoute } from "next";
import {
  buildCelpipSitemapUrls,
  sitemapChunkCount,
  SITEMAP_CHUNK as CHUNK,
} from "@/lib/celpip/seo/sitemap-urls";

const ALL_URLS = buildCelpipSitemapUrls();

export async function generateSitemaps(): Promise<{ id: number }[]> {
  return Array.from({ length: sitemapChunkCount() }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // Next 16 may pass `id` as a Promise; Promise.resolve handles both shapes.
  const idNum = Number(await Promise.resolve(id));
  const start = (Number.isFinite(idNum) ? idNum : 0) * CHUNK;
  return ALL_URLS.slice(start, start + CHUNK);
}
