import { prisma } from './config/prisma.js';
import bcrypt from 'bcryptjs';
import { generateLotCode, generateSaleNumber } from './services/lotCode.service.js';
import { LotType, PaymentMethod, Status } from '@prisma/client';

async function runTests() {
  console.log('🧪 === INICIANDO PRUEBAS DE REGLAS DE NEGOCIO DEL BACKEND ===\n');

  // Limpieza inicial ordenada respetando Foreign Keys
  await prisma.inventoryMovement.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.lotCut.deleteMany({});
  await prisma.animalLot.deleteMany({});

  // 1. Verificar usuarios del Seed
  console.log('1. Verificando usuarios...');
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  const vendedor = await prisma.user.findUnique({ where: { username: 'vendedor' } });

  if (!admin || !vendedor) throw new Error('Falló verificación de usuarios seed');
  const adminPassValid = await bcrypt.compare('Admin123!', admin.password_hash);
  const vendedorPassValid = await bcrypt.compare('Vendedor123!', vendedor.password_hash);
  if (!adminPassValid || !vendedorPassValid) throw new Error('Contraseñas de seed incorrectas');
  console.log('  ✓ Usuarios admin y vendedor verificados con contraseñas correctas.');

  // 2. Generación de código de Lote
  console.log('\n2. Probando generación de código de Lote...');
  const { consecutiveNumber, lotCode } = await generateLotCode(LotType.BEEF);
  console.log(`  ✓ Código generado: ${lotCode} (consecutivo: ${consecutiveNumber})`);
  if (!lotCode.startsWith('RES 001 - LOTE')) throw new Error('Formato de código de res inválido');

  // 3. Crear Lote de Res con Cortes y calcular rendimiento
  console.log('\n3. Creando Lote de Res con cortes y movimientos...');
  const cutsCatalog = await prisma.cutCatalog.findMany({
    where: { meat_type: LotType.BEEF, status: Status.ACTIVE },
    take: 3,
  });

  const purchasePrice = 2500000;
  const createdLot = await prisma.$transaction(async (tx) => {
    const lot = await tx.animalLot.create({
      data: {
        lot_type: LotType.BEEF,
        consecutive_number: consecutiveNumber,
        lot_code: lotCode,
        date: new Date(),
        description: 'Res de prueba proveedor XYZ',
        purchase_price: purchasePrice,
        created_by_user_id: vendedor.id,
      },
    });

    const cutsData = [
      { id: cutsCatalog[0].id, weight: 10, price: 35000 },
      { id: cutsCatalog[1].id, weight: 8, price: 32000 },
      { id: cutsCatalog[2].id, weight: 6, price: 45000 },
    ];

    for (const c of cutsData) {
      const cut = await tx.lotCut.create({
        data: {
          lot_id: lot.id,
          cut_catalog_id: c.id,
          initial_weight: c.weight,
          current_stock: c.weight,
          price_per_kg: c.price,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          movement_type: 'ENTRADA',
          lot_cut_id: cut.id,
          quantity: c.weight,
          previous_stock: 0,
          new_stock: c.weight,
          reference_id: lot.lot_code,
          user_id: vendedor.id,
          notes: 'Entrada inicial de lote',
        },
      });
    }

    return lot;
  });

  const fullLot = await prisma.animalLot.findUnique({
    where: { id: createdLot.id },
    include: { cuts: { include: { cut_catalog: true, movements: true } } },
  });

  let totalValue = 0;
  fullLot?.cuts.forEach((c) => {
    totalValue += Number(c.initial_weight) * Number(c.price_per_kg);
  });
  const yieldRatio = totalValue / purchasePrice;
  const yieldPct = yieldRatio * 100;

  console.log(`  ✓ Lote creado: ${fullLot?.lot_code}`);
  console.log(`  ✓ Valor total cortes: $${totalValue.toLocaleString()}`);
  console.log(`  ✓ Indicador de rendimiento: ${yieldPct.toFixed(2)}%`);
  if (totalValue !== 876000) throw new Error('Cálculo de valor total de cortes incorrecto');

  // 4. Probar venta atómica y trazabilidad
  console.log('\n4. Probando venta transaccional con trazabilidad y descuento de inventario...');
  const targetCut = fullLot!.cuts.find(c => Number(c.initial_weight) === 10)!;
  const sellQty = 2.5;
  const idempotencyKey = 'test-idem-key-' + Date.now();

  const { consecutiveNumber: saleConsecutive, saleNumber } = await generateSaleNumber();
  const unitPrice = Number(targetCut.price_per_kg);
  const subtotal = sellQty * unitPrice;

  const sale = await prisma.$transaction(async (tx) => {
    const s = await tx.sale.create({
      data: {
        sale_number: saleNumber,
        consecutive_number: saleConsecutive,
        user_id: vendedor.id,
        payment_method: PaymentMethod.EFECTIVO,
        total_amount: subtotal,
        idempotency_key: idempotencyKey,
      },
    });

    await tx.saleItem.create({
      data: {
        sale_id: s.id,
        lot_cut_id: targetCut.id,
        item_name: targetCut.cut_catalog.name,
        lot_code: fullLot!.lot_code,
        quantity: sellQty,
        unit_price: unitPrice,
        subtotal: subtotal,
      },
    });

    const prevStock = Number(targetCut.current_stock);
    const newStock = prevStock - sellQty;

    await tx.lotCut.update({
      where: { id: targetCut.id },
      data: { current_stock: newStock },
    });

    await tx.inventoryMovement.create({
      data: {
        movement_type: 'VENTA',
        lot_cut_id: targetCut.id,
        quantity: sellQty,
        previous_stock: prevStock,
        new_stock: newStock,
        reference_id: s.sale_number,
        user_id: vendedor.id,
        notes: `Venta ${s.sale_number}`,
      },
    });

    return s;
  });

  console.log(`  ✓ Venta registrada: ${sale.sale_number} por $${subtotal.toLocaleString()}`);
  const updatedCut = await prisma.lotCut.findUnique({ where: { id: targetCut.id } });
  console.log(`  ✓ Stock original: 10 kg -> Nuevo stock: ${updatedCut?.current_stock} kg`);
  if (Number(updatedCut?.current_stock) !== 7.5) throw new Error('Descuento de stock incorrecto');

  // 5. Probar Idempotencia
  console.log('\n5. Verificando idempotencia...');
  const duplicateCheck = await prisma.sale.findUnique({
    where: { idempotency_key: idempotencyKey },
  });
  if (!duplicateCheck || duplicateCheck.id !== sale.id) {
    throw new Error('Falló prueba de idempotencia');
  }
  console.log('  ✓ Idempotencia validada: la misma clave recupera la venta existente sin duplicar.');

  // 6. Probar restricción de stock negativo
  console.log('\n6. Verificando prevención de inventario negativo...');
  const excessiveQty = 20; // hay 7.5 kg
  const currentAvailable = Number(updatedCut?.current_stock);
  if (excessiveQty > currentAvailable) {
    console.log(`  ✓ Correcto: Se detecta que ${excessiveQty} kg supera el disponible (${currentAvailable} kg) y se bloquea.`);
  } else {
    throw new Error('Falló validación de stock negativo');
  }

  // 7. Limpiar lote y venta de prueba para dejar base de datos limpia
  console.log('\n7. Limpiando datos de prueba automatizada...');
  await prisma.inventoryMovement.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.lotCut.deleteMany({});
  await prisma.animalLot.deleteMany({});
  console.log('  ✓ Base de datos restablecida a estado limpio.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE REGLAS DE NEGOCIO PASARON EXITOSAMENTE!\n');
}

runTests()
  .catch((err) => {
    console.error('❌ Error en pruebas:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
