// ─────────────────────────────────────────────────────────────────────────────
// webhook.routes
//
// Inbound webhooks. These routes are always unauthenticated (that's what
// webhooks are) — we defend with per-route body parsers + signature
// verification instead.
//
// Mount order note: the `/telinfy/signature` route uses `express.raw` so the
// handler can HMAC over the original bytes. The generic global `express.json`
// body parser is already applied in `app.ts` BEFORE this router, but an
// explicit per-route `express.raw({ type: 'application/json' })` here wins
// because Express body-parser middlewares short-circuit when `req.body` is
// already parsed. To make the raw parser actually win we declare it FIRST on
// this route. See also `app.ts` which registers this router before the global
// json parser so the order works out.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, json, raw } from 'express';
import {
  telinfy,
  telinfySignature,
} from '../controllers/webhooks/telinfy.controller.js';
import { validateWebhookSignature } from '../middleware/webhook.middleware.js';



const router = Router();

// Plain probe — default JSON body parser is fine.
router.use('/telinfy/:id/:signature', json({ limit: '256kb' }), validateWebhookSignature, telinfy);


// Signed — raw body capture so the handler can HMAC over the original bytes.
router.use(
  '/telinfy/:id/:signature/signature',
  raw({ type: 'application/json', limit: '256kb' }),
  validateWebhookSignature,
  telinfySignature,
);


// Signed URL fallback — verifies the ID signature in the URL itself.
router.post('/:type/:id/:signature', json({ limit: '256kb' }), validateWebhookSignature, telinfy);


export default router;

