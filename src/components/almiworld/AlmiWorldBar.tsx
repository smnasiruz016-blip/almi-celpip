// RR-398 · the AlmiWorld family bar, on top of every page of every AlmiWorld product: the AlmiWorld logo and a clear Home button to
// https://almiworld.com/, then Exams, Languages, Career & Study, AlmiVisibility, Products, Blog and About with the same menus as
// almiworld.com. Self-styled (scoped "awb-" classes), no client JavaScript: menus are <details>, so they open and close on a phone too.
// GENERATED kit (almiworld-site/kit): do not edit in a product; change almiworld-site and copy again.
import { ALMIWORLD_FAMILY as F } from "@/lib/almiworld-family";

const CSS = `
.awb{background:#2b1028;color:#fbeff8;font:600 14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;position:relative;z-index:60}
.awb a{color:#fbeff8;text-decoration:none}
.awb-in{max-width:1180px;margin:0 auto;padding:4px 16px;display:flex;align-items:center;gap:10px;min-height:44px}
.awb-logo img{display:block;height:34px;width:auto;background:#fff4e6;border-radius:8px;padding:2px 6px}
.awb-home{display:inline-flex;align-items:center;min-height:36px;padding:6px 14px;border-radius:999px;background:#c2412d;color:#fff!important;font-weight:800}
.awb-home:hover{background:#a63522}
.awb-nav{display:flex;align-items:center;gap:2px;margin-left:auto;flex-wrap:wrap}
.awb-nav>a,.awb-drop>summary{padding:8px 10px;border-radius:8px;cursor:pointer;list-style:none}
.awb-drop>summary::-webkit-details-marker{display:none}
.awb-drop>summary::after{content:" \\25BE";font-size:11px}
.awb-nav>a:hover,.awb-drop>summary:hover{background:#4d2a48}
.awb-drop{position:relative}
.awb-drop ul{position:absolute;right:0;top:100%;margin:4px 0 0;padding:8px;list-style:none;background:#fff7ee;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.25);min-width:220px;max-height:70vh;overflow:auto;z-index:70}
.awb-drop ul a{display:block;padding:7px 10px;border-radius:8px;color:#3d1838;font-weight:600}
.awb-drop ul a:hover{background:#fde7d3}
.awb-mob{display:none;margin-left:auto}
.awb-mob>summary{list-style:none;cursor:pointer;padding:8px 12px;border-radius:8px;border:1px solid #6b2d5c}
.awb-mob>summary::-webkit-details-marker{display:none}
.awb-mob[open]>summary{background:#4d2a48}
.awb-mob-panel{position:absolute;left:0;right:0;top:100%;background:#2b1028;padding:8px 16px 16px;max-height:80vh;overflow:auto;box-shadow:0 16px 32px rgba(0,0,0,.3)}
.awb-mob-panel p{margin:12px 0 4px;color:#ffc9a9;font-weight:800}
.awb-mob-panel a{display:block;padding:7px 0}
@media(max-width:900px){.awb-nav{display:none}.awb-mob{display:block}}
`;

export function AlmiWorldBar() {
  return (
    <div className="awb" data-almiworld-bar="">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="awb-in">
        <a className="awb-logo" href={F.home} aria-label="AlmiWorld home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={F.logo.src} alt={F.logo.alt} width={F.logo.width} height={F.logo.height} />
        </a>
        <a className="awb-home" href={F.home}>Home</a>
        <nav className="awb-nav" aria-label="AlmiWorld family">
          {F.menus.map((m) => (
            <details key={m.label} className="awb-drop">
              <summary>{m.label}</summary>
              <ul>{m.items.map((i) => <li key={i.href + i.label}><a href={i.href}>{i.label}</a></li>)}</ul>
            </details>
          ))}
          {F.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <details className="awb-mob">
          <summary aria-label="AlmiWorld menu">AlmiWorld ☰</summary>
          <div className="awb-mob-panel">
            {F.menus.map((m) => (
              <div key={m.label}><p>{m.label}</p>{m.items.map((i) => <a key={i.href + i.label} href={i.href}>{i.label}</a>)}</div>
            ))}
            <p>AlmiWorld</p>
            {F.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </div>
        </details>
      </div>
    </div>
  );
}
