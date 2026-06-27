"use client";

// The "Share your experience" card on /account. Opens a modal with the review
// form. Re-reads the user's review when the modal closes so the button label
// flips between write / edit.

import { useState } from "react";
import { ReviewModal } from "@/components/reviews/ReviewModal";
import { ReviewForm } from "@/components/reviews/ReviewForm";

export function ReviewCard({
  initial,
}: {
  initial: { rating: number; text: string; approved: boolean } | null;
}) {
  const [open, setOpen] = useState(false);
  const hasReview = initial !== null;

  return (
    <section className="rounded-2xl border border-almi-bg-peach bg-almi-paper p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-almi-ink">Share your experience</h2>
      <p className="mt-1 text-sm text-almi-text-muted">
        {hasReview
          ? initial.approved
            ? "Your review is approved and may appear on our homepage. Thank you!"
            : "Your review is awaiting approval."
          : "Tell other test-takers how AlmiCELPIP has helped your CELPIP prep."}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-full border border-almi-ink/15 bg-almi-paper px-4 py-2 text-sm font-semibold text-almi-ink hover:border-almi-coral"
      >
        {hasReview ? "Edit your review" : "Write a review"}
      </button>

      <ReviewModal
        open={open}
        onClose={() => setOpen(false)}
        title={hasReview ? "Edit your review" : "Write a review"}
      >
        <ReviewForm
          initial={initial ? { rating: initial.rating, text: initial.text } : null}
        />
      </ReviewModal>
    </section>
  );
}
