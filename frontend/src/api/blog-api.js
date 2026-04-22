const BASE = '/api/blogs';
export async function getBrief(blogId) {
    return request(`${BASE}/${blogId}/brief`);
}
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
export async function listBlogs() {
    return request(BASE);
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
export async function removeReference(blogId, refId) {
    return request(`${BASE}/${blogId}/references/${refId}`, {
        method: 'DELETE',
    });
}
