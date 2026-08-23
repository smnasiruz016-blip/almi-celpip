// THE PLAYER READS THE STORED URL — PROVED IN BOTH DIRECTIONS.
//
//   npx tsx scripts/verify-listening-audio-source.test.ts
//   npx tsx scripts/verify-listening-audio-source.test.ts --self-test
//
// Offline. No database, no network, no model call, no key.
//
// ── WHY THIS TEST IS SHAPED THE WAY IT IS ────────────────────────────────────
// All 48 active Listening rows have audioUrl = NULL today. A run against only
// that state proves the EASY half — the fallback — and would stay green if the
// stored path had never been written at all. So the fake-URL direction below is
// not a nicety; it is the only half that tests the feature.
//
// The stored direction asserts TWO SEPARATE THINGS, because neither implies the
// other:
//
//   OBSERVATION 1  the URL handed to the player IS the stored one   ("used it")
//   OBSERVATION 2  the fallback route was called zero times      ("didn't call")
//
// A player that set src to the stored URL and ALSO pre-warmed the route would
// pass 1 and fail 2 — and would still be spending on a synthesiser, which is the
// whole cost the stored clip exists to avoid. A player that crashed and called
// nothing would pass 2 vacuously and fail 1. Only both together say the feature
// works. Each is recorded by a DIFFERENT instrument: 1 by capturing the value
// handed onward to the audio element, 2 by counting calls on an injected fetch.
//
// The §5 section proves what crosses to the browser, by stringifying the actual
// prop object the session page spreads onto <CelpipComposer> and searching it.
// Every sweep is preceded by a CONTROL asserting the needle IS present in the
// unsanitised input — a search that cannot find anything reports a clean zero.

import { resolveAudioSource, loadListeningAudio, fallbackAudioRoute } from "../src/lib/celpip/listening-audio";
import { buildComposerProps, sanitizePayload } from "../src/lib/celpip/client-payload";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const SELF_TEST = process.argv.includes("--self-test");

// ── Instruments ──────────────────────────────────────────────────────────────
// A fetch that counts and records. It is the ONLY route loadListeningAudio has
// to the endpoint, so a zero here is a real zero.
function spyFetch(body = "MP3BYTES") {
  const calls: string[] = [];
  const impl = async (input: string) => {
    calls.push(input);
    return { ok: true, blob: async () => new Blob([body], { type: "audio/mpeg" }) };
  };
  return { calls, impl };
}
// Records every object URL minted, i.e. every clip that had to be downloaded.
function spyObjectUrl() {
  const made: Blob[] = [];
  const impl = (b: Blob) => { made.push(b); return "blob:fake/" + made.length; };
  return { made, impl };
}

const ATTEMPT = "att_ckz1listening";
const STORED = "https://blob.vercel-storage.com/celpip/listening/item-07.mp3";

async function main() {
  // ── DIRECTION 1: audioUrl NULL — today's real state, all 48 rows ───────────
  console.log("\nDIRECTION 1 · no stored clip (the state of all 48 live rows today)");
  {
    const f = spyFetch();
    const o = spyObjectUrl();
    const loaded = await loadListeningAudio({
      attemptId: ATTEMPT, audioUrl: null, fetchImpl: f.impl, createObjectUrl: o.impl,
    });
    check("falls back to the route", loaded.kind === "route", loaded.kind);
    check("calls the route exactly once", f.calls.length === 1, f.calls.length + " call(s)");
    check("calls " + fallbackAudioRoute(ATTEMPT), f.calls[0] === fallbackAudioRoute(ATTEMPT), f.calls[0]);
    check("plays the blob it fetched", loaded.playbackUrl === "blob:fake/1", loaded.playbackUrl);
    check("hands back an object URL to revoke", loaded.objectUrl === "blob:fake/1", String(loaded.objectUrl));
  }

  // An empty/whitespace audioUrl is NOT a clip; it must fall back, not play "".
  const blanks: [string, string | null | undefined][] = [
    ["empty string", ""], ["whitespace", "   "], ["undefined", undefined],
  ];
  for (const [label, value] of blanks) {
    const f = spyFetch();
    const loaded = await loadListeningAudio({
      attemptId: ATTEMPT, audioUrl: value, fetchImpl: f.impl, createObjectUrl: spyObjectUrl().impl,
    });
    check(label + " audioUrl falls back to the route", loaded.kind === "route" && f.calls.length === 1);
  }

  // ── DIRECTION 2: a stored clip — the half the database cannot show us yet ──
  console.log("\nDIRECTION 2 · one item given a stored audioUrl in memory");
  {
    const f = spyFetch();
    const o = spyObjectUrl();
    const loaded = await loadListeningAudio({
      attemptId: ATTEMPT,
      audioUrl: SELF_TEST ? null : STORED,   // --self-test breaks the input on purpose
      fetchImpl: f.impl,
      createObjectUrl: o.impl,
    });

    // OBSERVATION 1 — it USED the stored URL. Instrument: the value handed onward.
    check("OBS 1 · the player is handed the STORED url", loaded.playbackUrl === STORED, loaded.playbackUrl);
    check("OBS 1 · source is reported as stored", loaded.kind === "stored", loaded.kind);

    // OBSERVATION 2 — it did NOT call the route. Instrument: the fetch counter.
    // Independent of OBS 1: a player could do both, or neither.
    check("OBS 2 · the fallback route was called ZERO times", f.calls.length === 0, "called: " + f.calls.join(", "));
    check("OBS 2 · no blob was created (nothing was downloaded)", o.made.length === 0, o.made.length + " blob(s)");
    check("OBS 2 · nothing to revoke", loaded.objectUrl === null, String(loaded.objectUrl));
  }

  // The resolver, stated directly.
  check("resolveAudioSource prefers stored", resolveAudioSource(ATTEMPT, STORED).kind === "stored");
  check("resolveAudioSource falls back on null", resolveAudioSource(ATTEMPT, null).kind === "route");

  // ── §5 · WHAT CROSSES TO THE BROWSER ──────────────────────────────────────
  console.log("\n§5 · the answer key never appears in a served payload");

  const SENTINEL = "ZZQ_TRANSCRIPT_SENTINEL_ZZQ";
  const listeningItem = {
    attemptId: ATTEMPT,
    taskType: "LISTENING_PROBLEM_SOLVING" as never,
    prompt: "Listen once, then answer.",
    audioUrl: STORED,
    payload: {
      audioScript: "Woman: " + SENTINEL + " The bus leaves at half past two.",
      speakers: [{ role: "Woman", voice: "nova" }, { role: "Man", voice: "onyx" }],
      questions: [
        { id: "q1", stem: "When does the bus leave?", options: [{ id: "a", text: "2:30" }], answer: "a" },
      ],
    },
  };

  // CONTROL — the needles MUST be findable in the unsanitised item, or a clean
  // sweep below would mean the SEARCH is broken, not that the payload is safe.
  const rawJson = JSON.stringify(listeningItem);
  check("CONTROL · sentinel is present before sanitising", rawJson.includes(SENTINEL));
  check("CONTROL · audioScript is present before sanitising", rawJson.includes("audioScript"));
  check("CONTROL · answer key is present before sanitising", rawJson.includes('"answer"'));

  const props = buildComposerProps(listeningItem);
  const crossed = JSON.stringify(props);

  check("no transcript text crosses", !crossed.includes(SENTINEL), crossed.slice(0, 200));
  check("no audioScript field crosses", !crossed.includes("audioScript"));
  check("no answer key crosses", !crossed.includes('"answer"'));
  check("no speakers or voice names cross", !crossed.includes("speakers") && !crossed.includes("nova"));

  // The prop set is CLOSED — enumerated, not denied. A secret added to a payload
  // shape in future is excluded on the day it is added, not the day someone
  // remembers to strip it.
  const keys = Object.keys(props).sort();
  check(
    "exactly 5 props cross: attemptId, audioUrl, payload, prompt, taskType",
    JSON.stringify(keys) === JSON.stringify(["attemptId", "audioUrl", "payload", "prompt", "taskType"]),
    keys.join(","),
  );
  const payloadKeys = Object.keys(props.payload as object);
  check("the Listening payload carries ONLY questions",
    JSON.stringify(payloadKeys) === '["questions"]', payloadKeys.join(","));
  const q0 = (props.payload as { questions: object[] }).questions[0];
  check("each question carries ONLY id, stem, options",
    JSON.stringify(Object.keys(q0).sort()) === '["id","options","stem"]', Object.keys(q0).join(","));

  // audioUrl is a scalar on its own COLUMN, separate from the payload Json that
  // holds audioScript. It has no structural room to carry a neighbour.
  check("audioUrl crosses as a plain string", typeof props.audioUrl === "string" && props.audioUrl === STORED);
  check("audioUrl absent → null, not undefined or empty string",
    buildComposerProps({ ...listeningItem, audioUrl: null }).audioUrl === null);

  // Sanitising is unchanged for the other sub-tests.
  const reading = sanitizePayload("READING_CORRESPONDENCE" as never, {
    passages: [{ id: "p1", heading: "H", body: "B" }],
    questions: [{ id: "q1", stem: "S", options: [], answer: "a" }],
  });
  check("Reading still loses its answer key", !JSON.stringify(reading).includes('"answer"'));

  // ── verdict ───────────────────────────────────────────────────────────────
  console.log("\n" + (fail === 0 ? "PASS" : "FAIL") + " — " + pass + " passed, " + fail + " failed");
  if (SELF_TEST) {
    console.log(
      fail > 0
        ? "SELF-TEST OK — with the stored url taken away, the stored-path checks went RED as they must."
        : "SELF-TEST BROKEN — the stored url was taken away and NOTHING failed. This test proves nothing.",
    );
    process.exit(fail > 0 ? 0 : 1);
  }
  process.exit(fail === 0 ? 0 : 1);
}

void main();
