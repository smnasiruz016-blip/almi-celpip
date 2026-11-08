/**
 * RR-401 · the grammar gate for AlmiCELPIP (pattern: AlmiPrep RR-393). Pure: it classifies LanguageTool matches that the importer
 * fetched; it never calls the network itself, so it is tested on fixtures.
 *
 * One language: Canadian English (en-CA). A match BLOCKS when it is a real spelling or grammar error. Style-only hints never block.
 * Words on the allowlist (test names, our names, the people in the pack's letters) never block. Inside a note, a quoted learner
 * mistake (*I want complain*) is the point of the note, so text inside quotation marks never blocks.
 */

export type LtMatch = {
  offset: number;
  length: number;
  message: string;
  replacements?: { value: string }[];
  rule: { id: string; issueType?: string; category: { id: string; name?: string } };
};

export const LANGUAGE = "en-CA" as const;

const BLOCKING_CATEGORIES = new Set(["TYPOS", "GRAMMAR", "CONFUSED_WORDS"]);
const BLOCKING_ISSUES = new Set(["misspelling", "grammar"]);

/** test names, our own names, and the names of people and places in the pack. Every word here is listed in the gate report. */
export const ALLOWLIST = new Set(
  ["CELPIP", "AlmiCELPIP", "AlmiWorld", "Paragon", "beta-g", "Priya", "Nair", "Aiko", "Okoro", "Marco", "Banff", "WJ-48219", "WJ"].map((w) => w.toLowerCase()),
);

/**
 * Matches that CC read and found to be NOT an error, each with its reason. Narrow on purpose: the rule id AND the exact flagged
 * text must both agree, so the same rule still blocks anywhere else. Every entry is listed in the gate report for beta-g.
 */
export const REVIEWED_FALSE_POSITIVES: { rule: string; text: string; why: string }[] = [
  { rule: "MORFOLOGIK_RULE_EN_CA", text: "bylaw", why: "standard Canadian spelling (a city bylaw, the bylaw office); missing from the en-CA dictionary" },
  { rule: "MORFOLOGIK_RULE_EN_CA", text: "Bylaw", why: "the same word at the start of a name (Bylaw Office)" },
  { rule: "A_TRIP_TO", text: "a trip in", why: "\"a trip in two weeks\": \"in two weeks\" is a time, not a destination" },
  { rule: "CONFUSION_RULE_MEN_MAN", text: "men", why: "\"a men's insulated winter jacket\": the possessive \"men's\" is the correct form" },
];
const reviewed = (m: LtMatch, word: string) => REVIEWED_FALSE_POSITIVES.some((r) => r.rule === m.rule.id && r.text === word);

export const isBlockingKind = (m: LtMatch) => BLOCKING_CATEGORIES.has(m.rule.category.id) || BLOCKING_ISSUES.has(m.rule.issueType ?? "");

/** ranges of text inside double quotes (straight or curly) */
export function quotedRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /"[^"\n]*"|“[^”\n]*”/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length]);
  return out;
}

export type GateFinding = { text: string; offset: number; snippet: string; rule: string; category: string; message: string; suggestion: string };

export function blockingFindings(text: string, matches: LtMatch[], opts: { quotesExempt?: boolean } = {}): GateFinding[] {
  const quotes = opts.quotesExempt ? quotedRanges(text) : [];
  const inQuote = (m: LtMatch) => quotes.some(([a, b]) => m.offset >= a && m.offset + m.length <= b);
  const out: GateFinding[] = [];
  for (const m of matches) {
    if (!isBlockingKind(m) || inQuote(m)) continue;
    const word = text.slice(m.offset, m.offset + m.length);
    if (ALLOWLIST.has(word.toLowerCase()) || reviewed(m, word)) continue;
    out.push({
      text: word,
      offset: m.offset,
      snippet: text.slice(Math.max(0, m.offset - 40), m.offset + m.length + 40).replace(/\s+/g, " "),
      rule: m.rule.id,
      category: m.rule.category.id,
      message: m.message,
      suggestion: (m.replacements ?? []).slice(0, 3).map((r) => r.value).join(" / "),
    });
  }
  return out;
}

export const hintCount = (matches: LtMatch[]) => matches.filter((m) => !isBlockingKind(m)).length;

/** what LanguageTool reads for a note (the stored note keeps its markdown): **bold** loses its marks; an *italic* is a cited phrase
 *  (often a learner mistake), so it is read inside quotation marks and is exempt. */
export const plainNote = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "“$1”").replace(/\*/g, "");
