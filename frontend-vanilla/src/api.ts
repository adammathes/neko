export function getCookie(name: string): string | undefined {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
}

/**
 * A wrapper around fetch that automatically includes the CSRF token
 * for state-changing requests (POST, PUT, DELETE).
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = init?.method?.toUpperCase() || 'GET';
    const isStateChanging = ['POST', 'PUT', 'DELETE'].includes(method);

    const headers = new Headers(init?.headers || {});

    if (isStateChanging) {
        const token = getCookie('csrf_token');
        if (token) {
            headers.set('X-CSRF-Token', token);
        }
    }

    return fetch(input, {
        ...init,
        headers,
        credentials: 'include', // Ensure cookies are sent
    });
}
