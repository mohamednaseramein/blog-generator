import {
  getReferenceById,
  updateReferenceExtraction,
} from '../repositories/blog-references-repository.js';
import { getBriefByBlogId } from '../repositories/blog-brief-repository.js';
import { generateReferenceExtraction } from './reference-extraction-service.js';

export function extractReferenceInBackground(referenceId: string): void {
  runExtract(referenceId).catch(() => {
    /* errors handled inside */
  });
}

async function runExtract(referenceId: string): Promise<void> {
  const ref = await getReferenceById(referenceId);
  if (!ref || ref.scrapeStatus !== 'success' || !ref.scrapedContent) return;

  const brief = await getBriefByBlogId(ref.blogId);
  if (!brief) return;

  try {
    const result = await generateReferenceExtraction(brief, ref.url, ref.scrapedContent);
    const status = result.irrelevantToBrief ? 'irrelevant' : 'success';
    await updateReferenceExtraction(referenceId, status, result.raw);
  } catch (err) {
    console.error('[reference-extraction-runner] extraction failed:', (err as Error).message);
    await updateReferenceExtraction(referenceId, 'failed', null);
  }
}
