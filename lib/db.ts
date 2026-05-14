// lib/db.ts
// This file creates ONE shared database connection for the whole app.
// In development, Next.js restarts often — without this pattern,
// you'd create hundreds of connections and exhaust your Neon free tier.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"], // change to ["query", "error"] to see all SQL in terminal
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
