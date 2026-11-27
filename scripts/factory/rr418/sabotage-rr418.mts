// RR-418 · break each guarded thing on purpose, prove its check turns RED for ITS OWN reason, restore the exact bytes, prove GREEN again.
//   npx tsx scripts/factory/rr418/sabotage-rr418.mts
// File sabotages edit a real file the product or the test consumes, run the real test, then write the original bytes back. The two
// sabotages of DE_full_tests.json are made in memory and given to the SAME check function the test uses (editing that file on disk is
// first caught by its md5 — which is proved too — and would hide the check under test).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readInput, inputProblems } from "../../../src/lib/factory/rr418/inputs";
import { fullTestShapeProblems } from "./checks";
import type { DeData, Manifest } from "../../../src/lib/factory/rr418/full-tests";
import { MANIFEST_FILE } from "./audio";

const out: string[] = [];
const say = (s: string) => { out.push(s); console.log(s); };
const runTest = () => { const r = spawnSync(process.execPath, [join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/factory/rr418/rr418.test.ts"], { windowsHide: true, encoding: "utf8" }); return (r.stdout ?? "") + (r.stderr ?? ""); };
const fails = (txt: string) => txt.split("\n").filter((l) => /^\s+FAIL /.test(l)).map((l) => l.trim());
const summary = (txt: string) => (/(\d+) passed, (\d+) failed/.exec(txt) ?? ["", "?", "?"]).slice(1).join(" passed, ") + " failed";

async function fileSabotage(name: string, file: string, edit: (s: Buffer) => Buffer, expect: RegExp) {
  const orig = readFileSync(file);
  try {
    writeFileSync(file, edit(orig));
    const txt = runTest(), f = fails(txt);
    const hit = f.some((l) => expect.test(l));
    say(`${name}: ${f.length && hit ? "RED" : "NOT RED (!)"} (${summary(txt)}) — ${f.filter((l) => expect.test(l))[0] ?? f[0] ?? "no failure"}`);
  } finally { writeFileSync(file, orig); }
}

const FIX = "scripts/factory/fixtures/rr418/DB_CELPIP_EXPORT.json";
const jsonEdit = (f: (j: { items: { id: string; payload: Record<string, unknown> }[] }) => void) => (b: Buffer) => { const j = JSON.parse(b.toString("utf8")); f(j); return Buffer.from(JSON.stringify(j, null, 2)); };

// 1. one "now" mismatch: a live option edited after the export → that question is blocked, and the test that expects 0 blocked is RED
await fileSabotage("S1 one Part C now-mismatch", FIX, jsonEdit((j) => { const r = j.items.find((x) => x.id === "cmr2p0o4m0007hsbz4603uc7j")!; (r.payload.questions as { options: { text: string }[] }[])[1].options[0].text += " (edited live)"; }), /Part C: 286 questions to apply, 0 blocked/);

// 2 + 3. full tests: 37 questions; a blank whose key is not among its options (in memory, same check function)
{
  const de = readInput<DeData>("DE_full_tests.json"), m = existsSync(MANIFEST_FILE) ? (JSON.parse(readFileSync(MANIFEST_FILE, "utf8")) as Manifest) : null;
  say(`S0 control: the real full tests → ${fullTestShapeProblems(de, m).length} problems`);
  const d37: DeData = JSON.parse(JSON.stringify(de)); d37.tests[0].parts[3].questions.pop();
  const p37 = fullTestShapeProblems(d37, m);
  say(`S2 a full test with 37 questions: ${p37.some((p) => /37 questions/.test(p)) ? "RED" : "NOT RED (!)"} — ${p37.filter((p) => /37/.test(p)).join(" | ")}`);
  const dk: DeData = JSON.parse(JSON.stringify(de)); const b = dk.tests[5].parts[0].questions.find((q) => q.type === "blank")!; b.answer = "e";
  const pk = fullTestShapeProblems(dk, m);
  say(`S3 a blank whose key is not among its options: ${pk.some((p) => /not among its options/.test(p)) ? "RED" : "NOT RED (!)"} — ${pk.filter((p) => /not among/.test(p))[0]}`);
  const tampered = inputProblems(undefined, (p) => (p.endsWith("DE_full_tests.json") ? Buffer.from(JSON.stringify(d37)) : readFileSync(p)));
  say(`   (the same edit on disk is stopped first by the md5 check: ${tampered.join("; ")})`);
}

// 4. a Task 2 (Personal Experience) item at 90 seconds — the live Pack 1 item that no fix touches
await fileSabotage("S4 a Task 2 item at 90 seconds", FIX, jsonEdit((j) => { (j.items.find((x) => x.id === "cmw8fw7e20004qo3s870l1c2w")!.payload).speakSeconds = 90; }), /every live Speaking timing equals the official table/);

// 5. a clip rendered from a different script: Listening Test 1 Part 2's file replaced by the clip of Part 3
await fileSabotage("S5 a clip rendered from a different script (file)", "public/audio/rr418/L1-P2.mp3", () => readFileSync("public/audio/rr418/L1-P3.mp3"), /every clip file is the one the manifest names/);
{
  // …and the listen check itself: Part 2's lines and facts against what Part 3's clip says
  const { listenResults } = await import("../../../src/lib/factory/rr418/listen-check");
  const de = readInput<DeData>("DE_full_tests.json");
  const tr = JSON.parse(readFileSync("scripts/factory/rr418/transcripts.json", "utf8")) as { model: string; clips: Record<string, string> };
  const swapped = { ...tr.clips, "L1-P2": tr.clips["L1-P3"] };
  const r = listenResults(de, swapped, tr.model)["L1-P2"];
  say(`S5b the listen check on a clip of another script: ${r.ok ? "NOT RED (!)" : "RED"} — lines heard ${r.lines[0]}/${r.lines[1]}, facts ${r.facts[0]}/${r.facts[1]}`);
}

// 6. a "Why" box shown with no text
await fileSabotage("S6 a Why box shown with no text", "src/components/celpip/WhyBox.tsx", (b) => Buffer.from(b.toString("utf8").replace("if (!t) return null;", "")), /"Why" renders nothing when there is no text/);

// restored: GREEN again
const final = runTest();
say(`after restore: ${summary(final)}${fails(final).length ? ` — ${fails(final).join(" | ")}` : ""}`);
mkdirSync("scripts/factory/rr418/_work", { recursive: true });
writeFileSync("scripts/factory/rr418/_work/sabotage.txt", `${out.join("\n")}\n`);
