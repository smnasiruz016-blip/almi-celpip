// Family-wide footer — AlmiWorld Global Nav Spec v1 §3. Data-driven: every family
// product except this site's own is a followed cross-link, strengthening the
// network's SEO (spec §3 note).

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "AlmiWorld",
    links: [
      { label: "Home", href: "https://almiworld.com/" },
      { label: "Ebooks", href: "https://almiworld.com/ebooks-2/" },
      { label: "Shamool Foundation", href: "https://shamoolfoundation.com/" },
    ],
  },
  {
    // All eight products — one list.
    title: "Products",
    links: [
      { label: "AlmiJobs", href: "https://almijob.almiworld.com/" },
      { label: "AlmiSalary", href: "https://almisalary.almiworld.com/" },
      { label: "AlmiCV", href: "https://almicv.almiworld.com/" },
      { label: "AlmiStudy", href: "https://almistudy.almiworld.com/" },
      { label: "AlmiPrep", href: "https://almiprep.almiworld.com/" },
      { label: "AlmiPTE", href: "https://almipte.almiworld.com/" },
      { label: "AlmiTOEFL", href: "https://almitoefl.almiworld.com/" },
      { label: "AlmiOET", href: "https://almioet.almiworld.com/" },
      { label: "AlmiDET", href: "https://almidet.almiworld.com/" },
      { label: "AlmiGoethe", href: "https://almigoethe.almiworld.com/" },
      { label: "AlmiFrench", href: "https://almifrench.almiworld.com/" },
      { label: "AlmiSpanish", href: "https://almispanish.almiworld.com/" },
      { label: "AlmiJapanese", href: "https://almijapanese.almiworld.com/" },
    ],
  },
  {
    title: "Legal & Contact",
    links: [
      { label: "Contact Us", href: "https://almiworld.com/contact-us/" },
      { label: "Refund and Return Policy", href: "https://almiworld.com/refund_returns/" },
      { label: "Privacy Policy", href: "https://almiworld.com/privacy-policy/" },
    ],
  },
];

export function GlobalFooter() {
  return (
    <footer className="bg-[#14110D] text-white/75">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-3">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D4A24C]">{col.title}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-white/75 transition-colors hover:text-[#D4A24C]">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-white/15 pt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} AlmiWorld. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
