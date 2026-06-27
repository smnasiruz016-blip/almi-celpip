// Top-level index of the CELPIP-for-immigration cluster: one card per Canadian
// program that accepts CELPIP, each linking to its hub. Static — the program set
// is small and fixed.

import type { Metadata } from "next";
import Link from "next/link";
import { PROGRAMS, CELPIP_OFFICIAL_URL, IRCC_LANGUAGE_TESTS_URL } from "@/lib/celpip/seo/programs";

export const metadata: Metadata = {
  title: "CELPIP for Canadian immigration & citizenship",
  description:
    "Which CELPIP level each Canadian immigration and citizenship program requires — Express Entry, Provincial Nominee, citizenship and more — with honest CLB guidance and free practice. Confirm current requirements with IRCC.",
  alternates: { canonical: "/celpip-for" },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">AlmiCELPIP</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-almi-ink sm:text-4xl">
          CELPIP for Canadian immigration & citizenship
        </h1>
        <p className="mt-3 text-base text-almi-text">
          CELPIP is one of the English tests IRCC accepts. Each program sets its own Canadian Language
          Benchmark (CLB) requirement. Pick a program to see what it asks for, how CELPIP is scored,
          and free practice for every skill. Requirements can change — always confirm with IRCC.
        </p>
      </header>

      <section className="mt-8 space-y-3">
        {PROGRAMS.map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            className="block rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 transition hover:border-almi-coral"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-almi-ink">{p.name}</h2>
              <span className="text-xs text-almi-text-muted">
                {p.version === "LS" ? "CELPIP-General LS" : "CELPIP-General"}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-almi-coral-deep">{p.clbHeadline}</p>
            <p className="mt-1 text-sm text-almi-text">{p.whoFor}</p>
          </Link>
        ))}
      </section>

      <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <a href={IRCC_LANGUAGE_TESTS_URL} target="_blank" rel="noopener noreferrer" className="text-almi-coral hover:underline">
          IRCC language tests ↗
        </a>
        <a href={CELPIP_OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="text-almi-coral hover:underline">
          Official CELPIP site ↗
        </a>
      </p>

      <p className="mt-8 rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-xs text-almi-text-muted">
        AlmiCELPIP is original practice material and is not affiliated with or endorsed by CELPIP,
        Paragon Testing Enterprises, or IRCC. CLB figures are published program guidance that can
        change — always confirm the requirement you need with IRCC.
      </p>
    </main>
  );
}
