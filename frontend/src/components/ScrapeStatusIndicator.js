import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getScrapeStatus } from '../api/blog-api.js';
import { Toast } from './ui/toast.js';
export function ScrapeStatusIndicator({ blogId }) {
    const [status, setStatus] = useState(null);
    useEffect(() => {
        let timer;
        async function poll() {
            try {
                const result = await getScrapeStatus(blogId);
                setStatus(result);
                if (result.scrapeStatus === 'pending') {
                    timer = setTimeout(poll, 2_000);
                }
            }
            catch {
                // polling failure is non-critical — stop silently
            }
        }
        void poll();
        return () => clearTimeout(timer);
    }, [blogId]);
    if (!status || status.scrapeStatus === 'skipped')
        return null;
    if (status.scrapeStatus === 'pending') {
        return (_jsxs("div", { role: "status", "aria-live": "polite", className: "flex items-center gap-2 text-sm text-slate-500", children: [_jsx("span", { className: "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" }), "Scraping reference URL\u2026"] }));
    }
    if (status.scrapeStatus === 'success') {
        return (_jsxs(Toast, { variant: "success", children: ["Reference URL scraped. ", status.scrapedContentLength.toLocaleString(), " chars extracted."] }));
    }
    return (_jsx(Toast, { variant: "error", children: "Reference URL could not be scraped (403 or timeout). Your blog will proceed without it." }));
}
