import { Router } from 'express';
const router = Router();
import shareV1Routes from './share.v1.routes.js';

router.use('/v1', shareV1Routes);

export default router;