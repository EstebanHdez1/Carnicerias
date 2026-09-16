import { LotType, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export async function generateLotCode(
  lotType: LotType,
  date = new Date(),
  customPrisma: PrismaClient | any = prisma
): Promise<{ consecutiveNumber: number; lotCode: string }> {
  // Format date as MMDDYY
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const dateStr = `${month}${day}${year}`;

  const prefix = lotType === LotType.BEEF ? 'RES' : 'CER';

  // Get max consecutive_number for this lotType
  const lastLot = await customPrisma.animalLot.findFirst({
    where: { lot_type: lotType },
    orderBy: { consecutive_number: 'desc' },
    select: { consecutive_number: true },
  });

  const consecutiveNumber = (lastLot?.consecutive_number ?? 0) + 1;
  const consecutiveStr = String(consecutiveNumber).padStart(3, '0');
  const lotCode = `${prefix} ${consecutiveStr} - LOTE ${dateStr}`;

  return {
    consecutiveNumber,
    lotCode,
  };
}

export async function generateSaleNumber(
  customPrisma: PrismaClient | any = prisma
): Promise<{ consecutiveNumber: number; saleNumber: string }> {
  const lastSale = await customPrisma.sale.findFirst({
    orderBy: { consecutive_number: 'desc' },
    select: { consecutive_number: true },
  });

  const consecutiveNumber = (lastSale?.consecutive_number ?? 0) + 1;
  const consecutiveStr = String(consecutiveNumber).padStart(5, '0');
  const saleNumber = `VENTA #${consecutiveStr}`;

  return {
    consecutiveNumber,
    saleNumber,
  };
}
