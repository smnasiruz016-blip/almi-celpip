// One place that builds every internal SEO URL, so links and the sitemap can never
// drift apart. All paths live under /celpip.
//
// The four origin-matrix builders (originPathwayUrl, clbOriginUrl,
// provinceOriginUrl, occupationOriginUrl) were removed on 24 Aug 2026 with the
// routes that served them. A builder that mints a URL nothing serves is a trap:
// it puts a 404 in the sitemap and in internal links, and the sitemap == servable
// check in scripts/verify-sitemap.ts exists to catch exactly that.
//
// The hub builders (origin, CLB, pathway, province, occupation) were removed in
// the Oct 2026 cost fix for the same reason: those hubs now answer 410 Gone.

export const CELPIP_INDEX = "/celpip";
