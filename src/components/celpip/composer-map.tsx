"use client";

// Render dispatch for the in-progress composer. The attempt page passes a
// SANITIZED payload (answer keys stripped server-side) and never branches on task
// type itself — the CelpipComposer handles every CELPIP task family.

export { CelpipComposer } from "@/components/celpip/CelpipComposer";
