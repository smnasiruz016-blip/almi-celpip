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
import { FULL_TEST_MINUTES, FULL_TEST_TAG } from "@/lib/factory/rr418/full-tests";

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

// RR-418 · a full test's parts are stored items too (topicTag "full-test"), but practice sets and the mock never pick one: they keep the
// bank they had. A full test is run whole, in order, by startFullTest().
export { FULL_TEST_TAG };
const notFullTest = { topicTag: { not: FULL_TEST_TAG } };

async function pickItemId(
  taskType: CelpipTaskType,
  difficulty: CelpipDifficulty,
  excludeIds: string[] = [],
): Promise<string | null> {
  const notIn = excludeIds.length ? { id: { notIn: excludeIds } } : {};
  let pool = await prisma.celpipItem.findMany({
    where: { taskType, active: true, difficulty, ...notIn, ...notFullTest },
    select: { id: true },
  });
  if (pool.length === 0) {
    pool = await prisma.celpipItem.findMany({ where: { taskType, active: true, ...notIn, ...notFullTest }, select: { id: true } });
  }
  if (pool.length === 0) {
    pool = await prisma.celpipItem.findMany({ where: { taskType, active: true, ...notFullTest }, select: { id: true } });
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
  itemId?: string; // RR-418: a full test's next part is fixed, never picked
}): Promise<boolean> {
  const itemId = params.itemId ?? (await pickItemId(params.taskType, params.difficulty, params.excludeIds ?? []));
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

  const full = fullTestPlanOf(session.plan);
  if (full) {
    const itemId = full.itemIds[nextStep];
    const item = itemId ? await prisma.celpipItem.findUnique({ where: { id: itemId }, select: { taskType: true } }) : null;
    const ok = item ? await createStepAttempt({ userId, sessionId: session.id, step: nextStep, taskType: item.taskType, difficulty: "CORE", itemId }) : false;
    await prisma.celpipSession.update({ where: { id: session.id }, data: { currentStep: nextStep, ...(ok ? {} : { status: "COMPLETED", completedAt: new Date() }) } });
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

// ───────────────────────── RR-418 · full Listening and Reading tests ─────────────────────────
// A full test is a PRACTICE_SET session (so it follows the Listening/Reading access rules, no AI cost) whose plan names its parts in
// order: { kind: "FULL_TEST", test, skill, itemIds, minutes }. It is timed to the official window: when the time is up, the part in
// progress and every part not reached are marked with the answers given so far (none for parts not reached), and the test ends.
export type FullTestPlan = { kind: "FULL_TEST"; test: string; skill: "L" | "R"; title: string; itemIds: string[]; minutes: number };

export function fullTestPlanOf(plan: unknown): FullTestPlan | null {
  const p = plan as Partial<FullTestPlan> | null;
  return p && p.kind === "FULL_TEST" && Array.isArray(p.itemIds) ? (p as FullTestPlan) : null;
}

type FullMeta = { test: string; skill: "L" | "R"; part: number; parts: number; title: string };
const metaOf = (payload: unknown): FullMeta | null => {
  const f = (payload as { fullTest?: FullMeta } | null)?.fullTest;
  return f && typeof f.test === "string" ? f : null;
};

/** the full tests a learner may take: every part stored, every part active (a Listening part whose clip failed its listen check is not) */
export async function listFullTests(): Promise<{ test: string; skill: "L" | "R"; title: string; itemIds: string[]; parts: { title: string }[] }[]> {
  const rows = await prisma.celpipItem.findMany({ where: { topicTag: FULL_TEST_TAG }, select: { id: true, title: true, payload: true, active: true } });
  const byTest = new Map<string, { meta: FullMeta; id: string; title: string; active: boolean }[]>();
  for (const r of rows) { const m = metaOf(r.payload); if (m) (byTest.get(m.test) ?? byTest.set(m.test, []).get(m.test)!).push({ meta: m, id: r.id, title: r.title, active: r.active }); }
  const out = [];
  for (const [test, parts] of byTest) {
    parts.sort((a, b) => a.meta.part - b.meta.part);
    const n = parts[0].meta.parts;
    const whole = parts.length === n && parts.every((p, i) => p.meta.part === i + 1 && p.active);
    if (whole) out.push({ test, skill: parts[0].meta.skill, title: parts[0].meta.title, itemIds: parts.map((p) => p.id), parts: parts.map((p) => ({ title: p.title })) });
  }
  return out.sort((a, b) => a.skill.localeCompare(b.skill) || a.test.localeCompare(b.test, undefined, { numeric: true }));
}

export async function startFullTest(userId: string, test: string): Promise<string | null> {
  const t = (await listFullTests()).find((x) => x.test === test);
  if (!t) return null;
  const first = await prisma.celpipItem.findUnique({ where: { id: t.itemIds[0] }, select: { taskType: true, subTest: true } });
  if (!first) return null;
  const plan: FullTestPlan = { kind: "FULL_TEST", test: t.test, skill: t.skill, title: t.title, itemIds: t.itemIds, minutes: FULL_TEST_MINUTES[t.skill] };
  const session = await prisma.celpipSession.create({
    data: { userId, mode: "PRACTICE_SET", subTest: first.subTest, targetCount: t.itemIds.length, currentDifficulty: "CORE", plan: plan as unknown as Prisma.InputJsonValue },
  });
  const ok = await createStepAttempt({ userId, sessionId: session.id, step: 0, taskType: first.taskType, difficulty: "CORE", itemId: t.itemIds[0] });
  if (!ok) { await prisma.celpipSession.delete({ where: { id: session.id } }); return null; }
  return session.id;
}

/** seconds left in a full test, from its start (null for any other session) */
export function fullTestSecondsLeft(session: { plan: unknown; startedAt: Date }, now = Date.now()): number | null {
  const f = fullTestPlanOf(session.plan);
  if (!f) return null;
  return Math.max(0, Math.round((session.startedAt.getTime() + f.minutes * 60_000 - now) / 1000));
}

/** time is up: mark the part in progress with the answers sent (or none) and every part not reached with none; end the test */
export async function finishFullTest(sessionId: string, userId: string, current?: { attemptId: string; answers: Record<string, string> }): Promise<void> {
  const { CELPIP_HANDLERS } = await import("@/lib/celpip/registry");
  const session = await prisma.celpipSession.findFirst({ where: { id: sessionId, userId }, include: { attempts: { include: { item: true } } } });
  const full = session ? fullTestPlanOf(session.plan) : null;
  if (!session || !full || session.status === "COMPLETED") return;
  for (let step = 0; step < full.itemIds.length; step++) {
    let a = session.attempts.find((x) => x.sessionStep === step);
    if (!a) {
      const item = await prisma.celpipItem.findUnique({ where: { id: full.itemIds[step] } });
      if (!item) continue;
      a = await prisma.celpipAttempt.create({ data: { userId, itemId: item.id, subTest: item.subTest, taskType: item.taskType, status: "IN_PROGRESS", sessionId, sessionStep: step }, include: { item: true } });
    }
    if (a.status === "SCORED") continue;
    const response = { answers: current && current.attemptId === a.id ? current.answers : {} };
    const run = await CELPIP_HANDLERS[a.taskType].run({ payload: a.item.payload, response, userId });
    await prisma.celpipAttempt.update({
      where: { id: a.id },
      data: { status: "SCORED", response: response as Prisma.InputJsonValue, pointsEarned: run.pointsEarned, pointsMax: run.pointsMax, clbEstimate: fractionToEstimate(run.fraction) as unknown as Prisma.InputJsonValue, submittedAt: new Date() },
    });
  }
  await prisma.celpipSession.update({ where: { id: sessionId }, data: { status: "COMPLETED", completedAt: new Date(), currentStep: full.itemIds.length - 1 } });
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
