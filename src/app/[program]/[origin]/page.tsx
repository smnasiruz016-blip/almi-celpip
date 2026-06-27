// Program × origin route: /express-entry/from-pakistan, etc. Nothing is prebuilt
// (programs × 193 origins is large) — pages render on first request and are then
// cached by ISR. Unknown program, or an origin not in the form "from-<country>",
// 404s. dynamicParams stays true so any valid pair renders on demand.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProgramBySlug } from "@/lib/celpip/seo/programs";
import { findCountryByOriginParam } from "@/lib/celpip/seo/countries";
import { ProgramOriginPage } from "@/components/celpip-seo/ProgramOriginPage";

export const revalidate = 86400; // 1 day
export const dynamicParams = true;

// Build nothing up front; every program × origin page is generated on demand.
export function generateStaticParams() {
  return [] as { program: string; origin: string }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ program: string; origin: string }>;
}): Promise<Metadata> {
  const { program: programSlug, origin } = await params;
  const program = findProgramBySlug(programSlug);
  const country = findCountryByOriginParam(origin);
  if (!program || !country) return {};
  const version = program.version === "LS" ? "CELPIP-General LS" : "CELPIP-General";
  const title = `CELPIP for ${program.name} from ${country.name}`;
  const description = `Applying from ${country.name} for ${program.metaName}? ${program.clbHeadline}. How ${version} is scored on the CLB scale, plus free practice for every skill. Confirm current requirements with IRCC.`;
  return {
    title,
    description,
    alternates: { canonical: `/${program.slug}/${origin}` },
    openGraph: {
      title: `${title} · AlmiCELPIP`,
      description,
      url: `/${program.slug}/${origin}`,
      type: "article",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ program: string; origin: string }>;
}) {
  const { program: programSlug, origin } = await params;
  const program = findProgramBySlug(programSlug);
  const country = findCountryByOriginParam(origin);
  if (!program || !country) notFound();
  return <ProgramOriginPage program={program} country={country} />;
}
