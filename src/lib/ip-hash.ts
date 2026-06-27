import { createHash } from "node:crypto";

let warned = false;

export function getIpHash(ip: string): string | null {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    if (!warned) {
      warned = true;
      console.warn(
        "IP_HASH_SALT missing — IP hashes disabled. Public endpoint rate limiting weakened.",
      );
    }
    return null;
  }
  return createHash("sha256").update(salt + ip).digest("hex");
}
