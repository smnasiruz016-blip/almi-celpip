// THE single source of truth for AlmiWorld product names + hrefs. Canonical-naming
// doctrine: one product = one name network-wide. Every family strip, mobile menu,
// and footer in THIS repo reads from here — rename a product or add a new one in
// this one array and it propagates everywhere in the repo. This file is replicated
// verbatim across all family Next.js repos (promote to a shared package for true
// one-edit-across-repos). The Apex/WordPress site is normalized separately.
//
// Names are the established PUBLIC names with casing/typo drift removed (e.g. the
// salary product stays "Salary Checker", not "AlmiSalary").

export type FamilyProduct = { key: string; name: string; href: string };

// Ordered as the family strip presents them. `key` is stable; use it to mark the
// current product (exclude or highlight) — never match on label.
export const FAMILY_PRODUCTS: readonly FamilyProduct[] = [
  { key: "jobs", name: "AlmiJobs", href: "https://almijob.almiworld.com/" },
  { key: "salary", name: "Salary Checker", href: "https://almisalary.almiworld.com/" },
  { key: "cv", name: "AlmiCV", href: "https://almicv.almiworld.com/" },
  { key: "study", name: "AlmiStudy", href: "https://almistudy.almiworld.com/" },
  { key: "prep", name: "AlmiPrep", href: "https://almiprep.almiworld.com/" },
  { key: "pte", name: "AlmiPTE", href: "https://almipte.almiworld.com/" },
  { key: "toefl", name: "AlmiTOEFL", href: "https://almitoefl.almiworld.com/" },
  { key: "oet", name: "AlmiOET", href: "https://almioet.almiworld.com/" },
  { key: "det", name: "AlmiDET", href: "https://almidet.almiworld.com/" },
  { key: "celpip", name: "AlmiCELPIP", href: "https://almicelpip.almiworld.com/" },
  { key: "french", name: "AlmiFrench", href: "https://almifrench.almiworld.com/" },
  { key: "spanish", name: "AlmiSpanish", href: "https://almispanish.almiworld.com/" },
  { key: "japanese", name: "AlmiJapanese", href: "https://almijapanese.almiworld.com/" },
  { key: "korean", name: "AlmiKorean", href: "https://almikorean.almiworld.com/" },
  { key: "goethe", name: "AlmiGoethe", href: "https://almigoethe.almiworld.com/" },
  { key: "italian", name: "AlmiItalian", href: "https://almiitalian.almiworld.com/" },
];

// Non-product network links — unchanged by the naming doctrine.
export const NETWORK_LINKS = {
  home: { name: "Home", href: "https://almiworld.com/" },
  ebooks: { name: "eBooks", href: "https://almiworld.com/ebooks-2/" },
  contact: { name: "Contact Us", href: "https://almiworld.com/contact-us/" },
  shamool: { name: "Shamool Foundation", href: "https://shamoolfoundation.com/" },
};

export type NavLink = { label: string; href: string };

/** The family strip for a repo: Home · eBooks · <products> · Contact · Shamool.
 *  Pass the current repo's product `key` as `selfKey` to omit it (its own brand
 *  wordmark is that product's home). */
export function familyStrip(selfKey?: string): NavLink[] {
  const products = FAMILY_PRODUCTS.filter((p) => p.key !== selfKey).map((p) => ({
    label: p.name,
    href: p.href,
  }));
  return [
    { label: NETWORK_LINKS.home.name, href: NETWORK_LINKS.home.href },
    { label: NETWORK_LINKS.ebooks.name, href: NETWORK_LINKS.ebooks.href },
    ...products,
    { label: NETWORK_LINKS.contact.name, href: NETWORK_LINKS.contact.href },
    { label: NETWORK_LINKS.shamool.name, href: NETWORK_LINKS.shamool.href },
  ];
}

/** The footer "Products" column for a repo (canonical product names, self omitted). */
export function footerProducts(selfKey?: string): NavLink[] {
  return FAMILY_PRODUCTS.filter((p) => p.key !== selfKey).map((p) => ({
    label: p.name,
    href: p.href,
  }));
}
