// Seeds original CELPIP Speaking items. CELPIP Speaking has eight tasks, each a
// short spoken response after a brief preparation time. Two tasks (Describe a
// Scene, Unusual Situation) show an image. Responses are transcribed (Whisper) and
// graded by AI (Phase 3) against the four CELPIP speaking criteria —
// Content/Coherence, Vocabulary, Listenability, and Task Fulfillment — never the
// accent or audio quality. All prompts are original to AlmiCELPIP. Image tasks
// ship with a description placeholder until artwork is added; imageUrl is optional.
//
// Run: npm run seed:speaking  (needs DATABASE_URL set)

import { PrismaClient, Prisma } from "@prisma/client";
import { isDirectRun } from "./_entry";

const prisma = new PrismaClient();

const SP = (
  taskType: Prisma.CelpipItemCreateManyInput["taskType"],
  title: string,
  difficulty: Prisma.CelpipItemCreateManyInput["difficulty"],
  prompt: string,
  taskPrompt: string,
  prepSeconds: number,
  speakSeconds: number,
  guidanceNote: string,
  image?: { imageUrl: string; imageAlt: string },
): Prisma.CelpipItemCreateManyInput => ({
  subTest: "SPEAKING",
  taskType,
  title,
  prompt,
  difficulty,
  topicTag: "everyday",
  payload: { taskPrompt, prepSeconds, speakSeconds, ...(image ?? {}) },
  guidanceNote,
});

export const ITEMS: Prisma.CelpipItemCreateManyInput[] = [
  SP(
    "SPEAKING_ADVICE",
    "Giving Advice — A friend's noisy apartment",
    "CORE",
    "Give advice in a short spoken response.",
    "A friend has just moved into an apartment and is bothered by noise from the unit above. They have asked you what they should do. Give them advice.",
    30,
    90,
    "Offer one or two clear suggestions and briefly say why they would help. Speak directly to your friend.",
  ),
  SP(
    "SPEAKING_PERSONAL_EXPERIENCE",
    "Personal Experience — A time you helped someone",
    "FOUNDATION",
    "Talk about a personal experience.",
    "Describe a time when you helped someone solve a problem. What was the situation, what did you do, and how did it turn out?",
    30,
    90,
    "Tell it as a short story: set the scene, say what you did, and finish with the result.",
  ),
  SP(
    "SPEAKING_DESCRIBE_SCENE",
    "Describe a Scene — A busy farmers' market",
    "CORE",
    "Describe what you see in the image.",
    "Look at the picture of a farmers' market. Describe what is happening — the people, what they are doing, and the setting.",
    30,
    60,
    "Describe the main people and actions first, then add details about the place. Use present-tense description.",
    { imageUrl: "", imageAlt: "A busy outdoor farmers' market with vendor stalls and shoppers." },
  ),
  SP(
    "SPEAKING_PREDICTIONS",
    "Making Predictions — After the scene",
    "CORE",
    "Predict what might happen next.",
    "Look again at the farmers' market scene. Predict what is likely to happen next for the people in the picture, and explain why you think so.",
    30,
    60,
    "Make specific predictions ('the vendor will probably…') and give a reason for each.",
    { imageUrl: "", imageAlt: "A busy outdoor farmers' market with vendor stalls and shoppers." },
  ),
  SP(
    "SPEAKING_COMPARE_PERSUADE",
    "Compare & Persuade — Two birthday gift ideas",
    "STRETCH",
    "Compare two options and persuade someone of your choice.",
    "You are helping plan a birthday gift for a coworker: Option A is concert tickets, Option B is a restaurant gift card. Compare them and persuade the others to choose the one you prefer.",
    60,
    120,
    "Compare both options fairly, then argue clearly for one. Persuasion needs reasons, not just a preference.",
  ),
  SP(
    "SPEAKING_DIFFICULT_SITUATION",
    "Difficult Situation — A double-booked appointment",
    "STRETCH",
    "Deal with a difficult situation by choosing and explaining an option.",
    "You booked a dentist appointment, but the clinic has accidentally also booked someone else in your slot. The receptionist offers either a two-hour wait today or a new appointment next week. Choose one option and explain your decision to the receptionist.",
    60,
    90,
    "State your choice politely, give your reason, and keep a calm, cooperative tone.",
  ),
  SP(
    "SPEAKING_OPINIONS",
    "Expressing Opinions — Free public transit",
    "CORE",
    "Express and support your opinion on a topic.",
    "Some people think public transit should be free for everyone. Do you agree or disagree? Give your opinion and support it with reasons.",
    30,
    90,
    "State your position once, clearly, then give two reasons. A brief example makes an opinion stronger.",
  ),
  SP(
    "SPEAKING_UNUSUAL_SITUATION",
    "Unusual Situation — Describe it to a friend",
    "STRETCH",
    "Describe an unusual situation in an image to someone who cannot see it.",
    "Look at the unusual picture. Imagine you are describing it over the phone to a friend who cannot see it. Describe what is happening so clearly that they can picture it.",
    30,
    60,
    "Because your listener can't see it, be precise about where things are and what is unusual about them.",
    { imageUrl: "", imageAlt: "An unusual everyday scene — a placeholder until artwork is added." },
  ),
  SP(
    "SPEAKING_ADVICE",
    "Giving Advice — A coworker who is often late",
    "FOUNDATION",
    "Give advice in a short spoken response.",
    "A coworker keeps arriving late to morning meetings, and it is starting to affect the team. They have asked you, as a friend, what they could do. Give them advice.",
    30,
    90,
    "Give one or two practical suggestions and a brief reason for each. Keep a supportive, friendly tone.",
  ),
  SP(
    "SPEAKING_PERSONAL_EXPERIENCE",
    "Personal Experience — A time you learned something new",
    "CORE",
    "Talk about a personal experience.",
    "Describe a time when you learned a new skill or hobby. What made you start, how did you learn it, and how do you feel about it now?",
    30,
    90,
    "Give it a clear beginning, middle, and end, and include how you felt at each stage.",
  ),
  SP(
    "SPEAKING_DESCRIBE_SCENE",
    "Describe a Scene — A family picnic in a park",
    "FOUNDATION",
    "Describe what you see in the image.",
    "Look at the picture of a family picnic in a park. Describe what is happening — the people, what they are doing, and the setting.",
    30,
    60,
    "Start with the main people and what they are doing, then add details about the surroundings. Use the present tense.",
    { imageUrl: "", imageAlt: "A family having a picnic in a park on a sunny day, with a blanket, food, and children playing nearby." },
  ),
  SP(
    "SPEAKING_PREDICTIONS",
    "Making Predictions — After the picnic scene",
    "CORE",
    "Predict what might happen next.",
    "Look again at the family picnic scene. Predict what is likely to happen next for the people in the picture, and explain why you think so.",
    30,
    60,
    "Make specific predictions and give a reason for each one. Connect your guess to something you can see in the scene.",
    { imageUrl: "", imageAlt: "A family having a picnic in a park on a sunny day, with a blanket, food, and children playing nearby." },
  ),
  SP(
    "SPEAKING_COMPARE_PERSUADE",
    "Compare & Persuade — Two vacation ideas",
    "CORE",
    "Compare two options and persuade someone of your choice.",
    "You and a friend are planning a short vacation together: Option A is a quiet beach town, Option B is a busy city with museums and shows. Compare them and persuade your friend to choose the one you prefer.",
    60,
    120,
    "Weigh both options honestly, then make a clear case for one with concrete reasons your friend would care about.",
  ),
  SP(
    "SPEAKING_DIFFICULT_SITUATION",
    "Difficult Situation — A package sent to the wrong address",
    "CORE",
    "Deal with a difficult situation by choosing and explaining an option.",
    "A package you ordered was delivered to a neighbour's address by mistake, and the neighbour is away for a week. The company offers either to send a replacement now at no charge, or to wait and refund you once the first package is returned. Choose one option and explain your decision to the company.",
    60,
    90,
    "State your choice clearly, give your reasons, and stay polite and practical throughout.",
  ),
  SP(
    "SPEAKING_OPINIONS",
    "Expressing Opinions — Part-time jobs for students",
    "STRETCH",
    "Express and support your opinion on a topic.",
    "Some people believe high-school students should have part-time jobs during the school year. Do you agree or disagree? Give your opinion and support it with reasons.",
    30,
    90,
    "State your position clearly, support it with two solid reasons, and acknowledge the other side briefly before closing.",
  ),
  SP(
    "SPEAKING_UNUSUAL_SITUATION",
    "Unusual Situation — Describe a surprising sight",
    "CORE",
    "Describe an unusual situation in an image to someone who cannot see it.",
    "Look at the unusual picture. Imagine you are on the phone with a friend who cannot see it. Describe the scene clearly enough that they can picture exactly what is going on and why it is surprising.",
    30,
    60,
    "Set the overall scene first, then point out the one or two things that make it unusual, using clear position words.",
    { imageUrl: "", imageAlt: "A surprising everyday scene — a placeholder until artwork is added." },
  ),
];

async function main() {
  const res = await prisma.celpipItem.createMany({ data: ITEMS });
  console.log(`Seeded ${res.count} Speaking item(s).`);
}

if (isDirectRun(import.meta.url)) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
