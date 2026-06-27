// Lightweight ops/health endpoint: confirms the practice item bank is seeded and
// reports active counts per sub-test (no PII, counts only). Used to verify a
// deploy's auto-seed step landed.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const [bySubTest, total, approvedReviews] = await Promise.all([
      prisma.celpipItem.groupBy({
        by: ["subTest"],
        where: { active: true },
        _count: true,
      }),
      prisma.celpipItem.count({ where: { active: true } }),
      prisma.review.count({ where: { approved: true } }),
    ]);
    const items: Record<string, number> = {};
    for (const r of bySubTest) items[r.subTest] = r._count;
    return NextResponse.json(
      { ok: true, itemsActive: total, items, approvedReviews },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
