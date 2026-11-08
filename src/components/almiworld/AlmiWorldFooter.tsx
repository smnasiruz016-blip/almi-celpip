// RR-398 · the AlmiWorld family footer, on every page of every AlmiWorld product: the same columns and links as almiworld.com's footer
// (Exams, Languages, Career & Study, AlmiVisibility, and AlmiWorld: Home, About, Contact, FAQs, Blog, Privacy, Refund, Shamool Foundation).
// A product may pass its own small links (its terms, privacy, contact) as `own`; they show in one row under the columns.
// GENERATED kit (almiworld-site/kit): do not edit in a product; change almiworld-site and copy again.
import { ALMIWORLD_FAMILY as F } from "@/lib/almiworld-family";

const CSS = `
.awf{background:#2b1028;color:#e6d9e6;font:400 15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;border-top:8px solid #e8604c;padding:36px 0 28px}
.awf a{color:#fbeff8;text-decoration:none;display:inline-block;padding:3px 0;min-height:28px}
.awf a:hover{text-decoration:underline}
.awf-in{max-width:1180px;margin:0 auto;padding:0 16px}
.awf-cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:20px}
.awf-h{color:#ffc9a9;font-weight:800;margin:0 0 8px}
.awf ul{list-style:none;margin:0;padding:0}
.awf-own{border-top:1px solid #4d2a48;margin-top:20px;padding-top:12px;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:14px}
.awf-copy{border-top:1px solid #4d2a48;margin-top:16px;padding-top:12px;font-size:14px}
.awf-copy a{text-decoration:underline}
`;

export function AlmiWorldFooter({ own }: { own?: { label: string; href: string }[] }) {
  return (
    <footer className="awf" data-almiworld-footer="">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="awf-in">
        <div className="awf-cols">
          {F.footer.columns.map((c) => (
            <div key={c.title}>
              <p className="awf-h">{c.title}</p>
              <ul>{c.links.map((l) => <li key={l.href + l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
            </div>
          ))}
        </div>
        {own?.length ? <div className="awf-own">{own.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}</div> : null}
        <p className="awf-copy">© {new Date().getUTCFullYear()} {F.footer.copy} · <a href={`mailto:${F.footer.email}`}>{F.footer.email}</a></p>
      </div>
    </footer>
  );
}
