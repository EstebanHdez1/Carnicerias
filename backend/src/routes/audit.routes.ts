import { Router } from 'express';
import { listAuditLogs } from '../controllers/audit.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);
router.use(requireRole([Role.ADMIN]));

router.get('/', listAuditLogs);

export default router;
