// Public homepage testimonials grid. Shows only APPROVED reviews; renders
// nothing until at least MIN_APPROVED exist, so the section never looks empty.

import { prisma } from "@/lib/prisma";

const MIN_APPROVED = 3;

function StarRow({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  return (
    <span aria-label={`${r} out of 5 stars`}>
      <span className="text-almi-coral">{"★".repeat(r)}</span>
      <span className="text-almi-bg-peach">{"★".repeat(5 - r)}</span>
    </span>
  );
}

export async function TestimonialsSection() {
  let reviews: { id: string; rating: number; text: string; user: { name: string | null } }[] = [];
  try {
    reviews = await prisma.review.findMany({
      where: { approved: true },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        rating: true,
        text: true,
        user: { select: { name: true } },
      },
    });
  } catch {
    // No DB at build time (or transient error) — render nothing rather than fail.
    return null;
  }

  if (reviews.length < MIN_APPROVED) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="text-center text-2xl font-semibold text-almi-ink">
        What test-takers say
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => {
          const name = r.user?.name?.trim() || "Anonymous";
          const initial = name.charAt(0).toUpperCase();
          return (
            <figure
              key={r.id}
              className="flex flex-col rounded-2xl border border-almi-bg-peach bg-almi-paper p-5 shadow-sm"
            >
              <StarRow rating={r.rating} />
              <blockquote className="mt-3 flex-1 text-sm text-almi-text">{r.text}</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-almi-coral/15 text-sm font-bold text-almi-coral-deep">
                  {initial}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-almi-ink">{name}</span>
                  <span className="block text-xs text-almi-text-muted">AlmiCELPIP user</span>
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
