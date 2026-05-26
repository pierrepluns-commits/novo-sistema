import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  console.log("=== ADICIONANDO COLUNAS DE PAGAMENTO DIRETAMENTE NO TURSO ===");
  
  const columns = [
    { name: "paymentGateway", type: "TEXT DEFAULT 'SIMULATOR'" },
    { name: "gatewayApiKey", type: "TEXT" },
    { name: "webhookSecret", type: "TEXT" },
    { name: "pixKey", type: "TEXT" }
  ];

  for (const col of columns) {
    try {
      console.log(`Adicionando coluna ${col.name}...`);
      await client.execute(`ALTER TABLE SystemConfig ADD COLUMN ${col.name} ${col.type};`);
      console.log(`✅ Coluna ${col.name} adicionada com sucesso.`);
    } catch (e: any) {
      console.log(`⚠️ Coluna ${col.name} pode já existir ou erro:`, e.message);
    }
  }

  console.log("\n=== CONCLUÍDO ===");
}

main().finally(() => {
  client.close();
});
