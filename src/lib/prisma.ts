import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const dbPath = process.env.DATABASE_URL || "file:./dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  
  const adapter = new PrismaLibSql({
    url: dbPath,
    authToken: authToken,
  });
  
  return new PrismaClient({ adapter, log: ["query"] });
};

export const prisma = createPrismaClient();

// Temporarily bypass global cache to force Next.js to use the newly generated client.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
