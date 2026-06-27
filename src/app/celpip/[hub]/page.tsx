// /celpip/[hub] — dispatches the two single-segment hubs:
//   from-<country>  → origin hub
//   clb-<n>         → CLB target hub
// Literal siblings (pathway, province, occupation) take precedence, so this only
// ever sees from-* or clb-*. All 196 hubs are prebuilt; anything else 404s.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COUNTRIES, originParam, findCountryByOriginParam, type CountryEntry } from "@/lib/celpip/seo/countries";
import { CLB_TARGETS, findClbTarget, type ClbTarget } from "@/lib/celpip/seo/clb-targets";
import { OriginHub } from "@/components/celpip-seo/pages-origin";
import { ClbHub } from "@/components/celpip-seo/pages-clb";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return [
    ...COUNTRIES.map((c) => ({ hub: originParam(c) })),
    ...CLB_TARGETS.map((t) => ({ hub: t.slug })),
  ];
}

type Resolved =
  | { kind: "origin"; country: CountryEntry }
  | { kind: "clb"; target: ClbTarget }
  | null;

function resolve(hub: string): Resolved {
  if (hub.startsWith("from-")) {
    const country = findCountryByOriginParam(hub);
    return country ? { kind: "origin", country } : null;
  }
  if (hub.startsWith("clb-")) {
    const target = findClbTarget(hub);
    return target ? { kind: "clb", target } : null;
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hub: string }>;
}): Promise<Metadata> {
  const { hub } = await params;
  const r = resolve(hub);
  if (!r) return {};
  if (r.kind === "origin") {
    const title = `CELPIP from ${r.country.name} — for Canadian immigration`;
    return {
      title,
      description: `CELPIP for Canadian immigration and citizenship when you apply from ${r.country.name}: every pathway, CLB target and province, with honest guidance and free practice. Confirm requirements with IRCC.`,
      alternates: { canonical: `/celpip/${hub}` },
    };
  }
  const title = `CELPIP for CLB ${r.target.level} — what it means for Canada`;
  return {
    title,
    description: `${r.target.headline}. How CLB ${r.target.level} relates to your Express Entry CRS score, by country, with honest practice. A CLB is a goal to practise toward — confirm requirements with IRCC.`,
    alternates: { canonical: `/celpip/${hub}` },
  };
}

export default async function Page({ params }: { params: Promise<{ hub: string }> }) {
  const { hub } = await params;
  const r = resolve(hub);
  if (!r) notFound();
  return r.kind === "origin" ? <OriginHub country={r.country} /> : <ClbHub target={r.target} />;
}
