import { prisma } from "./src/lib/prisma";

async function test() {
  console.log("Fetching users...");
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
        name: user.name + " Test",
        unitId: user.unitId || null,
        role: user.role,
        permissions: user.permissions
      }
    });
    console.log("Update SUCCESS!");
  } catch (e: any) {
    console.error("Update FAILED:", e.message);
  }
}

test().finally(() => console.log("Done"));
