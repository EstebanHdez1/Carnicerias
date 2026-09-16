import { prisma } from '../config/prisma.js';

export interface AuditParams {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, any> | string;
  tx?: any;
}

export async function recordAuditLog(params: AuditParams): Promise<void> {
  const client = params.tx || prisma;
  try {
    const detailsStr =
      typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : params.details || null;

    await client.auditLog.create({
      data: {
        user_id: params.userId,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
        details: detailsStr,
      },
    });
  } catch (error) {
    console.error('[AUDIT ERROR] No se pudo guardar el log de auditoría:', error);
  }
}
