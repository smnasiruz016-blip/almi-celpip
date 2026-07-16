// The family product list is NOT maintained here any more. It lives in
// @smnasiruz016-blip/almi-data, and this file is a thin re-export so every existing
// call site (GlobalHeader, GlobalFooter, mobile menu) keeps working unchanged.
//
// WHY: this file used to hold the list, copied verbatim into ~20 repos. A copy is
// created by forking, so it can only know the network as it stood on its fork day —
// every copy froze there and nothing backfilled it. On 2026-07-16 most repos still
// listed 20 products, stopping at AlmiDanish, because that is who existed when they
// were forked. Adding product #24 meant editing 20 repos by hand.
//
// ➜ TO ADD A PRODUCT: edit src/family.ts in the almi-data repo, publish, and bump
//   the dependency here. Do NOT re-add the array to this file — a local copy is
//   exactly the bug that was removed, and it will not throw when it drifts.
//
// ⚠️ `selfKey` is an IDENTITY, not a label. If this repo was forked, re-key the
//   familyStrip()/footerProducts() call sites to THIS product. An inherited key is
//   valid, so nothing throws: almi-swiss shipped familyStrip("swedish") live, which
//   hid AlmiSwedish from the Swiss site as if it were self.
export {
  FAMILY_PRODUCTS,
  NETWORK_LINKS,
  familyStrip,
  footerProducts,
  type FamilyProduct,
  type FamilyKey,
  type NavLink,
} from "@smnasiruz016-blip/almi-data";
