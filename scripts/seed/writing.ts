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
  EMAIL(
    "Email — Thanking a neighbour for their help",
    "FOUNDATION",
    "While you were sick last week, your neighbour collected your mail, watered your plants, and brought you some soup. You are feeling better now and want to thank them.",
    "Write an email to your neighbour. Thank them for what they did, let them know you are feeling better, and invite them over for coffee or a meal to show your appreciation.",
  ),
  EMAIL(
    "Email — Rescheduling plans with a friend",
    "FOUNDATION",
    "You and a friend agreed to meet for dinner this Saturday, but something has come up and you can no longer make it. You still want to see them soon.",
    "Write an email to your friend. Apologise for the change, briefly explain why you need to reschedule, and suggest another day and time that could work.",
  ),
  EMAIL(
    "Email — A broken heater in your apartment",
    "CORE",
    "The heater in your apartment stopped working two days ago, and the nights have been very cold. You have left one phone message for your landlord but have not heard back.",
    "Write an email to your landlord. Describe the problem and how long it has lasted, mention that you already left a message, and ask for the heater to be repaired as soon as possible.",
  ),
  EMAIL(
    "Email — Asking about a community class",
    "CORE",
    "You saw a poster for a beginner photography class at your local community centre, but the poster did not include all the details you need before signing up.",
    "Write an email to the community centre. Say which class you are interested in, ask about the cost, the schedule, and whether you need to bring your own equipment, and ask how to register.",
  ),
  EMAIL(
    "Email — Requesting a safety change from the city",
    "STRETCH",
    "The walking path through the park near your home has no lighting, and it becomes very dark in the evening. Several residents, including you, no longer feel safe using it after sunset.",
    "Write an email to your city councillor. Explain the problem and why it matters, describe how it affects residents, and propose a specific change, such as adding lighting along the path.",
  ),
  EMAIL(
    "Email — Responding to extra responsibilities at work",
    "STRETCH",
    "Your manager has asked you to take on training two new team members on top of your current workload. You are willing to help, but you are concerned that your existing projects may fall behind.",
    "Write an email to your manager. Show that you are willing to help, explain your concern about your current workload honestly, and suggest a reasonable way to make the extra responsibility work.",
  ),
  SURVEY(
    "Survey — An addition to your apartment building",
    "FOUNDATION",
    "Your building's management has money for one improvement to shared areas. Which would you prefer?",
    "A: More covered bicycle parking near the entrance.",
    "B: More visitor parking spaces for guests.",
    "Choose Option A or Option B and explain why it would be more useful for the people in your building. Give specific reasons.",
  ),
  SURVEY(
    "Survey — A new feature for the local school",
    "FOUNDATION",
    "A nearby school has funding to add one new program for students. Which do you think is the better choice?",
    "A: More sports and physical activity programs.",
    "B: More art, music, and drama programs.",
    "Choose Option A or Option B and explain why it would benefit the students more. Give specific reasons.",
  ),
  SURVEY(
    "Survey — Improving the city bus service",
    "CORE",
    "Your city has some money to improve public transit. Which improvement would you prefer?",
    "A: Buses that come more frequently, so people wait less.",
    "B: Lower fares, so riding the bus costs less.",
    "Choose Option A or Option B and explain why it would help riders more. Give specific reasons.",
  ),
  SURVEY(
    "Survey — A change to the work week",
    "CORE",
    "Your employer is considering one change to the standard work week. Which would you prefer?",
    "A: The option to work from home two days a week.",
    "B: A shorter workday every Friday.",
    "Choose Option A or Option B and explain why it would work better for you and your team. Give specific reasons.",
  ),
  SURVEY(
    "Survey — How the library should spend its budget",
    "STRETCH",
    "Your local library has extra funding for one area. Which should it focus on?",
    "A: More physical books and quiet study spaces in the building.",
    "B: More digital services, such as e-books and online courses.",
    "Choose Option A or Option B and explain why it would serve the community better. Give specific reasons.",
  ),
  SURVEY(
    "Survey — Attracting more visitors to your town",
    "STRETCH",
    "Your town wants to attract more visitors and has money for one approach. Which do you prefer?",
    "A: Funding seasonal festivals and events downtown.",
    "B: Improving parks, trails, and natural areas.",
    "Choose Option A or Option B and explain why it would bring more lasting benefit to the town. Give specific reasons.",
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
