import type { MetadataRoute } from "next";

const SITE_URL = "https://almicelpip.almiworld.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    // The manual index lists every chunk; Next 16 does not auto-aggregate them.
    sitemap: `${SITE_URL}/sitemap-index.xml`,
  };
}
