// ONE route + ONE template for every /learn article. Page 111 needs no code
// change — it needs a file in content/learn/.
//
// Server component: the markdown is rendered to HTML at BUILD time and shipped
// as static HTML. A page Google receives empty is not a page.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticles, getArticle, LEARN_BASE } from "@/lib/celpip/learn/articles";
import { renderMarkdown } from "@/lib/celpip/learn/markdown";
import { SeoShell, Breadcrumb, CrossLinkFooter, Disclaimer } from "@/components/celpip-seo/kit";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://almicelpip.almiworld.com";

// Same choice as the SEO hubs in #15, for the same reason: generateStaticParams
// returns the COMPLETE set, so every real URL is prebuilt at deploy and an
// unknown URL 404s instead of triggering a render + ISR cache write.
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `${SITE_URL}${article.path}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `${SITE_URL}${article.path}`,
      type: "article",
    },
  };
}

export default async function LearnArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const html = await renderMarkdown(article.body);
  const known = new Set(getAllArticles().map((a) => a.slug));

  return (
    <SeoShell>
      <Breadcrumb
        trail={[
          { label: "Learn", href: LEARN_BASE },
          { label: article.section, href: LEARN_BASE },
          { label: article.title },
        ]}
      />

      <header className="mt-2">
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">
          {article.section}
        </p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-almi-ink">{article.title}</h1>
        <p className="mt-3 text-base text-almi-text">{article.description}</p>
      </header>

      {/* Body prose. Styling lives in globals.css under .learn-prose so the
          markdown output needs no per-element class injection. */}
      <article className="learn-prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />

      {/* CTA — typed, not prose, so a gate can assert every article has one. */}
      <section className="mt-10 rounded-2xl border border-almi-coral/30 bg-almi-coral/5 p-6">
        <Link
          href={article.cta.href}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-almi-coral px-7 py-3 text-base font-semibold text-almi-ink hover:bg-almi-coral-deep"
        >
          {article.cta.label}
        </Link>
        {article.cta.note && (
          <p className="mt-3 text-sm text-almi-text">{article.cta.note}</p>
        )}
      </section>

      {article.related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">
            Related
          </h2>
          <ul className="mt-3 space-y-2">
            {article.related.map((r) => (
              <li key={r.label} className="text-sm">
                {/* An article may point at one not yet written — normal while a
                    110-page set is authored. Link when it resolves, plain text
                    when it does not, so a dangling reference is never a 404. */}
                {r.slug && known.has(r.slug) ? (
                  <Link href={`${LEARN_BASE}/${r.slug}`} className="text-almi-coral hover:underline">
                    {r.label}
                  </Link>
                ) : (
                  <span className="text-almi-text-muted">{r.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {article.sources.length > 0 && (
        <section className="mt-8 border-t border-almi-bg-peach pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">Sources</h2>
          <ul className="mt-2 space-y-1">
            {article.sources.map((s) => (
              <li key={s.url} className="text-xs text-almi-text-muted">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="hover:underline"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-almi-text-muted">
            Original material — never copied from Paragon or CELPIP publications.
          </p>
        </section>
      )}

      <CrossLinkFooter />
      <Disclaimer />
    </SeoShell>
  );
}
