// kratosjs-react's own apiFetch (see node_modules/@maxal_studio/kratosjs-react/
// dist/api/http.js) just throws an ApiError on a 401 — whatever component made
// the call (a table load, a delete action, ...) is left to show that inline,
// and nothing forces the app back to the login screen. In practice that means
// a session that dies mid-use (most commonly the idle-timeout middleware, see
// src/middleware/sessionTimeout.ts) leaves the admin stuck looking at a broken
// page with an "Unauthorized" banner instead of being sent to log back in.
//
// This patches the one chokepoint every request goes through (window.fetch —
// kratosjs-react's authenticatedFetch calls it directly) to force a reload on
// any 401 from a real resource/action/media call. A reload re-mounts
// AuthContext, which re-runs its own /auth/me + refresh dance and correctly
// falls back to the login page once that fails too — no need to duplicate
// that logic here.
//
// Auth endpoints themselves (login, refresh, 2FA challenge, ...) are excluded:
// a 401 there is an expected, already-handled outcome (wrong password, no
// refresh token yet) driven by LoginPage/AuthContext's own state, not a
// signal that a previously-valid session just died.
const basePath = (window as any).__VALAJS_API_BASE_PATH__ || '/api';

let redirecting = false;
const originalFetch = window.fetch.bind(window);

window.fetch = async (...args: Parameters<typeof fetch>) => {
	const response = await originalFetch(...args);
	if (response.status === 401 && !redirecting) {
		const input = args[0];
		const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
		const path = new URL(url, window.location.origin).pathname;
		if (path.startsWith(basePath) && !path.includes('/auth/')) {
			redirecting = true;
			window.location.reload();
		}
	}
	return response;
};
