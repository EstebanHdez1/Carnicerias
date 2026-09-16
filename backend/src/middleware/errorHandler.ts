import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public statusCode: number;
  public userMessage?: string;

  constructor(message: string, statusCode = 400, userMessage?: string) {
    super(message);
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR ${timestamp}] ${req.method} ${req.url}:`, err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.userMessage || err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      success: false,
      message: `Datos inválidos: ${errorDetails}`,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : 'campo único';
      res.status(409).json({
        success: false,
        message: `Ya existe un registro con ese valor en ${target}.`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'El registro solicitado no fue encontrado.',
      });
      return;
    }
  }

  // Generic fallback without exposing internal stack or engine details
  res.status(500).json({
    success: false,
    message: 'No fue posible completar la operación. Tus datos fueron conservados. Puedes intentarlo nuevamente.',
  });
}
