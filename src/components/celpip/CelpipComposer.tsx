"use client";

// In-progress composer for every CELPIP task type, dispatched by sub-test:
//   Listening (6 parts) → ListeningComposer (play-once audio + MCQ)
//   Reading (4 parts)   → ReadingComposer (passages + MCQ/match + timer)
//   Writing Email/Survey → WritingComposer (situation/options + response; AI grade Phase 2)
//   Speaking (8 tasks)   → SpeakingComposer (prompt + optional image; record → AI grade Phase 3)
//
// The server passes a SANITIZED payload (answer keys + audio scripts stripped).
// Objective answers post as { answers: { [questionId]: value } }.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loadListeningAudio } from "@/lib/celpip/listening-audio";
import type { CelpipTaskType } from "@prisma/client";

const SUBMIT_BTN =
  "inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep disabled:opacity-60";
const FIELD =
  "w-full rounded-lg border border-almi-bg-peach bg-almi-bg px-3 py-2 text-sm text-almi-ink";

/** RR-418 · a full test's timer reached zero: the open Listening/Reading part submits what has been answered so far */
function useTimeUp(onTimeUp: () => void) {
  const ref = useRef(onTimeUp);
  ref.current = onTimeUp;
  useEffect(() => {
    const h = () => ref.current();
    window.addEventListener("celpip:time-up", h);
    return () => window.removeEventListener("celpip:time-up", h);
  }, []);
}

function useSubmit(attemptId: string) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useState(() => Date.now())[0];

  async function submit(response: unknown) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/celpip/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          response,
          timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }
  return { submit, submitting, error };
}

// ---- Shared question types (sanitized — no answer keys) ----
type Option = { id: string; text: string };
type Question = { id: string; stem?: string; label?: string; options?: Option[] };

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3">
      <p className="text-sm font-medium text-almi-ink">{q.stem ?? q.label ?? q.id}</p>
      {q.options && q.options.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {q.options.map((o) => (
            <label key={o.id} className="flex items-start gap-2 text-sm text-almi-text">
              <input
                type="radio"
                name={q.id}
                value={o.id}
                checked={value === o.id}
                onChange={() => onChange(o.id)}
                className="mt-1"
              />
              <span>{o.text}</span>
            </label>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`mt-2 ${FIELD}`}
          placeholder="Type your answer"
        />
      )}
    </div>
  );
}

// ---- Listening: play-once audio + questions ----
function ListeningAudio({ attemptId, audioUrl }: { attemptId: string; audioUrl: string | null }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "done" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function play() {
    setState("loading");
    try {
      // Stored clip → played straight from its URL. No route call, no synthesiser.
      // No stored clip → today's fallback, unchanged.
      const loaded = await loadListeningAudio({ attemptId, audioUrl });
      urlRef.current = loaded.objectUrl;
      const audio = new Audio(loaded.playbackUrl);
      audioRef.current = audio;
      audio.onended = () => setState("done");
      audio.onerror = () => setState("error");
      await audio.play();
      setState("playing");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-xl border border-almi-teal/30 bg-almi-teal/5 px-4 py-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-xl">🎧</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-almi-ink">Audio</p>
          <p className="text-xs text-almi-text-muted">
            Plays once, like the real test. Read the questions first.
          </p>
        </div>
        <button
          type="button"
          onClick={play}
          disabled={state === "loading" || state === "playing" || state === "done"}
          className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-almi-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {state === "idle" && "Play audio"}
          {state === "loading" && "Loading…"}
          {state === "playing" && "Playing…"}
          {state === "done" && "Played"}
          {state === "error" && "Retry"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-xs font-medium text-almi-coral-text">
          Audio could not be played. Press Retry — if it still will not play,
          refresh the page and start the set again.
        </p>
      )}
    </div>
  );
}

// RR-418 · Listening Part 1 of a full test: three sections, each its own clip that plays once; a section's questions appear only after
// its clip has played, and the next section can be played only after that (like the real test, where the questions come in between).
type Section = { id: string; label: string; audioUrl: string };
function SectionedListening({ attemptId, prompt, sections, questions }: { attemptId: string; prompt: string; sections: Section[]; questions: Question[] }) {
  const { submit, submitting, error } = useSubmit(attemptId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [at, setAt] = useState(0); // the section being played or answered
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  useTimeUp(() => { if (!submitting) void submit({ answers }); });
  const s = sections[at];
  const mine = questions.filter((q) => (q as { section?: string }).section === s.id);
  const last = at === sections.length - 1;
  return (
    <div className="space-y-5" data-sections={sections.length}>
      <p className="text-sm text-almi-text">{prompt}</p>
      <ol className="flex gap-2 text-xs font-semibold">
        {sections.map((x, i) => (
          <li key={x.id} className={`rounded-full px-3 py-1 ${i === at ? "bg-almi-teal text-white" : i < at ? "bg-almi-teal/15 text-almi-teal-text" : "bg-almi-bg-peach text-almi-text-muted"}`}>{x.label}</li>
        ))}
      </ol>
      <SectionAudio key={s.id} label={s.label} audioUrl={s.audioUrl} onEnded={() => setHeard((h) => ({ ...h, [s.id]: true }))} />
      {heard[s.id] ? (
        <div className="space-y-3">
          {mine.map((q) => (
            <QuestionField key={q.id} q={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3 text-sm text-almi-text-muted">
          The questions for {s.label.toLowerCase()} appear after you have heard it.
        </p>
      )}
      {error && <p className="text-sm font-medium text-almi-coral-text">{error}</p>}
      {heard[s.id] && !last && (
        <button type="button" onClick={() => setAt(at + 1)} className={SUBMIT_BTN}>
          Go to {sections[at + 1].label.toLowerCase()} →
        </button>
      )}
      {heard[s.id] && last && (
        <button type="button" onClick={() => submit({ answers })} disabled={submitting} className={SUBMIT_BTN}>
          {submitting ? "Checking…" : "Submit answers"}
        </button>
      )}
    </div>
  );
}

function SectionAudio({ label, audioUrl, onEnded }: { label: string; audioUrl: string; onEnded: () => void }) {
  const [state, setState] = useState<"idle" | "playing" | "done" | "error">("idle");
  async function play() {
    try {
      const audio = new Audio(audioUrl);
      audio.onended = () => { setState("done"); onEnded(); };
      audio.onerror = () => setState("error");
      await audio.play();
      setState("playing");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="rounded-xl border border-almi-teal/30 bg-almi-teal/5 px-4 py-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-xl">🎧</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-almi-ink">{label}</p>
          <p className="text-xs text-almi-text-muted">Plays once, like the real test.</p>
        </div>
        <button type="button" onClick={play} disabled={state === "playing" || state === "done"} className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-almi-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {state === "idle" && "Play"}
          {state === "playing" && "Playing…"}
          {state === "done" && "Played"}
          {state === "error" && "Retry"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs font-medium text-almi-coral-text">Audio could not be played. Press Retry.</p>}
    </div>
  );
}

function ListeningComposer({
  attemptId,
  prompt,
  payload,
  audioUrl,
}: {
  attemptId: string;
  prompt: string;
  payload: unknown;
  audioUrl: string | null;
}) {
  const p = (payload ?? {}) as { questions?: Question[]; sections?: Section[]; note?: string };
  if (p.sections && p.sections.length > 0) return <SectionedListening attemptId={attemptId} prompt={prompt} sections={p.sections} questions={p.questions ?? []} />;
  return <PlainListening attemptId={attemptId} prompt={prompt} payload={payload} audioUrl={audioUrl} />;
}

function PlainListening({ attemptId, prompt, payload, audioUrl }: { attemptId: string; prompt: string; payload: unknown; audioUrl: string | null }) {
  const { submit, submitting, error } = useSubmit(attemptId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useTimeUp(() => { if (!submitting) void submit({ answers }); });
  const p = (payload ?? {}) as { questions?: Question[]; note?: string };
  const questions: Question[] = p.questions ?? [];

  return (
    <div className="space-y-5">
      <p className="text-sm text-almi-text">{prompt}</p>
      {p.note && <p className="rounded-xl border border-almi-accent/40 bg-almi-accent/10 px-4 py-3 text-sm text-almi-ink">{p.note}</p>}
      <ListeningAudio attemptId={attemptId} audioUrl={audioUrl} />
      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionField
            key={q.id}
            q={q}
            value={answers[q.id] ?? ""}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))}
      </div>
      {error && <p className="text-sm font-medium text-almi-coral-text">{error}</p>}
      <button type="button" onClick={() => submit({ answers })} disabled={submitting} className={SUBMIT_BTN}>
        {submitting ? "Checking…" : "Submit answers"}
      </button>
    </div>
  );
}

// ---- Reading: passages + questions + elapsed timer ----
function ElapsedTimer() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <span className="rounded-full bg-almi-bg-peach px-3 py-1 text-xs font-semibold text-almi-text-muted">
      ⏱ {mm}:{ss}
    </span>
  );
}

type ReadingText = { id: string; heading?: string; body: string; kind?: string };
type RQuestion = Question & { kind?: string; blank?: number; passage?: string };

/** a passage's body, with "| a | b |" lines shown as a table (the diagram) and every [n] mark of a blank shown as its drop-down */
function PassageBody({ body, blanks, answers, onChange }: { body: string; blanks: RQuestion[]; answers: Record<string, string>; onChange: (id: string, v: string) => void }) {
  const lines = body.split("\n");
  const out: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|/.test(lines[i])) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())); i++; }
      i--;
      out.push(
        <div key={`t${i}`} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead><tr>{rows[0].map((c, k) => <th key={k} className="border border-almi-bg-peach bg-almi-bg px-2 py-1 font-semibold text-almi-ink">{c}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border border-almi-bg-peach px-2 py-1 align-top">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const parts = lines[i].split(/(\[\d+\])/g);
    out.push(
      <span key={`l${i}`}>
        {parts.map((part, k) => {
          const m = /^\[(\d+)\]$/.exec(part);
          const q = m ? blanks.find((b) => b.blank === Number(m[1])) : undefined;
          if (!q) return <span key={k}>{part}</span>;
          return (
            <select
              key={k}
              aria-label={`Blank ${q.blank}`}
              data-blank={q.blank}
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className="mx-1 inline-block max-w-[16rem] rounded-md border border-almi-accent bg-almi-bg px-1.5 py-0.5 text-sm text-almi-ink"
            >
              <option value="">{`(${q.blank}) choose…`}</option>
              {(q.options ?? []).map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
            </select>
          );
        })}
        {i < lines.length - 1 ? "\n" : ""}
      </span>,
    );
  }
  return <div className="mt-1 whitespace-pre-wrap text-sm leading-7 text-almi-text">{out}</div>;
}

function ReadingComposer({
  attemptId,
  prompt,
  payload,
}: {
  attemptId: string;
  prompt: string;
  payload: unknown;
}) {
  const { submit, submitting, error } = useSubmit(attemptId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const p = (payload ?? {}) as {
    passages?: ReadingText[];
    questions?: RQuestion[];
  };
  const passages = p.passages ?? [];
  const questions: RQuestion[] = p.questions ?? [];
  const blanks = questions.filter((q) => q.kind === "blank");
  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  useTimeUp(() => { if (!submitting) void submit({ answers }); });
  // RR-418: a text with blanks (the reply, email or comment) comes AFTER the questions on the first text, as in the real test
  const withBlanks = passages.filter((t) => blanks.some((b) => b.passage === t.id));
  const first = passages.filter((t) => !withBlanks.includes(t));
  const card = (t: ReadingText) => (
    <div key={t.id} className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3" data-passage={t.kind ?? t.id}>
      {t.heading && <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">{t.heading}</p>}
      <PassageBody body={t.body} blanks={blanks.filter((b) => b.passage === t.id)} answers={answers} onChange={set} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-almi-text">{prompt}</p>
        <ElapsedTimer />
      </div>

      <div className="space-y-3">{first.map(card)}</div>

      <div className="space-y-3">
        {questions.filter((q) => q.kind !== "blank").map((q) => (
          <QuestionField
            key={q.id}
            q={q}
            value={answers[q.id] ?? ""}
            onChange={(v) => set(q.id, v)}
          />
        ))}
      </div>

      {withBlanks.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">Choose the best option for each blank</p>
          {withBlanks.map(card)}
        </div>
      )}
      {error && <p className="text-sm font-medium text-almi-coral-text">{error}</p>}
      <button type="button" onClick={() => submit({ answers })} disabled={submitting} className={SUBMIT_BTN}>
        {submitting ? "Checking…" : "Submit answers"}
      </button>
    </div>
  );
}

// ---- Writing: Email (respond to a situation) and Survey (choose + justify) ----
function WritingComposer({ attemptId, prompt, payload }: { attemptId: string; prompt: string; payload: unknown }) {
  const { submit, submitting, error } = useSubmit(attemptId);
  const [text, setText] = useState("");
  const p = payload as {
    // Email
    situation?: string;
    instruction?: string;
    // Survey
    topic?: string;
    optionA?: string;
    optionB?: string;
    wordMin?: number;
    wordMax?: number;
  };
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isSurvey = !!p.topic;

  return (
    <div className="space-y-5">
      <p className="text-sm text-almi-text">{prompt}</p>
      <div className="rounded-xl border border-almi-bg-peach bg-almi-paper p-4">
        {isSurvey ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">Survey topic</p>
            <p className="mt-1 text-sm text-almi-text">{p.topic}</p>
            <ul className="mt-3 space-y-1 text-sm text-almi-text">
              {p.optionA && <li><span className="font-semibold">Option A:</span> {p.optionA}</li>}
              {p.optionB && <li><span className="font-semibold">Option B:</span> {p.optionB}</li>}
            </ul>
          </>
        ) : (
          p.situation && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">The situation</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-almi-text">{p.situation}</p>
            </>
          )
        )}
        {p.instruction && <p className="mt-3 whitespace-pre-line text-sm text-almi-text">{p.instruction}</p>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="w-full rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-3 text-sm"
        placeholder={isSurvey ? "Choose an option and justify it…" : "Write your email here…"}
      />
      <p className="text-xs text-almi-text-muted">
        {words} words{p.wordMin ? ` · CELPIP expects ${p.wordMin}–${p.wordMax ?? p.wordMin}` : ""}. You&apos;ll get
        honest feedback against the four CELPIP writing criteria.
      </p>
      {error && <p className="text-sm font-medium text-almi-coral-text">{error}</p>}
      <button type="button" onClick={() => submit({ text })} disabled={submitting} className={SUBMIT_BTN}>
        {submitting ? "Submitting…" : isSurvey ? "Submit response" : "Submit email"}
      </button>
    </div>
  );
}

// ---- RR-418 · a countdown that calls onDone once at zero ----
function useCountdown(seconds: number, running: boolean, onDone: () => void) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (running && left === 0 && !done.current) { done.current = true; onDone(); }
  }, [left, running, onDone]);
  return left;
}
/** the stored Part 1 / Part 2 texts start mid-sentence ("choose Option A, …"): shown with a capital first letter */
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ---- RR-418 · Speaking Task 5, screen 1 of 2: choose Option A or B. No recording here. ----
function ChooseScreen({ text, seconds, onChosen }: { text: string; seconds: number; onChosen: (c: "A" | "B" | null) => void }) {
  const left = useCountdown(seconds, true, () => onChosen(null));
  return (
    <div className="space-y-4" data-screen="choose">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">Part 1 of 2 · Choose</p>
        <span className="rounded-full bg-almi-bg-peach px-3 py-1 text-xs font-semibold text-almi-text-muted">⏱ {mmss(left)}</span>
      </div>
      <div className="rounded-xl border border-almi-bg-peach bg-almi-paper p-4">
        <p className="text-sm text-almi-text">{capFirst(text)}</p>
        <p className="mt-3 text-xs text-almi-text-muted">You do not speak on this screen. Choose one option; the next screen gives you 60 seconds to prepare and 60 seconds to speak.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => onChosen("A")} className={SUBMIT_BTN}>Option A</button>
        <button type="button" onClick={() => onChosen("B")} className={SUBMIT_BTN}>Option B</button>
      </div>
    </div>
  );
}

function PrepClock({ seconds }: { seconds: number }) {
  const [over, setOver] = useState(false);
  const left = useCountdown(seconds, !over, () => setOver(true));
  return (
    <p className="text-xs font-semibold text-almi-text-muted" data-prep={seconds}>
      {over ? "Preparation time is over — start speaking." : `Prepare: ${mmss(left)}`}
    </p>
  );
}

// ---- Speaking: read the prompt (+ optional image) → record → Whisper → AI grade ----
function SpeakingComposer({ attemptId, prompt, payload }: { attemptId: string; prompt: string; payload: unknown }) {
  const p = payload as {
    taskPrompt?: string;
    prepSeconds?: number;
    speakSeconds?: number;
    imageUrl?: string;
    imageAlt?: string;
    chooseSeconds?: number;
    part1?: string;
    part2?: string;
    thirdOption?: string;
  };
  const twoScreens = Boolean(p.part1 && p.part2 && p.chooseSeconds);
  const [choice, setChoice] = useState<"A" | "B" | null | undefined>(undefined);
  if (twoScreens && choice === undefined) return <ChooseScreen text={p.part1!} seconds={p.chooseSeconds!} onChosen={(c) => setChoice(c)} />;
  return <SpeakingRecorder attemptId={attemptId} prompt={prompt} payload={p} screen2={twoScreens ? { text: p.part2!, choice: choice ?? null } : null} />;
}

function SpeakingRecorder({ attemptId, prompt, payload, screen2 }: { attemptId: string; prompt: string; payload: unknown; screen2: { text: string; choice: "A" | "B" | null } | null }) {
  const router = useRouter();
  const p = payload as {
    taskPrompt?: string;
    prepSeconds?: number;
    speakSeconds?: number;
    imageUrl?: string;
    imageAlt?: string;
  };
  const cap = p.speakSeconds ?? 90;
  const startedAt = useState(() => Date.now())[0];

  const [phase, setPhase] = useState<"idle" | "recording" | "recorded" | "submitting">("idle");
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [showType, setShowType] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const durationRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        stopTick();
        setPhase("recorded");
      };
      rec.start();
      setSecs(0);
      setPhase("recording");
      tickRef.current = setInterval(() => {
        setSecs((s) => {
          const next = s + 1;
          durationRef.current = next;
          if (next >= cap) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      setError("Microphone not available. You can type your response instead.");
      setShowType(true);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  async function submitAudio() {
    if (!blobRef.current) return;
    setPhase("submitting");
    setError(null);
    try {
      const form = new FormData();
      form.append("attemptId", attemptId);
      form.append("timeSpentSeconds", String(Math.round((Date.now() - startedAt) / 1000)));
      form.append("durationSeconds", String(durationRef.current));
      form.append("audio", blobRef.current, "speech.webm");
      const res = await fetch("/api/celpip/submit", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not submit. Try again.");
        setPhase("recorded");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPhase("recorded");
    }
  }

  async function submitTyped() {
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/celpip/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          response: { transcript: typed },
          timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not submit. Try again.");
        setPhase("idle");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPhase("idle");
    }
  }

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="space-y-5">
      <p className="text-sm text-almi-text">{prompt}</p>
      <div className="rounded-xl border border-almi-bg-peach bg-almi-paper p-4" data-screen={screen2 ? "speak" : undefined}>
        {screen2 ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-almi-accent-deep">Part 2 of 2 · Persuade</p>
            <p className="mt-1 text-sm font-semibold text-almi-ink">{screen2.choice ? `You chose Option ${screen2.choice}.` : "You did not choose in time: pick the option you prefer now."}</p>
            <p className="mt-2 text-sm text-almi-text">{capFirst(screen2.text)}</p>
            <div className="mt-2"><PrepClock seconds={p.prepSeconds ?? 60} /></div>
          </>
        ) : (
          p.taskPrompt && <p className="text-sm text-almi-text">{p.taskPrompt}</p>
        )}
        {p.imageUrl ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-almi-bg-peach">
            <Image
              src={p.imageUrl}
              alt={p.imageAlt ?? "Speaking task image"}
              width={640}
              height={420}
              className="h-auto w-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          p.imageAlt && (
            // No artwork yet: present the scene as a text description so the task
            // is fully usable. The grader is given the same description as context.
            <div className="mt-3 rounded-lg border border-dashed border-almi-bg-peach bg-almi-bg/40 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">The scene</p>
              <p className="mt-1 text-sm italic text-almi-text">{p.imageAlt}</p>
            </div>
          )
        )}
        <p className="mt-3 text-xs text-almi-text-muted">
          {p.prepSeconds ? `About ${p.prepSeconds}s to prepare, ` : ""}up to {Math.round(cap / 60) || 1} min to
          speak — like the real test.
        </p>
      </div>

      <p className="text-xs text-almi-text-muted">
        Speak your answer aloud. We transcribe what you say and grade the words only — never your
        accent or audio.
      </p>

      {!showType && (
        <div className="rounded-xl border border-almi-teal/30 bg-almi-teal/5 px-4 py-4">
          {phase === "idle" && (
            <button type="button" onClick={startRecording} className={SUBMIT_BTN}>
              ● Start recording
            </button>
          )}
          {phase === "recording" && (
            <div className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-almi-coral" aria-hidden />
              <span className="text-sm font-semibold text-almi-ink">Recording {mm}:{ss}</span>
              <button
                type="button"
                onClick={stopRecording}
                className="ml-auto inline-flex min-h-[40px] items-center rounded-full border border-almi-ink/15 bg-almi-paper px-4 py-2 text-sm font-semibold text-almi-ink hover:border-almi-coral"
              >
                ■ Stop
              </button>
            </div>
          )}
          {(phase === "recorded" || phase === "submitting") && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-almi-text">Recorded {mm}:{ss}.</span>
              <button type="button" onClick={() => setPhase("idle")} className="text-sm font-semibold text-almi-text-muted underline">
                Re-record
              </button>
              <button type="button" onClick={submitAudio} disabled={phase === "submitting"} className={`ml-auto ${SUBMIT_BTN}`}>
                {phase === "submitting" ? "Transcribing & grading…" : "Submit response →"}
              </button>
            </div>
          )}
        </div>
      )}

      {showType && (
        <div className="space-y-3">
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-3 text-sm"
            placeholder="Type a transcript of your spoken response…"
          />
          <button type="button" onClick={submitTyped} disabled={phase === "submitting"} className={SUBMIT_BTN}>
            {phase === "submitting" ? "Grading…" : "Submit transcript"}
          </button>
        </div>
      )}

      {!showType && phase === "idle" && (
        <button type="button" onClick={() => setShowType(true)} className="text-xs font-semibold text-almi-text-muted underline">
          No microphone? Type your response instead
        </button>
      )}

      {error && <p className="text-sm font-medium text-almi-coral-text">{error}</p>}
    </div>
  );
}

export function CelpipComposer({
  attemptId,
  taskType,
  prompt,
  payload,
  audioUrl,
}: {
  attemptId: string;
  taskType: CelpipTaskType;
  prompt: string;
  payload: unknown;
  /** Pre-rendered Listening clip, or null when none is stored yet. */
  audioUrl: string | null;
}) {
  if (taskType.startsWith("WRITING")) {
    return <WritingComposer attemptId={attemptId} prompt={prompt} payload={payload} />;
  }
  if (taskType.startsWith("SPEAKING")) {
    return <SpeakingComposer attemptId={attemptId} prompt={prompt} payload={payload} />;
  }
  if (taskType.startsWith("LISTENING")) {
    return <ListeningComposer attemptId={attemptId} prompt={prompt} payload={payload} audioUrl={audioUrl} />;
  }
  return <ReadingComposer attemptId={attemptId} prompt={prompt} payload={payload} />;
}

export type ComposerArgs = { attemptId: string; prompt: string; payload: unknown };
