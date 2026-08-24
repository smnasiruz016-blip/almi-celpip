// Markdown -> HTML for /learn article bodies.
//
// remark + remark-gfm, run at BUILD TIME inside a server component. Not MDX:
// the article bodies are prose, and everything component-shaped (CTA, related
// links, sources) is typed frontmatter instead — see articles.ts for why.
//
// gfm is not optional here. The real pages use tables, nested lists, a bullet
// list INSIDE a blockquote, en/em dashes and autolinks; plain CommonMark drops
// or mangles several of those.

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export async function renderMarkdown(md: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    // sanitize:false — the source is our own repo content, never user input,
    // and sanitising strips the <table> gfm just produced.
    .use(remarkHtml, { sanitize: false })
    .process(md);
  return String(file);
}
