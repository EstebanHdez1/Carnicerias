import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
} from '../controllers/category.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', listCategories);
router.post('/', requireRole([Role.ADMIN]), createCategory);
router.put('/:id', requireRole([Role.ADMIN]), updateCategory);

export default router;
