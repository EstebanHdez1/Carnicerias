import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ENV } from '../config/env.js';
import { Role } from '@prisma/client';

export type CheckableEntity = 'AnimalLot' | 'Product';

export function checkVendorEditWindow(entityType: CheckableEntity) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }

    // Admins have full modification permission
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    // Vendors can never delete any entity
    if (req.method === 'DELETE') {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado: Los vendedores no tienen permisos para eliminar registros.',
      });
      return;
    }

    // For editing (PUT, PATCH)
    const { id } = req.params;
    if (!id) {
      next();
      return;
    }

    try {
      let createdAt: Date | null = null;
      let createdByUserId: string | null = null;

      if (entityType === 'AnimalLot') {
        const lot = await prisma.animalLot.findUnique({
          where: { id },
          select: { created_at: true, created_by_user_id: true },
        });
        if (lot) {
          createdAt = lot.created_at;
          createdByUserId = lot.created_by_user_id;
        }
      } else if (entityType === 'Product') {
        const product = await prisma.product.findUnique({
          where: { id },
          select: { created_at: true, created_by_user_id: true },
        });
        if (product) {
          createdAt = product.created_at;
          createdByUserId = product.created_by_user_id;
        }
      }

      if (!createdAt) {
        res.status(404).json({ success: false, message: 'Registro no encontrado.' });
        return;
      }

      // Check if this vendor created it (optional, but vendor shouldn't edit another vendor's work either)
      if (createdByUserId && createdByUserId !== req.user.id) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado: Solo el creador o un administrador puede editar este registro.',
        });
        return;
      }

      const elapsedMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
      if (elapsedMinutes > ENV.VENDEDOR_EDIT_WINDOW_MINUTES) {
        res.status(403).json({
          success: false,
          message:
            'Este registro ya no puede ser modificado por el vendedor. Solicite al administrador realizar el cambio.',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
