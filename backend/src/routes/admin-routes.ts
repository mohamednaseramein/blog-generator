import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as adminHandler from '../handlers/admin-handler.js';
import * as planAdminHandler from '../handlers/plan-admin-handler.js';
import * as subscriptionHandler from '../handlers/subscription-handler.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

router.get('/users', adminHandler.listUsers);
router.get('/users/:id/usage', adminHandler.getUserUsage);
router.get('/users/:id/subscription', subscriptionHandler.getUserSubscription);
router.put('/users/:id/subscription', subscriptionHandler.changeUserSubscription);
router.get('/users/:id/profiles', adminHandler.listUserProfiles);
router.put('/users/:userId/profiles/:profileId', adminHandler.adminUpdateUserProfile);
router.post('/users/:id/deactivate', adminHandler.deactivateUser);
router.post('/users/:id/reactivate', adminHandler.reactivateUser);
router.post('/users/:id/promote', adminHandler.promoteUser);
router.post('/users/:id/demote', adminHandler.demoteUser);
router.post('/users/:id/force-reset', adminHandler.forceResetUser);

router.get('/blogs', adminHandler.listAllBlogs);
router.delete('/blogs/:id', adminHandler.deleteAnyBlog);
router.get('/blogs/:id', adminHandler.getAnyBlog);

router.get('/plans', planAdminHandler.listAdminPlans);
router.post('/plans', planAdminHandler.createAdminPlan);
router.patch('/plans/:id', planAdminHandler.patchAdminPlan);
router.post('/plans/:id/archive', planAdminHandler.archiveAdminPlan);
router.post('/plans/:id/set-default', planAdminHandler.setDefaultAdminPlan);

export const adminRoutes = router;
