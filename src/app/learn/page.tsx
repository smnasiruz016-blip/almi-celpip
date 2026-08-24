// THE /learn HUB. Not decoration — the crawl path.
//
// AlmiOET's register pages were orphaned because /register returned 404: Google
// had no route to any of them and none were ever indexed. So this page exists,
// and its list is DERIVED from content/learn/ rather than hand-maintained. A new
// article appears here the moment its file lands, which makes orphaning
// impossible rather than remembered.

import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticles, getSections, LEARN_BASE } from "@/lib/celpip/learn/articles";
import { SeoShell, Breadcrumb, CrossLinkFooter, Disclaimer } from "@/components/celpip-seo/kit";
import { CELPIP_INDEX } from "@/lib/celpip/seo/urls";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";

export const revalidate = false;

const TITLE = "CELPIP guides: every task, explained with worked examples";
const DESCRIPTION =
  "Plain guides to each CELPIP task — what is actually marked, the mistakes that cost the most, and a full worked answer for each one.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${LEARN_BASE}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}${LEARN_BASE}`, type: "website" },
};

export default function LearnHubPage() {
  const sections = getSections();
  const total = getAllArticles().length;

  return (
    <SeoShell>
      <Breadcrumb trail={[{ label: "CELPIP for Canada", href: CELPIP_INDEX }, { label: "Learn" }]} />

      <header className="mt-2">
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">Learn</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-almi-ink">{TITLE}</h1>
        <p className="mt-3 text-base text-almi-text">{DESCRIPTION}</p>
      </header>

      {total === 0 ? (
        <p className="mt-10 text-sm text-almi-text-muted">No guides published yet.</p>
      ) : (
        sections.map((s) => (
          <section key={s.section} className="mt-10">
            <h2 className="text-xl font-semibold text-almi-ink">{s.section}</h2>
            <ul className="mt-4 space-y-4">
              {s.articles.map((a) => (
                <li key={a.slug} className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-5">
                  <Link
                    href={a.path}
                    className="text-base font-semibold text-almi-ink hover:text-almi-coral hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-1.5 text-sm text-almi-text">{a.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}
