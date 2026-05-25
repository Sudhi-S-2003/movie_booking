import { Router } from 'express';
import { createV1Share,getV1Share } from '../../controllers/share/share.v1.controler.js';
const router = Router();

router.post("/",createV1Share)
router.get("/:publicId",getV1Share)

export default router;

