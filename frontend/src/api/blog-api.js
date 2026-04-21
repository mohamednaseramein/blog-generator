const BASE = '/api/blogs';
async function request(url, options) {
    const res = await fetch(url, {
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
export async function createBlog() {
    return request(BASE, { method: 'POST' });
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
