import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  console.log("=== CRIANDO TABELA DE FORNECEDOR E ADICIONANDO COLUNA NO TURSO ===");

  const queries = [
    // 1. Criar tabela Supplier
    `CREATE TABLE IF NOT EXISTS "Supplier" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "document" TEXT,
        "phone" TEXT,
        "email" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    // 2. Adicionar coluna supplierId na tabela Product
    `ALTER TABLE "Product" ADD COLUMN "supplierId" TEXT REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;`
  ];

  // Executar query 1 (Supplier table)
  try {
    console.log("Executando criação da tabela Supplier...");
    await client.execute(queries[0]);
    console.log("✅ Tabela Supplier criada com sucesso.");
  } catch (e: any) {
    console.error("❌ Erro ao criar tabela Supplier:", e.message);
  }

  // Executar query 2 (Adicionar coluna supplierId)
  try {
    console.log("Adicionando coluna supplierId na tabela Product...");
    await client.execute(queries[1]);
    console.log("✅ Coluna supplierId adicionada com sucesso.");
  } catch (e: any) {
    // Se der erro porque a coluna já existe, ignoramos
    if (e.message.includes("duplicate column") || e.message.includes("already exists")) {
      console.log("ℹ️ A coluna supplierId já existe na tabela Product.");
    } else {
      console.error("❌ Erro ao adicionar coluna supplierId:", e.message);
    }
  }

  console.log("\n=== MIGRAÇÃO CONCLUÍDA ===");
}

main().finally(() => {
  client.close();
});
