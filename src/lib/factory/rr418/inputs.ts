// RR-418 · the factory inputs, copied byte for byte into this repo (src/content/factory/rr418/), with the md5 the command names for
// each. Anything that reads them for a write or a test calls checkInputs() first: one differing byte stops the run.
// Node only (fs, crypto). The app itself imports the JSON files directly (see ./model-answers and ./plan), never this file.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DeData } from "./full-tests";
import { withAddendumDe, type Addendum } from "./addendum";

export const INPUT_DIR = join(process.cwd(), "src", "content", "factory", "rr418");

/** the md5 of each input, exactly as RR-418_command_v1.md lists them */
export const INPUT_MD5: Record<string, string> = Object.freeze({
  "AB_model_answers.json": "9e6a683e28e68fe1839e26089380408f",
  "C_live_LR_fixes.json": "39594b3cb3d29e643e2183bd3efc4cab",
  "DE_full_tests.json": "7a809eeca60da935d685836add674bfd",
  "F_live_fixes.json": "f25ce47296c47629593723c5fcdc85de",
  // not in the command's table: beta-g's addendum v1 (27 Nov 2026), transcribed by CC from C:\Projects\_handoffs\RR-418_addendum_v1.md.
  // Pinned the same way, so a changed override is caught like a changed input. The four inputs above keep their own md5.
  "addendum_v1.json": "90c36eff11f54e08d34804572a24af0b",
});

/** the full tests as the product uses them: DE_full_tests.json (md5-checked, never edited) with the addendum's Listening changes */
export function readDe(dir = INPUT_DIR): DeData {
  return withAddendumDe(readInput<DeData>("DE_full_tests.json", dir), readInput<Addendum>("addendum_v1.json", dir));
}

export const md5Of = (buf: Buffer | string) => createHash("md5").update(buf).digest("hex");

/** → [] when every input is exactly the approved one; else one line per differing file. Never throws on a missing file: it is listed. */
export function inputProblems(dir = INPUT_DIR, read: (p: string) => Buffer = (p) => readFileSync(p)): string[] {
  const out: string[] = [];
  for (const [f, want] of Object.entries(INPUT_MD5)) {
    let got = "";
    try { got = md5Of(read(join(dir, f))); } catch { out.push(`${f}: missing`); continue; }
    if (got !== want) out.push(`${f}: md5 ${got}, expected ${want}`);
  }
  return out;
}

/** stops the run (throws) on any md5 difference */
export function checkInputs(dir = INPUT_DIR, read?: (p: string) => Buffer): void {
  const p = inputProblems(dir, read);
  if (p.length) throw new Error(`RR-418 inputs differ from the approved files, nothing done:\n  ${p.join("\n  ")}`);
}

export function readInput<T>(name: keyof typeof INPUT_MD5 | string, dir = INPUT_DIR): T {
  return JSON.parse(readFileSync(join(dir, name), "utf8")) as T;
}
