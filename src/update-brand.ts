import { prisma } from "./lib/prisma";

async function run() {
  console.log("Updating SystemConfig for CyberERP in the database...");
  
  const plans = [
    { id: "BASIC", name: "Básico", price: 49.90, maxUnits: 1, desc: "Para pequenos comércios ou MEI. Permite 1 unidade/loja." },
    { id: "PRO", name: "Pro", price: 99.90, maxUnits: 5, desc: "Para empresas em crescimento. Permite até 5 unidades/lojas." },
    { id: "ENTERPRISE", name: "Enterprise", price: 199.90, maxUnits: 99, desc: "Gestão ilimitada para redes e franquias. Unidades ilimitadas." }
  ];

  const config = await prisma.systemConfig.upsert({
    where: { id: "default" },
    update: {
      appName: "CyberERP",
      primaryColor: "#00f3ff", // Neon Blue / Cyan
      secondaryColor: "#0055ff", // Premium Cyber Blue
      plansConfig: JSON.stringify(plans)
    },
    create: {
      id: "default",
      appName: "CyberERP",
      primaryColor: "#00f3ff",
      secondaryColor: "#0055ff",
      plansConfig: JSON.stringify(plans)
    }
  });

  console.log("SystemConfig updated successfully:", config);
}

run()
  .catch((e) => {
    console.error("Error updating branding database record:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
