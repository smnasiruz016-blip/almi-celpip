// Program hub route: /express-entry, /canadian-citizenship, etc. One page per
// Canadian program that accepts CELPIP. The 9 hubs are prebuilt; unknown slugs
// 404. ISR keeps them fresh without a rebuild.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProgramBySlug, PROGRAM_SLUGS } from "@/lib/celpip/seo/programs";
import { ProgramHubPage } from "@/components/celpip-seo/ProgramHubPage";

export const revalidate = 86400; // 1 day
export const dynamicParams = true;

export function generateStaticParams() {
  return PROGRAM_SLUGS.map((program) => ({ program }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ program: string }>;
}): Promise<Metadata> {
  const { program: slug } = await params;
  const program = findProgramBySlug(slug);
  if (!program) return {};
  const version = program.version === "LS" ? "CELPIP-General LS" : "CELPIP-General";
  const title = `CELPIP for ${program.name} — requirement & free practice`;
  const description = `${program.clbHeadline}. What ${version} requires for ${program.metaName}, how CELPIP is scored on the CLB scale, and free practice for every skill. Confirm current requirements with IRCC.`;
  return {
    title,
    description,
    alternates: { canonical: `/${program.slug}` },
    openGraph: { title: `${title} · AlmiCELPIP`, description, url: `/${program.slug}`, type: "article" },
  };
}

export default async function Page({ params }: { params: Promise<{ program: string }> }) {
  const { program: slug } = await params;
  const program = findProgramBySlug(slug);
  if (!program) notFound();
  return <ProgramHubPage program={program} />;
}
