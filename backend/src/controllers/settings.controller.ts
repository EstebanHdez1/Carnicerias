import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { recordAuditLog } from '../services/audit.service.js';

const settingsSchema = z.object({
  business_name: z.string().min(1, 'El nombre del negocio es requerido'),
  theme_color: z.enum(['red', 'burgundy', 'slate', 'emerald', 'blue']).default('red'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  receipt_note: z.string().optional().nullable(),
});

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'default',
          business_name: 'Carnicería',
          theme_color: 'red',
          receipt_note: '¡Gracias por su compra!',
        },
      });
    }

    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = settingsSchema.parse(req.body);

    const updated = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: {
        business_name: data.business_name.trim(),
        theme_color: data.theme_color,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        receipt_note: data.receipt_note?.trim() || null,
      },
      create: {
        id: 'default',
        business_name: data.business_name.trim(),
        theme_color: data.theme_color,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        receipt_note: data.receipt_note?.trim() || null,
      },
    });

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'SETTINGS',
        entityId: 'default',
        details: { business_name: updated.business_name, theme_color: updated.theme_color },
      });
    }

    res.json({
      success: true,
      message: 'Configuración del negocio actualizada exitosamente.',
      settings: updated,
    });
  } catch (error) {
    next(error);
  }
}
