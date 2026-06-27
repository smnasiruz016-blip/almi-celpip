// On-demand TTS for the Listening skill. Generates the audio server-side from
// the item's `audioScript` so the transcript (which carries the answers) never
// reaches the client. Ownership-scoped to the requesting user's attempt.
//
// Some Listening tasks are conversations/discussions with two or more speakers, so
// we alternate voices using payload.speakers; single-speaker items use one voice.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { synthesizeSpeech, synthesizeDialogue } from "@/lib/ai/openai";

export const runtime = "nodejs";

// Every Listening payload carries an audioScript and one or more speakers; with
// two or more speakers we render it as an alternating-voice dialogue.
const audioPayloadSchema = z.object({
  audioScript: z.string().min(1),
  speakers: z.array(z.object({ role: z.string(), voice: z.string() })).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { attemptId } = await ctx.params;

  const attempt = await prisma.celpipAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: { item: true },
  });
  if (!attempt || attempt.subTest !== "LISTENING") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const parsed = audioPayloadSchema.safeParse(attempt.item.payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad item" }, { status: 500 });
  }

  try {
    const speakers = parsed.data.speakers ?? [];
    const audio =
      speakers.length >= 2
        ? await synthesizeDialogue(parsed.data.audioScript, speakers, user.id)
        : await synthesizeSpeech(parsed.data.audioScript, user.id, speakers[0]?.voice);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[celpip.audio] tts failed:", err);
    return NextResponse.json({ ok: false, error: "Audio unavailable" }, { status: 500 });
  }
}
