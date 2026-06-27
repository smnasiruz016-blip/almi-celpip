// Seeds original CELPIP Reading items. CELPIP Reading has four parts:
// Correspondence (read a letter/email), Diagram (read an application/diagram and
// match information), Information (read a passage), and Viewpoints (read opinions).
// Each part is one or more passages followed by multiple-choice questions (the
// Diagram part uses simple matching). All passages and questions are original to
// AlmiCELPIP and use everyday Canadian situations. Phase 0 ships starter items;
// later content batches expand this.
//
// Run: npm run seed:reading  (needs DATABASE_URL set)

import { PrismaClient, Prisma } from "@prisma/client";
import { isDirectRun } from "./_entry";

const prisma = new PrismaClient();

export const ITEMS: Prisma.CelpipItemCreateManyInput[] = [
  {
    subTest: "READING",
    taskType: "READING_CORRESPONDENCE",
    title: "Correspondence — An email from a neighbour",
    prompt: "Read the email and answer the questions by choosing the best option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Email",
          body:
            "Hi Sam,\n\nThanks again for keeping an eye on our place while we were away. Everything looked perfect when we got back. I did notice the recycling bin wasn't picked up — I think the city changed the collection day to Thursday this month, so I've moved ours out for next week.\n\nWe brought you back a little something from the trip; I'll drop it by this weekend. If Saturday afternoon doesn't work, just text me and we'll find another time.\n\nThanks once more,\nLee",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "Why was the recycling not collected?",
          options: [
            { id: "a", text: "Sam forgot to put it out." },
            { id: "b", text: "The collection day had changed." },
            { id: "c", text: "The bin was too full." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What does Lee ask Sam to do if Saturday does not work?",
          options: [
            { id: "a", text: "Send a text to arrange another time." },
            { id: "b", text: "Call the city." },
            { id: "c", text: "Leave a key under the mat." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote: "Read for the writer's purpose and any request — correspondence usually asks for a small action.",
  },
  {
    subTest: "READING",
    taskType: "READING_DIAGRAM",
    title: "Diagram — A community centre class schedule",
    prompt:
      "Read the schedule, then match each person's need to the best class by choosing the correct option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Riverside Community Centre — Evening Classes",
          body:
            "Monday 6pm — Beginner Pottery (Studio B)\nTuesday 7pm — Conversational French (Room 2)\nWednesday 6:30pm — Yoga for All Levels (Hall)\nThursday 7pm — Intro to Coding (Computer Lab)\nFriday 6pm — Family Cooking (Kitchen)",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "match",
          stem: "Dana wants to practise speaking another language. Which class fits?",
          options: [
            { id: "a", text: "Conversational French (Tuesday)" },
            { id: "b", text: "Intro to Coding (Thursday)" },
            { id: "c", text: "Beginner Pottery (Monday)" },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "match",
          stem: "Raj wants an activity he can do with his children. Which class fits?",
          options: [
            { id: "a", text: "Yoga for All Levels (Wednesday)" },
            { id: "b", text: "Family Cooking (Friday)" },
            { id: "c", text: "Intro to Coding (Thursday)" },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Match each person's stated need to a single detail in the schedule — don't overthink it.",
  },
  {
    subTest: "READING",
    taskType: "READING_INFORMATION",
    title: "Information — How composting programs work",
    prompt: "Read the passage and answer the questions by choosing the best option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Curbside Composting",
          body:
            "Many Canadian cities now collect food scraps for composting alongside regular garbage and recycling. Residents are given a small kitchen bin for daily scraps and a larger green cart that is set out at the curb each week. Accepted items usually include fruit and vegetable peelings, eggshells, coffee grounds, and soiled paper such as napkins. Items to avoid include plastic bags, even those labelled 'compostable,' since most facilities cannot process them quickly enough. The collected material is taken to a central site where it breaks down over several weeks into a rich soil that is often sold back to residents in spring.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "Which item should NOT be placed in the green cart?",
          options: [
            { id: "a", text: "Coffee grounds." },
            { id: "b", text: "'Compostable' plastic bags." },
            { id: "c", text: "Soiled paper napkins." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What eventually happens to the collected material?",
          options: [
            { id: "a", text: "It becomes soil sometimes sold back to residents." },
            { id: "b", text: "It is sent to a landfill." },
            { id: "c", text: "It is burned for energy." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote: "Information passages reward careful reading of the 'avoid' or 'except' details.",
  },
  {
    subTest: "READING",
    taskType: "READING_VIEWPOINTS",
    title: "Viewpoints — Working from home",
    prompt:
      "Read the passage, which presents different opinions, and answer the questions by choosing the best option.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Two views on remote work",
          body:
            "Maria has worked from home for three years and would not go back. She points to the hours she no longer spends commuting and the quiet she needs to focus on detailed work. Without the office, she says, she is both calmer and more productive. Jon sees it differently. He misses the quick hallway conversations that, in his experience, solved problems faster than any email chain. He also worries that newer employees lose out on the informal mentoring that happens naturally in a shared space. Both agree, however, that the answer is rarely all or nothing — a mix of office and home days tends to satisfy more people than either extreme.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What does Jon value most about working in the office?",
          options: [
            { id: "a", text: "Quick, informal problem-solving and mentoring." },
            { id: "b", text: "A shorter commute." },
            { id: "c", text: "A quieter place to focus." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What do Maria and Jon agree on?",
          options: [
            { id: "a", text: "Everyone should return to the office full-time." },
            { id: "b", text: "A mix of home and office days suits most people." },
            { id: "c", text: "Remote work harms productivity." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "With viewpoints, separate each person's position, then find the point of agreement.",
  },
  {
    subTest: "READING",
    taskType: "READING_CORRESPONDENCE",
    title: "Correspondence — A reminder from the dental clinic",
    prompt: "Read the message and answer the questions by choosing the best option.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Appointment reminder",
          body:
            "Hello Jordan,\n\nThis is a reminder that you have a cleaning appointment with Dr. Olsen on Tuesday, June 9th at 2:30 pm. Please arrive ten minutes early and bring your insurance card so we can process your coverage.\n\nIf you need to change or cancel, kindly let us know at least 24 hours in advance — late cancellations may be charged a $40 fee.\n\nSee you soon,\nMaple Dental",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What does the clinic ask Jordan to bring?",
          options: [
            { id: "a", text: "An insurance card." },
            { id: "b", text: "A previous X-ray." },
            { id: "c", text: "A list of medications." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What may happen if Jordan cancels with little notice?",
          options: [
            { id: "a", text: "The appointment cannot be rebooked." },
            { id: "b", text: "A $40 late-cancellation fee may apply." },
            { id: "c", text: "The insurance coverage is lost." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Reminders usually carry one instruction and one condition — find both.",
  },
  {
    subTest: "READING",
    taskType: "READING_CORRESPONDENCE",
    title: "Correspondence — An email from the landlord about repairs",
    prompt: "Read the email and answer the questions by choosing the best option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Email",
          body:
            "Hi Casey,\n\nThe plumber is booked for Thursday between 1 and 4 pm to fix the slow drain in your kitchen. To save time, could you please clear out the cupboard under the sink before the visit so he has room to work?\n\nYou don't need to be home if that doesn't suit you — just let me know and I'll have the building manager let him in with a spare key. Otherwise, I'll assume you'll be there.\n\nThanks,\nDevon",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What does the landlord ask Casey to do before the visit?",
          options: [
            { id: "a", text: "Buy a new drain part." },
            { id: "b", text: "Clear out the cupboard under the sink." },
            { id: "c", text: "Reschedule with the plumber directly." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What option does the landlord offer if Casey cannot be home?",
          options: [
            { id: "a", text: "The building manager will let the plumber in with a spare key." },
            { id: "b", text: "The visit will be moved to the weekend." },
            { id: "c", text: "Casey can leave the door unlocked." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote: "An email may set a default ('otherwise, I'll assume…') — notice what happens if you do nothing.",
  },
  {
    subTest: "READING",
    taskType: "READING_CORRESPONDENCE",
    title: "Correspondence — A reply to a customer complaint",
    prompt: "Read the email and answer the questions by choosing the best option.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Email",
          body:
            "Dear Ms. Tran,\n\nThank you for letting us know that the blender you ordered arrived with a cracked jug. I'm sorry for the trouble — that's not the standard we aim for, and the damage most likely happened in shipping.\n\nWe'd like to make it right in whichever way suits you best. We can send a brand-new replacement at no cost, or issue a full refund to your original payment — just reply and tell us which you prefer. Either way, you don't need to pay to send the damaged unit back; a prepaid return label is attached to this email.\n\nWith apologies,\nRiverside Home Goods",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What was the customer's complaint?",
          options: [
            { id: "a", text: "The blender arrived with a cracked jug." },
            { id: "b", text: "The blender was the wrong colour." },
            { id: "c", text: "The order never arrived." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What does the store offer Ms. Tran?",
          options: [
            { id: "a", text: "A discount on her next order only." },
            { id: "b", text: "A free replacement or a full refund, with a prepaid return label." },
            { id: "c", text: "A repair once she pays for shipping." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "A good complaint reply offers a choice — read to the end so you catch every option given.",
  },
  {
    subTest: "READING",
    taskType: "READING_DIAGRAM",
    title: "Diagram — A bus route timetable",
    prompt:
      "Read the timetable, then match each person's need to the best answer by choosing the correct option.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Route 5 — Departures from Main Street Station",
          body:
            "Weekdays: 7:15, 8:00, 8:45, 9:30, then every 30 min until 6:30 pm\nSaturday: every 45 min, 8:00 am to 7:00 pm\nSunday: every 60 min, 9:00 am to 6:00 pm\nTravel time to downtown: about 20 minutes",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "match",
          stem: "Priya must reach downtown before 9:00 am on a weekday. Which departure should she take?",
          options: [
            { id: "a", text: "The 8:00 am bus." },
            { id: "b", text: "The 8:45 am bus." },
            { id: "c", text: "The 9:30 am bus." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "match",
          stem: "On which day does the bus run least often?",
          options: [
            { id: "a", text: "Saturday." },
            { id: "b", text: "Sunday." },
            { id: "c", text: "Weekdays." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "With a timetable, do the small calculation the question needs — here, travel time before a deadline.",
  },
  {
    subTest: "READING",
    taskType: "READING_DIAGRAM",
    title: "Diagram — A store return policy",
    prompt:
      "Read the return policy, then match each situation to the correct answer by choosing the best option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Northwind Store — Return Policy",
          body:
            "Electronics: returns within 15 days, receipt and original box required.\nClothing: returns within 30 days, tags attached.\nGroceries: no returns for food items.\nClearance / final sale: no returns or exchanges.\nGift cards: cannot be returned or redeemed for cash.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "match",
          stem: "Sam wants to return a shirt three weeks after buying it, with the tags still on. Is it allowed?",
          options: [
            { id: "a", text: "Yes — clothing can be returned within 30 days with tags." },
            { id: "b", text: "No — clothing cannot be returned." },
            { id: "c", text: "Only if Sam pays a fee." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "match",
          stem: "Which purchase can NOT be returned under any condition?",
          options: [
            { id: "a", text: "Electronics within 15 days." },
            { id: "b", text: "A clearance item marked final sale." },
            { id: "c", text: "Clothing with tags attached." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Match each case to the row that names it — watch for the 'no returns' categories.",
  },
  {
    subTest: "READING",
    taskType: "READING_DIAGRAM",
    title: "Diagram — Community centre membership tiers",
    prompt:
      "Read the membership options, then match each person to the best plan by choosing the correct option.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Greenfield Centre — Membership Plans",
          body:
            "Basic — $25/month: gym access, weekdays only.\nPlus — $40/month: gym access any day, plus all drop-in fitness classes.\nFamily — $70/month: covers two adults and up to three children; includes gym, classes, and pool.\nDay Pass — $10: single visit, gym only.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "match",
          stem: "A couple with two children want gym access, classes, and the pool for everyone. Which plan fits?",
          options: [
            { id: "a", text: "Plus." },
            { id: "b", text: "Family." },
            { id: "c", text: "Basic." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          kind: "match",
          stem: "Alex only wants to use the gym, and only on weekdays. Which plan is the cheapest fit?",
          options: [
            { id: "a", text: "Basic." },
            { id: "b", text: "Plus." },
            { id: "c", text: "Family." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote: "Match each person to the cheapest plan that still meets every part of their need.",
  },
  {
    subTest: "READING",
    taskType: "READING_INFORMATION",
    title: "Information — Getting a library card",
    prompt: "Read the passage and answer the questions by choosing the best option.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Sign up for a card",
          body:
            "Getting a library card is free for anyone who lives, works, or studies in the city. To sign up, visit any branch with a piece of photo identification and something that shows your current address, such as a utility bill or a piece of mail. Staff will print your card on the spot. Once you have a card, you can borrow up to twenty items at a time, and you can also use your card number to log in online and read e-books and digital magazines from home, free of charge.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What do you need to bring to sign up?",
          options: [
            { id: "a", text: "Photo ID and proof of your current address." },
            { id: "b", text: "A payment of twenty dollars." },
            { id: "c", text: "A letter from an employer only." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "Besides borrowing books, what else can a cardholder do?",
          options: [
            { id: "a", text: "Read e-books and digital magazines online for free." },
            { id: "b", text: "Get free printing without limit." },
            { id: "c", text: "Reserve the building for events." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote: "Information passages list what you need and what you get — keep the two apart.",
  },
  {
    subTest: "READING",
    taskType: "READING_INFORMATION",
    title: "Information — Snow-clearing rules in winter",
    prompt: "Read the passage and answer the questions by choosing the best option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Winter sidewalk rules",
          body:
            "In most Canadian cities, property owners are responsible for clearing the public sidewalk in front of their home or business. The bylaw usually requires this within 24 hours after snow stops falling. Residents are also told not to shovel or blow snow back onto the road, as this creates a hazard for drivers and the snow plows. The city itself takes care of the roads, clearing main streets and bus routes first and quieter residential streets afterward, which is why a side street may stay snowy for a day or two after a big storm.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What must property owners usually do after a snowfall?",
          options: [
            { id: "a", text: "Clear the sidewalk in front of their property within 24 hours." },
            { id: "b", text: "Wait for the city to clear all sidewalks." },
            { id: "c", text: "Pay a winter fee to the city." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What are residents told NOT to do?",
          options: [
            { id: "a", text: "Use a snow blower." },
            { id: "b", text: "Push snow back onto the road." },
            { id: "c", text: "Clear the sidewalk before noon." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Rules passages often include a 'do not' — it is a common question target.",
  },
  {
    subTest: "READING",
    taskType: "READING_INFORMATION",
    title: "Information — How a home heat-pump rebate works",
    prompt: "Read the passage and answer the questions by choosing the best option.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "The home heating rebate program",
          body:
            "A provincial program offers homeowners a rebate of up to $3,000 toward installing an electric heat pump in place of an older furnace. The process has a specific order that matters. First, you must book a home energy assessment with a certified advisor, who records your current heating system; a rebate cannot be approved without this 'before' assessment on file. Next, the work must be carried out by a contractor from the program's approved list — installations by an unlisted contractor do not qualify. Finally, once the heat pump is in and a follow-up assessment confirms it, you submit your receipts and the rebate is paid by cheque, usually within eight weeks. Skipping the first assessment is the most common reason applications are rejected.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What is the required first step to qualify for the rebate?",
          options: [
            { id: "a", text: "Buying the heat pump." },
            { id: "b", text: "Booking a home energy assessment with a certified advisor." },
            { id: "c", text: "Submitting receipts to the province." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "Why are applications most commonly rejected?",
          options: [
            { id: "a", text: "The homeowner skipped the first assessment." },
            { id: "b", text: "The heat pump was too powerful." },
            { id: "c", text: "The cheque was sent to the wrong address." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote: "When a process has a set order, the 'first' step and what voids it are prime question material.",
  },
  {
    subTest: "READING",
    taskType: "READING_VIEWPOINTS",
    title: "Viewpoints — Is getting a pet a good idea?",
    prompt:
      "Read the passage, which presents different opinions, and answer the questions by choosing the best option.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Two views on getting a pet",
          body:
            "Tessa has had a dog for years and can't imagine life without one. She talks about the company a pet gives, the reason it gives her to get outside and walk every day, and the simple comfort of having someone happy to see her come home. Marcus is more cautious. He reminds friends that a pet is a real expense — food, vet bills, and the cost of a sitter whenever you travel — and that it needs time and attention every single day, not just when it's convenient. Both of them, though, say the same thing in the end: a pet is a good idea only if it truly fits your budget and your daily routine.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What does Marcus mainly point out about owning a pet?",
          options: [
            { id: "a", text: "It costs money and needs daily time and attention." },
            { id: "b", text: "It is a good way to meet neighbours." },
            { id: "c", text: "It is only suitable for large homes." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What do Tessa and Marcus agree on?",
          options: [
            { id: "a", text: "Everyone should own a dog." },
            { id: "b", text: "A pet is a good idea only if it fits your budget and routine." },
            { id: "c", text: "Pets are too much trouble for anyone." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Separate each person's view first, then look for the sentence where they agree.",
  },
  {
    subTest: "READING",
    taskType: "READING_VIEWPOINTS",
    title: "Viewpoints — City living versus the suburbs",
    prompt:
      "Read the passage, which presents different opinions, and answer the questions by choosing the best option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Two views on where to live",
          body:
            "Aisha would not trade her downtown apartment for anything. She loves being able to walk to work, to restaurants, and to the theatre, and she rarely needs a car. The trade-off, she admits, is a smaller home and a higher rent. Liam chose the suburbs for the opposite reasons. For the same money he has a house with a yard, more quiet, and good schools nearby, though he accepts a longer commute as the price. Neither tries to win the other over. They tend to agree that the right answer depends on your stage of life — what suits a single person in their twenties may not suit a family with young children.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What does Aisha value most about living downtown?",
          options: [
            { id: "a", text: "Being able to walk to work and entertainment without a car." },
            { id: "b", text: "Having a large house with a yard." },
            { id: "c", text: "Paying a lower rent." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What do Aisha and Liam agree on?",
          options: [
            { id: "a", text: "The suburbs are always better for families." },
            { id: "b", text: "The right choice depends on your stage of life." },
            { id: "c", text: "Everyone should avoid a long commute." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Each speaker names a trade-off — match the value to the person, then find the shared conclusion.",
  },
  {
    subTest: "READING",
    taskType: "READING_VIEWPOINTS",
    title: "Viewpoints — Cash or cashless?",
    prompt:
      "Read the passage, which presents different opinions, and answer the questions by choosing the best option.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      passages: [
        {
          id: "p1",
          heading: "Two views on going cashless",
          body:
            "As more shops put up 'card only' signs, two reactions have grown louder. Reza defends cash. He points out that not everyone has a bank card or a smartphone — older people and those on low incomes can be shut out when cash is refused — and he values the privacy of a payment that leaves no record. Bianca sees the convenience differently: tapping a card is faster, you don't have to carry change, and a business handling no cash is less of a target for theft. Yet for all their disagreement, the two land in a similar place. A shop that quietly drops cash, they agree, risks turning away the very customers least able to switch — so the fairest path is to keep accepting both for as long as people still rely on cash.",
        },
      ],
      questions: [
        {
          id: "q1",
          kind: "mcq",
          stem: "What is Reza's main concern about going cashless?",
          options: [
            { id: "a", text: "It is slower at the checkout." },
            { id: "b", text: "It can shut out people without a card or smartphone, and it reduces privacy." },
            { id: "c", text: "It makes shops a bigger target for theft." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          kind: "mcq",
          stem: "What do Reza and Bianca ultimately agree is the fairest path?",
          options: [
            { id: "a", text: "Going fully cashless as soon as possible." },
            { id: "b", text: "Continuing to accept both cash and cards while people still rely on cash." },
            { id: "c", text: "Letting each customer pay a fee to use cash." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "Even when two writers disagree, they may share a final position — read past the debate to the 'they agree' line.",
  },
];

async function main() {
  const res = await prisma.celpipItem.createMany({ data: ITEMS });
  console.log(`Seeded ${res.count} Reading item(s).`);
}

if (isDirectRun(import.meta.url)) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
