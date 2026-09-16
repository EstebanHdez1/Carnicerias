import { Router } from 'express';
import {
  listCuts,
  createCut,
  updateCut,
  toggleCutStatus,
} from '../controllers/cut.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', listCuts);
router.post('/', requireRole([Role.ADMIN]), createCut);
router.put('/:id', requireRole([Role.ADMIN]), updateCut);
router.patch('/:id/status', requireRole([Role.ADMIN]), toggleCutStatus);

export default router;
