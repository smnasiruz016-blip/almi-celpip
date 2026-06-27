// Occupation layer — high-intent because people search "CELPIP for nurses" or
// "CLB for software engineer Express Entry". A curated set of well-known skilled
// occupations (NOC TEER 0–3), not the full 500+ NOC list, so a brand-new domain
// launches with substance rather than thousands of near-identical pages. Full-NOC
// scale-up is a deliberate later wave.
//
// HONESTY (critical): a CELPIP/CLB language MINIMUM is set by the immigration
// PROGRAM, not by the occupation — there is no occupation-specific CLB. What an
// occupation changes is (1) which programs/TEER you qualify for and (2) your CRS,
// including category-based Express Entry draws that target some fields. We only tag
// `eeCategory` where IRCC has actually run a category for that field, and we always
// say categories change and to confirm with IRCC. We never imply hitting a CLB
// guarantees an invitation.

export type EeCategory =
  | "Healthcare and social services"
  | "STEM"
  | "Trades"
  | "Agriculture and agri-food"
  | "Education";

export type Occupation = {
  slug: string;
  name: string;
  teer: 0 | 1 | 2 | 3;
  field: string;
  eeCategory?: EeCategory; // only where IRCC has run a category-based draw for the field
};

export const OCCUPATIONS: Occupation[] = [
  // Healthcare
  { slug: "registered-nurse", name: "Registered Nurse", teer: 1, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "licensed-practical-nurse", name: "Licensed Practical Nurse", teer: 2, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "physician", name: "Physician", teer: 1, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "pharmacist", name: "Pharmacist", teer: 1, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "physiotherapist", name: "Physiotherapist", teer: 1, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "occupational-therapist", name: "Occupational Therapist", teer: 1, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "medical-laboratory-technologist", name: "Medical Laboratory Technologist", teer: 2, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "dental-hygienist", name: "Dental Hygienist", teer: 2, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "social-worker", name: "Social Worker", teer: 1, field: "Healthcare", eeCategory: "Healthcare and social services" },
  { slug: "psychologist", name: "Psychologist", teer: 1, field: "Healthcare", eeCategory: "Healthcare and social services" },

  // STEM
  { slug: "software-engineer", name: "Software Engineer", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "software-developer", name: "Software Developer", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "web-developer", name: "Web Developer", teer: 2, field: "STEM", eeCategory: "STEM" },
  { slug: "data-scientist", name: "Data Scientist", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "computer-systems-analyst", name: "Computer Systems Analyst", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "database-analyst", name: "Database Analyst", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "cybersecurity-specialist", name: "Cybersecurity Specialist", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "mechanical-engineer", name: "Mechanical Engineer", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "civil-engineer", name: "Civil Engineer", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "electrical-engineer", name: "Electrical Engineer", teer: 1, field: "STEM", eeCategory: "STEM" },
  { slug: "structural-engineer", name: "Structural Engineer", teer: 1, field: "STEM", eeCategory: "STEM" },

  // Trades
  { slug: "electrician", name: "Electrician", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "plumber", name: "Plumber", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "welder", name: "Welder", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "carpenter", name: "Carpenter", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "machinist", name: "Machinist", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "heavy-duty-equipment-mechanic", name: "Heavy-Duty Equipment Mechanic", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "automotive-service-technician", name: "Automotive Service Technician", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "industrial-electrician", name: "Industrial Electrician", teer: 2, field: "Trades", eeCategory: "Trades" },
  { slug: "construction-manager", name: "Construction Manager", teer: 0, field: "Trades", eeCategory: "Trades" },

  // Agriculture and agri-food
  { slug: "farm-supervisor", name: "Farm Supervisor", teer: 3, field: "Agriculture", eeCategory: "Agriculture and agri-food" },
  { slug: "butcher", name: "Industrial Butcher", teer: 3, field: "Agriculture", eeCategory: "Agriculture and agri-food" },

  // Education
  { slug: "secondary-school-teacher", name: "Secondary School Teacher", teer: 1, field: "Education", eeCategory: "Education" },
  { slug: "early-childhood-educator", name: "Early Childhood Educator", teer: 3, field: "Education", eeCategory: "Education" },
  { slug: "university-professor", name: "University Professor", teer: 1, field: "Education", eeCategory: "Education" },

  // Business & finance (no dedicated category — CRS angle only)
  { slug: "accountant", name: "Accountant", teer: 1, field: "Business & finance" },
  { slug: "financial-analyst", name: "Financial Analyst", teer: 1, field: "Business & finance" },
  { slug: "financial-auditor", name: "Financial Auditor", teer: 1, field: "Business & finance" },
  { slug: "human-resources-manager", name: "Human Resources Manager", teer: 0, field: "Business & finance" },
  { slug: "marketing-manager", name: "Marketing Manager", teer: 0, field: "Business & finance" },
  { slug: "business-analyst", name: "Business Analyst", teer: 1, field: "Business & finance" },
  { slug: "supply-chain-manager", name: "Supply Chain Manager", teer: 0, field: "Business & finance" },

  // Hospitality & service (CRS angle only)
  { slug: "chef", name: "Chef", teer: 2, field: "Hospitality" },
  { slug: "cook", name: "Cook", teer: 3, field: "Hospitality" },
  { slug: "graphic-designer", name: "Graphic Designer", teer: 2, field: "Creative" },
  { slug: "truck-driver", name: "Transport Truck Driver", teer: 3, field: "Transport" },
];

export const OCCUPATION_SLUGS: readonly string[] = OCCUPATIONS.map((o) => o.slug);

const BY_SLUG = new Map(OCCUPATIONS.map((o) => [o.slug, o]));

export function findOccupationBySlug(slug: string): Occupation | null {
  return BY_SLUG.get(slug) ?? null;
}

const TEER_DESC: Record<Occupation["teer"], string> = {
  0: "TEER 0 (management)",
  1: "TEER 1 (usually requires a university degree)",
  2: "TEER 2 (usually requires a college diploma or apprenticeship)",
  3: "TEER 3 (usually requires college or on-the-job training)",
};

export function teerDescription(o: Occupation): string {
  return TEER_DESC[o.teer];
}
