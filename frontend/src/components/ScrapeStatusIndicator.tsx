import { useEffect, useState } from 'react';
import { getScrapeStatus, type ScrapeStatusResponse } from '../api/blog-api.js';
import { Toast } from './ui/toast.js';

interface Props {
  blogId: string;
}

export function ScrapeStatusIndicator({ blogId }: Props) {
  const [status, setStatus] = useState<ScrapeStatusResponse | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await getScrapeStatus(blogId);
        setStatus(result);
        if (result.scrapeStatus === 'pending') {
          timer = setTimeout(poll, 2_000);
        }
      } catch {
        // polling failure is non-critical — stop silently
      }
    }

    void poll();
    return () => clearTimeout(timer);
  }, [blogId]);

  if (!status || status.scrapeStatus === 'skipped') return null;

  if (status.scrapeStatus === 'pending') {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-slate-500">
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
        Scraping reference URL…
      </div>
    );
  }

  if (status.scrapeStatus === 'success') {
    return (
      <Toast variant="success">
        Reference URL scraped. {status.scrapedContentLength.toLocaleString()} chars extracted.
      </Toast>
    );
  }

  return (
    <Toast variant="error">
      Reference URL could not be scraped (403 or timeout). Your blog will proceed without it.
    </Toast>
  );
}
