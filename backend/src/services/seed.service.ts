import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { Role, Status, LotType } from '@prisma/client';

export async function runInitialSeed() {
  // 1. Usuarios: admin / admin y vendedor / 12345
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

  const vendedorPasswordHash = await bcrypt.hash('12345', 10);
  await prisma.user.upsert({
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

  return {
    adminUser: adminUser.username,
    message: 'Base de datos inicializada con éxito con usuario admin/admin',
  };
}