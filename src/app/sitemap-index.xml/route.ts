// Manual sitemap INDEX. Next 16's generateSitemaps() emits the chunk routes
// (/sitemap/0.xml, /sitemap/1.xml, …) but does NOT auto-emit an index in this
// version, so this handler lists every chunk. One GSC submission of
// /sitemap-index.xml then discovers them all. robots.ts points here.
//
// Lives at /sitemap-index.xml — NOT /sitemap.xml (which conflicts with Next's
// metadata-route file at build). Chunk count comes from the SAME shared builder as
// app/sitemap.ts, so the two can never drift.

import { sitemapChunkCount, SITEMAP_LAST_MODIFIED } from "@/lib/celpip/seo/sitemap-urls";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";

export const dynamic = "force-dynamic";

export function GET(): Response {
  // NOT a wall clock. This route is the SIBLING that the 12 July fix missed: the
  // ISR incident recurred because sitemap-urls.ts was fixed and this file was not.
  // It now imports the SAME constant rather than keeping its own copy, so the two
  // cannot drift apart again.
  const now = SITEMAP_LAST_MODIFIED.toISOString();
  const n = sitemapChunkCount();
  const entries = Array.from(
    { length: n },
    (_, i) =>
      `  <sitemap>\n    <loc>${SITE_URL}/sitemap/${i}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
