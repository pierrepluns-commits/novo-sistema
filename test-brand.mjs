import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbPath = "file:./dev.db";
const adapter = new PrismaLibSql({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function run() {
  const configs = await prisma.systemConfig.findMany();
  console.log("All configurations in database:", JSON.stringify(configs, null, 2));
}

run().finally(() => prisma.$disconnect());
