// Owner allowlist — comma-separated emails in the OWNER_EMAILS env var.
//
// An OWNER gets unlimited usage + premium-tier treatment on their own product:
// they bypass the free-tier daily evaluation limits and any "upgrade to Pro"
// gate, for testing, demos, and daily use. This is distinct from ADMIN_EMAILS
// (which gates the /admin/* panel — see src/lib/founder.ts). A user can be in
// BOTH lists; the founder is.
//
// Pattern mirrors isAdmin(): single source of truth, case-insensitive, safe
// when the env var is unset (returns false → normal free-tier behavior).
export function isOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.OWNER_EMAILS;
  if (!raw) return false;
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
