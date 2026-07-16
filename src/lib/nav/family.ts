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
  { key: "jobs", name: "AlmiJob", href: "https://almijob.almiworld.com/" },
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
  { key: "portuguese", name: "AlmiPortuguese", href: "https://almiportuguese.almiworld.com/" },
  { key: "italian", name: "AlmiItalian", href: "https://almiitalian.almiworld.com/" },
  { key: "dutch", name: "AlmiDutch", href: "https://almidutch.almiworld.com/" },
  { key: "icelandic", name: "AlmiIcelandic", href: "https://almiicelandic.almiworld.com/" },
  { key: "danish", name: "AlmiDanish", href: "https://almidanish.almiworld.com/" },
  { key: "norwegian", name: "AlmiNorwegian", href: "https://alminorwegian.almiworld.com/" },
  { key: "swedish", name: "AlmiSwedish", href: "https://almiswedish.almiworld.com/" },
  { key: "swiss", name: "AlmiSwiss", href: "https://almiswiss.almiworld.com/" },
];

// Non-product network links — unchanged by the naming doctrine.
export const NETWORK_LINKS = {
  home: { name: "Home", href: "https://almiworld.com/" },
  ebooks: { name: "eBooks", href: "https://almiworld.com/ebooks-2/" },
  contact: { name: "Contact Us", href: "https://almiworld.com/contact-us/" },
  shamool: { name: "Shamool Foundation", href: "https://shamoolfoundation.com/" },
};

export type NavLink = { label: string; href: string };

/** The product keys this file knows. `selfKey` is an IDENTITY, not a label — never
 *  match on the display name. */
export type FamilyKey = (typeof FAMILY_PRODUCTS)[number]["key"];

/** A selfKey nobody recognises means this strip is silently wrong, so fail loudly.
 *
 *  `FAMILY_PRODUCTS.filter((p) => p.key !== selfKey)` accepts ANY string: pass a key
 *  that matches nothing and you get a strip that renders fine and simply lists one
 *  product too many, forever, with nothing thrown. These helpers are called at module
 *  scope, so this check runs at build time — a typo or a removed product breaks the
 *  build instead of shipping a quietly wrong nav.
 *
 *  ⚠️ WHAT THIS DOES NOT CATCH, stated so nobody trusts it too far: a fork that
 *  inherits its ancestor's key. "swedish" is a VALID key, so no check here can tell
 *  that almi-swiss meant "swiss" — and that shipped, live: almi-swiss called
 *  familyStrip("swedish"), which hid ALMISWEDISH from the strip as if it were self
 *  and never listed AlmiSwiss at all. 21 products rendered and nothing looked broken.
 *  Re-keying a fork is a checklist item, not something this file can enforce. */
function assertKnownKey(selfKey?: string): void {
  if (selfKey === undefined) return;
  if (!FAMILY_PRODUCTS.some((p) => p.key === selfKey)) {
    throw new Error(
      `family.ts: selfKey "${selfKey}" is not a known product key. If this repo was ` +
        `forked, re-key it to its OWN product. Known keys: ${FAMILY_PRODUCTS.map((p) => p.key).join(", ")}`,
    );
  }
}

/** The family strip for a repo: Home · eBooks · <products> · Contact · Shamool.
 *  Pass the current repo's product `key` as `selfKey` to omit it (its own brand
 *  wordmark is that product's home). */
export function familyStrip(selfKey?: FamilyKey): NavLink[] {
  assertKnownKey(selfKey);
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
export function footerProducts(selfKey?: FamilyKey): NavLink[] {
  assertKnownKey(selfKey);
  return FAMILY_PRODUCTS.filter((p) => p.key !== selfKey).map((p) => ({
    label: p.name,
    href: p.href,
  }));
}
