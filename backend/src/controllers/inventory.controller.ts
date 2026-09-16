import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { MovementType, Prisma, Status } from '@prisma/client';
import { recordAuditLog } from '../services/audit.service.js';

const adjustmentSchema = z.object({
  movement_type: z.enum(['AJUSTE', 'MERMA', 'DEVOLUCION']),
  lot_cut_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  is_addition: z.boolean().default(false), // true if adding stock, false if deducting (e.g. merma)
  notes: z.string().min(3, 'Debe especificar el motivo u observación del ajuste'),
}).refine((data) => (data.lot_cut_id && !data.product_id) || (!data.lot_cut_id && data.product_id), {
  message: 'Debe especificar un corte de lote o un producto general.',
});

export async function getInventorySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, available_only } = req.query;

    // 1. Available cuts from active lots
    const cutsWhere: any = {
      lot: { status: Status.ACTIVE },
      cut_catalog: { status: Status.ACTIVE },
    };

    if (available_only === 'true') {
      cutsWhere.current_stock = { gt: 0 };
    }

    if (search && typeof search === 'string') {
      cutsWhere.OR = [
        { cut_catalog: { name: { contains: search } } },
        { lot: { lot_code: { contains: search } } },
      ];
    }

    const lotCuts = await prisma.lotCut.findMany({
      where: cutsWhere,
      include: {
        cut_catalog: true,
        lot: {
          select: {
            id: true,
            lot_code: true,
            lot_type: true,
            created_at: true,
          },
        },
      },
      orderBy: [{ lot: { created_at: 'desc' } }, { cut_catalog: { name: 'asc' } }],
    });

    // 2. Available general products
    const productsWhere: any = {
      status: Status.ACTIVE,
    };

    if (available_only === 'true') {
      productsWhere.current_stock = { gt: 0 };
    }

    if (search && typeof search === 'string') {
      productsWhere.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { name: { contains: search } } },
      ];
    }

    const products = await prisma.product.findMany({
      where: productsWhere,
      include: {
        category: true,
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    res.json({
      success: true,
      lot_cuts: lotCuts.map((cut) => ({
        id: cut.id,
        item_type: 'LOT_CUT',
        name: cut.cut_catalog.name,
        lot_id: cut.lot.id,
        lot_code: cut.lot.lot_code,
        meat_type: cut.lot.lot_type,
        initial_weight: Number(cut.initial_weight),
        current_stock: Number(cut.current_stock),
        price: Number(cut.price_per_kg),
        unit_measure: 'kg',
      })),
      products: products.map((prod) => ({
        id: prod.id,
        item_type: 'PRODUCT',
        name: prod.name,
        category: prod.category.name,
        current_stock: Number(prod.current_stock),
        price: Number(prod.sale_price),
        unit_measure: prod.unit_measure,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { movement_type, lot_cut_id, product_id, start_date, end_date } = req.query;

    const where: any = {};

    if (movement_type && typeof movement_type === 'string') {
      where.movement_type = movement_type as MovementType;
    }
    if (lot_cut_id && typeof lot_cut_id === 'string') {
      where.lot_cut_id = lot_cut_id;
    }
    if (product_id && typeof product_id === 'string') {
      where.product_id = product_id;
    }

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date && typeof start_date === 'string') {
        where.created_at.gte = new Date(start_date);
      }
      if (end_date && typeof end_date === 'string') {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true } },
        lot_cut: {
          include: {
            cut_catalog: true,
            lot: { select: { lot_code: true } },
          },
        },
        product: { select: { id: true, name: true, unit_measure: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    res.json({ success: true, movements });
  } catch (error) {
    next(error);
  }
}

export async function createAdjustment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('No autenticado.', 401);
    }

    const data = adjustmentSchema.parse(req.body);
    const qtyDelta = new Prisma.Decimal(data.quantity);

    const movement = await prisma.$transaction(async (tx) => {
      let previousStock = new Prisma.Decimal(0);
      let newStock = new Prisma.Decimal(0);
      let targetName = '';

      if (data.lot_cut_id) {
        const lotCut = await tx.lotCut.findUnique({
          where: { id: data.lot_cut_id },
          include: { cut_catalog: true, lot: true },
        });
        if (!lotCut) {
          throw new AppError('Corte de lote no encontrado.', 404);
        }

        previousStock = lotCut.current_stock;
        targetName = `${lotCut.cut_catalog.name} (${lotCut.lot.lot_code})`;

        if (data.is_addition) {
          newStock = previousStock.plus(qtyDelta);
        } else {
          if (previousStock.lessThan(qtyDelta)) {
            throw new AppError(
              `El inventario no puede quedar negativo. Stock actual: ${previousStock} kg, descuento: ${qtyDelta} kg.`
            );
          }
          newStock = previousStock.minus(qtyDelta);
        }

        await tx.lotCut.update({
          where: { id: data.lot_cut_id },
          data: { current_stock: newStock },
        });

        // Automatically sync lot status: ACTIVE if remaining stock > 0, INACTIVE if 0
        const lotStock = await tx.lotCut.aggregate({
          where: { lot_id: lotCut.lot_id },
          _sum: { current_stock: true },
        });
        const totalRemaining = Number(lotStock._sum.current_stock || 0);
        await tx.animalLot.update({
          where: { id: lotCut.lot_id },
          data: { status: totalRemaining > 0 ? Status.ACTIVE : Status.INACTIVE },
        });
      } else if (data.product_id) {
        const product = await tx.product.findUnique({
          where: { id: data.product_id },
        });
        if (!product) {
          throw new AppError('Producto general no encontrado.', 404);
        }

        previousStock = product.current_stock;
        targetName = product.name;

        if (data.is_addition) {
          newStock = previousStock.plus(qtyDelta);
        } else {
          if (previousStock.lessThan(qtyDelta)) {
            throw new AppError(
              `El inventario no puede quedar negativo. Stock actual: ${previousStock} ${product.unit_measure}, descuento: ${qtyDelta}.`
            );
          }
          newStock = previousStock.minus(qtyDelta);
        }

        await tx.product.update({
          where: { id: data.product_id },
          data: { current_stock: newStock },
        });
      }

      const createdMov = await tx.inventoryMovement.create({
        data: {
          movement_type: data.movement_type as MovementType,
          lot_cut_id: data.lot_cut_id || null,
          product_id: data.product_id || null,
          quantity: qtyDelta,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_id: `Ajuste Administrativo (${data.is_addition ? '+' : '-'}${data.quantity})`,
          user_id: req.user!.id,
          notes: data.notes.trim(),
        },
      });

      return { createdMov, targetName, previousStock, newStock };
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'ADJUSTMENT',
      entity: data.lot_cut_id ? 'LOT_CUT' : 'PRODUCT',
      entityId: data.lot_cut_id || data.product_id || '',
      details: {
        movement_type: data.movement_type,
        target: movement.targetName,
        change: `${data.is_addition ? '+' : '-'}${data.quantity}`,
        previous_stock: Number(movement.previousStock),
        new_stock: Number(movement.newStock),
        notes: data.notes,
      },
    });

    res.status(201).json({
      success: true,
      message: `Ajuste registrado exitosamente para ${movement.targetName}. Nuevo stock: ${movement.newStock}`,
      movement: movement.createdMov,
    });
  } catch (error) {
    next(error);
  }
}
