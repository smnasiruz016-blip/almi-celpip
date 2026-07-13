// /celpip/pathway/<program> — one hub per program. All 9 prebuilt; unknown 404s.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProgramBySlug, PROGRAM_SLUGS } from "@/lib/celpip/seo/programs";
import { PathwayHub } from "@/components/celpip-seo/pages-pathway";

export const revalidate = false; // render-once, cache until redeploy — static SEO data, no periodic ISR re-writes
export const dynamicParams = true;

export function generateStaticParams() {
  return PROGRAM_SLUGS.map((pathway) => ({ pathway }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pathway: string }>;
}): Promise<Metadata> {
  const { pathway } = await params;
  const program = findProgramBySlug(pathway);
  if (!program) return {};
  const version = program.version === "LS" ? "CELPIP-General LS" : "CELPIP-General";
  return {
    title: `CELPIP for ${program.name} — requirement & free practice`,
    description: `${program.clbHeadline}. What ${version} requires for ${program.metaName}, how CELPIP is scored on the CLB scale, and free practice. Confirm current requirements with IRCC.`,
    alternates: { canonical: `/celpip/pathway/${program.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ pathway: string }> }) {
  const { pathway } = await params;
  const program = findProgramBySlug(pathway);
  if (!program) notFound();
  return <PathwayHub program={program} />;
}
