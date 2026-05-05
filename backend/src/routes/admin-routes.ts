import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as adminHandler from '../handlers/admin-handler.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

router.get('/users', adminHandler.listUsers);
router.post('/users/:id/deactivate', adminHandler.deactivateUser);
router.post('/users/:id/promote', adminHandler.promoteUser);
router.post('/users/:id/demote', adminHandler.demoteUser);
router.post('/users/:id/force-reset', adminHandler.forceResetUser);

router.get('/blogs', adminHandler.listAllBlogs);
router.get('/blogs/:id', adminHandler.getAnyBlog);

export const adminRoutes = router;
