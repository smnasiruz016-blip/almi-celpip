// One place that builds every internal SEO URL, so links and the sitemap can never
// drift apart. All paths live under /celpip.
//
// The four origin-matrix builders (originPathwayUrl, clbOriginUrl,
// provinceOriginUrl, occupationOriginUrl) were removed on 24 Aug 2026 with the
// routes that served them. A builder that mints a URL nothing serves is a trap:
// it puts a 404 in the sitemap and in internal links, and the sitemap == servable
// check in scripts/verify-sitemap.ts exists to catch exactly that.

import { originParam, type CountryEntry } from "./countries";
import type { Program } from "./programs";
import type { ClbTarget } from "./clb-targets";
import type { Province } from "./provinces";
import type { Occupation } from "./occupations";

export const CELPIP_INDEX = "/celpip";

export const originHubUrl = (c: CountryEntry) => `/celpip/${originParam(c)}`;

export const clbHubUrl = (t: ClbTarget) => `/celpip/${t.slug}`;

export const pathwayHubUrl = (p: Program) => `/celpip/pathway/${p.slug}`;

export const provinceHubUrl = (pr: Province) => `/celpip/province/${pr.slug}`;

export const occupationHubUrl = (o: Occupation) => `/celpip/occupation/${o.slug}`;
