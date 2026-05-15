import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as subscriptionHandler from '../handlers/subscription-handler.js';

const router = Router();

router.use(requireAuth);

router.get('/', subscriptionHandler.getMySubscription);
router.put('/', subscriptionHandler.changeMyPlan);

export const subscriptionRoutes = router;
