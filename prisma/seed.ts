import { prisma } from '../src/lib/prisma'

async function main() {
  // Limpar dados existentes
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.financialTransaction.deleteMany()
  await prisma.stock.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.company.deleteMany()

  // 1. Criar Empresa
  const company = await prisma.company.create({
    data: {
      name: 'Minha Empresa Matriz',
      document: '00.000.000/0001-00'
    }
  })

  // 2. Criar Unidades
  const unit1 = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: 'Unidade Centro (Sede)',
      document: '11.111.111/0001-11',
      address: 'Avenida Principal, 1000 - Centro',
      contact: '(11) 99999-9999',
      isHeadquarters: true
    }
  })

  const unit2 = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: 'Unidade Shopping',
      document: '22.222.222/0002-22',
      address: 'Shopping Center Sul, Loja 15',
      contact: '(11) 88888-8888',
      isHeadquarters: false
    }
  })

  // 3. Criar Usuários
  // Mestre
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'pierrepluns@gmail.com',
      password_hash: '#Obliviate25', // Em prod usar bcrypt
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(['ALL'])
    }
  })

  // Admin da Empresa
  await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Dono da Empresa',
      email: 'admin@empresa.com',
      password_hash: 'senha123',
      role: 'COMPANY_ADMIN',
      permissions: JSON.stringify(['ALL'])
    }
  })

  // Funcionário Unidade 1
  const userUnit1 = await prisma.user.create({
    data: {
      companyId: company.id,
      unitId: unit1.id,
      name: 'Caixa Centro',
      email: 'caixa1@empresa.com',
      password_hash: 'senha123',
      role: 'CASHIER',
      permissions: JSON.stringify(['PDV_ACCESS', 'VIEW_STOCK'])
    }
  })

  // 4. Criar Produtos e Estoques
  const product1 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Coca-Cola 2L',
      sku: '001',
      price: 10.0,
      cost: 5.0,
      stocks: {
        create: [
          { unitId: unit1.id, quantity: 50 },
          { unitId: unit2.id, quantity: 20 }
        ]
      }
    }
  })

  const product2 = await prisma.product.create({
    data: {
      companyId: company.id,
      name: 'Cerveja Lata',
      sku: '002',
      price: 5.0,
      cost: 2.5,
      stocks: {
        create: [
          { unitId: unit1.id, quantity: 100 },
          { unitId: unit2.id, quantity: 0 }
        ]
      }
    }
  })

  console.log('Seed realizado com sucesso!')
  console.log(`Empresa: ${company.name}`)
  console.log(`Unidades: ${unit1.name}, ${unit2.name}`)
  console.log(`Caixa 1: ${userUnit1.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
