import { PrismaClient } from "@prisma/client";

// Singleton pattern for Next.js dev — prevents the "too many connections"
// error when hot-reloading. In production each lambda gets its own client.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
