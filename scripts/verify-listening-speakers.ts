// THE SPEAKER-LABEL GATE for Listening audio.
//
//   npx tsx scripts/verify-listening-speakers.ts             # the real bank
//   npx tsx scripts/verify-listening-speakers.ts --self-test # planted cases, NO database
//
// WHY THIS EXISTS
// "Problem Solving — A delayed furniture delivery" declares its speakers as
// Customer/Agent while its script labels them "Woman:" and "Man:". splitDialogue finds
// no boundary it recognises, returns [], and the caller falls back to reading the WHOLE
// script in one voice — labels included, so a learner hears the word "Woman" spoken
// aloud before each of her lines. This is live today: the runtime route
// /api/celpip/audio/[attemptId] uses this same function on every request.
//
// It is a one-item class right now. The reason it needs a gate rather than a fix is
// that nothing prevented it in the first place and nothing would catch the next one —
// the mismatch is invisible to typechecking, to the seed's (taskType,title) dedupe, and
// to any check that counts items or characters. It becomes permanent the moment the
// pre-render writes it to a stored URL.
//
// TWO FAILURE MODES, because they kill a render run in different ways:
//   A  a declared multi-speaker item that does not split  -> silently wrong audio
//   B  a bank voice with no edge-tts mapping              -> render THROWS mid-run
//
// The real splitDialogue and edgeVoiceFor are imported, never re-implemented. A regex
// copy would measure my idea of the product rather than the product, and would drift
// the first time the real one changed.

import { PrismaClient } from "@prisma/client";
import { splitDialogue, edgeVoiceFor, type DialogueSpeaker } from "../src/lib/celpip/dialogue";

const SELF_TEST = process.argv.includes("--self-test");
let passed = 0, failed = 0;
const check = (ok: boolean, name: string, detail = "") => {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`); }
};

type Payload = { speakers?: DialogueSpeaker[]; audioScript?: string };
type Item = { id: string; title: string; active: boolean; payload: Payload };

/** The labels a script actually uses, so an offender report can say what to change to. */
function labelsUsed(script: string): string[] {
  const out = new Set<string>();
  for (const m of script.matchAll(/(?:^|[.!?…]\s+|\s)([A-Z][A-Za-z'-]{1,14})\s*:\s/g)) out.add(m[1]);
  return [...out];
}

function collapsed(items: Item[]) {
  const bad: { item: Item; roles: string[]; labels: string[] }[] = [];
  for (const it of items) {
    const sp = it.payload.speakers ?? [];
    if (sp.length < 2) continue;                       // one declared speaker is fine
    const script = String(it.payload.audioScript ?? "");
    if (splitDialogue(script, sp).length >= 2) continue;
    bad.push({ item: it, roles: sp.map((s) => s.role), labels: labelsUsed(script) });
  }
  return bad;
}

function unmappedVoices(items: Item[]) {
  const used = new Map<string, number>();
  for (const it of items) for (const s of it.payload.speakers ?? []) used.set(s.voice, (used.get(s.voice) ?? 0) + 1);
  return { used, unmapped: [...used.keys()].filter((v) => !edgeVoiceFor(v)) };
}

// ── SELF-TEST: plant known-bad items in memory and prove the gate reddens ────
// A gate never seen red has not been tested. These cases never touch the database.
function selfTest() {
  console.log("SELF-TEST — planted cases, no database\n");

  const goodItem: Item = {
    id: "planted-good", title: "planted: labels match declared roles", active: true,
    payload: {
      speakers: [{ role: "Customer", voice: "nova" }, { role: "Agent", voice: "alloy" }],
      audioScript: "Customer: My sofa never arrived. Agent: I'm sorry, let me check that for you.",
    },
  };
  const badItem: Item = {
    id: "planted-bad", title: "planted: declares Customer/Agent, script says Woman/Man", active: true,
    payload: {
      speakers: [{ role: "Customer", voice: "nova" }, { role: "Agent", voice: "alloy" }],
      audioScript: "Woman: My sofa never arrived. Man: I'm sorry, let me check that for you.",
    },
  };
  const badVoice: Item = {
    id: "planted-voice", title: "planted: a voice with no edge-tts mapping", active: true,
    payload: {
      speakers: [{ role: "A", voice: "nova" }, { role: "B", voice: "sonorous-9000" }],
      audioScript: "A: one. B: two.",
    },
  };
  const singleSpeaker: Item = {
    id: "planted-single", title: "planted: one declared speaker, a monologue", active: true,
    payload: { speakers: [{ role: "Announcer", voice: "onyx" }], audioScript: "The library will close early on Friday." },
  };

  // The detector must FIRE on the bad ones...
  check(collapsed([badItem]).length === 1, "FIRES on a declared-multi item whose script uses different labels");
  check(unmappedVoices([badVoice]).unmapped.length === 1, "FIRES on a bank voice with no edge-tts mapping");

  // ...and stay SILENT on the good ones. A gate that flags everything gets switched off.
  check(collapsed([goodItem]).length === 0, "SILENT on an item whose labels match its declared roles");
  check(collapsed([singleSpeaker]).length === 0, "SILENT on a single-speaker monologue (not a dialogue at all)");
  check(unmappedVoices([goodItem]).unmapped.length === 0, "SILENT on fully mapped voices");

  // And the offender report must be actionable, not just a count.
  const report = collapsed([badItem])[0];
  check(report.roles.join("/") === "Customer/Agent" && report.labels.join("/") === "Woman/Man",
    "names BOTH the declared roles and the labels the script really uses",
    `got roles=${report.roles.join("/")} labels=${report.labels.join("/")}`);

  console.log(`\n${passed} passed, ${failed} failed  (--self-test: no database touched)`);
  process.exit(failed ? 1 : 0);
}

async function main() {
  if (SELF_TEST) return selfTest();

  const db = new PrismaClient();
  try {
    // DENOMINATOR: every Listening item, not just the active ones. A retired item can be
    // reactivated by flipping one boolean, and a gate that skipped it would have never
    // checked the content that just went live. Active/inactive are reported separately
    // so the number stays honest either way.
    const items = (await db.celpipItem.findMany({
      where: { subTest: "LISTENING" },
      select: { id: true, title: true, active: true, payload: true },
      orderBy: { id: "asc" },
    })) as Item[];

    const active = items.filter((i) => i.active).length;
    console.log(`Listening items walked: ${items.length}  (active ${active}, inactive ${items.length - active})`);
    check(items.length > 0, "the bank is non-empty — a zero here would be a broken query, not a clean product");

    console.log("\nA. EVERY DECLARED DIALOGUE ACTUALLY SPLITS");
    const multi = items.filter((i) => (i.payload.speakers ?? []).length >= 2);
    const bad = collapsed(items);
    console.log(`     ${multi.length} of ${items.length} items declare two or more speakers`);
    check(multi.length > 0, "there are multi-speaker items to check at all");
    check(bad.length === 0, `every declared dialogue splits into 2+ segments (${multi.length - bad.length}/${multi.length})`);
    for (const b of bad) {
      console.log(`         ${b.item.id}${b.item.active ? "" : "  [INACTIVE]"}  "${b.item.title}"`);
      console.log(`             declares : ${b.roles.join(" / ")}`);
      console.log(`             script uses: ${b.labels.join(" / ") || "(no speaker labels at all)"}`);
      console.log(`             -> renders in ONE voice, labels included, so they are spoken aloud`);
    }

    console.log("\nB. EVERY BANK VOICE MAPS TO AN edge-tts VOICE");
    const { used, unmapped } = unmappedVoices(items);
    check(used.size > 0, "voices were found to check");
    check(unmapped.length === 0, `all ${used.size} bank voices map (a missing one makes the render THROW mid-run)`,
      unmapped.join(", "));

    console.log(`\n${passed} passed, ${failed} failed`);
    console.log(failed === 0
      ? "\nGREEN — the bank is safe to pre-render."
      : "\nRED — do NOT pre-render. Stored audio makes these permanent.");
  } finally {
    await db.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("GATE FAILED TO RUN:", e); process.exit(1); });
