const { createClient } = require("@libsql/client");
require("dotenv").config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("=== ADICIONANDO COLUNA 'cost' NA TABELA 'ServiceOrder' NO TURSO ===");
  try {
    const query = 'ALTER TABLE "ServiceOrder" ADD COLUMN "cost" REAL NOT NULL DEFAULT 0;';
    console.log("Executando ALTER TABLE...");
    await client.execute(query);
    console.log("✅ Coluna 'cost' adicionada com sucesso!");
  } catch (error) {
    if (error.message.includes("duplicate column name") || error.message.includes("already exists")) {
      console.log("ℹ️ A coluna 'cost' já existe na tabela 'ServiceOrder'.");
    } else {
      console.error("❌ Erro ao adicionar coluna:", error.message);
    }
  }
}

main().finally(() => {
  client.close();
});
