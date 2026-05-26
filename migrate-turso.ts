import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  console.log("=== CRIANDO NOVAS TABELAS DE O.S. E CLIENTES NO TURSO ===");

  const queries = [
    // 1. Client Table
    `CREATE TABLE IF NOT EXISTS "Client" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "document" TEXT,
        "phone" TEXT NOT NULL,
        "email" TEXT,
        "cep" TEXT,
        "address" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    // 2. ServiceOrder Table
    `CREATE TABLE IF NOT EXISTS "ServiceOrder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "osNumber" INTEGER NOT NULL,
        "companyId" TEXT NOT NULL,
        "unitId" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "userId" TEXT,
        "equipmentType" TEXT NOT NULL,
        "equipmentBrand" TEXT NOT NULL,
        "equipmentModel" TEXT NOT NULL,
        "equipmentSerial" TEXT,
        "equipmentColor" TEXT,
        "equipmentPassword" TEXT,
        "reportedDefect" TEXT NOT NULL,
        "physicalState" TEXT,
        "accessories" TEXT,
        "checklist" TEXT NOT NULL DEFAULT '{}',
        "status" TEXT NOT NULL DEFAULT 'BUDGET',
        "technicalReport" TEXT,
        "servicePrice" REAL NOT NULL DEFAULT 0,
        "partsPrice" REAL NOT NULL DEFAULT 0,
        "discount" REAL NOT NULL DEFAULT 0,
        "prepayment" REAL NOT NULL DEFAULT 0,
        "totalAmount" REAL NOT NULL DEFAULT 0,
        "paymentMethod" TEXT,
        "installments" INTEGER NOT NULL DEFAULT 1,
        "cardFee" REAL NOT NULL DEFAULT 0,
        "warrantyPeriod" INTEGER NOT NULL DEFAULT 0,
        "warrantyExpiresAt" DATETIME,
        "warrantyTerms" TEXT,
        "warrantyStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ServiceOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ServiceOrder_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ServiceOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ServiceOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,

    // 3. ServiceOrderItem Table
    `CREATE TABLE IF NOT EXISTS "ServiceOrderItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "serviceOrderId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitPrice" REAL NOT NULL,
        "unitCost" REAL NOT NULL DEFAULT 0,
        CONSTRAINT "ServiceOrderItem_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ServiceOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      console.log(`Executando query ${i + 1}...`);
      await client.execute(queries[i]);
      console.log(`✅ Query ${i + 1} executada com sucesso.`);
    } catch (e: any) {
      console.error(`❌ Erro na query ${i + 1}:`, e.message);
    }
  }

  console.log("\n=== COMPLETO ===");
}

main().finally(() => {
  client.close();
});
