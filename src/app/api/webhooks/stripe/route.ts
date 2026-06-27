import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { isBillingEnabled, priceIdToPlanLabel } from "@/lib/billing/plans";

// Stripe needs the raw request body for signature verification — must not
// run through Next's static optimization or any caching layer.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TRIAL_STATUSES = new Set(["trialing"]);
const ACTIVE_STATUSES = new Set(["trialing", "active"]);

function logPrefix(): string {
  return isBillingEnabled() ? "[stripe-webhook]" : "[stripe-webhook DRY-RUN]";
}

function toDateOrNull(unixSeconds: number | null | undefined): Date | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const found = await prisma.processedWebhook.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  return Boolean(found);
}

async function markProcessed(eventId: string, eventType: string): Promise<void> {
  try {
    await prisma.processedWebhook.create({
      data: { id: eventId, eventType },
    });
  } catch {
    // Race: another invocation already inserted. Safe to ignore.
  }
}

async function findUserByCustomerId(customerId: string): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
}

function statusToTier(status: string | null | undefined): "FREE" | "PREMIUM" {
  if (!status) return "FREE";
  return ACTIVE_STATUSES.has(status) ? "PREMIUM" : "FREE";
}

async function syncSubscriptionToUser(
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const item = subscription.items.data[0];
  const priceId = item?.price.id;
  const planLabel = priceId ? priceIdToPlanLabel(priceId) : null;

  const periodEndUnix =
    (subscription as Stripe.Subscription & { current_period_end?: number })
      .current_period_end ??
    (item as unknown as { current_period_end?: number } | undefined)
      ?.current_period_end ??
    null;
  const trialEndUnix = subscription.trial_end ?? null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPlan: planLabel,
      subscriptionCurrentPeriodEnd: toDateOrNull(periodEndUnix),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEndsAt: TRIAL_STATUSES.has(subscription.status)
        ? toDateOrNull(trialEndUnix)
        : null,
      subscriptionTier: statusToTier(subscription.status),
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const userIdFromMeta = session.metadata?.userId ?? null;

  if (!customerId || !subscriptionId) {
    console.error(`${logPrefix()} checkout.session.completed missing ids`, {
      hasCustomer: !!customerId,
      hasSubscription: !!subscriptionId,
    });
    return;
  }

  let userId: string | null = userIdFromMeta;
  if (!userId) {
    const user = await findUserByCustomerId(customerId);
    userId = user?.id ?? null;
  }
  if (!userId) {
    console.error(`${logPrefix()} no user matched checkout session`, {
      customerId,
      subscriptionId,
    });
    return;
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionToUser(userId, subscription);
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`${logPrefix()} no user for subscription event`, {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }
  await syncSubscriptionToUser(user.id, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`${logPrefix()} no user for subscription.deleted`, {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "canceled",
      subscriptionPlan: null,
      subscriptionCancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      subscriptionTier: "FREE",
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`${logPrefix()} no user for invoice.payment_failed`, {
      invoiceId: invoice.id,
      customerId,
    });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: "past_due", subscriptionTier: "FREE" },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`${logPrefix()} no user for invoice.payment_succeeded`, {
      invoiceId: invoice.id,
      customerId,
    });
    return;
  }
  // Renewal succeeded — touch updatedAt so dashboards reflect activity.
  await prisma.user.update({
    where: { id: user.id },
    data: { updatedAt: new Date() },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.length < 10) {
    console.error(`${logPrefix()} STRIPE_WEBHOOK_SECRET not configured`);
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    console.error(`${logPrefix()} missing stripe-signature header`);
    return new NextResponse("Missing signature", { status: 400 });
  }

  // Raw body required for signature verification — do NOT JSON.parse first.
  const rawBody = await request.text();

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`${logPrefix()} signature verification failed:`, {
      message: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (await alreadyProcessed(event.id)) {
    console.log(`${logPrefix()} already processed, skipping`, {
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  console.log(`${logPrefix()} processing event`, {
    eventId: event.id,
    eventType: event.type,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`${logPrefix()} unhandled event type`, { eventType: event.type });
    }

    await markProcessed(event.id, event.type);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`${logPrefix()} handler failed`, {
      eventId: event.id,
      eventType: event.type,
      message: err instanceof Error ? err.message : String(err),
    });
    // Return 500 so Stripe retries. Do NOT mark processed.
    return new NextResponse("Handler failed", { status: 500 });
  }
}
