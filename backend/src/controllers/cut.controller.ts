import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { LotType, Status } from '@prisma/client';
import { recordAuditLog } from '../services/audit.service.js';

const cutSchema = z.object({
  name: z.string().min(2, 'El nombre del corte debe tener al menos 2 caracteres'),
  meat_type: z.nativeEnum(LotType, { errorMap: () => ({ message: 'Tipo de carne inválido (BEEF o PORK)' }) }),
  description: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
});

export async function listCuts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { meat_type, status } = req.query;

    const where: any = {};
    if (meat_type && typeof meat_type === 'string') {
      where.meat_type = meat_type as LotType;
    }
    if (status && typeof status === 'string') {
      where.status = status as Status;
    }

    const cuts = await prisma.cutCatalog.findMany({
      where,
      orderBy: [{ meat_type: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, cuts });
  } catch (error) {
    next(error);
  }
}

export async function createCut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = cutSchema.parse(req.body);

    const existing = await prisma.cutCatalog.findUnique({
      where: {
        name_meat_type: {
          name: data.name.trim(),
          meat_type: data.meat_type,
        },
      },
    });

    if (existing) {
      throw new AppError(`El corte "${data.name}" ya existe para este tipo de carne.`);
    }

    const cut = await prisma.cutCatalog.create({
      data: {
        name: data.name.trim(),
        meat_type: data.meat_type,
        description: data.description?.trim() || null,
        status: data.status || Status.ACTIVE,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'CREATE',
        entity: 'CUT',
        entityId: cut.id,
        details: { name: cut.name, meat_type: cut.meat_type },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Corte creado exitosamente.',
      cut,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCut(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = cutSchema.partial().parse(req.body);

    const existing = await prisma.cutCatalog.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Corte no encontrado.', 404);
    }

    const updated = await prisma.cutCatalog.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        meat_type: data.meat_type,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        status: data.status,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'CUT',
        entityId: id,
        details: { before: existing, after: updated },
      });
    }

    res.json({
      success: true,
      message: 'Corte actualizado exitosamente.',
      cut: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleCutStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.cutCatalog.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Corte no encontrado.', 404);
    }

    const newStatus = existing.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;

    const updated = await prisma.cutCatalog.update({
      where: { id },
      data: { status: newStatus },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'STATUS_CHANGE',
        entity: 'CUT',
        entityId: id,
        details: { previousStatus: existing.status, newStatus },
      });
    }

    res.json({
      success: true,
      message: `Corte ${newStatus === Status.ACTIVE ? 'activado' : 'desactivado'} exitosamente.`,
      cut: updated,
    });
  } catch (error) {
    next(error);
  }
}
