import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
} from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);
router.use(requireRole([Role.ADMIN]));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.post('/:id/reset-password', resetPassword);

export default router;
