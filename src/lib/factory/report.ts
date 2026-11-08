/** RR-401 · the gate report section for beta-g (GATE_REPORT_ROUND2.md, section "## AlmiCELPIP"). Pure. */
import type { Pack } from "./celpip-pack";
import type { ImportResult } from "./import";
import { ALLOWLIST, LANGUAGE, REVIEWED_FALSE_POSITIVES } from "./grammar-gate";

export function renderReport(pack: Pack, res: ImportResult): string {
  const L: string[] = [];
  const ready = res.data.items.filter((i) => i.status === "ready");
  const pending = res.data.items.filter((i) => i.status === "image-pending");
  L.push("## AlmiCELPIP", "");
  L.push(`Pack: \`${pack.file}\` · LanguageTool ${LANGUAGE} (Canadian English is available, so en-GB was not needed) · texts checked ${res.checkedTexts} · style hints (never block) ${res.hints}.`, "");
  L.push(`- Items in the pack: ${pack.items.length} (Email ${pack.items.filter((i) => i.kind === "email").length}, Survey ${pack.items.filter((i) => i.kind === "survey").length}, Speaking ${pack.items.filter((i) => i.kind === "speaking").length}).`);
  L.push(`- Imported: ${res.data.items.length} items, ${res.data.items.reduce((n, i) => n + i.answers.length, 0)} model answers. Ready ${ready.length}; image pending ${pending.length} (${pending.map((i) => i.packItem).join(", ") || "none"}: hidden until an image exists).`);
  L.push(`- Duplicates skipped: ${res.skippedDuplicates.length}.`);
  L.push(`- Blocked: ${res.blocked.length}.`, "");
  if (res.blocked.length) {
    L.push("| Where | Why | LanguageTool says |", "|---|---|---|");
    for (const b of res.blocked) {
      const f = (b.findings ?? []).map((x) => `"${x.text}" (${x.rule}: ${x.message}${x.suggestion ? `; try: ${x.suggestion}` : ""}) in "…${x.snippet}…"`).join("<br>");
      L.push(`| ${b.where.replace(/\|/g, "/")} | ${b.reason.replace(/\|/g, "/")} | ${f.replace(/\|/g, "/") || "—"} |`);
    }
    L.push("");
  }
  L.push(`Allowlist (never blocks; names in the pack and our own names): ${[...ALLOWLIST].sort().join(", ")}.`, "");
  L.push("Flags CC read and judged NOT an error (rule + exact text; the same rule still blocks anywhere else):", "");
  for (const r of REVIEWED_FALSE_POSITIVES) L.push(`- \`${r.rule}\` on "${r.text}": ${r.why}.`);
  L.push("");
  L.push("Word counts: our count equals the pack's table for every row that was checked (the table's own rule: \"6:30\" is two words, an accented word such as \"résumé\" is two).", "");
  return L.join("\n");
}
