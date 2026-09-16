import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado: No tienes permisos para realizar esta acción.',
      });
      return;
    }

    next();
  };
}
