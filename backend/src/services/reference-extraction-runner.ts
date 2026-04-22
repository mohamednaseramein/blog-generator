import {
  getReferenceById,
  updateReferenceExtraction,
  getReferencesByBlogId,
} from '../repositories/blog-references-repository.js';
import { getBriefByBlogId } from '../repositories/blog-brief-repository.js';
import {
  generateReferenceExtraction,
  buildExtractionFailurePayload,
  userSafeExtractionError,
} from './reference-extraction-service.js';

export function extractReferenceInBackground(referenceId: string): void {
  void runExtract(referenceId);
}

/**
 * Re-run reference analysis for a blog after the brief is first saved, or to recover from
 * a race (scrape finished before `blog_briefs` row existed) or a transient AI error.
 */
export function requeueReferenceExtractionsForBlog(blogId: string): void {
  void (async () => {
    try {
      const refs = await getReferencesByBlogId(blogId);
      for (const ref of refs) {
        if (ref.scrapeStatus !== 'success' || !ref.scrapedContent?.trim()) continue;
        if (ref.extractionStatus === 'success' || ref.extractionStatus === 'irrelevant') continue;
        extractReferenceInBackground(ref.id);
      }
    } catch (e) {
      console.error('[requeueReferenceExtractionsForBlog] failed:', (e as Error).message);
    }
  })();
}

async function runExtract(referenceId: string): Promise<void> {
  const ref = await getReferenceById(referenceId);
  if (!ref || ref.scrapeStatus !== 'success' || !ref.scrapedContent) return;

  const brief = await getBriefByBlogId(ref.blogId);
  if (!brief) {
    // Brief not saved yet — keep extraction as pending; requeueReferenceExtractionsForBlog runs on POST /brief.
    return;
  }

  try {
    const result = await generateReferenceExtraction(brief, ref.url, ref.scrapedContent);
    const status = result.irrelevantToBrief ? 'irrelevant' : 'success';
    await updateReferenceExtraction(referenceId, status, result.raw);
  } catch (err) {
    const msg = userSafeExtractionError(err);
    console.error('[reference-extraction-runner] extraction failed:', (err as Error).message);
    await updateReferenceExtraction(
      referenceId,
      'failed',
      buildExtractionFailurePayload(msg),
    );
  }
}
