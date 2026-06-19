"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 1. Create Client Action
export async function createClientAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const cep = formData.get("cep") as string;
  const address = formData.get("address") as string;

  if (!name || !name.trim()) {
    return { error: "Nome/Razão Social é obrigatório." };
  }
  if (!phone || !phone.trim()) {
    return { error: "Celular (WhatsApp) é obrigatório." };
  }

  // Pre-validate unique document (CPF/CNPJ) or email within the company
  try {
    if (document && document.trim()) {
      const existingClientByDoc = await prisma.client.findFirst({
        where: { 
          companyId: session.companyId,
          document: document.trim()
        }
      });
      if (existingClientByDoc) {
        return { error: "Já existe um cliente cadastrado com este CPF/CNPJ." };
      }
    }
    
    if (email && email.trim()) {
      const existingClientByEmail = await prisma.client.findFirst({
        where: {
          companyId: session.companyId,
          email: email.trim()
        }
      });
      if (existingClientByEmail) {
        return { error: "Já existe um cliente cadastrado com este e-mail." };
      }
    }
  } catch (err: any) {
    return { error: "Erro de validação: " + err.message };
  }

  try {
    const client = await prisma.client.create({
      data: {
        companyId: session.companyId,
        name: name.trim(),
        document: document ? document.trim() : null,
        phone: phone.trim(),
        email: email ? email.trim() : null,
        cep: cep ? cep.trim() : null,
        address: address ? address.trim() : null,
      },
    });

    revalidatePath("/clientes");
    return { success: true, client };
  } catch (error: any) {
    return { error: "Erro ao cadastrar cliente: " + error.message };
  }
}

// 2. Update Client Action
export async function updateClientAction(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const cep = formData.get("cep") as string;
  const address = formData.get("address") as string;

  if (!name || !name.trim()) {
    return { error: "Nome/Razão Social é obrigatório." };
  }
  if (!phone || !phone.trim()) {
    return { error: "Celular (WhatsApp) é obrigatório." };
  }

  // Pre-validate unique document (CPF/CNPJ) or email within the company, excluding the current client
  try {
    if (document && document.trim()) {
      const existingClientByDoc = await prisma.client.findFirst({
        where: { 
          companyId: session.companyId,
          document: document.trim(),
          id: { not: id }
        }
      });
      if (existingClientByDoc) {
        return { error: "Já existe um cliente cadastrado com este CPF/CNPJ." };
      }
    }
    
    if (email && email.trim()) {
      const existingClientByEmail = await prisma.client.findFirst({
        where: {
          companyId: session.companyId,
          email: email.trim(),
          id: { not: id }
        }
      });
      if (existingClientByEmail) {
        return { error: "Já existe um cliente cadastrado com este e-mail." };
      }
    }
  } catch (err: any) {
    return { error: "Erro de validação: " + err.message };
  }

  try {
    await prisma.client.update({
      where: { id, companyId: session.companyId },
      data: {
        name: name.trim(),
        document: document ? document.trim() : null,
        phone: phone.trim(),
        email: email ? email.trim() : null,
        cep: cep ? cep.trim() : null,
        address: address ? address.trim() : null,
      },
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao atualizar cliente: " + error.message };
  }
}

// 3. Delete Client Action
export async function deleteClientAction(id: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return { error: "Sessão inválida ou expirada." };
  }

  try {
    await prisma.client.delete({
      where: { id, companyId: session.companyId },
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error: any) {
    return { error: "Erro ao excluir cliente: " + error.message };
  }
}

// 4. Search Clients in Balcão
export async function searchClientsAction(query: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return [];
  }

  if (!query || !query.trim()) return [];

  const cleanQuery = query.toLowerCase().trim();

  try {
    const clients = await prisma.client.findMany({
      where: {
        companyId: session.companyId,
        OR: [
          { name: { contains: cleanQuery } },
          { document: { contains: cleanQuery } },
          { phone: { contains: cleanQuery } },
        ],
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return clients;
  } catch (err) {
    console.error("Search clients failed:", err);
    return [];
  }
}

// 5. Get Client O.S. History Timeline
export async function getClientHistoryAction(clientId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    return [];
  }

  try {
    const osList = await prisma.serviceOrder.findMany({
      where: {
        clientId,
        companyId: session.companyId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        unit: true,
        user: true,
      },
    });
    return osList;
  } catch (err) {
    console.error("Get client history failed:", err);
    return [];
  }
}
