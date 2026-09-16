import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { LotType, MovementType, Prisma, Status } from '@prisma/client';
import { generateLotCode } from '../services/lotCode.service.js';
import { recordAuditLog } from '../services/audit.service.js';

const cutItemSchema = z.object({
  cut_catalog_id: z.string().uuid('ID de corte de catálogo inválido'),
  initial_weight: z.number().positive('El peso debe ser mayor a 0'),
  price_per_kg: z.number().positive('El precio por kg debe ser mayor a 0'),
});

const createLotSchema = z.object({
  lot_type: z.nativeEnum(LotType, { errorMap: () => ({ message: 'Tipo de lote inválido (BEEF o PORK)' }) }),
  date: z.string().optional(),
  description: z.string().optional(),
  purchase_price: z.number().positive('El precio de compra debe ser mayor a 0'),
  cuts: z.array(cutItemSchema).min(1, 'Debe incluir al menos un corte para el lote'),
});

const updateLotSchema = z.object({
  description: z.string().optional(),
  purchase_price: z.number().positive().optional(),
  status: z.nativeEnum(Status).optional(),
});

export async function previewNextLotCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotType = (req.query.type as LotType) || LotType.BEEF;
    const { consecutiveNumber, lotCode } = await generateLotCode(lotType);
    res.json({ success: true, consecutiveNumber, lotCode });
  } catch (error) {
    next(error);
  }
}

export async function listLots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lot_type, status, search } = req.query;

    const where: any = {};
    if (lot_type && typeof lot_type === 'string') {
      where.lot_type = lot_type as LotType;
    }
    if (status && typeof status === 'string') {
      where.status = status as Status;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { lot_code: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const lots = await prisma.animalLot.findMany({
      where,
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        cuts: {
          include: { cut_catalog: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Compute summary metrics for each lot
    const enrichedLots = lots.map((lot) => {
      let totalCutsWeight = 0;
      let totalCurrentStock = 0;
      let totalEstimatedValue = 0;

      lot.cuts.forEach((cut) => {
        const weight = Number(cut.initial_weight);
        const stock = Number(cut.current_stock);
        const price = Number(cut.price_per_kg);
        totalCutsWeight += weight;
        totalCurrentStock += stock;
        totalEstimatedValue += weight * price;
      });

      const purchasePrice = Number(lot.purchase_price);
      const difference = totalEstimatedValue - purchasePrice;
      const yieldRatio = purchasePrice > 0 ? totalEstimatedValue / purchasePrice : 0;
      const yieldPercentage = yieldRatio * 100;

      const totalCurrentStockRounded = Number(totalCurrentStock.toFixed(3));
      const isDepleted = totalCurrentStockRounded <= 0;
      const isActuallyActive = !isDepleted && lot.status === Status.ACTIVE;

      // Auto-sync lot status in database if depleted
      if (isDepleted && lot.status === Status.ACTIVE) {
        prisma.animalLot.update({
          where: { id: lot.id },
          data: { status: Status.INACTIVE },
        }).catch(() => {});
      }

      return {
        ...lot,
        status: isActuallyActive ? Status.ACTIVE : Status.INACTIVE,
        metrics: {
          purchase_price: purchasePrice,
          total_cuts_weight: Number(totalCutsWeight.toFixed(3)),
          total_current_stock: totalCurrentStockRounded,
          total_estimated_value: Number(totalEstimatedValue.toFixed(2)),
          difference: Number(difference.toFixed(2)),
          yield_ratio: Number(yieldRatio.toFixed(4)),
          yield_percentage: Number(yieldPercentage.toFixed(2)),
          is_depleted: isDepleted,
          is_active: isActuallyActive,
        },
      };
    });

    let filteredLots = enrichedLots;
    if (status === 'ACTIVE') {
      filteredLots = enrichedLots.filter((l) => l.metrics.is_active);
    } else if (status === 'INACTIVE' || status === 'DEPLETED') {
      filteredLots = enrichedLots.filter((l) => l.metrics.is_depleted);
    }

    res.json({ success: true, lots: filteredLots });
  } catch (error) {
    next(error);
  }
}

export async function getLotById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const lot = await prisma.animalLot.findUnique({
      where: { id },
      include: {
        created_by: { select: { id: true, name: true, username: true } },
        cuts: {
          include: {
            cut_catalog: true,
            movements: {
              include: { user: { select: { id: true, name: true } } },
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
    });

    if (!lot) {
      throw new AppError('Lote no encontrado.', 404);
    }

    let totalCutsWeight = 0;
    let totalCurrentStock = 0;
    let totalEstimatedValue = 0;

    const enrichedCuts = lot.cuts.map((cut) => {
      const initialWeight = Number(cut.initial_weight);
      const currentStock = Number(cut.current_stock);
      const pricePerKg = Number(cut.price_per_kg);
      const cutValue = initialWeight * pricePerKg;

      totalCutsWeight += initialWeight;
      totalCurrentStock += currentStock;
      totalEstimatedValue += cutValue;

      // Group movements to calculate totals
      let soldWeight = 0;
      let mermaWeight = 0;
      let adjustmentsWeight = 0;

      cut.movements.forEach((mov) => {
        const qty = Number(mov.quantity);
        if (mov.movement_type === MovementType.VENTA) {
          soldWeight += qty;
        } else if (mov.movement_type === MovementType.MERMA) {
          mermaWeight += qty;
        } else if (mov.movement_type === MovementType.AJUSTE) {
          adjustmentsWeight += Number(mov.new_stock) - Number(mov.previous_stock);
        }
      });

      return {
        ...cut,
        cut_value: Number(cutValue.toFixed(2)),
        sold_weight: Number(soldWeight.toFixed(3)),
        merma_weight: Number(mermaWeight.toFixed(3)),
        adjustments_weight: Number(adjustmentsWeight.toFixed(3)),
      };
    });

    const purchasePrice = Number(lot.purchase_price);
    const difference = totalEstimatedValue - purchasePrice;
    const yieldRatio = purchasePrice > 0 ? totalEstimatedValue / purchasePrice : 0;
    const yieldPercentage = yieldRatio * 100;

    res.json({
      success: true,
      lot: {
        ...lot,
        cuts: enrichedCuts,
        metrics: {
          purchase_price: purchasePrice,
          total_cuts_weight: Number(totalCutsWeight.toFixed(3)),
          total_current_stock: Number(totalCurrentStock.toFixed(3)),
          total_estimated_value: Number(totalEstimatedValue.toFixed(2)),
          difference: Number(difference.toFixed(2)),
          yield_ratio: Number(yieldRatio.toFixed(4)),
          yield_percentage: Number(yieldPercentage.toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createLot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('No autenticado.', 401);
    }

    const data = createLotSchema.parse(req.body);
    const lotDate = data.date ? new Date(data.date) : new Date();

    // Execute within Prisma transaction
    const newLot = await prisma.$transaction(async (tx) => {
      // 1. Generate code and consecutive number safely inside transaction
      const { consecutiveNumber, lotCode } = await generateLotCode(data.lot_type, lotDate, tx);

      // 2. Create the animal lot
      const lot = await tx.animalLot.create({
        data: {
          lot_type: data.lot_type,
          consecutive_number: consecutiveNumber,
          lot_code: lotCode,
          date: lotDate,
          description: data.description?.trim() || null,
          purchase_price: new Prisma.Decimal(data.purchase_price),
          created_by_user_id: req.user!.id,
          status: Status.ACTIVE,
        },
      });

      // 3. Create lot cuts and initial ENTRADA movements
      for (const cutItem of data.cuts) {
        const createdCut = await tx.lotCut.create({
          data: {
            lot_id: lot.id,
            cut_catalog_id: cutItem.cut_catalog_id,
            initial_weight: new Prisma.Decimal(cutItem.initial_weight),
            current_stock: new Prisma.Decimal(cutItem.initial_weight),
            price_per_kg: new Prisma.Decimal(cutItem.price_per_kg),
          },
        });

        // Record initial ENTRADA inventory movement
        await tx.inventoryMovement.create({
          data: {
            movement_type: MovementType.ENTRADA,
            lot_cut_id: createdCut.id,
            quantity: new Prisma.Decimal(cutItem.initial_weight),
            previous_stock: new Prisma.Decimal(0),
            new_stock: new Prisma.Decimal(cutItem.initial_weight),
            reference_id: lot.lot_code,
            user_id: req.user!.id,
            notes: `Creación de lote ${lot.lot_code}`,
          },
        });
      }

      return lot;
    });

    // Record audit log
    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      entity: newLot.lot_type === LotType.BEEF ? 'BEEF_LOT' : 'PORK_LOT',
      entityId: newLot.id,
      details: { lot_code: newLot.lot_code, purchase_price: data.purchase_price, cuts_count: data.cuts.length },
    });

    res.status(201).json({
      success: true,
      message: `Lote ${newLot.lot_code} creado exitosamente.`,
      lot: newLot,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateLotSchema.parse(req.body);

    const existing = await prisma.animalLot.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Lote no encontrado.', 404);
    }

    const updated = await prisma.animalLot.update({
      where: { id },
      data: {
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        purchase_price: data.purchase_price ? new Prisma.Decimal(data.purchase_price) : undefined,
        status: data.status,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entity: existing.lot_type === LotType.BEEF ? 'BEEF_LOT' : 'PORK_LOT',
        entityId: id,
        details: { before: existing, after: updated },
      });
    }

    res.json({
      success: true,
      message: 'Lote actualizado exitosamente.',
      lot: updated,
    });
  } catch (error) {
    next(error);
  }
}
