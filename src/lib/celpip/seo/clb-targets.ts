// CLB target pages — the levels people search for around Express Entry. Each is
// described honestly: what the level commonly means for Canadian immigration, with
// no guarantee that hitting it changes any outcome. The user's score and the
// program's requirement are always things to confirm with IRCC.

export type ClbTarget = {
  level: number;
  slug: string; // "clb-7"
  headline: string;
  detail: string;
  crsAngle: string; // honest note on how this level relates to CRS points
};

export const CLB_TARGETS: ClbTarget[] = [
  {
    level: 7,
    slug: "clb-7",
    headline: "CLB 7 — the common starting line for Express Entry",
    detail:
      "CLB 7 in each skill is the minimum for the Federal Skilled Worker Program and a typical floor for many Express Entry candidates. It is also where you become eligible to claim language points in the Comprehensive Ranking System (CRS).",
    crsAngle:
      "At CLB 7 you meet the language bar for several programs, but you are at the lower end of the CRS language points — many applicants aim higher to be more competitive.",
  },
  {
    level: 9,
    slug: "clb-9",
    headline: "CLB 9 — where CRS language points reach their maximum",
    detail:
      "CLB 9 in each skill is the point at which the Comprehensive Ranking System awards the most language points, and it unlocks the higher skill-transferability points that combine language with education and work experience.",
    crsAngle:
      "Many applicants aim for CLB 9 because it maximises the language-related CRS points. It does not guarantee an invitation — draw cut-offs change — so always check current CRS scores and confirm requirements with IRCC.",
  },
  {
    level: 10,
    slug: "clb-10",
    headline: "CLB 10 — a strong result above the points ceiling",
    detail:
      "CLB 10 and above sits beyond the level where extra CRS language points are awarded — the points are already maxed at CLB 9. A CLB 10 result simply shows a very strong command of English.",
    crsAngle:
      "Because CRS language points top out at CLB 9, going from CLB 9 to CLB 10 does not add language points. It can still help with provincial streams or job requirements that ask for a higher level — confirm what your program needs with IRCC.",
  },
];

export const CLB_SLUGS: readonly string[] = CLB_TARGETS.map((c) => c.slug);

const BY_SLUG = new Map(CLB_TARGETS.map((c) => [c.slug, c]));

export function findClbTarget(slug: string): ClbTarget | null {
  return BY_SLUG.get(slug) ?? null;
}
