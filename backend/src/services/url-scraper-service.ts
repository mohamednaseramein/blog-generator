import axios from 'axios';
import * as cheerio from 'cheerio';
import { updateScrapeResult } from '../repositories/blog-brief-repository.js';

const MAX_CONTENT_LENGTH = 10_000;
const TIMEOUT_MS = 10_000;

export function scrapeUrlInBackground(blogId: string, url: string): void {
  scrape(blogId, url).catch(() => {
    // fire-and-forget: errors handled inside scrape()
  });
}

async function scrape(blogId: string, url: string): Promise<void> {
  try {
    const { data } = await axios.get<string>(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'BlogGenerator/1.0 (+https://github.com/mohamednaseramein/blog-generator)' },
      maxContentLength: 5 * 1024 * 1024, // 5MB cap before cheerio parse
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
