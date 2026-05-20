declare var jest: any;

import { prisma } from "./src/lib/prisma";
import { updateUser } from "./src/app/actions/user";

// Mock the Next.js cache and auth
jest.mock('next/cache', () => ({
  revalidatePath: () => { }
}));
jest.mock('./src/lib/auth', () => ({
  getSession: async () => ({ companyId: "some-id", role: "COMPANY_ADMIN" })
}));

async function test() {
  const users = await prisma.user.findMany({ take: 1 });
  if (!users.length) return;

  const user = users[0];

  const fd = new FormData();
  fd.append("id", user.id);
  fd.append("name", user.name);
  fd.append("email", user.email);
  fd.append("role", user.role);
  if (user.unitId) fd.append("unitId", user.unitId);
  fd.append("permissions", "PDV_ACCESS");

  console.log("Calling updateUser...");
  // This will fail because we are outside Next.js environment, 
  // but let's see.
}
