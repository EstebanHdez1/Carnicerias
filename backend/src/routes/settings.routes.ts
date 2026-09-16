import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { Role } from '@prisma/client';

const router = Router();

// Settings can be read by any authenticated user (or public branding)
router.get('/', getSettings);

// Settings can only be updated by ADMIN
router.put('/', authMiddleware, requireRole([Role.ADMIN]), updateSettings);

export default router;
