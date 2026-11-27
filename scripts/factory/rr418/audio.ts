// RR-418 Part D audio · three steps, each one command (all $0: the free Edge voices, offline faster-whisper):
//   npx tsx scripts/factory/rr418/audio.ts jobs        → scripts/factory/rr418/_work/jobs.json (every clip: its lines, voices, script sha)
//   python -I scripts/factory/rr418/render_audio.py scripts/factory/rr418/_work/jobs.json   → public/audio/rr418/*.mp3 (+ _work/rendered.json)
//   python -I scripts/factory/rr418/transcribe.py scripts/factory/rr418/_work/jobs.json     → scripts/factory/rr418/transcripts.json
//   npx tsx scripts/factory/rr418/audio.ts manifest    → src/content/factory/rr418/audio-manifest.json (listen check per clip)
// The script text is never changed by the audio: a clip is rendered from the frozen DE script, line by line, and its sha256 is kept, so a
// clip rendered from any other text is known as such (full-tests.ts clipOk). No database, no upload: the clips are static files of the app.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { checkInputs, readInput } from "../../../src/lib/factory/rr418/inputs";
import { clipsOf, parseSpeakers, scriptLines, sha, voicesFor, type DeData, type Manifest } from "../../../src/lib/factory/rr418/full-tests";
import { listenResults } from "../../../src/lib/factory/rr418/listen-check";

const WORK = join("scripts", "factory", "rr418", "_work");
export const MANIFEST_FILE = join("src", "content", "factory", "rr418", "audio-manifest.json");
export const TRANSCRIPTS_FILE = join("scripts", "factory", "rr418", "transcripts.json");

export function jobs(de: DeData) {
  const clips = clipsOf(de);
  let n = 0;
  const out: { key: string; file: string; scriptSha: string; lines: { speaker: string; voice: string; pitch: string | null; text: string }[] }[] = [];
  for (const t of de.tests) {
    if (t.skill !== "L") continue;
    const tid = `L${++n}`;
    t.parts.forEach((p, i) => {
      const spk = parseSpeakers(p.speakers ?? "");
      const v = voicesFor(spk);
      for (const c of clips.filter((x) => x.test === tid && x.part === i + 1)) {
        out.push({ key: c.key, file: c.file, scriptSha: sha(c.text), lines: scriptLines(c.text, spk).map((l) => ({ speaker: l.speaker, voice: v[l.speaker].voice, pitch: v[l.speaker].pitch ?? null, text: l.text })) });
      }
    });
  }
  return out;
}

if (process.argv[1] && /audio\.ts$/.test(process.argv[1])) {
  checkInputs();
  const de = readInput<DeData>("DE_full_tests.json");
  const step = process.argv[2];
  if (step === "jobs") {
    mkdirSync(WORK, { recursive: true });
    const j = jobs(de);
    writeFileSync(join(WORK, "jobs.json"), JSON.stringify(j, null, 1));
    console.log(`jobs: ${j.length} clips, ${j.reduce((a, x) => a + x.lines.length, 0)} lines, voices ${[...new Set(j.flatMap((x) => x.lines.map((l) => l.voice + (l.pitch ? `@${l.pitch}` : ""))))].join(", ")}`);
  } else if (step === "manifest") {
    const rendered = JSON.parse(readFileSync(join(WORK, "rendered.json"), "utf8")) as Record<string, { bytes: number; durationSec: number }>;
    const tr = JSON.parse(readFileSync(TRANSCRIPTS_FILE, "utf8")) as { model: string; clips: Record<string, string> };
    const listen = listenResults(de, tr.clips, tr.model);
    const j = jobs(de);
    const m: Manifest = { schema: 1, note: "RR-418 Part D audio: rendered with the free Edge voices from the frozen DE scripts; listen check with offline faster-whisper (scripts/factory/rr418/audio.ts).", clips: {} };
    for (const x of j) {
      const f = x.file;
      if (!existsSync(f)) continue;
      const buf = readFileSync(f);
      const voices = Object.fromEntries(x.lines.map((l) => [l.speaker, { voice: l.voice, ...(l.pitch ? { pitch: l.pitch } : {}) }]));
      m.clips[x.key] = { key: x.key, url: `/${f.replace(/^public[\\/]/, "").replace(/\\/g, "/")}`, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), durationSec: rendered[x.key]?.durationSec ?? 0, scriptSha: x.scriptSha, voices, listen: listen[x.key] ?? null };
    }
    writeFileSync(MANIFEST_FILE, `${JSON.stringify(m, null, 1)}\n`);
    const bad = Object.values(m.clips).filter((c) => !c.listen?.ok);
    console.log(`manifest: ${Object.keys(m.clips).length} clips; listen check passed ${Object.keys(m.clips).length - bad.length}, failed ${bad.length}`);
    for (const b of bad) console.log(`  FAIL ${b.key}: ${b.listen?.misses.slice(0, 4).join(" | ")}`);
  } else console.log("usage: audio.ts jobs | manifest");
}
