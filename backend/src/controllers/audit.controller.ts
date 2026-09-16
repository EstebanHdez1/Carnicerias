import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, entity, user_id, start_date, end_date } = req.query;

    const where: any = {};
    if (action && typeof action === 'string') {
      where.action = action;
    }
    if (entity && typeof entity === 'string') {
      where.entity = entity;
    }
    if (user_id && typeof user_id === 'string') {
      where.user_id = user_id;
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

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
}
