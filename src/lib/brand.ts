/**
 * AlmiWorld family brand tokens — TypeScript constants mirror of
 * src/app/globals.css `@theme` definitions.
 *
 * Use these for cases where a CSS variable / Tailwind utility class isn't
 * appropriate (e.g., SVG fill attributes via inline JSX, Schema.org metadata,
 * Open Graph image tints, programmatic color math).
 *
 * Verified 2026-05-28 against https://almiworld.com (xstore WordPress theme).
 */

export const BRAND = {
  // Primary accents
  coral: "#FF7A6B",       // primary CTA buttons + hero accents
  coralDeep: "#ff6b5b",   // hover/active state on coral
  teal: "#0d9488",        // secondary CTA + checkmarks + eyebrow labels
  tealLight: "#5EEAD4",   // mint highlights
  accent: "#F4A340",      // AlmiCELPIP amber-honey secondary accent
  accentDeep: "#e08e2a",  // hover/active on accent
  purple: "#6b46c1",      // small uppercase label text ("PURPOSE")
  purpleDeep: "#2D1B3D",  // deep purple accents
  purpleMuted: "#6B5B7A",
  gold: "#C9A961",        // wordmark heart + tagline italic
  goldDeep: "#A88D44",

  // Text
  ink: "#1a1a2e",         // H1/H2 main heading color (dark navy-purple)
  text: "#334155",        // body text
  textMuted: "#475569",   // secondary text
  onDark: "#f8fafc",      // text on dark hero

  // Surfaces
  bg: "#FFFBF5",          // soft cream page background
  bgPeach: "#FFE8D6",     // peach accent panel
  bgMist: "#e8edf5",      // light bluish-grey panel
  paper: "#FFFFFF",       // card background
} as const;

export type BrandColor = keyof typeof BRAND;
