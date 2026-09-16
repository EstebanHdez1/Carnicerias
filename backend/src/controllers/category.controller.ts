import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { Status } from '@prisma/client';
import { recordAuditLog } from '../services/audit.service.js';

const categorySchema = z.object({
  name: z.string().min(2, 'El nombre de la categoría es requerido'),
  description: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
});

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status as Status;
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = categorySchema.parse(req.body);

    const existing = await prisma.category.findUnique({
      where: { name: data.name.trim() },
    });
    if (existing) {
      throw new AppError(`La categoría "${data.name}" ya existe.`);
    }

    const category = await prisma.category.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        status: data.status || Status.ACTIVE,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entity: 'CATEGORY',
        entityId: category.id,
        details: { name: category.name },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Categoría creada con éxito.',
      category,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = categorySchema.partial().parse(req.body);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Categoría no encontrada.', 404);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        status: data.status,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'CATEGORY',
        entityId: id,
        details: { before: existing, after: updated },
      });
    }

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente.',
      category: updated,
    });
  } catch (error) {
    next(error);
  }
}
