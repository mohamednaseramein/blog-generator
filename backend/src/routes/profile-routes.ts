import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  handleListProfiles,
  handleListPredefinedProfiles,
  handleGetProfile,
  handleCreateProfile,
  handleUpdateProfile,
  handleDeleteProfile,
} from '../handlers/profile-handler.js';

const router = Router();

router.get('/', requireAuth, handleListProfiles);
router.get('/predefined', requireAuth, handleListPredefinedProfiles);
router.get('/:id', requireAuth, handleGetProfile);
router.post('/', requireAuth, handleCreateProfile);
router.put('/:id', requireAuth, handleUpdateProfile);
router.delete('/:id', requireAuth, handleDeleteProfile);

export default router;
