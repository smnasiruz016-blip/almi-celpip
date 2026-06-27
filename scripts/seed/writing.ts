// Seeds original CELPIP Writing items. CELPIP Writing has two tasks: an Email
// (respond to a described situation, ~150–200 words) and a Survey Response (choose
// between two options and justify it, ~150–200 words). Responses are graded by AI
// (Phase 2) against the four CELPIP writing criteria — Content/Coherence,
// Vocabulary, Readability, and Task Fulfillment — never copied phrasing. All
// prompts are original to AlmiCELPIP and use everyday Canadian situations.
//
// Run: npm run seed:writing  (needs DATABASE_URL set)

import { PrismaClient, Prisma } from "@prisma/client";
import { isDirectRun } from "./_entry";

const prisma = new PrismaClient();

const EMAIL = (
  title: string,
  difficulty: Prisma.CelpipItemCreateManyInput["difficulty"],
  situation: string,
  instruction: string,
): Prisma.CelpipItemCreateManyInput => ({
  subTest: "WRITING",
  taskType: "WRITING_EMAIL",
  title,
  prompt: "Write an email responding to the situation below. Write 150–200 words.",
  difficulty,
  topicTag: "everyday",
  payload: { situation, instruction, wordMin: 150, wordMax: 200 },
  guidanceNote:
    "Address every point the task asks for, use a tone that fits the reader, and organise the email with a clear opening and closing.",
});

const SURVEY = (
  title: string,
  difficulty: Prisma.CelpipItemCreateManyInput["difficulty"],
  topic: string,
  optionA: string,
  optionB: string,
  instruction: string,
): Prisma.CelpipItemCreateManyInput => ({
  subTest: "WRITING",
  taskType: "WRITING_SURVEY",
  title,
  prompt: "Read the survey question, choose ONE option, and explain your choice. Write 150–200 words.",
  difficulty,
  topicTag: "everyday",
  payload: { topic, optionA, optionB, instruction, wordMin: 150, wordMax: 200 },
  guidanceNote:
    "Pick one option clearly and give specific reasons. You are not graded on which option you choose — only on how well you support it.",
});

export const ITEMS: Prisma.CelpipItemCreateManyInput[] = [
  EMAIL(
    "Email — A problem with an online order",
    "CORE",
    "You ordered a pair of winter boots online three weeks ago. The boots arrived, but they are the wrong size and one of them has a small tear. You have already tried calling the store twice with no answer.",
    "Write an email to the store's customer service. Explain what went wrong, say what you have already tried, and state clearly what you would like them to do.",
  ),
  EMAIL(
    "Email — Requesting time off from a manager",
    "CORE",
    "A close relative is getting married in another city, and you would like to take three days off work next month to attend. It is normally a busy period for your team.",
    "Write an email to your manager. Request the time off, acknowledge that it is a busy period, and suggest how your work could be covered while you are away.",
  ),
  SURVEY(
    "Survey — Money for a new public space",
    "CORE",
    "Your city has received funding to build one new public space in your neighbourhood. Which would you prefer?",
    "A: A community garden with seating and walking paths.",
    "B: An indoor recreation centre with a gym and meeting rooms.",
    "Choose Option A or Option B and explain why your choice would be better for the neighbourhood. Give specific reasons.",
  ),
  SURVEY(
    "Survey — How your workplace should communicate",
    "STRETCH",
    "Your company is deciding how teams should mainly communicate. Which approach do you prefer?",
    "A: Mostly written messages, so there is a clear record of decisions.",
    "B: Mostly short in-person or video meetings, so questions are resolved quickly.",
    "Choose Option A or Option B and explain why it would work better for your team. Give specific reasons.",
  ),
];

async function main() {
  const res = await prisma.celpipItem.createMany({ data: ITEMS });
  console.log(`Seeded ${res.count} Writing item(s).`);
}

if (isDirectRun(import.meta.url)) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
