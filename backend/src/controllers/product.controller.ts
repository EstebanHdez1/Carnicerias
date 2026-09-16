import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { MovementType, Prisma, Status, Role } from '@prisma/client';
import { recordAuditLog } from '../services/audit.service.js';

const productSchema = z.object({
  name: z.string().min(2, 'El nombre del producto es requerido'),
  category_id: z.string().uuid('ID de categoría inválido'),
  description: z.string().optional(),
  unit_measure: z.string().default('kg'),
  current_stock: z.number().nonnegative('El inventario no puede ser negativo').default(0),
  sale_price: z.number().positive('El precio de venta debe ser mayor a 0'),
  status: z.nativeEnum(Status).optional(),
});

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category_id, status, search } = req.query;

    const where: any = {};
    if (category_id && typeof category_id === 'string') {
      where.category_id = category_id;
    }
    if (status && typeof status === 'string') {
      where.status = status as Status;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        created_by: { select: { id: true, name: true, username: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, products });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        created_by: { select: { id: true, name: true, username: true } },
        movements: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!product) {
      throw new AppError('Producto no encontrado.', 404);
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('No autenticado.', 401);
    }

    const data = productSchema.parse(req.body);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name.trim(),
          category_id: data.category_id,
          description: data.description?.trim() || null,
          unit_measure: data.unit_measure,
          current_stock: new Prisma.Decimal(data.current_stock),
          sale_price: new Prisma.Decimal(data.sale_price),
          status: data.status || Status.ACTIVE,
          created_by_user_id: req.user!.id,
        },
      });

      if (data.current_stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            movement_type: MovementType.ENTRADA,
            product_id: created.id,
            quantity: new Prisma.Decimal(data.current_stock),
            previous_stock: new Prisma.Decimal(0),
            new_stock: new Prisma.Decimal(data.current_stock),
            reference_id: 'Creación inicial',
            user_id: req.user!.id,
            notes: `Inventario inicial de ${created.name}`,
          },
        });
      }

      return created;
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'PRODUCT',
      entityId: product.id,
      details: { name: product.name, current_stock: data.current_stock, sale_price: data.sale_price },
    });

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente.',
      product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = productSchema.partial().parse(req.body);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Producto no encontrado.', 404);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        category_id: data.category_id,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        unit_measure: data.unit_measure,
        sale_price: data.sale_price ? new Prisma.Decimal(data.sale_price) : undefined,
        status: data.status,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'PRODUCT',
        entityId: id,
        details: { before: existing, after: updated },
      });
    }

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente.',
      product: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { sale_items: { take: 1 } },
    });

    if (!existing) {
      throw new AppError('Producto no encontrado.', 404);
    }

    // If product has historical sales, preserve it by marking INACTIVE (Rule 26)
    if (existing.sale_items.length > 0) {
      await prisma.product.update({
        where: { id },
        data: { status: Status.INACTIVE },
      });

      if (req.user) {
        await recordAuditLog({
          userId: req.user.id,
          action: 'STATUS_CHANGE',
          entity: 'PRODUCT',
          entityId: id,
          details: { reason: 'Desactivado por tener ventas históricas asociadas' },
        });
      }

      res.json({
        success: true,
        message: 'El producto cuenta con historial de ventas; se ha desactivado en lugar de eliminarse.',
      });
      return;
    }

    // Otherwise can safely delete
    await prisma.product.delete({ where: { id } });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'DELETE',
        entity: 'PRODUCT',
        entityId: id,
        details: { name: existing.name },
      });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente.',
    });
  } catch (error) {
    next(error);
  }
}
