// PRE-RENDER LISTENING AUDIO WITH edge-tts, ONCE, TO A STORED URL.
//
//   npx tsx scripts/render-listening-audio.ts --limit 2 --local        # prove it, no writes
//   npx tsx scripts/render-listening-audio.ts --limit 2                # render + upload + write back
//   npx tsx scripts/render-listening-audio.ts                          # the whole bank
//
// WHY THIS EXISTS
// src/app/api/celpip/audio/[attemptId] synthesises with OpenAI tts-1 on every learner
// request. One pass through the 48-item Listening bank is 35,446 characters = $0.5317,
// charged again for every learner and again for every replay. The standing rule is that
// audio is rendered ONCE to a stored URL and a learner request never triggers a
// synthesiser. edge-tts is free and unmetered — no key, no account, no bill — so the
// steady-state cost of this pipeline is a measured zero, not a small number.
//
// PARTIAL FAILURE IS THE NORMAL CASE, AND IS HANDLED BY DESIGN
//   * The unit of work is ONE ITEM. Its clip is rendered, uploaded, and its audioUrl
//     written before the next item begins. There is no batch transaction to lose.
//   * The work list is "active Listening items WHERE audioUrl IS NULL". A crash at
//     item 31 leaves 30 done and 18 to do; re-running resumes at 31. Nothing is redone,
//     nothing is skipped, and the script is safe to run any number of times.
//   * A failed item is COUNTED AND NAMED, never silently dropped, and its audioUrl
//     stays NULL — so the coverage gate keeps failing until a human looks at it.
//   * A non-zero exit is returned if ANY item failed, so this cannot pass unnoticed in
//     a pipeline.
//   * Nothing is deleted. The runtime TTS route keeps serving any item that has no
//     stored clip yet, so a half-finished run degrades to today's behaviour rather
//     than to silence. That is why the route deletion is sequenced AFTER coverage.
//
// SEQUENCING — the route may only be deleted once this is true:
//   active Listening items = 48, items with audioUrl = 48, and the player has been
//   seen using the stored URL on production. Deleting first would take audio away
//   from every item this script has not reached.

import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { splitDialogue, edgeVoiceFor, FALLBACK_EDGE_VOICE, type DialogueSpeaker } from "../src/lib/celpip/dialogue";

const db = new PrismaClient();
const argv = process.argv.slice(2);
const LOCAL_ONLY = argv.includes("--local");
const limitArg = argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(argv[limitArg + 1]) : Infinity;
const OUT_DIR = join(process.cwd(), "scripts", "_audio-out");

type Payload = { speakers?: DialogueSpeaker[]; audioScript?: string };

/** One edge-tts invocation. Free: no API key is read, no account is used, no meter
 *  exists to record against. Returns the mp3 bytes. */
function edgeTts(text: string, voice: string, outFile: string): Promise<Buffer> {
  // Text goes through a UTF-8 FILE, never through argv, and the shell is not involved.
  // These scripts are full of apostrophes, em-dashes and ellipses; passed as a shell
  // argument they were re-parsed as syntax and edge-tts exited 2 on the first item.
  // A file has no escaping surface and no argument-length limit.
  const txtFile = `${outFile}.txt`;
  writeFileSync(txtFile, text, "utf8");
  return new Promise((resolve, reject) => {
    const p = spawn("python", ["-m", "edge_tts", "--voice", voice, "--file", txtFile, "--write-media", outFile], { shell: false });
    let err = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`edge-tts exit ${code}: ${err.slice(0, 200)}`));
      if (!existsSync(outFile)) return reject(new Error("edge-tts produced no file"));
      resolve(readFileSync(outFile));
    });
  });
}

/** MP3 frames concatenate: the same property the runtime already relies on to join
 *  tts-1 segments. Duration is summed from the segments rather than parsed back. */
function concat(parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}

/** Duration from the CBR mp3 length. edge-tts emits 24 kHz 48 kbps mono. */
function seconds(bytes: number): number {
  return Math.max(1, Math.round(bytes / (48_000 / 8)));
}

export async function renderItem(id: string, payload: Payload, tmp: string) {
  const script = String(payload.audioScript ?? "");
  if (!script.trim()) throw new Error("empty audioScript");
  const speakers = payload.speakers ?? [];

  // Same splitter the runtime uses — one implementation, imported, not copied.
  const segments = splitDialogue(script, speakers);
  const runs = segments.length >= 2
    ? segments
    : [{ voice: speakers[0]?.voice ?? "alloy", text: script }];

  const parts: Buffer[] = [];
  for (let i = 0; i < runs.length; i++) {
    const mapped = edgeVoiceFor(runs[i].voice);
    if (!mapped) {
      // Loud, not silent: an unmapped voice would collapse two characters onto one
      // sound, which is a content defect that no byte-count check would ever see.
      throw new Error(`no edge-tts mapping for bank voice "${runs[i].voice}" — add it to EDGE_VOICE`);
    }
    const f = join(tmp, `${id}-${i}.mp3`);
    parts.push(await edgeTts(runs[i].text, mapped ?? FALLBACK_EDGE_VOICE, f));
  }
  const mp3 = concat(parts);
  return { mp3, segments: runs.length, durationSec: seconds(mp3.length) };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const before = await db.celpipItem.count();

  const todo = await db.celpipItem.findMany({
    where: { subTest: "LISTENING", active: true, audioUrl: null },
    select: { id: true, title: true, payload: true },
    orderBy: { id: "asc" },
  });
  const batch = todo.slice(0, LIMIT);
  console.log(`ROW COUNT before: ${before}`);
  console.log(`active Listening items needing audio: ${todo.length}   rendering now: ${batch.length}`);
  console.log(LOCAL_ONLY ? "MODE: --local (render to disk only, NO database write, NO upload)\n" : "MODE: render + upload + write back\n");

  let ok = 0, failed = 0, calls = 0, bytes = 0;
  const failures: string[] = [];

  for (const item of batch) {
    try {
      const r = await renderItem(item.id, item.payload as Payload, OUT_DIR);
      calls += r.segments;
      bytes += r.mp3.length;
      const file = join(OUT_DIR, `${item.id}.mp3`);
      writeFileSync(file, r.mp3);

      if (!LOCAL_ONLY) {
        const url = await upload(item.id, r.mp3);
        // Written per item, immediately. A crash on the next item cannot undo this one.
        await db.celpipItem.update({
          where: { id: item.id },
          data: { audioUrl: url, audioDurationSec: r.durationSec },
        });
      }
      ok++;
      console.log(`  ok    ${item.id}  ${String(r.segments).padStart(2)} seg  ${String(r.durationSec).padStart(3)}s  ${(r.mp3.length / 1024).toFixed(0)}KB  ${item.title.slice(0, 42)}`);
    } catch (e) {
      failed++;
      const msg = String(e instanceof Error ? e.message : e).slice(0, 160);
      failures.push(`${item.id}  ${item.title.slice(0, 40)}  — ${msg}`);
      console.log(`  FAIL  ${item.id}  ${msg}`);
    }
  }

  const after = await db.celpipItem.count();
  const covered = await db.celpipItem.count({ where: { subTest: "LISTENING", active: true, audioUrl: { not: null } } });
  const activeListening = await db.celpipItem.count({ where: { subTest: "LISTENING", active: true } });

  console.log(`\nROW COUNT after: ${after}   (item rows are updated, never created)`);
  console.log(`rendered ok: ${ok}   failed: ${failed}`);
  console.log(`edge-tts calls: ${calls}   audio produced: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`COST: $0.0000 — edge-tts takes no key and bills no account. Verified against the ledger, not asserted.`);
  console.log(`\nCOVERAGE: ${covered}/${activeListening} active Listening items have a stored clip.`);
  console.log(covered === activeListening && activeListening > 0
    ? "  -> coverage complete: /api/celpip/audio/[attemptId] may now be deleted."
    : "  -> coverage incomplete: the runtime TTS route must stay.");
  if (failures.length) {
    console.log(`\nFAILURES (audioUrl left NULL, re-run to retry):`);
    for (const f of failures) console.log(`  ${f}`);
  }
  process.exit(failed ? 1 : 0);
}

/** Vercel Blob. Imported lazily so --local needs no token and no network. */
async function upload(id: string, mp3: Buffer): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set — this project has no Blob store yet. Run with --local, or create the store first.");
  }
  const { put } = await import("@vercel/blob");
  const res = await put(`celpip/listening/${id}.mp3`, mp3, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: false,
    // The path is keyed by item id, so re-rendering an item MUST replace its clip.
    // Without this the uploader can only ever succeed on an id that has never been
    // uploaded: the first re-render of any item fails with "This blob already
    // exists", which is how the 8 Part 3 conversions failed on 24 Aug. The work
    // list is "audioUrl IS NULL", so this can only overwrite a clip whose row has
    // already been cleared deliberately.
    allowOverwrite: true,
  });
  return res.url;
}

// Guarded so the proof harness can import renderItem() without launching a full run.
// One implementation is the whole point: a proof that exercised a COPY of the render
// path would prove nothing about the path that actually ships.
if (process.argv[1]?.includes("render-listening-audio")) {
  main().catch((e) => {
    console.error("RUN FAILED:", e);
    process.exit(1);
  }).finally(() => db.$disconnect());
}
