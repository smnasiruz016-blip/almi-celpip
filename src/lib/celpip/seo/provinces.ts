// Canadian provinces/territories that run a Provincial Nominee Program (PNP) and
// accept CELPIP. Quebec is excluded — it selects economic immigrants in French
// through its own system (TEF/TEFAQ), not CELPIP. Nunavut has no PNP.
//
// HONESTY: PNP language rules vary by province AND by stream, and change often, so
// we never state a single province-wide CLB. We give the honest range and always
// defer to the province's own page plus IRCC.

export type Province = {
  slug: string;
  name: string;
  pnpName: string;
  clbNote: string; // honest, range-based
  officialUrl: string; // the province's immigration page
};

export const PROVINCES: Province[] = [
  {
    slug: "ontario",
    name: "Ontario",
    pnpName: "Ontario Immigrant Nominee Program (OINP)",
    clbNote:
      "OINP streams vary widely — some Express-Entry-aligned streams expect CLB 7, while in-demand-skills streams can accept CLB 4. The exact level depends on the stream you apply to.",
    officialUrl: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp",
  },
  {
    slug: "british-columbia",
    name: "British Columbia",
    pnpName: "BC Provincial Nominee Program (BC PNP)",
    clbNote:
      "BC PNP language requirements range by stream — skilled-worker streams commonly ask for CLB 7, while some entry-level and semi-skilled roles accept CLB 4.",
    officialUrl: "https://www.welcomebc.ca/Immigrate-to-B-C/BC-Provincial-Nominee-Program",
  },
  {
    slug: "alberta",
    name: "Alberta",
    pnpName: "Alberta Advantage Immigration Program (AAIP)",
    clbNote:
      "AAIP streams set their own language minimums, often between CLB 4 and CLB 7 depending on the occupation and stream.",
    officialUrl: "https://www.alberta.ca/alberta-advantage-immigration-program",
  },
  {
    slug: "saskatchewan",
    name: "Saskatchewan",
    pnpName: "Saskatchewan Immigrant Nominee Program (SINP)",
    clbNote:
      "SINP usually requires at least CLB 4, with higher levels expected for Express-Entry-aligned sub-categories. The exact minimum depends on the sub-category.",
    officialUrl: "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program",
  },
  {
    slug: "manitoba",
    name: "Manitoba",
    pnpName: "Manitoba Provincial Nominee Program (MPNP)",
    clbNote:
      "MPNP generally asks for a minimum around CLB 4 to CLB 5 for many streams, with higher levels for some skilled-worker pathways.",
    officialUrl: "https://immigratemanitoba.com/",
  },
  {
    slug: "nova-scotia",
    name: "Nova Scotia",
    pnpName: "Nova Scotia Nominee Program (NSNP)",
    clbNote:
      "Nova Scotia streams range from about CLB 5 upward, with Express-Entry-aligned streams typically expecting CLB 7.",
    officialUrl: "https://novascotiaimmigration.com/",
  },
  {
    slug: "new-brunswick",
    name: "New Brunswick",
    pnpName: "New Brunswick Provincial Nominee Program (NBPNP)",
    clbNote:
      "New Brunswick streams commonly require around CLB 4 to CLB 7 depending on the stream and the job's skill level.",
    officialUrl: "https://www.welcomenb.ca/",
  },
  {
    slug: "prince-edward-island",
    name: "Prince Edward Island",
    pnpName: "PEI Provincial Nominee Program (PEI PNP)",
    clbNote:
      "PEI PNP streams generally ask for at least CLB 4, with higher levels for Express-Entry-aligned categories.",
    officialUrl: "https://www.princeedwardisland.ca/en/topic/office-of-immigration",
  },
  {
    slug: "newfoundland-and-labrador",
    name: "Newfoundland and Labrador",
    pnpName: "Newfoundland and Labrador Provincial Nominee Program (NLPNP)",
    clbNote:
      "NLPNP streams typically require around CLB 5, with Express-Entry-aligned streams expecting CLB 7.",
    officialUrl: "https://www.gov.nl.ca/immigration/",
  },
];

export const PROVINCE_SLUGS: readonly string[] = PROVINCES.map((p) => p.slug);

const BY_SLUG = new Map(PROVINCES.map((p) => [p.slug, p]));

export function findProvinceBySlug(slug: string): Province | null {
  return BY_SLUG.get(slug) ?? null;
}
