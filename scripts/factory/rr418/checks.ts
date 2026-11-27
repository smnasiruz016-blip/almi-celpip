// RR-418 · the checks, as functions of their data, so the offline test runs them on the real inputs and the sabotage runs the SAME
// functions on deliberately broken data (and must see each one fail, for its own reason). Each returns [] when it passes.
import { planRow, canon, type Inputs, type LiveRow, type Change } from "../../../src/lib/factory/rr418/plan";
import { fullTestProblems, fullTestItems, type DeData, type Manifest } from "../../../src/lib/factory/rr418/full-tests";

/** the official Speaking times (CELPIP Speaking Pro: Target 5 Study Pack 2026, p. 5) */
export const SPEAKING_TABLE: Record<string, { choose?: number; prep: number; speak: number }> = {
  SPEAKING_ADVICE: { prep: 30, speak: 90 },
  SPEAKING_PERSONAL_EXPERIENCE: { prep: 30, speak: 60 },
  SPEAKING_DESCRIBE_SCENE: { prep: 30, speak: 60 },
  SPEAKING_PREDICTIONS: { prep: 30, speak: 60 },
  SPEAKING_COMPARE_PERSUADE: { choose: 60, prep: 60, speak: 60 },
  SPEAKING_DIFFICULT_SITUATION: { prep: 60, speak: 60 },
  SPEAKING_OPINIONS: { prep: 30, speak: 90 },
  SPEAKING_UNUSUAL_SITUATION: { prep: 30, speak: 60 },
};
/** live Speaking items that no RR-418 input fixes and that therefore cannot match the table yet — each listed, with its exact current
 *  timing (so nothing else can hide behind this list), and reported as BLOCKED for an owner/beta-g decision */
export const TIMING_NOT_FIXED: Record<string, { prep: number; speak: number; why: string }> = {
  cmw8fw7hb0005qo3sjx28ler2: { prep: 120, speak: 60, why: "Pack 1 Task 5 (Camping trip or city hotel): no Part F timing and no two-screen prompt (it has no third option) in the RR-418 inputs" },
};

/** Pack 1 Speaking items (already live before RR-418) whose model answers have ONE level (10+): no CELPIP 7 answer exists in Pack 1 or in
 *  the RR-418 inputs. Listed by id with their exact levels, reported for beta-g; any other item must have the full set. */
export const PACK1_TOP_ONLY = Object.freeze(["cmw8fw7hb0005qo3sjx28ler2", "cmw8fw7kl0006qo3sp2nlmgdt", "cmw8fw7nv0007qo3sa7bxbvlx", "cmw8fw7e20004qo3s870l1c2w", "cmw8fw7r50008qo3stiu33ima"]);

export const applyAll = (rows: LiveRow[], inp: Inputs) => rows.map((r) => planRow(r, inp));

/** every live Speaking item, after the plan, against the official table; Task 5 is two screens */
export function timingProblems(after: LiveRow[]): string[] {
  const out: string[] = [];
  for (const r of after.filter((x) => x.subTest === "SPEAKING")) {
    const p = r.payload as { prepSeconds?: number; speakSeconds?: number; chooseSeconds?: number; part1?: string; part2?: string; thirdOption?: string };
    const want = SPEAKING_TABLE[r.taskType];
    const ex = TIMING_NOT_FIXED[r.id];
    if (ex) { if (p.prepSeconds !== ex.prep || p.speakSeconds !== ex.speak) out.push(`${r.id}: the listed exception changed (${p.prepSeconds}/${p.speakSeconds})`); continue; }
    if (p.prepSeconds !== want.prep || p.speakSeconds !== want.speak || (want.choose ?? undefined) !== p.chooseSeconds) out.push(`${r.taskType} "${r.title}": ${p.chooseSeconds ?? "-"}/${p.prepSeconds}/${p.speakSeconds}, official ${want.choose ?? "-"}/${want.prep}/${want.speak}`);
    if (r.taskType === "SPEAKING_COMPARE_PERSUADE" && !(p.part1 && p.part2 && p.thirdOption && p.part2.includes(p.thirdOption))) out.push(`Task 5 "${r.title}" is not two screens (part1 / part2 with the third option)`);
  }
  return out;
}

/** Part C: no key's TEXT changes, 4 options each, keys balanced (each letter 20–30 % of all keys) */
export function keyProblems(inp: Inputs, de: DeData): string[] {
  const out: string[] = [];
  const letters = (ks: string[], where: string) => {
    const n = ks.length, by = ks.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {});
    for (const l of ["a", "b", "c", "d"]) { const f = (by[l] ?? 0) / n; if (f < 0.2 || f > 0.3) out.push(`${where}: key "${l}" is ${(f * 100).toFixed(1)} % of ${n} (balanced = 20–30 %)`); }
  };
  const cKeys: string[] = [];
  for (const [id, qs] of Object.entries(inp.c.items)) for (const [q, c] of Object.entries(qs)) {
    const oldText = c.oldOptions[["a", "b", "c", "d"].indexOf(c.oldAnswer)], newText = c.options.find((o) => o.id === c.answer)?.text;
    if (oldText !== newText) out.push(`${id} ${q}: the key's text changes ("${oldText}" → "${newText}")`);
    if (c.options.length !== 4) out.push(`${id} ${q}: ${c.options.length} options`);
    if (!c.options.some((o) => o.id === c.answer)) out.push(`${id} ${q}: the key is not among the options`);
    if (!c.explanation?.trim()) out.push(`${id} ${q}: no explanation`);
    cKeys.push(c.answer);
  }
  letters(cKeys, "Part C");
  letters(de.tests.filter((t) => t.skill === "L").flatMap((t) => t.parts.flatMap((p) => p.questions.map((q) => q.answer))), "full Listening tests");
  letters(de.tests.filter((t) => t.skill === "R").flatMap((t) => t.parts.flatMap((p) => p.questions.filter((q) => q.type !== "paragraph").map((q) => q.answer))), "full Reading tests (mcq + blanks)");
  return out;
}

/** the full tests: official shape (fullTestProblems) + the stored items: 38 per test, part counts, blanks, A–E */
export function fullTestShapeProblems(de: DeData, manifest: Manifest | null): string[] {
  const out = [...fullTestProblems(de)];
  const items = fullTestItems(de, manifest);
  const byTest = new Map<string, typeof items>();
  for (const it of items) { const t = (it.payload.fullTest as { test: string }).test; (byTest.get(t) ?? byTest.set(t, []).get(t)!).push(it); }
  for (const [t, parts] of byTest) {
    const qs = parts.map((p) => (p.payload.questions as { kind?: string; answer: string; options?: { id: string }[] }[]));
    const total = qs.reduce((a, q) => a + q.length, 0);
    if (total !== 38) out.push(`${t} as stored: ${total} questions`);
    for (const q of qs.flat()) {
      if (q.kind === "paragraph" && !/^[A-E]$/.test(q.answer)) out.push(`${t}: a stored paragraph answer "${q.answer}" is not A–E`);
      if (q.kind !== "paragraph" && !q.options?.some((o) => o.id === q.answer)) out.push(`${t}: a stored key "${q.answer}" is not among its options`);
    }
  }
  return out;
}

/** a Part C "now" mismatch blocks THAT question only: the rest of its row still applies */
export function mismatchProblems(rows: LiveRow[], inp: Inputs, victim: { id: string; q: string }): string[] {
  const out: string[] = [];
  const row = rows.find((r) => r.id === victim.id);
  if (!row) return [`no row ${victim.id}`];
  const drifted: LiveRow = JSON.parse(JSON.stringify(row));
  const q = (drifted.payload as { questions: { id: string; options: { id: string; text: string }[] }[] }).questions.find((x) => x.id === victim.q)!;
  q.options[0].text = `${q.options[0].text} (edited live)`;
  const { next, changes } = planRow(drifted, inp);
  const mine = changes.filter((c: Change) => c.part === "C");
  const v = mine.find((c) => c.what === victim.q), others = mine.filter((c) => c.what !== victim.q);
  if (v?.status !== "blocked") out.push(`the drifted question was ${v?.status ?? "not planned"}, not blocked`);
  if (!others.length || others.some((c) => c.status !== "apply")) out.push(`the other questions of the row were not applied (${others.map((c) => c.status).join(",")})`);
  const nq = (next.payload as { questions: { id: string; options: unknown[] }[] }).questions.find((x) => x.id === victim.q)!;
  if (canon(nq.options) !== canon(q.options)) out.push("the drifted question was changed anyway");
  return out;
}
