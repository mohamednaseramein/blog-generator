import axios from 'axios';
import * as cheerio from 'cheerio';
import { updateScrapeResult } from '../repositories/blog-brief-repository.js';
import { updateReferenceScrapeResult } from '../repositories/blog-references-repository.js';

const MAX_CONTENT_LENGTH = 10_000;

function resolveTimeoutMs(): number {
  const fromEnv = parseInt(process.env['SCRAPE_TIMEOUT_MS'] ?? '', 10);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 10_000;
}

/** @deprecated Used only for the legacy single-URL brief flow. Use scrapeReferenceInBackground for new multi-URL flow. */
export function scrapeUrlInBackground(blogId: string, url: string): void {
  scrapeLegacy(blogId, url).catch(() => {
    // fire-and-forget: errors handled inside scrapeLegacy()
  });
}

async function scrapeLegacy(blogId: string, url: string): Promise<void> {
  try {
    const { data } = await axios.get<string>(url, {
      timeout: resolveTimeoutMs(),
      headers: { 'User-Agent': 'BlogGenerator/1.0 (+https://github.com/mohamednaseramein/blog-generator)' },
      maxContentLength: 5 * 1024 * 1024,
    });

    const $ = cheerio.load(data);
    $('script, style, nav, footer, header, aside').remove();

    const text = ($('article, main').first().text() || $('body').text())
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CONTENT_LENGTH);

    await updateScrapeResult(blogId, 'success', text || null);
  } catch {
    await updateScrapeResult(blogId, 'failed', null);
  }
}

/** Scrape a single reference URL and persist the result to blog_references. */
export function scrapeReferenceInBackground(referenceId: string, url: string): void {
  scrapeReference(referenceId, url).catch(() => {
    // fire-and-forget: errors handled inside scrapeReference()
  });
}

async function scrapeReference(referenceId: string, url: string): Promise<void> {
  const timeoutMs = resolveTimeoutMs();
  try {
    const { data } = await axios.get<string>(url, {
      timeout: timeoutMs,
      headers: { 'User-Agent': 'BlogGenerator/1.0 (+https://github.com/mohamednaseramein/blog-generator)' },
      maxContentLength: 5 * 1024 * 1024,
    });

    const $ = cheerio.load(data);
    $('script, style, nav, footer, header, aside').remove();

    const text = ($('article, main').first().text() || $('body').text())
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_CONTENT_LENGTH);

    await updateReferenceScrapeResult(referenceId, 'success', text || null, null);
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { code?: string; response?: { status: number } };

    let status: 'failed' | 'timeout' = 'failed';
    let message = 'Could not fetch this URL.';

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      status = 'timeout';
      message = `Request timed out after ${timeoutMs / 1000}s — the URL may be slow or unreachable.`;
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      message = 'This URL is private or requires login. Copy the relevant content and paste it into your Blog Brief instead.';
    } else if (error.response?.status === 404) {
      message = 'This URL returned a 404 — the page was not found.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      message = 'Could not reach this URL — check it is publicly accessible.';
    }

    await updateReferenceScrapeResult(referenceId, status, null, message);
  }
}
