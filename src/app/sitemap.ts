// Chunked sitemap for the CELPIP SEO landing system. Mirrors the proven
// AlmiPrep/AlmiSalary generateSitemaps() pattern: enumerate every static + hub +
// program×origin URL once, slice into chunks under Google's 50k cap. Next 16 may
// hand `id` over as a Promise — coerce defensively (see SITEMAP_CHUNKING_FUTURE
// note in almijob-v2; this bit AlmiJob across four PRs).

import type { MetadataRoute } from "next";
import { buildCelpipSitemapUrls, SITEMAP_CHUNK as CHUNK } from "@/lib/celpip/seo/sitemap-urls";

const ALL_URLS = buildCelpipSitemapUrls();

export async function generateSitemaps(): Promise<{ id: number }[]> {
  const n = Math.max(1, Math.ceil(ALL_URLS.length / CHUNK));
  return Array.from({ length: n }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // Next 16 may pass `id` as a Promise; Promise.resolve handles both shapes.
  const idNum = Number(await Promise.resolve(id));
  const start = (Number.isFinite(idNum) ? idNum : 0) * CHUNK;
  return ALL_URLS.slice(start, start + CHUNK);
}
