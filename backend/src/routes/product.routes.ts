import { Router } from 'express';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { checkVendorEditWindow } from '../middleware/vendorWindow.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', checkVendorEditWindow('Product'), updateProduct);
router.delete('/:id', requireRole([Role.ADMIN]), deleteProduct);

export default router;
