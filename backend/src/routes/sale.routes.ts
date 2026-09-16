import { Router } from 'express';
import { createSale, listSales, getSaleById } from '../controllers/sale.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', listSales);
router.get('/:id', getSaleById);
router.post('/', createSale);

export default router;
