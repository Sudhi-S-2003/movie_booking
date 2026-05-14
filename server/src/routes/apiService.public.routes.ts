import { Router } from 'express';
import { isAuthenticatedApiKey, isApiServiceSignatureValid } from '../middleware/api.key.middleware.js';
import {
    getSignedApiServiceUrl,
    createApiServiceResource,
    getApiServiceResource,
} from '../controllers/apiService.controller.js';

const router = Router();

// 1. Management API (Authenticated by API Key)
router.post("/", isAuthenticatedApiKey, createApiServiceResource);
router.post("/signed-url", isAuthenticatedApiKey, getSignedApiServiceUrl);

// 2. Resource API (Signature Protected)
// GET for viewing, POST for actions (update, chunk, complete)
router.get("/:category/:id", isApiServiceSignatureValid, getApiServiceResource);
router.post("/:category/:id", isApiServiceSignatureValid, getApiServiceResource);

export default router;
