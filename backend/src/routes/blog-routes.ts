import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleCreateBlog, handleCompleteBlog, handleListBlogs } from '../handlers/blog-handler.js';
import {
  handleSubmitBrief,
  handleGetBrief,
  handleGetScrapeStatus,
} from '../handlers/blog-brief-handler.js';
import {
  handleGenerateAlignment,
  handleConfirmAlignment,
} from '../handlers/blog-alignment-handler.js';
import {
  handleGenerateOutline,
  handleConfirmOutline,
  handleGetOutline,
} from '../handlers/blog-outline-handler.js';
import {
  handleGenerateDraft,
  handleConfirmDraft,
  handleGetDraft,
} from '../handlers/blog-draft-handler.js';
import {
  handleAddReference,
  handleListReferences,
  handleGetReferenceStatus,
  handleDeleteReference,
} from '../handlers/blog-references-handler.js';
import { handleRecordEvent } from '../handlers/blog-events-handler.js';

const router = Router();

router.get('/', requireAuth, handleListBlogs);
router.post('/', requireAuth, handleCreateBlog);
router.post('/:id/complete', requireAuth, handleCompleteBlog);
router.post('/:id/brief', requireAuth, handleSubmitBrief);
router.get('/:id/brief', requireAuth, handleGetBrief);
router.get('/:id/brief/scrape-status', requireAuth, handleGetScrapeStatus);
router.post('/:id/alignment', requireAuth, handleGenerateAlignment);
router.post('/:id/alignment/confirm', requireAuth, handleConfirmAlignment);
router.post('/:id/outline', requireAuth, handleGenerateOutline);
router.post('/:id/outline/confirm', requireAuth, handleConfirmOutline);
router.get('/:id/outline', requireAuth, handleGetOutline);
router.post('/:id/draft', requireAuth, handleGenerateDraft);
router.post('/:id/draft/confirm', requireAuth, handleConfirmDraft);
router.get('/:id/draft', requireAuth, handleGetDraft);

router.post('/:id/events', requireAuth, handleRecordEvent);

// Reference URLs (multi-URL support — EP-05 / US-09)
router.post('/:id/references', requireAuth, handleAddReference);
router.get('/:id/references', requireAuth, handleListReferences);
router.get('/:id/references/:refId/status', requireAuth, handleGetReferenceStatus);
router.delete('/:id/references/:refId', requireAuth, handleDeleteReference);

export default router;
