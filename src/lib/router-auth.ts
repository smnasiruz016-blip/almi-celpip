import { createHmac, timingSafeEqual } from "node:crypto";

// Accept events forwarded by almi-billing-router (the consolidated Stripe webhook). Scheme mirrors
// Stripe's: header "X-Almi-Router-Signature: t=<unix>,v1=<hex>", HMAC-SHA256 of `${t}.${rawBody}`
// with ROUTER_WEBHOOK_SECRET, 5-minute replay guard. Returns false (fall back to Stripe verify) on
// any problem — never throws.
export function verifyRouterSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.ROUTER_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
