// Seeds original CELPIP Listening items. CELPIP Listening has six parts; each is
// an audio recording followed by multiple-choice questions (the audio plays once,
// like the real test). All audio scripts and questions are original to AlmiCELPIP
// — never copied from CELPIP — and use everyday Canadian situations, not any
// profession-specific content. Phase 0 ships starter items per part; later content
// batches expand this.
//
// Run: npm run seed:listening  (needs DATABASE_URL set)

import { PrismaClient, Prisma } from "@prisma/client";
import { isDirectRun } from "./_entry";

const prisma = new PrismaClient();

export const ITEMS: Prisma.CelpipItemCreateManyInput[] = [
  {
    subTest: "LISTENING",
    taskType: "LISTENING_PROBLEM_SOLVING",
    title: "Problem Solving — A delayed furniture delivery",
    prompt:
      "You will hear a conversation. It plays once. Then answer the questions by choosing the best option.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Woman: Hi, I'm calling about the sofa I ordered last week. The delivery was supposed to be today between nine and noon, but no one came. Man: I'm sorry about that. Let me check… It looks like the truck had a mechanical problem this morning. Woman: That's frustrating — I took the whole day off work. Man: I understand. I can book you the first slot tomorrow, eight to ten, and I'll add a fifty-dollar credit to your account for the trouble. Woman: Tomorrow morning works, but I'd prefer the credit goes toward the delivery fee instead. Man: That's no problem, I'll waive the delivery fee entirely.",
      speakers: [
        { role: "Customer", voice: "nova" },
        { role: "Agent", voice: "alloy" },
      ],
      questions: [
        {
          id: "q1",
          stem: "Why did the delivery not arrive?",
          options: [
            { id: "a", text: "The customer gave the wrong address." },
            { id: "b", text: "The delivery truck broke down." },
            { id: "c", text: "The order had been cancelled." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "What does the customer finally agree to?",
          options: [
            { id: "a", text: "A morning delivery with the delivery fee waived." },
            { id: "b", text: "A fifty-dollar account credit and the same time slot." },
            { id: "c", text: "A refund and no redelivery." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote:
      "Listen for what the speakers settle on at the end — the first offer is often changed before they agree.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_DAILY_LIFE",
    title: "Daily Life — Planning a weekend trip",
    prompt:
      "You will hear a conversation about everyday plans. It plays once. Choose the best option for each question.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Man: Are we still driving up to the lake on Saturday? Woman: I think so, but the forecast says rain in the afternoon. Maybe we leave early and come back before it starts. Man: Good idea. If we leave by seven, we can have a few hours on the water and be home by two. Woman: Let's do that. I'll pack the lunch tonight so we're not rushing in the morning.",
      speakers: [
        { role: "Man", voice: "echo" },
        { role: "Woman", voice: "shimmer" },
      ],
      questions: [
        {
          id: "q1",
          stem: "Why do they decide to leave early?",
          options: [
            { id: "a", text: "To avoid the expected afternoon rain." },
            { id: "b", text: "Because the lake closes at noon." },
            { id: "c", text: "To beat the weekend traffic." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "What will the woman do tonight?",
          options: [
            { id: "a", text: "Check the forecast again." },
            { id: "b", text: "Pack the lunch." },
            { id: "c", text: "Fill the car with gas." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Everyday conversations move quickly — note who does what and when.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_INFORMATION",
    title: "Information — A library service announcement",
    prompt:
      "You will hear someone giving information. It plays once. Choose the best option for each question.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Welcome to the Riverside Public Library. A quick note about our new hours: starting next month, we will open at nine on weekdays instead of ten, but we will now close at six rather than eight. Saturday hours are unchanged. The self-checkout machines by the entrance are available whenever the building is open, and you can also return items at the outdoor drop box twenty-four hours a day. Holds can now be picked up from the new shelves to your left as you come in, without needing to wait at the desk.",
      speakers: [{ role: "Announcer", voice: "alloy" }],
      questions: [
        {
          id: "q1",
          stem: "What is the main change to the library's weekday hours?",
          options: [
            { id: "a", text: "It will open earlier but close earlier." },
            { id: "b", text: "It will open and close later." },
            { id: "c", text: "It will be closed on weekdays." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "How can holds now be collected?",
          options: [
            { id: "a", text: "Only at the front desk." },
            { id: "b", text: "From the new shelves near the entrance." },
            { id: "c", text: "From the outdoor drop box." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Announcements list several facts — keep each detail separate from the others.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_NEWS",
    title: "News Item — A new community bike lane",
    prompt:
      "You will hear part of a news report. It plays once. Choose the best option for each question.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      audioScript:
        "In local news, the city council has approved a new protected bike lane along Maple Avenue, connecting the downtown core to the east-side neighbourhoods. Construction is set to begin in the spring and should finish before the end of the year. Supporters say the lane will make cycling safer and ease parking pressure downtown. Some business owners, however, worry about the loss of a row of street parking during construction. The council has promised to add a small parking lot two blocks away to offset the change.",
      speakers: [{ role: "Reporter", voice: "echo" }],
      questions: [
        {
          id: "q1",
          stem: "What has the city council approved?",
          options: [
            { id: "a", text: "A protected bike lane on Maple Avenue." },
            { id: "b", text: "A new downtown parking garage." },
            { id: "c", text: "The closure of Maple Avenue to cars." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "What concern do some business owners have?",
          options: [
            { id: "a", text: "The project will take several years." },
            { id: "b", text: "Street parking will be lost during construction." },
            { id: "c", text: "Cyclists will not use the new lane." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "News items present more than one viewpoint — separate the supporters' view from the critics'.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_DISCUSSION",
    title: "Discussion — Choosing a venue for a staff party",
    prompt:
      "You will hear a discussion between several people. It plays once. Choose the best option for each question.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Priya: So for the team party, it's between the rooftop restaurant and the community hall. Tom: The rooftop is nicer, but it's pricey and there's no backup if it rains. Priya: True. The hall is plain, but we could decorate it and it fits everyone easily. Dan: And the hall lets us bring our own caterer, which saves money. Tom: I still think people would be more excited about the rooftop. Priya: Excitement matters, but if half the budget goes to one evening, we can't do the summer outing too. Dan: Then the hall it is — we keep the rooftop idea for a smaller celebration later.",
      speakers: [
        { role: "Priya", voice: "nova" },
        { role: "Tom", voice: "alloy" },
        { role: "Dan", voice: "echo" },
      ],
      questions: [
        {
          id: "q1",
          stem: "What is the main drawback of the rooftop restaurant?",
          options: [
            { id: "a", text: "It is too small for the team." },
            { id: "b", text: "It is expensive and has no rain backup." },
            { id: "c", text: "It does not allow outside caterers." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "Why do they finally choose the community hall?",
          options: [
            { id: "a", text: "It is the most exciting option." },
            { id: "b", text: "It saves budget for the summer outing too." },
            { id: "c", text: "It is closer to the office." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "In a group discussion, track how the decision shifts as people weigh cost against everything else.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_VIEWPOINTS",
    title: "Viewpoints — Are four-day work weeks a good idea?",
    prompt:
      "You will hear a longer talk presenting different viewpoints. It plays once. Choose the best option for each question.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      audioScript:
        "The idea of a four-day work week has moved from the fringe to the mainstream. Supporters point to trials where companies kept output steady while giving staff an extra day off, arguing that well-rested employees simply work more efficiently in the hours they do have. Critics counter that the results vary widely by industry: a software team may compress its work easily, while a hospital or a call centre cannot simply close a day. What most studies agree on, though, is that the benefit comes not from the shorter week itself, but from the rethinking of how time is used that it forces. Cutting unnecessary meetings, for instance, helped even the companies that ultimately kept five days. So the real lesson may be less about the calendar and more about discipline with time.",
      speakers: [{ role: "Speaker", voice: "alloy" }],
      questions: [
        {
          id: "q1",
          stem: "What do critics of the four-day week mainly argue?",
          options: [
            { id: "a", text: "It always reduces total output." },
            { id: "b", text: "Its feasibility depends heavily on the industry." },
            { id: "c", text: "Employees dislike the longer daily hours." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "According to the speaker, where does the real benefit come from?",
          options: [
            { id: "a", text: "The shorter week itself." },
            { id: "b", text: "Rethinking how working time is used." },
            { id: "c", text: "Hiring additional staff." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "The speaker's own conclusion often comes after 'what most agree on' or 'the real lesson' — listen past the two sides for it.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_PROBLEM_SOLVING",
    title: "Problem Solving — Putting a gym membership on hold",
    prompt:
      "You will hear a conversation. It plays once. Then answer the questions by choosing the best option.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Woman: Hi, I'd like to cancel my membership. I'm going to be out of the country for two months. Man: I'm sorry to hear you're leaving us. Before you cancel, did you know we offer a free hold? We can pause your account for up to three months, so you won't be charged while you're away, and your rate stays the same when you come back. Woman: Oh, I didn't know that. If I cancel, would I have to pay the sign-up fee again later? Man: You would, yes — that's twenty-five dollars. The hold avoids all of that. Woman: Then let's do the hold for two months instead. Man: Done. I'll restart it automatically on the first of September.",
      speakers: [
        { role: "Woman", voice: "nova" },
        { role: "Man", voice: "echo" },
      ],
      questions: [
        {
          id: "q1",
          stem: "Why did the woman call the gym?",
          options: [
            { id: "a", text: "To cancel because she will be away for two months." },
            { id: "b", text: "To complain about a charge on her account." },
            { id: "c", text: "To upgrade to a more expensive plan." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "Why does she choose the hold instead of cancelling?",
          options: [
            { id: "a", text: "The hold gives her a lower monthly rate." },
            { id: "b", text: "Cancelling would mean paying the sign-up fee again later." },
            { id: "c", text: "The gym would not let her cancel." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "When an agent offers an alternative, listen for the reason the caller accepts it — it is usually a cost they avoid.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_PROBLEM_SOLVING",
    title: "Problem Solving — A higher-than-usual electricity bill",
    prompt:
      "You will hear a conversation. It plays once. Then answer the questions by choosing the best option.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Man: I'm calling because my electricity bill is almost double what it normally is, and nothing's changed in our usage. Woman: Let me pull up the account… I see it. This month's bill is based on an estimated reading, not an actual one — our meter reader couldn't access the yard because of the dog. Man: Ah, that would do it. So the number isn't real? Woman: Right. When we get the next actual reading, the system balances everything out, so you'd be credited for any overestimate then. But if you'd rather not wait, you can submit your own meter photo today and I'll re-bill it now. Man: I'll send the photo — I'd rather pay the correct amount than wait two months for a credit. Woman: Perfect. Once I have it, I'll cancel this bill and issue a corrected one within a day.",
      speakers: [
        { role: "Man", voice: "onyx" },
        { role: "Woman", voice: "nova" },
      ],
      questions: [
        {
          id: "q1",
          stem: "Why was the bill higher than usual?",
          options: [
            { id: "a", text: "The household used much more electricity." },
            { id: "b", text: "It was based on an estimate, not an actual meter reading." },
            { id: "c", text: "The rate per unit had increased." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "What does the man decide to do?",
          options: [
            { id: "a", text: "Send his own meter photo so the bill is corrected now." },
            { id: "b", text: "Wait two months for the account to balance out." },
            { id: "c", text: "Switch to a different electricity provider." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote:
      "In a longer call, the caller is often offered two paths — note which one they choose and why they prefer it.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_DAILY_LIFE",
    title: "Daily Life — Repainting the spare room",
    prompt:
      "You will hear a conversation about everyday plans. It plays once. Choose the best option for each question.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Woman: I'm leaning toward the pale grey for the spare room rather than the dark blue. Man: Really? I liked the blue. Woman: I did too, but that room is small and doesn't get much light — the grey will make it feel bigger and brighter. Man: Fair point. When do you want to do it? Woman: If we pick up the paint on Friday after work, we could start first thing Saturday and finish in a day. Man: Let's move the bed out Friday night so we're ready to go in the morning.",
      speakers: [
        { role: "Woman", voice: "shimmer" },
        { role: "Man", voice: "alloy" },
      ],
      questions: [
        {
          id: "q1",
          stem: "Why does the woman prefer the pale grey?",
          options: [
            { id: "a", text: "It is cheaper than the dark blue." },
            { id: "b", text: "It will make the small, dim room feel bigger and brighter." },
            { id: "c", text: "It matches the furniture better." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "What will they do on Friday?",
          options: [
            { id: "a", text: "Paint the first coat." },
            { id: "b", text: "Pick up the paint and move the bed out." },
            { id: "c", text: "Choose between two rooms." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Everyday plans have a reason and a sequence — note the 'why' as well as the 'when'.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_DAILY_LIFE",
    title: "Daily Life — Planning a surprise party",
    prompt:
      "You will hear a conversation about everyday plans. It plays once. Choose the best option for each question.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Maya: So the plan is Chris's surprise party on the twentieth, right? Ben: That's the problem — I just found out Chris is visiting his sister that weekend. We'll have to move it to the twenty-seventh. Maya: Okay, the twenty-seventh works. I'll handle the food and the guest list. Can you take care of getting Chris to the restaurant without giving it away? Ben: Sure. I'll tell him it's just the two of us for dinner, and I'll keep him out until everyone's arrived and seated. Maya: Perfect. Text me when you're ten minutes away so we can all get quiet.",
      speakers: [
        { role: "Maya", voice: "nova" },
        { role: "Ben", voice: "echo" },
      ],
      questions: [
        {
          id: "q1",
          stem: "Why do they change the date of the party?",
          options: [
            { id: "a", text: "The restaurant was already booked." },
            { id: "b", text: "Chris will be away visiting his sister that weekend." },
            { id: "c", text: "Maya cannot get the food ready in time." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "What is Ben responsible for?",
          options: [
            { id: "a", text: "Preparing the food and the guest list." },
            { id: "b", text: "Keeping Chris away until everyone has arrived." },
            { id: "c", text: "Booking the restaurant." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "When people divide up tasks, keep each person matched to their own job — questions often swap them to test you.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_INFORMATION",
    title: "Information — Summer pool schedule",
    prompt:
      "You will hear someone giving information. It plays once. Choose the best option for each question.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Welcome to the Lakeside Recreation Centre pool. Here's how our summer schedule works. On weekday mornings, the pool is reserved for swimming lessons, so it's closed to the public until noon. Lessons must be booked in advance online — spots fill quickly. Weekday afternoons are open for lane swimming. On weekends, we run a family open swim every afternoon; you don't need to register for that one, just come in and show your membership card at the desk.",
      speakers: [{ role: "Announcer", voice: "fable" }],
      questions: [
        {
          id: "q1",
          stem: "What requires booking in advance?",
          options: [
            { id: "a", text: "The weekend family open swim." },
            { id: "b", text: "The swimming lessons." },
            { id: "c", text: "Weekday afternoon lane swimming." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "When can families swim without registering?",
          options: [
            { id: "a", text: "Weekday mornings." },
            { id: "b", text: "Weekend afternoons." },
            { id: "c", text: "Any weekday before noon." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Schedules pair times with rules — keep each time slot tied to what is allowed then.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_INFORMATION",
    title: "Information — A new transit fare card",
    prompt:
      "You will hear someone giving information. It plays once. Choose the best option for each question.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Starting in September, the city is changing how you pay for transit. Paper tickets and tokens are being phased out and replaced by a reloadable tap card called the GoPass. You tap it on the reader as you board, and the fare is taken from your balance. The biggest change is daily fare capping: once your taps in a single day add up to the price of a day pass, every ride after that is free, so you never pay more than the day pass no matter how many trips you take. You can load the card online, at any station machine, or at corner stores displaying the GoPass sign. Paper tickets already bought will still be accepted until the end of the year.",
      speakers: [{ role: "Announcer", voice: "alloy" }],
      questions: [
        {
          id: "q1",
          stem: "What is replacing paper tickets and tokens?",
          options: [
            { id: "a", text: "A reloadable tap card called the GoPass." },
            { id: "b", text: "A phone app only." },
            { id: "c", text: "Cash paid to the driver." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "What is the benefit of daily fare capping?",
          options: [
            { id: "a", text: "The first ride of the day is always free." },
            { id: "b", text: "You never pay more than a day pass, however many trips you take." },
            { id: "c", text: "Tickets never expire." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "Announcements about a change usually highlight one main benefit — listen for the phrase that explains it ('the biggest change is…').",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_NEWS",
    title: "News Item — A new downtown farmers' market",
    prompt:
      "You will hear part of a news report. It plays once. Choose the best option for each question.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      audioScript:
        "In community news, a new farmers' market opens this Saturday in the downtown square. Every Saturday morning through the fall, local growers and bakers will set up stalls selling fresh produce, bread, and homemade goods. Organizers say the market is meant to give nearby farmers a place to sell directly to customers and to bring more people into the downtown core on weekends. Parking will be free in the city lot next to the square for the first hour.",
      speakers: [{ role: "Reporter", voice: "echo" }],
      questions: [
        {
          id: "q1",
          stem: "Where and when will the market be held?",
          options: [
            { id: "a", text: "In the downtown square on Saturday mornings." },
            { id: "b", text: "At the city farm every evening." },
            { id: "c", text: "In the community hall on Sundays." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "What is one goal organizers mention?",
          options: [
            { id: "a", text: "To raise money for the city lot." },
            { id: "b", text: "To help local farmers sell directly and draw people downtown." },
            { id: "c", text: "To replace the existing grocery stores." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Short news items state a few facts plainly — catch the who, where, when, and why.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_NEWS",
    title: "News Item — Debate over expanding recycling",
    prompt:
      "You will hear part of a news report. It plays once. Choose the best option for each question.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      audioScript:
        "The city has announced a plan to expand its recycling program to accept several new types of plastic that currently have to go in the garbage, including takeout containers and plastic film. Environmental groups have welcomed the move, saying it could divert thousands of tonnes of waste from the landfill each year. Some residents and councillors, though, have raised concerns about the cost: these plastics are harder and more expensive to process, and the city has admitted the change may add a few dollars to the annual waste fee. The council says it will release the full cost estimate before the final vote next month.",
      speakers: [{ role: "Reporter", voice: "alloy" }],
      questions: [
        {
          id: "q1",
          stem: "What does the city plan to do?",
          options: [
            { id: "a", text: "Accept several new types of plastic in the recycling program." },
            { id: "b", text: "Close the landfill entirely." },
            { id: "c", text: "Stop collecting plastic film." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "Why are some residents and councillors concerned?",
          options: [
            { id: "a", text: "The plan will reduce garbage pickup days." },
            { id: "b", text: "The new plastics cost more to process and may raise the waste fee." },
            { id: "c", text: "Environmental groups oppose the change." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "News items weigh a benefit against a cost — keep the supporters' point separate from the critics'.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_DISCUSSION",
    title: "Discussion — Choosing a film for movie night",
    prompt:
      "You will hear a discussion between several people. It plays once. Choose the best option for each question.",
    difficulty: "FOUNDATION",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Amir: What are we watching tonight? Lena: There's that new horror film everyone's talking about. Sara: Please, not horror — I won't sleep for a week. Amir: Same, I'd rather not. What about the action one? Lena: We saw something similar last time. How about the comedy? It's supposed to be really funny and we'd all enjoy it. Sara: Yes, the comedy. Amir: Comedy it is. I'll make the popcorn.",
      speakers: [
        { role: "Amir", voice: "echo" },
        { role: "Lena", voice: "nova" },
        { role: "Sara", voice: "shimmer" },
      ],
      questions: [
        {
          id: "q1",
          stem: "Why do they decide against the horror film?",
          options: [
            { id: "a", text: "It is too long." },
            { id: "b", text: "Sara does not like scary movies." },
            { id: "c", text: "They have already seen it." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "What do they finally choose to watch?",
          options: [
            { id: "a", text: "The comedy." },
            { id: "b", text: "The action film." },
            { id: "c", text: "The horror film." },
          ],
          answer: "a",
        },
      ],
    },
    guidanceNote: "In a casual group chat, track which options get ruled out before the final choice.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_DISCUSSION",
    title: "Discussion — Setting up a chore schedule",
    prompt:
      "You will hear a discussion between several people. It plays once. Choose the best option for each question.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Noah: We need to talk about the apartment — the dishes keep piling up and it's always the same two people cleaning. Priya: Agreed. It feels random right now, so nobody knows whose turn it is. Tariq: What if we make a simple weekly rotation — one person on kitchen, one on bathroom, one on common areas, and we switch each week? Noah: That's fair. Let's put it on the fridge so there's no arguing about it. Priya: And whoever cooks doesn't have to do dishes that night — the others handle it. Tariq: Deal. I'll write up the first week tonight.",
      speakers: [
        { role: "Noah", voice: "onyx" },
        { role: "Priya", voice: "nova" },
        { role: "Tariq", voice: "alloy" },
      ],
      questions: [
        {
          id: "q1",
          stem: "What problem are the roommates trying to solve?",
          options: [
            { id: "a", text: "The rent is split unevenly." },
            { id: "b", text: "Chores are unfair and it's unclear whose turn it is." },
            { id: "c", text: "The kitchen is too small." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "What do they agree to do?",
          options: [
            { id: "a", text: "Hire a cleaner once a week." },
            { id: "b", text: "Use a weekly rotation posted on the fridge." },
            { id: "c", text: "Each clean only their own room." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote: "Problem-solving discussions move from the complaint to the agreed fix — hold on to both.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_VIEWPOINTS",
    title: "Viewpoints — Should children have smartphones?",
    prompt:
      "You will hear a longer talk presenting different viewpoints. It plays once. Choose the best option for each question.",
    difficulty: "CORE",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Few questions divide parents more than when, or whether, to give a child a smartphone. Those in favour often point to safety: a phone means a child can reach a parent after school or call for help if plans change. Others worry less about the age and more about the effect — time lost to games and social apps, and the pressure of being reachable at all hours. What researchers tend to stress, though, is that the device itself matters less than the rules around it. A phone with clear limits on apps and screen time looks very different from one with none. So perhaps the more useful question is not 'how old should a child be?' but 'what boundaries come with the phone?'",
      speakers: [{ role: "Speaker", voice: "fable" }],
      questions: [
        {
          id: "q1",
          stem: "What do parents in favour of giving children phones mainly point to?",
          options: [
            { id: "a", text: "Safety and being able to reach the child." },
            { id: "b", text: "Better performance at school." },
            { id: "c", text: "Saving money on a landline." },
          ],
          answer: "a",
        },
        {
          id: "q2",
          stem: "According to the speaker, what matters more than the child's age?",
          options: [
            { id: "a", text: "The brand of the phone." },
            { id: "b", text: "The rules and limits set around the phone." },
            { id: "c", text: "How much the phone costs." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "The speaker's own view often follows 'what researchers stress' — listen past the two sides for the conclusion.",
  },
  {
    subTest: "LISTENING",
    taskType: "LISTENING_VIEWPOINTS",
    title: "Viewpoints — Online versus in-person learning",
    prompt:
      "You will hear a longer talk presenting different viewpoints. It plays once. Choose the best option for each question.",
    difficulty: "STRETCH",
    topicTag: "everyday",
    payload: {
      audioScript:
        "Since online courses became common, people have argued about whether they can match a classroom. Supporters of online learning highlight its flexibility: you can study at your own pace, fit lessons around a job, and reach courses that aren't offered nearby. Critics counter that something is lost without a room full of people — the questions that come up in live discussion, the motivation of sitting beside others working toward the same goal, the quick help a teacher gives by reading a confused face. Interestingly, the studies that compare the two rarely declare a clear winner. What they more often find is that the best results come from blending them: live sessions for discussion and feedback, online materials for the parts learners can work through alone. The format, in the end, may matter less than the mix.",
      speakers: [{ role: "Speaker", voice: "alloy" }],
      questions: [
        {
          id: "q1",
          stem: "What advantage of online learning does the speaker note?",
          options: [
            { id: "a", text: "It is always cheaper than a classroom." },
            { id: "b", text: "Its flexibility — studying at your own pace and around a job." },
            { id: "c", text: "It removes the need for any teacher." },
          ],
          answer: "b",
        },
        {
          id: "q2",
          stem: "What does the speaker conclude the studies tend to find?",
          options: [
            { id: "a", text: "In-person learning always wins." },
            { id: "b", text: "Blending the two formats gives the best results." },
            { id: "c", text: "Online learning always wins." },
          ],
          answer: "b",
        },
      ],
    },
    guidanceNote:
      "When a talk presents two sides, the speaker's verdict usually arrives at the end — here, after 'what they more often find'.",
  },
];

async function main() {
  const res = await prisma.celpipItem.createMany({ data: ITEMS });
  console.log(`Seeded ${res.count} Listening item(s).`);
}

if (isDirectRun(import.meta.url)) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
