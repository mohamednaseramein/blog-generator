import { authedFetch } from '../lib/authed-fetch.js';
const BASE = '/api/blogs';
export async function getBrief(blogId) {
    return request(`${BASE}/${blogId}/brief`);
}
async function request(url, options) {
    const res = await authedFetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const body = await res.json();
    if (!res.ok) {
        const err = body;
        throw new Error(err.error?.message ?? 'Request failed');
    }
    return body;
}
export async function listBlogs() {
    return request(BASE);
}
export async function createBlog() {
    return request(BASE, { method: 'POST' });
}
export async function completeBlog(blogId) {
    return request(`${BASE}/${blogId}/complete`, {
        method: 'POST',
    });
}
export async function submitBrief(blogId, payload) {
    return request(`${BASE}/${blogId}/brief`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export async function getScrapeStatus(blogId) {
    return request(`${BASE}/${blogId}/brief/scrape-status`);
}
/** Parse persisted `blog_briefs.alignment_summary` (JSON text) for display without re-generating. */
export function parseAlignmentSummaryFromStorage(alignmentSummary) {
    const text = alignmentSummary.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const p = JSON.parse(text);
    for (const k of ['blogGoal', 'targetAudience', 'seoIntent', 'tone', 'scope']) {
        if (typeof p[k] !== 'string' || !p[k].trim()) {
            throw new Error('Invalid stored alignment');
        }
    }
    const ref = p['referencesAnalysis'];
    return {
        summary: {
            blogGoal: p['blogGoal'],
            targetAudience: p['targetAudience'],
            seoIntent: p['seoIntent'],
            tone: p['tone'],
            scope: p['scope'],
            referenceUnderstanding: typeof p['referenceUnderstanding'] === 'string' ? p['referenceUnderstanding'] : undefined,
            differentiationAngle: typeof p['differentiationAngle'] === 'string' ? p['differentiationAngle'] : undefined,
        },
        referencesAnalysis: ref === 'none_usable' ? 'none_usable' : null,
    };
}
export async function generateAlignment(blogId, feedback) {
    return request(`${BASE}/${blogId}/alignment`, {
        method: 'POST',
        body: JSON.stringify({ feedback }),
    });
}
export async function confirmAlignment(blogId) {
    return request(`${BASE}/${blogId}/alignment/confirm`, {
        method: 'POST',
    });
}
/** GET /outline — same section shape as generate; null if no outline row yet (404). */
export async function getOutline(blogId) {
    const res = await authedFetch(`${BASE}/${blogId}/outline`, {
        headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 404)
        return null;
    const body = (await res.json());
    if (!res.ok) {
        const err = body;
        throw new Error(err.error?.message ?? 'Request failed');
    }
    return body;
}
export async function generateOutline(blogId, feedback) {
    return request(`${BASE}/${blogId}/outline`, {
        method: 'POST',
        body: JSON.stringify({ feedback }),
    });
}
export async function confirmOutline(blogId) {
    return request(`${BASE}/${blogId}/outline/confirm`, {
        method: 'POST',
    });
}
export async function generateDraft(blogId, feedback) {
    return request(`${BASE}/${blogId}/draft`, {
        method: 'POST',
        body: JSON.stringify({ feedback }),
    });
}
export async function confirmDraft(blogId) {
    return request(`${BASE}/${blogId}/draft/confirm`, {
        method: 'POST',
    });
}
export async function getDraft(blogId) {
    return request(`${BASE}/${blogId}/draft`);
}
export async function recordExportEvent(blogId, section) {
    try {
        await request(`${BASE}/${blogId}/events`, {
            method: 'POST',
            body: JSON.stringify({ type: 'exported', section }),
        });
    }
    catch {
        // fire-and-forget — never surface to the user
    }
}
export async function addReference(blogId, url) {
    return request(`${BASE}/${blogId}/references`, {
        method: 'POST',
        body: JSON.stringify({ url }),
    });
}
export async function listReferences(blogId) {
    return request(`${BASE}/${blogId}/references`);
}
export async function getReferenceStatus(blogId, refId) {
    return request(`${BASE}/${blogId}/references/${refId}/status`);
}
export async function retryReferenceExtraction(blogId, refId) {
    return request(`${BASE}/${blogId}/references/${refId}/retry-extraction`, {
        method: 'POST',
    });
}
export async function removeReference(blogId, refId) {
    return request(`${BASE}/${blogId}/references/${refId}`, {
        method: 'DELETE',
    });
}
