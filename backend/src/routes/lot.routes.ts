import { Router } from 'express';
import {
  listLots,
  getLotById,
  createLot,
  updateLot,
  previewNextLotCode,
} from '../controllers/lot.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { checkVendorEditWindow } from '../middleware/vendorWindow.js';

const router = Router();

router.use(authMiddleware);

router.get('/', listLots);
router.get('/preview-code', previewNextLotCode);
router.get('/:id', getLotById);
router.post('/', createLot);
router.put('/:id', checkVendorEditWindow('AnimalLot'), updateLot);

export default router;
