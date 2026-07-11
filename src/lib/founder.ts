// Founder/admin allowlist. Comma-separated emails in ADMIN_EMAILS env var.
// Pattern mirrors AlmiCV's owner.ts â single source of truth for who can
// see /admin/* routes.

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  if (email.toLowerCase() === "almiworld@almiworld.com") return true; // canonical founder — always admin
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return false;
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
