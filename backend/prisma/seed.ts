import { PrismaClient, Role, Status, LotType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed de Carnicería ---');

  // 1. Usuarios solicitados por el usuario:
  // Admin: admin / admin
  const adminPasswordHash = await bcrypt.hash('admin', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password_hash: adminPasswordHash,
      role: Role.ADMIN,
      status: Status.ACTIVE,
    },
    create: {
      username: 'admin',
      password_hash: adminPasswordHash,
      name: 'Administrador General',
      role: Role.ADMIN,
      status: Status.ACTIVE,
    },
  });
  console.log(`✓ Usuario Admin actualizado: ${adminUser.username} (clave: admin)`);

  // Vendedor: vendedor / 12345
  const vendedorPasswordHash = await bcrypt.hash('12345', 10);
  const vendedorUser = await prisma.user.upsert({
    where: { username: 'vendedor' },
    update: {
      password_hash: vendedorPasswordHash,
      role: Role.VENDEDOR,
      status: Status.ACTIVE,
    },
    create: {
      username: 'vendedor',
      password_hash: vendedorPasswordHash,
      name: 'Vendedor Principal',
      role: Role.VENDEDOR,
      status: Status.ACTIVE,
    },
  });
  console.log(`✓ Usuario Vendedor actualizado: ${vendedorUser.username} (clave: 12345)`);

  // 2. Configuración Inicial del Negocio
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      business_name: 'Carnicería',
      theme_color: 'red',
      receipt_note: '¡Gracias por su compra!',
    },
  });
  console.log('✓ Configuración inicial del negocio registrada.');

  // 3. Categorías Generales
  const categories = [
    { name: 'Res', description: 'Productos generales de Res (hamburguesas, etc.)' },
    { name: 'Cerdo', description: 'Productos generales de Cerdo (tocino, etc.)' },
    { name: 'Pollo', description: 'Pollo entero, pechuga, muslos, etc.' },
    { name: 'Embutidos', description: 'Chorizos, salchichas, morcillas, etc.' },
    { name: 'Bebidas', description: 'Gaseosas, jugos, agua, etc.' },
    { name: 'Otros', description: 'Condimentos, carbón, salsas y productos variados' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: {
        name: cat.name,
        description: cat.description,
        status: Status.ACTIVE,
      },
    });
  }
  console.log(`✓ ${categories.length} Categorías registradas.`);

  // 4. Catálogo de Cortes de Res
  const beefCuts = [
    'Chatas',
    'Punta de anca',
    'Lomo fino',
    'Cadera',
    'Centro de pierna',
    'Bcla',
    'Muchacho',
    'Sobrebarriga',
    'Costilla',
    'Pecho',
    'Falda',
    'Morillo',
    'Carne para moler',
    'Hueso',
    'Grasa',
  ];

  for (const cutName of beefCuts) {
    await prisma.cutCatalog.upsert({
      where: {
        name_meat_type: {
          name: cutName,
          meat_type: LotType.BEEF,
        },
      },
      update: {},
      create: {
        name: cutName,
        meat_type: LotType.BEEF,
        status: Status.ACTIVE,
      },
    });
  }

  // 5. Catálogo de Cortes de Cerdo
  const porkCuts = ['Pierna', 'Lomo', 'Costilla', 'Milanesa', 'Pezuña'];

  for (const cutName of porkCuts) {
    await prisma.cutCatalog.upsert({
      where: {
        name_meat_type: {
          name: cutName,
          meat_type: LotType.PORK,
        },
      },
      update: {},
      create: {
        name: cutName,
        meat_type: LotType.PORK,
        status: Status.ACTIVE,
      },
    });
  }

  console.log('--- Seed completado con éxito ---');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
