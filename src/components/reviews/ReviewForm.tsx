"use client";

import { useState, useTransition } from "react";
import { submitOrUpdateReview } from "@/lib/reviews";
import { TEXT_MAX, TEXT_MIN } from "@/lib/reviews-shared";

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition ${n <= shown ? "text-almi-coral" : "text-almi-bg-peach"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  initial,
  onDone,
}: {
  initial: { rating: number; text: string } | null;
  onDone?: () => void;
}) {
  const hasExisting = initial !== null;
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [text, setText] = useState(initial?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitOrUpdateReview({ rating, text });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      onDone?.();
    });
  }

  if (done) {
    return (
      <p className="text-sm text-almi-text">
        Thank you — your review has been submitted for approval. It will appear once the team
        approves it.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <StarPicker value={rating} onChange={setRating} />
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={TEXT_MAX}
          placeholder="How has AlmiCELPIP helped your CELPIP preparation?"
          className="w-full rounded-xl border border-almi-bg-peach bg-almi-bg px-4 py-3 text-sm text-almi-ink"
        />
        <p className="mt-1 text-xs text-almi-text-muted">
          {text.trim().length}/{TEXT_MAX} · at least {TEXT_MIN} characters
        </p>
      </div>
      {hasExisting && (
        <p className="text-xs text-almi-text-muted">
          Editing your review sends it back for approval before it shows publicly again.
        </p>
      )}
      {error && <p className="text-sm font-medium text-almi-coral-deep">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || rating < 1 || text.trim().length < TEXT_MIN}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-almi-coral px-6 py-3 text-sm font-semibold text-almi-ink hover:bg-almi-coral-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : hasExisting ? "Update review" : "Submit review"}
      </button>
    </div>
  );
}
