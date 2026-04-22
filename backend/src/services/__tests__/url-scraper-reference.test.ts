import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => ({ default: { get: mockGet } }));

const { mockUpdateReferenceScrapeResult } = vi.hoisted(() => ({
  mockUpdateReferenceScrapeResult: vi.fn(),
}));

vi.mock('../../repositories/blog-references-repository.js', () => ({
  updateReferenceScrapeResult: mockUpdateReferenceScrapeResult,
}));

vi.mock('../../repositories/blog-brief-repository.js', () => ({
  updateScrapeResult: vi.fn(),
}));

import { scrapeReferenceInBackground } from '../url-scraper-service.js';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('scrapeReferenceInBackground', () => {
  it('stores success and extracted text on happy path', async () => {
    mockGet.mockResolvedValue({
      data: '<html><body><article>Sleep tips content here.</article></body></html>',
    });

    scrapeReferenceInBackground('ref-1', 'https://example.com/article');
    await flushPromises();

    expect(mockUpdateReferenceScrapeResult).toHaveBeenCalledWith(
      'ref-1',
      'success',
      expect.stringContaining('Sleep tips'),
      null,
    );
  });

  it('stores timeout status when axios times out', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.message = 'timeout of 10000ms exceeded';
    (timeoutError as NodeJS.ErrnoException).code = 'ECONNABORTED';
    mockGet.mockRejectedValue(timeoutError);

    scrapeReferenceInBackground('ref-1', 'https://slow.example.com');
    await flushPromises();

    expect(mockUpdateReferenceScrapeResult).toHaveBeenCalledWith(
      'ref-1',
      'timeout',
      null,
      expect.stringContaining('timed out'),
    );
  });

  it('stores failed status with private URL message on 403', async () => {
    const err = Object.assign(new Error('Request failed with status code 403'), {
      response: { status: 403 },
    });
    mockGet.mockRejectedValue(err);

    scrapeReferenceInBackground('ref-1', 'https://private.example.com');
    await flushPromises();

    expect(mockUpdateReferenceScrapeResult).toHaveBeenCalledWith(
      'ref-1',
      'failed',
      null,
      expect.stringContaining('private or requires login'),
    );
  });

  it('stores failed status with not-found message on 404', async () => {
    const err = Object.assign(new Error('Not Found'), { response: { status: 404 } });
    mockGet.mockRejectedValue(err);

    scrapeReferenceInBackground('ref-1', 'https://example.com/gone');
    await flushPromises();

    expect(mockUpdateReferenceScrapeResult).toHaveBeenCalledWith(
      'ref-1',
      'failed',
      null,
      expect.stringContaining('404'),
    );
  });

  it('stores failed status with unreachable message on DNS failure', async () => {
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });
    mockGet.mockRejectedValue(err);

    scrapeReferenceInBackground('ref-1', 'https://nonexistent.example.com');
    await flushPromises();

    expect(mockUpdateReferenceScrapeResult).toHaveBeenCalledWith(
      'ref-1',
      'failed',
      null,
      expect.stringContaining('publicly accessible'),
    );
  });
});
