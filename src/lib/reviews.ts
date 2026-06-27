"use server";

// User testimonials. One review per user: editing updates the existing row and
// re-enters moderation (approved reset to false). The founder approves in
// /admin/reviews before a review can appear on the public homepage grid.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TEXT_MIN, TEXT_MAX, RATING_MIN, RATING_MAX } from "@/lib/reviews-shared";

type Result<T> = { ok: true } & T | { ok: false; error: string };

export async function getMyReview(): Promise<{
  rating: number;
  text: string;
  approved: boolean;
} | null> {
  const user = await requireUser();
  const r = await prisma.review.findFirst({
    where: { userId: user.id },
    select: { rating: true, text: true, approved: true },
  });
  return r;
}

export async function submitOrUpdateReview(input: {
  rating: number;
  text: string;
}): Promise<Result<{ reviewId: string }>> {
  const user = await requireUser();

  const rating = Math.floor(input.rating);
  if (!Number.isFinite(rating) || rating < RATING_MIN || rating > RATING_MAX) {
    return { ok: false, error: "Rating must be between 1 and 5 stars" };
  }
  const text = (input.text ?? "").trim();
  if (text.length < TEXT_MIN) {
    return { ok: false, error: `Please share at least ${TEXT_MIN} characters of feedback` };
  }
  if (text.length > TEXT_MAX) {
    return { ok: false, error: `Review must be ${TEXT_MAX} characters or fewer` };
  }

  // One review per user: update the existing row, else create. Editing a review
  // re-enters moderation, so `approved` is reset to false on update.
  const existing = await prisma.review.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  let reviewId: string;
  if (existing) {
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: { rating, text, approved: false },
      select: { id: true },
    });
    reviewId = updated.id;
  } else {
    const created = await prisma.review.create({
      data: { userId: user.id, rating, text, approved: false },
      select: { id: true },
    });
    reviewId = created.id;
  }

  revalidatePath("/account");
  return { ok: true, reviewId };
}
