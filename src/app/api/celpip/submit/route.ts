// Unified submit endpoint for every CELPIP task. The route does NOT branch on task
// type — it looks the handler up in the registry, runs it, turns the result into
// an honest per-skill CLB estimate, and persists. AI tasks (Writing Email/Survey,
// Speaking) are gated on paid access; objective tasks (Listening, Reading) are
// free practice. Speaking arrives as multipart audio, which is transcribed
// (Whisper) before scoring.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { CELPIP_HANDLERS } from "@/lib/celpip/registry";
import { fractionToEstimate } from "@/lib/celpip/scale";
import { transcribeAudio } from "@/lib/ai/openai";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let attemptId = "";
  let responseValue: unknown = {};
  let timeSpent = 0;
  let audio: { file: Blob; durationSeconds: number } | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    attemptId = String(form.get("attemptId") ?? "");
    timeSpent = Number(form.get("timeSpentSeconds") ?? 0);
    const f = form.get("audio");
    const dur = Number(form.get("durationSeconds") ?? 0);
    if (f instanceof Blob) {
      audio = { file: f, durationSeconds: Number.isFinite(dur) ? dur : 0 };
    }
  } else {
    let body: { attemptId?: unknown; response?: unknown; timeSpentSeconds?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    attemptId = typeof body.attemptId === "string" ? body.attemptId : "";
    responseValue = body.response ?? {};
    timeSpent = typeof body.timeSpentSeconds === "number" ? body.timeSpentSeconds : 0;
  }

  if (!attemptId) {
    return NextResponse.json({ ok: false, error: "Missing attemptId" }, { status: 400 });
  }

  const attempt = await prisma.celpipAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: { item: true },
  });
  if (!attempt) {
    return NextResponse.json({ ok: false, error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status === "SCORED") {
    return NextResponse.json({ ok: true, alreadyScored: true });
  }

  const handler = CELPIP_HANDLERS[attempt.taskType];
  if (!handler) {
    return NextResponse.json(
      { ok: false, error: "This task is not available yet" },
      { status: 400 },
    );
  }

  // AI feedback is a paid feature; objective auto-marking is free practice.
  if (handler.mode === "AI" && !hasPaidAccess(user)) {
    return NextResponse.json(
      { ok: false, error: "AI feedback needs a subscription", upgradeUrl: "/pricing" },
      { status: 402 },
    );
  }

  // Speaking: transcribe the uploaded audio before scoring.
  if (audio) {
    try {
      const transcript = await transcribeAudio({
        file: audio.file,
        filename: "speech.webm",
        durationSeconds: audio.durationSeconds,
        userId: user.id,
      });
      responseValue = { transcript };
    } catch (err) {
      console.error("[celpip.submit] transcription failed:", err);
      return NextResponse.json(
        { ok: false, error: "Could not transcribe your recording. Try again." },
        { status: 500 },
      );
    }
  }

  let run;
  try {
    run = await handler.run({
      payload: attempt.item.payload,
      response: responseValue,
      userId: user.id,
    });
  } catch (err) {
    console.error("[celpip.submit] scoring failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not score this attempt. Try again in a moment." },
      { status: 500 },
    );
  }

  // CELPIP reports each skill independently on the CLB scale (1–12), no composite.
  const clbEstimate = fractionToEstimate(run.fraction);
  const timeSpentSeconds =
    Number.isFinite(timeSpent) && timeSpent >= 0 ? Math.round(timeSpent) : 0;

  await prisma.celpipAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SCORED",
      response: (responseValue ?? {}) as Prisma.InputJsonValue,
      pointsEarned: run.pointsEarned,
      pointsMax: run.pointsMax,
      clbEstimate: clbEstimate as unknown as Prisma.InputJsonValue,
      feedback: (run.feedback ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      aiModel: run.telemetry?.aiModel ?? null,
      costCents: run.telemetry?.costCents ?? null,
      latencyMs: run.telemetry?.latencyMs ?? null,
      submittedAt: new Date(),
      timeSpentSeconds,
    },
  });

  return NextResponse.json({ ok: true, clbEstimate });
}
