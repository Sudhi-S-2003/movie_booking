import { Router } from 'express';
import { createV1Share, getV1Share, listMyShares, deleteMyShare } from '../../controllers/share/share.v1.controler.js';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { requireService } from '../../modules/catalog/catalog.middleware.js';
import { SERVICE_KEYS } from '../../modules/catalog/catalog.registry.js';

const router = Router();
const linkShare = requireService(SERVICE_KEYS.LINK_SHARE);

router.post('/', isAuthenticated, linkShare, createV1Share);
router.get('/mine', isAuthenticated, linkShare, listMyShares);
router.delete('/:publicId', isAuthenticated, linkShare, deleteMyShare);
router.get('/:publicId', getV1Share);

export default router;
