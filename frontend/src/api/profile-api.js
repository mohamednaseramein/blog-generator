const BASE = '/api/profiles';
async function request(url, options) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const body = (await res.json());
    if (!res.ok) {
        const err = body;
        throw new Error(err.error?.message ?? 'Request failed');
    }
    return body;
}
export async function listProfiles() {
    return request(BASE);
}
export async function getPredefinedProfiles() {
    return request(`${BASE}/predefined`);
}
export async function getProfile(id) {
    return request(`${BASE}/${id}`);
}
export async function createProfile(payload) {
    return request(BASE, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export async function cloneProfile(payload) {
    return request(BASE, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
export async function updateProfile(id, updates) {
    return request(`${BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}
export async function deleteProfile(id) {
    await request(`${BASE}/${id}`, { method: 'DELETE' });
}
