import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbPath = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaLibSql({ url: dbPath });
const prisma = new PrismaClient({ adapter, log: ["query"] });

async function test() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) {
    console.log("No users found");
    return;
  }

  const user = users[0];
  console.log("Trying to update user:", user.id);
  
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        role: user.role,
        permissions: "[\"TEST\"]",
      }
    });
    console.log("Update SUCCESS!");
  } catch (e) {
    console.error("Update FAILED:");
    console.error(e);
  }
}

test().finally(() => prisma.$disconnect());
