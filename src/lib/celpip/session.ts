// Session engine for practice sets and the full mock.
//
// PRACTICE_SET: a run of several items of ONE task type (difficulty varies for
// variety — not adaptive). MOCK: the full CELPIP in order, decided by VERSION —
// GENERAL = Listening→Reading→Writing→Speaking; LS = Listening→Speaking. Each
// skill scored independently on CLB — no composite.

import { Prisma } from "@prisma/client";
import type { CelpipDifficulty, CelpipSubTest, CelpipTaskType, CelpipVersion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CELPIP_TASKS, mockPlan } from "@/lib/celpip/registry";
import { fractionToEstimate, type ClbEstimate } from "@/lib/celpip/scale";

const DIFFICULTIES: CelpipDifficulty[] = ["FOUNDATION", "CORE", "STRETCH"];
const PRACTICE_SET_STEPS = 3;

function fractionOf(a: { pointsEarned: number; pointsMax: number }): number {
  return a.pointsMax ? a.pointsEarned / a.pointsMax : 0;
}

function adaptDifficulty(current: CelpipDifficulty, fraction: number): CelpipDifficulty {
  let i = DIFFICULTIES.indexOf(current);
  if (fraction >= 0.8) i = Math.min(DIFFICULTIES.length - 1, i + 1);
  else if (fraction < 0.5) i = Math.max(0, i - 1);
  return DIFFICULTIES[i];
}

async function pickItemId(
  taskType: CelpipTaskType,
  difficulty: CelpipDifficulty,
  excludeIds: string[] = [],
): Promise<string | null> {
  const notIn = excludeIds.length ? { id: { notIn: excludeIds } } : {};
  let pool = await prisma.celpipItem.findMany({
    where: { taskType, active: true, difficulty, ...notIn },
    select: { id: true },
  });
  if (pool.length === 0) {
    pool = await prisma.celpipItem.findMany({ where: { taskType, active: true, ...notIn }, select: { id: true } });
  }
  if (pool.length === 0) {
    pool = await prisma.celpipItem.findMany({ where: { taskType, active: true }, select: { id: true } });
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

async function pickPracticeStart(userId: string, taskType: CelpipTaskType): Promise<CelpipDifficulty> {
  const recent = await prisma.celpipAttempt.findMany({
    where: { userId, taskType, status: "SCORED" },
    orderBy: { submittedAt: "desc" },
    take: 5,
    select: { pointsEarned: true, pointsMax: true },
  });
  if (recent.length === 0) return "CORE";
  const fr = recent.reduce((s, a) => s + fractionOf(a), 0) / recent.length;
  if (fr >= 0.8) return "STRETCH";
  if (fr < 0.5) return "FOUNDATION";
  return "CORE";
}

async function createStepAttempt(params: {
  userId: string;
  sessionId: string;
  step: number;
  taskType: CelpipTaskType;
  difficulty: CelpipDifficulty;
  excludeIds?: string[];
}): Promise<boolean> {
  const itemId = await pickItemId(params.taskType, params.difficulty, params.excludeIds ?? []);
  if (!itemId) return false;
  await prisma.celpipAttempt.create({
    data: {
      userId: params.userId,
      itemId,
      subTest: CELPIP_TASKS[params.taskType].subTest,
      taskType: params.taskType,
      status: "IN_PROGRESS",
      sessionId: params.sessionId,
      sessionStep: params.step,
    },
  });
  return true;
}

export async function startSession(input: {
  userId: string;
  mode: "PRACTICE_SET" | "MOCK";
  taskType?: CelpipTaskType;
  version?: CelpipVersion | null;
}): Promise<string | null> {
  if (input.mode === "MOCK") {
    const version = input.version ?? "GENERAL";
    const plan = mockPlan(version);
    const session = await prisma.celpipSession.create({
      data: {
        userId: input.userId,
        mode: "MOCK",
        version,
        targetCount: plan.length,
        currentDifficulty: "CORE",
        plan: plan as unknown as Prisma.InputJsonValue,
      },
    });
    const ok = await createStepAttempt({
      userId: input.userId,
      sessionId: session.id,
      step: 0,
      taskType: plan[0],
      difficulty: "CORE",
    });
    if (!ok) {
      await prisma.celpipSession.delete({ where: { id: session.id } });
      return null;
    }
    return session.id;
  }

  const taskType = input.taskType;
  if (!taskType) return null;
  const def = CELPIP_TASKS[taskType];
  const targetCount = def.scoringMode === "DETERMINISTIC" ? PRACTICE_SET_STEPS : 1;
  const startDifficulty = await pickPracticeStart(input.userId, taskType);
  const session = await prisma.celpipSession.create({
    data: {
      userId: input.userId,
      mode: "PRACTICE_SET",
      subTest: def.subTest,
      targetCount,
      currentDifficulty: startDifficulty,
    },
  });
  const ok = await createStepAttempt({
    userId: input.userId,
    sessionId: session.id,
    step: 0,
    taskType,
    difficulty: startDifficulty,
  });
  if (!ok) {
    await prisma.celpipSession.delete({ where: { id: session.id } });
    return null;
  }
  return session.id;
}

export async function getSessionView(sessionId: string, userId: string) {
  return prisma.celpipSession.findFirst({
    where: { id: sessionId, userId },
    include: { attempts: { include: { item: true }, orderBy: { sessionStep: "asc" } } },
  });
}

export async function advanceSession(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.celpipSession.findFirst({
    where: { id: sessionId, userId },
    include: { attempts: true },
  });
  if (!session || session.status === "COMPLETED") return;

  const current = session.attempts.find((a) => a.sessionStep === session.currentStep);
  if (!current || current.status !== "SCORED") return;

  const nextStep = session.currentStep + 1;
  if (nextStep >= session.targetCount) {
    await prisma.celpipSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return;
  }

  let nextTask: CelpipTaskType;
  let nextDifficulty: CelpipDifficulty;
  if (session.mode === "MOCK") {
    const plan = (session.plan as CelpipTaskType[] | null) ?? mockPlan(session.version ?? "GENERAL");
    nextTask = plan[nextStep];
    nextDifficulty = "CORE";
  } else {
    nextTask = current.taskType;
    nextDifficulty = adaptDifficulty(session.currentDifficulty, fractionOf(current));
  }

  const ok = await createStepAttempt({
    userId,
    sessionId: session.id,
    step: nextStep,
    taskType: nextTask,
    difficulty: nextDifficulty,
    excludeIds: session.attempts.map((a) => a.itemId),
  });
  await prisma.celpipSession.update({
    where: { id: session.id },
    data: {
      currentStep: nextStep,
      currentDifficulty: nextDifficulty,
      ...(ok ? {} : { status: "COMPLETED", completedAt: new Date() }),
    },
  });
}

/** Aggregate independent per-skill CLB estimates from a session's scored
 *  attempts. Average the performance fractions within a skill, then map to one
 *  honest CLB estimate. No composite. */
export function aggregateSession(
  attempts: { subTest: CelpipSubTest; status: string; pointsEarned: number; pointsMax: number }[],
): Record<CelpipSubTest, ClbEstimate | null> {
  const fractionsBySkill: Partial<Record<CelpipSubTest, number[]>> = {};
  for (const a of attempts) {
    if (a.status !== "SCORED") continue;
    (fractionsBySkill[a.subTest] ??= []).push(fractionOf(a));
  }
  const out: Record<CelpipSubTest, ClbEstimate | null> = {
    LISTENING: null,
    READING: null,
    WRITING: null,
    SPEAKING: null,
  };
  for (const subTest of Object.keys(fractionsBySkill) as CelpipSubTest[]) {
    const fractions = fractionsBySkill[subTest]!;
    const avg = fractions.reduce((s, f) => s + f, 0) / fractions.length;
    out[subTest] = fractionToEstimate(avg);
  }
  return out;
}
