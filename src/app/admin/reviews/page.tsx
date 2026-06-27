// Admin reviews moderation. Lists every review (pending first), approve /
// unapprove via the PATCH API. Editing is owner-only (resets to pending); there
// is no admin edit/delete. Re-gates on isAdmin (the layout gates too).

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/founder";
import { prisma } from "@/lib/prisma";
import { AdminReviews, type AdminReviewRow } from "./AdminReviews";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) redirect("/");

  const reviews = await prisma.review.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      rating: true,
      text: true,
      approved: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const rows: AdminReviewRow[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    approved: r.approved,
    createdAt: r.createdAt.toISOString(),
    userName: r.user?.name ?? null,
    userEmail: r.user?.email ?? "",
  }));

  return <AdminReviews rows={rows} />;
}
