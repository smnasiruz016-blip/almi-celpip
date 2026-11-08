// RR-401 · model answers at every level, with their notes, shown after the learner has answered a Writing or Speaking item.
// No scoring for these models: they are shown to compare with, together with the notes that explain them.
import { Fragment } from "react";
import { MODEL_LEVEL_LABEL, MODEL_TRADEMARK, modelAnswersFor } from "@/lib/celpip/model-answers";

/** *italic* in a note is a cited phrase (often a learner mistake): shown in italics */
function NoteText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

export function ModelAnswers({ taskType, title }: { taskType: string; title: string }) {
  const item = modelAnswersFor(taskType, title);
  if (!item) return null;
  return (
    <section className="rounded-2xl border border-almi-bg-peach bg-almi-bg p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-almi-text-muted">Model answers</h2>
      <p className="mt-1 text-xs text-almi-text-muted">{MODEL_LEVEL_LABEL}</p>
      {item.modelContext && <p className="mt-2 text-sm text-almi-text">The model answer chooses: {item.modelContext}</p>}
      <div className="mt-4 space-y-4">
        {item.answers.map((a) => (
          <details key={a.level} className="rounded-xl border border-almi-bg-peach bg-almi-paper px-4 py-3" open={a.tier === "top"}>
            <summary className="cursor-pointer text-sm font-semibold text-almi-ink">
              {a.label} · {a.wordCount} words{a.withMistakes ? " · contains mistakes on purpose" : ""}
            </summary>
            <div className="mt-3 space-y-3 text-sm text-almi-text">
              {a.paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">{p}</p>
              ))}
            </div>
            <div className="mt-4 border-t border-almi-bg-peach pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-almi-text-muted">Notes</p>
              <ul className="mt-1 space-y-1 text-sm text-almi-text">
                {a.notes.map((n, i) => (
                  <li key={i}>
                    {n.criterion !== "Notes" && <span className="font-semibold">{n.criterion}: </span>}
                    <NoteText text={n.text} />
                  </li>
                ))}
              </ul>
              {a.aside && <p className="mt-2 text-xs italic text-almi-text-muted">({a.aside})</p>}
            </div>
          </details>
        ))}
      </div>
      <p className="mt-4 text-xs text-almi-text-muted">{MODEL_TRADEMARK}</p>
    </section>
  );
}
