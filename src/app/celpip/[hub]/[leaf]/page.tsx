// /celpip/[hub]/[leaf] — the two single-segment matrices:
//   from-<country>/<pathway>  → origin × pathway
//   clb-<n>/from-<country>    → CLB × origin
// Nothing is prebuilt (these are the big matrices); pages render on demand and are
// cached by ISR. Anything that doesn't match a known pair 404s.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCountryByOriginParam, type CountryEntry } from "@/lib/celpip/seo/countries";
import { findProgramBySlug, type Program } from "@/lib/celpip/seo/programs";
import { findClbTarget, type ClbTarget } from "@/lib/celpip/seo/clb-targets";
import { OriginPathwayPage } from "@/components/celpip-seo/pages-origin";
import { ClbOriginPage } from "@/components/celpip-seo/pages-clb";

export const revalidate = false; // render-once, cache until redeploy — static SEO data, no periodic ISR re-writes
export const dynamicParams = true;

export function generateStaticParams() {
  return [] as { hub: string; leaf: string }[];
}

type Resolved =
  | { kind: "origin-pathway"; country: CountryEntry; program: Program }
  | { kind: "clb-origin"; target: ClbTarget; country: CountryEntry }
  | null;

function resolve(hub: string, leaf: string): Resolved {
  if (hub.startsWith("from-")) {
    const country = findCountryByOriginParam(hub);
    const program = findProgramBySlug(leaf);
    return country && program ? { kind: "origin-pathway", country, program } : null;
  }
  if (hub.startsWith("clb-")) {
    const target = findClbTarget(hub);
    const country = findCountryByOriginParam(leaf);
    return target && country ? { kind: "clb-origin", target, country } : null;
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hub: string; leaf: string }>;
}): Promise<Metadata> {
  const { hub, leaf } = await params;
  const r = resolve(hub, leaf);
  if (!r) return {};
  if (r.kind === "origin-pathway") {
    const version = r.program.version === "LS" ? "CELPIP-General LS" : "CELPIP-General";
    const title = `CELPIP for ${r.program.name} from ${r.country.name}`;
    return {
      title,
      description: `Applying from ${r.country.name} for ${r.program.metaName}? ${r.program.clbHeadline}. How ${version} is scored on the CLB scale, plus free practice. Confirm requirements with IRCC.`,
      alternates: { canonical: `/celpip/${hub}/${leaf}` },
    };
  }
  const title = `Reaching CELPIP CLB ${r.target.level} for Canada — from ${r.country.name}`;
  return {
    title,
    description: `Aiming for CLB ${r.target.level} on CELPIP from ${r.country.name}? ${r.target.headline}. Honest practice toward your target — a CLB is never guaranteed. Confirm requirements with IRCC.`,
    alternates: { canonical: `/celpip/${hub}/${leaf}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ hub: string; leaf: string }>;
}) {
  const { hub, leaf } = await params;
  const r = resolve(hub, leaf);
  if (!r) notFound();
  return r.kind === "origin-pathway" ? (
    <OriginPathwayPage country={r.country} program={r.program} />
  ) : (
    <ClbOriginPage target={r.target} country={r.country} />
  );
}
