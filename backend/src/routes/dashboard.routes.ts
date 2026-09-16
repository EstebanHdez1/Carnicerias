import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);
router.use(requireRole([Role.ADMIN]));

router.get('/summary', getDashboardSummary);

export default router;
