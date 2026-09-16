import { prisma } from './src/config/prisma.js';
import { runInitialSeed } from './src/services/seed.service.js';

async function main() {
  console.log('--- Iniciando Seed de Carnicería ---');
  const result = await runInitialSeed();
  console.log(result.message);
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
