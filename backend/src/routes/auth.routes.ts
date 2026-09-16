import { Router } from 'express';
import { login, getMe, setupDb } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.get('/setup', setupDb);
router.post('/setup', setupDb);

export default router;
