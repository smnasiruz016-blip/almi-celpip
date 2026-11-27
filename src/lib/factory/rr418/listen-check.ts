// RR-418 · the listen check of a rendered clip, from its offline faster-whisper transcript. Two rules (the command's):
//   1. every speaker's lines are heard: each line of the script is found, in order, in the transcript (at least LINE_MIN of its content
//      words, inside a window that moves forward through the transcript);
//   2. the key facts of each question's "Why" quote are heard: at least FACT_MIN of the quote's content words are in the transcript of
//      the clip the question is about.
// A clip rendered from a different script fails rule 1 at once. Pure.
import type { DeData, ListenResult, Spk } from "./full-tests";
import { clipsOf, parseSpeakers, scriptLines, testId } from "./full-tests";

export const LINE_MIN = 0.6;
export const FACT_MIN = 0.75;

const STOP = new Set("a an the and or but if of to in on at for with by from as is are was were be been being am i you he she it we they me him her us them my your his its our their this that these those there here so than then too very just not no yes do does did have has had will would can could should may might must shall into out up down over about what which who whom whose when where why how all any some more most such own same also only well oh okay ok um uh".split(" "));
const UNITS: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const ORD: Record<string, string> = { first: "1", second: "2", third: "3", fourth: "4", fifth: "5", sixth: "6", seventh: "7", eighth: "8", ninth: "9", tenth: "10" };

/** a speech transcriber writes "$65", "31st", "KL7Q2M", "10 GB", "mold"; a script says "sixty-five dollars", "thirty-first",
 *  "K-L-7-Q-2-M", "ten gigabytes", "mould". Both sides are brought to one form, so only a real failure to hear counts. */
const SPELL: Record<string, string> = { chequing: "checking", cheque: "check", mould: "mold", centre: "center", centres: "centers", theatre: "theater", metre: "meter", metres: "meters", litre: "liter", litres: "liters", gb: "gigabytes", gigabyte: "gigabytes", km: "kilometres", kilometers: "kilometres", kilometer: "kilometres", kilometre: "kilometres", ok: "okay" };
const ORD_TENS: Record<string, number> = { twentieth: 20, thirtieth: 30 };

/** text → comparable tokens: lower case, number words → digits (incl. "seven hundred and eighty", "thirty-first", "a thousand"), "$12" →
 *  "12 dollars", "8:30" → "8 30", spelled-out codes joined ("k-l-7" → "kl7"), punctuation out */
export function tokens(s: string): string[] {
  const pre = s.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”"]/g, " ")
    .replace(/\b([a-z0-9])(?:-([a-z0-9])\b)+/g, (m) => m.replace(/-/g, ""))
    .replace(/(\d),(\d{3})/g, "$1$2").replace(/\$\s?(\d+(?:\.\d+)?)/g, " $1 dollars ").replace(/(\d)\.(\d)/g, "$1 $2");
  const raw = pre.replace(/[^a-z0-9' ]+/g, " ").replace(/'s\b/g, "").replace(/'/g, "").split(/\s+/).filter(Boolean).map((w) => SPELL[w] ?? w);
  const out: string[] = [];
  let num: number | null = null; // a number being read in words ("seven hundred and eighty")
  const flush = () => { if (num !== null) { out.push(String(num)); num = null; } };
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    if ((w in TENS || w in UNITS) && num !== null && num % 100 !== 0) flush(); // "eight thirteen" is two numbers, "seven hundred eighty" one
    if (w in TENS) { const nx = raw[i + 1]; const add = nx && nx in UNITS && UNITS[nx] < 10 ? UNITS[raw[++i]] : nx && nx in ORD && Number(ORD[nx]) < 10 ? Number(ORD[raw[++i]]) : 0; num = (num ?? 0) + TENS[w] + add; continue; }
    if (w in UNITS) { num = (num ?? 0) + UNITS[w]; continue; }
    if (w === "hundred") { num = (num ?? 1) * 100; continue; }
    if (w === "thousand") { num = (num ?? 1) * 1000; continue; }
    if (w === "and" && num !== null && num >= 100 && num % 100 === 0 && raw[i + 1] && (raw[i + 1] in UNITS || raw[i + 1] in TENS)) continue;
    if (w === "a" && (raw[i + 1] === "hundred" || raw[i + 1] === "thousand")) { flush(); continue; }
    flush();
    if (w in ORD) { out.push(ORD[w]); continue; }
    if (w in ORD_TENS) { out.push(String(ORD_TENS[w])); continue; }
    out.push(w.replace(/^(\d+)(st|nd|rd|th)$/, "$1"));
  }
  flush();
  return out;
}
export const content = (t: string[]) => t.filter((w) => !STOP.has(w) && (w.length >= 3 || /^\d+$/.test(w)));
/** loose word equality: plural/verb endings and Canadian/US spelling are not a failure to hear */
const stem = (w: string) => w.replace(/our$/, "or").replace(/(ies|es|s|ed|ing)$/, "");
const has = (set: Set<string>, w: string) => set.has(w) || set.has(stem(w));
/** the transcript's words, their stems, and every two neighbours joined ("dry wall" → "drywall") */
const bag = (T: string[]) => new Set([...T, ...T.map(stem), ...T.slice(1).map((w, i) => T[i] + w)]);

export function heardLines(lines: { speaker: string; text: string }[], transcript: string): { heard: boolean[]; misses: string[] } {
  const T = tokens(transcript), Ts = T.map(stem);
  let p = 0;
  const heard: boolean[] = [], misses: string[] = [];
  for (const l of lines) {
    const all = tokens(l.text), want = content(all);
    if (want.length === 0) { heard.push(true); continue; }
    // in order: each content word is looked for after the previous one found; the pointer then moves to just after the last word found,
    // so the next line is looked for where this one ended (a word repeated later in the clip can never pull the pointer past a line)
    const end = Math.min(T.length, p + Math.max(40, 4 * all.length));
    let q = p, got = 0;
    for (const w of want) {
      for (let i = q; i < end; i++) if (T[i] === w || Ts[i] === stem(w) || (i + 1 < T.length && T[i] + T[i + 1] === w)) { got++; q = i + 1; break; }
    }
    const ok = got / want.length >= LINE_MIN;
    heard.push(ok);
    if (ok) p = q;
    else misses.push(`${l.speaker}: "${l.text.slice(0, 50)}" (${got}/${want.length} words)`);
  }
  return { heard, misses };
}

/** the quoted words of a "Why" (what the speaker says); a Why with no quote checks its own words */
export function quoteOf(why: string): string {
  const q = [...why.matchAll(/[“"]([^”"]+)[”"]/g)].map((m) => m[1]);
  return (q.length ? q.join(" ") : why).replace(/…/g, " ");
}
export function factHeard(why: string, transcript: string): { ok: boolean; got: number; of: number } {
  const want = [...new Set(content(tokens(quoteOf(why))))];
  if (!want.length) return { ok: true, got: 0, of: 0 };
  const T = bag(tokens(transcript));
  const got = want.filter((w) => has(T, w)).length;
  return { ok: got / want.length >= FACT_MIN, got, of: want.length };
}

/** the listen check of every clip of the full Listening tests, from their transcripts → ListenResult per clip key */
export function listenResults(de: DeData, transcripts: Record<string, string>, model: string): Record<string, ListenResult> {
  const out: Record<string, ListenResult> = {};
  const clips = clipsOf(de);
  let n = 0;
  for (const t of de.tests) {
    if (t.skill !== "L") continue;
    const tid = testId("L", ++n);
    t.parts.forEach((p, i) => {
      const spk: Spk[] = parseSpeakers(p.speakers ?? "");
      for (const c of clips.filter((x) => x.test === tid && x.part === i + 1)) {
        const tr = transcripts[c.key];
        if (typeof tr !== "string") { out[c.key] = { ok: false, model, lines: [0, 0], facts: [0, 0], misses: ["no transcript"] }; continue; }
        const lines = scriptLines(c.text, spk);
        const L = heardLines(lines, tr);
        const qs = p.questions.filter((q) => c.section === null || Number(String(q.section).replace(/\D/g, "")) === c.section);
        const F = qs.map((q, k) => ({ k, ...factHeard(q.why, tr) }));
        const speakersHeard = spk.every((s) => lines.some((l, j) => l.speaker === s.name && L.heard[j]));
        const misses = [...L.misses, ...F.filter((f) => !f.ok).map((f) => `fact of ${c.key} question ${f.k + 1}: ${f.got}/${f.of} words`), ...(speakersHeard ? [] : ["a speaker is not heard at all"])];
        out[c.key] = { ok: L.heard.every(Boolean) && F.every((f) => f.ok) && speakersHeard, model, lines: [L.heard.filter(Boolean).length, lines.length], facts: [F.filter((f) => f.ok).length, F.length], misses };
      }
    });
  }
  return out;
}
