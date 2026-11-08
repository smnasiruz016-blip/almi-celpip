-- RR-399 A3: the free AI use, reserved atomically (one row per account and kind). Additive only: a new table, nothing else changes.
CREATE TABLE IF NOT EXISTS "FreeAiUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FreeAiUse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FreeAiUse_userId_kind_key" ON "FreeAiUse"("userId", "kind");
CREATE INDEX IF NOT EXISTS "FreeAiUse_createdAt_idx" ON "FreeAiUse"("createdAt");
