// Canadian immigration & citizenship programs that accept CELPIP, with their
// published language requirements expressed in CLB. CELPIP-General is accepted by
// IRCC for permanent residence; CELPIP-General LS is accepted for citizenship.
//
// HONESTY DISCIPLINE (AlmiWorld doctrine):
// - Every CLB figure here is the published program MINIMUM as commonly documented
//   by IRCC. We present it as guidance and ALWAYS pair it on the page with
//   "confirm the current requirement with IRCC" plus the official link. We never
//   invent a number, and we never tell a user what CLB they personally scored.
// - We omit Quebec economic streams: they are assessed in French (TEF/TEFAQ), not
//   CELPIP, so listing them here would be misleading.
// - Requirements change. The page defers to the official source for anything live.

export type CelpipVersionTag = "GENERAL" | "LS";

export type Program = {
  slug: string;
  name: string; // short, e.g. "Federal Skilled Worker"
  metaName: string; // for <title>, e.g. "Federal Skilled Worker (Express Entry)"
  version: CelpipVersionTag; // which CELPIP test this program accepts
  clbHeadline: string; // short requirement, e.g. "CLB 7 in all four skills"
  clbDetail: string; // one honest sentence of detail
  whoFor: string; // one line: who the program is for
  summary: string; // 1–2 master sentences about the program + CELPIP
  skillsNote?: string; // optional: which skills carry extra weight
  officialUrl: string; // the IRCC page to defer to
};

// Ordered roughly by how commonly CELPIP test-takers ask about them.
export const PROGRAMS: Program[] = [
  {
    slug: "express-entry",
    name: "Express Entry",
    metaName: "Express Entry",
    version: "GENERAL",
    clbHeadline: "CLB 7 is the usual starting point; CLB 9+ earns the most points",
    clbDetail:
      "Express Entry ranks candidates with the Comprehensive Ranking System (CRS). Most federal programs in the pool require at least CLB 7, and language points keep climbing up to CLB 10, so a stronger CELPIP result directly raises your CRS score.",
    whoFor: "Skilled workers applying for permanent residence through the federal pool.",
    summary:
      "Express Entry is the main way IRCC manages applications for several federal permanent-residence programs. CELPIP-General is one of the accepted English tests, and your CLB result feeds straight into your ranking.",
    skillsNote:
      "CRS counts all four skills. Because points rise to CLB 10, it is worth practising every skill rather than just clearing a minimum.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
  },
  {
    slug: "federal-skilled-worker",
    name: "Federal Skilled Worker",
    metaName: "Federal Skilled Worker (Express Entry)",
    version: "GENERAL",
    clbHeadline: "Minimum CLB 7 in each of the four skills",
    clbDetail:
      "The Federal Skilled Worker Program sets a hard floor of CLB 7 in listening, reading, writing and speaking. You must reach CLB 7 in every skill, not on average — one lower skill can hold the whole application back.",
    whoFor: "Skilled workers with foreign work experience, applying through Express Entry.",
    summary:
      "The Federal Skilled Worker Program selects skilled workers using a points grid. CELPIP-General is accepted, and the program requires at least CLB 7 in all four abilities to be eligible.",
    skillsNote: "Every skill must independently reach CLB 7, so even your weakest skill matters.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html",
  },
  {
    slug: "canadian-experience-class",
    name: "Canadian Experience Class",
    metaName: "Canadian Experience Class (Express Entry)",
    version: "GENERAL",
    clbHeadline: "CLB 7 for TEER 0/1 jobs, CLB 5 for TEER 2/3 jobs",
    clbDetail:
      "The Canadian Experience Class sets the language minimum by the skill level of your Canadian work: CLB 7 for jobs in NOC TEER 0 or 1, and CLB 5 for TEER 2 or 3. The minimum applies to all four skills.",
    whoFor: "People with skilled work experience gained in Canada.",
    summary:
      "The Canadian Experience Class is for those who already have qualifying Canadian work experience. CELPIP-General is accepted, with the CLB minimum tied to your job's skill level.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/canadian-experience-class.html",
  },
  {
    slug: "federal-skilled-trades",
    name: "Federal Skilled Trades",
    metaName: "Federal Skilled Trades (Express Entry)",
    version: "GENERAL",
    clbHeadline: "CLB 5 for speaking and listening, CLB 4 for reading and writing",
    clbDetail:
      "The Federal Skilled Trades Program asks for CLB 5 in speaking and listening and CLB 4 in reading and writing — recognising that trades rely heavily on spoken instruction and safety communication.",
    whoFor: "Qualified people in skilled trades applying through Express Entry.",
    summary:
      "The Federal Skilled Trades Program is for qualified tradespeople. CELPIP-General is accepted, with a higher bar for the spoken skills than the written ones.",
    skillsNote:
      "Speaking and listening need CLB 5 while reading and writing need CLB 4 — focus extra practice on the spoken skills.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-trades.html",
  },
  {
    slug: "provincial-nominee-program",
    name: "Provincial Nominee Program",
    metaName: "Provincial Nominee Program (PNP)",
    version: "GENERAL",
    clbHeadline: "Varies by province and stream — commonly CLB 4 to CLB 7",
    clbDetail:
      "Each province runs its own streams with their own language rules, so the CELPIP requirement varies. Many streams sit between CLB 4 and CLB 7, and Express-Entry-aligned streams often expect CLB 7. Always check the specific stream you are applying to.",
    whoFor: "Workers nominated by a Canadian province or territory for permanent residence.",
    summary:
      "Provincial Nominee Programs let provinces nominate candidates who fit their local needs. CELPIP-General is widely accepted, but the exact CLB depends on the province and the stream.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
  },
  {
    slug: "atlantic-immigration-program",
    name: "Atlantic Immigration Program",
    metaName: "Atlantic Immigration Program",
    version: "GENERAL",
    clbHeadline: "CLB 5 for most jobs, CLB 4 for some lower-skill roles",
    clbDetail:
      "The Atlantic Immigration Program generally requires CLB 5, with CLB 4 accepted for certain lower-skill (TEER 4) jobs. CELPIP-General is accepted across the four Atlantic provinces.",
    whoFor: "Skilled workers and graduates with a job offer in Atlantic Canada.",
    summary:
      "The Atlantic Immigration Program helps employers in New Brunswick, Nova Scotia, Prince Edward Island and Newfoundland and Labrador hire from abroad. CELPIP-General is accepted, usually at CLB 5.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration-program.html",
  },
  {
    slug: "start-up-visa",
    name: "Start-up Visa",
    metaName: "Start-up Visa Program",
    version: "GENERAL",
    clbHeadline: "Minimum CLB 5 in each of the four skills",
    clbDetail:
      "The Start-up Visa Program requires at least CLB 5 in all four abilities. The bar is lower than the skilled-worker programs because the focus is on the business itself, but every skill must still reach CLB 5.",
    whoFor: "Entrepreneurs with a qualifying business and the support of a designated organisation.",
    summary:
      "The Start-up Visa Program is for entrepreneurs building an innovative business in Canada. CELPIP-General is accepted, with a CLB 5 minimum across all four skills.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/start-visa.html",
  },
  {
    slug: "caregiver-programs",
    name: "Caregiver Programs",
    metaName: "Canada Caregiver Programs",
    version: "GENERAL",
    clbHeadline: "Typically CLB 5 in each of the four skills",
    clbDetail:
      "Canada's caregiver pathways generally require CLB 5 in all four abilities. Because the work involves close communication with families and vulnerable people, listening and speaking are especially important in practice.",
    whoFor: "Home child-care and home-support workers heading to Canada.",
    summary:
      "Canada's caregiver pathways bring in home child-care providers and home-support workers. CELPIP-General is accepted, usually at CLB 5 across the four skills.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/caregivers.html",
  },
  {
    slug: "canadian-citizenship",
    name: "Canadian Citizenship",
    metaName: "Canadian Citizenship language requirement",
    version: "LS",
    clbHeadline: "CLB 4 in listening and speaking (the CELPIP-General LS test)",
    clbDetail:
      "To become a citizen, applicants aged 18 to 54 must show CLB 4 or higher in listening and speaking. CELPIP-General LS is the version built for this — it covers only those two skills, with no reading or writing.",
    whoFor: "Permanent residents applying to become Canadian citizens.",
    summary:
      "Canadian citizenship has its own, lower language bar focused on everyday listening and speaking. CELPIP-General LS is accepted, requiring CLB 4 in those two skills.",
    skillsNote:
      "Only listening and speaking are tested for citizenship — practise the LS version, not the full four-skill General test.",
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/become-canadian-citizen/eligibility/language-proof.html",
  },
];

export const PROGRAM_SLUGS: readonly string[] = PROGRAMS.map((p) => p.slug);

const BY_SLUG: Map<string, Program> = new Map(PROGRAMS.map((p) => [p.slug, p]));

export function findProgramBySlug(slug: string): Program | null {
  return BY_SLUG.get(slug) ?? null;
}

export const CELPIP_OFFICIAL_URL = "https://www.celpip.ca";
export const IRCC_LANGUAGE_TESTS_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements.html";
