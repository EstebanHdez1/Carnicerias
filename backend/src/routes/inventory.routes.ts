import { Router } from 'express';
import {
  getInventorySummary,
  listMovements,
  createAdjustment,
} from '../controllers/inventory.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', getInventorySummary);
router.get('/movements', listMovements);
router.post('/adjustments', requireRole([Role.ADMIN]), createAdjustment);

export default router;
