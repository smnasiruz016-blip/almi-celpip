// One place that builds every internal SEO URL, so links and the sitemap can never
// drift apart. All paths live under /celpip.

import { originParam, type CountryEntry } from "./countries";
import type { Program } from "./programs";
import type { ClbTarget } from "./clb-targets";
import type { Province } from "./provinces";
import type { Occupation } from "./occupations";

export const CELPIP_INDEX = "/celpip";

export const originHubUrl = (c: CountryEntry) => `/celpip/${originParam(c)}`;
export const originPathwayUrl = (c: CountryEntry, p: Program) => `/celpip/${originParam(c)}/${p.slug}`;

export const clbHubUrl = (t: ClbTarget) => `/celpip/${t.slug}`;
export const clbOriginUrl = (t: ClbTarget, c: CountryEntry) => `/celpip/${t.slug}/${originParam(c)}`;

export const pathwayHubUrl = (p: Program) => `/celpip/pathway/${p.slug}`;

export const provinceHubUrl = (pr: Province) => `/celpip/province/${pr.slug}`;
export const provinceOriginUrl = (pr: Province, c: CountryEntry) =>
  `/celpip/province/${pr.slug}/${originParam(c)}`;

export const occupationHubUrl = (o: Occupation) => `/celpip/occupation/${o.slug}`;
export const occupationOriginUrl = (o: Occupation, c: CountryEntry) =>
  `/celpip/occupation/${o.slug}/${originParam(c)}`;
