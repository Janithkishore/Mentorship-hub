/**
 * API Helper - Session-based auth with credentials
 */
const API_BASE = window.location.origin;

async function api(path, options = {}) {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const url = path.startsWith('http') ? path : `${API_BASE}/api/${p}`;
    const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}
