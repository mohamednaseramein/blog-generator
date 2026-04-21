import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleCreateBlog } from '../handlers/blog-handler.js';
import {
  handleSubmitBrief,
  handleGetBrief,
  handleGetScrapeStatus,
} from '../handlers/blog-brief-handler.js';
import {
  handleGenerateAlignment,
  handleConfirmAlignment,
} from '../handlers/blog-alignment-handler.js';

const router = Router();

router.post('/', requireAuth, handleCreateBlog);
router.post('/:id/brief', requireAuth, handleSubmitBrief);
router.get('/:id/brief', requireAuth, handleGetBrief);
router.get('/:id/brief/scrape-status', requireAuth, handleGetScrapeStatus);
router.post('/:id/alignment', requireAuth, handleGenerateAlignment);
router.post('/:id/alignment/confirm', requireAuth, handleConfirmAlignment);

export default router;
