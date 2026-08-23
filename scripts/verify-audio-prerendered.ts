// THE SEQUENCING GATE for deleting /api/celpip/audio/[attemptId].
//
//   npx tsx scripts/verify-audio-prerendered.ts            # A is skipped without a DB
//   npx tsx scripts/verify-audio-prerendered.ts --self-test # controls, no DB, no network
//
// The standing rule is that audio is PRE-RENDERED ONCE to a stored URL and a learner
// request never triggers a synthesiser. This gate says whether that is true YET, and
// it exists because the deletion must not happen first: removing the runtime route
// while items still have no stored clip replaces a cost problem with silence.
//
// THREE ELEMENTS, and they fail for different reasons on purpose:
//   A  COVERAGE    every active Listening item has audioUrl        (needs the DB)
//   B  NO RUNTIME  no learner-reachable route reaches a paid TTS   (static)
//   C  VOICE MAP   every voice the bank uses maps to an edge voice (needs the DB)
//
// A gate that only checked B would go green the moment someone deleted the route,
// coverage or no coverage. A gate that only checked A would stay green while a new
// runtime synthesiser was added somewhere else. Both are required.

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { EDGE_VOICE } from "../src/lib/celpip/dialogue";

const SELF_TEST = process.argv.includes("--self-test");
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

// Paid synthesisers only. edge-tts and Piper are free and are never flagged.
const PAID_TTS = [
  /api\.openai\.com\/v1\/audio\/speech/,
  /\baudio\.speech\b/,
  /["']tts-1(-hd)?["']/,
  /api\.elevenlabs\.io|ElevenLabsClient/,
  /texttospeech\.googleapis\.com|TextToSpeechClient/,
  /tts\.speech\.microsoft\.com|SpeechSynthesizer/,
  /@aws-sdk\/client-polly|SynthesizeSpeechCommand/,
];
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const hasPaidTts = (src: string) => PAID_TTS.some((re) => re.test(strip(src)));

function walk(dir: string, want: (n: string) => boolean): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") out.push(...walk(p, want)); }
    else if (want(e.name)) out.push(p);
  }
  return out;
}

/** Follow relative and @/ imports out of a route so a synthesiser one module away is
 *  still found. File existence alone was wrong in both directions on other products. */
function reachable(entry: string, SRC: string): string[] {
  const seen = new Set<string>(); const st = [entry];
  while (st.length) {
    const f = st.pop()!; if (seen.has(f)) continue; seen.add(f);
    let s: string; try { s = readFileSync(f, "utf8"); } catch { continue; }
    for (const re of [/^\s*import\s[^(;]*?\sfrom\s+["']([^"']+)["']/gm, /^\s*import\s+["']([^"']+)["']/gm]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        const sp = m[1];
        let base: string | null = null;
        if (sp.startsWith("@/")) base = join(SRC, sp.slice(2));
        else if (sp.startsWith(".")) base = join(f, "..", sp);
        if (!base) continue;
        for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
          if (existsSync(c) && statSync(c).isFile()) { if (!seen.has(c)) st.push(c); break; }
        }
      }
    }
  }
  return [...seen];
}

async function main() {
  const SRC = join(process.cwd(), "src");

  // ── CONTROLS FIRST. A sweep that cannot recognise the thing it hunts prints a
  // clean result and means nothing — that is how a banned-string scan passed 91
  // leaking tips. These run before any finding is reported.
  console.log("CONTROLS");
  check("detector FIRES on a known paid synthesiser", hasPaidTts(`const r = await openai.audio.speech.create({ model: "tts-1" })`));
  check("detector is SILENT on edge-tts", !hasPaidTts(`spawn("python", ["-m", "edge_tts", "--voice", v])`));
  check("detector is SILENT on the tts price table", !hasPaidTts(`export const TTS_USD_PER_1K_CHARS = { "x": 0.015 };`));
  if (fail) { console.log("\nCONTROLS FAILED — refusing to report findings."); process.exit(1); }

  console.log("\nB. NO LEARNER-REACHABLE RUNTIME SYNTHESISER");
  const routes = walk(join(SRC, "app", "api"), (n) => n === "route.ts");
  const offenders: string[] = [];
  for (const r of routes) {
    const short = r.replace(process.cwd(), "").replace(/\\/g, "/");
    if (short.includes("/api/admin/")) continue; // owner-only, not a learner path
    const files = reachable(r, SRC);
    const vendorFiles = files.filter((f) => { try { return hasPaidTts(readFileSync(f, "utf8")); } catch { return false; } });
    if (!vendorFiles.length) continue;

    // IMPORT-REACHABILITY IS NOT A FINDING. src/lib/ai/openai.ts holds the grader
    // client AND the synthesiser, so every route that grades anything "reaches" a
    // paid TTS vendor without ever calling one. On AlmiPTE that mistake reported 9
    // exposed routes where the true number was far smaller. Require a CALL SITE.
    const synth = [...new Set(vendorFiles.flatMap((f) => {
      try { return [...strip(readFileSync(f, "utf8")).matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]); }
      catch { return []; }
    }))]
      .filter((n) => /synth|speech|tts|voice|dialogue/i.test(n))
      // cost/price helpers are not synthesisers; counting them made every submit
      // route look like a TTS caller when it only prices one.
      .filter((n) => !/cost|price|cents|budget|estimate/i.test(n));

    const called = synth.filter((sym) =>
      files.some((f) => {
        if (vendorFiles.includes(f)) return false;
        try { return new RegExp(String.raw`\b${sym}\s*\(`).test(strip(readFileSync(f, "utf8"))); } catch { return false; }
      }));
    if (called.length) offenders.push(`${short} [calls ${called.join(", ")}]`);
  }
  check(`no learner route reaches a paid TTS vendor  (${routes.length} routes scanned)`,
    offenders.length === 0, offenders.join(", "));

  if (SELF_TEST) {
    console.log(`\n${pass} passed, ${fail} failed  (--self-test: A and C skipped, no database touched)`);
    process.exit(fail ? 1 : 0);
  }

  const db = new PrismaClient();
  try {
    console.log("\nA. COVERAGE");
    const active = await db.celpipItem.count({ where: { subTest: "LISTENING", active: true } });
    try {
      const covered = await db.celpipItem.count({ where: { subTest: "LISTENING", active: true, audioUrl: { not: null } } });
      check(`every active Listening item has a stored clip  (${covered}/${active})`, active > 0 && covered === active);
    } catch (e) {
      // A missing column IS the defect on a red run, so it is reported as a failed
      // check rather than crashing the file — a stack trace cannot tell you WHICH
      // assertions the fix has to satisfy.
      const missing = (e as { code?: string }).code === "P2022";
      check(`every active Listening item has a stored clip  (0/${active})`, false,
        missing ? "CelpipItem.audioUrl does not exist yet — migration 20260823041500_listening_audio is PENDING" : String(e).slice(0, 120));
    }

    console.log("\nC. VOICE MAP");
    const rows = await db.celpipItem.findMany({ where: { subTest: "LISTENING" }, select: { payload: true } });
    const used = new Set<string>();
    for (const r of rows) for (const s of ((r.payload as { speakers?: { voice: string }[] }).speakers ?? [])) used.add(s.voice);
    const unmapped = [...used].filter((v) => !EDGE_VOICE[v]);
    check(`every bank voice maps to an edge-tts voice  (${used.size} voices in use)`,
      unmapped.length === 0, `unmapped: ${unmapped.join(", ")}`);
  } finally {
    await db.$disconnect();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(fail === 0
    ? "\nALL THREE GREEN -> /api/celpip/audio/[attemptId] may now be deleted."
    : "\nNOT GREEN -> the runtime TTS route MUST STAY. Deleting it now would leave items with no audio at all.");
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("GATE FAILED TO RUN:", e); process.exit(1); });
