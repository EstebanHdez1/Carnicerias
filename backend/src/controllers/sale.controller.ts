import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { MovementType, PaymentMethod, Prisma, SaleStatus, Status } from '@prisma/client';
import { generateSaleNumber } from '../services/lotCode.service.js';
import { recordAuditLog } from '../services/audit.service.js';

const saleItemInputSchema = z.object({
  lot_cut_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  quantity: z.number().positive('La cantidad o peso debe ser mayor a 0'),
}).refine((data) => (data.lot_cut_id && !data.product_id) || (!data.lot_cut_id && data.product_id), {
  message: 'Cada item debe ser un corte de lote o un producto general, no ambos ni ninguno.',
});

const createSaleSchema = z.object({
  idempotency_key: z.string().min(10, 'La clave de idempotencia es requerida'),
  payment_method: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Método de pago inválido' }),
  }),
  notes: z.string().optional(),
  items: z.array(saleItemInputSchema).min(1, 'La venta debe contener al menos un producto o corte'),
});

export async function createSale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('No autenticado.', 401);
    }

    const data = createSaleSchema.parse(req.body);

    // 1. Idempotency check: if this key already exists, return the existing sale
    const existingSale = await prisma.sale.findUnique({
      where: { idempotency_key: data.idempotency_key },
      include: {
        items: true,
        user: { select: { id: true, name: true, username: true } },
      },
    });

    if (existingSale) {
      console.log(`[IDEMPOTENCY] Reenviando venta existente para key: ${data.idempotency_key}`);
      res.status(200).json({
        success: true,
        message: 'Venta ya procesada previamente (idempotente).',
        sale: existingSale,
      });
      return;
    }

    // 2. Process sale inside an atomic transaction
    const createdSale = await prisma.$transaction(
      async (tx) => {
        // Prepare items with validated stock & prices
        let calculatedTotal = new Prisma.Decimal(0);

        interface PreparedItem {
          lot_cut_id?: string;
          lot_id?: string;
          product_id?: string;
          item_name: string;
          lot_code?: string;
          quantity: Prisma.Decimal;
          unit_price: Prisma.Decimal;
          subtotal: Prisma.Decimal;
          previous_stock: Prisma.Decimal;
          new_stock: Prisma.Decimal;
        }

        const preparedItems: PreparedItem[] = [];

        for (const itemInput of data.items) {
          const requestedQty = new Prisma.Decimal(itemInput.quantity);

          if (itemInput.lot_cut_id) {
            const lotCut = await tx.lotCut.findUnique({
              where: { id: itemInput.lot_cut_id },
              include: {
                cut_catalog: true,
                lot: true,
              },
            });

            if (!lotCut) {
              throw new AppError('Corte de lote no encontrado.', 404);
            }

            if (lotCut.current_stock.lessThan(requestedQty)) {
              throw new AppError(
                `Stock insuficiente para "${lotCut.cut_catalog.name}" (${lotCut.lot.lot_code}). Disponible: ${lotCut.current_stock} kg, solicitado: ${requestedQty} kg.`
              );
            }

            const previousStock = lotCut.current_stock;
            const newStock = previousStock.minus(requestedQty);
            const unitPrice = lotCut.price_per_kg;
            const subtotal = requestedQty.mul(unitPrice);
            calculatedTotal = calculatedTotal.add(subtotal);

            preparedItems.push({
              lot_cut_id: lotCut.id,
              lot_id: lotCut.lot_id,
              item_name: lotCut.cut_catalog.name,
              lot_code: lotCut.lot.lot_code,
              quantity: requestedQty,
              unit_price: unitPrice,
              subtotal,
              previous_stock: previousStock,
              new_stock: newStock,
            });
          } else if (itemInput.product_id) {
            const product = await tx.product.findUnique({
              where: { id: itemInput.product_id },
            });

            if (!product) {
              throw new AppError('Producto general no encontrado.', 404);
            }

            if (product.current_stock.lessThan(requestedQty)) {
              throw new AppError(
                `Stock insuficiente para "${product.name}". Disponible: ${product.current_stock} ${product.unit_measure}, solicitado: ${requestedQty} ${product.unit_measure}.`
              );
            }

            const previousStock = product.current_stock;
            const newStock = previousStock.minus(requestedQty);
            const unitPrice = product.sale_price;
            const subtotal = requestedQty.mul(unitPrice);
            calculatedTotal = calculatedTotal.add(subtotal);

            preparedItems.push({
              product_id: product.id,
              item_name: product.name,
              quantity: requestedQty,
              unit_price: unitPrice,
              subtotal,
              previous_stock: previousStock,
              new_stock: newStock,
            });
          }
        }

        // Generate consecutive sale number
        const { consecutiveNumber, saleNumber } = await generateSaleNumber(tx);

        // Create Sale
        const sale = await tx.sale.create({
          data: {
            sale_number: saleNumber,
            consecutive_number: consecutiveNumber,
            user_id: req.user!.id,
            payment_method: data.payment_method,
            total_amount: calculatedTotal,
            idempotency_key: data.idempotency_key,
            status: SaleStatus.CONFIRMED,
            notes: data.notes?.trim() || null,
          },
        });

        // Insert sale items, decrement stocks, and insert movements
        for (const item of preparedItems) {
          await tx.saleItem.create({
            data: {
              sale_id: sale.id,
              lot_cut_id: item.lot_cut_id,
              product_id: item.product_id,
              item_name: item.item_name,
              lot_code: item.lot_code,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
            },
          });

          if (item.lot_cut_id) {
            await tx.lotCut.update({
              where: { id: item.lot_cut_id },
              data: { current_stock: item.new_stock },
            });

            await tx.inventoryMovement.create({
              data: {
                movement_type: MovementType.VENTA,
                lot_cut_id: item.lot_cut_id,
                quantity: item.quantity,
                previous_stock: item.previous_stock,
                new_stock: item.new_stock,
                reference_id: sale.sale_number,
                user_id: req.user!.id,
                notes: `Venta ${sale.sale_number} - ${item.item_name}`,
              },
            });
          } else if (item.product_id) {
            await tx.product.update({
              where: { id: item.product_id },
              data: { current_stock: item.new_stock },
            });

            await tx.inventoryMovement.create({
              data: {
                movement_type: MovementType.VENTA,
                product_id: item.product_id,
                quantity: item.quantity,
                previous_stock: item.previous_stock,
                new_stock: item.new_stock,
                reference_id: sale.sale_number,
                user_id: req.user!.id,
                notes: `Venta ${sale.sale_number} - ${item.item_name}`,
              },
            });
          }
        }

        // Check lots of sold cuts: if all cuts of a lot have 0 stock, mark lot as INACTIVE (Agotado)
        const affectedLotIds = [
          ...new Set(preparedItems.map((it) => it.lot_id).filter((id): id is string => Boolean(id))),
        ];
        for (const lotId of affectedLotIds) {
          const lotStock = await tx.lotCut.aggregate({
            where: { lot_id: lotId },
            _sum: { current_stock: true },
          });
          const totalRemaining = Number(lotStock._sum.current_stock || 0);
          if (totalRemaining <= 0) {
            await tx.animalLot.update({
              where: { id: lotId },
              data: { status: Status.INACTIVE },
            });
          }
        }

        return sale;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // Fetch complete sale to return
    const completeSale = await prisma.sale.findUnique({
      where: { id: createdSale.id },
      include: {
        items: true,
        user: { select: { id: true, name: true, username: true } },
      },
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'SALE',
      entityId: createdSale.id,
      details: {
        sale_number: createdSale.sale_number,
        total_amount: Number(createdSale.total_amount),
        items_count: data.items.length,
        payment_method: createdSale.payment_method,
      },
    });

    res.status(201).json({
      success: true,
      message: `Venta ${createdSale.sale_number} realizada con éxito.`,
      sale: completeSale,
    });
  } catch (error) {
    next(error);
  }
}

export async function listSales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user_id, start_date, end_date, payment_method, status } = req.query;

    const where: any = {};

    // If user is VENDEDOR, they can only view their own sales unless ADMIN
    if (req.user?.role === 'VENDEDOR') {
      where.user_id = req.user.id;
    } else if (user_id && typeof user_id === 'string') {
      where.user_id = user_id;
    }

    if (payment_method && typeof payment_method === 'string') {
      where.payment_method = payment_method as PaymentMethod;
    }
    if (status && typeof status === 'string') {
      where.status = status as SaleStatus;
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

    const sales = await prisma.sale.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true } },
        items: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, sales });
  } catch (error) {
    next(error);
  }
}

export async function getSaleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            lot_cut: {
              include: {
                cut_catalog: true,
                lot: true,
              },
            },
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new AppError('Venta no encontrada.', 404);
    }

    // Restrict vendor from viewing other vendors' sales
    if (req.user?.role === 'VENDEDOR' && sale.user_id !== req.user.id) {
      throw new AppError('No tienes permisos para ver esta venta.', 403);
    }

    res.json({ success: true, sale });
  } catch (error) {
    next(error);
  }
}
