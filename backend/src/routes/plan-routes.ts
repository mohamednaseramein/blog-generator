import { Router } from 'express';
import { listPublicPlansHandler } from '../handlers/plan-handler.js';

const router = Router();

router.get('/', listPublicPlansHandler);

export const planRoutes = router;
