import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios');
vi.mock('../../repositories/blog-brief-repository.js');

import axios from 'axios';
import * as repo from '../../repositories/blog-brief-repository.js';
import { scrapeUrlInBackground } from '../url-scraper-service.js';

const mockedAxios = vi.mocked(axios);
const mockedUpdateScrapeResult = vi.mocked(repo.updateScrapeResult);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('scrapeUrlInBackground', () => {
  it('updates scrape_status to success on valid HTML response', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: '<html><body><main><p>Hello world content here</p></main></body></html>',
    });
    mockedUpdateScrapeResult.mockResolvedValue(undefined);

    scrapeUrlInBackground('blog-1', 'https://example.com');
    await vi.waitFor(() => expect(mockedUpdateScrapeResult).toHaveBeenCalledOnce());

    const [blogId, status, content] = mockedUpdateScrapeResult.mock.calls[0]!;
    expect(blogId).toBe('blog-1');
    expect(status).toBe('success');
    expect(content).toContain('Hello world content here');
  });

  it('updates scrape_status to failed when axios throws (403/timeout)', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('Request failed with status 403'));
    mockedUpdateScrapeResult.mockResolvedValue(undefined);

    scrapeUrlInBackground('blog-2', 'https://blocked.example.com');
    await vi.waitFor(() => expect(mockedUpdateScrapeResult).toHaveBeenCalledOnce());

    const [blogId, status, content] = mockedUpdateScrapeResult.mock.calls[0]!;
    expect(blogId).toBe('blog-2');
    expect(status).toBe('failed');
    expect(content).toBeNull();
  });

  it('truncates extracted text to 10,000 characters', async () => {
    const longText = 'A'.repeat(15_000);
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: `<html><body><main><p>${longText}</p></main></body></html>`,
    });
    mockedUpdateScrapeResult.mockResolvedValue(undefined);

    scrapeUrlInBackground('blog-3', 'https://example.com');
    await vi.waitFor(() => expect(mockedUpdateScrapeResult).toHaveBeenCalledOnce());

    const [, , content] = mockedUpdateScrapeResult.mock.calls[0]!;
    expect(content?.length).toBeLessThanOrEqual(10_000);
  });
});
