import { Router } from 'express';
import { getUrlPreview } from '../controllers/urlPreview.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireService } from '../modules/catalog/catalog.middleware.js';
import { SERVICE_KEYS } from '../modules/catalog/catalog.registry.js';

const router = Router();

// Authenticated + service-gated: the server fetches arbitrary public URLs,
// so anonymous use would turn it into an open scraping proxy.
router.get('/', isAuthenticated, requireService(SERVICE_KEYS.URL_PREVIEW), getUrlPreview);

export default router;
